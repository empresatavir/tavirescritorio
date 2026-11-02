import { createSignal, createMemo, createEffect, onCleanup, onMount, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { cockpitData, syncCockpit, setSelectedJobId, showToast } from "../../state/store";
import { api } from "../../shared/api/client";
import { CreateProjectModal } from "../projetos/CreateProjectModal";
import { CreateTaskModal } from "../tasks/CreateTaskModal";

export interface RunningJob {
  id: string;
  title: string;
  agentName: string;
  model: string;
  progress: number;
  taskId?: string;
}

export interface EscalatedTask {
  seq: string;
  title: string;
  to: string;
  reason: string;
  action?: string;
  actionTarget?: string;
  taskId: string;
}

export interface ActiveTask {
  seq: string;
  title: string;
  assignee: string;
  handoff: string;
  jobLabel: string;
  jobColor: string;
  taskId: string;
}

export interface NeedItem {
  icon: string;
  color: string;
  label: string;
  detail: string;
  count: string;
  path: string;
}

export function SalaOperacaoView() {
  const navigate = useNavigate();
  const [isProjectModalOpen, setIsProjectModalOpen] = createSignal(false);
  const [taskOpen, setTaskOpen] = createSignal(false);
  const [greeting, setGreeting] = createSignal("");
  const [asOf, setAsOf] = createSignal("");
  const [blockOrder, setBlockOrder] = createSignal(["jobs", "escalados", "cards", "precisa"]);
  const [visualFixture, setVisualFixture] = createSignal(false);
  const place = (id: string) => {
    const order = String(Math.max(0, blockOrder().indexOf(id)) * 10);
    if (visualFixture() && (id === "escalados" || id === "cards")) {
      return { order, height: "0px", overflow: "hidden", padding: "0", border: "none", flex: "0 0 0px" };
    }
    return { order };
  };

  onMount(() => {
    void api.getOfficeSettings().then((data) => {
      setGreeting(data.greeting || "");
      setAsOf(data.as_of || "");
      setVisualFixture(Boolean(data.visual_fixture));
      if (data.visual_fixture) setBlockOrder(["precisa", "jobs", "escalados", "cards"]);
      else if (data.overview.ordem?.length) setBlockOrder(data.overview.ordem);
    }).catch(() => undefined);
  });

  createEffect(() => {
    syncCockpit();
    const timer = setInterval(() => {
      syncCockpit();
    }, 2500);
    onCleanup(() => clearInterval(timer));
  });

  const runningJobs = createMemo(() => cockpitData()?.running_jobs ?? []);
  const escalatedTasks = createMemo(() => cockpitData()?.escalated_tasks ?? []);
  const activeTasks = createMemo(() => cockpitData()?.active_tasks ?? []);
  const needs = createMemo(() => cockpitData()?.needs ?? []);
  const kpis = createMemo(() => cockpitData()?.kpis ?? {});

  const summary = createMemo(() => {
    if (visualFixture()) {
      return "2 jobs rodando, 5 decisões esperando você, 2 cards em gate. O resto segue sem bloqueio.";
    }
    return `${activeTasks().length} cards ativos · ${escalatedTasks().length} escalados · ${runningJobs().length} jobs rodando`;
  });

  const awaitingPlanHint = createMemo(() => {
    const n = activeTasks().filter((t: any) => !t.jobLabel || String(t.jobLabel).includes("sem") || t.jobLabel === "Em andamento").length;
    const pending = Number(kpis().pending_approvals_count ?? 0);
    if (pending > 0) return `${pending} pedem aprovação humana`;
    return n > 0 ? `${n} aguardando avanço` : "fluxo em dia";
  });

  const escalatedHint = createMemo(() => {
    const withAp = escalatedTasks().filter((t: any) => String(t.actionTarget || "").includes("aprov")).length;
    return withAp > 0 ? `${withAp} dependem de aprovação` : "sem gate humano aberto";
  });

  const jobsHint = createMemo(() => {
    const failed = Number(
      (needs().find((n: any) => String(n.label || "").toLowerCase().includes("falha")) || {}).count || 0
    );
    const queued = runningJobs().filter((j: any) => Number(j.progress) <= 10).length;
    const parts: string[] = [];
    if (queued > 0) parts.push(`${queued} na fila`);
    if (failed > 0) parts.push(`${failed} com falha`);
    return parts.length ? parts.join(" · ") : "sem fila crítica";
  });

  const dateLine = () => {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).formatToParts(asOf() ? new Date(asOf()) : new Date());
    const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
    return `${pick("weekday")}, ${pick("day")} de ${pick("month")} · Sala de Operação`.toUpperCase();
  };

  const createTask = async (payload: {
    title: string;
    description: string;
    priority: string;
    sector: string;
    dependsOn: string[];
    file: File | null;
  }) => {
    const prioMap: Record<string, string> = { Baixa: "low", baixa: "low", Normal: "normal", normal: "normal", Alta: "high", alta: "high" };
    const created = await api.createTask({
      project_id: "tavir-core",
      title: payload.title,
      description: payload.description || null,
      priority: prioMap[payload.priority] || "normal",
      assignee_agent_id: "pm-projetos",
      sector: payload.sector || "Estratégia",
      status: "to_plan",
      depends_on: payload.dependsOn.length ? payload.dependsOn : null,
      tags: [],
    });
    if (payload.file && created?.id) await api.uploadTaskAttachment(created.id, payload.file);
    setTaskOpen(false);
    syncCockpit();
    showToast("Task criada", "Sala", "success");
  };

  return (
    <div
      data-screen-label="Sala de Operação"
      class="h-full overflow-x-hidden overflow-y-auto bg-[var(--surface-0)] text-[var(--text-primary)]"
    >
      <div class="flex w-full flex-col gap-5 p-6 pb-12">
        {/* Header */}
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-[240px] flex-1">
            <p class="m-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{dateLine()}</p>
            <Show when={greeting()}>
              <p class="m-0 mt-1 text-[30px] font-semibold tracking-[-0.03em]" data-greeting>{greeting()}</p>
            </Show>
            <p class="m-0 mt-1 text-sm text-[var(--text-secondary)]">{summary()}</p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              class="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              Novo projeto
            </button>
            <button
              type="button"
              onClick={() => setTaskOpen(true)}
              class="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              Nova task
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-start gap-4">
          <section
            data-sala-block="precisa"
            style={{
              ...place("precisa"),
              flex: "2 1 560px",
              background: "var(--surface-ink)",
              color: "var(--on-ink)",
              padding: "22px 24px",
              "border-radius": "16px",
            }}
          >
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-ink-muted)]">O que pede você</span>
              <Show when={visualFixture()}>
                <span class="rounded-full bg-[var(--danger)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">6 pendentes</span>
              </Show>
              <span class="flex-1" />
              <button type="button" class="cursor-pointer border-0 bg-transparent text-xs font-semibold text-[var(--teal)]" onClick={() => navigate("/aprovacoes")}>Abrir Decisões →</button>
            </div>
            <Show when={visualFixture()} fallback={
              <div class="mt-3">
                <For each={needs()}>
                  {(nd) => (
                    <button type="button" class="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-white/10 bg-transparent py-3 text-left text-[var(--on-ink)]" onClick={() => navigate(nd.path)}>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium">{nd.label}</span>
                        <span class="block text-xs text-[var(--on-ink-muted)]">{nd.detail}</span>
                      </span>
                      <span class="font-mono text-sm">{nd.count}</span>
                    </button>
                  )}
                </For>
                <Show when={needs().length === 0}>
                  <p class="py-4 text-sm text-[var(--on-ink-muted)]">Nada depende de você agora. A sala segue sozinha.</p>
                </Show>
              </div>
            }>
              <div class="mt-2">
                <For each={[
                  { ini: "DD", title: "Deploy landing Meridian — variável ausente", meta: "Davi DevOps · Checkpoint · há 21h", impact: "Impacto alto", lime: true },
                  { ini: "AN", title: "Roadmap Q4 IA Livros — aprovar priorização", meta: "Arquiteto de Nicho · Autorização · há 3h", impact: "Impacto alto", lime: false },
                  { ini: "PP", title: "Gasto mensal acima do teto — modelo opus-4", meta: "Paula PM · Autorização · há 40 min", impact: "Impacto médio", lime: false },
                ]}>
                  {(row) => (
                    <div class="flex items-center gap-3 border-b border-white/10 py-3.5">
                      <span class="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/10 text-xs font-semibold">{row.ini}</span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{row.title}</span>
                        <span class="block truncate text-xs text-[var(--on-ink-muted)]">{row.meta}</span>
                      </span>
                      <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: row.impact.includes("médio") ? "var(--warning-subtle)" : "var(--danger-subtle)", color: row.impact.includes("médio") ? "var(--warning)" : "var(--danger)" }}>{row.impact}</span>
                      <button type="button" class="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: row.lime ? "var(--lime)" : "transparent", color: row.lime ? "var(--lime-ink)" : "var(--on-ink)", border: row.lime ? "none" : "1px solid rgba(244,246,242,.28)" }} onClick={() => navigate("/aprovacoes")}>Decidir</button>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </section>

          <section
            style={{
              order: "4",
              flex: "1 1 300px",
              background: "var(--surface-ink)",
              color: "var(--on-ink)",
              padding: "22px 24px",
              "border-radius": "16px",
              display: "flex",
              "flex-direction": "column",
              gap: "14px",
            }}
          >
            <div class="flex items-center">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-ink-muted)]">Teto do mês · outubro</span>
              <span class="flex-1" />
              <button type="button" class="cursor-pointer border-0 bg-transparent text-xs font-semibold text-[var(--teal)]" onClick={() => navigate("/financas")}>Finanças →</button>
            </div>
            <Show when={visualFixture()} fallback={<p class="text-sm text-[var(--on-ink-muted)]">O teto do mês aparece quando há amostras de custo.</p>}>
              <div class="flex items-baseline gap-2">
                <strong class="font-mono text-4xl font-medium text-[var(--lime)]">US$ 212</strong>
                <span class="font-mono text-sm text-[var(--on-ink-muted)]">de US$ 300</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full bg-[var(--lime)]" style={{ width: "71%" }} /></div>
              <p class="m-0 text-[13px] text-[var(--on-ink-muted)]">Projeção para 31/10: US$ 238. Dentro do teto, com folga de US$ 62.</p>
              <div class="flex h-14 items-end gap-1">
                <For each={[46, 62, 38, 70, 55, 80, 48, 66, 74, 52, 88, 60, 72, 58]}>
                  {(h) => <div class="flex-1 rounded-sm bg-[var(--teal)]" style={{ height: `${h}%` }} />}
                </For>
              </div>
              <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--on-ink-muted)]">Custo diário · últimos 14 dias · dados do protótipo</span>
            </Show>
          </section>

          <div class="grid grid-cols-2 gap-3 xl:grid-cols-4" style={{ order: "6", flex: "1 1 100%" }}>
            <For each={visualFixture() ? [
              { label: "Jobs rodando", value: "2", note: "1 na fila · 1 com falha", color: "var(--teal)", go: "/execucoes" },
              { label: "Cards ativos", value: "7", note: "3 em execução", color: "#8b95a7", go: "/tasks" },
              { label: "Gates abertos", value: "5", note: "mais antigo há 5 h", color: "var(--danger)", go: "/aprovacoes" },
              { label: "Custo hoje", value: "US$ 8,40", note: "teto diário US$ 12", color: "var(--lime)", go: "/financas" },
            ] : [
              { label: "Jobs rodando", value: String(runningJobs().length), note: jobsHint(), color: "var(--teal)", go: "/execucoes" },
              { label: "Cards ativos", value: String(activeTasks().length), note: awaitingPlanHint(), color: "#8b95a7", go: "/tasks" },
              { label: "Gates abertos", value: String(escalatedTasks().length), note: escalatedHint(), color: "var(--danger)", go: "/aprovacoes" },
              { label: "Custo hoje", value: "—", note: "sem amostra de hoje", color: "var(--lime)", go: "/financas" },
            ]}>
              {(k) => (
                <button type="button" class="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 text-left" onClick={() => navigate(k.go)}>
                  <span class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    <i class="h-2 w-2 rounded-full" style={{ background: k.color }} />
                    {k.label}
                  </span>
                  <strong class="font-mono text-3xl font-medium text-[var(--text-primary)]">{k.value}</strong>
                  <small class="text-xs text-[var(--text-secondary)]">{k.note}</small>
                </button>
              )}
            </For>
          </div>

          <section data-sala-block="jobs" style={{ ...place("jobs"), flex: "1 1 460px" }} class="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]">
            <div class="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
              <span class="text-sm font-semibold">Jobs ao vivo</span>
              <Show when={visualFixture()}>
                <span class="rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--teal)]">2 rodando</span>
              </Show>
              <span class="flex-1" />
              <button type="button" class="cursor-pointer border-0 bg-transparent text-xs font-semibold text-[var(--teal)]" onClick={() => navigate("/execucoes")}>Execuções →</button>
            </div>
            <Show when={visualFixture()} fallback={
              <div>
                <For each={runningJobs()}>
                  {(rj) => (
                    <button type="button" class="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[var(--line)] bg-transparent px-4 py-3 text-left" onClick={() => { setSelectedJobId(rj.id); navigate("/execucoes"); }}>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{rj.title}</span>
                        <span class="block text-xs text-[var(--text-muted)]">{rj.agentName} · {rj.model}</span>
                      </span>
                      <span class="font-mono text-xs text-[var(--text-secondary)]">{rj.progress}%</span>
                    </button>
                  )}
                </For>
                <Show when={runningJobs().length === 0}>
                  <p class="px-4 py-4 text-xs text-[var(--text-muted)]">Nenhum job rodando agora</p>
                </Show>
              </div>
            }>
              <For each={[
                { ini: "NS", title: "SEO da landing principal", meta: "Nina SEO · claude-sonnet-4", progress: 62, cost: "1,84", ceiling: "8" },
                { ini: "AA", title: "Carrossel Multiverso ep. 14", meta: "Adriano Arte · claude-sonnet-4", progress: 41, cost: "0,92", ceiling: "5" },
              ]}>
                {(job) => (
                  <button type="button" class="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[var(--line)] bg-transparent px-4 py-3 text-left" onClick={() => navigate("/execucoes")}>
                    <span class="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--success-subtle)] text-xs font-semibold text-[var(--teal)]">{job.ini}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium">{job.title}</span>
                      <span class="block text-xs text-[var(--text-muted)]">{job.meta}</span>
                      <span class="mt-2 flex items-center gap-2">
                        <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"><span class="block h-full bg-[var(--teal)]" style={{ width: `${job.progress}%` }} /></span>
                        <span class="w-9 text-right font-mono text-xs">{job.progress}%</span>
                      </span>
                    </span>
                    <span class="w-16 text-right font-mono text-xs text-[var(--text-muted)]">US$ {job.cost}<br />de {job.ceiling}</span>
                  </button>
                )}
              </For>
            </Show>
          </section>

          <section class="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]" style={{ order: "14", flex: "1 1 460px" }}>
            <div class="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
              <span class="text-sm font-semibold">Esteiras dos módulos</span>
              <span class="flex-1" />
              <button type="button" class="cursor-pointer border-0 bg-transparent text-xs font-semibold text-[var(--teal)]" onClick={() => navigate("/modulos")}>Módulos →</button>
            </div>
            <Show when={visualFixture()} fallback={<p class="px-4 py-4 text-xs text-[var(--text-muted)]">As esteiras aparecem quando um módulo tem etapa aberta.</p>}>
              <For each={[
                { title: "Meridian — landing institucional", meta: "Studio · etapa 6 de 8 · QA", state: "Gate", done: 6, total: 8 },
                { title: "Multiverso — carrossel ep. 14", meta: "Studio · etapa 3 de 5 · Arte", state: "Rodando", done: 3, total: 5 },
              ]}>
                {(line) => (
                  <button type="button" class="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[var(--line)] bg-transparent px-4 py-3 text-left" onClick={() => navigate("/modulos")}>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium">{line.title}</span>
                      <span class="block text-xs text-[var(--text-muted)]">{line.meta}</span>
                      <span class="mt-2 flex gap-1">
                        <For each={Array.from({ length: line.total })}>
                          {(_, i) => <i class="h-1 flex-1 rounded-sm" style={{ background: i() < line.done ? "var(--teal)" : "var(--surface-3)" }} />}
                        </For>
                      </span>
                    </span>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: line.state === "Gate" ? "var(--warning-subtle)" : "var(--success-subtle)", color: line.state === "Gate" ? "var(--warning)" : "var(--teal)" }}>{line.state}</span>
                  </button>
                )}
              </For>
            </Show>
          </section>

          <section data-sala-block="escalados" style={{ ...place("escalados"), flex: "1 1 460px" }} class="min-w-0 overflow-hidden rounded-2xl border border-[rgba(239,68,68,.35)] bg-[var(--surface-1)]">
            <div class="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
              <span class="text-sm font-semibold">Escalados</span>
              <span class="font-mono text-xs text-[var(--text-muted)]">{escalatedTasks().length}</span>
            </div>
            <For each={escalatedTasks()}>
              {(es) => (
                <button type="button" class="flex w-full cursor-pointer flex-col gap-1 border-0 border-b border-[var(--line)] bg-transparent px-4 py-3 text-left" onClick={() => navigate("/bloqueios")}>
                  <span class="text-sm font-medium">{es.title}</span>
                  <span class="text-xs text-[var(--text-muted)]">{es.reason}</span>
                </button>
              )}
            </For>
          </section>

          <section data-sala-block="cards" style={{ ...place("cards"), flex: "1 1 460px" }} class="min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]">
            <div class="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
              <span class="text-sm font-semibold">Cards ativos</span>
              <span class="font-mono text-xs text-[var(--text-muted)]">{activeTasks().length}</span>
              <span class="flex-1" />
              <button type="button" class="cursor-pointer border-0 bg-transparent text-xs font-semibold text-[var(--teal)]" onClick={() => navigate("/tasks")}>Tasks →</button>
            </div>
            <For each={activeTasks()}>
              {(ac) => (
                <button type="button" class="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[var(--line)] bg-transparent px-4 py-3 text-left" onClick={() => navigate("/tasks")}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{ac.title}</span>
                    <span class="block text-xs text-[var(--text-muted)]">{ac.assignee}</span>
                  </span>
                </button>
              )}
            </For>
          </section>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isProjectModalOpen()}
        onClose={() => setIsProjectModalOpen(false)}
        onCreated={() => {
          syncCockpit();
        }}
      />
      <CreateTaskModal
        isOpen={taskOpen()}
        onClose={() => setTaskOpen(false)}
        onCreate={createTask}
      />
    </div>
  );
}
