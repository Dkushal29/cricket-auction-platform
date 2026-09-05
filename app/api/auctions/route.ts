import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateRoomCode, generateSecureToken } from "@/lib/invite-crypto";
import { z } from "zod";

const createAuctionSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  sport: z.string().default("Cricket"),
  season: z.string().default("2026"),
  minimumBidIncrement: z.number().int().positive().default(500000),
  timerDuration: z.number().int().min(5).max(120).default(30),
  antiSnipeThreshold: z.number().int().min(2).max(30).default(5),
  antiSnipeExtension: z.number().int().min(3).max(60).default(10),
  minSquadSize: z.number().int().default(11),
  maxSquadSize: z.number().int().default(25),
  squadRequirements: z.string().optional(),
});

export async function GET() {
  try {
    const auctions = await prisma.auction.findMany({
      include: {
        auctioneer: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ auctions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requireAuth(req, ["AUCTIONEER"]);
    const body = await req.json();
    const data = createAuctionSchema.parse(body);

    const roomCode = generateRoomCode();
    const bidderInviteA = generateSecureToken(16);
    const bidderInviteB = generateSecureToken(16);
    const spectatorInvite = generateSecureToken(16);

    const auction = await prisma.auction.create({
      data: {
        roomCode,
        bidderInviteA,
        bidderInviteB,
        spectatorInvite,
        isConfigLocked: false,
        name: data.name,
        description: data.description,
        sport: data.sport,
        season: data.season,
        minimumBidIncrement: data.minimumBidIncrement,
        timerDuration: data.timerDuration,
        antiSnipeThreshold: data.antiSnipeThreshold,
        antiSnipeExtension: data.antiSnipeExtension,
        minSquadSize: data.minSquadSize,
        maxSquadSize: data.maxSquadSize,
        squadRequirements: data.squadRequirements,
        auctioneerId: user.userId,
        status: "DRAFT",
      },
    });

    await prisma.auditLog.create({
      data: {
        auctionId: auction.id,
        userId: user.userId,
        action: "AUCTION_CREATED",
        metadata: JSON.stringify({ name: auction.name, roomCode: auction.roomCode }),
      },
    });

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
