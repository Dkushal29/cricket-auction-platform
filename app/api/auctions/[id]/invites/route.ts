import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAuthUser, requireAuctioneerOwnership, requireAuth } from "@/lib/auth";
import { generateSecureToken } from "@/lib/invite-crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

// Verify invite token
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`invite-check:${ip}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: auctionId } = params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: "Missing invite token",
      }, { status: 400 });
    }

    if (token === auction.bidderInviteA) {
      return NextResponse.json({
        valid: true,
        type: "BIDDER_A",
        teamName: auction.participants[0]?.teamName || "Team Alpha",
        participantId: auction.participants[0]?.id,
        isClaimed: !!auction.participants[0]?.userId,
        auction: {
          id: auction.id,
          name: auction.name,
          roomCode: auction.roomCode,
          status: auction.status,
        },
      });
    }

    if (token === auction.bidderInviteB) {
      return NextResponse.json({
        valid: true,
        type: "BIDDER_B",
        teamName: auction.participants[1]?.teamName || "Team Beta",
        participantId: auction.participants[1]?.id,
        isClaimed: !!auction.participants[1]?.userId,
        auction: {
          id: auction.id,
          name: auction.name,
          roomCode: auction.roomCode,
          status: auction.status,
        },
      });
    }

    if (token === auction.spectatorInvite) {
      return NextResponse.json({
        valid: true,
        type: "SPECTATOR",
        auction: {
          id: auction.id,
          name: auction.name,
          roomCode: auction.roomCode,
          status: auction.status,
        },
      });
    }

    return NextResponse.json({
      valid: false,
      error: "Invalid or expired invitation token",
    }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Auctioneer regenerates/revokes an invite token
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);

    const body = await req.json();
    const tokenType = body.tokenType as "bidderInviteA" | "bidderInviteB" | "spectatorInvite";

    if (!["bidderInviteA", "bidderInviteB", "spectatorInvite"].includes(tokenType)) {
      return NextResponse.json({ error: "Invalid token type specified" }, { status: 400 });
    }

    const newToken = generateSecureToken(16);

    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        [tokenType]: newToken,
      },
    });

    await prisma.auditLog.create({
      data: {
        auctionId,
        userId: user.userId,
        action: "INVITE_REVOKED",
        metadata: JSON.stringify({
          tokenType,
          revokedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      tokenType,
      newToken,
    });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED")
      ? 401
      : error.message.startsWith("FORBIDDEN")
      ? 403
      : error.message.startsWith("NOT_FOUND")
      ? 404
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// User claims a bidder seat using their valid invite token
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const user = requireAuth(req);
    const body = await req.json();
    const { token } = body;

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        participants: true,
      },
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    let targetIndex = -1;
    if (token === auction.bidderInviteA) targetIndex = 0;
    else if (token === auction.bidderInviteB) targetIndex = 1;
    else {
      return NextResponse.json({ error: "Invalid or unauthorized bidder invite token" }, { status: 403 });
    }

    const targetParticipant = auction.participants[targetIndex];
    if (!targetParticipant) {
      return NextResponse.json({ error: "Participant team slot is not configured" }, { status: 400 });
    }

    // Assign authenticated user to this participant slot
    const updatedParticipant = await prisma.auctionParticipant.update({
      where: { id: targetParticipant.id },
      data: {
        userId: user.userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        auctionId,
        userId: user.userId,
        action: "BIDDER_CLAIMED_SEAT",
        metadata: JSON.stringify({
          teamName: targetParticipant.teamName,
          participantId: targetParticipant.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      participant: updatedParticipant,
    });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED")
      ? 401
      : error.message.startsWith("FORBIDDEN")
      ? 403
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
