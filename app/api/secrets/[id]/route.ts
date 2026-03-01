import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto/secrets";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const secret = db.select().from(secrets).where(eq(secrets.id, id)).get();

    if (!secret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    const decryptedValue = decrypt(
      secret.encryptedValue,
      secret.iv,
      secret.authTag
    );

    return NextResponse.json({
      id: secret.id,
      name: secret.name,
      value: decryptedValue,
      description: secret.description,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch secret";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db
      .select()
      .from(secrets)
      .where(eq(secrets.id, id))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name) {
        return NextResponse.json(
          { error: "name must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.name = body.name;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.value !== undefined) {
      if (typeof body.value !== "string" || !body.value) {
        return NextResponse.json(
          { error: "value must be a non-empty string" },
          { status: 400 }
        );
      }
      const { encrypted, iv, authTag } = encrypt(body.value);
      updates.encryptedValue = encrypted;
      updates.iv = iv;
      updates.authTag = authTag;
    }

    const updated = db
      .update(secrets)
      .set(updates)
      .where(eq(secrets.id, id))
      .returning({
        id: secrets.id,
        name: secrets.name,
        description: secrets.description,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      })
      .get();

    return NextResponse.json({ ...updated, masked: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update secret";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const existing = db
      .select()
      .from(secrets)
      .where(eq(secrets.id, id))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    db.delete(secrets).where(eq(secrets.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete secret";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
