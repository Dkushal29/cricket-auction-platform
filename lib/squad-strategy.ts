import { ClientItem, ClientParticipant, SafeBidRecommendation, SquadComposition } from "./types";

export function getSquadComposition(wonItems: ClientItem[]): SquadComposition {
  const comp: SquadComposition = {
    batsmen: 0,
    bowlers: 0,
    allRounders: 0,
    wicketkeepers: 0,
    total: wonItems.length,
  };

  wonItems.forEach((item) => {
    const cat = item.category.toLowerCase();
    if (cat.includes("batsman") || cat.includes("batter")) {
      comp.batsmen += 1;
    } else if (cat.includes("bowler")) {
      comp.bowlers += 1;
    } else if (cat.includes("all-rounder") || cat.includes("all rounder")) {
      comp.allRounders += 1;
    } else if (cat.includes("wicket-keeper") || cat.includes("keeper") || cat.includes("wk")) {
      comp.wicketkeepers += 1;
    } else {
      comp.batsmen += 1; // Default
    }
  });

  return comp;
}

export function calculateSafeBid(
  participant: ClientParticipant,
  wonItems: ClientItem[],
  minSquadSize: number = 11,
  minBasePrice: number = 2000000 // Default ₹20 Lakhs base price
): SafeBidRecommendation {
  const currentCount = wonItems.length;
  const remainingSlots = Math.max(0, minSquadSize - currentCount);

  // If already at or above min squad size, safe bid is entire remaining budget
  if (remainingSlots <= 1) {
    return {
      maxSafeBid: participant.remainingBudget,
      remainingBudget: participant.remainingBudget,
      remainingSquadSlots: remainingSlots,
      reserveForFutureSlots: 0,
      isOverbudgetRisk: false,
      warnings: [],
    };
  }

  // Reserve enough base price for (remainingSlots - 1) players
  const slotsToReserve = remainingSlots - 1;
  const reserveForFutureSlots = slotsToReserve * minBasePrice;
  const maxSafeBid = Math.max(0, participant.remainingBudget - reserveForFutureSlots);

  const comp = getSquadComposition(wonItems);
  const warnings: string[] = [];

  if (currentCount >= 5) {
    if (comp.bowlers < 2) warnings.push("Squad needs more specialist bowlers");
    if (comp.batsmen < 2) warnings.push("Squad needs more specialist batsmen");
    if (comp.wicketkeepers < 1) warnings.push("No specialist wicketkeeper acquired yet");
  }

  return {
    maxSafeBid,
    remainingBudget: participant.remainingBudget,
    remainingSquadSlots: remainingSlots,
    reserveForFutureSlots,
    isOverbudgetRisk: maxSafeBid < participant.remainingBudget * 0.5,
    warnings,
  };
}
