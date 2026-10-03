import assert from "node:assert";
import { prisma } from "../lib/prisma";
import { calculateSquadLimit, isTeamSquadLimitReached } from "../lib/squad-limits";
import { getAuctionRoundStatus, transitionToNextRound } from "../lib/auction-rounds";
import { advanceAuctionPlayer } from "../lib/auction-advancement";
import { finalizeOrUnsoldLot } from "../lib/auction-finalization";
import { POST as placeBid } from "../app/api/items/[id]/bids/route";
import { POST as startAuction } from "../app/api/auctions/[id]/start/route";
import { POST as createAuction } from "../app/api/auctions/route";
import { POST as reAuction } from "../app/api/auctions/[id]/re-auction/route";
import { signToken } from "../lib/auth";
import { setMockIO, registerMockPresence } from "../lib/socket-server";

import { randomUUID } from "node:crypto";

// Mock Socket.IO to capture events
const capturedEvents: Array<{ event: string; payload: any }> = [];
const mockIO = {
  to: (room: string) => ({
    emit: (event: string, payload: any) => {
      capturedEvents.push({ event, payload });
    },
  }),
  emit: (event: string, payload: any) => {
    capturedEvents.push({ event, payload });
  },
};

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${desc}`);
      console.error(err);
      failed++;
      throw err;
    }
  })();
}

async function runTests() {
  console.log("=================================================");
  console.log("TEST SUITE: THREE-ROUND SYSTEM & SQUAD LIMITS");
  console.log("=================================================");

  setMockIO(mockIO);

  // 1. UNIT TESTS: Squad Limit Formula Floor(N / 2)
  console.log("\n--- GROUP 1: Squad Limit Math Floor(N / 2) ---");
  await it("N=10 -> limit=5", () => {
    assert.strictEqual(calculateSquadLimit(10), 5);
  });

  await it("N=12 -> limit=6", () => {
    assert.strictEqual(calculateSquadLimit(12), 6);
  });

  await it("N=15 -> limit=7", () => {
    assert.strictEqual(calculateSquadLimit(15), 7);
  });

  await it("N=20 -> limit=10", () => {
    assert.strictEqual(calculateSquadLimit(20), 10);
  });

  await it("isTeamSquadLimitReached correctly evaluates sold player thresholds", () => {
    assert.strictEqual(isTeamSquadLimitReached(4, 10), false);
    assert.strictEqual(isTeamSquadLimitReached(5, 10), true);
    assert.strictEqual(isTeamSquadLimitReached(6, 10), true);

    assert.strictEqual(isTeamSquadLimitReached(6, 15), false);
    assert.strictEqual(isTeamSquadLimitReached(7, 15), true);
  });

  // Setup test users & test auction in DB
  const auctioneer = await prisma.user.upsert({
    where: { email: "auctioneer_3r_test@bidxi.com" },
    update: {},
    create: {
      email: "auctioneer_3r_test@bidxi.com",
      name: "Auctioneer 3R",
      passwordHash: "hash",
      role: "AUCTIONEER",
    },
  });
  const auctioneerToken = signToken({
    userId: auctioneer.id,
    email: auctioneer.email,
    name: auctioneer.name,
    role: "AUCTIONEER",
  });

  const bidderA = await prisma.user.upsert({
    where: { email: "bidderA_3r@bidxi.com" },
    update: {},
    create: {
      email: "bidderA_3r@bidxi.com",
      name: "Bidder A",
      passwordHash: "hash",
      role: "BIDDER",
    },
  });
  const bidderAToken = signToken({
    userId: bidderA.id,
    email: bidderA.email,
    name: bidderA.name,
    role: "BIDDER",
  });

  const bidderB = await prisma.user.upsert({
    where: { email: "bidderB_3r@bidxi.com" },
    update: {},
    create: {
      email: "bidderB_3r@bidxi.com",
      name: "Bidder B",
      passwordHash: "hash",
      role: "BIDDER",
    },
  });
  const bidderBToken = signToken({
    userId: bidderB.id,
    email: bidderB.email,
    name: bidderB.name,
    role: "BIDDER",
  });

  // Create an auction with maxSquadSize = 4 (squad limit = Floor(4/2) = 2)
  const auction = await prisma.auction.create({
    data: {
      roomCode: randomUUID(),
      bidderInviteA: randomUUID(),
      bidderInviteB: randomUUID(),
      spectatorInvite: randomUUID(),
      name: "3-Round & Squad Limit Test Auction",
      auctioneerId: auctioneer.id,
      status: "DRAFT",
      maxSquadSize: 4, // Limit will be exactly 2 players per team!
      minimumBidIncrement: 100000,
      currentRound: 1,
      participants: {
        create: [
          {
            userId: bidderA.id,
            teamName: "Team Titans (A)",
            initialBudget: 50000000,
            remainingBudget: 50000000,
          },
          {
            userId: bidderB.id,
            teamName: "Team Warriors (B)",
            initialBudget: 50000000,
            remainingBudget: 50000000,
          },
        ],
      },
      items: {
        create: [
          { name: "Player 1 (A1)", category: "Batsman", basePrice: 1000000, orderIndex: 1, round: 1, status: "PENDING" },
          { name: "Player 2 (A2)", category: "Bowler", basePrice: 1000000, orderIndex: 2, round: 1, status: "PENDING" },
          { name: "Player 3 (A3)", category: "All-Rounder", basePrice: 1000000, orderIndex: 3, round: 1, status: "PENDING" },
          { name: "Player 4 (A4)", category: "Wicket-Keeper", basePrice: 1000000, orderIndex: 4, round: 1, status: "PENDING" },
          { name: "Player 5 (A5)", category: "Batsman", basePrice: 1000000, orderIndex: 5, round: 1, status: "PENDING" },
        ],
      },
    },
    include: { items: { orderBy: { orderIndex: "asc" } }, participants: true },
  });

  // Register presence for Bidder A & Bidder B
  registerMockPresence(auction.id, {
    socketId: "mock-bidder-a",
    userId: bidderA.id,
    role: "BIDDER",
    teamSlot: "A",
  });
  registerMockPresence(auction.id, {
    socketId: "mock-bidder-b",
    userId: bidderB.id,
    role: "BIDDER",
    teamSlot: "B",
  });

  // Start auction
  const startRes = await startAuction(
    new Request(`http://localhost/api/auctions/${auction.id}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    }),
    { params: { id: auction.id } }
  );
  if (startRes.status !== 200) {
    const errBody = await startRes.json();
    console.error("startAuction error:", errBody);
  }
  assert.strictEqual(startRes.status, 200);

  console.log("\n--- GROUP 2: Round 1 & Highest Bid Event ---");
  const items = await prisma.item.findMany({
    where: { auctionId: auction.id },
    orderBy: { orderIndex: "asc" },
  });

  await it("Round 1: First item is active (orderIndex: 1)", async () => {
    const updatedAuction = await prisma.auction.findUnique({ where: { id: auction.id } });
    assert.strictEqual(updatedAuction?.activeItemId, items[0].id);
    assert.strictEqual(updatedAuction?.currentRound, 1);
  });

  await it("Placing bid emits new_highest_bid event", async () => {
    capturedEvents.length = 0;
    const bidRes = await placeBid(
      new Request(`http://localhost/api/items/${items[0].id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bidderAToken}`,
        },
        body: JSON.stringify({ amount: 1200000 }),
      }),
      { params: { id: items[0].id } }
    );
    assert.strictEqual(bidRes.status, 200);

    const highBidEvent = capturedEvents.find((e) => e.event === "new_highest_bid");
    assert(highBidEvent, "new_highest_bid event was emitted");
    assert.strictEqual(highBidEvent.payload.bidAmount, 1200000);
    assert.strictEqual(highBidEvent.payload.team, "Team Titans (A)");
  });

  await it("Finalizing Item 1 as SOLD gives Team A 1/2 players", async () => {
    const res = await finalizeOrUnsoldLot(auction.id, items[0].id, auctioneer.id);
    assert.strictEqual(res.status, "SOLD");
    assert.strictEqual(res.squadCount, 1);
    assert.strictEqual(res.maxSquadLimit, 2);

    const soldEvent = capturedEvents.find((e) => e.event === "player_sold");
    assert(soldEvent, "player_sold event emitted");
    assert.strictEqual(soldEvent.payload.squadCount, 1);

    const squadEvent = capturedEvents.find((e) => e.event === "squad_updated");
    assert(squadEvent, "squad_updated event emitted");
    assert.strictEqual(squadEvent.payload.squadCount, 1);
    assert.strictEqual(squadEvent.payload.squadLimit, 2);
  });

  console.log("\n--- GROUP 3: Squad Limit Enforcement (Limit = 2) ---");
  await it("Advance to Item 2, sell to Team A -> Team A reaches 2/2 limit", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.item.id, items[1].id);

    // Bidder A bids
    await placeBid(
      new Request(`http://localhost/api/items/${items[1].id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bidderAToken}`,
        },
        body: JSON.stringify({ amount: 1500000 }),
      }),
      { params: { id: items[1].id } }
    );

    const res = await finalizeOrUnsoldLot(auction.id, items[1].id, auctioneer.id);
    assert.strictEqual(res.status, "SOLD");
    assert.strictEqual(res.squadCount, 2); // 2/2 reached!
  });

  await it("Team A cannot place bids once limit (2/2) is reached (TEAM_PLAYER_LIMIT_REACHED)", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.item.id, items[2].id);

    // Bidder A attempts to bid on Item 3
    const blockedBidRes = await placeBid(
      new Request(`http://localhost/api/items/${items[2].id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bidderAToken}`,
        },
        body: JSON.stringify({ amount: 1500000 }),
      }),
      { params: { id: items[2].id } }
    );

    assert.strictEqual(blockedBidRes.status, 400);
    const body = await blockedBidRes.json();
    assert(body.error.includes("TEAM_PLAYER_LIMIT_REACHED"), "Error code TEAM_PLAYER_LIMIT_REACHED returned");
  });

  await it("Other teams (Team B) can still bid and acquire players", async () => {
    // Bidder B bids on Item 3
    const allowedBidRes = await placeBid(
      new Request(`http://localhost/api/items/${items[2].id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bidderBToken}`,
        },
        body: JSON.stringify({ amount: 1500000 }),
      }),
      { params: { id: items[2].id } }
    );

    assert.strictEqual(allowedBidRes.status, 200);

    const res = await finalizeOrUnsoldLot(auction.id, items[2].id, auctioneer.id);
    assert.strictEqual(res.status, "SOLD");
    assert.strictEqual(res.squadCount, 1); // Team B now has 1/2
  });

  await it("Item 4 passes UNSOLD in Round 1 (does not count toward limit)", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.item.id, items[3].id);

    // 0 bids -> UNSOLD
    const res = await finalizeOrUnsoldLot(auction.id, items[3].id, auctioneer.id);
    assert.strictEqual(res.status, "UNSOLD");
    assert.strictEqual(res.item.round, 1);
  });

  await it("Item 5 passes UNSOLD in Round 1", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.item.id, items[4].id);

    const res = await finalizeOrUnsoldLot(auction.id, items[4].id, auctioneer.id);
    assert.strictEqual(res.status, "UNSOLD");
    assert.strictEqual(res.item.round, 1);
  });

  console.log("\n--- GROUP 4: Round 1 Completion & Round 2 Transition ---");
  await it("Round 1 completes with 3 SOLD, 2 UNSOLD", async () => {
    const dbAuction = await prisma.auction.findUnique({
      where: { id: auction.id },
      include: { items: true },
    });
    const roundStatus = getAuctionRoundStatus(dbAuction as any);
    assert.strictEqual(roundStatus.isRoundComplete, true);
    assert.strictEqual(roundStatus.currentRound, 1);
    assert.strictEqual(roundStatus.canStartNextRound, true);
    assert.strictEqual(roundStatus.nextRoundNumber, 2);
    assert.strictEqual(roundStatus.eligibleUnsoldCount, 2);
    assert.deepStrictEqual(
      roundStatus.eligibleItems.map((i: any) => i.id),
      [items[3].id, items[4].id]
    );
  });

  await it("Transition to Round 2: Only Round-1 UNSOLD items enter, relative orderIndex preserved", async () => {
    const res = await transitionToNextRound(auction.id, 2, auctioneer.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.round, 2);
    assert.strictEqual(res.eligibleCount, 2);
    assert.strictEqual(res.activatedItem.id, items[3].id); // Item 4 (orderIndex 4) before Item 5 (orderIndex 5)

    const updatedAuction = await prisma.auction.findUnique({ where: { id: auction.id } });
    assert.strictEqual(updatedAuction?.currentRound, 2);

    // Verify SOLD items from Round 1 remain SOLD and were not touched
    const soldItem1 = await prisma.item.findUnique({ where: { id: items[0].id } });
    assert.strictEqual(soldItem1?.status, "SOLD");
    assert.strictEqual(soldItem1?.round, 1);
  });

  await it("Item 4 is SOLD to Team B in Round 2 -> Team B reaches 2/2 limit", async () => {
    // Bidder B bids on Item 4
    await placeBid(
      new Request(`http://localhost/api/items/${items[3].id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bidderBToken}`,
        },
        body: JSON.stringify({ amount: 2000000 }),
      }),
      { params: { id: items[3].id } }
    );

    const res = await finalizeOrUnsoldLot(auction.id, items[3].id, auctioneer.id);
    assert.strictEqual(res.status, "SOLD");
    assert.strictEqual(res.squadCount, 2); // Team B now has 2/2!
    assert.strictEqual(res.item.round, 2);
  });

  await it("Item 5 passes UNSOLD in Round 2 -> eligible for Round 3", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.item.id, items[4].id);

    const res = await finalizeOrUnsoldLot(auction.id, items[4].id, auctioneer.id);
    assert.strictEqual(res.status, "UNSOLD");
    assert.strictEqual(res.item.round, 2);
  });

  console.log("\n--- GROUP 5: Round 2 Completion & Round 3 Transition ---");
  await it("Round 2 completes with 1 player remaining for Round 3", async () => {
    const dbAuction = await prisma.auction.findUnique({
      where: { id: auction.id },
      include: { items: true },
    });
    const roundStatus = getAuctionRoundStatus(dbAuction as any);
    assert.strictEqual(roundStatus.isRoundComplete, true);
    assert.strictEqual(roundStatus.currentRound, 2);
    assert.strictEqual(roundStatus.canStartNextRound, true);
    assert.strictEqual(roundStatus.nextRoundNumber, 3);
    assert.strictEqual(roundStatus.eligibleUnsoldCount, 1);
    assert.strictEqual(roundStatus.eligibleItems[0].id, items[4].id);
  });

  await it("Transition to Round 3: Item 5 enters Round 3", async () => {
    const res = await transitionToNextRound(auction.id, 3, auctioneer.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.round, 3);
    assert.strictEqual(res.eligibleCount, 1);
    assert.strictEqual(res.activatedItem.id, items[4].id);

    const updatedAuction = await prisma.auction.findUnique({ where: { id: auction.id } });
    assert.strictEqual(updatedAuction?.currentRound, 3);
  });

  await it("Item 5 has 0 bids in Round 3 -> becomes FINAL_UNSOLD", async () => {
    const res = await finalizeOrUnsoldLot(auction.id, items[4].id, auctioneer.id);
    assert.strictEqual(res.status, "FINAL_UNSOLD");
    assert.strictEqual(res.item.status, "FINAL_UNSOLD");
    assert.strictEqual(res.item.round, 3);

    const finalUnsoldEvent = capturedEvents.find((e) => e.event === "player_final_unsold");
    assert(finalUnsoldEvent, "player_final_unsold event emitted");
  });

  await it("Strictly NO Round 4: transitionToNextRound rejects round 4", async () => {
    await assert.rejects(
      async () => {
        await transitionToNextRound(auction.id, 4 as any, auctioneer.id);
      },
      /INVALID_ROUND/
    );
  });

  await it("FINAL_UNSOLD player never returns and cannot be re-activated", async () => {
    const adv = await advanceAuctionPlayer(auction.id);
    assert.strictEqual(adv.noMorePending, true);
    assert.strictEqual(adv.item, null);
  });

  console.log("\n--- GROUP 6: Concurrency Protection on Finalization ---");
  await it("Atomic transaction prevents 7/6 or exceeding squad limit in concurrent finalizations", async () => {
    // Create an isolated auction with limit = 1
    const raceAuction = await prisma.auction.create({
      data: {
        roomCode: randomUUID(),
        bidderInviteA: randomUUID(),
        bidderInviteB: randomUUID(),
        spectatorInvite: randomUUID(),
        name: "Race Condition Squad Test",
        auctioneerId: auctioneer.id,
        status: "LIVE",
        maxSquadSize: 2, // limit = 1 player!
        participants: {
          create: [
            {
              userId: bidderA.id,
              teamName: "Race Team",
              initialBudget: 10000000,
              remainingBudget: 10000000,
            },
          ],
        },
        items: {
          create: [
            { name: "Lot Race 1", basePrice: 100000, category: "Batsman", status: "ACTIVE", orderIndex: 1 },
            { name: "Lot Race 2", basePrice: 100000, category: "Bowler", status: "ACTIVE", orderIndex: 2 },
          ],
        },
      },
      include: { items: true },
    });

    const lot1 = raceAuction.items[0];
    const lot2 = raceAuction.items[1];

    // Seed highest bids for both lots to bidder A
    await prisma.bid.create({
      data: { auctionId: raceAuction.id, itemId: lot1.id, bidderId: bidderA.id, amount: 200000 },
    });
    await prisma.bid.create({
      data: { auctionId: raceAuction.id, itemId: lot2.id, bidderId: bidderA.id, amount: 200000 },
    });

    // Attempt to finalize both simultaneously
    const results = await Promise.allSettled([
      finalizeOrUnsoldLot(raceAuction.id, lot1.id, auctioneer.id),
      finalizeOrUnsoldLot(raceAuction.id, lot2.id, auctioneer.id),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled" && (r.value as any).status === "SOLD");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 1 must succeed and 1 must fail due to TEAM_PLAYER_LIMIT_REACHED
    assert.strictEqual(successes.length, 1, "Exactly one lot finalized as SOLD");
    assert.strictEqual(rejected.length, 1, "Second simultaneous finalization was rejected");
    assert(
      (rejected[0] as PromiseRejectedResult).reason.message.includes("TEAM_PLAYER_LIMIT_REACHED"),
      "Rejection reason is TEAM_PLAYER_LIMIT_REACHED"
    );

    const wonCountInDb = await prisma.item.count({
      where: { auctionId: raceAuction.id, winnerId: bidderA.id, status: "SOLD" },
    });
    assert.strictEqual(wonCountInDb, 1, "Database strictly enforced squad limit = 1");

    // Cleanup race auction
    await prisma.auction.delete({ where: { id: raceAuction.id } });
  });

  // Cleanup main test auction
  await prisma.auction.delete({ where: { id: auction.id } });

  console.log("\n=================================================");
  console.log(`🏁 TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test suite failed:", err);
    process.exit(1);
  });
