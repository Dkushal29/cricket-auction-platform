"use client";

import React from "react";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { Radio, Users, ChevronRight, Tv, BarChart2 } from "lucide-react";

interface ActiveArenasSectionProps {
  auctions: ClientAuction[];
}

export function ActiveArenasSection({ auctions }: ActiveArenasSectionProps) {
  const liveAuctions = auctions.filter((a) => a.status === "LIVE" || a.status === "PAUSED");
  const otherAuctions = auctions.filter((a) => a.status !== "LIVE" && a.status !== "PAUSED").slice(0, 4);

  const displayList = liveAuctions.length > 0 ? liveAuctions : otherAuctions;

  if (displayList.length === 0) return null;

  return (
    <section id="live-arenas" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232C36] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
              Live Stadium Hub
            </span>
          </div>
          <h2 className="font-hero text-[32px] sm:text-[40px] font-bold text-[#F5F3EE] uppercase tracking-tight">
            Active Auction Arenas
          </h2>
        </div>

        <Link
          href="/dashboard"
          className="text-[13px] text-[#D9A94E] hover:underline flex items-center gap-1 font-medium"
        >
          <span>View All Arenas in Dashboard</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayList.map((a) => {
          const isLive = a.status === "LIVE" || a.status === "PAUSED";
          return (
            <div
              key={a.id}
              className="p-5 rounded-[4px] bg-[#131A22] border border-[#232C36] hover:border-[#D9A94E]/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#8B93A0] bg-[#0A0F16] px-2 py-0.5 rounded-[2px] border border-[#232C36]">
                    ROOM: {a.roomCode}
                  </span>
                  <LiveStatusBadge status={a.status} isConfigLocked={a.isConfigLocked} />
                </div>

                <h3 className="text-[16px] font-bold text-[#F5F3EE] truncate">
                  {a.name}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
                  <div className="p-2 rounded-[2px] bg-[#0A0F16] border border-[#232C36]">
                    <span className="text-[#8B93A0] block text-[10px]">TOTAL LOTS</span>
                    <span className="font-hero text-[16px] font-bold text-[#F5F3EE] tabular-nums">
                      {a.items?.length || 0} Players
                    </span>
                  </div>
                  <div className="p-2 rounded-[2px] bg-[#0A0F16] border border-[#232C36]">
                    <span className="text-[#8B93A0] block text-[10px]">TIMER</span>
                    <span className="font-hero text-[16px] font-bold text-[#D9A94E] tabular-nums">
                      {a.timerDuration}s Anti-Snipe
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#232C36] flex items-center justify-between gap-2">
                <Link
                  href={`/auction/${a.id}/bigscreen`}
                  className="px-2.5 py-1 rounded-[2px] bg-[#0A0F16] border border-[#232C36] hover:border-[#8B93A0] text-[#8B93A0] hover:text-[#F5F3EE] text-[12px] flex items-center gap-1"
                  title="Open Big Screen Broadcast"
                >
                  <Tv className="w-3 h-3 text-[#D9A94E]" />
                  <span>Big Screen</span>
                </Link>

                <Link
                  href={`/auction/${a.id}`}
                  className="px-3.5 py-1 rounded-[2px] bg-[#D9A94E] hover:bg-[#B9862E] text-[#0A0F16] text-[12px] font-bold transition-colors"
                >
                  {isLive ? "Enter Arena" : "View Auction"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
