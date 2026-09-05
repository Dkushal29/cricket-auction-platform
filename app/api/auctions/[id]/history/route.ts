import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;

    const auditLogs = await prisma.auditLog.findMany({
      where: { auctionId },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return NextResponse.json({ history: auditLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
