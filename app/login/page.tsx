"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { Shield, UserCheck, Users, Eye, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

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
        addToast(`Signed in as ${data.user.name}`, "brass");
        const redirectParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
        const target = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";
        router.push(target);
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#E5AE3F] selection:text-[#070B12]">
      <div className="max-w-3xl w-full space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-[24px]">🏏</span>
            <span className="font-hero text-[28px] font-black text-[#F5F7FA] tracking-wide">BIDXI</span>
          </div>
          <h1 className="font-hero text-[30px] sm:text-[36px] font-black text-[#F5F7FA] uppercase tracking-wide">
            Sign In to Platform
          </h1>
          <p className="text-[13px] text-[#8B98A8]">
            Select a 1-click demo role below or enter your credentials.
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
                className="p-4 rounded-[4px] bg-[#0D131C] border border-[#202B38] hover:border-[#E5AE3F] text-left transition-all active:scale-[0.99] space-y-2 group shadow-md"
                style={acc.color ? { borderLeft: `3px solid ${acc.color}` } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#8B98A8] group-hover:text-[#E5AE3F]" />
                    <h3 className="font-bold text-[14px] text-[#F5F7FA] group-hover:text-[#E5AE3F] transition-colors">
                      {acc.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#8B98A8] bg-[#070B12] px-2 py-0.5 rounded-[2px] border border-[#202B38]">
                    {acc.role}
                  </span>
                </div>

                <p className="text-[12px] text-[#8B98A8] leading-relaxed">
                  {acc.desc}
                </p>

                <div className="text-[11px] text-[#8B98A8] font-mono">
                  {acc.email}
                </div>
              </button>
            );
          })}
        </div>

        {/* Manual Credentials */}
        <div className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] max-w-md mx-auto w-full shadow-xl">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#8B98A8] mb-3 text-center">
            Or Sign In With Email
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(email, password);
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(229,174,63,0.15)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#202B38] text-center">
            <p className="text-[12px] text-[#8B98A8]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#E5AE3F] font-bold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
