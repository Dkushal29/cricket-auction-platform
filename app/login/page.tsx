"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { Shield, UserCheck, Users, Eye, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      title: "Auctioneer",
      role: "AUCTIONEER",
      email: "auctioneer@bpl.com",
      password: "Password123!",
      desc: "Controls the hammer, lot spotlight, starting, pausing, and finalizing sales.",
      icon: Shield,
    },
    {
      title: "Team A: Royal Challengers",
      role: "BIDDER",
      email: "bidder1@rcb.com",
      password: "Password123!",
      desc: "₹10 Cr starting purse with steel blue rail and instant bidding console.",
      icon: UserCheck,
      color: "#3E7CB1",
    },
    {
      title: "Team B: Super Kings",
      role: "BIDDER",
      email: "bidder2@csk.com",
      password: "Password123!",
      desc: "₹10 Cr starting purse with burnt copper rail and live budget projections.",
      icon: Users,
      color: "#B85C38",
    },
    {
      title: "Spectator",
      role: "SPECTATOR",
      email: "spectator@fan.com",
      password: "Password123!",
      desc: "Broadcast view with live streaming bid feed, timers, and team meters.",
      icon: Eye,
    },
  ];

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Login failed", "error");
      } else {
        login(data.token, data.user);
        addToast(`Signed in as ${data.user.name}`, "success");
        router.push("/");
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-[#C7A046] rounded-[2px]" />
            <span className="font-bold text-[18px] text-[#EDEAE1]">Real-time auction broadcast</span>
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-bold text-[#EDEAE1]">
            Sign in to platform
          </h1>
          <p className="text-[14px] text-[#8B939A]">
            Select a demo role below to test live bidding and auctioneer hammer controls.
          </p>
        </div>

        {/* 1-Click Demo Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleLogin(acc.email, acc.password)}
                disabled={loading}
                className="p-4 rounded-[4px] bg-[#1B2229] border border-[#2B343C] hover:border-[#8B939A] text-left transition-all active:scale-[0.99] space-y-2 group"
                style={acc.color ? { borderLeft: `3px solid ${acc.color}` } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#8B939A] group-hover:text-[#EDEAE1]" />
                    <h3 className="font-bold text-[15px] text-[#EDEAE1]">{acc.title}</h3>
                  </div>
                  <span className="text-[11px] font-medium text-[#8B939A] bg-[#10151A] px-2 py-0.5 rounded-[2px] border border-[#2B343C]">
                    {acc.role}
                  </span>
                </div>

                <p className="text-[13px] text-[#8B939A] leading-relaxed">
                  {acc.desc}
                </p>

                <div className="text-[12px] text-[#8B939A] font-hero tabular-nums">
                  {acc.email}
                </div>
              </button>
            );
          })}
        </div>

        {/* Manual Credentials */}
        <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] max-w-md mx-auto w-full">
          <h2 className="text-[14px] font-bold text-[#EDEAE1] mb-3 text-center">
            Or sign in with email
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(email, password);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="name@bpl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] hover:bg-white transition-colors"
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#2B343C] text-center">
            <p className="text-[13px] text-[#8B939A]">
              Don&apos;t have an account?{" "}
              <a
                href="/register"
                className="text-[#C7A046] font-semibold hover:underline"
              >
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
