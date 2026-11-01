import { createSignal, onMount, For, Show } from "solid-js";

interface FlowItem {
  id: string;
  name: string;
}

interface FlowRun {
  id: string;
  status: string;
  gate: string | null;
  engine: string;
}

export function FlowView() {
  const [workflows, setWorkflows] = createSignal<FlowItem[]>([]);
  const [runs, setRuns] = createSignal<Record<string, FlowRun>>({});
  const [error, setError] = createSignal("");
  const [draft, setDraft] = createSignal("");

  const load = async () => {
    const res = await fetch("/api/v1/workflows");
    if (!res.ok) return;
    const list = (await res.json()) as FlowItem[];
    setWorkflows(list.map((item) => ({ id: item.id, name: item.name })));
  };

  onMount(() => {
    void load();
  });

  const createWorkflow = async () => {
    const name = draft().trim();
    if (!name) {
      setError("Informe o nome do workflow.");
      return;
    }
    setError("");
    const res = await fetch("/api/v1/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Não foi possível criar o workflow.");
      return;
    }
    setDraft("");
    await load();
  };

  const runNow = async (item: FlowItem) => {
    setError("");
    const res = await fetch(`/api/v1/workflows/${item.id}/run`, { method: "POST" });
    if (!res.ok) {
      setError("Não foi possível rodar o workflow.");
      return;
    }
    const body = (await res.json()) as FlowRun;
    setRuns((prev) => ({ ...prev, [item.id]: body }));
  };

  return (
    <div data-screen-label="Flow" style={{ padding: "28px 32px 48px", display: "flex", "flex-direction": "column", gap: "16px" }}>
      <h1 style={{ margin: "0", "font-size": "30px", "font-weight": "600", "letter-spacing": "-0.03em", color: "var(--text-primary)" }}>Flow</h1>
      <p role="status" data-beta style={{ margin: "0", padding: "12px 14px", "border-radius": "12px", background: "rgba(183,243,74,.12)", color: "var(--text-primary)" }}>
        Flow em beta. O motor contínuo não está ligado.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void createWorkflow();
        }}
        style={{ display: "flex", gap: "8px", "align-items": "center" }}
      >
        <input
          aria-label="Nome do workflow"
          value={draft()}
          onInput={(event) => setDraft(event.currentTarget.value)}
          style={{ flex: "1", height: "36px", padding: "0 12px", "border-radius": "8px", border: "1px solid var(--border-subtle, rgba(244,246,242,.16))", background: "var(--surface-0)", color: "var(--text-primary)" }}
        />
        <button type="submit">Novo workflow</button>
      </form>
      <Show when={error()}>
        <p style={{ margin: "0", color: "var(--text-secondary)" }}>{error()}</p>
      </Show>
      <For each={workflows()}>
        {(item) => {
          const run = () => runs()[item.id];
          return (
            <article data-workflow={item.id} style={{ display: "flex", "flex-direction": "column", gap: "8px", padding: "16px", "border-radius": "16px", border: "1px solid var(--border-subtle, rgba(244,246,242,.12))", background: "var(--surface-1, #0f1729)" }}>
              <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
                <span style={{ flex: "1", "font-weight": "600", color: "var(--text-primary)" }}>{item.name}</span>
                <button type="button" aria-label={`Rodar agora ${item.name}`} onClick={() => void runNow(item)}>
                  Rodar agora
                </button>
              </div>
              <Show when={run()}>
                <p data-run-status style={{ margin: "0", color: "var(--text-primary)" }}>
                  Parado no gate: {run()!.gate}
                </p>
              </Show>
            </article>
          );
        }}
      </For>
    </div>
  );
}
