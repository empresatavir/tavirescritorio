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
  created_at?: string;
  updated_at?: string;
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

  // Agents
  listAgents: () => fetchJson<Agent[]>("/api/v1/agents/"),

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