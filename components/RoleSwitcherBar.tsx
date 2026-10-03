"use client";

import React from "react";
import { useAuth } from "./AuthContext";
import { Shield, UserCheck, Users, Eye } from "lucide-react";

export function RoleSwitcherBar({ isLandingPage = false }: { isLandingPage?: boolean }) {
  const { user, switchUserRole, logout } = useAuth();

  // Hide on public landing page or in production unless debugging
  if (isLandingPage || (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER !== "true")) {
    return null;
  }

  const accounts = [
    {
      name: "Auctioneer",
      email: "auctioneer@bpl.com",
      role: "AUCTIONEER",
      icon: Shield,
    },
    {
      name: "Team A (RCB)",
      email: "bidder1@rcb.com",
      role: "BIDDER",
      icon: UserCheck,
      color: "#3E7CB1",
    },
    {
      name: "Team B (CSK)",
      email: "bidder2@csk.com",
      role: "BIDDER",
      icon: Users,
      color: "#B85C38",
    },
    {
      name: "Spectator",
      email: "spectator@fan.com",
      role: "SPECTATOR",
      icon: Eye,
    },
  ];

  return (
    <div className="bg-[#070B12] border-b border-[#202B38] px-4 py-1.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-[#8B98A8] font-bold text-[11px] uppercase tracking-wider">Simulate Role:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {accounts.map((acc) => {
              const Icon = acc.icon;
              const isActive = user?.email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => switchUserRole(acc.email)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border text-[11px] font-semibold transition-all ${
                    isActive
                      ? "border-[#E5AE3F] bg-[#121A24] text-[#F5F7FA]"
                      : "border-[#202B38] bg-[#0D131C] text-[#8B98A8] hover:text-[#F5F7FA] hover:border-[#8B98A8]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{acc.name}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#28D17C]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[12px]">
          {user ? (
            <div className="flex items-center gap-2 text-[#8B98A8]">
              <span>Active: <strong className="text-[#F5F7FA] font-semibold">{user.name}</strong></span>
              <button
                type="button"
                onClick={logout}
                className="text-[#8B98A8] hover:text-[#FF5C5C] underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <span className="text-[#E5AE3F] font-medium">Select a role above to test live bidding</span>
          )}
        </div>
      </div>
    </div>
  );
}
