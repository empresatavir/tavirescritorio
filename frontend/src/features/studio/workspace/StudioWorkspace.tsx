import { For, Show, createMemo, createSignal } from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { TvIcon } from "../../../shared/components/TvIcon";
import { showToast } from "../../../state/store";
import {
  DEMO_DECISIONS,
  DEMO_PIECES,
  DEMO_PROFILES,
  NET_META,
  WORKSPACE_NAV,
  formatFollowers,
  type ContentPiece,
  type DecisionCheckpoint,
  type SocialNet,
  type StudioViewId,
} from "../demoData";
import { NewProductionModal } from "../new-production/NewProductionModal";
import { AjusteFinoModal, NovoAnguloModal } from "./DecisionModals";
import { DevicePreview } from "./DeviceMockups";
import { LearningPanel } from "./panels/LearningPanel";
import { OraclePanel } from "./panels/OraclePanel";
import { PipelinePanel } from "./panels/PipelinePanel";
import { VisualStudioPanel } from "./panels/VisualStudioPanel";
import "./workspace.css";

function decisionsForProfile(profileId: string): DecisionCheckpoint[] {
  if (profileId === "pf-carlos") return DEMO_DECISIONS;
  return [];
}

function piecesForProfile(profileId: string, all: ContentPiece[]) {
  return all.filter((p) => p.profileId === profileId);
}

function SQUAD_LABEL(id: string) {
  const map: Record<string, string> = {
    oraculo: "Oráculo de Pautas",
    "ig-studio": "Instagram Studio",
    "yt-roteirista": "YouTube Roteirista",
    carrosseis: "Carrosséis Especializados",
    ads: "Ads Criativos",
  };
  return map[id] || id;
}

export function StudioWorkspace() {
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();

  const [profiles] = createSignal(DEMO_PROFILES);
  const [pieces, setPieces] = createSignal(DEMO_PIECES);
  const [decisions, setDecisions] = createSignal(DEMO_DECISIONS);
  const [prodOpen, setProdOpen] = createSignal(false);
  const [anguloOpen, setAnguloOpen] = createSignal(false);
  const [ajusteOpen, setAjusteOpen] = createSignal(false);
  const [selectedOpt, setSelectedOpt] = createSignal("opt-a");
  const [previewMode, setPreviewMode] = createSignal<"carousel" | "reel">("carousel");
  const [slide, setSlide] = createSignal(0);

  const profileId = () => params.profileId || "";
  const profile = createMemo(() => profiles().find((p) => p.id === profileId()) || null);

  const view = createMemo<StudioViewId>(() => {
    const v = (search.view as StudioViewId) || "dash";
    return WORKSPACE_NAV.some((n) => n.id === v) ? v : "dash";
  });

  const setView = (id: StudioViewId) => setSearch({ view: id });

  const profilePieces = createMemo(() => piecesForProfile(profileId(), pieces()));
  const profileDecisions = createMemo(() => {
    if (profileId() === "pf-carlos") return decisions();
    return decisionsForProfile(profileId());
  });
  const pendingCount = createMemo(() => profileDecisions().length);

  const reviewPiece = createMemo(() => {
    const rev = profileDecisions().find((d) => d.kind === "revisao");
    if (rev?.pieceId) return profilePieces().find((p) => p.id === rev.pieceId) || null;
    return profilePieces().find((p) => p.stage === "review") || null;
  });

  const selectedOptionTitle = createMemo(() => {
    const pauta = profileDecisions().find((d) => d.kind === "pauta");
    return pauta?.options?.find((o) => o.id === selectedOpt())?.title;
  });

  const kpis = createMemo(() => {
    const list = profilePieces();
    const active = list.filter((p) => !["done", "error"].includes(p.stage)).length;
    const checkpoints = pendingCount() || list.filter((p) => p.needs).length;
    return { active, checkpoints, avg: "18m", delta: "−12%" };
  });

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado`, "Studio Visual", "success");
    } catch {
      showToast("Não foi possível copiar", "Studio Visual", "error");
    }
  };

  return (
    <Show
      when={profile()}
      fallback={
        <div class="stu-empty is-fullpage">
          <h2>Perfil não encontrado</h2>
          <button type="button" class="stu-btn-lg" onClick={() => navigate("/studio")}>
            Voltar ao Painel do Studio
          </button>
        </div>
      }
    >
      {(pf) => (
        <div class="stu-ws" data-screen-label="Tavir Studio Workspace">
          <aside class="stu-ws-aside">
            <div class="stu-ws-brand">
              <div class="stu-ws-brand-mark">T</div>
              <div>
                <strong>TAVIR</strong>
                <span>Studio</span>
              </div>
            </div>
            <button type="button" class="stu-ws-back" onClick={() => navigate("/studio")}>
              <TvIcon name="arrow-left" width="14" height="14" />
              Painel
            </button>
            <p class="stu-ws-nav-label">Workspace</p>
            <nav class="stu-ws-nav" aria-label="Navegação do workspace">
              <For each={WORKSPACE_NAV}>
                {(item) => (
                  <button
                    type="button"
                    class="stu-ws-nav-item"
                    classList={{ "is-active": view() === item.id }}
                    onClick={() => setView(item.id)}
                  >
                    <TvIcon name={item.icon} width="15" height="15" />
                    <span>{item.label}</span>
                    <Show when={item.id === "decisions" && pendingCount() > 0}>
                      <span class="stu-ws-nav-badge">{pendingCount()}</span>
                    </Show>
                  </button>
                )}
              </For>
            </nav>
            <div class="stu-ws-agents">
              <strong>Agentes operacionais</strong>
              <p>
                <span class="stu-ws-dot" aria-hidden="true" />
                3 squads processando agora
              </p>
            </div>
          </aside>

          <div class="stu-ws-main">
            <header class="stu-ws-top">
              <div class="stu-ws-profile-chip">
                <div class="stu-ws-avatar" style={{ background: pf().color }}>
                  {pf().initials}
                </div>
                <div class="stu-ws-profile-meta">
                  <strong>
                    {pf().handle} · {pf().niche}
                  </strong>
                  <span>{pf().company}</span>
                </div>
              </div>
              <div class="stu-ws-cycle">
                <div class="stu-ws-cycle-label">
                  <span>Meta do ciclo</span>
                  <span>
                    {pf().cycleDone}/{pf().cycleGoal}
                  </span>
                </div>
                <div class="stu-ws-cycle-bar">
                  <div
                    class="stu-ws-cycle-fill"
                    style={{
                      width: `${Math.round((pf().cycleDone / Math.max(pf().cycleGoal, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <button type="button" class="stu-ws-cta" onClick={() => setProdOpen(true)}>
                <TvIcon name="plus" width="14" height="14" />
                Nova produção
              </button>
            </header>

            <div class="stu-ws-content">
              {/* —— DASH —— */}
              <Show when={view() === "dash"}>
                <div class="stu-ws-page-head">
                  <div>
                    <p class="stu-ws-eyebrow">Perfil</p>
                    <h1>Dash · {pf().name}</h1>
                    <p>
                      Visão geral deste perfil: redes, ciclo editorial, design system e o que precisa
                      da sua atenção.
                    </p>
                  </div>
                </div>
                <div class="stu-dash-grid">
                  <article class="stu-dash-tile">
                    <span>Peças ativas</span>
                    <strong>{kpis().active}</strong>
                    <em>na esteira</em>
                  </article>
                  <article class="stu-dash-tile">
                    <span>Checkpoints</span>
                    <strong>{kpis().checkpoints}</strong>
                    <em>aguardando você</em>
                  </article>
                  <article class="stu-dash-tile">
                    <span>Ciclo</span>
                    <strong>
                      {pf().cycleDone}/{pf().cycleGoal}
                    </strong>
                    <em>meta do período</em>
                  </article>
                  <article class="stu-dash-tile">
                    <span>Tom de voz</span>
                    <strong class="stu-tone-tile">{pf().designSystem.toneOfVoice}</strong>
                    <em>{pf().niche}</em>
                  </article>
                </div>
                <div class="stu-card">
                  <div class="stu-card-head">
                    <h2 class="stu-card-title">Redes do perfil</h2>
                  </div>
                  <div class="stu-net-stats">
                    <For each={pf().nets}>
                      {(n) => (
                        <article class="stu-net-stat">
                          <header>
                            <img src={NET_META[n.net].logo} alt="" />
                            <strong>{NET_META[n.net].label}</strong>
                          </header>
                          <dl>
                            <dt>Handle</dt>
                            <dd>{n.handle}</dd>
                            <dt>Seguidores</dt>
                            <dd>{formatFollowers(n.followers)}</dd>
                            <dt>Engajamento</dt>
                            <dd>{n.engagement ? `${n.engagement}%` : "—"}</dd>
                          </dl>
                        </article>
                      )}
                    </For>
                  </div>
                </div>
                <div class="stu-card">
                  <div class="stu-card-head">
                    <h2 class="stu-card-title">Design system</h2>
                  </div>
                  <div class="stu-ds-card">
                    <div class="stu-swatches">
                      <div class="stu-swatch" style={{ background: pf().designSystem.primary }} />
                      <div class="stu-swatch" style={{ background: pf().designSystem.secondary }} />
                      <div class="stu-swatch" style={{ background: pf().designSystem.accent }} />
                    </div>
                    <div class="stu-ds-copy">
                      <p>
                        <strong>Tipografia:</strong> {pf().designSystem.fontDisplay} ·{" "}
                        {pf().designSystem.fontBody}
                      </p>
                      <p>
                        <strong>Fazer:</strong> {pf().designSystem.doList}
                      </p>
                      <p>
                        <strong>Evitar:</strong> {pf().designSystem.dontList}
                      </p>
                      <p>
                        <strong>Visual:</strong> {pf().designSystem.visualNotes}
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              {/* —— DECISIONS —— */}
              <Show when={view() === "decisions"}>
                <div class="stu-ws-page-head">
                  <div>
                    <p class="stu-ws-eyebrow">Prioridade agora</p>
                    <h1>Centro de Decisões</h1>
                    <p>
                      {pendingCount() > 0
                        ? "Checkpoints esperam seu olhar. Você decide; os squads continuam a execução."
                        : "Nada pendente neste perfil. Os squads seguem na esteira."}
                    </p>
                  </div>
                  <div class="stu-ws-mini-kpis">
                    <div class="stu-ws-mini-kpi">
                      <span>Runs ativas</span>
                      <strong>{String(kpis().active).padStart(2, "0")}</strong>
                      <em>em andamento</em>
                    </div>
                    <div class="stu-ws-mini-kpi">
                      <span>Checkpoints</span>
                      <strong>{String(kpis().checkpoints).padStart(2, "0")}</strong>
                      <em>pendentes</em>
                    </div>
                    <div class="stu-ws-mini-kpi">
                      <span>Tempo médio</span>
                      <strong>{kpis().avg}</strong>
                      <em>{kpis().delta}</em>
                    </div>
                  </div>
                </div>

                <Show
                  when={profileDecisions().length > 0}
                  fallback={
                    <div class="stu-empty">
                      <div class="stu-empty-ico">
                        <TvIcon name="circle-check" width="24" height="24" />
                      </div>
                      <h2>Nenhuma decisão no momento</h2>
                      <p>
                        Quando o Oráculo ou a esteira precisarem de você, as opções e a revisão final
                        aparecem aqui.
                      </p>
                      <button type="button" class="stu-btn-lg" onClick={() => setProdOpen(true)}>
                        Nova produção
                      </button>
                    </div>
                  }
                >
                  <For each={profileDecisions().filter((d) => d.kind === "pauta")}>
                    {(dec) => (
                      <article class="stu-card">
                        <div class="stu-card-head">
                          <div>
                            <span class="stu-tag">Sua decisão</span>
                            <span class="stu-run-meta">
                              RUN #{dec.runId} · {dec.ago}
                            </span>
                            <h2 class="stu-card-title is-lg">{dec.title}</h2>
                            <p class="stu-muted-line">
                              {dec.subtitle}
                            </p>
                          </div>
                          <Show when={dec.timer}>
                            <div class="stu-timer">
                              <strong>{dec.timer}</strong>
                              <span>{dec.waitingLabel}</span>
                            </div>
                          </Show>
                        </div>
                        <div class="stu-options">
                          <For each={dec.options || []}>
                            {(opt) => (
                              <button
                                type="button"
                                class="stu-option"
                                classList={{ "is-on": selectedOpt() === opt.id }}
                                onClick={() => setSelectedOpt(opt.id)}
                              >
                                <div class="stu-option-top">
                                  <span>
                                    {opt.label} · {opt.style}
                                  </span>
                                  <span class="stu-fit">{opt.fit}% fit</span>
                                </div>
                                <h3>{opt.title}</h3>
                                <div class="stu-option-block">
                                  <span>Ângulo</span>
                                  <p>{opt.angle}</p>
                                </div>
                                <div class="stu-option-block">
                                  <span>Gancho de abertura</span>
                                  <p class="is-hook">{opt.hook}</p>
                                </div>
                                <div class="stu-option-block">
                                  <span>Fontes / Data</span>
                                  <p>{opt.sources}</p>
                                </div>
                                <div class="stu-option-block">
                                  <span>Por que agora</span>
                                  <p>{opt.whyNow}</p>
                                </div>
                                <div class="stu-option-select">
                                  {selectedOpt() === opt.id ? "✓ Selecionada" : "Selecionar opção"}
                                </div>
                              </button>
                            )}
                          </For>
                        </div>
                        <div class="stu-card-actions">
                          <div class="stu-card-actions-left">
                            <button type="button" class="stu-btn-sm" onClick={() => setAnguloOpen(true)}>
                              Pedir novo ângulo
                            </button>
                            <button type="button" class="stu-btn-sm" onClick={() => setAjusteOpen(true)}>
                              Ajuste fino
                            </button>
                          </div>
                          <button
                            type="button"
                            class="stu-btn-lg"
                            onClick={() => {
                              showToast("Opção aprovada · squads seguem", "Centro de Decisões", "success");
                              setDecisions((prev) => prev.filter((d) => d.id !== dec.id));
                            }}
                          >
                            Aprovar opção
                          </button>
                        </div>
                      </article>
                    )}
                  </For>

                  <For each={profileDecisions().filter((d) => d.kind === "revisao")}>
                    {(dec) => {
                      const piece = () => reviewPiece();
                      const net = (): SocialNet => piece()?.net || "ig";
                      return (
                        <article class="stu-card">
                          <div class="stu-card-head">
                            <div>
                              <span class="stu-tag">Revisão final</span>
                              <span class="stu-run-meta">
                                RUN #{dec.runId} · {dec.platformLabel || dec.ago}
                              </span>
                              <h2 class="stu-card-title is-lg">{dec.title}</h2>
                            </div>
                          </div>
                          <div class="stu-review">
                            <div>
                              <Show when={net() === "ig"}>
                                <div class="stu-preview-tabs">
                                  <button
                                    type="button"
                                    classList={{ "is-on": previewMode() === "carousel" }}
                                    onClick={() => setPreviewMode("carousel")}
                                  >
                                    Carrossel
                                  </button>
                                  <button
                                    type="button"
                                    classList={{ "is-on": previewMode() === "reel" }}
                                    onClick={() => setPreviewMode("reel")}
                                  >
                                    Reel
                                  </button>
                                </div>
                              </Show>
                              <DevicePreview
                                device="smartphone"
                                net={net()}
                                profile={pf()}
                                piece={piece()}
                                slide={slide()}
                                onSlide={setSlide}
                                mode={net() === "ig" ? previewMode() : "post"}
                              />
                            </div>
                            <div class="stu-pub-copy">
                              <h3>Conteúdo da publicação</h3>
                              <div class="stu-copy-block">
                                <header>
                                  <span>Legenda</span>
                                  <button type="button" onClick={() => copyText("Legenda", piece()?.caption || "")}>
                                    Copiar
                                  </button>
                                </header>
                                <p>{piece()?.caption || "—"}</p>
                              </div>
                              <div class="stu-copy-block">
                                <header>
                                  <span>CTA</span>
                                  <button type="button" onClick={() => copyText("CTA", piece()?.cta || "")}>
                                    Copiar
                                  </button>
                                </header>
                                <p>{piece()?.cta || "—"}</p>
                              </div>
                              <div class="stu-copy-block">
                                <header>
                                  <span>Hashtags</span>
                                  <button type="button" onClick={() => copyText("Hashtags", piece()?.tags || "")}>
                                    Copiar
                                  </button>
                                </header>
                                <p>{piece()?.tags || "—"}</p>
                              </div>
                              <ul class="stu-checklist">
                                <li>Contraste e safe zones validados</li>
                                <li>Ortografia revisada</li>
                                <li>CTA alinhado à meta do ciclo</li>
                                <li>Prévia conferida em celular</li>
                              </ul>
                              <div class="stu-card-actions is-flush">
                                <button type="button" class="stu-btn-sm">
                                  Devolver ao Oráculo
                                </button>
                                <div class="stu-card-actions-left">
                                  <button type="button" class="stu-btn-sm">
                                    Solicitar ajuste
                                  </button>
                                  <button
                                    type="button"
                                    class="stu-btn-lg"
                                    onClick={() => {
                                      const id = piece()?.id;
                                      if (id) {
                                        setPieces((prev) =>
                                          prev.map((p) =>
                                            p.id === id ? { ...p, stage: "done", needs: false } : p,
                                          ),
                                        );
                                      }
                                      setDecisions((prev) => prev.filter((d) => d.id !== dec.id));
                                      showToast("Publicação aprovada", "Revisão final", "success");
                                    }}
                                  >
                                    Aprovar publicação
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    }}
                  </For>
                </Show>
              </Show>

              <Show when={view() === "pipeline"}>
                <PipelinePanel
                  pieces={profilePieces()}
                  onRetryError={() => {
                    setPieces((prev) =>
                      prev.map((p) =>
                        p.stage === "error" && p.profileId === profileId()
                          ? { ...p, stage: "prod", subtitle: "Reprocessando…" }
                          : p,
                      ),
                    );
                    showToast("Render reiniciado", "Esteira", "info");
                  }}
                />
              </Show>

              <Show when={view() === "oracle"}>
                <OraclePanel
                  profile={pf()}
                  onNovaRodada={() => {
                    showToast("Nova rodada do Oráculo iniciada", "Mesa do Oráculo", "success");
                    setView("decisions");
                  }}
                />
              </Show>

              <Show when={view() === "visual"}>
                <VisualStudioPanel profile={pf()} pieces={profilePieces()} onCopy={copyText} />
              </Show>

              <Show when={view() === "learning"}>
                <LearningPanel
                  profile={pf()}
                  publishedCount={profilePieces().filter((p) => p.stage === "done").length}
                  onRegister={() =>
                    showToast("Métricas registradas no ciclo", "Aprendizados", "success")
                  }
                />
              </Show>
            </div>
          </div>

          <NewProductionModal
            open={prodOpen()}
            profiles={profiles()}
            lockedProfileId={pf().id}
            onClose={() => setProdOpen(false)}
            onCreated={(draft) => {
              const num = `ST-${String(pieces().length + 60).padStart(3, "0")}`;
              const title =
                draft.theme ||
                (draft.startPointId === "autonoma"
                  ? "Nova pauta · pesquisa autônoma"
                  : "Nova pauta · tema manual");
              setPieces((prev) => [
                {
                  id: `pc-${Date.now()}`,
                  num,
                  profileId: draft.profileId,
                  net: draft.platform,
                  stage: "idea",
                  title,
                  subtitle: SQUAD_LABEL(draft.squadId),
                  squad: SQUAD_LABEL(draft.squadId),
                },
                ...prev,
              ]);
              setProdOpen(false);
              setView("pipeline");
              showToast(`${num} criada na esteira`, "Nova produção", "success");
            }}
          />

          <NovoAnguloModal
            open={anguloOpen()}
            onClose={() => setAnguloOpen(false)}
            onSubmit={(payload) => {
              setAnguloOpen(false);
              setSelectedOpt("opt-a");
              showToast(
                `Oráculo regenerando · ${payload.style}${payload.seed ? ` · ${payload.seed}` : ""}`,
                "Novo ângulo",
                "info",
              );
            }}
          />

          <AjusteFinoModal
            open={ajusteOpen()}
            selectedTitle={selectedOptionTitle()}
            onClose={() => setAjusteOpen(false)}
            onSubmit={(payload) => {
              setAjusteOpen(false);
              showToast(
                `Ajuste ${payload.intensity} em ${payload.fields.join(", ")}`,
                "Ajuste fino",
                "success",
              );
            }}
          />
        </div>
      )}
    </Show>
  );
}
