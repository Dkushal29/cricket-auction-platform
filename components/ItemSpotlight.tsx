"use client";

import React, { useEffect, useState } from "react";
import { ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Shield, Timer, Zap } from "lucide-react";

interface ItemSpotlightProps {
  item: ClientItem | null;
  currentHighestBid: number;
  highestBidderName?: string;
  highestBidderTeam?: string;
  secondsRemaining: number | null;
  timerDuration: number;
  antiSnipeThreshold: number;
  isPaused?: boolean;
}

export function ItemSpotlight({
  item,
  currentHighestBid,
  highestBidderName,
  highestBidderTeam,
  secondsRemaining,
  timerDuration,
  antiSnipeThreshold,
  isPaused,
}: ItemSpotlightProps) {
  const [snapAnimate, setSnapAnimate] = useState(false);
  const isSold = item?.status === "SOLD";
  const isUnsold = item?.status === "UNSOLD";

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
          Awaiting next item on spotlight
        </h2>
        <p className="text-[14px] text-[#8B939A] max-w-sm">
          The auctioneer will bring the next player to the stage shortly.
        </p>
      </div>
    );
  }

  const isCriticalTimer = secondsRemaining !== null && secondsRemaining <= antiSnipeThreshold && secondsRemaining > 0;

  return (
    <div className={`bg-[#1B2229] border border-[#2B343C] rounded-[4px] relative overflow-hidden flex flex-col justify-between ${isSold ? "animate-brass-flash" : ""}`}>
      {/* Top Meta Bar */}
      <div className="p-4 sm:p-5 border-b border-[#2B343C] flex items-center justify-between gap-3 bg-[#161D24]">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] font-medium text-[#8B939A]">
            Lot #{item.orderIndex}
          </span>
          <span className="text-[14px] font-medium text-[#EDEAE1]">
            {item.category}
          </span>
        </div>

        {/* Server Authoritative Timer Readout */}
        {secondsRemaining !== null && (
          <div className="flex items-center gap-2">
            {isCriticalTimer && (
              <span className="hidden sm:inline text-[12px] font-semibold text-[#C7A046] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Anti-snipe active
              </span>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-[2px] border ${
              isCriticalTimer
                ? "bg-[#10151A] border-[#C7A046] text-[#C7A046]"
                : "bg-[#10151A] border-[#2B343C] text-[#EDEAE1]"
            }`}>
              <Timer className="w-3.5 h-3.5 text-[#8B939A]" />
              <span className="font-hero text-[20px] font-bold tabular-nums">
                {secondsRemaining}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Stage: Player Visuals & Huge Hero Bid Readout */}
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
              <div className="w-full h-full flex items-center justify-center text-[#8B939A] text-[14px]">
                No photo
              </div>
            )}

            {/* SOLD Stamp in Brass */}
            {isSold && (
              <div className="absolute inset-0 bg-[#10151A]/85 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center border border-[#C7A046]">
                <span className="font-hero text-[36px] font-black text-[#C7A046] tracking-wider uppercase leading-none">
                  SOLD
                </span>
                <span className="text-[12px] font-medium text-[#EDEAE1] mt-1 line-clamp-1">
                  {highestBidderTeam || "Winner"}
                </span>
              </div>
            )}

            {/* UNSOLD Stamp */}
            {isUnsold && (
              <div className="absolute inset-0 bg-[#10151A]/85 flex flex-col items-center justify-center p-2 text-center border border-[#2B343C]">
                <span className="font-hero text-[30px] font-black text-[#8B939A] tracking-wider uppercase">
                  UNSOLD
                </span>
              </div>
            )}
          </div>

          <h1 className="text-[22px] sm:text-[26px] font-bold text-[#EDEAE1] leading-tight mb-1">
            {item.name}
          </h1>
          <p className="text-[13px] text-[#8B939A] mb-2">
            Base price: <strong className="text-[#EDEAE1] font-semibold">{formatExactINR(item.basePrice)}</strong>
          </p>
          <p className="text-[13px] text-[#8B939A] line-clamp-2 max-w-xs">
            {item.description}
          </p>
        </div>

        {/* Right Side (Hero Brass Bid Number: 96-120px) */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center lg:items-end lg:text-right border-t lg:border-t-0 lg:border-l border-[#2B343C] pt-6 lg:pt-0 lg:pl-8">
          <span className="text-[13px] font-medium text-[#8B939A] uppercase tracking-wider mb-1">
            Current highest bid
          </span>

          <div
            className={`font-hero text-[80px] sm:text-[104px] lg:text-[116px] font-black text-[#C7A046] tabular-nums leading-none tracking-tight transition-transform duration-200 ${
              snapAnimate ? "animate-bid-snap" : ""
            }`}
          >
            {currentHighestBid > 0 ? formatExactINR(currentHighestBid) : "—"}
          </div>

          {currentHighestBid > 0 && (
            <div className="text-[15px] text-[#8B939A] mt-1 font-medium">
              ({formatINR(currentHighestBid)})
            </div>
          )}

          {/* Current Leader */}
          <div className="mt-5 pt-4 border-t border-[#2B343C] w-full flex items-center justify-center lg:justify-end gap-2.5">
            {highestBidderTeam ? (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#8B939A]" />
                <span className="text-[14px] font-semibold text-[#EDEAE1]">
                  Leading: {highestBidderTeam}
                </span>
                <span className="text-[13px] text-[#8B939A]">
                  ({highestBidderName})
                </span>
              </div>
            ) : (
              <span className="text-[13px] text-[#8B939A]">
                Waiting for opening bid (min: {formatExactINR(item.basePrice)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thin Timer Progress Line */}
      {secondsRemaining !== null && timerDuration > 0 && (
        <div className="w-full h-1 bg-[#10151A] border-t border-[#2B343C] overflow-hidden">
          <div
            className="h-full bg-[#C7A046] transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, (secondsRemaining / timerDuration) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
