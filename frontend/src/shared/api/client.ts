/**
 * TAVIR API Client — typed HTTP client for backend endpoints.
 * Base URL defaults to current origin (backend serves frontend in production).
 */

import { reportAiLinkFailure } from "../../state/aiLink";

const BASE_URL = import.meta.env.VITE_API_BASE || "";

export interface Agent {
  id: string;
  name: string;
  role: string;
  sector: string;
  status: string;
  skills: string | null;
  model_provider: string | null;
  soul_text?: string | null;
  total_jobs?: number;
  total_cost?: number;
  avatar_color?: string | null;
  initials?: string | null;
  last_run?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string | null;
  created_at: string;
}

export interface ApiChatConversation {
  id: string;
  agent_id: string;
  title: string;
  settings?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ApiChatConversationDetail {
  conversation: ApiChatConversation;
  messages: ApiChatMessage[];
}

export interface SendMessageResponse {
  user_message: ApiChatMessage;
  assistant_message: ApiChatMessage;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  client: string | null;
  status: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Job {
  id: string;
  task_id: string | null;
  project_id: string | null;
  agent_id: string | null;
  origin: string;
  model_provider?: string | null;
  model_name?: string | null;
  effort?: string | null;
  status: string;
  workspace_path: string | null;
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobEvent {
  id: string;
  event_type: string;
  previous_state: string | null;
  new_state: string | null;
  actor: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface JobArtifact {
  id: string;
  name: string;
  artifact_type: string;
  size_bytes?: number | null;
  path?: string;
  qa_status?: string;
  job_id?: string | null;
}

export interface JobArtifactContent {
  name: string;
  content: string;
  truncated?: boolean;
  job_id?: string | null;
}

export interface TaskArtifactBundle {
  task_id: string;
  job_id?: string | null;
  artifacts: JobArtifact[];
}

export interface CreateJobRequest {
  task_id?: string | null;
  project_id?: string | null;
  agent_id?: string | null;
  model_name?: string | null;
  effort?: string | null;
  model_provider?: string | null;
  command?: string;
  timeout?: number;
  /** planning | execution | manual */
  origin?: string;
}

export interface EngineeringTemplate {
  id: string;
  name: string;
  category: string;
  mode: string;
  stages: string[];
  mesas?: string[];
  owner_role?: string | null;
  gate_required: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface FactoryProject {
  id: string;
  slug: string;
  name: string;
  client?: string | null;
  company?: string | null;
  template_code?: string | null;
  stages_done: number;
  total_stages: number;
  status: "running" | "paused" | "done";
  repo_url?: string | null;
  deploy_target?: string | null;
  stack?: string | null;
  goal?: string | null;
  audience?: string | null;
  scope_items?: string[] | null;
  pendencies?: Array<{
    id: string;
    kind: "auth" | "error" | "decision";
    title: string;
    from: string;
    text: string;
    cause?: string;
    fix?: string;
    options?: string[];
  }> | null;
  kanban_cards?: Array<{
    title: string;
    column: "backlog" | "doing" | "review" | "done";
    mesa: string;
  }> | null;
  files?: Array<{
    kind: "img" | "html" | "text";
    name: string;
    mesa: string;
  }> | null;
  keys?: Record<string, string> | null;
  event_log?: Array<[string, string, string]> | null;
  local_path?: string | null;
}

export interface FactoryStageInstance {
  id: string;
  stage_def_id: string;
  code: string;
  title: string;
  sort_order: number;
  agent?: string | null;
  agent_role?: string | null;
  is_gate: boolean;
  topology?: string | null;
  status: "queued" | "running" | "awaiting_gate" | "done" | "failed" | "blocked" | "skipped";
  expected_artifacts?: string[];
  artifact_hash?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface FactoryLedgerEntry {
  id: string;
  at?: string;
  kind?: string;
  action?: string;
  stage_def_id?: string;
  title?: string;
  actor?: string;
  note?: string | null;
}

export interface FactoryRunPendency {
  id: string;
  kind: "auth" | "error" | string;
  title: string;
  from?: string;
  text: string;
  cause?: string | null;
  stage_def_id?: string;
  action?: "authorize" | "resume" | string;
}

export interface FactoryRunPayload {
  id: string;
  project_id: string;
  template_code: string;
  status: string;
  current_stage_id?: string | null;
  workspace_path?: string | null;
  meta?: Record<string, unknown>;
  ledger?: FactoryLedgerEntry[];
  stages: FactoryStageInstance[];
  stages_done?: number;
  total_stages?: number;
  pendencies?: FactoryRunPendency[];
  last_ledger?: FactoryLedgerEntry;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FactoryStageActionBody {
  note?: string;
  actor?: string;
  artifact_hash?: string;
  model?: string;
  effort?: string;
}

export interface CreateProjectPayload {
  name: string;
  company?: string;
  /** Pasta raiz do workspace: interno → tavir-interno · externo → tavir-exterrno */
  ownership: "interno" | "externo";
  stack_frontend?: string;
  stack_backend?: string;
  stack_database?: string;
  track: "zero" | "pronto";
  context_files?: string[];
  /** @deprecated use design_system_files */
  design_system_file?: string;
  design_system_files?: string[];
  template_category?: "lp" | "of" | "sy";
}

export interface ProjectItem {
  id: string;
  slug: string;
  name: string;
  client?: string | null;
  company?: string | null;
  stack?: string | null;
  template_code?: string | null;
  stages_done: number;
  total_stages: number;
  status: string;
  repo_url?: string | null;
  local_path?: string | null;
  deploy_target?: string | null;
  description?: string | null;
  files?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Persona {
  id: string;
  name: string;
  archetype?: string | null;
  pain_points?: string | null;
  goals?: string | null;
  demographics?: string | null;
  status?: string;
}

export interface StudioProfile {
  id: string;
  persona_id?: string | null;
  name: string;
  handle?: string | null;
  company?: string | null;
  platform?: string | null;
  niche?: string | null;
  audience?: string | null;
  tone?: string | null;
  context?: string | null;
  color?: string | null;
  initials?: string | null;
  networks?: Array<{
    net: "ig" | "yt" | "tt" | "li";
    handle: string;
    url?: string;
    followers?: number;
    engagement?: number;
    logo?: string;
  }> | null;
  design_system?: Record<string, unknown> | null;
  cycle_goal?: number;
  cycle_done?: number;
  guidelines?: string | null;
  status?: string;
}

export interface StudioPiece {
  id: string;
  num?: string | null;
  profile_id?: string | null;
  project_id?: string | null;
  title: string;
  subtitle?: string | null;
  content_type?: string;
  net?: "ig" | "yt" | "tt" | "li" | null;
  stage: "idea" | "pauta" | "prod" | "review" | "pub" | "done" | "error";
  needs: boolean;
  body?: string | null;
  script?: string | null;
  caption?: string | null;
  cta?: string | null;
  tags?: string | null;
  slides?: string[] | null;
  images?: string[] | null;
  timeline?: Array<[string, string, string]> | null;
  progress?: number | null;
  squad?: string | null;
  status?: string;
  published_url?: string | null;
  published_at?: string | null;
}

export interface StudioDecisionOption {
  id: string;
  label: string;
  style: string;
  fit: number;
  title: string;
  angle: string;
  hook: string;
  sources: string;
  whyNow: string;
}

export interface StudioDecision {
  id: string;
  profile_id: string;
  run_id: string;
  kind: "pauta" | "revisao";
  title: string;
  subtitle?: string | null;
  status: "pending" | "resolved" | "dismissed";
  options?: StudioDecisionOption[] | null;
  selected_option_id?: string | null;
  piece_id?: string | null;
  waiting_label?: string | null;
  platform_label?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudioProductionResult {
  piece: StudioPiece;
  decision: StudioDecision | null;
}

export interface WorkflowStep {
  agent: string;
  action: string;
  gate?: string;
  arrow?: boolean;
  owner?: string;
}

export interface Workflow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  steps: WorkflowStep[] | any;
  trigger_type: string;
  status: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Idea {
  id: string;
  title: string;
  description?: string | null;
  source?: string | null;
  status: string;
  priority: string;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationCheck {
  id: string;
  integration_name: string;
  status: string;
  last_checked_at?: string | null;
  response_time_ms?: number | null;
  error_message?: string | null;
  extra_metadata?: any;
  created_at?: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string | null;
  source_type: string;
  source_path: string | null;
  tags: string[] | null;
  extra_metadata?: {
    domain?: string;
    source?: string;
    importance?: number;
    full_content?: string;
    aliases?: string[];
  } | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorDimension {
  dimension: string;
  score: number;
  status: string;
  signal: string;
  evidence: string;
  last_checked: string;
}

export interface DoctorSummary {
  overall_score: number;
  status: string;
  dimensions: DoctorDimension[];
  checked_at: string;
}

export interface CostByModelItem {
  model: string;
  cost: number;
  share: number;
  tokens: string;
}

export interface AnalyticsSummary {
  total_cost_usd: number;
  daily_average_usd: number;
  total_tokens_m: number;
  escalation_rate_pct: number;
  cost_trend: Array<{ day: string; date: string; cost: number }>;
  cost_by_model: CostByModelItem[];
  reconciliation: {
    currency_cost: string;
    currency_revenue: string;
    total_revenue_invoiced_brl: number;
    total_revenue_paid_brl: number;
    total_revenue_pending_brl: number;
    pipeline_in_negotiation_brl: number;
    ai_cost_usd: number;
    audit_note: string;
  };
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  origin: string;
  trigger_type: string;
  agents_count: number;
  agents: string[];
}

export interface ApiTask {
  id: string;
  seq?: number | null;
  project_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignee_agent_id?: string | null;
  sector?: string | null;
  escalation?: string | null;
  handoffs?: any;
  gates?: any;
  tags?: any;
  depends_on?: Array<string | number> | null;
  active_job_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiApproval {
  id: string;
  title?: string | null;
  type?: string | null;
  job_id?: string | null;
  task_id?: string | null;
  requester_agent_id?: string | null;
  status: string;
  impact?: string | null;
  reason?: string | null;
  description?: string | null;
  on_approve_text?: string | null;
  on_reject_text?: string | null;
  decided_by?: string | null;
  justification?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CockpitSummary {
  kpis: {
    active_cards_count: number;
    escalated_count: number;
    running_jobs_count: number;
  };
  summary_text: string;
  running_jobs: Array<{
    id: string;
    title: string;
    agentName: string;
    model: string;
    progress: number;
    taskId?: string;
  }>;
  escalated_tasks: Array<{
    seq: string;
    title: string;
    to: string;
    reason: string;
    action?: string;
    actionTarget?: string;
    taskId: string;
  }>;
  active_tasks: Array<{
    seq: string;
    title: string;
    assignee: string;
    handoff: string;
    jobLabel: string;
    jobColor: string;
    taskId: string;
  }>;
  needs: Array<{
    icon: string;
    color: string;
    label: string;
    detail: string;
    count: string;
    path: string;
  }>;
}

export interface ProposalItem {
  desc: string;
  value: number;
}

export interface ProposalChange {
  at: string;
  target: string;
  agent: string;
  text: string;
  status: string;
}

export interface ProposalSendInfo {
  link: string;
  sentTo: string;
  sentAt: string;
  opened: string;
  accept: ["signed", string, string] | ["refused", string, string] | ["pending"];
}

export interface Proposal {
  id: string;
  num: string;
  client: string;
  stage: "progress" | "pending" | "done";
  status: string;
  tone: "work" | "wait" | "ok" | "lost";
  version: number;
  value: number | null;
  validity: string;
  deadline: string;
  task_id?: string | null;
  taskId?: string | null;
  summary: string;
  scope: string;
  items: ProposalItem[];
  collected: [string, string][];
  changes: ProposalChange[];
  timeline: [string, string, string][];
  send_info?: ProposalSendInfo | null;
  created_at?: string;
  updated_at?: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`API ${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function parseApiError(err: unknown): { status: number; detail: string } {
  if (err instanceof ApiError) return { status: err.status, detail: err.detail };
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/API (\d+):\s*([\s\S]*)/);
  if (!m) return { status: 0, detail: msg };
  let detail = m[2].trim();
  try {
    const j = JSON.parse(detail);
    if (typeof j?.detail === "string") detail = j.detail;
    else if (Array.isArray(j?.detail)) detail = j.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
  } catch {
    /* texto puro */
  }
  return { status: Number(m[1]), detail };
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  noticeAiLinkHeader(response);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = body || response.statusText;
    try {
      const j = JSON.parse(body);
      if (typeof j?.detail === "string") detail = j.detail;
    } catch {
      /* keep raw */
    }
    noticeAiLinkText(detail);
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  const data = (await response.json()) as T;
  noticeAiLinkPayload(data);
  return data;
}

function noticeAiLinkHeader(response: Response) {
  const raw = response.headers.get("X-Tavir-Ai-Link");
  if (!raw) return;
  try {
    reportAiLinkFailure(decodeURIComponent(raw));
  } catch {
    reportAiLinkFailure(raw);
  }
}

function noticeAiLinkText(text: string) {
  if (/GhostCLI|GHOSTCLI_API_KEY|A IA não respondeu|A IA devolveu um documento vazio|Não consegui falar com o GhostCLI/i.test(text)) {
    reportAiLinkFailure(text);
  }
}

function noticeAiLinkPayload(data: unknown) {
  if (!data || typeof data !== "object") return;
  const messages = (data as { messages?: Array<{ text?: string; meta?: string }> }).messages;
  if (!Array.isArray(messages)) return;
  const last = messages[messages.length - 1];
  if (!last) return;
  const meta = last.meta || "";
  const text = last.text || "";
  if (
    meta.startsWith("ghostcli:error") ||
    meta === "ghostcli:unconfigured" ||
    text.includes("[GhostCLI]") ||
    text.includes("Não consegui falar com o GhostCLI")
  ) {
    reportAiLinkFailure(text || meta);
  }
}

export const api = {
  // Health
  health: () => fetchJson<{ status: string; version: string }>("/api/v1/health"),

  // Cockpit
  getCockpitSummary: () => fetchJson<CockpitSummary>("/api/v1/cockpit/summary"),

  // Tasks
  listTasks: (query?: { status?: string; priority?: string; updated_since?: string; since?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.priority) params.set("priority", query.priority);
    if (query?.since) params.set("since", query.since);
    else if (query?.updated_since) params.set("since", query.updated_since);
    const qs = params.toString();
    return fetchJson<ApiTask[]>(`/api/v1/tasks/${qs ? `?${qs}` : ""}`);
  },
  updateTaskStatus: (taskId: string, status: string) =>
    fetchJson<ApiTask>(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateTask: (
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      sector?: string | null;
      tags?: any;
      handoffs?: any;
      gates?: any;
    }
  ) =>
    fetchJson<ApiTask>(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createTask: (data: any) =>
    fetchJson<ApiTask>("/api/v1/tasks/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadTaskAttachment: async (taskId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${BASE_URL}/api/v1/tasks/${taskId}/attachments`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      let detail = body || response.statusText;
      try {
        const j = JSON.parse(body);
        if (typeof j?.detail === "string") detail = j.detail;
      } catch {
        /* keep */
      }
      throw new ApiError(response.status, detail);
    }
    return response.json() as Promise<ApiTask>;
  },

  // Approvals
  listApprovals: (query?: { status?: string; impact?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.impact) params.set("impact", query.impact);
    const qs = params.toString();
    return fetchJson<ApiApproval[]>(`/api/v1/approvals/${qs ? `?${qs}` : ""}`);
  },
  decideApproval: (
    approvalId: string,
    decision: string,
    justification?: string,
    decidedBy: string = "CEO"
  ) =>
    fetchJson<ApiApproval>(`/api/v1/approvals/${approvalId}/decide`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        justification,
        decided_by: decidedBy,
      }),
    }),

  // Agents
  listAgents: (query?: { sector?: string; q?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.sector) params.set("sector", query.sector);
    if (query?.q) params.set("q", query.q);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return fetchJson<Agent[]>(`/api/v1/agents/${qs ? `?${qs}` : ""}`);
  },
  getAgent: (agentId: string) => fetchJson<Agent>(`/api/v1/agents/${agentId}`),
  getAgentSoul: (agentId: string) =>
    fetchJson<{ agent_id: string; soul_text: string | null }>(`/api/v1/agents/${agentId}/soul`),
  updateAgentSoul: (agentId: string, soul_text: string) =>
    fetchJson<{ agent_id: string; soul_text: string }>(`/api/v1/agents/${agentId}/soul`, {
      method: "PUT",
      body: JSON.stringify({ soul_text }),
    }),

  // Chat
  listChatConversations: (agentId?: string) => {
    const params = new URLSearchParams();
    if (agentId) params.set("agent_id", agentId);
    const qs = params.toString();
    return fetchJson<ApiChatConversation[]>(`/api/v1/chat/conversations${qs ? `?${qs}` : ""}`);
  },
  getChatConversation: (convId: string) =>
    fetchJson<ApiChatConversationDetail>(`/api/v1/chat/conversations/${convId}`),
  createChatConversation: (agentId: string, title: string, settings?: Record<string, any>) =>
    fetchJson<ApiChatConversation>("/api/v1/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, title, settings }),
    }),
  updateChatSettings: (convId: string, settings: Record<string, any>) =>
    fetchJson<ApiChatConversation>(`/api/v1/chat/conversations/${convId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    }),
  sendChatMessage: (convId: string, text: string) =>
    fetchJson<SendMessageResponse>(`/api/v1/chat/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  deleteChatConversation: (convId: string) =>
    fetchJson<void>(`/api/v1/chat/conversations/${convId}`, {
      method: "DELETE",
    }),

  // Projects
  listProjects: () => fetchJson<ProjectItem[]>("/api/v1/projects/"),
  createProject: (payload: CreateProjectPayload) =>
    fetchJson<ProjectItem>("/api/v1/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Jobs
  listJobs: () => fetchJson<Job[]>("/api/v1/jobs/"),
  createJob: (req: CreateJobRequest) =>
    fetchJson<Job>("/api/v1/jobs/", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getJob: (jobId: string) => fetchJson<Job>(`/api/v1/jobs/${jobId}`),
  pauseJob: (jobId: string) =>
    fetchJson<Job>(`/api/v1/jobs/${jobId}/pause`, { method: "POST" }),
  retryJob: (jobId: string) =>
    fetchJson<Job>(`/api/v1/jobs/${jobId}/retry`, { method: "POST" }),
  cancelJob: (jobId: string) =>
    fetchJson<Job>(`/api/v1/jobs/${jobId}/cancel`, { method: "POST" }),
  listJobArtifacts: (jobId: string) =>
    fetchJson<JobArtifact[]>(`/api/v1/jobs/${jobId}/artifacts`),
  getJobArtifactContent: (jobId: string, name: string) =>
    fetchJson<JobArtifactContent>(
      `/api/v1/jobs/${jobId}/artifacts/${encodeURIComponent(name)}/content`
    ),
  listTaskArtifacts: (taskId: string) =>
    fetchJson<TaskArtifactBundle>(`/api/v1/tasks/${taskId}/artifacts`),
  getTaskArtifactContent: (taskId: string, name: string) =>
    fetchJson<JobArtifactContent>(
      `/api/v1/tasks/${taskId}/artifacts/${encodeURIComponent(name)}/content`
    ),

  // Factory
  listTemplates: () => fetchJson<EngineeringTemplate[]>("/api/v1/factory/templates"),
  getTemplate: (code: string) => fetchJson<EngineeringTemplate>(`/api/v1/factory/templates/${code}`),
  listFactoryProjects: () => fetchJson<FactoryProject[]>("/api/v1/factory/projects"),
  getFactoryProject: (id: string) => fetchJson<FactoryProject>(`/api/v1/factory/projects/${id}`),
  createFactoryProject: (data: any) =>
    fetchJson<FactoryProject>("/api/v1/factory/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProjectStage: (id: string, stagesDone: number) =>
    fetchJson<FactoryProject>(`/api/v1/factory/projects/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stages_done: stagesDone }),
    }),
  resolveProjectPendency: (id: string, pendencyId: string, note?: string) =>
    fetchJson<FactoryProject>(`/api/v1/factory/projects/${id}/resolve-pendency`, {
      method: "POST",
      body: JSON.stringify({ pendency_id: pendencyId, note }),
    }),

  getFactoryRun: (projectId: string) =>
    fetchJson<FactoryRunPayload>(`/api/v1/factory/projects/${projectId}/run`),

  openFactoryWorkspace: (projectId: string) =>
    fetchJson<{ ok: boolean; path: string }>(
      `/api/v1/factory/projects/${projectId}/open-folder`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  listFactoryArtifacts: (projectId: string) =>
    fetchJson<{
      project_id: string;
      local_path: string | null;
      files: Array<{
        path: string;
        name: string;
        size: number;
        mime: string;
        is_text: boolean;
        sha256?: string | null;
      }>;
      expected: Array<{ path: string; present: boolean }>;
      count: number;
    }>(`/api/v1/factory/projects/${projectId}/artifacts`),

  readFactoryArtifact: (projectId: string, path: string) =>
    fetchJson<{
      path: string;
      name: string;
      size: number;
      mime: string;
      is_text: boolean;
      sha256: string;
      content: string | null;
    }>(
      `/api/v1/factory/projects/${projectId}/artifacts/content?path=${encodeURIComponent(path)}`,
    ),

  writeFactoryArtifact: (
    projectId: string,
    body: { path: string; content: string; overwrite?: boolean; stage_def_id?: string },
  ) =>
    fetchJson<{
      ok: boolean;
      file: { path: string; name: string; size: number; sha256: string };
      ledger?: Record<string, unknown> | null;
    }>(`/api/v1/factory/projects/${projectId}/artifacts`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  authorizeFactoryStage: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/authorize`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  completeFactoryStage: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/complete`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  failFactoryStage: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/fail`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  resumeFactoryStage: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/resume`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  resumeFactoryRun: (projectId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(`/api/v1/factory/projects/${projectId}/run/resume`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  pauseFactoryRun: (projectId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(`/api/v1/factory/projects/${projectId}/run/pause`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  redoFactoryGate: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/redo`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  restartFactoryRun: (projectId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload>(`/api/v1/factory/projects/${projectId}/run/restart`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  executeFactoryStage: (projectId: string, stageDefId: string, body?: FactoryStageActionBody) =>
    fetchJson<FactoryRunPayload & { executed_files?: unknown[]; ghostcli?: string | null }>(
      `/api/v1/factory/projects/${projectId}/stages/${encodeURIComponent(stageDefId)}/execute`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),

  setFactoryAutoSwitch: (projectId: string, enabled: boolean) =>
    fetchJson<FactoryRunPayload>(`/api/v1/factory/projects/${projectId}/run/auto-switch`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }),

  autoExecuteFactoryRun: (projectId: string, body?: FactoryStageActionBody) =>
    fetchJson<
      FactoryRunPayload & {
        auto?: { steps: unknown[]; stop_reason: string; steps_count: number };
      }
    >(`/api/v1/factory/projects/${projectId}/run/auto`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  getFactoryQa: (projectId: string) =>
    fetchJson<{
      project_id: string;
      run_id?: string | null;
      template_code: string;
      workspace_ok: boolean;
      rules: Array<{
        id: string;
        title: string;
        kind: string;
        status: "pass" | "fail" | "wait" | string;
        paths?: string[];
      }>;
      passed: number;
      total: number;
      pct: number;
      ready_for_handoff: boolean;
    }>(`/api/v1/factory/projects/${projectId}/qa`),

  getFactoryRoadmap: (projectId: string) =>
    fetchJson<{
      project_id: string;
      run_id: string;
      template_code: string;
      pct: number;
      stages_done: number;
      total_stages: number;
      current_stage_id?: string | null;
      stages: FactoryStageInstance[];
    }>(`/api/v1/factory/projects/${projectId}/roadmap`),

  getFactoryChat: (projectId: string) =>
    fetchJson<{
      project_id: string;
      messages: Array<{
        id: string;
        role: string;
        text: string;
        agent_role?: string;
        agent_name?: string;
        at?: string;
      }>;
    }>(`/api/v1/factory/projects/${projectId}/chat`),

  postFactoryChat: (
    projectId: string,
    body: { message: string; agent_role?: string; agent_name?: string },
  ) =>
    fetchJson<{
      project_id: string;
      messages: Array<{ id: string; role: string; text: string; agent_name?: string; at?: string }>;
    }>(`/api/v1/factory/projects/${projectId}/chat`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getFactoryAccess: (projectId: string) =>
    fetchJson<{
      project_id: string;
      items: Array<{
        key: string;
        label: string;
        kind: string;
        status: string;
        hint?: string;
        masked: string;
        updated_at?: string;
      }>;
    }>(`/api/v1/factory/projects/${projectId}/access`),

  upsertFactoryAccess: (
    projectId: string,
    body: {
      key: string;
      label?: string;
      kind?: string;
      status?: string;
      hint?: string;
      value?: string;
    },
  ) =>
    fetchJson<{ project_id: string; items: unknown[] }>(
      `/api/v1/factory/projects/${projectId}/access`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  revealFactoryAccess: (projectId: string, key: string) =>
    fetchJson<{ project_id: string; key: string; masked: string; revealed: boolean; note: string }>(
      `/api/v1/factory/projects/${projectId}/access/${encodeURIComponent(key)}/reveal`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  getFactoryLedger: (projectId: string) =>
    fetchJson<{
      project_id: string;
      run_id: string;
      ledger: FactoryLedgerEntry[];
      event_log: Array<[string, string, string]>;
    }>(`/api/v1/factory/projects/${projectId}/ledger`),

  // Studio
  listPersonas: () => fetchJson<Persona[]>("/api/v1/studio/personas"),
  listStudioProfiles: () => fetchJson<StudioProfile[]>("/api/v1/studio/profiles"),
  getStudioProfile: (id: string) => fetchJson<StudioProfile>(`/api/v1/studio/profiles/${id}`),
  createStudioProfile: (data: Record<string, unknown>) =>
    fetchJson<StudioProfile>("/api/v1/studio/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  patchStudioProfile: (id: string, data: Record<string, unknown>) =>
    fetchJson<StudioProfile>(`/api/v1/studio/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listStudioPieces: (query?: { profile_id?: string; stage?: string; net?: string }) => {
    const params = new URLSearchParams();
    if (query?.profile_id) params.set("profile_id", query.profile_id);
    if (query?.stage) params.set("stage", query.stage);
    if (query?.net) params.set("net", query.net);
    const qs = params.toString();
    return fetchJson<StudioPiece[]>(`/api/v1/studio/pieces${qs ? `?${qs}` : ""}`);
  },
  createStudioPiece: (data: any) =>
    fetchJson<StudioPiece>("/api/v1/studio/pieces", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePieceStage: (id: string, stage: string) =>
    fetchJson<StudioPiece>(`/api/v1/studio/pieces/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),
  updatePieceContent: (id: string, data: any) =>
    fetchJson<StudioPiece>(`/api/v1/studio/pieces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  publishPiece: (id: string, url?: string) =>
    fetchJson<StudioPiece>(`/api/v1/studio/pieces/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  produceStudioPiece: (
    id: string,
    data?: { squad_id?: string; theme?: string; guidance?: string },
  ) =>
    fetchJson<StudioPiece>(`/api/v1/studio/pieces/${id}/produce`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
  listStudioDecisions: (query?: { profile_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.profile_id) params.set("profile_id", query.profile_id);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString();
    return fetchJson<StudioDecision[]>(`/api/v1/studio/decisions${qs ? `?${qs}` : ""}`);
  },
  runStudioOracle: (
    profileId: string,
    data?: { net?: string; theme?: string; start_point_id?: string },
  ) =>
    fetchJson<StudioDecision>(`/api/v1/studio/profiles/${profileId}/oracle/runs`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
  selectStudioDecision: (id: string, optionId: string, squadId?: string) =>
    fetchJson<StudioDecision>(`/api/v1/studio/decisions/${id}/select`, {
      method: "POST",
      body: JSON.stringify({ option_id: optionId, squad_id: squadId }),
    }),
  approveStudioPackage: (id: string) =>
    fetchJson<StudioDecision>(`/api/v1/studio/decisions/${id}/approve-package`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  dismissStudioDecision: (id: string) =>
    fetchJson<StudioDecision>(`/api/v1/studio/decisions/${id}/dismiss`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  returnStudioOracle: (id: string) =>
    fetchJson<StudioDecision>(`/api/v1/studio/decisions/${id}/return-oracle`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  createStudioProduction: (data: {
    profile_id: string;
    platform: string;
    squad_id: string;
    start_point_id: string;
    theme?: string;
  }) =>
    fetchJson<StudioProductionResult>("/api/v1/studio/productions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Visibility & Knowledge
  listWorkflows: () => fetchJson<Workflow[]>("/api/v1/workflows"),
  getWorkflow: (id: string) => fetchJson<Workflow>(`/api/v1/workflows/${id}`),
  listIdeas: () => fetchJson<Idea[]>("/api/v1/ideas"),
  createIdea: (data: { title: string; description?: string; source?: string; priority?: string }) =>
    fetchJson<Idea>("/api/v1/ideas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listIntegrations: () => fetchJson<IntegrationCheck[]>("/api/v1/integrations"),
  runIntegrationChecks: () =>
    fetchJson<{ status: string; total_checked: number; results: any[] }>("/api/v1/integrations/check", {
      method: "POST",
    }),
  getGhostCliStatus: () => fetchJson<{ integration: string; status: string; latency_ms: number | null; last_check: string | null; error: string | null }>("/api/v1/integrations/ghostcli/status"),
  getCursorIntegration: () =>
    fetchJson<{
      integration: string;
      enabled: boolean;
      configured: boolean;
      local: boolean;
      logged_in: boolean;
      sdk: boolean;
      model: string;
      login_url?: string | null;
    }>("/api/v1/integrations/cursor"),
  setCursorIntegration: (enabled: boolean) =>
    fetchJson<{
      integration: string;
      enabled: boolean;
      configured: boolean;
      local: boolean;
      logged_in: boolean;
      sdk: boolean;
      model: string;
      login_url?: string | null;
    }>("/api/v1/integrations/cursor", { method: "PUT", body: JSON.stringify({ enabled }) }),
  startCursorLogin: () =>
    fetchJson<{ logged_in: boolean; url: string | null; pending: boolean; error: string | null }>(
      "/api/v1/integrations/cursor/login",
      { method: "POST" },
    ),
  getProjectAiSettings: (projectId: string) =>
    fetchJson<{
      model: string;
      effort: string;
      provider: string;
      cursor_enabled: boolean;
      engines: Array<{
        id: string;
        label: string;
        models: Array<{ id: string; label: string; efforts: Array<{ id: string; label: string }> }>;
      }>;
    }>(`/api/v1/integrations/projects/${projectId}/ai-settings`),
  saveProjectAiSettings: (projectId: string, body: { model: string; effort: string }) =>
    fetchJson<{ model: string; effort: string; provider: string }>(
      `/api/v1/integrations/projects/${projectId}/ai-settings`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  searchKnowledge: (query?: string, domain?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (domain && domain !== "Todos") params.set("domain", domain);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return fetchJson<KnowledgeEntry[]>(`/api/v1/knowledge${qs ? `?${qs}` : ""}`);
  },
  getKnowledgeEntry: (id: string) => fetchJson<KnowledgeEntry>(`/api/v1/knowledge/${id}`),
  getDoctorChecks: () => fetchJson<DoctorSummary>("/api/v1/doctor/checks"),
  getAnalyticsSummary: () => fetchJson<AnalyticsSummary>("/api/v1/analytics/summary"),
  listSkillsCatalog: () => fetchJson<SkillItem[]>("/api/v1/skills"),

  // Commercial & Proposals
  listProposals: (query?: { client?: string; stage?: string }) => {
    const params = new URLSearchParams();
    if (query?.client) params.set("client", query.client);
    if (query?.stage) params.set("stage", query.stage);
    const qs = params.toString();
    return fetchJson<Proposal[]>(`/api/v1/proposals${qs ? `?${qs}` : ""}`);
  },
  getProposal: (id: string) => fetchJson<Proposal>(`/api/v1/proposals/${id}`),
  createProposal: (data: Partial<Proposal>) =>
    fetchJson<Proposal>("/api/v1/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProposal: (id: string, data: Partial<Proposal>) =>
    fetchJson<Proposal>(`/api/v1/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  requestProposalChange: (id: string, data: { target: string; agent: string; text: string }) =>
    fetchJson<Proposal>(`/api/v1/proposals/${id}/change`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sendProposal: (id: string, sentTo: string) =>
    fetchJson<Proposal>(`/api/v1/proposals/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ sent_to: sentTo }),
    }),
  acceptProposal: (id: string, data: { signer_name: string; accepted?: boolean }) =>
    fetchJson<Proposal>(`/api/v1/proposals/${id}/accept`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Models
  listModels: () => fetchJson<{ models: Array<{ id: string; name: string }> }>("/api/v1/models"),

  // Services Management
  listServicesStatus: () => fetchJson<any[]>("/api/v1/services/status"),
  getServiceLogs: (serviceId: string, lines?: number, errorsOnly?: boolean) => {
    const params = new URLSearchParams();
    if (lines) params.set("lines", String(lines));
    if (errorsOnly) params.set("errors_only", "true");
    const qs = params.toString();
    return fetchJson<{ service_id: string; lines: string[]; total: number; returned: number; errors_only: boolean; file: string }>(`/api/v1/services/${serviceId}/logs${qs ? `?${qs}` : ""}`);
  },
  startService: (serviceId: string) =>
    fetchJson<{ message: string; pid: number; port: number; status: string }>(`/api/v1/services/${serviceId}/start`, { method: "POST" }),
  stopService: (serviceId: string) =>
    fetchJson<{ message: string; pid: number | null }>(`/api/v1/services/${serviceId}/stop`, { method: "POST" }),
  restartService: (serviceId: string) =>
    fetchJson<{ message: string; stop: any; start: any }>(`/api/v1/services/${serviceId}/restart`, { method: "POST" }),

  /**
   * Subscribe to job events via SSE.
   */
  subscribeJobEvents(
    jobId: string,
    onEvent: (event: JobEvent) => void,
    onError?: (error: Error) => void,
    lastEventId?: string
  ): AbortController {
    const controller = new AbortController();
    const url = `${BASE_URL}/api/v1/jobs/${jobId}/events`;

    const connect = () => {
      const headers: Record<string, string> = {};
      if (lastEventId) headers["Last-Event-ID"] = lastEventId;

      const source = new EventSource(url);

      source.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as JobEvent;
          lastEventId = event.id;
          onEvent(event);
        } catch {
          // ignore malformed messages
        }
      };

      source.onerror = () => {
        source.close();
        if (!controller.signal.aborted) {
          setTimeout(() => {
            if (!controller.signal.aborted) connect();
          }, 2000);
        }
        onError?.(new Error("SSE connection lost"));
      };

      controller.signal.addEventListener("abort", () => source.close());
    };

    connect();
    return controller;
  },

  /**
   * SSE da esteira da Fábrica (B2).
   * Eventos nomeados: run.snapshot | event.appended | stage.changed | run.completed
   * Valida occurred_at antes de formatar data no consumidor.
   */
  subscribeFactoryRunEvents(
    runId: string,
    handlers: {
      onSnapshot?: (data: Record<string, unknown>) => void;
      onEventAppended?: (data: Record<string, unknown>) => void;
      onStageChanged?: (data: Record<string, unknown>) => void;
      onRunCompleted?: (data: Record<string, unknown>) => void;
      onError?: (error: Error) => void;
    },
  ): AbortController {
    const controller = new AbortController();
    const url = `${BASE_URL}/api/v1/factory/runs/${encodeURIComponent(runId)}/events`;

    const parse = (msg: MessageEvent): Record<string, unknown> | null => {
      try {
        return JSON.parse(msg.data) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    const connect = () => {
      const source = new EventSource(url);

      source.addEventListener("run.snapshot", (msg) => {
        const data = parse(msg as MessageEvent);
        if (data) handlers.onSnapshot?.(data);
      });
      source.addEventListener("event.appended", (msg) => {
        const data = parse(msg as MessageEvent);
        if (!data) return;
        const at = data.occurred_at;
        if (at != null && (typeof at !== "string" || Number.isNaN(Date.parse(at)))) {
          // ignora timestamp inválido; ainda entrega o evento
        }
        handlers.onEventAppended?.(data);
      });
      source.addEventListener("stage.changed", (msg) => {
        const data = parse(msg as MessageEvent);
        if (data) handlers.onStageChanged?.(data);
      });
      source.addEventListener("run.completed", (msg) => {
        const data = parse(msg as MessageEvent);
        if (data) handlers.onRunCompleted?.(data);
        source.close();
      });

      source.onerror = () => {
        source.close();
        if (!controller.signal.aborted) {
          setTimeout(() => {
            if (!controller.signal.aborted) connect();
          }, 2000);
        }
        handlers.onError?.(new Error("Factory SSE connection lost"));
      };

      controller.signal.addEventListener("abort", () => source.close());
    };

    connect();
    return controller;
  },
};