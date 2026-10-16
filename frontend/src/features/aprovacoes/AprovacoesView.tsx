import { createSignal, createMemo, For, Show } from "solid-js";
import {
  approvals,
  setApprovals,
  selectedApprovalId,
  setSelectedApprovalId,
  tasks,
  setSelectedTaskId,
  setCurrentDomainId,
  setCurrentScreenId,
  showToast,
  type UiApproval,
} from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";
import { useNavigate } from "@solidjs/router";

export function AprovacoesView() {
  const navigate = useNavigate();
  const [tabFilter, setTabFilter] = createSignal<"all" | "urgent" | "gates">("all");

  // Filtered approvals list
  const filteredApprovals = createMemo(() => {
    const list = approvals();
    const tab = tabFilter();
    if (tab === "urgent") {
      return list.filter((a) => a.impact === "high" && a.status === "pending");
    }
    if (tab === "gates") {
      return list.filter((a) => a.type === "checkpoint" || a.type === "authorization");
    }
    return list;
  });

  const pendingCount = createMemo(() => approvals().filter((a) => a.status === "pending").length);
  const urgentCount = createMemo(() => approvals().filter((a) => a.impact === "high" && a.status === "pending").length);
  const gatesCount = createMemo(() => approvals().filter((a) => (a.type === "checkpoint" || a.type === "authorization") && a.status === "pending").length);

  // Selected approval
  const currentApproval = createMemo(() => {
    const id = selectedApprovalId();
    if (id) {
      const found = approvals().find((a) => a.id === id);
      if (found) return found;
    }
    const filtered = filteredApprovals();
    return filtered.length > 0 ? filtered[0] : null;
  });

  // Linked task if any
  const linkedTask = createMemo(() => {
    const ap = currentApproval();
    if (!ap || !ap.taskId) return null;
    return tasks().find((t) => t.id === ap.taskId) || null;
  });

  const impactMeta = (impact: UiApproval["impact"]) => {
    switch (impact) {
      case "high":
        return { label: "Alto impacto", color: "var(--ember, oklch(.635 .185 27))" };
      case "medium":
        return { label: "Médio impacto", color: "var(--flow, oklch(.80 .155 78))" };
      case "low":
        return { label: "Baixo impacto", color: "var(--slate, #cbd3de)" };
    }
  };

  const typeLabel = (type: UiApproval["type"]) => {
    switch (type) {
      case "authorization": return "Autorização";
      case "checkpoint": return "Checkpoint";
      case "review": return "Revisão";
    }
  };

  const statusMeta = (status: UiApproval["status"]) => {
    switch (status) {
      case "pending":
        return { label: "Pendente", color: "var(--flow, oklch(.80 .155 78))" };
      case "approved":
        return { label: "Aprovado", color: "var(--teal, #1BC5BD)" };
      case "rejected":
        return { label: "Rejeitado", color: "var(--ember, oklch(.635 .185 27))" };
    }
  };

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" } : a))
    );
    showToast(`Aprovação ${id} confirmada com sucesso`, "Decisão registrada", "success");
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a))
    );
    showToast(`Aprovação ${id} rejeitada`, "Decisão registrada", "warning");
  };

  const handleGoTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentDomainId("op");
    setCurrentScreenId("tasks");
    navigate("/tasks");
  };

  return (
    <div
      data-screen-label="Aprovações"
      style={{
        height: "100%",
        display: "grid",
        "grid-template-columns": "minmax(280px, 36%) minmax(340px, 1fr)",
        "overflow-x": "auto",
        background: "var(--surface-0, #0B1220)",
        color: "var(--text-primary, #F4F6F2)",
      }}
    >
      {/* Coluna da esquerda: Lista de Aprovações */}
      <section
        style={{
          display: "flex",
          "flex-direction": "column",
          "min-height": "0",
          "min-width": "0",
          overflow: "hidden",
          "border-right": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
        }}
      >
        <div style={{ padding: "20px 20px 12px" }}>
          <h1 style={{ margin: "0", "font-size": "20px", "font-weight": "600", "letter-spacing": "-0.01em" }}>
            Aprovações
          </h1>
          <p style={{ margin: "4px 0 12px", color: "var(--text-secondary, #cbd3de)", "font-size": "13px" }}>
            {pendingCount()} aguardando decisão · {approvals().length - pendingCount()} resolvidas
          </p>

          {/* Tabs Filter */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              padding: "2px",
              background: "var(--surface-2, #121c30)",
              border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
              "border-radius": "999px",
              "max-width": "100%",
              width: "max-content",
            }}
          >
            <button
              onClick={() => setTabFilter("all")}
              style={{
                height: "26px",
                padding: "0 10px",
                border: "none",
                "border-radius": "999px",
                cursor: "pointer",
                "font-size": "12px",
                "font-weight": "500",
                display: "flex",
                gap: "6px",
                "align-items": "center",
                background: tabFilter() === "all" ? "var(--teal, #1BC5BD)" : "transparent",
                color: tabFilter() === "all" ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
              }}
            >
              Todas
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.8 }}>
                {approvals().length}
              </span>
            </button>
            <button
              onClick={() => setTabFilter("urgent")}
              style={{
                height: "26px",
                padding: "0 10px",
                border: "none",
                "border-radius": "999px",
                cursor: "pointer",
                "font-size": "12px",
                "font-weight": "500",
                display: "flex",
                gap: "6px",
                "align-items": "center",
                background: tabFilter() === "urgent" ? "var(--teal, #1BC5BD)" : "transparent",
                color: tabFilter() === "urgent" ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
              }}
            >
              Urgentes
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.8 }}>
                {urgentCount()}
              </span>
            </button>
            <button
              onClick={() => setTabFilter("gates")}
              style={{
                height: "26px",
                padding: "0 10px",
                border: "none",
                "border-radius": "999px",
                cursor: "pointer",
                "font-size": "12px",
                "font-weight": "500",
                display: "flex",
                gap: "6px",
                "align-items": "center",
                background: tabFilter() === "gates" ? "var(--teal, #1BC5BD)" : "transparent",
                color: tabFilter() === "gates" ? "var(--ink, #0B1220)" : "var(--text-muted, #aeb7c4)",
              }}
            >
              Gates
              <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.8 }}>
                {gatesCount()}
              </span>
            </button>
          </div>
        </div>

        {/* Lista de cards de aprovação */}
        <div style={{ flex: "1", "overflow-y": "auto", padding: "0 12px 16px", display: "flex", "flex-direction": "column", gap: "6px" }}>
          <For each={filteredApprovals()}>
            {(ap) => {
              const isSelected = () => currentApproval()?.id === ap.id;
              const imp = impactMeta(ap.impact);
              const st = statusMeta(ap.status);
              const linked = tasks().find((t) => t.id === ap.taskId);

              return (
                <button
                  type="button"
                  onClick={() => setSelectedApprovalId(ap.id)}
                  style={{
                    "text-align": "left",
                    padding: "12px",
                    "border-radius": "14px",
                    border: isSelected() ? "1px solid var(--teal, #1BC5BD)" : "1px solid var(--border-subtle, rgba(244,246,242,.08))",
                    cursor: "pointer",
                    color: "var(--text-primary, #F4F6F2)",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "6px",
                    background: isSelected() ? "var(--surface-2, #17223a)" : "var(--surface-1, #0f1729)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>
                    <span style={{ color: imp.color, "font-weight": "600" }}>{imp.label}</span>
                    <span>·</span>
                    <span>{typeLabel(ap.type)}</span>
                    <span style={{ flex: "1" }}></span>
                    <span style={{ "font-family": "var(--font-mono)" }}>{ap.requestedAt}</span>
                  </div>

                  <div style={{ "font-weight": "500", "font-size": "13px", "line-height": "1.4" }}>
                    {ap.title}
                  </div>

                  <Show when={linked}>
                    <div
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "8px",
                        "min-width": "0",
                        padding: "5px 8px",
                        "border-radius": "6px",
                        background: "var(--surface-0, #0B1220)",
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                        "font-size": "12px",
                      }}
                    >
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "10px", "letter-spacing": "0.1em", "text-transform": "uppercase", color: "var(--text-muted)", flex: "none" }}>
                        Task
                      </span>
                      <span style={{ "font-family": "var(--font-mono)", "font-weight": "500", color: "var(--teal, #1BC5BD)", flex: "none" }}>
                        #{linked?.seq}
                      </span>
                      <span style={{ color: "var(--text-secondary, #cbd3de)", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                        {linked?.title}
                      </span>
                    </div>
                  </Show>

                  <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", display: "flex", "align-items": "center", gap: "6px" }}>
                    <span>{ap.agentName}</span>
                    <span>·</span>
                    <span style={{ color: st.color, display: "flex", "align-items": "center", gap: "4px" }}>
                      <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: st.color }}></span>
                      {st.label}
                    </span>
                  </div>
                </button>
              );
            }}
          </For>

          <Show when={filteredApprovals().length === 0}>
            <div style={{ padding: "40px 0", "text-align": "center", color: "var(--text-muted, #aeb7c4)", "font-size": "13px" }}>
              Nenhuma decisão nesta fila
            </div>
          </Show>
        </div>
      </section>

      {/* Coluna da direita: Detalhamento da Aprovação */}
      <Show when={currentApproval()}>
        {(ap) => {
          const imp = () => impactMeta(ap().impact);
          const st = () => statusMeta(ap().status);
          const t = linkedTask;

          return (
            <section style={{ display: "flex", "flex-direction": "column", "min-height": "0", "min-width": "0" }}>
              <div
                style={{
                  flex: "1",
                  "overflow-y": "auto",
                  padding: "28px clamp(20px, 4vw, 40px)",
                  display: "flex",
                  "flex-direction": "column",
                  gap: "24px",
                  "max-width": "760px",
                }}
              >
                {/* Solicitante */}
                <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      "border-radius": "9px",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "font-size": "12px",
                      "font-weight": "600",
                      color: "var(--teal, #1BC5BD)",
                      background: "rgba(27,197,189,.14)",
                    }}
                  >
                    {ap().agentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ "font-weight": "600", "font-size": "14px" }}>{ap().agentName}</div>
                    <div style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                      Solicitou às {ap().requestedAt}
                    </div>
                  </div>
                </div>

                {/* Título e Descrição */}
                <div>
                  <div style={{ display: "flex", gap: "8px", "font-size": "12px" }}>
                    <span style={{ color: imp().color, "font-weight": "600" }}>{imp().label}</span>
                    <span style={{ color: "var(--text-muted, #aeb7c4)" }}>·</span>
                    <span style={{ color: "var(--text-secondary, #cbd3de)" }}>{typeLabel(ap().type)}</span>
                  </div>
                  <h2
                    style={{
                      margin: "8px 0 0",
                      "font-size": "22px",
                      "font-weight": "600",
                      "line-height": "1.3",
                      "letter-spacing": "-0.01em",
                      "text-wrap": "pretty",
                    }}
                  >
                    {ap().title}
                  </h2>
                  <p
                    style={{
                      margin: "12px 0 0",
                      "font-size": "14px",
                      "line-height": "1.6",
                      color: "var(--text-secondary, #cbd3de)",
                      "text-wrap": "pretty",
                    }}
                  >
                    {ap().description}
                  </p>
                </div>

                {/* Task envolvida */}
                <Show when={t()}>
                  <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                    <span
                      style={{
                        "font-family": "var(--font-mono)",
                        "font-size": "11px",
                        "font-weight": "500",
                        "letter-spacing": "0.14em",
                        "text-transform": "uppercase",
                        color: "var(--text-muted, #aeb7c4)",
                      }}
                    >
                      Task envolvida
                    </span>
                    <div
                      style={{
                        border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                        "border-radius": "14px",
                        background: "var(--surface-2, #121c30)",
                        padding: "14px 16px",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", "align-items": "baseline", gap: "10px", "min-width": "0" }}>
                        <span style={{ "font-family": "var(--font-mono)", "font-size": "15px", "font-weight": "500", color: "var(--teal, #1BC5BD)", flex: "none" }}>
                          #{t()?.seq}
                        </span>
                        <span style={{ "font-weight": "600", "font-size": "14px", "line-height": "1.4", "text-wrap": "pretty" }}>
                          {t()?.title}
                        </span>
                      </div>
                      <div style={{ display: "flex", "flex-wrap": "wrap", gap: "6px 14px", "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                        <span>Responsável: <strong style={{ color: "var(--text-secondary)" }}>{t()?.assignee}</strong></span>
                        <span>Setor: <strong style={{ color: "var(--text-secondary)" }}>{t()?.sector}</strong></span>
                        <span>Prioridade: <strong style={{ color: "var(--text-secondary)" }}>{t()?.priority}</strong></span>
                      </div>
                      <div style={{ "font-size": "13px", "line-height": "1.55", color: "var(--text-secondary, #cbd3de)" }}>
                        {t()?.description}
                      </div>
                      <div style={{ display: "flex", gap: "8px", "margin-top": "4px" }}>
                        <button
                          type="button"
                          onClick={() => handleGoTask(t()!.id)}
                          style={{
                            height: "32px",
                            padding: "0 14px",
                            "border-radius": "999px",
                            border: "1px solid var(--border-light, rgba(244,246,242,.34))",
                            background: "transparent",
                            color: "var(--text-primary, #F4F6F2)",
                            cursor: "pointer",
                            "font-weight": "500",
                            "font-size": "12px",
                            display: "flex",
                            "align-items": "center",
                            gap: "8px",
                          }}
                        >
                          <TvIcon name="maximize" style={{ width: "12px", height: "12px" }} />
                          Abrir detalhamento da task #{t()?.seq}
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Contexto da aprovação */}
                <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                  <span
                    style={{
                      "font-family": "var(--font-mono)",
                      "font-size": "11px",
                      "font-weight": "500",
                      "letter-spacing": "0.14em",
                      "text-transform": "uppercase",
                      color: "var(--text-muted, #aeb7c4)",
                    }}
                  >
                    Contexto da aprovação
                  </span>
                  <div
                    style={{
                      border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                      "border-radius": "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "grid", "grid-template-columns": "120px minmax(0,1fr)", gap: "12px", padding: "12px 16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                      <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>Origem</span>
                      <span style={{ "font-size": "13px" }}>Gate operacional · {ap().type}</span>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "120px minmax(0,1fr)", gap: "12px", padding: "12px 16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                      <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>Motivo</span>
                      <span style={{ "font-size": "13px", "line-height": "1.55", "text-wrap": "pretty" }}>{ap().reason || ap().description}</span>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "120px minmax(0,1fr)", gap: "12px", padding: "12px 16px", "border-bottom": "1px solid var(--border-subtle, rgba(244,246,242,.10))" }}>
                      <span style={{ "font-size": "12px", color: "var(--teal, #1BC5BD)" }}>Se aprovar</span>
                      <span style={{ "font-size": "13px", "line-height": "1.55" }}>{ap().onApproveText || "O job retoma imediatamente a execução."}</span>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "120px minmax(0,1fr)", gap: "12px", padding: "12px 16px" }}>
                      <span style={{ "font-size": "12px", color: "var(--ember, oklch(.635 .185 27))" }}>Se rejeitar</span>
                      <span style={{ "font-size": "13px", "line-height": "1.55" }}>{ap().onRejectText || "O job é encerrado e a tarefa volta para replanejamento."}</span>
                    </div>
                  </div>
                </div>

                {/* Registro de Auditoria */}
                <div
                  style={{
                    border: "1px solid var(--border-subtle, rgba(244,246,242,.12))",
                    "border-radius": "14px",
                    padding: "14px 16px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ "font-size": "12px", "font-weight": "600", color: "var(--text-secondary, #cbd3de)" }}>
                    Registro de auditoria
                  </div>
                  <div style={{ "font-family": "var(--font-mono)", "font-size": "12px", color: "var(--text-muted, #aeb7c4)" }}>
                    ID: {ap().id} · Criado às {ap().requestedAt} · Status: {ap().status.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Barra de ação inferior */}
              <div
                style={{
                  padding: "16px clamp(20px, 4vw, 40px)",
                  "border-top": "1px solid var(--border-subtle, rgba(244,246,242,.10))",
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "10px",
                  "align-items": "center",
                }}
              >
                <Show when={ap().status === "pending"}>
                  <button
                    type="button"
                    onClick={() => handleApprove(ap().id)}
                    style={{
                      height: "36px",
                      padding: "0 18px",
                      "border-radius": "999px",
                      border: "none",
                      background: "var(--lime, #B7F34A)",
                      color: "var(--ink-panel, #25360a)",
                      "font-weight": "600",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      "align-items": "center",
                      "font-size": "13px",
                    }}
                  >
                    Aprovar
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.75 }}>A</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(ap().id)}
                    style={{
                      height: "36px",
                      padding: "0 18px",
                      "border-radius": "999px",
                      border: "1px solid rgba(239, 68, 68, 0.45)",
                      background: "transparent",
                      color: "var(--ember, oklch(.635 .185 27))",
                      "font-weight": "500",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      "align-items": "center",
                      "font-size": "13px",
                    }}
                  >
                    Rejeitar
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", opacity: 0.75 }}>R</span>
                  </button>

                  <span style={{ flex: "1" }}></span>
                  <span style={{ "font-size": "12px", color: "var(--text-muted, #aeb7c4)", "white-space": "nowrap" }}>
                    Decisão imediata no orquestrador
                  </span>
                </Show>

                <Show when={ap().status !== "pending"}>
                  <span style={{ "font-weight": "500", color: st().color, "font-size": "14px" }}>
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
