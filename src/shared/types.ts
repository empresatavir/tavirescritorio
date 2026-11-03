/**
 * Tipos compartilhados entre o processo principal (Node/Electron) e a interface (React).
 */

export type DomainId = 'op' | 'mod' | 'com' | 'soc' | 'kn' | 'est' | 'sys';

export type EngineKind = 'anthropic' | 'claude' | 'cursor' | 'antigravity' | 'codex';

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
  claudeEnabled: boolean;
  cursorEnabled: boolean;
  antigravityEnabled: boolean;
  codexEnabled: boolean;
  defaultEngine: EngineKind;
  defaultModel: string;
  defaultEffort: string;
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

export interface FactoryProjectItem {
  id: string;
  slug: string;
  name: string;
  client: string | null;
  company: string | null;
  template_code: string | null;
  stages_done: number;
  total_stages: number;
  status: string;
  local_path?: string | null;
  stack?: string | null;
  description?: string | null;
}

export interface CreateFactoryProjectParams {
  name: string;
  company?: string;
  ownership?: 'interno' | 'externo';
  template?: string;
  template_category?: 'lp' | 'of' | 'sy';
  mode?: 'Criação' | 'Manutenção' | string;
  track?: 'zero' | 'pronto' | 'especificado' | 'manutencao';
  local_path?: string;
  absorb?: boolean;
  absorb_agent?: string;
  git_profile?: string;
  git_name?: string;
  git_email?: string;
  repo_url?: string;
  deploy_target?: string;
  stack_frontend?: string;
  stack_backend?: string;
  stack_database?: string;
}

export interface DetectedEngineInfo {
  id: string;
  name: string;
  installed: boolean;
  sdk: boolean;
  loggedIn: boolean;
  path: string;
  detail: string;
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
    updateSettings: (settings: Partial<EngineSettings>) => Promise<EngineSettings>;
    detect: () => Promise<DetectedEngineInfo[]>;
    getCatalog: () => Promise<{
      settings: EngineSettings;
      engines: Array<{
        id: string;
        label: string;
        sdk: string;
        enabled: boolean;
        is_default: boolean;
        models: Array<{ id: string; label: string; efforts: Array<{ id: string; label: string }> }>;
      }>;
      caption: string;
    }>;
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
    create: (params: { title: string; desc?: string; prio: string; sector: string; who?: string; status?: string }) => Promise<TaskItem>;
    updateStatus: (id: string, status: TaskItem['status']) => Promise<any>;
    update: (id: string, patch: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  approvals: {
    list: () => Promise<ApprovalItem[]>;
    decide: (id: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  };
  proposals: {
    list: () => Promise<any[]>;
  };
  projects: {
    list: () => Promise<FactoryProjectItem[]>;
    create: (params: CreateFactoryProjectParams) => Promise<FactoryProjectItem>;
    updateStatus: (id: string, status: string) => Promise<{ ok: boolean; status: string }>;
    delete: (id: string, deleteFiles?: boolean, localPath?: string) => Promise<{ ok: boolean; deletedFiles?: boolean; path?: string | null }>;
    pickFolder: () => Promise<{ canceled: boolean; path: string | null }>;
    absorb: (params: CreateFactoryProjectParams) => Promise<FactoryProjectItem>;
    inspectFolder: (idOrPath: string) => Promise<any>;
    openInExplorer: (idOrPath: string) => Promise<{ ok: boolean; path?: string }>;
    readFile: (filePath: string) => Promise<{ ok: boolean; content?: string; size?: number }>;
    getChat: (idOrPath: string) => Promise<any>;
    askIris: (params: any) => Promise<any>;
    runWithThinking: (params: any) => Promise<any>;
  };
  agents: {
    list: () => Promise<AgentItem[]>;
  };
  vault: {
    search: (query: string) => Promise<any[]>;
    list: () => Promise<any[]>;
    stats: () => Promise<any>;
    reindex: () => Promise<{ stats: any; items: any[] }>;
  };
  onEvent: (callback: (event: RunEvent) => void) => () => void;
}

declare global {
  interface Window {
    tavir: TavirApi;
  }
}
