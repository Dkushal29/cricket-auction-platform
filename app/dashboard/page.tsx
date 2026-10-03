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
  Loader2,
  Calendar,
  Users,
  Award,
  ExternalLink,
  Settings,
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

  const getVisualState = (status: string) => {
    if (status === "LIVE" || status === "PAUSED") return "LIVE";
    if (status === "DRAFT" || status === "READY") return "UPCOMING";
    return "COMPLETED";
  };

  const filteredAuctions = auctions.filter((auc) => {
    const vState = getVisualState(auc.status);
    if (activeTab === "ALL") return true;
    return vState === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
      <RoleSwitcherBar />

      {/* Header */}
      <header className="h-16 px-4 sm:px-8 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[#8B98A8] hover:text-[#F5F7FA] text-[13px] font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-[#202B38]">/</span>
          <span className="text-[#F5F7FA] text-[14px] font-bold">My Auctions</span>
        </div>

        <Link
          href="/create-auction"
          className="px-4 py-2 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] flex items-center gap-1.5 hover:bg-[#F4C65E] transition-all shadow-[0_0_12px_rgba(229,174,63,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Auction</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-hero text-[30px] sm:text-[36px] font-bold text-[#F5F7FA] uppercase tracking-wide">
              My Cricket Auctions
            </h1>
            <p className="text-[13px] text-[#8B98A8]">
              Manage live arenas, lot rosters, bidder consoles, and certified transaction results.
            </p>
          </div>

          {/* Visual State Filter Tabs */}
          <div className="flex bg-[#0D131C] border border-[#202B38] rounded-[4px] p-1 text-[12px]">
            {(["ALL", "LIVE", "UPCOMING", "COMPLETED"] as const).map((tab) => {
              const count = auctions.filter((a) => tab === "ALL" || getVisualState(a.status) === tab).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-[3px] font-semibold transition-all ${
                    activeTab === tab
                      ? "bg-[#121A24] text-[#F5F7FA] shadow-sm border border-[#202B38]"
                      : "text-[#8B98A8] hover:text-[#F5F7FA]"
                  }`}
                >
                  <span>{tab}</span>
                  <span className="ml-1.5 text-[10px] font-mono text-[#E5AE3F]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#8B98A8] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E5AE3F]" />
            <span className="text-[13px]">Loading auction database...</span>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="p-12 rounded-[4px] bg-[#0D131C] border border-dashed border-[#202B38] text-center space-y-4">
            <p className="text-[14px] text-[#8B98A8]">No auctions found in the {activeTab} view.</p>
            <Link
              href="/create-auction"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E5AE3F] text-[#070B12] rounded-[4px] text-[13px] font-bold hover:bg-[#F4C65E]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Auction</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAuctions.map((auc) => {
              const vState = getVisualState(auc.status);
              const totalItems = auc.items?.length || 0;
              const soldItems = auc.items?.filter((i) => i.status === "SOLD").length || 0;
              const teamCount = auc.participants?.length || 2;
              const createdDateStr = auc.createdAt
                ? new Date(auc.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Active";

              return (
                <div
                  key={auc.id}
                  className="p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] hover:border-[#8B98A8]/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-3 flex-1">
                    {/* Header line with Name & Status */}
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-hero text-[22px] font-bold text-[#F5F7FA] tracking-wide">
                        {auc.name}
                      </h2>
                      <LiveStatusBadge status={auc.status} isConfigLocked={auc.isConfigLocked} />
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[#8B98A8]">
                        ROOM: {auc.roomCode}
                      </span>
                    </div>

                    {/* Metadata Grid: Created Date | Number of Teams | Number of Players | Current State */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[13px]">
                      {/* Created Date */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] uppercase tracking-wider text-[#8B98A8] block">
                          Created Date
                        </span>
                        <span className="font-medium text-[#F5F7FA] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8B98A8]" />
                          <span>{createdDateStr}</span>
                        </span>
                      </div>

                      {/* Number of Teams */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] uppercase tracking-wider text-[#8B98A8] block">
                          Teams
                        </span>
                        <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#4DA3FF]" />
                          <span>{teamCount} Teams</span>
                        </span>
                      </div>

                      {/* Number of Players */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] uppercase tracking-wider text-[#8B98A8] block">
                          Players
                        </span>
                        <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#E5AE3F]" />
                          <span>{soldItems} / {totalItems} Lots</span>
                        </span>
                      </div>

                      {/* Current State */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] uppercase tracking-wider text-[#8B98A8] block">
                          Current State
                        </span>
                        <span className={`font-mono text-[12px] font-bold uppercase ${
                          vState === "LIVE" ? "text-[#28D17C]" : vState === "UPCOMING" ? "text-[#E5AE3F]" : "text-[#4DA3FF]"
                        }`}>
                          {vState} ({auc.status})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Deck: Open | Manage | Join | View Results */}
                  <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 lg:border-l border-[#202B38] pt-3 lg:pt-0 lg:pl-5">
                    {/* Open Arena */}
                    <Link
                      href={`/auction/${auc.id}`}
                      className="px-3.5 py-2 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all"
                    >
                      Open
                    </Link>

                    {/* Manage (Auctioneer Command Deck) */}
                    <Link
                      href={`/auction/${auc.id}/control`}
                      className="px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                      title="Auctioneer Controls"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#E5AE3F]" />
                      <span>Manage</span>
                    </Link>

                    {/* Join (Bidder Console) */}
                    <Link
                      href={`/auction/${auc.id}/bidder`}
                      className="px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] text-[13px] font-medium transition-colors"
                      title="Enter as Bidder"
                    >
                      <span>Join</span>
                    </Link>

                    {/* View Results / Ledger */}
                    <Link
                      href={`/auction/${auc.id}/results`}
                      className="px-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA] text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#4DA3FF]" />
                      <span>View Results</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#202B38] bg-[#070B12] px-4 sm:px-8 flex items-center justify-between text-[12px] text-[#8B98A8]">
        <span>BIDXI Auction Terminal</span>
        <Link href="/" className="hover:text-[#F5F7FA] transition-colors">← Back to home</Link>
      </footer>
    </div>
  );
}
