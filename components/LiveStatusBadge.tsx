"use client";

import React from "react";
import { AuctionStatus } from "@/lib/types";
import { Lock } from "lucide-react";

export function LiveStatusBadge({
  status,
  isConfigLocked,
}: {
  status: AuctionStatus;
  isConfigLocked?: boolean;
}) {
  const isLive = status === "LIVE";
  const isPaused = status === "PAUSED";
  const isCompleted = status === "COMPLETED";
  const locked = isConfigLocked || status !== "DRAFT";

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] text-[13px] font-medium text-[#EDEAE1]">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive
              ? "bg-emerald-400 animate-pulse"
              : isPaused
              ? "bg-amber-400"
              : isCompleted
              ? "bg-purple-400"
              : "bg-[#8B939A]"
          }`}
        />
        <span className="capitalize">{status.toLowerCase()}</span>
      </div>

      {locked && (
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#10151A] border border-[#2B343C] text-[11px] text-[#8B939A]">
          <Lock className="w-2.5 h-2.5 text-[#C7A046]" />
          <span>Config locked</span>
        </div>
      )}
    </div>
  );
}
