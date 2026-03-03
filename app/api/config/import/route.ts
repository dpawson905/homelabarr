import { NextRequest, NextResponse } from "next/server";
import { importConfig, ImportValidationError } from "@/lib/export/import";
import type { HomelabarrExport } from "@/lib/export/schema";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { mode, config } = body;

    if (mode !== "merge" && mode !== "replace") {
      return NextResponse.json(
        { error: 'mode is required and must be "merge" or "replace"' },
        { status: 400 }
      );
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return NextResponse.json(
        { error: "config is required and must be an object" },
        { status: 400 }
      );
    }

    const result = importConfig(config as HomelabarrExport, mode);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to import configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
