"use client";

import React from "react";

export function ItemSpotlightSkeleton() {
  return (
    <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-6 sm:p-8 animate-pulse space-y-6 min-h-[420px]">
      <div className="flex items-center justify-between border-b border-[#2B343C] pb-4">
        <div className="h-5 w-24 bg-[#10151A] rounded-[2px]" />
        <div className="h-6 w-32 bg-[#10151A] rounded-[2px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 flex flex-col items-center sm:items-start space-y-3">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[4px] bg-[#10151A] border border-[#2B343C]" />
          <div className="h-7 w-48 bg-[#10151A] rounded-[2px]" />
          <div className="h-4 w-32 bg-[#10151A] rounded-[2px]" />
        </div>

        <div className="lg:col-span-7 flex flex-col items-center lg:items-end space-y-4">
          <div className="h-4 w-24 bg-[#10151A] rounded-[2px]" />
          <div className="h-24 w-64 bg-[#10151A] rounded-[4px]" />
          <div className="h-10 w-56 bg-[#10151A] rounded-[2px]" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-4 animate-pulse space-y-3">
      <div className="h-5 w-1/3 bg-[#10151A] rounded-[2px]" />
      <div className="h-4 w-2/3 bg-[#10151A] rounded-[2px]" />
      <div className="h-10 w-full bg-[#10151A] rounded-[2px]" />
    </div>
  );
}
