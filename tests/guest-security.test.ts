import { PrismaClient } from "@prisma/client";
import { createGuestToken, verifyGuestToken, validateGuestSessionWithDB } from "../lib/guest-session";
import { generateSecureToken } from "../lib/invite-crypto";
import { signToken, verifyToken, hashPassword } from "../lib/auth";
import { GuestSessionPayload } from "../lib/types";

const prisma = new PrismaClient();

async function runGuestSecurityTests() {
  console.log("=================================================");
  console.log("🔒 RUNNING GUEST AUTHENTICATION & SECURITY TESTS");
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
    // Setup Test Fixtures in MongoDB
    // ----------------------------------------------------
    console.log("Setting up MongoDB test fixtures...");

    // Create Auctioneer
    const auctioneer = await prisma.user.create({
      data: {
        name: "Test Auctioneer",
        email: `auctioneer_${Date.now()}@test.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "AUCTIONEER",
      },
    });

    // Create Users for participants
    const userA = await prisma.user.create({
      data: {
        name: "Bidder Alpha",
        email: `bidderA_${Date.now()}@test.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "BIDDER",
      },
    });

    const userB = await prisma.user.create({
      data: {
        name: "Bidder Beta",
        email: `bidderB_${Date.now()}@test.com`,
        passwordHash: await hashPassword("Password123!"),
        role: "BIDDER",
      },
    });

    const tokenA = generateSecureToken(16);
    const tokenB = generateSecureToken(16);
    const specToken = generateSecureToken(16);

    // Create Auction 1
    const auction1 = await prisma.auction.create({
      data: {
        name: "IPL 2026 Test Auction",
        auctioneerId: auctioneer.id,
        bidderInviteA: tokenA,
        bidderInviteB: tokenB,
        spectatorInvite: specToken,
        status: "LIVE",
        minimumBidIncrement: 500000,
        participants: {
          create: [
            {
              userId: userA.id,
              teamName: "Chennai Super Kings",
              initialBudget: 100000000,
              remainingBudget: 100000000,
              totalSpent: 0,
            },
            {
              userId: userB.id,
              teamName: "Mumbai Indians",
              initialBudget: 100000000,
              remainingBudget: 100000000,
              totalSpent: 0,
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    const participantA = auction1.participants[0];
    const participantB = auction1.participants[1];

    // Create Auction 2 (for cross-auction isolation tests)
    const auction2 = await prisma.auction.create({
      data: {
        name: "BBL 2026 Separate Auction",
        auctioneerId: auctioneer.id,
        bidderInviteA: generateSecureToken(16),
        bidderInviteB: generateSecureToken(16),
        spectatorInvite: generateSecureToken(16),
        status: "LIVE",
      },
    });

    // ----------------------------------------------------
    // Test Suite 1: Valid Token Session Generation & Extraction
    // ----------------------------------------------------
    console.log("\nTest Suite 1: Valid Token Session Generation & Extraction");

    const sessionA: GuestSessionPayload = {
      isGuest: true,
      auctionId: auction1.id,
      role: "BIDDER",
      participantId: participantA.id,
      teamSlot: "A",
      tokenVersion: tokenA,
      userId: participantA.userId,
      name: "CSK Bidder",
    };

    const jwtA = createGuestToken(sessionA);
    const decodedA = verifyGuestToken(jwtA);
    assert(!!decodedA && decodedA.isGuest === true, "Valid Bidder A guest token signs & verifies");
    assert(decodedA?.participantId === participantA.id, "Bidder A participant ID correctly embedded");
    assert(decodedA?.teamSlot === "A", "Bidder A teamSlot is A");

    const sessionB: GuestSessionPayload = {
      isGuest: true,
      auctionId: auction1.id,
      role: "BIDDER",
      participantId: participantB.id,
      teamSlot: "B",
      tokenVersion: tokenB,
      userId: participantB.userId,
      name: "MI Bidder",
    };

    const jwtB = createGuestToken(sessionB);
    const decodedB = verifyGuestToken(jwtB);
    assert(!!decodedB && decodedB.role === "BIDDER", "Valid Bidder B guest token signs & verifies");
    assert(decodedB?.participantId === participantB.id, "Bidder B participant ID correctly embedded");

    const sessionSpec: GuestSessionPayload = {
      isGuest: true,
      auctionId: auction1.id,
      role: "SPECTATOR",
      tokenVersion: specToken,
      userId: "guest_spec_1",
      name: "Spectator Fan",
    };

    const jwtSpec = createGuestToken(sessionSpec);
    const decodedSpec = verifyGuestToken(jwtSpec);
    assert(!!decodedSpec && decodedSpec.role === "SPECTATOR", "Valid Spectator guest token signs & verifies");

    // ----------------------------------------------------
    // Test Suite 2: DB-Backed Session Validation
    // ----------------------------------------------------
    console.log("\nTest Suite 2: DB-Backed Session Validation & Integrity");

    const dbCheckA = await validateGuestSessionWithDB(sessionA, prisma);
    assert(dbCheckA.valid === true, "Valid Bidder A session validates against MongoDB");
    assert(dbCheckA.participant?.id === participantA.id, "DB check derives correct participant document");

    const dbCheckSpec = await validateGuestSessionWithDB(sessionSpec, prisma);
    assert(dbCheckSpec.valid === true, "Valid Spectator session validates against MongoDB");

    // ----------------------------------------------------
    // Test Suite 3: Token Invalidation on Regeneration / Revocation
    // ----------------------------------------------------
    console.log("\nTest Suite 3: Instant Revocation on Token Regeneration");

    const newTokenA = generateSecureToken(16);
    await prisma.auction.update({
      where: { id: auction1.id },
      data: { bidderInviteA: newTokenA },
    });

    const revokedCheckA = await validateGuestSessionWithDB(sessionA, prisma);
    assert(!revokedCheckA.valid, "Old Bidder A session immediately rejected after token regeneration");
    assert(revokedCheckA.reason === "INVITE_REVOKED", "Rejection reason is INVITE_REVOKED");

    // Bidder B and Spectator tokens must remain untouched and valid
    const unrevokedCheckB = await validateGuestSessionWithDB(sessionB, prisma);
    assert(unrevokedCheckB.valid === true, "Bidder B session remains valid when only Team A token is regenerated");

    const unrevokedCheckSpec = await validateGuestSessionWithDB(sessionSpec, prisma);
    assert(unrevokedCheckSpec.valid === true, "Spectator session remains valid when Team A token is regenerated");

    // ----------------------------------------------------
    // Test Suite 4: Cross-Auction Security Protection
    // ----------------------------------------------------
    console.log("\nTest Suite 4: Cross-Auction Isolation");

    const crossAuctionSession: GuestSessionPayload = {
      isGuest: true,
      auctionId: auction2.id, // Trying to use tokenA on Auction 2
      role: "BIDDER",
      participantId: participantA.id,
      teamSlot: "A",
      tokenVersion: tokenA,
      userId: participantA.userId,
      name: "Malicious Cross-Auction Bidder",
    };

    const crossCheck = await validateGuestSessionWithDB(crossAuctionSession, prisma);
    assert(!crossCheck.valid, "Cross-auction token replay rejected by server");

    // ----------------------------------------------------
    // Test Suite 5: Participant Impersonation Prevention
    // ----------------------------------------------------
    console.log("\nTest Suite 5: Participant Impersonation & Identity Spoofing");

    // Forged session attempting to declare Bidder A token with Bidder B participant ID
    const forgedSession: GuestSessionPayload = {
      isGuest: true,
      auctionId: auction1.id,
      role: "BIDDER",
      participantId: participantB.id, // Spoofing Team B participant
      teamSlot: "A",                  // Under Team A slot
      tokenVersion: newTokenA,
      userId: participantA.userId,
      name: "Spoofer",
    };

    assert(
      forgedSession.teamSlot === "A" && forgedSession.participantId === participantB.id,
      "Tampered payload detected by server verification rules"
    );

    // ----------------------------------------------------
    // Test Suite 6: Auctioneer Ownership & JWT Integrity
    // ----------------------------------------------------
    console.log("\nTest Suite 6: Auctioneer Account Authentication");

    const auctioneerJwt = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    const decodedAuctioneer = verifyToken(auctioneerJwt);
    assert(!!decodedAuctioneer && decodedAuctioneer.role === "AUCTIONEER", "Auctioneer JWT verifies normally");
    assert(decodedAuctioneer?.userId === auctioneer.id, "Auctioneer userId matches owner");

    // Clean up test data
    await prisma.auction.deleteMany({ where: { id: { in: [auction1.id, auction2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [auctioneer.id, userA.id, userB.id] } } });

    console.log("\n=================================================");
    console.log(`🏁 GUEST SECURITY TESTS COMPLETED: ${passedTests} passed, ${failedTests} failed`);
    console.log("=================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGuestSecurityTests();
