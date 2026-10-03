"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClientAuction, ClientBid, ClientItem, ClientParticipant } from "@/lib/types";
import { SocketProvider } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { soundEngine } from "@/lib/sound-effects";
import {
  Clock,
  Shield,
  ShieldCheck,
  Award,
  ArrowUp,
  Loader2,
  Users,
  Trophy,
  ArrowLeft,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function DedicatedBidderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = params.id as string;
  const tokenParam = searchParams.get("token");
  const teamParam = searchParams.get("team");

  const { user, loading: authLoading, token: authToken } = useAuth();
  const { addToast } = useToast();

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidSnap, setBidSnap] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  const [guestSession, setGuestSession] = useState<{
    role: string;
    teamSlot?: string;
    participantId?: string;
    guestToken?: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Validate Invite Token & Establish Guest Session
  const validateInvite = useCallback(async () => {
    try {
      const inviteUrl = `/api/auctions/${auctionId}/invites${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`;
      const res = await fetch(inviteUrl);
      const data = await res.json();

      if (res.ok && data.valid && data.role === "BIDDER") {
        setGuestSession({
          role: data.role,
          teamSlot: data.teamSlot,
          participantId: data.participantId,
          guestToken: data.guestToken,
        });
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

  // Authoritative State Fetcher
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

  // Handle Socket Events
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
          addToast(`Lot #${data.item.orderIndex} ${data.item.name} now on stage`, "brass");
          break;
        case "bid_placed":
          setBids((prev) => {
            const previousHighest = prev[0];
            const isOutbid =
              previousHighest &&
              (previousHighest.bidderId === user?.id || (guestSession?.participantId && previousHighest.bidderId === guestSession.participantId)) &&
              data.bid.bidderId !== user?.id &&
              data.bid.bidderId !== guestSession?.participantId;
            if (isOutbid) {
              soundEngine.playOutbid();
              addToast(`OUTBID! Current high bid is ${formatExactINR(data.bid.amount)}`, "error");
            } else {
              soundEngine.playNewBid();
            }
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            return [data.bid, ...prev];
          });
          setSecondsRemaining(data.secondsRemaining !== undefined ? data.secondsRemaining : 15);
          setBidSnap(true);
          setTimeout(() => setBidSnap(false), 240);
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
          addToast(`Sold to ${data.updatedParticipant.teamName} for ${formatExactINR(data.item.winningPrice)}`, "success");
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
          addToast(`${data.item?.name || "Player"} passed unsold`, "error");
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
    [fetchState, addToast, user?.id, guestSession?.participantId]
  );

  // Send Bid Request
  const handlePlaceBid = async (amount: number) => {
    if (!activeItem) return;
    if (amount > remainingBudget) {
      addToast(`Bid of ${formatINR(amount)} exceeds your purse of ${formatINR(remainingBudget)}`, "error");
      return;
    }
    if (amount < minRequiredBid) {
      addToast(`Minimum bid required is ${formatExactINR(minRequiredBid)}`, "error");
      return;
    }

    setBidLoading(true);
    try {
      const activeToken = authToken || guestSession?.guestToken;
      const res = await fetch(`/api/items/${activeItem.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Bid rejected", "error");
      } else {
        addToast(`Bid placed: ${formatExactINR(amount)}`, "success");
        setCustomBidAmount("");
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setBidLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
        <span className="text-[13px] text-[#8B98A8]">Connecting to Bidder Console...</span>
      </div>
    );
  }

  if (inviteError && !user) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 bg-[#0D131C] border border-[#202B38] rounded-[4px] max-w-md w-full space-y-4">
          <Shield className="w-10 h-10 text-[#FF5C5C] mx-auto" />
          <h2 className="text-[20px] font-bold text-[#F5F7FA]">Invitation Expired or Invalid</h2>
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

  // Derive Self Participant
  let selfParticipant: ClientParticipant | null = null;
  if (guestSession?.participantId) {
    selfParticipant = auction.participants.find((p) => p.id === guestSession.participantId) || null;
  }
  if (!selfParticipant && guestSession?.teamSlot) {
    selfParticipant = guestSession.teamSlot === "B" ? auction.participants[1] : auction.participants[0];
  }
  if (!selfParticipant && user) {
    selfParticipant = auction.participants.find((p) => p.userId === (teamParam || user.id)) || null;
  }
  if (!selfParticipant) {
    selfParticipant = auction.participants[0] || null;
  }

  const wonItems = auction.items.filter((i) => i.winnerId === selfParticipant?.userId && i.status === "SOLD");
  const minIncrement = auction.minimumBidIncrement || 500000;
  const minRequiredBid = highestBid?.amount
    ? highestBid.amount + minIncrement
    : activeItem?.basePrice || minIncrement;

  const remainingBudget = selfParticipant?.remainingBudget || 0;
  const isCurrentLeader =
    (user?.id && highestBid?.bidderId === user.id) ||
    (selfParticipant?.userId && highestBid?.bidderId === selfParticipant.userId);

  const isAuctionLive = auction.status === "LIVE";
  const isItemActive = activeItem?.status === "ACTIVE";

  // Quick increment amounts
  const quickIncrements = [1000000, 2500000, 5000000]; // +10L, +25L, +50L

  return (
    <SocketProvider auctionId={auctionId} guestToken={guestSession?.guestToken} onEvent={handleSocketEvent}>
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
        <RoleSwitcherBar />

        {/* Minimal Broadcast Header */}
        <header className="h-14 px-4 sm:px-6 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/auction/${auction.id}`} className="flex items-center gap-2 text-[#8B98A8] hover:text-[#F5F7FA] text-[13px]">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-[#202B38]" />
            <span className="font-hero text-[18px] font-bold text-[#F5F7FA] tracking-wide truncate max-w-[160px] sm:max-w-none">
              {auction.name}
            </span>
            <LiveStatusBadge status={auction.status} />
          </div>

          <div className="flex items-center gap-3">
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

        {/* Main Fast Bidding Console */}
        <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col justify-center space-y-5">
          {/* ================================================== */}
          {/* CURRENT PLAYER HERO CARD */}
          {/* ================================================== */}
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#202B38] pb-3 text-[12px]">
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#E5AE3F]">
                CURRENT PLAYER
              </span>
              {activeItem && (
                <span className="font-mono text-[#8B98A8] bg-[#070B12] px-2 py-0.5 rounded-[2px] border border-[#202B38]">
                  LOT #{activeItem.orderIndex}
                </span>
              )}
            </div>

            {activeItem ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Player Identity */}
                <div className="md:col-span-6 flex items-center gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[4px] bg-[#070B12] border border-[#202B38] overflow-hidden shrink-0 flex items-center justify-center">
                    {activeItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeItem.imageUrl}
                        alt={activeItem.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <Award className="w-10 h-10 text-[#8B98A8]" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h1 className="font-hero text-[32px] sm:text-[42px] font-black text-[#F5F7FA] leading-tight tracking-wide">
                      {activeItem.name}
                    </h1>
                    <div className="text-[13px] text-[#8B98A8] space-y-0.5">
                      <p className="font-semibold text-[#F5F7FA]">{activeItem.category}</p>
                      <p>Base Price: <strong className="text-[#E5AE3F] font-hero tabular-nums">{formatExactINR(activeItem.basePrice)}</strong></p>
                    </div>
                  </div>
                </div>

                {/* CURRENT BID & TIME LEFT */}
                <div className="md:col-span-6 flex flex-col md:items-end justify-center md:text-right space-y-2 border-t md:border-t-0 md:border-l border-[#202B38] pt-4 md:pt-0 md:pl-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B98A8] block">
                      CURRENT BID
                    </span>
                    <div
                      className={`font-hero text-[54px] sm:text-[72px] font-black text-[#E5AE3F] tabular-nums leading-none tracking-tight transition-transform ${
                        bidSnap ? "animate-bid-snap" : ""
                      }`}
                    >
                      {highestBid ? formatExactINR(highestBid.amount) : formatExactINR(activeItem.basePrice)}
                    </div>
                  </div>

                  {/* TIME LEFT 00:07 */}
                  {secondsRemaining !== null && (
                    <div className="flex items-center md:justify-end gap-2 text-[13px]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8]">TIME LEFT:</span>
                      <span
                        className={`font-hero text-[24px] font-bold tabular-nums ${
                          secondsRemaining <= 4 ? "text-[#FF5C5C] animate-pulse" : "text-[#F5F7FA]"
                        }`}
                      >
                        00:{String(secondsRemaining).padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  {/* Current Leader Tag */}
                  {isCurrentLeader ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#28D17C]/15 border border-[#28D17C]/40 text-[#28D17C] text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>YOUR BID IS CURRENTLY LEADING</span>
                    </div>
                  ) : highestBid ? (
                    <div className="text-[12px] text-[#8B98A8]">
                      Leading: <strong className="text-[#F5F7FA]">{highestBid.bidder?.participant?.teamName || "Team"}</strong>
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#8B98A8]">Awaiting opening bid</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#8B98A8] space-y-2">
                <Clock className="w-8 h-8 mx-auto text-[#202B38]" />
                <p className="text-[14px]">No player currently on stage.</p>
                <p className="text-[12px] text-[#8B98A8]">Stand by for the auctioneer to spotlight the next lot.</p>
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* LARGE BIDDING CONTROLS: [ +₹10L ] [ +₹25L ] [ +₹50L ] & [ PLACE BID ] */}
          {/* ================================================== */}
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 space-y-4 shadow-xl">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block mb-2.5">
                Quick Bidding Controls
              </span>
              <div className="grid grid-cols-3 gap-3">
                {quickIncrements.map((inc) => {
                  const calculated = (highestBid?.amount || activeItem?.basePrice || 0) + inc;
                  const disabled = !isAuctionLive || !isItemActive || remainingBudget < calculated || bidLoading;

                  return (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handlePlaceBid(calculated)}
                      disabled={disabled}
                      className={`min-h-[58px] p-3 rounded-[4px] border text-center transition-all flex flex-col justify-center items-center active:scale-[0.98] select-none ${
                        disabled
                          ? "bg-[#070B12] border-[#202B38] text-[#8B98A8] opacity-40 cursor-not-allowed"
                          : "bg-[#121A24] border-[#202B38] hover:border-[#E5AE3F] hover:bg-[#1A2330] text-[#F5F7FA]"
                      }`}
                    >
                      <span className="text-[12px] font-bold text-[#8B98A8] block">
                        +{formatINR(inc)}
                      </span>
                      <span className="font-hero text-[18px] font-black tabular-nums text-[#E5AE3F]">
                        {formatINR(calculated)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary High-Impact [ PLACE BID ] Button */}
            <button
              type="button"
              onClick={() => handlePlaceBid(minRequiredBid)}
              disabled={!isAuctionLive || !isItemActive || remainingBudget < minRequiredBid || bidLoading}
              className={`w-full min-h-[56px] rounded-[4px] font-black text-[16px] tracking-wider uppercase transition-all flex items-center justify-center gap-2 select-none shadow-[0_0_20px_rgba(229,174,63,0.2)] ${
                isAuctionLive && isItemActive && remainingBudget >= minRequiredBid && !bidLoading
                  ? "bg-[#E5AE3F] text-[#070B12] hover:bg-[#F4C65E] active:scale-[0.99] cursor-pointer"
                  : "bg-[#121A24] border border-[#202B38] text-[#8B98A8] cursor-not-allowed"
              }`}
            >
              {bidLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>TRANSMITTING BID...</span>
                </>
              ) : !isAuctionLive ? (
                "AUCTION PAUSED"
              ) : !isItemActive ? (
                "AWAITING NEXT LOT"
              ) : remainingBudget < minRequiredBid ? (
                "PURSE EXCEEDED"
              ) : (
                <>
                  <ArrowUp className="w-5 h-5 stroke-[3]" />
                  <span>PLACE BID — {formatExactINR(minRequiredBid)}</span>
                </>
              )}
            </button>
          </div>

          {/* ================================================== */}
          {/* YOUR TEAM STATUS TELEMETRY CARD */}
          {/* ================================================== */}
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-5 space-y-4">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
              Team Franchise Telemetry
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
              {/* Your Team */}
              <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[11px] text-[#8B98A8] block uppercase">Your Team</span>
                <span className="font-bold text-[#F5F7FA] text-[15px] truncate block mt-0.5">
                  {selfParticipant?.teamName || "Franchise"}
                </span>
              </div>

              {/* Your Current Purse */}
              <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[11px] text-[#8B98A8] block uppercase">Current Purse</span>
                <span className="font-hero text-[18px] font-bold text-[#E5AE3F] tabular-nums block mt-0.5">
                  {formatINR(remainingBudget)}
                </span>
              </div>

              {/* Maximum Affordable Bid */}
              <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[11px] text-[#8B98A8] block uppercase">Max Bid Ceiling</span>
                <span className="font-hero text-[18px] font-bold text-[#F5F7FA] tabular-nums block mt-0.5">
                  {formatINR(Math.max(0, remainingBudget - 1000000))}
                </span>
              </div>

              {/* Players Bought */}
              <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38]">
                <span className="text-[11px] text-[#8B98A8] block uppercase">Players Bought</span>
                <span className="font-hero text-[18px] font-bold text-[#28D17C] tabular-nums block mt-0.5">
                  {wonItems.length} Acquired
                </span>
              </div>
            </div>

            {/* Purchased Players Strip */}
            {wonItems.length > 0 && (
              <div className="pt-2 border-t border-[#202B38]">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8B98A8] block mb-2">
                  Acquired Roster:
                </span>
                <div className="flex flex-wrap gap-2">
                  {wonItems.map((p) => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[12px] text-[#F5F7FA]"
                    >
                      {p.name} <strong className="text-[#E5AE3F] font-hero tabular-nums">({formatINR(p.winningPrice || 0)})</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
