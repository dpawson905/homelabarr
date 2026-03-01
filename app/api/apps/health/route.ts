import { NextResponse } from "next/server";
import { getApps } from "@/lib/db/queries";
import {
  checkAppHealth,
  getCachedHealth,
  setCachedHealth,
  type HealthCheckResult,
} from "@/lib/health-check";

interface DisabledStatus {
  status: "disabled";
}

type AppHealthStatus = HealthCheckResult | DisabledStatus;

export async function GET(): Promise<NextResponse> {
  try {
    const allApps = getApps();

    const statuses: Record<string, AppHealthStatus> = {};

    const checksToRun: Array<{
      id: string;
      url: string;
      interval: number;
    }> = [];

    for (const app of allApps) {
      if (app.statusCheckEnabled !== 1) {
        statuses[app.id] = { status: "disabled" };
        continue;
      }

      const cached = getCachedHealth(app.id, app.statusCheckInterval);
      if (cached) {
        statuses[app.id] = cached;
      } else {
        checksToRun.push({
          id: app.id,
          url: app.url,
          interval: app.statusCheckInterval,
        });
      }
    }

    // Run stale/missing checks in parallel
    if (checksToRun.length > 0) {
      const results = await Promise.all(
        checksToRun.map(async ({ id, url }) => {
          const result = await checkAppHealth(url);
          setCachedHealth(id, result);
          return { id, result };
        })
      );

      for (const { id, result } of results) {
        statuses[id] = result;
      }
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check app health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
