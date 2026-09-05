import crypto from "crypto";

/**
 * Generate a cryptographically secure URL-safe token.
 * Default 24 bytes = 48 hex characters.
 */
export function generateSecureToken(byteLength = 24): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Generate unique room code with format AUCTION-XXXX-XXXX
 */
export function generateRoomCode(): string {
  const segment1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `AUCTION-${segment1}-${segment2}`;
}

/**
 * Hash token using SHA-256 for secure comparison
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
