import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getIO, stopItemTimer } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req, ["AUCTIONEER"]);
    const { id: itemId } = params;

    const unsoldResult = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: { auction: true },
      });

      if (!item) {
        throw new Error("NOT_FOUND: Item not found");
      }

      const { auction } = item;

      if (auction.auctioneerId !== user.userId) {
        throw new Error("FORBIDDEN: You are not authorized to manage items in this auction");
      }

      if (auction.status !== "LIVE") {
        throw new Error(`AUCTION_NOT_LIVE: Cannot mark unsold when auction status is ${auction.status}`);
      }

      if (item.status !== "ACTIVE") {
        throw new Error(`ITEM_NOT_ACTIVE: Item cannot be marked unsold because status is already '${item.status}'`);
      }

      const updatedItem = await tx.item.update({
        where: { id: item.id },
        data: {
          status: "UNSOLD",
          soldAt: new Date(),
        },
      });

      await tx.auction.update({
        where: { id: auction.id },
        data: { activeItemId: null },
      });

      await tx.auditLog.create({
        data: {
          auctionId: auction.id,
          userId: user.userId,
          action: "ITEM_UNSOLD",
          metadata: JSON.stringify({ itemId: item.id, itemName: item.name }),
        },
      });

      return {
        item: updatedItem,
        auctionId: auction.id,
      };
    });

    stopItemTimer(unsoldResult.auctionId);

    try {
      getIO().to(`auction_${unsoldResult.auctionId}`).emit("player_unsold", {
        auctionId: unsoldResult.auctionId,
        item: unsoldResult.item as any,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      item: unsoldResult.item,
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
