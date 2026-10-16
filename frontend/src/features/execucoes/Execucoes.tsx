import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { api, type Job, type JobEvent } from "../../shared/api/client";

export function Execucoes() {
  const [jobs, setJobs] = createSignal<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = createSignal<string | null>(null);
  const [events, setEvents] = createSignal<JobEvent[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Fetch jobs list
  createEffect(async () => {
    try {
      setLoading(true);
      // For now, we don't have a list endpoint, so we'll show empty state
      // In production this would be GET /api/v1/jobs/
      setJobs([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar execuções");
    } finally {
      setLoading(false);
    }
  });

  // Subscribe to SSE when a job is selected
  createEffect(() => {
    const jobId = selectedJobId();
    if (!jobId) return;

    setEvents([]);
    const controller = api.subscribeJobEvents(
      jobId,
      (event) => {
        setEvents((prev) => [...prev, event]);
      },
      (err) => {
        console.error("SSE error:", err);
      }
    );

    onCleanup(() => controller.abort());
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "text-[var(--accent-teal)]";
      case "failed": return "text-[var(--danger, #ef4444)]";
      case "running": return "text-[var(--accent-lima)]";
      case "preflight": return "text-[var(--text-muted)]";
      default: return "text-[var(--text-secondary)]";
    }
  };

  return (
    <div class="flex h-full gap-6">
      {/* Jobs List */}
      <div class="w-80 flex-shrink-0 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div class="border-b border-[var(--border-primary)] p-4">
          <h2 class="text-[var(--text-h3)] font-semibold text-[var(--text-primary)]">
            Execuções
          </h2>
        </div>
        <Show when={loading()}>
          <div class="p-4 text-sm text-[var(--text-muted)]">Carregando...</div>
        </Show>
        <Show when={error()}>
          <div class="p-4 text-sm text-[var(--danger, #ef4444)]">{error()}</div>
        </Show>
        <Show when={!loading() && !error() && jobs().length === 0}>
          <div class="p-4 text-sm text-[var(--text-muted)]">
            Nenhuma execução registrada. Use o modal de novo job para iniciar.
          </div>
        </Show>
        <For each={jobs()}>
          {(job) => (
            <button
              type="button"
              onClick={() => setSelectedJobId(job.id)}
              class={`w-full border-b border-[var(--border-primary)] p-3 text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--bg-hover)] ${
                selectedJobId() === job.id ? "bg-[var(--bg-active)]" : ""
              }`}
            >
              <div class="flex items-center justify-between">
                <span class="truncate text-sm font-medium text-[var(--text-primary)]">
                  {job.origin}
                </span>
                <span class={`text-xs font-mono ${statusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div class="mt-1 truncate text-xs text-[var(--text-muted)] font-mono">
                {job.id.slice(0, 8)}
              </div>
            </button>
          )}
        </For>
      </div>

      {/* Event Log Panel */}
      <div class="flex flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div class="border-b border-[var(--border-primary)] p-4">
          <h2 class="text-[var(--text-h3)] font-semibold text-[var(--text-primary)]">
            Log de Eventos
          </h2>
          <Show when={selectedJobId()}>
            <p class="mt-1 text-xs font-mono text-[var(--text-muted)]">
              Job: {selectedJobId()}
            </p>
          </Show>
        </div>
        <div class="flex-1 overflow-y-auto p-4 font-mono text-sm">
          <Show when={!selectedJobId()}>
            <p class="text-[var(--text-muted)]">
              Selecione uma execução para ver o log de eventos.
            </p>
          </Show>
          <For each={events()}>
            {(event) => (
              <div class="mb-2 border-l-2 border-[var(--accent-teal)] pl-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-[var(--text-muted)]">
                    {event.created_at}
                  </span>
                  <span class="rounded bg-[var(--bg-active)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent-lima)]">
                    {event.action}
                  </span>
                  <Show when={event.new_state}>
                    <span class="text-xs text-[var(--text-secondary)]">
                      → {event.new_state}
                    </span>
                  </Show>
                </div>
                <Show when={event.details}>
                  <p class="mt-1 text-xs text-[var(--text-muted)]">
                    {event.details}
                  </p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}