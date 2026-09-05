"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { AUCTION_PRESETS } from "@/lib/auction-templates";
import { ArrowLeft, Check, ChevronRight, Gavel, Plus, Trash2, Trophy, Users, Shield, Layers, Settings } from "lucide-react";

export default function CreateAuctionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Details
  const [name, setName] = useState("Champions Cricket League 2026");
  const [description, setDescription] = useState("Private multiplayer cricket mega auction with friends");
  const [sport, setSport] = useState("Cricket");
  const [season, setSeason] = useState("2026");
  const [bannerUrl, setBannerUrl] = useState("");

  // Step 2: Teams
  const [teamAName, setTeamAName] = useState("Royal Challengers");
  const [teamALogo, setTeamALogo] = useState("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150&auto=format&fit=crop&q=80");
  const [teamBName, setTeamBName] = useState("Chennai Super Kings");
  const [teamBLogo, setTeamBLogo] = useState("https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80");

  // Step 3: Budgets
  const [initialBudget, setInitialBudget] = useState(100000000); // 10 Cr

  // Step 4: Players
  const [players, setPlayers] = useState([
    {
      name: "Jasprit Bumrah",
      category: "Bowler",
      basePrice: 20000000,
      matches: 133,
      wickets: 165,
      economy: 6.82,
      runs: 62,
      strikeRate: 115.4,
      imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80",
      description: "Premier death-over yorker specialist with lethal accuracy and sub-7 economy.",
    },
    {
      name: "Heinrich Klaasen",
      category: "Wicket-Keeper",
      basePrice: 15000000,
      matches: 89,
      wickets: 0,
      economy: 0.0,
      runs: 2450,
      strikeRate: 178.6,
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80",
      description: "Destructive middle-order spin destroyer boasting a 180+ strike rate in death overs.",
    },
    {
      name: "Rashid Khan",
      category: "All-Rounder",
      basePrice: 20000000,
      matches: 121,
      wickets: 149,
      economy: 6.67,
      runs: 840,
      strikeRate: 162.3,
      imageUrl: "https://images.unsplash.com/photo-1531415074868-036b1c57e3ce?w=600&auto=format&fit=crop&q=80",
      description: "World #1 T20 leg-spinner with unpickable googlies and explosive pinch-hitting capability.",
    },
    {
      name: "Travis Head",
      category: "Batsman",
      basePrice: 15000000,
      matches: 78,
      wickets: 8,
      economy: 8.9,
      runs: 2190,
      strikeRate: 184.2,
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
      description: "Fearless southpaw opener averaging 200+ strike rate in powerplay overs with rapid centuries.",
    },
    {
      name: "Andre Russell",
      category: "All-Rounder",
      basePrice: 15000000,
      matches: 124,
      wickets: 112,
      economy: 9.1,
      runs: 2480,
      strikeRate: 174.9,
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80",
      description: "High-impact power-hitter capable of 145km/h bowling spells and match-turning 6-hitting.",
    },
  ]);

  // Player Form State for adding another player
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerCategory, setNewPlayerCategory] = useState("Batsman");
  const [newPlayerBasePrice, setNewPlayerBasePrice] = useState(10000000);
  const [newPlayerImageUrl, setNewPlayerImageUrl] = useState("");
  const [newPlayerRuns, setNewPlayerRuns] = useState("");
  const [newPlayerWickets, setNewPlayerWickets] = useState("");

  // Step 5: Rules
  const [minimumBidIncrement, setMinimumBidIncrement] = useState(500000);
  const [timerDuration, setTimerDuration] = useState(30);
  const [antiSnipeThreshold, setAntiSnipeThreshold] = useState(5);
  const [antiSnipeExtension, setAntiSnipeExtension] = useState(10);
  const [minSquadSize, setMinSquadSize] = useState(11);
  const [maxSquadSize, setMaxSquadSize] = useState(25);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setPlayers((prev) => [
      ...prev,
      {
        name: newPlayerName,
        category: newPlayerCategory,
        basePrice: newPlayerBasePrice,
        matches: 50,
        wickets: newPlayerWickets ? parseInt(newPlayerWickets, 10) : 0,
        economy: 7.5,
        runs: newPlayerRuns ? parseInt(newPlayerRuns, 10) : 0,
        strikeRate: 140.0,
        imageUrl: newPlayerImageUrl || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80",
        description: "Registered cricket player lot in pool.",
      },
    ]);
    setNewPlayerName("");
    setNewPlayerRuns("");
    setNewPlayerWickets("");
    setNewPlayerImageUrl("");
    addToast("Player added to draft lot pool", "brass");
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateAuction = async () => {
    setLoading(true);
    try {
      // 1. Create Auction
      const roomCode = `AUCTION-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          minimumBidIncrement,
          timerDuration,
          antiSnipeThreshold,
          antiSnipeExtension,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create auction");
      }

      const auctionId = data.auction.id;

      // 2. Add Participants (Team A and Team B)
      // We will register team participants for demo bidder1 and bidder2 users
      const bidder1Res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bidder1@rcb.com", password: "Password123!" }),
      });
      const bidder1Data = await bidder1Res.json();

      const bidder2Res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bidder2@csk.com", password: "Password123!" }),
      });
      const bidder2Data = await bidder2Res.json();

      if (bidder1Data.user) {
        await fetch(`/api/auctions/${auctionId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: bidder1Data.user.id,
            teamName: teamAName,
            teamLogoUrl: teamALogo,
            initialBudget,
          }),
        });
      }

      if (bidder2Data.user) {
        await fetch(`/api/auctions/${auctionId}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: bidder2Data.user.id,
            teamName: teamBName,
            teamLogoUrl: teamBLogo,
            initialBudget,
          }),
        });
      }

      // 3. Add Player Items
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        await fetch(`/api/auctions/${auctionId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            description: p.description,
            imageUrl: p.imageUrl,
            orderIndex: i + 1,
          }),
        });
      }

      addToast("Auction room created successfully!", "success");
      router.push(`/auction/${auctionId}`);
    } catch (e: any) {
      addToast(e.message || "Failed to create auction", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-between">
      <header className="h-14 px-4 sm:px-6 bg-[#1B2229] border-b border-[#2B343C] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#EDEAE1] hover:text-white text-[14px] font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to lobby</span>
        </Link>
        <span className="text-[13px] text-[#8B939A]">Pre-auction setup wizard</span>
      </header>

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 space-y-6">
        {/* Wizard Steps Indicator */}
        <div className="p-3 bg-[#1B2229] border border-[#2B343C] rounded-[4px] flex items-center justify-between overflow-x-auto text-[12px] no-scrollbar">
          {[
            { step: 1, title: "1. Details" },
            { step: 2, title: "2. Teams" },
            { step: 3, title: "3. Budgets" },
            { step: 4, title: "4. Players" },
            { step: 5, title: "5. Rules" },
            { step: 6, title: "6. Review" },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`px-3 py-1 rounded-[2px] font-medium transition-colors shrink-0 ${
                currentStep === s.step
                  ? "bg-[#EDEAE1] text-[#10151A] font-bold"
                  : currentStep > s.step
                  ? "text-emerald-400"
                  : "text-[#8B939A]"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Step 1: Details */}
        {currentStep === 1 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-5">
            <div>
              <h2 className="text-[18px] font-bold text-[#EDEAE1]">Auction details & templates</h2>
              <p className="text-[13px] text-[#8B939A]">Choose a quick tournament preset or customize your settings</p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[12px] font-semibold text-[#C7A046] uppercase tracking-wider block">
                Start from tournament preset
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {AUCTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setName(preset.name);
                      setDescription(preset.description);
                      setInitialBudget(preset.initialBudget);
                      setMinimumBidIncrement(preset.minimumBidIncrement);
                      setTimerDuration(preset.timerDuration);
                      setAntiSnipeThreshold(preset.antiSnipeThreshold);
                      setAntiSnipeExtension(preset.antiSnipeExtension);
                      setMinSquadSize(preset.minSquadSize);
                      setMaxSquadSize(preset.maxSquadSize);
                      addToast(`Applied "${preset.name}" preset`, "brass");
                    }}
                    className="p-3 rounded-[3px] bg-[#10151A] border border-[#2B343C] hover:border-[#C7A046] text-left space-y-1 transition-colors"
                  >
                    <span className="text-[13px] font-bold text-[#EDEAE1] block">{preset.name}</span>
                    <span className="text-[11px] text-[#C7A046] font-semibold block">{preset.tagline}</span>
                    <span className="text-[11px] text-[#8B939A] block leading-tight">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#2B343C]">
              <div>
                <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Auction name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[14px]"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Sport</label>
                  <input
                    type="text"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#8B939A] block mb-1">Season</label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px]"
              >
                Continue to teams
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Teams */}
        {currentStep === 2 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#EDEAE1]">Team participants</h2>
              <p className="text-[13px] text-[#8B939A]">Set up Team Alpha and Team Beta franchises</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team A */}
              <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-3" style={{ borderLeft: "3px solid #3E7CB1" }}>
                <span className="text-[12px] font-bold text-[#3E7CB1]">Team Alpha</span>
                <div>
                  <label className="text-[11px] text-[#8B939A] block mb-1">Team name</label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B939A] block mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={teamALogo}
                    onChange={(e) => setTeamALogo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[12px]"
                  />
                </div>
              </div>

              {/* Team B */}
              <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-3" style={{ borderLeft: "3px solid #B85C38" }}>
                <span className="text-[12px] font-bold text-[#B85C38]">Team Beta</span>
                <div>
                  <label className="text-[11px] text-[#8B939A] block mb-1">Team name</label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B939A] block mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={teamBLogo}
                    onChange={(e) => setTeamBLogo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[12px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px]"
              >
                Continue to budgets
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Budgets */}
        {currentStep === 3 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#EDEAE1]">Team budgets</h2>
              <p className="text-[13px] text-[#8B939A]">Set the initial purse. Once the auction starts, budgets are locked.</p>
            </div>

            <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-3">
              <div>
                <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
                  Initial purse per franchise (INR)
                </label>
                <input
                  type="number"
                  step="1000000"
                  value={initialBudget}
                  onChange={(e) => setInitialBudget(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[18px] tabular-nums"
                />
              </div>

              <div className="text-[13px] text-[#8B939A] pt-1">
                Formatted allocation: <strong className="text-[#C7A046] font-hero text-[16px] tabular-nums">{formatExactINR(initialBudget)}</strong> ({formatINR(initialBudget)}) per team.
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px]"
              >
                Continue to player pool
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Players */}
        {currentStep === 4 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#EDEAE1]">Player pool ({players.length} lots)</h2>
                <p className="text-[13px] text-[#8B939A]">Review and add cricket stars to the queue</p>
              </div>
            </div>

            {/* List of current players */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {players.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-hero text-[14px] text-[#8B939A] tabular-nums">#{idx + 1}</span>
                    <span className="font-semibold text-[#EDEAE1]">{p.name}</span>
                    <span className="text-[11px] text-[#8B939A]">({p.category})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-hero text-[14px] font-bold text-[#C7A046] tabular-nums">
                      {formatINR(p.basePrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      className="p-1 text-[#8B939A] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Player Sub-form */}
            <form onSubmit={handleAddPlayer} className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-3">
              <h3 className="text-[13px] font-bold text-[#EDEAE1]">Add custom player</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Player name (e.g. Glenn Maxwell)"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[12px]"
                />
                <select
                  value={newPlayerCategory}
                  onChange={(e) => setNewPlayerCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[12px]"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket-Keeper">Wicket-Keeper</option>
                </select>
                <input
                  type="number"
                  placeholder="Base Price (e.g. 10000000)"
                  value={newPlayerBasePrice}
                  onChange={(e) => setNewPlayerBasePrice(parseInt(e.target.value, 10) || 0)}
                  className="px-2.5 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] text-[12px]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#2B343C] hover:bg-[#8B939A] hover:text-[#10151A] text-[#EDEAE1] text-[12px] font-semibold rounded-[2px]"
                >
                  Add player
                </button>
              </div>
            </form>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px]"
              >
                Continue to rules
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Rules */}
        {currentStep === 5 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#EDEAE1]">Auction rules & timers</h2>
              <p className="text-[13px] text-[#8B939A]">Configure countdown clocks, bid increments, and anti-snipe extensions</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1">
                <label className="text-[12px] text-[#8B939A] block">Minimum bid increment (₹)</label>
                <input
                  type="number"
                  step="50000"
                  value={minimumBidIncrement}
                  onChange={(e) => setMinimumBidIncrement(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[16px] tabular-nums"
                />
              </div>

              <div className="p-3.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1">
                <label className="text-[12px] text-[#8B939A] block">Timer duration (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[16px] tabular-nums"
                />
              </div>

              <div className="p-3.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1">
                <label className="text-[12px] text-[#8B939A] block">Anti-snipe threshold (seconds remaining)</label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={antiSnipeThreshold}
                  onChange={(e) => setAntiSnipeThreshold(parseInt(e.target.value, 10) || 5)}
                  className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[16px] tabular-nums"
                />
              </div>

              <div className="p-3.5 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1">
                <label className="text-[12px] text-[#8B939A] block">Anti-snipe extension (seconds added)</label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={antiSnipeExtension}
                  onChange={(e) => setAntiSnipeExtension(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-1.5 rounded-[2px] bg-[#161D24] border border-[#2B343C] text-[#EDEAE1] font-hero text-[16px] tabular-nums"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-semibold text-[13px]"
              >
                Continue to review
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Launch */}
        {currentStep === 6 && (
          <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-5">
            <div>
              <h2 className="text-[18px] font-bold text-[#EDEAE1]">Review and launch auction room</h2>
              <p className="text-[13px] text-[#8B939A]">Verify all configurations before creating the room</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-2 text-[13px]">
                <h3 className="font-bold text-[#EDEAE1] border-b border-[#2B343C] pb-1">Auction summary</h3>
                <p className="text-[#8B939A]">Name: <strong className="text-[#EDEAE1]">{name}</strong></p>
                <p className="text-[#8B939A]">Franchise budget: <strong className="text-[#C7A046] font-hero tabular-nums">{formatINR(initialBudget)}</strong></p>
                <p className="text-[#8B939A]">Total player lots: <strong className="text-[#EDEAE1]">{players.length}</strong></p>
              </div>

              <div className="p-4 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-2 text-[13px]">
                <h3 className="font-bold text-[#EDEAE1] border-b border-[#2B343C] pb-1">Teams & rules</h3>
                <p className="text-[#8B939A]">Team Alpha: <strong className="text-[#3E7CB1]">{teamAName}</strong></p>
                <p className="text-[#8B939A]">Team Beta: <strong className="text-[#B85C38]">{teamBName}</strong></p>
                <p className="text-[#8B939A]">Timer: <strong className="text-[#EDEAE1] font-hero tabular-nums">{timerDuration}s</strong> (+{antiSnipeExtension}s extension)</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateAuction}
                disabled={loading}
                className="px-6 py-2.5 rounded-[2px] bg-[#EDEAE1] text-[#10151A] font-bold text-[14px] hover:bg-white"
              >
                {loading ? "Creating auction..." : "Launch auction room"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
