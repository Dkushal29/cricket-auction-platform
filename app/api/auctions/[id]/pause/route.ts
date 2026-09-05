import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership } from "@/lib/auth";
import { assertValidAuctionTransition } from "@/lib/auction-state";
import { getIO, stopItemTimer } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);

    assertValidAuctionTransition(auction.status as any, "PAUSED");

    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: { status: "PAUSED" },
    });

    stopItemTimer(auctionId);

    await prisma.auditLog.create({
      data: {
        auctionId,
        userId: user.userId,
        action: "AUCTION_PAUSED",
      },
    });

    try {
      getIO().to(`auction_${auctionId}`).emit("auction_paused", {
        auctionId,
        status: "PAUSED",
      });
    } catch (e) {}

    return NextResponse.json({ auction: updatedAuction });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
