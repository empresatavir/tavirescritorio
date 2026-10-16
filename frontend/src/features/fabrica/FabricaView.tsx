import { createSignal, createMemo, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { showToast } from "../../state/store";

interface FabProject {
  id: string;
  es: "lp-c" | "lp-m" | "of-c" | "of-m" | "sy-c" | "sy-m";
  name: string;
  company: string;
  stagesDone: number;
  totalStages: number;
  status: "running" | "paused" | "done";
  repo?: string;
  deploy?: string;
  stack?: string;
  goal?: string;
  audience?: string;
  scope?: string[];
  pend: Array<{
    id: string;
    kind: "auth" | "error" | "decision";
    title: string;
    from: string;
    text: string;
    cause?: string;
    fix?: string;
    options?: string[];
  }>;
  kanban: Array<{
    title: string;
    column: "backlog" | "doing" | "review" | "done";
    mesa: string;
  }>;
  files: Array<{
    kind: "img" | "html" | "text";
    name: string;
    mesa: string;
  }>;
  keys: Record<string, string>;
  log: Array<[string, string, string]>;
}

const ESTEIRAS = {
  "lp-c": {
    cat: "lp",
    mode: "c",
    title: "TAVIR Fábrica · LPs · Criação",
    desc: "Esteira completa para criar uma Landing Page nova a partir de uma demanda aprovada: descoberta, requisitos, prova visual, comercial, extração, estratégia, construção, QA, SEO, segurança e documentação.",
    mesas: ["Dora Descoberta", "Marina + Yuri · Prova Visual", "Comercial TAVIR", "Enzo Extrator", "Bianca Estrategista", "Diego Desenvolvedor", "QA E2E", "Nina SEO", "Auditor Seg/LGPD", "Dante Documentação"],
    stages: [
      "Gate 0 · Demanda e briefing", "Requisitos verificáveis", "Aprovação dos requisitos",
      "Prova visual · tokens e esqueleto", "Aprovação da prova visual", "Orçamento, deploy e contrato",
      "Gate de contratação", "Fase 1 · Extração técnica", "Gate Fase 1", "Fase 2 · Estratégia e plano",
      "Gate Fase 2", "Fase 3 · Construção", "QA independente", "SEO", "Segurança e LGPD", "Documentação e handoff"
    ],
  },
  "lp-m": {
    cat: "lp",
    mode: "m",
    title: "TAVIR Fábrica · LPs · Manutenção",
    desc: "Esteira para diagnosticar, alterar e evoluir uma Landing Page existente com controle de impacto, regressão, SEO, segurança e documentação.",
    mesas: ["Dora Descoberta", "Enzo Extrator", "Bianca Estrategista", "Marina + Yuri", "Diego Desenvolvedor", "QA E2E", "Nina SEO", "Dante Documentação"],
    stages: [
      "Gate 0 · Pedido de manutenção", "Diagnóstico, baseline e impacto", "Inventário da LP existente",
      "Plano de alteração e rollback", "Prova visual condicional", "Aprovação do plano",
      "Implementação controlada", "QA independente e regressão", "SEO de manutenção", "Segurança e LGPD", "Aprovação final"
    ],
  },
  "of-c": {
    cat: "of",
    mode: "c",
    title: "TAVIR Fábrica · Ofertas · Criação",
    desc: "Esteira interna para criar uma oferta nova a partir de evidência de público e problema, viável e documentada.",
    mesas: ["Dora Descoberta", "Gael Growth", "Priscila Preços", "Jussara Jurídico", "QA de Oferta", "Dante Documentação"],
    stages: ["Gate 0 · Demanda", "Público e dor", "Promessa e pacote", "Viabilidade e preço", "Gate orçável", "Claims e contrato", "Piloto de mesa", "Aprovação final"],
  },
  "of-m": {
    cat: "of",
    mode: "m",
    title: "TAVIR Fábrica · Ofertas · Manutenção",
    desc: "Esteira para revisar uma oferta existente com base em evidências, capacidade e concorrência.",
    mesas: ["Dora Descoberta", "Gael Growth", "Priscila Preços", "QA de Oferta", "Dante Documentação"],
    stages: ["Gate 0 · Revisão", "Baseline atual", "Revisão mecanismo", "Revisão preço", "Versionamento", "Aprovação final"],
  },
  "sy-c": {
    cat: "sy",
    mode: "c",
    title: "TAVIR Fábrica · Sistemas · Criação",
    desc: "Esteira geral para criar sistemas, SaaS, CRMs, APIs, automações e ferramentas internas com requisitos verificáveis, arquitetura e QA.",
    mesas: ["Dora Descoberta", "Ari Arquiteto", "Marina + Yuri", "Diego Sistemas", "QA de Sistemas", "Auditor Seg/LGPD", "Dante Documentação"],
    stages: [
      "Gate 0 · Demanda", "Requisitos verificáveis", "Aprovação requisitos", "Arquitetura e dados",
      "Prova visual e onboarding", "Gate de contratação", "Construção e integração", "QA independente E2E",
      "Segurança e LGPD", "Documentação e handoff"
    ],
  },
  "sy-m": {
    cat: "sy",
    mode: "m",
    title: "TAVIR Fábrica · Sistemas · Manutenção",
    desc: "Esteira para corrigir, atualizar, migrar ou evoluir um sistema existente com diagnóstico, impacto, rollback e QA.",
    mesas: ["Dora Descoberta", "Ari Arquiteto", "Diego Sistemas", "QA de Sistemas", "Dante Documentação"],
    stages: ["Gate 0 · Pedido", "Diagnóstico técnico", "Plano de manutenção", "Implementação", "QA regressão", "Handoff e homologação"],
  },
};

const INITIAL_PROJECTS: FabProject[] = [
  {
    id: "fp-1",
    es: "lp-c",
    name: "Landing Meridian Capital",
    company: "Meridian Capital",
    stagesDone: 8,
    totalStages: 16,
    status: "running",
    repo: "tavir/meridian-landing",
    deploy: "Vercel",
    goal: "Captação de investidores para o novo fundo",
    audience: "Investidores qualificados",
    scope: ["Landing de captação com 5 seções", "Área de materiais para investidores", "Formulário integrado ao CRM"],
    pend: [
      {
        id: "a1",
        kind: "auth",
        title: "Gate Fase 1 · liberar a Fase 2",
        from: "Enzo Extrator",
        text: "A extração técnica terminou: 5 seções, 42 textos e 18 imagens inventariados. A Fase 2 (estratégia e plano) só começa com a sua autorização.",
      },
      {
        id: "e1",
        kind: "error",
        title: "Build de preview falhou",
        from: "Diego Desenvolvedor",
        text: "O deploy de preview parou porque a variável SUPABASE_URL não existe na conta vercel · tavir.",
        cause: "configuração: variável não cadastrada ao travar a conta do projeto.",
        fix: "cadastrar SUPABASE_URL em Acessos e refazer o preview.",
      },
    ],
    kanban: [
      { title: "Hero com prova social", column: "done", mesa: "Diego Desenvolvedor" },
      { title: "Seção de tese do fundo", column: "review", mesa: "Bianca Estrategista" },
      { title: "Formulário de interesse", column: "doing", mesa: "Diego Desenvolvedor" },
      { title: "Área de materiais", column: "backlog", mesa: "Diego Desenvolvedor" },
      { title: "Política de privacidade", column: "backlog", mesa: "Auditor Seg/LGPD" },
    ],
    files: [
      { kind: "img", name: "Hero · versão A", mesa: "Marina + Yuri" },
      { kind: "img", name: "Hero · versão B", mesa: "Marina + Yuri" },
      { kind: "html", name: "index.html · prova visual", mesa: "Marina + Yuri" },
      { kind: "text", name: "Textos da landing (42)", mesa: "Enzo Extrator" },
      { kind: "html", name: "tokens.css", mesa: "Marina + Yuri" },
    ],
    keys: { github: "ghp_••••••••••••7Qa2", deploy: "vercel_••••••••••••c81d" },
    log: [
      ["24/09 10:00", "Dora Descoberta", "Gate 0 aprovado"],
      ["24/09 16:20", "Dora Descoberta", "Requisitos aprovados por você"],
      ["25/09 11:00", "Marina + Yuri", "Prova visual aprovada"],
      ["26/09 09:30", "Comercial TAVIR", "Contrato assinado"],
      ["28/09 13:35", "Diego Desenvolvedor", "Erro: SUPABASE_URL ausente no preview"],
      ["28/09 14:10", "Enzo Extrator", "Extração técnica concluída · aguardando Gate Fase 1"],
    ],
  },
  {
    id: "fp-2",
    es: "sy-c",
    name: "Portal de Clientes Atlas",
    company: "Atlas Holdings",
    stagesDone: 3,
    totalStages: 10,
    status: "running",
    repo: "tavir/atlas-portal",
    deploy: "Vercel",
    stack: "Next.js + Supabase + Stripe",
    scope: ["Login de clientes", "Painel de contratos e faturas", "Upload de documentos"],
    pend: [
      {
        id: "d1",
        kind: "decision",
        title: "Banco de dados do portal",
        from: "Ari Arquiteto",
        text: "Para o volume previsto (2 mil clientes), recomendo Postgres gerenciado no Supabase.",
        options: ["Supabase Postgres", "Banco do CRM atual"],
      },
    ],
    kanban: [
      { title: "Modelo de dados", column: "doing", mesa: "Ari Arquiteto" },
      { title: "Fluxo de login", column: "backlog", mesa: "Diego Sistemas" },
    ],
    files: [
      { kind: "text", name: "Requisitos verificáveis v2", mesa: "Dora Descoberta" },
      { kind: "img", name: "Diagrama de arquitetura", mesa: "Ari Arquiteto" },
    ],
    keys: { github: "ghp_••••••••••••2Lk9" },
    log: [
      ["26/09 09:00", "Dora Descoberta", "Gate 0 aprovado"],
      ["27/09 15:00", "Dora Descoberta", "Requisitos aprovados por você"],
      ["28/09 10:40", "Ari Arquiteto", "Decisão pendente: banco de dados"],
    ],
  },
  {
    id: "fp-3",
    es: "of-c",
    name: "Oferta Diagnóstico de Dados",
    company: "TAVIR · Datavir",
    stagesDone: 2,
    totalStages: 8,
    status: "paused",
    scope: ["Diagnóstico de dados em 2 semanas", "Relatório executivo"],
    pend: [],
    kanban: [
      { title: "Pesquisa de público", column: "done", mesa: "Gael Growth" },
      { title: "Faixas de preço", column: "doing", mesa: "Priscila Preços" },
    ],
    files: [{ kind: "text", name: "Mapa de dores do público", mesa: "Gael Growth" }],
    keys: {},
    log: [
      ["25/09 11:00", "Dora Descoberta", "Gate 0 aprovado"],
      ["27/09 18:00", "Você", "Esteira pausada"],
    ],
  },
  {
    id: "fp-4",
    es: "lp-m",
    name: "LP Nicho Advocacia",
    company: "Nicho Advocacia",
    stagesDone: 7,
    totalStages: 11,
    status: "running",
    repo: "tavir/lp-advocacia",
    deploy: "Netlify",
    pend: [
      {
        id: "a2",
        kind: "auth",
        title: "Aprovar QA de regressão",
        from: "QA E2E",
        text: "A implementação passou em 38 de 38 testes de regressão. Autorize para seguir com SEO de manutenção.",
      },
    ],
    kanban: [
      { title: "Trocar headline", column: "done", mesa: "Diego Desenvolvedor" },
      { title: "Ajustar formulário", column: "done", mesa: "Diego Desenvolvedor" },
    ],
    files: [
      { kind: "html", name: "index.html · v2", mesa: "Diego Desenvolvedor" },
      { kind: "text", name: "Changelog", mesa: "Dante Documentação" },
    ],
    keys: { github: "ghp_••••••••••••9Hc4", deploy: "nfp_••••••••••••3a7e" },
    log: [
      ["27/09 10:00", "Dora Descoberta", "Pedido de manutenção autorizado"],
      ["28/09 12:10", "QA E2E", "Regressão 38/38 · aguardando sua autorização"],
    ],
  },
  {
    id: "fp-5",
    es: "sy-m",
    name: "CRM interno TAVIR",
    company: "TAVIR",
    stagesDone: 6,
    totalStages: 6,
    status: "done",
    repo: "tavir/crm",
    deploy: "Vercel",
    pend: [],
    kanban: [],
    files: [],
    keys: {},
    log: [["20/09 17:00", "Dante Documentação", "Manutenção concluída e documentada"]],
  },
];

export function FabricaView() {
  const [projects, setProjects] = createSignal<FabProject[]>(INITIAL_PROJECTS);
  const [selectedEsteiraId, setSelectedEsteiraId] = createSignal<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = createSignal<string | null>(null);
  const [projectTab, setProjectTab] = createSignal<"overview" | "kanban" | "roadmap" | "docs" | "files" | "keys">("overview");
  const [activeDoc, setActiveDoc] = createSignal<{ title: string; meta: string; body: string } | null>(null);
  const [chatOpen, setChatOpen] = createSignal<boolean>(false);
  const [chatInput, setChatInput] = createChatInput();

  function createChatInput() {
    return createSignal("");
  }

  const currentEsteira = createMemo(() => {
    const id = selectedEsteiraId();
    if (!id || !(id in ESTEIRAS)) return null;
    return ESTEIRAS[id as keyof typeof ESTEIRAS];
  });

  const currentProject = createMemo(() => {
    const id = selectedProjectId();
    if (!id) return null;
    return projects().find((p) => p.id === id) || null;
  });

  const handleSimulateStage = () => {
    const pj = currentProject();
    if (!pj) return;
    if (pj.stagesDone < pj.totalStages) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === pj.id
            ? {
                ...p,
                stagesDone: p.stagesDone + 1,
                log: [
                  [new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "Orquestrador", `Etapa ${p.stagesDone + 1} concluída com sucesso`],
                  ...p.log,
                ],
              }
            : p
        )
      );
      showToast("Etapa simulada e avançada no pipeline", "Fábrica", "success");
    }
  };

  const handleResolvePend = (projId: string, pendId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projId ? { ...p, pend: p.pend.filter((x) => x.id !== pendId) } : p
      )
    );
    showToast("Pendência resolvida", "Autorização confirmada", "success");
  };

  return (
    <div
      data-screen-label="Tavir Fábrica"
      style={{
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      {/* 1. VISÃO GERAL DE TODAS AS ESTEIRAS E PROJETOS */}
      <Show when={!selectedEsteiraId() && !selectedProjectId()}>
        <div style={{ "max-width": "1280px", padding: "20px 24px 40px", display: "flex", "flex-direction": "column", gap: "28px" }}>
          <div style={{ display: "flex", "align-items": "flex-end", gap: "12px", "flex-wrap": "wrap" }}>
            <div style={{ flex: "1", "min-width": "260px" }}>
              <div style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
                Módulos · Tavir Fábrica
              </div>
              <h1 style={{ margin: "4px 0 0", "font-size": "22px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
                Esteiras de desenvolvimento
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
                Esteiras com gates humanos obrigatórios, mesas especializadas e controle de entrega.
              </p>
            </div>
          </div>

          {/* Grid de Esteiras */}
          <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(360px, 1fr))", gap: "14px" }}>
            {Object.entries(ESTEIRAS).map(([key, es]) => {
              const count = projects().filter((p) => p.es === key).length;

              return (
                <button
                  type="button"
                  onClick={() => setSelectedEsteiraId(key)}
                  style={{
                    "text-align": "left",
                    padding: "18px",
                    "border-radius": "18px",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                    background: "var(--surface-1, #0f1729)",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                    <span
                      style={{
                        "font-family": "var(--font-mono)",
                        "font-size": "10px",
                        "letter-spacing": "0.1em",
                        "text-transform": "uppercase",
                        padding: "2px 8px",
                        "border-radius": "999px",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                        color: "var(--text-secondary, #cbd3de)",
                      }}
                    >
                      {es.mode === "c" ? "Criação" : "Manutenção"}
                    </span>
                    <span style={{ flex: "1" }}></span>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--teal, #1BC5BD)" }}>
                      {count} {count === 1 ? "projeto" : "projetos"}
                    </span>
                  </div>

                  <div style={{ "font-size": "16px", "font-weight": "600" }}>{es.title}</div>
                  <div style={{ "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "line-height": "1.5" }}>
                    {es.desc}
                  </div>

                  <div style={{ display: "flex", "align-items": "center", gap: "10px", "margin-top": "6px", "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                    <span>{es.stages.length} etapas no pipeline</span>
                    <span>·</span>
                    <span>{es.mesas.length} mesas</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Projetos em Andamento */}
          <div>
            <h2 style={{ "font-size": "16px", "font-weight": "600", "margin-bottom": "14px" }}>
              Projetos em andamento na Fábrica
            </h2>
            <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              <For each={projects()}>
                {(pj) => {
                  const pct = Math.round((pj.stagesDone / pj.totalStages) * 100);
                  const statusColor = pj.status === "running" ? "var(--teal, #1BC5BD)" : pj.status === "paused" ? "var(--flow, oklch(.80 .155 78))" : "var(--text-muted)";

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEsteiraId(pj.es);
                        setSelectedProjectId(pj.id);
                      }}
                      style={{
                        "text-align": "left",
                        padding: "16px",
                        "border-radius": "18px",
                        border: pj.pend.length > 0 ? "1px solid var(--flow, oklch(.80 .155 78 / .45))" : "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                        background: "var(--surface-1, #0f1729)",
                        color: "var(--text-primary, #F4F6F2)",
                        cursor: "pointer",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                        <span
                          style={{
                            "font-family": "var(--font-mono)",
                            "font-size": "10px",
                            "letter-spacing": "0.1em",
                            "text-transform": "uppercase",
                            padding: "2px 8px",
                            "border-radius": "999px",
                            border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                            color: "var(--text-secondary, #cbd3de)",
                          }}
                        >
                          {pj.es.toUpperCase()}
                        </span>
                        <span style={{ flex: "1" }}></span>
                        <span style={{ display: "flex", "align-items": "center", gap: "5px", "font-size": "11px", color: statusColor }}>
                          <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: statusColor }}></span>
                          {pj.status === "running" ? "Em andamento" : pj.status === "paused" ? "Pausado" : "Concluído"}
                        </span>
                      </div>

                      <div>
                        <div style={{ "font-size": "16px", "font-weight": "600", "line-height": "1.3" }}>{pj.name}</div>
                        <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "margin-top": "2px" }}>{pj.company}</div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                        <div style={{ flex: "1", height: "6px", "border-radius": "999px", background: "rgba(244,246,242,.1)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal, #1BC5BD)", "border-radius": "999px" }}></div>
                        </div>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "12px" }}>{pct}%</span>
                      </div>

                      <div style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "12px", color: "var(--text-secondary, #cbd3de)" }}>
                        <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", flex: "1" }}>
                          etapa {pj.stagesDone} de {pj.totalStages}
                        </span>
                        <Show when={pj.pend.length > 0}>
                          <span style={{ color: "var(--flow, oklch(.80 .155 78))", "white-space": "nowrap", "font-weight": "500" }}>
                            {pj.pend.length} {pj.pend.length === 1 ? "pendência" : "pendências"}
                          </span>
                        </Show>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* 2. VISÃO DA ESTEIRA ESPECÍFICA */}
      <Show when={!selectedProjectId() ? currentEsteira() : null}>
        {(es) => (
          <div style={{ "max-width": "1400px", padding: "16px 24px 40px", display: "flex", "flex-direction": "column", gap: "20px" }}>
            <div style={{ display: "flex", "align-items": "flex-start", gap: "12px", "flex-wrap": "wrap" }}>
              <button
                type="button"
                onClick={() => setSelectedEsteiraId(null)}
                aria-label="Voltar"
                style={{
                  height: "32px",
                  width: "32px",
                  padding: "0",
                  "border-radius": "999px",
                  border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                  background: "transparent",
                  color: "var(--text-primary, #F4F6F2)",
                  cursor: "pointer",
                  display: "inline-flex",
                  "align-items": "center",
                  "justify-content": "center",
                }}
              >
                <TvIcon name="arrow-left" style={{ width: "14px", height: "14px" }} />
              </button>
              <div style={{ flex: "1", "min-width": "280px" }}>
                <h1 style={{ margin: "0", "font-size": "22px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
                  {es().title}
                </h1>
                <p style={{ margin: "6px 0 0", color: "var(--text-secondary, #cbd3de)", "line-height": "1.55", "max-width": "860px" }}>
                  {es().desc}
                </p>
              </div>
            </div>

            {/* Stages Pipeline Horizontal */}
            <div style={{ padding: "16px", "border-radius": "14px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-1, #0f1729)", "overflow-x": "auto" }}>
              <div style={{ display: "flex", gap: "0", "min-width": "max-content" }}>
                <For each={es().stages}>
                  {(stg, idx) => {
                    const isGate = stg.toLowerCase().includes("gate") || stg.toLowerCase().includes("aprova");

                    return (
                      <div style={{ width: "118px", display: "flex", "flex-direction": "column", "align-items": "center", gap: "8px", "text-align": "center", position: "relative" }}>
                        <span style={{ position: "absolute", top: "15px", left: "0", right: "0", height: "1px", background: "rgba(244,246,242,.12)" }}></span>
                        <span
                          style={{
                            position: "relative",
                            width: "30px",
                            height: "30px",
                            "border-radius": "50%",
                            display: "flex",
                            "align-items": "center",
                            "justify-content": "center",
                            "font-family": "var(--font-mono)",
                            "font-size": "12px",
                            border: isGate ? "1px solid var(--flow, oklch(.80 .155 78))" : "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                            background: "var(--surface-0, #0B1220)",
                            color: isGate ? "var(--flow, oklch(.80 .155 78))" : "var(--text-primary)",
                          }}
                        >
                          {String(idx() + 1).padStart(2, "0")}
                        </span>
                        <span style={{ "font-size": "11px", "line-height": "1.35", color: "var(--text-secondary, #cbd3de)", padding: "0 6px" }}>
                          {stg}
                        </span>
                        <Show when={isGate}>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "9px", "letter-spacing": "0.08em", "text-transform": "uppercase", color: "var(--flow, oklch(.80 .155 78))" }}>
                            gate humano
                          </span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* Mesas de Trabalho */}
            <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
                Mesas de trabalho
              </span>
              <div style={{ display: "flex", "flex-wrap": "wrap", gap: "8px" }}>
                <For each={es().mesas}>
                  {(mesa) => (
                    <span
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "8px",
                        padding: "6px 12px 6px 6px",
                        "border-radius": "999px",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                        background: "var(--surface-1, #0f1729)",
                        "font-size": "13px",
                      }}
                    >
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          "border-radius": "8px",
                          flex: "none",
                          display: "flex",
                          "align-items": "center",
                          "justify-content": "center",
                          "font-size": "10px",
                          "font-weight": "700",
                          color: "var(--ink, #0B1220)",
                          background: "var(--lime, #B7F34A)",
                        }}
                      >
                        {mesa.slice(0, 2).toUpperCase()}
                      </span>
                      {mesa}
                    </span>
                  )}
                </For>
              </div>
            </div>

            {/* Projetos desta esteira */}
            <div style={{ display: "flex", "flex-direction": "column", gap: "12px", "margin-top": "10px" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": "500", "letter-spacing": "0.14em", "text-transform": "uppercase", color: "var(--text-muted, #aeb7c4)" }}>
                    Projetos nesta esteira
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                <For each={projects().filter((p) => p.es === selectedEsteiraId())}>
                  {(pj) => {
                    const pct = Math.round((pj.stagesDone / pj.totalStages) * 100);

                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedProjectId(pj.id)}
                        style={{
                          "text-align": "left",
                          padding: "16px",
                          "border-radius": "18px",
                          border: pj.pend.length > 0 ? "1px solid var(--flow, oklch(.80 .155 78 / .45))" : "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                          background: "var(--surface-1, #0f1729)",
                          color: "var(--text-primary, #F4F6F2)",
                          cursor: "pointer",
                          display: "flex",
                          "flex-direction": "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ "font-size": "16px", "font-weight": "600" }}>{pj.name}</div>
                        <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>{pj.company}</div>
                        <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                          <div style={{ flex: "1", height: "6px", "border-radius": "999px", background: "rgba(244,246,242,.1)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal, #1BC5BD)", "border-radius": "999px" }}></div>
                          </div>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "12px" }}>{pct}%</span>
                        </div>
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* 3. VISÃO DO PROJETO ESPECÍFICO */}
      <Show when={currentProject()}>
        {(pj) => {
          const pct = Math.round((pj().stagesDone / pj().totalStages) * 100);

          return (
            <div style={{ "max-width": "1440px", padding: "16px 24px 40px", display: "flex", "flex-direction": "column", gap: "18px" }}>
              {/* Header do Projeto */}
              <div style={{ display: "flex", "align-items": "center", gap: "12px", "flex-wrap": "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  aria-label="Voltar à esteira"
                  style={{
                    height: "32px",
                    width: "32px",
                    padding: "0",
                    "border-radius": "999px",
                    border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                    background: "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    display: "inline-flex",
                    "align-items": "center",
                    "justify-content": "center",
                  }}
                >
                  <TvIcon name="arrow-left" style={{ width: "14px", height: "14px" }} />
                </button>

                <div style={{ flex: "1 1 320px", "min-width": "260px" }}>
                  <div style={{ display: "flex", "align-items": "center", gap: "8px", "flex-wrap": "wrap" }}>
                    <span style={{ "font-size": "20px", "font-weight": "600" }}>{pj().name}</span>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "10px", "letter-spacing": "0.1em", "text-transform": "uppercase", padding: "2px 8px", "border-radius": "999px", border: "1px solid var(--border-subtle, rgba(244,246,242,.16))", color: "var(--text-secondary, #cbd3de)" }}>
                      {pj().es.toUpperCase()}
                    </span>
                    <span style={{ "font-size": "12px", color: pj().status === "running" ? "var(--teal, #1BC5BD)" : "var(--flow, oklch(.80 .155 78))" }}>
                      ● {pj().status === "running" ? "Em andamento" : pj().status}
                    </span>
                  </div>
                  <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "margin-top": "2px" }}>
                    {pj().company} · etapa atual: {pj().stagesDone} de {pj().totalStages}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", "align-items": "center", gap: "10px", "min-width": "220px" }}>
                  <div style={{ flex: "1", height: "8px", "border-radius": "999px", background: "rgba(244,246,242,.1)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal, #1BC5BD)", "border-radius": "999px" }}></div>
                  </div>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "14px" }}>{pct}%</span>
                </div>

                {/* Ações */}
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  style={{
                    height: "32px",
                    padding: "0 12px",
                    "border-radius": "999px",
                    border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                    background: "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    "font-size": "12px",
                    "font-weight": "500",
                    display: "inline-flex",
                    "align-items": "center",
                    gap: "6px",
                  }}
                >
                  <TvIcon name="message-square" style={{ width: "13px", height: "13px" }} />
                  Chat do projeto
                </button>
              </div>

              {/* Tabs do Projeto */}
              <div
                style={{
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "2px",
                  padding: "2px",
                  background: "var(--surface-0, #0B1220)",
                  border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                  "border-radius": "999px",
                  width: "max-content",
                  "max-width": "100%",
                }}
              >
                {[
                  ["overview", "Visão geral"],
                  ["kanban", "Kanban"],
                  ["roadmap", "Roadmap"],
                  ["docs", "Documentos"],
                  ["files", "Arquivos"],
                  ["keys", "Acessos"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    onClick={() => setProjectTab(id as any)}
                    style={{
                      height: "28px",
                      padding: "0 12px",
                      border: "none",
                      "border-radius": "999px",
                      cursor: "pointer",
                      "font-size": "12px",
                      "font-weight": "500",
                      background: projectTab() === id ? "var(--teal, #1BC5BD)" : "transparent",
                      color: projectTab() === id ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* TAB 1: VISÃO GERAL */}
              <Show when={projectTab() === "overview"}>
                <div style={{ display: "grid", "grid-template-columns": "minmax(0, 1.4fr) minmax(320px, 1fr)", gap: "16px", "align-items": "start" }}>
                  {/* Esteira passo a passo */}
                  <section style={{ border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)", display: "flex", "flex-direction": "column", overflow: "hidden" }}>
                    <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "12px 16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                      <span style={{ "font-weight": "600", flex: "1" }}>Esteira passo a passo</span>
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                        {pj().stagesDone} de {pj().totalStages}
                      </span>
                    </div>

                    <div style={{ "max-height": "460px", "overflow-y": "auto" }}>
                      {((ESTEIRAS as Record<string, any>)[pj().es]?.stages || []).map((stg: string, i: number) => {
                        const isDone = i < pj().stagesDone;
                        const isCurrent = i === pj().stagesDone;
                        const esteira = (ESTEIRAS as Record<string, any>)[pj().es];

                        return (
                          <div
                            style={{
                              display: "grid",
                              "grid-template-columns": "30px minmax(0, 1fr) auto",
                              gap: "12px",
                              "align-items": "center",
                              padding: "10px 16px",
                              "border-bottom": "1px solid rgba(244,246,242,.08)",
                              background: isCurrent ? "rgba(27,197,189,.08)" : "transparent",
                            }}
                          >
                            <span
                              style={{
                                width: "26px",
                                height: "26px",
                                "border-radius": "50%",
                                display: "flex",
                                "align-items": "center",
                                "justify-content": "center",
                                "font-family": "var(--font-mono)",
                                "font-size": "11px",
                                border: isDone ? "1px solid var(--teal, #1BC5BD)" : isCurrent ? "1px solid var(--flow, oklch(.80 .155 78))" : "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                                background: isDone ? "var(--teal, #1BC5BD)" : "transparent",
                                color: isDone ? "var(--ink, #0B1220)" : "var(--text-primary)",
                              }}
                            >
                              {isDone ? "✓" : String(i + 1).padStart(2, "0")}
                            </span>
                            <div style={{ "min-width": "0" }}>
                              <div style={{ "font-weight": isCurrent ? "600" : "400", "font-size": "13px" }}>{stg}</div>
                              <div style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)", "margin-top": "2px" }}>
                                {esteira ? esteira.mesas[i % esteira.mesas.length] : ""}
                              </div>
                            </div>
                            <span style={{ "font-size": "11px", color: isDone ? "var(--teal, #1BC5BD)" : isCurrent ? "var(--flow, oklch(.80 .155 78))" : "var(--text-muted)" }}>
                              {isDone ? "concluído" : isCurrent ? "em andamento" : "aguardando"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ padding: "12px 16px", "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                      <button
                        type="button"
                        onClick={handleSimulateStage}
                        style={{
                          height: "32px",
                          padding: "0 12px",
                          "border-radius": "999px",
                          border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                          background: "transparent",
                          color: "var(--text-primary, #F4F6F2)",
                          cursor: "pointer",
                          "font-size": "12px",
                          "font-weight": "500",
                        }}
                      >
                        Simular conclusão da etapa atual
                      </button>
                    </div>
                  </section>

                  {/* Pendências e Atividade */}
                  <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "min-width": "0" }}>
                    {/* Pendências */}
                    <section style={{ border: "1px solid var(--flow, oklch(.80 .155 78 / .45))", "border-radius": "14px", background: "oklch(.80 .155 78 / .05)", display: "flex", "flex-direction": "column", overflow: "hidden" }}>
                      <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "12px 16px", "border-bottom": "1px solid oklch(.80 .155 78 / .25)" }}>
                        <span style={{ "font-weight": "600", flex: "1" }}>Pendências</span>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--flow, oklch(.80 .155 78))" }}>
                          {pj().pend.length}
                        </span>
                      </div>

                      <For each={pj().pend}>
                        {(pd) => (
                          <div style={{ padding: "14px 16px", "border-bottom": "1px solid rgba(244,246,242,.08)", display: "flex", "flex-direction": "column", gap: "8px" }}>
                            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                              <span style={{ "font-family": "var(--font-mono)", "font-size": "10px", "letter-spacing": "0.1em", "text-transform": "uppercase", padding: "2px 8px", "border-radius": "999px", border: "1px solid var(--flow, oklch(.80 .155 78))", color: "var(--flow, oklch(.80 .155 78))" }}>
                                {pd.kind}
                              </span>
                              <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>{pd.from}</span>
                            </div>
                            <div style={{ "font-weight": "600", "font-size": "14px" }}>{pd.title}</div>
                            <div style={{ "font-size": "13px", color: "var(--text-secondary, #cbd3de)", "line-height": "1.5" }}>{pd.text}</div>
                            <Show when={pd.cause}>
                              <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                                Causa: {pd.cause} · Resolução: {pd.fix}
                              </div>
                            </Show>
                            <div style={{ display: "flex", gap: "6px", "margin-top": "4px" }}>
                              <button
                                type="button"
                                onClick={() => handleResolvePend(pj().id, pd.id)}
                                style={{
                                  height: "30px",
                                  padding: "0 14px",
                                  "border-radius": "999px",
                                  border: "none",
                                  background: "var(--lime, #B7F34A)",
                                  color: "var(--ink-panel, #25360a)",
                                  "font-size": "12px",
                                  "font-weight": "600",
                                  cursor: "pointer",
                                }}
                              >
                                Autorizar / Resolver
                              </button>
                            </div>
                          </div>
                        )}
                      </For>

                      <Show when={pj().pend.length === 0}>
                        <div style={{ padding: "16px", "font-size": "13px", color: "var(--text-muted, #aeb7c4)" }}>
                          Nenhuma autorização ou pendência no momento.
                        </div>
                      </Show>
                    </section>

                    {/* Log de Atividade */}
                    <section style={{ border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)", display: "flex", "flex-direction": "column", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))", "font-weight": "600" }}>
                        Atividade recente
                      </div>
                      <div style={{ "max-height": "220px", "overflow-y": "auto", padding: "8px 16px", "font-family": "var(--font-mono)", "font-size": "12px", "line-height": "1.7" }}>
                        <For each={pj().log}>
                          {([time, who, what]) => (
                            <div style={{ display: "grid", "grid-template-columns": "82px 130px minmax(0, 1fr)", gap: "10px" }}>
                              <span style={{ color: "var(--text-muted)" }}>{time}</span>
                              <span style={{ color: "var(--teal, #1BC5BD)", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{who}</span>
                              <span style={{ color: "var(--text-secondary)" }}>{what}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </section>
                  </div>
                </div>
              </Show>

              {/* TAB 2: KANBAN */}
              <Show when={projectTab() === "kanban"}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(4, minmax(220px, 1fr))", gap: "12px", "overflow-x": "auto" }}>
                  {(["backlog", "doing", "review", "done"] as const).map((col) => {
                    const colItems = () => pj().kanban.filter((k: { column: string }) => k.column === col);
                    const label = col === "backlog" ? "Backlog" : col === "doing" ? "Em andamento" : col === "review" ? "Em revisão" : "Concluído";

                    return (
                      <div style={{ padding: "12px", "border-radius": "14px", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", display: "flex", "flex-direction": "column", gap: "8px", "min-height": "340px" }}>
                        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                          <span style={{ "font-weight": "600", flex: "1" }}>{label}</span>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted)" }}>{colItems().length}</span>
                        </div>
                        <For each={colItems()}>
                          {(item) => (
                            <div style={{ padding: "10px", "border-radius": "8px", background: "var(--surface-2, #121c30)", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", display: "flex", "flex-direction": "column", gap: "4px" }}>
                              <span style={{ "font-size": "13px", "line-height": "1.4" }}>{item.title}</span>
                              <span style={{ "font-size": "11px", color: "var(--text-muted)" }}>{item.mesa}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    );
                  })}
                </div>
              </Show>

              {/* TAB 3: ROADMAP */}
              <Show when={projectTab() === "roadmap"}>
                <div style={{ border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", "border-radius": "14px", background: "var(--surface-1, #0f1729)", padding: "16px", "overflow-x": "auto" }}>
                  <div style={{ "min-width": "720px", display: "flex", "flex-direction": "column", gap: "10px" }}>
                    <div style={{ display: "grid", "grid-template-columns": "200px repeat(8, 1fr)", "border-bottom": "1px solid rgba(244,246,242,.10)", padding: "8px 0", "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-muted)" }}>
                      <span>Fase</span>
                      {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((s) => (
                        <span style={{ "text-align": "center" }}>{s}</span>
                      ))}
                    </div>
                    {[
                      ["Descoberta e briefing", "S1", "S2", "var(--teal, #1BC5BD)"],
                      ["Prova visual e requisitos", "S2", "S4", "var(--teal, #1BC5BD)"],
                      ["Construção e desenvolvimento", "S4", "S6", "var(--lime, #B7F34A)"],
                      ["QA e auditoria", "S6", "S7", "var(--flow, oklch(.80 .155 78))"],
                      ["Handoff e deploy", "S7", "S8", "var(--slate, #cbd3de)"],
                    ].map(([phase, _start, _end, color]) => (
                      <div style={{ display: "grid", "grid-template-columns": "200px repeat(8, 1fr)", "align-items": "center", padding: "8px 0", "font-size": "13px" }}>
                        <span>{phase}</span>
                        <div style={{ "grid-column": "2 / 6", height: "14px", "border-radius": "999px", background: color, opacity: 0.85 }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </Show>

              {/* TAB 4: DOCUMENTOS */}
              <Show when={projectTab() === "docs"}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                  {[
                    ["disc", "Documento de Descoberta", "Contexto, objetivo, público e restrições levantados pela Dora Descoberta."],
                    ["arch", "Documento de Arquitetura", "Stack, dados, integrações e decisões técnicas registradas."],
                    ["ka", "Log KA (Decisões)", "Registro contínuo de conhecimento e decisões ao longo da esteira."],
                    ["sec", "Auditoria de Segurança", "Onde há e onde ainda não há QA, com achados por área."],
                    ["doc", "Documentação criada", "README, guia de operação, changelog e handoff."],
                    ["scope", "Escopo do projeto", "Escopo positivo e negativo aprovado."],
                  ].map(([_id, title, desc]) => (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDoc({
                          title,
                          meta: `${pj().name} · ${pj().company}`,
                          body: `# ${title}\n\n${desc}\n\nDocumento gerado e mantido pela esteira ${pj().es.toUpperCase()}. Todas as revisões possuem rastreabilidade de autor e data.`,
                        })
                      }
                      style={{
                        "text-align": "left",
                        padding: "16px",
                        "border-radius": "14px",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                        background: "var(--surface-1, #0f1729)",
                        color: "var(--text-primary, #F4F6F2)",
                        cursor: "pointer",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                        <TvIcon name="file-search" style={{ width: "16px", height: "16px", color: "var(--teal, #1BC5BD)" }} />
                        <span style={{ "font-weight": "600", flex: "1" }}>{title}</span>
                      </div>
                      <span style={{ "font-size": "12px", color: "var(--text-secondary, #cbd3de)", "line-height": "1.5" }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </Show>

              {/* TAB 5: ARQUIVOS */}
              <Show when={projectTab() === "files"}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                  <For each={pj().files}>
                    {(fl) => (
                      <div style={{ "border-radius": "14px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-1, #0f1729)", overflow: "hidden", display: "flex", "flex-direction": "column" }}>
                        <div style={{ height: "100px", background: "repeating-linear-gradient(135deg,#17223a 0 10px,#1d2942 10px 20px)", display: "flex", "align-items": "center", "justify-content": "center" }}>
                          <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "var(--text-secondary)", background: "var(--surface-0)", padding: "3px 8px", "border-radius": "6px" }}>
                            {fl.kind.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ "font-size": "13px", "font-weight": "500", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{fl.name}</div>
                          <div style={{ "font-size": "11px", color: "var(--text-muted)", "margin-top": "2px" }}>{fl.mesa}</div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* TAB 6: ACESSOS */}
              <Show when={projectTab() === "keys"}>
                <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                  {Object.entries(pj().keys).map(([service, key]) => (
                    <div style={{ padding: "16px", "border-radius": "14px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-1, #0f1729)", display: "flex", "flex-direction": "column", gap: "10px" }}>
                      <div style={{ "font-weight": "600", "font-size": "14px" }}>Acesso: {service.toUpperCase()}</div>
                      <div style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-secondary)" }}>Chave: {String(key)}</div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => showToast(`Acesso a ${service} testado e conectado com sucesso`, "Acessos", "success")}
                          style={{
                            height: "28px",
                            padding: "0 10px",
                            "border-radius": "999px",
                            border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                            background: "transparent",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            "font-size": "12px",
                          }}
                        >
                          Testar acesso
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Show>
            </div>
          );
        }}
      </Show>

      {/* Modal Dialog de Visualização de Documento */}
      <Show when={activeDoc()}>
        {(doc) => (
          <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.62)", display: "flex", "align-items": "center", "justify-content": "center", "z-index": "100" }}>
            <div style={{ width: "860px", "max-width": "calc(100% - 32px)", "max-height": "calc(100vh - 64px)", background: "var(--surface-1, #0f1729)", border: "1px solid var(--border-light, rgba(244,246,242,.34))", "border-radius": "18px", display: "flex", "flex-direction": "column", "box-shadow": "0 24px 60px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "10px", padding: "14px 22px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                <div style={{ flex: "1", "min-width": "0" }}>
                  <div style={{ "font-weight": "600", "font-size": "16px" }}>{doc().title}</div>
                  <div style={{ "font-size": "12px", color: "var(--text-muted)" }}>{doc().meta}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDoc(null)}
                  style={{
                    height: "28px",
                    padding: "0 12px",
                    "border-radius": "999px",
                    border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    "font-size": "12px",
                  }}
                >
                  Fechar · Esc
                </button>
              </div>
              <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", padding: "20px 24px 28px", "white-space": "pre-wrap", "line-height": "1.7", "font-size": "14px", color: "var(--text-secondary)" }}>
                {doc().body}
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Lateral Sheet de Chat do Projeto */}
      <Show when={chatOpen() && currentProject()}>
        {(pj) => (
          <div style={{ position: "fixed", inset: "0", background: "rgba(7,12,22,.5)", "z-index": "90", display: "flex", "justify-content": "flex-end" }}>
            <aside style={{ width: "460px", "max-width": "100%", background: "var(--surface-1, #0f1729)", "border-left": "1px solid var(--border-subtle, rgba(244,246,242,.16))", display: "flex", "flex-direction": "column", "box-shadow": "-20px 0 40px rgba(0,0,0,.35)" }}>
              <div style={{ padding: "14px 18px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))", display: "flex", "align-items": "center", gap: "8px" }}>
                <span style={{ "font-weight": "600", flex: "1" }}>Chat · {pj().name}</span>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  style={{
                    height: "28px",
                    padding: "0 10px",
                    "border-radius": "999px",
                    border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    "font-size": "12px",
                  }}
                >
                  Fechar
                </button>
              </div>

              <div style={{ flex: "1", "min-height": "0", "overflow-y": "auto", padding: "16px 18px", display: "flex", "flex-direction": "column", gap: "12px" }}>
                <div style={{ "font-size": "13px", color: "var(--text-muted)", "line-height": "1.5" }}>
                  Faça uma solicitação específica deste projeto. A mensagem vai para a mesa da etapa atual ({pj().stagesDone} de {pj().totalStages}).
                </div>
              </div>

              <div style={{ padding: "12px 18px 16px", "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))", display: "flex", gap: "8px" }}>
                <textarea
                  value={chatInput()}
                  onInput={(e) => setChatInput(e.currentTarget.value)}
                  rows={2}
                  placeholder="Solicitação para a mesa do projeto…"
                  style={{
                    flex: "1",
                    padding: "8px 12px",
                    "border-radius": "8px",
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                    background: "var(--surface-0, #0B1220)",
                    color: "var(--text-primary)",
                    "font-size": "13px",
                    resize: "none",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (chatInput().trim()) {
                      showToast("Solicitação enviada para a mesa do projeto", "Fábrica Chat", "success");
                      setChatInput("");
                    }
                  }}
                  style={{
                    height: "36px",
                    padding: "0 14px",
                    "border-radius": "999px",
                    border: "none",
                    background: "var(--lime, #B7F34A)",
                    color: "var(--ink-panel, #25360a)",
                    "font-weight": "600",
                    cursor: "pointer",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                  }}
                >
                  <TvIcon name="send" style={{ width: "14px", height: "14px" }} />
                </button>
              </div>
            </aside>
          </div>
        )}
      </Show>
    </div>
  );
}
