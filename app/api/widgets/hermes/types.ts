export interface HermesProfile {
  name: string;
  model: string;
  gatewayRunning: boolean;
  active: boolean;
}

export interface HermesKanbanTask {
  id: string;
  title: string;
  assignee: string | null;
  status: string;
  ageSec: number | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface HermesGatewayState {
  pid: number | null;
  subState: string | null;
  uptimeSec: number | null;
  telegramEnabled: boolean;
}

export interface HermesResponse {
  gateway: HermesGatewayState;
  profiles: HermesProfile[];
  kanban: {
    countsByStatus: Record<string, number>;
    recent: HermesKanbanTask[];
  };
  generatedAt: string;
}
