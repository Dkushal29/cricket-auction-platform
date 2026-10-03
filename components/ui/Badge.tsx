import React from "react";

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "gold" | "green" | "danger" | "blue" | "muted";
  className?: string;
}) {
  const variants = {
    default: "bg-[#121A24] border border-[#202B38] text-[#F5F7FA]",
    gold: "bg-[#E5AE3F]/10 border border-[#E5AE3F]/40 text-[#E5AE3F]",
    green: "bg-[#28D17C]/10 border border-[#28D17C]/40 text-[#28D17C]",
    danger: "bg-[#FF5C5C]/10 border border-[#FF5C5C]/40 text-[#FF5C5C]",
    blue: "bg-[#4DA3FF]/10 border border-[#4DA3FF]/40 text-[#4DA3FF]",
    muted: "bg-[#0D131C] border border-[#202B38] text-[#8B98A8]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function LiveIndicator({ label = "LIVE", className = "" }: { label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#28D17C]/10 border border-[#28D17C]/30 text-[#28D17C] text-[11px] font-bold font-mono tracking-wider ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#28D17C] animate-pulse" />
      <span>{label}</span>
    </span>
  );
}
