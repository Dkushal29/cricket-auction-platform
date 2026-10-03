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
      <div className="min-h-screen bg-[#070B12] flex items-center justify-center text-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
      </div>
    );
  }

  const currentEvent = events[currentIndex] || events[0];

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between">
      {/* Top Header */}
      <header className="h-14 px-4 sm:px-6 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/auction/${auctionId}`)}
            className="p-1.5 rounded-[2px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-[#F5F7FA]">Timeline auction replay</h1>
            <span className="text-[12px] text-[#8B98A8]">{auction.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/auction/${auction.id}/results`}
            className="px-3 py-1.5 rounded-[2px] bg-[#E5AE3F] text-[#070B12] hover:bg-[#F4C65E] font-semibold text-[12px] transition-colors"
          >
            Ledger & results
          </Link>
        </div>
      </header>

      {/* Main Replay Studio */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Spotlight Replay Frame (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] flex flex-col justify-between min-h-[420px]">
            <div className="flex items-center justify-between border-b border-[#202B38] pb-3">
              <span className="text-[13px] text-[#8B98A8]">
                Replay frame {currentIndex + 1} of {events.length}
              </span>
              <span className="font-hero text-[14px] text-[#8B98A8] tabular-nums">
                {currentEvent ? new Date(currentEvent.timestamp).toLocaleTimeString() : "—"}
              </span>
            </div>

            {/* Current Frame Readout */}
            <div className="py-8 text-center space-y-3">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#8B98A8] block">
                {currentEvent?.type === "SOLD" ? "DEAL FINALIZED" : currentEvent?.type === "BID" ? "LIVE BID PLACED" : "EVENT"}
              </span>

              <div className="font-hero text-[72px] sm:text-[96px] font-black text-[#E5AE3F] tabular-nums leading-none">
                {currentEvent?.amount ? formatExactINR(currentEvent.amount) : currentEvent?.title}
              </div>

              <div className="text-[16px] font-semibold text-[#F5F7FA]">
                {currentEvent?.playerName && <span>{currentEvent.playerName} • </span>}
                {currentEvent?.team && <strong className="text-[#F5F7FA]">{currentEvent.team}</strong>}
              </div>

              <p className="text-[13px] text-[#8B98A8] max-w-md mx-auto">
                {currentEvent?.detail}
              </p>
            </div>

            {/* Scrubber & Controls */}
            <div className="space-y-3 border-t border-[#202B38] pt-4">
              {/* Slider */}
              <input
                type="range"
                min="0"
                max={Math.max(0, events.length - 1)}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full accent-[#E5AE3F] cursor-pointer"
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
                    className="p-2 rounded-[2px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] transition-colors"
                    title="Reset to beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-2 rounded-[2px] bg-[#E5AE3F] text-[#070B12] hover:bg-[#F4C65E] font-bold text-[13px] flex items-center gap-1.5 transition-colors"
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
                      className={`px-2.5 py-1 rounded-[2px] border text-[12px] font-hero tabular-nums transition-colors ${
                        playbackSpeed === spd
                          ? "bg-[#202B38] border-[#8B98A8] text-[#F5F7FA] font-bold"
                          : "bg-[#121A24] border-[#202B38] text-[#8B98A8]"
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
          <div className="lg:col-span-4 p-5 rounded-[4px] bg-[#0D131C] border border-[#202B38] flex flex-col h-[420px]">
            <h3 className="text-[14px] font-bold text-[#F5F7FA] pb-2 mb-2 border-b border-[#202B38]">
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
                      ? "bg-[#121A24] border-[#E5AE3F] text-[#F5F7FA] font-semibold"
                      : "bg-[#121A24] border-[#202B38] text-[#8B98A8] hover:text-[#F5F7FA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#F5F7FA]">{ev.title}</span>
                    <span className="font-hero tabular-nums text-[11px] text-[#8B98A8]">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8B98A8] truncate block">{ev.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-[#202B38] text-center text-[12px] text-[#8B98A8]">
        BIDXI Timeline Replay Player &bull; Room Code: {auction.roomCode}
      </footer>
    </div>
  );
}
