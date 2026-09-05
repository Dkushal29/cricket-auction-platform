import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database for Real-Time Auction Platform (Multiplayer Cricket Edition)...");

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.item.deleteMany();
  await prisma.auctionParticipant.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Users
  const auctioneer = await prisma.user.create({
    data: {
      name: "Richard Madley (Auctioneer)",
      email: "auctioneer@bpl.com",
      passwordHash,
      role: "AUCTIONEER",
    },
  });

  const bidder1User = await prisma.user.create({
    data: {
      name: "Virat Kohli",
      email: "bidder1@rcb.com",
      passwordHash,
      role: "BIDDER",
    },
  });

  const bidder2User = await prisma.user.create({
    data: {
      name: "MS Dhoni",
      email: "bidder2@csk.com",
      passwordHash,
      role: "BIDDER",
    },
  });

  const spectatorUser = await prisma.user.create({
    data: {
      name: "Cricket Fan",
      email: "spectator@fan.com",
      passwordHash,
      role: "SPECTATOR",
    },
  });

  console.log("✅ Users created with Password123!:");
  console.log("  - Auctioneer:", auctioneer.email);
  console.log("  - Bidder 1:", bidder1User.email);
  console.log("  - Bidder 2:", bidder2User.email);
  console.log("  - Spectator:", spectatorUser.email);

  // 2. Create Demo Auction
  const auction = await prisma.auction.create({
    data: {
      roomCode: "BPL-2026-X9",
      name: "Bangalore Premier League Auction 2026",
      description: "Official Grand Mega Auction featuring elite world-class cricket superstars competing for the BPL 2026 Championship.",
      sport: "Cricket",
      season: "2026",
      status: "DRAFT",
      auctioneerId: auctioneer.id,
      minimumBidIncrement: 500000, // ₹5,00,000 (5 Lakhs)
      timerDuration: 30,           // 30 seconds timer
      antiSnipeThreshold: 5,       // If bid within last 5s
      antiSnipeExtension: 10,      // Extend by 10s
      minSquadSize: 11,
      maxSquadSize: 25,
      squadRequirements: JSON.stringify({
        batsmen: 4,
        bowlers: 4,
        allRounders: 2,
        wicketkeepers: 1,
      }),
    },
  });

  console.log("✅ Auction created with room code:", auction.roomCode);

  // 3. Create Participants (Teams with ₹10 Cr each)
  const initialPurse = 100000000; // ₹10,00,00,000 (10 Crores)

  const participant1 = await prisma.auctionParticipant.create({
    data: {
      auctionId: auction.id,
      userId: bidder1User.id,
      teamName: "Royal Challengers",
      teamLogoUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=150&auto=format&fit=crop&q=80",
      teamColor: "#3E7CB1",
      initialBudget: initialPurse,
      remainingBudget: initialPurse,
      totalSpent: 0,
    },
  });

  const participant2 = await prisma.auctionParticipant.create({
    data: {
      auctionId: auction.id,
      userId: bidder2User.id,
      teamName: "Chennai Super Kings",
      teamLogoUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80",
      teamColor: "#B85C38",
      initialBudget: initialPurse,
      remainingBudget: initialPurse,
      totalSpent: 0,
    },
  });

  console.log("✅ 2 Teams registered with initial budget ₹10 Cr each");

  // 4. Create 6 Elite Player Items with Cricket Statistics
  const items = [
    {
      name: "Jasprit Bumrah",
      category: "Bowler",
      basePrice: 20000000, // ₹2.00 Cr
      orderIndex: 1,
      rating: 9.8,
      age: 30,
      matches: 133,
      runs: 62,
      wickets: 165,
      strikeRate: 115.4,
      economy: 6.82,
      description: "Premier death-over yorker specialist with lethal accuracy and sub-7 economy in T20 tournaments.",
      imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Heinrich Klaasen",
      category: "Wicket-Keeper",
      basePrice: 15000000, // ₹1.50 Cr
      orderIndex: 2,
      rating: 9.5,
      age: 32,
      matches: 89,
      runs: 2450,
      wickets: 0,
      strikeRate: 178.6,
      economy: 0.0,
      description: "Destructive middle-order spin destroyer boasting a 180+ strike rate in death overs.",
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Rashid Khan",
      category: "All-Rounder",
      basePrice: 20000000, // ₹2.00 Cr
      orderIndex: 3,
      rating: 9.7,
      age: 26,
      matches: 121,
      runs: 840,
      wickets: 149,
      strikeRate: 162.3,
      economy: 6.67,
      description: "World #1 T20 leg-spinner with unpickable googlies and explosive pinch-hitting capability.",
      imageUrl: "https://images.unsplash.com/photo-1531415074868-036b1c57e3ce?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Travis Head",
      category: "Batsman",
      basePrice: 15000000, // ₹1.50 Cr
      orderIndex: 4,
      rating: 9.4,
      age: 30,
      matches: 78,
      runs: 2190,
      wickets: 8,
      strikeRate: 184.2,
      economy: 8.9,
      description: "Fearless southpaw opener averaging 200+ strike rate in powerplay overs with rapid centuries.",
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Andre Russell",
      category: "All-Rounder",
      basePrice: 15000000, // ₹1.50 Cr
      orderIndex: 5,
      rating: 9.3,
      age: 36,
      matches: 124,
      runs: 2480,
      wickets: 112,
      strikeRate: 174.9,
      economy: 9.1,
      description: "High-impact power-hitter capable of 145km/h bowling spells and match-turning 6-hitting.",
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Nicholas Pooran",
      category: "Wicket-Keeper",
      basePrice: 12500000, // ₹1.25 Cr
      orderIndex: 6,
      rating: 9.2,
      age: 28,
      matches: 96,
      runs: 2310,
      wickets: 0,
      strikeRate: 168.4,
      economy: 0.0,
      description: "Left-handed dynamic stroke-maker with exceptional aerial boundary clearance.",
      imageUrl: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80",
    },
  ];

  for (const itemData of items) {
    await prisma.item.create({
      data: {
        auctionId: auction.id,
        ...itemData,
        status: "PENDING",
      },
    });
  }

  console.log(`✅ ${items.length} Player items created in queue.`);

  // 5. Create initial audit log
  await prisma.auditLog.create({
    data: {
      auctionId: auction.id,
      userId: auctioneer.id,
      action: "AUCTION_CREATED",
      sequenceNumber: 1,
      metadata: JSON.stringify({ name: auction.name, roomCode: auction.roomCode, initialPurse }),
    },
  });

  console.log("🚀 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
