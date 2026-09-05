import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership } from "@/lib/auth";
import { assertValidAuctionTransition } from "@/lib/auction-state";
import { getIO, startItemTimer } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);

    const fullAuction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participants: true,
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!fullAuction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (fullAuction.participants.length < 2) {
      return NextResponse.json(
        { error: "At least 2 bidder teams are required to start the auction" },
        { status: 400 }
      );
    }

    if (fullAuction.items.length === 0) {
      return NextResponse.json(
        { error: "At least 1 item is required in the lot queue to start the auction" },
        { status: 400 }
      );
    }

    // Verify initial budgets > 0
    const invalidBudgets = fullAuction.participants.some((p) => p.initialBudget <= 0);
    if (invalidBudgets) {
      return NextResponse.json(
        { error: "All participant teams must have a positive initial budget configured" },
        { status: 400 }
      );
    }

    assertValidAuctionTransition(fullAuction.status as any, "LIVE");

    // Check if there is already an active item, otherwise activate the first pending item
    let activeItemId = fullAuction.activeItemId;
    let activatedItem = null;

    if (!activeItemId) {
      const firstPending = fullAuction.items.find((i) => i.status === "PENDING");
      if (firstPending) {
        activeItemId = firstPending.id;
        activatedItem = await prisma.item.update({
          where: { id: firstPending.id },
          data: { status: "ACTIVE" },
        });
      }
    }

    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "LIVE",
        isConfigLocked: true, // 🔒 Lock configuration permanently upon live start
        startedAt: fullAuction.startedAt || new Date(),
        activeItemId,
      },
    });

    await prisma.auditLog.create({
      data: {
        auctionId,
        userId: user.userId,
        action: "AUCTION_STARTED",
        metadata: JSON.stringify({
          activeItemId,
          isConfigLocked: true,
        }),
      },
    });

    try {
      const io = getIO();
      io.to(`auction_${auctionId}`).emit("auction_started", {
        auctionId,
        status: "LIVE",
      });

      if (activatedItem) {
        startItemTimer(auctionId, activatedItem.id, fullAuction.timerDuration);
        io.to(`auction_${auctionId}`).emit("player_started", {
          auctionId,
          item: activatedItem as any,
          timerExpiry: new Date(Date.now() + fullAuction.timerDuration * 1000).toISOString(),
        });
      }
    } catch (e) {
      // Socket not ready
    }

    return NextResponse.json({ auction: updatedAuction });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED")
      ? 401
      : error.message.startsWith("FORBIDDEN")
      ? 403
      : error.message.startsWith("NOT_FOUND")
      ? 404
      : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

