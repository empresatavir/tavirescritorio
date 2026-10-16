import { createSignal, createEffect, For, Show } from "solid-js";

interface TemplateStage {
  name: string;
  owner: string;
  gate: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  mode: string;
  description: string | null;
  stages: TemplateStage[] | null;
  owner_role: string | null;
  gate_required: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { key: "lp", label: "Landing Pages" },
  { key: "oferta", label: "Ofertas" },
  { key: "sistemas", label: "Sistemas" },
];

export function Fabrica() {
  const [templates, setTemplates] = createSignal<Template[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeCategory, setActiveCategory] = createSignal("lp");

  createEffect(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/factory/templates/");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as Template[];
      setTemplates(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  });

  const filtered = () =>
    templates().filter((t) => t.category === activeCategory());

  const modeLabel = (mode: string) =>
    mode === "criacao" ? "Criação" : "Manutenção";

  return (
    <div class="flex h-full flex-col gap-6">
      <div>
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Tavir Fábrica
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Templates de engenharia por categoria e modo
        </p>
      </div>

      {/* Category Tabs */}
      <div class="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
        <For each={CATEGORIES}>
          {(cat) => (
            <button
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              class={`flex-1 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                activeCategory() === cat.key
                  ? "bg-[var(--bg-active)] text-[var(--accent-lima)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          )}
        </For>
      </div>

      {/* Templates Grid */}
      <Show when={loading()}>
        <div class="py-12 text-center text-sm text-[var(--text-muted)]">
          Carregando templates...
        </div>
      </Show>

      <Show when={error()}>
        <div class="rounded-[var(--radius-md)] border border-[var(--danger,#ef4444)] bg-[rgba(239,68,68,0.1)] p-4 text-sm text-[var(--danger,#ef4444)]">
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error() && filtered().length === 0}>
        <div class="py-12 text-center text-sm text-[var(--text-muted)]">
          Nenhum template nesta categoria.
        </div>
      </Show>

      <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
        <For each={filtered()}>
          {(template) => (
            <div class="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-[var(--text-h3)] font-semibold text-[var(--text-primary)]">
                    {template.name}
                  </h3>
                  <span class="mt-1 inline-block rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-[var(--tracking-label)] text-[var(--accent-lima)]">
                    {modeLabel(template.mode)}
                  </span>
                </div>
                <Show when={template.gate_required}>
                  <span class="shrink-0 rounded-full border border-[var(--accent-teal)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-teal)]">
                    Gate obrigatório
                  </span>
                </Show>
              </div>

              <Show when={template.description}>
                <p class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {template.description}
                </p>
              </Show>

              {/* Stages Pipeline */}
              <Show when={template.stages && template.stages.length > 0}>
                <div class="mt-4">
                  <p class="mb-2 text-[var(--text-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                    Etapas ({template.stages!.length})
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    <For each={template.stages!}>
                      {(stage) => (
                        <span
                          class={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium ${
                            stage.gate
                              ? "border border-[var(--accent-teal)] bg-[rgba(27,197,189,0.1)] text-[var(--accent-teal)]"
                              : "border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {stage.name}
                          <Show when={stage.gate}>
                            <span class="text-[10px]" title="Gate obrigatório">🔒</span>
                          </Show>
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              <Show when={template.owner_role}>
                <div class="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span class="font-mono uppercase tracking-[var(--tracking-label)]">Owner:</span>
                  <span class="font-medium text-[var(--text-secondary)]">{template.owner_role}</span>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}