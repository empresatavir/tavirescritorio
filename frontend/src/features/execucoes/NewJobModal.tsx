import { createSignal, Show } from "solid-js";
import { api, type CreateJobRequest } from "../../shared/api/client";

interface NewJobModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (jobId: string) => void;
}

export function NewJobModal(props: NewJobModalProps) {
  const [command, setCommand] = createSignal("echo hello-tavir");
  const [timeout, setTimeout_] = createSignal(30);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const req: CreateJobRequest = {
        command: command(),
        timeout: timeout(),
      };
      const job = await api.createJob(req);
      props.onCreated(job.id);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,18,32,0.7)] backdrop-blur-sm">
        <div class="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 shadow-[var(--shadow-elevated)]">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-[var(--text-h3)] font-semibold text-[var(--text-primary)]">
              Novo Job
            </h2>
            <button
              type="button"
              onClick={props.onClose}
              class="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} class="space-y-4">
            <div>
              <label class="mb-1 block text-[var(--text-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                Comando
              </label>
              <input
                type="text"
                value={command()}
                onInput={(e) => setCommand(e.currentTarget.value)}
                class="w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus:border-[var(--accent-teal)]"
                placeholder="echo hello-tavir"
                required
              />
              <p class="mt-1 text-[10px] text-[var(--text-muted)]">
                Permitidos: echo, cat, ls, python
              </p>
            </div>

            <div>
              <label class="mb-1 block text-[var(--text-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                Timeout (segundos)
              </label>
              <input
                type="number"
                value={timeout()}
                onInput={(e) => setTimeout_(Number(e.currentTarget.value))}
                min={1}
                max={300}
                class="w-full rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus:border-[var(--accent-teal)]"
              />
            </div>

            <Show when={error()}>
              <div class="rounded-[var(--radius-sm)] bg-[rgba(239,68,68,0.15)] px-3 py-2 text-xs text-[var(--danger,#ef4444)]">
                {error()}
              </div>
            </Show>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={props.onClose}
                class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting()}
                class="rounded-[var(--radius-sm)] bg-[var(--accent-lima)] px-4 py-2 text-xs font-semibold text-[var(--ink-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[#a6e236] disabled:opacity-50"
              >
                {submitting() ? "Criando..." : "Criar Job"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}