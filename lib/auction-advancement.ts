import { prisma } from "./prisma";
import { getIO, startItemTimer } from "./socket-server";

export interface AdvancePlayerResult {
  alreadyActive: boolean;
  noMorePending: boolean;
  item: any | null;
  auction: any;
}

/**
 * Server-authoritative player advancement helper.
 * Atomically selects the next pending player according to the persisted randomized orderIndex.
 * Guards against concurrent skip races using Prisma transaction and active-item check.
 */
export async function advanceAuctionPlayer(
  auctionId: string,
  options?: {
    auctioneerUserId?: string;
    durationSeconds?: number;
  }
): Promise<AdvancePlayerResult> {
  const duration = options?.durationSeconds || 15;

  const result = await prisma.$transaction(
    async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          items: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!auction) {
        throw new Error("NOT_FOUND: Auction not found");
      }

      if (auction.status !== "LIVE") {
        throw new Error(
          `AUCTION_NOT_LIVE: Cannot advance player when auction status is ${auction.status}. Auction must be LIVE.`
        );
      }

      // Concurrency guard: check if another lot is currently ACTIVE
      const currentlyActive = auction.items.find((i) => i.status === "ACTIVE");
      if (currentlyActive) {
        return {
          alreadyActive: true,
          noMorePending: false,
          item: currentlyActive,
          auction,
        };
      }

      // Authoritative next lot selection: lowest orderIndex among PENDING items
      const nextPending = auction.items.find((i) => i.status === "PENDING");
      if (!nextPending) {
        return {
          alreadyActive: false,
          noMorePending: true,
          item: null,
          auction,
        };
      }

      // Atomically activate the next player
      const activatedItem = await tx.item.update({
        where: { id: nextPending.id },
        data: { status: "ACTIVE" },
      });

      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: { activeItemId: activatedItem.id },
      });

      await tx.auditLog.create({
        data: {
          auctionId,
          userId: options?.auctioneerUserId || auction.auctioneerId,
          action: "ITEM_ACTIVATED",
          metadata: JSON.stringify({
            itemId: activatedItem.id,
            itemName: activatedItem.name,
            orderIndex: activatedItem.orderIndex,
            basePrice: activatedItem.basePrice,
          }),
        },
      });

      return {
        alreadyActive: false,
        noMorePending: false,
        item: activatedItem,
        auction: updatedAuction,
      };
    },
    { maxWait: 5000, timeout: 10000 }
  );

  // Broadcast player_started and start timer ONLY if a new item was newly activated
  if (!result.alreadyActive && !result.noMorePending && result.item) {
    const expiryDate = new Date(Date.now() + duration * 1000);
    try {
      startItemTimer(auctionId, result.item.id, duration);

      const io = getIO();
      const room = `auction_${auctionId}`;
      io.to(room).emit("player_started", {
        auctionId,
        item: result.item,
        secondsRemaining: duration,
        timerExpiry: expiryDate.toISOString(),
      });
    } catch (e) {
      // Socket not ready or in test environment
    }
  }

  return result;
}
