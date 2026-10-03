import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership } from "@/lib/auth";
import { getIO } from "@/lib/socket-server";
import { transitionToNextRound, getAuctionRoundStatus } from "@/lib/auction-rounds";
import { advanceAuctionPlayer } from "@/lib/auction-advancement";

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

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Empty or non-JSON body is valid
    }

    const currentRound = auction.currentRound || 1;

    // Check if there are already PENDING items in the current re-auction round (Round 2 or 3)
    if (currentRound >= 2) {
      const pendingItem = await prisma.item.findFirst({
        where: {
          auctionId: auction.id,
          status: "PENDING",
          round: currentRound,
        },
        orderBy: { orderIndex: "asc" },
      });

      if (pendingItem) {
        const advanceResult = await advanceAuctionPlayer(auction.id, {
          auctioneerUserId: user.userId,
        });

        const remainingPending = await prisma.item.count({
          where: { auctionId: auction.id, status: "PENDING", round: currentRound },
        });

        return NextResponse.json({
          success: true,
          item: advanceResult.item,
          auction: advanceResult.auction,
          round: advanceResult.item?.round ?? currentRound,
          remainingUnsoldInPool: remainingPending,
        });
      }
    }

    // Otherwise determine target round to transition to
    let targetRound: 2 | 3 = 2;
    if (body?.round === 2 || body?.round === 3) {
      targetRound = body.round;
    } else {
      const curRound = auction.currentRound || 1;
      targetRound = (curRound + 1) as 2 | 3;
    }

    if (targetRound > 3) {
      return NextResponse.json(
        { error: "MAX_ROUNDS_REACHED: Round 3 is the final round. No further rounds allowed." },
        { status: 400 }
      );
    }

    const roundTransition = await transitionToNextRound(auction.id, targetRound, user.userId);

    // Also emit legacy re_auction_started event for backwards-compatible listeners
    try {
      const io = getIO();
      const room = `auction_${auction.id}`;
      io.to(room).emit("re_auction_started", {
        auctionId: auction.id,
        item: roundTransition.activatedItem,
        round: targetRound,
        remainingUnsoldCount: roundTransition.eligibleCount - 1,
      });
    } catch (e) {}

    const remainingPending = await prisma.item.count({
      where: { auctionId: auction.id, status: "PENDING" },
    });

    const updatedAuction = await prisma.auction.findUnique({
      where: { id: auction.id },
    });

    return NextResponse.json({
      success: true,
      item: roundTransition.activatedItem,
      auction: updatedAuction,
      round: targetRound,
      remainingUnsoldInPool: remainingPending,
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
