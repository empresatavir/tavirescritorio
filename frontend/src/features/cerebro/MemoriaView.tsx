import { createResource, createSignal, For, Show } from "solid-js";

interface NoteRow {
  id: string;
  title: string;
  content: string | null;
  extra_metadata?: { domain?: string } | null;
}

export function MemoriaView() {
  const [term, setTerm] = createSignal("");
  const [rows] = createResource(term, async (value) => {
    const query = value.trim();
    const res = await fetch(`/api/v1/knowledge${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (!res.ok) throw new Error("A memória não respondeu.");
    return (await res.json()) as NoteRow[];
  });

  return (
    <div data-screen-label="Memória" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Memória</h1>
      <label style={{ display: "flex", "flex-direction": "column", gap: "6px", color: "var(--text-secondary)" }}>
        Filtrar notas
        <input aria-label="Filtrar notas" value={term()} onInput={(event) => setTerm(event.currentTarget.value)} />
      </label>
      <Show when={!rows.loading && term().trim() && (rows() || []).length === 0}>
        <p>Nada com esse filtro.</p>
      </Show>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={rows() || []}>
          {(row) => (
            <article data-note={row.id}>
              <strong style={{ color: "var(--text-primary)" }}>{row.title}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{row.content}</p>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
