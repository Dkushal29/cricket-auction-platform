"use client";

import React from "react";
import { ClientAuction, ClientBid, ClientItem } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";
import { LiveBidFeed } from "./LiveBidFeed";
import { ParticipantList } from "./ParticipantList";
import { AuctionTimer } from "./AuctionTimer";
import { Eye, Radio, Sparkles } from "lucide-react";

export function SpectatorDashboard({
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
  const highestBid = bids[0];

  return (
    <div className="space-y-6">
      {/* Spectator Presentation Header Banner */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-blue-500/30 flex items-center justify-between bg-blue-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Spectator Broadcast Mode</span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                Live Feed
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live broadcast telemetry for spectators and fans.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Player Card & Live Bidding Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player Under Hammer + Timer */}
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

        {/* Right Column: Live Stream Feed */}
        <div className="lg:col-span-5">
          <LiveBidFeed bids={bids} />
        </div>
      </div>

      {/* Team Purses & Squad Tracker */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Franchise Budgets & Squad Tracker
          </h3>
        </div>
        <ParticipantList participants={auction.participants} items={auction.items} />
      </div>
    </div>
  );
}
