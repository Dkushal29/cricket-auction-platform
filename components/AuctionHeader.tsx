"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { LiveStatusBadge } from "./LiveStatusBadge";
import { useAuctionSocket } from "./SocketContext";
import { InviteModal } from "./InviteModal";
import { soundEngine } from "@/lib/sound-effects";
import { Users, Wifi, WifiOff, FileSpreadsheet, Share2, BarChart2, Tv, Volume2, VolumeX, Settings } from "lucide-react";

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
      <header className="h-14 px-3 sm:px-6 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#F5F7FA] hover:text-[#E5AE3F] font-bold text-[14px] sm:text-[15px] transition-colors">
            <span className="text-[16px]">🏏</span>
            <span className="truncate max-w-[140px] sm:max-w-none font-hero text-[18px] tracking-wide">{auction.name}</span>
          </Link>
          <LiveStatusBadge status={auction.status} />
          {auction.roomCode && (
            <span className="hidden xl:inline text-[11px] font-mono text-[#8B98A8] bg-[#070B12] px-2 py-0.5 rounded-[2px] border border-[#202B38]">
              ROOM: {auction.roomCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-[13px] text-[#8B98A8]">
          {/* Spectator Count */}
          <div className="flex items-center gap-1.5 pr-1">
            <Users className="w-3.5 h-3.5 text-[#8B98A8]" />
            <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums">{spectatorCount}</span>
            <span className="hidden md:inline text-[12px]">spectators</span>
          </div>

          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 border-l border-[#202B38]">
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#28D17C]" />
                <span className="text-[#F5F7FA] text-[11px] hidden lg:inline font-mono">SYNC</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#FF5C5C]" />
                <span className="text-[#FF5C5C] text-[11px] font-mono">RECONNECTING</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-[3px] border text-[12px] flex items-center gap-1.5 transition-colors ${
              soundOn
                ? "bg-[#070B12] border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8]"
                : "bg-[#070B12] border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA]"
            }`}
            title={soundOn ? "Mute sound" : "Enable sound"}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#28D17C]" /> : <VolumeX className="w-3.5 h-3.5 text-[#8B98A8]" />}
            <span className="hidden lg:inline">{soundOn ? "Audio On" : "Muted"}</span>
          </button>

          {/* Auctioneer Control Deck Link */}
          <Link
            href={`/auction/${auction.id}/control`}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#E5AE3F] text-[12px] font-medium transition-colors"
            title="Auctioneer Command Deck"
          >
            <Settings className="w-3.5 h-3.5 text-[#E5AE3F]" />
            <span>Deck</span>
          </Link>

          {/* Big Screen Presentation */}
          <Link
            href={`/auction/${auction.id}/bigscreen`}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#E5AE3F] hover:border-[#E5AE3F] text-[12px] font-medium transition-colors"
            title="Stadium TV Broadcast View"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Big Screen</span>
          </Link>

          {/* Invite Modal */}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] text-[12px] font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-[#E5AE3F]" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* Ledger */}
          <Link
            href={`/auction/${auction.id}/results`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] text-[12px] font-medium transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#4DA3FF]" />
            <span>Ledger</span>
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
