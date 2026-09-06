"use client";

import React from "react";
import { Radio, Users, Activity, Trophy, ShieldCheck } from "lucide-react";

interface LiveStatsBarProps {
  activeAuctionsCount?: number;
  totalBidsCount?: number;
  totalPlayersAuctioned?: number;
  uptimePercentage?: string;
}

export function LiveStatsBar({
  activeAuctionsCount = 3,
  totalBidsCount = 1420,
  totalPlayersAuctioned = 86,
  uptimePercentage = "99.99%",
}: LiveStatsBarProps) {
  return (
    <section className="border-y border-[#232C36] bg-[#131A22]/90 backdrop-blur-md py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Live Indicator & Social Proof */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#0A0F16] border border-[#232C36]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[12px] font-bold text-[#F5F3EE] uppercase tracking-wider">
                LIVE AUCTIONS
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Avatar Stack */}
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#3E7CB1] border-2 border-[#131A22] flex items-center justify-center text-[10px] font-bold text-white">
                  VK
                </div>
                <div className="w-7 h-7 rounded-full bg-[#B85C38] border-2 border-[#131A22] flex items-center justify-center text-[10px] font-bold text-white">
                  MS
                </div>
                <div className="w-7 h-7 rounded-full bg-[#D9A94E] border-2 border-[#131A22] flex items-center justify-center text-[10px] font-bold text-[#0A0F16]">
                  RS
                </div>
                <div className="w-7 h-7 rounded-full bg-[#232C36] border-2 border-[#131A22] flex items-center justify-center text-[10px] font-bold text-[#8B93A0]">
                  +5k
                </div>
              </div>
              <span className="text-[12px] text-[#8B93A0]">
                Join thousands of cricket fans & league hosts
              </span>
            </div>
          </div>

          {/* Right 4 Stat Clusters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full lg:w-auto text-center lg:text-left">
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[#8B93A0] block">
                Active Arenas
              </span>
              <span className="font-hero text-[26px] sm:text-[30px] font-extrabold text-[#F5F3EE] tabular-nums">
                {activeAuctionsCount > 0 ? activeAuctionsCount : "1"}
              </span>
            </div>

            <div className="px-3 border-l border-[#232C36]">
              <span className="text-[11px] uppercase tracking-wider text-[#8B93A0] block">
                Total Bids
              </span>
              <span className="font-hero text-[26px] sm:text-[30px] font-extrabold text-[#D9A94E] tabular-nums">
                {totalBidsCount.toLocaleString()}+
              </span>
            </div>

            <div className="px-3 border-l border-[#232C36]">
              <span className="text-[11px] uppercase tracking-wider text-[#8B93A0] block">
                Players Sold
              </span>
              <span className="font-hero text-[26px] sm:text-[30px] font-extrabold text-[#F5F3EE] tabular-nums">
                {totalPlayersAuctioned}+
              </span>
            </div>

            <div className="px-3 border-l border-[#232C36]">
              <span className="text-[11px] uppercase tracking-wider text-[#8B93A0] block">
                Socket Uptime
              </span>
              <span className="font-hero text-[26px] sm:text-[30px] font-extrabold text-[#34D399] tabular-nums">
                {uptimePercentage}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
