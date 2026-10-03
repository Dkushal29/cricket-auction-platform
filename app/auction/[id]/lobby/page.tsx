"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClientAuction } from "@/lib/types";
import { SocketProvider, useAuctionSocket } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { InviteModal } from "@/components/InviteModal";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { ArrowLeft, Play, QrCode, Share2, Users, Shield, CheckCircle2, Circle, Radio, Loader2 } from "lucide-react";

function LobbyContent({ auction }: { auction: ClientAuction }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const { connected, spectatorCount, bidderAReady, bidderBReady, allBiddersReady } = useAuctionSocket();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const teamA = auction.participants[0];
  const teamB = auction.participants[1];

  const isAuctioneer = user?.role === "AUCTIONEER";

  const handleStartAuction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auctions/${auction.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Failed to start auction", "error");
      } else {
        addToast("Auction started! Entering arena.", "success");
        router.push(`/auction/${auction.id}`);
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const isTeamAReady = bidderAReady || auction.status === "READY";
  const isTeamBReady = bidderBReady || auction.status === "READY";

  return (
    <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
      {/* Header card */}
      <div className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202B38] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-[#E5AE3F] rounded-[2px]" />
              <h1 className="text-[22px] font-bold text-[#F5F7FA]">{auction.name}</h1>
            </div>
            <p className="text-[13px] text-[#8B98A8]">
              Room code: <strong className="text-[#F5F7FA] tracking-wider">{auction.roomCode}</strong> &bull; Status: <strong className="text-[#E5AE3F] font-semibold">{auction.status}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-1.5 rounded-[2px] bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#E5AE3F]" />
              <span>Share invites & QR</span>
            </button>
          </div>
        </div>

        <p className="text-[14px] text-[#8B98A8]">
          {auction.description || "Official live cricket player auction lobby."}
        </p>
      </div>

      {/* Participant Readiness Deck */}
      <div className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4">
        <div className="flex items-center justify-between border-b border-[#202B38] pb-2">
          <h2 className="text-[15px] font-bold text-[#F5F7FA]">
            Connected participants readiness
          </h2>
          <span className="text-[12px] text-[#8B98A8]">
            {spectatorCount} spectator(s) connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Team A */}
          <div className="p-4 rounded-[2px] bg-[#121A24] border border-[#202B38] space-y-2" style={{ borderLeft: "3px solid #3E7CB1" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#3E7CB1] font-bold block">Team Alpha</span>
                <h3 className="text-[15px] font-bold text-[#F5F7FA]">{teamA?.teamName || "Team Alpha"}</h3>
              </div>
              {isTeamAReady ? (
                <div className="flex items-center gap-1 text-[12px] text-[#28D17C]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[12px] text-[#8B98A8]">
                  <Circle className="w-3.5 h-3.5" />
                  <span>Waiting</span>
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#8B98A8]">
              Purse: <strong className="text-[#F5F7FA] font-hero tabular-nums">{formatINR(teamA?.initialBudget || 0)}</strong>
            </div>
          </div>

          {/* Team B */}
          <div className="p-4 rounded-[2px] bg-[#121A24] border border-[#202B38] space-y-2" style={{ borderLeft: "3px solid #B85C38" }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#B85C38] font-bold block">Team Beta</span>
                <h3 className="text-[15px] font-bold text-[#F5F7FA]">{teamB?.teamName || "Team Beta"}</h3>
              </div>
              {isTeamBReady ? (
                <div className="flex items-center gap-1 text-[12px] text-[#28D17C]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[12px] text-[#8B98A8]">
                  <Circle className="w-3.5 h-3.5" />
                  <span>Waiting</span>
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#8B98A8]">
              Purse: <strong className="text-[#F5F7FA] font-hero tabular-nums">{formatINR(teamB?.initialBudget || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Rules Brief */}
        <div className="p-3.5 rounded-[2px] bg-[#121A24] border border-[#202B38] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div>
            <span className="text-[#8B98A8] block">Min increment</span>
            <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">{formatINR(auction.minimumBidIncrement)}</span>
          </div>
          <div>
            <span className="text-[#8B98A8] block">Lot timer</span>
            <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">{auction.timerDuration}s</span>
          </div>
          <div>
            <span className="text-[#8B98A8] block">Anti-snipe</span>
            <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">+{auction.antiSnipeExtension}s</span>
          </div>
          <div>
            <span className="text-[#8B98A8] block">Total lots</span>
            <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">{auction.items?.length || 0} players</span>
          </div>
        </div>

        {/* Start Auction Action (Auctioneer) */}
        {isAuctioneer ? (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartAuction}
              disabled={loading}
              className="px-6 py-3 rounded-[2px] bg-[#E5AE3F] text-[#070B12] font-bold text-[14px] hover:bg-[#F4C65E] transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? "Starting auction..." : auction.status === "READY" ? "Launch live arena" : "Start live auction"}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-[2px] bg-[#121A24] border border-[#202B38] text-[13px] text-[#8B98A8] text-center">
            {auction.status === "READY"
              ? "All bidders ready! Waiting for the auctioneer to launch..."
              : "Waiting for all bidders to connect in lobby..."}
          </div>
        )}
      </div>

      <InviteModal
        auction={auction}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}

export default function LobbyPage() {
  const params = useParams();
  const auctionId = params.id as string;
  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.auction) setAuction(data.auction);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading || !auction) {
    return (
      <div className="min-h-screen bg-[#070B12] flex items-center justify-center text-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
      </div>
    );
  }

  return (
    <SocketProvider auctionId={auctionId}>
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between">
        <RoleSwitcherBar />
        <LobbyContent auction={auction} />
        <footer className="py-4 border-t border-[#202B38] text-center text-[12px] text-[#8B98A8]">
          BIDXI Cricket Auction Lobby &bull; Room Code: {auction.roomCode}
        </footer>
      </div>
    </SocketProvider>
  );
}
