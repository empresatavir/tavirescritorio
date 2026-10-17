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
  stages: any[];
  owner_role: string;
  gate_required: boolean;
  created_at?: string;
}

export interface Persona {
  id: string;
  name: string;
  niche: string;
  description: string | null;
}

export interface Profile {
  id: string;
  persona_id: string;
  name: string;
  social_handle: string | null;
  tone: string | null;
}

export interface Piece {
  id: string;
  profile_id: string;
  project_id: string | null;
  title: string;
  stage: string;
  content: string | null;
  published: boolean;
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
  listTasks: (query?: { status?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.priority) params.set("priority", query.priority);
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

  // Studio
  listPersonas: () => fetchJson<Persona[]>("/api/v1/studio/personas"),
  listProfiles: () => fetchJson<Profile[]>("/api/v1/studio/profiles"),
  listPieces: () => fetchJson<Piece[]>("/api/v1/studio/pieces"),

  // Visibility & Knowledge
  listWorkflows: () => fetchJson<Workflow[]>("/api/v1/workflows"),
  listIdeas: () => fetchJson<Idea[]>("/api/v1/ideas"),
  listIntegrations: () => fetchJson<IntegrationCheck[]>("/api/v1/integrations"),
  searchKnowledge: (query?: string) =>
    fetchJson<KnowledgeEntry[]>(`/api/v1/knowledge${query ? `?q=${encodeURIComponent(query)}` : ""}`),

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