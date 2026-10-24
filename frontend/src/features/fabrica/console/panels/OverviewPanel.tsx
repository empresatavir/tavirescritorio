import { For, Show, type JSX } from "solid-js";
import type { FactoryRunPendency } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export type OverviewStageRow = {
  n: string;
  title: string;
  agent: string;
  state: "done" | "blocked" | "queued" | "running";
  hash?: string;
  stage_def_id?: string;
  is_gate?: boolean;
  status?: string;
};

export type OverviewActivityRow = {
  id: string;
  title: string;
  meta: string;
  tone: "ok" | "warn" | "danger";
};

export type OverviewCurrent = {
  code: string;
  title: string;
  agent: string;
  index: number;
  total: number;
  status: string;
  isGate: boolean;
  stageDefId?: string;
};

const DELIVERY_STEPS = [
  "Diego Sistemas implementa só o backend e grava o plano de testes do back.",
  "Dev Frontend implementa só o frontend e grava o plano de testes da frente.",
  "Tester Automatizado valida o backend. Cada falha vira uma issue.",
  "Diego Sistemas lê a issue de back, corrige o código e devolve ao Tester.",
  "Validador Visual valida o frontend. Cada falha vira uma issue.",
  "Dev Frontend lê a issue de frente, corrige o código e devolve ao Validador.",
  "Os dois testes precisam fechar com Resultado: APROVADO.",
  "Sérgio audita a segurança. Achado crítico ou alto vira issue.",
  "O especialista do lado afetado corrige. Sérgio reaudita até Parecer: APROVADO.",
  "Dante escreve três documentos: suporte, desenvolvimento e usuário.",
  "O CEO conclui o projeto no gate final.",
];

const DELIVERY_IDS = new Set([
  "m_code",
  "m_code_be",
  "m_code_fe",
  "m_qa",
  "m_qa_be",
  "m_qa_fe",
  "m_hard",
  "m_docs",
  "build",
  "build_be",
  "build_fe",
  "qa",
  "qa_be",
  "qa_fe",
  "seo_sec",
  "m_seo_sec",
  "docs",
]);

function statusLabel(status: string, isGate: boolean): { text: string; tone: string } {
  if (status === "awaiting_gate") return { text: "Aguardando gate", tone: "warn" };
  if (status === "running") return { text: "Em execução", tone: "ok" };
  if (status === "failed") return { text: "Falhou", tone: "danger" };
  if (status === "blocked") return { text: "Bloqueada", tone: "warn" };
  if (status === "done") return { text: "Concluída", tone: "ok" };
  if (isGate) return { text: "Gate", tone: "warn" };
  return { text: status || "Na fila", tone: "muted" };
}

export function OverviewPanel(props: {
  loading?: boolean;
  stages: OverviewStageRow[];
  activity: OverviewActivityRow[];
  pendencies: FactoryRunPendency[];
  current: OverviewCurrent | null;
  runStatus?: string | null;
  canAuthorize: boolean;
  canComplete: boolean;
  canExecute?: boolean;
  canAutoRun?: boolean;
  autoOn?: boolean;
  canRedo?: boolean;
  canFail: boolean;
  canResume: boolean;
  busy: boolean;
  error: string | null;
  connected: boolean;
  onAuthorize: () => void;
  onComplete: () => void;
  onExecute?: () => void;
  onToggleAuto?: () => void;
  onRedo?: () => void;
  onRedoStage?: (stageDefId: string) => void;
  onFail: () => void;
  onResume: () => void;
  report?: JSX.Element;
  showDeliveryProcess?: boolean;
}) {
  const badge = () =>
    props.current
      ? statusLabel(props.current.status, props.current.isGate)
      : { text: "Sem etapa", tone: "muted" };

  return (
    <div class="fc-ov">
      <div class="fc-ov-main">
        <section class="fc-ov-card">
          <div class="fc-ov-card-head">
            <div>
              <h3>Etapa atual</h3>
              <p>
                {props.loading
                  ? "Carregando esteira…"
                  : props.runStatus === "paused"
                    ? "Esteira pausada · retome para continuar."
                    : props.connected
                      ? "Esteira ao vivo · SSE conectado."
                      : props.current
                        ? "Esteira carregada · SSE reconectando…"
                        : "Nenhuma esteira materializada para este projeto."}
              </p>
            </div>
            <div class="fc-btn-row">
              <Show when={props.canResume}>
                <button
                  type="button"
                  class="fc-btn"
                  disabled={props.busy}
                  onClick={() => props.onResume()}
                >
                  {props.busy ? "Retomando…" : "Retomar"}
                </button>
              </Show>
              <button
                type="button"
                class="fc-auto-toggle"
                classList={{ "is-on": !!props.autoOn }}
                role="switch"
                aria-checked={!!props.autoOn}
                onClick={() => props.onToggleAuto?.()}
                title="Liga ou desliga o avanço automático até o próximo gate"
              >
                <span class="fc-auto-knob" aria-hidden="true"><span /></span>
                Execução automática
                <span class="fc-auto-state">{props.autoOn ? "ligada" : "desligada"}</span>
              </button>
              <button
                type="button"
                class="fc-btn-sec"
                disabled={!props.canExecute || props.busy}
                onClick={() => props.onExecute?.()}
              >
                Executar
              </button>
              <button
                type="button"
                class="fc-btn"
                disabled={!props.canComplete || props.busy}
                onClick={() => props.onComplete()}
              >
                {props.busy && props.canComplete ? "Concluindo…" : "Concluir etapa"}
              </button>
              <button
                type="button"
                class="fc-btn-sec"
                disabled={!props.canFail || props.busy}
                onClick={() => props.onFail()}
              >
                Marcar falha
              </button>
            </div>
          </div>

          <Show
            when={props.current}
            fallback={
              <EmptyState
                title={props.loading ? "Carregando…" : "Sem run ativo"}
                text="Crie o projeto com um template de esteira para materializar as etapas."
              />
            }
          >
            {(cur) => (
              <>
                <div class="fc-ov-current">
                  <div>
                    <span class="fc-micro">
                      ETAPA {String(cur().index).padStart(2, "0")} DE {cur().total}
                      {props.runStatus ? ` · ${props.runStatus}` : ""}
                    </span>
                    <strong>
                      {cur().code} · {cur().title}
                    </strong>
                    <span class="fc-ov-agent">{cur().agent}</span>
                  </div>
                  <span class={`fc-tag ${badge().tone}`}>{badge().text}</span>
                </div>
                <Show when={props.error}>
                  <p class="fc-ov-block-note" style={{ color: "var(--danger, #c44)" }}>
                    {props.error}
                  </p>
                </Show>
                <Show when={cur().status === "awaiting_gate"}>
                  <p class="fc-ov-block-note">
                    Leia o relatório do agente abaixo. Autorize só se a entrega estiver completa.
                  </p>
                </Show>
                <Show when={props.showDeliveryProcess || DELIVERY_IDS.has(cur().stageDefId || "")}>
                  <div class="fc-process">
                    <p class="fc-micro">Como esta entrega funciona</p>
                    <ol>
                      <For each={DELIVERY_STEPS}>{(step) => <li>{step}</li>}</For>
                    </ol>
                  </div>
                </Show>
                <Show when={cur().status === "failed"}>
                  <p class="fc-ov-block-note">
                    Etapa falhou. Corrija a causa e use Retomar para reabrir a execução.
                  </p>
                </Show>
                {props.report}
              </>
            )}
          </Show>
        </section>

        <section class="fc-ov-card">
          <h3>Etapas da esteira</h3>
          <Show
            when={props.stages.length}
            fallback={
              <EmptyState
                title={props.loading ? "Carregando esteira…" : "Nenhuma etapa"}
                text={
                  props.loading
                    ? "As etapas aparecem quando o run chega."
                    : "O run ainda não materializou stages."
                }
              />
            }
          >
            <ol class="fc-ov-stages">
              <For each={props.stages}>
                {(s) => (
                  <li class={`fc-ov-stage is-${s.state}`}>
                    <span class="fc-ov-stage-n">{s.n}</span>
                    <span class="fc-ov-stage-body">
                      <strong>{s.title}</strong>
                      <span>
                        {s.agent}
                        {s.hash ? ` · ${s.hash}` : ""}
                      </span>
                      <Show when={s.is_gate && (s.status === "done" || s.status === "awaiting_gate") && s.stage_def_id}>
                        <button
                          type="button"
                          class="fc-btn-sec"
                          disabled={props.busy}
                          style={{ "margin-top": "6px" }}
                          onClick={() => props.onRedoStage?.(s.stage_def_id!)}
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
        </section>
      </div>

      <aside class="fc-ov-side">
        <section class="fc-ov-card">
          <h3>Pendências</h3>
          <Show
            when={props.pendencies.length}
            fallback={
              <EmptyState
                title="Nenhuma pendência"
                text="Gates e falhas da esteira aparecem aqui."
              />
            }
          >
            <For each={props.pendencies}>
              {(p) => (
                <article class={`fc-ov-pend is-${p.kind === "error" ? "error" : "gate"}`}>
                  <strong>{p.title}</strong>
                  <p>{p.text}</p>
                  <Show when={p.cause}>
                    <p class="fc-ov-pend-detail">{p.cause}</p>
                  </Show>
                  <Show when={p.action === "authorize" || (p.kind === "auth" && props.canAuthorize)}>
                    <button
                      type="button"
                      class="fc-btn"
                      disabled={props.busy || !props.canAuthorize}
                      onClick={props.onAuthorize}
                    >
                      {props.busy ? "Autorizando…" : "Autorizar"}
                    </button>
                    <Show when={props.canRedo}>
                      <button
                        type="button"
                        class="fc-btn-sec"
                        disabled={props.busy}
                        onClick={() => props.onRedo?.()}
                      >
                        Refazer entrega
                      </button>
                    </Show>
                  </Show>
                  <Show when={p.action === "resume" || p.kind === "error"}>
                    <button
                      type="button"
                      class="fc-btn"
                      disabled={props.busy || !props.canResume}
                      onClick={props.onResume}
                    >
                      {props.busy ? "Retomando…" : "Retomar"}
                    </button>
                  </Show>
                </article>
              )}
            </For>
          </Show>
        </section>

        <section class="fc-ov-card">
          <h3>Atividade</h3>
          <Show
            when={props.activity.length}
            fallback={<EmptyState title="Sem eventos" text="O ledger da esteira ainda está vazio." />}
          >
            <ul class="fc-ov-act">
              <For each={props.activity}>
                {(a) => (
                  <li class={`is-${a.tone}`}>
                    <i />
                    <span>
                      <strong>{a.title}</strong>
                      <span>{a.meta}</span>
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>
      </aside>
    </div>
  );
}
