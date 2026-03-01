import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boards } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const board = db.select().from(boards).where(eq(boards.id, id)).get();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.select().from(boards).where(eq(boards.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
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
    const message = error instanceof Error ? error.message : "Failed to update board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const existing = db.select().from(boards).where(eq(boards.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const [{ total }] = db.select({ total: count() }).from(boards).all();
    if (total <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last board" },
        { status: 400 }
      );
    }

    db.delete(boards).where(eq(boards.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
