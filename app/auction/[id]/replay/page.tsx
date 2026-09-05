"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { ArrowLeft, FastForward, Pause, Play, RotateCcw, Shield, Timer, Loader2 } from "lucide-react";

interface ReplayEvent {
  id: string;
  timestamp: string;
  type: "BID" | "SOLD" | "UNSOLD" | "START" | "ACTIVATE";
  title: string;
  detail: string;
  amount?: number;
  team?: string;
  playerName?: string;
}

export default function AuctionReplayPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<any>(null);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/auctions/${auctionId}`).then((r) => r.json()),
      fetch(`/api/auctions/${auctionId}/bids`).then((r) => r.json()),
      fetch(`/api/auctions/${auctionId}/history`).then((r) => r.json()),
    ])
      .then(([auctionData, bidsData, historyData]) => {
        setAuction(auctionData.auction);

        // Build chronological event list
        const combined: ReplayEvent[] = [];

        // Bids
        (bidsData.bids || []).forEach((b: any) => {
          combined.push({
            id: `bid-${b.id}`,
            timestamp: b.timestamp,
            type: "BID",
            title: `Bid: ${formatExactINR(b.amount)}`,
            detail: `${b.bidder?.participant?.teamName || "Team"} placed bid`,
            amount: b.amount,
            team: b.bidder?.participant?.teamName,
            playerName: b.item?.name,
          });
        });

        // Audit Logs
        (historyData.history || []).forEach((h: any) => {
          let meta: any = {};
          try {
            meta = JSON.parse(h.metadata || "{}");
          } catch (e) {}

          if (h.action === "ITEM_SOLD") {
            combined.push({
              id: `sold-${h.id}`,
              timestamp: h.timestamp,
              type: "SOLD",
              title: `SOLD: ${meta.itemName || "Player"}`,
              detail: `Finalized to ${meta.teamName} for ${formatINR(meta.price)}`,
              amount: meta.price,
              team: meta.teamName,
              playerName: meta.itemName,
            });
          } else if (h.action === "ITEM_UNSOLD") {
            combined.push({
              id: `unsold-${h.id}`,
              timestamp: h.timestamp,
              type: "UNSOLD",
              title: `UNSOLD: ${meta.itemName || "Player"}`,
              detail: "Passed without meeting base price",
              playerName: meta.itemName,
            });
          } else if (h.action === "AUCTION_STARTED") {
            combined.push({
              id: `start-${h.id}`,
              timestamp: h.timestamp,
              type: "START",
              title: "Auction started",
              detail: "Bidding officially opened",
            });
          }
        });

        // Sort chronologically ascending
        combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (combined.length === 0) {
          // Fallback mock events if auction just started
          combined.push({
            id: "initial",
            timestamp: new Date().toISOString(),
            type: "START",
            title: "Auction initialized",
            detail: "Ready for live bids",
          });
        }

        setEvents(combined);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [auctionId]);

  // Playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && events.length > 0) {
      const interval = 2000 / playbackSpeed;
      timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isPlaying, events.length, playbackSpeed]);

  if (loading || !auction) {
    return (
      <div className="min-h-screen bg-[#10151A] flex items-center justify-center text-[#EDEAE1]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7A046]" />
      </div>
    );
  }

  const currentEvent = events[currentIndex] || events[0];

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      {/* Top Header */}
      <header className="h-14 px-4 sm:px-6 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/auction/${auctionId}`)}
            className="p-1.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-[#EDEAE1]">Timeline auction replay</h1>
            <span className="text-[12px] text-[#8B939A]">{auction.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/auction/${auction.id}/results`}
            className="px-3 py-1.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[12px]"
          >
            Ledger & results
          </Link>
        </div>
      </header>

      {/* Main Replay Studio */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Spotlight Replay Frame (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] flex flex-col justify-between min-h-[420px]">
            <div className="flex items-center justify-between border-b border-[#2B343C] pb-3">
              <span className="text-[13px] text-[#8B939A]">
                Replay frame {currentIndex + 1} of {events.length}
              </span>
              <span className="font-hero text-[14px] text-[#8B939A] tabular-nums">
                {currentEvent ? new Date(currentEvent.timestamp).toLocaleTimeString() : "—"}
              </span>
            </div>

            {/* Current Frame Readout */}
            <div className="py-8 text-center space-y-3">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#8B939A] block">
                {currentEvent?.type === "SOLD" ? "DEAL FINALIZED" : currentEvent?.type === "BID" ? "LIVE BID PLACED" : "EVENT"}
              </span>

              <div className="font-hero text-[72px] sm:text-[96px] font-black text-[#C7A046] tabular-nums leading-none">
                {currentEvent?.amount ? formatExactINR(currentEvent.amount) : currentEvent?.title}
              </div>

              <div className="text-[16px] font-semibold text-[#EDEAE1]">
                {currentEvent?.playerName && <span>{currentEvent.playerName} • </span>}
                {currentEvent?.team && <strong className="text-[#EDEAE1]">{currentEvent.team}</strong>}
              </div>

              <p className="text-[13px] text-[#8B939A] max-w-md mx-auto">
                {currentEvent?.detail}
              </p>
            </div>

            {/* Scrubber & Controls */}
            <div className="space-y-3 border-t border-[#2B343C] pt-4">
              {/* Slider */}
              <input
                type="range"
                min="0"
                max={Math.max(0, events.length - 1)}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full accent-[#C7A046] cursor-pointer"
              />

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(0);
                      setIsPlaying(false);
                    }}
                    className="p-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] hover:border-[#8B939A]"
                    title="Reset to beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-bold text-[13px] hover:bg-white flex items-center gap-1.5"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? "Pause" : "Play replay"}</span>
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1">
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2.5 py-1 rounded-[2px] border text-[12px] font-hero tabular-nums ${
                        playbackSpeed === spd
                          ? "bg-[#2B343C] border-[#8B939A] text-[#EDEAE1] font-bold"
                          : "bg-[#10151A] border-[#2B343C] text-[#8B939A]"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Event Log Stream (4 cols) */}
          <div className="lg:col-span-4 p-5 rounded-[4px] bg-[#1B2229] border border-[#2B343C] flex flex-col h-[420px]">
            <h3 className="text-[14px] font-bold text-[#EDEAE1] pb-2 mb-2 border-b border-[#2B343C]">
              Timeline event ledger
            </h3>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {events.map((ev, idx) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`w-full p-2 rounded-[2px] border text-left text-[12px] transition-all ${
                    idx === currentIndex
                      ? "bg-[#10151A] border-[#C7A046] text-[#EDEAE1] font-semibold"
                      : "bg-[#10151A] border-[#2B343C] text-[#8B939A] hover:text-[#EDEAE1]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#EDEAE1]">{ev.title}</span>
                    <span className="font-hero tabular-nums text-[11px] text-[#8B939A]">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8B939A] truncate block">{ev.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-[#2B343C] text-center text-[12px] text-[#8B939A]">
        Timeline replay player — Bangalore Premier League 2026
      </footer>
    </div>
  );
}
