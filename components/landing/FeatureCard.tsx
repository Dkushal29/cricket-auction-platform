"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: string;
  badge?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  accentColor = "#D9A94E",
  badge,
}: FeatureCardProps) {
  return (
    <div className="group relative p-6 rounded-[4px] bg-[#131A22] border border-[#232C36] hover:border-[#D9A94E]/50 transition-all duration-200 hover:-translate-y-1 shadow-md flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div
            className="w-10 h-10 rounded-[4px] bg-[#0A0F16] border border-[#232C36] flex items-center justify-center transition-colors group-hover:border-[#D9A94E]/40"
            style={{ color: accentColor }}
          >
            <Icon className="w-5 h-5" />
          </div>

          {badge && (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-[2px] bg-[#0A0F16] border border-[#232C36] text-[#D9A94E]">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-[17px] font-bold text-[#F5F3EE] group-hover:text-[#D9A94E] transition-colors leading-snug">
          {title}
        </h3>

        <p className="text-[13px] text-[#8B93A0] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-2 border-t border-[#232C36]/50 flex items-center justify-between text-[11px] text-[#8B93A0]">
        <span className="group-hover:text-[#F5F3EE] transition-colors font-medium">
          Explore Capability
        </span>
        <span style={{ color: accentColor }} className="font-bold">→</span>
      </div>
    </div>
  );
}
