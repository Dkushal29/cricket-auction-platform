import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(req, ["AUCTIONEER"]);
    const { id } = params;
    const body = await req.json();

    const item = await prisma.item.findUnique({
      where: { id },
      include: { auction: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.auction.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Items can only be modified while auction is in DRAFT status" },
        { status: 400 }
      );
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        name: body.name ?? item.name,
        category: body.category ?? item.category,
        basePrice: body.basePrice ?? item.basePrice,
        description: body.description ?? item.description,
        imageUrl: body.imageUrl ?? item.imageUrl,
        orderIndex: body.orderIndex ?? item.orderIndex,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(req, ["AUCTIONEER"]);
    const { id } = params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: { auction: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.auction.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Items can only be deleted while auction is in DRAFT status" },
        { status: 400 }
      );
    }

    await prisma.item.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message.startsWith("UNAUTHORIZED") ? 401 : error.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
