"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientAuction } from "@/lib/types";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { formatINR } from "@/lib/auction-state";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import {
  Radio,
  Tv,
  Users,
  Shield,
  BarChart2,
  History,
  QrCode,
  Lock,
  ArrowRight,
  Gavel,
  Zap,
  Search,
  LayoutDashboard,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [auctions, setAuctions] = useState<ClientAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auctions")
      .then((res) => res.json())
      .then((data) => {
        if (data.auctions) {
          setAuctions(data.auctions);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    try {
      setJoinLoading(true);
      const res = await fetch("/api/auctions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Auction room not found");
      }
      addToast(`Joining "${data.auction.name}"...`, "brass");
      router.push(data.redirectUrl || `/auction/${data.auction.id}`);
    } catch (err: any) {
      addToast(err.message || "Failed to join room", "error");
    } finally {
      setJoinLoading(false);
    }
  };

  const activeAuctions = auctions.filter((a) => a.status === "LIVE" || a.status === "PAUSED");

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      {/* Top Demo Bar */}
      <RoleSwitcherBar />

      {/* Main Navbar */}
      <header className="h-16 px-4 sm:px-8 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#EDEAE1] font-bold text-[17px]">
          <span className="w-3 h-3 bg-[#C7A046] rounded-[2px]" />
          <span>Cricket Auction Live</span>
        </Link>

        <div className="flex items-center gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] font-medium transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-[#C7A046]" />
            <span>Join with code</span>
          </button>

          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] font-medium transition-colors flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#3E7CB1]" />
            <span>My auctions</span>
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-[2px] bg-[#C7A046] text-[#10151A] font-semibold transition-colors"
            >
              {user.name}
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold hover:bg-white transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-16">
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#1B2229] border border-[#2B343C] text-[12px] text-[#8B939A]">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Multiplayer Real-Time Cricket Auction Platform</span>
          </div>

          <h1 className="font-hero text-[44px] sm:text-[68px] font-bold text-[#EDEAE1] leading-[0.95] tracking-tight uppercase">
            YOUR AUCTION. YOUR RULES. LIVE.
          </h1>

          <p className="text-[15px] sm:text-[17px] text-[#8B939A] leading-relaxed max-w-xl mx-auto">
            Create a private cricket auction, invite your friends, and conduct every bid in real time with authoritative stadium telemetry.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/create-auction"
              className="px-6 py-3 rounded-[3px] bg-[#C7A046] text-[#10151A] font-bold text-[15px] hover:bg-[#b58f38] transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Create auction</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="px-6 py-3 rounded-[3px] bg-[#1B2229] border border-[#2B343C] text-[#EDEAE1] font-semibold text-[15px] hover:border-[#8B939A] transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#8B939A]" />
              <span>Join auction</span>
            </button>
          </div>
        </section>

        {/* Live Active Auctions Strip (if available) */}
        {activeAuctions.length > 0 && (
          <section className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#EDEAE1]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live stadium arenas in progress</span>
              </div>
              <span className="text-[12px] text-[#8B939A]">Real-time synchronization</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAuctions.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-[#EDEAE1]">{a.name}</span>
                      <LiveStatusBadge status={a.status} isConfigLocked={a.isConfigLocked} />
                    </div>
                    <span className="text-[12px] text-[#8B939A]">
                      Room: <strong className="text-[#EDEAE1]">{a.roomCode}</strong> · {a.items.length} lots
                    </span>
                  </div>

                  <Link
                    href={`/auction/${a.id}`}
                    className="px-3.5 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px] hover:bg-white transition-colors"
                  >
                    Enter arena
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core Product Pillars */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-[20px] sm:text-[24px] font-bold text-[#EDEAE1]">
              Engineered for live competition
            </h2>
            <p className="text-[13px] text-[#8B939A]">
              Built with server-authoritative integrity and stadium scoreboard presence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#C7A046]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Authoritative real-time bidding
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                116px brass hero bid numerals with synchronized anti-snipe countdown extensions and atomic budget locking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#3E7CB1]">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Private cryptographic rooms
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                Separate encrypted invite tokens for Team Alpha and Team Beta, plus frictionless QR mobile spectator access.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#B85C38]">
                <Tv className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Big-screen broadcast mode
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                Presentation scoreboard layout optimized for TVs, projectors, and living room watch parties with pure Web Audio chimes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#C7A046]">
                <Gavel className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Auctioneer command deck
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                10-point pre-flight diagnostics, gavel hammer finalization, mark unsold lot queue, and transactional sale reversal.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#3E7CB1]">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                War Room & momentum
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                Real-time bidding velocity momentum metrics, category squad balance radar, and remaining purse depletion gauges.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#10151A] border border-[#2B343C] flex items-center justify-center text-[#B85C38]">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-[#EDEAE1]">
                Replay & certified ledger
              </h3>
              <p className="text-[13px] text-[#8B939A] leading-relaxed">
                Interactive scrubber with 0.5x–2x playback speed, verified audit trail, and instant CSV/JSON exports.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-[#10151A]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B343C] pb-3">
              <h3 className="text-[16px] font-bold text-[#EDEAE1]">
                Enter auction room code
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-[#8B939A] hover:text-[#EDEAE1]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="text-[12px] text-[#8B939A] block mb-1">
                  Room code or auction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. AUCTION-BPL-2026 or room code"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] rounded-[2px] font-mono text-[14px] uppercase focus:border-[#C7A046] outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !roomCodeInput.trim()}
                  className="px-4 py-1.5 rounded-[2px] bg-[#C7A046] text-[#10151A] font-semibold text-[13px] hover:bg-[#b58f38] disabled:opacity-50"
                >
                  {joinLoading ? "Joining..." : "Join auction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-12 border-t border-[#2B343C] bg-[#10151A] px-4 sm:px-8 flex items-center justify-between text-[12px] text-[#8B939A]">
        <span>Real-Time Cricket Auction Platform</span>
        <span className="font-mono">Server-Authoritative · Phase 2</span>
      </footer>
    </div>
  );
}
