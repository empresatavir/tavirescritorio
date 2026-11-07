import { createResource, For, Show } from "solid-js";

interface OrgAgent {
  id: string;
  name: string;
  role: string;
  sector: string;
  reports_to: string | null;
}

export function OrgView() {
  const [rows] = createResource(async () => {
    const res = await fetch("/api/v1/agents/");
    if (!res.ok) throw new Error("O organograma não respondeu.");
    return (await res.json()) as OrgAgent[];
  });

  return (
    <div data-screen-label="Org" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Organograma</h1>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={rows() || []}>
          {(agent) => (
            <article data-agent={agent.id}>
              <strong style={{ color: "var(--text-primary)" }}>{agent.name}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                {agent.role} · {agent.sector}
              </p>
              <p data-reports-to style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                {agent.reports_to ? `Reporta a ${agent.reports_to}` : "Sem reporte"}
              </p>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
