import { createSignal, createMemo, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { capturedNotes, setCapturedNotes, showToast } from "../../state/store";

interface VaultPage {
  id: string;
  title: string;
  source: string;
  domain: string;
  excerpt: string;
  tags: string[];
}

interface TreeNode {
  id: string;
  label: string;
  type: "root" | "sector" | "card" | "agent" | "tool";
  meta: string;
  children?: TreeNode[];
}

const GRAPH_DATA: TreeNode = {
  id: "root",
  label: "Você (CEO)",
  type: "root",
  meta: "Operação Central",
  children: [
    {
      id: "s-estrategia",
      label: "Estratégia",
      type: "sector",
      meta: "4 agentes",
      children: [
        { id: "c-plan", label: "Planejamento Q4", type: "card", meta: "2 tasks" },
        { id: "c-cost", label: "Análise de Custos", type: "card", meta: "1 job ativo" },
        { id: "g-01", label: "Arquiteto", type: "agent", meta: "ocupado" },
        { id: "g-07", label: "Analista", type: "agent", meta: "ocioso" },
        { id: "t-strategy", label: "Roadmap Builder", type: "tool", meta: "mcp" },
      ],
    },
    {
      id: "s-conteudo",
      label: "Conteúdo",
      type: "sector",
      meta: "3 agentes",
      children: [
        { id: "c-lp", label: "LP Advocacia", type: "card", meta: "1 job ativo" },
        { id: "c-livro", label: "IA Livros — Cap. 4", type: "card", meta: "1 job ativo" },
        { id: "g-03", label: "Redator", type: "agent", meta: "ocupado" },
        { id: "g-05", label: "Revisor", type: "agent", meta: "ocupado" },
        { id: "t-writer", label: "Content Engine", type: "tool", meta: "mcp" },
      ],
    },
    {
      id: "s-eng",
      label: "Engenharia",
      type: "sector",
      meta: "2 agentes",
      children: [
        { id: "c-deploy", label: "Deploy Meridian", type: "card", meta: "bloqueado" },
        { id: "c-audit", label: "Auditoria API", type: "card", meta: "concluído" },
        { id: "g-06", label: "Deployer", type: "agent", meta: "offline" },
        { id: "t-ci", label: "CI/CD Pipeline", type: "tool", meta: "github" },
      ],
    },
    {
      id: "s-social",
      label: "Social",
      type: "sector",
      meta: "1 agente",
      children: [
        { id: "c-ig", label: "Instagram Setembro", type: "card", meta: "5 posts" },
        { id: "g-09", label: "Social Media", type: "agent", meta: "ocioso" },
        { id: "t-sched", label: "Social Scheduler", type: "tool", meta: "meta" },
      ],
    },
    {
      id: "s-comercial",
      label: "Comercial",
      type: "sector",
      meta: "2 agentes",
      children: [
        { id: "c-funnel", label: "Funil Setembro", type: "card", meta: "3 propostas" },
        { id: "g-11", label: "Comercial", type: "agent", meta: "ocioso" },
        { id: "t-crm", label: "CRM Bridge", type: "tool", meta: "supabase" },
      ],
    },
  ],
};

const VAULT_PAGES: VaultPage[] = [
  { id: "kp-01", title: "Hooks de Crescimento — Framework 4L", source: "Livro: Growth Hooks", domain: "Estratégia", excerpt: "Os 4 loops de crescimento (Lead, Lift, Lock, Loop) aplicados a SaaS B2B com governança autônoma...", tags: ["crescimento", "loops", "saas"] },
  { id: "kp-02", title: "Copywriting para Landing Pages de Nicho", source: "Framework: LP Engine", domain: "Conteúdo", excerpt: "Estrutura AIDA adaptada para nichos jurídicos, contábeis e médicos com validação ética OAB...", tags: ["copy", "lp", "nichos"] },
  { id: "kp-03", title: "Hardening de APIs REST — Checklist", source: "Padrão: API Standard", domain: "Engenharia", excerpt: "Rate limiting, CORS restritivo, headers de segurança (HSTS, CSP), validação estrita de schema OpenAPI...", tags: ["segurança", "api", "dev"] },
  { id: "kp-04", title: "Cadência de Conteúdo Instagram", source: "Framework: Social Cadence", domain: "Social", excerpt: "Frequência ideal, mix de formatos (Reels, Carrossel, Stories), regras de engajamento e horários...", tags: ["instagram", "social", "cadência"] },
  { id: "kp-05", title: "Funil Documental de Vendas", source: "Framework: Funnel Doc", domain: "Comercial", excerpt: "Descoberta → Orçamento → Proposta com aceite via ponte Supabase → Contra-assinatura local → Projeto...", tags: ["vendas", "funil", "comercial"] },
  { id: "kp-06", title: "Cálculo de Custo por Modelo de IA", source: "Padrão: Cost Standard", domain: "Finanças", excerpt: "Como calcular custo real incluindo tokens de sistema, retry, cache hits e overhead do orquestrador...", tags: ["custo", "finanças", "ia"] },
  { id: "kp-07", title: "Sintetização de Livros com IA", source: "Framework: IA Livros", domain: "Conteúdo", excerpt: "Pipeline de leitura → síntese contextual → escrita → revisão para geração de capítulos densos...", tags: ["livros", "síntese", "ia"] },
  { id: "kp-08", title: "Design Tokens — Sistema TAVIR", source: "Padrão: Design System", domain: "Design", excerpt: "Paleta basalto/sinal/diurno/papel/profundo/ember e sua aplicação em layout responsivo 100% offline...", tags: ["design", "tokens", "marca"] },
];

const MEMORIES = [
  { tag: "pref:tom_voz", score: 0.92, lastAccess: "2 min", pct: "92%" },
  { tag: "pref:modelo_padrao", score: 0.9, lastAccess: "5 min", pct: "90%" },
  { tag: "ctx:cliente_meridian", score: 0.88, lastAccess: "15 min", pct: "88%" },
  { tag: "pref:horario_operacao", score: 0.85, lastAccess: "1 h", pct: "85%" },
  { tag: "ctx:nicho_advocacia", score: 0.77, lastAccess: "20 min", pct: "77%" },
  { tag: "learn:deploy_supabase_url", score: 0.71, lastAccess: "3 h", pct: "71%" },
  { tag: "ctx:cliente_atlas", score: 0.65, lastAccess: "4 h", pct: "65%" },
  { tag: "learn:headline_max_60", score: 0.58, lastAccess: "30 min", pct: "58%" },
];

export function CerebroView() {
  const [searchVault, setSearchVault] = createSignal<string>("");
  const [selectedDomain, setSelectedDomain] = createSignal<string>("Todos");
  const [quickCaptureText, setQuickCaptureText] = createSignal<string>("");
  const [collapsedNodes, setCollapsedNodes] = createSignal<Record<string, boolean>>({});

  const toggleNode = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredPages = createMemo(() => {
    const q = searchVault().toLowerCase().trim();
    const dom = selectedDomain();

    return VAULT_PAGES.filter((p) => {
      const matchDom = dom === "Todos" || p.domain === dom;
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchDom && matchQ;
    });
  });

  const handleSaveCapture = () => {
    const text = quickCaptureText().trim();
    if (!text) return;
    setCapturedNotes((prev) => [text, ...prev]);
    setQuickCaptureText("");
    showToast("Nota salva e enviada para a fila de Ideias/", "Captura rápida", "success");
  };

  const nodeColor = (type: TreeNode["type"]) => {
    switch (type) {
      case "root": return "var(--teal, #1BC5BD)";
      case "sector": return "var(--flow, oklch(.80 .155 78))";
      case "card": return "var(--slate, #cbd3de)";
      case "agent": return "var(--teal, #1BC5BD)";
      case "tool": return "var(--text-muted, #5E6878)";
    }
  };

  // Flatten tree with expansion
  const flatTree = createMemo(() => {
    const res: Array<{ node: TreeNode; depth: number }> = [];

    const walk = (node: TreeNode, depth: number) => {
      res.push({ node, depth });
      const isCollapsed = collapsedNodes()[node.id];
      if (!isCollapsed && node.children) {
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    };

    walk(GRAPH_DATA, 0);
    return res;
  });

  return (
    <div
      data-screen-label="Cérebro"
      style={{
        height: "100%",
        display: "grid",
        "grid-template-columns": "minmax(240px, 24%) minmax(340px, 1fr) minmax(280px, 26%)",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
        "min-height": "0",
        overflow: "hidden",
      }}
    >
      {/* Coluna 1: Grafo Operacional */}
      <aside
        style={{
          "border-right": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
          display: "flex",
          "flex-direction": "column",
          "min-height": "0",
          background: "var(--surface-1, #0f1729)",
        }}
      >
        <div style={{ padding: "16px 16px 10px" }}>
          <div style={{ "font-weight": "600", "font-size": "14px" }}>Grafo operacional</div>
          <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "margin-top": "2px" }}>
            Você → setores → cards → agentes → ferramentas
          </div>
        </div>

        <div style={{ flex: "1", "overflow-y": "auto", padding: "0 8px 12px" }}>
          <For each={flatTree()}>
            {({ node, depth }) => {
              const hasChildren = !!node.children && node.children.length > 0;
              const isCollapsed = () => !!collapsedNodes()[node.id];

              return (
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    "align-items": "center",
                    gap: "8px",
                    height: "30px",
                    "padding-right": "8px",
                    border: "none",
                    "border-radius": "6px",
                    background: "transparent",
                    color: "var(--text-primary, #F4F6F2)",
                    cursor: "pointer",
                    "text-align": "left",
                    "padding-left": `${depth * 14 + 8}px`,
                    transition: "background 0.15s ease",
                  }}
                >
                  <Show when={hasChildren}>
                    <TvIcon
                      name={isCollapsed() ? "chevron-right" : "chevron-down"}
                      style={{ width: "12px", height: "12px", color: "var(--text-muted, #aeb7c4)" }}
                    />
                  </Show>
                  <Show when={!hasChildren}>
                    <span style={{ width: "12px" }}></span>
                  </Show>

                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      "border-radius": "2px",
                      flex: "none",
                      background: nodeColor(node.type),
                    }}
                  ></span>

                  <span
                    style={{
                      flex: "1",
                      overflow: "hidden",
                      "text-overflow": "ellipsis",
                      "white-space": "nowrap",
                      "font-size": "13px",
                      "font-weight": node.type === "root" || node.type === "sector" ? "600" : "400",
                    }}
                  >
                    {node.label}
                  </span>

                  <span style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                    {node.meta}
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        {/* Legenda de cores do Grafo */}
        <div
          style={{
            padding: "10px 16px",
            "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
            display: "flex",
            gap: "12px",
            "flex-wrap": "wrap",
            "font-size": "11px",
            color: "var(--text-muted, #aeb7c4)",
          }}
        >
          <span style={{ display: "flex", gap: "5px", "align-items": "center" }}>
            <span style={{ width: "7px", height: "7px", "border-radius": "2px", background: "var(--flow, oklch(.80 .155 78))" }}></span>
            setor
          </span>
          <span style={{ display: "flex", gap: "5px", "align-items": "center" }}>
            <span style={{ width: "7px", height: "7px", "border-radius": "2px", background: "var(--slate, #cbd3de)" }}></span>
            card
          </span>
          <span style={{ display: "flex", gap: "5px", "align-items": "center" }}>
            <span style={{ width: "7px", height: "7px", "border-radius": "2px", background: "var(--teal, #1BC5BD)" }}></span>
            agente
          </span>
          <span style={{ display: "flex", gap: "5px", "align-items": "center" }}>
            <span style={{ width: "7px", height: "7px", "border-radius": "2px", background: "#5E6878" }}></span>
            ferramenta
          </span>
        </div>
      </aside>

      {/* Coluna 2: Busca no Vault e Artigos */}
      <section style={{ display: "flex", "flex-direction": "column", "min-height": "0", "min-width": "0" }}>
        <div style={{ padding: "20px 24px 12px" }}>
          <h1 style={{ margin: "0", "font-size": "20px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
            Cérebro
          </h1>
          <p style={{ margin: "4px 0 14px", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
            Vault knowledge/ · 132 páginas indexadas · busca semântica
          </p>

          <input
            value={searchVault()}
            onInput={(e) => setSearchVault(e.currentTarget.value)}
            placeholder="Buscar no vault…"
            aria-label="Buscar no vault"
            style={{
              width: "100%",
              height: "38px",
              padding: "0 14px",
              "border-radius": "9px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-2, #121c30)",
              color: "var(--text-primary, #F4F6F2)",
              "font-size": "14px",
              outline: "none",
            }}
          />

          {/* Filtros de Domínio */}
          <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap", "margin-top": "10px" }}>
            {["Todos", "Estratégia", "Conteúdo", "Engenharia", "Social", "Comercial", "Finanças", "Design"].map((d) => (
              <button
                type="button"
                onClick={() => setSelectedDomain(d)}
                style={{
                  height: "26px",
                  padding: "0 10px",
                  "border-radius": "13px",
                  cursor: "pointer",
                  "font-size": "12px",
                  border: selectedDomain() === d ? "1px solid var(--teal, #1BC5BD)" : "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                  background: selectedDomain() === d ? "var(--teal, #1BC5BD)" : "transparent",
                  color: selectedDomain() === d ? "var(--ink, #0B1220)" : "var(--text-secondary, #cbd3de)",
                  "font-weight": selectedDomain() === d ? "600" : "400",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Artigos do Vault */}
        <div style={{ flex: "1", "overflow-y": "auto", padding: "4px 24px 24px", display: "flex", "flex-direction": "column" }}>
          <For each={filteredPages()}>
            {(p) => (
              <article
                style={{
                  padding: "14px 0",
                  "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                  display: "flex",
                  "flex-direction": "column",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: "8px", "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                  <span style={{ color: "var(--teal, #1BC5BD)", "font-weight": "500" }}>{p.domain}</span>
                  <span>·</span>
                  <span>{p.source}</span>
                </div>
                <div style={{ "font-size": "14px", "font-weight": "500" }}>{p.title}</div>
                <div style={{ color: "var(--text-secondary, #cbd3de)", "line-height": "1.5", "font-size": "13px" }}>
                  {p.excerpt}
                </div>
              </article>
            )}
          </For>

          <Show when={filteredPages().length === 0}>
            <div style={{ padding: "40px 0", "text-align": "center", color: "var(--text-muted, #aeb7c4)", "font-size": "13px" }}>
              Nenhuma página encontrada no vault
            </div>
          </Show>
        </div>
      </section>

      {/* Coluna 3: Captura Rápida e Sincron Brain */}
      <aside
        style={{
          "border-left": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
          display: "flex",
          "flex-direction": "column",
          "min-height": "0",
          background: "var(--surface-1, #0f1729)",
        }}
      >
        {/* Captura rápida */}
        <div style={{ padding: "16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))", display: "flex", "flex-direction": "column", gap: "8px" }}>
          <div style={{ "font-weight": "600", "font-size": "14px" }}>Captura rápida</div>
          <textarea
            value={quickCaptureText()}
            onInput={(e) => setQuickCaptureText(e.currentTarget.value)}
            placeholder="Ideia, decisão ou nota…"
            rows={3}
            style={{
              resize: "none",
              padding: "10px",
              "border-radius": "8px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-0, #0B1220)",
              color: "var(--text-primary, #F4F6F2)",
              "font-size": "13px",
              outline: "none",
              "line-height": "1.5",
            }}
          />
          <button
            type="button"
            onClick={handleSaveCapture}
            style={{
              height: "30px",
              "border-radius": "7px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-2, #17223a)",
              color: "var(--text-primary, #F4F6F2)",
              cursor: "pointer",
              "font-weight": "500",
              "font-size": "12px",
            }}
          >
            Enviar para Ideias/
          </button>

          <For each={capturedNotes()}>
            {(note) => (
              <div style={{ "font-size": "12px", padding: "8px 10px", "border-radius": "7px", background: "var(--surface-2, #121c30)", color: "var(--text-secondary, #cbd3de)" }}>
                <div>{note}</div>
                <div style={{ "margin-top": "3px", "font-size": "11px", color: "var(--flow, oklch(.80 .155 78))" }}>
                  Pendente de sync
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Sincron Brain Score List */}
        <div style={{ padding: "16px 16px 8px", display: "flex", "align-items": "baseline" }}>
          <span style={{ "font-weight": "600", flex: "1", "font-size": "13px" }}>Sincron Brain</span>
          <span style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>score · acesso</span>
        </div>

        <div style={{ flex: "1", "overflow-y": "auto", padding: "0 16px 16px", display: "flex", "flex-direction": "column", gap: "10px" }}>
          <For each={MEMORIES}>
            {(m) => (
              <div style={{ display: "flex", "flex-direction": "column", gap: "5px" }}>
                <div style={{ display: "flex", gap: "8px", "font-size": "12px" }}>
                  <span style={{ "font-family": "var(--font-mono)", flex: "1", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                    {m.tag}
                  </span>
                  <span style={{ "font-family": "var(--font-mono)", color: "var(--text-secondary, #cbd3de)" }}>
                    {m.score}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                  <div style={{ flex: "1", height: "3px", "border-radius": "2px", background: "rgba(244,246,242,.12)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "var(--teal, #1BC5BD)", width: m.pct }}></div>
                  </div>
                  <span style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)", width: "44px", "text-align": "right" }}>
                    {m.lastAccess}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </aside>
    </div>
  );
}
