import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        auctioneer: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            winner: { select: { id: true, name: true } },
            transaction: true,
            bids: {
              select: { id: true, amount: true, timestamp: true, bidderId: true },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
        transactions: {
          include: {
            winner: { select: { id: true, name: true } },
            item: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    const totalItems = auction.items.length;
    const soldItems = auction.items.filter((i) => i.status === "SOLD");
    const round1UnsoldItems = auction.items.filter((i) => i.status === "UNSOLD");
    const finalUnsoldItems = auction.items.filter((i) => i.status === "FINAL_UNSOLD");
    const pendingItems = auction.items.filter((i) => i.status === "PENDING" || i.status === "ACTIVE");

    // Total spent across participants
    const totalSpentAcrossTeams = auction.participants.reduce((sum, p) => sum + p.totalSpent, 0);

    // Sales price metrics
    const prices = soldItems.map((i) => i.winningPrice || 0);
    const highestPurchase = prices.length > 0 ? Math.max(...prices) : 0;
    const lowestPurchase = prices.length > 0 ? Math.min(...prices) : 0;
    const averagePurchase = prices.length > 0 ? Math.round(totalSpentAcrossTeams / prices.length) : 0;

    const mostExpensiveItem = soldItems.reduce((max, item) => {
      if (!max || (item.winningPrice || 0) > (max.winningPrice || 0)) {
        return item;
      }
      return max;
    }, null as typeof soldItems[0] | null);

    const mostExpensivePlayer = mostExpensiveItem
      ? {
          name: mostExpensiveItem.name,
          category: mostExpensiveItem.category,
          price: mostExpensiveItem.winningPrice || 0,
          teamName:
            auction.participants.find((p) => p.userId === mostExpensiveItem.winnerId)?.teamName ||
            mostExpensiveItem.winner?.name ||
            "N/A",
        }
      : null;

    // Reconciled Team Summaries
    const teamSummaries = auction.participants.map((p) => {
      const teamItems = soldItems.filter((item) => item.winnerId === p.userId);
      const teamSpent = teamItems.reduce((sum, item) => sum + (item.winningPrice || 0), 0);
      const teamPrices = teamItems.map((item) => item.winningPrice || 0);
      const teamHighest = teamPrices.length > 0 ? Math.max(...teamPrices) : 0;
      const teamLowest = teamPrices.length > 0 ? Math.min(...teamPrices) : 0;
      const teamAvg = teamPrices.length > 0 ? Math.round(teamSpent / teamPrices.length) : 0;
      const reconciledRemaining = p.initialBudget - teamSpent;
      const budgetUtilization = p.initialBudget > 0 ? Math.round((teamSpent / p.initialBudget) * 100) : 0;

      return {
        teamId: p.id,
        userId: p.userId,
        teamName: p.teamName,
        bidderName: p.user.name,
        bidderEmail: p.user.email,
        initialBudget: p.initialBudget,
        totalSpent: teamSpent,
        remainingBudget: reconciledRemaining,
        playersAcquired: teamItems.length,
        averagePurchase: teamAvg,
        highestPurchase: teamHighest,
        lowestPurchase: teamLowest,
        budgetUtilization,
        players: teamItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          basePrice: item.basePrice,
          price: item.winningPrice || 0,
          round: item.round ?? 1,
          soldAt: item.soldAt,
        })),
      };
    });

    // Category Breakdown
    const categoryMap = new Map<
      string,
      {
        category: string;
        total: number;
        sold: number;
        unsold: number;
        finalUnsold: number;
        totalSpent: number;
        highestPrice: number;
        prices: number[];
      }
    >();

    for (const item of auction.items) {
      const cat = (item.category || "Uncategorized").trim();
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          category: cat,
          total: 0,
          sold: 0,
          unsold: 0,
          finalUnsold: 0,
          totalSpent: 0,
          highestPrice: 0,
          prices: [],
        });
      }

      const stat = categoryMap.get(cat)!;
      stat.total++;
      if (item.status === "SOLD") {
        stat.sold++;
        const price = item.winningPrice || 0;
        stat.totalSpent += price;
        stat.prices.push(price);
        if (price > stat.highestPrice) {
          stat.highestPrice = price;
        }
      } else if (item.status === "UNSOUND" || item.status === "UNSOLD") {
        stat.unsold++;
      } else if (item.status === "FINAL_UNSOLD") {
        stat.finalUnsold++;
      }
    }

    const categoryStats = Array.from(categoryMap.values()).map((stat) => ({
      category: stat.category,
      total: stat.total,
      sold: stat.sold,
      unsold: stat.unsold,
      finalUnsold: stat.finalUnsold,
      totalSpent: stat.totalSpent,
      averagePrice: stat.prices.length > 0 ? Math.round(stat.totalSpent / stat.prices.length) : 0,
      highestPrice: stat.highestPrice,
    }));

    // Re-auction Stats
    const reAuctionedItems = auction.items.filter((i) => (i.round ?? 1) >= 2);
    const round2Sold = reAuctionedItems.filter((i) => i.status === "SOLD");

    const reAuctionStats = {
      round1UnsoldCount: round1UnsoldItems.length + reAuctionedItems.length,
      round2ReAuctionedCount: reAuctionedItems.length,
      round2SoldCount: round2Sold.length,
      finalUnsoldCount: finalUnsoldItems.length,
    };

    return NextResponse.json({
      auctionId: auction.id,
      name: auction.name,
      roomCode: auction.roomCode,
      sport: auction.sport || "Cricket",
      season: auction.season || "2026",
      status: auction.status,
      startedAt: auction.startedAt,
      completedAt: auction.completedAt,
      summary: {
        totalItems,
        soldCount: soldItems.length,
        unsoldCount: round1UnsoldItems.length,
        finalUnsoldCount: finalUnsoldItems.length,
        pendingCount: pendingItems.length,
        totalRevenue: totalSpentAcrossTeams,
        highestPurchase,
        lowestPurchase,
        averagePurchase,
        mostExpensivePlayer,
      },
      participants: auction.participants,
      teamSummaries,
      categoryStats,
      reAuctionStats,
      soldItems,
      unsoldItems: [...round1UnsoldItems, ...finalUnsoldItems],
      allItems: auction.items,
      transactions: auction.transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
