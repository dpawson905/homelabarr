import { NextResponse } from "next/server";
import { buildExport } from "@/lib/export/export";

export async function GET(): Promise<NextResponse> {
  try {
    const exportData = buildExport();

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `homelabarr-export-${dateStr}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
