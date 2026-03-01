import { NextResponse } from "next/server";
import { getApps } from "@/lib/db/queries";
import {
  checkAppHealth,
  getCachedHealth,
  setCachedHealth,
  type HealthCheckResult,
} from "@/lib/health-check";

type AppHealthStatus = HealthCheckResult | { status: "disabled" };

export async function GET(): Promise<NextResponse> {
  try {
    const allApps = getApps();
    const statuses: Record<string, AppHealthStatus> = {};
    const staleApps: Array<{ id: string; url: string }> = [];

    for (const app of allApps) {
      if (app.statusCheckEnabled !== 1) {
        statuses[app.id] = { status: "disabled" };
        continue;
      }

      const cached = getCachedHealth(app.id, app.statusCheckInterval);
      if (cached) {
        statuses[app.id] = cached;
      } else {
        staleApps.push({ id: app.id, url: app.url });
      }
    }

    await Promise.all(
      staleApps.map(async ({ id, url }) => {
        const result = await checkAppHealth(url);
        setCachedHealth(id, result);
        statuses[id] = result;
      })
    );

    return NextResponse.json({ statuses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check app health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
