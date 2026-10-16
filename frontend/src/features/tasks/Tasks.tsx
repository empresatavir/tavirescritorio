import { createSignal, For, Show } from "solid-js";

interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "running" | "completed";
  priority: string;
  sector?: string;
}

export function Tasks() {
  const [tasks] = createSignal<TaskItem[]>([
    { id: "1", title: "Validar ciclo de job mínimo", status: "pending", priority: "high", sector: "Engenharia" },
    { id: "2", title: "Implementar design system tokens", status: "completed", priority: "medium", sector: "Design" },
    { id: "3", title: "Configurar migrações Alembic", status: "completed", priority: "high", sector: "Engenharia" },
  ]);

  const columnClass = (status: string) => {
    switch (status) {
      case "pending": return "border-t-2 border-t-[var(--accent-lima)]";
      case "running": return "border-t-2 border-t-[var(--accent-teal)]";
      case "completed": return "border-t-2 border-t-[var(--surface-slate)]";
      default: return "";
    }
  };

  const columns = [
    { key: "pending", label: "Pendente" },
    { key: "running", label: "Andamento" },
    { key: "completed", label: "Concluído" },
  ];

  return (
    <div class="flex h-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Tasks
        </h1>
        <span class="rounded-full bg-[var(--bg-active)] px-3 py-1 text-xs font-mono text-[var(--accent-lima)]">
          {tasks().length} total
        </span>
      </div>

      <div class="grid flex-1 grid-cols-3 gap-4 overflow-hidden">
        <For each={columns}>
          {(col) => (
            <div class={`flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] ${columnClass(col.key)}`}>
              <div class="border-b border-[var(--border-primary)] px-4 py-3">
                <h3 class="text-[var(--text-label)] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                  {col.label}
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto p-3 space-y-2">
                <For each={tasks().filter((t) => t.status === col.key)}>
                  {(task) => (
                    <div class="rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
                      <div class="flex items-start justify-between gap-2">
                        <span class="text-sm font-medium text-[var(--text-primary)]">{task.title}</span>
                        <span class={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          task.priority === "high"
                            ? "bg-[rgba(183,243,74,0.15)] text-[var(--accent-lima)]"
                            : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <Show when={task.sector}>
                        <p class="mt-1.5 text-[11px] font-mono uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                          {task.sector}
                        </p>
                      </Show>
                    </div>
                  )}
                </For>
                <Show when={tasks().filter((t) => t.status === col.key).length === 0}>
                  <div class="py-8 text-center text-xs text-[var(--text-muted)]">
                    Nenhuma task nesta coluna
                  </div>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}