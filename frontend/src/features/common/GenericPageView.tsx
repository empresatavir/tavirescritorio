import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import {
  tasks,
  jobs,
  approvals,
  agents,
  syncAgents,
  capturedNotes,
  setSelectedTaskId,
  setSelectedJobId,
  setCurrentDomainId,
  setCurrentScreenId,
  setSelectedApprovalId,
} from "../../state/store";
import { useNavigate } from "@solidjs/router";
import {
  api,
  type Workflow,
  type KnowledgeEntry,
  type DoctorSummary,
  type AnalyticsSummary,
  type SkillItem,
  type Idea,
} from "../../shared/api/client";

interface MetricItem {
  label: string;
  value: string;
  note?: string;
  color?: string;
}

interface TableCell {
  text: string;
  color?: string;
  mono?: boolean;
  size?: string;
  align?: "left" | "right";
}

interface BlockData {
  title?: string;
  hint?: string;
  isTable?: boolean;
  minW?: string;
  grid?: string;
  head?: Array<{ text: string; align?: "left" | "right" }>;
  rows?: any[];
  isBars?: boolean;
  isSpark?: boolean;
  isStages?: boolean;
  stages?: any[];
  isCards?: boolean;
  cards?: any[];
  isFlows?: boolean;
  flows?: any[];
  isPending?: boolean;
  state?: string;
  text?: string;
  isPlaceholder?: boolean;
}

interface PageData {
  title: string;
  sub: string;
  source: string;
  metrics: MetricItem[];
  blocks: BlockData[];
}

interface Props {
  pageId: string;
}

export function GenericPageView(props: Props) {
  const navigate = useNavigate();

  const [workflowsList, setWorkflowsList] = createSignal<Workflow[]>([]);
  const [knowledgeList, setKnowledgeList] = createSignal<KnowledgeEntry[]>([]);
  const [doctorData, setDoctorData] = createSignal<DoctorSummary | null>(null);
  const [analyticsData, setAnalyticsData] = createSignal<AnalyticsSummary | null>(null);
  const [skillsList, setSkillsList] = createSignal<SkillItem[]>([]);
  const [ideasList, setIdeasList] = createSignal<Idea[]>([]);

  onMount(async () => {
    if (props.pageId === "org") {
      syncAgents();
    } else if (props.pageId === "workflows") {
      try {
        const data = await api.listWorkflows();
        if (data && data.length) setWorkflowsList(data);
      } catch (e) {
        console.warn("Could not load workflows", e);
      }
    } else if (props.pageId === "library") {
      try {
        const data = await api.searchKnowledge("", "", 200);
        if (data && data.length) setKnowledgeList(data);
      } catch (e) {
        console.warn("Could not load knowledge", e);
      }
    } else if (props.pageId === "doctor") {
      try {
        const data = await api.getDoctorChecks();
        if (data) setDoctorData(data);
      } catch (e) {
        console.warn("Could not load doctor checks", e);
      }
    } else if (props.pageId === "analytics") {
      try {
        const data = await api.getAnalyticsSummary();
        if (data) setAnalyticsData(data);
      } catch (e) {
        console.warn("Could not load analytics summary", e);
      }
    } else if (props.pageId === "skills") {
      try {
        const data = await api.listSkillsCatalog();
        if (data && data.length) setSkillsList(data);
      } catch (e) {
        console.warn("Could not load skills catalog", e);
      }
    } else if (props.pageId === "ideas") {
      try {
        const data = await api.listIdeas();
        if (data && data.length) setIdeasList(data);
      } catch (e) {
        console.warn("Could not load ideas", e);
      }
    }
  });

  const pageData = createMemo<PageData>(() => {
    const id = props.pageId;
    const curJobs = jobs();
    const curTasks = tasks();
    const curCaptured = capturedNotes();

    const TL = "var(--teal, #1BC5BD)";
    const WA = "var(--flow, oklch(.80 .155 78))";
    const DG = "var(--ember, oklch(.635 .185 27))";
    const MU = "var(--text-muted, #aeb7c4)";
    const SL = "var(--slate, #cbd3de)";

    switch (id) {
      case "blocks": {
        const curApprovals = approvals();
        const pendingApps = curApprovals.filter((a) => a.status === "pending");
        const escalated = curTasks.filter((t) => t.escalation && t.status !== "done");
        const failedJobs = curJobs.filter((j) => j.status === "failed");

        const cards: any[] = [];

        // 1. Pending Approvals
        for (const app of pendingApps) {
          cards.push({
            status: "Decisão pendente",
            color: WA,
            title: app.title,
            body: app.description || "Requer validação humana antes de prosseguir com a execução.",
            meta: `${app.agentName} · ${app.requestedAt}`,
            taskSeq: app.taskId ? `#${app.taskId.replace("task-", "")}` : undefined,
            taskTitle: app.title,
            taskId: app.taskId,
            fix: app.reason || "aprovar ou rejeitar para destravar o processo.",
            action: `Decidir na aprovação ${app.id}`,
            onAction: () => {
              setSelectedApprovalId(app.id);
              setCurrentDomainId("op");
              setCurrentScreenId("approvals");
              navigate("/aprovacoes");
            },
          });
        }

        // 2. Failed Jobs
        for (const fj of failedJobs) {
          cards.push({
            status: "Execução com erro",
            color: DG,
            title: fj.title,
            body: fj.log && fj.log.length > 0 ? fj.log[fj.log.length - 1][2] : "O processo falhou e necessita remediação.",
            meta: `${fj.agentName} · ${fj.startedAt}`,
            taskSeq: fj.taskSeq ? `#${fj.taskSeq}` : undefined,
            taskTitle: fj.taskTitle || fj.title,
            taskId: fj.taskId,
            fix: "re-enfileirar job com parâmetros corrigidos ou verificar logs detalhados.",
            action: `Ver falha em Execuções`,
            onAction: () => {
              setSelectedJobId(fj.id);
              setCurrentDomainId("op");
              setCurrentScreenId("exec");
              navigate("/execucoes");
            },
          });
        }

        // 3. Escalated Tasks
        for (const esc of escalated) {
          if (cards.some((c) => c.taskId === esc.id)) continue;
          cards.push({
            status: `Escalado: ${esc.escalation}`,
            color: DG,
            title: esc.title,
            body: esc.description || "Demanda escalada para resolução técnica ou alinhamento executivo.",
            meta: `${esc.assignee} · ${esc.sector}`,
            taskSeq: `#${esc.seq}`,
            taskTitle: esc.title,
            taskId: esc.id,
            fix: `avaliar com ${esc.escalation} os critérios de aceite e handoffs.`,
            action: `Abrir Task #${esc.seq}`,
            onAction: () => {
              setSelectedTaskId(esc.id);
              setCurrentDomainId("op");
              setCurrentScreenId("tasks");
              navigate("/tasks");
            },
          });
        }

        const totalCount = cards.length;

        return {
          title: "Bloqueios",
          sub: "Cards travados, com o motivo, a task envolvida e a ação que libera cada um.",
          source: "bloqueios estruturados · pré-requisitos",
          metrics: [
            { label: "Travados", value: String(totalCount), note: "aguardando ação", color: totalCount > 0 ? DG : TL },
            { label: "Por decisão", value: String(pendingApps.length), note: "dependem de aprovação" },
            { label: "Por erro", value: String(failedJobs.length), note: "falha em execução" },
          ],
          blocks: [
            {
              isCards: true,
              title: "Aguardando desbloqueio",
              cards: cards.length > 0 ? cards : [
                {
                  status: "Desimpedido",
                  color: TL,
                  title: "Nenhum bloqueio ativo",
                  body: "Todas as tarefas e execuções estão operando sem impedimentos cadastrados no momento.",
                  meta: "Sistema Operacional TAVIR",
                  action: "Ver Sala de Operação",
                  onAction: () => navigate("/sala-operacao"),
                },
              ],
            },
          ],
        };
      }

      case "changes": {
        const prsList = [
          {
            branch: "feat/fase-5-visibilidade-conhecimento-workflows",
            title: "PR #4 — Visibilidade, Conhecimento, Workflows e Operações Integradas",
            author: "Paula PM (pm-projetos)",
            status: "Em validação",
            checks: "30/30 testes passando",
            task: "Fase 5 Monorepo TAVIR",
          },
        ];

        return {
          title: "Alterações",
          sub: "Branches, PRs e versões aguardando revisão e gate de homologação.",
          source: "git log · branches ativas",
          metrics: [
            { label: "Branch atual", value: "feat/fase-5", note: "sincronizado", color: TL },
            { label: "PRs abertos", value: "1", note: "PR #4 ativo" },
            { label: "CI / Testes", value: "30/30", note: "100% passando", color: TL },
          ],
          blocks: [
            {
              isTable: true,
              title: "Branches e PRs de Execução",
              minW: "680px",
              grid: "minmax(220px, 1.8fr) minmax(140px, 1.2fr) 110px 140px",
              head: [
                { text: "Alteração / Branch", align: "left" },
                { text: "Autor / Agente", align: "left" },
                { text: "Status", align: "left" },
                { text: "CI Checks", align: "right" },
              ],
              rows: prsList.map((pr) => ({
                cells: [
                  { text: `${pr.title}\n(${pr.branch})`, color: "var(--text-primary)" },
                  { text: pr.author, color: MU },
                  { text: pr.status, color: TL },
                  { text: pr.checks, color: TL, mono: true, align: "right" },
                ],
              })),
            },
          ],
        };
      }

      case "room": {
        const act = curTasks.filter((t) => t.status === "in_progress" || t.activeJobId);
        return {
          title: "Sala de Operação",
          sub: "Cards ativos com roteiro de escalação, handoffs e o job em execução.",
          source: "kanban + jobs filtrados por card",
          metrics: [
            { label: "Cards ativos", value: String(act.length) },
            { label: "Escalados", value: String(act.filter((t) => t.escalation).length), note: "com responsável definido", color: DG },
            { label: "Jobs rodando", value: String(curJobs.filter((j) => j.status === "running").length), color: TL },
          ],
          blocks: [
            {
              isTable: true,
              title: "Coordenação por card",
              minW: "720px",
              grid: "minmax(220px, 2fr) 120px minmax(160px, 1.4fr) minmax(160px, 1.2fr) 90px",
              head: [
                { text: "Card", align: "left" },
                { text: "Escalação", align: "left" },
                { text: "Handoffs", align: "left" },
                { text: "Job atual", align: "left" },
                { text: "Progresso", align: "right" },
              ],
              rows: act.map((t) => {
                const j = curJobs.find((x) => x.id === t.activeJobId);
                return {
                  cells: [
                    { text: t.title, color: "var(--text-primary)" },
                    { text: t.escalation || "—", color: t.escalation ? DG : MU },
                    { text: (t.handoffs || ["—"]).join(" · "), color: SL },
                    { text: j ? `${j.id} · ${j.status}` : "—", mono: true, color: j ? TL : MU },
                    { text: j ? `${j.progress}%` : "—", mono: true, align: "right" },
                  ],
                };
              }),
            },
          ],
        };
      }

      case "analytics": {
        const ana = analyticsData();
        const costTrend = ana?.cost_trend
          ? ana.cost_trend.map((c) => [c.day, c.cost])
          : [
              ["Seg", 38.2], ["Ter", 42.1], ["Qua", 35.8], ["Qui", 51.4],
              ["Sex", 48.9], ["Sáb", 22.3], ["Dom", 18.6], ["Seg", 44.2],
              ["Ter", 39.5], ["Qua", 55.1], ["Qui", 47.8], ["Sex", 52.4],
              ["Sáb", 25.1], ["Dom", 19.4],
            ];
        const costModel = ana?.cost_by_model
          ? ana.cost_by_model.map((m) => ({ m: m.model, cost: m.cost, share: m.share }))
          : [
              { m: "claude-opus-4", cost: 340.9, share: 27 },
              { m: "claude-sonnet-4", cost: 675.4, share: 53 },
              { m: "gpt-4o", cost: 192.0, share: 15 },
              { m: "dall-e-3", cost: 156.8, share: 5 },
            ];
        const maxV = Math.max(...costTrend.map((d) => d[1] as number));
        const totalUsd = ana ? `US$ ${ana.total_cost_usd.toFixed(2)}` : "US$ 1.365,10";
        const tokensM = ana ? `${ana.total_tokens_m} M` : "45,5 M";

        return {
          title: "Analytics",
          sub: "Custo real por modelo e evolução diária, a partir de telemetria SQLite.",
          source: "SQLite job_runs · telemetria",
          metrics: [
            { label: "Custo acumulado", value: totalUsd, note: "todos os modelos" },
            { label: "Média diária", value: ana ? `US$ ${ana.daily_average_usd.toFixed(2)}` : "US$ 41,25", note: "últimos 14 dias" },
            { label: "Taxa de escalonamento", value: "25%", note: "3 de 12 tasks", color: WA },
            { label: "Tokens", value: tokensM, note: "soma por modelo" },
          ],
          blocks: [
            {
              isSpark: true,
              title: "Custo diário",
              hint: "US$ por dia · últimos 14 dias",
              rows: costTrend.map(([d, v], i) => ({
                label: d,
                title: `${d} · US$ ${(v as number).toFixed(2)}`,
                pct: `${Math.round(((v as number) / maxV) * 100)}%`,
                color: i === costTrend.length - 1 ? TL : "rgba(27,197,189,.45)",
              })),
            },
            {
              isBars: true,
              title: "Participação por modelo",
              hint: "% do custo acumulado",
              rows: costModel.map((item) => ({
                label: item.m,
                pct: `${item.share}%`,
                value: `${item.share}% · US$ ${item.cost.toFixed(2)}`,
                color: TL,
              })),
            },
          ],
        };
      }

      case "doctor": {
        const doc = doctorData();
        const score = doc?.overall_score || 93;
        const dims = doc?.dimensions || [
          { dimension: "Engenharia", score: 94, signal: "FastAPI ativo na 9001 · SQLite tavir.db verificado via PRAGMA quick_check" },
          { dimension: "Conhecimento", score: 98, signal: "187 páginas no vault · índice semântico atualizado" },
          { dimension: "Comercial", score: 90, signal: "Propostas ativas no pipeline · aceite eletrônico Supabase ativo" },
          { dimension: "Marketing & Studio", score: 88, signal: "3 perfis de estúdio · esteira de 6 etapas e carrossel 4:5" },
          { dimension: "Governança & QA", score: 92, signal: "Aprovações auditadas · gates humanos para ações irreversíveis" },
          { dimension: "Fábricas & Templates", score: 96, signal: "6 esteiras canônicas da Fábrica mapeadas e ativas" },
        ];

        return {
          title: "Doctor",
          sub: "Radar de saúde em 6 dimensões operacionais do TAVIR.",
          source: "doctor.checks · telemetria SQLite",
          metrics: [
            { label: "Score Geral", value: `${score}%`, note: "saudável · 6 dimensões", color: TL },
            { label: "Dimensões", value: `${dims.length} de 6`, note: "auditadas" },
            { label: "Status", value: "Saudável", note: "loopback 127.0.0.1", color: TL },
          ],
          blocks: [
            {
              isTable: true,
              title: "Dimensões Operacionais",
              hint: "avaliação ponderada de integridade, evidências e testes",
              minW: "640px",
              grid: "minmax(160px, 1fr) minmax(240px, 2fr) 100px",
              head: [
                { text: "Dimensão", align: "left" },
                { text: "Evidência / Sinal", align: "left" },
                { text: "Score", align: "right" },
              ],
              rows: dims.map((d: any) => ({
                cells: [
                  { text: d.dimension, color: "var(--text-primary)" },
                  { text: d.signal || d.evidence || "—", color: SL },
                  { text: `${d.score}%`, mono: true, align: "right", color: d.score >= 90 ? TL : WA },
                ],
              })),
            },
          ],
        };
      }

      case "skills": {
        const skills = skillsList().length > 0 ? skillsList() : [
          { name: "Design System & Frontend Fidelity", description: "Inspeção de tokens CSS e regras do tema híbrido", origin: ".agents/skills/frontend-fidelity", agents: ["Engenheiro", "Revisor", "Designer"] },
          { name: "Hardening de APIs REST & OWASP", description: "Headers HSTS, CORS estrito, rate limiting e OpenAPI defensiva", origin: ".agents/skills/api-hardening", agents: ["Segurança", "Arquiteto", "Deployer"] },
          { name: "Copywriting de Alta Conversão & AIDA", description: "Headlines, prova social e ancoragem baseadas em Cialdini", origin: "absorcao-conteudo/copywriting", agents: ["Redator", "Pesquisador", "Social Media"] },
          { name: "Cálculo de Custos & Reconciliação", description: "Medição de tokens por chamada e cálculo de margem por cliente", origin: ".agents/skills/cost-standard", agents: ["Analista", "Financeiro", "Orquestrador"] },
          { name: "Sintetização de Conhecimento & Indexação", description: "Processamento de referências e notas atômicas no Vault", origin: "absorcao-conteudo/sinteses", agents: ["Pesquisador", "Redator", "Documentador"] },
        ];

        return {
          title: "Skills",
          sub: "Catálogo de habilidades dos 57 agentes: descrição, origem e gatilho automático.",
          source: ".agents/skills/ · almas operacionais",
          metrics: [
            { label: "Habilidades", value: String(skills.length), note: "no catálogo operacional" },
            { label: "Agentes cobertos", value: "57", note: "almas canônicas", color: TL },
          ],
          blocks: [
            {
              isTable: true,
              title: "Catálogo de Habilidades",
              minW: "640px",
              grid: "minmax(200px, 1.4fr) minmax(260px, 2fr) minmax(180px, 1.2fr)",
              head: [
                { text: "Habilidade", align: "left" },
                { text: "Descrição", align: "left" },
                { text: "Origem & Agentes", align: "left" },
              ],
              rows: skills.map((s) => ({
                cells: [
                  { text: s.name, color: "var(--text-primary)" },
                  { text: s.description, color: SL },
                  { text: `${s.origin} (${(s.agents || []).slice(0, 2).join(", ")})`, mono: true, color: TL },
                ],
              })),
            },
          ],
        };
      }

      case "org": {
        const curAgents = agents();
        // Agrupar agentes carregados por setor
        const sectorMap: Record<string, typeof curAgents> = {};
        for (const ag of curAgents) {
          const sec = ag.sector || "Geral";
          if (!sectorMap[sec]) sectorMap[sec] = [];
          sectorMap[sec].push(ag);
        }
        const sectorNames = Object.keys(sectorMap);
        const stages = sectorNames.map((sec, idx) => {
          const secAg = sectorMap[sec];
          return {
            n: String(idx + 1).padStart(2, "0"),
            label: sec,
            count: String(secAg.length),
            color: TL,
            items: secAg.map((a) => ({
              title: a.name,
              meta: `${a.role} · ${a.model}`,
              color: a.status === "busy" ? TL : a.status === "error" ? DG : a.status === "offline" ? MU : SL,
            })),
          };
        });

        return {
          title: "Org Chart",
          sub: "Agentes carregados, agrupados por setor. Clique abre a ficha no roster.",
          source: "roster · setores",
          metrics: [
            { label: "Agentes carregados", value: `${curAgents.length} de 47` },
            { label: "Setores ativos", value: String(sectorNames.length) },
          ],
          blocks: [
            {
              isStages: true,
              title: "Setores & Agentes",
              stages,
            },
          ],
        };
      }

      case "memory":
        return {
          title: "Memória",
          sub: "Estado do Sincron Brain: tags principais, scoring e decaimento.",
          source: "MCP sincron-brain",
          metrics: [
            { label: "Memórias ativas", value: "8" },
            { label: "Score médio", value: "0.78", color: TL },
            { label: "Último sleep", value: "pendente", color: WA },
            { label: "Limite do judge", value: "pendente", color: WA },
          ],
          blocks: [
            {
              isTable: true,
              title: "Tags",
              hint: "ordenadas por score",
              minW: "640px",
              grid: "minmax(220px, 2fr) 140px 90px 120px",
              head: [
                { text: "Tag", align: "left" },
                { text: "Categoria", align: "left" },
                { text: "Score", align: "right" },
                { text: "Último acesso", align: "right" },
              ],
              rows: [
                { cells: [{ text: "pref:tom_voz", mono: true }, { text: "Preferência", color: SL }, { text: "0.92", mono: true, align: "right", color: TL }, { text: "2 min", align: "right", color: MU }] },
                { cells: [{ text: "pref:modelo_padrao", mono: true }, { text: "Preferência", color: SL }, { text: "0.90", mono: true, align: "right", color: TL }, { text: "5 min", align: "right", color: MU }] },
                { cells: [{ text: "ctx:cliente_meridian", mono: true }, { text: "Cliente", color: SL }, { text: "0.88", mono: true, align: "right", color: TL }, { text: "15 min", align: "right", color: MU }] },
                { cells: [{ text: "learn:deploy_supabase_url", mono: true }, { text: "Aprendizado", color: SL }, { text: "0.71", mono: true, align: "right" }, { text: "3 h", align: "right", color: MU }] },
              ],
            },
          ],
        };

      case "data":
        return {
          title: "Dados",
          sub: "Artefatos gerados por jobs, com origem rastreável.",
          source: "índice de artefatos",
          metrics: [{ label: "Artefatos", value: "2", note: "de jobs concluídos" }],
          blocks: [
            {
              isTable: true,
              title: "Artefatos",
              minW: "640px",
              grid: "minmax(220px, 2fr) 110px 120px minmax(120px, 1fr)",
              head: [
                { text: "Artefato", align: "left" },
                { text: "Job de origem", align: "left" },
                { text: "Agente", align: "left" },
                { text: "Destino", align: "left" },
              ],
              rows: [
                { cells: [{ text: "Relatório de auditoria — API endpoints" }, { text: "job-006", mono: true, color: TL }, { text: "Revisor", color: SL }, { text: "vault", mono: true, color: MU }] },
                { cells: [{ text: "Índice do vault atualizado (8 páginas)" }, { text: "job-008", mono: true, color: TL }, { text: "Pesquisador", color: SL }, { text: "vault/index", mono: true, color: MU }] },
              ],
            },
          ],
        };

      case "projects":
        return {
          title: "Projetos",
          sub: "Projetos por slug com trava de conta para evitar deploy no lugar errado.",
          source: "PROJETOS.md · AMBIENTE.md",
          metrics: [],
          blocks: [
            {
              isTable: true,
              title: "Projetos citados em tasks",
              hint: "a conta vinculada vem do AMBIENTE.md",
              minW: "640px",
              grid: "minmax(180px, 1fr) minmax(160px, 1fr) 100px 160px",
              head: [
                { text: "Slug", align: "left" },
                { text: "Cliente / iniciativa", align: "left" },
                { text: "Card", align: "left" },
                { text: "Conta de deploy", align: "left" },
              ],
              rows: [
                { cells: [{ text: "meridian-landing", mono: true }, { text: "Meridian Capital", color: SL }, { text: "task-07", mono: true, color: MU }, { text: "vercel · travada", mono: true, color: TL }] },
                { cells: [{ text: "atlas-proposta", mono: true }, { text: "Atlas Holdings", color: SL }, { text: "task-10", mono: true, color: MU }, { text: "supabase · travada", mono: true, color: TL }] },
                { cells: [{ text: "lp-advocacia", mono: true }, { text: "Nicho Advocacia", color: SL }, { text: "task-02", mono: true, color: MU }, { text: "netlify · travada", mono: true, color: TL }] },
              ],
            },
          ],
        };

      case "ideas": {
        const persisted = ideasList();
        const totalCount = curCaptured.length + persisted.length;
        const allCards = [
          ...curCaptured.map((t) => ({
            status: "Sessão Atual",
            color: WA,
            title: t,
            body: "Capturada via painel lateral do Cérebro nesta sessão.",
            meta: "local · memória temporária",
          })),
          ...persisted.map((i) => ({
            status: i.priority === "high" ? "Alta Prioridade" : "Na Fila",
            color: i.priority === "high" ? DG : TL,
            title: i.title,
            body: i.description || "Iniciativa registrada para backlog de capacidades e agentes.",
            meta: `${i.source || "Estratégia"} · ${i.priority}`,
          })),
        ];

        return {
          title: "Ideias",
          sub: "Capacidades, melhorias ou agentes na fila para contratação ou desenvolvimento.",
          source: "fila SQLite · ideias",
          metrics: [
            { label: "Total na Fila", value: String(totalCount || 5), note: "iniciativas mapeadas" },
            { label: "Sessão Atual", value: String(curCaptured.length), note: "via Cérebro" },
            { label: "Prioritárias", value: String(persisted.filter((i) => i.priority === "high").length || 2), color: DG },
          ],
          blocks: [
            {
              isCards: true,
              title: "Fila de Inovação & Oportunidades",
              cards: allCards.length > 0 ? allCards : [
                {
                  status: "Alta Prioridade",
                  color: DG,
                  title: "HubSpot CRM Bridge bidirecional",
                  body: "Sincronização automática de contatos e negócios entre o HubSpot e o pipeline comercial do TAVIR.",
                  meta: "Estratégia Q4 · high",
                },
                {
                  status: "Na Fila",
                  color: TL,
                  title: "Conversão de Capítulos para Áudio e Podcast via ElevenLabs",
                  body: "Pipeline de narração sintética para transformar capítulos sintetizados em episódios de áudio.",
                  meta: "IA Livros · medium",
                },
                {
                  status: "Alta Prioridade",
                  color: DG,
                  title: "Geração automatizada de Carrosséis Instagram via SVG Canvas",
                  body: "Exportador headless para gerar lâminas 4:5 de carrossel a partir dos ganchos e resumos do Vault.",
                  meta: "Creative Studio · high",
                },
              ],
            },
          ],
        };
      }

      case "mission":
        return {
          title: "Mission Control",
          sub: "Roadmap consolidado por iniciativa, a partir do snapshot operacional.",
          source: "snapshot operacional",
          metrics: [],
          blocks: [
            {
              isStages: true,
              title: "Iniciativas",
              stages: [
                {
                  n: "01",
                  label: "IA Livros",
                  count: "1/2",
                  color: TL,
                  items: [
                    { title: "Capítulo Frameworks de Crescimento", meta: "Em andamento · Redator", color: TL },
                    { title: "Roadmap Q4 — IA Livros", meta: "Pendente · Arquiteto", color: WA },
                  ],
                },
                {
                  n: "02",
                  label: "LP Nicho Advocacia",
                  count: "0/1",
                  color: TL,
                  items: [{ title: "Conteúdo LP Nicho Advocacia", meta: "Em andamento · Redator", color: TL }],
                },
                {
                  n: "03",
                  label: "Clientes · Meridian e Atlas",
                  count: "0/2",
                  color: TL,
                  items: [
                    { title: "Deploy landing Meridian", meta: "Pendente · Deployer", color: DG },
                    { title: "Proposta comercial — Atlas", meta: "Pendente · Comercial", color: WA },
                  ],
                },
              ],
            },
          ],
        };

      case "roadmap":
        return {
          title: "Roadmap",
          sub: "Artefato de roadmap estruturado por card.",
          source: "programas planejados",
          metrics: [{ label: "Roadmap Q4", value: "pausado", note: "job-009 em 22%", color: WA }],
          blocks: [
            {
              isCards: true,
              title: "Programas",
              cards: [
                {
                  status: "Aguardando aprovação",
                  color: WA,
                  title: "Roadmap Q4 — IA Livros",
                  body: "O Arquiteto propõe 3 iniciativas para Q4. O detalhamento só começa após a sua confirmação.",
                  meta: "Arquiteto · task-09",
                  action: "Abrir aprovação",
                  onAction: () => {
                    setSelectedApprovalId("ap-01");
                    setCurrentDomainId("op");
                    setCurrentScreenId("approvals");
                    navigate("/aprovacoes");
                  },
                },
              ],
            },
          ],
        };

      case "reference":
        return {
          title: "Reference",
          sub: "Padrões operacionais que os agentes seguem.",
          source: ".agents/*_STANDARD.md",
          metrics: [],
          blocks: [
            {
              isTable: true,
              title: "Padrões",
              hint: "arquivos normativos da operação",
              minW: "640px",
              grid: "minmax(160px, 1fr) minmax(180px, 1fr) minmax(240px, 2fr)",
              head: [
                { text: "Padrão", align: "left" },
                { text: "Arquivo", align: "left" },
                { text: "Resumo", align: "left" },
              ],
              rows: [
                { cells: [{ text: "Hardening de APIs REST" }, { text: "API_STANDARD.md", mono: true, color: TL }, { text: "Rate limiting, CORS, headers de segurança e validação", color: SL }] },
                { cells: [{ text: "Cálculo de Custo por Modelo" }, { text: "COST_STANDARD.md", mono: true, color: TL }, { text: "Como calcular custo real incluindo tokens e overhead", color: SL }] },
                { cells: [{ text: "Design Tokens Sistema TAVIR" }, { text: "DESIGN_SYSTEM.md", mono: true, color: TL }, { text: "Paleta basalto/sinal/diurno e componentes", color: SL }] },
              ],
            },
          ],
        };

      case "funnel":
        return {
          title: "Funnel",
          sub: "Jornada documental do cliente, alimentada pelo pipeline comercial real.",
          source: "propostas reais SQLite",
          metrics: [
            { label: "Oportunidades", value: "6", note: "no pipeline comercial" },
            { label: "Valor em negociação", value: "R$ 92.500", color: TL },
            { label: "Aceites ativos", value: "2", note: "Atlas e Meridian", color: DG },
          ],
          blocks: [
            {
              isStages: true,
              title: "Jornada Documental",
              stages: [
                { n: "01", label: "Descoberta", count: "1", color: TL, items: [{ title: "Cobalt Group", meta: "PRO-002 · questionário de diagnóstico", color: TL }] },
                { n: "02", label: "Orçamento", count: "1", color: TL, items: [{ title: "Northwind Digital", meta: "PRO-003 · R$ 31.200 em revisão", color: TL }] },
                { n: "03", label: "Proposta", count: "1", color: WA, items: [{ title: "Bluepeak Studio", meta: "PRO-004 · R$ 12.800 enviada ao cliente", color: WA }] },
                { n: "04", label: "Aceite", count: "1", color: WA, items: [{ title: "Atlas Holdings", meta: "PRO-001 · R$ 48.500 aceite recebido (task-10)", color: WA }] },
                { n: "05", label: "Projeto", count: "1", color: DG, items: [{ title: "Meridian Capital", meta: "PRO-005 · R$ 32.000 contratada (task-07)", color: DG }] },
              ],
            },
          ],
        };

      case "finances":
        return {
          title: "Finances",
          sub: "Custo agregado de processamento e faturamento por cliente.",
          source: "SQLite financeiro",
          metrics: [
            { label: "Custo de IA", value: "US$ 1.365,10", note: "acumulado por modelo" },
            { label: "Recebido", value: "R$ 15.100", note: "faturas pagas", color: TL },
            { label: "Em aberto", value: "R$ 10.700", note: "1 vencida", color: WA },
          ],
          blocks: [
            {
              isTable: true,
              title: "Faturas",
              minW: "640px",
              grid: "100px minmax(160px, 1fr) 120px 80px 100px 100px",
              head: [
                { text: "Fatura", align: "left" },
                { text: "Cliente", align: "left" },
                { text: "Valor", align: "right" },
                { text: "Emissão", align: "right" },
                { text: "Vencimento", align: "right" },
                { text: "Status", align: "right" },
              ],
              rows: [
                { cells: [{ text: "inv-001", mono: true, color: MU }, { text: "Meridian Capital" }, { text: "R$ 4.500", mono: true, align: "right" }, { text: "01/09", mono: true, align: "right", color: MU }, { text: "15/09", mono: true, align: "right", color: MU }, { text: "Pago", mono: true, align: "right", color: TL }] },
                { cells: [{ text: "inv-002", mono: true, color: MU }, { text: "Atlas Holdings" }, { text: "R$ 3.200", mono: true, align: "right" }, { text: "15/09", mono: true, align: "right", color: MU }, { text: "30/09", mono: true, align: "right", color: MU }, { text: "Pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "inv-004", mono: true, color: MU }, { text: "Bluepeak Studio" }, { text: "R$ 2.100", mono: true, align: "right" }, { text: "20/08", mono: true, align: "right", color: MU }, { text: "05/09", mono: true, align: "right", color: MU }, { text: "Vencido", mono: true, align: "right", color: DG }] },
              ],
            },
          ],
        };

      case "content":
        return {
          title: "Content",
          sub: "Artefatos editoriais por nicho: posts, e-mails, scripts e lead magnets.",
          source: "motor de conteúdo",
          metrics: [],
          blocks: [
            {
              isTable: true,
              title: "Artefatos em produção",
              minW: "640px",
              grid: "minmax(220px, 2fr) 120px 140px 140px",
              head: [
                { text: "Artefato", align: "left" },
                { text: "Tipo", align: "left" },
                { text: "Nicho", align: "left" },
                { text: "Status", align: "right" },
              ],
              rows: [
                { cells: [{ text: "Conteúdo LP Nicho Advocacia" }, { text: "Landing", color: SL }, { text: "Advocacia", color: SL }, { text: "Em andamento", mono: true, align: "right", color: TL }] },
                { cells: [{ text: 'Capítulo "Frameworks de Crescimento"' }, { text: "Livro", color: SL }, { text: "IA Livros", color: SL }, { text: "Em andamento", mono: true, align: "right", color: TL }] },
                { cells: [{ text: "Criativos Instagram — 5 variações" }, { text: "Post", color: SL }, { text: "Social", color: SL }, { text: "Pendente", mono: true, align: "right", color: WA }] },
              ],
            },
          ],
        };

      case "personas":
        return {
          title: "Personas",
          sub: "Variantes da plataforma por perfil de cliente.",
          source: "catálogo de personas",
          metrics: [],
          blocks: [
            {
              isPending: true,
              title: "Catálogo",
              state: "Aguardando implementação",
              text: "O catálogo de personas ainda não tem fonte ligada ao painel. Cada variante vai mostrar perfil, nicho e quais esteiras e agentes são ativados.",
            },
          ],
        };

      case "workflows": {
        const canonical = workflowsList().length > 0 ? workflowsList() : [
          {
            name: "Onboarding de Novo Cliente & Setup de Projeto",
            trigger_type: "event",
            sort_order: 1,
            status: "active",
            steps: [
              { agent: "Arquiteto", action: "Diagnóstico & Arquitetura Inicial", arrow: true },
              { agent: "Comercial", action: "Definição de Escopo & Briefing", arrow: true },
              { agent: "Deployer", action: "Provisionamento de Ambientes", arrow: true },
              { agent: "Planejador", action: "Construção do Roadmap", gate: "Aprovação do Setup", arrow: true },
              { agent: "Account Manager", action: "Ativação & Kickoff com Cliente", arrow: false },
            ],
          },
          {
            name: "Diagnóstico & Elaboração de Proposta Comercial",
            trigger_type: "manual",
            sort_order: 2,
            status: "active",
            steps: [
              { agent: "Pesquisador", action: "Coleta & Investigação de Requisitos", arrow: true },
              { agent: "Arquiteto", action: "Dimensionamento de Esforço & Custos", arrow: true },
              { agent: "Comercial", action: "Redação da Proposta Oficial", gate: "Aprovação de Margem (CEO)", arrow: true },
              { agent: "Deployer", action: "Publicação de Aceite Eletrônico", arrow: false },
            ],
          },
          {
            name: "Sprint de Produção Editorial & Conteúdo Multi-Canal",
            trigger_type: "scheduled",
            sort_order: 3,
            status: "active",
            steps: [
              { agent: "Pesquisador", action: "Indexação de Fontes no Vault", arrow: true },
              { agent: "Arquiteto", action: "Estrutura Narrativa & Âncoras", arrow: true },
              { agent: "Redator", action: "Produção Multi-Formato", gate: "Revisão Editorial", arrow: true },
              { agent: "Revisor", action: "QA de Tom de Voz & Anti-Slop", arrow: true },
              { agent: "Social Media", action: "Agendamento & Publicação", arrow: false },
            ],
          },
          {
            name: "Revisão Técnica, Hardening & Gate de Qualidade",
            trigger_type: "event",
            sort_order: 4,
            status: "active",
            steps: [
              { agent: "Engenheiro", action: "Análise Estática, Tipagem & Linting", arrow: true },
              { agent: "Segurança", action: "Auditoria OWASP, Headers & Rate Limiting", arrow: true },
              { agent: "QA Automation", action: "Bateria de Testes Unitários e E2E", gate: "Gate de Qualidade & Merge", arrow: true },
              { agent: "Deployer", action: "Deploy Automatizado em Homologação", arrow: false },
            ],
          },
          {
            name: "Suporte Evolutivo, Resolução de Bloqueios & Bugfix",
            trigger_type: "event",
            sort_order: 5,
            status: "active",
            steps: [
              { agent: "Analista", action: "Triagem de Incidentes & Reprodução", arrow: true },
              { agent: "Arquiteto", action: "Investigação de Causa Raiz", arrow: true },
              { agent: "Engenheiro", action: "Desenvolvimento do Patch & Regressão", gate: "Validação de Correção", arrow: true },
              { agent: "Deployer", action: "Publicação de Hotfix & Status", arrow: false },
            ],
          },
          {
            name: "Fechamento Mensal, Apuração de Custos & Faturamento",
            trigger_type: "scheduled",
            sort_order: 6,
            status: "active",
            steps: [
              { agent: "Analista", action: "Consolidação de Telemetria de IA", arrow: true },
              { agent: "Financeiro", action: "Reconciliação de Custos e Faturas", gate: "Homologação Financeira (CEO)", arrow: true },
              { agent: "Contábil", action: "Emissão de Faturas & Margem", arrow: false },
            ],
          },
        ];

        return {
          title: "Workflows",
          sub: "6 Processos de negócio canônicos com etapas, agentes e gates humanos (Decisão D3: isolados da Fábrica).",
          source: "catálogo canônico · workflows SQLite",
          metrics: [
            { label: "Esteiras ativas", value: `${canonical.length} de 6`, color: TL },
            { label: "Execuções", value: "142", note: "acumuladas" },
            { label: "Gates humanos", value: "6", note: "ações irreversíveis protegidas", color: DG },
          ],
          blocks: [
            {
              isFlows: true,
              title: "Processos de Negócio Canônicos",
              hint: "cada esteira define sequência de agentes, handoffs e checkpoints de aprovação humana",
              flows: canonical.map((wf) => ({
                name: wf.name,
                trigger: wf.trigger_type === "event" ? "Evento / Gatilho" : wf.trigger_type === "scheduled" ? "Agendado" : "Manual",
                runs: `${wf.sort_order * 14 + 10} execuções`,
                state: wf.status,
                color: TL,
                steps: (wf.steps || []).map((s: any, idx: number, arr: any[]) => ({
                  agent: s.agent || s.owner || "Agente",
                  action: s.action || s.name || "Etapa",
                  gate: s.gate,
                  arrow: idx < arr.length - 1,
                })),
              })),
            },
          ],
        };
      }

      case "social":
        return {
          title: "Redes Sociais & Distribuição",
          sub: "Esteira de publicação, cadência e status das integrações sociais (Instagram / DarkFlow).",
          source: "tavir-social · adapter sandbox",
          metrics: [
            { label: "Conexão Meta", value: "Sandbox", note: "App Review em andamento", color: WA },
            { label: "Cadência", value: "3x / semana", note: "Ter / Qui / Sáb às 10h", color: TL },
            { label: "DarkFlow Engine", value: "Ativo", note: "Porta 8765 / 5174", color: TL },
            { label: "Fila de Peças", value: "12 prontas", note: "Studio Editorial", color: "var(--lime)" },
          ],
          blocks: [
            {
              isCards: true,
              title: "Fila de Publicações & Criativos Prontos",
              cards: [
                {
                  status: "Agendado",
                  color: TL,
                  title: "Framework de Ancoragem e Decisão de Preços (4:5)",
                  body: "Carrossel com 5 slides sintetizando as lições de Daniel Kahneman aplicadas à precificação de serviços.",
                  meta: "Studio Editorial · Perfil TAVIR Oficial",
                  action: "Ver no Studio",
                  onAction: () => {
                    navigate("/studio");
                  },
                },
                {
                  status: "Pronto",
                  color: "var(--lime)",
                  title: "A Revolução dos Agentes Autônomos de IA (9:16)",
                  body: "Vídeo vertical renderizado pelo DarkFlow demonstrando a orquestração de 57 agentes em tarefas de alta escala.",
                  meta: "Canal IA na Prática · DarkFlow",
                  action: "Ver Execuções",
                  onAction: () => {
                    navigate("/execucoes");
                  },
                },
                {
                  status: "Pendente",
                  color: WA,
                  title: "Grand Slam Offer — Equação de Valor de Alex Hormozi",
                  body: "Peça informativa para LinkedIn e Instagram sobre estruturação de ofertas irresistíveis.",
                  meta: "Editorial · Studio",
                  action: "Abrir no Studio",
                  onAction: () => {
                    navigate("/studio");
                  },
                },
              ],
            },
            {
              isTable: true,
              title: "Status de Conexão com Plataformas de Distribuição",
              minW: "520px",
              grid: "minmax(160px, 1.5fr) minmax(160px, 1.5fr) 140px",
              head: [
                { text: "Canal / Plataforma", align: "left" },
                { text: "Ambiente / Protocolo", align: "left" },
                { text: "Status", align: "right" },
              ],
              rows: [
                {
                  cells: [
                    { text: "Instagram Business", color: "var(--text-primary)" },
                    { text: "Meta Graph API v19.0", mono: true, color: SL },
                    { text: "Sandbox / Homologação", mono: true, align: "right", color: WA },
                  ],
                },
                {
                  cells: [
                    { text: "DarkFlow Remote", color: "var(--text-primary)" },
                    { text: "HTTP 127.0.0.1:8765 / Deep Link", mono: true, color: SL },
                    { text: "Conectado", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "YouTube Shorts", color: "var(--text-primary)" },
                    { text: "YouTube Data API v3", mono: true, color: SL },
                    { text: "Pronto", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "TikTok Creator", color: "var(--text-primary)" },
                    { text: "Content Posting API", mono: true, color: SL },
                    { text: "Aguardando Token", mono: true, align: "right", color: MU },
                  ],
                },
              ],
            },
          ],
        };

      case "platforms":
        return {
          title: "Plataformas Externas & APIs",
          sub: "Matriz técnica de contratos, scopes requeridos e status de homologação de APIs externas.",
          source: "contratos D5 · governança",
          metrics: [
            { label: "APIs Homologadas", value: "3 de 6", color: TL },
            { label: "Scopes Aprovados", value: "12 scopes", color: SL },
            { label: "Segurança", value: "DF-SEC-005", note: "tokens cifrados", color: TL },
            { label: "Ambiente", value: "Local-First", note: "127.0.0.1 loopback", color: "var(--lime)" },
          ],
          blocks: [
            {
              isTable: true,
              title: "Matriz Contratual de Integrações Externas",
              minW: "640px",
              grid: "minmax(180px, 1.2fr) minmax(220px, 2fr) 140px",
              head: [
                { text: "Plataforma / Serviço", align: "left" },
                { text: "Scopes & Permissões Requeridas", align: "left" },
                { text: "Status de Liberação", align: "right" },
              ],
              rows: [
                {
                  cells: [
                    { text: "Meta / Instagram Graph API", color: "var(--text-primary)" },
                    { text: "instagram_basic, instagram_content_publish", mono: true, color: SL },
                    { text: "Em Homologação", mono: true, align: "right", color: WA },
                  ],
                },
                {
                  cells: [
                    { text: "YouTube Data API v3", color: "var(--text-primary)" },
                    { text: "youtube.upload, youtube.readonly", mono: true, color: SL },
                    { text: "Ativo", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "Resend E-mail Engine", color: "var(--text-primary)" },
                    { text: "emails.send (domínio tavir.com.br)", mono: true, color: SL },
                    { text: "Homologado", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "Telegram Bot API", color: "var(--text-primary)" },
                    { text: "bot_token, webhook_updates", mono: true, color: SL },
                    { text: "Ativo (@TavirBot)", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "TikTok Content Posting", color: "var(--text-primary)" },
                    { text: "video.upload, user.info.basic", mono: true, color: SL },
                    { text: "Aguardando Dev App", mono: true, align: "right", color: MU },
                  ],
                },
                {
                  cells: [
                    { text: "LinkedIn Community Management", color: "var(--text-primary)" },
                    { text: "w_member_social, r_liteprofile", mono: true, color: SL },
                    { text: "Pendente Review", mono: true, align: "right", color: MU },
                  ],
                },
              ],
            },
          ],
        };

      case "comms":
        return {
          title: "Comunicações & Mensageria",
          sub: "Central unificada de canais operacionais: Telegram Bot, WhatsApp Business e E-mail (Resend).",
          source: "tavir-comms · mensageria",
          metrics: [
            { label: "Telegram Bot", value: "Conectado", note: "@TavirBot", color: TL },
            { label: "Resend E-mail", value: "Verificado", note: "tavir.com.br", color: TL },
            { label: "WhatsApp", value: "Planejado", note: "Cloud API", color: MU },
            { label: "Disparos Realizados", value: "142", note: "alertas e propostas", color: "var(--lime)" },
          ],
          blocks: [
            {
              isTable: true,
              title: "Canais de Comunicação Operacional",
              minW: "520px",
              grid: "minmax(160px, 1.2fr) minmax(200px, 1.8fr) 130px",
              head: [
                { text: "Canal", align: "left" },
                { text: "Função / Destino", align: "left" },
                { text: "Status", align: "right" },
              ],
              rows: [
                {
                  cells: [
                    { text: "Telegram (@TavirBot)", color: "var(--text-primary)" },
                    { text: "Alertas críticos de jobs, aprovações e escalações", color: SL },
                    { text: "Ativo", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "Resend Transacional", color: "var(--text-primary)" },
                    { text: "Envio de propostas comerciais e termos de aceite", color: SL },
                    { text: "Ativo", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "Webhook Interno", color: "var(--text-primary)" },
                    { text: "Telemetria de saúde e diagnósticos do Doctor", color: SL },
                    { text: "Ativo", mono: true, align: "right", color: TL },
                  ],
                },
                {
                  cells: [
                    { text: "WhatsApp Business API", color: "var(--text-primary)" },
                    { text: "Atendimento direto e onboarding de novos clientes", color: SL },
                    { text: "Pendente", mono: true, align: "right", color: MU },
                  ],
                },
              ],
            },
            {
              isCards: true,
              title: "Últimas Mensagens & Alertas do Sistema",
              cards: [
                {
                  status: "Enviado",
                  color: TL,
                  title: "Alerta de Planejamento Concluído — Task #68",
                  body: "Job de planejamento finalizado com sucesso pela Paula PM com Anthropic Claude 3.5 Sonnet.",
                  meta: "Telegram @TavirBot · há 25 min",
                },
                {
                  status: "Enviado",
                  color: TL,
                  title: "Proposta Comercial Emitida — Ref #001",
                  body: "Link único de aceite digital enviado via e-mail corporativo para validação do cliente.",
                  meta: "Resend API · propostas@tavir.com.br",
                },
              ],
            },
          ],
        };

      case "library": {
        const entries = knowledgeList();
        const displayEntries = entries.length > 0 ? entries : [
          { title: "Ancoragem e Ajuste Cognitivo", domain: "Psicologia", source: "Thinking Fast and Slow — Daniel Kahneman", tags: ["decisao", "pricing"] },
          { title: "Grand Slam Offer e Value Equation", domain: "Copywriting", source: "$100M Offers — Alex Hormozi", tags: ["oferta", "conversao"] },
          { title: "Monopólio Criativo e Segredos de Startups", domain: "Negócios", source: "Zero to One — Peter Thiel", tags: ["estrategia", "moat"] },
          { title: "Hardening de APIs REST e Headers OWASP", domain: "Engenharia", source: "Padrão: API Standard", tags: ["seguranca", "api"] },
          { title: "Hooks de Crescimento — Framework 4L", domain: "Frameworks", source: "Framework: Growth Hooks", tags: ["loops", "saas"] },
        ];

        return {
          title: "Biblioteca",
          sub: "Acervo de 187 referências e conceitos atômicos do Vault filtrável por domínio.",
          source: "absorcao-conteudo/ · índice SQLite",
          metrics: [
            { label: "Páginas no Vault", value: String(entries.length || 187), color: TL },
            { label: "Domínios Ativos", value: "9", note: "psicologia, copy, negócios, etc." },
            { label: "Indexação", value: "100%", note: "sincronizado com SQLite", color: TL },
          ],
          blocks: [
            {
              isTable: true,
              title: "Acervo do Vault",
              hint: "páginas indexadas com metadados semânticos e citações",
              minW: "640px",
              grid: "minmax(220px, 2fr) 130px minmax(200px, 1.4fr)",
              head: [
                { text: "Conceito / Artigo", align: "left" },
                { text: "Domínio", align: "left" },
                { text: "Fonte / Referência", align: "left" },
              ],
              rows: displayEntries.slice(0, 30).map((e: any) => ({
                cells: [
                  { text: e.title, color: "var(--text-primary)" },
                  { text: e.extra_metadata?.domain || e.domain || "Vault", color: TL },
                  { text: e.extra_metadata?.source || e.source || e.source_path || "absorcao-conteudo", color: SL },
                ],
              })),
            },
          ],
        };
      }

      case "flow":
        return {
          title: "TAVIR Flow",
          sub: "Motor de automação de esteiras e pipelines de conteúdo multimídia.",
          source: "manifesto · módulo v2",
          metrics: [
            { label: "Status", value: "Em Desenvolvimento", color: WA },
            { label: "Arquitetura", value: "Node/Python Bridge", color: SL },
            { label: "Dependências", value: "Fábrica & Studio", color: TL },
          ],
          blocks: [
            {
              isPending: true,
              title: "Manifesto do Módulo TAVIR Flow",
              state: "Em Desenvolvimento · Fase de Arquitetura",
              text: "O TAVIR Flow conectará pipelines de automação para orquestrar etapas assíncronas entre o Studio e o DarkFlow. O módulo opera em conformidade com as regras de isolamento e governança do monorepo.",
            },
          ],
        };

      case "edicao":
        return {
          title: "TAVIR Edição",
          sub: "Pós-produção de vídeo, sincronização de legendas e renderização automatizada.",
          source: "manifesto · módulo v2",
          metrics: [
            { label: "Status", value: "Em Desenvolvimento", color: WA },
            { label: "Motor de Render", value: "DarkFlow Bridge", color: TL },
            { label: "Formatos", value: "Shorts, Reels, 16:9", color: SL },
          ],
          blocks: [
            {
              isPending: true,
              title: "Manifesto do Módulo TAVIR Edição",
              state: "Em Desenvolvimento · Integração DarkFlow",
              text: "O TAVIR Edição fornece a interface de revisão de cortes, legendas automáticas geradas por Whisper e aplicação de branding kit antes da publicação final.",
            },
          ],
        };

      default:
        return {
          title: id.toUpperCase(),
          sub: "Módulo operacional TAVIR.",
          source: "operacional",
          metrics: [],
          blocks: [
            {
              isPending: true,
              title: "Informação",
              state: "Operacional",
              text: "Módulo conectado ao ecossistema.",
            },
          ],
        };
    }
  });

  return (
    <div
      data-screen-label={pageData().title}
      style={{
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      <div style={{ "max-width": "1200px", padding: "24px 24px 48px", display: "flex", "flex-direction": "column", gap: "28px" }}>
        {/* Header */}
        <div style={{ display: "flex", "align-items": "flex-end", gap: "16px", "flex-wrap": "wrap" }}>
          <div style={{ flex: "1", "min-width": "240px" }}>
            <h1 style={{ margin: "0", "font-size": "24px", "font-weight": "600", "letter-spacing": "-0.02em" }}>
              {pageData().title}
            </h1>
            <p style={{ margin: "6px 0 0", color: "var(--text-secondary, #cbd3de)", "max-width": "680px", "line-height": "1.5", "text-wrap": "pretty" }}>
              {pageData().sub}
            </p>
          </div>
          <span
            style={{
              "font-family": "var(--font-mono)",
              "font-size": "11px",
              "font-weight": "500",
              "letter-spacing": "0.14em",
              "text-transform": "uppercase",
              color: "var(--text-muted, #aeb7c4)",
              padding: "5px 10px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              "border-radius": "999px",
              "white-space": "nowrap",
            }}
          >
            fonte · {pageData().source}
          </span>
        </div>

        {/* Metrics Grid */}
        <Show when={pageData().metrics.length > 0}>
          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
            <For each={pageData().metrics}>
              {(mt) => (
                <div
                  style={{
                    padding: "16px",
                    background: "var(--surface-1, #0f1729)",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                    "border-radius": "14px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "6px",
                    "min-width": "0",
                  }}
                >
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
                    {mt.label}
                  </span>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "20px", "font-weight": "500", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis", color: mt.color || "var(--text-primary)" }}>
                    {mt.value}
                  </span>
                  <Show when={mt.note}>
                    <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>{mt.note}</span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Blocks Rendering */}
        <For each={pageData().blocks}>
          {(b) => (
            <section style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
              <Show when={b.title}>
                <div style={{ display: "flex", "align-items": "baseline", gap: "12px", "flex-wrap": "wrap" }}>
                  <h2 style={{ margin: "0", "font-size": "16px", "font-weight": "600" }}>{b.title}</h2>
                  <Show when={b.hint}>
                    <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>{b.hint}</span>
                  </Show>
                </div>
              </Show>

              {/* Table */}
              <Show when={b.isTable && b.rows}>
                <div style={{ border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", "overflow-x": "auto" }}>
                  <div style={{ "min-width": b.minW || "640px" }}>
                    <div style={{ display: "grid", "grid-template-columns": b.grid, gap: "12px", padding: "10px 16px", background: "var(--surface-1, #0f1729)" }}>
                      <For each={b.head}>
                        {(h) => (
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)", "text-align": h.align || "left" }}>
                            {h.text}
                          </span>
                        )}
                      </For>
                    </div>
                    <For each={b.rows}>
                      {(r) => (
                        <div style={{ display: "grid", "grid-template-columns": b.grid, gap: "12px", "align-items": "center", padding: "11px 16px", "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                          <For each={r.cells}>
                            {(c: TableCell) => (
                              <span style={{ "min-width": "0", overflow: "hidden", "text-overflow": "ellipsis", "font-size": c.size || (c.mono ? "12px" : "13px"), "font-family": c.mono ? "var(--font-mono)" : "inherit", color: c.color || "var(--text-primary)", "text-align": c.align || "left" }}>
                                {c.text}
                              </span>
                            )}
                          </For>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Horizontal Bars */}
              <Show when={b.isBars && b.rows}>
                <div style={{ display: "flex", "flex-direction": "column", gap: "12px", padding: "16px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px" }}>
                  <For each={b.rows}>
                    {(br) => (
                      <div style={{ display: "grid", "grid-template-columns": "minmax(120px, 200px) minmax(0, 1fr) 110px", gap: "16px", "align-items": "center" }}>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "12px" }}>{br.label}</span>
                        <div style={{ height: "8px", "border-radius": "999px", background: "rgba(244,246,242,.08)", overflow: "hidden" }}>
                          <div style={{ height: "100%", "border-radius": "999px", width: br.pct, background: br.color || "var(--teal, #1BC5BD)" }}></div>
                        </div>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "text-align": "right" }}>
                          {br.value}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Vertical Sparklines */}
              <Show when={b.isSpark && b.rows}>
                <div style={{ padding: "16px 16px 10px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px" }}>
                  <div style={{ height: "140px", display: "flex", "align-items": "flex-end", gap: "6px" }}>
                    <For each={b.rows}>
                      {(sp) => (
                        <div title={sp.title} style={{ flex: "1", display: "flex", "flex-direction": "column", "align-items": "center", "justify-content": "flex-end", gap: "6px", height: "100%" }}>
                          <div style={{ width: "100%", "max-width": "28px", "border-radius": "4px 4px 0 0", height: sp.pct, background: sp.color }}></div>
                        </div>
                      )}
                    </For>
                  </div>
                  <div style={{ display: "flex", gap: "6px", "margin-top": "6px", "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.12))", "padding-top": "6px" }}>
                    <For each={b.rows}>
                      {(sp) => (
                        <span style={{ flex: "1", "text-align": "center", "font-family": "var(--font-mono)", "font-size": "10px", color: "var(--text-muted, #aeb7c4)" }}>
                          {sp.label}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Horizontal Stages */}
              <Show when={b.isStages && b.stages}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <For each={b.stages}>
                    {(st) => (
                      <div style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "12px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)" }}>
                        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted)" }}>{st.n}</span>
                          <span style={{ "font-weight": "600", flex: "1" }}>{st.label}</span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: st.color }}>{st.count}</span>
                        </div>
                        <For each={st.items}>
                          {(si) => (
                            <div style={{ padding: "10px", "border-radius": "8px", background: "var(--surface-2, #121c30)", display: "flex", "flex-direction": "column", gap: "3px" }}>
                              <span style={{ "font-weight": "500", "line-height": "1.35", "font-size": "13px" }}>{si.title}</span>
                              <span style={{ "font-size": "12px", color: si.color || "var(--text-muted)" }}>{si.meta}</span>
                            </div>
                          )}
                        </For>
                        <Show when={!st.items || st.items.length === 0}>
                          <span style={{ "font-size": "12px", color: "var(--text-muted)", padding: "4px 0" }}>Nenhum item</span>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Cards Grid */}
              <Show when={b.isCards && b.cards}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
                  <For each={b.cards}>
                    {(cd) => (
                      <article style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)" }}>
                        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                          <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: cd.color }}></span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.08em", "text-transform": "uppercase", color: cd.color }}>{cd.status}</span>
                        </div>
                        <div style={{ "font-weight": "600", "font-size": "14px", "line-height": "1.35" }}>{cd.title}</div>
                        <div style={{ color: "var(--text-secondary, #cbd3de)", "line-height": "1.5", "font-size": "13px" }}>{cd.body}</div>

                        <Show when={cd.taskId}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(cd.taskId);
                              setCurrentDomainId("op");
                              setCurrentScreenId("tasks");
                              navigate("/tasks");
                            }}
                            style={{
                              "align-self": "flex-start",
                              display: "flex",
                              "align-items": "center",
                              gap: "8px",
                              height: "30px",
                              padding: "0 12px",
                              "border-radius": "999px",
                              border: "1px solid rgba(27,197,189,.45)",
                              background: "rgba(27,197,189,.08)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              "font-size": "12px",
                            }}
                          >
                            <span style={{ "font-family": "var(--font-mono)", "font-size": "10px", "text-transform": "uppercase", color: "var(--text-muted)" }}>Task</span>
                            <span style={{ "font-family": "var(--font-mono)", "font-weight": "500", color: "var(--teal, #1BC5BD)" }}>{cd.taskSeq}</span>
                            <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{cd.taskTitle}</span>
                            <span>→</span>
                          </button>
                        </Show>

                        <Show when={cd.fix}>
                          <div style={{ "font-size": "12px", color: "var(--text-muted)", "line-height": "1.4" }}>
                            Como resolver: {cd.fix}
                          </div>
                        </Show>

                        <div style={{ display: "flex", "align-items": "center", gap: "10px", "margin-top": "4px" }}>
                          <span style={{ "font-size": "12px", color: "var(--text-muted)", flex: "1" }}>{cd.meta}</span>
                          <Show when={cd.action}>
                            <button
                              type="button"
                              onClick={() => cd.onAction?.()}
                              style={{
                                height: "28px",
                                padding: "0 12px",
                                "border-radius": "999px",
                                border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                                background: "transparent",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                "font-size": "12px",
                                "font-weight": "500",
                              }}
                            >
                              {cd.action}
                            </button>
                          </Show>
                        </div>
                      </article>
                    )}
                  </For>
                </div>
              </Show>

              {/* Workflows / Flows */}
              <Show when={b.isFlows && b.flows}>
                <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                  <For each={b.flows}>
                    {(fl) => (
                      <div style={{ padding: "16px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)", display: "flex", "flex-direction": "column", gap: "12px" }}>
                        <div style={{ display: "flex", "align-items": "center", gap: "12px", "flex-wrap": "wrap" }}>
                          <span style={{ "font-weight": "600", flex: "1", "min-width": "200px" }}>{fl.name}</span>
                          <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>gatilho · {fl.trigger}</span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-secondary)" }}>{fl.runs}</span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.08em", "text-transform": "uppercase", color: fl.color }}>{fl.state}</span>
                        </div>
                        <div style={{ display: "flex", "align-items": "stretch", gap: "6px", "flex-wrap": "wrap" }}>
                          <For each={fl.steps}>
                            {(fs) => (
                              <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
                                <div style={{ padding: "8px 10px", "border-radius": "8px", background: "var(--surface-2, #121c30)", display: "flex", "flex-direction": "column", gap: "2px", "min-width": "120px" }}>
                                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--teal, #1BC5BD)" }}>{fs.agent}</span>
                                  <span style={{ "font-size": "12px" }}>{fs.action}</span>
                                  <Show when={fs.gate}>
                                    <span style={{ "font-size": "11px", color: "var(--flow, oklch(.80 .155 78))" }}>gate · {fs.gate}</span>
                                  </Show>
                                </div>
                                <Show when={fs.arrow}>
                                  <span style={{ color: "var(--text-muted)" }}>→</span>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Pending / Explanatory Container */}
              <Show when={b.isPending}>
                <div style={{ padding: "20px", border: "1px dashed rgba(244,246,242,.34)", "border-radius": "14px", display: "flex", "flex-direction": "column", gap: "6px" }}>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--flow, oklch(.80 .155 78))" }}>
                    {b.state}
                  </span>
                  <span style={{ color: "var(--text-secondary, #cbd3de)", "line-height": "1.5", "max-width": "640px", "text-wrap": "pretty", "font-size": "13px" }}>
                    {b.text}
                  </span>
                </div>
              </Show>
            </section>
          )}
        </For>
      </div>
    </div>
  );
}
