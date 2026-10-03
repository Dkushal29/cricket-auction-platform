"use client";

import React from "react";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { ChevronRight, Tv, Users, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/auction-state";

interface ActiveArenasSectionProps {
  auctions: ClientAuction[];
}

export function ActiveArenasSection({ auctions }: ActiveArenasSectionProps) {
  const liveAuctions = auctions.filter((a) => a.status === "LIVE" || a.status === "PAUSED");
  const otherAuctions = auctions.filter((a) => a.status !== "LIVE" && a.status !== "PAUSED").slice(0, 4);

  const displayList = liveAuctions.length > 0 ? liveAuctions : otherAuctions;

  return (
    <section id="live-arenas" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#202B38] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#28D17C] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#28D17C]">
              Active Rooms
            </span>
          </div>
          <h2 className="font-hero text-[30px] sm:text-[36px] font-bold text-[#F5F7FA] uppercase tracking-tight">
            Live Auction Arenas
          </h2>
        </div>

        <Link
          href="/dashboard"
          className="text-[13px] text-[#E5AE3F] hover:text-[#F4C65E] flex items-center gap-1 font-semibold transition-colors"
        >
          <span>View all auctions in dashboard</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {displayList.length === 0 ? (
        <div className="p-8 rounded-[4px] bg-[#0D131C] border border-[#202B38] text-center space-y-3">
          <p className="text-[14px] text-[#8B98A8]">No active rooms at the moment.</p>
          <Link
            href="/create-auction"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#E5AE3F] text-[#070B12] text-[13px] font-bold hover:bg-[#F4C65E] transition-colors"
          >
            <span>Create the first auction</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((a) => {
            const isLive = a.status === "LIVE" || a.status === "PAUSED";
            return (
              <div
                key={a.id}
                className="p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] hover:border-[#E5AE3F]/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#8B98A8] bg-[#070B12] px-2 py-0.5 rounded-[2px] border border-[#202B38]">
                      ROOM: {a.roomCode}
                    </span>
                    <LiveStatusBadge status={a.status} isConfigLocked={a.isConfigLocked} />
                  </div>

                  <h3 className="text-[16px] font-bold text-[#F5F7FA] truncate">
                    {a.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[12px] pt-1">
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px] uppercase font-semibold">Lots</span>
                      <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums">
                        {a.items?.length || 0} Players
                      </span>
                    </div>
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px] uppercase font-semibold">Clock</span>
                      <span className="font-hero text-[16px] font-bold text-[#E5AE3F] tabular-nums">
                        {a.timerDuration}s Anti-Snipe
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#202B38] flex items-center justify-between gap-2">
                  <Link
                    href={`/auction/${a.id}/bigscreen`}
                    className="px-2.5 py-1 rounded-[3px] bg-[#070B12] border border-[#202B38] hover:border-[#8B98A8] text-[#8B98A8] hover:text-[#F5F7FA] text-[12px] flex items-center gap-1.5 transition-colors"
                  >
                    <Tv className="w-3 h-3 text-[#E5AE3F]" />
                    <span>Big Screen</span>
                  </Link>

                  <Link
                    href={`/auction/${a.id}`}
                    className="px-3.5 py-1 rounded-[3px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] text-[12px] font-bold transition-colors"
                  >
                    {isLive ? "Enter Arena" : "View Auction"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
