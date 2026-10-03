"use client";

import React, { useState } from "react";
import { NavBar } from "@/components/landing/NavBar";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { JoinRoomModal } from "@/components/landing/JoinRoomModal";

export default function LandingPage() {
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12] overflow-x-hidden">
      {/* Clean Minimal Sports Navbar */}
      <NavBar onOpenJoinModal={() => setShowJoinModal(true)} />

      {/* Hero Section with Cinematic Background */}
      <main className="flex-1 flex flex-col">
        <Hero onOpenJoinModal={() => setShowJoinModal(true)} />
      </main>

      {/* Minimal Footer */}
      <Footer />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
