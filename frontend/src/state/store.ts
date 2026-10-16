import { createSignal, createEffect } from "solid-js";
import { api } from "../shared/api/client";

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
      { id: "tasks", label: "Tasks", icon: "square-kanban", badge: "12" },
      { id: "approvals", label: "Aprovações", icon: "shield-check", badge: "aps" },
      { id: "blocks", label: "Bloqueios", icon: "octagon-alert" },
      { id: "agents", label: "Agentes", icon: "bot" },
      { id: "changes", label: "Alterações", icon: "git-pull-request" },
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

export const INITIAL_AGENTS: RosterAgent[] = [
  { id: "ag-01", name: "Arquiteto", role: "Planejamento Estratégico", sector: "Estratégia", status: "busy", lastRun: "2 min", totalJobs: 342, totalCost: 127.4, model: "claude-sonnet-4", avatarColor: "#B7F34A", initials: "AR" },
  { id: "ag-02", name: "Pesquisador", role: "Coleta & Análise", sector: "Conhecimento", status: "idle", lastRun: "15 min", totalJobs: 518, totalCost: 89.2, model: "gpt-4o", avatarColor: "#f59e0b", initials: "PE" },
  { id: "ag-03", name: "Redator", role: "Copywriting & Conteúdo", sector: "Conteúdo", status: "busy", lastRun: "1 min", totalJobs: 891, totalCost: 203.5, model: "claude-sonnet-4", avatarColor: "#3b82f6", initials: "RE" },
  { id: "ag-04", name: "Designer", role: "Design Visual", sector: "Design", status: "idle", lastRun: "32 min", totalJobs: 214, totalCost: 156.8, model: "dall-e-3", avatarColor: "#ec4899", initials: "DE" },
  { id: "ag-05", name: "Revisor", role: "QA & Aprovação", sector: "Qualidade", status: "busy", lastRun: "3 min", totalJobs: 445, totalCost: 98.3, model: "claude-sonnet-4", avatarColor: "#8b5cf6", initials: "RV" },
  { id: "ag-06", name: "Deployer", role: "Publicação & Release", sector: "Engenharia", status: "offline", lastRun: "2 h", totalJobs: 178, totalCost: 45.6, model: "gpt-4o", avatarColor: "#06b6d4", initials: "DP" },
  { id: "ag-07", name: "Analista", role: "Métricas & Analytics", sector: "Estratégia", status: "idle", lastRun: "45 min", totalJobs: 267, totalCost: 112.7, model: "gpt-4o", avatarColor: "#f97316", initials: "AN" },
  { id: "ag-08", name: "Orquestrador", role: "Coordenação de Agentes", sector: "Operação", status: "busy", lastRun: "agora", totalJobs: 1203, totalCost: 340.9, model: "claude-opus-4", avatarColor: "#ef4444", initials: "OR" },
  { id: "ag-09", name: "Social Media", role: "Instagram & LinkedIn", sector: "Social", status: "idle", lastRun: "1 h", totalJobs: 156, totalCost: 67.4, model: "gpt-4o", avatarColor: "#14b8a6", initials: "SM" },
  { id: "ag-10", name: "Finanças", role: "Controle Orçamentário", sector: "Finanças", status: "error", lastRun: "3 h", totalJobs: 89, totalCost: 23.1, model: "gpt-4o", avatarColor: "#84cc16", initials: "FI" },
  { id: "ag-11", name: "Comercial", role: "Propostas & Funil", sector: "Comercial", status: "idle", lastRun: "20 min", totalJobs: 134, totalCost: 78.5, model: "claude-sonnet-4", avatarColor: "#a855f7", initials: "CO" },
  { id: "ag-12", name: "Documentador", role: "Docs & Manuais", sector: "Documentação", status: "busy", lastRun: "5 min", totalJobs: 312, totalCost: 95.2, model: "claude-sonnet-4", avatarColor: "#6366f1", initials: "DO" },
];

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
  log: Array<[string, "info" | "warn" | "error" | "success", string]>;
}

export const INITIAL_JOBS: UiJob[] = [
  {
    id: "job-001",
    title: "Gerar relatório de custos Q3",
    agentName: "Analista",
    status: "running",
    priority: "high",
    progress: 67,
    startedAt: "14:32",
    model: "gpt-4o",
    effort: "médio",
    cost: 2.4,
    ceiling: 5,
    log: [
      ["14:32", "info", "Job iniciado — coletando dados de job_runs"],
      ["14:33", "info", "Agregando custos por modelo (12 modelos)"],
      ["14:34", "info", "Calculando taxa de escalonamento (30 dias)"],
      ["14:35", "warn", "2 jobs sem checkpoint — estimando custo"],
      ["14:35", "info", "Gerando sparklines por setor"],
    ],
  },
  {
    id: "job-002",
    title: "Revisar conteúdo LP Nicho Advocacia",
    agentName: "Revisor",
    status: "running",
    priority: "normal",
    progress: 34,
    startedAt: "14:28",
    model: "claude-sonnet-4",
    effort: "baixo",
    cost: 0.8,
    ceiling: 2,
    log: [
      ["14:28", "info", "Carregando rascunho do Redator"],
      ["14:29", "info", "Verificando tom de voz e guidelines"],
      ["14:30", "warn", "Headline acima do limite de caracteres"],
    ],
  },
  {
    id: "job-003",
    title: 'Sintetizar capítulo "Frameworks de Crescimento"',
    agentName: "Redator",
    status: "running",
    priority: "high",
    progress: 89,
    startedAt: "14:15",
    model: "claude-sonnet-4",
    effort: "alto",
    cost: 5.2,
    ceiling: 8,
    log: [
      ["14:15", "info", "Lendo 3 fontes do vault (132 páginas indexadas)"],
      ["14:18", "success", "Estrutura do capítulo aprovada pelo Arquiteto"],
      ["14:22", "info", 'Escrevendo seção 4/5: "Loops de Retenção"'],
      ["14:30", "info", 'Escrevendo seção 5/5: "Métricas de Cohort"'],
    ],
  },
  {
    id: "job-004",
    title: "Otimizar SEO — landing principal",
    agentName: "Orquestrador",
    status: "queued",
    priority: "normal",
    progress: 0,
    startedAt: "—",
    model: "claude-opus-4",
    effort: "médio",
    cost: 0,
    ceiling: 6,
    log: [["—", "info", "Aguardando slot livre"]],
  },
  {
    id: "job-005",
    title: "Gerar variações de criativos Instagram",
    agentName: "Social Media",
    status: "queued",
    priority: "low",
    progress: 0,
    startedAt: "—",
    model: "gpt-4o",
    effort: "baixo",
    cost: 0,
    ceiling: 2,
    log: [["—", "info", "Aguardando slot livre"]],
  },
  {
    id: "job-006",
    title: "Auditoria de segurança — API endpoints",
    agentName: "Revisor",
    status: "completed",
    priority: "critical",
    progress: 100,
    startedAt: "13:50",
    model: "claude-sonnet-4",
    effort: "alto",
    cost: 8.7,
    ceiling: 10,
    log: [
      ["13:50", "info", "Iniciando varredura de endpoints"],
      ["13:55", "success", "12 endpoints verificados — 0 vulnerabilidades críticas"],
      ["13:58", "warn", "2 recomendações de hardening"],
      ["14:00", "success", "Job concluído — relatório salvo no vault"],
    ],
  },
  {
    id: "job-007",
    title: "Deploy landing — cliente Meridian",
    agentName: "Deployer",
    status: "failed",
    priority: "high",
    progress: 45,
    startedAt: "13:30",
    model: "gpt-4o",
    effort: "médio",
    cost: 1.2,
    ceiling: 3,
    log: [
      ["13:30", "info", "Build iniciado"],
      ["13:35", "error", "Erro: variável de ambiente SUPABASE_URL ausente"],
      ["13:35", "error", "Job interrompido — requer intervenção"],
    ],
  },
];

export interface UiTask {
  id: string;
  seq: number;
  title: string;
  status: "pending" | "in_progress" | "done";
  assignee: string;
  priority: "critical" | "high" | "normal" | "low";
  sector: string;
  escalation?: string;
  handoffs?: string[];
  gates?: string[];
  activeJobId?: string;
  tags: string[];
  description?: string;
}

export const INITIAL_TASKS: UiTask[] = [
  { id: "task-01", seq: 1, title: "Relatório de custos Q3 — revisão final", status: "in_progress", assignee: "Analista", priority: "high", sector: "Estratégia", escalation: "Arquiteto", handoffs: ["Redator → Revisor"], gates: ["Aprovação CEO"], activeJobId: "job-001", tags: ["financeiro", "relatório"], description: "Revisar o relatório de custos do 3º trimestre antes do envio à diretoria." },
  { id: "task-02", seq: 2, title: "Conteúdo LP Nicho Advocacia", status: "in_progress", assignee: "Redator", priority: "normal", sector: "Conteúdo", handoffs: ["Redator → Revisor → Deployer"], gates: ["QA Revisor"], activeJobId: "job-002", tags: ["lp", "copy"], description: "Produzir o texto completo da landing do nicho de advocacia: headline, dores, prova social e CTA." },
  { id: "task-03", seq: 3, title: 'Capítulo "Frameworks de Crescimento"', status: "in_progress", assignee: "Redator", priority: "high", sector: "Conteúdo", escalation: "Arquiteto", handoffs: ["Redator → Revisor"], gates: ["Aprovação Editorial"], activeJobId: "job-003", tags: ["livro", "ia-livros"], description: "Escrever o capítulo do livro IA Livros com base em 3 fontes do vault." },
  { id: "task-04", seq: 4, title: "Otimização SEO landing principal", status: "pending", assignee: "Orquestrador", priority: "normal", sector: "Engenharia", tags: ["seo", "landing"], description: "Aplicar recomendações de SEO técnico na landing principal." },
  { id: "task-05", seq: 5, title: "Criativos Instagram — 5 variações", status: "pending", assignee: "Social Media", priority: "low", sector: "Social", tags: ["instagram", "criativos"], description: "Gerar 5 variações de criativo para o post da semana no Instagram." },
  { id: "task-06", seq: 6, title: "Auditoria de segurança API", status: "done", assignee: "Revisor", priority: "critical", sector: "Engenharia", handoffs: ["Revisor → Deployer"], gates: ["Aprovado"], tags: ["segurança", "audit"], description: "Varredura de segurança nos 12 endpoints públicos da API." },
  { id: "task-07", seq: 7, title: "Deploy landing Meridian", status: "pending", assignee: "Deployer", priority: "high", sector: "Engenharia", escalation: "Orquestrador", gates: ["Requer SUPABASE_URL"], tags: ["deploy", "bug"], description: "Publicar a landing do cliente Meridian Capital na conta travada do projeto." },
  { id: "task-08", seq: 8, title: "Indexar novas páginas no vault", status: "done", assignee: "Pesquisador", priority: "normal", sector: "Conhecimento", tags: ["vault", "indexação"], description: "Indexar 8 novas páginas no vault do Cérebro." },
  { id: "task-09", seq: 9, title: "Roadmap Q4 — IA Livros", status: "pending", assignee: "Arquiteto", priority: "critical", sector: "Estratégia", escalation: "CEO", gates: ["Aprovação CEO"], activeJobId: "job-009", tags: ["roadmap", "planejamento"], description: "Consolidar o roadmap do 4º trimestre da iniciativa IA Livros." },
  { id: "task-10", seq: 10, title: "Proposta comercial — cliente Atlas", status: "pending", assignee: "Comercial", priority: "high", sector: "Comercial", tags: ["proposta", "vendas"], description: "Montar a proposta comercial da Atlas Holdings." },
  { id: "task-11", seq: 11, title: "Documentação API v2", status: "in_progress", assignee: "Documentador", priority: "normal", sector: "Documentação", tags: ["docs", "api"], description: "Documentar os endpoints da API v2 no padrão OpenAPI." },
  { id: "task-12", seq: 12, title: "Análise de funil — setembro", status: "done", assignee: "Analista", priority: "normal", sector: "Comercial", tags: ["funil", "analytics"], description: "Analisar o funil de setembro e apontar as 3 maiores quedas de conversão." },
];

export interface UiApproval {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  type: "authorization" | "checkpoint" | "review";
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

// Fetch live jobs from backend and merge
export async function syncLiveJobs() {
  try {
    const backendJobs = await api.listJobs();
    if (backendJobs && backendJobs.length > 0) {
      setJobs((prev) => {
        const merged = [...prev];
        for (const bj of backendJobs) {
          const idx = merged.findIndex((j) => j.id === bj.id);
          const mapped: UiJob = {
            id: bj.id,
            title: `Job ${bj.id.slice(0, 8)} (${bj.origin || "API"})`,
            agentName: bj.agent_id || "Worker",
            status: bj.status as any,
            priority: "normal",
            progress: bj.status === "succeeded" ? 100 : bj.status === "running" ? 50 : 0,
            startedAt: bj.created_at ? new Date(bj.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—",
            model: "claude-sonnet-4",
            effort: "médio",
            cost: 0.15,
            ceiling: 2.0,
            log: [["agora", bj.status === "failed" ? "error" : "info", `Status: ${bj.status}`]],
          };
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...mapped };
          } else {
            merged.unshift(mapped);
          }
        }
        return merged;
      });
    }
  } catch (err) {
    console.warn("Could not sync live jobs:", err);
  }
}
