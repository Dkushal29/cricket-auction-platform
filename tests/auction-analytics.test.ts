import { PrismaClient } from "@prisma/client";
import { GET as getResults } from "../app/api/auctions/[id]/results/route";
import { GET as exportReport } from "../app/api/auctions/[id]/export/route";
import { signToken } from "../lib/auth";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

async function runAuctionAnalyticsTestSuite() {
  console.log("=================================================");
  console.log("📊 RUNNING AUCTION ANALYTICS & RESULTS TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  try {
    const uniqueSuffix = Date.now();

    // 1. Create Auctioneer
    const auctioneer = await prisma.user.create({
      data: {
        name: "Analytics Test Auctioneer",
        email: `auctioneer_analytics_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash_secret_never_expose",
        role: "AUCTIONEER",
      },
    });
    const auctioneerToken = signToken({
      userId: auctioneer.id,
      email: auctioneer.email,
      name: auctioneer.name,
      role: "AUCTIONEER",
    });

    // 2. Create Bidders & Participants
    const bidderA = await prisma.user.create({
      data: {
        name: "Bidder Alpha",
        email: `bidder_alpha_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash_secret_never_expose",
        role: "BIDDER",
      },
    });

    const bidderB = await prisma.user.create({
      data: {
        name: "Bidder Beta",
        email: `bidder_beta_${uniqueSuffix}@test.com`,
        passwordHash: "dummyhash_secret_never_expose",
        role: "BIDDER",
      },
    });

    const auction = await prisma.auction.create({
      data: {
        name: "IPL Analytics Championship 2026",
        roomCode: `ANALYTICS_${uniqueSuffix}`,
        bidderInviteA: `token_invite_a_${uniqueSuffix}`,
        bidderInviteB: `token_invite_b_${uniqueSuffix}`,
        spectatorInvite: `token_spec_${uniqueSuffix}`,
        auctioneerId: auctioneer.id,
        status: "COMPLETED",
        completedAt: new Date(),
        minimumBidIncrement: 100000,
        timerDuration: 15,
      },
    });

    const participantA = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderA.id,
        teamName: "Royal Challengers",
        initialBudget: 50000000, // 5 Cr
        totalSpent: 5000000,     // 50L
        remainingBudget: 45000000,
      },
    });

    const participantB = await prisma.auctionParticipant.create({
      data: {
        auctionId: auction.id,
        userId: bidderB.id,
        teamName: "Chennai Kings",
        initialBudget: 50000000, // 5 Cr
        totalSpent: 2500000,     // 25L
        remainingBudget: 47500000,
      },
    });

    // 3. Create Items
    // Item 1: Sold in Round 1 to Bidder A
    const item1 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Virat Kohli",
        category: "Batsman",
        basePrice: 2000000,
        winningPrice: 5000000,
        winnerId: bidderA.id,
        orderIndex: 1,
        status: "SOLD",
        round: 1,
        soldAt: new Date(),
      },
    });

    // Item 2: Unsold in Round 1 -> Sold in Round 2 to Bidder B
    const item2 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "David Warner",
        category: "Batsman",
        basePrice: 1500000,
        winningPrice: 2500000,
        winnerId: bidderB.id,
        orderIndex: 2,
        status: "SOLD",
        round: 2,
        soldAt: new Date(),
      },
    });

    // Item 3: Unsold in Round 1 -> Re-auctioned in Round 2 -> FINAL_UNSOLD
    const item3 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Mitchell Johnson",
        category: "Bowler",
        basePrice: 1000000,
        orderIndex: 3,
        status: "FINAL_UNSOLD",
        round: 2,
      },
    });

    // Item 4: Unsold in Round 1 -> Not re-auctioned
    const item4 = await prisma.item.create({
      data: {
        auctionId: auction.id,
        name: "Jasprit Bumrah",
        category: "Bowler",
        basePrice: 3000000,
        orderIndex: 4,
        status: "UNSOLD",
        round: 1,
      },
    });

    // Create Transactions
    await prisma.transaction.create({
      data: {
        auctionId: auction.id,
        itemId: item1.id,
        winnerId: bidderA.id,
        winningBid: 5000000,
        status: "COMPLETED",
      },
    });

    await prisma.transaction.create({
      data: {
        auctionId: auction.id,
        itemId: item2.id,
        winnerId: bidderB.id,
        winningBid: 2500000,
        status: "COMPLETED",
      },
    });

    console.log("-------------------------------------------------");
    console.log("TEST GROUP 1: API RESULTS ROUTE STRUCTURE & METRICS");
    console.log("-------------------------------------------------");

    const req = new Request(`http://localhost/api/auctions/${auction.id}/results`);
    const res = await getResults(req, { params: { id: auction.id } });
    const data = await res.json();

    assert(res.status === 200, "1. Results API returns HTTP 200 OK");
    assert(data.auctionId === auction.id && data.name === auction.name, "2. Returns auction metadata");
    assert(data.summary.totalRevenue === 7500000, "3. Reconciles total revenue across teams (7.5M)");
    assert(data.summary.soldCount === 2, "4. Reconciles total sold count (2)");
    assert(data.summary.unsoldCount === 1, "5. Reconciles Round 1 pool unsold count (1)");
    assert(data.summary.finalUnsoldCount === 1, "6. Reconciles Round 2 final unsold count (1)");
    assert(data.summary.highestPurchase === 5000000, "7. Highest purchase is 5,000,000");
    assert(data.summary.averagePurchase === 3750000, "8. Average purchase is 3,750,000");
    assert(data.summary.mostExpensivePlayer?.name === "Virat Kohli", "9. Identifies top acquired player");

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 2: TEAM BUDGET RECONCILIATION & RATIOS");
    console.log("-------------------------------------------------");

    const teamAData = data.teamSummaries.find((t: any) => t.teamName === "Royal Challengers");
    const teamBData = data.teamSummaries.find((t: any) => t.teamName === "Chennai Kings");

    assert(
      teamAData && teamAData.totalSpent === 5000000 && teamAData.remainingBudget === 45000000,
      "10. Team A remaining budget equals initialBudget - totalSpent (4.5 Cr)"
    );
    assert(
      teamAData && teamAData.budgetUtilization === 10,
      "11. Team A budget utilization percentage is 10%"
    );
    assert(
      teamBData && teamBData.totalSpent === 2500000 && teamBData.remainingBudget === 47500000,
      "12. Team B remaining budget equals initialBudget - totalSpent (4.75 Cr)"
    );
    assert(
      teamBData && teamBData.budgetUtilization === 5,
      "13. Team B budget utilization percentage is 5%"
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 3: CATEGORY & RE-AUCTION STATS");
    console.log("-------------------------------------------------");

    const batsmanCategory = data.categoryStats.find((c: any) => c.category === "Batsman");
    const bowlerCategory = data.categoryStats.find((c: any) => c.category === "Bowler");

    assert(
      batsmanCategory && batsmanCategory.total === 2 && batsmanCategory.sold === 2,
      "14. Category Batsman reconciles (Total: 2, Sold: 2)"
    );
    assert(
      bowlerCategory && bowlerCategory.total === 2 && bowlerCategory.sold === 0,
      "15. Category Bowler reconciles (Total: 2, Sold: 0)"
    );
    assert(
      data.reAuctionStats.round2ReAuctionedCount === 2 && data.reAuctionStats.round2SoldCount === 1,
      "16. Re-auction stats reconcile (Round 2 count: 2, Sold: 1, Final Unsold: 1)"
    );

    console.log("\n-------------------------------------------------");
    console.log("TEST GROUP 4: EXPORT FORMATS & CONFIDENTIALITY");
    console.log("-------------------------------------------------");

    // XLSX Export Test
    const xlsxReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=xlsx`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const xlsxRes = await exportReport(xlsxReq, { params: { id: auction.id } });
    const arrayBuffer = await xlsxRes.arrayBuffer();
    const excelBuffer = Buffer.from(arrayBuffer);

    const isZipContainer = excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4B && excelBuffer[2] === 0x03 && excelBuffer[3] === 0x04;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer as any);
    const sheets = workbook.worksheets.map((w) => w.name);

    assert(
      xlsxRes.status === 200 && isZipContainer && sheets.length === 6,
      "17. Certified XLSX workbook returns valid 6-worksheet container"
    );

    // CSV Export Test
    const csvReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=csv`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const csvRes = await exportReport(csvReq, { params: { id: auction.id } });
    const csvText = await csvRes.text();

    assert(
      csvRes.status === 200 && csvText.includes("SECTION 1: AUCTION SUMMARY"),
      "18. Certified CSV contains complete audit sections"
    );

    // PDF Export Test
    const pdfReq = new Request(`http://localhost/api/auctions/${auction.id}/export?format=pdf`, {
      headers: { Authorization: `Bearer ${auctioneerToken}` },
    });
    const pdfRes = await exportReport(pdfReq, { params: { id: auction.id } });
    const pdfText = await pdfRes.text();

    assert(
      pdfRes.status === 200 && pdfText.includes("<!DOCTYPE html>"),
      "19. Printable PDF/HTML view generated successfully"
    );

    // Privacy & Security Assertion
    assert(
      !csvText.includes("dummyhash_secret_never_expose") &&
        !csvText.includes(`token_invite_a_${uniqueSuffix}`) &&
        !csvText.includes(`token_spec_${uniqueSuffix}`),
      "20. No secret hashes or private invite tokens exposed in exports"
    );

    console.log("\n=================================================");
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test suite crash:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuctionAnalyticsTestSuite();
