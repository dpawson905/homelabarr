import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { existsSync } from "fs";
import type {
  K8sAutoupdaterCycle,
  K8sAutoupdaterComponent,
  K8sAutoupdaterResponse,
} from "./types";

// Bind-mounted from host: /opt/k8s-autoupdater/state.db -> /opt/k8s-autoupdater/state.db (:ro)
// Read-only with WAL mode means concurrent writes by the host service are safe.
const STATE_DB_PATH =
  process.env.K8S_AUTOUPDATER_DB ?? "/opt/k8s-autoupdater/state.db";

interface CycleRow {
  cycle_id: number;
  started_at: string;
  finished_at: string | null;
  outcome: string | null;
  summary_json: string | null;
}

interface ComponentRow {
  namespace: string;
  deployment: string;
  container: string;
  current_image: string | null;
  last_updated_at: string | null;
  last_rollback_at: string | null;
}

interface StateRow {
  kill_switch: number;
  kill_switch_reason: string | null;
}

function parseCycle(row: CycleRow): K8sAutoupdaterCycle {
  let durationSec: number | null = null;
  if (row.finished_at && row.started_at) {
    durationSec = Math.round(
      (Date.parse(row.finished_at) - Date.parse(row.started_at)) / 1000
    );
  }

  let tiers: K8sAutoupdaterCycle["tiers"] = [];
  let rollbacksTotal = 0;
  let circuitBreaker: K8sAutoupdaterCycle["circuitBreaker"] = null;

  if (row.summary_json) {
    try {
      const summary = JSON.parse(row.summary_json) as {
        tiers?: Record<
          string,
          { updated?: unknown[]; deferred?: unknown[]; rolled_back?: unknown[] }
        >;
        rollbacks_total?: number;
        circuit_breaker?: string;
      };
      if (summary.tiers) {
        tiers = Object.entries(summary.tiers).map(([tier, counts]) => ({
          tier,
          updated: Array.isArray(counts.updated) ? counts.updated.length : 0,
          deferred: Array.isArray(counts.deferred) ? counts.deferred.length : 0,
          rolledBack: Array.isArray(counts.rolled_back)
            ? counts.rolled_back.length
            : 0,
        }));
      }
      rollbacksTotal = summary.rollbacks_total ?? 0;
      if (summary.circuit_breaker === "closed" || summary.circuit_breaker === "open") {
        circuitBreaker = summary.circuit_breaker;
      }
    } catch {
      // malformed summary_json — leave defaults
    }
  }

  let outcome: K8sAutoupdaterCycle["outcome"] = null;
  if (row.outcome === "success" || row.outcome === "failed") {
    outcome = row.outcome;
  } else if (!row.finished_at) {
    outcome = "running";
  }

  return {
    cycleId: row.cycle_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    outcome,
    durationSec,
    tiers,
    rollbacksTotal,
    circuitBreaker,
  };
}

function parseComponent(row: ComponentRow): K8sAutoupdaterComponent {
  return {
    namespace: row.namespace,
    deployment: row.deployment,
    container: row.container,
    currentImage: row.current_image,
    lastUpdatedAt: row.last_updated_at,
    lastRollbackAt: row.last_rollback_at,
  };
}

export async function GET(): Promise<NextResponse> {
  if (!existsSync(STATE_DB_PATH)) {
    return NextResponse.json(
      {
        error: `k8s-autoupdater state DB not found at ${STATE_DB_PATH}. Bind-mount /opt/k8s-autoupdater/state.db:${STATE_DB_PATH}:ro in docker-compose.yml.`,
      },
      { status: 404 }
    );
  }

  let db: Database.Database;
  try {
    db = new Database(STATE_DB_PATH, { readonly: true, fileMustExist: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot open state DB: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  try {
    const stateRow = db
      .prepare(
        "SELECT kill_switch, kill_switch_reason FROM state WHERE id = 1"
      )
      .get() as StateRow | undefined;

    const cycleRows = db
      .prepare(
        "SELECT cycle_id, started_at, finished_at, outcome, summary_json " +
          "FROM cycles ORDER BY cycle_id DESC LIMIT 10"
      )
      .all() as CycleRow[];

    const trackedRow = db
      .prepare("SELECT COUNT(*) AS n FROM components")
      .get() as { n: number };

    const recentlyUpdatedRows = db
      .prepare(
        "SELECT namespace, deployment, container, current_image, " +
          "last_updated_at, last_rollback_at FROM components " +
          "WHERE last_updated_at IS NOT NULL " +
          "ORDER BY last_updated_at DESC LIMIT 5"
      )
      .all() as ComponentRow[];

    const recentlyRolledBackRows = db
      .prepare(
        "SELECT namespace, deployment, container, current_image, " +
          "last_updated_at, last_rollback_at FROM components " +
          "WHERE last_rollback_at IS NOT NULL " +
          "ORDER BY last_rollback_at DESC LIMIT 5"
      )
      .all() as ComponentRow[];

    const cycles = cycleRows.map(parseCycle);

    const body: K8sAutoupdaterResponse = {
      killSwitch: stateRow ? stateRow.kill_switch === 1 : false,
      killSwitchReason: stateRow?.kill_switch_reason ?? null,
      lastCycle: cycles[0] ?? null,
      recentCycles: cycles,
      trackedComponents: trackedRow.n,
      recentlyUpdated: recentlyUpdatedRows.map(parseComponent),
      recentlyRolledBack: recentlyRolledBackRows.map(parseComponent),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body);
  } finally {
    db.close();
  }
}
