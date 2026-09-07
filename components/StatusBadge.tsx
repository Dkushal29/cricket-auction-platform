"use client";

import React from "react";

export type AuctionStatusType =
  | "DRAFT"
  | "READY"
  | "LIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "SOLD"
  | "UNSOLD"
  | "FINAL_UNSOLD";

interface StatusBadgeProps {
  status: AuctionStatusType | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, size = "md", className = "" }: StatusBadgeProps) {
  const upperStatus = (status || "").toUpperCase();

  let colorStyle = "bg-[#161D24] border-[#2B343C] text-[#8B939A]";
  let label = upperStatus;
  let pulseDot = false;

  switch (upperStatus) {
    case "LIVE":
      colorStyle = "bg-[#10151A] border-[#C7A046] text-[#C7A046]";
      label = "LIVE BROADCAST";
      pulseDot = true;
      break;
    case "READY":
      colorStyle = "bg-[#10151A] border-emerald-500/50 text-emerald-400";
      label = "READY TO START";
      break;
    case "DRAFT":
      colorStyle = "bg-[#10151A] border-[#2B343C] text-[#8B939A]";
      label = "SETUP DRAFT";
      break;
    case "PAUSED":
      colorStyle = "bg-[#10151A] border-amber-500/50 text-amber-400";
      label = "PAUSED";
      break;
    case "COMPLETED":
      colorStyle = "bg-[#10151A] border-blue-500/50 text-blue-400";
      label = "COMPLETED";
      break;
    case "CANCELLED":
      colorStyle = "bg-[#10151A] border-red-500/50 text-red-400";
      label = "CANCELLED";
      break;
    case "SOLD":
      colorStyle = "bg-[#C7A046]/15 border-[#C7A046] text-[#C7A046]";
      label = "SOLD";
      break;
    case "UNSOLD":
      colorStyle = "bg-[#10151A] border-[#2B343C] text-[#8B939A]";
      label = "UNSOLD (POOL)";
      break;
    case "FINAL_UNSOLD":
      colorStyle = "bg-[#10151A] border-[#B85C38] text-[#B85C38]";
      label = "FINAL UNSOLD";
      break;
  }

  const sizeStyle =
    size === "sm"
      ? "px-2 py-0.5 text-[11px]"
      : size === "lg"
      ? "px-3.5 py-1.5 text-[14px]"
      : "px-2.5 py-1 text-[12px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border font-bold uppercase tracking-wider ${colorStyle} ${sizeStyle} ${className}`}
    >
      {pulseDot && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7A046] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C7A046]"></span>
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
