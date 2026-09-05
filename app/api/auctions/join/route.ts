import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`join-lookup:${ip}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many room lookups. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json();
    const code = (body.code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Please enter an auction room code" }, { status: 400 });
    }

    // Lookup by roomCode or id
    const auction = await prisma.auction.findFirst({
      where: {
        OR: [
          { roomCode: code },
          { id: code.toLowerCase() },
          { roomCode: `AUCTION-${code}` },
        ],
      },
      select: {
        id: true,
        roomCode: true,
        name: true,
        sport: true,
        season: true,
        status: true,
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: `No active auction found for code "${code}". Please verify the code and try again.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      auction,
      redirectUrl: `/auction/${auction.id}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to lookup auction" }, { status: 500 });
  }
}
