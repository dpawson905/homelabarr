import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto/secrets";
import { asc } from "drizzle-orm";

export async function GET(): Promise<NextResponse> {
  try {
    const allSecrets = db
      .select({
        id: secrets.id,
        name: secrets.name,
        description: secrets.description,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      })
      .from(secrets)
      .orderBy(asc(secrets.name))
      .all();

    // Return masked secrets — never expose encrypted values in list
    const masked = allSecrets.map((s) => ({ ...s, masked: true }));

    return NextResponse.json({ secrets: masked });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch secrets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.value || typeof body.value !== "string") {
      return NextResponse.json(
        { error: "value is required and must be a string" },
        { status: 400 }
      );
    }

    const { encrypted, iv, authTag } = encrypt(body.value);

    const created = db
      .insert(secrets)
      .values({
        name: body.name,
        encryptedValue: encrypted,
        iv,
        authTag,
        description: body.description ?? null,
      })
      .returning({
        id: secrets.id,
        name: secrets.name,
        description: secrets.description,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      })
      .get();

    return NextResponse.json({ ...created, masked: true }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create secret";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
