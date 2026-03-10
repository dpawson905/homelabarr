import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

/** Settings that must never be returned to the client */
const SENSITIVE_KEYS = new Set(["passwordHash"]);

export async function GET(): Promise<NextResponse> {
  try {
    const allSettings = db.select().from(settings).all();
    const settingsMap = Object.fromEntries(
      allSettings
        .filter((s) => !SENSITIVE_KEYS.has(s.key))
        .map((s) => [s.key, s.value])
    );
    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
