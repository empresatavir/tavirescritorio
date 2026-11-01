/**
 * Tipos compartilhados entre o processo principal (Node/Electron) e a interface (React).
 */

export type DomainId = 'op' | 'mod' | 'com' | 'soc' | 'kn' | 'est' | 'sys';

export type EngineKind = 'anthropic' | 'cursor' | 'antigravity' | 'codex';

export type JobStatus = 'running' | 'queued' | 'failed' | 'completed' | 'paused';

export interface JobItem {
  id: string;
  title: string;
  who: string;
  ini: string;
  status: JobStatus;
  progress: number;
  model: string;
  motor: string;
  effort: string;
  task: string;
  cost: number;
  ceiling: number;
  started: string;
  tokens: string;
}

export interface TaskItem {
  id: string;
  seq: number;
  title: string;
  status: 'to_plan' | 'planned' | 'in_progress' | 'done';
  who: string;
  ini: string;
  prio: 'Baixa' | 'Normal' | 'Alta' | 'Crítica';
  sector: string;
  gate?: boolean;
  planning?: boolean;
  job?: string;
}

export interface ApprovalItem {
  id: string;
  group: 'block' | 'scope' | 'review';
  kind: 'deploy' | 'roadmap' | 'ceiling' | 'contract' | 'text' | 'hardening';
  title: string;
  who: string;
  ini: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  impact: 'baixo' | 'médio' | 'alto';
  task: string;
  age: string;
  reason: string;
  question: string;
  yes: string[];
  no: string[];
  more?: string[];
  cost?: string;
  scope?: string;
  time?: string;
  decidedAt?: string;
}

export interface AgentItem {
  id: string;
  name: string;
  sector: string;
  role: string;
  avatar: string;
  model: string;
  motor: string;
  status: 'idle' | 'busy' | 'offline';
  jobsCount: number;
  costTotal: number;
}

export interface EngineSettings {
  anthropicEnabled: boolean;
  cursorEnabled: boolean;
  antigravityEnabled: boolean;
  codexEnabled: boolean;
  defaultEngine: EngineKind;
}

export interface SessionState {
  authenticated: boolean;
  operatorName: string;
  expiresAt: string | null;
  onboardingCompleted: boolean;
  theme: 'dark' | 'light';
}

export interface RunEvent {
  runId: string;
  timestamp: string;
  type: 'thought' | 'tool_call' | 'tool_result' | 'artifact' | 'error' | 'done';
  content: string;
  meta?: Record<string, unknown>;
}

export interface TavirApi {
  app: {
    getVersion: () => Promise<string>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  session: {
    getState: () => Promise<SessionState>;
    login: (key: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    setTheme: (theme: 'dark' | 'light') => Promise<void>;
  };
  engines: {
    getSettings: () => Promise<EngineSettings>;
    updateSettings: (settings: Partial<EngineSettings>) => Promise<void>;
  };
  jobs: {
    list: () => Promise<JobItem[]>;
    start: (params: { title: string; engine: EngineKind; model: string; ceiling: number }) => Promise<JobItem>;
    pause: (id: string) => Promise<void>;
    resume: (id: string) => Promise<void>;
    cancel: (id: string) => Promise<void>;
  };
  tasks: {
    list: () => Promise<TaskItem[]>;
    create: (params: { title: string; prio: string; sector: string }) => Promise<TaskItem>;
    updateStatus: (id: string, status: TaskItem['status']) => Promise<void>;
  };
  approvals: {
    list: () => Promise<ApprovalItem[]>;
    decide: (id: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  };
  vault: {
    search: (query: string) => Promise<any[]>;
    list: () => Promise<any[]>;
  };
  onEvent: (callback: (event: RunEvent) => void) => () => void;
}

declare global {
  interface Window {
    tavir: TavirApi;
  }
}
