/**
 * Tipos compartilhados entre o processo principal (Node/Electron) e a interface (React).
 */

import type {
  GateDecision,
  MotionJob,
  Peca,
  PecaCreateInput,
  PecaFiltro,
  PecaUpdate,
  Perfil,
  PerfilInput,
  PerfilRede,
  PerfilRedeInput,
  PieceStage,
  PreflightItem,
  Prompt,
  Serie,
  StudioEvent,
  SerieInput,
} from './studio';
import type { PreviewView } from './studioPreview';

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
  cycles?: Array<{
    closed_at: string;
    title: string;
    items: Array<{ id: string; label: string; note?: string }>;
    branch?: CycleBranchInfo | null;
    publish?: CyclePublishInfo | null;
  }>;
  branch?: CycleBranchInfo | null;
  branchPending?: { dirty: string[]; error: string } | null;
  publish?: CyclePublishInfo | null;
}

/** Ficha do build em uso, gravada por scripts/versioning.js. */
export interface BuildInfo {
  version: string;
  commit: string;
  commitFull: string;
  commitDate: string;
  commitSubject: string;
  branch: string;
  tag: string | null;
  lastTag: string | null;
  commitsSinceTag: number | null;
  dirty: boolean;
  dirtyFiles: string[];
  builtAt: string;
  /** false quando o build não gravou a ficha (rodando sem npm run build). */
  known: boolean;
  /** Texto curto para o rodapé, ex.: "v2.1.0 · 6cdce97". */
  label: string;
}

export interface CycleBranchInfo {
  name: string;
  base: string;
  created_at: string;
  here?: boolean;
  stash?: string;
}

export interface CyclePublishInfo {
  kind: 'pr' | 'merge';
  at: string;
  url?: string;
  number?: number;
  sha?: string;
  account?: string;
  repo?: string;
}

export interface GitAccountView {
  id: string;
  label: 'TAVIR' | 'Pessoal';
  login: string;
  name: string;
  avatar: string;
  scopes: string[];
  preview: string;
  is_default: boolean;
  updated_at: string;
  canPush: boolean;
}

export interface GitAccountResult {
  ok: boolean;
  error?: string;
  account?: GitAccountView;
  accounts: GitAccountView[];
}

export type CredentialProvider = 'vercel' | 'supabase' | 'netlify';

export interface CredentialView {
  provider: CredentialProvider;
  name: string;
  hint: string;
  connected: boolean;
  login: string;
  account: string;
  detail: string;
  preview: string;
  updated_at: string;
}

export interface CredentialResult {
  ok: boolean;
  error?: string;
  credential?: CredentialView;
  credentials: CredentialView[];
}

export interface AltTrackPublishInfo {
  ok: boolean;
  error?: string;
  mode: 'pr' | 'merge' | 'none';
  canPublish: boolean;
  reason: string;
  branch: CycleBranchInfo | null;
  branchPending: { dirty: string[]; error: string } | null;
  publish: CyclePublishInfo | null;
  repo: string | null;
  account: GitAccountView | null;
  accounts: GitAccountView[];
  commits: Array<{ sha: string; subject: string }>;
  current: string;
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
    /** Versão, commit, branch e data do build em uso (dist/build-info.json). */
    buildInfo: () => Promise<BuildInfo>;
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
    altTrackPublishInfo: (idOrPath: string) => Promise<AltTrackPublishInfo>;
    publishAltTrack: (idOrPath: string, accountId?: string) => Promise<AltTrackPublishInfo & { published?: CyclePublishInfo }>;
    resolveAltTrackBranch: (idOrPath: string, choice: 'stash' | 'here') => Promise<ProjectAlterationsControl>;
    setGitAccount: (idOrPath: string, accountId: string) => Promise<AltTrackPublishInfo>;
    openAltTrackPr: (idOrPath: string) => Promise<{ ok: boolean; error?: string; url?: string }>;
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
  /** Contas do GitHub no cofre (TAVIR e Pessoal). O token nunca volta para a tela. */
  accounts: {
    list: () => Promise<{ ok: boolean; accounts: GitAccountView[] }>;
    add: (payload: { label: string; token: string }) => Promise<GitAccountResult>;
    remove: (id: string) => Promise<GitAccountResult>;
    setDefault: (id: string) => Promise<GitAccountResult>;
    test: (id: string) => Promise<GitAccountResult>;
    openTokenPage: () => Promise<{ ok: boolean; error?: string; url?: string }>;
  };
  /** Credenciais de deploy e dados no cofre (Vercel, Supabase, Netlify). O token nunca volta para a tela. */
  creds: {
    list: () => Promise<{ ok: boolean; credentials: CredentialView[] }>;
    save: (provider: CredentialProvider, token: string) => Promise<CredentialResult>;
    remove: (provider: CredentialProvider) => Promise<CredentialResult>;
    test: (provider: CredentialProvider) => Promise<CredentialResult>;
    openTokenPage: (provider: CredentialProvider) => Promise<{ ok: boolean; error?: string; url?: string }>;
  };
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
  studio: {
    perfis: {
      list: () => Promise<Perfil[]>;
      get: (id: string) => Promise<Perfil | null>;
      save: (perfil: PerfilInput) => Promise<{ ok: boolean; perfil?: Perfil; error?: string }>;
      remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
    };
    redes: {
      save: (perfilId: string, rede: PerfilRedeInput) => Promise<{ ok: boolean; rede?: PerfilRede; error?: string }>;
      remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
    };
    pecas: {
      list: (filtro?: PecaFiltro) => Promise<Peca[]>;
      get: (id: string) => Promise<Peca | null>;
      create: (input: PecaCreateInput) => Promise<{ ok: boolean; peca?: Peca; error?: string }>;
      update: (id: string, campos: PecaUpdate) => Promise<{ ok: boolean; peca?: Peca; error?: string }>;
      gate: (id: string, etapa: PieceStage, decisao: GateDecision, comentario?: string) => Promise<{ ok: boolean; peca?: Peca; error?: string }>;
      advance: (id: string) => Promise<{ ok: boolean; peca?: Peca; error?: string }>;
      suggest: (id: string, alvo: 'angulos' | 'roteiro') => Promise<{ ok: boolean; peca?: Peca; error?: string; custo: string }>;
    };
    series: {
      list: (perfilId?: string) => Promise<Serie[]>;
      save: (input: SerieInput) => Promise<{ ok: boolean; serie?: Serie; error?: string }>;
    };
    preflight: () => Promise<PreflightItem[]>;
    render: {
      still: (id: string, frame?: number) => Promise<{ ok: boolean; renderId?: string; error?: string }>;
      proxy: (id: string) => Promise<{ ok: boolean; renderId?: string; error?: string }>;
      final: (id: string) => Promise<{ ok: boolean; renderId?: string; error?: string }>;
      cancel: (id: string) => Promise<{ ok: boolean; error?: string }>;
    };
    preview: {
      get: (pecaId: string, frame?: number, formatId?: string) => Promise<PreviewView>;
    };
    revisao: {
      get: (pecaId: string) => Promise<{ ok: boolean; error?: string; items: Array<{ nome: string; ok: boolean; detalhe: string }> }>;
    };
    pacote: {
      build: (pecaId: string) => Promise<{ ok: boolean; dir?: string; error?: string }>;
      open: (pecaId: string) => Promise<{ ok: boolean; error?: string }>;
    };
    arte: {
      assign: (pecaId: string, index: number, source: string) => Promise<{ ok: boolean; error?: string }>;
    };
    prompts: {
      compile: (pecaId: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
      list: (pecaId: string) => Promise<Array<Prompt & { codigo: string }>>;
      nota: (promptId: string, nota: 'funcionou' | 'nao' | null) => Promise<{ ok: boolean; error?: string }>;
      export: (pecaId: string) => Promise<{ ok: boolean; arquivo?: string; error?: string }>;
      search: (perfilId: string, query: string) => Promise<Prompt[]>;
      polish: (promptId: string) => Promise<{ ok: boolean; error?: string; custo: string }>;
    };
    inbox: {
      scan: () => Promise<{ ligados: Array<{ arquivo: string; pecaId: string; slotId: string; versao: number; venceu: boolean }>; semDono: Array<{ arquivo: string; motivo: string }> }>;
      assign: (fileName: string, slotId: string) => Promise<{ ok: boolean; error?: string }>;
    };
    audio: {
      narrate: (pecaId: string, index?: number) => Promise<{ ok: boolean; error?: string; files?: string[] }>;
    };
    motion: {
      updateBase: () => Promise<{ ok: boolean; error?: string }>;
      downloadBrowser: (confirm: boolean) => Promise<{ ok: boolean; error?: string; log: string }>;
      ask: (input: { perfilId: string; preset: string; pedido: string }) => Promise<{ ok: boolean; job?: MotionJob; error?: string }>;
      gate: (jobId: string, decisao: 'aprovado' | 'ajuste' | 'recusado', comentario?: string) => Promise<{ ok: boolean; job?: MotionJob; error?: string }>;
      latest: (perfilId: string) => Promise<{ job: MotionJob | null; still: string }>;
    };
  };
  onEvent: (callback: (event: RunEvent) => void) => () => void;
  onStudioEvent: (callback: (event: StudioEvent) => void) => () => void;
}

declare global {
  interface Window {
    tavir: TavirApi;
  }
}
