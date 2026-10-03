import { prisma } from "./prisma";
import { getIO } from "./socket-server";
import { advanceAuctionPlayer } from "./auction-advancement";

export interface RoundStatusInfo {
  currentRound: number;
  isRoundComplete: boolean;
  canStartNextRound: boolean;
  nextRoundNumber: number | null;
  eligibleUnsoldCount: number;
  eligibleItems: any[];
}

/**
 * Evaluates the 3-round status of an auction.
 *
 * Rules:
 * - Round 1: All items start in PENDING, round 1.
 * - Round 2: Only items UNSOLD in Round 1.
 * - Round 3: Only items UNSOLD in Round 2.
 * - After Round 3: All remaining UNSOLD items become FINAL_UNSOLD. Strictly NO Round 4.
 * - SOLD items NEVER return.
 * - FINAL_UNSOLD items NEVER return.
 * - Relative randomized orderIndex is strictly preserved across all rounds.
 */
export function getAuctionRoundStatus(auction: {
  id: string;
  status: string;
  currentRound?: number | null;
  activeItemId?: string | null;
  items: Array<{
    id: string;
    name: string;
    status: string;
    round: number;
    orderIndex: number;
  }>;
}): RoundStatusInfo {
  const currentRound = auction.currentRound || 1;
  const hasActiveItem = Boolean(auction.activeItemId);
  const pendingCount = auction.items.filter((i) => i.status === "PENDING").length;

  const isRoundComplete = !hasActiveItem && pendingCount === 0 && auction.status === "LIVE";

  let eligibleItems: any[] = [];
  let nextRoundNumber: number | null = null;
  let canStartNextRound = false;

  if (currentRound === 1 && isRoundComplete) {
    // Eligible for Round 2: Items UNSOLD from Round 1
    eligibleItems = auction.items
      .filter((i) => i.status === "UNSOLD" && i.round === 1)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (eligibleItems.length > 0) {
      canStartNextRound = true;
      nextRoundNumber = 2;
    }
  } else if (currentRound === 2 && isRoundComplete) {
    // Eligible for Round 3: Items UNSOLD from Round 2
    eligibleItems = auction.items
      .filter((i) => i.status === "UNSOLD" && i.round === 2)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (eligibleItems.length > 0) {
      canStartNextRound = true;
      nextRoundNumber = 3;
    }
  }

  return {
    currentRound,
    isRoundComplete,
    canStartNextRound,
    nextRoundNumber,
    eligibleUnsoldCount: eligibleItems.length,
    eligibleItems,
  };
}

/**
 * Transitions an auction to the next round (Round 2 or Round 3).
 *
 * Atomically:
 * 1. Validates no active item and 0 pending items.
 * 2. Validates target round is 2 or 3 (strictly prohibits Round 4).
 * 3. Gathers all eligible UNSOLD items from the previous round.
 * 4. Updates them to status: PENDING, round: targetRound, preserving orderIndex.
 * 5. Updates auction.currentRound = targetRound.
 * 6. Automatically activates the first eligible player (lowest orderIndex).
 * 7. Broadcasts auction_round_started and player_started via Socket.IO.
 */
export async function transitionToNextRound(
  auctionId: string,
  targetRound: 2 | 3,
  auctioneerUserId?: string
): Promise<{
  success: boolean;
  round: number;
  activatedItem: any | null;
  eligibleCount: number;
}> {
  if (targetRound !== 2 && targetRound !== 3) {
    throw new Error(`INVALID_ROUND: Only Round 2 and Round 3 are supported. There is no Round ${targetRound}.`);
  }

  const previousRound = targetRound - 1;

  const result = await prisma.$transaction(
    async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          items: { orderBy: { orderIndex: "asc" } },
        },
      });

      if (!auction) {
        throw new Error("NOT_FOUND: Auction not found");
      }

      if (auction.status !== "LIVE") {
        throw new Error(`AUCTION_NOT_LIVE: Auction must be LIVE to start Round ${targetRound}. Current status: ${auction.status}`);
      }

      // Check active item
      const activeItem = auction.items.find((i) => i.status === "ACTIVE");
      if (activeItem) {
        throw new Error(`ITEM_CURRENTLY_ACTIVE: Cannot start Round ${targetRound} while item '${activeItem.name}' is active.`);
      }

      // Check pending items in target round
      const pendingTargetItems = auction.items.filter((i) => i.status === "PENDING" && i.round >= targetRound);
      if (pendingTargetItems.length > 0) {
        throw new Error(`ROUND_NOT_COMPLETE: Cannot advance round while ${pendingTargetItems.length} items are still pending in Round ${targetRound}.`);
      }

      // Find eligible unsold items from the immediately preceding round
      const eligibleItems = auction.items
        .filter((i) => i.status === "UNSOLD" && i.round === previousRound)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      if (eligibleItems.length === 0) {
        throw new Error(`NO_ELIGIBLE_PLAYERS: No players from Round ${previousRound} are eligible for Round ${targetRound}.`);
      }

      // Bulk update eligible items to PENDING with the new round number
      // Their orderIndex is left untouched, preserving the original relative randomized order!
      const eligibleIds = eligibleItems.map((i) => i.id);
      await tx.item.updateMany({
        where: { id: { in: eligibleIds } },
        data: {
          status: "PENDING",
          round: targetRound,
        },
      });

      // Update auction currentRound
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentRound: targetRound,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          auctionId,
          userId: auctioneerUserId || auction.auctioneerId,
          action: "ROUND_STARTED",
          metadata: JSON.stringify({
            round: targetRound,
            eligiblePlayerCount: eligibleItems.length,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return {
        eligibleItems,
        eligibleCount: eligibleItems.length,
      };
    },
    { maxWait: 5000, timeout: 10000 }
  );

  // Broadcast auction_round_started Socket.IO event
  try {
    const io = getIO();
    const room = `auction_${auctionId}`;
    io.to(room).emit("auction_round_started", {
      auctionId,
      round: targetRound,
      eligiblePlayerCount: result.eligibleCount,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {}

  // Automatically activate the first player in the new round
  const advanceResult = await advanceAuctionPlayer(auctionId, {
    auctioneerUserId,
    durationSeconds: 15,
  });

  return {
    success: true,
    round: targetRound,
    activatedItem: advanceResult.item,
    eligibleCount: result.eligibleCount,
  };
}
