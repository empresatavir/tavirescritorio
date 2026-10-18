/**
 * TAVIR API Client — typed HTTP client for backend endpoints.
 * Base URL defaults to current origin (backend serves frontend in production).
 */

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

export interface CreateJobRequest {
  task_id?: string | null;
  project_id?: string | null;
  agent_id?: string | null;
  command?: string;
  timeout?: number;
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
  platform?: string | null;
  niche?: string | null;
  audience?: string | null;
  tone?: string | null;
  context?: string | null;
  color?: string | null;
  initials?: string | null;
  networks?: Array<{ net: "ig" | "yt" | "tt" | "li"; handle: string; logo: string }> | null;
  guidelines?: string | null;
  status?: string;
}

export interface StudioPiece {
  id: string;
  num?: string | null;
  profile_id?: string | null;
  project_id?: string | null;
  title: string;
  content_type?: string;
  net?: "ig" | "yt" | "tt" | "li" | null;
  stage: "idea" | "pauta" | "prod" | "review" | "pub" | "done";
  needs: boolean;
  body?: string | null;
  script?: string | null;
  caption?: string | null;
  tags?: string | null;
  images?: string[] | null;
  timeline?: Array<[string, string, string]> | null;
  status?: string;
  published_url?: string | null;
  published_at?: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  process_type: string;
  stages: any[];
}

export interface Idea {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
}

export interface IntegrationCheck {
  id: string;
  service_name: string;
  status: string;
  last_check_at: string;
  evidence: string | null;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  source_file: string | null;
  domain: string;
  summary: string | null;
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

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Health
  health: () => fetchJson<{ status: string; version: string }>("/api/v1/health"),

  // Cockpit
  getCockpitSummary: () => fetchJson<CockpitSummary>("/api/v1/cockpit/summary"),

  // Tasks
  listTasks: (query?: { status?: string; priority?: string; updated_since?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.priority) params.set("priority", query.priority);
    if (query?.updated_since) params.set("updated_since", query.updated_since);
    const qs = params.toString();
    return fetchJson<ApiTask[]>(`/api/v1/tasks/${qs ? `?${qs}` : ""}`);
  },
  updateTaskStatus: (taskId: string, status: string) =>
    fetchJson<ApiTask>(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createTask: (data: any) =>
    fetchJson<ApiTask>("/api/v1/tasks/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
  listProjects: () => fetchJson<Project[]>("/api/v1/projects/"),

  // Jobs
  listJobs: () => fetchJson<Job[]>("/api/v1/jobs/"),
  createJob: (req: CreateJobRequest) =>
    fetchJson<Job>("/api/v1/jobs/", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getJob: (jobId: string) => fetchJson<Job>(`/api/v1/jobs/${jobId}`),
  retryJob: (jobId: string) =>
    fetchJson<Job>(`/api/v1/jobs/${jobId}/retry`, { method: "POST" }),
  cancelJob: (jobId: string) =>
    fetchJson<Job>(`/api/v1/jobs/${jobId}/cancel`, { method: "POST" }),

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

  // Studio
  listPersonas: () => fetchJson<Persona[]>("/api/v1/studio/personas"),
  listStudioProfiles: () => fetchJson<StudioProfile[]>("/api/v1/studio/profiles"),
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

  // Visibility & Knowledge
  listWorkflows: () => fetchJson<Workflow[]>("/api/v1/workflows"),
  listIdeas: () => fetchJson<Idea[]>("/api/v1/ideas"),
  listIntegrations: () => fetchJson<IntegrationCheck[]>("/api/v1/integrations"),
  searchKnowledge: (query?: string) =>
    fetchJson<KnowledgeEntry[]>(`/api/v1/knowledge${query ? `?q=${encodeURIComponent(query)}` : ""}`),

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
};