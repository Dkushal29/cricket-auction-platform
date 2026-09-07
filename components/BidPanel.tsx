"use client";

import React, { useState } from "react";
import { ClientAuction, ClientItem, ClientParticipant } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastNotifications";
import { ShieldCheck, AlertCircle, Zap, Loader2 } from "lucide-react";

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

  // Minimum required bid to be valid
  const minRequiredBid = currentHighestBid > 0
    ? currentHighestBid + minIncrement
    : item?.basePrice || minIncrement;

  // Selected bid amount
  const parsedCustom = parseInt(customAmount.replace(/,/g, ""), 10);
  const selectedBidAmount = !isNaN(parsedCustom) && parsedCustom > 0 ? parsedCustom : minRequiredBid;

  // Budget calculations
  const remainingBudget = participant?.remainingBudget || 0;
  const projectedRemainingBudget = remainingBudget - selectedBidAmount;
  const hasSufficientBudget = remainingBudget >= selectedBidAmount;
  const isCurrentLeader = (user?.id && highestBidderId === user.id) || (participant?.userId && highestBidderId === participant.userId);

  const canBid =
    isAuctionLive &&
    isItemActive &&
    isBidder &&
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

  return (
    <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 sm:p-5 space-y-4 shadow-lg">
      {/* Header info */}
      <div className="flex items-center justify-between border-b border-[#2B343C] pb-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#EDEAE1] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#C7A046]" />
            <span>Place Bid Console</span>
          </h3>
          <p className="text-[12px] text-[#8B939A]">
            {participant?.teamName || "Team"} • Purse: <strong className="text-[#EDEAE1] font-hero tabular-nums">{formatINR(remainingBudget)}</strong>
          </p>
        </div>

        {isCurrentLeader && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-emerald-500/10 border border-emerald-500/40 text-[12px] font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Highest Bidder</span>
          </div>
        )}
      </div>

      {/* Quick Increment Buttons with 52px Minimum Touch Target */}
      <div>
        <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B939A] block mb-2">
          Quick Bid Increments
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10].map((inc) => {
            const calculatedBid = (currentHighestBid > 0 ? currentHighestBid : item?.basePrice || 0) + inc;
            const disabled = !isAuctionLive || !isItemActive || remainingBudget < calculatedBid || loading;

            return (
              <button
                key={inc}
                type="button"
                onClick={() => {
                  setCustomAmount(calculatedBid.toString());
                  handlePlaceBid(calculatedBid);
                }}
                disabled={disabled}
                className={`min-h-[52px] p-2.5 rounded-[2px] border text-left transition-all flex flex-col justify-center ${
                  disabled
                    ? "bg-[#10151A] border-[#2B343C] text-[#8B939A] opacity-50 cursor-not-allowed"
                    : "bg-[#10151A] border-[#2B343C] hover:border-[#C7A046] text-[#EDEAE1] active:scale-[0.98]"
                }`}
              >
                <span className="text-[11px] text-[#8B939A] font-medium block">+{formatINR(inc)}</span>
                <span className="font-hero text-[17px] font-bold tabular-nums block text-[#C7A046]">
                  {formatINR(calculatedBid)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Bid Input & Projected Purse Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C]">
        <div>
          <label className="text-[11px] font-bold text-[#8B939A] uppercase tracking-wider block mb-1">
            Custom Amount (INR)
          </label>
          <input
            type="number"
            step={minIncrement}
            min={minRequiredBid}
            max={remainingBudget}
            placeholder={`Min ${formatINR(minRequiredBid)}`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            disabled={!isAuctionLive || !isItemActive || loading}
            className="w-full px-3 py-2 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[18px] tabular-nums focus:outline-none focus:border-[#C7A046]"
          />
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-[11px] font-bold text-[#8B939A] uppercase tracking-wider block mb-0.5">
            Purse After Bid
          </span>
          <div
            className={`font-hero text-[22px] font-bold tabular-nums ${
              projectedRemainingBudget < 0 ? "text-red-400" : "text-[#EDEAE1]"
            }`}
          >
            {formatExactINR(projectedRemainingBudget)}
          </div>
          <span className="text-[11px] text-[#8B939A]">
            Current available: {formatINR(remainingBudget)}
          </span>
        </div>
      </div>

      {/* Primary High-Impact Place Bid Button (Minimum 52px Height, Touch-Friendly) */}
      <button
        type="button"
        onClick={() => handlePlaceBid(selectedBidAmount)}
        disabled={!canBid}
        className={`w-full min-h-[54px] rounded-[2px] font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${
          canBid
            ? "bg-[#C7A046] text-[#10151A] hover:bg-[#D9A94E] active:scale-[0.99] shadow-md cursor-pointer"
            : "bg-[#2B343C] text-[#8B939A] cursor-not-allowed"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Submitting Bid...</span>
          </>
        ) : !isAuctionLive ? (
          "Auction Paused"
        ) : !isItemActive ? (
          "Waiting for Active Lot"
        ) : !hasSufficientBudget ? (
          "Insufficient Budget"
        ) : (
          `PLACE BID FOR ${formatExactINR(selectedBidAmount)}`
        )}
      </button>
    </div>
  );
}
