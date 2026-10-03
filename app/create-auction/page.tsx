"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { formatExactINR, formatINR } from "@/lib/auction-state";
import { AUCTION_PRESETS } from "@/lib/auction-templates";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Gavel,
  Plus,
  Trash2,
  Trophy,
  Users,
  Shield,
  Layers,
  Settings,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function CreateAuctionPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) {
      addToast("Please sign in as an Auctioneer to create and host an auction", "error");
      router.push("/login?redirect=/create-auction");
    }
  }, [user, authLoading, router, addToast]);

  // Section 1: Auction Details
  const [name, setName] = useState("Premier Mega Auction 2026");
  const [description, setDescription] = useState("Private multiplayer cricket mega auction with real-time bidding and authoritative timers");
  const [sport, setSport] = useState("Cricket");
  const [season, setSeason] = useState("2026");

  // Section 2: Team Configuration
  const [teamAName, setTeamAName] = useState("Royal Challengers");
  const [teamALogo, setTeamALogo] = useState("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150&auto=format&fit=crop&q=80");
  const [teamBName, setTeamBName] = useState("Chennai Super Kings");
  const [teamBLogo, setTeamBLogo] = useState("https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80");
  const [initialBudget, setInitialBudget] = useState(100000000); // 10 Cr

  // Section 3: Player Configuration
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

  // Player Form Sub-State
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerCategory, setNewPlayerCategory] = useState("Batsman");
  const [newPlayerBasePrice, setNewPlayerBasePrice] = useState(10000000);
  const [newPlayerImageUrl, setNewPlayerImageUrl] = useState("");

  // Section 4: Auction Rules
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
        name: newPlayerName.trim(),
        category: newPlayerCategory,
        basePrice: newPlayerBasePrice,
        matches: 50,
        wickets: 0,
        economy: 7.5,
        runs: 0,
        strikeRate: 140.0,
        imageUrl: newPlayerImageUrl || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80",
        description: "Registered cricket athlete in auction pool.",
      },
    ]);
    setNewPlayerName("");
    setNewPlayerImageUrl("");
    addToast("Player lot registered into pool", "brass");
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateAuction = async () => {
    if (!user) {
      addToast("Authentication required. Please sign in as an Auctioneer.", "error");
      router.push("/login?redirect=/create-auction");
      return;
    }

    if (!name.trim()) {
      addToast("Please provide an auction name", "error");
      setCurrentStep(1);
      return;
    }

    if (players.length === 0) {
      addToast("Please register at least one player in the pool", "error");
      setCurrentStep(3);
      return;
    }

    setLoading(true);
    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("auction_token") : null);
      const res = await fetch("/api/auctions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          sport,
          season,
          minimumBidIncrement,
          timerDuration,
          antiSnipeThreshold,
          antiSnipeExtension,
          minSquadSize,
          maxSquadSize,
          teams: [
            {
              teamName: teamAName.trim() || "Team Alpha",
              teamLogoUrl: teamALogo,
              teamColor: "#3E7CB1",
              initialBudget,
              userEmail: "bidder1@rcb.com",
            },
            {
              teamName: teamBName.trim() || "Team Beta",
              teamLogoUrl: teamBLogo,
              teamColor: "#B85C38",
              initialBudget,
              userEmail: "bidder2@csk.com",
            },
          ],
          items: players.map((p, idx) => ({
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            description: p.description,
            imageUrl: p.imageUrl,
            orderIndex: idx + 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=/create-auction");
        }
        throw new Error(data.error || "Failed to create auction");
      }

      addToast("Auction room created successfully!", "success");
      router.push(`/auction/${data.auction.id}`);
    } catch (e: any) {
      addToast(e.message || "Failed to create auction", "error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E5AE3F]" />
        <span className="text-[13px] text-[#8B98A8]">Verifying auctioneer credentials...</span>
      </div>
    );
  }

  const sections = [
    { id: 1, title: "Auction Details", desc: "Name, season & presets" },
    { id: 2, title: "Team Configuration", desc: "Franchise names & purse" },
    { id: 3, title: "Player Configuration", desc: "Athlete pool & base prices" },
    { id: 4, title: "Auction Rules", desc: "Clocks, increments & anti-snipe" },
  ];

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#E5AE3F] selection:text-[#070B12]">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-8 bg-[#0D131C] border-b border-[#202B38] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#8B98A8] hover:text-[#F5F7FA] text-[13px] font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Home</span>
        </Link>
        <div className="flex items-center gap-2 font-hero text-[18px] text-[#F5F7FA]">
          <span>🏏</span>
          <span>CREATE AUCTION ROOM</span>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 space-y-6">
        {/* Modern 4-Section Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {sections.map((s) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id as any)}
                className={`p-3.5 rounded-[4px] border text-left transition-all ${
                  isActive
                    ? "bg-[#121A24] border-[#E5AE3F] shadow-[0_0_12px_rgba(229,174,63,0.15)]"
                    : isCompleted
                    ? "bg-[#0D131C] border-[#28D17C]/40 text-[#28D17C]"
                    : "bg-[#0D131C] border-[#202B38] text-[#8B98A8] hover:border-[#8B98A8]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? "text-[#E5AE3F]" : isCompleted ? "text-[#28D17C]" : "text-[#8B98A8]"}`}>
                    Section 0{s.id}
                  </span>
                  {isCompleted && <span className="text-[12px] text-[#28D17C]">✓</span>}
                </div>
                <h3 className={`text-[13px] font-bold truncate ${isActive ? "text-[#F5F7FA]" : "text-[#8B98A8]"}`}>
                  {s.title}
                </h3>
              </button>
            );
          })}
        </div>

        {/* ================================================== */}
        {/* SECTION 1: AUCTION DETAILS */}
        {/* ================================================== */}
        {currentStep === 1 && (
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-[#202B38] pb-4">
              <span className="text-[11px] font-mono text-[#E5AE3F] uppercase tracking-wider block mb-1">SECTION 01</span>
              <h2 className="font-hero text-[26px] font-bold text-[#F5F7FA] uppercase tracking-wide">
                Auction Details
              </h2>
              <p className="text-[13px] text-[#8B98A8]">
                Define your tournament identity or apply a certified tournament preset.
              </p>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block">
                Quick Tournament Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AUCTION_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setName(p.name);
                      setDescription(p.description);
                      setInitialBudget(p.initialBudget);
                      setMinimumBidIncrement(p.minimumBidIncrement);
                      setTimerDuration(p.timerDuration);
                      setAntiSnipeThreshold(p.antiSnipeThreshold);
                      setAntiSnipeExtension(p.antiSnipeExtension);
                      setMinSquadSize(p.minSquadSize);
                      setMaxSquadSize(p.maxSquadSize);
                      addToast(`Applied ${p.name} template`, "brass");
                    }}
                    className="p-3.5 rounded-[4px] bg-[#070B12] border border-[#202B38] hover:border-[#E5AE3F] text-left transition-all space-y-1 group"
                  >
                    <span className="font-bold text-[14px] text-[#F5F7FA] group-hover:text-[#E5AE3F] block">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-semibold text-[#E5AE3F] block">
                      {p.tagline}
                    </span>
                    <span className="text-[11px] text-[#8B98A8] block line-clamp-2">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1.5">
                  Auction Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Champions Premier League 2026"
                  required
                  className="w-full px-4 py-2.5 rounded-[4px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[14px] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[4px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1.5">
                    Sport
                  </label>
                  <input
                    type="text"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full px-4 py-2 rounded-[4px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1.5">
                    Season
                  </label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-4 py-2 rounded-[4px] bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#202B38] flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all flex items-center gap-1.5"
              >
                <span>Continue to Team Configuration</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SECTION 2: TEAM CONFIGURATION */}
        {/* ================================================== */}
        {currentStep === 2 && (
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-[#202B38] pb-4">
              <span className="text-[11px] font-mono text-[#E5AE3F] uppercase tracking-wider block mb-1">SECTION 02</span>
              <h2 className="font-hero text-[26px] font-bold text-[#F5F7FA] uppercase tracking-wide">
                Team Configuration
              </h2>
              <p className="text-[13px] text-[#8B98A8]">
                Set up franchise names and starting budget purse. Budgets are locked once auction commences.
              </p>
            </div>

            {/* Starting Budget Allocation */}
            <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#8B98A8] block">
                Starting Purse Per Team (INR)
              </label>
              <input
                type="number"
                step="1000000"
                value={initialBudget}
                onChange={(e) => setInitialBudget(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2.5 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] font-hero text-[20px] tabular-nums focus:outline-none focus:border-[#E5AE3F]"
              />
              <span className="text-[12px] text-[#8B98A8]">
                Each team will start with <strong className="text-[#E5AE3F] font-hero tabular-nums">{formatExactINR(initialBudget)}</strong> ({formatINR(initialBudget)}).
              </span>
            </div>

            {/* Teams Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team A */}
              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-3" style={{ borderLeft: "4px solid #3E7CB1" }}>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#3E7CB1] block">
                  Franchise A (Steel Blue Rail)
                </span>
                <div>
                  <label className="text-[11px] text-[#8B98A8] block mb-1 font-semibold">Team Name</label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#3E7CB1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B98A8] block mb-1 font-semibold">Logo URL</label>
                  <input
                    type="text"
                    value={teamALogo}
                    onChange={(e) => setTeamALogo(e.target.value)}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[12px] focus:outline-none"
                  />
                </div>
              </div>

              {/* Team B */}
              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-3" style={{ borderLeft: "4px solid #B85C38" }}>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#B85C38] block">
                  Franchise B (Burnt Copper Rail)
                </span>
                <div>
                  <label className="text-[11px] text-[#8B98A8] block mb-1 font-semibold">Team Name</label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#B85C38]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B98A8] block mb-1 font-semibold">Logo URL</label>
                  <input
                    type="text"
                    value={teamBLogo}
                    onChange={(e) => setTeamBLogo(e.target.value)}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[12px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#202B38] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all flex items-center gap-1.5"
              >
                <span>Continue to Player Configuration</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SECTION 3: PLAYER CONFIGURATION */}
        {/* ================================================== */}
        {currentStep === 3 && (
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-[#202B38] pb-4">
              <span className="text-[11px] font-mono text-[#E5AE3F] uppercase tracking-wider block mb-1">SECTION 03</span>
              <h2 className="font-hero text-[26px] font-bold text-[#F5F7FA] uppercase tracking-wide">
                Player Configuration ({players.length} Registered Lots)
              </h2>
              <p className="text-[13px] text-[#8B98A8]">
                Select the athlete pool for this auction. The sequence in which players appear is automatically randomized upon launch.
              </p>
            </div>

            {/* Automatic Randomization Feature Notice */}
            <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E5AE3F] animate-pulse" />
                <span className="font-semibold text-[#EDEAE1]">AUTOMATIC ORDER:</span>
                <span className="text-[#8B98A8]">
                  Player order is randomized automatically via Fisher-Yates shuffle. No manual ordering required.
                </span>
              </div>
              <span className="text-[#E5AE3F] font-mono text-[11px] uppercase tracking-wider font-bold">
                Authoritative Sequence
              </span>
            </div>

            {/* Player List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {players.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-hero text-[13px] font-bold text-[#8B98A8] tabular-nums">POOL</span>
                    <div>
                      <span className="font-bold text-[#F5F7FA] mr-2">{p.name}</span>
                      <span className="text-[11px] text-[#8B98A8]">({p.category})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-hero text-[16px] font-bold text-[#E5AE3F] tabular-nums">
                      {formatINR(p.basePrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      className="text-[#8B98A8] hover:text-[#FF5C5C] p-1 transition-colors"
                      title="Remove Player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Player Sub-Form */}
            <form onSubmit={handleAddPlayer} className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                + Register New Player Lot
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Player name (e.g. Glenn Maxwell)"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
                />
                <select
                  value={newPlayerCategory}
                  onChange={(e) => setNewPlayerCategory(e.target.value)}
                  className="px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
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
                  className="px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[3px] bg-[#121A24] border border-[#202B38] hover:border-[#E5AE3F] text-[#F5F7FA] text-[12px] font-semibold transition-colors"
                >
                  Add Player
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#202B38] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all flex items-center gap-1.5"
              >
                <span>Continue to Auction Rules</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SECTION 4: AUCTION RULES & LAUNCH */}
        {/* ================================================== */}
        {currentStep === 4 && (
          <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-[#202B38] pb-4">
              <span className="text-[11px] font-mono text-[#E5AE3F] uppercase tracking-wider block mb-1">SECTION 04</span>
              <h2 className="font-hero text-[26px] font-bold text-[#F5F7FA] uppercase tracking-wide">
                Auction Rules & Final Launch
              </h2>
              <p className="text-[13px] text-[#8B98A8]">
                Configure anti-snipe countdown extensions, minimum increments, and launch the room.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                  Minimum Bid Increment (INR)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={minimumBidIncrement}
                  onChange={(e) => setMinimumBidIncrement(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] font-hero text-[18px] tabular-nums"
                />
              </div>

              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                  Timer Countdown Duration (Seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] font-hero text-[18px] tabular-nums"
                />
              </div>

              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                  Anti-Snipe Guard Window (Seconds)
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={antiSnipeThreshold}
                  onChange={(e) => setAntiSnipeThreshold(parseInt(e.target.value, 10) || 5)}
                  className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] font-hero text-[18px] tabular-nums"
                />
                <span className="text-[11px] text-[#8B98A8]">Bids in last {antiSnipeThreshold}s extend clock.</span>
              </div>

              <div className="p-4 rounded-[4px] bg-[#070B12] border border-[#202B38] space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#8B98A8] block">
                  Anti-Snipe Added Extension (Seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={antiSnipeExtension}
                  onChange={(e) => setAntiSnipeExtension(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 rounded-[3px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] font-hero text-[18px] tabular-nums"
                />
                <span className="text-[11px] text-[#8B98A8]">Adds +{antiSnipeExtension}s when triggered.</span>
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-[4px] bg-[#121A24] border border-[#202B38] space-y-2 text-[13px]">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#E5AE3F] block">
                Pre-Flight Configuration Summary
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[#8B98A8]">
                <div>Auction: <strong className="text-[#F5F7FA]">{name}</strong></div>
                <div>Purse: <strong className="text-[#E5AE3F] font-hero tabular-nums">{formatINR(initialBudget)}</strong></div>
                <div>Lots: <strong className="text-[#F5F7FA]">{players.length} players</strong></div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#202B38] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateAuction}
                disabled={loading}
                className="px-8 py-3 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-black text-[15px] hover:bg-[#F4C65E] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(229,174,63,0.25)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>LAUNCHING AUCTION ARENA...</span>
                  </>
                ) : (
                  <span>LAUNCH AUCTION ROOM</span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
