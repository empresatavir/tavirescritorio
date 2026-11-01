import { createResource, For, Show } from "solid-js";

interface SkillRow {
  id: string;
  name: string;
  description: string;
  origin: string;
}

export function SkillsView() {
  const [rows] = createResource(async () => {
    const res = await fetch("/api/v1/skills");
    if (!res.ok) throw new Error("O catálogo de skills não respondeu.");
    return (await res.json()) as SkillRow[];
  });

  return (
    <div data-screen-label="Skills" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Skills</h1>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={rows() || []}>
          {(row) => (
            <article data-skill={row.id}>
              <strong style={{ color: "var(--text-primary)" }}>{row.name}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{row.description}</p>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{row.origin}</p>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
