import { For, Show } from "solid-js";
import type { FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

function pctOf(stages: FactoryStageInstance[]): number {
  if (!stages.length) return 0;
  const done = stages.filter((s) => s.status === "done" || s.status === "skipped").length;
  return Math.round((done / stages.length) * 100);
}

export function RoadmapPanel(props: { stages: FactoryStageInstance[]; templateCode?: string }) {
  const pct = () => pctOf(props.stages);

  return (
    <div class="fc-rm2 is-ready" data-screen-label="Roadmap da esteira">
      <Show
        when={props.stages.length}
        fallback={
          <EmptyState title="Roadmap indisponível" text="Sem stages materializados neste projeto." />
        }
      >
        <div class="fc-rm2-phases">
          <article class="fc-rm2-phase" classList={{ "is-partial": pct() > 0 && pct() < 100, "is-done": pct() === 100 }}>
            <div>
              <p class="fc-micro">{(props.templateCode || "esteira").toUpperCase()}</p>
              <h3>Progresso da esteira</h3>
              <p>
                {props.stages.filter((s) => s.status === "done").length} de {props.stages.length}{" "}
                etapas · {pct()}%
              </p>
            </div>
          </article>
        </div>
        <ol class="fc-ov-stages" style={{ "margin-top": "16px" }}>
          <For each={props.stages}>
            {(s) => (
              <li
                class={`fc-ov-stage is-${
                  s.status === "done"
                    ? "done"
                    : s.status === "running"
                      ? "running"
                      : s.status === "awaiting_gate" || s.status === "failed" || s.status === "blocked"
                        ? "blocked"
                        : "queued"
                }`}
              >
                <span class="fc-ov-stage-n">{s.code}</span>
                <span class="fc-ov-stage-body">
                  <strong>{s.title}</strong>
                  <span>
                    {s.agent || "—"} · {s.status}
                    {s.is_gate ? " · gate" : ""}
                  </span>
                </span>
                <span class="fc-ov-stage-mark" aria-hidden="true" />
              </li>
            )}
          </For>
        </ol>
      </Show>
    </div>
  );
}
