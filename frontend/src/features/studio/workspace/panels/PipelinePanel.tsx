import { For, Show, createMemo, createSignal } from "solid-js";
import { TvIcon } from "../../../../shared/components/TvIcon";
import { NET_META, type ContentPiece } from "../../demoData";

const STAGES: Array<{ id: ContentPiece["stage"]; label: string; tone: string }> = [
  { id: "idea", label: "Ideia", tone: "muted" },
  { id: "pauta", label: "Pauta · Oráculo", tone: "teal" },
  { id: "prod", label: "Produção", tone: "lime" },
  { id: "review", label: "Revisão humana", tone: "warn" },
  { id: "pub", label: "Aguardando publicação", tone: "teal" },
  { id: "done", label: "Concluído", tone: "lime" },
];

const DEMO_ARTIFACTS = [
  { name: "carrossel-final.zip", kind: "Artefato final" },
  { name: "legenda-aprovada.txt", kind: "Artefato final" },
];

export function PipelinePanel(props: {
  pieces: ContentPiece[];
  onRetryError?: () => void;
}) {
  const [compact, setCompact] = createSignal(false);

  const byStage = createMemo(() => {
    const map: Record<string, ContentPiece[]> = {};
    for (const s of STAGES) map[s.id] = [];
    for (const p of props.pieces) {
      if (p.stage === "error") continue;
      if (!map[p.stage]) map[p.stage] = [];
      map[p.stage].push(p);
    }
    return map;
  });

  const errors = createMemo(() => props.pieces.filter((p) => p.stage === "error"));
  const stageCount = (id: string) => byStage()[id]?.length || 0;

  return (
    <div class="stu-pipe-wrap">
      <div class="stu-ws-page-head">
        <div>
          <p class="stu-ws-eyebrow">Operação ao vivo</p>
          <h1>Esteira de produção</h1>
          <p>
            Acompanhe cada peça do insight à publicação, sem misturar entregáveis com detalhes
            técnicos.
          </p>
        </div>
        <button
          type="button"
          class="stu-btn-sm"
          onClick={() => setCompact((v) => !v)}
        >
          {compact() ? "Visão expandida" : "Visão compacta"}
        </button>
      </div>

      <div class="stu-pipe" classList={{ "is-compact": compact() }}>
        <For each={STAGES}>
          {(col) => (
            <div class="stu-pipe-col" data-tone={col.tone}>
              <header class="stu-pipe-col-head">
                <h2>{col.label}</h2>
                <span>{stageCount(col.id)}</span>
              </header>
              <For each={byStage()[col.id] || []}>
                {(card) => (
                  <article
                    class="stu-pipe-card"
                    classList={{
                      "is-needs": !!card.needs,
                      "is-compact": compact(),
                    }}
                  >
                    <div class="stu-pipe-card-top">
                      <span class="stu-pipe-net">
                        <img src={NET_META[card.net].logo} alt="" width="12" height="12" />
                        {NET_META[card.net].short}
                      </span>
                      <Show when={card.needs}>
                        <span class="stu-pipe-wait">aguardando</span>
                      </Show>
                    </div>
                    <h3>{card.title}</h3>
                    <Show when={!compact()}>
                      <p>{card.subtitle || card.squad || NET_META[card.net].label}</p>
                      <Show when={typeof card.progress === "number"}>
                        <div class="stu-pipe-progress">
                          <div class="stu-pipe-progress-track">
                            <div
                              class="stu-pipe-progress-bar"
                              style={{ width: `${card.progress}%` }}
                            />
                          </div>
                          <span>{card.progress}%</span>
                        </div>
                      </Show>
                    </Show>
                  </article>
                )}
              </For>
              <Show when={(byStage()[col.id] || []).length === 0}>
                <div class="stu-pipe-empty">Sem peças</div>
              </Show>
            </div>
          )}
        </For>
      </div>

      <div class="stu-pipe-bottom">
        <Show
          when={errors().length > 0}
          fallback={
            <div class="stu-pipe-fail is-ok">
              <div class="stu-pipe-fail-ico is-ok">
                <TvIcon name="shield-check" width="18" height="18" />
              </div>
              <div>
                <p class="stu-pipe-fail-kicker">Saúde da esteira</p>
                <h3>Nenhuma falha recuperável</h3>
                <p>Renders e exports estão estáveis neste perfil.</p>
              </div>
            </div>
          }
        >
          <For each={errors()}>
            {(err) => (
              <div class="stu-pipe-fail">
                <div class="stu-pipe-fail-ico">
                  <TvIcon name="octagon-alert" width="18" height="18" />
                </div>
                <div class="stu-pipe-fail-body">
                  <p class="stu-pipe-fail-kicker">Falha recuperável</p>
                  <h3>{err.title}</h3>
                  <p>
                    {err.subtitle || "O render excedeu o tempo."} O roteiro e as cenas estão
                    preservados.
                  </p>
                  <div class="stu-pipe-fail-meta">
                    <span>14m 32s</span>
                    <span>28.4k tokens</span>
                    <span>7 artefatos</span>
                  </div>
                  <div class="stu-card-actions-left" style={{ "margin-top": "12px" }}>
                    <button type="button" class="stu-btn-lg" onClick={() => props.onRetryError?.()}>
                      Tentar novamente
                    </button>
                    <button type="button" class="stu-btn-sm">
                      Ver logs
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </Show>

        <div class="stu-pipe-files">
          <header>
            <h3>Arquivos da run</h3>
            <button type="button" class="stu-btn-sm" style={{ height: "28px" }}>
              Ver logs
            </button>
          </header>
          <ul>
            <For each={DEMO_ARTIFACTS}>
              {(f) => (
                <li>
                  <span class="stu-pipe-file-ico" aria-hidden="true">
                    <TvIcon name="layers" width="14" height="14" />
                  </span>
                  <div>
                    <strong>{f.name}</strong>
                    <span>{f.kind}</span>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>
    </div>
  );
}
