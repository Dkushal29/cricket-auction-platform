import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId");

    const whereClause: any = { auctionId };
    if (itemId) {
      whereClause.itemId = itemId;
    }

    const bids = await prisma.bid.findMany({
      where: whereClause,
      include: {
        bidder: {
          select: { id: true, name: true, email: true },
        },
        item: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return NextResponse.json({ bids });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
