import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boards } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const board = db.select().from(boards).where(eq(boards.id, id)).get();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(boards).where(eq(boards.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.position !== undefined) updates.position = body.position;

    const updated = db
      .update(boards)
      .set(updates)
      .where(eq(boards.id, id))
      .returning()
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update board" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [{ total }] = db.select({ total: count() }).from(boards).all();
    if (total <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last board" },
        { status: 400 }
      );
    }

    const existing = db.select().from(boards).where(eq(boards.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    db.delete(boards).where(eq(boards.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete board" },
      { status: 500 }
    );
  }
}
