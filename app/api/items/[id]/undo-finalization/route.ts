import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getIO } from "@/lib/socket-server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req, ["AUCTIONEER"]);
    const { id: itemId } = params;

    const undoResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch Item and its Transaction
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: {
          auction: {
            include: {
              items: true,
            },
          },
          transaction: true,
        },
      });

      if (!item) {
        throw new Error("NOT_FOUND: Item not found");
      }

      const { auction } = item;

      // 2. Validate Auctioneer Ownership
      if (auction.auctioneerId !== user.userId) {
        throw new Error("FORBIDDEN: You are not authorized to undo finalizations in this auction");
      }

      // 3. Validate Item is SOLD and has a Transaction
      if (item.status !== "SOLD" || !item.transaction) {
        throw new Error("INVALID_STATE: Only SOLD items with an active transaction can be undone");
      }

      // 3. Enforce Cutoff Rules:
      // A) No item must currently be ACTIVE (cannot undo previous deal if auctioneer already started bidding on another item)
      const currentlyActive = auction.items.find((i) => i.status === "ACTIVE");
      if (currentlyActive) {
        throw new Error(
          `CUTOFF_EXCEEDED: Cannot undo finalization while item '${currentlyActive.name}' is actively in progress. Complete or pause current item first.`
        );
      }

      // B) Must be the most recent transaction in this auction
      const latestTransaction = await tx.transaction.findFirst({
        where: { auctionId: auction.id, status: "COMPLETED" },
        orderBy: { timestamp: "desc" },
      });

      if (!latestTransaction || latestTransaction.id !== item.transaction.id) {
        throw new Error("CUTOFF_EXCEEDED: Only the most recent transaction can be undone");
      }

      // 4. Fetch the winning participant and restore budget
      const participant = await tx.auctionParticipant.findUnique({
        where: {
          auctionId_userId: {
            auctionId: auction.id,
            userId: item.transaction.winnerId,
          },
        },
      });

      if (!participant) {
        throw new Error("PARTICIPANT_NOT_FOUND: Participant record not found");
      }

      const restoredTotalSpent = Math.max(0, participant.totalSpent - item.transaction.winningBid);
      const restoredRemainingBudget = participant.initialBudget - restoredTotalSpent;

      const updatedParticipant = await tx.auctionParticipant.update({
        where: { id: participant.id },
        data: {
          totalSpent: restoredTotalSpent,
          remainingBudget: restoredRemainingBudget,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 5. Delete or mark the transaction reversed
      await tx.transaction.delete({
        where: { id: item.transaction.id },
      });

      // 6. Revert Item back to PENDING (or ACTIVE if re-opened)
      const revertedItem = await tx.item.update({
        where: { id: item.id },
        data: {
          status: "PENDING",
          winnerId: null,
          winningPrice: null,
          soldAt: null,
        },
      });

      // 7. Write Audit Log
      await tx.auditLog.create({
        data: {
          auctionId: auction.id,
          userId: user.userId,
          action: "FINALIZATION_UNDONE",
          metadata: JSON.stringify({
            itemId: item.id,
            itemName: item.name,
            refundedAmount: item.transaction.winningBid,
            previousWinnerId: item.transaction.winnerId,
          }),
        },
      });

      return {
        item: revertedItem,
        updatedParticipant,
        auctionId: auction.id,
      };
    });

    try {
      const io = getIO();
      const room = `auction_${undoResult.auctionId}`;

      io.to(room).emit("player_undo_finalized", {
        auctionId: undoResult.auctionId,
        item: undoResult.item as any,
        updatedParticipant: undoResult.updatedParticipant as any,
      });

      io.to(room).emit("participant_updated", {
        participant: undoResult.updatedParticipant as any,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      item: undoResult.item,
      participant: undoResult.updatedParticipant,
    });
  } catch (error: any) {
    const msg = error.message || "Failed to undo finalization";
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
