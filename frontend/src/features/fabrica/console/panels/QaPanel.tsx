import { For, Show, createEffect, createSignal } from "solid-js";
import { api } from "../../../../shared/api/client";
import { EmptyState } from "./EmptyState";

export function QaPanel(props: { projectId: string; onToast?: (m: string) => void }) {
  const [report, setReport] = createSignal<Awaited<ReturnType<typeof api.getFactoryQa>> | null>(
    null,
  );
  const [error, setError] = createSignal<string | null>(null);

  const load = async () => {
    try {
      setReport(await api.getFactoryQa(props.projectId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar QA");
      setReport(null);
    }
  };

  createEffect(() => {
    void props.projectId;
    void load();
  });

  return (
    <div class="fc-qa3">
      <Show when={error()}>
        <EmptyState title="QA indisponível" text={error() || undefined} />
      </Show>
      <Show when={report()}>
        {(r) => (
          <>
            <div class="fc-card" style={{ "margin-bottom": "12px" }}>
              <p class="fc-micro">Completion Guard · {r().template_code}</p>
              <h2 style={{ margin: "4px 0" }}>
                {r().passed}/{r().total} · {r().pct}%
              </h2>
              <p class="fc-sub">
                {r().ready_for_handoff
                  ? "Pronto para handoff (todas as regras ok)."
                  : "Ainda há regras pendentes ou falhas."}
              </p>
              <button type="button" class="fc-btn-sec" style={{ "margin-top": "8px" }} onClick={() => void load()}>
                Reavaliar
              </button>
            </div>
            <ul class="fc-ov-stages">
              <For each={r().rules}>
                {(rule) => (
                  <li
                    class={`fc-ov-stage is-${
                      rule.status === "pass" ? "done" : rule.status === "fail" ? "blocked" : "queued"
                    }`}
                  >
                    <span class="fc-ov-stage-n">{rule.status}</span>
                    <span class="fc-ov-stage-body">
                      <strong>{rule.title}</strong>
                      <span>{rule.kind}</span>
                    </span>
                    <span class="fc-ov-stage-mark" aria-hidden="true" />
                  </li>
                )}
              </For>
            </ul>
          </>
        )}
      </Show>
    </div>
  );
}
