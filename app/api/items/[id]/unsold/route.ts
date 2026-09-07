import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { finalizeOrUnsoldLot } from "@/lib/auction-finalization";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req, ["AUCTIONEER"]);
    const { id: itemId } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { auction: true },
    });

    if (!item) {
      return NextResponse.json({ error: "NOT_FOUND: Item not found" }, { status: 404 });
    }

    if (item.auction.auctioneerId !== user.userId) {
      return NextResponse.json({ error: "FORBIDDEN: You are not authorized to manage items in this auction" }, { status: 403 });
    }

    if (item.auction.status !== "LIVE") {
      return NextResponse.json({ error: `AUCTION_NOT_LIVE: Cannot mark unsold when auction status is ${item.auction.status}` }, { status: 400 });
    }

    if (item.status !== "ACTIVE") {
      return NextResponse.json({ error: `ITEM_NOT_ACTIVE: Item cannot be marked unsold because status is already '${item.status}'` }, { status: 400 });
    }

    const result = await finalizeOrUnsoldLot(item.auctionId, itemId, user.userId);

    return NextResponse.json({
      success: true,
      item: result.item,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to mark item as unsold";
    const status = msg.startsWith("UNAUTHORIZED")
      ? 401
      : msg.startsWith("FORBIDDEN")
      ? 403
      : msg.startsWith("NOT_FOUND")
      ? 404
      : 400;

    return NextResponse.json({ error: msg }, { status });
  }
}
