import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
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
  teams: z
    .array(
      z.object({
        teamName: z.string().min(2),
        teamLogoUrl: z.string().optional().or(z.literal("")),
        teamColor: z.string().optional(),
        initialBudget: z.number().int().positive(),
        userId: z.string().optional(),
        userEmail: z.string().optional(),
      })
    )
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(2),
        category: z.string().min(1),
        basePrice: z.number().int().positive(),
        description: z.string().optional(),
        imageUrl: z.string().optional().or(z.literal("")),
        orderIndex: z.number().int().optional(),
      })
    )
    .optional(),
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
    const authUser = requireAuth(req, ["AUCTIONEER"]);
    const body = await req.json();
    const data = createAuctionSchema.parse(body);

    // 1. Ensure authenticated auctioneer exists in the database
    let dbAuctioneer = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });

    if (!dbAuctioneer && authUser.email) {
      dbAuctioneer = await prisma.user.findUnique({
        where: { email: authUser.email.toLowerCase() },
      });
    }

    if (!dbAuctioneer) {
      return NextResponse.json(
        { error: "UNAUTHORIZED: Authenticated auctioneer user record was not found in database. Please sign in again." },
        { status: 401 }
      );
    }

    const roomCode = generateRoomCode();
    const bidderInviteA = generateSecureToken(16);
    const bidderInviteB = generateSecureToken(16);
    const spectatorInvite = generateSecureToken(16);

    // Resolve or pre-create participant user accounts outside the interactive transaction
    // to avoid CPU-intensive bcrypt hashing and sequential read round-trips from consuming transaction time
    const resolvedParticipants: Array<{
      userId: string;
      teamName: string;
      teamLogoUrl?: string | null;
      teamColor?: string;
      initialBudget: number;
    }> = [];

    if (data.teams && data.teams.length > 0) {
      for (let i = 0; i < data.teams.length; i++) {
        const team = data.teams[i];
        let teamUser: any = null;

        if (team.userId) {
          teamUser = await prisma.user.findUnique({ where: { id: team.userId } });
        }
        if (!teamUser && team.userEmail) {
          teamUser = await prisma.user.findUnique({ where: { email: team.userEmail.toLowerCase() } });
        }

        // If no specific user found, find or create default bidder accounts
        if (!teamUser) {
          const fallbackEmail = i === 0 ? "bidder1@rcb.com" : i === 1 ? "bidder2@csk.com" : `bidder${i + 1}@league.com`;
          teamUser = await prisma.user.findUnique({ where: { email: fallbackEmail } });

          if (!teamUser) {
            const defaultPasswordHash = await hashPassword("Password123!");
            teamUser = await prisma.user.create({
              data: {
                name: team.teamName,
                email: fallbackEmail,
                passwordHash: defaultPasswordHash,
                role: "BIDDER",
              },
            });
          }
        }

        resolvedParticipants.push({
          userId: teamUser.id,
          teamName: team.teamName,
          teamLogoUrl: team.teamLogoUrl || null,
          teamColor: team.teamColor || (i === 0 ? "#3E7CB1" : "#B85C38"),
          initialBudget: team.initialBudget,
        });
      }
    }

    // Execute atomic creation transaction with configured timeout (15s) and bulk operations
    const createdAuction = await prisma.$transaction(
      async (tx) => {
        // 2. Create the Auction record with verified auctioneerId
        const auction = await tx.auction.create({
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
            auctioneerId: dbAuctioneer.id,
            status: "DRAFT",
          },
        });

        // 3. Create initial participants in bulk
        if (resolvedParticipants.length > 0) {
          await tx.auctionParticipant.createMany({
            data: resolvedParticipants.map((p) => ({
              auctionId: auction.id,
              userId: p.userId,
              teamName: p.teamName,
              teamLogoUrl: p.teamLogoUrl || null,
              teamColor: p.teamColor,
              initialBudget: p.initialBudget,
              remainingBudget: p.initialBudget,
              totalSpent: 0,
            })),
          });
        }

        // 4. Create initial player items in bulk (single database write command)
        if (data.items && data.items.length > 0) {
          await tx.item.createMany({
            data: data.items.map((item, i) => ({
              auctionId: auction.id,
              name: item.name,
              category: item.category,
              basePrice: item.basePrice,
              description: item.description || null,
              imageUrl: item.imageUrl || null,
              orderIndex: item.orderIndex ?? i + 1,
              status: "PENDING",
            })),
          });
        }

        // 5. Record Audit Log
        await tx.auditLog.create({
          data: {
            auctionId: auction.id,
            userId: dbAuctioneer.id,
            action: "AUCTION_CREATED",
            metadata: JSON.stringify({ name: auction.name, roomCode: auction.roomCode }),
          },
        });

        return auction;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    // Return the created auction with relations
    const fullAuction = await prisma.auction.findUnique({
      where: { id: createdAuction.id },
      include: {
        auctioneer: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true } } } },
        items: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({ auction: fullAuction || createdAuction }, { status: 201 });
  } catch (error: any) {
    console.error("[CreateAuction Error]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const isClientAuthError =
      error.message?.startsWith("UNAUTHORIZED") || error.message?.startsWith("FORBIDDEN");
    const status = error.message?.startsWith("UNAUTHORIZED")
      ? 401
      : error.message?.startsWith("FORBIDDEN")
      ? 403
      : error.message?.includes("Foreign key")
      ? 400
      : 500;

    const userMessage = isClientAuthError
      ? error.message
      : "Unable to create the auction. Please try again.";

    return NextResponse.json({ error: userMessage }, { status });
  }
}
