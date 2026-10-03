"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#202B38] bg-[#070B12] text-[#8B98A8] text-[13px] pt-10 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[18px]">🏏</span>
              <span className="font-hero text-[20px] font-black text-[#F5F7FA] tracking-wide">
                BIDXI
              </span>
              <span className="text-[11px] font-mono text-[#E5AE3F] ml-1 bg-[#121A24] px-1.5 py-0.5 rounded-[2px] border border-[#202B38]">
                REAL-TIME
              </span>
            </Link>
            <p className="text-[12px] text-[#8B98A8] max-w-sm">
              Real-time cricket auction engine with synchronized bidding, authoritative timers, and live broadcast telemetry.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-6 text-[13px]">
            <Link href="/create-auction" className="text-[#8B98A8] hover:text-[#F5F7FA] transition-colors">
              Create Auction
            </Link>
            <Link href="/dashboard" className="text-[#8B98A8] hover:text-[#F5F7FA] transition-colors">
              My Auctions
            </Link>
            <Link href="/login" className="text-[#8B98A8] hover:text-[#F5F7FA] transition-colors">
              Sign In
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] text-[#28D17C] bg-[#0D131C] px-2.5 py-1 rounded-[3px] border border-[#202B38]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28D17C] animate-pulse" />
              <span>Socket Engine Online</span>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-[#202B38] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
          <p>© {new Date().getFullYear()} BIDXI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#8B98A8]">
            <span>Authoritative Gavel Clock</span>
            <span>•</span>
            <span>Zero-Snipe Protection</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
