"use client";

import React, { useEffect, useState } from "react";
import { Timer, ShieldAlert, Zap } from "lucide-react";

interface AuctionTimerProps {
  secondsRemaining: number | null;
  totalDuration: number;
  antiSnipeThreshold: number;
  isPaused?: boolean;
}

export function AuctionTimer({
  secondsRemaining,
  totalDuration,
  antiSnipeThreshold,
  isPaused,
}: {
  secondsRemaining: number | null;
  totalDuration: number;
  antiSnipeThreshold: number;
  isPaused?: boolean;
}) {
  const [seconds, setSeconds] = useState<number>(secondsRemaining ?? totalDuration);

  useEffect(() => {
    if (secondsRemaining !== null) {
      setSeconds(secondsRemaining);
    }
  }, [secondsRemaining]);

  if (secondsRemaining === null && !isPaused) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-400 text-sm">
        <Timer className="w-5 h-5 text-slate-500" />
        <span>Timer on standby</span>
      </div>
    );
  }

  const duration = Math.max(1, totalDuration);
  const percent = Math.min(100, Math.max(0, (seconds / duration) * 100));
  const isCritical = seconds <= antiSnipeThreshold && seconds > 0;
  const isExpired = seconds <= 0;

  // Colors based on urgency
  const colorClass = isExpired
    ? "text-slate-500 bg-slate-900/80 border-slate-800"
    : isCritical
    ? "text-red-400 bg-red-950/60 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
    : seconds <= 10
    ? "text-amber-400 bg-amber-950/40 border-amber-500/40"
    : "text-emerald-400 bg-emerald-950/40 border-emerald-500/40";

  const barColor = isExpired
    ? "bg-slate-700"
    : isCritical
    ? "bg-red-500"
    : seconds <= 10
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <Timer className="w-4 h-4" />
          <span>{isPaused ? "Timer Paused" : isExpired ? "Time Expired" : "Hammer Countdown"}</span>
        </div>

        {isCritical && !isPaused && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 animate-bounce">
            <Zap className="w-3 h-3 text-red-400" />
            <span>ANTI-SNIPE ZONE (+10s on bid)</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
          {seconds}
          <span className="text-lg font-normal ml-1 opacity-70">s</span>
        </div>
        <span className="text-xs text-slate-400">
          Duration: {duration}s
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-950/80 overflow-hidden border border-white/5">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
