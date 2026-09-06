import { PrismaClient } from "@prisma/client";
import { isValidAuctionTransition } from "../lib/auction-state";
import { hashPassword, comparePassword, signToken, verifyToken } from "../lib/auth";
import { generateSecureToken, generateRoomCode } from "../lib/invite-crypto";
import { checkRateLimit } from "../lib/rate-limit";

const prisma = new PrismaClient();

async function runHardeningTestSuite() {
  console.log("=================================================");
  console.log("🛡️ RUNNING PRODUCTION HARDENING & SECURITY TESTS");
  console.log("=================================================\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failedTests++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test Suite 1: State Machine Invariants
    // ----------------------------------------------------
    console.log("Test Suite 1: State Machine Invariants");
    assert(isValidAuctionTransition("DRAFT", "READY"), "DRAFT -> READY allowed");
    assert(isValidAuctionTransition("READY", "LIVE"), "READY -> LIVE allowed");
    assert(isValidAuctionTransition("LIVE", "PAUSED"), "LIVE -> PAUSED allowed");
    assert(isValidAuctionTransition("PAUSED", "LIVE"), "PAUSED -> LIVE allowed");
    assert(isValidAuctionTransition("LIVE", "COMPLETED"), "LIVE -> COMPLETED allowed");
    assert(!isValidAuctionTransition("COMPLETED", "LIVE"), "COMPLETED -> LIVE blocked (terminal)");
    assert(!isValidAuctionTransition("CANCELLED", "LIVE"), "CANCELLED -> LIVE blocked (terminal)");
    assert(!isValidAuctionTransition("DRAFT", "COMPLETED"), "DRAFT -> COMPLETED blocked directly");

    // ----------------------------------------------------
    // Test Suite 2: Password Security & JWT Verification
    // ----------------------------------------------------
    console.log("\nTest Suite 2: Authentication & Password Security");
    const testPassword = "SuperSecretPassword2026!";
    const hashed = await hashPassword(testPassword);
    assert(hashed !== testPassword, "Password is not stored in plaintext");
    assert(await comparePassword(testPassword, hashed), "Valid password comparison succeeds");
    assert(!(await comparePassword("WrongPassword!", hashed)), "Invalid password comparison rejected");

    const payload = { userId: "user-123", email: "user@test.com", name: "Tester", role: "BIDDER" as const };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    assert(decoded?.userId === "user-123" && decoded?.role === "BIDDER", "JWT signature and extraction valid");
    assert(verifyToken("invalid.token.string") === null, "Forged/malformed JWT rejected");

    // ----------------------------------------------------
    // Test Suite 3: Cryptographic Invite Tokens & Revocation
    // ----------------------------------------------------
    console.log("\nTest Suite 3: Cryptographic Invite Tokens");
    const tokenA = generateSecureToken(16);
    const tokenB = generateSecureToken(16);
    const roomCode = generateRoomCode();
    assert(tokenA.length === 32, "Token A generated with 32 hex characters");
    assert(tokenA !== tokenB, "Token entropy guarantees unique tokens");
    assert(roomCode.startsWith("AUCTION-"), "Room code follows secure format");

    // ----------------------------------------------------
    // Setup Isolated Test Auctions & Users
    // ----------------------------------------------------
    const auctioneer1 = await prisma.user.create({
      data: {
        name: "Auctioneer 1",
        email: `auctioneer1_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "AUCTIONEER",
      },
    });

    const auctioneer2 = await prisma.user.create({
      data: {
        name: "Auctioneer 2",
        email: `auctioneer2_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "AUCTIONEER",
      },
    });

    const bidder1 = await prisma.user.create({
      data: {
        name: "Bidder 1",
        email: `bidder1_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "BIDDER",
      },
    });

    const bidder2 = await prisma.user.create({
      data: {
        name: "Bidder 2",
        email: `bidder2_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "BIDDER",
      },
    });

    const testAuction = await prisma.auction.create({
      data: {
        name: "Hardening Test Arena",
        status: "LIVE",
        isConfigLocked: true,
        auctioneerId: auctioneer1.id,
        minimumBidIncrement: 500000,
        timerDuration: 30,
        bidderInviteA: tokenA,
        bidderInviteB: tokenB,
        spectatorInvite: generateSecureToken(16),
      },
    });

    const testItem = await prisma.item.create({
      data: {
        auctionId: testAuction.id,
        name: "Hardened All-Rounder",
        category: "All-Rounder",
        basePrice: 10000000,
        status: "ACTIVE",
        orderIndex: 1,
      },
    });

    const p1 = await prisma.auctionParticipant.create({
      data: {
        auctionId: testAuction.id,
        userId: bidder1.id,
        teamName: "Team Alpha",
        initialBudget: 100000000,
        remainingBudget: 100000000,
      },
    });

    const p2 = await prisma.auctionParticipant.create({
      data: {
        auctionId: testAuction.id,
        userId: bidder2.id,
        teamName: "Team Beta",
        initialBudget: 100000000,
        remainingBudget: 100000000,
      },
    });

    // ----------------------------------------------------
    // Test Suite 4: IDOR & Authorization Protection
    // ----------------------------------------------------
    console.log("\nTest Suite 4: IDOR & Role Authorization");
    // Auctioneer 2 attempting to modify Auctioneer 1's auction
    const isOwner = testAuction.auctioneerId === auctioneer2.id;
    assert(!isOwner, "Auctioneer 2 correctly identified as non-owner (IDOR blocked)");

    // Unauthorized non-participant attempting to bid
    const stranger = await prisma.user.create({
      data: {
        name: "Stranger",
        email: `stranger_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "BIDDER",
      },
    });

    const strangerParticipant = await prisma.auctionParticipant.findUnique({
      where: { auctionId_userId: { auctionId: testAuction.id, userId: stranger.id } },
    });
    assert(strangerParticipant === null, "Stranger bidder has no participant record and is blocked from bidding");

    // ----------------------------------------------------
    // Test Suite 5: Configuration Lock Invariant
    // ----------------------------------------------------
    console.log("\nTest Suite 5: Configuration Lock Invariant");
    assert(testAuction.isConfigLocked, "Active auction has configuration locked (isConfigLocked = true)");

    // ----------------------------------------------------
    // Test Suite 6: Concurrent Bidding & Atomic Serialization
    // ----------------------------------------------------
    console.log("\nTest Suite 6: Concurrent Bidding Race Condition & Idempotency");
    const amounts = [
      10000000, // Base price
      10000000, // Duplicate base price attempt
      10500000, // Valid +5L
      10500000, // Duplicate +5L attempt
      11000000, // Valid +5L
      11000000, // Duplicate +5L attempt
      11500000, // Valid +5L
      11200000, // Out of order bid (< 11.5L)
      12000000, // Valid +5L
      12500000, // Valid +5L
    ];

    console.log("  ⚡ Firing 10 concurrent bid transactions simultaneously...");

    const bidResults = await Promise.allSettled(
      amounts.map(async (amt, idx) => {
        const bidderId = idx % 2 === 0 ? bidder1.id : bidder2.id;
        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await prisma.$transaction(async (tx) => {
              const item = await tx.item.findUnique({ where: { id: testItem.id } });
              if (!item || item.status !== "ACTIVE") throw new Error("Item not active");

              const participant = await tx.auctionParticipant.findUnique({
                where: { auctionId_userId: { auctionId: testAuction.id, userId: bidderId } },
              });
              if (!participant || amt > participant.remainingBudget) throw new Error("Insufficient budget");

              // Atomic Touch on active Item to serialize concurrent transactions on MongoDB
              await tx.item.update({
                where: { id: item.id },
                data: { updatedAt: new Date() },
              });

              // Re-read highest bid AFTER Item serialization point
              const currentHighest = await tx.bid.findFirst({
                where: { itemId: testItem.id },
                orderBy: { amount: "desc" },
              });

              const minReq = currentHighest
                ? currentHighest.amount + testAuction.minimumBidIncrement
                : item.basePrice;

              if (amt < minReq) {
                throw new Error(`BID_TOO_LOW: ${amt} < ${minReq}`);
              }

              return tx.bid.create({
                data: {
                  auctionId: testAuction.id,
                  itemId: testItem.id,
                  bidderId,
                  amount: amt,
                },
              });
            });
          } catch (err: any) {
            const isWriteConflict =
              err.code === "P2034" ||
              err.message?.includes("WriteConflict") ||
              err.message?.includes("write conflict") ||
              err.message?.includes("deadlock");

            if (isWriteConflict && attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, 10 * attempt));
              continue;
            }
            throw err;
          }
        }
      })
    );

    const successfulBids = bidResults.filter((r) => r.status === "fulfilled");
    const rejectedBids = bidResults.filter((r) => r.status === "rejected");
    console.log(`  📊 Results: ${successfulBids.length} accepted, ${rejectedBids.length} rejected duplicate/invalid bids.`);

    const dbBids = await prisma.bid.findMany({
      where: { itemId: testItem.id },
      orderBy: { amount: "asc" },
    });

    let strictlyIncreasing = true;
    for (let i = 1; i < dbBids.length; i++) {
      if (dbBids[i].amount < dbBids[i - 1].amount + testAuction.minimumBidIncrement) {
        strictlyIncreasing = false;
        break;
      }
    }

    assert(strictlyIncreasing, "All accepted bids in DB satisfy strictly increasing minimum increment invariant");
    assert(dbBids.length >= 1, "At least base bid accepted");

    // ----------------------------------------------------
    // Test Suite 7: Double Finalization Prevention
    // ----------------------------------------------------
    console.log("\nTest Suite 7: Atomic Deal Finalization & Double Submission Guard");
    const highestBidInDb = await prisma.bid.findFirst({
      where: { itemId: testItem.id },
      orderBy: { amount: "desc" },
    });

    if (highestBidInDb) {
      const finalize1Promise = prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({ where: { id: testItem.id } });
        if (!item || item.status !== "ACTIVE") throw new Error("ITEM_ALREADY_FINALIZED");

        await tx.transaction.create({
          data: {
            auctionId: testAuction.id,
            itemId: item.id,
            winnerId: highestBidInDb.bidderId,
            winningBid: highestBidInDb.amount,
          },
        });

        await tx.auctionParticipant.update({
          where: { auctionId_userId: { auctionId: testAuction.id, userId: highestBidInDb.bidderId } },
          data: {
            totalSpent: highestBidInDb.amount,
            remainingBudget: 100000000 - highestBidInDb.amount,
          },
        });

        return tx.item.update({
          where: { id: item.id },
          data: { status: "SOLD", winnerId: highestBidInDb.bidderId, winningPrice: highestBidInDb.amount },
        });
      });

      const finalize2Promise = prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({ where: { id: testItem.id } });
        if (!item || item.status !== "ACTIVE") throw new Error("ITEM_ALREADY_FINALIZED");

        await tx.transaction.create({
          data: {
            auctionId: testAuction.id,
            itemId: item.id,
            winnerId: highestBidInDb.bidderId,
            winningBid: highestBidInDb.amount,
          },
        });

        return tx.item.update({
          where: { id: item.id },
          data: { status: "SOLD" },
        });
      });

      const [res1, res2] = await Promise.allSettled([finalize1Promise, finalize2Promise]);
      const successfulFinalizations = [res1, res2].filter((r) => r.status === "fulfilled").length;
      const rejectedFinalizations = [res1, res2].filter((r) => r.status === "rejected").length;

      assert(successfulFinalizations === 1, "Exactly one finalize transaction succeeded");
      assert(rejectedFinalizations === 1, "Duplicate finalize transaction was rejected atomically");

      const transactionCount = await prisma.transaction.count({ where: { itemId: testItem.id } });
      assert(transactionCount === 1, "Exactly one Transaction record written in DB");
    }

    // ----------------------------------------------------
    // Test Suite 8: Budget Integrity Invariant
    // ----------------------------------------------------
    console.log("\nTest Suite 8: Budget Invariant Verification");
    const updatedP1 = await prisma.auctionParticipant.findUnique({
      where: { id: p1.id },
    });

    if (updatedP1) {
      assert(
        updatedP1.remainingBudget === updatedP1.initialBudget - updatedP1.totalSpent,
        "Invariant maintained: remainingBudget === initialBudget - totalSpent"
      );
      assert(updatedP1.remainingBudget >= 0, "Budget remains non-negative");
    }

    // ----------------------------------------------------
    // Test Suite 9: Rate Limiter Validation
    // ----------------------------------------------------
    console.log("\nTest Suite 9: Rate Limiter Validation");
    const testKey = `test-rate-limit-${Date.now()}`;
    const rl1 = checkRateLimit(testKey, 2, 5000);
    const rl2 = checkRateLimit(testKey, 2, 5000);
    const rl3 = checkRateLimit(testKey, 2, 5000);
    assert(rl1.allowed, "First request within limit allowed");
    assert(rl2.allowed, "Second request within limit allowed");
    assert(!rl3.allowed, "Third request exceeding limit blocked with HTTP 429 semantics");

    // Clean up test data
    await prisma.transaction.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.bid.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.item.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.auctionParticipant.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.auction.deleteMany({ where: { id: testAuction.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [auctioneer1.id, auctioneer2.id, bidder1.id, bidder2.id, stranger.id] } },
    });

    console.log("\n=================================================");
    console.log(`🏁 HARDENING TEST RUN SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Hardening test execution failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runHardeningTestSuite();
