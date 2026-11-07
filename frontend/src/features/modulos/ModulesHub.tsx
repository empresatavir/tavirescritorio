import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";

interface ModuleCard {
  id: string;
  label: string;
  href: string;
  count: number;
}

export function ModulesHub() {
  const [modules, setModules] = createSignal<ModuleCard[]>([]);

  onMount(() => {
    void fetch("/api/v1/modules/summary")
      .then((res) => res.json())
      .then((body: { modules: ModuleCard[] }) => setModules(body.modules || []))
      .catch(() => setModules([]));
  });

  return (
    <div data-screen-label="Visão dos módulos" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>
        Visão dos módulos
      </h1>
      <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        <For each={modules()}>
          {(item) => (
            <A
              href={item.href}
              data-module={item.id}
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "8px",
                padding: "16px",
                "border-radius": "16px",
                border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                background: "var(--surface-1, #0f1729)",
                color: "var(--text-primary)",
                "text-decoration": "none",
              }}
            >
              <span style={{ "font-size": "16px", "font-weight": "600" }}>{item.label}</span>
              <span data-count style={{ "font-family": "var(--font-mono)", "font-size": "28px" }}>{item.count}</span>
            </A>
          )}
        </For>
      </div>
      <Show when={modules().length === 0}>
        <p style={{ color: "var(--text-secondary)" }}>Carregando os módulos.</p>
      </Show>
    </div>
  );
}
