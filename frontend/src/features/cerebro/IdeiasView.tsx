import { createResource, createSignal, For, Show } from "solid-js";

interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
}

export function IdeiasView() {
  const [title, setTitle] = createSignal("");
  const [error, setError] = createSignal("");
  const [rows, { refetch }] = createResource(async () => {
    const res = await fetch("/api/v1/ideas");
    if (!res.ok) throw new Error("A fila de ideias não respondeu.");
    return (await res.json()) as IdeaRow[];
  });

  const create = async () => {
    setError("");
    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title(), source: "Ideias" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "A ideia não foi gravada.");
      return;
    }
    setTitle("");
    void refetch();
  };

  return (
    <div data-screen-label="Ideias" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Ideias</h1>
      <p style={{ margin: "0", color: "var(--text-secondary)" }}>A ideia fica na fila depois de recarregar a página.</p>
      <label style={{ display: "flex", "flex-direction": "column", gap: "6px", color: "var(--text-secondary)" }}>
        Nova ideia
        <input aria-label="Nova ideia" value={title()} onInput={(event) => setTitle(event.currentTarget.value)} />
      </label>
      <button type="button" onClick={() => void create()}>Criar ideia</button>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
      <Show when={rows.error}>
        <p role="alert">{rows.error.message}</p>
      </Show>
      <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
        <For each={rows() || []}>
          {(row) => (
            <article data-idea={row.id}>
              <strong style={{ color: "var(--text-primary)" }}>{row.title}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{row.status}</p>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
