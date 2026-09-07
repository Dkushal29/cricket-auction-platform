"use client";

import React, { useState } from "react";
import { ClientAuction, ClientBid, ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useToast } from "./ToastNotifications";
import { useAuth } from "./AuthContext";
import { Play, Pause, Gavel, XCircle, RotateCcw, FastForward, Square, AlertTriangle, Plus } from "lucide-react";

interface AuctionControlPanelProps {
  auction: ClientAuction;
  bids?: ClientBid[];
  onRefresh: () => void;
}

export function AuctionControlPanel({
  auction,
  bids = [],
  onRefresh,
}: AuctionControlPanelProps) {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "end" | "cancel" | "undo";
    itemId?: string;
    itemName?: string;
    price?: number;
  } | null>(null);
  const [readinessData, setReadinessData] = useState<{
    allPassed: boolean;
    readyToStart: boolean;
    checks: Array<{ id: string; label: string; passed: boolean; details: string }>;
  } | null>(null);
  const [showReadinessModal, setShowReadinessModal] = useState(false);

  const fetchReadinessAndPrompt = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/auctions/${auction.id}/readiness`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run readiness check");
      setReadinessData(data);
      setShowReadinessModal(true);
    } catch (e: any) {
      addToast(e.message || "Failed to run pre-flight check", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmedStart = async () => {
    setShowReadinessModal(false);
    await executeApi(`/api/auctions/${auction.id}/start`);
  };

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const highestBid = bids[0] || activeItem?.bids?.[0];
  const isDraft = auction.status === "DRAFT";
  const isReady = auction.status === "READY";
  const isLive = auction.status === "LIVE";
  const isPaused = auction.status === "PAUSED";
  const isTerminal = auction.status === "COMPLETED" || auction.status === "CANCELLED";
  const unsoldRound1Items = auction.items.filter(
    (i) => i.status === "UNSOLD" && (i.round ?? 1) === 1
  );
  const finalUnsoldItems = auction.items.filter(
    (i) => i.status === "FINAL_UNSOLD"
  );
  const pendingItems = auction.items.filter((i) => i.status === "PENDING");
  const isOwnerAuctioneer = Boolean(
    user?.role === "AUCTIONEER" && user.id === auction.auctioneerId
  );

  const downloadReport = async (format: "csv" | "xlsx" | "pdf" | "json") => {
    try {
      setLoading(true);
      if (format === "pdf") {
        window.open(`/api/auctions/${auction.id}/export?format=html`, "_blank");
        return;
      }
      const res = await fetch(`/api/auctions/${auction.id}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download auction report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${auction.name.replace(/[^a-zA-Z0-9]/g, "_")}_Report.${format === "xlsx" ? "xls" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast(`Auction report (${format.toUpperCase()}) downloaded successfully`, "brass");
    } catch (e: any) {
      addToast(e.message || "Failed to download report", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartReAuction = async () => {
    await executeApi(`/api/auctions/${auction.id}/re-auction`);
  };

  const mostRecentSoldItem = [...auction.items]
    .filter((i) => i.status === "SOLD" && i.soldAt)
    .sort((a, b) => new Date(b.soldAt!).getTime() - new Date(a.soldAt!).getTime())[0];

  const canUndo = Boolean(mostRecentSoldItem && !activeItem && !isTerminal);

  const executeApi = async (url: string, method: string = "POST", body?: any) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Operation failed", "error");
      } else {
        onRefresh();
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Hammer Actions Deck */}
      <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#2B343C]">
          <div>
            <h2 className="text-[16px] font-bold text-[#EDEAE1]">
              Auctioneer controls
            </h2>
            <p className="text-[13px] text-[#8B939A]">
              Manage lot transitions and hammer decisions
            </p>
          </div>

          {/* Master State Transition Actions */}
          <div className="flex items-center gap-2">
            {(isDraft || isReady) && (
              <button
                type="button"
                onClick={fetchReadinessAndPrompt}
                disabled={loading}
                className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] hover:bg-white flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isReady ? "Start auction (Ready)" : "Start auction (Pre-flight check)"}</span>
              </button>
            )}

            {isLive && (
              <button
                type="button"
                onClick={() => executeApi(`/api/auctions/${auction.id}/pause`)}
                disabled={loading}
                className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] font-semibold text-[13px] hover:border-[#8B939A] flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                type="button"
                onClick={() => executeApi(`/api/auctions/${auction.id}/resume`)}
                disabled={loading}
                className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] hover:bg-white flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setConfirmModal({ type: "end" })}
                disabled={loading}
                className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#8B939A] hover:text-[#EDEAE1] font-medium text-[13px] flex items-center gap-1"
              >
                <Square className="w-3 h-3" />
                <span>End</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Active Lot Hammer Decisions */}
        {activeItem ? (
          <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-[#8B939A] block">Current spotlight</span>
                <span className="text-[15px] font-bold text-[#EDEAE1]">
                  #{activeItem.orderIndex} {activeItem.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[12px] text-[#8B939A] block">Highest bid</span>
                <span className="font-hero text-[18px] font-bold text-[#C7A046] tabular-nums">
                  {highestBid ? formatExactINR(highestBid.amount) : "No bids yet"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => executeApi(`/api/items/${activeItem.id}/finalize`)}
                disabled={loading || !isLive || !highestBid}
                className={`py-2.5 px-4 rounded-[2px] font-semibold text-[14px] flex items-center justify-center gap-2 ${
                  isLive && highestBid
                    ? "bg-[#C7A046] text-[#10151A] hover:brightness-110"
                    : "bg-[#2B343C] text-[#8B939A] opacity-60 cursor-not-allowed"
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>
                  {highestBid ? `Finalize sale (${formatINR(highestBid.amount)})` : "Awaiting bid to finalize"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeApi(`/api/items/${activeItem.id}/unsold`)}
                disabled={loading || !isLive}
                className="py-2.5 px-4 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] font-semibold text-[14px] flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4 text-[#8B939A]" />
                <span>Mark unsold & pass</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] flex items-center justify-between text-[13px] text-[#8B939A]">
            <span>No lot currently under hammer. Choose a player from pool below.</span>
            {canUndo && mostRecentSoldItem && (
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({
                    type: "undo",
                    itemId: mostRecentSoldItem.id,
                    itemName: mostRecentSoldItem.name,
                    price: mostRecentSoldItem.winningPrice || 0,
                  })
                }
                disabled={loading}
                className="px-2.5 py-1 rounded-[2px] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo last sale ({mostRecentSoldItem.name})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Re-Auction Pool Banner */}
      {unsoldRound1Items.length > 0 && isLive && !activeItem && (
        <div className="bg-[#1B2229] border border-[#C7A046]/40 rounded-[4px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#1B2229] to-[#252C34]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[2px] bg-[#C7A046]/20 text-[#C7A046] text-[11px] font-bold uppercase tracking-wider">
                Re-Auction Ready
              </span>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Unsold Players ({unsoldRound1Items.length} waiting for re-auction)
              </h3>
            </div>
            <p className="text-[12px] text-[#8B939A] mt-1">
              Players unsold from Round 1 get one final opportunity in Round 2.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartReAuction}
            disabled={loading}
            className="px-4 py-2 rounded-[2px] bg-[#C7A046] text-[#10151A] font-bold text-[13px] hover:brightness-110 flex items-center gap-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Re-auction</span>
          </button>
        </div>
      )}

      {/* Lot Pool Management */}
      <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-[#EDEAE1]">
            Player auction pool ({auction.items.length} lots)
          </h3>
          <div className="flex items-center gap-2 text-[12px] text-[#8B939A]">
            <span>Pending: {pendingItems.length}</span>
            <span>•</span>
            <span>Unsold Pool: {unsoldRound1Items.length}</span>
            <span>•</span>
            <span>Final Unsold: {finalUnsoldItems.length}</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
          {auction.items.map((item) => {
            const isItemActive = item.id === auction.activeItemId;
            const isPending = item.status === "PENDING";
            const isSold = item.status === "SOLD";
            const isUnsoldR1 = item.status === "UNSOLD" && (item.round ?? 1) === 1;
            const isFinalUnsold = item.status === "FINAL_UNSOLD";

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-hero text-[14px] text-[#8B939A] tabular-nums">
                    #{item.orderIndex}
                  </span>
                  <div>
                    <span className="font-medium text-[#EDEAE1] mr-2">{item.name}</span>
                    <span className="text-[11px] text-[#8B939A]">({item.category})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#8B939A]">
                    Base: {formatINR(item.basePrice)}
                  </span>

                  {isSold && (
                    <span className="font-hero text-[14px] font-bold text-[#C7A046] tabular-nums">
                      Sold for {formatINR(item.winningPrice || 0)} {item.round === 2 ? "(R2)" : ""}
                    </span>
                  )}
                  {isUnsoldR1 && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-[#C7A046]/10 text-[#C7A046] border border-[#C7A046]/30 text-[11px] font-semibold">
                      Unsold (Round 1)
                    </span>
                  )}
                  {isFinalUnsold && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-red-950/40 text-red-400 border border-red-900/40 text-[11px] font-semibold">
                      Final Unsold
                    </span>
                  )}
                  {isItemActive && (
                    <span className="text-[12px] font-medium text-emerald-400">
                      Live on spotlight
                    </span>
                  )}

                  {isLive && isPending && !activeItem && (
                    <button
                      type="button"
                      onClick={() => executeApi(`/api/items/${item.id}/activate`)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-medium text-[12px] hover:bg-white flex items-center gap-1"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Bring to stage</span>
                    </button>
                  )}

                  {isLive && isUnsoldR1 && !activeItem && (
                    <button
                      type="button"
                      onClick={() => executeApi(`/api/items/${item.id}/activate`)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-[2px] bg-[#C7A046] text-[#10151A] font-semibold text-[12px] hover:brightness-110 flex items-center gap-1"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Re-auction</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Auction Report Deck */}
      {isOwnerAuctioneer && (
        <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#2B343C]">
            <div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Official Auction Report & Ledger
              </h3>
              <p className="text-[12px] text-[#8B939A]">
                Authoritative multi-section financial ledger, sales history, and team roster export
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadReport("csv")}
              disabled={loading}
              className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] hover:bg-white flex items-center gap-1.5"
            >
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={() => downloadReport("xlsx")}
              disabled={loading}
              className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] font-semibold text-[13px] hover:border-[#8B939A] flex items-center gap-1.5"
            >
              <span>Download Excel (.xls)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadReport("pdf")}
              disabled={loading}
              className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] font-semibold text-[13px] hover:border-[#8B939A] flex items-center gap-1.5"
            >
              <span>Print / PDF Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-[#10151A]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-5 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2.5 text-[#EDEAE1]">
              <AlertTriangle className="w-5 h-5 text-[#C7A046]" />
              <h3 className="text-[16px] font-bold">
                {confirmModal.type === "undo" ? "Confirm deal reversal" : "Confirm completion"}
              </h3>
            </div>

            <p className="text-[13px] text-[#8B939A]">
              {confirmModal.type === "undo"
                ? `Reversing the sale of ${confirmModal.itemName} will restore ₹${confirmModal.price?.toLocaleString("en-IN")} to the buyer's purse and revert the player lot to pending.`
                : "Completing the auction is a terminal action."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === "undo" && confirmModal.itemId) {
                    executeApi(`/api/items/${confirmModal.itemId}/undo-finalization`);
                  } else if (confirmModal.type === "end") {
                    executeApi(`/api/auctions/${auction.id}/end`);
                  }
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-[2px] bg-red-600 text-white font-medium text-[13px] hover:bg-red-500"
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Flight Auction Readiness Modal */}
      {showReadinessModal && readinessData && (
        <div className="fixed inset-0 z-50 bg-[#10151A]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B343C] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#EDEAE1]">
                  Pre-flight auction readiness
                </h3>
                <span className="text-[12px] text-[#8B939A]">
                  Authoritative sanity check before locking configuration and going live
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReadinessModal(false)}
                className="text-[#8B939A] hover:text-[#EDEAE1]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {readinessData.checks.map((check) => (
                <div
                  key={check.id}
                  className="p-2.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] flex items-start gap-2.5 text-[13px]"
                >
                  <span className={`text-[14px] ${check.passed ? "text-emerald-400" : "text-red-400"}`}>
                    {check.passed ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-[#EDEAE1]">{check.label}</div>
                    <div className="text-[12px] text-[#8B939A]">{check.details}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#2B343C] flex items-center justify-between">
              <span className="text-[12px] text-[#8B939A]">
                {readinessData.allPassed
                  ? "✓ All pre-flight checks passed."
                  : "⚠ Resolve failed checks before starting."}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReadinessModal(false)}
                  className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedStart}
                  disabled={!readinessData.readyToStart || loading}
                  className={`px-4 py-1.5 rounded-[2px] font-semibold text-[13px] ${
                    readinessData.readyToStart
                      ? "bg-[#C7A046] text-[#10151A] hover:bg-[#b58f38]"
                      : "bg-[#2B343C] text-[#8B939A] opacity-60 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Starting..." : "Confirm & launch auction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
