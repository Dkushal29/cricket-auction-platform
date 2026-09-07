import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user: authUser } = await requireAuctioneerOwnership(req, auctionId);

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
    const allowIncomplete = url.searchParams.get("allowIncomplete") === "true";

    // Authoritative direct MongoDB queries
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        auctioneer: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            winner: { select: { id: true, name: true, email: true } },
            bids: {
              orderBy: { amount: "asc" },
              select: { id: true, amount: true, timestamp: true, bidderId: true },
            },
            transaction: true,
          },
          orderBy: { orderIndex: "asc" },
        },
        transactions: {
          include: {
            winner: { select: { id: true, name: true, email: true } },
            item: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Report is available for COMPLETED auctions, or if allowIncomplete=true is explicitly passed
    if (auction.status !== "COMPLETED" && !allowIncomplete) {
      return NextResponse.json(
        {
          error: `Auction is currently ${auction.status}. Full certified auction reports are finalized once the auction status is COMPLETED.`,
          status: auction.status,
          isCompleted: false,
        },
        { status: 400 }
      );
    }

    // Calculations & Reconciliations
    const totalPlayers = auction.items.length;
    const soldItems = auction.items.filter((i) => i.status === "SOLD");
    const round1UnsoldItems = auction.items.filter((i) => i.status === "UNSOLD");
    const finalUnsoldItems = auction.items.filter((i) => i.status === "FINAL_UNSOLD");
    const totalSold = soldItems.length;
    const totalUnsold = round1UnsoldItems.length;
    const totalFinalUnsold = finalUnsoldItems.length;
    const totalAuctionValue = soldItems.reduce((sum, item) => sum + (item.winningPrice || 0), 0);

    // Participant summaries with reconciled budget invariants
    const teamSummaries = auction.participants.map((p) => {
      const teamItems = soldItems.filter((item) => item.winnerId === p.userId);
      const teamSpent = teamItems.reduce((sum, item) => sum + (item.winningPrice || 0), 0);
      const prices = teamItems.map((item) => item.winningPrice || 0);
      const highestPurchase = prices.length > 0 ? Math.max(...prices) : 0;
      const lowestPurchase = prices.length > 0 ? Math.min(...prices) : 0;
      const avgPurchase = prices.length > 0 ? Math.round(teamSpent / prices.length) : 0;
      const reconciledRemaining = p.initialBudget - teamSpent;

      return {
        teamId: p.id,
        teamName: p.teamName,
        bidderName: p.user.name,
        bidderEmail: p.user.email,
        initialBudget: p.initialBudget,
        totalSpent: teamSpent,
        remainingBudget: reconciledRemaining,
        playersAcquired: teamItems.length,
        averagePurchase: avgPurchase,
        highestPurchase,
        lowestPurchase,
        players: teamItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.winningPrice || 0,
          round: item.round ?? 1,
          soldAt: item.soldAt,
        })),
      };
    });

    // Format 1: CSV Report
    if (format === "csv") {
      const lines: string[] = [];

      // SECTION 1: AUCTION SUMMARY
      lines.push("==================================================");
      lines.push("SECTION 1: AUCTION SUMMARY");
      lines.push("==================================================");
      lines.push(`Auction Name,${escapeCsv(auction.name)}`);
      lines.push(`Room Code,${auction.roomCode}`);
      lines.push(`Auction ID,${auction.id}`);
      lines.push(`Auctioneer,${escapeCsv(auction.auctioneer.name)}`);
      lines.push(`Status,${auction.status}`);
      lines.push(`Sport,${auction.sport}`);
      lines.push(`Season,${auction.season}`);
      lines.push(`Start Time,${auction.startedAt ? auction.startedAt.toISOString() : "N/A"}`);
      lines.push(`Completion Time,${auction.completedAt ? auction.completedAt.toISOString() : "N/A"}`);
      lines.push(`Total Players,${totalPlayers}`);
      lines.push(`Total Sold,${totalSold}`);
      lines.push(`Total Unsold (Round 1 Pool),${totalUnsold}`);
      lines.push(`Total Final Unsold,${totalFinalUnsold}`);
      lines.push(`Total Auction Value (INR),${totalAuctionValue}`);
      lines.push(`Number of Teams,${auction.participants.length}`);
      lines.push("");

      // SECTION 2: COMPLETE SALES REPORT
      lines.push("==================================================");
      lines.push("SECTION 2: COMPLETE SALES REPORT");
      lines.push("==================================================");
      lines.push("Player Name,Category,Base Price (INR),Sold Price (INR),Winning Bidder,Winning Team,Bids Count,Auction Round,Player ID,Sale Timestamp");
      for (const item of soldItems) {
        const participant = auction.participants.find((p) => p.userId === item.winnerId);
        const winnerName = item.winner?.name || "N/A";
        const teamName = participant?.teamName || "N/A";
        lines.push(
          [
            escapeCsv(item.name),
            escapeCsv(item.category),
            item.basePrice,
            item.winningPrice || 0,
            escapeCsv(winnerName),
            escapeCsv(teamName),
            item.bids.length,
            `Round ${item.round ?? 1}`,
            item.id,
            item.soldAt ? item.soldAt.toISOString() : "N/A",
          ].join(",")
        );
      }
      lines.push("");

      // SECTION 3: UNSOLD REPORT
      lines.push("==================================================");
      lines.push("SECTION 3: UNSOLD REPORT");
      lines.push("==================================================");
      lines.push("Player Name,Category,Base Price (INR),Round 1 Result,Round 2 Result,Bids Count,Final Status,Round,Player ID");
      const unsoldOrFinal = auction.items.filter((i) => i.status === "UNSOLD" || i.status === "FINAL_UNSOLD");
      for (const item of unsoldOrFinal) {
        const round1Result = "UNSOLD";
        const round2Result = item.status === "FINAL_UNSOLD" ? "FINAL UNSOLD" : "NOT RE-AUCTIONED";
        lines.push(
          [
            escapeCsv(item.name),
            escapeCsv(item.category),
            item.basePrice,
            round1Result,
            round2Result,
            item.bids.length,
            item.status === "FINAL_UNSOLD" ? "FINAL UNSOLD" : "UNSOLD (POOL)",
            `Round ${item.round ?? 1}`,
            item.id,
          ].join(",")
        );
      }
      lines.push("");

      // SECTION 4: TEAM REPORT
      lines.push("==================================================");
      lines.push("SECTION 4: TEAM REPORT");
      lines.push("==================================================");
      lines.push("Team Name,Bidder Name,Initial Budget (INR),Total Spent (INR),Remaining Budget (INR),Players Acquired,Average Purchase (INR),Highest Purchase (INR),Lowest Purchase (INR)");
      for (const t of teamSummaries) {
        lines.push(
          [
            escapeCsv(t.teamName),
            escapeCsv(t.bidderName),
            t.initialBudget,
            t.totalSpent,
            t.remainingBudget,
            t.playersAcquired,
            t.averagePurchase,
            t.highestPurchase,
            t.lowestPurchase,
          ].join(",")
        );
      }
      lines.push("");

      // SECTION 5: TEAM PLAYER LIST
      lines.push("==================================================");
      lines.push("SECTION 5: TEAM PLAYER LIST");
      lines.push("==================================================");
      for (const t of teamSummaries) {
        lines.push(`TEAM: ${escapeCsv(t.teamName)} (${escapeCsv(t.bidderName)})`);
        lines.push("Player Name,Category,Price (INR),Round,Sold At");
        if (t.players.length === 0) {
          lines.push("No players acquired,,-,-,-");
        } else {
          for (const p of t.players) {
            lines.push(
              [
                escapeCsv(p.name),
                escapeCsv(p.category),
                p.price,
                `Round ${p.round}`,
                p.soldAt ? new Date(p.soldAt).toISOString() : "N/A",
              ].join(",")
            );
          }
        }
        lines.push("");
      }

      // SECTION 6: AUCTION LEDGER / TRANSACTION DATA
      lines.push("==================================================");
      lines.push("SECTION 6: AUCTION LEDGER / TRANSACTION DATA");
      lines.push("==================================================");
      lines.push("Transaction ID,Item ID,Player Name,Winning Team,Winning Participant,Amount (INR),Status,Timestamp");
      for (const tx of auction.transactions) {
        const participant = auction.participants.find((p) => p.userId === tx.winnerId);
        lines.push(
          [
            tx.id,
            tx.itemId,
            escapeCsv(tx.item?.name || "N/A"),
            escapeCsv(participant?.teamName || "N/A"),
            escapeCsv(tx.winner?.name || "N/A"),
            tx.winningBid,
            tx.status,
            tx.timestamp.toISOString(),
          ].join(",")
        );
      }

      const csvContent = lines.join("\n");
      const filename = `${sanitizeFilename(auction.name)}_Auction_Report.csv`;

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Format 2: Genuine Multi-Worksheet Microsoft Excel XLSX Workbook (.xlsx)
    if (format === "xlsx" || format === "excel" || format === "xls") {
      const filename = `${sanitizeFilename(auction.name)}_Auction_Report.xlsx`;
      const xlsxBuffer = await generateXlsxWorkbook(
        auction,
        totalPlayers,
        totalSold,
        totalUnsold,
        totalFinalUnsold,
        totalAuctionValue,
        soldItems,
        teamSummaries
      );

      return new Response(new Uint8Array(xlsxBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Format 3: Printable HTML / PDF view
    if (format === "html" || format === "pdf") {
      const htmlDoc = generatePrintableHtml(auction, totalAuctionValue, soldItems, teamSummaries);
      return new Response(htmlDoc, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Default Format: JSON Export
    return NextResponse.json({
      exportTimestamp: new Date().toISOString(),
      section1_auctionSummary: {
        auctionName: auction.name,
        roomCode: auction.roomCode,
        auctionId: auction.id,
        auctioneerName: auction.auctioneer.name,
        startTime: auction.startedAt,
        completionTime: auction.completedAt,
        totalPlayers,
        totalSold,
        totalUnsold,
        totalFinalUnsold,
        totalAuctionValue,
        numberOfTeams: auction.participants.length,
        auctionStatus: auction.status,
      },
      section2_salesReport: soldItems.map((item) => {
        const participant = auction.participants.find((p) => p.userId === item.winnerId);
        return {
          itemId: item.id,
          playerName: item.name,
          category: item.category,
          basePrice: item.basePrice,
          soldPrice: item.winningPrice,
          winningBidder: item.winner?.name,
          winningBidderId: item.winnerId,
          winningTeam: participant?.teamName,
          winningTeamId: participant?.id,
          bidsCount: item.bids.length,
          saleTimestamp: item.soldAt,
          auctionRound: item.round ?? 1,
        };
      }),
      section3_unsoldReport: auction.items
        .filter((i) => i.status === "UNSOLD" || i.status === "FINAL_UNSOLD")
        .map((item) => ({
          itemId: item.id,
          playerName: item.name,
          category: item.category,
          basePrice: item.basePrice,
          round1Result: "UNSOLD",
          reAuctionResult: item.status === "FINAL_UNSOLD" ? "FINAL UNSOLD" : "NOT RE-AUCTIONED",
          bidsCount: item.bids.length,
          finalStatus: item.status,
          round: item.round ?? 1,
        })),
      section4_teamReport: teamSummaries.map((t) => ({
        teamName: t.teamName,
        bidderName: t.bidderName,
        initialBudget: t.initialBudget,
        totalSpent: t.totalSpent,
        remainingBudget: t.remainingBudget,
        playersAcquired: t.playersAcquired,
        averagePurchasePrice: t.averagePurchase,
        highestPurchase: t.highestPurchase,
        lowestPurchase: t.lowestPurchase,
      })),
      section5_teamPlayerList: teamSummaries.map((t) => ({
        teamName: t.teamName,
        bidderName: t.bidderName,
        players: t.players,
      })),
      section6_auctionLedger: auction.transactions.map((tx) => {
        const participant = auction.participants.find((p) => p.userId === tx.winnerId);
        return {
          transactionId: tx.id,
          itemId: tx.itemId,
          playerName: tx.item?.name || "N/A",
          winningTeam: participant?.teamName || "N/A",
          winningParticipant: tx.winner?.name || "N/A",
          amount: tx.winningBid,
          status: tx.status,
          timestamp: tx.timestamp,
        };
      }),
    });
  } catch (error: any) {
    const status = error.message?.startsWith("UNAUTHORIZED")
      ? 401
      : error.message?.startsWith("FORBIDDEN")
      ? 403
      : error.message?.startsWith("NOT_FOUND")
      ? 404
      : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

function escapeCsv(field: string): string {
  if (!field) return '""';
  return `"${String(field).replace(/"/g, '""')}"`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

function formatInr(val: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateXlsxWorkbook(
  auction: any,
  totalPlayers: number,
  totalSold: number,
  totalUnsold: number,
  totalFinalUnsold: number,
  totalAuctionValue: number,
  soldItems: any[],
  teamSummaries: any[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cricket Auction Platform";
  workbook.created = new Date();

  // Color & Font Palette
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B2229" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: "Segoe UI",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  // 1. WORKSHEET: Auction Summary
  const wsSummary = workbook.addWorksheet("Auction Summary");
  wsSummary.columns = [
    { header: "Metric / Property", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 36 },
  ];
  wsSummary.getRow(1).font = headerFont;
  wsSummary.getRow(1).fill = headerFill;

  wsSummary.addRows([
    { metric: "Auction Name", value: auction.name },
    { metric: "Room Code", value: auction.roomCode },
    { metric: "Auction ID", value: auction.id },
    { metric: "Auctioneer", value: auction.auctioneer?.name || "N/A" },
    { metric: "Status", value: auction.status },
    { metric: "Sport", value: auction.sport || "Cricket" },
    { metric: "Season", value: auction.season || "2026" },
    { metric: "Start Time", value: auction.startedAt ? new Date(auction.startedAt).toISOString() : "N/A" },
    { metric: "Completion Time", value: auction.completedAt ? new Date(auction.completedAt).toISOString() : "N/A" },
    { metric: "Total Players in Lot", value: totalPlayers },
    { metric: "Total Sold", value: totalSold },
    { metric: "Total Unsold (Round 1 Pool)", value: totalUnsold },
    { metric: "Total Final Unsold", value: totalFinalUnsold },
    { metric: "Total Auction Value (INR)", value: totalAuctionValue },
    { metric: "Number of Participating Teams", value: auction.participants.length },
  ]);

  // 2. WORKSHEET: Sales
  const wsSales = workbook.addWorksheet("Sales");
  wsSales.columns = [
    { header: "Player Name", key: "name", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Base Price (INR)", key: "basePrice", width: 18 },
    { header: "Sold Price (INR)", key: "winningPrice", width: 18 },
    { header: "Winning Bidder", key: "winnerName", width: 22 },
    { header: "Winning Team", key: "teamName", width: 22 },
    { header: "Bids Count", key: "bidsCount", width: 14 },
    { header: "Round", key: "round", width: 14 },
    { header: "Sale Timestamp", key: "soldAt", width: 26 },
  ];
  wsSales.getRow(1).font = headerFont;
  wsSales.getRow(1).fill = headerFill;

  for (const item of soldItems) {
    const participant = auction.participants.find((p: any) => p.userId === item.winnerId);
    wsSales.addRow({
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      winningPrice: item.winningPrice || 0,
      winnerName: item.winner?.name || "N/A",
      teamName: participant?.teamName || "N/A",
      bidsCount: item.bids?.length || 0,
      round: `Round ${item.round ?? 1}`,
      soldAt: item.soldAt ? new Date(item.soldAt).toISOString() : "N/A",
    });
  }

  // 3. WORKSHEET: Unsold Players
  const wsUnsold = workbook.addWorksheet("Unsold Players");
  wsUnsold.columns = [
    { header: "Player Name", key: "name", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Base Price (INR)", key: "basePrice", width: 18 },
    { header: "Round 1 Result", key: "r1", width: 16 },
    { header: "Round 2 Result", key: "r2", width: 18 },
    { header: "Bids Count", key: "bids", width: 14 },
    { header: "Final Status", key: "status", width: 18 },
  ];
  wsUnsold.getRow(1).font = headerFont;
  wsUnsold.getRow(1).fill = headerFill;

  const unsoldOrFinal = auction.items.filter((i: any) => i.status === "UNSOLD" || i.status === "FINAL_UNSOLD");
  for (const item of unsoldOrFinal) {
    wsUnsold.addRow({
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      r1: "UNSOLD",
      r2: item.status === "FINAL_UNSOLD" ? "FINAL UNSOLD" : "NOT RE-AUCTIONED",
      bids: item.bids?.length || 0,
      status: item.status === "FINAL_UNSOLD" ? "FINAL UNSOLD" : "UNSOLD (POOL)",
    });
  }

  // 4. WORKSHEET: Team Summary
  const wsTeams = workbook.addWorksheet("Team Summary");
  wsTeams.columns = [
    { header: "Team Name", key: "teamName", width: 24 },
    { header: "Bidder Name", key: "bidderName", width: 22 },
    { header: "Initial Budget (INR)", key: "initialBudget", width: 20 },
    { header: "Total Spent (INR)", key: "totalSpent", width: 18 },
    { header: "Remaining Budget (INR)", key: "remainingBudget", width: 22 },
    { header: "Players Acquired", key: "playersAcquired", width: 18 },
    { header: "Avg Purchase (INR)", key: "averagePurchase", width: 20 },
    { header: "Highest Purchase (INR)", key: "highestPurchase", width: 22 },
    { header: "Lowest Purchase (INR)", key: "lowestPurchase", width: 20 },
  ];
  wsTeams.getRow(1).font = headerFont;
  wsTeams.getRow(1).fill = headerFill;

  for (const t of teamSummaries) {
    wsTeams.addRow({
      teamName: t.teamName,
      bidderName: t.bidderName,
      initialBudget: t.initialBudget,
      totalSpent: t.totalSpent,
      remainingBudget: t.remainingBudget,
      playersAcquired: t.playersAcquired,
      averagePurchase: t.averagePurchase,
      highestPurchase: t.highestPurchase,
      lowestPurchase: t.lowestPurchase,
    });
  }

  // 5. WORKSHEET: Team Player Lists
  const wsRosters = workbook.addWorksheet("Team Player Lists");
  wsRosters.columns = [
    { header: "Team Name", key: "teamName", width: 24 },
    { header: "Bidder Name", key: "bidderName", width: 22 },
    { header: "Player Name", key: "playerName", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Acquisition Price (INR)", key: "price", width: 22 },
    { header: "Auction Round", key: "round", width: 16 },
    { header: "Acquisition Timestamp", key: "soldAt", width: 26 },
  ];
  wsRosters.getRow(1).font = headerFont;
  wsRosters.getRow(1).fill = headerFill;

  for (const t of teamSummaries) {
    if (t.players.length === 0) {
      wsRosters.addRow({
        teamName: t.teamName,
        bidderName: t.bidderName,
        playerName: "No players acquired",
        category: "-",
        price: 0,
        round: "-",
        soldAt: "-",
      });
    } else {
      for (const p of t.players) {
        wsRosters.addRow({
          teamName: t.teamName,
          bidderName: t.bidderName,
          playerName: p.name,
          category: p.category,
          price: p.price,
          round: `Round ${p.round}`,
          soldAt: p.soldAt ? new Date(p.soldAt).toISOString() : "N/A",
        });
      }
    }
  }

  // 6. WORKSHEET: Transaction Ledger
  const wsLedger = workbook.addWorksheet("Transaction Ledger");
  wsLedger.columns = [
    { header: "Transaction ID", key: "id", width: 30 },
    { header: "Item ID", key: "itemId", width: 30 },
    { header: "Player Name", key: "playerName", width: 24 },
    { header: "Winning Team", key: "teamName", width: 22 },
    { header: "Winning Participant", key: "winnerName", width: 22 },
    { header: "Amount (INR)", key: "amount", width: 18 },
    { header: "Status", key: "status", width: 16 },
    { header: "Timestamp", key: "timestamp", width: 26 },
  ];
  wsLedger.getRow(1).font = headerFont;
  wsLedger.getRow(1).fill = headerFill;

  for (const tx of auction.transactions) {
    const participant = auction.participants.find((p: any) => p.userId === tx.winnerId);
    wsLedger.addRow({
      id: tx.id,
      itemId: tx.itemId,
      playerName: tx.item?.name || "N/A",
      teamName: participant?.teamName || "N/A",
      winnerName: tx.winner?.name || "N/A",
      amount: tx.winningBid,
      status: tx.status,
      timestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : "N/A",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function generatePrintableHtml(auction: any, totalAuctionValue: number, soldItems: any[], teamSummaries: any[]): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${escapeXml(auction.name)} — Official Auction Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1B2229; line-height: 1.5; }
        h1 { font-size: 24px; border-bottom: 2px solid #C7A046; padding-bottom: 8px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
        h2 { font-size: 18px; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: 600; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; background: #e9ecef; }
        .sold { background: #e6f4ea; color: #137333; }
        .brass { color: #C7A046; font-weight: bold; }
        .print-btn { padding: 8px 16px; background: #C7A046; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
      <h1>${escapeXml(auction.name)}</h1>
      <div class="meta">
        Room Code: <strong>${escapeXml(auction.roomCode)}</strong> | Auctioneer: <strong>${escapeXml(auction.auctioneer.name)}</strong> | Status: <strong>${escapeXml(auction.status)}</strong> | Total Value: <strong class="brass">${formatInr(totalAuctionValue)}</strong>
      </div>

      <h2>1. Sales Report</h2>
      <table>
        <thead>
          <tr>
            <th>Player</th><th>Category</th><th>Base Price</th><th>Sold Price</th><th>Winning Team</th><th>Winning Bidder</th><th>Round</th>
          </tr>
        </thead>
        <tbody>
          ${soldItems
            .map((i) => {
              const p = auction.participants.find((part: any) => part.userId === i.winnerId);
              return `<tr>
                <td><strong>${escapeXml(i.name)}</strong></td>
                <td>${escapeXml(i.category)}</td>
                <td>${formatInr(i.basePrice)}</td>
                <td><strong class="brass">${formatInr(i.winningPrice || 0)}</strong></td>
                <td>${escapeXml(p?.teamName || "N/A")}</td>
                <td>${escapeXml(i.winner?.name || "N/A")}</td>
                <td><span class="badge">Round ${i.round ?? 1}</span></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      <h2>2. Team Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Team</th><th>Bidder</th><th>Initial Budget</th><th>Total Spent</th><th>Remaining Budget</th><th>Players</th><th>Avg Price</th>
          </tr>
        </thead>
        <tbody>
          ${teamSummaries
            .map(
              (t) => `<tr>
              <td><strong>${escapeXml(t.teamName)}</strong></td>
              <td>${escapeXml(t.bidderName)}</td>
              <td>${formatInr(t.initialBudget)}</td>
              <td>${formatInr(t.totalSpent)}</td>
              <td><strong class="brass">${formatInr(t.remainingBudget)}</strong></td>
              <td>${t.playersAcquired}</td>
              <td>${formatInr(t.averagePurchase)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>

      <h2>3. Team Player Lists</h2>
      ${teamSummaries
        .map(
          (t) => `
        <h3 style="margin-top:20px;font-size:15px;">${escapeXml(t.teamName)} (${escapeXml(t.bidderName)})</h3>
        <table>
          <thead>
            <tr><th>Player</th><th>Category</th><th>Acquisition Price</th><th>Round</th></tr>
          </thead>
          <tbody>
            ${
              t.players.length === 0
                ? '<tr><td colspan="4" style="color:#999;">No players acquired</td></tr>'
                : t.players
                    .map(
                      (p: any) =>
                        `<tr><td><strong>${p.name}</strong></td><td>${p.category}</td><td class="brass">${formatInr(p.price)}</td><td>Round ${p.round}</td></tr>`
                    )
                    .join("")
            }
          </tbody>
        </table>
      `
        )
        .join("")}
    </body>
    </html>
  `;
}
