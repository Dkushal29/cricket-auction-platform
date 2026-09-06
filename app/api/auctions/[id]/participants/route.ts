import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership, requireAuth } from "@/lib/auth";
import { z } from "zod";
import { getIO } from "@/lib/socket-server";

const addParticipantSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1)),
  teamName: z.string().min(2),
  teamLogoUrl: z.string().url().optional().or(z.literal("")),
  initialBudget: z.number().int().positive(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);
    const body = await req.json();
    const data = addParticipantSchema.parse(body);

    if (auction.isConfigLocked || auction.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Auction configuration is locked. Participants and initial budgets cannot be modified after auction start." },
        { status: 400 }
      );
    }

    // Verify target user exists in database
    let targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser && data.userId.includes("@")) {
      targetUser = await prisma.user.findUnique({
        where: { email: data.userId.toLowerCase() },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with ID '${data.userId}' does not exist in the database.` },
        { status: 400 }
      );
    }

    // Upsert participant
    const participant = await prisma.auctionParticipant.upsert({
      where: {
        auctionId_userId: {
          auctionId,
          userId: targetUser.id,
        },
      },
      update: {
        teamName: data.teamName,
        teamLogoUrl: data.teamLogoUrl || null,
        initialBudget: data.initialBudget,
        remainingBudget: data.initialBudget,
        totalSpent: 0,
      },
      create: {
        auctionId,
        userId: targetUser.id,
        teamName: data.teamName,
        teamLogoUrl: data.teamLogoUrl || null,
        initialBudget: data.initialBudget,
        remainingBudget: data.initialBudget,
        totalSpent: 0,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    try {
      getIO().to(`auction_${auctionId}`).emit("participant_updated", {
        participant: participant as any,
      });
    } catch (e) {
      // Socket not ready
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
