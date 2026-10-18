import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { TvIcon } from "../../shared/components/TvIcon";
import { setCapturedNotes, showToast } from "../../state/store";
import { api, type KnowledgeEntry } from "../../shared/api/client";

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
  const [vaultEntries, setVaultEntries] = createSignal<KnowledgeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = createSignal<boolean>(true);
  const [selectedArticle, setSelectedArticle] = createSignal<KnowledgeEntry | null>(null);

  const fetchKnowledge = async () => {
    try {
      setLoadingEntries(true);
      const data = await api.searchKnowledge(searchVault(), selectedDomain());
      setVaultEntries(data);
    } catch (err) {
      console.warn("Falha ao buscar do backend, usando acervo local", err);
    } finally {
      setLoadingEntries(false);
    }
  };

  onMount(() => {
    fetchKnowledge();
  });

  const toggleNode = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDomainChange = (dom: string) => {
    setSelectedDomain(dom);
    fetchKnowledge();
  };

  const handleSearchInput = (value: string) => {
    setSearchVault(value);
    // Debounce search slightly or trigger
    fetchKnowledge();
  };

  const handleSaveCapture = async () => {
    const text = quickCaptureText().trim();
    if (!text) return;
    setCapturedNotes((prev) => [text, ...prev]);
    setQuickCaptureText("");

    try {
      await api.createIdea({
        title: text,
        source: "Captura rápida Cérebro",
        priority: "medium",
      });
      showToast("Nota gravada no SQLite e enviada à fila de Ideias/", "Captura rápida", "success");
    } catch {
      showToast("Nota salva em sessão local", "Captura rápida", "success");
    }
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

  const domainsList = [
    "Todos",
    "Psicologia",
    "Copywriting",
    "Negocios",
    "Engenharia",
    "Design",
    "Frameworks",
    "Mercados",
    "Sinteses",
  ];

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

      {/* Coluna 2: Busca no Vault e Artigos Reais */}
      <section style={{ display: "flex", "flex-direction": "column", "min-height": "0", "min-width": "0" }}>
        <div style={{ padding: "20px 24px 12px" }}>
          <h1 style={{ margin: "0", "font-size": "20px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
            Cérebro
          </h1>
          <p style={{ margin: "4px 0 14px", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
            Vault knowledge/ · {vaultEntries().length} páginas indexadas · acervo ativo
          </p>

          <input
            value={searchVault()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
            placeholder="Buscar no vault (conceitos, tags, psicologia, ofertas)…"
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
            {domainsList.map((d) => (
              <button
                type="button"
                onClick={() => handleDomainChange(d)}
                style={{
                  height: "26px",
                  padding: "0 10px",
                  "border-radius": "13px",
                  cursor: "pointer",
                  "font-size": "12px",
                  border: selectedDomain().toLowerCase() === d.toLowerCase() ? "1px solid var(--teal, #1BC5BD)" : "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                  background: selectedDomain().toLowerCase() === d.toLowerCase() ? "var(--teal, #1BC5BD)" : "transparent",
                  color: selectedDomain().toLowerCase() === d.toLowerCase() ? "var(--ink, #0B1220)" : "var(--text-secondary, #cbd3de)",
                  "font-weight": selectedDomain().toLowerCase() === d.toLowerCase() ? "600" : "400",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Artigos do Vault */}
        <div style={{ flex: "1", "overflow-y": "auto", padding: "4px 24px 24px", display: "flex", "flex-direction": "column" }}>
          <Show when={loadingEntries()}>
            <div style={{ padding: "20px 0", color: "var(--text-muted, #aeb7c4)", "font-size": "13px" }}>
              Indexando páginas do Vault…
            </div>
          </Show>

          <For each={vaultEntries()}>
            {(p) => {
              const dom = p.extra_metadata?.domain || p.source_path?.split("/")[1] || "Geral";
              const src = p.extra_metadata?.source || p.source_path || "Vault";
              return (
                <article
                  onClick={() => setSelectedArticle(p)}
                  style={{
                    padding: "14px 0",
                    "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "5px",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", "align-items": "center", "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                    <span style={{ color: "var(--teal, #1BC5BD)", "font-weight": "600", "text-transform": "capitalize" }}>
                      {dom}
                    </span>
                    <span>·</span>
                    <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                      {src}
                    </span>
                    <Show when={p.extra_metadata?.importance}>
                      <span style={{ "margin-left": "auto", "font-family": "var(--font-mono)", color: "var(--lime, #B7F34A)" }}>
                        ★ {p.extra_metadata?.importance}/10
                      </span>
                    </Show>
                  </div>
                  <div style={{ "font-size": "14px", "font-weight": "600" }}>{p.title}</div>
                  <div style={{ color: "var(--text-secondary, #cbd3de)", "line-height": "1.5", "font-size": "13px" }}>
                    {p.content}
                  </div>
                  <Show when={p.tags && p.tags.length > 0}>
                    <div style={{ display: "flex", gap: "4px", "flex-wrap": "wrap", "margin-top": "4px" }}>
                      <For each={(p.tags || []).slice(0, 5)}>
                        {(t) => (
                          <span
                            style={{
                              "font-size": "10px",
                              padding: "2px 6px",
                              "border-radius": "4px",
                              background: "rgba(255,255,255,.05)",
                              color: "var(--text-muted, #aeb7c4)",
                            }}
                          >
                            #{t}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </article>
              );
            }}
          </For>

          <Show when={!loadingEntries() && vaultEntries().length === 0}>
            <div style={{ padding: "40px 0", "text-align": "center", color: "var(--text-muted, #aeb7c4)", "font-size": "13px" }}>
              Nenhuma página encontrada com esses filtros.
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
        {/* Captura Rápida */}
        <div style={{ padding: "20px 20px 14px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
          <div style={{ "font-weight": "600", "font-size": "14px" }}>Captura rápida</div>
          <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "margin-top": "2px", "margin-bottom": "10px" }}>
            Ideias vão direto para a fila de Ideias/ e para o Sincron Brain
          </div>

          <textarea
            value={quickCaptureText()}
            onInput={(e) => setQuickCaptureText(e.currentTarget.value)}
            placeholder="Nova ideia, link, hipótese ou insight…"
            aria-label="Nova ideia ou insight"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              "border-radius": "8px",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              background: "var(--surface-2, #121c30)",
              color: "var(--text-primary, #F4F6F2)",
              "font-size": "13px",
              outline: "none",
              resize: "none",
              "font-family": "inherit",
              "line-height": "1.4",
            }}
          />

          <div style={{ display: "flex", "justify-content": "flex-end", "margin-top": "8px" }}>
            <button
              type="button"
              onClick={handleSaveCapture}
              style={{
                height: "30px",
                padding: "0 14px",
                "border-radius": "6px",
                background: "var(--lime, #B7F34A)",
                color: "var(--ink, #0B1220)",
                border: "none",
                "font-weight": "600",
                "font-size": "12px",
                cursor: "pointer",
              }}
            >
              Capturar
            </button>
          </div>
        </div>

        {/* Sincron Brain / Memória Cognitiva */}
        <div style={{ flex: "1", "overflow-y": "auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", "justify-content": "space-between", "align-items": "baseline", "margin-bottom": "12px" }}>
            <div style={{ "font-weight": "600", "font-size": "13px" }}>Sincron Brain</div>
            <div style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>scoring & decaimento</div>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
            <For each={MEMORIES}>
              {(m) => (
                <div style={{ "font-size": "12px" }}>
                  <div style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "4px" }}>
                    <span style={{ "font-family": "var(--font-mono)", color: "var(--text-primary, #F4F6F2)" }}>
                      {m.tag}
                    </span>
                    <span style={{ "font-family": "var(--font-mono)", color: "var(--text-muted, #aeb7c4)" }}>
                      {m.pct} · {m.lastAccess}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "4px",
                      width: "100%",
                      background: "rgba(255,255,255,.08)",
                      "border-radius": "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: m.pct,
                        background: "var(--teal, #1BC5BD)",
                        "border-radius": "2px",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </aside>

      {/* Reader Modal: Visualização completa do artigo do Vault */}
      <Show when={selectedArticle()}>
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: "0",
            background: "rgba(11, 18, 32, 0.75)",
            "backdrop-filter": "blur(4px)",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "z-index": "1000",
            padding: "24px",
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            style={{
              width: "100%",
              "max-width": "760px",
              "max-height": "85vh",
              background: "var(--surface-1, #0f1729)",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
              "border-radius": "14px",
              display: "flex",
              "flex-direction": "column",
              overflow: "hidden",
              "box-shadow": "0 20px 40px rgba(0,0,0,.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
              }}
            >
              <div>
                <div style={{ "font-size": "11px", color: "var(--teal, #1BC5BD)", "font-weight": "600", "text-transform": "uppercase" }}>
                  {selectedArticle()?.extra_metadata?.domain || "Vault"} · {selectedArticle()?.extra_metadata?.source || selectedArticle()?.source_path}
                </div>
                <h2 style={{ margin: "4px 0 0", "font-size": "18px", "font-weight": "600" }}>
                  {selectedArticle()?.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted, #aeb7c4)",
                  cursor: "pointer",
                  padding: "6px",
                  "border-radius": "6px",
                }}
              >
                <TvIcon name="x" style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "24px",
                "overflow-y": "auto",
                flex: "1",
                "font-size": "14px",
                "line-height": "1.7",
                color: "var(--text-secondary, #cbd3de)",
              }}
            >
              <Show when={selectedArticle()?.extra_metadata?.full_content}>
                <div style={{ "white-space": "pre-wrap" }}>
                  {selectedArticle()?.extra_metadata?.full_content}
                </div>
              </Show>
              <Show when={!selectedArticle()?.extra_metadata?.full_content}>
                <p>{selectedArticle()?.content}</p>
              </Show>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 24px",
                "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                display: "flex",
                "justify-content": "space-between",
                "align-items": "center",
                background: "rgba(0,0,0,.15)",
                "font-size": "12px",
              }}
            >
              <span style={{ "font-family": "var(--font-mono)", color: "var(--text-muted, #aeb7c4)" }}>
                {selectedArticle()?.source_path}
              </span>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                style={{
                  height: "28px",
                  padding: "0 14px",
                  "border-radius": "6px",
                  background: "var(--surface-2, #121c30)",
                  border: "1px solid var(--border-subtle, rgba(244,246,242,.16))",
                  color: "var(--text-primary, #F4F6F2)",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
