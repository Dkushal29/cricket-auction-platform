"use client";

import React from "react";
import Link from "next/link";
import { Radio, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#232C36] bg-[#0A0F16] text-[#8B93A0] text-[13px] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[3px] bg-[#131A22] border border-[#D9A94E]/60 flex items-center justify-center text-[#D9A94E] font-hero text-[16px] font-bold">
                A
              </div>
              <span className="font-hero text-[18px] font-bold text-[#F5F3EE] tracking-tight">
                CRICKET AUCTION <span className="text-[#D9A94E]">LIVE</span>
              </span>
            </Link>
            <p className="text-[12px] leading-relaxed text-[#8B93A0]">
              The real-time multiplayer sports auction engine built for private leagues, club tournaments, and watch parties.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[#131A22] border border-[#232C36] text-[11px] text-[#34D399]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Col 2: Platform Features */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] uppercase font-bold text-[#F5F3EE] tracking-wider">
              Platform Features
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li>
                <Link href="#features" className="hover:text-[#F5F3EE] transition-colors">
                  Real-Time Bidding Engine
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#F5F3EE] transition-colors">
                  Stadium TV Scoreboard
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#F5F3EE] transition-colors">
                  Private Cryptographic Rooms
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#F5F3EE] transition-colors">
                  War Room & Velocity Analytics
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#F5F3EE] transition-colors">
                  Timeline Replay & Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Tournament Presets */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] uppercase font-bold text-[#F5F3EE] tracking-wider">
              Tournament Presets
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li>
                <Link href="/create-auction" className="hover:text-[#F5F3EE] transition-colors">
                  Premier Mega Auction (₹10 Cr)
                </Link>
              </li>
              <li>
                <Link href="/create-auction" className="hover:text-[#F5F3EE] transition-colors">
                  Club T20 Championship (₹50 Lakhs)
                </Link>
              </li>
              <li>
                <Link href="/create-auction" className="hover:text-[#F5F3EE] transition-colors">
                  Mini Flash Auction (₹20 Lakhs)
                </Link>
              </li>
              <li>
                <Link href="/create-auction" className="hover:text-[#F5F3EE] transition-colors">
                  Custom Roster & Purse Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Integrity & Security */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] uppercase font-bold text-[#F5F3EE] tracking-wider">
              Integrity & Trust
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Zero Client Trust Invariants</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Anti-Snipe Bid Timing Guard</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Atomic Transaction Locking</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Exportable CSV/JSON Ledger</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-[#232C36] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
          <p>© {new Date().getFullYear()} Real-Time Cricket Auction Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#F5F3EE] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-[#F5F3EE] transition-colors">
              Terms of Service
            </Link>
            <span className="font-mono text-[#D9A94E]">v2.0-PROD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
