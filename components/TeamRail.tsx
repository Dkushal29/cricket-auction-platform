"use client";

import React from "react";
import { ClientItem, ClientParticipant } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";

interface TeamRailProps {
  participant: ClientParticipant | null;
  items: ClientItem[];
  variant: "team-a" | "team-b";
  isSelf?: boolean;
  maxSquadSize?: number;
}

export function TeamRail({
  participant,
  items,
  variant,
  isSelf,
  maxSquadSize,
}: TeamRailProps) {
  if (!participant) {
    return (
      <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-4 text-[13px] text-[#8B98A8] text-center">
        No team registered
      </div>
    );
  }

  const teamColor = variant === "team-a" ? "#3E7CB1" : "#B85C38";
  const wonItems = items.filter((i) => i.winnerId === participant.userId && i.status === "SOLD");
  const squadLimit = maxSquadSize ? Math.floor(maxSquadSize / 2) : undefined;
  const isFull = squadLimit !== undefined && wonItems.length >= squadLimit;

  const initialBudget = participant.initialBudget || 1;
  const remainingBudget = Math.max(0, participant.remainingBudget);
  const remainingRatio = Math.min(1, Math.max(0, remainingBudget / initialBudget));
  const remainingPercent = (remainingRatio * 100).toFixed(1);

  return (
    <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] flex flex-col justify-between h-full shadow-lg">
      {/* Team Header Rail Strip */}
      <div
        className="p-3.5 border-b border-[#202B38] flex items-center justify-between"
        style={{ borderTop: `3px solid ${teamColor}` }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#F5F7FA] leading-tight">
              {participant.teamName}
            </h3>
            {isSelf && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-[#202B38] text-[#F5F7FA] rounded-[2px]">
                You
              </span>
            )}
          </div>
          <span className="text-[12px] text-[#8B98A8]">
            {participant.user?.name}
          </span>
        </div>
        <span
          className="w-2.5 h-2.5 rounded-[2px]"
          style={{ backgroundColor: teamColor }}
        />
      </div>

      {/* Budget Depletion Gauge */}
      <div className="p-4 border-b border-[#202B38] bg-[#121A24]">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8]">
            Purse Available
          </span>
          <span className="font-hero text-[18px] font-bold text-[#E5AE3F] tabular-nums">
            {formatINR(remainingBudget)}
          </span>
        </div>

        {/* Horizontal Depletion Bar (Fills with Gold, empties toward border) */}
        <div className="relative w-full h-3 bg-[#070B12] border border-[#202B38] rounded-[2px] overflow-hidden">
          <div
            className="h-full bg-[#E5AE3F] transition-all duration-500 ease-out"
            style={{ width: `${remainingPercent}%` }}
          />

          {/* Tick Marks (25%, 50%, 75%) */}
          <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
            <span className="w-px h-full bg-[#202B38]" style={{ marginLeft: "25%" }} />
            <span className="w-px h-full bg-[#202B38]" style={{ marginLeft: "25%" }} />
            <span className="w-px h-full bg-[#202B38]" style={{ marginLeft: "25%" }} />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8B98A8] mt-1 font-mono tabular-nums">
          <span>0</span>
          <span>{remainingPercent}% remaining</span>
          <span>{formatINR(initialBudget)}</span>
        </div>
      </div>

      {/* Compact Acquired Squad List */}
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-[12px] text-[#8B98A8] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <span>Squad ({wonItems.length}{squadLimit ? `/${squadLimit}` : ""})</span>
            {isFull && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#B85C38]/20 text-[#B85C38] rounded-[2px] border border-[#B85C38]/40">
                Full
              </span>
            )}
          </span>
          <span>Spent: {formatINR(participant.totalSpent)}</span>
        </div>

        {wonItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-[#202B38] rounded-[2px] text-[12px] text-[#8B98A8] text-center">
            No acquisitions yet
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto max-h-56 pr-1">
            {wonItems.map((won) => (
              <div
                key={won.id}
                className="flex items-center justify-between p-2 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[13px]"
              >
                <div className="truncate mr-2">
                  <span className="font-medium text-[#F5F7FA] block truncate">{won.name}</span>
                  <span className="text-[11px] text-[#8B98A8]">{won.category}</span>
                </div>
                <span className="font-hero text-[14px] font-bold text-[#E5AE3F] tabular-nums shrink-0">
                  {formatINR(won.winningPrice || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
