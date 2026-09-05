"use client";

import React from "react";
import { ClientBid } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { History, Shield, Zap } from "lucide-react";

export function LiveBidFeed({ bids }: { bids: ClientBid[] }) {
  return (
    <div className="glass-panel rounded-3xl p-5 border border-slate-800 flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Live Bidding Stream</span>
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          {bids.length} bids recorded
        </span>
      </div>

      {bids.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <History className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-xs">No bids placed on this lot yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {bids.map((bid, index) => {
            const isHighest = index === 0;
            const team = bid.bidder?.participant?.teamName || "Team";

            return (
              <div
                key={bid.id || `${bid.timestamp}-${index}`}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isHighest
                    ? "bg-amber-950/40 border-amber-500/50 shadow-md animate-fade-in"
                    : "bg-slate-900/60 border-slate-800/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isHighest
                        ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    #{bids.length - index}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                      <span>{team}</span>
                      {isHighest && (
                        <span className="text-[10px] uppercase font-extrabold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                          Leader
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono font-black text-sm sm:text-base ${
                      isHighest ? "text-amber-400" : "text-slate-200"
                    }`}
                  >
                    {formatExactINR(bid.amount)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {formatINR(bid.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
