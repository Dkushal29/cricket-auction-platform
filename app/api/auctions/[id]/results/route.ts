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
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            winner: { select: { id: true, name: true } },
            transaction: true,
          },
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

    const soldItems = auction.items.filter((i) => i.status === "SOLD");
    const unsoldItems = auction.items.filter((i) => i.status === "UNSOLD");
    const pendingItems = auction.items.filter((i) => i.status === "PENDING" || i.status === "ACTIVE");
    const totalSpentAcrossTeams = auction.participants.reduce((sum, p) => sum + p.totalSpent, 0);

    return NextResponse.json({
      auctionId: auction.id,
      name: auction.name,
      status: auction.status,
      summary: {
        totalItems: auction.items.length,
        soldCount: soldItems.length,
        unsoldCount: unsoldItems.length,
        pendingCount: pendingItems.length,
        totalRevenue: totalSpentAcrossTeams,
      },
      participants: auction.participants,
      soldItems,
      unsoldItems,
      transactions: auction.transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
