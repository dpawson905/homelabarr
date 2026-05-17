export interface K8sAutoupdaterCycle {
  cycleId: number;
  startedAt: string;
  finishedAt: string | null;
  outcome: "success" | "failed" | "running" | null;
  durationSec: number | null;
  // Per-tier counts from summary_json
  tiers: Array<{
    tier: string;
    updated: number;
    deferred: number;
    rolledBack: number;
  }>;
  rollbacksTotal: number;
  circuitBreaker: "closed" | "open" | null;
}

export interface K8sAutoupdaterComponent {
  namespace: string;
  deployment: string;
  container: string;
  currentImage: string | null;
  lastUpdatedAt: string | null;
  lastRollbackAt: string | null;
}

export interface K8sAutoupdaterResponse {
  killSwitch: boolean;
  killSwitchReason: string | null;
  lastCycle: K8sAutoupdaterCycle | null;
  recentCycles: K8sAutoupdaterCycle[];
  trackedComponents: number;
  recentlyUpdated: K8sAutoupdaterComponent[];
  recentlyRolledBack: K8sAutoupdaterComponent[];
  generatedAt: string;
}
