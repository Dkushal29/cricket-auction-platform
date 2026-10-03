"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClientAuction, ClientBid, ClientItem, ClientParticipant } from "@/lib/types";
import { SocketProvider } from "@/components/SocketContext";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { RoleSwitcherBar } from "@/components/RoleSwitcherBar";
import { AuctionHeader } from "@/components/AuctionHeader";
import { ItemSpotlight } from "@/components/ItemSpotlight";
import { TeamRail } from "@/components/TeamRail";
import { BidTicker } from "@/components/BidTicker";
import { BidPanel } from "@/components/BidPanel";
import { AuctionControlPanel } from "@/components/AuctionControlPanel";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { soundEngine } from "@/lib/sound-effects";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuctionArenaPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [auction, setAuction] = useState<ClientAuction | null>(null);
  const [bids, setBids] = useState<ClientBid[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recentFinalized, setRecentFinalized] = useState<{
    item: ClientItem;
    status: "SOLD" | "UNSOLD" | "FINAL_UNSOLD";
    team?: string;
    amount?: number;
  } | null>(null);

  // Authoritative State Fetcher
  const fetchAuthoritativeState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Auction not found");
        throw new Error("Failed to load auction data");
      }
      const data = await res.json();
      setAuction(data.auction);

      // Fetch active item bids if active item exists
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchAuthoritativeState();
  }, [fetchAuthoritativeState]);

  // Real-Time Event Dispatcher (Short, active-voice copy)
  const handleSocketEvent = useCallback(
    (eventName: string, data: any) => {
      switch (eventName) {
        case "reconnected_sync":
          // Authoritative state reconciliation upon socket reconnection
          fetchAuthoritativeState();
          break;

        case "auction_ready":
        case "auction_status_changed":
        case "auction_started":
        case "auction_paused":
        case "auction_resumed":
        case "auction_completed":
        case "auction_cancelled":
          setAuction((prev) => (prev ? { ...prev, status: data.status } : null));
          addToast(`Auction status changed to ${data.status.toLowerCase()}`, "info");
          break;

        case "auction_round_started":
          setAuction((prev) => (prev ? { ...prev, currentRound: data.round } : null));
          setRecentFinalized(null);
          addToast(`ROUND ${data.round} STARTED (${data.eligiblePlayerCount} players eligible)`, "brass");
          fetchAuthoritativeState();
          break;

        case "re_auction_started":
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, ...data.item, status: "ACTIVE" as any, round: data.round || 2 } : i
            );
            return {
              ...prev,
              activeItemId: data.item.id,
              activeItem: data.item,
              items: updatedItems,
            };
          });
          setRecentFinalized(null);
          setBids([]);
          setSecondsRemaining(15);
          soundEngine.playNewBid();
          addToast(`ROUND ${data.round || 2} RE-AUCTION: ${data.item.name} is on stage!`, "brass");
          break;

        case "player_started":
          setRecentFinalized(null);
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? { ...i, ...data.item, status: "ACTIVE" as any } : i
            );
            return {
              ...prev,
              activeItemId: data.item.id,
              activeItem: data.item,
              items: updatedItems,
            };
          });
          setBids([]);
          setSecondsRemaining(data.secondsRemaining || 15);
          addToast(`Lot #${data.item.orderIndex} ${data.item.name} now on spotlight`, "brass");
          break;

        case "new_highest_bid":
          soundEngine.playNewHighestBid();
          break;

        case "bid_placed":
          setBids((prev) => {
            if (prev.some((b) => b.id === data.bid.id)) return prev;
            return [data.bid, ...prev];
          });
          setSecondsRemaining(data.secondsRemaining !== undefined ? data.secondsRemaining : 15);
          soundEngine.playNewBid();
          addToast(
            `New high bid of ${formatExactINR(data.newHighestBid)} by ${data.bid?.bidder?.participant?.teamName || data.bid?.teamName || "Team"}`,
            "brass"
          );
          break;

        case "timer_updated":
          setSecondsRemaining(data.secondsRemaining);
          if (data.secondsRemaining <= 4 && data.secondsRemaining > 0) {
            soundEngine.playTimerWarning();
          }
          break;

        case "player_sold":
          const soldItem = { ...data.item, status: "SOLD" as const };
          setRecentFinalized({
            item: soldItem,
            status: "SOLD",
            team: data.winningTeam || data.updatedParticipant?.teamName,
            amount: data.amount || data.item?.winningPrice,
          });
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? soldItem : i
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
          addToast(
            `Sold to ${data.updatedParticipant.teamName} for ${formatExactINR(data.item.winningPrice)}`,
            "success"
          );
          break;

        case "player_final_unsold":
          const finalUnsoldItem = { ...data.item, status: "FINAL_UNSOLD" as const };
          setRecentFinalized({
            item: finalUnsoldItem,
            status: "FINAL_UNSOLD",
          });
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? finalUnsoldItem : i
            );
            return {
              ...prev,
              activeItemId: null,
              activeItem: null,
              items: updatedItems,
            };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          addToast(`${data.item.name} passed as FINAL UNSOLD`, "error");
          break;

        case "player_unsold":
          const finalStatus = data.isFinal || data.item?.status === "FINAL_UNSOLD" || data.status === "FINAL_UNSOLD" ? "FINAL_UNSOLD" : "UNSOLD";
          const unsoldItem = { ...data.item, status: finalStatus as any };
          setRecentFinalized({
            item: unsoldItem,
            status: finalStatus as any,
          });
          setAuction((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((i) =>
              i.id === data.item.id ? unsoldItem : i
            );
            return {
              ...prev,
              activeItemId: null,
              activeItem: null,
              items: updatedItems,
            };
          });
          setSecondsRemaining(null);
          soundEngine.playUnsoldGavel();
          addToast(`${data.item.name} passed ${finalStatus === "FINAL_UNSOLD" ? "as FINAL UNSOLD" : "unsold"}`, "error");
          break;

        case "squad_updated":
          fetchAuthoritativeState();
          break;

        case "player_undo_finalized":
          setRecentFinalized(null);
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
              items: updatedItems,
              participants: updatedParticipants,
            };
          });
          addToast(`Sale of ${data.item.name} reversed`, "info");
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
    [auction?.timerDuration, addToast]
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#070B12] flex flex-col items-center justify-center text-[#F5F7FA] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
        <span className="text-[13px] text-[#8B98A8]">Connecting to live stadium broadcast...</span>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-[#070B12] flex flex-col items-center justify-center p-6 text-center text-[#F5F7FA]">
        <AlertCircle className="w-10 h-10 text-[#FF5C5C] mb-3" />
        <h2 className="text-[20px] font-bold mb-1">Arena unavailable</h2>
        <p className="text-[#8B98A8] text-[14px] mb-4">{error || "Auction not found"}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px]"
        >
          Return to home
        </button>
      </div>
    );
  }

  const highestBid = bids[0];
  const activeItem = auction.items.find((i) => i.id === auction.activeItemId) || recentFinalized?.item || null;
  const displayHighestBidAmount = recentFinalized?.amount !== undefined ? recentFinalized.amount : (highestBid?.amount || 0);
  const displayHighestBidderTeam = recentFinalized?.team || highestBid?.bidder?.participant?.teamName || (highestBid as any)?.teamName;
  const userRole = user?.role || "SPECTATOR";

  // Participants
  const teamA = auction.participants[0] || null;
  const teamB = auction.participants[1] || null;
  const selfParticipant = auction.participants.find((p) => p.userId === user?.id) || null;

  return (
    <SocketProvider auctionId={auctionId} onEvent={handleSocketEvent}>
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
        {/* Top Demo Persona Switcher */}
        <RoleSwitcherBar />

        {/* Thin Header */}
        <AuctionHeader auction={auction} />

        {/* Pre-Auction Lobby Banner */}
        {(auction.status === "DRAFT" || auction.status === "READY") && (
          <div className="bg-[#0D131C] border-b border-[#202B38] px-4 py-2 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-[#8B98A8]">
              <span className="w-2 h-2 rounded-full bg-[#E5AE3F] animate-pulse" />
              <span>Auction is currently in pre-live state ({auction.status.toLowerCase()}). Waiting for bidders to get ready in lobby.</span>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/auction/${auction.id}/lobby`)}
              className="px-3 py-1 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[12px] hover:bg-[#F4C65E] transition-colors"
            >
              Open pre-auction lobby
            </button>
          </div>
        )}

        {/* Completed Auction Banner */}
        {auction.status === "COMPLETED" && (
          <div className="bg-[#0D131C] border-b border-[#202B38] px-4 py-2 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-[#8B98A8]">
              <span className="w-2 h-2 rounded-full bg-[#28D17C]" />
              <span>This auction has concluded. All lot transactions and team squad allocations are permanently finalized.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/auction/${auction.id}/replay`)}
                className="px-3 py-1 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] hover:border-[#8B98A8] font-medium text-[12px] transition-colors"
              >
                Watch replay
              </button>
              <button
                type="button"
                onClick={() => router.push(`/auction/${auction.id}/results`)}
                className="px-3 py-1 rounded-[3px] bg-[#E5AE3F] text-[#070B12] font-bold text-[12px] hover:bg-[#F4C65E] transition-colors"
              >
                View certified ledger
              </button>
            </div>
          </div>
        )}

        {/* Main 3-Column Arena Stage */}
        <main className="max-w-7xl w-full mx-auto p-3 sm:p-5 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Column: Team A Rail (~20% on desktop) */}
            <div className="hidden lg:block lg:col-span-3 h-full">
              <TeamRail
                participant={teamA}
                items={auction.items}
                variant="team-a"
                isSelf={user?.id === teamA?.userId}
                maxSquadSize={auction.maxSquadSize}
              />
            </div>

            {/* Center Column: Dominant Item Spotlight (~60% on desktop) */}
            <div className="lg:col-span-6 space-y-4">
              <ItemSpotlight
                item={activeItem}
                currentHighestBid={displayHighestBidAmount}
                highestBidderName={highestBid?.bidder?.name}
                highestBidderTeam={displayHighestBidderTeam}
                secondsRemaining={secondsRemaining}
                timerDuration={15}
                isPaused={auction.status === "PAUSED"}
              />

              {/* Bidder Bid Console */}
              {userRole === "BIDDER" && (
                <BidPanel
                  auction={auction}
                  item={activeItem}
                  currentHighestBid={highestBid?.amount || 0}
                  highestBidderId={highestBid?.bidderId}
                  participant={selfParticipant}
                />
              )}

              {/* Auctioneer Controls */}
              {userRole === "AUCTIONEER" && (
                <AuctionControlPanel
                  auction={auction}
                  bids={bids}
                  onRefresh={fetchAuthoritativeState}
                />
              )}
            </div>

            {/* Right Column: Team B Rail (~20% on desktop) */}
            <div className="hidden lg:block lg:col-span-3 h-full">
              <TeamRail
                participant={teamB}
                items={auction.items}
                variant="team-b"
                isSelf={user?.id === teamB?.userId}
                maxSquadSize={auction.maxSquadSize}
              />
            </div>

            {/* Mobile View: Stack Team Rails below spotlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              <TeamRail
                participant={teamA}
                items={auction.items}
                variant="team-a"
                isSelf={user?.id === teamA?.userId}
                maxSquadSize={auction.maxSquadSize}
              />
              <TeamRail
                participant={teamB}
                items={auction.items}
                variant="team-b"
                isSelf={user?.id === teamB?.userId}
                maxSquadSize={auction.maxSquadSize}
              />
            </div>
          </div>
        </main>

        {/* Bottom Full-Width Broadcast Lower-Third Ticker */}
        <BidTicker bids={bids} />
      </div>
    </SocketProvider>
  );
}
