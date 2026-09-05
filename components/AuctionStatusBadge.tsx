"use client";

import React from "react";
import { AuctionStatus } from "@/lib/types";

export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
  const styles: Record<AuctionStatus, { bg: string; text: string; dot: string; pulse: boolean }> = {
    DRAFT: {
      bg: "bg-slate-800/80 border-slate-700",
      text: "text-slate-300",
      dot: "bg-slate-400",
      pulse: false,
    },
    READY: {
      bg: "bg-blue-950/80 border-blue-600/40",
      text: "text-blue-300",
      dot: "bg-blue-400",
      pulse: false,
    },
    LIVE: {
      bg: "bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
      text: "text-emerald-300 font-bold",
      dot: "bg-emerald-400",
      pulse: true,
    },
    PAUSED: {
      bg: "bg-amber-950/80 border-amber-500/40",
      text: "text-amber-300",
      dot: "bg-amber-400",
      pulse: true,
    },
    COMPLETED: {
      bg: "bg-purple-950/80 border-purple-600/40",
      text: "text-purple-300",
      dot: "bg-purple-400",
      pulse: false,
    },
    CANCELLED: {
      bg: "bg-red-950/80 border-red-600/40",
      text: "text-red-300",
      dot: "bg-red-400",
      pulse: false,
    },
  };

  const style = styles[status] || styles.DRAFT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs uppercase tracking-wider font-semibold border ${style.bg} ${style.text}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${style.dot} ${
          style.pulse ? "animate-ping inline-flex" : ""
        }`}
      />
      {status}
    </span>
  );
}
