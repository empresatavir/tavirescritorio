import { For, Show, createMemo, createSignal } from "solid-js";
import { api, type GuardDossier, type GuardEvidence } from "../../../../shared/api/client";

const badge = (status: string) => (status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "AGUARDA");

export function GuardBoard(props: {
  projectId: string;
  dossier: GuardDossier | null;
  loading?: boolean;
  running?: boolean;
  unit: string;
  runLabel: string;
  flowTitle: string;
  flowHint: string;
  rulesTitle: string;
  returnsTitle: string;
  returnsHint: string;
  evidenceHint: string;
  onRun: () => void;
}) {
  const [filter, setFilter] = createSignal("todos");
  const [selected, setSelected] = createSignal<GuardEvidence | null>(null);
  const [preview, setPreview] = createSignal("");

  const evidence = createMemo(() => {
    const items = props.dossier?.evidence || [];
    const mode = filter();
    if (mode === "html") return items.filter((item) => item.kind === "html");
    if (mode === "print") return items.filter((item) => item.kind === "screenshot");
    if (mode === "pass" || mode === "fail") return items.filter((item) => item.status === mode);
    return items;
  });

  const openEvidence = async (item: GuardEvidence) => {
    setSelected(item);
    setPreview("");
    if (item.kind === "html" || item.kind === "screenshot") return;
    try {
      const file = await api.readFactoryArtifact(props.projectId, item.path);
      const text = file.content || "";
      setPreview(text ? text.slice(0, 8000) : "Este arquivo não tem texto para abrir aqui.");
    } catch (err) {
      setPreview(err instanceof Error ? err.message : "Não foi possível abrir o relatório.");
    }
  };

  const ring = () => {
    const passed = props.dossier?.passed || 0;
    const total = Math.max(props.dossier?.total || 1, 1);
    const radius = 46;
    const circ = 2 * Math.PI * radius;
    return { circ, offset: circ * (1 - passed / total) };
  };

  return (
    <div class="fc-qa3">
      <div class="fc-qa3-top">
        <section class="fc-qa3-control">
          <div class="fc-qa3-ring" aria-label={`${props.dossier?.passed || 0} de ${props.dossier?.total || 0}`}>
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle class="fc-qa3-ring-track" cx="60" cy="60" r="46" />
              <circle
                class="fc-qa3-ring-value"
                classList={{ "is-running": !!props.running }}
                cx="60"
                cy="60"
                r="46"
                stroke-dasharray={`${ring().circ}`}
                stroke-dashoffset={`${ring().offset}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="fc-qa3-ring-label">
              <strong>
                {props.dossier?.passed || 0}/{props.dossier?.total || 0}
              </strong>
              <span>{props.unit}</span>
            </div>
          </div>
          <span class="fc-qa3-state" classList={{ "is-ready": !!props.dossier?.ready_for_handoff, "is-running": !!props.running }}>
            {props.running ? "Em execução" : props.dossier?.ready_for_handoff ? "Pronto para entrega" : "Ainda há pendência"}
          </span>
          <p class="fc-qa3-rounds">{props.dossier?.rounds || 0} registro(s) gravado(s)</p>
          <button type="button" class="fc-qa3-run" disabled={props.running} onClick={() => props.onRun()}>
            <span classList={{ "fc-qa3-run-spin": !!props.running }} aria-hidden="true">↻</span>
            {props.running ? "Executando…" : props.runLabel}
          </button>
        </section>

        <section class="fc-qa3-card">
          <div class="fc-qa3-card-head">
            <h3>{props.flowTitle}</h3>
            <p>{props.flowHint}</p>
          </div>
          <ol class="fc-qa3-flow">
            <For each={props.dossier?.flow || []}>
              {(step) => (
                <li classList={{ "is-pass": step.status === "pass", "is-fail": step.status === "fail", "is-gate": !!step.gate }}>
                  <span class="fc-qa3-flow-n">{step.gate ? "◆" : `${step.n}.`}</span>
                  <div>
                    <div class="fc-qa3-flow-title">
                      <strong>{step.title}</strong>
                      <Show when={!step.gate}>
                        <span class={`fc-qa3-badge is-${step.status === "pass" ? "pass" : step.status === "fail" ? "fail" : "wait"}`}>
                          {badge(step.status)}
                        </span>
                      </Show>
                    </div>
                    <Show when={step.command}>
                      <code>{step.command}</code>
                    </Show>
                    <span class="fc-qa3-flow-result">{step.result}</span>
                  </div>
                  <div class="fc-qa3-agent">
                    <i>{step.initials}</i>
                    <em>{step.agent}</em>
                  </div>
                </li>
              )}
            </For>
          </ol>
        </section>
      </div>

      <div class="fc-qa3-mid">
        <section class="fc-qa3-card">
          <div class="fc-qa3-card-head">
            <h3>{props.rulesTitle}</h3>
          </div>
          <div class="fc-qa3-bar" aria-hidden="true">
            <div class="fc-qa3-bar-fill" style={{ width: `${props.dossier?.pct || 0}%` }} />
          </div>
          <p class="fc-qa3-bar-meta">{props.dossier?.pct || 0}%</p>
          <ol class="fc-qa3-rules">
            <For each={props.dossier?.rules || []}>
              {(rule, index) => (
                <li class={rule.status === "pass" ? "ok" : "miss"}>
                  <span class="fc-qa3-rule-ico">{rule.status === "pass" ? "✓" : "○"}</span>
                  <span>{String(index() + 1).padStart(2, "0")}</span>
                  <span>{rule.title}</span>
                </li>
              )}
            </For>
          </ol>
        </section>

        <section class="fc-qa3-card">
          <div class="fc-qa3-card-head">
            <h3>{props.returnsTitle}</h3>
            <p>{props.returnsHint}</p>
          </div>
          <ul class="fc-qa3-returns">
            <For each={props.dossier?.returns || []}>
              {(item) => (
                <li classList={{ "is-pass": item.status === "pass", "is-fail": item.status === "fail" }}>
                  <div class="fc-qa3-returns-top">
                    <strong>{item.title}</strong>
                    <span class={`fc-qa3-badge is-${item.status === "pass" ? "pass" : item.status === "fail" ? "fail" : "wait"}`}>
                      {badge(item.status)}
                    </span>
                  </div>
                  <span>{item.detail}</span>
                  <span class="muted">Validado por {item.actor}</span>
                </li>
              )}
            </For>
          </ul>
        </section>
      </div>

      <section class="fc-qa3-card fc-ev-section">
        <div class="fc-ac-head">
          <div>
            <h3>Relatórios e evidências</h3>
            <p>{props.evidenceHint}</p>
          </div>
          <div class="fc-sec-filters">
            <For each={[["todos", "Todos"], ["html", "HTML"], ["print", "Prints"], ["pass", "Sucesso"], ["fail", "Falha"]] as const}>
              {([id, label]) => (
                <button type="button" class="fc-btn-sec" classList={{ "is-on": filter() === id }} onClick={() => setFilter(id)}>
                  {label}
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="fc-ev-layout">
          <div class="fc-ev-grid">
            <Show
              when={evidence().length}
              fallback={<p class="fc-ev-note">Nenhum arquivo deste filtro está na pasta do projeto.</p>}
            >
              <For each={evidence()}>
                {(item) => (
                  <button
                    type="button"
                    class={`fc-ev-card kind-${item.kind}`}
                    classList={{
                      "is-selected": selected()?.path === item.path,
                      "is-failed": item.status === "fail",
                      "is-pending": item.status === "wait",
                    }}
                    onClick={() => void openEvidence(item)}
                  >
                    <span class="fc-ev-kind">{item.kind === "screenshot" ? "print" : item.kind === "log" ? "evidência" : item.kind}</span>
                    <strong>{item.name}</strong>
                    <span class="fc-ev-note">{item.note || item.path}</span>
                    <footer>
                      <span class="fc-ev-meta">{badge(item.status)}</span>
                      <span class="fc-ev-meta">{item.path}</span>
                    </footer>
                  </button>
                )}
              </For>
            </Show>
          </div>
          <aside class="fc-ev-preview">
            <Show
              when={selected()}
              fallback={
                <div class="fc-ev-empty">
                  <strong>Abra um relatório</strong>
                  <span>HTML, print, log de sucesso ou registro de falha.</span>
                </div>
              }
            >
              {(item) => (
                <>
                  <span class="fc-ev-kind">{item().kind}</span>
                  <h4>{item().name}</h4>
                  <p class="fc-ev-note">{item().path}</p>
                  <div class="fc-ev-preview-body">
                    <Show when={item().kind === "screenshot"}>
                      <img src={api.factoryEvidenceUrl(props.projectId, item().path)} alt={item().name} />
                    </Show>
                    <Show when={item().kind === "html"}>
                      <iframe title={item().name} sandbox="" src={api.factoryEvidenceUrl(props.projectId, item().path)} />
                    </Show>
                    <Show when={item().kind !== "screenshot" && item().kind !== "html"}>
                      <pre>{preview() || "Abrindo…"}</pre>
                    </Show>
                  </div>
                </>
              )}
            </Show>
          </aside>
        </div>
      </section>
      <Show when={props.loading}>
        <p class="fc-micro">Carregando a vistoria…</p>
      </Show>
    </div>
  );
}
