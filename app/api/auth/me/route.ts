import { NextResponse } from "next/server";
import { extractAuthUser, extractAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authUser = extractAuthUser(req);
    const token = extractAuthToken(req);
    if (!authUser) {
      return NextResponse.json({ user: null, token: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        participants: {
          select: {
            id: true,
            auctionId: true,
            teamName: true,
            initialBudget: true,
            remainingBudget: true,
            totalSpent: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null, token: null });
    }

    return NextResponse.json({ user, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
