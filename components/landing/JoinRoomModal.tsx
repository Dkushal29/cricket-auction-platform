"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastNotifications";
import { X, Search, Loader2 } from "lucide-react";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    try {
      setJoinLoading(true);
      const res = await fetch("/api/auctions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Auction room not found");
      }
      addToast(`Entering "${data.auction.name}"...`, "brass");
      onClose();
      router.push(data.redirectUrl || `/auction/${data.auction.id}`);
    } catch (err: any) {
      addToast(err.message || "Failed to join room", "error");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070B12]/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[#202B38] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">🏏</span>
            <h3 className="font-hero text-[22px] font-bold text-[#F5F7FA] tracking-wide uppercase">
              Join Auction
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8B98A8] hover:text-[#F5F7FA] rounded-[2px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoinByCode} className="space-y-4">
          <div>
            <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-2">
              Enter Auction Code
            </label>
            <input
              type="text"
              placeholder="A B C 1 2 3"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-[#070B12] border border-[#202B38] text-[#F5F7FA] rounded-[4px] font-mono text-[18px] uppercase tracking-widest text-center focus:border-[#E5AE3F] focus:outline-none placeholder:text-[#8B98A8]/40"
              autoFocus
            />
            <p className="text-[12px] text-[#8B98A8] mt-2.5 leading-relaxed text-center">
              Enter the code shared by your auctioneer to join the live auction.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={joinLoading || !roomCodeInput.trim()}
              className="w-full py-3 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[14px] hover:bg-[#F4C65E] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(229,174,63,0.2)]"
            >
              {joinLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to room...</span>
                </>
              ) : (
                <span>Join Auction</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
