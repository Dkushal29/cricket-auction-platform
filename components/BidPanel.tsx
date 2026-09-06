"use client";

import React, { useState } from "react";
import { ClientAuction, ClientItem, ClientParticipant } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastNotifications";
import { ShieldCheck, AlertCircle } from "lucide-react";

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
  const isBidder = user?.role === "BIDDER";
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
  const isCurrentLeader = highestBidderId === user?.id;

  const canBid =
    isAuctionLive &&
    isItemActive &&
    isBidder &&
    hasSufficientBudget &&
    selectedBidAmount >= minRequiredBid &&
    !loading;

  const handlePlaceBid = async (amountToBid: number) => {
    if (!item) return;
    if (!user) {
      addToast("Please log in to submit a bid", "error");
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
    <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 sm:p-5 space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[#EDEAE1]">
            Place bid
          </h3>
          <p className="text-[13px] text-[#8B939A]">
            {participant?.teamName} rail console
          </p>
        </div>

        {isCurrentLeader && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[12px] font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Highest bidder</span>
          </div>
        )}
      </div>

      {/* Quick Increment Buttons */}
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
              className={`p-2.5 rounded-[2px] border text-left transition-all ${
                disabled
                  ? "bg-[#10151A] border-[#2B343C] text-[#8B939A] opacity-50 cursor-not-allowed"
                  : "bg-[#10151A] border-[#2B343C] hover:border-[#8B939A] text-[#EDEAE1] active:scale-[0.98]"
              }`}
            >
              <span className="text-[11px] text-[#8B939A] block">+{formatINR(inc)}</span>
              <span className="font-hero text-[16px] font-bold tabular-nums block">
                {formatINR(calculatedBid)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Bid Input & Projected Purse Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C]">
        <div>
          <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
            Custom amount (₹)
          </label>
          <input
            type="number"
            step={minIncrement}
            min={minRequiredBid}
            max={remainingBudget}
            placeholder={`Min ${minRequiredBid}`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            disabled={!isAuctionLive || !isItemActive || loading}
            className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[16px] tabular-nums focus:outline-none focus:border-[#8B939A]"
          />
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-[12px] font-medium text-[#8B939A] block mb-0.5">
            Your budget after this bid
          </span>
          <div
            className={`font-hero text-[20px] font-bold tabular-nums ${
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

      {/* Primary Action Button (no arrows appended per guidelines) */}
      <button
        type="button"
        onClick={() => handlePlaceBid(selectedBidAmount)}
        disabled={!canBid}
        className={`w-full py-3 rounded-[2px] font-semibold text-[15px] transition-all flex items-center justify-center ${
          canBid
            ? "bg-[#EDEAE1] text-[#10151A] hover:bg-white active:scale-[0.99]"
            : "bg-[#2B343C] text-[#8B939A] cursor-not-allowed"
        }`}
      >
        {loading
          ? "Submitting bid..."
          : !isAuctionLive
          ? "Auction paused"
          : !isItemActive
          ? "Waiting for active lot"
          : !hasSufficientBudget
          ? "Insufficient budget"
          : `Place bid for ${formatExactINR(selectedBidAmount)}`}
      </button>
    </div>
  );
}
