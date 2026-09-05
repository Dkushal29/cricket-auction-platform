import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuctioneerOwnership, requireAuth } from "@/lib/auth";
import { z } from "zod";

const createItemSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  basePrice: z.number().int().positive(),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  orderIndex: z.number().int().default(0),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: auctionId } = params;
    const { user, auction } = await requireAuctioneerOwnership(req, auctionId);
    const body = await req.json();
    const data = createItemSchema.parse(body);

    if (auction.isConfigLocked || auction.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Auction configuration is locked. Items can only be added when the auction is in DRAFT status." },
        { status: 400 }
      );
    }

    const itemCount = await prisma.item.count({ where: { auctionId } });

    const item = await prisma.item.create({
      data: {
        auctionId,
        name: data.name,
        category: data.category,
        basePrice: data.basePrice,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        orderIndex: data.orderIndex || itemCount + 1,
        status: "PENDING",
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
