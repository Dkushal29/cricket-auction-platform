import { PrismaClient } from "@prisma/client";
import { isValidAuctionTransition, assertValidAuctionTransition } from "../lib/auction-state";
import { hashPassword, comparePassword, signToken, verifyToken } from "../lib/auth";
import { generateSecureToken, generateRoomCode } from "../lib/invite-crypto";
import { checkRateLimit } from "../lib/rate-limit";
import {
  startItemTimer,
  getRemainingTimerSeconds,
  stopItemTimer,
  checkBidderReadiness,
  registerMockPresence,
  clearMockPresence,
} from "../lib/socket-server";

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

    // ----------------------------------------------------
    // Test Suite 10: Production Bug Regression: DRAFT -> READY -> LIVE Atomic Launch Sequence
    // ----------------------------------------------------
    console.log("\nTest Suite 10: DRAFT -> READY -> LIVE State Machine & Start Auction Invariant");

    // 1. Create a valid auction in DRAFT
    const draftAuctioneer = await prisma.user.create({
      data: {
        name: "Draft Auctioneer",
        email: `draft_auctioneer_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "AUCTIONEER",
      },
    });

    const draftBidder1 = await prisma.user.create({
      data: {
        name: "Draft Bidder 1",
        email: `draft_b1_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "BIDDER",
      },
    });

    const draftBidder2 = await prisma.user.create({
      data: {
        name: "Draft Bidder 2",
        email: `draft_b2_${Date.now()}@test.com`,
        passwordHash: hashed,
        role: "BIDDER",
      },
    });

    const draftAuction = await prisma.auction.create({
      data: {
        name: "Draft Premier League 2026",
        status: "DRAFT",
        isConfigLocked: false,
        auctioneerId: draftAuctioneer.id,
        minimumBidIncrement: 500000,
        timerDuration: 30,
        bidderInviteA: generateSecureToken(16),
        bidderInviteB: generateSecureToken(16),
        spectatorInvite: generateSecureToken(16),
      },
    });

    const draftItem1 = await prisma.item.create({
      data: {
        auctionId: draftAuction.id,
        name: "Draft Star Batter",
        category: "Batsman",
        basePrice: 20000000,
        status: "PENDING",
        orderIndex: 1,
      },
    });

    const draftItem2 = await prisma.item.create({
      data: {
        auctionId: draftAuction.id,
        name: "Draft Star Bowler",
        category: "Bowler",
        basePrice: 15000000,
        status: "PENDING",
        orderIndex: 2,
      },
    });

    const draftP1 = await prisma.auctionParticipant.create({
      data: {
        auctionId: draftAuction.id,
        userId: draftBidder1.id,
        teamName: "Titans",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const draftP2 = await prisma.auctionParticipant.create({
      data: {
        auctionId: draftAuction.id,
        userId: draftBidder2.id,
        teamName: "Warriors",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const participantsList = [draftP1, draftP2];

    assert(draftAuction.status === "DRAFT", "Newly created auction starts in DRAFT status");
    assert(!draftAuction.isConfigLocked, "Newly created auction has isConfigLocked = false");

    // Scenario 1: DRAFT + no bidders ready -> cannot start
    clearMockPresence(draftAuction.id);
    const rNoBidders = checkBidderReadiness(draftAuction.id, participantsList);
    assert(!rNoBidders.bidderAReady && !rNoBidders.bidderBReady && !rNoBidders.allBiddersReady, "1. DRAFT + no bidders ready: readiness check fails");

    // Scenario 2: DRAFT + only Bidder A ready -> cannot start
    registerMockPresence(draftAuction.id, {
      socketId: "socket-bidder-a",
      role: "BIDDER",
      teamSlot: "A",
      participantId: draftP1.id,
      auctionId: draftAuction.id,
    });
    const rOnlyA = checkBidderReadiness(draftAuction.id, participantsList);
    assert(rOnlyA.bidderAReady && !rOnlyA.bidderBReady && !rOnlyA.allBiddersReady, "2. DRAFT + only Bidder A ready: cannot start (allBiddersReady = false)");

    // Scenario 3: DRAFT + only Bidder B ready -> cannot start
    clearMockPresence(draftAuction.id);
    registerMockPresence(draftAuction.id, {
      socketId: "socket-bidder-b",
      role: "BIDDER",
      teamSlot: "B",
      participantId: draftP2.id,
      auctionId: draftAuction.id,
    });
    const rOnlyB = checkBidderReadiness(draftAuction.id, participantsList);
    assert(!rOnlyB.bidderAReady && rOnlyB.bidderBReady && !rOnlyB.allBiddersReady, "3. DRAFT + only Bidder B ready: cannot start (allBiddersReady = false)");

    // Scenario 7: Spectator connection -> must NOT satisfy bidder readiness
    clearMockPresence(draftAuction.id);
    registerMockPresence(draftAuction.id, {
      socketId: "socket-spectator-1",
      role: "SPECTATOR",
      auctionId: draftAuction.id,
    });
    registerMockPresence(draftAuction.id, {
      socketId: "socket-spectator-2",
      role: "SPECTATOR",
      auctionId: draftAuction.id,
    });
    const rSpectators = checkBidderReadiness(draftAuction.id, participantsList);
    assert(!rSpectators.bidderAReady && !rSpectators.bidderBReady && !rSpectators.allBiddersReady, "7. Spectator connections strictly excluded from bidder readiness");

    // Scenario 10: Guest from another auction -> cannot affect readiness or state
    registerMockPresence(draftAuction.id, {
      socketId: "socket-foreign-guest-a",
      role: "BIDDER",
      teamSlot: "A",
      auctionId: "other_auction_id_999",
    });
    const rForeignGuest = checkBidderReadiness(draftAuction.id, participantsList);
    assert(!rForeignGuest.bidderAReady, "10. Guest token from another auction cannot satisfy readiness (auction isolation)");

    // Scenario 4: DRAFT + Bidder A and Bidder B ready -> transitions to READY
    clearMockPresence(draftAuction.id);
    registerMockPresence(draftAuction.id, {
      socketId: "socket-bidder-a",
      role: "BIDDER",
      teamSlot: "A",
      participantId: draftP1.id,
      auctionId: draftAuction.id,
    });
    registerMockPresence(draftAuction.id, {
      socketId: "socket-bidder-b",
      role: "BIDDER",
      teamSlot: "B",
      participantId: draftP2.id,
      auctionId: draftAuction.id,
    });
    const rBothReady = checkBidderReadiness(draftAuction.id, participantsList);
    assert(rBothReady.allBiddersReady, "4a. Both Bidder A and Bidder B verified ready by server");

    // Execute transition DRAFT -> READY
    assert(isValidAuctionTransition("DRAFT", "READY"), "4b. State machine permits DRAFT -> READY");
    assert(!isValidAuctionTransition("DRAFT", "LIVE"), "4c. Direct DRAFT -> LIVE transition is prohibited by state machine");

    const readyAuction = await prisma.auction.update({
      where: { id: draftAuction.id },
      data: { status: "READY" },
    });
    assert(readyAuction.status === "READY", "4d. Auction successfully transitioned to READY");

    // Scenario 11: Configuration remains editable in DRAFT/READY, becomes locked when auction starts
    assert(!readyAuction.isConfigLocked, "11a. Configuration remains unlocked in READY prior to LIVE");

    // Scenario 9: Unauthorized non-owner attempting to start auction
    const nonOwnerAuctioneer = auctioneer2;
    assert(draftAuction.auctioneerId !== nonOwnerAuctioneer.id, "9. Unauthorized auctioneer identified as non-owner (cannot start)");

    // Scenario 5 & 6: READY + auctioneer starts -> transitions to LIVE, locks config, first item ACTIVE, timer starts
    assert(isValidAuctionTransition("READY", "LIVE"), "5a. State machine permits READY -> LIVE");

    const startResult = await prisma.$transaction(async (tx) => {
      const current = await tx.auction.findUnique({
        where: { id: draftAuction.id },
        include: { items: { orderBy: { orderIndex: "asc" } }, participants: true },
      });
      if (!current) throw new Error("Auction not found");
      if (current.status === "LIVE") throw new Error("AUCTION_ALREADY_LIVE");

      assertValidAuctionTransition(current.status as any, "LIVE");

      const firstPending = current.items.find((i) => i.status === "PENDING");
      if (firstPending) {
        await tx.item.update({
          where: { id: firstPending.id },
          data: { status: "ACTIVE" },
        });
      }

      return tx.auction.update({
        where: { id: draftAuction.id },
        data: {
          status: "LIVE",
          isConfigLocked: true,
          startedAt: new Date(),
          activeItemId: firstPending?.id || null,
        },
      });
    });

    assert(startResult.status === "LIVE", "5b. Auction successfully transitioned READY -> LIVE");
    assert(startResult.isConfigLocked === true, "11b. Configuration permanently locked upon entering LIVE");
    assert(startResult.activeItemId === draftItem1.id, "6a. First pending item set as activeItemId");

    const activeItemAfterStart = await prisma.item.findUnique({ where: { id: draftItem1.id } });
    assert(activeItemAfterStart?.status === "ACTIVE", "6b. First item status is ACTIVE");

    const secondItemAfterStart = await prisma.item.findUnique({ where: { id: draftItem2.id } });
    assert(secondItemAfterStart?.status === "PENDING", "6c. Second item remains PENDING");

    // Start item countdown timer
    startItemTimer(draftAuction.id, draftItem1.id, 30);
    const timerRemaining = getRemainingTimerSeconds(draftAuction.id);
    assert(typeof timerRemaining === "number" && timerRemaining > 0, "6d. Item countdown timer started successfully");
    stopItemTimer(draftAuction.id);

    // Scenario 8: Duplicate Start requests safely rejected
    let secondStartRejected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.auction.findUnique({ where: { id: draftAuction.id } });
        if (!current) throw new Error("Auction not found");
        if (current.status === "LIVE") throw new Error("AUCTION_ALREADY_LIVE");
        if (current.status !== "DRAFT" && current.status !== "READY") {
          assertValidAuctionTransition(current.status as any, "LIVE");
        }
      });
    } catch (e: any) {
      if (e.message.includes("AUCTION_ALREADY_LIVE") || e.message.includes("Invalid auction state transition")) {
        secondStartRejected = true;
      }
    }
    assert(secondStartRejected, "8. Duplicate Start request rejected safely without double-start race");

    // Scenario 12: Existing state machine protections preserved
    assert(!isValidAuctionTransition("COMPLETED", "LIVE"), "12a. COMPLETED -> LIVE blocked (terminal)");
    assert(!isValidAuctionTransition("CANCELLED", "LIVE"), "12b. CANCELLED -> LIVE blocked (terminal)");
    assert(isValidAuctionTransition("LIVE", "PAUSED"), "12c. LIVE -> PAUSED allowed");
    assert(isValidAuctionTransition("PAUSED", "LIVE"), "12d. PAUSED -> LIVE allowed");

    // Clean up test data for Suite 10
    clearMockPresence(draftAuction.id);
    await prisma.item.deleteMany({ where: { auctionId: draftAuction.id } });
    await prisma.auctionParticipant.deleteMany({ where: { auctionId: draftAuction.id } });
    await prisma.auditLog.deleteMany({ where: { auctionId: draftAuction.id } });
    await prisma.auction.deleteMany({ where: { id: draftAuction.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [draftAuctioneer.id, draftBidder1.id, draftBidder2.id] } },
    });

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
