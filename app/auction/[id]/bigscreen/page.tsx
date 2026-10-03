"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClientAuction, ClientBid } from "@/lib/types";
import { SocketProvider, useAuctionSocket } from "@/components/SocketContext";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { soundEngine } from "@/lib/sound-effects";
import {
  Loader2,
  Users,
  Volume2,
  VolumeX,
  Radio,
  Trophy,
  Maximize2,
  Clock,
  Shield,
  Activity,
} from "lucide-react";

export default function BigScreenBroadcastPage() {
  const params = useParams();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [bidSnap, setBidSnap] = useState(false);
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
            return { ...prev, activeItemId: data.item.id, activeItem: data.item, items: updatedItems };
          });
          setBids([]);
          setSecondsRemaining(data.secondsRemaining || 15);
          setSoldAnimation(null);
          soundEngine.playNewBid();
          break;
        case "bid_placed":
          setBids((prev) => {
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            return [data.bid, ...prev];
          });
          setSecondsRemaining(data.secondsRemaining !== undefined ? data.secondsRemaining : 15);
          setBidSnap(true);
          setTimeout(() => setBidSnap(false), 240);
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
            return { ...prev, activeItemId: null, activeItem: null, items: updatedItems, participants: updatedParticipants };
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
        case "player_final_unsold":
          setAuction((prev) => {
            if (!prev) return null;
            const finalStatus = data.isFinal || data.item?.status === "FINAL_UNSOLD" ? "FINAL_UNSOLD" : "UNSOLD";
            const updatedItems = prev.items.map((i) => (i.id === data.item.id ? { ...i, ...data.item, status: finalStatus as any } : i));
            return { ...prev, activeItemId: null, activeItem: null, items: updatedItems };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          break;
        default:
          break;
      }
    },
    [fetchState]
  );

  if (loading || !auction) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#E5AE3F]" />
        <span className="text-[15px] text-[#8B98A8]">Loading Stadium Broadcast Feed...</span>
      </div>
    );
  }

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const highestBid = bids[0];

  return (
    <SocketProvider auctionId={auctionId} onEvent={handleSocketEvent}>
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between overflow-hidden select-none selection:bg-[#E5AE3F] selection:text-[#070B12]">
        {/* ================================================== */}
        {/* BROADCAST SCOREBOARD HEADER */}
        {/* ================================================== */}
        <header className="h-16 px-6 sm:px-12 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/auction/${auction.id}`} className="flex items-center gap-2.5">
              <span className="text-[20px]">🏏</span>
              <span className="font-hero text-[22px] font-black tracking-wide text-[#F5F7FA]">
                {auction.name}
              </span>
            </Link>
            <LiveStatusBadge status={auction.status} isConfigLocked={auction.isConfigLocked} />
          </div>

          <div className="flex items-center gap-4 text-[13px]">
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#28D17C]" /> : <VolumeX className="w-4 h-4 text-[#8B98A8]" />}
              <span className="text-[12px]">{soundEnabled ? "Audio On" : "Muted"}</span>
            </button>

            <Link
              href={`/auction/${auction.id}`}
              className="px-3 py-1.5 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA] text-[12px] transition-colors"
            >
              Exit Stadium View
            </Link>
          </div>
        </header>

        {/* ================================================== */}
        {/* LARGE CENTRAL PRESENTATION STAGE */}
        {/* ================================================== */}
        <main className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto p-6 sm:p-10 space-y-6">
          {soldAnimation ? (
            /* SOLD Moment */
            <div className="p-12 sm:p-16 rounded-[4px] bg-[#0D131C] border-2 border-[#E5AE3F] text-center space-y-4 shadow-[0_0_50px_rgba(229,174,63,0.25)] animate-in fade-in duration-300">
              <span className="inline-block px-5 py-1.5 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-black text-[16px] tracking-widest uppercase">
                LOT FINALIZED & SOLD
              </span>
              <h2 className="font-hero text-[54px] sm:text-[84px] font-black text-[#F5F7FA] leading-tight">
                {soldAnimation.itemName}
              </h2>
              <div className="font-hero text-[80px] sm:text-[120px] font-black text-[#E5AE3F] tabular-nums leading-none tracking-tight">
                {formatExactINR(soldAnimation.price)}
              </div>
              <div className="text-[22px] sm:text-[30px] font-bold text-[#F5F7FA] pt-2">
                Acquired by <span className="text-[#E5AE3F]">{soldAnimation.winnerTeam}</span>
              </div>
            </div>
          ) : activeItem ? (
            /* Active Live Auction Lot */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Central Hero Presentation (Dominant) */}
              <div className="lg:col-span-8 bg-[#0D131C] border border-[#202B38] rounded-[4px] p-8 sm:p-10 text-center space-y-5 shadow-2xl relative overflow-hidden">
                {/* ● LIVE AUCTION Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] bg-[#28D17C]/15 border border-[#28D17C]/40 text-[#28D17C] text-[12px] font-bold font-mono tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#28D17C] animate-pulse" />
                  <span>LIVE AUCTION</span>
                </div>

                {/* PLAYER NAME */}
                <div className="space-y-1">
                  <h1 className="font-hero text-[48px] sm:text-[68px] md:text-[80px] font-black text-[#F5F7FA] leading-[0.95] tracking-wide uppercase">
                    {activeItem.name}
                  </h1>
                  {/* Role */}
                  <div className="text-[16px] sm:text-[18px] text-[#8B98A8] font-semibold">
                    {activeItem.category} • Base Price {formatINR(activeItem.basePrice)}
                  </div>
                </div>

                {/* CURRENT BID ₹X.XX Cr */}
                <div className="py-4 border-y border-[#202B38]">
                  <span className="text-[12px] uppercase tracking-widest font-bold text-[#8B98A8] block mb-1">
                    CURRENT BID
                  </span>
                  <div
                    className={`font-hero text-[80px] sm:text-[110px] md:text-[130px] font-black text-[#E5AE3F] tabular-nums leading-none tracking-tight transition-transform ${
                      bidSnap ? "animate-bid-snap" : ""
                    }`}
                  >
                    {highestBid ? formatExactINR(highestBid.amount) : formatExactINR(activeItem.basePrice)}
                  </div>
                </div>

                {/* Leading Team & Countdown Timer */}
                <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                  <div className="px-5 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] flex items-center gap-2">
                    <span className="text-[#8B98A8] text-[14px]">Leading Team:</span>
                    <strong className="text-[17px] font-bold text-[#F5F7FA]">
                      {highestBid ? (highestBid.bidder?.participant?.teamName || "Team") : "Awaiting Opening Bid"}
                    </strong>
                  </div>

                  {secondsRemaining !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className={`w-5 h-5 ${secondsRemaining <= 4 ? "text-[#FF5C5C] animate-pulse" : "text-[#8B98A8]"}`} />
                      <span
                        className={`font-hero text-[34px] font-black tabular-nums ${
                          secondsRemaining <= 4 ? "text-[#FF5C5C] animate-pulse" : "text-[#F5F7FA]"
                        }`}
                      >
                        00:{String(secondsRemaining).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Bids & Recent Activity Sidebar (~30%) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Current Lot Card */}
                <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-5 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                    CURRENT LOT DETAILS
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">LOT ORDER</span>
                      <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums">#{activeItem.orderIndex}</span>
                    </div>
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">BASE PRICE</span>
                      <span className="font-hero text-[16px] font-bold text-[#E5AE3F] tabular-nums">{formatINR(activeItem.basePrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Live Bids Feed */}
                <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#202B38] pb-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8]">
                      LIVE BIDS & ACTIVITY
                    </span>
                    <span className="font-mono text-[11px] text-[#28D17C] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#28D17C] animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {bids.length === 0 ? (
                    <div className="text-center py-6 text-[13px] text-[#8B98A8]">
                      Awaiting bids from teams...
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {bids.slice(0, 5).map((b, idx) => (
                        <div
                          key={b.id || idx}
                          className={`p-2 rounded-[3px] border flex items-center justify-between text-[13px] ${
                            idx === 0 ? "bg-[#121A24] border-[#E5AE3F]/50" : "bg-[#070B12] border-[#202B38]"
                          }`}
                        >
                          <span className={`font-semibold truncate mr-2 ${idx === 0 ? "text-[#E5AE3F]" : "text-[#F5F7FA]"}`}>
                            {b.bidder?.participant?.teamName || "Team"}
                          </span>
                          <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums shrink-0">
                            {formatExactINR(b.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-[4px] bg-[#0D131C] border border-[#202B38] text-center space-y-3 max-w-xl mx-auto">
              <span className="font-hero text-[36px] font-bold text-[#F5F7FA]">
                STADIUM BROADCAST STANDBY
              </span>
              <p className="text-[14px] text-[#8B98A8]">
                Waiting for the auctioneer to spotlight the next player lot.
              </p>
            </div>
          )}
        </main>

        {/* ================================================== */}
        {/* BOTTOM TICKER: TEAM A ₹4.2 Cr | TEAM B ₹5.1 Cr | TEAM C ₹3.8 Cr | TEAM D ₹6.2 Cr */}
        {/* ================================================== */}
        <footer className="border-t border-[#202B38] bg-[#070B12] px-6 sm:px-12 py-3 flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-6 overflow-hidden">
            <span className="px-2 py-0.5 rounded-[2px] bg-[#E5AE3F] text-[#070B12] font-black text-[11px] tracking-wider uppercase">
              TEAM PURSES
            </span>

            {auction.participants?.map((p: any, idx: number) => {
              const teamColor = p.teamColor || (idx === 0 ? "#3E7CB1" : "#B85C38");
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: teamColor }} />
                  <span className="font-bold text-[#F5F7FA] uppercase">{p.teamName}:</span>
                  <span className="font-hero text-[16px] font-bold text-[#E5AE3F] tabular-nums">
                    {formatINR(p.remainingBudget)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[#8B98A8] text-[12px] font-mono">
            <Radio className="w-3.5 h-3.5 text-[#28D17C] animate-pulse" />
            <span>STADIUM BROADCAST READY</span>
          </div>
        </footer>
      </div>
    </SocketProvider>
  );
}
