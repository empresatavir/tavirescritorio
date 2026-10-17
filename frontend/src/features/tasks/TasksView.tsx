import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import {
  tasks,
  selectedTaskId,
  setSelectedTaskId,
  setSelectedJobId,
  setCurrentScreenId,
  syncTasks,
  moveTaskPersistent,
} from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";

export function TasksView() {
  const [globalQ, setGlobalQ] = createSignal("");
  const [colQ, setColQ] = createSignal<{ pending: string; in_progress: string; done: string }>({
    pending: "",
    in_progress: "",
    done: "",
  });
  const [expanded, setExpanded] = createSignal(false);

  createEffect(() => {
    syncTasks();
    const timer = setInterval(() => {
      syncTasks();
    }, 4000);
    onCleanup(() => clearInterval(timer));
  });

  const selectedTask = () => tasks().find((t) => t.id === selectedTaskId());

  const COLUMNS = [
    { key: "pending" as const, label: "Pendente", color: "oklch(.80 .155 78)" },
    { key: "in_progress" as const, label: "Em andamento", color: "var(--teal)" },
    { key: "done" as const, label: "Concluído", color: "#aeb7c4" },
  ];

  const filteredCards = (colKey: "pending" | "in_progress" | "done") => {
    const gq = globalQ().toLowerCase().trim();
    const cq = colQ()[colKey].toLowerCase().trim();

    return tasks().filter((t) => {
      if (t.status !== colKey) return false;
      const matchGlobal = !gq || (`#${t.seq} ${t.title} ${t.description || ""} ${t.assignee}`).toLowerCase().includes(gq);
      const matchCol = !cq || (`#${t.seq} ${t.title} ${t.description || ""} ${t.assignee}`).toLowerCase().includes(cq);
      return matchGlobal && matchCol;
    });
  };

  const moveTask = (taskId: string, newStatus: "pending" | "in_progress" | "done") => {
    moveTaskPersistent(taskId, newStatus);
  };

  const priorityMeta = (prio: string) => {
    switch (prio) {
      case "critical":
        return { label: "Crítica", color: "oklch(.635 .185 27)" };
      case "high":
        return { label: "Alta", color: "oklch(.80 .155 78)" };
      case "normal":
        return { label: "Normal", color: "#aeb7c4" };
      default:
        return { label: "Baixa", color: "#5E6878" };
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        "min-height": 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header com resumo e busca global */}
      <div
        style={{
          padding: "20px 24px 16px",
          display: "flex",
          "align-items": "flex-end",
          gap: "12px",
          "flex-wrap": "wrap",
        }}
      >
        <div style={{ flex: 1, "min-width": "200px" }}>
          <h1 style={{ margin: 0, "font-size": "20px", "font-weight": 600, "letter-spacing": "-0.01em" }}>
            Tasks
          </h1>
          <p style={{ margin: "4px 0 0", color: "#cbd3de", "font-size": "13px" }}>
            {tasks().length} tasks no quadro · 3 colunas derivadas de estados
          </p>
        </div>

        <input
          type="text"
          value={globalQ()}
          onInput={(e) => setGlobalQ(e.currentTarget.value)}
          placeholder="Buscar #ID, título ou descrição"
          style={{
            width: "300px",
            "max-width": "100%",
            height: "32px",
            padding: "0 14px",
            "border-radius": "var(--radius-pill)",
            border: "1px solid rgba(244,246,242,.16)",
            background: "var(--surface-0)",
            color: "var(--text-primary)",
            "font-size": "13px",
            outline: "none",
          }}
        />
      </div>

      {/* 3 Colunas Kanban */}
      <div
        style={{
          flex: 1,
          "min-height": 0,
          display: "grid",
          "grid-template-columns": "repeat(3, minmax(260px, 1fr))",
          gap: "16px",
          padding: "0 24px 24px",
          "overflow-x": "auto",
        }}
      >
        <For each={COLUMNS}>
          {(col) => {
            const cards = () => filteredCards(col.key);

            return (
              <section
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  "min-height": 0,
                  background: "#0f1729",
                  border: "1px solid rgba(244,246,242,.10)",
                  "border-radius": "14px",
                  overflow: "hidden",
                }}
              >
                {/* Cabeçalho da Coluna & Busca Interna */}
                <div
                  style={{
                    padding: "12px 12px 10px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                    "border-bottom": "1px solid rgba(244,246,242,.10)",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                    <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: col.color }} />
                    <span style={{ "font-weight": 600, color: "var(--text-primary)" }}>{col.label}</span>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", color: "#aeb7c4" }}>
                      {cards().length}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={colQ()[col.key]}
                    onInput={(e) => setColQ({ ...colQ(), [col.key]: e.currentTarget.value })}
                    placeholder="#ID, título ou descrição"
                    style={{
                      height: "28px",
                      padding: "0 10px",
                      "border-radius": "7px",
                      border: "1px solid rgba(244,246,242,.12)",
                      background: "var(--surface-0)",
                      color: "var(--text-primary)",
                      "font-size": "12px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Lista de Cards da Coluna */}
                <div
                  style={{
                    flex: 1,
                    "overflow-y": "auto",
                    padding: "10px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "8px",
                  }}
                >
                  <For each={cards()}>
                    {(k) => {
                      const prio = () => priorityMeta(k.priority);
                      const isSel = () => selectedTaskId() === k.id;

                      return (
                        <div
                          tabIndex={0}
                          onClick={() => setSelectedTaskId(k.id)}
                          style={{
                            "text-align": "left",
                            padding: "12px",
                            "border-radius": "14px",
                            border: `1px solid ${isSel() ? "var(--flow)" : "rgba(244,246,242,.12)"}`,
                            background: "#121c30",
                            color: "#F4F6F2",
                            cursor: "pointer",
                            display: "flex",
                            "flex-direction": "column",
                            gap: "8px",
                            transition: "all var(--duration-fast) var(--ease-standard)",
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(244,246,242,.34)")}
                          onMouseLeave={(e) => {
                            if (!isSel()) (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,246,242,.12)";
                          }}
                        >
                          {/* Top Row: Seq, Priority, Sector, Active Job */}
                          <div style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "11px" }}>
                            <span style={{ "font-family": "var(--font-mono)", "font-size": "12px", "font-weight": 500, color: "var(--text-primary)" }}>
                              #{k.seq}
                            </span>
                            <span style={{ color: prio().color, "font-weight": 600 }}>{prio().label}</span>
                            <span style={{ color: "#aeb7c4", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                              {k.sector}
                            </span>
                            <span style={{ flex: 1 }} />
                            {k.activeJobId && (
                              <span style={{ display: "flex", "align-items": "center", gap: "5px", color: "var(--teal)", "white-space": "nowrap", "font-size": "11px" }}>
                                <span style={{ width: "6px", height: "6px", "border-radius": "50%", background: "var(--teal)" }} />
                                job ativo
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div style={{ "font-weight": 500, "line-height": 1.4, color: "var(--text-primary)" }}>
                            {k.title}
                          </div>

                          {/* Bottom Row: Assignee & Move Buttons */}
                          <div style={{ display: "flex", "align-items": "center", gap: "10px", "font-size": "11px", color: "#aeb7c4" }}>
                            <span style={{ color: "#cbd3de" }}>{k.assignee}</span>
                            {k.escalation && <span style={{ color: "oklch(.635 .185 27)" }}>escalado</span>}
                            {k.gates && k.gates.length > 0 && <span style={{ color: "oklch(.80 .155 78)" }}>{k.gates[0]}</span>}

                            <span style={{ flex: 1 }} />

                            {/* Move Card Arrows */}
                            <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                              {col.key !== "pending" && (
                                <button
                                  type="button"
                                  title="Mover para esquerda"
                                  onClick={() => moveTask(k.id, col.key === "done" ? "in_progress" : "pending")}
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    padding: 0,
                                    "border-radius": "4px",
                                    border: "1px solid rgba(244,246,242,.16)",
                                    background: "transparent",
                                    color: "#cbd3de",
                                    cursor: "pointer",
                                    display: "grid",
                                    "place-items": "center",
                                  }}
                                >
                                  ←
                                </button>
                              )}
                              {col.key !== "done" && (
                                <button
                                  type="button"
                                  title="Mover para direita"
                                  onClick={() => moveTask(k.id, col.key === "pending" ? "in_progress" : "done")}
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    padding: 0,
                                    "border-radius": "4px",
                                    border: "1px solid rgba(244,246,242,.16)",
                                    background: "transparent",
                                    color: "#cbd3de",
                                    cursor: "pointer",
                                    display: "grid",
                                    "place-items": "center",
                                  }}
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>

                  <Show when={cards().length === 0}>
                    <div style={{ padding: "24px 0", "text-align": "center", color: "#aeb7c4", "font-size": "12px" }}>
                      Nenhuma task nesta coluna
                    </div>
                  </Show>
                </div>
              </section>
            );
          }}
        </For>
      </div>

      {/* Dossiê Lateral da Task Selecionada */}
      <Show when={selectedTask()}>
        {(t) => {
          const prio = () => priorityMeta(t().priority);

          return (
            <>
              {/* Overlay Backdrop */}
              <div
                onClick={() => setSelectedTaskId(null)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(7,12,22,.62)",
                  "backdrop-filter": "blur(2px)",
                  "z-index": 40,
                }}
              />

              {/* Aside Drawer */}
              <aside
                role="dialog"
                aria-label="Detalhamento da task"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: expanded() ? "720px" : "480px",
                  "max-width": "100%",
                  background: "#0f1729",
                  "border-left": "1px solid rgba(244,246,242,.16)",
                  display: "flex",
                  "flex-direction": "column",
                  "box-shadow": "-20px 0 40px rgba(0,0,0,0.35)",
                  "z-index": 50,
                  transition: "width var(--duration-standard) var(--ease-standard)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "10px",
                    padding: "14px 20px",
                    "border-bottom": "1px solid rgba(244,246,242,.10)",
                  }}
                >
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "13px", "font-weight": 500 }}>
                    #{t().seq}
                  </span>
                  <span style={{ "font-size": "12px", "font-weight": 600, color: prio().color }}>
                    Prioridade {prio().label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded())}
                    style={{
                      height: "28px",
                      padding: "0 10px",
                      "border-radius": "var(--radius-pill)",
                      border: "1px solid rgba(244,246,242,.16)",
                      background: "transparent",
                      color: "#F4F6F2",
                      cursor: "pointer",
                      "font-size": "12px",
                      display: "flex",
                      "align-items": "center",
                      gap: "6px",
                    }}
                  >
                    <TvIcon name="maximize" width="12" height="12" />
                    {expanded() ? "Reduzir" : "Ampliar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(null)}
                    style={{
                      height: "28px",
                      padding: "0 10px",
                      "border-radius": "var(--radius-pill)",
                      border: "1px solid rgba(244,246,242,.16)",
                      background: "transparent",
                      color: "#F4F6F2",
                      cursor: "pointer",
                      "font-size": "12px",
                    }}
                  >
                    Fechar · Esc
                  </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div
                  style={{
                    flex: 1,
                    "overflow-y": "auto",
                    padding: "20px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "20px",
                  }}
                >
                  <h2 style={{ margin: 0, "font-size": "18px", "font-weight": 600, "line-height": 1.35, color: "var(--text-primary)" }}>
                    {t().title}
                  </h2>

                  {/* Detalhamento */}
                  <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                    <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": 500, "letter-spacing": "0.14em", "text-transform": "uppercase", color: "#aeb7c4" }}>
                      Detalhamento da solicitação
                    </span>
                    <div
                      style={{
                        padding: "14px",
                        "border-radius": "14px",
                        background: "#121c30",
                        border: "1px solid rgba(244,246,242,.12)",
                        "line-height": 1.6,
                        "white-space": "pre-wrap",
                        color: "var(--text-primary)",
                      }}
                    >
                      {t().description || "Sem descrição adicional registrada."}
                    </div>
                  </div>

                  {/* Grid de Metadados: Responsável, Setor, Status, Escalação */}
                  <div
                    style={{
                      display: "grid",
                      "grid-template-columns": "1fr 1fr",
                      border: "1px solid rgba(244,246,242,.12)",
                      "border-radius": "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "10px 12px", "border-right": "1px solid rgba(244,246,242,.12)", "border-bottom": "1px solid rgba(244,246,242,.12)" }}>
                      <div style={{ "font-size": "11px", color: "#aeb7c4" }}>Responsável</div>
                      <div style={{ "margin-top": "3px", "font-weight": 500 }}>{t().assignee}</div>
                    </div>
                    <div style={{ padding: "10px 12px", "border-bottom": "1px solid rgba(244,246,242,.12)" }}>
                      <div style={{ "font-size": "11px", color: "#aeb7c4" }}>Setor</div>
                      <div style={{ "margin-top": "3px", "font-weight": 500 }}>{t().sector}</div>
                    </div>
                    <div style={{ padding: "10px 12px", "border-right": "1px solid rgba(244,246,242,.12)" }}>
                      <div style={{ "font-size": "11px", color: "#aeb7c4" }}>Status</div>
                      <div style={{ "margin-top": "3px", "font-weight": 500, color: t().status === "done" ? "var(--teal)" : "var(--lime)" }}>
                        {t().status === "done" ? "Concluído" : t().status === "in_progress" ? "Em andamento" : "Pendente"}
                      </div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ "font-size": "11px", color: "#aeb7c4" }}>Escalação</div>
                      <div style={{ "margin-top": "3px", "font-weight": 500, color: t().escalation ? "oklch(.635 .185 27)" : "#aeb7c4" }}>
                        {t().escalation || "Nenhuma"}
                      </div>
                    </div>
                  </div>

                  {/* 01 · Planejamento de Teste */}
                  <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                    <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": 500, "letter-spacing": "0.14em", "text-transform": "uppercase", color: "#aeb7c4" }}>
                        01 · Planejamento de Teste
                      </span>
                      <span style={{ flex: 1 }} />
                      <span style={{ "font-size": "12px", color: "#cbd3de" }}>Paula · Product Manager</span>
                    </div>

                    <div
                      style={{
                        padding: "14px",
                        "border-radius": "14px",
                        border: "1px solid rgba(244,246,242,.12)",
                        background: "#121c30",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ "font-size": "11px", color: "#aeb7c4", "margin-bottom": "4px" }}>Critério de aceite</div>
                        <div style={{ "font-size": "13px", "line-height": 1.5, color: "var(--text-primary)" }}>
                          Critérios verificáveis cumpridos sem regressão de código ou quebra de tokens.
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          "grid-template-columns": "repeat(3, 1fr)",
                          gap: "8px",
                          "border-top": "1px solid rgba(244,246,242,.10)",
                          "padding-top": "10px",
                        }}
                      >
                        <div>
                          <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Motor</div>
                          <div style={{ "font-size": "12px", "font-weight": 500 }}>Anthropic</div>
                        </div>
                        <div>
                          <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Modelo</div>
                          <div style={{ "font-family": "var(--font-mono)", "font-size": "11px" }}>claude-sonnet-4</div>
                        </div>
                        <div>
                          <div style={{ "font-size": "10px", color: "#aeb7c4" }}>Esforço</div>
                          <div style={{ "font-size": "12px", "font-weight": 500 }}>médio</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 02 · Execução Ativa */}
                  <Show when={t().activeJobId}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span style={{ "font-family": "var(--font-mono)", "font-size": "11px", "font-weight": 500, "letter-spacing": "0.14em", "text-transform": "uppercase", color: "#aeb7c4" }}>
                        02 · Execução vinculada
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobId(t().activeJobId!);
                          setCurrentScreenId("exec");
                        }}
                        style={{
                          width: "100%",
                          "text-align": "left",
                          padding: "12px",
                          "border-radius": "14px",
                          border: "1px solid rgba(244,246,242,.12)",
                          background: "#121c30",
                          color: "#F4F6F2",
                          cursor: "pointer",
                          display: "flex",
                          "align-items": "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: "var(--teal)" }} />
                        <span style={{ "font-family": "var(--font-mono)", "font-weight": 500 }}>{t().activeJobId}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ color: "var(--teal)", "font-size": "12px" }}>abrir execução →</span>
                      </button>
                    </div>
                  </Show>
                </div>
              </aside>
            </>
          );
        }}
      </Show>
    </div>
  );
}
