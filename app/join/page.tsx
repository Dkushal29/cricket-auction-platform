"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ToastNotifications";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function JoinAuctionPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auctions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Auction room not found");
      }
      addToast(`Entering "${data.auction.name}"...`, "brass");
      router.push(data.redirectUrl || `/auction/${data.auction.id}`);
    } catch (err: any) {
      addToast(err.message || "Failed to join room", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>

        <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
            <span className="text-[28px] inline-block mb-1">🏏</span>
            <h1 className="font-hero text-[32px] sm:text-[36px] font-black text-[#F5F7FA] uppercase tracking-wide">
              Join Auction
            </h1>
            <p className="text-[13px] text-[#8B98A8]">
              Enter the code shared by your auctioneer to join the live auction.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-2 text-center">
                Enter Auction Code
              </label>
              <input
                type="text"
                placeholder="A B C 1 2 3"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-[#070B12] border border-[#202B38] text-[#F5F7FA] rounded-[4px] font-mono text-[20px] uppercase tracking-widest text-center focus:border-[#E5AE3F] focus:outline-none placeholder:text-[#8B98A8]/30"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[14px] hover:bg-[#F4C65E] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(229,174,63,0.2)] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to room...</span>
                </>
              ) : (
                <span>Join Auction</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
