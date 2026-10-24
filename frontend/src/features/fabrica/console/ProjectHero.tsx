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
  gatePending?: boolean;
  failPending?: boolean;
  currentStageLabel?: string;
}

export function ProjectHero(props: {
  projectId: string;
  projectName?: string;
  meta: ProjectMeta;
  running: boolean;
  busy?: boolean;
  canAuthorize?: boolean;
  canResume?: boolean;
  canAutoRun?: boolean;
  autoOn?: boolean;
  onToggleAuto?: () => void;
  canRestart?: boolean;
  canRedo?: boolean;
  onToggleRun: () => void;
  onAuthorize?: () => void;
  onResume?: () => void;
  onAutoRun?: () => void;
  onRedo?: () => void;
  onRestart?: () => void;
  onOpenFolder: () => void;
  onValidate: () => void;
  folderCheck?: string;
  onOpenSettings?: () => void;
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
            <Show when={props.meta.gatePending}>
              <span class="fc-hero-pill warn">Gate CEO</span>
            </Show>
            <Show when={props.meta.failPending}>
              <span class="fc-hero-pill danger">Falha</span>
            </Show>
          </div>
          <h1 class="fc-hero-title">{props.projectName || "Projeto"}</h1>
          <div class="fc-hero-meta">
            <span>
              <TvIcon name="briefcase" width="12" height="12" />
              {props.meta.company}
            </span>
            <Show when={props.meta.currentStageLabel}>
              <span>
                <TvIcon name="layers" width="12" height="12" />
                {props.meta.currentStageLabel}
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
          <button
            type="button"
            class="fc-hero-btn ghost"
            onClick={() => props.onOpenSettings?.()}
            title="Motor de IA e esforço deste projeto"
          >
            <TvIcon name="sliders" width="14" height="14" />
            Configurar
          </button>
          <button
            type="button"
            class="fc-auto-toggle"
            classList={{ "is-on": !!props.autoOn }}
            role="switch"
            aria-checked={!!props.autoOn}
            disabled={props.busy && !props.autoOn}
            onClick={() => props.onToggleAuto?.()}
            title="Liga ou desliga o avanço automático até o próximo gate"
          >
            <span class="fc-auto-knob" aria-hidden="true"><span /></span>
            Execução automática
            <span class="fc-auto-state">{props.autoOn ? (props.busy ? "executando" : "ligada") : "desligada"}</span>
          </button>
          <Show when={props.canRedo}>
            <button
              type="button"
              class="fc-hero-btn"
              disabled={props.busy}
              onClick={() => props.onRedo?.()}
              title="Reabre a entrega deste gate com novas instruções"
            >
              Refazer entrega
            </button>
          </Show>
          <Show when={props.canAuthorize}>
            <button
              type="button"
              class="fc-hero-btn"
              disabled={props.busy}
              onClick={() => props.onAuthorize?.()}
              title="Autorizar gate CEO local"
            >
              <TvIcon name="shield-check" width="14" height="14" />
              Autorizar gate
            </button>
          </Show>
          <Show when={props.canResume}>
            <button
              type="button"
              class="fc-hero-btn"
              disabled={props.busy}
              onClick={() => props.onResume?.()}
              title="Retomar esteira"
            >
              <TvIcon name="play" width="14" height="14" />
              Retomar
            </button>
          </Show>
          <button
            type="button"
            class="fc-hero-btn"
            disabled={props.busy}
            onClick={props.onToggleRun}
            title="Iniciar ou pausar esteira"
          >
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
          <Show when={props.canRestart}>
            <button
              type="button"
              class="fc-hero-btn ghost"
              disabled={props.busy}
              onClick={() => props.onRestart?.()}
              title="Volta a esteira ao Gate 0"
            >
              Refazer projeto
            </button>
          </Show>
        </div>
        <Show when={props.folderCheck}>
          <p class="fc-hero-check" role="status">{props.folderCheck}</p>
        </Show>
      </div>
    </header>
  );
}
