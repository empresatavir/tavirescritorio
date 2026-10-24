import { For, Show, createEffect, createSignal } from "solid-js";
import { api, type FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function RoadmapPanel(props: {
  projectId: string;
  stages?: FactoryStageInstance[];
  templateCode?: string;
  onRedoStage?: (stageDefId: string) => void;
}) {
  const [stages, setStages] = createSignal<FactoryStageInstance[]>(props.stages || []);
  const [pct, setPct] = createSignal(0);
  const [code, setCode] = createSignal(props.templateCode || "");
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    void props.projectId;
    void (async () => {
      try {
        const r = await api.getFactoryRoadmap(props.projectId);
        setStages(r.stages);
        setPct(r.pct);
        setCode(r.template_code);
        setError(null);
      } catch (err) {
        if (props.stages?.length) {
          setStages(props.stages);
          const done = props.stages.filter((s) => s.status === "done").length;
          setPct(Math.round((done / Math.max(props.stages.length, 1)) * 100));
          setCode(props.templateCode || "");
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Roadmap indisponível");
        }
      }
    })();
  });

  return (
    <div class="fc-rm2 is-ready" data-screen-label="Roadmap da esteira">
      <Show when={error()} fallback={null}>
        <EmptyState title="Roadmap indisponível" text={error() || undefined} />
      </Show>
      <Show when={!error() && stages().length} fallback={!error() ? <EmptyState title="Sem stages" /> : null}>
        <article class="fc-rm2-phase is-partial" style={{ "margin-bottom": "12px" }}>
          <p class="fc-micro">{(code() || "esteira").toUpperCase()}</p>
          <h3>Progresso da esteira</h3>
          <p>
            {stages().filter((s) => s.status === "done").length} de {stages().length} · {pct()}%
          </p>
        </article>
        <ol class="fc-ov-stages">
          <For each={stages()}>
            {(s) => (
              <li
                class={`fc-ov-stage is-${
                  s.status === "done"
                    ? "done"
                    : s.status === "running"
                      ? "running"
                      : s.status === "awaiting_gate" || s.status === "failed"
                        ? "blocked"
                        : "queued"
                }`}
              >
                <span class="fc-ov-stage-n">{s.code}</span>
                <span class="fc-ov-stage-body">
                  <strong>{s.title}</strong>
                  <span>
                    {s.agent || "—"} · {s.status}
                  </span>
                  <Show when={s.is_gate && (s.status === "done" || s.status === "awaiting_gate")}>
                    <button
                      type="button"
                      class="fc-btn-sec"
                      style={{ "margin-top": "6px" }}
                      onClick={() => props.onRedoStage?.(s.stage_def_id)}
                    >
                      Refazer entrega
                    </button>
                  </Show>
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
