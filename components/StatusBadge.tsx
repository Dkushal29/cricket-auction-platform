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

  let colorStyle = "bg-[#121A24] border-[#202B38] text-[#8B98A8]";
  let label = upperStatus;
  let pulseDot = false;

  switch (upperStatus) {
    case "LIVE":
      colorStyle = "bg-[#28D17C]/10 border-[#28D17C]/40 text-[#28D17C]";
      label = "LIVE BROADCAST";
      pulseDot = true;
      break;
    case "READY":
      colorStyle = "bg-[#28D17C]/10 border-[#28D17C]/30 text-[#28D17C]";
      label = "READY TO START";
      break;
    case "DRAFT":
      colorStyle = "bg-[#0D131C] border-[#202B38] text-[#8B98A8]";
      label = "SETUP DRAFT";
      break;
    case "PAUSED":
      colorStyle = "bg-[#E5AE3F]/10 border-[#E5AE3F]/40 text-[#E5AE3F]";
      label = "PAUSED";
      break;
    case "COMPLETED":
      colorStyle = "bg-[#4DA3FF]/10 border-[#4DA3FF]/40 text-[#4DA3FF]";
      label = "COMPLETED";
      break;
    case "CANCELLED":
      colorStyle = "bg-[#FF5C5C]/10 border-[#FF5C5C]/40 text-[#FF5C5C]";
      label = "CANCELLED";
      break;
    case "SOLD":
      colorStyle = "bg-[#E5AE3F]/15 border-[#E5AE3F] text-[#E5AE3F]";
      label = "SOLD";
      break;
    case "UNSOLD":
      colorStyle = "bg-[#0D131C] border-[#202B38] text-[#8B98A8]";
      label = "UNSOLD (POOL)";
      break;
    case "FINAL_UNSOLD":
      colorStyle = "bg-[#FF5C5C]/10 border-[#FF5C5C]/30 text-[#FF5C5C]";
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#28D17C] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#28D17C]"></span>
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
