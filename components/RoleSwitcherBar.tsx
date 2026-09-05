"use client";

import React from "react";
import { useAuth } from "./AuthContext";
import { Shield, UserCheck, Users, Eye } from "lucide-react";

export function RoleSwitcherBar() {
  const { user, switchUserRole, logout } = useAuth();

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
    <div className="bg-[#10151A] border-b border-[#2B343C] px-4 py-1.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="text-[#8B939A] font-medium text-[12px]">Role view:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {accounts.map((acc) => {
              const Icon = acc.icon;
              const isActive = user?.email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => switchUserRole(acc.email)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] border text-[12px] font-medium transition-all ${
                    isActive
                      ? "border-[#EDEAE1] bg-[#1B2229] text-[#EDEAE1] font-semibold"
                      : "border-[#2B343C] bg-[#10151A] text-[#8B939A] hover:text-[#EDEAE1] hover:border-[#8B939A]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{acc.name}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[12px]">
          {user ? (
            <div className="flex items-center gap-2 text-[#8B939A]">
              <span>Active: <strong className="text-[#EDEAE1] font-medium">{user.name}</strong></span>
              <button
                type="button"
                onClick={logout}
                className="text-[#8B939A] hover:text-red-300 underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <span className="text-[#C7A046]">Select a role above to simulate</span>
          )}
        </div>
      </div>
    </div>
  );
}
