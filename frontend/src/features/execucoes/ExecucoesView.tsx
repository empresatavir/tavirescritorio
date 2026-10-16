import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { jobs, selectedJobId, setSelectedJobId, setSelectedTaskId, setCurrentScreenId, syncLiveJobs } from "../../state/store";
import { api, type JobEvent } from "../../shared/api/client";
import { TvIcon } from "../../shared/components/TvIcon";

export function ExecucoesView() {
  const [filter, setFilter] = createSignal<"all" | "running" | "queued" | "completed" | "failed">("all");
  const [liveEvents, setLiveEvents] = createSignal<Array<[string, "info" | "warn" | "error" | "success", string]>>([]);

  // Periodic poll of live jobs from backend
  createEffect(() => {
    syncLiveJobs();
    const timer = setInterval(() => {
      syncLiveJobs();
    }, 2500);
    onCleanup(() => clearInterval(timer));
  });

  const selectedJob = () => jobs().find((j) => j.id === selectedJobId()) || jobs()[0];

  // SSE subscription for selected job
  createEffect(() => {
    const j = selectedJob();
    if (!j) return;

    setLiveEvents([]);
    const controller = api.subscribeJobEvents(
      j.id,
      (event: JobEvent) => {
        if (!event || !event.created_at || Number.isNaN(Date.parse(event.created_at))) return;
        const time = new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const type: "info" | "warn" | "error" | "success" =
          event.event_type === "failed" ? "error" : event.event_type === "succeeded" ? "success" : "info";
        const text = `${event.action || event.event_type}: ${event.details || event.new_state || ""}`;
        setLiveEvents((prev) => [...prev, [time, type, text]]);
      },
      (_err) => {
        // SSE error handled silently in UI
      }
    );

    onCleanup(() => controller.abort());
  });

  const filteredJobs = () => {
    const f = filter();
    if (f === "all") return jobs();
    return jobs().filter((j) => j.status === f);
  };

  const runningCount = () => jobs().filter((j) => j.status === "running").length;
  const queuedCount = () => jobs().filter((j) => j.status === "queued").length;
  const failedCount = () => jobs().filter((j) => j.status === "failed").length;
  const doneCount = () => jobs().filter((j) => j.status === "completed").length;

  const statusMeta = (st: string) => {
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
  };

  const priorityColor = (prio: string) => {
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
  };

  const combinedLogs = () => {
    const j = selectedJob();
    if (!j) return [];
    if (liveEvents().length > 0) {
      return [...j.log, ...liveEvents()];
    }
    return j.log;
  };

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
              { id: "all", label: "Todas", count: jobs().length },
              { id: "running", label: "Rodando", count: runningCount() },
              { id: "queued", label: "Na fila", count: queuedCount() },
              { id: "completed", label: "Concluídos", count: doneCount() },
              { id: "failed", label: "Com erro", count: failedCount() },
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
                    {tab.count}
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
              {(j) => {
                const isSelected = () => selectedJobId() === j.id;
                const sm = () => statusMeta(j.status);

                return (
                  <div
                    onClick={() => setSelectedJobId(j.id)}
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
                      background: isSelected() ? "#17223a" : "transparent",
                      transition: "background var(--duration-fast) var(--ease-standard)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected()) (e.currentTarget as HTMLElement).style.background = "#141f35";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected()) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ "min-width": 0 }}>
                      <div
                        style={{
                          "font-weight": 500,
                          overflow: "hidden",
                          "text-overflow": "ellipsis",
                          "white-space": "nowrap",
                          color: "var(--text-primary)",
                        }}
                      >
                        {j.title}
                      </div>
                      <div
                        style={{
                          "margin-top": "4px",
                          "font-size": "12px",
                          color: "#aeb7c4",
                          display: "flex",
                          "align-items": "center",
                          gap: "6px",
                        }}
                      >
                        {j.taskId && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(j.taskId!);
                              setCurrentScreenId("tasks");
                            }}
                            style={{
                              display: "inline-flex",
                              "align-items": "center",
                              height: "18px",
                              padding: "0 6px",
                              "border-radius": "4px",
                              background: "rgba(27,197,189,.14)",
                              color: "var(--teal)",
                              "font-family": "var(--font-mono)",
                              "font-size": "10px",
                              "font-weight": 600,
                            }}
                          >
                            {j.taskId}
                          </span>
                        )}
                        <span>{j.agentName}</span>
                        <span>·</span>
                        <span style={{ "font-family": "var(--font-mono)" }}>{j.model}</span>
                        <span>·</span>
                        <span style={{ color: priorityColor(j.priority) }}>{j.priority}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
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
                            width: `${j.progress}%`,
                            background: sm().color,
                            transition: "width 200ms ease",
                          }}
                        />
                      </div>
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "#cbd3de", width: "28px", "text-align": "right" }}>
                        {j.progress}%
                      </span>
                    </div>

                    {/* Cost */}
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "#cbd3de", "text-align": "right" }}>
                      US$ {j.cost.toFixed(2)}
                    </span>

                    {/* Started Time */}
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "#aeb7c4", "text-align": "right" }}>
                      {j.startedAt}
                    </span>
                  </div>
                );
              }}
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
        <Show when={selectedJob()}>
          {(j) => {
            const sm = () => statusMeta(j().status);

            return (
              <div style={{ display: "flex", "flex-direction": "column", height: "100%", overflow: "hidden" }}>
                {/* Header do Drawer */}
                <div style={{ padding: "20px 20px 16px", "border-bottom": "1px solid rgba(244,246,242,.10)" }}>
                  <div style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "12px", color: sm().color, "font-weight": 500 }}>
                    <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: sm().color }} />
                    <span>{sm().label}</span>
                    <span style={{ color: "#aeb7c4", "font-family": "var(--font-mono)", "font-weight": 400 }}>{j().id}</span>
                  </div>
                  <h2 style={{ margin: "8px 0 0", "font-size": "16px", "font-weight": 600, "line-height": 1.35, color: "var(--text-primary)" }}>
                    {j().title}
                  </h2>
                  <div style={{ "margin-top": "4px", "font-size": "12px", color: "#cbd3de" }}>
                    {j().agentName} · iniciado {j().startedAt}
                  </div>

                  {j().taskId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskId(j().taskId!);
                        setCurrentScreenId("tasks");
                      }}
                      style={{
                        "margin-top": "10px",
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
                      }}
                    >
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "10px", color: "#aeb7c4", "text-transform": "uppercase" }}>Task</span>
                      <span style={{ "font-family": "var(--font-mono)", color: "var(--teal)", "font-weight": 500 }}>{j().taskId}</span>
                      <span style={{ color: "var(--teal)" }}>→</span>
                    </button>
                  )}
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
                        {j().model}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "#0f1729" }}>
                      <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Esforço</div>
                      <div style={{ "margin-top": "2px", "font-weight": 500, "font-size": "12px" }}>{j().effort}</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "#0f1729" }}>
                      <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Teto</div>
                      <div style={{ "margin-top": "2px", "font-family": "var(--font-mono)", "font-size": "11px" }}>US$ {j().ceiling.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Barras de Progresso e Orçamento */}
                  <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "14px" }}>
                    <div>
                      <div style={{ display: "flex", "justify-content": "space-between", "font-size": "11px", color: "#cbd3de" }}>
                        <span>Progresso</span>
                        <span style={{ "font-family": "var(--font-mono)" }}>{j().progress}%</span>
                      </div>
                      <div style={{ "margin-top": "4px", height: "5px", "border-radius": "3px", background: "rgba(244,246,242,.12)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${j().progress}%`, background: sm().color }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", "justify-content": "space-between", "font-size": "11px", color: "#cbd3de" }}>
                        <span>Custo / teto</span>
                        <span style={{ "font-family": "var(--font-mono)" }}>US$ {j().cost.toFixed(2)}</span>
                      </div>
                      <div style={{ "margin-top": "4px", height: "5px", "border-radius": "3px", background: "rgba(244,246,242,.12)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (j().cost / j().ceiling) * 100)}%`, background: "oklch(.80 .155 78)" }} />
                      </div>
                    </div>
                  </div>

                  {/* Terminal Log ao Vivo */}
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
                      <For each={combinedLogs()}>
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
          }}
        </Show>
      </aside>
    </div>
  );
}
