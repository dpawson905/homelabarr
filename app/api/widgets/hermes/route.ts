import { NextResponse } from "next/server";
import type { HermesResponse } from "./types";

const SHIM_URL =
  process.env.HERMES_STATUS_SHIM_URL ?? "http://100.90.28.107:7755/status";

interface ShimPayload {
  gateway: {
    pid: number | null;
    sub_state: string | null;
    uptime_sec: number | null;
    telegram_enabled: boolean;
  };
  profiles: Array<{
    name: string;
    model: string;
    gateway_running: boolean;
    active: boolean;
  }>;
  kanban: {
    counts_by_status: Record<string, number>;
    recent: Array<{
      id: string;
      title: string;
      assignee: string | null;
      status: string;
      age_sec: number | null;
      started_at: number | null;
      completed_at: number | null;
    }>;
  };
  generated_at: string;
}

export async function GET(): Promise<NextResponse> {
  let raw: ShimPayload;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(SHIM_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json(
        { error: `shim returned HTTP ${res.status}` },
        { status: 502 },
      );
    }
    raw = (await res.json()) as ShimPayload;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          `Cannot reach Hermes status shim at ${SHIM_URL} (${msg}). ` +
          `Set HERMES_STATUS_SHIM_URL or start hermes-status-shim on the Hermes host.`,
      },
      { status: 504 },
    );
  }

  const body: HermesResponse = {
    gateway: {
      pid: raw.gateway.pid,
      subState: raw.gateway.sub_state,
      uptimeSec: raw.gateway.uptime_sec,
      telegramEnabled: raw.gateway.telegram_enabled,
    },
    profiles: raw.profiles.map((p) => ({
      name: p.name,
      model: p.model,
      gatewayRunning: p.gateway_running,
      active: p.active,
    })),
    kanban: {
      countsByStatus: raw.kanban.counts_by_status,
      recent: raw.kanban.recent.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
        status: t.status,
        ageSec: t.age_sec,
        startedAt: t.started_at,
        completedAt: t.completed_at,
      })),
    },
    generatedAt: raw.generated_at,
  };
  return NextResponse.json(body);
}
