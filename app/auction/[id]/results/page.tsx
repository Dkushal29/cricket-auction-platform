"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { ArrowLeft, FileSpreadsheet, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuctionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}/results`)
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10151A] flex items-center justify-center text-[#EDEAE1]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7A046]" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-[#10151A] flex flex-col items-center justify-center p-6 text-center text-[#EDEAE1]">
        <h2 className="text-[18px] font-bold mb-2">Results not available</h2>
        <Link href="/" className="text-[#EDEAE1] underline text-[14px]">
          Return to lobby
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      <RoleSwitcherBar />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/auction/${auctionId}`)}
              className="p-2 rounded-[2px] bg-[#1B2229] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-bold text-[#EDEAE1]">
                {data.name} — Certified results
              </h1>
              <p className="text-[13px] text-[#8B939A]">
                Official ledger records and roster allocations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/auctions/${auctionId}/export?format=csv`}
              download
              className="px-3.5 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] flex items-center gap-2 hover:bg-white"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV</span>
            </a>

            <a
              href={`/api/auctions/${auctionId}/export?format=json`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-[2px] bg-[#1B2229] border border-[#2B343C] text-[#EDEAE1] font-medium text-[13px] flex items-center gap-2 hover:border-[#8B939A]"
            >
              <FileText className="w-4 h-4 text-[#8B939A]" />
              <span>Export JSON</span>
            </a>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Total revenue</span>
            <div className="font-hero text-[28px] font-bold text-[#C7A046] tabular-nums">
              {formatINR(data.summary?.totalRevenue || 0)}
            </div>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Lots sold</span>
            <div className="font-hero text-[28px] font-bold text-[#EDEAE1] tabular-nums">
              {data.summary?.soldCount} / {data.summary?.totalItems}
            </div>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Unsold lots</span>
            <div className="font-hero text-[28px] font-bold text-[#8B939A] tabular-nums">
              {data.summary?.unsoldCount}
            </div>
          </div>

          <div className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C]">
            <span className="text-[12px] text-[#8B939A] block mb-1">Status</span>
            <div className="text-[18px] font-bold text-[#EDEAE1] capitalize">
              {data.status?.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Team Rosters */}
        <div className="space-y-3">
          <h2 className="text-[16px] font-bold text-[#EDEAE1]">
            Franchise team allocations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.participants?.map((p: any, idx: number) => {
              const wonPlayers = data.soldItems?.filter((i: any) => i.winnerId === p.userId) || [];
              const teamBorder = idx === 0 ? "#3E7CB1" : "#B85C38";

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-3"
                  style={{ borderTop: `3px solid ${teamBorder}` }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#2B343C]">
                    <div>
                      <h3 className="font-bold text-[16px] text-[#EDEAE1]">{p.teamName}</h3>
                      <span className="text-[12px] text-[#8B939A]">{p.user?.name}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#8B939A] block">Remaining purse</span>
                      <span className="font-hero text-[18px] font-bold text-[#EDEAE1] tabular-nums">
                        {formatExactINR(p.remainingBudget)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[13px] text-[#8B939A]">
                    <span>Total spend: <strong className="text-[#EDEAE1]">{formatINR(p.totalSpent)}</strong></span>
                    <span>Acquisitions: <strong className="text-[#EDEAE1]">{wonPlayers.length}</strong></span>
                  </div>

                  <div className="space-y-1.5">
                    {wonPlayers.length === 0 ? (
                      <p className="text-[12px] text-[#8B939A] italic">No acquisitions</p>
                    ) : (
                      wonPlayers.map((player: any) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px]"
                        >
                          <div>
                            <span className="font-medium text-[#EDEAE1]">{player.name}</span>
                            <span className="text-[11px] text-[#8B939A] ml-1.5">({player.category})</span>
                          </div>
                          <span className="font-hero text-[15px] font-bold text-[#C7A046] tabular-nums">
                            {formatExactINR(player.winningPrice)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Execution Table */}
        <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-3">
          <h2 className="text-[16px] font-bold text-[#EDEAE1]">
            Lot execution ledger
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#2B343C] text-[#8B939A] text-[12px]">
                  <th className="pb-2 font-medium">Lot #</th>
                  <th className="pb-2 font-medium">Player</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Base price</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Winning team</th>
                  <th className="pb-2 font-medium text-right">Final bid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B343C]">
                {data.soldItems?.concat(data.unsoldItems || []).map((item: any) => {
                  const isSold = item.status === "SOLD";
                  const participant = data.participants?.find((p: any) => p.userId === item.winnerId);

                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 font-hero text-[14px] text-[#8B939A] tabular-nums">#{item.orderIndex}</td>
                      <td className="py-2.5 font-semibold text-[#EDEAE1]">{item.name}</td>
                      <td className="py-2.5 text-[#8B939A]">{item.category}</td>
                      <td className="py-2.5 font-hero text-[14px] text-[#8B939A] tabular-nums">{formatINR(item.basePrice)}</td>
                      <td className="py-2.5">
                        {isSold ? (
                          <span className="text-[#C7A046] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sold</span>
                          </span>
                        ) : (
                          <span className="text-[#8B939A] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Unsold</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-[#EDEAE1]">
                        {participant?.teamName || (isSold ? item.winner?.name : "—")}
                      </td>
                      <td className="py-2.5 text-right font-hero text-[15px] font-bold text-[#C7A046] tabular-nums">
                        {item.winningPrice ? formatExactINR(item.winningPrice) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-[#2B343C] text-center text-[12px] text-[#8B939A]">
        Official certified audit ledger — Bangalore Premier League 2026
      </footer>
    </div>
  );
}
