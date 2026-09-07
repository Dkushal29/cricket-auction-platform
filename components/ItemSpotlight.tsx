"use client";

import React, { useEffect, useState } from "react";
import { ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Shield, Timer, Award, Zap } from "lucide-react";

interface ItemSpotlightProps {
  item: ClientItem | null;
  currentHighestBid: number;
  highestBidderName?: string;
  highestBidderTeam?: string;
  secondsRemaining: number | null;
  timerDuration?: number;
  antiSnipeThreshold?: number;
  isPaused?: boolean;
}

export function ItemSpotlight({
  item,
  currentHighestBid,
  highestBidderName,
  highestBidderTeam,
  secondsRemaining,
  timerDuration = 15,
  isPaused,
}: ItemSpotlightProps) {
  const [snapAnimate, setSnapAnimate] = useState(false);
  const isSold = item?.status === "SOLD";
  const isUnsold = item?.status === "UNSOLD";
  const isFinalUnsold = item?.status === "FINAL_UNSOLD";
  const isRound2 = (item?.round ?? 1) >= 2;

  // Trigger scale-pulse snap animation whenever currentHighestBid updates
  useEffect(() => {
    if (currentHighestBid > 0) {
      setSnapAnimate(true);
      const timer = setTimeout(() => setSnapAnimate(false), 240);
      return () => clearTimeout(timer);
    }
  }, [currentHighestBid]);

  if (!item) {
    return (
      <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-8 sm:p-12 flex flex-col items-center justify-center min-h-[460px] text-center">
        <div className="w-12 h-12 rounded-[4px] border border-[#2B343C] bg-[#10151A] flex items-center justify-center text-[#8B939A] mb-3">
          <Timer className="w-6 h-6" />
        </div>
        <h2 className="text-[17px] font-semibold text-[#EDEAE1] mb-1">
          Awaiting next lot on spotlight
        </h2>
        <p className="text-[14px] text-[#8B939A] max-w-sm">
          The auctioneer will bring the next player to the stage shortly.
        </p>
      </div>
    );
  }

  const isLowTime = secondsRemaining !== null && secondsRemaining <= 4 && secondsRemaining > 0;
  const isFinalizing = secondsRemaining === 0;

  return (
    <div className={`bg-[#1B2229] border border-[#2B343C] rounded-[4px] relative overflow-hidden flex flex-col justify-between ${isSold ? "animate-brass-flash" : ""}`}>
      {/* Top Meta Bar */}
      <div className="p-4 sm:p-5 border-b border-[#2B343C] flex items-center justify-between gap-3 bg-[#161D24]">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] font-bold text-[#8B939A]">
            LOT #{item.orderIndex}
          </span>
          <span className="text-[14px] font-semibold text-[#EDEAE1]">
            {item.category}
          </span>
          {isRound2 ? (
            <span className="px-2.5 py-0.5 rounded-[2px] bg-[#C7A046]/15 border border-[#C7A046]/40 text-[12px] font-bold text-[#C7A046]">
              ROUND 2 RE-AUCTION
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[12px] font-medium text-[#8B939A]">
              ROUND 1
            </span>
          )}
        </div>

        {/* Header Digital Timer Badge */}
        {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-[2px] border transition-colors ${
              isLowTime
                ? "bg-[#10151A] border-[#C7A046] text-[#C7A046] animate-pulse"
                : isFinalizing
                ? "bg-[#C7A046]/20 border-[#C7A046] text-[#C7A046]"
                : "bg-[#10151A] border-[#2B343C] text-[#EDEAE1]"
            }`}>
              <Timer className="w-3.5 h-3.5 text-[#C7A046]" />
              <span className="font-hero text-[18px] font-bold tabular-nums">
                {isFinalizing ? "0s" : `${secondsRemaining}s`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Stage: Player Visuals & Hero Bid & Current Holder Card */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side (Player Image & Bio) */}
        <div className="lg:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[4px] border border-[#2B343C] overflow-hidden bg-[#10151A] mb-4 relative shrink-0">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#8B939A] bg-[#161D24] text-[13px] font-semibold gap-1">
                <Award className="w-8 h-8 text-[#2B343C]" />
                <span>{item.name}</span>
              </div>
            )}

            {/* SOLD Broadcast Overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-[#10151A]/90 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center border-2 border-[#C7A046]">
                <span className="font-hero text-[40px] font-black text-[#C7A046] tracking-wider uppercase leading-none">
                  SOLD
                </span>
                <span className="text-[13px] font-bold text-[#EDEAE1] mt-2 line-clamp-1">
                  {highestBidderTeam || "Winner"}
                </span>
                <span className="text-[14px] font-hero font-bold text-[#C7A046] mt-0.5 tabular-nums">
                  {formatExactINR(currentHighestBid)}
                </span>
              </div>
            )}

            {/* UNSOLD Stamp */}
            {isUnsold && (
              <div className="absolute inset-0 bg-[#10151A]/90 flex flex-col items-center justify-center p-2 text-center border border-[#2B343C]">
                <span className="font-hero text-[32px] font-black text-[#8B939A] tracking-wider uppercase">
                  UNSOLD
                </span>
                <span className="text-[11px] text-[#8B939A] mt-1 font-medium">
                  Eligible for Round 2 Pool
                </span>
              </div>
            )}

            {/* FINAL UNSOLD Stamp */}
            {isFinalUnsold && (
              <div className="absolute inset-0 bg-[#10151A]/90 flex flex-col items-center justify-center p-2 text-center border border-[#B85C38]">
                <span className="font-hero text-[28px] font-black text-[#B85C38] tracking-wider uppercase leading-none">
                  FINAL UNSOLD
                </span>
                <span className="text-[11px] text-[#8B939A] mt-1 font-medium">
                  Passed Out of Auction
                </span>
              </div>
            )}
          </div>

          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#EDEAE1] leading-tight mb-1 font-hero tracking-wide">
            {item.name}
          </h1>
          <p className="text-[13px] text-[#8B939A] mb-2">
            Base price: <strong className="text-[#EDEAE1] font-semibold">{formatExactINR(item.basePrice)}</strong>
          </p>
          <p className="text-[13px] text-[#8B939A] line-clamp-2 max-w-xs">
            {item.description || "Top tier cricket athlete on the auction block."}
          </p>
        </div>

        {/* Right Side (Hero Brass Bid Number + Prominent Holder Card + 15s Clock) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center lg:items-end lg:text-right border-t lg:border-t-0 lg:border-l border-[#2B343C] pt-6 lg:pt-0 lg:pl-8 space-y-4">
          <div>
            <span className="text-[12px] font-bold text-[#8B939A] uppercase tracking-widest mb-1 block">
              Current highest bid
            </span>

            <div
              className={`font-hero text-[72px] sm:text-[96px] lg:text-[112px] font-black text-[#C7A046] tabular-nums leading-none tracking-tight transition-transform duration-200 ${
                snapAnimate ? "animate-bid-snap" : ""
              }`}
            >
              {currentHighestBid > 0 ? formatExactINR(currentHighestBid) : "—"}
            </div>

            {currentHighestBid > 0 && (
              <div className="text-[15px] text-[#8B939A] mt-1 font-semibold">
                ({formatINR(currentHighestBid)})
              </div>
            )}
          </div>

          {/* Prominent Current Holder Card */}
          <div className="w-full pt-2">
            <div className="bg-[#10151A] border border-[#2B343C] rounded-[4px] p-3 flex flex-col items-center lg:items-end">
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B939A]">
                Current Holder
              </span>

              {highestBidderTeam || highestBidderName ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-7 h-7 rounded-[2px] bg-[#161D24] border border-[#2B343C] flex items-center justify-center text-[#C7A046]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-center lg:text-right">
                    <span className="text-[16px] font-bold text-[#EDEAE1] block leading-tight">
                      {highestBidderTeam || "Leading Team"}
                    </span>
                    {highestBidderName && (
                      <span className="text-[12px] text-[#8B939A] font-medium block">
                        {highestBidderName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[13px] font-bold text-[#8B939A] mt-1">
                  NO BIDS YET (Min opening: {formatExactINR(item.basePrice)})
                </span>
              )}
            </div>
          </div>

          {/* Prominent Visible 15-Second Bid Timer Module */}
          {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
            <div className="w-full pt-1 flex flex-col items-center lg:items-end">
              <div
                className={`w-full flex flex-col items-center justify-center px-6 py-2.5 rounded-[4px] border transition-all ${
                  isFinalizing
                    ? "bg-[#C7A046]/15 border-[#C7A046] animate-pulse"
                    : isLowTime
                    ? "bg-[#C7A046]/10 border-[#C7A046] text-[#C7A046]"
                    : "bg-[#10151A] border-[#2B343C] text-[#EDEAE1]"
                }`}
              >
                <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B939A]">
                  15s Rolling Clock
                </span>
                {isFinalizing ? (
                  <span className="text-[16px] font-bold text-[#C7A046] py-1">
                    FINALIZING LOT...
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1.5 my-0.5">
                    <span
                      className={`font-hero text-[44px] sm:text-[52px] font-black tabular-nums leading-none ${
                        isLowTime ? "text-[#C7A046] animate-pulse" : "text-[#EDEAE1]"
                      }`}
                    >
                      {secondsRemaining}
                    </span>
                    <span className="text-[12px] font-bold text-[#8B939A] uppercase">
                      Seconds
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thin Timer Progress Line */}
      {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
        <div className="w-full h-1.5 bg-[#10151A] border-t border-[#2B343C] overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLowTime ? "bg-[#C7A046] animate-pulse" : "bg-[#C7A046]"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (secondsRemaining / (timerDuration || 15)) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
