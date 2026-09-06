"use client";

import React from "react";
import { FeatureCard } from "./FeatureCard";
import { Zap, Shield, Tv, Gavel, BarChart2, History } from "lucide-react";

export function FeatureGrid() {
  const features = [
    {
      icon: Zap,
      title: "Real-Time Concurrent Bidding",
      description: "Sub-50ms WebSocket engine with synchronized anti-snipe countdown extensions, scale-snap numeral animations, and atomic budget locking.",
      accentColor: "#D9A94E",
      badge: "LIVE SYNC",
    },
    {
      icon: Shield,
      title: "Private Encrypted Rooms",
      description: "Cryptographic single-use invite tokens for Team Alpha and Team Beta with seamless QR-code guest spectator access.",
      accentColor: "#3E7CB1",
      badge: "SECURITY",
    },
    {
      icon: Tv,
      title: "Big-Screen Broadcast Mode",
      description: "Dedicated scoreboard view crafted for living room TVs and projectors, featuring 130px brass numerals and synthesized audio chimes.",
      accentColor: "#B85C38",
      badge: "TV SCOREBOARD",
    },
    {
      icon: Gavel,
      title: "Auctioneer Command Deck",
      description: "Authoritative 10-point pre-flight diagnostics, gavel hammer finalizations, unsold lot queue management, and instantaneous sale reversal.",
      accentColor: "#D9A94E",
      badge: "AUTHORITATIVE",
    },
    {
      icon: BarChart2,
      title: "War Room & Momentum Analytics",
      description: "Live bidding velocity trackers, squad role composition balance meters, and visual purse depletion runways.",
      accentColor: "#3E7CB1",
      badge: "ANALYTICS",
    },
    {
      icon: History,
      title: "Replay & Certified Ledger",
      description: "Interactive historical auction timeline scrubber with 0.5x–2x playback speed, cryptographic audit trail, and instant CSV/JSON exports.",
      accentColor: "#B85C38",
      badge: "AUDIT TRAIL",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] bg-[#131A22] border border-[#232C36] text-[11px] font-bold text-[#D9A94E] uppercase tracking-wider">
          Platform Architecture
        </div>
        <h2 className="font-hero text-[36px] sm:text-[48px] font-bold text-[#F5F3EE] uppercase tracking-tight leading-tight">
          Engineered for Live Stadium Drama
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[#8B93A0] leading-relaxed">
          Every component is designed with server-authoritative integrity, zero client trust, and trading-floor energy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, idx) => (
          <FeatureCard
            key={idx}
            icon={feat.icon}
            title={feat.title}
            description={feat.description}
            accentColor={feat.accentColor}
            badge={feat.badge}
          />
        ))}
      </div>
    </section>
  );
}
