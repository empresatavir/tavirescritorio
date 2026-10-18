import { createMemo, onMount, For, Show } from "solid-js";
import {
  tasks,
  jobs,
  agents,
  syncAgents,
  capturedNotes,
  setSelectedTaskId,
  setCurrentDomainId,
  setCurrentScreenId,
  setSelectedApprovalId,
  showToast,
} from "../../state/store";
import { useNavigate } from "@solidjs/router";

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

  onMount(() => {
    if (props.pageId === "org") {
      syncAgents();
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
      case "blocks":
        return {
          title: "Bloqueios",
          sub: "Cards travados, com o motivo, a task envolvida e a ação que libera cada um.",
          source: "bloqueios estruturados · pré-requisitos",
          metrics: [
            { label: "Travados", value: "3", note: "aguardando ação", color: DG },
            { label: "Por credencial", value: "1", note: "SUPABASE_URL" },
            { label: "Por decisão", value: "2", note: "dependem de aprovação" },
          ],
          blocks: [
            {
              isCards: true,
              title: "Aguardando desbloqueio",
              cards: [
                {
                  status: "Credencial ausente",
                  color: DG,
                  title: "Deploy landing Meridian",
                  body: "O build parou porque a variável SUPABASE_URL não existe na conta de deploy travada do projeto. Job interrompido em 45%.",
                  meta: "Deployer · job-007 · 13:35",
                  taskSeq: "#7",
                  taskTitle: "Deploy landing Meridian",
                  taskId: "task-07",
                  fix: "cadastrar o valor da variável na conta vercel · tavir; o build é refeito do checkpoint de 45%.",
                  action: "Cadastrar SUPABASE_URL e refazer o deploy",
                  onAction: () => {
                    showToast("Variável SUPABASE_URL gravada. Deploy reiniciado no checkpoint de 45%", "Desbloqueio", "success");
                  },
                },
                {
                  status: "Decisão pendente",
                  color: WA,
                  title: "Roadmap Q4 — IA Livros",
                  body: "Job pausado em 22% aguardando a aprovação da priorização das 3 iniciativas propostas.",
                  meta: "Arquiteto · job-009 · 12:50",
                  taskSeq: "#9",
                  taskTitle: "Roadmap Q4 — IA Livros",
                  taskId: "task-09",
                  fix: "aprovar ou rejeitar a priorização; o job retoma ou é encerrado conforme a decisão.",
                  action: "Decidir na aprovação ap-01",
                  onAction: () => {
                    setSelectedApprovalId("ap-01");
                    setCurrentDomainId("op");
                    setCurrentScreenId("approvals");
                    navigate("/aprovacoes");
                  },
                },
                {
                  status: "Teto atingido",
                  color: WA,
                  title: "Gasto mensal acima do teto — opus-4",
                  body: "O Orquestrador ultrapassou o teto de US$ 300/mês em claude-opus-4. O job de SEO fica na fila até a decisão.",
                  meta: "Orquestrador · job-004 · 14:10",
                  taskSeq: "#4",
                  taskTitle: "Otimização SEO landing principal",
                  taskId: "task-04",
                  fix: "subir o teto só para esta task ou trocar o modelo para claude-sonnet-4.",
                  action: "Decidir na aprovação ap-04",
                  onAction: () => {
                    setSelectedApprovalId("ap-04");
                    setCurrentDomainId("op");
                    setCurrentScreenId("approvals");
                    navigate("/aprovacoes");
                  },
                },
              ],
            },
          ],
        };

      case "changes":
        return {
          title: "Alterações",
          sub: "Diffs de PRs e branches aguardando revisão humana.",
          source: "git status · PRs abertos",
          metrics: [{ label: "GitHub", value: "conectado", note: "conta externa ativa", color: TL }],
          blocks: [
            {
              isPending: true,
              title: "PRs e branches",
              state: "Aguardando implementação",
              text: "A leitura de git status e de PRs abertos ainda não está ligada ao painel. Quando estiver, cada diff aparece aqui com autor (agente), card de origem e botões de aprovar ou pedir ajuste.",
            },
          ],
        };

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
        const costTrend = [
          ["Seg", 38.2], ["Ter", 42.1], ["Qua", 35.8], ["Qui", 51.4],
          ["Sex", 48.9], ["Sáb", 22.3], ["Dom", 18.6], ["Seg", 44.2],
          ["Ter", 39.5], ["Qua", 55.1], ["Qui", 47.8], ["Sex", 52.4],
          ["Sáb", 25.1], ["Dom", 19.4],
        ];
        const costModel = [
          { m: "claude-opus-4", cost: 340.9, share: 27 },
          { m: "claude-sonnet-4", cost: 675.4, share: 53 },
          { m: "gpt-4o", cost: 192.0, share: 15 },
          { m: "dall-e-3", cost: 156.8, share: 5 },
        ];
        const maxV = Math.max(...costTrend.map((d) => d[1] as number));

        return {
          title: "Analytics",
          sub: "Custo real por modelo e evolução diária, a partir de job_runs.",
          source: "SQLite job_runs · telemetria",
          metrics: [
            { label: "Custo acumulado", value: "US$ 1.365,10", note: "todos os modelos" },
            { label: "Média diária", value: "US$ 41,25", note: "últimos 14 dias" },
            { label: "Taxa de escalonamento", value: "25%", note: "3 de 12 tasks", color: WA },
            { label: "Tokens", value: "45,5 M", note: "soma por modelo" },
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

      case "doctor":
        return {
          title: "Doctor",
          sub: "Radar de saúde em 6 dimensões da operação.",
          source: "doctor.json · grafo do vault",
          metrics: [],
          blocks: [
            {
              isTable: true,
              title: "Dimensões",
              hint: "o score de cada dimensão vem do doctor.json",
              minW: "640px",
              grid: "minmax(160px, 1fr) minmax(240px, 2fr) 120px",
              head: [
                { text: "Dimensão", align: "left" },
                { text: "Sinal disponível hoje", align: "left" },
                { text: "Score", align: "right" },
              ],
              rows: [
                { cells: [{ text: "Engenharia" }, { text: "1 job falhou (deploy Meridian) · auditoria API concluída", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "Conhecimento" }, { text: "132 páginas no vault · índice atualizado", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "Comercial" }, { text: "1 proposta aceita aguardando contra-assinatura", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "Marketing" }, { text: "cadência Instagram em simulação", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "Governança" }, { text: "5 aprovações pendentes", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
                { cells: [{ text: "Fábricas" }, { text: "6 esteiras mapeadas · 4 manifestos lidos", color: SL }, { text: "pendente", mono: true, align: "right", color: WA }] },
              ],
            },
          ],
        };

      case "skills":
        return {
          title: "Skills",
          sub: "Catálogo de habilidades dos agentes: descrição, origem e gatilho automático.",
          source: "skills-lock.json · .agents/skills/",
          metrics: [],
          blocks: [
            {
              isPending: true,
              title: "Catálogo",
              state: "Aguardando leitura",
              text: "O painel ainda não lê skills-lock.json. A tabela prevista mostra nome, descrição, origem (local ou importada), gatilho automático e quais agentes usam cada skill.",
            },
          ],
        };

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

      case "ideas":
        return {
          title: "Ideias",
          sub: "Agentes, capacidades ou ideias na fila para contratar ou implementar.",
          source: "pastas Ideias/",
          metrics: [{ label: "Capturadas nesta sessão", value: String(curCaptured.length), note: "via Cérebro" }],
          blocks: [
            curCaptured.length > 0
              ? {
                  isCards: true,
                  title: "Capturadas agora",
                  cards: curCaptured.map((t) => ({
                    status: "Pendente de sync",
                    color: WA,
                    title: t,
                    body: "Enviada pela captura rápida do Cérebro.",
                    meta: "sessão atual",
                  })),
                }
              : {
                  isPending: true,
                  title: "Fila",
                  state: "Vazia nesta sessão",
                  text: "Use a captura rápida no Cérebro para enviar uma ideia. A leitura das pastas Ideias/ existentes ainda não está ligada.",
                },
          ],
        };

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

      case "workflows":
        return {
          title: "Workflows",
          sub: "Esteiras de produção com etapas, agentes e gates.",
          source: "manifestos de braço",
          metrics: [
            { label: "Esteiras ativas", value: "3 de 4" },
            { label: "Execuções", value: "76", note: "acumuladas" },
          ],
          blocks: [
            {
              isFlows: true,
              title: "Esteiras",
              hint: "4 de 6 manifestos lidos · CRM e e-commerce pendentes",
              flows: [
                {
                  name: "LP Nicho — Pipeline Completo",
                  trigger: "Novo briefing",
                  runs: "24 execuções",
                  state: "ativa",
                  color: TL,
                  steps: [
                    { agent: "Arquiteto", action: "Estruturar landing", arrow: true },
                    { agent: "Pesquisador", action: "Coletar referências", arrow: true },
                    { agent: "Redator", action: "Escrever copy", gate: "Revisão Editorial", arrow: true },
                    { agent: "Revisor", action: "QA & ajustes", arrow: true },
                    { agent: "Deployer", action: "Publicar", arrow: false },
                  ],
                },
                {
                  name: "IA Livros — Capítulo",
                  trigger: "Manual",
                  runs: "12 execuções",
                  state: "ativa",
                  color: TL,
                  steps: [
                    { agent: "Pesquisador", action: "Indexar fontes", arrow: true },
                    { agent: "Arquiteto", action: "Aprovar estrutura", gate: "Aprovação CEO", arrow: true },
                    { agent: "Redator", action: "Escrever capítulo", arrow: true },
                    { agent: "Revisor", action: "Revisar conteúdo", arrow: false },
                  ],
                },
              ],
            },
          ],
        };

      case "social":
        return {
          title: "Social",
          sub: "Instagram: cadência, posts e saúde da conexão.",
          source: "adapter fake · simulação",
          metrics: [
            { label: "Conexão", value: "simulação", note: "adapter real não ligado", color: WA },
            { label: "Cadência", value: "semanal", note: "segunda 9h · 36 execuções" },
          ],
          blocks: [
            {
              isCards: true,
              title: "Fila",
              cards: [
                {
                  status: "Pendente",
                  color: WA,
                  title: "Criativos Instagram — 5 variações",
                  body: "Aguardando slot livre na fila de jobs.",
                  meta: "Social Media · job-005",
                  action: "Ver job",
                  onAction: () => {
                    setCurrentDomainId("op");
                    setCurrentScreenId("exec");
                    navigate("/execucoes");
                  },
                },
              ],
            },
          ],
        };

      case "platforms":
        return {
          title: "Plataformas",
          sub: "LinkedIn, YouTube e demais: contrato visual e pendências por plataforma.",
          source: "mockup contratual",
          metrics: [],
          blocks: [
            {
              isTable: true,
              title: "Plataformas",
              minW: "460px",
              grid: "minmax(160px, 1fr) minmax(160px, 1fr) 140px",
              head: [
                { text: "Plataforma", align: "left" },
                { text: "Contrato visual", align: "left" },
                { text: "Conexão", align: "right" },
              ],
              rows: [
                { cells: [{ text: "LinkedIn" }, { text: "pendente", mono: true, color: WA }, { text: "sem credencial", mono: true, align: "right", color: MU }] },
                { cells: [{ text: "YouTube" }, { text: "pendente", mono: true, color: WA }, { text: "sem credencial", mono: true, align: "right", color: MU }] },
              ],
            },
          ],
        };

      case "comms":
        return {
          title: "Comunicações",
          sub: "Caixa de entrada unificada de e-mail, WhatsApp e Slack.",
          source: "futura integração",
          metrics: [
            { label: "Slack", value: "conectado", note: "só alertas de saída", color: TL },
            { label: "E-mail", value: "sem fonte", color: MU },
            { label: "WhatsApp", value: "sem fonte", color: MU },
          ],
          blocks: [
            {
              isPending: true,
              title: "Caixa de entrada",
              state: "Pendente · sem fonte real",
              text: "Nenhuma mensagem é exibida até que as fontes de e-mail e WhatsApp estejam ligadas. O Slack hoje só envia alertas e não alimenta esta caixa.",
            },
          ],
        };

      case "library":
        return {
          title: "Biblioteca",
          sub: "Acervo de referências filtrável por domínio.",
          source: "index de referências",
          metrics: [{ label: "Referências", value: "8", note: "no índice" }],
          blocks: [
            {
              isTable: true,
              title: "Acervo",
              minW: "640px",
              grid: "minmax(220px, 2fr) 120px minmax(160px, 1fr)",
              head: [
                { text: "Título", align: "left" },
                { text: "Domínio", align: "left" },
                { text: "Origem", align: "left" },
              ],
              rows: [
                { cells: [{ text: "Hooks de Crescimento — Framework 4L" }, { text: "Estratégia", color: TL }, { text: "Livro: Growth Hooks", color: SL }] },
                { cells: [{ text: "Copywriting para Landing Pages de Nicho" }, { text: "Conteúdo", color: TL }, { text: "Framework: LP Engine", color: SL }] },
                { cells: [{ text: "Hardening de APIs REST — Checklist" }, { text: "Engenharia", color: TL }, { text: "Padrão: API Standard", color: SL }] },
              ],
            },
          ],
        };

      case "flow":
        return {
          title: "Tavir Flow",
          sub: "Módulo a definir.",
          source: "módulo",
          metrics: [],
          blocks: [
            {
              isPending: true,
              title: "Módulo",
              state: "Ainda não desenvolvido",
              text: "O escopo do Tavir Flow ainda não foi definido.",
            },
          ],
        };

      case "edicao":
        return {
          title: "Tavir Edição",
          sub: "Edição de vídeo e postagem automática.",
          source: "módulo",
          metrics: [],
          blocks: [
            {
              isPending: true,
              title: "Módulo",
              state: "Ainda não desenvolvido",
              text: "O Tavir Edição está no menu, mas a tela ainda não foi criada. A integração com outro módulo será avaliada depois.",
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
