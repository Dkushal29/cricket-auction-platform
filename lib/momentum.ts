import { ClientBid, AuctionMomentum, MomentumLevel } from "./types";

export function calculateAuctionMomentum(bids: ClientBid[]): AuctionMomentum {
  if (!bids || bids.length === 0) {
    return {
      level: "STEADY",
      velocityPerMinute: 0,
      recentBidCount: 0,
      averageJump: 0,
    };
  }

  const now = Date.now();
  // Filter bids from last 2 minutes
  const recentBids = bids.filter((b) => now - new Date(b.timestamp).getTime() <= 120000);
  const recentBidCount = recentBids.length;

  let totalJump = 0;
  for (let i = 0; i < bids.length - 1; i++) {
    const jump = bids[i].amount - bids[i + 1].amount;
    if (jump > 0) totalJump += jump;
  }
  const averageJump = bids.length > 1 ? totalJump / (bids.length - 1) : bids[0]?.amount || 0;

  const velocityPerMinute = (recentBidCount / 2) * 60; // normalized to rate/min

  let level: MomentumLevel = "STEADY";
  if (recentBidCount >= 5 || bids.length >= 8) {
    level = "HIGH";
  } else if (recentBidCount >= 2 || bids.length >= 3) {
    level = "MODERATE";
  }

  return {
    level,
    velocityPerMinute,
    recentBidCount,
    averageJump,
  };
}
