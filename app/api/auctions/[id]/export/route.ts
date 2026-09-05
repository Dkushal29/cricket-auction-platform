import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participants: {
          include: { user: true },
        },
        items: {
          include: {
            winner: true,
            transaction: true,
          },
          orderBy: { orderIndex: "asc" },
        },
        transactions: {
          include: {
            winner: true,
            item: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (format === "csv") {
      // Build CSV header and rows
      const headers = [
        "Item Order",
        "Player / Item Name",
        "Category",
        "Base Price (INR)",
        "Status",
        "Winning Team / Bidder",
        "Final Price (INR)",
        "Sold Timestamp",
      ];

      const rows = auction.items.map((item) => {
        const participant = auction.participants.find((p) => p.userId === item.winnerId);
        const winnerDisplay = participant ? `${participant.teamName} (${item.winner?.name})` : item.winner?.name || "N/A";
        return [
          item.orderIndex,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.category.replace(/"/g, '""')}"`,
          item.basePrice,
          item.status,
          `"${winnerDisplay.replace(/"/g, '""')}"`,
          item.winningPrice || "",
          item.soldAt ? item.soldAt.toISOString() : "",
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${auction.name.replace(/[^a-zA-Z0-9]/g, "_")}_results.csv"`,
        },
      });
    }

    // Default JSON Export
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      auction: {
        id: auction.id,
        name: auction.name,
        description: auction.description,
        status: auction.status,
        startedAt: auction.startedAt,
        completedAt: auction.completedAt,
      },
      participants: auction.participants.map((p) => ({
        teamName: p.teamName,
        userName: p.user.name,
        userEmail: p.user.email,
        initialBudget: p.initialBudget,
        remainingBudget: p.remainingBudget,
        totalSpent: p.totalSpent,
      })),
      items: auction.items.map((i) => {
        const participant = auction.participants.find((p) => p.userId === i.winnerId);
        return {
          order: i.orderIndex,
          name: i.name,
          category: i.category,
          basePrice: i.basePrice,
          status: i.status,
          winningTeam: participant?.teamName || null,
          winningBidder: i.winner?.name || null,
          winningPrice: i.winningPrice,
          soldAt: i.soldAt,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
