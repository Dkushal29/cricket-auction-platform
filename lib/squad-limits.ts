/**
 * Authoritative Squad Limit Enforcement: floor(N / 2)
 *
 * Requirements:
 * - N = maxSquadSize configured for the auction (e.g. 10 -> 5, 12 -> 6, 15 -> 7, 20 -> 10, 25 -> 12).
 * - Maximum players one team can acquire is floor(N / 2).
 * - ONLY successfully SOLD acquisitions count towards this limit.
 * - PENDING, ACTIVE, UNSOLD, and FINAL_UNSOLD do NOT count.
 */

export function calculateSquadLimit(maxSquadSize: number = 25): number {
  const safeN = typeof maxSquadSize === "number" && maxSquadSize > 0 ? maxSquadSize : 25;
  return Math.floor(safeN / 2);
}

export function isTeamSquadLimitReached(
  currentSoldPlayerCount: number,
  maxSquadSize: number = 25
): boolean {
  const limit = calculateSquadLimit(maxSquadSize);
  return currentSoldPlayerCount >= limit;
}
