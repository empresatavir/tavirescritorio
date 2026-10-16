import { createSignal, For, Show } from "solid-js";

interface ApprovalItem {
  id: string;
  requester: string;
  type: string;
  impact: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function Aprovacoes() {
  const [approvals] = createSignal<ApprovalItem[]>([
    {
      id: "appr-001",
      requester: "Atlas",
      type: "Deploy em produção",
      impact: "Atualiza versão do painel operacional",
      status: "pending",
      created_at: "2026-10-16T03:45:00Z",
    },
    {
      id: "appr-002",
      requester: "Luna",
      type: "Publicação de conteúdo",
      impact: "Artigo sobre automação no blog institucional",
      status: "pending",
      created_at: "2026-10-16T03:30:00Z",
    },
  ]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-[rgba(183,243,74,0.15)] text-[var(--accent-lima)]";
      case "approved":
        return "bg-[rgba(27,197,189,0.15)] text-[var(--accent-teal)]";
      case "rejected":
        return "bg-[rgba(239,68,68,0.15)] text-[var(--danger,#ef4444)]";
      default:
        return "bg-[var(--bg-hover)] text-[var(--text-muted)]";
    }
  };

  return (
    <div class="flex h-full flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-[var(--text-h2)] font-bold tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          Aprovações
        </h1>
        <span class="rounded-full bg-[var(--bg-active)] px-3 py-1 text-xs font-mono text-[var(--accent-lima)]">
          {approvals().filter((a) => a.status === "pending").length} pendentes
        </span>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3">
        <Show when={approvals().length === 0}>
          <div class="py-12 text-center text-sm text-[var(--text-muted)]">
            Nenhuma aprovação pendente.
          </div>
        </Show>
        <For each={approvals()}>
          {(approval) => (
            <div class="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[var(--accent-teal)]">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-[var(--text-primary)]">
                      {approval.type}
                    </span>
                    <span class={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${statusBadge(approval.status)}`}>
                      {approval.status}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-[var(--text-secondary)]">{approval.impact}</p>
                  <div class="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>Solicitante: <span class="font-medium text-[var(--text-primary)]">{approval.requester}</span></span>
                    <span>{new Date(approval.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
                <Show when={approval.status === "pending"}>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      class="rounded-[var(--radius-sm)] border border-[var(--accent-teal)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--accent-teal)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--accent-teal)] hover:text-[var(--ink-primary)]"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      class="rounded-[var(--radius-sm)] border border-[var(--danger,#ef4444)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--danger,#ef4444)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--danger,#ef4444)] hover:text-white"
                    >
                      Rejeitar
                    </button>
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