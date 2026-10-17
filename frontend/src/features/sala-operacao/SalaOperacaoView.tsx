import { createMemo, createEffect, onCleanup, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../shared/components/TvIcon";
import { cockpitData, syncCockpit } from "../../state/store";

interface RunningJob {
  id: string;
  title: string;
  agentName: string;
  model: string;
  progress: number;
  taskId?: string;
}

interface EscalatedTask {
  seq: string;
  title: string;
  to: string;
  reason: string;
  action?: string;
  actionTarget?: string;
  taskId: string;
}

interface ActiveTask {
  seq: string;
  title: string;
  assignee: string;
  handoff: string;
  jobLabel: string;
  jobColor: string;
  taskId: string;
}

interface NeedItem {
  icon: string;
  color: string;
  label: string;
  detail: string;
  count: string;
  path: string;
}

export function SalaOperacaoView() {
  const navigate = useNavigate();

  createEffect(() => {
    syncCockpit();
    const timer = setInterval(() => {
      syncCockpit();
    }, 3000);
    onCleanup(() => clearInterval(timer));
  });

  const defaultRunningJobs: RunningJob[] = [
    { id: "job-001", title: "Gerar relatório de custos Q3", agentName: "Analista", model: "gpt-4o", progress: 67, taskId: "task-01" },
    { id: "job-002", title: "Revisar conteúdo LP Nicho Advocacia", agentName: "Revisor", model: "claude-sonnet-4", progress: 34, taskId: "task-02" },
    { id: "job-003", title: "Sintetizar capítulo \"Frameworks de Crescimento\"", agentName: "Redator", model: "claude-sonnet-4", progress: 89, taskId: "task-03" },
  ];

  const defaultEscalatedTasks: EscalatedTask[] = [
    { seq: "#9", title: "Roadmap Q4 — IA Livros", to: "CEO", reason: "aprovação ap-01 pendente", action: "Decidir", actionTarget: "/aprovacoes", taskId: "task-09" },
    { seq: "#7", title: "Deploy landing Meridian", to: "Orquestrador", reason: "configuração / credencial", action: "Ver falha", actionTarget: "/execucoes", taskId: "task-07" },
    { seq: "#1", title: "Relatório de custos Q3 — revisão final", to: "Arquiteto", reason: "gate: Aprovação CEO", taskId: "task-01" },
    { seq: "#3", title: "Capítulo \"Frameworks de Crescimento\"", to: "Arquiteto", reason: "gate: Aprovação Editorial", taskId: "task-03" },
  ];

  const defaultActiveTasks: ActiveTask[] = [
    { seq: "#1", title: "Relatório de custos Q3 — revisão final", assignee: "Analista", handoff: "Redator → Revisor", jobLabel: "Rodando · 67%", jobColor: "var(--teal)", taskId: "task-01" },
    { seq: "#2", title: "Conteúdo LP Nicho Advocacia", assignee: "Redator", handoff: "Redator → Revisor → Deployer", jobLabel: "Rodando · 34%", jobColor: "var(--teal)", taskId: "task-02" },
    { seq: "#3", title: "Capítulo \"Frameworks de Crescimento\"", assignee: "Redator", handoff: "Redator → Revisor", jobLabel: "Rodando · 89%", jobColor: "var(--teal)", taskId: "task-03" },
    { seq: "#11", title: "Documentação API v2", assignee: "Documentador", handoff: "sem handoff", jobLabel: "Falhou · 58%", jobColor: "oklch(0.635 0.185 27)", taskId: "task-11" },
  ];

  const defaultNeeds: NeedItem[] = [
    { icon: "shield-check", color: "oklch(0.80 0.155 78)", label: "Aprovações pendentes", detail: "Roadmap Q4 IA Livros — aprovar priorização", count: "5", path: "/aprovacoes" },
    { icon: "circle-x", color: "oklch(0.635 0.185 27)", label: "Execuções com falha", detail: "configuração / credencial · comunicação com o agente", count: "4", path: "/execucoes" },
    { icon: "octagon-alert", color: "oklch(0.635 0.185 27)", label: "Bloqueios", detail: "credencial ausente · decisões pendentes", count: "3", path: "/bloqueios" },
    { icon: "file-signature", color: "oklch(0.80 0.155 78)", label: "Propostas pendentes", detail: "Atlas Holdings · Bluepeak Studio", count: "2", path: "/propostas" },
    { icon: "factory", color: "oklch(0.80 0.155 78)", label: "Pendências da Tavir Fábrica", detail: "Landing Meridian Capital · Portal Atlas", count: "4", path: "/fabrica" },
    { icon: "sparkles", color: "oklch(0.80 0.155 78)", label: "Aprovações do Tavir Studio", detail: "Datavir · Por que sua PME ainda decide no escuro", count: "2", path: "/studio" },
  ];

  const runningJobs = createMemo(() => cockpitData()?.running_jobs ?? defaultRunningJobs);
  const escalatedTasks = createMemo(() => cockpitData()?.escalated_tasks ?? defaultEscalatedTasks);
  const activeTasks = createMemo(() => cockpitData()?.active_tasks ?? defaultActiveTasks);
  const needs = createMemo(() => cockpitData()?.needs ?? defaultNeeds);

  const summary = createMemo(() => {
    if (cockpitData()?.summary_text) return cockpitData().summary_text;
    return `${activeTasks().length} cards ativos · ${escalatedTasks().length} escalados · ${runningJobs().length} jobs rodando`;
  });

  return (
    <div
      data-screen-label="Sala de Operação"
      class="h-full overflow-x-hidden overflow-y-auto bg-[var(--surface-0)] text-[var(--text-primary)]"
    >
      <div class="flex w-full flex-col gap-5 p-6 pb-12">
        {/* Header */}
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[240px] flex-1">
            <h1 class="m-0 text-xl font-semibold tracking-tight">Sala de Operação</h1>
            <p class="m-0 mt-1 text-sm text-[var(--text-secondary)]">{summary()}</p>
          </div>
        </div>

        {/* 3 KPI Cards */}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={() => navigate("/tasks")}
            class="flex flex-col gap-1.5 rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4 px-4.5 text-left text-[var(--cloud)] transition-colors hover:border-[var(--cloud)]"
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[var(--cloud)]" />
              <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                Cards ativos
              </span>
              <span class="flex-1" />
              <span class="text-xs text-[var(--muted,#aeb7c4)]">Tasks →</span>
            </div>
            <span class="font-mono text-3xl font-medium leading-tight text-[var(--cloud)]">
              {activeTasks().length}
            </span>
            <span class="text-xs text-[var(--t2,#cbd3de)]">
              5 pendentes aguardando início
            </span>
          </button>

          <button
            onClick={() => navigate("/bloqueios")}
            class="flex flex-col gap-1.5 rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4 px-4.5 text-left text-[var(--cloud)] transition-colors hover:border-[oklch(0.635_0.185_27)]"
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[oklch(0.635_0.185_27)]" />
              <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                Escalados
              </span>
              <span class="flex-1" />
              <span class="text-xs text-[var(--muted,#aeb7c4)]">Bloqueios →</span>
            </div>
            <span class="font-mono text-3xl font-medium leading-tight text-[oklch(0.635_0.185_27)]">
              {escalatedTasks().length}
            </span>
            <span class="text-xs text-[var(--t2,#cbd3de)]">
              1 dependem de aprovação
            </span>
          </button>

          <button
            onClick={() => navigate("/execucoes")}
            class="flex flex-col gap-1.5 rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729] p-4 px-4.5 text-left text-[var(--cloud)] transition-colors hover:border-[var(--teal)]"
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[var(--teal)]" />
              <span class="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted,#aeb7c4)]">
                Jobs rodando
              </span>
              <span class="flex-1" />
              <span class="text-xs text-[var(--muted,#aeb7c4)]">Execuções →</span>
            </div>
            <span class="font-mono text-3xl font-medium leading-tight text-[var(--teal)]">
              {runningJobs().length}
            </span>
            <span class="text-xs text-[var(--t2,#cbd3de)]">
              2 na fila · 4 com falha
            </span>
          </button>
        </div>

        {/* 4 Big Operational Sections */}
        <div class="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          {/* Section 1: Jobs rodando */}
          <section class="flex h-[380px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729]">
            <div class="flex items-center gap-2.5 border-b border-[rgba(244,246,242,.10)] p-3 px-4">
              <span class="text-sm font-semibold text-[var(--cloud)]">Jobs rodando</span>
              <span class="font-mono text-xs text-[var(--muted,#aeb7c4)]">{runningJobs().length}</span>
              <span class="flex-1" />
              <button
                onClick={() => navigate("/execucoes")}
                class="border-none bg-transparent p-0 text-xs font-medium text-[var(--teal)] hover:underline"
              >
                Execuções →
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <For each={runningJobs()}>
                {(rj) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/execucoes")}
                    class="grid cursor-pointer grid-cols-[1fr_120px] items-center gap-3.5 border-b border-[rgba(244,246,242,.10)] p-3 px-4 transition-colors hover:bg-[#141f35]"
                  >
                    <div class="min-w-0">
                      <div class="truncate text-xs font-medium text-[var(--cloud)]">{rj.title}</div>
                      <div class="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted,#aeb7c4)]">
                        <Show when={rj.taskId}>
                          {(tid) => (
                            <span class="inline-flex h-5 items-center rounded-full border border-[rgba(27,197,189,.45)] bg-[rgba(27,197,189,.08)] px-2 font-mono text-[10px] font-medium text-[var(--teal)]">
                              #{tid().replace("task-", "")}
                            </span>
                          )}
                        </Show>
                        <span class="truncate">
                          {rj.agentName} · <span class="font-mono">{rj.model}</span>
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="h-1 flex-1 overflow-hidden rounded bg-[rgba(244,246,242,.12)]">
                        <div
                          class="h-full bg-[var(--teal)]"
                          style={{ width: `${rj.progress}%` }}
                        />
                      </div>
                      <span class="w-8 text-right font-mono text-[11px] text-[var(--t2,#cbd3de)]">
                        {rj.progress}%
                      </span>
                    </div>
                  </div>
                )}
              </For>
              <Show when={runningJobs().length === 0}>
                <div class="p-4 text-xs text-[var(--muted,#aeb7c4)]">Nenhum job rodando agora</div>
              </Show>
            </div>
          </section>

          {/* Section 2: Escalados */}
          <section class="flex h-[380px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(239,68,68,.35)] bg-[#0f1729]">
            <div class="flex items-center gap-2.5 border-b border-[rgba(244,246,242,.10)] p-3 px-4">
              <span class="text-sm font-semibold text-[var(--cloud)]">Escalados</span>
              <span class="font-mono text-xs text-[var(--muted,#aeb7c4)]">{escalatedTasks().length}</span>
              <span class="flex-1" />
              <button
                onClick={() => navigate("/bloqueios")}
                class="border-none bg-transparent p-0 text-xs font-medium text-[var(--teal)] hover:underline"
              >
                Bloqueios →
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <For each={escalatedTasks()}>
                {(es) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/tasks")}
                    class="flex cursor-pointer flex-col gap-1.5 border-b border-[rgba(244,246,242,.10)] p-3 px-4 transition-colors hover:bg-[#141f35]"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-medium text-[var(--teal)]">{es.seq}</span>
                      <span class="truncate text-xs font-medium text-[var(--cloud)]">{es.title}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="text-[oklch(0.635_0.185_27)]">Escalado para {es.to}</span>
                      <span class="text-[var(--muted,#aeb7c4)]">·</span>
                      <span class="text-[var(--t2,#cbd3de)]">{es.reason}</span>
                      <span class="flex-1" />
                      <Show when={es.action}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (es.actionTarget) navigate(es.actionTarget);
                          }}
                          class="border-none bg-transparent p-0 text-xs font-medium text-[var(--teal)] hover:underline"
                        >
                          {es.action} →
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </section>

          {/* Section 3: Cards ativos */}
          <section class="flex h-[380px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729]">
            <div class="flex items-center gap-2.5 border-b border-[rgba(244,246,242,.10)] p-3 px-4">
              <span class="text-sm font-semibold text-[var(--cloud)]">Cards ativos</span>
              <span class="font-mono text-xs text-[var(--muted,#aeb7c4)]">{activeTasks().length}</span>
              <span class="flex-1" />
              <button
                onClick={() => navigate("/tasks")}
                class="border-none bg-transparent p-0 text-xs font-medium text-[var(--teal)] hover:underline"
              >
                Tasks →
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <For each={activeTasks()}>
                {(ac) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/tasks")}
                    class="grid cursor-pointer grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[rgba(244,246,242,.10)] p-3 px-4 transition-colors hover:bg-[#141f35]"
                  >
                    <span class="font-mono text-xs font-medium text-[var(--teal)]">{ac.seq}</span>
                    <div class="min-w-0">
                      <div class="truncate text-xs font-medium text-[var(--cloud)]">{ac.title}</div>
                      <div class="mt-1 truncate text-xs text-[var(--muted,#aeb7c4)]">
                        {ac.assignee} · {ac.handoff}
                      </div>
                    </div>
                    <span class="whitespace-nowrap font-mono text-xs" style={{ color: ac.jobColor }}>
                      {ac.jobLabel}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </section>

          {/* Section 4: Precisa de você */}
          <section class="flex h-[380px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[rgba(244,246,242,.12)] bg-[#0f1729]">
            <div class="border-b border-[rgba(244,246,242,.10)] p-3 px-4 text-sm font-semibold text-[var(--cloud)]">
              Precisa de você
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <For each={needs()}>
                {(nd) => (
                  <button
                    onClick={() => navigate(nd.path)}
                    class="grid w-full cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-3 border-b border-[rgba(244,246,242,.10)] bg-transparent p-3 px-4 text-left transition-colors hover:bg-[#141f35]"
                  >
                    <TvIcon name={nd.icon} class="h-4 w-4" style={{ color: nd.color }} />
                    <span class="min-w-0">
                      <span class="block text-xs font-medium text-[var(--cloud)]">{nd.label}</span>
                      <span class="mt-0.5 block truncate text-[11px] text-[var(--muted,#aeb7c4)]">
                        {nd.detail}
                      </span>
                    </span>
                    <span class="font-mono text-base font-medium" style={{ color: nd.color }}>
                      {nd.count}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
