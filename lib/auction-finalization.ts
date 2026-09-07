import { prisma } from "./prisma";
import { getIO, stopItemTimer } from "./socket-server";

export interface FinalizeResult {
  status: "SOLD" | "UNSOLD" | "FINAL_UNSOLD" | "ALREADY_FINALIZED";
  item: any;
  transaction?: any;
  updatedParticipant?: any;
  auctionId: string;
}

/**
 * Server-authoritative atomic finalization helper:
 * - If bids exist on the item, automatically finalizes as SOLD to the highest bidder:
 *   creates Transaction, deducts winner purse budget, updates Item status to SOLD,
 *   clears activeItemId, logs audit entry, and broadcasts player_sold.
 * - If 0 bids exist on the item, marks Item status as UNSOLD:
 *   clears activeItemId, logs audit entry, and broadcasts player_unsold.
 * - If item is already SOLD or UNSOLD, exits safely without duplicate deductions or errors.
 */
export async function finalizeOrUnsoldLot(
  auctionId: string,
  itemId: string,
  auctioneerUserId?: string
): Promise<FinalizeResult> {
  const maxRetries = 5;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Fetch Item with Auction and highest bid
          const item = await tx.item.findUnique({
            where: { id: itemId },
            include: {
              auction: true,
              bids: {
                orderBy: { amount: "desc" },
                take: 1,
                include: {
                  bidder: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          });

          if (!item) {
            throw new Error("NOT_FOUND: Item not found");
          }

          const { auction } = item;

          // If auctionId was provided, verify item belongs to it
          if (auction.id !== auctionId) {
            throw new Error("MISMATCH: Item does not belong to specified auction");
          }

          // If auctioneerUserId was provided, verify ownership
          if (auctioneerUserId && auction.auctioneerId !== auctioneerUserId) {
            throw new Error("FORBIDDEN: You are not authorized to finalize items in this auction");
          }

          // Idempotency: If item is not ACTIVE (e.g. already SOLD or UNSOLD), return safely
          if (item.status !== "ACTIVE") {
            return {
              status: "ALREADY_FINALIZED" as const,
              item,
              auctionId: auction.id,
            };
          }

          // Case A: Item has bids -> SOLD
          if (item.bids.length > 0) {
            const highestBid = item.bids[0];

            // Fetch winner participant record
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

            // Create Transaction record
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

            // Update Winner Participant Budget
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

            // Update Item to SOLD
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

            // Clear Active Item from Auction
            await tx.auction.update({
              where: { id: auction.id },
              data: { activeItemId: null },
            });

            // Record Audit Log
            await tx.auditLog.create({
              data: {
                auctionId: auction.id,
                userId: auctioneerUserId || auction.auctioneerId,
                action: "ITEM_SOLD",
                metadata: JSON.stringify({
                  itemId: item.id,
                  itemName: item.name,
                  winnerId: highestBid.bidderId,
                  winnerName: highestBid.bidder.name,
                  teamName: participant.teamName,
                  price: highestBid.amount,
                  finalizedBy: auctioneerUserId ? "MANUAL" : "AUTOMATIC_TIMER",
                }),
              },
            });

            return {
              status: "SOLD" as const,
              item: soldItem,
              transaction,
              updatedParticipant,
              auctionId: auction.id,
            };
          } else {
            // Case B: Item has 0 bids -> UNSOLD (round 1) or FINAL_UNSOLD (round 2)
            const isRound2 = (item.round ?? 1) >= 2;
            const newStatus = isRound2 ? "FINAL_UNSOLD" : "UNSOLD";

            const unsoldItem = await tx.item.update({
              where: { id: item.id },
              data: {
                status: newStatus,
                soldAt: new Date(),
              },
            });

            // Clear Active Item from Auction
            await tx.auction.update({
              where: { id: auction.id },
              data: { activeItemId: null },
            });

            // Record Audit Log
            await tx.auditLog.create({
              data: {
                auctionId: auction.id,
                userId: auctioneerUserId || auction.auctioneerId,
                action: isRound2 ? "ITEM_FINAL_UNSOLD" : "ITEM_UNSOLD",
                metadata: JSON.stringify({
                  itemId: item.id,
                  itemName: item.name,
                  round: item.round ?? 1,
                  status: newStatus,
                  finalizedBy: auctioneerUserId ? "MANUAL" : "AUTOMATIC_TIMER",
                }),
              },
            });

            return {
              status: (isRound2 ? "FINAL_UNSOLD" : "UNSOLD") as "UNSOLD" | "FINAL_UNSOLD",
              item: unsoldItem,
              auctionId: auction.id,
            };
          }
        },
        {
          maxWait: 5000,
          timeout: 10000,
        }
      );

      // Stop any active countdown timer for this auction
      stopItemTimer(result.auctionId);

      // Broadcast Real-time Events if newly finalized
      if (result.status === "SOLD") {
        try {
          const io = getIO();
          const room = `auction_${result.auctionId}`;

          io.to(room).emit("player_sold", {
            auctionId: result.auctionId,
            item: result.item,
            transaction: result.transaction,
            updatedParticipant: result.updatedParticipant,
          });

          io.to(room).emit("participant_updated", {
            participant: result.updatedParticipant,
          });
        } catch (e) {}
      } else if (result.status === "FINAL_UNSOLD") {
        try {
          const io = getIO();
          const room = `auction_${result.auctionId}`;

          io.to(room).emit("player_final_unsold", {
            auctionId: result.auctionId,
            item: result.item,
          });
          io.to(room).emit("player_unsold", {
            auctionId: result.auctionId,
            item: result.item,
            isFinal: true,
          });
        } catch (e) {}
      } else if (result.status === "UNSOLD") {
        try {
          const io = getIO();
          const room = `auction_${result.auctionId}`;

          io.to(room).emit("player_unsold", {
            auctionId: result.auctionId,
            item: result.item,
            isFinal: false,
          });
        } catch (e) {}
      }

      return result;
    } catch (err: any) {
      lastError = err;
      const isWriteConflict =
        err.code === "P2034" ||
        err.message?.includes("WriteConflict") ||
        err.message?.includes("write conflict") ||
        err.message?.includes("deadlock");

      if (isWriteConflict && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 20 * attempt));
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("Failed to finalize item transaction");
}
