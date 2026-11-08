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
  error?: string;
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
  alterations_open?: boolean;
}

export interface AltTrackState {
  active: boolean;
  step: number;
  title: string;
  updated_at?: string;
  notes?: { map?: string; plan?: string; fix?: string; build?: string };
  auto?: boolean;
  runStatus?: 'idle' | 'running' | 'waiting' | 'paused' | 'done';
  waitingQuestion?: string;
  runLog?: string[];
  runError?: string;
  runJobId?: string;
  checkpoint?: { step: number; itemId: string; label: string; at: string; reason: string; partial: string } | null;
  items?: Array<{ id: string; label: string; owner: string; skill: string; kind?: string; note?: string }>;
  cycles?: Array<{ closed_at: string; title: string; items: Array<{ id: string; label: string; note?: string }> }>;
}

export interface ProjectAlterationsControl {
  ok: boolean;
  rootPath?: string;
  projectId?: string;
  projectName?: string;
  status?: string;
  finished?: boolean;
  alterations_open: boolean;
  chat_unlocked: boolean;
  alt_track?: AltTrackState;
  error?: string;
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
  hasKey?: boolean;
}

export interface MotorLoginResult {
  ok: boolean;
  loggedIn: boolean;
  pending: boolean;
  opened: boolean;
  url: string | null;
  error: string | null;
  message: string;
  engine: string;
}

export interface MotorKeySaveResult {
  ok: boolean;
  hasKey: boolean;
  message: string;
  engine: string;
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
    login: (engineId: string) => Promise<MotorLoginResult>;
    saveKey: (payload: {
      engineId: string;
      apiKey?: string;
      baseUrl?: string;
    }) => Promise<MotorKeySaveResult>;
    keyStatus: (
      engineId?: string,
    ) => Promise<
      | { engine: string; hasKey: boolean; baseUrl: string }
      | Array<{ engine: string; hasKey: boolean; baseUrl: string }>
    >;
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
    logs: () => Promise<Record<string, Array<{ ts: string; lvl: string; cls: string; text: string }>>>;
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
    survey: (idOrPath: string) => Promise<any>;
    inspectFolder: (idOrPath: string) => Promise<any>;
    openInExplorer: (idOrPath: string) => Promise<{ ok: boolean; path?: string }>;
    readFile: (filePath: string) => Promise<{ ok: boolean; content?: string; size?: number }>;
    getChat: (idOrPath: string) => Promise<any>;
    askIris: (params: any) => Promise<any>;
    getAlterationsControl: (idOrPath: string) => Promise<ProjectAlterationsControl>;
    setAlterationsOpen: (idOrPath: string, open: boolean) => Promise<ProjectAlterationsControl>;
    setAltTrackStep: (idOrPath: string, step: number) => Promise<ProjectAlterationsControl>;
    saveAltTrackNote: (idOrPath: string, index: number, text: string) => Promise<ProjectAlterationsControl>;
    clearAltTrackFault: (idOrPath: string) => Promise<ProjectAlterationsControl>;
    advanceAltTrack: (idOrPath: string, fromStep?: number) => Promise<ProjectAlterationsControl>;
    closeAltTrackItem: (idOrPath: string, fromStep?: number) => Promise<ProjectAlterationsControl>;
    startAltTrackCycle: (idOrPath: string) => Promise<ProjectAlterationsControl>;
    setAltTrackAuto: (idOrPath: string, auto: boolean) => Promise<ProjectAlterationsControl>;
    approveAltTrack: (idOrPath: string, decision?: 'aprovado' | 'reprovado', note?: string) => Promise<ProjectAlterationsControl>;
    runAltTrack: (idOrPath: string, step?: number) => Promise<ProjectAlterationsControl & { needsApproval?: boolean; continued?: boolean; paused?: boolean; reply?: string }>;
    pauseAltTrack: (idOrPath: string) => Promise<ProjectAlterationsControl>;
    getEsteira: (idOrPath: string, count?: number) => Promise<any>;
    saveEsteiraInstruction: (idOrPath: string, index: number, text: string) => Promise<any>;
    setEsteiraAuto: (idOrPath: string, auto: boolean) => Promise<any>;
    controlEsteira: (idOrPath: string, index: number, action: string) => Promise<any>;
    runEsteira: (idOrPath: string, index: number, stageName?: string, stageOwner?: string) => Promise<any>;
    decideEsteira: (idOrPath: string, index: number, decision: 'aprovado' | 'reprovado', note?: string) => Promise<any>;
    decisions: (idOrPath: string) => Promise<{ ok: boolean; decisions: any[] }>;
    setEngine: (idOrPath: string, choice: { engine?: string; model?: string; effort?: string }) => Promise<{ ok: boolean; engine?: { engine: string; model: string; effort: string }; caption?: string; error?: string }>;
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
  /** Chat da Íris: parar a resposta em curso de um projeto. */
  iris: {
    stop: (projectKey: string) => Promise<{ ok: boolean }>;
  };
  /** Livro de execuções dos motores (.tavir/runs de cada projeto). */
  seg: {
    run: (idOrPath: string) => Promise<{ ok: boolean; run?: any; error?: string }>;
    list: (idOrPath: string) => Promise<{ ok: boolean; runs: any[]; running: boolean; lines: string[] }>;
    stop: (idOrPath: string) => Promise<{ ok: boolean }>;
    accept: (idOrPath: string, fp: string, accept: boolean, note?: string, title?: string) => Promise<{ ok: boolean; error?: string }>;
    open: (idOrPath: string, runId: string, rel?: string) => Promise<{ ok: boolean; error?: string; path?: string }>;
  };
  qa: {
    run: (idOrPath: string) => Promise<{ ok: boolean; run?: any; error?: string }>;
    list: (idOrPath: string) => Promise<{ ok: boolean; runs: any[]; running: boolean; lines: string[] }>;
    stop: (idOrPath: string) => Promise<{ ok: boolean }>;
    open: (idOrPath: string, runId: string, rel?: string) => Promise<{ ok: boolean; error?: string; path?: string }>;
  };
  runs: {
    list: (idOrPath: string, limit?: number) => Promise<any>;
    read: (idOrPath: string, runId: string) => Promise<any>;
    openFolder: (idOrPath: string, runId?: string) => Promise<{ ok: boolean; error?: string }>;
  };
  onEvent: (callback: (event: RunEvent) => void) => () => void;
}

declare global {
  interface Window {
    tavir: TavirApi;
  }
}
