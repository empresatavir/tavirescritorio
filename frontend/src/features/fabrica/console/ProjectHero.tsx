import { Show } from "solid-js";
import { TvIcon } from "../../../shared/components/TvIcon";

export interface ProjectMeta {
  code: string;
  status: "running" | "paused" | "done";
  statusLabel: string;
  stagesDone: number;
  totalStages: number;
  company: string;
  stack?: string;
  database?: string;
  runtime?: string;
  localPath: string;
}

export function ProjectHero(props: {
  projectId: string;
  projectName?: string;
  meta: ProjectMeta;
  running: boolean;
  onToggleRun: () => void;
  onOpenFolder: () => void;
  onValidate: () => void;
  onBack?: () => void;
}) {
  const pct = () =>
    Math.round((props.meta.stagesDone / Math.max(props.meta.totalStages, 1)) * 100);
  const ring = () => {
    const r = 34;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct() / 100);
    return { c, offset };
  };

  return (
    <header class="fc-hero" data-project-id={props.projectId}>
      <Show when={props.onBack}>
        <button type="button" class="fc-hero-back" onClick={() => props.onBack?.()}>
          ← Dashboard
        </button>
      </Show>

      <div class="fc-hero-card">
        <div class="fc-hero-ring" aria-label={`Progresso ${pct()}%`}>
          <svg viewBox="0 0 80 80" width="72" height="72">
            <circle cx="40" cy="40" r="34" class="fc-hero-ring-track" />
            <circle
              cx="40"
              cy="40"
              r="34"
              class="fc-hero-ring-value"
              stroke-dasharray={`${ring().c}`}
              stroke-dashoffset={`${ring().offset}`}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div class="fc-hero-ring-label">
            <strong>{pct()}%</strong>
            <span>
              {props.meta.stagesDone}/{props.meta.totalStages || "—"}
            </span>
          </div>
        </div>

        <div class="fc-hero-body">
          <div class="fc-hero-badges">
            <span class="fc-hero-pill lime">{props.meta.code}</span>
            <span class="fc-hero-pill outline">
              <TvIcon name="radio-tower" width="12" height="12" />
              {props.running ? props.meta.statusLabel : "Pausado"}
            </span>
          </div>
          <h1 class="fc-hero-title">{props.projectName || "Projeto"}</h1>
          <div class="fc-hero-meta">
            <span>
              <TvIcon name="briefcase" width="12" height="12" />
              {props.meta.company}
            </span>
            <Show when={props.meta.stack}>
              <span>
                <TvIcon name="layers" width="12" height="12" />
                {props.meta.stack}
              </span>
            </Show>
            <Show when={props.meta.localPath}>
              <span>
                <TvIcon name="folder-kanban" width="12" height="12" />
                {props.meta.localPath}
              </span>
            </Show>
          </div>
        </div>

        <div class="fc-hero-actions">
          <button type="button" class="fc-hero-btn" onClick={props.onToggleRun} title="Iniciar ou pausar esteira">
            <TvIcon name={props.running ? "pause" : "play"} width="14" height="14" />
            {props.running ? "Pausar" : "Iniciar"}
          </button>
          <button type="button" class="fc-hero-btn ghost" onClick={props.onOpenFolder} title="Abrir pasta local do projeto">
            <TvIcon name="folder-kanban" width="14" height="14" />
            Pasta local
          </button>
          <button type="button" class="fc-hero-btn ghost" onClick={props.onValidate} title="Validar estrutura de pastas">
            <TvIcon name="shield-check" width="14" height="14" />
            Validar pastas
          </button>
        </div>
      </div>
    </header>
  );
}
