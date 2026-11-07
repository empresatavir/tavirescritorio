import { createResource, For, Show } from "solid-js";

interface SocialRow {
  platform: string;
  label: string;
  status: string;
}

export function SocialView() {
  const [rows, { refetch }] = createResource(async () => {
    const res = await fetch("/api/v1/social/connections");
    if (!res.ok) throw new Error("As plataformas não responderam.");
    const body = (await res.json()) as { connections: SocialRow[] };
    return body.connections;
  });

  const connect = async (platform: string) => {
    const res = await fetch(`/api/v1/social/connections/${platform}/connect`, { method: "POST" });
    if (!res.ok) return;
    void refetch();
  };

  return (
    <div data-screen-label="Social" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Social</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>Conecte a plataforma para publicar a partir do escritório.</p>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={rows() || []}>
          {(row) => (
            <article data-platform={row.platform} style={{ display: "flex", "align-items": "center", gap: "12px", padding: "12px 16px", "border-radius": "12px", border: "1px solid var(--line, rgba(244,246,242,.14))" }}>
              <strong style={{ flex: "1", color: "var(--text-primary)" }}>{row.label}</strong>
              <span style={{ color: "var(--text-secondary)" }}>{row.status === "connected" ? "Conectado" : "Desconectado"}</span>
              <Show when={row.status !== "connected"}>
                <button type="button" onClick={() => void connect(row.platform)}>Conectar</button>
              </Show>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
