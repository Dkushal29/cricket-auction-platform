"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, DollarSign, Zap, Trophy, ChevronRight } from "lucide-react";

export function LegendsSection() {
  const steps = [
    {
      stepNumber: "01",
      icon: Users,
      title: "Invite Friends to Your Room",
      description: "Send private encrypted invite links for Team Alpha and Team Beta, or share the QR code for instant spectator access.",
    },
    {
      stepNumber: "02",
      icon: DollarSign,
      title: "Set Purses & Squad Rules",
      description: "Configure starting budgets (e.g. ₹10 Cr), minimum squad sizes, bid increments, and anti-snipe countdown windows.",
    },
    {
      stepNumber: "03",
      icon: Zap,
      title: "Engage in Live Bidding Wars",
      description: "Spotlight players one by one. Watch real-time bids snap-pulse with sound chimes and instant outbid notifications.",
    },
    {
      stepNumber: "04",
      icon: Trophy,
      title: "Crown Champions & Relive Moments",
      description: "Finalize rosters, inspect certified transaction ledgers, export CSV/JSON receipts, and scrub the replay timeline.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 border-t border-[#232C36] bg-[#0A0F16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Still-Life Photography */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[6px] overflow-hidden border border-[#232C36] shadow-2xl bg-[#131A22] group">
              <div className="relative aspect-4/3 w-full">
                <Image
                  src="/images/trophy-still-life.jpg"
                  alt="Gold championship cricket trophy with leather ball and gloves lit by stadium floodlights"
                  fill
                  sizes="(max-width: 1024px) 100vw, 500px"
                  className="object-cover object-center group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F16] via-transparent to-transparent opacity-80" />
              </div>

              {/* Bottom Inset Badge */}
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-[4px] bg-[#131A22]/90 border border-[#232C36] backdrop-blur-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#D9A94E] block">
                    Certified Tournament Grade
                  </span>
                  <span className="text-[13px] font-bold text-[#F5F3EE]">
                    Premier Cricket Auction Cup
                  </span>
                </div>
                <Trophy className="w-5 h-5 text-[#D9A94E]" />
              </div>
            </div>

            {/* Subtle Script Tagline Moment */}
            <div className="text-center pt-4">
              <span className="font-script text-[24px] text-[#D9A94E] block rotate-[-1deg]">
                "Where every bid writes cricket history"
              </span>
            </div>
          </div>

          {/* Right Column: Workflow Steps & Value Proposition */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] bg-[#131A22] border border-[#232C36] text-[11px] font-bold text-[#3E7CB1] uppercase tracking-wider">
                How It Works
              </div>
              <h2 className="font-hero text-[36px] sm:text-[50px] font-extrabold text-[#F5F3EE] uppercase tracking-tight leading-[0.95]">
                From Legends to Rising Stars:{" "}
                <span className="text-[#D9A94E]">Build Your Championship Squad</span>
              </h2>
              <p className="text-[15px] text-[#8B93A0] leading-relaxed">
                Whether organizing a private club auction with friends or hosting a full tournament draft, get complete broadcast-quality auction telemetry in four simple steps.
              </p>
            </div>

            {/* Vertical 4-Step List */}
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-[4px] bg-[#131A22] border border-[#232C36] flex items-start gap-4 hover:border-[#D9A94E]/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[3px] bg-[#0A0F16] border border-[#232C36] flex items-center justify-center shrink-0 text-[#D9A94E] font-hero text-[16px] font-extrabold">
                      {step.stepNumber}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-bold text-[#F5F3EE] flex items-center gap-2">
                        <span>{step.title}</span>
                      </h3>
                      <p className="text-[13px] text-[#8B93A0] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct CTA */}
            <div className="pt-2">
              <Link
                href="/create-auction"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[4px] bg-[#D9A94E] hover:bg-[#B9862E] text-[#0A0F16] font-bold text-[14px] transition-all shadow-[0_0_16px_rgba(217,169,78,0.2)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
              >
                <span>Create Your Auction Room</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
