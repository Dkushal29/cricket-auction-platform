"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ResultsSkeleton } from "@/components/LoadingSkeleton";
import ExcelJS from "exceljs";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AuctionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "sold" | "unsold">("all");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}/results`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load results");
        return res.json();
      })
      .then((resData) => {
        if (resData.error) throw new Error(resData.error);
        setData(resData);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Results unavailable");
      })
      .finally(() => setLoading(false));
  }, [auctionId]);

  const handleDownloadExport = async (format: "xlsx" | "csv" | "json" | "pdf") => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setExportError(null);

    try {
      // 1. Try server endpoint first
      const res = await fetch(`/api/auctions/${auctionId}/export?format=${format}`);
      if (res.ok) {
        if (format === "pdf") {
          const htmlText = await res.text();
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(htmlText);
            printWindow.document.close();
          }
          return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data?.name || "Auction"}_Report.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      // 2. Client-side fallback if non-auctioneer gets 401/403
      if (format === "csv") {
        triggerClientCsvDownload(data);
      } else if (format === "json") {
        triggerClientJsonDownload(data);
      } else if (format === "pdf") {
        triggerClientPrintableHtml(data);
      } else if (format === "xlsx") {
        await triggerClientXlsxDownload(data);
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setExportError(`Failed to generate ${format.toUpperCase()} export: ${err.message}`);
    } finally {
      setExportingFormat(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10151A] text-[#EDEAE1]">
        <RoleSwitcherBar />
        <main className="max-w-7xl w-full mx-auto p-4 sm:p-6">
          <ResultsSkeleton />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#10151A] flex flex-col items-center justify-center p-6 text-center text-[#EDEAE1]">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-[20px] font-bold mb-1">Results not available</h2>
        <p className="text-[14px] text-[#8B939A] mb-4">{error || "Auction data could not be retrieved"}</p>
        <button
          type="button"
          onClick={() => router.push(`/auction/${auctionId}`)}
          className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-bold text-[14px]"
        >
          Return to auction arena
        </button>
      </div>
    );
  }

  const teamSummaries = data.teamSummaries || [];
  const teamA = teamSummaries[0] || null;
  const teamB = teamSummaries[1] || null;
  const soldItems = data.soldItems || [];
  const unsoldItems = data.unsoldItems || [];
  const categoryStats = data.categoryStats || [];
  const reAuctionStats = data.reAuctionStats || {
    round1UnsoldCount: unsoldItems.length,
    round2ReAuctionedCount: 0,
    round2SoldCount: 0,
    finalUnsoldCount: 0,
  };

  // Filtered table items
  const tableItems =
    activeTab === "sold"
      ? soldItems
      : activeTab === "unsold"
      ? unsoldItems
      : data.allItems || [...soldItems, ...unsoldItems];

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between select-none">
      <RoleSwitcherBar />

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-8">
        {/* Navigation & Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#202B38]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/auction/${auctionId}`)}
              className="p-2 rounded-[2px] bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] transition-colors"
              aria-label="Back to auction"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] sm:text-[28px] font-bold text-[#F5F7FA]">
                  {data.name} — Certified Results
                </h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-[13px] text-[#8B98A8]">
                Room: <span className="text-[#F5F7FA] font-semibold">{data.roomCode}</span> · Sport: {data.sport || "Cricket"} ({data.season || "2026"})
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadExport("xlsx")}
              disabled={exportingFormat !== null}
              className="px-3.5 py-2 rounded-[2px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] flex items-center gap-2 hover:bg-[#b58f38] transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingFormat === "xlsx" ? "Generating..." : "XLSX Report"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadExport("pdf")}
              disabled={exportingFormat !== null}
              className="px-3.5 py-2 rounded-[2px] bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] font-semibold text-[13px] flex items-center gap-2 hover:border-[#8B98A8] transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-[#E5AE3F]" />
              <span>{exportingFormat === "pdf" ? "Preparing..." : "Print / PDF"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadExport("csv")}
              disabled={exportingFormat !== null}
              className="px-3 py-2 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] font-medium text-[13px] flex items-center gap-2 hover:border-[#8B98A8] transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#8B98A8]" />
              <span>{exportingFormat === "csv" ? "Exporting..." : "CSV"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadExport("json")}
              disabled={exportingFormat !== null}
              className="px-3 py-2 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA] font-medium text-[13px] flex items-center gap-2 hover:border-[#8B98A8] transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{exportingFormat === "json" ? "Loading..." : "JSON"}</span>
            </button>
          </div>
        </div>

        {/* Export Error Notice */}
        {exportError && (
          <div className="p-3 rounded-[2px] bg-red-950/60 border border-red-800 text-red-300 text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* PART 1 — AUCTION COMPLETION HERO */}
        <section className="p-6 sm:p-8 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-6 relative overflow-hidden border-t-4 border-t-[#E5AE3F]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[12px] text-[#E5AE3F] uppercase font-bold tracking-wider block mb-1">
                FINANCIAL LEDGER CERTIFIED
              </span>
              <h2 className="text-[32px] sm:text-[44px] font-bold text-[#F5F7FA] leading-none">
                AUCTION COMPLETE
              </h2>
            </div>

            {data.summary?.mostExpensivePlayer && (
              <div className="p-3 rounded-[2px] bg-[#070B12] border border-[#202B38] text-right">
                <span className="text-[11px] text-[#8B98A8] block uppercase tracking-wider">Top Acquisition</span>
                <span className="font-bold text-[15px] text-[#F5F7FA]">
                  {data.summary.mostExpensivePlayer.name}
                </span>
                <div className="font-hero text-[18px] font-bold text-[#E5AE3F] tabular-nums">
                  {formatExactINR(data.summary.mostExpensivePlayer.price)}
                </div>
              </div>
            )}
          </div>

          {/* Hero KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38]">
              <span className="text-[12px] text-[#8B98A8] block mb-1">Total Revenue Spent</span>
              <div className="font-hero text-[28px] sm:text-[34px] font-bold text-[#E5AE3F] tabular-nums leading-none">
                {formatINR(data.summary?.totalRevenue || 0)}
              </div>
            </div>

            <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38]">
              <span className="text-[12px] text-[#8B98A8] block mb-1">Players Sold</span>
              <div className="font-hero text-[28px] sm:text-[34px] font-bold text-[#F5F7FA] tabular-nums leading-none">
                {data.summary?.soldCount || 0} / {data.summary?.totalItems || 0}
              </div>
            </div>

            <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38]">
              <span className="text-[12px] text-[#8B98A8] block mb-1">Final Unsold</span>
              <div className="font-hero text-[28px] sm:text-[34px] font-bold text-[#8B98A8] tabular-nums leading-none">
                {data.summary?.finalUnsoldCount || data.summary?.unsoldCount || 0}
              </div>
            </div>

            <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38]">
              <span className="text-[12px] text-[#8B98A8] block mb-1">Average Purchase</span>
              <div className="font-hero text-[28px] sm:text-[34px] font-bold text-[#F5F7FA] tabular-nums leading-none">
                {formatINR(data.summary?.averagePurchase || 0)}
              </div>
            </div>
          </div>
        </section>

        {/* PART 5 — TEAM COMPARISON */}
        {teamA && teamB && (
          <section className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#F5F7FA] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#E5AE3F]" />
                <span>TEAM COMPARISON</span>
              </h2>
              <span className="text-[12px] text-[#8B98A8]">Franchise Purse & Squad Metrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Alpha Card */}
              <div className="p-5 rounded-[4px] bg-[#070B12] border-l-4 border-l-[#3E7CB1] border border-[#202B38] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#202B38]">
                  <div>
                    <h3 className="font-bold text-[18px] text-[#F5F7FA]">{teamA.teamName}</h3>
                    <span className="text-[12px] text-[#8B98A8]">{teamA.bidderName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#8B98A8] block">Budget Utilization</span>
                    <span className="font-hero text-[20px] font-bold text-[#3E7CB1] tabular-nums">
                      {teamA.budgetUtilization}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-[#8B98A8] block">Total Spent:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {formatINR(teamA.totalSpent)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Remaining Purse:</span>
                    <strong className="font-hero text-[16px] text-[#E5AE3F] tabular-nums">
                      {formatINR(teamA.remainingBudget)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Players Acquired:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {teamA.playersAcquired}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Highest Purchase:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {formatINR(teamA.highestPurchase)}
                    </strong>
                  </div>
                </div>

                {/* Utilization Progress Line */}
                <div className="w-full h-2 bg-[#0D131C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3E7CB1] transition-all duration-500"
                    style={{ width: `${Math.min(100, teamA.budgetUtilization)}%` }}
                  />
                </div>
              </div>

              {/* Team Beta Card */}
              <div className="p-5 rounded-[4px] bg-[#070B12] border-l-4 border-l-[#B85C38] border border-[#202B38] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#202B38]">
                  <div>
                    <h3 className="font-bold text-[18px] text-[#F5F7FA]">{teamB.teamName}</h3>
                    <span className="text-[12px] text-[#8B98A8]">{teamB.bidderName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#8B98A8] block">Budget Utilization</span>
                    <span className="font-hero text-[20px] font-bold text-[#B85C38] tabular-nums">
                      {teamB.budgetUtilization}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-[#8B98A8] block">Total Spent:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {formatINR(teamB.totalSpent)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Remaining Purse:</span>
                    <strong className="font-hero text-[16px] text-[#E5AE3F] tabular-nums">
                      {formatINR(teamB.remainingBudget)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Players Acquired:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {teamB.playersAcquired}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8B98A8] block">Highest Purchase:</span>
                    <strong className="font-hero text-[16px] text-[#F5F7FA] tabular-nums">
                      {formatINR(teamB.highestPurchase)}
                    </strong>
                  </div>
                </div>

                {/* Utilization Progress Line */}
                <div className="w-full h-2 bg-[#0D131C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B85C38] transition-all duration-500"
                    style={{ width: `${Math.min(100, teamB.budgetUtilization)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PART 3 & 4 — TEAM ANALYTICS & SQUAD ROSTER LISTS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-[#F5F7FA] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#E5AE3F]" />
              <span>TEAM ROSTERS & SQUAD ALLOCATIONS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamSummaries.map((team: any, idx: number) => {
              const teamBorder = idx === 0 ? "#3E7CB1" : "#B85C38";
              const isExpanded = expandedTeam === team.teamId;

              return (
                <div
                  key={team.teamId}
                  className="p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4"
                  style={{ borderTop: `3px solid ${teamBorder}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[18px] text-[#F5F7FA]">{team.teamName}</h3>
                      <span className="text-[12px] text-[#8B98A8]">Bidder: {team.bidderName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedTeam(isExpanded ? null : team.teamId)}
                      className="p-1.5 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA] text-[12px] flex items-center gap-1"
                    >
                      <span>{team.players.length} Players</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[12px]">
                    <div>
                      <span className="text-[#8B98A8] block">Initial Purse</span>
                      <span className="font-hero text-[14px] font-bold text-[#F5F7FA] tabular-nums">
                        {formatINR(team.initialBudget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8B98A8] block">Total Spent</span>
                      <span className="font-hero text-[14px] font-bold text-[#F5F7FA] tabular-nums">
                        {formatINR(team.totalSpent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8B98A8] block">Remaining</span>
                      <span className="font-hero text-[14px] font-bold text-[#E5AE3F] tabular-nums">
                        {formatINR(team.remainingBudget)}
                      </span>
                    </div>
                  </div>

                  {/* Player Squad List */}
                  <div className="space-y-1.5">
                    {team.players.length === 0 ? (
                      <p className="text-[12px] text-[#8B98A8] italic p-2">No acquisitions made</p>
                    ) : (
                      team.players.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[13px]"
                        >
                          <div>
                            <span className="font-semibold text-[#F5F7FA]">{p.name}</span>
                            <span className="text-[11px] text-[#8B98A8] ml-2 font-mono">({p.category})</span>
                            <span className="text-[10px] text-[#E5AE3F] ml-2 px-1 rounded bg-[#0D131C] border border-[#202B38]">
                              Round {p.round}
                            </span>
                          </div>
                          <span className="font-hero text-[15px] font-bold text-[#E5AE3F] tabular-nums">
                            {formatExactINR(p.price)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PART 7 — CATEGORY ANALYTICS */}
        {categoryStats.length > 0 && (
          <section className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4">
            <h2 className="text-[18px] font-bold text-[#F5F7FA] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#E5AE3F]" />
              <span>CATEGORY ANALYTICS</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryStats.map((cat: any) => (
                <div key={cat.category} className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#202B38] pb-2">
                    <span className="font-bold text-[14px] text-[#F5F7FA] uppercase tracking-wider">
                      {cat.category}
                    </span>
                    <span className="text-[12px] font-mono text-[#8B98A8]">{cat.total} Players</span>
                  </div>

                  <div className="space-y-1 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-[#8B98A8]">Sold:</span>
                      <span className="font-bold text-emerald-400">{cat.sold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B98A8]">Unsold:</span>
                      <span className="text-[#8B98A8]">{cat.unsold + cat.finalUnsold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B98A8]">Avg Price:</span>
                      <span className="font-hero text-[13px] font-bold text-[#F5F7FA] tabular-nums">
                        {formatINR(cat.averagePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B98A8]">Highest:</span>
                      <span className="font-hero text-[13px] font-bold text-[#E5AE3F] tabular-nums">
                        {formatINR(cat.highestPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PART 10 — RE-AUCTION & TIMELINE SUMMARY */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-3">
            <h2 className="text-[16px] font-bold text-[#F5F7FA] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E5AE3F]" />
              <span>RE-AUCTION SUMMARY</span>
            </h2>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between p-2.5 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[#8B98A8]">Round 1 Unsold Pool</span>
                <span className="font-bold text-[#F5F7FA] font-mono">{reAuctionStats.round1UnsoldCount}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[#8B98A8]">Re-Auctioned in Round 2</span>
                <span className="font-bold text-[#E5AE3F] font-mono">{reAuctionStats.round2ReAuctionedCount}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[#8B98A8]">Sold in Round 2</span>
                <span className="font-bold text-emerald-400 font-mono">{reAuctionStats.round2SoldCount}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[#8B98A8]">Final Unsold Lots</span>
                <span className="font-bold text-red-400 font-mono">{reAuctionStats.finalUnsoldCount}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-3">
            <h2 className="text-[16px] font-bold text-[#F5F7FA] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E5AE3F]" />
              <span>AUCTION TIMELINE SEQUENCE</span>
            </h2>

            <div className="space-y-2 text-[12px] text-[#8B98A8]">
              <div className="flex items-center gap-2 p-2 rounded bg-[#070B12] border border-[#202B38]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span>Auction Initialized & Live Stage Started</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-[#070B12] border border-[#202B38]">
                <span className="w-2 h-2 rounded-full bg-[#E5AE3F] flex-shrink-0" />
                <span>Round 1 Main Lot Execution ({soldItems.length} Sold)</span>
              </div>
              {reAuctionStats.round2ReAuctionedCount > 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-[#070B12] border border-[#202B38]">
                  <span className="w-2 h-2 rounded-full bg-[#3E7CB1] flex-shrink-0" />
                  <span>Round 2 Re-Auction Stage Executed</span>
                </div>
              )}
              <div className="flex items-center gap-2 p-2 rounded bg-[#070B12] border border-[#202B38]">
                <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                <span>Auction State COMPLETED & Ledger Certified</span>
              </div>
            </div>
          </div>
        </section>

        {/* PART 11 — COMPLETE LOT EXECUTION TABLE & LEDGER */}
        <section className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold text-[#F5F7FA]">
              LOT EXECUTION LEDGER
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[12px]">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors ${
                  activeTab === "all" ? "bg-[#0D131C] text-[#F5F7FA]" : "text-[#8B98A8] hover:text-[#F5F7FA]"
                }`}
              >
                All ({data.allItems?.length || soldItems.length + unsoldItems.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sold")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors ${
                  activeTab === "sold" ? "bg-[#0D131C] text-[#F5F7FA]" : "text-[#8B98A8] hover:text-[#F5F7FA]"
                }`}
              >
                Sold ({soldItems.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unsold")}
                className={`px-3 py-1 rounded-[2px] font-medium transition-colors ${
                  activeTab === "unsold" ? "bg-[#0D131C] text-[#F5F7FA]" : "text-[#8B98A8] hover:text-[#F5F7FA]"
                }`}
              >
                Unsold ({unsoldItems.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#202B38] text-[#8B98A8] text-[12px]">
                  <th className="pb-2 font-medium">Lot #</th>
                  <th className="pb-2 font-medium">Player</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Base Price</th>
                  <th className="pb-2 font-medium">Final Price</th>
                  <th className="pb-2 font-medium">Premium</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Winning Team</th>
                  <th className="pb-2 font-medium">Round</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B38]">
                {tableItems.map((item: any) => {
                  const isSold = item.status === "SOLD";
                  const participant = teamSummaries.find((p: any) => p.userId === item.winnerId);
                  const winningPrice = item.winningPrice || 0;
                  const basePrice = item.basePrice || 0;
                  const premium = isSold && winningPrice > basePrice ? winningPrice - basePrice : 0;
                  const premiumPct = isSold && basePrice > 0 && premium > 0 ? Math.round((premium / basePrice) * 100) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-[#070B12]/50 transition-colors">
                      <td className="py-3 font-hero text-[14px] text-[#8B98A8] tabular-nums">#{item.orderIndex}</td>
                      <td className="py-3 font-semibold text-[#F5F7FA]">{item.name}</td>
                      <td className="py-3 text-[#8B98A8]">{item.category}</td>
                      <td className="py-3 font-hero text-[14px] text-[#8B98A8] tabular-nums">{formatINR(basePrice)}</td>
                      <td className="py-3 font-hero text-[15px] font-bold text-[#E5AE3F] tabular-nums">
                        {isSold ? formatExactINR(winningPrice) : "—"}
                      </td>
                      <td className="py-3 font-mono text-[12px]">
                        {isSold && premium > 0 ? (
                          <span className="text-emerald-400 font-semibold">
                            +{formatINR(premium)} (+{premiumPct}%)
                          </span>
                        ) : (
                          <span className="text-[#8B98A8]">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isSold ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sold</span>
                          </span>
                        ) : item.status === "FINAL_UNSOLD" ? (
                          <span className="text-red-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Final Unsold</span>
                          </span>
                        ) : (
                          <span className="text-[#8B98A8] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Unsold</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[#F5F7FA]">
                        {participant?.teamName || (isSold ? item.winner?.name : "—")}
                      </td>
                      <td className="py-3 font-mono text-[12px] text-[#8B98A8]">
                        Round {item.round ?? 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="py-4 border-t border-[#202B38] text-center text-[12px] text-[#8B98A8]">
        Official certified audit ledger — Bangalore Premier League 2026
      </footer>
    </div>
  );
}

// Client-side export helper functions for non-auctioneer visitors
function triggerClientCsvDownload(data: any) {
  const lines: string[] = [];
  lines.push("Auction Name,Room Code,Status,Total Revenue,Sold Lots,Unsold Lots");
  lines.push(
    `"${data.name}","${data.roomCode}","${data.status}",${data.summary?.totalRevenue || 0},${data.summary?.soldCount || 0},${data.summary?.unsoldCount || 0}`
  );
  lines.push("");
  lines.push("Player Name,Category,Base Price,Sold Price,Winning Team,Status,Round");

  const items = data.allItems || [...(data.soldItems || []), ...(data.unsoldItems || [])];
  for (const i of items) {
    const participant = data.teamSummaries?.find((t: any) => t.userId === i.winnerId);
    lines.push(
      `"${i.name}","${i.category}",${i.basePrice},${i.winningPrice || 0},"${participant?.teamName || "N/A"}","${i.status}",Round ${i.round || 1}`
    );
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "Auction"}_Report.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerClientJsonDownload(data: any) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "Auction"}_Results.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function triggerClientXlsxDownload(data: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cricket Auction Platform";

  const wsSummary = workbook.addWorksheet("Auction Summary");
  wsSummary.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 36 },
  ];
  wsSummary.addRows([
    { metric: "Auction Name", value: data.name },
    { metric: "Room Code", value: data.roomCode },
    { metric: "Status", value: data.status },
    { metric: "Total Revenue (INR)", value: data.summary?.totalRevenue || 0 },
    { metric: "Lots Sold", value: data.summary?.soldCount || 0 },
    { metric: "Unsold Lots", value: data.summary?.unsoldCount || 0 },
  ]);

  const wsSales = workbook.addWorksheet("Sales");
  wsSales.columns = [
    { header: "Player Name", key: "name", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Base Price", key: "basePrice", width: 18 },
    { header: "Sold Price", key: "winningPrice", width: 18 },
    { header: "Winning Team", key: "teamName", width: 22 },
    { header: "Round", key: "round", width: 14 },
  ];

  for (const item of data.soldItems || []) {
    const participant = data.teamSummaries?.find((t: any) => t.userId === item.winnerId);
    wsSales.addRow({
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      winningPrice: item.winningPrice || 0,
      teamName: participant?.teamName || "N/A",
      round: `Round ${item.round || 1}`,
    });
  }

  const wsTeams = workbook.addWorksheet("Team Summary");
  wsTeams.columns = [
    { header: "Team Name", key: "teamName", width: 24 },
    { header: "Bidder Name", key: "bidderName", width: 22 },
    { header: "Initial Budget", key: "initialBudget", width: 18 },
    { header: "Total Spent", key: "totalSpent", width: 18 },
    { header: "Remaining Budget", key: "remainingBudget", width: 18 },
    { header: "Players Acquired", key: "playersAcquired", width: 16 },
  ];

  for (const t of data.teamSummaries || []) {
    wsTeams.addRow({
      teamName: t.teamName,
      bidderName: t.bidderName,
      initialBudget: t.initialBudget,
      totalSpent: t.totalSpent,
      remainingBudget: t.remainingBudget,
      playersAcquired: t.playersAcquired,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "Auction"}_Report.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerClientPrintableHtml(data: any) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.name} — Certified Results</title>
      <style>
        body { font-family: sans-serif; margin: 40px; color: #070B12; }
        h1 { border-bottom: 2px solid #E5AE3F; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
      </style>
    </head>
    <body>
      <button onclick="window.print()" style="padding:8px 16px;background:#E5AE3F;color:#070B12;font-weight:bold;border:none;cursor:pointer;margin-bottom:16px;">Print / Save as PDF</button>
      <h1>${data.name} — Official Results</h1>
      <p>Room: ${data.roomCode} | Status: ${data.status} | Total Spent: ₹${data.summary?.totalRevenue || 0}</p>
      <h2>Sales Ledger</h2>
      <table>
        <thead>
          <tr><th>Player</th><th>Category</th><th>Base Price</th><th>Sold Price</th><th>Winning Team</th></tr>
        </thead>
        <tbody>
          ${(data.soldItems || [])
            .map(
              (i: any) => `
            <tr>
              <td>${i.name}</td>
              <td>${i.category}</td>
              <td>₹${i.basePrice}</td>
              <td><strong>₹${i.winningPrice || 0}</strong></td>
              <td>${data.teamSummaries?.find((t: any) => t.userId === i.winnerId)?.teamName || "N/A"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(htmlDoc);
  printWindow.document.close();
}
