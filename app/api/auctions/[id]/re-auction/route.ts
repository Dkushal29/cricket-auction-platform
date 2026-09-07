import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership } from "@/lib/auth";
import { getIO, startItemTimer } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, auction } = await requireAuctioneerOwnership(req, params.id);

    if (auction.status !== "LIVE") {
      return NextResponse.json(
        { error: `Cannot start re-auction when auction status is ${auction.status}. Auction must be LIVE.` },
        { status: 400 }
      );
    }

    // Check if there is already an active item
    const currentlyActive = await prisma.item.findFirst({
      where: {
        auctionId: auction.id,
        status: "ACTIVE",
      },
    });

    if (currentlyActive) {
      return NextResponse.json(
        { error: `Item '${currentlyActive.name}' is currently active. Please finalize or mark it unsold before starting re-auction.` },
        { status: 400 }
      );
    }

    // Find the first UNSOLD item from Round 1
    const nextUnsoldItem = await prisma.item.findFirst({
      where: {
        auctionId: auction.id,
        status: "UNSOLD",
        round: 1,
      },
      orderBy: { orderIndex: "asc" },
    });

    if (!nextUnsoldItem) {
      return NextResponse.json(
        { error: "No eligible first-round unsold players available for re-auction." },
        { status: 400 }
      );
    }

    // Count how many total unsold players are in the re-auction pool
    const totalUnsoldCount = await prisma.item.count({
      where: {
        auctionId: auction.id,
        status: "UNSOLD",
        round: 1,
      },
    });

    // Activate item for Round 2
    const [updatedItem, updatedAuction] = await prisma.$transaction([
      prisma.item.update({
        where: { id: nextUnsoldItem.id },
        data: {
          status: "ACTIVE",
          round: 2,
        },
      }),
      prisma.auction.update({
        where: { id: auction.id },
        data: { activeItemId: nextUnsoldItem.id },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        auctionId: auction.id,
        userId: user.userId,
        action: "RE_AUCTION_STARTED",
        metadata: JSON.stringify({
          itemId: updatedItem.id,
          itemName: updatedItem.name,
          round: 2,
          remainingUnsoldInPool: totalUnsoldCount - 1,
        }),
      },
    });

    // Start 15s rolling countdown timer
    const duration = 15;
    const expiryDate = new Date(Date.now() + duration * 1000);

    try {
      startItemTimer(auction.id, updatedItem.id, duration);

      const io = getIO();
      const room = `auction_${auction.id}`;

      io.to(room).emit("re_auction_started", {
        auctionId: auction.id,
        item: updatedItem as any,
        round: 2,
        remainingUnsoldCount: totalUnsoldCount - 1,
      });

      io.to(room).emit("player_started", {
        auctionId: auction.id,
        item: updatedItem as any,
        secondsRemaining: duration,
        timerExpiry: expiryDate.toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      item: updatedItem,
      auction: updatedAuction,
      round: 2,
      remainingUnsoldInPool: totalUnsoldCount - 1,
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
