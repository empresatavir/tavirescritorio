import { createSignal, createEffect, createMemo, onCleanup, For, Show } from "solid-js";
import { jobs, setJobs, selectedJobId, setSelectedJobId, setSelectedTaskId, setCurrentScreenId, syncLiveJobs, syncTasks, showToast, type UiJob } from "../../state/store";
import { api, type JobEvent } from "../../shared/api/client";
import { TvIcon } from "../../shared/components/TvIcon";
import { EvidenceViewerModal } from "./EvidenceViewerModal";

// Helper puro de metadados de status
function statusMeta(st: string): { label: string; color: string; bg: string } {
  switch (st) {
    case "running":
      return { label: "Rodando", color: "var(--teal)", bg: "rgba(27,197,189,.14)" };
    case "queued":
      return { label: "Na fila", color: "oklch(.80 .155 78)", bg: "oklch(.80 .155 78 / .14)" };
    case "failed":
      return { label: "Falhou", color: "oklch(.635 .185 27)", bg: "oklch(.635 .185 27 / .14)" };
    case "paused":
      return { label: "Pausado", color: "#aeb7c4", bg: "rgba(244,246,242,.1)" };
    default:
      return { label: "Concluído", color: "#aeb7c4", bg: "rgba(244,246,242,.1)" };
  }
}

// Helper puro de cor de prioridade
function priorityColor(prio: string): string {
  switch (prio) {
    case "critical":
      return "oklch(.635 .185 27)";
    case "high":
      return "oklch(.80 .155 78)";
    case "normal":
      return "#aeb7c4";
    default:
      return "#5E6878";
  }
}

/** Rótulo curto da task — nunca o UUID completo. */
function taskRefLabel(job: Pick<UiJob, "taskId" | "taskSeq">): string {
  if (job.taskSeq != null && Number(job.taskSeq) > 0) return `#${job.taskSeq}`;
  const id = String(job.taskId || "").trim();
  if (!id) return "";
  const legacy = id.match(/^task-(\d+)$/i);
  if (legacy) return `#${legacy[1]}`;
  // UUID ou id longo → 8 chars
  if (id.length > 12) return `#${id.slice(0, 8)}`;
  return `#${id}`;
}

function taskBadgeTitle(job: Pick<UiJob, "taskId" | "taskSeq" | "taskTitle">): string {
  const ref = taskRefLabel(job);
  if (job.taskTitle) return `Task ${ref} · ${job.taskTitle}`;
  return job.taskId ? `Task ${ref}` : ref;
}

// Componente memoizado e isolado de linha da tabela de execuções
function JobRow(props: {
  job: UiJob;
  isSelected: boolean;
  onSelect: () => void;
  onTaskClick: (taskId: string) => void;
}) {
  const sm = () => statusMeta(props.job.status);

  return (
    <div
      onClick={props.onSelect}
      style={{
        width: "100%",
        display: "grid",
        "grid-template-columns": "minmax(180px, 1fr) 110px 80px 60px",
        gap: "14px",
        "align-items": "center",
        padding: "12px 16px",
        "border-top": "1px solid rgba(244,246,242,.08)",
        cursor: "pointer",
        color: "#F4F6F2",
        background: props.isSelected ? "#17223a" : "transparent",
        transition: "background var(--duration-fast) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        if (!props.isSelected) (e.currentTarget as HTMLElement).style.background = "#141f35";
      }}
      onMouseLeave={(e) => {
        if (!props.isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{ "min-width": 0 }}>
        <div
          style={{
            "font-weight": 600,
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            color: "var(--text-primary)",
            "font-size": "13px",
          }}
        >
          {props.job.title}
        </div>
        <div
          style={{
            "margin-top": "4px",
            "font-size": "12px",
            color: "#aeb7c4",
            display: "flex",
            "align-items": "center",
            gap: "6px",
            "flex-wrap": "wrap",
          }}
        >
          {props.job.taskId && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                props.onTaskClick(props.job.taskId!);
              }}
              title={taskBadgeTitle(props.job)}
              style={{
                display: "inline-flex",
                "align-items": "center",
                gap: "4px",
                height: "20px",
                padding: "0 8px",
                "border-radius": "4px",
                border: "1px solid rgba(27,197,189,.4)",
                background: "rgba(27,197,189,.12)",
                color: "var(--teal)",
                "font-family": "var(--font-mono)",
                "font-size": "10px",
                "font-weight": 600,
                cursor: "pointer",
                "max-width": "180px",
                "min-width": 0,
              }}
            >
              <span style={{ flex: "none" }}>{taskRefLabel(props.job)}</span>
              <Show when={props.job.taskTitle}>
                <span
                  style={{
                    color: "rgba(244,246,242,.75)",
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                    "white-space": "nowrap",
                    "font-weight": 500,
                    "min-width": 0,
                  }}
                >
                  · {props.job.taskTitle}
                </span>
              </Show>
            </span>
          )}
          <span>{props.job.agentName}</span>
          <span>·</span>
          <span style={{ "font-family": "var(--font-mono)" }}>{props.job.model}</span>
          <span>·</span>
          <span style={{ color: priorityColor(props.job.priority) }}>{props.job.priority}</span>
        </div>
      </div>

      {/* Barra de Progresso com transição fluida */}
      <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
        <div
          style={{
            flex: 1,
            height: "4px",
            "border-radius": "2px",
            background: "rgba(244,246,242,.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${props.job.progress}%`,
              background: sm().color,
              transition: "width 300ms ease",
            }}
          />
        </div>
        <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "#cbd3de", width: "28px", "text-align": "right" }}>
          {props.job.progress}%
        </span>
      </div>

      {/* Custo */}
      <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "#cbd3de", "text-align": "right" }}>
        US$ {props.job.cost.toFixed(2)}
      </span>

      {/* Horário de Início */}
      <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "#aeb7c4", "text-align": "right" }}>
        {props.job.startedAt}
      </span>
    </div>
  );
}

// Painel lateral isolado do job selecionado
function JobDetailsPanel(props: {
  job: UiJob;
  onTaskClick: (taskId: string) => void;
  onOpenEvidence: () => void;
  logs: Array<[string, "info" | "warn" | "error" | "success", string]>;
}) {
  const sm = () => statusMeta(props.job.status);

  return (
    <div style={{ display: "flex", "flex-direction": "column", height: "100%", overflow: "hidden" }}>
      {/* Header do Drawer */}
      <div style={{ padding: "20px 20px 16px", "border-bottom": "1px solid rgba(244,246,242,.10)" }}>
        <div style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "12px", color: sm().color, "font-weight": 500 }}>
          <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: sm().color }} />
          <span>{sm().label}</span>
          <span style={{ color: "#aeb7c4", "font-family": "var(--font-mono)", "font-weight": 400 }}>{props.job.id}</span>
        </div>
        <h2 style={{ margin: "8px 0 0", "font-size": "16px", "font-weight": 600, "line-height": 1.35, color: "var(--text-primary)" }}>
          {props.job.title}
        </h2>
        <div style={{ "margin-top": "4px", "font-size": "12px", color: "#cbd3de" }}>
          {props.job.agentName} · iniciado {props.job.startedAt}
        </div>

        <div style={{ display: "flex", gap: "8px", "margin-top": "10px", "flex-wrap": "wrap" }}>
          {props.job.taskId && (
            <button
              type="button"
              onClick={() => props.onTaskClick(props.job.taskId!)}
              title={taskBadgeTitle(props.job)}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "8px",
                height: "30px",
                padding: "0 12px",
                "border-radius": "var(--radius-pill)",
                border: "1px solid rgba(27,197,189,.45)",
                background: "rgba(27,197,189,.08)",
                color: "#F4F6F2",
                cursor: "pointer",
                "font-size": "12px",
                "max-width": "100%",
                "min-width": 0,
              }}
            >
              <span
                style={{
                  "font-family": "var(--font-mono)",
                  "font-size": "10px",
                  color: "var(--teal)",
                  "text-transform": "uppercase",
                  "font-weight": 600,
                  flex: "none",
                }}
              >
                Task {taskRefLabel(props.job)}
              </span>
              <Show when={props.job.taskTitle}>
                <span
                  style={{
                    color: "var(--text-secondary, #cbd3de)",
                    "font-weight": 500,
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                    "white-space": "nowrap",
                    "min-width": 0,
                  }}
                >
                  {props.job.taskTitle!.length > 36
                    ? `${props.job.taskTitle!.slice(0, 36)}…`
                    : props.job.taskTitle}
                </span>
              </Show>
              <span style={{ color: "var(--teal)", flex: "none" }}>→</span>
            </button>
          )}

          <button
            type="button"
            onClick={props.onOpenEvidence}
            style={{
              display: "flex",
              "align-items": "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              "border-radius": "var(--radius-pill)",
              border: "1px solid rgba(27,197,189,.35)",
              background: "rgba(27,197,189,.10)",
              color: "var(--teal)",
              cursor: "pointer",
              "font-size": "12px",
              "font-weight": 500,
            }}
          >
            <TvIcon name="shield-check" width="12" height="12" />
            <span>Evidência QA / Guard</span>
          </button>

          {(props.job.status === "failed" || props.job.status === "paused") && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.retryJob(props.job.id);
                  showToast(props.job.status === "paused" ? "Job retomado com sucesso" : "Job re-enfileirado com sucesso", "Execução", "success");
                  syncLiveJobs();
                } catch {
                  showToast("Erro ao processar job", "Erro", "error");
                }
              }}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "6px",
                height: "30px",
                padding: "0 12px",
                "border-radius": "var(--radius-pill)",
                border: "1px solid rgba(183,243,74,.4)",
                background: "rgba(183,243,74,.12)",
                color: "var(--lime)",
                cursor: "pointer",
                "font-size": "12px",
                "font-weight": 500,
              }}
            >
              <TvIcon name="refresh-cw" width="12" height="12" />
              <span>{props.job.status === "paused" ? "Retomar job" : "Tentar novamente"}</span>
            </button>
          )}

          {(props.job.status === "running" || props.job.status === "queued") && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.pauseJob(props.job.id);
                    showToast("Job pausado com checkpoint gerado", "Pausa", "info");
                    syncLiveJobs();
                  } catch {
                    showToast("Erro ao pausar job", "Erro", "error");
                  }
                }}
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "6px",
                  height: "30px",
                  padding: "0 12px",
                  "border-radius": "var(--radius-pill)",
                  border: "1px solid rgba(234,179,8,.4)",
                  background: "rgba(234,179,8,.12)",
                  color: "#eab308",
                  cursor: "pointer",
                  "font-size": "12px",
                  "font-weight": 500,
                }}
              >
                <TvIcon name="circle-pause" width="12" height="12" />
                <span>Pausar / Checkpoint</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.cancelJob(props.job.id);
                    showToast("Job cancelado", "Cancelamento", "warning");
                    syncLiveJobs();
                  } catch {
                    showToast("Erro ao cancelar job", "Erro", "error");
                  }
                }}
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "6px",
                  height: "30px",
                  padding: "0 12px",
                  "border-radius": "var(--radius-pill)",
                  border: "1px solid rgba(239,68,68,.4)",
                  background: "rgba(239,68,68,.12)",
                  color: "#f87171",
                  cursor: "pointer",
                  "font-size": "12px",
                  "font-weight": 500,
                }}
              >
                <TvIcon name="circle-x" width="12" height="12" />
                <span>Cancelar job</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div style={{ flex: 1, "overflow-y": "auto", padding: "16px 20px", display: "flex", "flex-direction": "column", gap: "16px" }}>
        {/* Grid de Metadados: Motor, Modelo, Esforço, Teto */}
        <div
          style={{
            display: "grid",
            "grid-template-columns": "repeat(4, 1fr)",
            gap: "1px",
            background: "rgba(244,246,242,.12)",
            border: "1px solid rgba(244,246,242,.12)",
            "border-radius": "14px",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 10px", background: "#0f1729" }}>
            <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Motor</div>
            <div style={{ "margin-top": "2px", "font-weight": 500, "font-size": "12px" }}>Anthropic</div>
          </div>
          <div style={{ padding: "8px 10px", background: "#0f1729", "min-width": 0 }}>
            <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Modelo</div>
            <div style={{ "margin-top": "2px", "font-family": "var(--font-mono)", "font-size": "11px", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
              {props.job.model}
            </div>
          </div>
          <div style={{ padding: "8px 10px", background: "#0f1729" }}>
            <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Esforço</div>
            <div style={{ "margin-top": "2px", "font-weight": 500, "font-size": "12px" }}>{props.job.effort}</div>
          </div>
          <div style={{ padding: "8px 10px", background: "#0f1729" }}>
            <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Teto</div>
            <div style={{ "margin-top": "2px", "font-family": "var(--font-mono)", "font-size": "11px" }}>US$ {props.job.ceiling.toFixed(2)}</div>
          </div>
        </div>

        {/* Barras de Progresso e Orçamento com transição suave */}
        <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", "justify-content": "space-between", "font-size": "11px", color: "#cbd3de" }}>
              <span>Progresso</span>
              <span style={{ "font-family": "var(--font-mono)" }}>{props.job.progress}%</span>
            </div>
            <div style={{ "margin-top": "4px", height: "5px", "border-radius": "3px", background: "rgba(244,246,242,.12)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${props.job.progress}%`, background: sm().color, transition: "width 300ms ease" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", "justify-content": "space-between", "font-size": "11px", color: "#cbd3de" }}>
              <span>Custo / teto</span>
              <span style={{ "font-family": "var(--font-mono)" }}>US$ {props.job.cost.toFixed(2)}</span>
            </div>
            <div style={{ "margin-top": "4px", height: "5px", "border-radius": "3px", background: "rgba(244,246,242,.12)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (props.job.cost / props.job.ceiling) * 100)}%`, background: "oklch(.80 .155 78)", transition: "width 300ms ease" }} />
            </div>
          </div>
        </div>

        {/* Terminal Log ao Vivo - Container fixo sem recriação */}
        <div style={{ display: "flex", "flex-direction": "column", flex: 1, "min-height": "160px" }}>
          <div style={{ display: "flex", "align-items": "center", gap: "8px", "margin-bottom": "8px", "font-size": "12px", "font-weight": 600, color: "#cbd3de" }}>
            <TvIcon name="terminal" width="13" height="13" />
            <span>Log ao vivo</span>
            <span style={{ flex: 1 }} />
            <span style={{ "font-weight": 400, color: "#aeb7c4", "font-size": "11px" }}>SSE · checkpoint ativo</span>
          </div>

          <div
            style={{
              background: "#070c16",
              border: "1px solid rgba(244,246,242,.10)",
              "border-radius": "12px",
              padding: "12px",
              "font-family": "var(--font-mono)",
              "font-size": "11px",
              "line-height": 1.6,
              display: "flex",
              "flex-direction": "column",
              gap: "4px",
              flex: 1,
              "overflow-y": "auto",
            }}
          >
            <For each={props.logs}>
              {([time, kind, text]) => {
                const kindColor =
                  kind === "error"
                    ? "oklch(.635 .185 27)"
                    : kind === "warn"
                    ? "oklch(.80 .155 78)"
                    : kind === "success"
                    ? "var(--teal)"
                    : "#cbd3de";

                return (
                  <div style={{ display: "grid", "grid-template-columns": "42px 14px minmax(0,1fr)", gap: "6px", "align-items": "start" }}>
                    <span style={{ color: "#5E6878" }}>{time}</span>
                    <span style={{ color: kindColor }}>•</span>
                    <span style={{ color: kindColor, "word-break": "break-word" }}>{text}</span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExecucoesView() {
  const [filter, setFilter] = createSignal<"all" | "running" | "queued" | "completed" | "failed">("all");
  const [liveEvents, setLiveEvents] = createSignal<Array<[string, "info" | "warn" | "error" | "success", string]>>([]);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = createSignal(false);

  // Periodic poll — tasks primeiro para o badge usar #seq em vez do UUID
  createEffect(() => {
    void syncTasks().then(() => syncLiveJobs());
    const timer = setInterval(() => {
      void syncTasks().then(() => syncLiveJobs());
    }, 2500);
    onCleanup(() => clearInterval(timer));
  });

  // Job selecionado memoizado
  const selectedJob = createMemo(() => {
    const all = jobs();
    if (all.length === 0) return null;
    const targetId = selectedJobId();
    return all.find((j) => j.id === targetId) || all[0] || null;
  });

  // ID estável do job ativo (primitivo estável: não dispara re-execução do SSE a cada polling de 2.5s)
  const activeJobId = createMemo(() => selectedJob()?.id || null);

  // SSE subscription isolada no activeJobId
  createEffect(() => {
    const id = activeJobId();
    if (!id) return;

    // Apenas limpa eventos ao vivo quando o usuário seleciona um novo job
    setLiveEvents([]);

    const controller = api.subscribeJobEvents(
      id,
      (event: JobEvent) => {
        if (!event || !event.created_at || Number.isNaN(Date.parse(event.created_at))) return;
        const time = new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const type: "info" | "warn" | "error" | "success" =
          event.event_type === "failed" || event.new_state === "failed"
            ? "error"
            : event.event_type === "succeeded" || event.new_state === "succeeded"
            ? "success"
            : "info";
        const text = `${event.action || event.event_type}: ${event.details || event.new_state || ""}`;

        // Inserção append direta e imutável
        setLiveEvents((prev) => {
          if (prev.some((p) => p[2] === text && p[0] === time)) return prev;
          return [...prev, [time, type, text]];
        });

        // Atualização em tempo real de status sem desmontar nós
        if (event.new_state && id === selectedJobId()) {
          const newUiStatus =
            event.new_state === "succeeded" || event.new_state === "completed"
              ? ("completed" as const)
              : event.new_state === "running" || event.new_state === "preflight"
              ? ("running" as const)
              : event.new_state === "failed"
              ? ("failed" as const)
              : event.new_state === "queued"
              ? ("queued" as const)
              : null;

          if (newUiStatus) {
            setJobs((prev) =>
              prev.map((job) =>
                job.id === id
                  ? {
                      ...job,
                      status: newUiStatus,
                      progress:
                        newUiStatus === "completed" ? 100 : newUiStatus === "running" ? 65 : newUiStatus === "failed" ? 45 : 0,
                    }
                  : job
              )
            );
          }
        }
      },
      (_err) => {
        // SSE error handled silently in UI
      }
    );

    onCleanup(() => controller.abort());
  });

  // Deduplicação memoizada usando chave primária do banco de dados (job.id)
  const dedupedJobs = createMemo(() => {
    const allJobs = jobs();
    const byId = new Map<string, UiJob>();
    for (const j of allJobs) {
      byId.set(j.id, j);
    }
    return Array.from(byId.values());
  });

  // Contadores memoizados
  const runningCount = createMemo(() => dedupedJobs().filter((j) => j.status === "running").length);
  const queuedCount = createMemo(() => dedupedJobs().filter((j) => j.status === "queued").length);
  const failedCount = createMemo(() => dedupedJobs().filter((j) => j.status === "failed").length);
  const doneCount = createMemo(() => dedupedJobs().filter((j) => j.status === "completed").length);

  // Lista filtrada memoizada
  const filteredJobs = createMemo(() => {
    const f = filter();
    const all = dedupedJobs();
    if (f === "all") return all;
    return all.filter((j) => j.status === f);
  });

  // Logs combinados memoizados
  const combinedLogs = createMemo(() => {
    const events = liveEvents();
    if (events.length > 0) return events;
    return selectedJob()?.log || [];
  });

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        "grid-template-columns": "minmax(0, 1fr) minmax(360px, 400px)",
        "overflow-y": "hidden",
      }}
    >
      {/* Coluna Esquerda: Lista de Execuções e Filtros */}
      <section
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-width": "0",
          "min-height": "0",
          "border-right": "1px solid rgba(244,246,242,.10)",
          overflow: "hidden",
        }}
      >
        {/* Header & Tabs */}
        <div
          style={{
            padding: "20px 24px 12px",
            display: "flex",
            "align-items": "flex-end",
            gap: "16px",
            "flex-wrap": "wrap",
          }}
        >
          <div style={{ flex: 1, "min-width": "200px" }}>
            <h1 style={{ margin: 0, "font-size": "20px", "font-weight": 600, "letter-spacing": "-0.01em" }}>
              Execuções
            </h1>
            <p style={{ margin: "4px 0 0", color: "#cbd3de", "font-size": "13px" }}>
              {runningCount()} em execução · {queuedCount()} na fila · {doneCount()} concluídos
            </p>
          </div>

          <div
            role="tablist"
            style={{
              display: "flex",
              "flex-wrap": "wrap",
              gap: "2px",
              padding: "2px",
              background: "#121c30",
              border: "1px solid rgba(244,246,242,.12)",
              "border-radius": "999px",
            }}
          >
            {[
              { id: "all", label: "Todas", count: () => dedupedJobs().length },
              { id: "running", label: "Rodando", count: runningCount },
              { id: "queued", label: "Na fila", count: queuedCount },
              { id: "completed", label: "Concluídos", count: doneCount },
              { id: "failed", label: "Com erro", count: failedCount },
            ].map((tab) => {
              const active = () => filter() === tab.id;
              return (
                <button
                  type="button"
                  onClick={() => setFilter(tab.id as any)}
                  style={{
                    height: "26px",
                    padding: "0 10px",
                    border: "none",
                    "border-radius": "999px",
                    cursor: "pointer",
                    "font-size": "12px",
                    "font-weight": 500,
                    display: "flex",
                    gap: "6px",
                    "align-items": "center",
                    background: active() ? "#17223a" : "transparent",
                    color: active() ? "#F4F6F2" : "#aeb7c4",
                    transition: "all var(--duration-fast) var(--ease-standard)",
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.7 }}>
                    {tab.count()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Job List */}
        <div style={{ flex: 1, "overflow-y": "auto", padding: "0 24px 24px" }}>
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              border: "1px solid rgba(244,246,242,.12)",
              "border-radius": "14px",
              overflow: "hidden",
              background: "var(--surface-0)",
            }}
          >
            <For each={filteredJobs()}>
              {(j) => (
                <JobRow
                  job={j}
                  isSelected={selectedJobId() === j.id}
                  onSelect={() => setSelectedJobId(j.id)}
                  onTaskClick={(taskId) => {
                    setSelectedTaskId(taskId);
                    setCurrentScreenId("tasks");
                  }}
                />
              )}
            </For>
          </div>
        </div>
      </section>

      {/* Coluna Direita: Detalhe do Job Selecionado & Log SSE ao Vivo */}
      <aside
        aria-label="Detalhe do job"
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-height": "0",
          "min-width": "0",
          background: "#0f1729",
          overflow: "hidden",
        }}
      >
        <Show when={selectedJob() != null}>
          <JobDetailsPanel
            job={selectedJob()!}
            onTaskClick={(taskId) => {
              setSelectedTaskId(taskId);
              setCurrentScreenId("tasks");
            }}
            onOpenEvidence={() => setIsEvidenceModalOpen(true)}
            logs={combinedLogs()}
          />
        </Show>
      </aside>

      <Show when={selectedJob() != null}>
        <EvidenceViewerModal
          isOpen={isEvidenceModalOpen()}
          onClose={() => setIsEvidenceModalOpen(false)}
          jobId={selectedJob()?.id || ""}
          jobTitle={selectedJob()?.title || ""}
          taskSeq={selectedJob()?.taskSeq}
          taskTitle={selectedJob()?.taskTitle}
          fileName={`evidencias-job-${selectedJob()?.id || "unknown"}.md`}
          guardStatus={selectedJob()?.status === "failed" ? "blocked" : "passed"}
        />
      </Show>
    </div>
  );
}
