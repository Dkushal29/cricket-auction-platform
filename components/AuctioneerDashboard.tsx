"use client";

import React, { useState } from "react";
import { ClientAuction, ClientBid, ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useToast } from "./ToastNotifications";
import {
  AlertTriangle,
  CheckCircle2,
  FastForward,
  Gavel,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trophy,
  XCircle,
  PlusCircle,
  Clock,
  Shield,
  Layers,
} from "lucide-react";

export function AuctioneerDashboard({
  auction,
  bids = [],
  onRefresh,
}: {
  auction: ClientAuction;
  bids?: ClientBid[];
  onRefresh: () => void;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "end" | "cancel" | "undo" | "finalize";
    itemId?: string;
    itemName?: string;
    price?: number;
  } | null>(null);

  // Draft addition forms state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Batsman");
  const [newItemBasePrice, setNewItemBasePrice] = useState("10000000");

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const highestBid = bids[0] || activeItem?.bids?.[0];
  const isDraft = auction.status === "DRAFT";
  const isLive = auction.status === "LIVE";
  const isPaused = auction.status === "PAUSED";
  const isTerminal = auction.status === "COMPLETED" || auction.status === "CANCELLED";

  // Identify most recent SOLD item for undo capability
  const mostRecentSoldItem = [...auction.items]
    .filter((i) => i.status === "SOLD" && i.soldAt)
    .sort((a, b) => new Date(b.soldAt!).getTime() - new Date(a.soldAt!).getTime())[0];

  const canUndo = Boolean(
    mostRecentSoldItem &&
    !activeItem && // cutoff: cannot undo if another item has started
    !isTerminal
  );

  const executeApi = async (url: string, method: string = "POST", body?: any) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Operation failed", "error");
      } else {
        addToast("Action completed successfully", "success");
        onRefresh();
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleStartAuction = () => executeApi(`/api/auctions/${auction.id}/start`);
  const handlePauseAuction = () => executeApi(`/api/auctions/${auction.id}/pause`);
  const handleResumeAuction = () => executeApi(`/api/auctions/${auction.id}/resume`);
  const handleEndAuction = () => executeApi(`/api/auctions/${auction.id}/end`);
  const handleCancelAuction = () => executeApi(`/api/auctions/${auction.id}/cancel`);

  const handleActivateItem = (itemId: string) =>
    executeApi(`/api/items/${itemId}/activate`);

  const handleFinalizeDeal = (itemId: string) =>
    executeApi(`/api/items/${itemId}/finalize`);

  const handleMarkUnsold = (itemId: string) =>
    executeApi(`/api/items/${itemId}/unsold`);

  const handleUndoFinalization = (itemId: string) =>
    executeApi(`/api/items/${itemId}/undo-finalization`);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const basePrice = parseInt(newItemBasePrice, 10);
    if (!newItemName || isNaN(basePrice) || basePrice <= 0) {
      addToast("Please fill in valid item name and base price", "error");
      return;
    }

    await executeApi(`/api/auctions/${auction.id}/items`, "POST", {
      name: newItemName,
      category: newItemCategory,
      basePrice,
    });

    setNewItemName("");
    setShowAddItem(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Deck Header */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Gavel className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black text-white tracking-tight">
                Auctioneer Command Console
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live hammer controller, authoritative state transitions, and pool management.
            </p>
          </div>

          {/* Master State Transition Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && (
              <button
                onClick={handleStartAuction}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Auction</span>
              </button>
            )}

            {isLive && (
              <button
                onClick={handlePauseAuction}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Auction</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResumeAuction}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Live</span>
              </button>
            )}

            {!isTerminal && (
              <>
                <button
                  onClick={() => setConfirmAction({ type: "end" })}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:bg-purple-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Complete</span>
                </button>

                <button
                  onClick={() => setConfirmAction({ type: "cancel" })}
                  disabled={loading}
                  className="px-3 py-2.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Current Active Item Live Actions */}
        {activeItem ? (
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 inline-block mb-1">
                  Active Lot Under Hammer
                </span>
                <h3 className="text-lg font-black text-white">
                  #{activeItem.orderIndex} — {activeItem.name} ({activeItem.category})
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Top Bid
                </span>
                <div className="text-xl font-black font-mono text-amber-400">
                  {highestBid ? formatExactINR(highestBid.amount) : "No Bids"}
                </div>
              </div>
            </div>

            {/* Hammer / Finalize Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() =>
                  highestBid
                    ? handleFinalizeDeal(activeItem.id)
                    : addToast("Cannot sell: No bids recorded. Mark UNSOLD instead.", "error")
                }
                disabled={loading || !isLive || !highestBid}
                className={`py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                  isLive && highestBid
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Gavel className="w-5 h-5" />
                <span>
                  {highestBid
                    ? `SOLD! Finalize Deal (${formatINR(highestBid.amount)})`
                    : "Waiting for Bids to Finalize"}
                </span>
              </button>

              <button
                onClick={() => handleMarkUnsold(activeItem.id)}
                disabled={loading || !isLive}
                className="py-3.5 px-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/80 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <XCircle className="w-5 h-5" />
                <span>Mark UNSOLD & Pass</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3 text-slate-400 text-xs sm:text-sm">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <span>No item currently under hammer. Choose the next lot from queue below.</span>
            </div>

            {canUndo && mostRecentSoldItem && (
              <button
                onClick={() =>
                  setConfirmAction({
                    type: "undo",
                    itemId: mostRecentSoldItem.id,
                    itemName: mostRecentSoldItem.name,
                    price: mostRecentSoldItem.winningPrice || 0,
                  })
                }
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Last Sale ({mostRecentSoldItem.name})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lot Queue & Pool Management */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">
              Player Auction Pool ({auction.items.length} Lots)
            </h3>
          </div>

          {isDraft && (
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showAddItem ? "Cancel Add" : "Add Player"}</span>
            </button>
          )}
        </div>

        {/* Add Item Form (Draft Only) */}
        {showAddItem && (
          <form onSubmit={handleCreateItem} className="p-4 mb-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Register New Player into Pool
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Player Name (e.g. Glenn Maxwell)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
              </select>
              <input
                type="number"
                placeholder="Base Price (INR) e.g. 10000000"
                value={newItemBasePrice}
                onChange={(e) => setNewItemBasePrice(e.target.value)}
                required
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
            >
              Save to Auction Pool
            </button>
          </form>
        )}

        {/* Item List Table / Cards */}
        <div className="space-y-2">
          {auction.items.map((item) => {
            const isItemUnderHammer = item.id === auction.activeItemId;
            const isPending = item.status === "PENDING";
            const isSold = item.status === "SOLD";
            const isUnsold = item.status === "UNSOLD";

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 ${
                  isItemUnderHammer
                    ? "bg-amber-950/40 border-amber-500/60 shadow-lg"
                    : isSold
                    ? "bg-slate-950/80 border-slate-800/80 opacity-75"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
                    #{item.orderIndex}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Base: {formatExactINR(item.basePrice)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  {/* Status Tag */}
                  {isSold && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      SOLD for {formatINR(item.winningPrice || 0)}
                    </span>
                  )}
                  {isUnsold && (
                    <span className="text-xs font-bold text-red-400 bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-500/30">
                      UNSOLD
                    </span>
                  )}
                  {isItemUnderHammer && (
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/40 animate-pulse">
                      UNDER HAMMER
                    </span>
                  )}
                  {isPending && (
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-xl">
                      QUEUED
                    </span>
                  )}

                  {/* Activate / Bring to Hammer Button */}
                  {isLive && isPending && !activeItem && (
                    <button
                      onClick={() => handleActivateItem(item.id)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all active:scale-95"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Bring to Hammer</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-slate-700 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertTriangle className="w-7 h-7 shrink-0 text-amber-400" />
              <h3 className="text-lg font-bold text-white">
                {confirmAction.type === "undo"
                  ? "Confirm Deal Reversal"
                  : confirmAction.type === "end"
                  ? "Complete & Lock Auction"
                  : "Cancel Auction"}
              </h3>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {confirmAction.type === "undo"
                ? `Reversing the sale of ${confirmAction.itemName} will restore ₹${confirmAction.price?.toLocaleString("en-IN")} to the buyer's purse and revert the player lot to PENDING.`
                : confirmAction.type === "end"
                ? "Ending the auction is a terminal action. No further bids or mutations can be executed once completed."
                : "Cancelling will immediately terminate the entire auction session."}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "undo" && confirmAction.itemId) {
                    handleUndoFinalization(confirmAction.itemId);
                  } else if (confirmAction.type === "end") {
                    handleEndAuction();
                  } else if (confirmAction.type === "cancel") {
                    handleCancelAuction();
                  }
                }}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                {loading ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
