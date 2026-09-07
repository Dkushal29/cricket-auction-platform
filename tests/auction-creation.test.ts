import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";
import { generateSecureToken, generateRoomCode } from "../lib/invite-crypto";

const prisma = new PrismaClient();

async function runAuctionCreationTests() {
  console.log("=================================================");
  console.log("⚡ RUNNING AUCTION CREATION & TRANSACTION TESTS");
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
    // Setup test auctioneer
    const auctioneer = await prisma.user.create({
      data: {
        name: "Test Auctioneer Fast",
        email: `auctioneer_perf_${Date.now()}@test.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "AUCTIONEER",
      },
    });

    // Helper to simulate the exact auction creation API logic
    async function createTestAuction(itemCount: number) {
      const startTime = Date.now();
      const roomCode = generateRoomCode();
      const bidderInviteA = generateSecureToken(16);
      const bidderInviteB = generateSecureToken(16);
      const spectatorInvite = generateSecureToken(16);

      const items = Array.from({ length: itemCount }).map((_, idx) => ({
        name: `Player Lot #${idx + 1}`,
        category: idx % 4 === 0 ? "Batsman" : idx % 4 === 1 ? "Bowler" : idx % 4 === 2 ? "All-Rounder" : "Wicket-Keeper",
        basePrice: 10000000 + idx * 500000,
        description: `Description for lot ${idx + 1}`,
        imageUrl: `https://example.com/player_${idx + 1}.png`,
        orderIndex: idx + 1,
      }));

      // Resolve participants outside transaction
      const teams = [
        { teamName: "Royal Challengers", teamColor: "#3E7CB1", initialBudget: 100000000, email: `bidder1_${Date.now()}@test.com` },
        { teamName: "Chennai Super Kings", teamColor: "#B85C38", initialBudget: 100000000, email: `bidder2_${Date.now()}@test.com` },
      ];

      const resolvedParticipants: Array<{
        userId: string;
        teamName: string;
        teamColor: string;
        initialBudget: number;
      }> = [];

      for (const t of teams) {
        const u = await prisma.user.create({
          data: {
            name: t.teamName,
            email: t.email,
            passwordHash: await hashPassword("Password123!"),
            role: "BIDDER",
          },
        });
        resolvedParticipants.push({
          userId: u.id,
          teamName: t.teamName,
          teamColor: t.teamColor,
          initialBudget: t.initialBudget,
        });
      }

      // Execute transaction with 15s timeout
      const createdAuction = await prisma.$transaction(
        async (tx) => {
          const auction = await tx.auction.create({
            data: {
              roomCode,
              bidderInviteA,
              bidderInviteB,
              spectatorInvite,
              name: `Test Tournament (${itemCount} lots)`,
              auctioneerId: auctioneer.id,
              status: "DRAFT",
            },
          });

          await tx.auctionParticipant.createMany({
            data: resolvedParticipants.map((p) => ({
              auctionId: auction.id,
              userId: p.userId,
              teamName: p.teamName,
              teamColor: p.teamColor,
              initialBudget: p.initialBudget,
              remainingBudget: p.initialBudget,
              totalSpent: 0,
            })),
          });

          await tx.item.createMany({
            data: items.map((item) => ({
              auctionId: auction.id,
              name: item.name,
              category: item.category,
              basePrice: item.basePrice,
              description: item.description,
              imageUrl: item.imageUrl,
              orderIndex: item.orderIndex,
              status: "PENDING",
            })),
          });

          await tx.auditLog.create({
            data: {
              auctionId: auction.id,
              userId: auctioneer.id,
              action: "AUCTION_CREATED",
              metadata: JSON.stringify({ name: auction.name, roomCode: auction.roomCode }),
            },
          });

          return auction;
        },
        {
          maxWait: 5000,
          timeout: 15000,
        }
      );

      const elapsed = Date.now() - startTime;
      return { createdAuction, elapsed };
    }

    // ----------------------------------------------------
    // Test 1: Small Auction (2 players)
    // ----------------------------------------------------
    console.log("Test 1: Small Auction (2 players)");
    const smallResult = await createTestAuction(2);
    const smallItems = await prisma.item.count({ where: { auctionId: smallResult.createdAuction.id } });
    const smallParts = await prisma.auctionParticipant.count({ where: { auctionId: smallResult.createdAuction.id } });
    assert(smallItems === 2, "2 player items created accurately");
    assert(smallParts === 2, "2 participants created accurately");
    assert(smallResult.elapsed < 5000, `2-player auction created in ${smallResult.elapsed}ms (well under 5s)`);

    // ----------------------------------------------------
    // Test 2: Standard Auction (18 players - Production Repro Case)
    // ----------------------------------------------------
    console.log("\nTest 2: Standard Auction (18 players - Repro Case)");
    const standardResult = await createTestAuction(18);
    const standardItems = await prisma.item.count({ where: { auctionId: standardResult.createdAuction.id } });
    const standardParts = await prisma.auctionParticipant.count({ where: { auctionId: standardResult.createdAuction.id } });
    const standardAuction = await prisma.auction.findUnique({
      where: { id: standardResult.createdAuction.id },
      include: { items: { orderBy: { orderIndex: "asc" } }, participants: true, auditLogs: true },
    });
    assert(standardItems === 18, "All 18 player items created in single batch");
    assert(standardParts === 2, "Both team participants created accurately");
    assert(standardAuction?.auditLogs.length === 1, "Audit log recorded accurately");
    assert(standardAuction?.items.length === 18, "All item relations properly mapped");
    assert(standardResult.elapsed < 5000, `18-player auction created in ${standardResult.elapsed}ms (under 5s without timeout)`);

    // ----------------------------------------------------
    // Test 3: Large Auction (50 players)
    // ----------------------------------------------------
    console.log("\nTest 3: Large Auction (50 players)");
    const largeResult = await createTestAuction(50);
    const largeItems = await prisma.item.count({ where: { auctionId: largeResult.createdAuction.id } });
    assert(largeItems === 50, "All 50 player items created in single batch");
    assert(largeResult.elapsed < 10000, `50-player auction completed in ${largeResult.elapsed}ms`);

    // ----------------------------------------------------
    // Test 4: Atomicity & Rollback Verification
    // ----------------------------------------------------
    console.log("\nTest 4: Atomicity & Rollback Verification");
    const testRoomCode = generateRoomCode();
    let rollbackErrorCaught = false;
    let attemptedAuctionId: string | null = null;

    try {
      await prisma.$transaction(
        async (tx) => {
          const failedAuction = await tx.auction.create({
            data: {
              roomCode: testRoomCode,
              name: "Rollback Test Auction",
              auctioneerId: auctioneer.id,
              status: "DRAFT",
            },
          });
          attemptedAuctionId = failedAuction.id;

          await tx.item.createMany({
            data: [
              { auctionId: failedAuction.id, name: "Player 1", category: "Batsman", basePrice: 10000000, orderIndex: 1 },
              { auctionId: failedAuction.id, name: "Player 2", category: "Bowler", basePrice: 10000000, orderIndex: 2 },
            ],
          });

          // Simulate intentional unhandled failure before commit
          throw new Error("INTENTIONAL_SIMULATED_FAILURE");
        },
        { timeout: 15000 }
      );
    } catch (err: any) {
      if (err.message === "INTENTIONAL_SIMULATED_FAILURE") {
        rollbackErrorCaught = true;
      }
    }

    assert(rollbackErrorCaught, "Transaction intentionally aborted on error");
    const orphanAuction = await prisma.auction.findUnique({ where: { roomCode: testRoomCode } });
    assert(orphanAuction === null, "Rolled back auction does not exist in DB (no partial creation)");
    if (attemptedAuctionId) {
      const orphanItems = await prisma.item.count({ where: { auctionId: attemptedAuctionId } });
      assert(orphanItems === 0, "No orphan items left in DB after transaction failure");
    }

    console.log("\n=================================================");
    console.log(`🏁 AUCTION CREATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuctionCreationTests();
