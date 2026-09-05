"use client";

import React from "react";
import { ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Shield, Sparkles, Trophy, UserCheck } from "lucide-react";

export function PlayerCard({
  item,
  highestBid,
  highestBidderName,
  highestBidderTeam,
}: {
  item: ClientItem | null;
  highestBid?: number;
  highestBidderName?: string;
  highestBidderTeam?: string;
}) {
  if (!item) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[380px] border border-dashed border-slate-800">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-400 mb-1">No Active Player Under Hammer</h3>
        <p className="text-sm text-slate-500 max-w-md">
          The auctioneer will bring the next superstar to the auction block shortly.
        </p>
      </div>
    );
  }

  const isSold = item.status === "SOLD";
  const isUnsold = item.status === "UNSOLD";

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl relative">
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover object-top opacity-85 transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-amber-400">
            <Trophy className="w-20 h-20 opacity-30" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1622] via-[#0F1622]/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Lot #{item.orderIndex}</span>
          </span>

          <span className="px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 text-xs font-semibold">
            {item.category}
          </span>
        </div>

        {/* Sold / Unsold Banner */}
        {isSold && (
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <UserCheck className="w-9 h-9" />
            </div>
            <span className="text-3xl font-black tracking-wider text-emerald-300 uppercase">
              SOLD!
            </span>
            <p className="text-lg font-bold text-white mt-1">
              {highestBidderTeam || "Winner"} for {formatINR(item.winningPrice || highestBid || 0)}
            </p>
          </div>
        )}

        {isUnsold && (
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-3xl font-black tracking-wider text-red-300 uppercase">
              UNSOLD
            </span>
            <p className="text-sm text-slate-300 mt-1">
              Passed without meeting base valuation
            </p>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {item.name}
          </h2>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Base: {formatExactINR(item.basePrice)}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mb-6 line-clamp-2">
          {item.description || "World-class talent registered for the auction pool."}
        </p>

        {/* Price & Current Leader Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
              Current Highest Bid
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {highestBid ? formatExactINR(highestBid) : "No Bids Yet"}
            </div>
            {highestBid && (
              <span className="text-xs text-amber-300/80 font-medium">
                ({formatINR(highestBid)})
              </span>
            )}
          </div>

          <div className="sm:border-l sm:border-slate-800 sm:pl-4 flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
              Leading Franchise
            </span>
            {highestBidderTeam ? (
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-sm">
                    {highestBidderTeam}
                  </div>
                  <span className="text-xs text-slate-400">
                    by {highestBidderName}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                Waiting for opening bid (min: {formatExactINR(item.basePrice)})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
