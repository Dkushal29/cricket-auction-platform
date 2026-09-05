"use client";

import React from "react";
import { ClientItem, ClientParticipant } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Shield, Sparkles, User, Wallet } from "lucide-react";

export function ParticipantList({
  participants,
  items,
  highlightUserId,
}: {
  participants: ClientParticipant[];
  items: ClientItem[];
  highlightUserId?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {participants.map((p) => {
        const isSelf = p.userId === highlightUserId;
        const wonItems = items.filter((i) => i.winnerId === p.userId && i.status === "SOLD");
        const spentPercent = Math.min(100, Math.max(0, (p.totalSpent / p.initialBudget) * 100));

        return (
          <div
            key={p.id}
            className={`glass-panel rounded-3xl p-5 border transition-all ${
              isSelf
                ? "border-amber-500/50 bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            {/* Team Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold overflow-hidden">
                  {p.teamLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.teamLogoUrl} alt={p.teamName} className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-white">{p.teamName}</h4>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    Bidder: {p.user?.name || "Participant"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                  Remaining Purse
                </span>
                <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                  {formatExactINR(p.remainingBudget)}
                </div>
                <span className="text-[10px] text-slate-500">
                  ({formatINR(p.remainingBudget)})
                </span>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Purse Spent: {formatINR(p.totalSpent)} ({spentPercent.toFixed(1)}%)</span>
                <span>Initial: {formatINR(p.initialBudget)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>

            {/* Squad Acquired List */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Acquired Squad ({wonItems.length})</span>
                <span>Value</span>
              </div>

              {wonItems.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No players acquired yet
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {wonItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold text-white">{item.name}</span>
                        <span className="text-[10px] text-slate-400">({item.category})</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400">
                        {formatINR(item.winningPrice || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
