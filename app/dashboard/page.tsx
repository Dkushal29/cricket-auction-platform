"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useAuth } from "@/components/AuthContext";
import {
  ArrowLeft,
  Plus,
  Tv,
  BarChart2,
  History,
  FileSpreadsheet,
  Layers,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<ClientAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  useEffect(() => {
    fetch("/api/auctions")
      .then((res) => res.json())
      .then((data) => {
        if (data.auctions) setAuctions(data.auctions);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredAuctions = auctions.filter((auc) => {
    if (activeTab === "LIVE") return auc.status === "LIVE" || auc.status === "PAUSED";
    if (activeTab === "UPCOMING") return auc.status === "DRAFT" || auc.status === "READY";
    if (activeTab === "COMPLETED") return auc.status === "COMPLETED" || auc.status === "CANCELLED";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      <RoleSwitcherBar />

      {/* Header */}
      <header className="h-16 px-4 sm:px-8 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[#EDEAE1] hover:text-white text-[14px]">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-[#8B939A] text-[13px]">/ My Auctions Dashboard</span>
        </div>

        <Link
          href="/create-auction"
          className="px-4 py-2 rounded-[3px] bg-[#C7A046] text-[#10151A] font-bold text-[13px] flex items-center gap-1.5 hover:bg-[#b58f38] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create auction</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-[#EDEAE1]">My cricket auctions</h1>
            <p className="text-[13px] text-[#8B939A]">
              Monitor your active arenas, configure lot queues, and inspect completed results
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-[#10151A] border border-[#2B343C] rounded-[3px] p-0.5 text-[12px]">
            {(["ALL", "LIVE", "UPCOMING", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-[2px] font-medium transition-colors ${
                  activeTab === tab ? "bg-[#1B2229] text-[#EDEAE1] shadow-xs" : "text-[#8B939A] hover:text-[#EDEAE1]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#8B939A] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#C7A046]" />
            <span className="text-[13px]">Loading your auction database...</span>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="p-12 rounded-[4px] bg-[#1B2229] border border-dashed border-[#2B343C] text-center space-y-4">
            <p className="text-[14px] text-[#8B939A]">No auctions found in this category.</p>
            <Link
              href="/create-auction"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C7A046] text-[#10151A] rounded-[3px] text-[13px] font-bold hover:bg-[#b58f38]"
            >
              <Plus className="w-4 h-4" />
              <span>Create new auction</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAuctions.map((auc) => {
              const totalItems = auc.items?.length || 0;
              const soldItems = auc.items?.filter((i) => i.status === "SOLD").length || 0;
              const totalSpent = auc.participants?.reduce((sum, p) => sum + (p.totalSpent || 0), 0) || 0;

              return (
                <div
                  key={auc.id}
                  className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:border-[#8B939A] transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-[17px] font-bold text-[#EDEAE1]">{auc.name}</h2>
                      <LiveStatusBadge status={auc.status} isConfigLocked={auc.isConfigLocked} />
                      <span className="text-[11px] px-2 py-0.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#8B939A]">
                        Room: <strong className="text-[#EDEAE1]">{auc.roomCode}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[13px]">
                      <div>
                        <span className="text-[11px] text-[#8B939A] block">Lots sold</span>
                        <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">
                          {soldItems} / {totalItems}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-[#8B939A] block">Total purse spent</span>
                        <span className="font-hero text-[16px] font-bold text-[#C7A046] tabular-nums">
                          {totalSpent > 0 ? formatINR(totalSpent) : "₹0"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-[#8B939A] block">Teams</span>
                        <span className="font-hero text-[16px] font-bold text-[#EDEAE1] tabular-nums">
                          {auc.participants?.length || 2} registered
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-[#8B939A] block">Clock / rules</span>
                        <span className="text-[13px] text-[#EDEAE1]">
                          {auc.timerDuration}s · +{formatINR(auc.minimumBidIncrement)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Deck */}
                  <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 lg:border-l border-[#2B343C] pt-3 lg:pt-0 lg:pl-5">
                    <Link
                      href={`/auction/${auc.id}`}
                      className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-bold text-[13px] hover:bg-white transition-colors"
                    >
                      Open arena
                    </Link>

                    <Link
                      href={`/auction/${auc.id}/bigscreen`}
                      className="px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                      title="Big Screen / TV Presentation Broadcast Mode"
                    >
                      <Tv className="w-3.5 h-3.5 text-[#C7A046]" />
                      <span>Big screen</span>
                    </Link>

                    <Link
                      href={`/auction/${auc.id}/war-room`}
                      className="px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-[#3E7CB1]" />
                      <span>War room</span>
                    </Link>

                    <Link
                      href={`/auction/${auc.id}/replay`}
                      className="px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5 text-[#B85C38]" />
                      <span>Replay</span>
                    </Link>

                    <Link
                      href={`/auction/${auc.id}/results`}
                      className="px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#C7A046]" />
                      <span>Ledger</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#2B343C] bg-[#10151A] px-4 sm:px-8 flex items-center justify-between text-[12px] text-[#8B939A]">
        <span>My Auctions Dashboard</span>
        <Link href="/" className="hover:text-[#EDEAE1]">← Back to home</Link>
      </footer>
    </div>
  );
}
