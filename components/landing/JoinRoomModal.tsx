"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastNotifications";
import { X, Search, ArrowRight, Loader2 } from "lucide-react";

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
        body: JSON.stringify({ code: roomCodeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Auction room not found");
      }
      addToast(`Joining "${data.auction.name}"...`, "brass");
      onClose();
      router.push(data.redirectUrl || `/auction/${data.auction.id}`);
    } catch (err: any) {
      addToast(err.message || "Failed to join room", "error");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0F16]/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#131A22] border border-[#232C36] rounded-[4px] p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#232C36] pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#D9A94E]" />
            <h3 className="text-[16px] font-bold text-[#F5F3EE]">
              Join Live Auction
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8B93A0] hover:text-[#F5F3EE] rounded-[2px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoinByCode} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#8B93A0] block mb-1.5">
              Enter room code or auction identifier
            </label>
            <input
              type="text"
              placeholder="e.g. BPL-7X92 or AUCTION-..."
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0A0F16] border border-[#232C36] text-[#F5F3EE] rounded-[3px] font-mono text-[15px] uppercase tracking-wider focus:border-[#D9A94E] focus:ring-1 focus:ring-[#D9A94E] outline-hidden placeholder:normal-case placeholder:font-sans placeholder:text-[13px] placeholder:text-[#8B93A0]/60"
              autoFocus
            />
            <p className="text-[11px] text-[#8B93A0] mt-1.5">
              Ask your auctioneer or room host for their short room code or invite link.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232C36]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-[3px] bg-[#0A0F16] border border-[#232C36] text-[#F5F3EE] text-[13px] hover:border-[#8B93A0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinLoading || !roomCodeInput.trim()}
              className="px-4 py-2 rounded-[3px] bg-[#D9A94E] text-[#0A0F16] font-bold text-[13px] hover:bg-[#B9862E] disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(217,169,78,0.2)]"
            >
              {joinLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Locating room...</span>
                </>
              ) : (
                <>
                  <span>Join Auction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
