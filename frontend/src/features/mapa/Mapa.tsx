import { createResource, For, Show } from "solid-js";

interface MapAgent {
  id: string;
  name: string;
  role: string;
}

interface MapSector {
  name: string;
  agents: MapAgent[];
}

export function Mapa() {
  const [sectors] = createResource(async () => {
    const res = await fetch("/api/v1/agents/sectors");
    if (!res.ok) throw new Error("Os setores não responderam.");
    const body = (await res.json()) as { sectors: MapSector[] };
    return body.sectors;
  });

  return (
    <div data-screen-label="Mapa" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Mapa</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Setores e agentes do escritório, em lista.</p>
      <Show when={sectors.error}>
        <p role="alert">{sectors.error.message}</p>
      </Show>
      <Show when={!sectors.loading && (sectors() || []).length === 0}>
        <p>Nenhum setor com agente.</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
        <For each={sectors() || []}>
          {(sector) => (
            <section data-sector={sector.name}>
              <h2 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>{sector.name}</h2>
              <ul style={{ margin: "0", padding: "0", "list-style": "none", display: "flex", "flex-direction": "column", gap: "4px" }}>
                <For each={sector.agents}>
                  {(agent) => (
                    <li data-agent={agent.id} style={{ color: "var(--text-secondary)" }}>
                      {agent.name} · {agent.role}
                    </li>
                  )}
                </For>
              </ul>
            </section>
          )}
        </For>
      </div>
    </div>
  );
}
