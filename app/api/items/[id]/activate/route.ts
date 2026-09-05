import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getIO, startItemTimer } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req, ["AUCTIONEER"]);
    const { id: itemId } = params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        auction: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { auction } = item;

    if (auction.auctioneerId !== user.userId) {
      return NextResponse.json(
        { error: "FORBIDDEN: You are not authorized to manage items in this auction" },
        { status: 403 }
      );
    }

    if (auction.status !== "LIVE") {
      return NextResponse.json(
        { error: `Cannot activate item when auction status is ${auction.status}. Auction must be LIVE.` },
        { status: 400 }
      );
    }

    if (item.status !== "PENDING") {
      return NextResponse.json(
        { error: `Item is already in status '${item.status}'. Only PENDING items can be activated.` },
        { status: 400 }
      );
    }

    // Check if there is another item currently active
    const currentlyActive = auction.items.find((i) => i.id !== item.id && i.status === "ACTIVE");
    if (currentlyActive) {
      return NextResponse.json(
        { error: `Item '${currentlyActive.name}' is currently active. Please finalize or mark it unsold before activating another item.` },
        { status: 400 }
      );
    }

    // Perform activation
    const [updatedItem, updatedAuction] = await prisma.$transaction([
      prisma.item.update({
        where: { id: itemId },
        data: { status: "ACTIVE" },
      }),
      prisma.auction.update({
        where: { id: auction.id },
        data: { activeItemId: itemId },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        auctionId: auction.id,
        userId: user.userId,
        action: "ITEM_ACTIVATED",
        metadata: JSON.stringify({ itemId: item.id, itemName: item.name, basePrice: item.basePrice }),
      },
    });

    // Start server countdown timer
    const duration = auction.timerDuration || 30;
    const expiryDate = new Date(Date.now() + duration * 1000);

    try {
      startItemTimer(auction.id, item.id, duration);

      getIO().to(`auction_${auction.id}`).emit("player_started", {
        auctionId: auction.id,
        item: updatedItem as any,
        timerExpiry: expiryDate.toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({ item: updatedItem, auction: updatedAuction });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
