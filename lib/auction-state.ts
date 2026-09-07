import { AuctionStatus, ItemStatus } from "./types";

const VALID_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  DRAFT: ["READY", "CANCELLED"],
  READY: ["LIVE", "DRAFT", "CANCELLED"],
  LIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["LIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidAuctionTransition(from: AuctionStatus, to: AuctionStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidAuctionTransition(from: AuctionStatus, to: AuctionStatus): void {
  if (!isValidAuctionTransition(from, to)) {
    throw new Error(`Invalid auction state transition from ${from} to ${to}`);
  }
}

export interface AuctionPreflightData {
  name: string;
  minimumBidIncrement: number;
  timerDuration: number;
  bidderInviteA?: string | null;
  bidderInviteB?: string | null;
  spectatorInvite?: string | null;
  participants: Array<{
    initialBudget: number;
    remainingBudget: number;
    totalSpent: number;
  }>;
  items: Array<{
    basePrice: number;
  }>;
}

export function isAuctionConfigComplete(auction: AuctionPreflightData): boolean {
  if (!auction.name || auction.name.trim().length < 3) return false;
  if (!auction.participants || auction.participants.length < 2) return false;
  if (!auction.items || auction.items.length < 1) return false;
  if (
    auction.participants.some(
      (p) => p.initialBudget <= 0 || p.remainingBudget !== p.initialBudget - p.totalSpent
    )
  ) {
    return false;
  }
  if (auction.items.some((i) => i.basePrice <= 0)) return false;
  if (auction.minimumBidIncrement <= 0) return false;
  if (auction.timerDuration < 5) return false;
  if (!auction.bidderInviteA || !auction.bidderInviteB || !auction.spectatorInvite) return false;
  return true;
}

export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    const cr = (amount / 10000000).toFixed(2).replace(/\.00$/, "");
    return `₹${cr} Cr`;
  }
  if (amount >= 100000) {
    const lakh = (amount / 100000).toFixed(2).replace(/\.00$/, "");
    return `₹${lakh} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatExactINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
