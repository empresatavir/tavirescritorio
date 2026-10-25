import { For, Show, createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
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

export type OverviewExecutionLine = {
  id: string;
  stageId: string;
  message: string;
  at?: string;
  actor?: string;
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
  expected?: string[];
  startedAt?: string;
  delivered?: boolean;
};

function stamp(iso: string): string {
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
}

function nowText(id: string, agent: string): string {
  const known: Record<string, string> = {
    m_code_be: "Diego implementa só o backend e grava o plano de testes.",
    m_code_fe: "O Dev Frontend implementa só a interface e grava o plano de testes.",
    m_qa_be: "O Tester valida o backend e grava qa/report-back.md. Cada falha vira uma issue.",
    m_qa_fe: "O Validador Visual valida a interface e grava qa/report-front.md.",
    m_hard: "Sérgio audita a segurança e grava o parecer.",
    m_docs: "Dante escreve os documentos de suporte, desenvolvimento e usuário.",
    m_final: "O CEO lê as entregas e conclui o projeto no gate final.",
    m_gate0: "Dora registra a demanda de manutenção.",
    m_diag: "Ari descreve o diagnóstico e o plano.",
    m_plan_gate: "O CEO autoriza o plano antes da implementação.",
  };
  return known[id] || `${agent} executa esta etapa e grava a entrega esperada.`;
}

function clock(iso?: string): string {
  if (!iso || Number.isNaN(Date.parse(stamp(iso)))) return "";
  return new Date(stamp(iso)).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function GateFlow(props: { files: string[]; delivered: boolean; generating: boolean; clock: string }) {
  const delivery = () => props.files.join(", ") || "o arquivo desta etapa";
  const writing = () => props.generating && !props.delivered;
  const releasing = () => props.generating && props.delivered;
  return (
    <ol class="fc-gate-flow">
      <li class={props.delivered ? "is-done" : writing() ? "is-now" : "is-wait"}>
        <span>1</span>
        <div>
          <strong>Gravar {delivery()}</strong>
          <p>
            {props.delivered
              ? "O arquivo já está na pasta."
              : writing()
                ? `O motor está escrevendo este arquivo${props.clock ? ` · ${props.clock}` : ""}. Esta é a parte demorada.`
                : "Este passo ainda não começou. O botão dispara o motor antes de liberar o gate."}
          </p>
        </div>
      </li>
      <li class={releasing() ? "is-now" : "is-wait"}>
        <span>2</span>
        <div>
          <strong>Liberar o gate</strong>
          <p>
            {releasing()
              ? "O arquivo entrou. A esteira está abrindo a próxima etapa."
              : "Este passo só começa depois do arquivo. Ele não chama o motor."}
          </p>
        </div>
      </li>
    </ol>
  );
}

function CallMeter(props: { since: number | null; now: number }) {
  const elapsed = () => {
    if (!props.since) return "";
    const seconds = Math.max(0, Math.floor((props.now - props.since) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
    if (minutes > 0) return `${minutes} min ${rest} s`;
    return `${rest} s`;
  };
  return (
    <div class="fc-call-meter">
      <div class="fc-call-meter-ring is-live" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="40" height="40">
          <circle cx="20" cy="20" r="16" class="fc-call-meter-track" />
          <circle
            cx="20"
            cy="20"
            r="16"
            class="fc-call-meter-value"
            stroke-dasharray="28 72"
            transform="rotate(-90 20 20)"
          />
        </svg>
      </div>
      <div
        class="fc-call-meter-bar"
        role="progressbar"
        aria-valuetext={elapsed() || "em andamento"}
        aria-label="Chamada em andamento, sem limite de tempo"
      >
        <span />
      </div>
      <span class="fc-call-meter-time">{elapsed()}</span>
    </div>
  );
}

function LiveList(props: { lines: OverviewExecutionLine[] }) {
  let box: HTMLUListElement | undefined;
  createEffect(() => {
    props.lines.length;
    queueMicrotask(() => {
      if (box) box.scrollTop = box.scrollHeight;
    });
  });
  return (
    <ul class="fc-exec-live" ref={box}>
      <For each={props.lines}>
        {(item, index) => (
          <li classList={{ "is-now": index() === props.lines.length - 1 }}>
            <strong>{item.message}</strong>
            <span>{clock(item.at) || item.actor || ""}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

function checkpointClock(at?: string) {
  if (!at || Number.isNaN(Date.parse(at))) return "";
  return new Date(at).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function statusLabel(
  status: string,
  isGate: boolean,
  busy = false,
  runStatus?: string | null,
  busyAction?: string | null,
): { text: string; tone: string } {
  if (runStatus === "paused") return { text: "Pausada", tone: "warn" };
  if (status === "awaiting_gate" && busyAction === "authorize") return { text: "Gerando entrega", tone: "ok" };
  if (status === "awaiting_gate") return { text: "Aguardando gate", tone: "warn" };
  if (status === "running" && busyAction === "complete") return { text: "Concluindo", tone: "ok" };
  if (status === "running" && (busyAction === "auto" || busyAction === "execute")) return { text: "No motor", tone: "ok" };
  if (status === "running" && busy) return { text: "Ocupada", tone: "ok" };
  if (status === "running") return { text: "Aberta", tone: "ok" };
  if (status === "failed") return { text: "Falhou", tone: "danger" };
  if (status === "blocked") return { text: "Bloqueada", tone: "warn" };
  if (status === "done") return { text: "Concluída", tone: "ok" };
  if (status === "queued") return { text: "Na fila", tone: "muted" };
  if (isGate) return { text: "Aguardando você", tone: "warn" };
  return { text: status || "Na fila", tone: "muted" };
}

export function OverviewPanel(props: {
  loading?: boolean;
  stages: OverviewStageRow[];
  activity: OverviewActivityRow[];
  execution?: OverviewExecutionLine[];
  pendencies: FactoryRunPendency[];
  current: OverviewCurrent | null;
  runStatus?: string | null;
  canAuthorize: boolean;
  canComplete: boolean;
  canExecute?: boolean;
  canAutoRun?: boolean;
  autoOn?: boolean;
  model?: string;
  effort?: string;
  canPause?: boolean;
  onPause?: () => void;
  canRedo?: boolean;
  canFail: boolean;
  canResume: boolean;
  busy: boolean;
  busyAction?: string | null;
  busySince?: number | null;
  haltAsked?: boolean;
  error: string | null;
  checkpoint?: { at?: string; title?: string; status?: string; note?: string; action?: string; problem?: string; solution?: string } | null;
  checkpoints?: { at?: string; title?: string; status?: string; note?: string; action?: string }[];
  onContinue?: () => void;
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
      ? statusLabel(props.current.status, props.current.isGate, props.busy, props.runStatus, props.busyAction)
      : { text: "Sem etapa", tone: "muted" };
  const [menu, setMenu] = createSignal<{ x: number; y: number; stage: OverviewStageRow } | null>(null);
  const [execOpen, setExecOpen] = createSignal(false);
  const [nowMs, setNowMs] = createSignal(Date.now());
  const openExec = () => {
    setMenu(null);
    setExecOpen(true);
  };
  createEffect(() => {
    if (!props.current) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    onCleanup(() => window.clearInterval(timer));
  });
  const liveLines = () => {
    const all = props.execution || [];
    const mine = all.filter((line) => !props.current || line.stageId === props.current.stageDefId);
    if (mine.length) return mine;
    if (props.busy) return all.slice(-12);
    return mine;
  };
  const shownLines = () => {
    const live = liveLines();
    if (live.length) return live;
    const cur = props.current;
    if (!cur) return [];
    if (props.runStatus === "paused") {
      return [
        {
          id: "stage-paused",
          stageId: cur.stageDefId || "",
          actor: cur.agent,
          at: cur.startedAt,
          message: `${cur.agent} não está gravando. A esteira está pausada.`,
        },
      ];
    }
    if (cur.status !== "running" && !(props.busy && cur.status === "awaiting_gate")) return [];
    const files = (cur.expected || []).filter((path) => !path.endsWith("/"));
    const delivery = files.join(", ") || "a entrega desta etapa";
    return [
      {
        id: "stage-open",
        stageId: cur.stageDefId || "",
        actor: cur.agent,
        at: cur.startedAt,
        message:
          props.haltAsked
            ? "Pausa pedida. A chamada do motor está sendo encerrada."
            : props.busyAction === "complete"
            ? `A esteira está concluindo ${cur.title}. A conferência é ${delivery}.`
            : props.busyAction === "auto" || props.busyAction === "execute"
              ? `${cur.agent} está no motor agora. A entrega é ${delivery}.`
              : props.busyAction === "authorize"
                ? `${cur.agent} grava ${delivery} antes de liberar o gate. Pausar encerra a chamada.`
              : props.busy
                ? `${cur.agent} está ocupado com outra ação da esteira.`
                : `${cur.agent} está com a etapa aberta. O motor ainda não foi chamado. Falta gravar ${delivery}.`,
      },
    ];
  };
  const elapsed = () => {
    const lines = shownLines();
    const first = lines[0]?.at;
    if (!first || Number.isNaN(Date.parse(stamp(first)))) return "";
    const last = lines[lines.length - 1];
    const end = last?.message.includes("concluiu") && last.at ? Date.parse(stamp(last.at)) : nowMs();
    const seconds = Math.max(0, Math.floor((end - Date.parse(stamp(first))) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  };
  const callClock = () => {
    const start = props.busySince;
    if (!start) return "";
    const seconds = Math.max(0, Math.floor((nowMs() - start) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  };
  const workNow = () => {
    const action = props.busyAction;
    const cur = props.current;
    if (props.haltAsked && cur) {
      return {
        title: `Pausando ${cur.title}`,
        detail: "A chamada do motor foi cortada. A esteira para nesta etapa. A pasta permanece.",
      };
    }
    if (!action || !cur) return null;
    const files = (cur.expected || []).filter((path) => !path.endsWith("/")).join(", ") || "a entrega desta etapa";
    const last = shownLines().at(-1)?.message;
    if (action === "complete") {
      return {
        title: `Concluindo ${cur.title}`,
        detail: `A esteira confere ${files}. O arquivo presente fecha a etapa. O arquivo ausente mantém a etapa aberta.`,
      };
    }
    if (action === "auto") {
      return {
        title: last || `Execução automática em ${cur.title}`,
        detail: `${cur.agent} grava ${files}. Cada linha abaixo é um passo desta chamada. Não há limite de tempo. Pausar encerra.`,
      };
    }
    if (action === "execute") {
      return {
        title: last || `Executando ${cur.title}`,
        detail: `${cur.agent} está no motor. A entrega pedida é ${files}.`,
      };
    }
    if (action === "authorize") {
      return {
        title: last || `Gravando a entrega de ${cur.title}`,
        detail: `O gate espera ${files}. O motor escreve esse arquivo agora. A liberação acontece quando o arquivo fica pronto.`,
      };
    }
    if (action === "pause") return { title: "Pausando a esteira", detail: "A etapa aberta permanece. Nenhuma chamada nova começa." };
    if (action === "resume") return { title: "Retomando a esteira", detail: "A etapa aberta volta a aceitar execução." };
    if (action === "fail") return { title: `Marcando falha em ${cur.title}`, detail: "A esteira pausa nesta etapa." };
    if (action === "redo") return { title: `Refazendo ${cur.title}`, detail: "A entrega atual será reescrita." };
    if (action === "restart") return { title: "Reiniciando a esteira", detail: "O projeto volta ao Gate 0. A pasta permanece." };
    return { title: "Gravando a execução automática", detail: "A chave liga ou desliga o avanço até o próximo gate." };
  };

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
                {props.busyAction === "complete" ? "Concluindo…" : "Concluir etapa"}
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

          <Show when={workNow()}>
            {(work) => (
              <div class="fc-work-now" role="status">
                <CallMeter since={props.busySince ?? null} now={nowMs()} />
                <p class="fc-micro">Chamada atual{callClock() ? ` · ${callClock()}` : ""}</p>
                <strong>{work().title}</strong>
                <p>{work().detail}</p>
                <Show when={shownLines().length}>
                  <LiveList lines={shownLines().slice(-8)} />
                </Show>
              </div>
            )}
          </Show>

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
                  <div class="fc-ov-current-side">
                    <span class={`fc-tag ${badge().tone}`}>{badge().text}</span>
                    <button type="button" class="fc-btn-sec" onClick={openExec}>
                      Ver execução
                    </button>
                  </div>
                </div>
                <Show
                  when={
                    props.error &&
                    !(
                      props.checkpoint?.note &&
                      /API 500|Internal Server Error/i.test(props.error)
                    )
                  }
                >
                  <p class="fc-ov-block-note" style={{ color: "var(--danger, #c44)" }}>
                    {props.error}
                  </p>
                </Show>
                <Show when={props.checkpoint?.note}>
                  <div class={`fc-checkpoint is-${props.checkpoint?.status || "saved"}`}>
                    <p class="fc-micro">
                      {props.checkpoint?.status === "error" ? "O que aconteceu" : "Checkpoint"}
                      {checkpointClock(props.checkpoint?.at) ? ` · ${checkpointClock(props.checkpoint?.at)}` : ""}
                    </p>
                    <strong>{props.checkpoint?.title || "Etapa gravada"}</strong>
                    <Show when={props.checkpoint?.status === "error" && (props.checkpoint?.problem || props.checkpoint?.solution)} fallback={<p>{props.checkpoint?.note}</p>}>
                      <p>
                        <span class="fc-checkpoint-label">Problema. </span>
                        {props.checkpoint?.problem || props.checkpoint?.note}
                      </p>
                      <Show when={props.checkpoint?.solution}>
                        <p>
                          <span class="fc-checkpoint-label">Solução. </span>
                          {props.checkpoint?.solution}
                        </p>
                      </Show>
                    </Show>
                    <Show when={props.checkpoint?.status === "error" && props.checkpoint?.action !== "resume"}>
                      <button
                        type="button"
                        class="fc-btn"
                        disabled={props.busy}
                        onClick={() => props.onContinue?.()}
                      >
                        {props.checkpoint?.action === "agent" ? "Corrigir pelo escritório" : "Resolver pelo escritório"}
                      </button>
                    </Show>
                    <Show when={props.checkpoint?.status === "paused" || props.checkpoint?.action === "resume"}>
                      <button
                        type="button"
                        class="fc-btn"
                        disabled={props.busy}
                        onClick={() => props.onResume?.()}
                      >
                        Retomar desta etapa
                      </button>
                    </Show>
                    <Show when={(props.checkpoints || []).filter((item) => item.status === "saved").length > 1}>
                      <ol>
                        <For each={(props.checkpoints || []).filter((item) => item.status === "saved").slice(-4)}>
                          {(item) => <li>{item.title}</li>}
                        </For>
                      </ol>
                    </Show>
                  </div>
                </Show>
                <Show when={cur().isGate && cur().status === "awaiting_gate"}>
                  <GateFlow
                    files={(cur().expected || []).filter((path) => path && !path.endsWith("/"))}
                    delivered={Boolean(cur().delivered) || liveLines().some((line) => /gravad|concluiu a gravação/i.test(line.message))}
                    generating={props.busyAction === "authorize"}
                    clock={callClock()}
                  />
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
                  <li
                    class={`fc-ov-stage is-${s.state}`}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setMenu({ x: event.clientX, y: event.clientY, stage: s });
                    }}
                  >
                    <span class="fc-ov-stage-n">{s.n}</span>
                    <span class="fc-ov-stage-body">
                      <strong>{s.title}</strong>
                      <span>
                        {s.agent}
                        {" · "}
                        {statusLabel(s.status || s.state, !!s.is_gate).text}
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
                      {props.busyAction === "authorize"
                        ? "Gerando entrega…"
                        : props.current?.isGate && props.current.status === "awaiting_gate" && !props.current.delivered
                          ? "Gerar entrega e autorizar"
                          : "Autorizar"}
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
      <Show when={menu()}>
        {(item) => (
          <div class="fc-stage-menu" style={{ left: `${item().x}px`, top: `${item().y}px` }} role="menu">
            <button type="button" role="menuitem" onClick={openExec}>Ver execução</button>
            <Show when={item().stage.is_gate && (item().stage.status === "done" || item().stage.status === "awaiting_gate")}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  if (item().stage.stage_def_id) props.onRedoStage?.(item().stage.stage_def_id);
                }}
              >
                Refazer entrega
              </button>
            </Show>
            <Show when={props.canPause}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  props.onPause?.();
                }}
              >
                Pausar esteira
              </button>
            </Show>
          </div>
        )}
      </Show>
      <Show when={menu()}>
        <button type="button" class="fc-stage-menu-backdrop" aria-label="Fechar menu" onClick={() => setMenu(null)} />
      </Show>
      <Show when={execOpen() && props.current}>
        {(cur) => (
          <Portal>
          <div class="fc-exec" role="dialog" aria-modal="true" aria-label="Execução da etapa">
            <div class="fc-exec-card">
              <header>
                <div>
                  <span class="fc-micro">Etapa {String(cur().index).padStart(2, "0")} · {badge().text}</span>
                  <strong>{cur().code} · {cur().title}</strong>
                  <span>{cur().agent}</span>
                </div>
                <button type="button" class="fc-btn-sec" onClick={() => setExecOpen(false)}>Fechar</button>
              </header>
              <dl>
                <div><dt>Modelo</dt><dd>{props.model || "—"}</dd></div>
                <div><dt>Esforço</dt><dd>{props.effort || "—"}</dd></div>
                <div><dt>Entrega</dt><dd>{(cur().expected || []).filter((path) => !path.endsWith("/")).join(", ") || "Sem arquivo de texto"}</dd></div>
              </dl>
              <p>{nowText(cur().stageDefId || "", cur().agent)}</p>
              <p class="fc-micro">Linha do tempo {elapsed() ? `· ${elapsed()}` : ""}</p>
              <Show
                when={shownLines().length}
                fallback={<p>Nenhum passo ao vivo nesta etapa. O registro aparece quando o agente começa a gravar.</p>}
              >
                <LiveList lines={shownLines()} />
              </Show>
              <footer>
                <Show when={props.canPause}>
                  <button type="button" class="fc-btn-sec" onClick={() => props.onPause?.()}>Pausar</button>
                </Show>
                <button type="button" class="fc-btn-sec" onClick={() => setExecOpen(false)}>Fechar</button>
              </footer>
            </div>
          </div>
          </Portal>
        )}
      </Show>
    </div>
  );
}
