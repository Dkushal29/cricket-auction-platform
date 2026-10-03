"use client";

import React, { useEffect, useState } from "react";
import { ClientItem } from "@/lib/types";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { Timer, Award, Shield, Clock } from "lucide-react";

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
  const [showNewHighestBid, setShowNewHighestBid] = useState(false);
  const isSold = item?.status === "SOLD";
  const isUnsold = item?.status === "UNSOLD";
  const isFinalUnsold = item?.status === "FINAL_UNSOLD";
  const currentRound = item?.round ?? 1;

  // Trigger scale-pulse snap animation and prominent announcement on bid update
  useEffect(() => {
    if (currentHighestBid > 0 && !isSold) {
      setSnapAnimate(true);
      setShowNewHighestBid(true);
      const snapTimer = setTimeout(() => setSnapAnimate(false), 240);
      const bannerTimer = setTimeout(() => setShowNewHighestBid(false), 1200);
      return () => {
        clearTimeout(snapTimer);
        clearTimeout(bannerTimer);
      };
    }
  }, [currentHighestBid, isSold]);

  if (!item) {
    return (
      <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-8 sm:p-12 flex flex-col items-center justify-center min-h-[440px] text-center">
        <div className="w-12 h-12 rounded-[4px] border border-[#202B38] bg-[#070B12] flex items-center justify-center text-[#8B98A8] mb-3">
          <Timer className="w-6 h-6 text-[#E5AE3F]" />
        </div>
        <h2 className="font-hero text-[24px] font-bold text-[#F5F7FA] mb-1 uppercase tracking-wide">
          Awaiting Next Lot On Stage
        </h2>
        <p className="text-[13px] text-[#8B98A8] max-w-sm">
          The auctioneer will spotlight the next cricket player lot shortly.
        </p>
      </div>
    );
  }

  const isLowTime = secondsRemaining !== null && secondsRemaining <= 4 && secondsRemaining > 0;
  const isFinalizing = secondsRemaining === 0;

  return (
    <div className={`bg-[#0D131C] border border-[#202B38] rounded-[4px] relative overflow-hidden flex flex-col justify-between ${isSold ? "border-[#C7A046] shadow-[0_0_30px_rgba(199,160,70,0.25)]" : ""}`}>
      {/* Prominent Real-time NEW HIGHEST BID Announcement Banner */}
      {showNewHighestBid && (
        <div className="absolute inset-x-0 top-14 z-30 flex justify-center pointer-events-none px-4 transition-all duration-300">
          <div className="bg-[#10151A]/95 border-2 border-[#C7A046] shadow-[0_0_25px_rgba(199,160,70,0.4)] px-6 py-2.5 rounded-[4px] text-center max-w-md w-full backdrop-blur-md animate-bounce-short">
            <div className="text-[11px] font-bold tracking-widest text-[#C7A046] uppercase">
              NEW HIGHEST BID
            </div>
            <div className="font-hero text-[30px] sm:text-[38px] font-black text-[#EDEAE1] tabular-nums leading-tight">
              {formatExactINR(currentHighestBid)}
            </div>
            <div className="text-[13px] font-bold text-[#C7A046] truncate">
              {highestBidderTeam || highestBidderName || "Leading Team"}
            </div>
          </div>
        </div>
      )}

      {/* Prominent SOLD Full Overlay Banner */}
      {isSold && (
        <div className="absolute inset-0 z-40 bg-[#10151A]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center border-2 border-[#C7A046]">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#C7A046] bg-[#C7A046]/10 px-3 py-1 rounded-[2px] border border-[#C7A046]/30 mb-2">
            ROUND {currentRound} SOLD
          </span>
          <span className="font-hero text-[60px] sm:text-[84px] font-black text-[#C7A046] tracking-wider uppercase leading-none drop-shadow-[0_0_25px_rgba(199,160,70,0.5)]">
            SOLD
          </span>
          <span className="text-[18px] sm:text-[22px] font-bold text-[#EDEAE1] mt-2">
            {highestBidderTeam || highestBidderName || "Winning Franchise"}
          </span>
          <span className="font-hero text-[32px] sm:text-[42px] font-black text-[#C7A046] mt-0.5 tabular-nums">
            {formatExactINR(currentHighestBid || item.winningPrice || 0)}
          </span>
        </div>
      )}

      {/* Prominent UNSOLD / FINAL_UNSOLD Full Overlay Banner */}
      {(isUnsold || isFinalUnsold) && (
        <div className="absolute inset-0 z-40 bg-[#10151A]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center border-2 border-[#B85C38]">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#8B939A] bg-[#1B2229] px-3 py-1 rounded-[2px] border border-[#2B343C] mb-2">
            LOT CLOSED
          </span>
          <span className="font-hero text-[48px] sm:text-[68px] font-black text-[#EDEAE1] tracking-wider uppercase leading-none">
            {isFinalUnsold ? "FINAL UNSOLD" : `UNSOLD — ROUND ${currentRound}`}
          </span>
          <span className="text-[14px] text-[#8B939A] mt-2 max-w-sm">
            {isFinalUnsold
              ? "All 3 rounds concluded. Player permanently passed out."
              : `Eligible for Round ${currentRound + 1} re-auction.`}
          </span>
        </div>
      )}
      {/* Top Meta Bar */}
      <div className="p-4 sm:p-4.5 border-b border-[#202B38] flex items-center justify-between gap-3 bg-[#121A24]">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[12px] font-mono font-bold text-[#8B98A8]">
            LOT #{item.orderIndex}
          </span>
          <span className="text-[13px] font-bold text-[#F5F7FA]">
            {item.category}
          </span>
          {currentRound > 1 ? (
            <span className="px-2 py-0.5 rounded-[2px] bg-[#E5AE3F]/15 border border-[#E5AE3F]/40 text-[11px] font-bold text-[#E5AE3F]">
              ROUND {currentRound} RE-AUCTION
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-[2px] bg-[#070B12] border border-[#202B38] text-[11px] font-medium text-[#8B98A8]">
              ROUND 1
            </span>
          )}
        </div>

        {/* Header Digital Timer Pill */}
        {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-[3px] border font-mono text-[13px] transition-colors ${
              isLowTime
                ? "bg-[#070B12] border-[#FF5C5C] text-[#FF5C5C] animate-pulse"
                : isFinalizing
                ? "bg-[#E5AE3F]/15 border-[#E5AE3F] text-[#E5AE3F]"
                : "bg-[#070B12] border-[#202B38] text-[#F5F7FA]"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-hero text-[18px] font-bold tabular-nums">
                {isFinalizing ? "0s" : `00:${String(secondsRemaining).padStart(2, "0")}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Stage */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: Player Image & Info */}
        <div className="lg:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[4px] border border-[#202B38] overflow-hidden bg-[#070B12] mb-3 relative shrink-0">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#8B98A8] bg-[#070B12] text-[13px] font-semibold gap-1">
                <Award className="w-8 h-8 text-[#202B38]" />
                <span>{item.name}</span>
              </div>
            )}

            {/* SOLD Overlay */}
            {isSold && (
              <div className="absolute inset-0 bg-[#070B12]/92 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center border-2 border-[#E5AE3F]">
                <span className="font-hero text-[44px] font-black text-[#E5AE3F] tracking-wider uppercase leading-none">
                  SOLD
                </span>
                <span className="text-[12px] font-bold text-[#F5F7FA] mt-1.5 truncate max-w-full">
                  {highestBidderTeam || "Winner"}
                </span>
                <span className="text-[15px] font-hero font-bold text-[#E5AE3F] mt-0.5 tabular-nums">
                  {formatExactINR(currentHighestBid)}
                </span>
              </div>
            )}

            {/* UNSOLD Stamp */}
            {isUnsold && (
              <div className="absolute inset-0 bg-[#070B12]/92 flex flex-col items-center justify-center p-2 text-center border border-[#202B38]">
                <span className="font-hero text-[34px] font-black text-[#8B98A8] tracking-wider uppercase">
                  UNSOLD
                </span>
                <span className="text-[10px] text-[#8B98A8] mt-1 font-mono uppercase">
                  Round 2 Eligible
                </span>
              </div>
            )}

            {/* FINAL UNSOLD Stamp */}
            {isFinalUnsold && (
              <div className="absolute inset-0 bg-[#070B12]/92 flex flex-col items-center justify-center p-2 text-center border border-[#FF5C5C]">
                <span className="font-hero text-[30px] font-black text-[#FF5C5C] tracking-wider uppercase leading-none">
                  FINAL UNSOLD
                </span>
                <span className="text-[10px] text-[#8B98A8] mt-1">
                  Passed Out
                </span>
              </div>
            )}
          </div>

          <h1 className="font-hero text-[32px] sm:text-[40px] font-black text-[#F5F7FA] leading-tight tracking-wide">
            {item.name}
          </h1>
          <p className="text-[13px] text-[#8B98A8] mb-1.5">
            Base price: <strong className="text-[#E5AE3F] font-semibold font-hero tabular-nums text-[16px]">{formatExactINR(item.basePrice)}</strong>
          </p>
          <p className="text-[12px] text-[#8B98A8] line-clamp-2 max-w-xs">
            {item.description || "Player active in current auction round."}
          </p>
        </div>

        {/* Right Side: Hero Bid Amount & Leading Team Card */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center lg:items-end lg:text-right border-t lg:border-t-0 lg:border-l border-[#202B38] pt-5 lg:pt-0 lg:pl-8 space-y-4">
          <div>
            <span className="text-[11px] font-bold text-[#8B98A8] uppercase tracking-widest mb-1 block">
              CURRENT HIGHEST BID
            </span>

            <div
              className={`font-hero text-[72px] sm:text-[96px] lg:text-[112px] font-black text-[#E5AE3F] tabular-nums leading-none tracking-tight transition-transform duration-200 ${
                snapAnimate ? "animate-bid-snap" : ""
              }`}
            >
              {currentHighestBid > 0 ? formatExactINR(currentHighestBid) : "—"}
            </div>

            {currentHighestBid > 0 && (
              <div className="text-[14px] text-[#8B98A8] mt-1 font-semibold">
                ({formatINR(currentHighestBid)})
              </div>
            )}
          </div>

          {/* Leading Team Holder Card */}
          <div className="w-full pt-1">
            <div className="bg-[#070B12] border border-[#202B38] rounded-[4px] p-3 flex flex-col items-center lg:items-end">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#8B98A8]">
                LEADING FRANCHISE
              </span>

              {highestBidderTeam || highestBidderName ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-[2px] bg-[#121A24] border border-[#202B38] flex items-center justify-center text-[#E5AE3F]">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-center lg:text-right">
                    <span className="text-[15px] font-bold text-[#F5F7FA] block leading-tight">
                      {highestBidderTeam || "Leading Team"}
                    </span>
                    {highestBidderName && (
                      <span className="text-[11px] text-[#8B98A8] font-medium block">
                        {highestBidderName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[12px] font-bold text-[#8B98A8] mt-1">
                  NO BIDS YET (Opening: {formatExactINR(item.basePrice)})
                </span>
              )}
            </div>
          </div>

          {/* Rolling Clock Bar */}
          {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
            <div className="w-full pt-1 flex flex-col items-center lg:items-end">
              <div
                className={`w-full flex flex-col items-center justify-center px-4 py-2 rounded-[4px] border transition-all ${
                  isFinalizing
                    ? "bg-[#E5AE3F]/15 border-[#E5AE3F] animate-pulse"
                    : isLowTime
                    ? "bg-[#FF5C5C]/10 border-[#FF5C5C] text-[#FF5C5C]"
                    : "bg-[#070B12] border-[#202B38] text-[#F5F7FA]"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#8B98A8]">
                  ROLLING AUCTION CLOCK
                </span>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={`font-hero text-[38px] sm:text-[46px] font-black tabular-nums leading-none ${
                      isLowTime ? "text-[#FF5C5C] animate-pulse" : "text-[#F5F7FA]"
                    }`}
                  >
                    00:{String(secondsRemaining).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thin Timer Progress Line */}
      {secondsRemaining !== null && !isSold && !isUnsold && !isFinalUnsold && (
        <div className="w-full h-1 bg-[#070B12] border-t border-[#202B38] overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLowTime ? "bg-[#FF5C5C] animate-pulse" : "bg-[#E5AE3F]"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (secondsRemaining / (timerDuration || 15)) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
