import { createSignal, createEffect, onMount, onCleanup, For, Show } from "solid-js";
import { paletteOpen, setPaletteOpen, tasks, jobs, setSelectedTaskId, setSelectedJobId, setCurrentDomainId, setCurrentScreenId } from "../state/store";
import { TvIcon } from "../shared/components/TvIcon";

interface SearchResult {
  kind: "Task" | "Cérebro" | "Dados";
  title: string;
  meta: string;
  color: string;
  go: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  // Global Ctrl+K / Cmd+K shortcut listener
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen());
      }
      if (e.key === "Escape" && paletteOpen()) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    if (paletteOpen()) {
      setQuery("");
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  const pool = (): SearchResult[] => {
    const res: SearchResult[] = [];

    // Tasks
    for (const t of tasks()) {
      res.push({
        kind: "Task",
        title: `#${t.seq} ${t.title}`,
        meta: t.assignee + (t.sector ? ` · ${t.sector}` : ""),
        color: "var(--diurno, oklch(.80 .155 78))",
        go: () => {
          setSelectedTaskId(t.id);
          setCurrentDomainId("op");
          setCurrentScreenId("tasks");
          setPaletteOpen(false);
        },
      });
    }

    // Knowledge pages (from prototype)
    const pages = [
      { title: "Hooks de Crescimento — Framework 4L", meta: "Estratégia" },
      { title: "Copywriting para Landing Pages de Nicho", meta: "Conteúdo" },
      { title: "Hardening de APIs REST — Checklist", meta: "Engenharia" },
      { title: "Cadência de Conteúdo Instagram", meta: "Social" },
      { title: "Funil Documental de Vendas", meta: "Comercial" },
      { title: "Cálculo de Custo por Modelo de IA", meta: "Finanças" },
      { title: "Sintetização de Livros com IA", meta: "Conteúdo" },
      { title: "Design Tokens — Sistema TAVIR", meta: "Design" },
    ];
    for (const p of pages) {
      res.push({
        kind: "Cérebro",
        title: p.title,
        meta: p.meta,
        color: "var(--teal)",
        go: () => {
          setCurrentDomainId("kn");
          setCurrentScreenId("brain");
          setPaletteOpen(false);
        },
      });
    }

    // Jobs (Dados)
    for (const j of jobs()) {
      res.push({
        kind: "Dados",
        title: j.title,
        meta: `${j.id} · ${j.agentName}`,
        color: "var(--text-secondary)",
        go: () => {
          setSelectedJobId(j.id);
          setCurrentDomainId("op");
          setCurrentScreenId("exec");
          setPaletteOpen(false);
        },
      });
    }

    return res;
  };

  const results = () => {
    const q = query().toLowerCase().trim();
    if (!q) return pool().slice(0, 8);
    return pool()
      .filter((r) => (r.title + " " + r.meta).toLowerCase().includes(q))
      .slice(0, 10);
  };

  return (
    <Show when={paletteOpen()}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,12,22,.65)",
          "backdrop-filter": "blur(4px)",
          display: "flex",
          "justify-content": "center",
          "padding-top": "15vh",
          "z-index": 100,
        }}
        onClick={() => setPaletteOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "560px",
            "max-width": "calc(100vw - 32px)",
            "max-height": "460px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            "border-radius": "var(--radius-lg)",
            "box-shadow": "var(--shadow-elevated)",
            "font-family": "var(--font-body)",
            display: "flex",
            "flex-direction": "column",
            overflow: "hidden",
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "12px",
              padding: "14px 16px",
              "border-bottom": "1px solid var(--line)",
            }}
          >
            <TvIcon name="search" width="16" height="16" style={{ color: "var(--text-muted)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="Buscar em Tasks, Cérebro, Dados…"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                "font-size": "15px",
                outline: "none",
              }}
            />
            <span
              style={{
                "font-family": "var(--font-mono)",
                "font-size": "10px",
                padding: "2px 6px",
                "border-radius": "4px",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
              }}
            >
              ESC
            </span>
          </div>

          {/* Results list */}
          <div style={{ flex: 1, "overflow-y": "auto", padding: "8px" }}>
            <Show
              when={results().length > 0}
              fallback={
                <div style={{ padding: "24px", "text-align": "center", color: "var(--text-muted)", "font-size": "13px" }}>
                  Nenhum resultado encontrado para "{query()}".
                </div>
              }
            >
              <For each={results()}>
                {(r) => (
                  <div
                    onClick={r.go}
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "12px",
                      padding: "10px 12px",
                      "border-radius": "var(--radius-sm)",
                      cursor: "pointer",
                      transition: "background var(--duration-fast) var(--ease-standard)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span
                      style={{
                        "font-family": "var(--font-mono)",
                        "font-size": "10px",
                        "font-weight": 600,
                        "text-transform": "uppercase",
                        padding: "2px 6px",
                        "border-radius": "var(--radius-pill)",
                        background: "var(--surface-0)",
                        color: r.color,
                        border: "1px solid var(--border-default)",
                        flex: "none",
                        width: "60px",
                        "text-align": "center",
                      }}
                    >
                      {r.kind}
                    </span>
                    <div style={{ flex: 1, "min-width": 0 }}>
                      <div
                        style={{
                          "font-size": "13px",
                          "font-weight": 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          "text-overflow": "ellipsis",
                          "white-space": "nowrap",
                        }}
                      >
                        {r.title}
                      </div>
                      <div
                        style={{
                          "font-size": "11px",
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          "text-overflow": "ellipsis",
                          "white-space": "nowrap",
                        }}
                      >
                        {r.meta}
                      </div>
                    </div>
                    <span style={{ color: "var(--text-muted)", "font-size": "12px" }}>→</span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
