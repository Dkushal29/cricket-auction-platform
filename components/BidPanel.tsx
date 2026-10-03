"use client";

import React, { useState } from "react";
import { ClientAuction, ClientItem, ClientParticipant } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastNotifications";
import { ShieldCheck, Zap, Loader2, ArrowUp } from "lucide-react";

interface BidPanelProps {
  auction: ClientAuction;
  item: ClientItem | null;
  currentHighestBid: number;
  highestBidderId?: string;
  participant: ClientParticipant | null;
}

export function BidPanel({
  auction,
  item,
  currentHighestBid,
  highestBidderId,
  participant,
}: BidPanelProps) {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");

  const isAuctionLive = auction.status === "LIVE";
  const isItemActive = item?.status === "ACTIVE";
  const isBidder = user?.role === "BIDDER" || !!participant;
  const minIncrement = auction.minimumBidIncrement || 500000;

  // Squad limit calculation: Floor(N / 2)
  const maxSquadSize = auction.maxSquadSize || 25;
  const squadLimit = Math.floor(maxSquadSize / 2);
  const myUserId = participant?.userId || user?.id;
  const wonItemsCount = (auction.items || []).filter(
    (i) => i.winnerId === myUserId && i.status === "SOLD"
  ).length;
  const isSquadLimitReached = wonItemsCount >= squadLimit;

  // Minimum required bid to be valid
  const minRequiredBid = currentHighestBid > 0
    ? currentHighestBid + minIncrement
    : item?.basePrice || minIncrement;

  // Selected bid amount
  const parsedCustom = parseInt(customAmount.replace(/,/g, ""), 10);
  const selectedBidAmount = !isNaN(parsedCustom) && parsedCustom > 0 ? parsedCustom : minRequiredBid;

  // Budget calculations
  const remainingBudget = participant?.remainingBudget || 0;
  const hasSufficientBudget = remainingBudget >= selectedBidAmount;
  const isCurrentLeader =
    (user?.id && highestBidderId === user.id) ||
    (participant?.userId && highestBidderId === participant.userId);

  const canBid =
    isAuctionLive &&
    isItemActive &&
    isBidder &&
    !isSquadLimitReached &&
    hasSufficientBudget &&
    selectedBidAmount >= minRequiredBid &&
    !loading;

  const handlePlaceBid = async (amountToBid: number) => {
    if (!item) return;
    if (!user && !participant) {
      addToast("Valid bidder session required to place a bid", "error");
      return;
    }
    if (amountToBid > remainingBudget) {
      addToast(`Bid of ${formatINR(amountToBid)} exceeds available purse of ${formatINR(remainingBudget)}`, "error");
      return;
    }
    if (amountToBid < minRequiredBid) {
      addToast(`Minimum valid bid is ${formatExactINR(minRequiredBid)}`, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: amountToBid }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Bid rejected", "error");
      } else {
        addToast(`Bid of ${formatExactINR(amountToBid)} accepted`, "success");
        setCustomAmount("");
      }
    } catch (err: any) {
      addToast(err.message || "Network error placing bid", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isBidder) return null;

  // Standard increment shortcuts: +10L (10,00,000), +25L (25,00,000), +50L (50,00,000)
  const increments = [1000000, 2500000, 5000000];

  return (
    <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-5 space-y-4 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#202B38] pb-3 gap-2">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
            Bidding Terminal
          </span>
          <span className="text-[14px] font-bold text-[#F5F7FA]">
            {participant?.teamName || "Your Team"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Squad Count: e.g. Squad: 4 / 6 */}
          <div className="text-[12px] text-[#8B98A8] bg-[#070B12] px-2.5 py-1 rounded-[3px] border border-[#202B38]">
            Squad:{" "}
            <strong
              className={`font-hero tabular-nums text-[14px] ${
                isSquadLimitReached ? "text-[#FF5C5C]" : "text-[#E5AE3F]"
              }`}
            >
              {wonItemsCount} / {squadLimit}
            </strong>
          </div>

          {isCurrentLeader ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-[#28D17C]/15 border border-[#28D17C]/40 text-[12px] font-bold text-[#28D17C]">
              <ShieldCheck className="w-4 h-4" />
              <span>YOU ARE LEADING</span>
            </div>
          ) : (
            <div className="text-[12px] text-[#8B98A8]">
              Purse: <strong className="text-[#E5AE3F] font-hero tabular-nums">{formatINR(remainingBudget)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Squad Limit Warning Banner */}
      {isSquadLimitReached && (
        <div className="p-3 rounded-[3px] bg-[#FF5C5C]/10 border border-[#FF5C5C]/40 text-[#FF5C5C] text-[12px] font-medium flex items-center gap-2">
          <span>⚠️ Your team has reached the maximum squad limit of {squadLimit} players for this auction. Bidding is disabled for your team.</span>
        </div>
      )}

      {/* Large Quick Bidding Controls: [ +₹10L ] [ +₹25L ] [ +₹50L ] */}
      <div>
        <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block mb-2">
          Speed Bidding Controls
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {increments.map((inc) => {
            const calculatedBid = (currentHighestBid > 0 ? currentHighestBid : item?.basePrice || 0) + inc;
            const disabled = !isAuctionLive || !isItemActive || isSquadLimitReached || remainingBudget < calculatedBid || loading;

            return (
              <button
                key={inc}
                type="button"
                onClick={() => {
                  setCustomAmount(calculatedBid.toString());
                  handlePlaceBid(calculatedBid);
                }}
                disabled={disabled}
                className={`min-h-[54px] p-2 rounded-[3px] border text-center transition-all flex flex-col justify-center items-center select-none active:scale-[0.98] ${
                  disabled
                    ? "bg-[#070B12] border-[#202B38] text-[#8B98A8] opacity-40 cursor-not-allowed"
                    : "bg-[#121A24] border-[#202B38] hover:border-[#E5AE3F] text-[#F5F7FA] hover:bg-[#1B2533]"
                }`}
              >
                <span className="text-[11px] text-[#8B98A8] font-bold block">
                  +{formatINR(inc)}
                </span>
                <span className="font-hero text-[17px] font-bold tabular-nums text-[#E5AE3F]">
                  {formatINR(calculatedBid)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary [ PLACE BID ] Button */}
      <button
        type="button"
        onClick={() => handlePlaceBid(selectedBidAmount)}
        disabled={!canBid}
        className={`w-full min-h-[54px] rounded-[4px] font-bold text-[15px] tracking-wide uppercase transition-all flex items-center justify-center gap-2 select-none shadow-[0_0_20px_rgba(229,174,63,0.15)] ${
          canBid
            ? "bg-[#E5AE3F] text-[#070B12] hover:bg-[#F4C65E] active:scale-[0.99] cursor-pointer"
            : "bg-[#121A24] border border-[#202B38] text-[#8B98A8] cursor-not-allowed"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transmitting Bid...</span>
          </>
        ) : isSquadLimitReached ? (
          `Squad Limit Reached (${wonItemsCount}/${squadLimit})`
        ) : !isAuctionLive ? (
          "Auction Paused"
        ) : !isItemActive ? (
          "Waiting for Next Player"
        ) : !hasSufficientBudget ? (
          "Purse Exceeded"
        ) : (
          <>
            <ArrowUp className="w-4 h-4 stroke-[3]" />
            <span>PLACE BID — {formatExactINR(selectedBidAmount)}</span>
          </>
        )}
      </button>

      {/* Custom Bid Increment */}
      <div className="pt-1 flex items-center gap-3 text-[12px] text-[#8B98A8]">
        <span className="shrink-0 font-medium">Custom Amount:</span>
        <input
          type="number"
          step={minIncrement}
          min={minRequiredBid}
          max={remainingBudget}
          placeholder={`Min ${formatINR(minRequiredBid)}`}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          disabled={!isAuctionLive || !isItemActive || isSquadLimitReached || loading}
          className="flex-1 px-3 py-1.5 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] font-hero text-[15px] tabular-nums focus:outline-none focus:border-[#E5AE3F]"
        />
      </div>

      {/* Mobile Sticky Bottom Bid Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D131C]/95 border-t border-[#202B38] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between mb-2 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8B98A8]">Current:</span>
            <span className="font-hero font-bold text-[#E5AE3F] tabular-nums text-[14px]">
              {currentHighestBid > 0 ? formatINR(currentHighestBid) : "₹0"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8B98A8]">Next:</span>
            <span className="font-hero font-bold text-[#F5F7FA] tabular-nums text-[14px]">
              {formatINR(minRequiredBid)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#8B98A8]">Squad:</span>
            <span className={`font-hero font-bold tabular-nums ${isSquadLimitReached ? "text-[#FF5C5C]" : "text-[#E5AE3F]"}`}>
              {wonItemsCount}/{squadLimit}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handlePlaceBid(selectedBidAmount)}
          disabled={!canBid}
          className={`w-full min-h-[48px] rounded-[4px] font-bold text-[15px] tracking-wide uppercase transition-all flex items-center justify-center gap-2 select-none shadow-lg ${
            canBid
              ? "bg-[#E5AE3F] text-[#070B12] active:scale-[0.98] cursor-pointer"
              : "bg-[#121A24] border border-[#202B38] text-[#8B98A8] cursor-not-allowed"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSquadLimitReached ? (
            `Squad Full (${wonItemsCount}/${squadLimit})`
          ) : !isItemActive ? (
            "Waiting for Player"
          ) : (
            `BID ${formatExactINR(selectedBidAmount)}`
          )}
        </button>
      </div>
    </div>
  );
}
