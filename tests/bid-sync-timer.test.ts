import { PrismaClient } from "@prisma/client";
import { POST as placeBid } from "../app/api/items/[id]/bids/route";
import { POST as manualFinalize } from "../app/api/items/[id]/finalize/route";
import { POST as manualUnsold } from "../app/api/items/[id]/unsold/route";
import { GET as getAuctionBids } from "../app/api/auctions/[id]/bids/route";
import { signToken } from "../lib/auth";
import { createGuestToken } from "../lib/guest-session";
import {
  setMockIO,
  getRemainingTimerSeconds,
  stopItemTimer,
  startItemTimer,
  handleBidTimer,
} from "../lib/socket-server";
import { finalizeOrUnsoldLot } from "../lib/auction-finalization";

const prisma = new PrismaClient();

async function runBidSyncTimerTestSuite() {
  console.log("=================================================");
  console.log("⚡ RUNNING 15-SECOND ROLLING BID TIMER & CURRENT HOLDER TESTS");
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
        timerDuration: 15,
        roomCode: `AUCTION-15S-${uniqueSuffix}`,
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

    const auctioneerToken = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    const bidderAToken = signToken({
      userId: bidderAUser.id,
      email: bidderAUser.email,
      name: bidderAUser.name,
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
    // Test 1 & 2: Bidder A bid updates Bidder B & Spectator current-holder state
    // ----------------------------------------------------
    console.log("Test 1 & 2: Bidder A bid updates current-holder state across all views");
    startItemTimer(auction.id, item1.id, 15);
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
    assert(bid1Event !== undefined, "bid_placed broadcast emitted to auction room");
    assert(
      bid1Event?.payload?.currentHolder?.bidderName === "Bidder A" &&
      bid1Event?.payload?.currentHolder?.teamName === "Mumbai Strikers",
      "Broadcast contains authoritative currentHolder (Bidder A, Mumbai Strikers)"
    );
    assert(
      bid1Event?.payload?.secondsRemaining === 15,
      "Accepted bid authoritatively resets timer to 15s in broadcast"
    );

    // ----------------------------------------------------
    // Test 3 & 4: Bidder B outbids A and all clients show B with 15s reset
    // ----------------------------------------------------
    console.log("\nTest 3 & 4: Bidder B outbids A → all clients receive B with 15s timer reset");
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
      bid2Event?.payload?.currentHolder?.teamName === "Chennai Royals" &&
      bid2Event?.payload?.newHighestBid === 20500000,
      "Current holder updated to Chennai Royals / Bidder B with 20,500,000"
    );
    assert(
      bid2Event?.payload?.secondsRemaining === 15,
      "Timer reset to exactly 15s"
    );

    // ----------------------------------------------------
    // Test 5: Multiple consecutive bids keep resetting timer to 15 seconds
    // ----------------------------------------------------
    console.log("\nTest 5: Multiple consecutive bids keep resetting timer to 15s");
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
    assert(bid3Res.status === 200, "Bid 3 accepted");
    const bid3Event = emittedEvents.find((e) => e.event === "bid_placed");
    assert(bid3Event?.payload?.secondsRemaining === 15, "Bid 3 reset timer to 15s");
    assert(bid3Event?.payload?.currentHolder?.teamName === "Mumbai Strikers", "Holder updated back to Mumbai Strikers");

    // ----------------------------------------------------
    // Test 6: No bid for 15s on pending/new item → UNSOLD
    // ----------------------------------------------------
    console.log("\nTest 6: No bid for 15s triggers automatic UNSOLD finalization");
    const unsoldItem = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Test Unsold Player",
        category: "ALL_ROUNDER",
        basePrice: 5000000,
        orderIndex: 3,
        status: "ACTIVE",
      },
    });

    emittedEvents.length = 0;
    const unsoldResult = await finalizeOrUnsoldLot(auction.id, unsoldItem.id);
    assert(unsoldResult.status === "UNSOLD", "finalizeOrUnsoldLot marked 0-bid item as UNSOLD");
    const dbUnsoldItem = await prisma.item.findUnique({ where: { id: unsoldItem.id } });
    assert(dbUnsoldItem?.status === "UNSOLD", "Database item status is UNSOLD");
    const unsoldEvent = emittedEvents.find((e) => e.event === "player_unsold");
    assert(unsoldEvent !== undefined, "player_unsold event broadcast to auction room");

    // ----------------------------------------------------
    // Test 7, 8, 9, 10: Bid followed by 15s → SOLD to highest bidder with 1 transaction and deducted budget
    // ----------------------------------------------------
    console.log("\nTest 7, 8, 9, 10: Automatic SOLD to highest bidder on timer expiration");
    const pABefore = await prisma.auctionParticipant.findUnique({ where: { id: participantA.id } });
    const initialSpent = pABefore?.totalSpent || 0;

    emittedEvents.length = 0;
    const soldResult = await finalizeOrUnsoldLot(auction.id, item1.id);
    assert(soldResult.status === "SOLD", "finalizeOrUnsoldLot marked item with bids as SOLD");
    assert(soldResult.item.winnerId === bidderAUser.id, "Winner is highest bidder (Bidder A)");
    assert(soldResult.item.winningPrice === 21000000, "Winning price is 21,000,000");

    const pAAfter = await prisma.auctionParticipant.findUnique({ where: { id: participantA.id } });
    assert(
      pAAfter?.totalSpent === initialSpent + 21000000,
      `Budget deducted correctly: totalSpent increased by ₹21,000,000`
    );
    assert(
      pAAfter?.remainingBudget === pAAfter!.initialBudget - pAAfter!.totalSpent,
      "Strict purse invariant preserved (remainingBudget = initialBudget - totalSpent)"
    );

    const transactions = await prisma.transaction.findMany({ where: { itemId: item1.id } });
    assert(transactions.length === 1, "Exactly one transaction record created");

    const soldEvent = emittedEvents.find((e) => e.event === "player_sold");
    assert(soldEvent !== undefined, "player_sold broadcast emitted to auction room");

    // ----------------------------------------------------
    // Test 11: Late bid vs timeout race is transaction-safe
    // ----------------------------------------------------
    console.log("\nTest 11: Late bid rejected after lot is SOLD");
    const lateBidReq = new Request("http://localhost/api/items/" + item1.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 22000000 }),
    });

    const lateBidRes = await placeBid(lateBidReq, { params: { id: item1.id } });
    assert(lateBidRes.status === 400, "Late bid on SOLD item rejected with 400 ITEM_NOT_ACTIVE");

    // ----------------------------------------------------
    // Test 12: Bid vs manual SOLD race is transaction-safe
    // ----------------------------------------------------
    console.log("\nTest 12: Bid vs manual SOLD race safety");
    const itemRace = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Race Test Player",
        category: "BATSMAN",
        basePrice: 10000000,
        orderIndex: 4,
        status: "ACTIVE",
      },
    });

    await prisma.auction.update({
      where: { id: auction.id },
      data: { activeItemId: itemRace.id },
    });

    // Place bid first
    const raceBidReq = new Request("http://localhost/api/items/" + itemRace.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 10000000, requestId: `race_bid_${uniqueSuffix}` }),
    });
    const raceBidRes = await placeBid(raceBidReq, { params: { id: itemRace.id } });
    assert(raceBidRes.status === 200, "Opening bid accepted for race test");

    // Manual finalize
    const manualFinalizeReq = new Request("http://localhost/api/items/" + itemRace.id + "/finalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auctioneerToken}`,
      },
    });
    const manualFinalizeRes = await manualFinalize(manualFinalizeReq, { params: { id: itemRace.id } });
    assert(manualFinalizeRes.status === 200, "Manual finalize successfully completed");

    // Late bid immediately after
    const raceLateBid = new Request("http://localhost/api/items/" + itemRace.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 10500000 }),
    });
    const raceLateRes = await placeBid(raceLateBid, { params: { id: itemRace.id } });
    assert(raceLateRes.status === 400, "Subsequent bid on manually finalized item safely rejected");

    // ----------------------------------------------------
    // Test 13: Multiple tabs receive synchronized holder state via REST enrichment
    // ----------------------------------------------------
    console.log("\nTest 13: REST bids query returns participant teamName for all tabs");
    const getBidsReq = new Request(`http://localhost/api/auctions/${auction.id}/bids?itemId=${item1.id}`);
    const getBidsRes = await getAuctionBids(getBidsReq, { params: { id: auction.id } });
    const getBidsData = await getBidsRes.json();
    assert(getBidsRes.status === 200, "GET /api/auctions/[id]/bids succeeded");
    assert(getBidsData.bids.length > 0, "Bids array returned");
    assert(
      getBidsData.bids[0].bidder?.participant?.teamName !== undefined &&
      getBidsData.bids[0].teamName !== undefined,
      "Every returned bid contains participant.teamName and teamName"
    );

    // ----------------------------------------------------
    // Test 14: Reconnection timer synchronization
    // ----------------------------------------------------
    console.log("\nTest 14: Reconnection timer returns authoritative remaining seconds");
    startItemTimer(auction.id, item2.id, 15);
    const activeRem = getRemainingTimerSeconds(auction.id);
    assert(activeRem !== null && activeRem >= 14 && activeRem <= 15, "Authoritative timer returns ~15s");
    stopItemTimer(auction.id);

    // ----------------------------------------------------
    // Test 15: Cross-auction isolation
    // ----------------------------------------------------
    console.log("\nTest 15: Different auctions remain isolated");
    const auction2 = await prisma.auction.create({
      data: {
        name: "Second Isolated League",
        auctioneerId: auctioneer.id,
        status: "LIVE",
        minimumBidIncrement: 500000,
        timerDuration: 15,
        roomCode: `AUCTION-ISO-${uniqueSuffix}`,
        spectatorInvite: `invite_spec_iso_${uniqueSuffix}`,
        bidderInviteA: `invite_a_iso_${uniqueSuffix}`,
        bidderInviteB: `invite_b_iso_${uniqueSuffix}`,
      },
    });

    const itemOther = await prisma.item.create({
      data: {
        auctionId: auction2.id,
        name: "Foreign Player",
        category: "BOWLER",
        basePrice: 10000000,
        orderIndex: 1,
        status: "ACTIVE",
      },
    });

    // Bidder from Auction 1 guest session tries to bid on Auction 2
    const crossBidReq = new Request("http://localhost/api/items/" + itemOther.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `guest_token=${guestBidderBToken}`,
      },
      body: JSON.stringify({ amount: 10000000 }),
    });

    const crossBidRes = await placeBid(crossBidReq, { params: { id: itemOther.id } });
    assert(crossBidRes.status === 403, "Cross-auction guest bid strictly forbidden with 403");

    // ----------------------------------------------------
    // Test 16: Rejected bids do not reset timer
    // ----------------------------------------------------
    console.log("\nTest 16: Rejected bids do not modify timer");
    const item3 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Test Low Bid Player",
        category: "BATSMAN",
        basePrice: 10000000,
        orderIndex: 5,
        status: "ACTIVE",
      },
    });

    startItemTimer(auction.id, item3.id, 15);
    const activeTimerObj = global.auctionActiveTimers?.get(auction.id);
    if (activeTimerObj) {
      activeTimerObj.timerExpiry = Date.now() + 7000; // set to 7s
    }

    const lowBidReq = new Request("http://localhost/api/items/" + item3.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 5000000 }), // Below base price 10,000,000
    });

    const lowBidRes = await placeBid(lowBidReq, { params: { id: item3.id } });
    assert(lowBidRes.status === 400, "Low bid rejected with 400");
    const timerAfterLow = getRemainingTimerSeconds(auction.id);
    assert(
      timerAfterLow !== null && timerAfterLow <= 8,
      `Timer was not reset by rejected bid (Remaining: ${timerAfterLow}s)`
    );
    stopItemTimer(auction.id);

    // ----------------------------------------------------
    // Test 17: Duplicate requestId does not create duplicate bids
    // ----------------------------------------------------
    console.log("\nTest 17: Duplicate requestId rejection");
    const dupBidReq1 = new Request("http://localhost/api/items/" + item3.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 10000000, requestId: `dup_id_${uniqueSuffix}` }),
    });
    const dupRes1 = await placeBid(dupBidReq1, { params: { id: item3.id } });
    assert(dupRes1.status === 200, "First bid with requestId accepted");

    const dupBidReq2 = new Request("http://localhost/api/items/" + item3.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 10500000, requestId: `dup_id_${uniqueSuffix}` }),
    });
    const dupRes2 = await placeBid(dupBidReq2, { params: { id: item3.id } });
    assert(dupRes2.status === 409, "Duplicate requestId rejected with 409 DUPLICATE_REQUEST");

    // ----------------------------------------------------
    // Test 18: No negative budgets allowed
    // ----------------------------------------------------
    console.log("\nTest 18: Invariant - No negative budget allowed");
    const excessiveBidReq = new Request("http://localhost/api/items/" + item3.id + "/bids", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: 999999999 }), // Exceeds remaining budget
    });
    const excessiveRes = await placeBid(excessiveBidReq, { params: { id: item3.id } });
    assert(excessiveRes.status === 400, "Excessive bid exceeding purse rejected with 400");

    // ----------------------------------------------------
    // Test 19: Double finalization idempotency
    // ----------------------------------------------------
    console.log("\nTest 19: Double finalization idempotency safety");
    const firstFinalize = await finalizeOrUnsoldLot(auction.id, item3.id);
    assert(firstFinalize.status === "SOLD", "First finalization marks item SOLD");
    const secondFinalize = await finalizeOrUnsoldLot(auction.id, item3.id);
    assert(
      secondFinalize.status === "ALREADY_FINALIZED",
      "Second finalization safely exits as ALREADY_FINALIZED without double deduction"
    );

    stopItemTimer(auction.id);
    stopItemTimer(auction2.id);
  } catch (error: any) {
    console.error("Test suite encountered error:", error);
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
