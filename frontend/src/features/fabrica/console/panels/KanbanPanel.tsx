import { For, Show } from "solid-js";
import type { FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

type KanbanCol = "backlog" | "doing" | "review" | "done";

const COLUMNS: Array<{ id: KanbanCol; title: string; hint: string }> = [
  { id: "backlog", title: "Fila", hint: "queued / blocked" },
  { id: "doing", title: "Em execução", hint: "running" },
  { id: "review", title: "Gate", hint: "awaiting_gate" },
  { id: "done", title: "Concluído", hint: "done" },
];

function colOf(status: FactoryStageInstance["status"]): KanbanCol {
  if (status === "done" || status === "skipped") return "done";
  if (status === "running") return "doing";
  if (status === "awaiting_gate") return "review";
  return "backlog";
}

export function KanbanPanel(props: { stages: FactoryStageInstance[] }) {
  const inCol = (col: KanbanCol) => props.stages.filter((s) => colOf(s.status) === col);

  return (
    <div class="fc-kb">
      <Show
        when={props.stages.length}
        fallback={
          <EmptyState
            title="Kanban vazio"
            text="As colunas serão preenchidas quando a esteira tiver stages."
          />
        }
      >
        <div class="fc-kb-board">
          <For each={COLUMNS}>
            {(col) => (
              <section class={`fc-kb-col is-${col.id}`}>
                <header>
                  <div>
                    <h3>{col.title}</h3>
                    <p>{col.hint}</p>
                  </div>
                  <span class="fc-tag">{inCol(col.id).length}</span>
                </header>
                <div class="fc-kb-list">
                  <For each={inCol(col.id)}>
                    {(s) => (
                      <article class="fc-kb-card">
                        <strong>
                          {s.code} · {s.title}
                        </strong>
                        <span>{s.agent || "—"}</span>
                        <span class="fc-micro">{s.status}</span>
                      </article>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
