import { PrismaClient } from "@prisma/client";
import { POST as placeBid } from "../app/api/items/[id]/bids/route";
import { signToken } from "../lib/auth";
import { createGuestToken } from "../lib/guest-session";
import {
  setMockIO,
  getRemainingTimerSeconds,
  stopItemTimer,
  startItemTimer,
  handleBidTimer,
} from "../lib/socket-server";

const prisma = new PrismaClient();

async function runBidSyncTimerTestSuite() {
  console.log("=================================================");
  console.log("⚡ RUNNING REAL-TIME BID SYNC & ANTI-SNIPE REGRESSION TESTS");
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

  // Mock Socket.IO server tracking emitted events to rooms
  const emittedEvents: { room: string; event: string; payload: any }[] = [];
  const mockIO: any = {
    to: (room: string) => ({
      emit: (event: string, payload: any) => {
        emittedEvents.push({ room, event, payload });
      },
    }),
    emit: (event: string, payload: any) => {
      emittedEvents.push({ room: "global", event, payload });
    },
  };
  setMockIO(mockIO);

  try {
    // ----------------------------------------------------
    // Setup Test Data
    // ----------------------------------------------------
    const uniqueSuffix = Date.now();
    const auctioneer = await prisma.user.create({
      data: {
        name: "Sync Auctioneer",
        email: `auctioneer_sync_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash",
        role: "AUCTIONEER",
      },
    });

    const bidderAUser = await prisma.user.create({
      data: {
        name: "Bidder A",
        email: `bidder_a_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash",
        role: "BIDDER",
      },
    });

    const bidderBUser = await prisma.user.create({
      data: {
        name: "Bidder B",
        email: `bidder_b_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash",
        role: "BIDDER",
      },
    });

    const auction = await prisma.auction.create({
      data: {
        name: "Sync Broadcast Cup 2026",
        auctioneerId: auctioneer.id,
        status: "LIVE",
        minimumBidIncrement: 500000,
        timerDuration: 30,
        antiSnipeThreshold: 5,
        antiSnipeExtension: 10,
        roomCode: `AUCTION-SYNC-${uniqueSuffix}`,
        spectatorInvite: `invite_spec_${uniqueSuffix}`,
        bidderInviteA: `invite_a_${uniqueSuffix}`,
        bidderInviteB: `invite_b_${uniqueSuffix}`,
      },
    });

    const participantA = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderAUser.id,
        teamName: "Mumbai Strikers",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const participantB = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderBUser.id,
        teamName: "Chennai Royals",
        initialBudget: 100000000,
        remainingBudget: 100000000,
        totalSpent: 0,
      },
    });

    const item1 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Virat Kohli",
        category: "BATSMAN",
        basePrice: 20000000,
        orderIndex: 1,
        status: "ACTIVE",
      },
    });

    const item2 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Jasprit Bumrah",
        category: "BOWLER",
        basePrice: 15000000,
        orderIndex: 2,
        status: "PENDING",
      },
    });

    await prisma.auction.update({
      where: { id: auction.id },
      data: { activeItemId: item1.id },
    });

    const bidderAToken = signToken({
      userId: bidderAUser.id,
      email: bidderAUser.email,
      name: bidderAUser.name,
      role: "BIDDER",
    });

    const bidderBToken = signToken({
      userId: bidderBUser.id,
      email: bidderBUser.email,
      name: bidderBUser.name,
      role: "BIDDER",
    });

    const guestBidderBToken = createGuestToken({
      isGuest: true,
      userId: `guest_b_${uniqueSuffix}`,
      auctionId: auction.id,
      teamSlot: "B",
      role: "BIDDER",
      participantId: participantB.id,
      tokenVersion: `invite_b_${uniqueSuffix}`,
    });

    // ----------------------------------------------------
    // Test 1: Lot starts at 30s
    // ----------------------------------------------------
    console.log("Test 1: Lot initial countdown starts at timerDuration (30s)");
    startItemTimer(auction.id, item1.id, auction.timerDuration);
    const initialRemaining = getRemainingTimerSeconds(auction.id);
    assert(initialRemaining !== null && initialRemaining >= 29, "Lot timer starts at ~30s");

    // ----------------------------------------------------
    // Test 2: Bid at 20s remaining → countdown keeps running (~20s) without reset
    // ----------------------------------------------------
    console.log("\nTest 2: Normal bid at 20s remaining keeps existing countdown running");
    const activeTimer = global.auctionActiveTimers?.get(auction.id);
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 20000; // set to 20s remaining
    }

    emittedEvents.length = 0;
    const bid1Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 20000000, requestId: `req_1_${uniqueSuffix}` }),
    });

    const bid1Res = await placeBid(bid1Req, { params: { id: item1.id } });
    const bid1Data = await bid1Res.json();

    assert(bid1Res.status === 200 && bid1Data.success === true, "Bidder A bid accepted");
    const bid1Event = emittedEvents.find((e) => e.event === "bid_placed");
    assert(
      bid1Event?.payload?.secondsRemaining >= 19 && bid1Event?.payload?.secondsRemaining <= 21,
      `Timer remains at ~20s (${bid1Event?.payload?.secondsRemaining}s) without reset to 30s`
    );

    // ----------------------------------------------------
    // Test 3: Bid at 10s remaining → countdown keeps running (~10s) without reset
    // ----------------------------------------------------
    console.log("\nTest 3: Normal bid at 10s remaining keeps existing countdown running");
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 10000; // set to 10s remaining (> 5s threshold)
    }

    emittedEvents.length = 0;
    const bid2Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 20500000, requestId: `req_2_${uniqueSuffix}` }),
    });

    const bid2Res = await placeBid(bid2Req, { params: { id: item1.id } });
    const bid2Data = await bid2Res.json();

    assert(bid2Res.status === 200 && bid2Data.success === true, "Bidder B counter-bid accepted");
    const bid2Event = emittedEvents.find((e) => e.event === "bid_placed");
    assert(
      bid2Event?.payload?.secondsRemaining >= 9 && bid2Event?.payload?.secondsRemaining <= 11,
      `Timer remains at ~10s (${bid2Event?.payload?.secondsRemaining}s) without reset to 30s`
    );

    // ----------------------------------------------------
    // Test 4: Bid at 5s remaining (anti-snipe threshold) → extends by +10s (to ~15s)
    // ----------------------------------------------------
    console.log("\nTest 4: Bid at exactly 5s threshold triggers anti-snipe extension (+10s)");
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 5000; // exactly 5s left
    }

    emittedEvents.length = 0;
    const bid3Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 21000000, requestId: `req_3_${uniqueSuffix}` }),
    });

    const bid3Res = await placeBid(bid3Req, { params: { id: item1.id } });
    const bid3Data = await bid3Res.json();

    assert(bid3Res.status === 200, "Bid placed at 5s threshold accepted");
    const bid3Event = emittedEvents.find((e) => e.event === "bid_placed");
    assert(
      bid3Event?.payload?.secondsRemaining >= 14 && bid3Event?.payload?.secondsRemaining <= 16,
      `Anti-snipe extended timer by +10s to ~15s (Actual: ${bid3Event?.payload?.secondsRemaining}s)`
    );

    // ----------------------------------------------------
    // Test 5: Bid at 3s remaining (inside threshold) → extends by +10s (to ~13s)
    // ----------------------------------------------------
    console.log("\nTest 5: Bid at 3s remaining triggers anti-snipe extension (+10s)");
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 3000; // 3s left
    }

    emittedEvents.length = 0;
    const bid4Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 21500000, requestId: `req_4_${uniqueSuffix}` }),
    });

    const bid4Res = await placeBid(bid4Req, { params: { id: item1.id } });
    const bid4Data = await bid4Res.json();

    assert(bid4Res.status === 200, "Bid placed at 3s accepted");
    const bid4Event = emittedEvents.find((e) => e.event === "bid_placed");
    assert(
      bid4Event?.payload?.secondsRemaining >= 12 && bid4Event?.payload?.secondsRemaining <= 14,
      `Anti-snipe extended timer by +10s to ~13s (Actual: ${bid4Event?.payload?.secondsRemaining}s)`
    );

    // ----------------------------------------------------
    // Test 6: Multiple consecutive anti-snipe bids each extend correctly
    // ----------------------------------------------------
    console.log("\nTest 6: Multiple consecutive anti-snipe bids extend countdown cumulatively");
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 2000; // 2s left
    }

    emittedEvents.length = 0;
    const bid5Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 22000000, requestId: `req_5_${uniqueSuffix}` }),
    });

    const bid5Res = await placeBid(bid5Req, { params: { id: item1.id } });
    assert(bid5Res.status === 200, "First rapid anti-snipe bid accepted");
    const bid5Event = emittedEvents.find((e) => e.event === "bid_placed");
    const expiryAfterBid5 = bid5Event?.payload?.secondsRemaining;
    assert(expiryAfterBid5 >= 11 && expiryAfterBid5 <= 13, `Extended to ~12s (Actual: ${expiryAfterBid5}s)`);

    // Set again to 4s and place another bid
    if (activeTimer) {
      activeTimer.timerExpiry = Date.now() + 4000;
    }
    const bid6Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 22500000, requestId: `req_6_${uniqueSuffix}` }),
    });

    const bid6Res = await placeBid(bid6Req, { params: { id: item1.id } });
    assert(bid6Res.status === 200, "Second rapid anti-snipe bid accepted");
    const bid6Event = emittedEvents.filter((e) => e.event === "bid_placed")[1];
    assert(
      bid6Event?.payload?.secondsRemaining >= 13 && bid6Event?.payload?.secondsRemaining <= 15,
      `Second anti-snipe bid extended timer to ~14s (Actual: ${bid6Event?.payload?.secondsRemaining}s)`
    );

    // ----------------------------------------------------
    // Test 7: Rejected bid does NOT change timer or broadcast
    // ----------------------------------------------------
    console.log("\nTest 7: Rejected bid does NOT modify timer or broadcast");
    const timerBefore7 = getRemainingTimerSeconds(auction.id);
    const bidEventsBefore7 = emittedEvents.filter((e) => e.event === "bid_placed").length;

    const rejectedBidReq = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 22600000 }), // Rejected: minimum increment requires 23,000,000
    });

    const rejectedBidRes = await placeBid(rejectedBidReq, { params: { id: item1.id } });
    assert(rejectedBidRes.status === 400, "Low bid rejected with 400");
    const bidEventsAfter7 = emittedEvents.filter((e) => e.event === "bid_placed").length;
    assert(bidEventsAfter7 === bidEventsBefore7, "No bid_placed event emitted for rejected bid");
    const timerAfter7 = getRemainingTimerSeconds(auction.id);
    assert(
      timerBefore7 !== null && timerAfter7 !== null && Math.abs(timerBefore7 - timerAfter7) <= 2,
      "Timer was not modified on rejected bid"
    );

    // ----------------------------------------------------
    // Test 8: All clients receive accepted bid immediately via Socket.IO
    // ----------------------------------------------------
    console.log("\nTest 8: Authoritative bid_placed room broadcast");
    emittedEvents.length = 0;

    const bid8Req = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 23000000, requestId: `req_8_${uniqueSuffix}` }),
    });

    const bid8Res = await placeBid(bid8Req, { params: { id: item1.id } });
    assert(bid8Res.status === 200, "Bid 8 accepted");
    const roomEvents = emittedEvents.filter((e) => e.room === `auction_${auction.id}`);
    const bidPlaced = roomEvents.find((e) => e.event === "bid_placed");
    assert(bidPlaced !== undefined, "bid_placed broadcast to auction room auction_" + auction.id);
    assert(bidPlaced?.payload?.newHighestBid === 23000000, "Broadcast has newHighestBid 23,000,000");
    assert(
      bidPlaced?.payload?.bid?.bidder?.participant?.teamName === "Mumbai Strikers",
      "Broadcast includes teamName Mumbai Strikers"
    );

    // ----------------------------------------------------
    // Test 9: All clients receive authoritative timer state immediately
    // ----------------------------------------------------
    console.log("\nTest 9: Authoritative timer state included in broadcast");
    assert(
      typeof bidPlaced?.payload?.secondsRemaining === "number",
      "bid_placed payload has authoritative secondsRemaining"
    );
    assert(
      typeof bidPlaced?.payload?.timerExpiry === "string",
      "bid_placed payload has ISO timerExpiry"
    );

    // ----------------------------------------------------
    // Test 10: Rapid consecutive bids preserve correct timer & bid ordering
    // ----------------------------------------------------
    console.log("\nTest 10: Rapid consecutive bids concurrency & ordering");
    const rapid1 = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 23500000, requestId: `rapid_1_${uniqueSuffix}` }),
    });

    const rapid2 = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 24000000, requestId: `rapid_2_${uniqueSuffix}` }),
    });

    const [r1, r2] = await Promise.all([
      placeBid(rapid1, { params: { id: item1.id } }),
      placeBid(rapid2, { params: { id: item1.id } }),
    ]);

    assert(r1.status === 200 || r2.status === 200, "Atomic rapid bid processing succeeded");
    const finalHighestBid = await prisma.bid.findFirst({
      where: { itemId: item1.id },
      orderBy: { amount: "desc" },
    });
    assert(finalHighestBid?.amount === 24000000, "Database highest bid strictly matches 24,000,000");

    // Clean up timer
    stopItemTimer(auction.id);
  } catch (error: any) {
    console.error("Test execution threw error:", error);
    failedTests++;
  }

  console.log("\n=================================================");
  console.log(`📊 RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log("=================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runBidSyncTimerTestSuite();
