"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { LiveStatusBadge } from "./LiveStatusBadge";
import { useAuctionSocket } from "./SocketContext";
import { InviteModal } from "./InviteModal";
import { soundEngine } from "@/lib/sound-effects";
import { Users, Wifi, WifiOff, FileSpreadsheet, Share2, BarChart2, History, Tv, Volume2, VolumeX } from "lucide-react";

export function AuctionHeader({ auction }: { auction: ClientAuction }) {
  const { connected, spectatorCount } = useAuctionSocket();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(soundEngine.isEnabled());
  }, []);

  const handleToggleSound = () => {
    const newState = soundEngine.toggle();
    setSoundOn(newState);
  };

  return (
    <>
      <header className="h-14 px-3 sm:px-6 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#EDEAE1] hover:text-white font-semibold text-[14px] sm:text-[15px]">
            <span className="w-2.5 h-2.5 bg-[#C7A046] rounded-[2px]" />
            <span className="truncate max-w-[140px] sm:max-w-none">{auction.name}</span>
          </Link>
          <LiveStatusBadge status={auction.status} />
          {auction.roomCode && (
            <span className="hidden xl:inline text-[12px] font-mono text-[#8B939A] bg-[#10151A] px-2 py-0.5 rounded-[2px] border border-[#2B343C]">
              {auction.roomCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[13px] text-[#8B939A]">
          {/* Spectator Count */}
          <div className="flex items-center gap-1.5 pr-1.5">
            <Users className="w-3.5 h-3.5 text-[#8B939A]" />
            <span className="font-hero text-[15px] font-bold text-[#EDEAE1] tabular-nums">{spectatorCount}</span>
            <span className="hidden md:inline">watching</span>
          </div>

          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 border-l border-[#2B343C]">
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[#EDEAE1] hidden lg:inline">Live sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300">Reconnecting</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-[4px] border text-[12px] flex items-center gap-1.5 transition-colors ${
              soundOn
                ? "bg-[#10151A] border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A]"
                : "bg-[#10151A] border-[#2B343C] text-[#8B939A] hover:text-[#EDEAE1]"
            }`}
            title={soundOn ? "Mute live auction audio" : "Enable live auction audio"}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#C7A046]" /> : <VolumeX className="w-3.5 h-3.5 text-[#8B939A]" />}
            <span className="hidden lg:inline">{soundOn ? "Sound on" : "Sound off"}</span>
          </button>

          {/* Big Screen Presentation Mode */}
          <Link
            href={`/auction/${auction.id}/bigscreen`}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-[4px] bg-[#10151A] border border-[#2B343C] text-[#C7A046] hover:border-[#C7A046] text-[13px] font-medium transition-colors"
            title="Launch Stadium TV / Big Screen Broadcast View"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Big screen</span>
          </Link>

          {/* Invite & QR */}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-[4px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:text-white hover:border-[#8B939A] text-[13px] font-medium transition-colors"
            title="Invite Bidders & Spectators via Link or QR Code"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* War Room */}
          <Link
            href={`/auction/${auction.id}/war-room`}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:text-white hover:border-[#8B939A] text-[13px] font-medium transition-colors"
            title="War Room & Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#3E7CB1]" />
            <span>War room</span>
          </Link>

          {/* Export / Ledger */}
          <Link
            href={`/auction/${auction.id}/results`}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-[4px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:text-white hover:border-[#8B939A] text-[13px] font-medium transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C7A046]" />
            <span className="hidden sm:inline">Ledger</span>
          </Link>
        </div>
      </header>

      {/* Invite Modal */}
      <InviteModal
        auction={auction}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
