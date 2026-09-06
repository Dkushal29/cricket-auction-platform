"use client";

import React, { useEffect, useState } from "react";
import { ClientAuction } from "@/lib/types";
import { NavBar } from "@/components/landing/NavBar";
import { Hero } from "@/components/landing/Hero";
import { LiveStatsBar } from "@/components/landing/LiveStatsBar";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { LegendsSection } from "@/components/landing/LegendsSection";
import { ActiveArenasSection } from "@/components/landing/ActiveArenasSection";
import { Footer } from "@/components/landing/Footer";
import { JoinRoomModal } from "@/components/landing/JoinRoomModal";

export default function LandingPage() {
  const [auctions, setAuctions] = useState<ClientAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetch("/api/auctions")
      .then((res) => res.json())
      .then((data) => {
        if (data.auctions) {
          setAuctions(data.auctions);
        }
      })
      .catch((err) => console.error("Error fetching live auctions:", err))
      .finally(() => setLoading(false));
  }, []);

  const activeAuctions = auctions.filter((a) => a.status === "LIVE" || a.status === "PAUSED");
  const totalPlayers = auctions.reduce((acc, a) => acc + (a.items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#0A0F16] text-[#F5F3EE] flex flex-col justify-between selection:bg-[#D9A94E] selection:text-[#0A0F16]">
      {/* Cinematic Navigation Bar */}
      <NavBar onOpenJoinModal={() => setShowJoinModal(true)} />

      {/* Main Page Stream */}
      <main className="flex-1 space-y-0">
        {/* Hero Banner with Stadium Broadcast Presentation */}
        <Hero onOpenJoinModal={() => setShowJoinModal(true)} />

        {/* Live Metrics & Social Proof Bar */}
        <LiveStatsBar
          activeAuctionsCount={activeAuctions.length}
          totalPlayersAuctioned={totalPlayers > 0 ? totalPlayers : 86}
        />

        {/* Live Arenas Showcase Strip */}
        <ActiveArenasSection auctions={auctions} />

        {/* 6-Pillar Core Architecture Grid */}
        <FeatureGrid />

        {/* From Legends to Rising Stars (Workflow & Still Life Showcase) */}
        <LegendsSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Room Code Join Modal */}
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
