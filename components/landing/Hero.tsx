"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Zap, Shield, Tv, Trophy, Search, Radio, ChevronRight } from "lucide-react";

interface HeroProps {
  onOpenJoinModal: () => void;
}

export function Hero({ onOpenJoinModal }: HeroProps) {
  const trustBullets = [
    {
      icon: Zap,
      title: "Real-Time Bidding",
      subtitle: "<50ms socket engine",
      color: "#D9A94E",
    },
    {
      icon: Shield,
      title: "Secure Private Rooms",
      subtitle: "Encrypted invite tokens",
      color: "#3E7CB1",
    },
    {
      icon: Tv,
      title: "Works on All Devices",
      subtitle: "TV scoreboard & mobile PWA",
      color: "#B85C38",
    },
    {
      icon: Trophy,
      title: "Built for Cricket Fans",
      subtitle: "IPL & club rules supported",
      color: "#D9A94E",
    },
  ];

  return (
    <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      {/* Background Stadium Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(217,169,78,0.15),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Live Status Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131A22] border border-[#232C36] text-[12px] text-[#8B93A0] shadow-md animate-in fade-in slide-in-from-top-3 duration-500">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[#F5F3EE] font-medium">Multiplayer Real-Time Cricket Auction Platform</span>
          </div>

          {/* Cinematic Condensed Headline */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="font-hero text-[48px] sm:text-[72px] md:text-[88px] font-extrabold text-[#F5F3EE] leading-[0.92] tracking-tight uppercase">
              YOUR AUCTION. YOUR RULES.
            </h1>
            <h2 className="font-hero text-[44px] sm:text-[68px] md:text-[84px] font-black text-[#D9A94E] leading-[0.92] tracking-tight uppercase">
              LIVE IN REAL TIME.
            </h2>
          </div>

          {/* Subheadline */}
          <p className="text-[15px] sm:text-[18px] text-[#8B93A0] leading-relaxed max-w-2xl mx-auto">
            Create a private cricket auction, invite your friends as bidders, and conduct every lot in real time with authoritative stadium scoreboard telemetry.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/create-auction"
              className="w-full sm:w-auto px-8 py-3.5 rounded-[4px] bg-[#D9A94E] hover:bg-[#B9862E] text-[#0A0F16] font-bold text-[15px] transition-all shadow-[0_0_20px_rgba(217,169,78,0.25)] flex items-center justify-center gap-2.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Create Auction</span>
            </Link>

            <button
              type="button"
              onClick={onOpenJoinModal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-[4px] bg-[#131A22] border border-[#232C36] hover:border-[#D9A94E]/60 text-[#F5F3EE] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
            >
              <Search className="w-4 h-4 text-[#D9A94E]" />
              <span>Join with Code</span>
            </button>
          </div>

          {/* 4 Trust Bullets Row */}
          <div className="pt-8 w-full grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            {trustBullets.map((bullet, idx) => {
              const Icon = bullet.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-[4px] bg-[#131A22]/80 border border-[#232C36] flex items-center gap-3 backdrop-blur-xs"
                >
                  <div
                    className="w-8 h-8 rounded-[3px] bg-[#0A0F16] border border-[#232C36] flex items-center justify-center shrink-0"
                    style={{ color: bullet.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-[#F5F3EE] block truncate">
                      {bullet.title}
                    </span>
                    <span className="text-[11px] text-[#8B93A0] block truncate">
                      {bullet.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hero Cinematic Stadium Visual Showcase */}
        <div className="mt-12 sm:mt-16 relative rounded-[6px] overflow-hidden border border-[#232C36] shadow-2xl bg-[#131A22]">
          {/* Top Window Bar */}
          <div className="h-10 px-4 bg-[#0A0F16] border-b border-[#232C36] flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[#8B93A0] font-mono text-[11px] ml-2 hidden sm:inline">
                stadium-broadcast-arena.cricket
              </span>
            </div>
            <div className="flex items-center gap-3 text-[#8B93A0]">
              <span className="flex items-center gap-1 text-[11px]">
                <Radio className="w-3 h-3 text-[#34D399] animate-pulse" />
                <span className="text-[#F5F3EE] font-medium">LIVE 1080p FEED</span>
              </span>
            </div>
          </div>

          {/* Hero Image Container */}
          <div className="relative aspect-16/9 w-full max-h-[540px]">
            <Image
              src="/images/hero-stadium.jpg"
              alt="Floodlit cricket stadium at night with blazing spotlights and scoreboard atmosphere"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-center"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F16] via-transparent to-transparent opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F16]/60 via-transparent to-[#0A0F16]/60" />

            {/* In-Frame Live Stadium Overlay Elements */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-end justify-between gap-4">
              <div className="p-3.5 sm:p-4 rounded-[4px] bg-[#131A22]/90 border border-[#232C36] backdrop-blur-md max-w-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[#232C36] pb-2 mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-[#8B93A0] font-semibold">
                    Current Spotlight Lot
                  </span>
                  <span className="font-hero text-[14px] font-bold text-[#D9A94E]">
                    LOT #01
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <span className="text-[14px] font-bold text-[#F5F3EE] block">
                      Premier All-Rounder
                    </span>
                    <span className="text-[11px] text-[#8B93A0]">
                      Base Price: ₹2.00 Cr
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8B93A0] block">CURRENT BID</span>
                    <span className="font-hero text-[26px] sm:text-[32px] font-bold text-[#D9A94E] tabular-nums leading-none">
                      ₹8.50 Cr
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/create-auction"
                  className="px-4 py-2 rounded-[3px] bg-[#D9A94E] text-[#0A0F16] text-[13px] font-bold hover:bg-[#B9862E] transition-all flex items-center gap-1.5 shadow-lg"
                >
                  <span>Launch Live Arena</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
