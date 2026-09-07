"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClientAuction, ClientBid } from "@/lib/types";
import { SocketProvider, useAuctionSocket } from "@/components/SocketContext";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { soundEngine } from "@/lib/sound-effects";
import { Loader2, Users, Volume2, VolumeX, Radio, Trophy, Maximize2 } from "lucide-react";

export default function BigScreenBroadcastPage() {
  const params = useParams();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [soldAnimation, setSoldAnimation] = useState<{
    itemName: string;
    price: number;
    winnerTeam: string;
  } | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) throw new Error("Auction not found");
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchState();
    setSoundEnabled(soundEngine.isEnabled());
  }, [fetchState]);

  const handleToggleSound = () => {
    const next = soundEngine.toggle();
    setSoundEnabled(next);
  };

  const handleSocketEvent = useCallback(
    (eventName: string, data: any) => {
      switch (eventName) {
        case "reconnected_sync":
          // Authoritative state reconciliation upon socket reconnection
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
              i.id === data.item.id ? { ...i, status: "ACTIVE" as any } : i
            );
            return {
              ...prev,
              activeItemId: data.item.id,
              activeItem: data.item,
              items: updatedItems,
            };
          });
          setBids([]);
          setSecondsRemaining(auction?.timerDuration || 30);
          setSoldAnimation(null);
          break;

        case "bid_placed":
          setBids((prev) => [data.bid, ...prev]);
          soundEngine.playNewBid();
          break;

        case "timer_updated":
          setSecondsRemaining(data.secondsRemaining);
          if (data.secondsRemaining <= 5 && data.secondsRemaining > 0) {
            soundEngine.playTimerWarning();
          }
          break;

        case "player_sold":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? data.item : i
            );
            const updatedParticipants = prev.participants.map((p) =>
              p.id === data.updatedParticipant.id ? data.updatedParticipant : p
            );
            return {
              ...prev,
              activeItemId: null,
              activeItem: null,
              items: updatedItems,
              participants: updatedParticipants,
            };
          });
          setSecondsRemaining(null);
          soundEngine.playSoldFanfare();
          setSoldAnimation({
            itemName: data.item.name,
            price: data.item.winningPrice || 0,
            winnerTeam: data.updatedParticipant.teamName,
          });
          break;

        case "player_unsold":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, status: "UNSOLD" as any } : i
            );
            return { ...prev, activeItemId: null, activeItem: null, items: updatedItems };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          break;

        case "reconnected_sync":
          fetchState();
          break;

        default:
          break;
      }
    },
    [auction?.timerDuration, fetchState]
  );

  if (loading || !auction) {
    return (
      <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#C7A046]" />
        <span className="text-[16px] text-[#8B939A]">Loading Big-Screen Stadium Broadcast...</span>
      </div>
    );
  }

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const highestBid = bids[0];
  const teamA = auction.participants[0] || null;
  const teamB = auction.participants[1] || null;

  return (
    <SocketProvider auctionId={auctionId} onEvent={handleSocketEvent}>
      <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between overflow-hidden select-none">
        {/* Top Scoreboard Strip */}
        <header className="h-16 px-6 sm:px-12 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/auction/${auction.id}`} className="flex items-center gap-2 text-[#EDEAE1] font-bold text-[18px]">
              <span className="w-3.5 h-3.5 bg-[#C7A046] rounded-[2px]" />
              <span>{auction.name}</span>
            </Link>
            <LiveStatusBadge status={auction.status} isConfigLocked={auction.isConfigLocked} />
          </div>

          <div className="flex items-center gap-6 text-[14px]">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A] transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-[#8B939A]" />}
              <span className="text-[12px]">{soundEnabled ? "Sound on" : "Sound off"}</span>
            </button>

            {/* Exit Big Screen */}
            <Link
              href={`/auction/${auction.id}`}
              className="px-3 py-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#8B939A] hover:text-[#EDEAE1] text-[12px]"
            >
              Exit big screen
            </Link>
          </div>
        </header>

        {/* Central Presentation Stage */}
        <main className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto p-6 sm:p-10 space-y-8">
          {soldAnimation ? (
            /* Cinematic SOLD Moment */
            <div className="p-12 rounded-[4px] bg-[#1B2229] border-2 border-[#C7A046] text-center space-y-4 animate-in fade-in duration-300">
              <span className="inline-block px-4 py-1 rounded-[2px] bg-[#C7A046] text-[#10151A] font-bold text-[16px] tracking-wider uppercase">
                LOT FINALIZED & SOLD
              </span>
              <h2 className="text-[42px] sm:text-[64px] font-bold text-[#EDEAE1]">
                {soldAnimation.itemName}
              </h2>
              <div className="font-hero text-[72px] sm:text-[110px] font-bold text-[#C7A046] tabular-nums leading-none">
                {formatExactINR(soldAnimation.price)}
              </div>
              <div className="text-[24px] sm:text-[32px] font-bold text-[#EDEAE1] pt-2">
                Acquired by <span className="text-[#C7A046]">{soldAnimation.winnerTeam}</span>
              </div>
            </div>
          ) : activeItem ? (
            /* Active Lot Hero Broadcast */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Player Card */}
              <div className="lg:col-span-5 bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-6 space-y-4 text-center">
                <div className="w-48 h-48 sm:w-60 sm:h-60 mx-auto rounded-[4px] bg-[#10151A] border border-[#2B343C] overflow-hidden flex items-center justify-center">
                  {activeItem.imageUrl ? (
                    <img
                      src={activeItem.imageUrl}
                      alt={activeItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="font-hero text-[72px] font-bold text-[#8B939A]">
                      #{activeItem.orderIndex}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[13px] text-[#C7A046] uppercase tracking-wider font-semibold">
                    {activeItem.category} · Lot #{activeItem.orderIndex}
                  </span>
                  <h2 className="text-[28px] sm:text-[36px] font-bold text-[#EDEAE1] mt-0.5">
                    {activeItem.name}
                  </h2>
                  <span className="text-[14px] text-[#8B939A] block mt-1">
                    Base price: {formatINR(activeItem.basePrice)}
                  </span>
                </div>
              </div>

              {/* Center & Right Telemetry Hero */}
              <div className="lg:col-span-7 bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-8 space-y-6 text-center">
                {/* Timer Clock */}
                {secondsRemaining !== null && (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-[14px] text-[#8B939A] uppercase tracking-wider">Clock</span>
                    <div
                      className={`font-hero text-[48px] sm:text-[56px] font-bold tabular-nums ${
                        secondsRemaining <= 5 ? "text-red-400 animate-pulse" : "text-[#EDEAE1]"
                      }`}
                    >
                      00:{String(secondsRemaining).padStart(2, "0")}
                    </div>
                    {secondsRemaining <= 5 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-[2px] bg-red-950/80 border border-red-800 text-red-300">
                        Anti-snipe active
                      </span>
                    )}
                  </div>
                )}

                {/* Hero 140px Brass Bid Number */}
                <div className="py-2">
                  <span className="text-[14px] text-[#8B939A] block mb-1 uppercase tracking-wider">
                    Current Highest Bid
                  </span>
                  <div className="font-hero text-[80px] sm:text-[130px] font-bold text-[#C7A046] tabular-nums leading-none tracking-tight">
                    {highestBid ? formatExactINR(highestBid.amount) : formatExactINR(activeItem.basePrice)}
                  </div>
                </div>

                {/* Highest Bidder Leader Tag */}
                <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] inline-block px-6">
                  {highestBid ? (
                    <div className="text-[16px] sm:text-[18px]">
                      Leading: <strong className="text-[#EDEAE1]">{highestBid.bidder?.participant?.teamName || "Team"}</strong>
                    </div>
                  ) : (
                    <div className="text-[14px] text-[#8B939A]">Awaiting opening bid from registered teams</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standby State */
            <div className="p-12 rounded-[4px] bg-[#1B2229] border border-[#2B343C] text-center space-y-3 max-w-xl mx-auto">
              <span className="font-hero text-[32px] font-bold text-[#EDEAE1]">
                AUCTION IN PROGRESS
              </span>
              <p className="text-[14px] text-[#8B939A]">
                Waiting for the Auctioneer to bring the next cricket player lot to the spotlight stage.
              </p>
            </div>
          )}

          {/* Side-by-Side Team Purse Runway Meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Alpha Rail */}
            <div className="p-4 rounded-[4px] bg-[#1B2229] border-l-4 border-l-[#3E7CB1] border border-[#2B343C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[15px] text-[#EDEAE1]">{teamA?.teamName || "Team Alpha"}</span>
                <span className="font-hero text-[18px] font-bold text-[#3E7CB1] tabular-nums">
                  {teamA ? formatINR(teamA.remainingBudget) : "₹0"} remaining
                </span>
              </div>
              <div className="w-full h-2 bg-[#10151A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3E7CB1] transition-all duration-500"
                  style={{
                    width: `${teamA ? (teamA.remainingBudget / teamA.initialBudget) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Team Beta Rail */}
            <div className="p-4 rounded-[4px] bg-[#1B2229] border-l-4 border-l-[#B85C38] border border-[#2B343C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[15px] text-[#EDEAE1]">{teamB?.teamName || "Team Beta"}</span>
                <span className="font-hero text-[18px] font-bold text-[#B85C38] tabular-nums">
                  {teamB ? formatINR(teamB.remainingBudget) : "₹0"} remaining
                </span>
              </div>
              <div className="w-full h-2 bg-[#10151A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B85C38] transition-all duration-500"
                  style={{
                    width: `${teamB ? (teamB.remainingBudget / teamB.initialBudget) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Lower-Third Live Stream Ticker */}
        <footer className="h-12 border-t border-[#2B343C] bg-[#10151A] px-6 sm:px-12 flex items-center justify-between text-[13px] text-[#8B939A]">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="px-2 py-0.5 rounded-[2px] bg-[#C7A046] text-[#10151A] font-bold text-[11px]">
              TICKER
            </span>
            <span className="truncate">
              {bids.length > 0
                ? `Latest bid: ${formatExactINR(bids[0].amount)} by ${bids[0].bidder?.participant?.teamName || "Team"} at ${new Date(bids[0].timestamp).toLocaleTimeString()}`
                : "Awaiting live bid events..."}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Big Screen Presentation</span>
          </div>
        </footer>
      </div>
    </SocketProvider>
  );
}
