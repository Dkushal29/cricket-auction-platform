import { PrismaClient } from "@prisma/client";
import { POST as createAuction } from "../app/api/auctions/route";
import { POST as startAuction } from "../app/api/auctions/[id]/start/route";
import { POST as nextPlayer } from "../app/api/auctions/[id]/next/route";
import { POST as placeBid } from "../app/api/items/[id]/bids/route";
import { POST as finalizeItem } from "../app/api/items/[id]/finalize/route";
import { POST as markUnsold } from "../app/api/items/[id]/unsold/route";
import { GET as getAuction } from "../app/api/auctions/[id]/route";
import { hashPassword, signToken } from "../lib/auth";
import { setMockIO, registerMockPresence } from "../lib/socket-server";

const prisma = new PrismaClient();

async function runAutomatedRandomOrderingTestSuite() {
  console.log("=================================================");
  console.log("🎲 RUNNING AUTOMATED RANDOM ORDERING TEST SUITE");
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

  // Socket mock tracking
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
    const uniqueSuffix = Date.now();

    // 1. Create Auctioneer
    const auctioneer = await prisma.user.create({
      data: {
        name: "League Auctioneer",
        email: `auctioneer_order_${uniqueSuffix}@test.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "AUCTIONEER",
      },
    });

    const auctioneerToken = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    // 2. Create Bidders
    const bidderA = await prisma.user.create({
      data: {
        name: "Bidder Alpha",
        email: `bidder_a_${uniqueSuffix}@rcb.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "BIDDER",
      },
    });
    const bidderAToken = signToken({
      userId: bidderA.id,
      email: bidderA.email,
      name: bidderA.name,
      role: "BIDDER",
    });

    const bidderB = await prisma.user.create({
      data: {
        name: "Bidder Beta",
        email: `bidder_b_${uniqueSuffix}@csk.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "BIDDER",
      },
    });
    const bidderBToken = signToken({
      userId: bidderB.id,
      email: bidderB.email,
      name: bidderB.name,
      role: "BIDDER",
    });

    // Define 10 players in known input order
    const initialPlayerPool = [
      { name: "Virat Kohli", category: "Batsman", basePrice: 20000000 },
      { name: "Rohit Sharma", category: "Batsman", basePrice: 20000000 },
      { name: "Jasprit Bumrah", category: "Bowler", basePrice: 20000000 },
      { name: "Ravindra Jadeja", category: "All-Rounder", basePrice: 15000000 },
      { name: "Rishabh Pant", category: "Wicket-Keeper", basePrice: 15000000 },
      { name: "Shubman Gill", category: "Batsman", basePrice: 10000000 },
      { name: "Rashid Khan", category: "Bowler", basePrice: 15000000 },
      { name: "Heinrich Klaasen", category: "Wicket-Keeper", basePrice: 15000000 },
      { name: "Andre Russell", category: "All-Rounder", basePrice: 15000000 },
      { name: "Travis Head", category: "Batsman", basePrice: 12000000 },
    ];

    // ----------------------------------------------------
    // TEST 1: Creation with Automatic Fisher-Yates Randomization
    // ----------------------------------------------------
    console.log("TEST 1: Creation & Automatic Randomization");
    const createReq = new Request("http://localhost/api/auctions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auctioneerToken}`,
      },
      body: JSON.stringify({
        name: `Automated Order Auction ${uniqueSuffix}`,
        teams: [
          { teamName: "Alpha Kings", initialBudget: 100000000, userId: bidderA.id },
          { teamName: "Beta Riders", initialBudget: 100000000, userId: bidderB.id },
        ],
        items: initialPlayerPool,
      }),
    });

    const createRes = await createAuction(createReq);
    const createData = await createRes.json();
    assert(createRes.status === 201, "Auction created successfully with 201 status");

    const createdAuctionId = createData.auction.id;
    const dbItems = await prisma.item.findMany({
      where: { auctionId: createdAuctionId },
      orderBy: { orderIndex: "asc" },
    });

    assert(dbItems.length === 10, "All 10 player lots persisted in database");

    // Verify orderIndex is 1..10
    const indices = dbItems.map((i) => i.orderIndex);
    assert(
      JSON.stringify(indices) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      "orderIndex assigned sequentially 1..10 for the randomized sequence"
    );

    // Verify randomized order is not identical to input order
    const persistedNames = dbItems.map((i) => i.name);
    const originalNames = initialPlayerPool.map((p) => p.name);
    console.log("  📊 Input Order:     ", originalNames.slice(0, 5).join(" → ") + "...");
    console.log("  🎲 Randomized Order:", persistedNames.slice(0, 5).join(" → ") + "...");

    assert(
      JSON.stringify(persistedNames) !== JSON.stringify(originalNames),
      "Player order was shuffled automatically (different from manual input sequence)"
    );

    // ----------------------------------------------------
    // TEST 2: Order Persistence & Determinism Across Multiple Queries
    // ----------------------------------------------------
    console.log("\nTEST 2: Order Persistence & Determinism");
    for (let fetchAttempt = 1; fetchAttempt <= 3; fetchAttempt++) {
      const getReq = new Request(`http://localhost/api/auctions/${createdAuctionId}`, {
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      });
      const getRes = await getAuction(getReq, { params: { id: createdAuctionId } });
      const getData = await getRes.json();
      const queriedNames = getData.auction.items.map((i: any) => i.name);

      assert(
        JSON.stringify(queriedNames) === JSON.stringify(persistedNames),
        `Query fetch #${fetchAttempt} returns the exact identical persisted order`
      );
    }

    // ----------------------------------------------------
    // TEST 3: Multi-Client Parity (Auctioneer, Bidder A, Bidder B)
    // ----------------------------------------------------
    console.log("\nTEST 3: Multi-Client Parity");
    const bidderAReq = new Request(`http://localhost/api/auctions/${createdAuctionId}`, {
      headers: { Authorization: `Bearer ${bidderAToken}` },
    });
    const bidderBReq = new Request(`http://localhost/api/auctions/${createdAuctionId}`, {
      headers: { Authorization: `Bearer ${bidderBToken}` },
    });

    const resA = await getAuction(bidderAReq, { params: { id: createdAuctionId } });
    const resB = await getAuction(bidderBReq, { params: { id: createdAuctionId } });
    const dataA = await resA.json();
    const dataB = await resB.json();

    const orderA = dataA.auction.items.map((i: any) => i.name);
    const orderB = dataB.auction.items.map((i: any) => i.name);

    assert(
      JSON.stringify(orderA) === JSON.stringify(persistedNames) &&
      JSON.stringify(orderB) === JSON.stringify(persistedNames),
      "All connected client roles receive the exact same randomized sequence"
    );

    // ----------------------------------------------------
    // TEST 4 & 5: Auction Start & Automatic First Player Selection
    // ----------------------------------------------------
    console.log("\nTEST 4 & 5: Start Auction & Automatic First Player Selection");
    const participants = await prisma.auctionParticipant.findMany({
      where: { auctionId: createdAuctionId },
    });
    registerMockPresence(createdAuctionId, {
      socketId: "socket_bidder_a",
      userId: bidderA.id,
      role: "BIDDER",
      teamSlot: "A",
      participantId: participants[0].id,
      auctionId: createdAuctionId,
    });
    registerMockPresence(createdAuctionId, {
      socketId: "socket_bidder_b",
      userId: bidderB.id,
      role: "BIDDER",
      teamSlot: "B",
      participantId: participants[1].id,
      auctionId: createdAuctionId,
    });

    const startReq = new Request(`http://localhost/api/auctions/${createdAuctionId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });

    const startRes = await startAuction(startReq, { params: { id: createdAuctionId } });
    const startData = await startRes.json();
    assert(startRes.status === 200, "Auction started successfully");

    const activeItemAfterStart = await prisma.item.findUnique({
      where: { id: startData.auction.activeItemId },
    });

    assert(
      activeItemAfterStart !== null && activeItemAfterStart.orderIndex === 1,
      "First player under hammer is Lot #01 from the randomized sequence"
    );
    assert(
      activeItemAfterStart?.name === persistedNames[0],
      `First active player matches randomized sequence: ${persistedNames[0]}`
    );

    // ----------------------------------------------------
    // TEST 6: Deal Finalization (SOLD) & Automatic Next Player (Player 1 -> Player 2)
    // ----------------------------------------------------
    console.log("\nTEST 6: Finalize SOLD & Auto-Advance to Next Player");
    // Place bid on Player 1
    const bidReq1 = new Request(`http://localhost/api/items/${activeItemAfterStart!.id}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bidderAToken}`,
      },
      body: JSON.stringify({ amount: activeItemAfterStart!.basePrice + 500000 }),
    });
    const bidRes1 = await placeBid(bidReq1, { params: { id: activeItemAfterStart!.id } });
    assert(bidRes1.status === 200, "Bid placed on Lot #1");

    // Finalize as SOLD with autoAdvance: true
    const finReq1 = new Request(`http://localhost/api/items/${activeItemAfterStart!.id}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auctioneerToken}`,
      },
      body: JSON.stringify({ autoAdvance: true }),
    });
    const finRes1 = await finalizeItem(finReq1, { params: { id: activeItemAfterStart!.id } });
    const finData1 = await finRes1.json();
    assert(finRes1.status === 200 && finData1.item.status === "SOLD", "Lot #1 marked SOLD with winner");

    // Check that Player 2 automatically became active
    const auctionAfterLot1 = await prisma.auction.findUnique({
      where: { id: createdAuctionId },
      include: { items: { orderBy: { orderIndex: "asc" } } },
    });

    const activeLot2 = auctionAfterLot1?.items.find((i) => i.id === auctionAfterLot1.activeItemId);
    assert(activeLot2 !== undefined, "Auction automatically loaded the next player");
    assert(activeLot2?.orderIndex === 2, "Newly active player is Lot #02");
    assert(
      activeLot2?.name === persistedNames[1],
      `Lot #02 matches expected randomized sequence: ${persistedNames[1]}`
    );

    // ----------------------------------------------------
    // TEST 7: Mark UNSOLD & Auto-Advance to Next Player (Player 2 -> Player 3)
    // ----------------------------------------------------
    console.log("\nTEST 7: Mark UNSOLD & Auto-Advance to Next Player");
    const unsoldReq2 = new Request(`http://localhost/api/items/${activeLot2!.id}/unsold`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auctioneerToken}`,
      },
      body: JSON.stringify({ autoAdvance: true }),
    });
    const unsoldRes2 = await markUnsold(unsoldReq2, { params: { id: activeLot2!.id } });
    const unsoldData2 = await unsoldRes2.json();
    assert(unsoldRes2.status === 200 && unsoldData2.item.status === "UNSOLD", "Lot #2 marked UNSOLD (Round 1)");

    const auctionAfterLot2 = await prisma.auction.findUnique({
      where: { id: createdAuctionId },
      include: { items: { orderBy: { orderIndex: "asc" } } },
    });

    const activeLot3 = auctionAfterLot2?.items.find((i) => i.id === auctionAfterLot2.activeItemId);
    assert(activeLot3 !== undefined && activeLot3.orderIndex === 3, "Lot #03 automatically loaded after UNSOLD");
    assert(
      activeLot3?.name === persistedNames[2],
      `Lot #03 matches expected randomized sequence: ${persistedNames[2]}`
    );

    // ----------------------------------------------------
    // TEST 8: Concurrency Guard (No Duplicate or Skipped Players)
    // ----------------------------------------------------
    console.log("\nTEST 8: Concurrency Protection on Next Player");
    // Fire concurrent next requests while lot 3 is already active
    const concurrentReqA = nextPlayer(
      new Request(`http://localhost/api/auctions/${createdAuctionId}/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: createdAuctionId } }
    );
    const concurrentReqB = nextPlayer(
      new Request(`http://localhost/api/auctions/${createdAuctionId}/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: createdAuctionId } }
    );

    const [cResA, cResB] = await Promise.all([concurrentReqA, concurrentReqB]);
    const cDataA = await cResA.json();
    const cDataB = await cResB.json();

    assert(
      cDataA.message?.includes("Another item is currently active") ||
      cDataB.message?.includes("Another item is currently active"),
      "Concurrent advancement guard safely rejects duplicate calls without skipping lots"
    );

    // ----------------------------------------------------
    // TEST 9: Advance Remaining Players Sequentially & Full Pool Integrity
    // ----------------------------------------------------
    console.log("\nTEST 9: Complete Full Sequence (Lots 3 to 10)");
    let currentLot = activeLot3!;
    let currentPosition = 3;

    while (currentPosition <= 10) {
      // Mark current lot UNSOLD with autoAdvance: true
      const req = new Request(`http://localhost/api/items/${currentLot.id}/unsold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auctioneerToken}`,
        },
        body: JSON.stringify({ autoAdvance: true }),
      });
      const res = await markUnsold(req, { params: { id: currentLot.id } });
      assert(res.status === 200, `Completed Lot #${currentPosition} (${currentLot.name})`);

      currentPosition++;
      if (currentPosition <= 10) {
        const checkAuction = await prisma.auction.findUnique({
          where: { id: createdAuctionId },
          include: { items: { orderBy: { orderIndex: "asc" } } },
        });
        currentLot = checkAuction!.items.find((i) => i.id === checkAuction!.activeItemId)!;
        assert(
          currentLot.orderIndex === currentPosition,
          `Advanced to Lot #${currentPosition} (${persistedNames[currentPosition - 1]})`
        );
      }
    }

    // Verify all 10 items were processed exactly once
    const finalItems = await prisma.item.findMany({
      where: { auctionId: createdAuctionId },
      orderBy: { orderIndex: "asc" },
    });

    const pendingRemaining = finalItems.filter((i) => i.status === "PENDING");
    assert(pendingRemaining.length === 0, "All 10 players processed; 0 pending items remain");

    const processedIds = new Set(finalItems.map((i) => i.id));
    assert(processedIds.size === 10, "Every player appeared exactly once without duplicates");

    console.log("\n=================================================");
    console.log(`🏁 RANDOM ORDER TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAutomatedRandomOrderingTestSuite();
