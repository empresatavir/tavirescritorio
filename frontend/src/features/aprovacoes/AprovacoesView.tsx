import { createSignal, createMemo, createEffect, onCleanup, For, Show } from "solid-js";
import {
  approvals,
  selectedApprovalId,
  setSelectedApprovalId,
  tasks,
  syncApprovals,
  decideApprovalPersistent,
  type UiApproval,
} from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";

export function AprovacoesView() {
  const [tabFilter, setTabFilter] = createSignal<"all" | "urgent" | "gates" | "changes">("all");

  createEffect(() => {
    void syncApprovals();
    const timer = setInterval(() => {
      void syncApprovals();
    }, 5000);
    onCleanup(() => clearInterval(timer));
  });

  const isAlteracao = (a: UiApproval) => a.type === "alteracao" || a.id.startsWith("ap-alt");

  const filteredApprovals = createMemo(() => {
    const list = approvals();
    const tab = tabFilter();
    if (tab === "urgent") return list.filter((a) => a.impact === "high" && a.status === "pending");
    if (tab === "gates") {
      return list.filter(
        (a) => a.type === "checkpoint" || a.type === "authorization" || a.type === "review"
      );
    }
    if (tab === "changes") return list.filter((a) => isAlteracao(a));
    return list;
  });

  // Id estável — evita remount do painel a cada poll
  const activeApprovalId = createMemo(() => {
    const sel = selectedApprovalId();
    if (sel && filteredApprovals().some((a) => a.id === sel)) return sel;
    return filteredApprovals()[0]?.id ?? null;
  });

  const currentApproval = createMemo(() => {
    const id = activeApprovalId();
    if (!id) return null;
    return approvals().find((a) => a.id === id) || null;
  });

  const linkedTask = createMemo(() => {
    const ap = currentApproval();
    if (!ap?.taskId) return null;
    return tasks().find((t) => t.id === ap.taskId) || null;
  });

  const pendingCount = createMemo(() => approvals().filter((a) => a.status === "pending").length);
  const urgentCount = createMemo(
    () => approvals().filter((a) => a.impact === "high" && a.status === "pending").length
  );
  const gatesCount = createMemo(
    () =>
      approvals().filter(
        (a) =>
          a.status === "pending" &&
          (a.type === "checkpoint" || a.type === "authorization" || a.type === "review")
      ).length
  );
  const changesCount = createMemo(
    () => approvals().filter((a) => a.status === "pending" && isAlteracao(a)).length
  );

  const impactMeta = (impact: UiApproval["impact"]) => {
    switch (impact) {
      case "high":
        return { label: "Alto impacto", color: "oklch(.635 .185 27)" };
      case "medium":
        return { label: "Médio impacto", color: "oklch(.80 .155 78)" };
      default:
        return { label: "Baixo impacto", color: "var(--text-muted, #aeb7c4)" };
    }
  };

  const typeLabel = (type: UiApproval["type"]) => {
    switch (type) {
      case "authorization":
        return "Autorização";
      case "checkpoint":
        return "Checkpoint";
      case "review":
        return "Revisão";
      case "alteracao":
        return "Alteração";
      default:
        return "Aprovação";
    }
  };

  const statusMeta = (status: UiApproval["status"]) => {
    switch (status) {
      case "pending":
        return { label: "Pendente", color: "oklch(.80 .155 78)" };
      case "approved":
        return { label: "Aprovado", color: "var(--teal, #1BC5BD)" };
      case "rejected":
        return { label: "Rejeitado", color: "oklch(.635 .185 27)" };
    }
  };

  const tabs: Array<{ id: "all" | "urgent" | "gates" | "changes"; label: string; count: () => number }> = [
    { id: "all", label: "Todas", count: () => approvals().length },
    { id: "urgent", label: "Urgentes", count: urgentCount },
    { id: "gates", label: "Gates", count: gatesCount },
    { id: "changes", label: "Alterações", count: changesCount },
  ];

  return (
    <div
      data-screen-label="Aprovações"
      style={{
        height: "100%",
        display: "grid",
        "grid-template-columns": "minmax(300px, 360px) minmax(0, 1fr)",
        overflow: "hidden",
        background: "var(--surface-0)",
        color: "var(--text-primary)",
      }}
    >
      {/* LISTA */}
      <section
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-height": 0,
          "min-width": 0,
          overflow: "hidden",
          "border-right": "1px solid rgba(244,246,242,.10)",
          background: "var(--surface-ink, #0f1729)",
        }}
      >
        <div style={{ padding: "20px 20px 12px" }}>
          <h1 style={{ margin: 0, "font-size": "20px", "font-weight": 600, "letter-spacing": "-0.01em" }}>
            Aprovações
          </h1>
          <p style={{ margin: "4px 0 12px", color: "var(--text-secondary)", "font-size": "13px" }}>
            {pendingCount()} aguardando · {approvals().length - pendingCount()} resolvidas
          </p>

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
              width: "max-content",
              "max-width": "100%",
            }}
          >
            <For each={tabs}>
              {(tab) => {
                const active = () => tabFilter() === tab.id;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active()}
                    onClick={() => setTabFilter(tab.id)}
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
                      color: active() ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.7 }}>
                      {tab.count()}
                    </span>
                  </button>
                );
              }}
            </For>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            "overflow-y": "auto",
            padding: "0 12px 16px",
            display: "flex",
            "flex-direction": "column",
            gap: "6px",
          }}
        >
          <For each={filteredApprovals()}>
            {(ap) => {
              const selected = () => activeApprovalId() === ap.id;
              const imp = impactMeta(ap.impact);
              const st = statusMeta(ap.status);
              const linked = () => tasks().find((t) => t.id === ap.taskId);

              return (
                <button
                  type="button"
                  onClick={() => setSelectedApprovalId(ap.id)}
                  style={{
                    "text-align": "left",
                    padding: "12px 14px",
                    "border-radius": "12px",
                    border: selected()
                      ? "1px solid rgba(27,197,189,.55)"
                      : "1px solid rgba(244,246,242,.08)",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "6px",
                    background: selected() ? "#17223a" : "transparent",
                    transition: "background 0.12s ease, border-color 0.12s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "8px",
                      "font-size": "11px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ color: imp.color, "font-weight": 600 }}>{imp.label}</span>
                    <span>·</span>
                    <span>{typeLabel(ap.type)}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ "font-family": "var(--font-mono)" }}>{ap.requestedAt}</span>
                  </div>

                  <div style={{ "font-weight": 600, "font-size": "13px", "line-height": 1.4 }}>
                    {ap.title}
                  </div>

                  <Show when={linked()}>
                    {(lt) => (
                      <div
                        style={{
                          display: "flex",
                          "align-items": "center",
                          gap: "6px",
                          "font-size": "11px",
                          "font-family": "var(--font-mono)",
                          color: "var(--teal)",
                          "min-width": 0,
                        }}
                      >
                        <span style={{ flex: "none" }}>#{lt().seq}</span>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                            "white-space": "nowrap",
                            "font-family": "inherit",
                            "font-weight": 500,
                          }}
                        >
                          {lt().title}
                        </span>
                      </div>
                    )}
                  </Show>

                  <div
                    style={{
                      "font-size": "12px",
                      color: "var(--text-muted)",
                      display: "flex",
                      "align-items": "center",
                      gap: "6px",
                    }}
                  >
                    <span>{ap.agentName}</span>
                    <span>·</span>
                    <span style={{ color: st.color, display: "inline-flex", "align-items": "center", gap: "5px" }}>
                      <span
                        style={{ width: "6px", height: "6px", "border-radius": "50%", background: st.color }}
                      />
                      {st.label}
                    </span>
                  </div>
                </button>
              );
            }}
          </For>

          <Show when={filteredApprovals().length === 0}>
            <div
              style={{
                padding: "48px 16px",
                "text-align": "center",
                color: "var(--text-muted)",
                "font-size": "13px",
              }}
            >
              Nenhuma decisão nesta fila
            </div>
          </Show>
        </div>
      </section>

      {/* DETALHE — keyed por id estável */}
      <Show
        when={activeApprovalId()}
        fallback={
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "var(--text-muted)",
              "font-size": "13px",
              padding: "40px",
            }}
          >
            Selecione uma aprovação na lista
          </div>
        }
      >
        {(aid) => {
          const ap = () => approvals().find((a) => a.id === aid())!;
          const imp = () => impactMeta(ap().impact);
          const st = () => statusMeta(ap().status);
          const t = () => {
            const taskId = ap()?.taskId;
            return taskId ? tasks().find((x) => x.id === taskId) || null : null;
          };

          return (
            <section
              style={{
                display: "flex",
                "flex-direction": "column",
                "min-height": 0,
                "min-width": 0,
                background: "var(--surface-0)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  "overflow-y": "auto",
                  padding: "24px 28px",
                  display: "flex",
                  "flex-direction": "column",
                  gap: "20px",
                }}
              >
                {/* Header solicitante */}
                <div style={{ display: "flex", "align-items": "flex-start", "justify-content": "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", "align-items": "center", gap: "12px", "min-width": 0 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        "border-radius": "9px",
                        display: "flex",
                        "align-items": "center",
                        "justify-content": "center",
                        "font-size": "12px",
                        "font-weight": 600,
                        color: "var(--teal)",
                        background: "rgba(27,197,189,.14)",
                        flex: "none",
                      }}
                    >
                      {ap().agentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ "min-width": 0 }}>
                      <div style={{ "font-weight": 600, "font-size": "14px" }}>{ap().agentName}</div>
                      <div style={{ "font-size": "12px", color: "var(--text-muted)" }}>
                        Solicitou às {ap().requestedAt}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap", "justify-content": "flex-end" }}>
                    <span
                      style={{
                        "font-size": "11px",
                        "font-weight": 600,
                        padding: "4px 10px",
                        "border-radius": "999px",
                        color: imp().color,
                        background: "rgba(244,246,242,.06)",
                        border: "1px solid rgba(244,246,242,.10)",
                      }}
                    >
                      {imp().label}
                    </span>
                    <span
                      style={{
                        "font-size": "11px",
                        "font-weight": 500,
                        padding: "4px 10px",
                        "border-radius": "999px",
                        color: "var(--text-secondary)",
                        background: "rgba(244,246,242,.04)",
                        border: "1px solid rgba(244,246,242,.10)",
                      }}
                    >
                      {typeLabel(ap().type)}
                    </span>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <h2
                    style={{
                      margin: 0,
                      "font-size": "22px",
                      "font-weight": 600,
                      "line-height": 1.3,
                      "letter-spacing": "-0.01em",
                    }}
                  >
                    {ap().title}
                  </h2>
                  <p
                    style={{
                      margin: "10px 0 0",
                      "font-size": "14px",
                      "line-height": 1.6,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {ap().description}
                  </p>
                </div>

                {/* Task — uma faixa, sem dossiê aninhado */}
                <Show when={t()}>
                  {(task) => (
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted)",
                        }}
                      >
                        Task envolvida
                      </span>
                      <div
                        style={{
                          border: "1px solid rgba(244,246,242,.12)",
                          "border-radius": "14px",
                          background: "var(--surface-ink, #0f1729)",
                          padding: "14px 16px",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", "align-items": "baseline", gap: "10px", "min-width": 0 }}>
                          <span
                            style={{
                              "font-family": "var(--font-mono)",
                              "font-size": "14px",
                              "font-weight": 600,
                              color: "var(--teal)",
                              flex: "none",
                            }}
                          >
                            #{task().seq}
                          </span>
                          <span style={{ "font-weight": 600, "font-size": "14px", "line-height": 1.4 }}>
                            {task().title}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            "grid-template-columns": "repeat(3, minmax(0, 1fr))",
                            gap: "8px 12px",
                            "font-size": "12px",
                          }}
                        >
                          <div>
                            <div style={{ color: "var(--text-muted)", "font-size": "10px", "margin-bottom": "2px" }}>
                              Responsável
                            </div>
                            <div style={{ color: "var(--text-secondary)", "font-weight": 500 }}>{task().assignee}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-muted)", "font-size": "10px", "margin-bottom": "2px" }}>
                              Setor
                            </div>
                            <div style={{ color: "var(--text-secondary)", "font-weight": 500 }}>{task().sector}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-muted)", "font-size": "10px", "margin-bottom": "2px" }}>
                              Prioridade
                            </div>
                            <div style={{ color: "var(--text-secondary)", "font-weight": 500 }}>{task().priority}</div>
                          </div>
                        </div>
                        <Show when={task().description}>
                          <p
                            style={{
                              margin: 0,
                              "font-size": "13px",
                              "line-height": 1.55,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {task().description}
                          </p>
                        </Show>
                      </div>
                    </div>
                  )}
                </Show>

                {/* Consequências */}
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <span
                    style={{
                      "font-family": "var(--font-mono)",
                      "font-size": "11px",
                      "font-weight": 500,
                      "letter-spacing": "0.14em",
                      "text-transform": "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    Consequências
                  </span>
                  <div
                    style={{
                      display: "grid",
                      "grid-template-columns": "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 16px",
                        "border-radius": "14px",
                        border: "1px solid rgba(27,197,189,.28)",
                        background: "rgba(27,197,189,.06)",
                      }}
                    >
                      <div
                        style={{
                          "font-size": "11px",
                          "font-weight": 600,
                          color: "var(--teal)",
                          "margin-bottom": "6px",
                          "letter-spacing": "0.04em",
                          "text-transform": "uppercase",
                        }}
                      >
                        Se aprovar
                      </div>
                      <div style={{ "font-size": "13px", "line-height": 1.55, color: "var(--text-secondary)" }}>
                        {ap().onApproveText || "O fluxo segue e o job retoma a execução."}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "14px 16px",
                        "border-radius": "14px",
                        border: "1px solid oklch(.635 .185 27 / .35)",
                        background: "oklch(.635 .185 27 / .08)",
                      }}
                    >
                      <div
                        style={{
                          "font-size": "11px",
                          "font-weight": 600,
                          color: "oklch(.78 .16 27)",
                          "margin-bottom": "6px",
                          "letter-spacing": "0.04em",
                          "text-transform": "uppercase",
                        }}
                      >
                        Se rejeitar
                      </div>
                      <div style={{ "font-size": "13px", "line-height": 1.55, color: "var(--text-secondary)" }}>
                        {ap().onRejectText || "O job encerra e a tarefa volta para replanejamento."}
                      </div>
                    </div>
                  </div>
                  <Show when={ap().reason}>
                    <p style={{ margin: "4px 0 0", "font-size": "12px", color: "var(--text-muted)", "line-height": 1.5 }}>
                      Motivo: {ap().reason}
                    </p>
                  </Show>
                </div>

                <div
                  style={{
                    "font-family": "var(--font-mono)",
                    "font-size": "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  {ap().id} · {st().label}
                </div>
              </div>

              {/* Ações sticky */}
              <div
                style={{
                  padding: "14px 28px",
                  "border-top": "1px solid rgba(244,246,242,.10)",
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "10px",
                  "align-items": "center",
                  background: "var(--surface-ink, #0f1729)",
                }}
              >
                <Show when={ap().status === "pending"}>
                  <button
                    type="button"
                    onClick={() =>
                      decideApprovalPersistent(ap().id, "approve", "Aprovado via cockpit de operações")
                    }
                    style={{
                      height: "36px",
                      padding: "0 18px",
                      "border-radius": "999px",
                      border: "none",
                      background: "var(--action-bg, var(--lime, #B7F34A))",
                      color: "var(--action-fg, #0B1220)",
                      "font-weight": 600,
                      cursor: "pointer",
                      display: "flex",
                      gap: "8px",
                      "align-items": "center",
                      "font-size": "13px",
                    }}
                  >
                    Aprovar
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.7 }}>A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      decideApprovalPersistent(ap().id, "reject", "Rejeitado via cockpit de operações")
                    }
                    style={{
                      height: "36px",
                      padding: "0 18px",
                      "border-radius": "999px",
                      border: "1px solid oklch(.635 .185 27 / .45)",
                      background: "transparent",
                      color: "oklch(.78 .16 27)",
                      "font-weight": 500,
                      cursor: "pointer",
                      display: "flex",
                      gap: "8px",
                      "align-items": "center",
                      "font-size": "13px",
                    }}
                  >
                    <TvIcon name="circle-x" width="14" height="14" />
                    Rejeitar
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.7 }}>R</span>
                  </button>
                  <span style={{ flex: 1 }} />
                  <span style={{ "font-size": "12px", color: "var(--text-muted)" }}>
                    Decisão fica nesta tela
                  </span>
                </Show>
                <Show when={ap().status !== "pending"}>
                  <span style={{ "font-weight": 600, color: st().color, "font-size": "14px" }}>
                    Decisão registrada: {st().label}
                  </span>
                </Show>
              </div>
            </section>
          );
        }}
      </Show>
    </div>
  );
}
