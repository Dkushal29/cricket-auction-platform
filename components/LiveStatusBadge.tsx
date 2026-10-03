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
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] bg-[#0D131C] border border-[#202B38] text-[12px] font-semibold text-[#F5F7FA]">
        <span
          className={`w-2 h-2 rounded-full ${
            isLive
              ? "bg-[#28D17C] animate-pulse shadow-[0_0_8px_rgba(40,209,124,0.4)]"
              : isPaused
              ? "bg-[#E5AE3F]"
              : isCompleted
              ? "bg-[#4DA3FF]"
              : "bg-[#8B98A8]"
          }`}
        />
        <span className="uppercase tracking-wider text-[11px] font-mono">{status}</span>
      </div>

      {locked && (
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[11px] text-[#8B98A8]">
          <Lock className="w-2.5 h-2.5 text-[#E5AE3F]" />
          <span>Locked</span>
        </div>
      )}
    </div>
  );
}
