import { createSignal, createEffect } from "solid-js";
import { api, parseApiError } from "../shared/api/client";
import { formatLocalTime } from "../shared/datetime";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeFg?: string;
}

export interface Domain {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

export const DOMAINS: Domain[] = [
  {
    id: "op",
    label: "Operação",
    icon: "zap",
    items: [
      { id: "room", label: "Sala de Operação", icon: "radio-tower" },
      { id: "exec", label: "Execuções", icon: "zap", badge: "jobs" },
      { id: "tasks", label: "Tasks", icon: "square-kanban", badge: "tasks" },
      { id: "approvals", label: "Aprovações", icon: "shield-check", badge: "aps" },
      { id: "blocks", label: "Bloqueios", icon: "octagon-alert", badge: "blocks" },
      { id: "agents", label: "Agentes", icon: "bot" },
      { id: "changes", label: "Alterações", icon: "git-pull-request", badge: "changes" },
    ],
  },
  {
    id: "chat",
    label: "Chat",
    icon: "message-square",
    items: [{ id: "chat", label: "Chat com agentes", icon: "message-square" }],
  },
  {
    id: "mod",
    label: "Módulos",
    icon: "layers",
    items: [
      { id: "studio", label: "Tavir Studio", icon: "sparkles" },
      { id: "fabrica", label: "Tavir Fábrica", icon: "factory" },
      { id: "flow", label: "Tavir Flow", icon: "waves" },
      { id: "edicao", label: "Tavir Edição", icon: "film" },
    ],
  },
  {
    id: "vis",
    label: "Visibilidade",
    icon: "activity",
    items: [
      { id: "analytics", label: "Analytics", icon: "chart-line" },
      { id: "doctor", label: "Doctor", icon: "stethoscope" },
      { id: "integrations", label: "Integrações", icon: "plug" },
      { id: "skills", label: "Skills", icon: "sparkles" },
      { id: "org", label: "Org Chart", icon: "network" },
    ],
  },
  {
    id: "kn",
    label: "Conhecimento",
    icon: "brain",
    items: [
      { id: "brain", label: "Cérebro", icon: "brain" },
      { id: "memory", label: "Memória", icon: "database" },
      { id: "data", label: "Dados", icon: "file-search" },
      { id: "projects", label: "Projetos", icon: "folder-kanban" },
      { id: "ideas", label: "Ideias", icon: "lightbulb" },
    ],
  },
  {
    id: "map",
    label: "Mapa / Tática",
    icon: "map",
    items: [
      { id: "mapa", label: "Mapa", icon: "map" },
      { id: "mission", label: "Mission Control", icon: "rocket" },
      { id: "roadmap", label: "Roadmap", icon: "milestone" },
      { id: "reference", label: "Reference", icon: "book-open" },
    ],
  },
  {
    id: "com",
    label: "Comercial",
    icon: "briefcase",
    items: [
      { id: "funnel", label: "Funnel", icon: "filter" },
      { id: "finances", label: "Finances", icon: "wallet" },
      { id: "proposals", label: "Propostas", icon: "file-signature" },
      { id: "content", label: "Content", icon: "pen-line" },
      { id: "personas", label: "Personas", icon: "user-round" },
    ],
  },
  {
    id: "soc",
    label: "Social / Workflows",
    icon: "workflow",
    items: [
      { id: "workflows", label: "Workflows", icon: "workflow" },
      { id: "social", label: "Social", icon: "instagram" },
      { id: "platforms", label: "Plataformas", icon: "share-2" },
      { id: "comms", label: "Comunicações", icon: "inbox" },
      { id: "library", label: "Biblioteca", icon: "library" },
    ],
  },
];

export interface RosterAgent {
  id: string;
  name: string;
  role: string;
  sector: string;
  status: "busy" | "idle" | "offline" | "error";
  lastRun: string;
  totalJobs: number;
  totalCost: number;
  model: string;
  avatarColor: string;
  initials: string;
  soulText?: string;
}

import { REAL_AGENTS } from "./real_data";

export const INITIAL_AGENTS: RosterAgent[] = REAL_AGENTS;

export interface UiJob {
  id: string;
  title: string;
  agentName: string;
  status: "running" | "queued" | "completed" | "failed" | "paused";
  priority: "critical" | "high" | "normal" | "low";
  progress: number;
  startedAt: string;
  model: string;
  effort: string;
  cost: number;
  ceiling: number;
  taskId?: string;
  taskSeq?: number;
  taskTitle?: string;
  log: Array<[string, "info" | "warn" | "error" | "success", string]>;
}

export const INITIAL_JOBS: UiJob[] = [
  {
    id: "job-001",
    title: "Task #1: Provinha — desenvolver provador virtual infantil",
    agentName: "growth",
    status: "running",
    priority: "high",
    progress: 67,
    startedAt: "14:32",
    model: "gpt-4o",
    effort: "médio",
    cost: 2.4,
    ceiling: 5,
    taskId: "task-01",
    taskSeq: 1,
    taskTitle: "Provinha — desenvolver provador virtual infantil",
    log: [
      ["14:32", "info", "Job iniciado — coletando dados de job_runs"],
      ["14:33", "info", "Agregando custos por modelo"],
      ["14:35", "info", "Em processamento ativo"],
    ],
  },
  {
    id: "job-002",
    title: "Task #2: Conteúdo LP Nicho Advocacia",
    agentName: "qa-e2e",
    status: "running",
    priority: "normal",
    progress: 34,
    startedAt: "14:28",
    model: "claude-sonnet-4",
    effort: "baixo",
    cost: 0.8,
    ceiling: 2,
    taskId: "task-02",
    taskSeq: 2,
    taskTitle: "Conteúdo LP Nicho Advocacia",
    log: [
      ["14:28", "info", "Carregando rascunho de copywriting"],
      ["14:29", "info", "Verificando tom de voz e diretrizes"],
    ],
  },
  {
    id: "job-003",
    title: 'Task #3: Capítulo "Frameworks de Crescimento"',
    agentName: "escritor",
    status: "running",
    priority: "high",
    progress: 89,
    startedAt: "14:15",
    model: "claude-sonnet-4",
    effort: "alto",
    cost: 5.2,
    ceiling: 8,
    taskId: "task-03",
    taskSeq: 3,
    taskTitle: 'Capítulo "Frameworks de Crescimento"',
    log: [
      ["14:15", "info", "Lendo fontes indexadas"],
      ["14:22", "info", "Escrevendo seções"],
    ],
  },
  {
    id: "job-004",
    title: "Task #4: Otimizar SEO — landing principal",
    agentName: "pm-projetos",
    status: "queued",
    priority: "normal",
    progress: 0,
    startedAt: "—",
    model: "claude-opus-4",
    effort: "médio",
    cost: 0,
    ceiling: 6,
    taskId: "task-04",
    taskSeq: 4,
    taskTitle: "Otimizar SEO — landing principal",
    log: [["—", "info", "Aguardando slot livre"]],
  },
  {
    id: "job-005",
    title: "Task #5: Gerar variações de criativos Instagram",
    agentName: "social-media",
    status: "queued",
    priority: "low",
    progress: 0,
    startedAt: "—",
    model: "gpt-4o",
    effort: "baixo",
    cost: 0,
    ceiling: 2,
    taskId: "task-05",
    taskSeq: 5,
    taskTitle: "Gerar variações de criativos Instagram",
    log: [["—", "info", "Aguardando slot livre"]],
  },
  {
    id: "job-006",
    title: "Task #6: Auditoria de segurança — API endpoints",
    agentName: "qa-e2e",
    status: "completed",
    priority: "critical",
    progress: 100,
    startedAt: "13:50",
    model: "claude-sonnet-4",
    effort: "alto",
    cost: 8.7,
    ceiling: 10,
    taskId: "task-06",
    taskSeq: 6,
    taskTitle: "Auditoria de segurança — API endpoints",
    log: [
      ["13:50", "info", "Iniciando varredura de endpoints"],
      ["14:00", "success", "Job concluído — relatório salvo"],
    ],
  },
  {
    id: "job-007",
    title: "Task #7: Deploy landing — cliente Meridian",
    agentName: "devops",
    status: "failed",
    priority: "high",
    progress: 45,
    startedAt: "13:30",
    model: "gpt-4o",
    effort: "médio",
    cost: 1.2,
    ceiling: 3,
    taskId: "task-07",
    taskSeq: 7,
    taskTitle: "Deploy landing — cliente Meridian",
    log: [
      ["13:30", "info", "Build iniciado"],
      ["13:35", "error", "Erro: variável de ambiente SUPABASE_URL ausente"],
      ["13:35", "error", "Job interrompido — requer intervenção"],
    ],
  },
];

export type UiTaskStatus = "to_plan" | "planning" | "planned" | "in_progress" | "done";

export interface UiTask {
  id: string;
  seq: number;
  title: string;
  status: UiTaskStatus;
  assignee: string;
  priority: "critical" | "high" | "normal" | "low";
  sector: string;
  escalation?: string;
  handoffs?: string[];
  gates?: string[];
  activeJobId?: string;
  tags: string[];
  /** Refs (#seq) que bloqueiam o início desta task. */
  dependsOn?: string[];
  description?: string;
  createdAt?: string;
  /** Derivado: há aprovação pendente vinculada (destaque vermelho em Em execução). */
  awaitingApproval?: boolean;
  /** Derivado: task concluída com gate de alteração/homologação pendente. */
  pendingHomologation?: boolean;
  pendingApprovalId?: string;
}

/** Bootstrap vazio — a verdade vem do backend via syncTasks (sem mesclar mocks). */
export const INITIAL_TASKS: UiTask[] = [];

export interface UiApproval {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  type: "authorization" | "checkpoint" | "review" | "alteracao";
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  description: string;
  impact: "high" | "medium" | "low";
  taskId?: string;
  reason?: string;
  onApproveText?: string;
  onRejectText?: string;
}

export const INITIAL_APPROVALS: UiApproval[] = [
  { id: "ap-01", title: "Roadmap Q4 IA Livros — aprovar priorização", agentId: "ag-01", agentName: "Arquiteto", type: "authorization", status: "pending", requestedAt: "12:50", description: "O Arquiteto propõe 3 iniciativas para Q4. Requer confirmação antes de detalhar.", impact: "high", taskId: "task-09", reason: "Muda a ordem de trabalho de Redator e Pesquisador no trimestre.", onApproveText: "O job-009 retoma e o Arquiteto detalha as 3 frentes.", onRejectText: "O job-009 é encerrado e a task volta para replanejamento." },
  { id: "ap-02", title: "Deploy landing Meridian — variável ausente", agentId: "ag-06", agentName: "Deployer", type: "checkpoint", status: "pending", requestedAt: "13:35", description: "Build falhou por falta de SUPABASE_URL. Autorizar retry com config correta?", impact: "high", taskId: "task-07", reason: "O build parou porque a variável SUPABASE_URL não existe na conta travada.", onApproveText: "O Deployer usa a credencial configurada e refaz o build.", onRejectText: "O deploy fica suspenso e a task permanece bloqueada." },
  { id: "ap-03", title: "Headline LP acima do limite — manter ou cortar?", agentId: "ag-05", agentName: "Revisor", type: "review", status: "pending", requestedAt: "14:30", description: "Headline tem 68 caracteres (máx 60). Revisor pede decisão editorial.", impact: "low", taskId: "task-02", reason: "A headline da LP de advocacia passou do limite de 60 caracteres.", onApproveText: "A headline é mantida e o critério de aceite fica registrado como exceção.", onRejectText: "O Redator reescreve a headline dentro do limite." },
  { id: "ap-04", title: "Gasto mensal acima do teto — modelo opus-4", agentId: "ag-08", agentName: "Orquestrador", type: "authorization", status: "pending", requestedAt: "14:10", description: "Orquestrador ultrapassou teto de $300/mês em claude-opus-4. Autorizar aumento?", impact: "medium", taskId: "task-04", reason: "O job de SEO da landing principal usa claude-opus-4.", onApproveText: "O teto sobe só para esta task e o job-004 segue na fila.", onRejectText: "O job-004 muda para claude-sonnet-4 antes de rodar." },
  { id: "ap-05", title: "Proposta Atlas — contra-assinatura", agentId: "ag-11", agentName: "Comercial", type: "checkpoint", status: "pending", requestedAt: "11:20", description: "Proposta enviada, cliente aceitou. Registrar contra-assinatura local.", impact: "medium", taskId: "task-10", reason: "A Atlas Holdings aceitou a proposta via ponte Supabase.", onApproveText: "A proposta é contra-assinada e o projeto atlas-proposta é aberto.", onRejectText: "A proposta volta para o Comercial renegociar." },
  { id: "ap-06", title: "2 recomendações de hardening — API", agentId: "ag-05", agentName: "Revisor", type: "review", status: "approved", requestedAt: "13:58", description: "Rate limiting + headers de segurança. Aprovado, aplicar no próximo deploy.", impact: "low", taskId: "task-06", reason: "A auditoria de segurança da API terminou com 2 recomendações.", onApproveText: "O Deployer aplica as 2 recomendações.", onRejectText: "As recomendações ficam registradas sem aplicação." },
];

// Reactive Store Signals
export const [currentDomainId, setCurrentDomainId] = createSignal<string>("op");
export const [currentScreenId, setCurrentScreenId] = createSignal<string>("exec");
export const [theme, setTheme] = createSignal<"dark" | "light">("dark");
export const [modalOpen, setModalOpen] = createSignal(false);
export const [paletteOpen, setPaletteOpen] = createSignal(false);
export const [toastMessage, setToastMessage] = createSignal<{ title?: string; message: string; tone?: any } | null>(null);

export const [jobs, setJobs] = createSignal<UiJob[]>(INITIAL_JOBS);
export const [selectedJobId, setSelectedJobId] = createSignal<string>("job-001");

export const [tasks, setTasks] = createSignal<UiTask[]>(INITIAL_TASKS);
export const [selectedTaskId, setSelectedTaskId] = createSignal<string | null>(null);

export const [approvals, setApprovals] = createSignal<UiApproval[]>(INITIAL_APPROVALS);
export const [selectedApprovalId, setSelectedApprovalId] = createSignal<string | null>(null);

export const [agents, setAgents] = createSignal<RosterAgent[]>(INITIAL_AGENTS);
export const [selectedAgentId, setSelectedAgentId] = createSignal<string | null>(null);
export const [activeChatAgentId, setActiveChatAgentId] = createSignal<string | null>(null);

export const [capturedNotes, setCapturedNotes] = createSignal<string[]>([]);

// Sync theme with DOM attribute
createEffect(() => {
  const t = theme();
  if (t === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
});

// Toast Helper
export function showToast(message: string, title?: string, tone?: any) {
  setToastMessage({ message, title, tone });
  setTimeout(() => {
    setToastMessage(null);
  }, 3500);
}

export const [cockpitData, setCockpitData] = createSignal<any | null>(null);

// Fetch live jobs from backend and link with tasks
export async function syncLiveJobs() {
  try {
    const backendJobs = await api.listJobs();
    if (backendJobs && backendJobs.length > 0) {
      const curTasks = tasks();
      const taskMap = new Map(curTasks.map((t) => [t.id, t]));
      const curAgents = agents();
      const agentMap = new Map(curAgents.map((a) => [a.id, a]));

      // Group by task_id to show only the latest job per task.
      // Normalizes key to handle potential whitespace issues.
      const latestByGroup = new Map<string, typeof backendJobs[0]>();

      for (const bj of backendJobs) {
        // Strictly group by task_id if available.
        // If task_id is missing, we cannot reliably group by task, so use ID (distinct).
        // Note: We do NOT fallback to bj.title for grouping because raw API titles may vary.
        const rawKey = bj.task_id ? String(bj.task_id).trim() : bj.id;
        const existing = latestByGroup.get(rawKey);

        if (!existing || (bj.created_at && (!existing.created_at || bj.created_at > existing.created_at))) {
          latestByGroup.set(rawKey, bj);
        }
      }

      const uniqueJobsArray = Array.from(latestByGroup.values());
      // Final dedup by ID just in case
      const uniqueJobs = new Map<string, typeof backendJobs[0]>();
      for (const bj of uniqueJobsArray) {
        uniqueJobs.set(bj.id, bj);
      }

      const currentJobs = jobs();
      const currentJobsMap = new Map(currentJobs.map((j) => [j.id, j]));
      let hasAnyChange = false;

      const reconciledJobs: UiJob[] = Array.from(uniqueJobs.values()).map((bj) => {
        const linkedTask = bj.task_id ? taskMap.get(bj.task_id) : undefined;
        const taskSeq = linkedTask?.seq;
        const taskTitle = linkedTask?.title;
        const ag = bj.agent_id ? agentMap.get(bj.agent_id) : undefined;

        let uiStatus: "running" | "queued" | "completed" | "failed" | "paused" = "queued";
        if (bj.status === "succeeded" || bj.status === "completed") {
          uiStatus = "completed";
        } else if (bj.status === "running" || bj.status === "preflight") {
          uiStatus = "running";
        } else if (bj.status === "failed") {
          uiStatus = "failed";
        } else if (bj.status === "paused") {
          uiStatus = "paused";
        }

        // Add execution timestamp to differentiate multiple runs of same task
        const execTime = bj.created_at
          ? formatLocalTime(bj.created_at)
          : "";
        const jobTitle = taskTitle
          ? (taskSeq ? `Task #${taskSeq}: ${taskTitle} (${execTime})` : `${taskTitle} (${execTime})`)
          : `Job ${bj.id.slice(0, 8)} (${bj.origin || "manual"})`;

        const progress =
          uiStatus === "completed" ? 100 : uiStatus === "running" ? 65 : uiStatus === "failed" ? 45 : 0;

        const priorityValue = linkedTask?.priority;
        const priority: "critical" | "high" | "normal" | "low" =
          priorityValue === "critical" || priorityValue === "high" || priorityValue === "normal" || priorityValue === "low"
            ? priorityValue
            : "normal";

        const agentName = ag ? ag.name : (bj.agent_id || "Paula PM");
        const model = bj.model_name || "Fable";
        const effort = bj.effort || "Máximo";
        const cost = 0.15;
        const ceiling = 2.0;
        const startedAt = execTime || "—";
        const taskId = bj.task_id || undefined;

        const existing = currentJobsMap.get(bj.id);
        if (existing) {
          // Check if any visual or state properties changed
          const isIdentical =
            existing.status === uiStatus &&
            existing.progress === progress &&
            existing.title === jobTitle &&
            existing.agentName === agentName &&
            existing.priority === priority &&
            existing.startedAt === startedAt &&
            existing.model === model &&
            existing.effort === effort &&
            existing.cost === cost &&
            existing.ceiling === ceiling &&
            existing.taskId === taskId &&
            existing.taskSeq === taskSeq &&
            existing.taskTitle === taskTitle;

          if (isIdentical) {
            // Retain exact existing object reference to prevent unmounting/remounting DOM nodes in SolidJS
            return existing;
          }

          // Properties changed - preserve accumulated log history and append transition if status changed
          hasAnyChange = true;
          const updatedLogs = [...existing.log];
          if (existing.status !== uiStatus) {
            updatedLogs.push([
              execTime || "agora",
              uiStatus === "failed" ? "error" : uiStatus === "completed" ? "success" : "info",
              `Status: ${bj.status}`,
            ]);
          }

          return {
            ...existing,
            title: jobTitle,
            agentName,
            status: uiStatus,
            priority,
            progress,
            startedAt,
            model,
            effort,
            cost,
            ceiling,
            taskId,
            taskSeq,
            taskTitle,
            log: updatedLogs,
          };
        }

        // New job entry
        hasAnyChange = true;
        return {
          id: bj.id,
          title: jobTitle,
          agentName,
          status: uiStatus,
          priority,
          progress,
          startedAt,
          model,
          effort,
          cost,
          ceiling,
          taskId,
          taskSeq,
          taskTitle,
          log: [
            [
              execTime || "agora",
              uiStatus === "failed" ? "error" : uiStatus === "completed" ? "success" : "info",
              `Status: ${bj.status}`,
            ],
          ],
        };
      });

      // Avoid notifying signal if array contents and references are identical
      const isArrayUnchanged =
        !hasAnyChange &&
        reconciledJobs.length === currentJobs.length &&
        reconciledJobs.every((rj, idx) => rj === currentJobs[idx]);

      if (!isArrayUnchanged) {
        setJobs(reconciledJobs);
      }
    } else {
      // If backend returns empty, clear jobs to avoid showing stale mocks
      setJobs([]);
    }
  } catch (err) {
    console.warn("Could not sync live jobs:", err);
  }
}

function mapApiStatus(raw: string | null | undefined): UiTaskStatus {
  switch (raw) {
    case "to_plan":
    case "planning":
    case "planned":
    case "in_progress":
    case "done":
      return raw;
    case "pending":
    case "todo":
      return "to_plan";
    case "queued":
      return "planned";
    case "completed":
    case "succeeded":
      return "done";
    default:
      return "to_plan";
  }
}

function sameStrArr(a?: string[], b?: string[]): boolean {
  const aa = a || [];
  const bb = b || [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

function taskVisualEqual(prev: UiTask, next: UiTask): boolean {
  return (
    prev.id === next.id &&
    prev.seq === next.seq &&
    prev.title === next.title &&
    prev.status === next.status &&
    prev.assignee === next.assignee &&
    prev.priority === next.priority &&
    prev.sector === next.sector &&
    prev.escalation === next.escalation &&
    prev.activeJobId === next.activeJobId &&
    prev.description === next.description &&
    prev.createdAt === next.createdAt &&
    prev.awaitingApproval === next.awaitingApproval &&
    prev.pendingHomologation === next.pendingHomologation &&
    prev.pendingApprovalId === next.pendingApprovalId &&
    sameStrArr(prev.tags, next.tags) &&
    sameStrArr(prev.dependsOn, next.dependsOn) &&
    sameStrArr(prev.handoffs, next.handoffs) &&
    sameStrArr(prev.gates, next.gates)
  );
}

function approvalVisualEqual(prev: UiApproval, next: UiApproval): boolean {
  return (
    prev.id === next.id &&
    prev.title === next.title &&
    prev.agentId === next.agentId &&
    prev.agentName === next.agentName &&
    prev.type === next.type &&
    prev.status === next.status &&
    prev.requestedAt === next.requestedAt &&
    prev.description === next.description &&
    prev.impact === next.impact &&
    prev.taskId === next.taskId &&
    prev.reason === next.reason &&
    prev.onApproveText === next.onApproveText &&
    prev.onRejectText === next.onRejectText
  );
}

/** Full replace a partir do backend — reusa referências quando nada mudou (evita flicker). */
export async function syncTasks() {
  try {
    const backendTasks = await api.listTasks();
    const curAgents = agents();
    const pendingAps = approvals().filter((a) => a.status === "pending" && a.taskId);
    const prev = tasks();
    const prevById = new Map(prev.map((t) => [t.id, t]));

    const mapped: UiTask[] = (backendTasks || []).map((t) => {
      const ag = curAgents.find((a) => a.id === t.assignee_agent_id);
      const linkedAp = pendingAps.find((a) => a.taskId === t.id);
      const status = mapApiStatus(t.status);
      const tags = Array.isArray(t.tags) ? t.tags.map(String) : t.tags ? [String(t.tags)] : [];
      let dependsOn: string[] = [];
      if (Array.isArray(t.depends_on) && t.depends_on.length) {
        dependsOn = t.depends_on.map((d) => String(d).replace(/^#/, ""));
      } else {
        dependsOn = tags
          .filter((tag) => tag.startsWith("depends:#"))
          .map((tag) => tag.slice("depends:#".length));
      }
      const isAlteracao =
        Boolean(linkedAp) &&
        (linkedAp!.type === "alteracao" || String(linkedAp!.id).startsWith("ap-alt"));
      // Vermelho em Em execução: gate humano mid-flight (Opção A)
      const awaitingApproval =
        Boolean(linkedAp) && (status === "in_progress" || status === "planning");
      const next: UiTask = {
        id: t.id,
        seq: t.seq || 0,
        title: t.title,
        status,
        assignee: ag ? ag.name : t.assignee_agent_id === "pm-projetos" ? "Paula PM" : "Agente",
        priority:
          t.priority === "critical" || t.priority === "high" || t.priority === "normal" || t.priority === "low"
            ? t.priority
            : t.priority === "medium"
              ? "normal"
              : "normal",
        sector: t.sector || "Operação",
        escalation: t.escalation || undefined,
        handoffs: Array.isArray(t.handoffs) ? t.handoffs : t.handoffs ? [String(t.handoffs)] : undefined,
        gates: Array.isArray(t.gates) ? t.gates : t.gates ? [String(t.gates)] : undefined,
        activeJobId: t.active_job_id || undefined,
        tags,
        dependsOn: dependsOn.length ? dependsOn : undefined,
        description: t.description || undefined,
        createdAt: t.created_at || undefined,
        awaitingApproval,
        pendingHomologation: status === "done" && isAlteracao,
        pendingApprovalId: linkedAp?.id,
      };
      const old = prevById.get(next.id);
      return old && taskVisualEqual(old, next) ? old : next;
    });

    const unchanged =
      mapped.length === prev.length && mapped.every((t, i) => t === prev[i]);
    if (!unchanged) setTasks(mapped);
  } catch (err) {
    console.warn("Could not sync tasks:", err);
  }
}

// Fetch live approvals — só notifica o signal se algo mudou
export async function syncApprovals() {
  try {
    const backendApprovals = await api.listApprovals();
    const list = Array.isArray(backendApprovals) ? backendApprovals : [];
    const curAgents = agents();
    const prev = approvals();
    const prevById = new Map(prev.map((a) => [a.id, a]));
    const mappedApprovals: UiApproval[] = list.map((a) => {
      const ag = curAgents.find((ag) => ag.id === a.requester_agent_id);
      const next: UiApproval = {
        id: a.id,
        title: a.title || `Aprovação ${a.id}`,
        agentId: a.requester_agent_id || "ag-01",
        agentName: ag ? ag.name : "Agente",
        type: (a.type as any) || "authorization",
        status: (a.status as any) || "pending",
        requestedAt: formatLocalTime(a.created_at, { hour: "2-digit", minute: "2-digit" }),
        description: a.description || "",
        impact: (a.impact as any) || "medium",
        taskId: a.task_id || undefined,
        reason: a.reason || undefined,
        onApproveText: a.on_approve_text || undefined,
        onRejectText: a.on_reject_text || undefined,
      };
      const old = prevById.get(next.id);
      return old && approvalVisualEqual(old, next) ? old : next;
    });
    const unchanged =
      mappedApprovals.length === prev.length && mappedApprovals.every((a, i) => a === prev[i]);
    if (!unchanged) setApprovals(mappedApprovals);
  } catch (err) {
    console.warn("Could not sync approvals:", err);
  }
}

// Fetch live cockpit summary from backend
export async function syncCockpit() {
  try {
    const summary = await api.getCockpitSummary();
    if (!summary) return;
    const prev = cockpitData();
    if (
      prev &&
      JSON.stringify(prev) === JSON.stringify(summary)
    ) {
      return;
    }
    setCockpitData(summary);
  } catch (err) {
    console.warn("Could not sync cockpit:", err);
  }
}

// Persistent task status move
export async function moveTaskPersistent(taskId: string, newStatus: UiTaskStatus) {
  setTasks((prev) =>
    prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
  );
  try {
    await api.updateTaskStatus(taskId, newStatus);
    const labels: Record<UiTaskStatus, string> = {
      to_plan: "A planejar",
      planning: "Planejando…",
      planned: "Planejado",
      in_progress: "Em execução",
      done: "Concluído",
    };
    showToast(`Task movida para ${labels[newStatus]}`);
    await syncApprovals();
    await syncTasks();
    syncCockpit();
    if (newStatus === "done") {
      const gate = approvals().find(
        (a) =>
          a.status === "pending" &&
          a.taskId === taskId &&
          (a.type === "alteracao" || a.id.startsWith("ap-alt"))
      );
      if (gate) {
        setSelectedApprovalId(gate.id);
        showToast(
          "Gate de alteração criado — abra Aprovações ou Alterações para homologar.",
          "Homologação pendente",
          "warning"
        );
      }
    }
  } catch (err) {
    console.error("Failed to persist task status:", err);
    const { status, detail } = parseApiError(err);
    showToast(
      detail || "Erro ao sincronizar com banco de dados",
      status === 409 ? "Bloqueio / Gate" : "Atenção",
      "error"
    );
    await syncTasks();
  }
}

// Persistent approval decision
export async function decideApprovalPersistent(
  approvalId: string,
  decision: "approve" | "reject",
  justification?: string
) {
  const newStatus = decision === "approve" ? "approved" : "rejected";
  // Optimistic update
  setApprovals((prev) =>
    prev.map((a) => (a.id === approvalId ? { ...a, status: newStatus } : a))
  );
  try {
    await api.decideApproval(approvalId, decision, justification);
    showToast(
      decision === "approve" ? `Aprovação ${approvalId} confirmada` : `Aprovação ${approvalId} rejeitada`,
      "Decisão registrada",
      decision === "approve" ? "success" : "warning"
    );
    await syncApprovals();
    await syncTasks();
    syncCockpit();
  } catch (err) {
    console.error("Failed to persist approval decision:", err);
    showToast("Erro ao registrar decisão no banco", "Atenção", "error");
    await syncApprovals(); // rollback
  }
}

// Fetch live agents from backend SQLite
export async function syncAgents() {
  try {
    const backendAgents = await api.listAgents();
    if (backendAgents && backendAgents.length > 0) {
      const mapped: RosterAgent[] = backendAgents.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        sector: a.sector,
        status: (a.status as any) || "idle",
        lastRun: a.last_run || "agora",
        totalJobs: a.total_jobs ?? 0,
        totalCost: a.total_cost ?? 0,
        model: a.model_provider || "claude-sonnet-4",
        avatarColor: a.avatar_color || "#1BC5BD",
        initials: a.initials || a.name.slice(0, 2).toUpperCase(),
        soulText: a.soul_text || undefined,
      }));
      setAgents(mapped);
    }
  } catch (err) {
    console.warn("Could not sync agents:", err);
  }
}

// Persist agent soul markdown in backend SQLite
export async function saveAgentSoulPersistent(agentId: string, soulText: string): Promise<boolean> {
  // Optimistic update
  setAgents((prev) =>
    prev.map((a) => (a.id === agentId ? { ...a, soulText } : a))
  );
  try {
    await api.updateAgentSoul(agentId, soulText);
    showToast("Alma operacional persistida com sucesso no SQLite", "Agentes", "success");
    return true;
  } catch (err) {
    console.error("Failed to persist agent soul:", err);
    showToast("Erro ao persistir alma do agente no banco", "Erro", "error");
    syncAgents(); // rollback from backend
    return false;
  }
}

// Open or switch to agent chat
export function openAgentChat(agentId: string) {
  setActiveChatAgentId(agentId);
  setCurrentDomainId("chat");
  setCurrentScreenId("chat");
}
