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

    assertValidAuctionTransition(auction.status as any, "LIVE");

    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: { status: "LIVE" },
    });

    // Resume timer if there is an active item
    if (auction.activeItemId) {
      startItemTimer(auctionId, auction.activeItemId, auction.timerDuration);
    }

    await prisma.auditLog.create({
      data: {
        auctionId,
        userId: user.userId,
        action: "AUCTION_RESUMED",
      },
    });

    try {
      getIO().to(`auction_${auctionId}`).emit("auction_resumed", {
        auctionId,
        status: "LIVE",
      });
    } catch (e) {}

    return NextResponse.json({ auction: updatedAuction });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
