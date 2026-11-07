import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { api, type FactoryStageInstance } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

const RING = 2 * Math.PI * 16;

function officeDate(iso?: string | null): number {
  if (!iso) return NaN;
  const raw = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return Date.parse(raw);
}

function sameDay(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function dayLabel(ms: number): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(ms).replace(".", "");
}

function hourLabel(ms: number): string {
  return `${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit" }).format(ms).replace(/\D/g, "")}h`;
}

function spanLabel(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours >= 24) {
    const days = Math.max(1, Math.round(hours / 24));
    return `${days} dia${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) return `${Math.max(1, Math.round(hours))} h`;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} min`;
}

function barLabel(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours >= 24) return `${Math.max(1, Math.round(hours / 24))}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;
  const minutes = ms / 60_000;
  if (minutes >= 1) return `${Math.round(minutes)}min`;
  return "";
}

function tone(status: string): string {
  if (status === "done") return "done";
  if (status === "running") return "active";
  if (status === "awaiting_gate" || status === "failed" || status === "blocked") return "blocked";
  return "idle";
}

function phasesOf(stages: FactoryStageInstance[]) {
  const chunks: FactoryStageInstance[][] = [];
  let cursor = 0;
  stages.forEach((stage, index) => {
    if (stage.is_gate && index >= cursor) {
      chunks.push(stages.slice(cursor, index + 1));
      cursor = index + 1;
    }
  });
  if (cursor < stages.length) chunks.push(stages.slice(cursor));
  if (chunks.length >= 2 && chunks[0].length === 1 && chunks[0][0].is_gate) {
    chunks[1] = [...chunks[0], ...chunks[1]];
    chunks.shift();
  }
  while (chunks.length > 3) {
    const mid = Math.max(0, Math.floor(chunks.length / 2) - 1);
    chunks.splice(mid, 2, [...chunks[mid], ...chunks[mid + 1]]);
  }
  return chunks.map((items, index) => {
    const done = items.filter((item) => item.status === "done").length;
    const gate = [...items].reverse().find((item) => item.is_gate);
    return {
      id: `fase-${index + 1}`,
      label: `Fase ${index + 1}`,
      title: (gate || items[items.length - 1]).title,
      range: `etapas ${items[0].code} – ${items[items.length - 1].code}`,
      pct: Math.round((done / Math.max(items.length, 1)) * 100),
      done: done === items.length,
    };
  });
}

export function RoadmapPanel(props: {
  projectId: string;
  stages?: FactoryStageInstance[];
  templateCode?: string;
  onRedoStage?: (stageDefId: string) => void;
}) {
  const [stages, setStages] = createSignal<FactoryStageInstance[]>(props.stages || []);
  const [pct, setPct] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    void props.projectId;
    void (async () => {
      try {
        const roadmap = await api.getFactoryRoadmap(props.projectId);
        setStages(roadmap.stages);
        setPct(roadmap.pct);
        setError(null);
      } catch (err) {
        if (props.stages?.length) {
          setStages(props.stages);
          const done = props.stages.filter((stage) => stage.status === "done").length;
          setPct(Math.round((done / Math.max(props.stages.length, 1)) * 100));
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Roadmap indisponível");
        }
      }
    })();
  });

  const chart = createMemo(() => {
    const rows = stages();
    const stamps = rows.flatMap((stage) => [officeDate(stage.started_at), officeDate(stage.finished_at)]).filter((value) => !Number.isNaN(value));
    const start = stamps.length ? Math.min(...stamps) : Date.now();
    const end = stamps.length ? Math.max(...stamps) : start + 3_600_000;
    const span = Math.max(end - start, 60_000);
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const at = start + (span * index) / 4;
      return sameDay(start, end) ? hourLabel(at) : dayLabel(at);
    });
    const now = Date.now();
    const today = now >= start && now <= end ? ((now - start) / span) * 100 : null;
    return {
      start,
      end,
      span,
      ticks,
      today,
      title: sameDay(start, end) ? `Cronograma · ${dayLabel(start)}` : `Cronograma · ${dayLabel(start)} → ${dayLabel(end)}`,
      hint: `${spanLabel(span)} de execução · ${rows.filter((stage) => stage.status === "done").length} concluídas`,
    };
  });

  const place = (stage: FactoryStageInstance) => {
    const window = chart();
    const from = officeDate(stage.started_at);
    const to = officeDate(stage.finished_at);
    const leftRaw = Number.isNaN(from) ? 0 : ((from - window.start) / window.span) * 100;
    const widthRaw = Number.isNaN(from) || Number.isNaN(to) ? 4 : ((Math.max(to, from) - from) / window.span) * 100;
    const width = Math.min(100, Math.max(widthRaw, 2.6));
    const left = Math.max(0, Math.min(leftRaw, 100 - width));
    const marker = Number.isNaN(to) ? left + width : ((to - window.start) / window.span) * 100;
    return { left, width, marker: Math.max(0, Math.min(marker, 100)), label: barLabel(Math.max(0, (Number.isNaN(to) ? from : to) - (Number.isNaN(from) ? to : from))) };
  };

  return (
    <div class="fc-rm2 is-ready" data-screen-label="Roadmap da esteira">
      <Show when={error()}>
        <EmptyState title="Roadmap indisponível" text={error() || undefined} />
      </Show>
      <Show when={!error() && stages().length} fallback={!error() ? <EmptyState title="Sem stages" /> : null}>
        <div
          class="fc-rm2-phases"
          style={{ "grid-template-columns": `repeat(${Math.min(Math.max(phasesOf(stages()).length, 1), 3)}, minmax(0, 1fr))` }}
        >
          <For each={phasesOf(stages())}>
            {(phase) => (
              <article class={`fc-rm2-phase ${phase.done ? "is-done" : "is-partial"}`}>
                <div class="fc-rm2-ring" aria-label={`${phase.pct}%`}>
                  <svg viewBox="0 0 44 44" width="44" height="44">
                    <circle class="fc-rm2-ring-track" cx="22" cy="22" r="16" />
                    <circle
                      class="fc-rm2-ring-value"
                      cx="22"
                      cy="22"
                      r="16"
                      stroke-dasharray={`${RING}`}
                      style={{ "--rm-ring": `${RING * (1 - phase.pct / 100)}px` }}
                    />
                  </svg>
                  <strong>{phase.pct}%</strong>
                </div>
                <div>
                  <p>{phase.label}</p>
                  <h3>{phase.title}</h3>
                  <p>{phase.range}</p>
                </div>
              </article>
            )}
          </For>
        </div>

        <section class="fc-rm2-board">
          <div class="fc-rm2-board-head">
            <div>
              <h3>{chart().title}</h3>
              <p>{chart().hint}</p>
            </div>
            <ul class="fc-rm2-legend">
              <li class="is-done">concluído</li>
              <li class="is-active">em execução</li>
              <li class="is-blocked">bloqueado</li>
              <li class="is-gate">gate</li>
            </ul>
          </div>
          <div class="fc-rm2-overall" aria-hidden="true">
            <div class="fc-rm2-overall-fill" style={{ width: `${pct()}%` }} />
          </div>
          <div class="fc-rm2-scroll">
            <div class="fc-rm2-grid">
              <div class="fc-rm2-corner" />
              <div class="fc-rm2-ticks">
                <For each={chart().ticks}>{(tick) => <span>{tick}</span>}</For>
                <Show when={chart().today !== null}>
                  <span class="fc-rm2-today" style={{ left: `${chart().today}%` }}>
                    <em>agora</em>
                  </span>
                </Show>
              </div>
              <For each={stages()}>
                {(stage) => {
                  const box = place(stage);
                  const state = tone(stage.status);
                  return (
                    <div class="fc-rm2-row">
                      <div class="fc-rm2-label">
                        <i class={`is-${state}`} />
                        <span>
                          <strong>
                            {stage.code} · {stage.title}
                          </strong>
                          <span>{stage.agent || "—"}</span>
                        </span>
                      </div>
                      <div class="fc-rm2-track">
                        <div class="fc-rm2-track-bg" />
                        <Show
                          when={stage.is_gate}
                          fallback={
                            <div class={`fc-rm2-bar is-${state}`} style={{ left: `${box.left}%`, width: `${box.width}%` }}>
                              <Show when={box.width >= 8 && box.label}>
                                <span>{box.label}</span>
                              </Show>
                            </div>
                          }
                        >
                          <i class={`fc-rm2-diamond is-${state}`} style={{ left: `${box.marker}%` }} />
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
          <div class="fc-rm2-foot">
            <For each={stages().filter((stage) => stage.is_gate)}>
              {(stage) => (
                <span class={`fc-rm2-chip ${stage.status === "done" ? "is-done" : "is-wait"}`}>
                  <i />
                  {stage.code} · {stage.status === "done" ? "Concluído" : stage.status === "awaiting_gate" ? "Aguarda" : "Pendente"}
                </span>
              )}
            </For>
          </div>
        </section>
      </Show>
    </div>
  );
}
