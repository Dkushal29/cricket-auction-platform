"use client";

import React from "react";
import { ClientBid } from "@/lib/types";
import { formatExactINR } from "@/lib/auction-state";
import { Radio } from "lucide-react";

export function BidTicker({ bids }: { bids: ClientBid[] }) {
  const recentBids = bids.slice(0, 15);

  return (
    <div className="h-11 bg-[#1B2229] border-t border-[#2B343C] flex items-center overflow-hidden px-4 text-[13px] select-none">
      {/* Broadcast Lower-Third Badge */}
      <div className="flex items-center gap-2 pr-4 border-r border-[#2B343C] shrink-0 text-[#EDEAE1] font-semibold">
        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="text-[12px] uppercase tracking-wider text-[#8B939A]">
          Live stream
        </span>
      </div>

      {/* Horizontal Scrolling Entries */}
      <div className="flex-1 overflow-x-auto flex items-center gap-6 pl-4 no-scrollbar whitespace-nowrap">
        {recentBids.length === 0 ? (
          <span className="text-[13px] text-[#8B939A]">
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
                <span className="font-hero text-[14px] text-[#8B939A] tabular-nums">
                  {timeStr}
                </span>
                <span className="font-medium text-[#EDEAE1]">{team}</span>
                <span className="font-hero text-[15px] font-bold text-[#EDEAE1] tabular-nums">
                  {formatExactINR(bid.amount)}
                </span>
                {index === 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7A046]" />
                )}
                {index < recentBids.length - 1 && (
                  <span className="text-[#2B343C] pl-2 font-light">/</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
