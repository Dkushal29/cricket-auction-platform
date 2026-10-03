"use client";

import React from "react";
import { ClientBid } from "@/lib/types";
import { formatExactINR } from "@/lib/auction-state";
import { Radio } from "lucide-react";

export function BidTicker({ bids }: { bids: ClientBid[] }) {
  const recentBids = bids.slice(0, 15);

  return (
    <div className="h-11 bg-[#0D131C] border-t border-[#202B38] flex items-center overflow-hidden px-4 text-[13px] select-none">
      {/* Broadcast Lower-Third Badge */}
      <div className="flex items-center gap-2 pr-4 border-r border-[#202B38] shrink-0 text-[#F5F7FA] font-semibold">
        <Radio className="w-3.5 h-3.5 text-[#28D17C] animate-pulse" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8]">
          Live Stream
        </span>
      </div>

      {/* Horizontal Scrolling Entries */}
      <div className="flex-1 overflow-x-auto flex items-center gap-6 pl-4 no-scrollbar whitespace-nowrap">
        {recentBids.length === 0 ? (
          <span className="text-[13px] text-[#8B98A8]">
            No live bids registered for current lot yet
          </span>
        ) : (
          recentBids.map((bid, index) => {
            const team = bid.bidder?.participant?.teamName || "Team";
            const timeStr = new Date(bid.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={bid.id || `${bid.timestamp}-${index}`}
                className="inline-flex items-center gap-2 text-[13px]"
              >
                <span className="font-mono text-[13px] text-[#8B98A8] tabular-nums">
                  {timeStr}
                </span>
                <span className="font-semibold text-[#F5F7FA]">{team}</span>
                <span className="font-hero text-[15px] font-bold text-[#E5AE3F] tabular-nums">
                  {formatExactINR(bid.amount)}
                </span>
                {index === 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5AE3F]" />
                )}
                {index < recentBids.length - 1 && (
                  <span className="text-[#202B38] pl-2 font-light">/</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
