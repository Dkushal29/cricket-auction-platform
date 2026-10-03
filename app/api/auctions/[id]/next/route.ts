import { NextResponse } from "next/server";
import { requireAuctioneerOwnership } from "@/lib/auth";
import { advanceAuctionPlayer } from "@/lib/auction-advancement";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);

    const result = await advanceAuctionPlayer(auctionId, {
      auctioneerUserId: user.userId,
    });

    if (result.alreadyActive) {
      return NextResponse.json(
        {
          message: "Another item is currently active under the hammer.",
          item: result.item,
        },
        { status: 200 }
      );
    }

    if (result.noMorePending) {
      return NextResponse.json(
        {
          message: "All players in pool have been presented.",
          completed: true,
          item: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      auction: result.auction,
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
