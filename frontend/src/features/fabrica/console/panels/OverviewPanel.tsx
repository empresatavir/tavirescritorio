import { For, Show } from "solid-js";
import { EmptyState } from "./EmptyState";

export type OverviewStageRow = {
  n: string;
  title: string;
  agent: string;
  state: "done" | "blocked" | "queued" | "running";
  hash?: string;
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
};

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
  current: OverviewCurrent | null;
  canAuthorize: boolean;
  canComplete: boolean;
  busy: boolean;
  error: string | null;
  connected: boolean;
  onAuthorize: () => void;
  onComplete: () => void;
  onGoAccess: () => void;
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
                  : props.connected
                    ? "Esteira ao vivo · SSE conectado."
                    : props.current
                      ? "Esteira carregada · SSE reconectando…"
                      : "Nenhuma esteira materializada para este projeto."}
              </p>
            </div>
            <button
              type="button"
              class="fc-btn"
              disabled={!props.canComplete || props.busy}
              onClick={() => props.onComplete()}
            >
              {props.busy && props.canComplete ? "Concluindo…" : "Concluir etapa"}
            </button>
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
                    Esta etapa está bloqueada. Autorize o gate ao lado para continuar.
                  </p>
                </Show>
                <Show when={props.canComplete}>
                  <p class="fc-ov-block-note">
                    Etapa em execução. Conclua para avançar na esteira.
                  </p>
                </Show>
              </>
            )}
          </Show>
        </section>

        <section class="fc-ov-card">
          <h3>Etapas da esteira</h3>
          <Show
            when={props.stages.length}
            fallback={<EmptyState title="Nenhuma etapa" text="O run ainda não materializou stages." />}
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
            when={props.canAuthorize && props.current}
            fallback={
              <EmptyState
                title="Nenhuma pendência de gate"
                text="Quando uma etapa exigir autorização, ela aparece aqui."
              />
            }
          >
            <article class="fc-ov-pend is-gate">
              <strong>Gate · {props.current!.title}</strong>
              <p>
                A etapa {props.current!.code} exige autorização do CEO local para liberar a
                próxima etapa.
              </p>
              <button
                type="button"
                class="fc-btn"
                disabled={props.busy}
                onClick={props.onAuthorize}
              >
                {props.busy ? "Autorizando…" : "Autorizar"}
              </button>
            </article>
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
