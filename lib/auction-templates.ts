export interface AuctionPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  sport: string;
  season: string;
  initialBudget: number; // in INR
  minimumBidIncrement: number; // in INR
  timerDuration: number; // seconds
  antiSnipeThreshold: number; // seconds
  antiSnipeExtension: number; // seconds
  minSquadSize: number;
  maxSquadSize: number;
  squadRequirements: {
    batsmen: number;
    bowlers: number;
    allRounders: number;
    wicketkeepers: number;
  };
}

export const AUCTION_PRESETS: AuctionPreset[] = [
  {
    id: "premier-mega",
    name: "Premier Cricket Mega Auction",
    tagline: "Standard ₹10 Cr Mega Purse",
    description: "Full stadium rules with deep squads, 30s timers, and anti-snipe protection.",
    sport: "Cricket",
    season: "2026",
    initialBudget: 100000000, // ₹10 Cr
    minimumBidIncrement: 500000, // ₹5 Lakhs
    timerDuration: 30,
    antiSnipeThreshold: 5,
    antiSnipeExtension: 10,
    minSquadSize: 11,
    maxSquadSize: 25,
    squadRequirements: {
      batsmen: 5,
      bowlers: 5,
      allRounders: 3,
      wicketkeepers: 2,
    },
  },
  {
    id: "club-t20",
    name: "Club T20 Championship",
    tagline: "Fast-Paced ₹50 Lakh Purse",
    description: "Streamlined 20s clock and ₹50K increments for weekend tournament auctions.",
    sport: "Cricket",
    season: "2026",
    initialBudget: 5000000, // ₹50 Lakhs
    minimumBidIncrement: 50000, // ₹50,000
    timerDuration: 20,
    antiSnipeThreshold: 4,
    antiSnipeExtension: 6,
    minSquadSize: 11,
    maxSquadSize: 16,
    squadRequirements: {
      batsmen: 4,
      bowlers: 4,
      allRounders: 2,
      wicketkeepers: 1,
    },
  },
  {
    id: "mini-flash",
    name: "Mini / Flash Auction",
    tagline: "High Velocity ₹20 Lakh Purse",
    description: "Rapid 15s timer and ₹25K increments designed for quick 7-a-side matches.",
    sport: "Cricket",
    season: "2026",
    initialBudget: 2000000, // ₹20 Lakhs
    minimumBidIncrement: 25000, // ₹25,000
    timerDuration: 15,
    antiSnipeThreshold: 3,
    antiSnipeExtension: 5,
    minSquadSize: 7,
    maxSquadSize: 11,
    squadRequirements: {
      batsmen: 3,
      bowlers: 3,
      allRounders: 1,
      wicketkeepers: 1,
    },
  },
];
