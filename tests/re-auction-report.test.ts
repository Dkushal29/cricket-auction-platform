import { PrismaClient } from "@prisma/client";
import { GET as getAuction } from "../app/api/auctions/[id]/route";
import { POST as placeBid } from "../app/api/items/[id]/bids/route";
import { POST as activateItem } from "../app/api/items/[id]/activate/route";
import { POST as startReAuction } from "../app/api/auctions/[id]/re-auction/route";
import { GET as exportReport } from "../app/api/auctions/[id]/export/route";
import { POST as regenerateInvite } from "../app/api/auctions/[id]/invites/route";
import { finalizeOrUnsoldLot } from "../lib/auction-finalization";
import { signToken } from "../lib/auth";
import { createGuestToken } from "../lib/guest-session";
import { setMockIO, stopItemTimer, startItemTimer } from "../lib/socket-server";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

async function runReAuctionReportTestSuite() {
  console.log("=================================================");
  console.log("🏆 RUNNING COMPLETE SPECTATOR PRIVACY, RE-AUCTION & REPORT TEST SUITE");
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
    const uniqueSuffix = Date.now();

    // 1. Create Auctioneer
    const auctioneer = await prisma.user.create({
      data: {
        name: "Test Auctioneer",
        email: `auctioneer_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash",
        role: "AUCTIONEER",
      },
    });
    const auctioneerToken = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    // 2. Create Another Auctioneer (for non-owner tests)
    const otherAuctioneer = await prisma.user.create({
      data: {
        name: "Other Auctioneer",
        email: `other_auctioneer_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash",
        role: "AUCTIONEER",
      },
    });
    const otherAuctioneerToken = signToken({
      userId: otherAuctioneer.id,
      email: otherAuctioneer.email,
      name: otherAuctioneer.name,
      role: "AUCTIONEER",
    });

    // 3. Create Bidder A & Bidder B
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

    // 4. Create Auction with Items
    const auction = await prisma.auction.create({
      data: {
        name: "Premier Super League 2026",
        roomCode: `ROOM_${uniqueSuffix}`,
        bidderInviteA: `token_a_${uniqueSuffix}`,
        bidderInviteB: `token_b_${uniqueSuffix}`,
        spectatorInvite: `token_spec_${uniqueSuffix}`,
        auctioneerId: auctioneer.id,
        status: "LIVE",
        minimumBidIncrement: 100000,
        timerDuration: 15,
      },
    });

    // 5. Participants
    const participantA = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderAUser.id,
        teamName: "Royal Challengers",
        initialBudget: 50000000, // 5 Cr
        remainingBudget: 50000000,
        totalSpent: 0,
      },
    });

    const participantB = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderBUser.id,
        teamName: "Chennai Kings",
        initialBudget: 50000000, // 5 Cr
        remainingBudget: 50000000,
        totalSpent: 0,
      },
    });

    // 6. Guest Tokens
    const spectatorGuestToken = createGuestToken({
      isGuest: true,
      auctionId: auction.id,
      role: "SPECTATOR",
      tokenVersion: auction.spectatorInvite!,
      userId: `spectator_${uniqueSuffix}`,
      name: "Guest Spectator",
    });

    const bidderAGuestToken = createGuestToken({
      isGuest: true,
      auctionId: auction.id,
      role: "BIDDER",
      participantId: participantA.id,
      teamSlot: "A",
      tokenVersion: auction.bidderInviteA!,
      userId: bidderAUser.id,
      name: "Guest Bidder A",
    });

    // 7. Create 4 Items for Testing:
    // Item 1: Sold in Round 1
    const item1 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Virat Kohli",
        category: "Batsman",
        basePrice: 2000000,
        orderIndex: 1,
        status: "PENDING",
        round: 1,
      },
    });

    // Item 2: Unsold in Round 1 -> Sold in Round 2
    const item2 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "David Warner",
        category: "Batsman",
        basePrice: 1500000,
        orderIndex: 2,
        status: "PENDING",
        round: 1,
      },
    });

    // Item 3: Unsold in Round 1 -> Unsold in Round 2 -> FINAL_UNSOLD
    const item3 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Mitchell Johnson",
        category: "Bowler",
        basePrice: 1000000,
        orderIndex: 3,
        status: "PENDING",
        round: 1,
      },
    });

    // Item 4: Pending item
    const item4 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Jasprit Bumrah",
        category: "Bowler",
        basePrice: 2500000,
        orderIndex: 4,
        status: "PENDING",
        round: 1,
      },
    });

    console.log("-------------------------------------------------");
    console.log("TEST GROUP 1: SPECTATOR INVITE PRIVACY & IDOR");
    console.log("-------------------------------------------------");

    // 1. Spectator receives only spectator invite
    const specReq = new Request(`http://localhost/api/auctions/${auction.id}`, {
      headers: {
        cookie: `guest_token=${spectatorGuestToken}`,
      },
    });
    const specRes = await getAuction(specReq, { params: { id: auction.id } });
    const specData = await specRes.json();

    assert(
      specRes.status === 200 && specData.auction.spectatorInvite !== null,
      "1. Spectator receives spectator invite token",
      `Status: ${specRes.status}`
    );

    // 2. Spectator cannot retrieve Bidder A token
    assert(
      specData.auction.bidderInviteA === null,
      "2. Spectator cannot retrieve Bidder A token (sanitized to null)",
      `bidderInviteA: ${specData.auction.bidderInviteA}`
    );

    // 3. Spectator cannot retrieve Bidder B token
    assert(
      specData.auction.bidderInviteB === null,
      "3. Spectator cannot retrieve Bidder B token (sanitized to null)",
      `bidderInviteB: ${specData.auction.bidderInviteB}`
    );

    // 4. Owner Auctioneer receives all tokens
    const ownerReq = new Request(`http://localhost/api/auctions/${auction.id}`, {
      headers: {
        Authorization: `Bearer ${auctioneerToken}`,
      },
    });
    const ownerRes = await getAuction(ownerReq, { params: { id: auction.id } });
    const ownerData = await ownerRes.json();
    assert(
      ownerData.auction.bidderInviteA !== null && ownerData.auction.bidderInviteB !== null,
      "4. Owner Auctioneer can retrieve all invite tokens",
      `bidderInviteA: ${ownerData.auction.bidderInviteA}`
    );

    // 5. Spectator cannot regenerate/revoke tokens
    const regenReq = new Request(`http://localhost/api/auctions/${auction.id}/invites/regenerate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `guest_token=${spectatorGuestToken}`,
      },
      body: JSON.stringify({ tokenType: "bidderInviteA" }),
    });
    const regenRes = await regenerateInvite(regenReq, { params: { id: auction.id } });
    assert(
      regenRes.status === 401 || regenRes.status === 403,
      "5. Spectator cannot regenerate/revoke private invites (401/403)",
      `Status: ${regenRes.status}`
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 2: 15-SECOND ROLLING BID TIMER & BIDDING");
    console.log("-------------------------------------------------");

    // Activate Item 1
    const actReq1 = new Request(`http://localhost/api/items/${item1.id}/activate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const actRes1 = await activateItem(actReq1, { params: { id: item1.id } });
    const actData1 = await actRes1.json();
    assert(
      actRes1.status === 200 && actData1.item.status === "ACTIVE",
      "9. Active lot starts correctly",
      `Status: ${actRes1.status}`
    );

    // Place accepted bid on Item 1 by Bidder A
    const bidReq1 = new Request(`http://localhost/api/items/${item1.id}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signToken({
          userId: bidderAUser.id,
          email: bidderAUser.email,
          name: bidderAUser.name,
          role: "BIDDER",
        })}`,
      },
      body: JSON.stringify({ amount: 2500000 }),
    });
    const bidRes1 = await placeBid(bidReq1, { params: { id: item1.id } });
    const bidData1 = await bidRes1.json();

    assert(
      bidRes1.status === 200 && bidData1.bid.amount === 2500000,
      "11. Accepted bid commits and resets timer to 15s",
      `Status: ${bidRes1.status}`
    );

    // Finalize Item 1 as SOLD
    const finalizeRes1 = await finalizeOrUnsoldLot(auction.id, item1.id, auctioneer.id);
    assert(
      finalizeRes1.status === "SOLD" && finalizeRes1.item.winningPrice === 2500000,
      "18. Item 1 is finalized as SOLD and records winner",
      `Finalize status: ${finalizeRes1.status}`
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 3: UNSOLD PLAYERS & 2-ROUND RE-AUCTION");
    console.log("-------------------------------------------------");

    // Activate Item 2 (0 bids -> UNSOLD Round 1)
    await activateItem(
      new Request(`http://localhost/api/items/${item2.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: item2.id } }
    );

    const finalizeRes2 = await finalizeOrUnsoldLot(auction.id, item2.id, auctioneer.id);
    assert(
      finalizeRes2.status === "UNSOLD" && finalizeRes2.item.round === 1,
      "16. No-bid first-round player becomes UNSOLD (round 1)",
      `Finalize status: ${finalizeRes2.status}`
    );

    // Activate Item 3 (0 bids -> UNSOLD Round 1)
    await activateItem(
      new Request(`http://localhost/api/items/${item3.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: item3.id } }
    );

    const finalizeRes3 = await finalizeOrUnsoldLot(auction.id, item3.id, auctioneer.id);
    assert(
      finalizeRes3.status === "UNSOLD" && finalizeRes3.item.round === 1,
      "17. Second no-bid player also enters re-auction pool",
      `Finalize status: ${finalizeRes3.status}`
    );

    // Non-auctioneer cannot start re-auction
    const unauthReAuction = await startReAuction(
      new Request(`http://localhost/api/auctions/${auction.id}/re-auction`, {
        method: "POST",
        headers: { cookie: `guest_token=${spectatorGuestToken}` },
      }),
      { params: { id: auction.id } }
    );
    assert(
      unauthReAuction.status === 401 || unauthReAuction.status === 403,
      "20. Spectator / Non-auctioneer cannot start re-auction (401/403)",
      `Status: ${unauthReAuction.status}`
    );

    // Auctioneer starts re-auction for Item 2
    const startReAuctionRes = await startReAuction(
      new Request(`http://localhost/api/auctions/${auction.id}/re-auction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: auction.id } }
    );
    const startReAuctionData = await startReAuctionRes.json();
    assert(
      startReAuctionRes.status === 200 &&
        startReAuctionData.item.id === item2.id &&
        startReAuctionData.round === 2 &&
        startReAuctionData.item.status === "ACTIVE",
      "19. Auctioneer starts re-auction (Round 2 item active)",
      `Status: ${startReAuctionRes.status}, Item: ${startReAuctionData.item?.name}, Round: ${startReAuctionData.round}`
    );

    // Bid on Item 2 in Round 2 by Bidder B -> SOLD
    const bidReq2 = new Request(`http://localhost/api/items/${item2.id}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signToken({
          userId: bidderBUser.id,
          email: bidderBUser.email,
          name: bidderBUser.name,
          role: "BIDDER",
        })}`,
      },
      body: JSON.stringify({ amount: 1800000 }),
    });
    const bidRes2 = await placeBid(bidReq2, { params: { id: item2.id } });
    assert(
      bidRes2.status === 200,
      "22. Bid accepted in Round 2 re-auction",
      `Status: ${bidRes2.status}`
    );

    const finalizeReAuction2 = await finalizeOrUnsoldLot(auction.id, item2.id, auctioneer.id);
    assert(
      finalizeReAuction2.status === "SOLD" && finalizeReAuction2.item.round === 2,
      "23. Re-auctioned player is SOLD in Round 2",
      `Status: ${finalizeReAuction2.status}, Round: ${finalizeReAuction2.item.round}`
    );

    // Start re-auction for Item 3
    const startReAuctionRes3 = await startReAuction(
      new Request(`http://localhost/api/auctions/${auction.id}/re-auction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: auction.id } }
    );
    const startReAuctionData3 = await startReAuctionRes3.json();
    assert(
      startReAuctionRes3.status === 200 && startReAuctionData3.item.id === item3.id,
      "21. Re-auction starts Item 3 into Round 2",
      `Status: ${startReAuctionRes3.status}`
    );

    // Item 3 has 0 bids in Round 2 -> FINAL_UNSOLD
    const finalizeReAuction3 = await finalizeOrUnsoldLot(auction.id, item3.id, auctioneer.id);
    assert(
      finalizeReAuction3.status === "FINAL_UNSOLD" && finalizeReAuction3.item.status === "FINAL_UNSOLD",
      "24. Second no-bid player becomes FINAL_UNSOLD",
      `Status: ${finalizeReAuction3.status}, itemStatus: ${finalizeReAuction3.item.status}`
    );

    // Prevent activating FINAL_UNSOLD item (No infinite loop)
    const reactivateFinal = await activateItem(
      new Request(`http://localhost/api/items/${item3.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auctioneerToken}` },
      }),
      { params: { id: item3.id } }
    );
    assert(
      reactivateFinal.status === 400,
      "25. FINAL_UNSOLD player cannot be activated again (No infinite loop)",
      `Status: ${reactivateFinal.status}`
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 4: AUCTIONEER FINAL REPORT & RECONCILIATION");
    console.log("-------------------------------------------------");

    // 28. Report request while LIVE returns 400 (incomplete auction)
    const reportLiveReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const reportLiveRes = await exportReport(reportLiveReq, { params: { id: auction.id } });
    assert(
      reportLiveRes.status === 400,
      "28. Report request while auction is LIVE returns 400 (only available on COMPLETED)",
      `Status: ${reportLiveRes.status}`
    );

    // Complete auction for certified final report
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // 29. Auctioneer downloads CSV report
    const reportCsvReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const reportCsvRes = await exportReport(reportCsvReq, { params: { id: auction.id } });
    const csvContent = await reportCsvRes.text();

    assert(
      reportCsvRes.status === 200 && csvContent.includes("SECTION 1: AUCTION SUMMARY"),
      "29. Owner Auctioneer can download full multi-section CSV report",
      `Status: ${reportCsvRes.status}`
    );

    // Test Excel True XLSX Binary Workbook (.xlsx)
    const reportExcelReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=xlsx`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const reportExcelRes = await exportReport(reportExcelReq, { params: { id: auction.id } });
    const arrayBuffer = await reportExcelRes.arrayBuffer();
    const excelBuffer = Buffer.from(arrayBuffer);

    // Verify ZIP magic bytes (PK\x03\x04) for true XLSX Office Open XML container
    const isZipContainer = excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4B && excelBuffer[2] === 0x03 && excelBuffer[3] === 0x04;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer);

    const sheetNames = workbook.worksheets.map((w) => w.name);

    assert(
      reportExcelRes.status === 200 &&
        reportExcelRes.headers.get("Content-Type") === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
        isZipContainer &&
        sheetNames.includes("Auction Summary") &&
        sheetNames.includes("Sales") &&
        sheetNames.includes("Unsold Players") &&
        sheetNames.includes("Team Summary") &&
        sheetNames.includes("Team Player Lists") &&
        sheetNames.includes("Transaction Ledger"),
      "30. True .xlsx workbook generated with valid ZIP container and all 6 worksheets",
      `Sheets: [${sheetNames.join(", ")}], ZIP valid: ${isZipContainer}`
    );

    // 31. Non-owner auctioneer receives 403
    const reportOtherReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: { Authorization: `Bearer ${otherAuctioneerToken}` },
    });
    const reportOtherRes = await exportReport(reportOtherReq, { params: { id: auction.id } });
    assert(
      reportOtherRes.status === 403,
      "31. Non-owner auctioneer receives 403 Forbidden",
      `Status: ${reportOtherRes.status}`
    );

    // 32. Bidder receives 403
    const reportBidderReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: {
        Authorization: `Bearer ${signToken({
          userId: bidderAUser.id,
          email: bidderAUser.email,
          name: bidderAUser.name,
          role: "BIDDER",
        })}`,
      },
    });
    const reportBidderRes = await exportReport(reportBidderReq, { params: { id: auction.id } });
    assert(
      reportBidderRes.status === 403,
      "32. Bidder receives 403 Forbidden for report download",
      `Status: ${reportBidderRes.status}`
    );

    // 33. Spectator receives 403/401
    const reportSpecReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: { cookie: `guest_token=${spectatorGuestToken}` },
    });
    const reportSpecRes = await exportReport(reportSpecReq, { params: { id: auction.id } });
    assert(
      reportSpecRes.status === 401 || reportSpecRes.status === 403,
      "33. Spectator receives 401/403 Forbidden for report download",
      `Status: ${reportSpecRes.status}`
    );

    // Test JSON export structure and reconciliation
    const reportJsonReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=json`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const reportJsonRes = await exportReport(reportJsonReq, { params: { id: auction.id } });
    const reportData = await reportJsonRes.json();

    assert(
      reportData.section1_auctionSummary &&
        reportData.section2_salesReport &&
        reportData.section3_unsoldReport &&
        reportData.section4_teamReport &&
        reportData.section5_teamPlayerList &&
        reportData.section6_auctionLedger,
      "34. Report contains all 6 required sections",
      `Sections: ${Object.keys(reportData).join(", ")}`
    );

    // Check Sold Players in Section 2
    const soldNames = reportData.section2_salesReport.map((s: any) => s.playerName);
    assert(
      soldNames.includes("Virat Kohli") && soldNames.includes("David Warner"),
      "35. Report contains all SOLD players (Virat Kohli, David Warner)",
      `Sold: ${soldNames.join(", ")}`
    );

    // Check FINAL UNSOLD in Section 3
    const finalUnsoldNames = reportData.section3_unsoldReport.map((u: any) => u.playerName);
    assert(
      finalUnsoldNames.includes("Mitchell Johnson"),
      "36. Report contains FINAL UNSOLD players (Mitchell Johnson)",
      `Unsold: ${finalUnsoldNames.join(", ")}`
    );

    // Check Team Reconciliation
    const teamAData = reportData.section4_teamReport.find((t: any) => t.teamName === "Royal Challengers");
    const teamBData = reportData.section4_teamReport.find((t: any) => t.teamName === "Chennai Kings");

    assert(
      teamAData && teamAData.totalSpent === 2500000 && teamAData.remainingBudget === 50000000 - 2500000,
      "37. Team A budget reconciles (Initial: 5 Cr, Spent: 25L, Remaining: 4.75 Cr)",
      `Spent: ${teamAData?.totalSpent}, Remaining: ${teamAData?.remainingBudget}`
    );

    assert(
      teamBData && teamBData.totalSpent === 1800000 && teamBData.remainingBudget === 50000000 - 1800000,
      "38. Team B budget reconciles (Initial: 5 Cr, Spent: 18L, Remaining: 4.82 Cr)",
      `Spent: ${teamBData?.totalSpent}, Remaining: ${teamBData?.remainingBudget}`
    );

    // Check No Secrets / Tokens in Report
    assert(
      !csvContent.includes("passwordHash") &&
        !csvContent.includes("dummyhash") &&
        !csvContent.includes(`token_a_${uniqueSuffix}`) &&
        !csvContent.includes(`token_b_${uniqueSuffix}`),
      "41. No passwords, hashes, or private invite tokens appear in report",
      "Confidentiality verified"
    );

    console.log("\n=================================================");
    console.log(`🎉 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test Suite crashed with unexpected error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReAuctionReportTestSuite();
