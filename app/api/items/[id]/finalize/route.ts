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

    const finalizeResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch Item with Auction
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: {
          auction: true,
          bids: {
            orderBy: { amount: "desc" },
            take: 1,
            include: {
              bidder: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("NOT_FOUND: Item not found");
      }

      const { auction } = item;

      // 2. Validate Auctioneer Ownership
      if (auction.auctioneerId !== user.userId) {
        throw new Error("FORBIDDEN: You are not authorized to finalize items in this auction");
      }

      // 3. Validate Auction Status & Item Status
      if (auction.status !== "LIVE") {
        throw new Error(`AUCTION_NOT_LIVE: Cannot finalize deal when auction status is ${auction.status}`);
      }

      if (item.status !== "ACTIVE") {
        throw new Error(`ITEM_NOT_ACTIVE: Item cannot be finalized because its status is already '${item.status}'`);
      }

      // 3. Verify Highest Bidder Exists
      const highestBid = item.bids[0];
      if (!highestBid) {
        throw new Error("NO_BIDS: Cannot finalize sale because no bids have been placed on this item. Mark as UNSOLD instead.");
      }

      // 4. Fetch Winner Participant
      const participant = await tx.auctionParticipant.findUnique({
        where: {
          auctionId_userId: {
            auctionId: auction.id,
            userId: highestBid.bidderId,
          },
        },
      });

      if (!participant) {
        throw new Error("PARTICIPANT_NOT_FOUND: Highest bidder is not an active participant in this auction");
      }

      if (highestBid.amount > participant.remainingBudget) {
        throw new Error(
          `BUDGET_EXCEEDED: Bid amount ₹${highestBid.amount.toLocaleString("en-IN")} exceeds winner remaining budget ₹${participant.remainingBudget.toLocaleString("en-IN")}`
        );
      }

      // 5. Create Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          auctionId: auction.id,
          itemId: item.id,
          winnerId: highestBid.bidderId,
          winningBid: highestBid.amount,
          status: "COMPLETED",
        },
        include: {
          winner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 6. Update Participant Budget (Strict Invariant: remainingBudget = initialBudget - totalSpent)
      const updatedTotalSpent = participant.totalSpent + highestBid.amount;
      const updatedRemainingBudget = participant.initialBudget - updatedTotalSpent;

      const updatedParticipant = await tx.auctionParticipant.update({
        where: { id: participant.id },
        data: {
          totalSpent: updatedTotalSpent,
          remainingBudget: updatedRemainingBudget,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 7. Update Item Status
      const soldItem = await tx.item.update({
        where: { id: item.id },
        data: {
          status: "SOLD",
          winnerId: highestBid.bidderId,
          winningPrice: highestBid.amount,
          soldAt: new Date(),
        },
        include: {
          winner: {
            select: { id: true, name: true },
          },
        },
      });

      // 8. Clear Active Item from Auction
      await tx.auction.update({
        where: { id: auction.id },
        data: { activeItemId: null },
      });

      // 9. Record Audit Log
      await tx.auditLog.create({
        data: {
          auctionId: auction.id,
          userId: user.userId,
          action: "ITEM_SOLD",
          metadata: JSON.stringify({
            itemId: item.id,
            itemName: item.name,
            winnerId: highestBid.bidderId,
            winnerName: highestBid.bidder.name,
            teamName: participant.teamName,
            price: highestBid.amount,
          }),
        },
      });

      return {
        item: soldItem,
        transaction,
        updatedParticipant,
        auctionId: auction.id,
      };
    });

    // Stop countdown timer
    stopItemTimer(finalizeResult.auctionId);

    // Broadcast Real-time Events
    try {
      const io = getIO();
      const room = `auction_${finalizeResult.auctionId}`;

      io.to(room).emit("player_sold", {
        auctionId: finalizeResult.auctionId,
        item: finalizeResult.item as any,
        transaction: finalizeResult.transaction,
        updatedParticipant: finalizeResult.updatedParticipant as any,
      });

      io.to(room).emit("participant_updated", {
        participant: finalizeResult.updatedParticipant as any,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      item: finalizeResult.item,
      transaction: finalizeResult.transaction,
      participant: finalizeResult.updatedParticipant,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to finalize item";
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
