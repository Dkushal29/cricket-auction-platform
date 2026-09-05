"use client";

import React from "react";
import { ClientAuction, ClientBid, ClientItem } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { PlayerCard } from "./PlayerCard";
import { BidPanel } from "./BidPanel";
import { LiveBidFeed } from "./LiveBidFeed";
import { ParticipantList } from "./ParticipantList";
import { AuctionTimer } from "./AuctionTimer";
import { Shield, Sparkles } from "lucide-react";

export function BidderDashboard({
  auction,
  activeItem,
  bids,
  secondsRemaining,
}: {
  auction: ClientAuction;
  activeItem: ClientItem | null;
  bids: ClientBid[];
  secondsRemaining: number | null;
}) {
  const { user } = useAuth();
  const highestBid = bids[0];

  // Current bidder's participant record
  const selfParticipant =
    auction.participants.find((p) => p.userId === user?.id) || null;

  return (
    <div className="space-y-6">
      {/* Top Bidding Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Player Card & Live Hammer Timer */}
        <div className="lg:col-span-7 space-y-4">
          <AuctionTimer
            secondsRemaining={secondsRemaining}
            totalDuration={auction.timerDuration}
            antiSnipeThreshold={auction.antiSnipeThreshold}
            isPaused={auction.status === "PAUSED"}
          />

          <PlayerCard
            item={activeItem}
            highestBid={highestBid?.amount}
            highestBidderName={highestBid?.bidder?.name}
            highestBidderTeam={highestBid?.bidder?.participant?.teamName}
          />
        </div>

        {/* Right: Instant Bid Console & Live Bid Feed */}
        <div className="lg:col-span-5 space-y-4">
          <BidPanel
            auction={auction}
            item={activeItem}
            currentHighestBid={highestBid?.amount || 0}
            highestBidderId={highestBid?.bidderId}
            participant={selfParticipant}
          />

          <LiveBidFeed bids={bids} />
        </div>
      </div>

      {/* Head-to-Head Team Budgets */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Franchise Purse & Rosters
          </h3>
        </div>
        <ParticipantList
          participants={auction.participants}
          items={auction.items}
          highlightUserId={user?.id}
        />
      </div>
    </div>
  );
}
