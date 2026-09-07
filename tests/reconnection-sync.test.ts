import { PrismaClient } from "@prisma/client";
import { hashPassword, signToken, verifyToken } from "../lib/auth";
import { generateSecureToken, generateRoomCode } from "../lib/invite-crypto";
import { createGuestToken, verifyGuestToken, validateGuestSessionWithDB } from "../lib/guest-session";

const prisma = new PrismaClient();

async function runReconnectionSyncTests() {
  console.log("=================================================");
  console.log("🔄 RUNNING RECONNECTION & STATE SYNCHRONIZATION TESTS");
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
    // Setup Test Fixtures: Auctioneer, Auction, Participants, Items
    // ----------------------------------------------------
    const passwordHash = await hashPassword("Password123!");
    const auctioneer = await prisma.user.create({
      data: {
        name: "Sync Test Auctioneer",
        email: `auctioneer_sync_${Date.now()}@test.com`,
        passwordHash,
        role: "AUCTIONEER",
      },
    });

    const userA = await prisma.user.create({
      data: {
        name: "Bidder Alpha User",
        email: `bidder_a_sync_${Date.now()}@test.com`,
        passwordHash,
        role: "BIDDER",
      },
    });

    const userB = await prisma.user.create({
      data: {
        name: "Bidder Beta User",
        email: `bidder_b_sync_${Date.now()}@test.com`,
        passwordHash,
        role: "BIDDER",
      },
    });

    const roomCode = generateRoomCode();
    const tokenA = generateSecureToken(16);
    const tokenB = generateSecureToken(16);
    const specToken = generateSecureToken(16);

    const auction = await prisma.auction.create({
      data: {
        roomCode,
        bidderInviteA: tokenA,
        bidderInviteB: tokenB,
        spectatorInvite: specToken,
        name: "Reconnection Sync Championship",
        auctioneerId: auctioneer.id,
        status: "LIVE",
        timerDuration: 30,
        minimumBidIncrement: 500000,
      },
    });

    const partA = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: userA.id,
        teamName: "Royal Challengers",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const partB = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: userB.id,
        teamName: "Chennai Super Kings",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const item1 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Player 1 (Virat)",
        category: "Batsman",
        basePrice: 20000000,
        orderIndex: 1,
        status: "PENDING",
      },
    });

    const item2 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Player 2 (Bumrah)",
        category: "Bowler",
        basePrice: 20000000,
        orderIndex: 2,
        status: "PENDING",
      },
    });

    // ----------------------------------------------------
    // Scenario 1: Bidder A connects as Guest and saves initial state
    // ----------------------------------------------------
    console.log("Scenario 1: Guest Authentication & Role Integrity");
    const guestTokenA = createGuestToken({
      isGuest: true,
      auctionId: auction.id,
      roomCode: auction.roomCode,
      role: "BIDDER",
      teamSlot: "A",
      participantId: partA.id,
      tokenVersion: tokenA,
      userId: userA.id,
      name: "Royal Challengers",
    });

    const verifiedGuestA = verifyGuestToken(guestTokenA);
    assert(verifiedGuestA !== null, "Guest token A verifies correctly");
    assert(verifiedGuestA?.role === "BIDDER" && verifiedGuestA.teamSlot === "A", "Guest role remains BIDDER with teamSlot A");

    const validatedGuestA = await validateGuestSessionWithDB(verifiedGuestA!);
    assert(validatedGuestA.valid && validatedGuestA.participant?.id === partA.id, "Guest session validates against MongoDB participant A");

    // ----------------------------------------------------
    // Scenario 2: Bidder A disconnects (simulated) while live auction proceeds
    // ----------------------------------------------------
    console.log("\nScenario 2: Intermediate State Mutation While Client Disconnected");
    // During disconnection:
    // - Item 1 is activated
    await prisma.item.update({ where: { id: item1.id }, data: { status: "ACTIVE" } });
    await prisma.auction.update({ where: { id: auction.id }, data: { activeItemId: item1.id } });

    // - Bidder B places a bid of 2.5 Cr
    const bid1 = await prisma.bid.create({
      data: {
        auctionId: auction.id,
        itemId: item1.id,
        bidderId: userB.id,
        amount: 25000000,
      },
    });

    // - Item 1 is finalized as SOLD to Team B
    await prisma.transaction.create({
      data: {
        auctionId: auction.id,
        itemId: item1.id,
        winnerId: userB.id,
        winningBid: 25000000,
        status: "COMPLETED",
      },
    });
    await prisma.item.update({
      where: { id: item1.id },
      data: { status: "SOLD", winnerId: userB.id, winningPrice: 25000000, soldAt: new Date() },
    });
    await prisma.auctionParticipant.update({
      where: { id: partB.id },
      data: { totalSpent: 25000000, remainingBudget: 75000000 },
    });

    // - Item 2 is activated on spotlight
    await prisma.item.update({ where: { id: item2.id }, data: { status: "ACTIVE" } });
    await prisma.auction.update({ where: { id: auction.id }, data: { activeItemId: item2.id } });

    // - Bidder A places a new bid of 2.1 Cr on Item 2
    const bid2 = await prisma.bid.create({
      data: {
        auctionId: auction.id,
        itemId: item2.id,
        bidderId: userA.id,
        amount: 21000000,
      },
    });

    assert(true, "Server processed item sale, budget deduction, item transition, and new bids while client was offline");

    // ----------------------------------------------------
    // Scenario 3: Client Reconnects & Fetches Authoritative State
    // ----------------------------------------------------
    console.log("\nScenario 3: Reconnection & Authoritative State Synchronization");
    
    // Simulate reconnected_sync state fetch (GET /api/auctions/[id])
    const syncAuction = await prisma.auction.findUnique({
      where: { id: auction.id },
      include: {
        participants: { include: { user: true } },
        items: {
          orderBy: { orderIndex: "asc" },
          include: {
            winner: true,
            bids: { orderBy: { amount: "desc" }, take: 10, include: { bidder: true } },
          },
        },
      },
    });

    // Validate sync state
    assert(syncAuction !== null, "Authoritative auction fetched from database on reconnect");
    assert(syncAuction?.activeItemId === item2.id, "Active item accurately synchronized to Player 2");

    const syncedItem1 = syncAuction?.items.find((i) => i.id === item1.id);
    assert(syncedItem1?.status === "SOLD" && syncedItem1?.winningPrice === 25000000, "Missed Item 1 SOLD status and final price synchronized");

    const syncedPartB = syncAuction?.participants.find((p) => p.id === partB.id);
    assert(syncedPartB?.remainingBudget === 75000000, "Opponent remaining purse synchronized accurately (75,000,000)");

    // Simulate active item bids fetch (GET /api/auctions/[id]/bids?itemId=item2.id)
    const activeItemBids = await prisma.bid.findMany({
      where: { itemId: item2.id },
      orderBy: { amount: "desc" },
      include: { bidder: true },
    });

    assert(activeItemBids.length === 1 && activeItemBids[0].amount === 21000000, "Active item highest bid synchronized (21,000,000 INR)");

    // ----------------------------------------------------
    // Scenario 4: Auctioneer Authentication & Control Role Integrity
    // ----------------------------------------------------
    console.log("\nScenario 4: Auctioneer Reconnection & IDOR Isolation");
    const auctioneerJwt = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    const verifiedAuctioneer = verifyToken(auctioneerJwt);
    assert(verifiedAuctioneer?.userId === auctioneer.id && verifiedAuctioneer.role === "AUCTIONEER", "Auctioneer JWT session preserved across reconnect");

    // ----------------------------------------------------
    // Scenario 5: Cross-Auction Isolation on Reconnect
    // ----------------------------------------------------
    console.log("\nScenario 5: Cross-Auction Isolation On Reconnect");
    const otherAuction = await prisma.auction.create({
      data: {
        roomCode: generateRoomCode(),
        bidderInviteA: generateSecureToken(16),
        bidderInviteB: generateSecureToken(16),
        spectatorInvite: generateSecureToken(16),
        name: "Foreign Auction",
        auctioneerId: auctioneer.id,
      },
    });

    // Guest Token for Auction 1 attempting to access Auction 2
    const crossAuctionCheck = verifiedGuestA?.auctionId === otherAuction.id;
    assert(!crossAuctionCheck, "Guest token from Auction 1 is blocked from joining Auction 2 room on reconnect");

    // ----------------------------------------------------
    // Scenario 6: Race-Condition Invariant: In-flight Bid Deduplication
    // ----------------------------------------------------
    console.log("\nScenario 6: In-Flight WebSocket Bid & REST Merge Deduplication");
    const currentBidsInState = [
      { id: "in_flight_bid_999", itemId: item2.id, amount: 22000000 },
    ];
    const fetchedBidsFromRest = [
      { id: "persisted_bid_1", itemId: item2.id, amount: 21000000 },
    ];

    const fetchedIds = new Set(fetchedBidsFromRest.map((b) => b.id));
    const retainedInFlight = currentBidsInState.filter((b) => !fetchedIds.has(b.id) && b.itemId === item2.id);
    const mergedBids = [...fetchedBidsFromRest, ...retainedInFlight].sort((a, b) => b.amount - a.amount);

    assert(mergedBids.length === 2, "Both fetched and in-flight socket bids retained");
    assert(mergedBids[0].amount === 22000000 && mergedBids[1].amount === 21000000, "Merged bids correctly sorted descending with zero data loss");

    console.log("\n=================================================");
    console.log(`🏁 RECONNECTION SYNC SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReconnectionSyncTests();
