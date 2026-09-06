import { PrismaClient } from "@prisma/client";
import { isValidAuctionTransition } from "../lib/auction-state";

const prisma = new PrismaClient();

async function runConcurrencyAndIntegrityTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING AUCTION CONCURRENCY & INTEGRITY TESTS");
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
    // Setup test auction
    const auctioneer = await prisma.user.findFirst({ where: { role: "AUCTIONEER" } });
    const bidder1 = await prisma.user.findFirst({ where: { email: "bidder1@rcb.com" } });
    const bidder2 = await prisma.user.findFirst({ where: { email: "bidder2@csk.com" } });

    if (!auctioneer || !bidder1 || !bidder2) {
      throw new Error("Seed users not found. Please run seed script first.");
    }

    // ----------------------------------------------------
    // Test 1: State Machine Transition Rules
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
    // Test 2: Concurrent / Simultaneous Bidding Race Condition
    // ----------------------------------------------------
    console.log("\nTest Suite 2: Concurrent Bidding Invariant & Race Condition Prevention");

    // Create an isolated test auction and item
    const testAuction = await prisma.auction.create({
      data: {
        name: "Concurrency Test Auction",
        status: "LIVE",
        auctioneerId: auctioneer.id,
        minimumBidIncrement: 500000, // 5 Lakhs
        timerDuration: 30,
      },
    });

    const testItem = await prisma.item.create({
      data: {
        auctionId: testAuction.id,
        name: "Test Star Bowler",
        category: "Bowler",
        basePrice: 20000000, // 2 Cr
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

    // Fire 10 near-simultaneous bids with identical or slightly incremented amounts
    const amounts = [
      20000000, // Base price
      20000000, // Duplicate base price attempt
      20500000, // Valid +5L
      20500000, // Duplicate +5L attempt
      21000000, // Valid +5L
      21000000, // Duplicate +5L attempt
      21500000, // Valid +5L
      21200000, // Out of order / low bid attempt (< 21.5L)
      22000000, // Valid +5L
      22500000, // Valid +5L
    ];

    console.log("  ⚡ Firing 10 concurrent bid transactions simultaneously...");

    const bidResults = await Promise.allSettled(
      amounts.map(async (amt, idx) => {
        const bidderId = idx % 2 === 0 ? bidder1.id : bidder2.id;

        return prisma.$transaction(async (tx) => {
          const item = await tx.item.findUnique({ where: { id: testItem.id } });
          if (!item || item.status !== "ACTIVE") throw new Error("Item not active");

          const participant = await tx.auctionParticipant.findUnique({
            where: { auctionId_userId: { auctionId: testAuction.id, userId: bidderId } },
          });
          if (!participant || amt > participant.remainingBudget) throw new Error("Insufficient budget");

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
    // Test 3: Double Finalization Prevention
    // ----------------------------------------------------
    console.log("\nTest Suite 3: Atomic Deal Finalization & Double Submission Guard");

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
    // Test 4: Budget Lock & Invariant Verification
    // ----------------------------------------------------
    console.log("\nTest Suite 4: Budget Invariant Verification");
    const updatedP1 = await prisma.auctionParticipant.findUnique({
      where: { id: p1.id },
    });

    if (updatedP1) {
      assert(
        updatedP1.remainingBudget === updatedP1.initialBudget - updatedP1.totalSpent,
        "Invariant maintained: remainingBudget === initialBudget - totalSpent"
      );
    }

    // Clean up test auction
    await prisma.transaction.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.bid.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.item.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.auctionParticipant.deleteMany({ where: { auctionId: testAuction.id } });
    await prisma.auction.deleteMany({ where: { id: testAuction.id } });

    console.log("\n=================================================");
    console.log(`🏁 TEST RUN SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runConcurrencyAndIntegrityTests();
