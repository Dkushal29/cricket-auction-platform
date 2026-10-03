"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClientAuction, ClientBid, ClientItem } from "@/lib/types";
import { SocketProvider, useAuctionSocket } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import { InviteModal } from "@/components/InviteModal";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { soundEngine } from "@/lib/sound-effects";
import {
  Play,
  Pause,
  Gavel,
  XCircle,
  FastForward,
  RotateCcw,
  Square,
  AlertTriangle,
  Users,
  Eye,
  Radio,
  Share2,
  BarChart3,
  FileSpreadsheet,
  Loader2,
  Clock,
  Shield,
  Award,
} from "lucide-react";

export default function AuctioneerControlPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [bidSnap, setBidSnap] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: "end" | "cancel" | "undo" | "unsold" | "finalize";
    itemId?: string;
    itemName?: string;
    price?: number;
    teamName?: string;
  } | null>(null);

  // Pre-flight readiness modal state
  const [readinessData, setReadinessData] = useState<{
    allPassed: boolean;
    readyToStart: boolean;
    checks: Array<{ id: string; label: string; passed: boolean; details: string }>;
  } | null>(null);
  const [showReadinessModal, setShowReadinessModal] = useState(false);

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
    fetchState();
  }, [fetchState]);

  // Execute API action
  const executeApi = async (url: string, method: string = "POST", body?: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Operation failed", "error");
      } else {
        fetchState();
      }
    } catch (e: any) {
      addToast(e.message || "Network error", "error");
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const fetchReadinessAndPrompt = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/auctions/${auctionId}/readiness`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run readiness check");
      setReadinessData(data);
      setShowReadinessModal(true);
    } catch (e: any) {
      addToast(e.message || "Failed to run pre-flight check", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSocketEvent = useCallback(
    (eventName: string, data: any) => {
      switch (eventName) {
        case "reconnected_sync":
          fetchState();
          break;
        case "auction_ready":
        case "auction_status_changed":
        case "auction_started":
        case "auction_paused":
        case "auction_resumed":
        case "auction_completed":
          setAuction((prev) => (prev ? { ...prev, status: data.status } : null));
          break;
        case "re_auction_started":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, ...data.item, status: "ACTIVE" as any, round: 2 } : i
            );
            return { ...prev, activeItemId: data.item.id, items: updatedItems };
          });
          setBids([]);
          setSecondsRemaining(15);
          soundEngine.playNewBid();
          addToast(`ROUND 2 RE-AUCTION: ${data.item.name} is on stage!`, "brass");
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
          addToast(`Lot #${data.item.orderIndex} ${data.item.name} now on spotlight`, "brass");
          break;
        case "bid_placed":
          setBids((prev) => {
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            return [data.bid, ...prev];
          });
          setSecondsRemaining(data.secondsRemaining !== undefined ? data.secondsRemaining : 15);
          setBidSnap(true);
          setTimeout(() => setBidSnap(false), 250);
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
          addToast(`Sold to ${data.updatedParticipant.teamName} for ${formatExactINR(data.item.winningPrice)}`, "success");
          break;
        case "player_final_unsold":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, status: "FINAL_UNSOLD" as any, round: 2 } : i
            );
            return { ...prev, activeItemId: null, items: updatedItems };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          addToast(`${data.item?.name || "Player"} passed as FINAL UNSOLD`, "info");
          break;
        case "player_unsold":
          setAuction((prev) => {
            if (!prev) return null;
            const finalStatus = data.isFinal || data.item?.status === "FINAL_UNSOLD" ? "FINAL_UNSOLD" : "UNSOLD";
            const updatedItems = prev.items.map((i) => (i.id === data.item.id ? { ...i, ...data.item, status: finalStatus as any } : i));
            return { ...prev, activeItemId: null, items: updatedItems };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          addToast(`${data.item.name} passed unsold`, "error");
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

  if (loading || !auction) {
    return (
      <div className="min-h-screen bg-[#070B12] flex flex-col items-center justify-center text-[#F5F7FA] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
        <span className="text-[13px] text-[#8B98A8]">Connecting to Auctioneer Command Deck...</span>
      </div>
    );
  }

  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || null;
  const pendingItems = auction.items.filter((i) => i.status === "PENDING");
  const nextPendingItem = pendingItems[0] || null;
  const highestBid = bids[0];
  const isDraft = auction.status === "DRAFT";
  const isReady = auction.status === "READY";
  const isLive = auction.status === "LIVE";
  const isPaused = auction.status === "PAUSED";
  const isTerminal = auction.status === "COMPLETED" || auction.status === "CANCELLED";

  return (
    <SocketProvider auctionId={auctionId} onEvent={handleSocketEvent}>
      <AuctioneerControlView
        auction={auction}
        activeItem={activeItem}
        pendingItems={pendingItems}
        nextPendingItem={nextPendingItem}
        bids={bids}
        highestBid={highestBid}
        secondsRemaining={secondsRemaining}
        bidSnap={bidSnap}
        actionLoading={actionLoading}
        isDraft={isDraft}
        isReady={isReady}
        isLive={isLive}
        isPaused={isPaused}
        isTerminal={isTerminal}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        showReadinessModal={showReadinessModal}
        setShowReadinessModal={setShowReadinessModal}
        readinessData={readinessData}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        executeApi={executeApi}
        fetchReadinessAndPrompt={fetchReadinessAndPrompt}
      />
    </SocketProvider>
  );
}

function AuctioneerControlView({
  auction,
  activeItem,
  pendingItems,
  nextPendingItem,
  bids,
  highestBid,
  secondsRemaining,
  bidSnap,
  actionLoading,
  isDraft,
  isReady,
  isLive,
  isPaused,
  isTerminal,
  confirmModal,
  setConfirmModal,
  showReadinessModal,
  setShowReadinessModal,
  readinessData,
  showInviteModal,
  setShowInviteModal,
  executeApi,
  fetchReadinessAndPrompt,
}: any) {
  const { spectatorCount } = useAuctionSocket();

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
      {/* Demo Persona Bar */}
      <RoleSwitcherBar />

      {/* ================================================== */}
      {/* TOP BAR: Auction Name | ● LIVE | Participants | Spectators */}
      {/* ================================================== */}
      <header className="h-14 px-4 sm:px-6 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-[16px]">🏏</span>
            <span className="font-hero text-[20px] font-black text-[#F5F7FA] tracking-wide group-hover:text-[#E5AE3F] transition-colors">
              {auction.name}
            </span>
          </Link>

          <LiveStatusBadge status={auction.status} isConfigLocked={auction.isConfigLocked} />

          <span className="hidden md:inline text-[11px] font-mono text-[#8B98A8] bg-[#070B12] px-2 py-0.5 rounded-[2px] border border-[#202B38]">
            ROOM: {auction.roomCode}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-[13px]">
          {/* Participants */}
          <div className="flex items-center gap-1.5 text-[#8B98A8]">
            <Users className="w-3.5 h-3.5 text-[#4DA3FF]" />
            <span className="text-[#F5F7FA] font-bold tabular-nums">
              {auction.participants?.length || 0}
            </span>
            <span className="hidden sm:inline">Teams</span>
          </div>

          {/* Spectators */}
          <div className="flex items-center gap-1.5 text-[#8B98A8]">
            <Eye className="w-3.5 h-3.5 text-[#28D17C]" />
            <span className="text-[#F5F7FA] font-bold tabular-nums">
              {spectatorCount}
            </span>
            <span className="hidden sm:inline">Spectators</span>
          </div>

          <div className="h-4 w-px bg-[#202B38] hidden sm:block" />

          {/* War Room & Invites Links */}
          <div className="flex items-center gap-2">
            <Link
              href={`/auction/${auction.id}/war-room`}
              className="px-2.5 py-1 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#4DA3FF]" />
              <span className="hidden md:inline">War Room</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-2.5 py-1 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#E5AE3F]" />
              <span className="hidden md:inline">Invite Links</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================== */}
      {/* MAIN 3-COLUMN COMMAND DECK AREA */}
      {/* ================================================== */}
      <main className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* ================================================== */}
          {/* LEFT: CURRENT LOT & PLAYER INFORMATION (~28% on desktop) */}
          {/* ================================================== */}
          <div className="lg:col-span-3 space-y-3 flex flex-col">
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-4 flex-1 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202B38] pb-2.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8]">
                  Current Lot
                </span>
                {activeItem && (
                  <span className="font-hero text-[15px] font-bold text-[#E5AE3F] tabular-nums">
                    LOT #{activeItem.orderIndex}
                  </span>
                )}
              </div>

              {activeItem ? (
                <div className="space-y-3 text-[13px]">
                  <div>
                    <span className="text-[11px] text-[#8B98A8] block uppercase">Category</span>
                    <span className="font-semibold text-[#F5F7FA] text-[15px]">
                      {activeItem.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#8B98A8] block uppercase">Base Price</span>
                    <span className="font-hero text-[20px] font-bold text-[#E5AE3F] tabular-nums">
                      {formatExactINR(activeItem.basePrice)}
                    </span>
                  </div>

                  {/* Player Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[12px]">
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">MATCHES</span>
                      <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">
                        {activeItem.matches || "—"}
                      </span>
                    </div>
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">RUNS</span>
                      <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">
                        {activeItem.runs || "—"}
                      </span>
                    </div>
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">WICKETS</span>
                      <span className="font-hero text-[15px] font-bold text-[#F5F7FA] tabular-nums">
                        {activeItem.wickets || "—"}
                      </span>
                    </div>
                    <div className="p-2 rounded-[2px] bg-[#070B12] border border-[#202B38]">
                      <span className="text-[#8B98A8] block text-[10px]">STRIKE RATE</span>
                      <span className="font-hero text-[15px] font-bold text-[#E5AE3F] tabular-nums">
                        {activeItem.strikeRate || "—"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#8B98A8] block uppercase">Bio / Notes</span>
                    <p className="text-[12px] text-[#8B98A8] line-clamp-3 leading-relaxed mt-0.5">
                      {activeItem.description || "Player active in current auction round."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-[#8B98A8] space-y-2">
                  <Award className="w-8 h-8 mx-auto text-[#202B38]" />
                  <p className="text-[13px]">No lot currently on stage.</p>
                  {nextPendingItem && (
                    <button
                      type="button"
                      onClick={() => executeApi(`/api/auctions/${auction.id}/next`)}
                      disabled={actionLoading || !isLive}
                      className="px-3 py-1.5 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[12px] hover:bg-[#F4C65E]"
                    >
                      Bring Next Player (#{String(nextPendingItem.orderIndex).padStart(2, "0")} {nextPendingItem.name})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Read-Only Randomized Auction Queue */}
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-3 text-[12px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#202B38] mb-1.5 text-[#8B98A8]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-[#EDEAE1]">
                    AUCTION ORDER
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#E5AE3F]/15 text-[#E5AE3F] border border-[#E5AE3F]/30 font-semibold uppercase">
                    Randomized
                  </span>
                </div>
                <span className="font-hero font-bold tabular-nums text-[#8B98A8] text-[11px]">
                  {pendingItems.length} Waiting
                </span>
              </div>
              <p className="text-[11px] text-[#8B98A8] mb-2 leading-tight">
                Player sequence generated automatically.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {pendingItems.length === 0 ? (
                  <div className="p-2 text-center text-[#8B98A8] text-[11px]">
                    All initial lots processed.
                  </div>
                ) : (
                  pendingItems.slice(0, 6).map((p: ClientItem) => (
                    <div
                      key={p.id}
                      className="p-1.5 px-2 rounded-[2px] bg-[#070B12] border border-[#202B38] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-hero font-bold text-[#E5AE3F] text-[13px] tabular-nums">
                          {String(p.orderIndex).padStart(2, "0")}
                        </span>
                        <span className="truncate font-medium text-[#F5F7FA] text-[12px]">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8B98A8] shrink-0">{p.category}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* CENTER: PLAYER CARD | CURRENT BID | AUCTIONEER CONTROLS (~44% on desktop) */}
          {/* ================================================== */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 space-y-5 text-center relative overflow-hidden">
              {/* State Pill */}
              <div className="flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] font-mono text-[12px] font-bold uppercase tracking-widest ${
                  activeItem?.status === "SOLD"
                    ? "bg-[#E5AE3F]/15 border border-[#E5AE3F] text-[#E5AE3F]"
                    : activeItem?.status === "UNSOLD" || activeItem?.status === "FINAL_UNSOLD"
                    ? "bg-[#FF5C5C]/15 border border-[#FF5C5C] text-[#FF5C5C]"
                    : isPaused
                    ? "bg-amber-500/15 border border-amber-500 text-amber-400"
                    : isLive && activeItem
                    ? "bg-[#28D17C]/15 border border-[#28D17C] text-[#28D17C]"
                    : "bg-[#121A24] border border-[#202B38] text-[#8B98A8]"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLive && activeItem ? "bg-[#28D17C] animate-pulse" : "bg-current"}`} />
                  {activeItem?.status === "SOLD"
                    ? "SOLD"
                    : activeItem?.status === "UNSOLD" || activeItem?.status === "FINAL_UNSOLD"
                    ? "UNSOLD"
                    : isPaused
                    ? "PAUSED"
                    : isLive && activeItem
                    ? "BIDDING LIVE"
                    : auction.status}
                </span>
              </div>

              {/* Player Image & Name */}
              <div className="space-y-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-[4px] bg-[#070B12] border border-[#202B38] overflow-hidden flex items-center justify-center">
                  {activeItem?.imageUrl ? (
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

                <div>
                  <h1 className="font-hero text-[34px] sm:text-[44px] font-black text-[#F5F7FA] leading-tight tracking-wide">
                    {activeItem ? activeItem.name : "Awaiting Player"}
                  </h1>
                  <span className="text-[13px] text-[#8B98A8]">
                    {activeItem ? `${activeItem.category} • Base ${formatINR(activeItem.basePrice)}` : "Select next lot from queue"}
                  </span>
                </div>
              </div>

              {/* Hero Current Bid Number */}
              <div className="py-2 border-y border-[#202B38]">
                <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B98A8] block mb-1">
                  CURRENT BID
                </span>
                <div
                  className={`font-hero text-[72px] sm:text-[96px] md:text-[104px] font-black text-[#E5AE3F] tabular-nums leading-none tracking-tight transition-transform ${
                    bidSnap ? "animate-bid-snap" : ""
                  }`}
                >
                  {highestBid ? formatExactINR(highestBid.amount) : activeItem ? formatExactINR(activeItem.basePrice) : "—"}
                </div>

                {highestBid && (
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px]">
                    <span className="text-[#8B98A8]">Leading:</span>
                    <strong className="text-[#F5F7FA]">
                      {highestBid.bidder?.participant?.teamName || (highestBid as any).teamName || "Team"}
                    </strong>
                    {highestBid.bidder?.name && (
                      <span className="text-[11px] text-[#8B98A8]">({highestBid.bidder.name})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              {secondsRemaining !== null && (
                <div className="flex items-center justify-center gap-2">
                  <Clock className={`w-4 h-4 ${secondsRemaining <= 4 ? "text-[#FF5C5C] animate-pulse" : "text-[#8B98A8]"}`} />
                  <span className="text-[12px] uppercase font-bold text-[#8B98A8]">Time Left:</span>
                  <span
                    className={`font-hero text-[28px] font-bold tabular-nums ${
                      secondsRemaining <= 4 ? "text-[#FF5C5C] animate-pulse" : "text-[#F5F7FA]"
                    }`}
                  >
                    00:{String(secondsRemaining).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>

            {/* ================================================== */}
            {/* SEPARATED AUCTIONEER CONTROLS: START | PAUSE | RESUME | SELL | UNSOLD | NEXT PLAYER */}
            {/* ================================================== */}
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-4 space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                Auctioneer Command Controls
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* START / PRE-FLIGHT */}
                {(isDraft || isReady) && (
                  <button
                    type="button"
                    onClick={fetchReadinessAndPrompt}
                    disabled={actionLoading}
                    className="p-3 rounded-[3px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(229,174,63,0.2)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START AUCTION</span>
                  </button>
                )}

                {/* PAUSE */}
                {isLive && (
                  <button
                    type="button"
                    onClick={() => executeApi(`/api/auctions/${auction.id}/pause`)}
                    disabled={actionLoading}
                    className="p-3 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE</span>
                  </button>
                )}

                {/* RESUME */}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => executeApi(`/api/auctions/${auction.id}/resume`)}
                    disabled={actionLoading}
                    className="p-3 rounded-[3px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>RESUME</span>
                  </button>
                )}

                {/* SELL / HAMMER DEAL */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem && highestBid) {
                      setConfirmModal({
                        type: "finalize",
                        itemId: activeItem.id,
                        itemName: activeItem.name,
                        price: highestBid.amount,
                        teamName: highestBid.bidder?.participant?.teamName || "Winning Team",
                      });
                    }
                  }}
                  disabled={actionLoading || !isLive || !activeItem || !highestBid}
                  className="p-3 rounded-[3px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Gavel className="w-4 h-4" />
                  <span>SELL</span>
                </button>

                {/* UNSOLD */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem) {
                      setConfirmModal({
                        type: "unsold",
                        itemId: activeItem.id,
                        itemName: activeItem.name,
                      });
                    }
                  }}
                  disabled={actionLoading || !isLive || !activeItem}
                  className="p-3 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#FF5C5C]/50 text-[#FF5C5C] font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>UNSOLD</span>
                </button>

                {/* NEXT PLAYER */}
                <button
                  type="button"
                  onClick={() => {
                    executeApi(`/api/auctions/${auction.id}/next`);
                  }}
                  disabled={actionLoading || !isLive || !!activeItem || !nextPendingItem}
                  className="p-3 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#E5AE3F]/50 text-[#F5F7FA] font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FastForward className="w-4 h-4 text-[#E5AE3F]" />
                  <span>NEXT PLAYER</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* RIGHT: LIVE BIDS & BID HISTORY (~28% on desktop) */}
          {/* ================================================== */}
          <div className="lg:col-span-3 space-y-3 flex flex-col">
            {/* Live Bids Deck */}
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-4 flex-1 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#202B38] pb-2.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8]">
                  Live Bids
                </span>
                <span className="font-mono text-[11px] text-[#28D17C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28D17C] animate-pulse" />
                  REAL-TIME
                </span>
              </div>

              {bids.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[#8B98A8] text-[13px] text-center p-6">
                  No bids placed on this lot yet
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 flex-1">
                  {bids.map((b: ClientBid, idx: number) => {
                    const isTop = idx === 0;
                    return (
                      <div
                        key={b.id || idx}
                        className={`p-2.5 rounded-[3px] border flex items-center justify-between text-[13px] ${
                          isTop
                            ? "bg-[#121A24] border-[#E5AE3F]/50"
                            : "bg-[#070B12] border-[#202B38]"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className={`font-bold block truncate ${isTop ? "text-[#E5AE3F]" : "text-[#F5F7FA]"}`}>
                            {b.bidder?.participant?.teamName || (b as any).teamName || "Team"}
                          </span>
                          <span className="text-[10px] text-[#8B98A8] font-mono">
                            {new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <span className="font-hero text-[16px] font-bold text-[#F5F7FA] tabular-nums shrink-0">
                          {formatExactINR(b.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Ledger Export CTA */}
            <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-3 text-[12px] flex items-center justify-between">
              <span className="text-[#8B98A8]">Certified Ledger:</span>
              <Link
                href={`/auction/${auction.id}/results`}
                className="text-[#E5AE3F] font-semibold hover:underline flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>View Full History</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ================================================== */}
      {/* BOTTOM: TEAM PURSE SUMMARY & BID TICKER */}
      {/* ================================================== */}
      <footer className="border-t border-[#202B38] bg-[#0D131C] space-y-0">
        {/* Team Purse Summary Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {auction.participants?.map((p: any, idx: number) => {
            const teamColor = p.teamColor || (idx === 0 ? "#3E7CB1" : "#B85C38");
            const remainingRatio = Math.min(1, Math.max(0, p.remainingBudget / (p.initialBudget || 1)));
            const percent = (remainingRatio * 100).toFixed(0);

            return (
              <div
                key={p.id}
                className="p-2.5 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-1.5"
                style={{ borderLeft: `3px solid ${teamColor}` }}
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold text-[#F5F7FA] truncate">{p.teamName}</span>
                  <span className="font-hero font-bold text-[#E5AE3F] tabular-nums">
                    {formatINR(p.remainingBudget)}
                  </span>
                </div>
                {/* Gauge */}
                <div className="w-full h-1.5 bg-[#121A24] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: teamColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Full-width broadcast lower-third ticker */}
        <div className="h-10 bg-[#070B12] border-t border-[#202B38] px-4 sm:px-6 flex items-center justify-between text-[12px] text-[#8B98A8]">
          <div className="flex items-center gap-3 overflow-hidden">
            <Radio className="w-3 h-3 text-[#28D17C] animate-pulse" />
            <span className="text-[#8B98A8] uppercase tracking-wider font-bold text-[10px]">TICKER</span>
            <span className="truncate text-[#F5F7FA]">
              {bids.length > 0
                ? `Latest: ${formatExactINR(bids[0].amount)} by ${bids[0].bidder?.participant?.teamName || "Team"} at ${new Date(bids[0].timestamp).toLocaleTimeString()}`
                : "Awaiting next live bid..."}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
            <span>GAVEL: READY</span>
            <span>•</span>
            <span className="text-[#E5AE3F]">AUCTIONEER CONSOLE</span>
          </div>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-[#070B12]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#F5F7FA]">
              <AlertTriangle className="w-5 h-5 text-[#E5AE3F]" />
              <h3 className="text-[16px] font-bold">
                {confirmModal.type === "finalize"
                  ? "Confirm Hammer Sale"
                  : confirmModal.type === "unsold"
                  ? "Confirm Mark Unsold"
                  : "Confirm Action"}
              </h3>
            </div>

            <p className="text-[13px] text-[#8B98A8] leading-relaxed">
              {confirmModal.type === "finalize"
                ? `Are you sure you want to finalize the sale of ${confirmModal.itemName} to ${confirmModal.teamName} for ${formatExactINR(confirmModal.price || 0)}? This will deduct purse and allocate player.`
                : confirmModal.type === "unsold"
                ? `Mark ${confirmModal.itemName} as unsold and advance lot queue?`
                : "Proceed with this auctioneer decision?"}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === "finalize" && confirmModal.itemId) {
                    executeApi(`/api/items/${confirmModal.itemId}/finalize`);
                  } else if (confirmModal.type === "unsold" && confirmModal.itemId) {
                    executeApi(`/api/items/${confirmModal.itemId}/unsold`);
                  }
                }}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E]"
              >
                {actionLoading ? "Processing..." : "Confirm Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Flight Auction Readiness Modal */}
      {showReadinessModal && readinessData && (
        <div className="fixed inset-0 z-50 bg-[#070B12]/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202B38] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#F5F7FA]">
                  Pre-flight auction readiness
                </h3>
                <span className="text-[12px] text-[#8B98A8]">
                  Authoritative sanity check before locking configuration and going live
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReadinessModal(false)}
                className="text-[#8B98A8] hover:text-[#F5F7FA]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {readinessData.checks?.map((check: any) => (
                <div
                  key={check.id}
                  className="p-2.5 rounded-[3px] bg-[#070B12] border border-[#202B38] flex items-start gap-2.5 text-[13px]"
                >
                  <span className={`text-[14px] ${check.passed ? "text-[#28D17C]" : "text-[#FF5C5C]"}`}>
                    {check.passed ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-[#F5F7FA]">{check.label}</div>
                    <div className="text-[12px] text-[#8B98A8]">{check.details}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#202B38] flex items-center justify-between">
              <span className="text-[12px] text-[#8B98A8]">
                {readinessData.allPassed
                  ? "✓ All pre-flight checks passed."
                  : "⚠ Resolve failed checks before starting."}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReadinessModal(false)}
                  className="px-3 py-1.5 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReadinessModal(false);
                    executeApi(`/api/auctions/${auction.id}/start`);
                  }}
                  disabled={!readinessData.readyToStart || actionLoading}
                  className="px-4 py-1.5 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] disabled:opacity-50"
                >
                  Confirm & Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal
        auction={auction}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
