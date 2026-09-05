"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { getSquadComposition } from "@/lib/squad-strategy";
import { calculateAuctionMomentum } from "@/lib/momentum";
import { ArrowLeft, BarChart3, Flame, PieChart, Shield, Trophy, Users, Zap, Loader2 } from "lucide-react";

export default function WarRoomPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/auctions/${auctionId}/results`).then((r) => r.json()),
      fetch(`/api/auctions/${auctionId}/bids`).then((r) => r.json()),
    ])
      .then(([resultsData, bidsData]) => {
        setData(resultsData);
        setBids(bidsData.bids || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#10151A] flex items-center justify-center text-[#EDEAE1]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7A046]" />
      </div>
    );
  }

  const momentum = calculateAuctionMomentum(bids);
  const soldItems = data.soldItems || [];
  const topPurchases = [...soldItems].sort((a, b) => (b.winningPrice || 0) - (a.winningPrice || 0)).slice(0, 5);

  const teamA = data.participants?.[0];
  const teamB = data.participants?.[1];

  const teamAWon = soldItems.filter((i: any) => i.winnerId === teamA?.userId);
  const teamBWon = soldItems.filter((i: any) => i.winnerId === teamB?.userId);

  const teamAComp = getSquadComposition(teamAWon);
  const teamBComp = getSquadComposition(teamBWon);

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      {/* Header */}
      <header className="h-14 px-4 sm:px-6 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/auction/${auctionId}`)}
            className="p-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-[#EDEAE1]">Auction War Room</h1>
            <span className="text-[12px] text-[#8B939A]">{data.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/auction/${auctionId}/replay`}
            className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] hover:border-[#8B939A] text-[#EDEAE1] text-[12px] font-medium"
          >
            Timeline replay
          </Link>
          <Link
            href={`/auction/${auctionId}/results`}
            className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[12px]"
          >
            Ledger & exports
          </Link>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Total revenue committed</span>
            <div className="font-hero text-[28px] font-bold text-[#C7A046] tabular-nums">
              {formatINR(data.summary?.totalRevenue || 0)}
            </div>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-[#8B939A]">Auction momentum</span>
              <Flame className={`w-4 h-4 ${momentum.level === "HIGH" ? "text-[#C7A046]" : "text-[#8B939A]"}`} />
            </div>
            <div className="font-hero text-[28px] font-bold text-[#EDEAE1] tabular-nums">
              {momentum.level}
            </div>
            <span className="text-[11px] text-[#8B939A]">
              ~{momentum.velocityPerMinute.toFixed(0)} bids/min velocity
            </span>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Lots cleared</span>
            <div className="font-hero text-[28px] font-bold text-[#EDEAE1] tabular-nums">
              {data.summary?.soldCount} / {data.summary?.totalItems}
            </div>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Total bids logged</span>
            <div className="font-hero text-[28px] font-bold text-[#EDEAE1] tabular-nums">
              {bids.length}
            </div>
          </div>
        </div>

        {/* Head to Head Spend & Squad Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Team A */}
          <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4" style={{ borderTop: "3px solid #3E7CB1" }}>
            <div className="flex items-center justify-between border-b border-[#2B343C] pb-2">
              <div>
                <span className="text-[11px] text-[#3E7CB1] font-bold">Team Alpha</span>
                <h3 className="text-[16px] font-bold text-[#EDEAE1]">{teamA?.teamName}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#8B939A] block">Spend</span>
                <span className="font-hero text-[18px] font-bold text-[#EDEAE1] tabular-nums">{formatINR(teamA?.totalSpent || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[12px] text-[#8B939A] font-medium block">Squad balance ({teamAWon.length} players)</span>
              <div className="grid grid-cols-4 gap-2 text-[12px] text-center">
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">BATSMEN</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamAComp.batsmen}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">BOWLERS</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamAComp.bowlers}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">ALL-ROUND</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamAComp.allRounders}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">KEEPERS</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamAComp.wicketkeepers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4" style={{ borderTop: "3px solid #B85C38" }}>
            <div className="flex items-center justify-between border-b border-[#2B343C] pb-2">
              <div>
                <span className="text-[11px] text-[#B85C38] font-bold">Team Beta</span>
                <h3 className="text-[16px] font-bold text-[#EDEAE1]">{teamB?.teamName}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#8B939A] block">Spend</span>
                <span className="font-hero text-[18px] font-bold text-[#EDEAE1] tabular-nums">{formatINR(teamB?.totalSpent || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[12px] text-[#8B939A] font-medium block">Squad balance ({teamBWon.length} players)</span>
              <div className="grid grid-cols-4 gap-2 text-[12px] text-center">
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">BATSMEN</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamBComp.batsmen}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">BOWLERS</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamBComp.bowlers}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">ALL-ROUND</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamBComp.allRounders}</span>
                </div>
                <div className="p-2 bg-[#10151A] rounded-[2px] border border-[#2B343C]">
                  <span className="text-[#8B939A] block text-[10px]">KEEPERS</span>
                  <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">{teamBComp.wicketkeepers}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Purchases */}
        <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-3">
          <h2 className="text-[15px] font-bold text-[#EDEAE1]">
            Top acquisitions of the auction
          </h2>

          <div className="space-y-2">
            {topPurchases.length === 0 ? (
              <p className="text-[13px] text-[#8B939A]">No deals finalized yet.</p>
            ) : (
              topPurchases.map((player: any, idx: number) => {
                const winner = data.participants?.find((p: any) => p.userId === player.winnerId);
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-hero text-[16px] font-bold text-[#C7A046] tabular-nums">#{idx + 1}</span>
                      <div>
                        <span className="font-semibold text-[#EDEAE1] block">{player.name}</span>
                        <span className="text-[11px] text-[#8B939A]">
                          {winner?.teamName} • {player.category}
                        </span>
                      </div>
                    </div>
                    <span className="font-hero text-[18px] font-bold text-[#C7A046] tabular-nums">
                      {formatExactINR(player.winningPrice)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
