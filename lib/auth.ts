import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWTPayload, UserRole, GuestSessionPayload, AuthenticatedCaller } from "./types";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { extractGuestSession, verifyGuestToken } from "./guest-session";

const JWT_SECRET = process.env.JWT_SECRET || "production-hardened-jwt-secret-auction-platform-2026";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.isGuest !== true && decoded.userId) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function extractAuthUser(req: Request | NextRequest): JWTPayload | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // Check cookies if present
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/token=([^;]+)/);
    if (match && match[1]) {
      return verifyToken(match[1]);
    }
  }

  return null;
}

/**
 * Extracts any authenticated caller identity: either a full User account or a verified Guest session.
 */
export function extractCallerIdentity(req: Request | NextRequest): AuthenticatedCaller | null {
  // 1. Check logged-in user
  const user = extractAuthUser(req);
  if (user) {
    return { isGuest: false, user };
  }

  // 2. Check guest session
  const guest = extractGuestSession(req);
  if (guest) {
    return { isGuest: true, guest };
  }

  return null;
}

export function requireAuth(req: Request | NextRequest, allowedRoles?: UserRole[]): JWTPayload {
  const user = extractAuthUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires one of roles: [${allowedRoles.join(", ")}]`);
  }
  return user;
}

/**
 * Validates that the authenticated user is the auctioneer who created and owns this specific auction.
 * Defends against IDOR (Insecure Direct Object Reference) vulnerabilities.
 */
export async function requireAuctioneerOwnership(
  req: Request | NextRequest,
  auctionId: string
): Promise<{ user: JWTPayload; auction: any }> {
  const user = requireAuth(req, ["AUCTIONEER"]);
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) {
    throw new Error("NOT_FOUND: Auction not found");
  }

  if (auction.auctioneerId !== user.userId) {
    throw new Error("FORBIDDEN: You are not authorized to control or modify this auction");
  }

  return { user, auction };
}


