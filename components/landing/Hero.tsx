"use client";

import React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

interface HeroProps {
  onOpenJoinModal: () => void;
}

export function Hero({ onOpenJoinModal }: HeroProps) {
  return (
    <section className="relative w-full min-h-[90vh] md:min-h-[92vh] flex flex-col justify-center overflow-hidden bg-[#070B12]">
      {/* 1. BACKGROUND LAYER (Pure CSS background-image, NOT an <img> element) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/images/cricket-auction-hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {/* 2. LAYERED GRADIENT OVERLAY (ABOVE image, BELOW content) */}
      {/* Desktop / Tablet horizontal gradient: solid dark on left, revealing stadium on right */}
      <div
        className="absolute inset-0 z-[1] hidden sm:block pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(5, 9, 15, 0.96) 0%, rgba(5, 9, 15, 0.88) 40%, rgba(5, 9, 15, 0.55) 70%, rgba(5, 9, 15, 0.35) 100%)",
        }}
        aria-hidden="true"
      />
      {/* Mobile overlay with enhanced readability */}
      <div
        className="absolute inset-0 z-[1] sm:hidden pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(5, 9, 15, 0.88) 0%, rgba(5, 9, 15, 0.94) 55%, rgba(7, 11, 18, 0.98) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle bottom gradient to blend image into the page */}
      <div
        className="absolute inset-x-0 bottom-0 h-28 z-[2] pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, #070B12 0%, rgba(7, 11, 18, 0.8) 50%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* 3. CONTENT LAYER (position: relative; z-index: 10) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 flex items-center">
        <div className="w-full max-w-[650px] space-y-6 sm:space-y-7 text-center sm:text-left">
          {/* Top Outlined Live Badge */}
          <div className="flex sm:justify-start justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#0D131C]/90 border border-[#202B38] text-[11px] font-semibold tracking-wider text-[#8B98A8] backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-[#28D17C] animate-pulse" />
              <span className="text-[#F5F7FA] uppercase tracking-widest font-mono">
                LIVE CRICKET AUCTIONS
              </span>
            </div>
          </div>

          {/* Main Heading: Condensed Sports Display Font */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="font-hero text-[46px] sm:text-[64px] md:text-[76px] lg:text-[84px] font-black leading-[0.92] tracking-tight uppercase text-[#F5F7FA]">
              RUN YOUR AUCTION.
            </h1>
            <h2 className="font-hero text-[44px] sm:text-[62px] md:text-[74px] lg:text-[82px] font-black leading-[0.92] tracking-tight uppercase text-[#E5AE3F]">
              OWN EVERY BID.
            </h2>
          </div>

          {/* Short Description */}
          <p className="text-[15px] sm:text-[17px] text-[#8B98A8] leading-relaxed max-w-[580px] sm:mx-0 mx-auto">
            Create and manage real-time cricket auctions with synchronized bidding, teams and live results.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-start justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Create Auction */}
            <Link
              href="/create-auction"
              className="px-7 py-3.5 rounded-[4px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] font-bold text-[14px] sm:text-[15px] transition-all duration-200 shadow-[0_0_24px_rgba(229,174,63,0.25)] hover:shadow-[0_0_32px_rgba(244,198,94,0.35)] flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#E5AE3F]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create Auction</span>
            </Link>

            {/* Join with Code */}
            <button
              type="button"
              onClick={onOpenJoinModal}
              className="px-7 py-3.5 rounded-[4px] bg-[#0D131C]/90 hover:bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] font-semibold text-[14px] sm:text-[15px] transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#E5AE3F]/50"
            >
              <Search className="w-4 h-4 text-[#E5AE3F]" />
              <span>Join with Code</span>
            </button>
          </div>

          {/* Feature Strip (3 Capabilities with Subtle Bullet Separators) */}
          <div className="pt-6 sm:pt-7 border-t border-[#202B38]/80 max-w-[650px]">
            <div className="flex flex-wrap items-center sm:justify-start justify-center gap-3 sm:gap-5 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-[#8B98A8]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#E5AE3F] text-[13px]">•</span>
                <span className="text-[#F5F7FA]">REAL-TIME BIDDING</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E5AE3F] text-[13px]">•</span>
                <span className="text-[#F5F7FA]">MULTI-TEAM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E5AE3F] text-[13px]">•</span>
                <span className="text-[#F5F7FA]">LIVE CONTROL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
