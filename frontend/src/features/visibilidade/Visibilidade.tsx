import { createSignal, createEffect, For, Show } from "solid-js";

interface Workflow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  steps: { name: string; owner: string }[] | null;
  trigger_type: string;
  status: string;
}

interface Idea {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  status: string;
  priority: string;
}

interface IntegrationCheck {
  id: string;
  integration_name: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string | null;
  source_type: string;
  tags: string[] | null;
}

const TABS = [
  { key: "workflows", label: "Workflows" },
  { key: "ideas", label: "Ideias" },
  { key: "integrations", label: "Integrações" },
  { key: "knowledge", label: "Conhecimento" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function Visibilidade() {
  const [activeTab, setActiveTab] = createSignal<TabKey>("workflows");
  const [workflows, setWorkflows] = createSignal<Workflow[]>([]);
  const [ideas, setIdeas] = createSignal<Idea[]>([]);
  const [integrations, setIntegrations] = createSignal<IntegrationCheck[]>([]);
  const [knowledge, setKnowledge] = createSignal<KnowledgeEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    try {
      setLoading(true);
      const [wRes, iRes, igRes, kRes] = await Promise.all([
        fetch("/api/v1/workflows"),
        fetch("/api/v1/ideas"),
        fetch("/api/v1/integrations"),
        fetch("/api/v1/knowledge"),
      ]);
      if (!wRes.ok || !iRes.ok || !igRes.ok || !kRes.ok) throw new Error("API error");
      setWorkflows(await wRes.json());
      setIdeas(await iRes.json());
      setIntegrations(await igRes.json());
      setKnowledge(await kRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
        return "bg-[rgba(27,197,189,0.15)] text-[var(--accent-teal)]";
      case "pending":
      case "inbox":
        return "bg-[rgba(183,243,74,0.15)] text-[var(--accent-lima)]";
      case "failed":
      case "error":
        return "bg-[rgba(239,68,68,0.15)] text-[var(--danger,#ef4444)]";
      default:
        return "bg-[var(--bg-hover)] text-[var(--text-muted)]";
    }
  };

  const priorityColor = (p: string) =>
    p === "high"
      ? "bg-[rgba(239,68,68,0.15)] text-[var(--danger,#ef4444)]"
      : p === "medium"
        ? "bg-[rgba(183,243,74,0.15)] text-[var(--accent-lima)]"
        : "bg-[var(--bg-hover)] text-[var(--text-muted)]";

  return (
    <div class="flex h-full flex-col gap-6">
      <div>
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Visibilidade & Conhecimento
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Workflows de negócio, ideias, saúde de integrações e base de conhecimento
        </p>
      </div>

      {/* Tabs */}
      <div class="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
        <For each={TABS}>
          {(tab) => (
            <button
              type="button"
              onClick={() => setActiveTab(tab.key)}
              class={`flex-1 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                activeTab() === tab.key
                  ? "bg-[var(--bg-active)] text-[var(--accent-lima)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      <Show when={loading()}>
        <div class="py-12 text-center text-sm text-[var(--text-muted)]">Carregando...</div>
      </Show>

      <Show when={error()}>
        <div class="rounded-[var(--radius-md)] border border-[var(--danger,#ef4444)] bg-[rgba(239,68,68,0.1)] p-4 text-sm text-[var(--danger,#ef4444)]">
          {error()}
        </div>
      </Show>

      {/* Workflows */}
      <Show when={!loading() && !error() && activeTab() === "workflows"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
          <For each={workflows()}>
            {(wf) => (
              <div class="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{wf.name}</h3>
                  <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${statusColor(wf.status)}`}>
                    {wf.status}
                  </span>
                </div>
                <div class="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span class="font-mono uppercase tracking-[var(--tracking-label)]">{wf.category}</span>
                  <span>•</span>
                  <span>{wf.trigger_type}</span>
                </div>
                <Show when={wf.description}>
                  <p class="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">{wf.description}</p>
                </Show>
                <Show when={wf.steps && wf.steps.length > 0}>
                  <div class="mt-3">
                    <p class="mb-1.5 text-[10px] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                      Etapas ({wf.steps!.length})
                    </p>
                    <div class="flex flex-wrap gap-1">
                      <For each={wf.steps!}>
                        {(step) => (
                          <span class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                            {step.name}
                            <span class="text-[var(--text-muted)]">→</span>
                            <span class="font-mono text-[var(--text-muted)]">{step.owner}</span>
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </For>
          <Show when={workflows().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">Nenhum workflow registrado.</div>
          </Show>
        </div>
      </Show>

      {/* Ideas */}
      <Show when={!loading() && !error() && activeTab() === "ideas"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
          <For each={ideas()}>
            {(idea) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{idea.title}</h3>
                  <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${priorityColor(idea.priority)}`}>
                    {idea.priority}
                  </span>
                </div>
                <Show when={idea.description}>
                  <p class="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{idea.description}</p>
                </Show>
                <div class="mt-3 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span class={`rounded-full px-2 py-0.5 font-mono uppercase ${statusColor(idea.status)}`}>{idea.status}</span>
                  <Show when={idea.source}>
                    <span>Fonte: {idea.source}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
          <Show when={ideas().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">Nenhuma ideia registrada.</div>
          </Show>
        </div>
      </Show>

      {/* Integrations */}
      <Show when={!loading() && !error() && activeTab() === "integrations"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 xl:grid-cols-3">
          <For each={integrations()}>
            {(ig) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{ig.integration_name}</h3>
                  <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${statusColor(ig.status)}`}>
                    {ig.status}
                  </span>
                </div>
                <div class="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <Show when={ig.response_time_ms !== null}>
                    <span class="font-mono">{ig.response_time_ms}ms</span>
                  </Show>
                </div>
                <Show when={ig.error_message}>
                  <p class="mt-2 rounded-[var(--radius-sm)] bg-[rgba(239,68,68,0.1)] px-2 py-1 text-[10px] text-[var(--danger,#ef4444)]">
                    {ig.error_message}
                  </p>
                </Show>
              </div>
            )}
          </For>
          <Show when={integrations().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">Nenhuma integração registrada.</div>
          </Show>
        </div>
      </Show>

      {/* Knowledge */}
      <Show when={!loading() && !error() && activeTab() === "knowledge"}>
        <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2">
          <For each={knowledge()}>
            {(entry) => (
              <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-semibold text-[var(--text-primary)]">{entry.title}</h3>
                  <span class="shrink-0 rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-[10px] font-mono uppercase text-[var(--accent-lima)]">
                    {entry.source_type}
                  </span>
                </div>
                <Show when={entry.content}>
                  <p class="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{entry.content}</p>
                </Show>
                <Show when={entry.tags && entry.tags.length > 0}>
                  <div class="mt-3 flex flex-wrap gap-1">
                    <For each={entry.tags!}>
                      {(tag) => (
                        <span class="rounded-full border border-[var(--border-primary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          #{tag}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
          <Show when={knowledge().length === 0}>
            <div class="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">Nenhuma entrada de conhecimento.</div>
          </Show>
        </div>
      </Show>
    </div>
  );
}