import { createSignal, createEffect, onMount, onCleanup, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { paletteOpen, setPaletteOpen } from "../state/store";
import { api, type OfficeSearchHit } from "../shared/api/client";
import { TvIcon } from "../shared/components/TvIcon";

const KIND: Record<string, string> = {
  screen: "Tela",
  task: "Task",
  agent: "Agente",
  job: "Job",
  case: "Caso",
  proposal: "Proposta",
};

export function CommandPalette() {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal("");
  const [hits, setHits] = createSignal<OfficeSearchHit[]>([]);
  const [active, setActive] = createSignal(0);
  const [settled, setSettled] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

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
    if (!paletteOpen()) return;
    setQuery("");
    setHits([]);
    setSettled("");
    setActive(0);
    setTimeout(() => inputRef?.focus(), 50);
  });

  createEffect(() => {
    if (!paletteOpen()) return;
    const q = query();
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      void api.searchOffice(q, ctrl.signal).then((res) => {
        if (ctrl.signal.aborted) return;
        setHits(res.items);
        setSettled(q.trim());
        setActive(0);
      }).catch(() => {
        /* abort ou rede: a próxima digitação substitui */
      });
    }, 120);
    onCleanup(() => {
      window.clearTimeout(timer);
      ctrl.abort();
    });
  });

  const go = (hit: OfficeSearchHit) => {
    setPaletteOpen(false);
    navigate(hit.href);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const list = hits();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (list.length === 0) return;
      setActive((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = list[active()];
      if (hit) go(hit);
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  };

  const showEmpty = () => query().trim() !== "" && settled() === query().trim() && hits().length === 0;

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
          class="pal"
          role="dialog"
          aria-label="Busca"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "560px",
            "max-width": "calc(100vw - 32px)",
            "max-height": "460px",
            background: "var(--surface-1)",
            border: "1px solid var(--line)",
            "border-radius": "var(--radius-lg)",
            "box-shadow": "var(--shadow-elevated)",
            "font-family": "var(--font-body)",
            display: "flex",
            "flex-direction": "column",
            overflow: "hidden",
          }}
        >
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
              aria-label="Buscar no escritório"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar telas, tasks, agentes…"
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
                border: "1px solid var(--line)",
                color: "var(--text-muted)",
              }}
            >
              ESC
            </span>
          </div>

          <div role="listbox" aria-label="Resultados" style={{ flex: 1, "overflow-y": "auto", padding: "8px" }}>
            <Show
              when={!showEmpty()}
              fallback={
                <div style={{ padding: "24px", "text-align": "center", color: "var(--text-muted)", "font-size": "13px" }}>
                  Nada com esse termo.
                </div>
              }
            >
              <For each={hits()}>
                {(hit, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={active() === index()}
                    data-href={hit.href}
                    onClick={() => go(hit)}
                    onMouseEnter={() => setActive(index())}
                    class="row"
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "12px",
                      width: "100%",
                      padding: "10px 12px",
                      "border-radius": "var(--radius-sm)",
                      border: "none",
                      cursor: "pointer",
                      background: active() === index() ? "var(--surface-2)" : "transparent",
                      "text-align": "left",
                    }}
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
                        color: "var(--text-secondary)",
                        border: "1px solid var(--line)",
                        flex: "none",
                      }}
                    >
                      {KIND[hit.kind] || hit.kind}
                    </span>
                    <span style={{ flex: 1, "min-width": 0, color: "var(--text-primary)", "font-size": "13px" }}>
                      {hit.label}
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
