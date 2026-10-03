"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClientAuction, ClientBid } from "@/lib/types";
import { SocketProvider } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { ItemSpotlight } from "@/components/ItemSpotlight";
import { TeamRail } from "@/components/TeamRail";
import { BidTicker } from "@/components/BidTicker";
import { InviteModal } from "@/components/InviteModal";
import { soundEngine } from "@/lib/sound-effects";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Radio, QrCode, Loader2, AlertCircle, ArrowLeft, Volume2, VolumeX, Tv } from "lucide-react";

export default function SpectatorWatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = params.id as string;
  const tokenParam = searchParams.get("token");

  const { user } = useAuth();
  const { addToast } = useToast();

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // Validate Spectator Invite & Establish Session
  const validateInvite = useCallback(async () => {
    try {
      const inviteUrl = `/api/auctions/${auctionId}/invites${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`;
      const res = await fetch(inviteUrl);
      const data = await res.json();

      if (res.ok && data.valid) {
        setGuestToken(data.guestToken || null);
        setInviteError(null);
      } else if (!user) {
        setInviteError(data.error || "Invalid or expired invitation");
      }
    } catch (err: any) {
      if (!user) {
        setInviteError(err.message || "Failed to validate invite");
      }
    }
  }, [auctionId, tokenParam, user]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) throw new Error("Failed to load auction");
      const data = await res.json();
      setAuction(data.auction);

      if (data.auction?.activeItemId) {
        const bidsRes = await fetch(`/api/auctions/${auctionId}/bids?itemId=${data.auction.activeItemId}`);
        if (bidsRes.ok) {
          const bidsData = await bidsRes.json();
          setBids((currentBids) => {
            const fetchedBids: ClientBid[] = bidsData.bids || [];
            const fetchedIds = new Set(fetchedBids.map((b) => b.id));
            const inFlightBids = currentBids.filter(
              (b) => !fetchedIds.has(b.id) && b.itemId === data.auction.activeItemId
            );
            return [...fetchedBids, ...inFlightBids].sort((a, b) => b.amount - a.amount);
          });
        }
      } else {
        setBids([]);
        setSecondsRemaining(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    validateInvite();
    fetchState();
    setSoundOn(soundEngine.isEnabled());
  }, [validateInvite, fetchState]);

  const handleSocketEvent = useCallback(
    (eventName: string, data: any) => {
      switch (eventName) {
        case "reconnected_sync":
          fetchState();
          break;
        case "auction_started":
        case "auction_paused":
        case "auction_resumed":
        case "auction_completed":
          setAuction((prev) => (prev ? { ...prev, status: data.status } : null));
          break;
        case "player_started":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, ...data.item, status: "ACTIVE" as any } : i
            );
            return { ...prev, activeItemId: data.item.id, items: updatedItems };
          });
          setBids([]);
          setSecondsRemaining(data.secondsRemaining || 15);
          soundEngine.playNewBid();
          addToast(`Lot #${data.item.orderIndex} ${data.item.name} now on spotlight`, "brass");
          break;
        case "bid_placed":
          setBids((prev) => {
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            return [data.bid, ...prev];
          });
          setSecondsRemaining(data.secondsRemaining !== undefined ? data.secondsRemaining : 15);
          soundEngine.playNewBid();
          break;
        case "timer_updated":
          setSecondsRemaining(data.secondsRemaining);
          if (data.secondsRemaining <= 4 && data.secondsRemaining > 0) {
            soundEngine.playTimerWarning();
          }
          break;
        case "player_sold":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) => (i.id === data.item.id ? data.item : i));
            const updatedParticipants = prev.participants.map((p) =>
              p.id === data.updatedParticipant.id ? data.updatedParticipant : p
            );
            return { ...prev, activeItemId: null, items: updatedItems, participants: updatedParticipants };
          });
          setSecondsRemaining(null);
          soundEngine.playSoldFanfare();
          addToast(`Sold to ${data.updatedParticipant.teamName}`, "success");
          break;
        case "player_unsold":
        case "player_final_unsold":
          setAuction((prev) => {
            if (!prev) return null;
            const finalStatus = data.isFinal || data.item?.status === "FINAL_UNSOLD" ? "FINAL_UNSOLD" : "UNSOLD";
            const updatedItems = prev.items.map((i) => (i.id === data.item.id ? { ...i, ...data.item, status: finalStatus as any } : i));
            return { ...prev, activeItemId: null, items: updatedItems };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          break;
        case "participant_updated":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedParticipants = prev.participants.map((p) =>
              p.id === data.participant.id ? data.participant : p
            );
            return { ...prev, participants: updatedParticipants };
          });
          break;
        default:
          break;
      }
    },
    [fetchState, addToast]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
        <span className="text-[13px] text-[#8B98A8]">Connecting to Spectator Stream...</span>
      </div>
    );
  }

  if (inviteError && !user) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 bg-[#0D131C] border border-[#202B38] rounded-[4px] max-w-md w-full space-y-4">
          <AlertCircle className="w-10 h-10 text-[#FF5C5C] mx-auto" />
          <h2 className="text-[20px] font-bold text-[#F5F7FA]">Spectator Stream Unavailable</h2>
          <p className="text-[#8B98A8] text-[13px]">{inviteError}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex items-center justify-center">
        <p>Auction not found</p>
      </div>
    );
  }

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const highestBid = bids[0];
  const teamA = auction.participants[0] || null;
  const teamB = auction.participants[1] || null;

  return (
    <SocketProvider auctionId={auctionId} guestToken={guestToken} onEvent={handleSocketEvent}>
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
        {/* Top Header */}
        <header className="h-14 px-4 sm:px-6 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-[#8B98A8] hover:text-[#F5F7FA] text-[13px]">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-4 w-px bg-[#202B38]" />
            <span className="font-hero text-[18px] font-bold text-[#F5F7FA] tracking-wide truncate max-w-[160px] sm:max-w-none">
              {auction.name}
            </span>
            <LiveStatusBadge status={auction.status} />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/auction/${auction.id}/bigscreen`}
              className="px-3 py-1.5 rounded-[4px] bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#E5AE3F] text-[12px] font-medium flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Big Screen TV</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                const s = soundEngine.toggle();
                setSoundOn(s);
              }}
              className="p-1.5 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA]"
              title="Toggle Audio Chimes"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#28D17C]" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Stadium Stage Layout */}
        <main className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Team A Rail (3 cols) */}
            <div className="hidden lg:block lg:col-span-3 h-full">
              <TeamRail participant={teamA} items={auction.items} variant="team-a" />
            </div>

            {/* Dominant Spotlight (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <ItemSpotlight
                item={activeItem}
                currentHighestBid={highestBid?.amount || 0}
                highestBidderName={highestBid?.bidder?.name}
                highestBidderTeam={highestBid?.bidder?.participant?.teamName || (highestBid as any)?.teamName}
                secondsRemaining={secondsRemaining}
                timerDuration={15}
                isPaused={auction.status === "PAUSED"}
              />
            </div>

            {/* Team B Rail (3 cols) */}
            <div className="hidden lg:block lg:col-span-3 h-full">
              <TeamRail participant={teamB} items={auction.items} variant="team-b" />
            </div>

            {/* Mobile Rail stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              <TeamRail participant={teamA} items={auction.items} variant="team-a" />
              <TeamRail participant={teamB} items={auction.items} variant="team-b" />
            </div>
          </div>
        </main>

        <BidTicker bids={bids} />

        <InviteModal
          auction={auction}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      </div>
    </SocketProvider>
  );
}
