import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { TvIcon } from "../../../shared/components/TvIcon";
import { api } from "../../../shared/api/client";
import { showToast } from "../../../state/store";
import {
  NET_META,
  WORKSPACE_NAV,
  formatFollowers,
  type ContentPiece,
  type ContentProfile,
  type DecisionCheckpoint,
  type SocialNet,
  type StudioViewId,
} from "../demoData";
import { mapStudioDecision, mapStudioPiece, mapStudioProfile } from "../apiMappers";
import { NewProductionModal } from "../new-production/NewProductionModal";
import { AjusteFinoModal, NovoAnguloModal } from "./DecisionModals";
import { DevicePreview } from "./DeviceMockups";
import { LearningPanel } from "./panels/LearningPanel";
import { OraclePanel } from "./panels/OraclePanel";
import { PipelinePanel } from "./panels/PipelinePanel";
import { VisualStudioPanel } from "./panels/VisualStudioPanel";
import "./workspace.css";

function piecesForProfile(profileId: string, all: ContentPiece[]) {
  return all.filter((p) => p.profileId === profileId);
}

function defaultSquadForNet(net: SocialNet | string | undefined): string {
  if (net === "yt") return "yt-roteirista";
  if (net === "li") return "carrosseis";
  return "ig-studio";
}

export function StudioWorkspace() {
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();

  const [profile, setProfile] = createSignal<ContentProfile | null>(null);
  const [pieces, setPieces] = createSignal<ContentPiece[]>([]);
  const [decisions, setDecisions] = createSignal<DecisionCheckpoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [prodOpen, setProdOpen] = createSignal(false);
  const [anguloOpen, setAnguloOpen] = createSignal(false);
  const [ajusteOpen, setAjusteOpen] = createSignal(false);
  const [selectedOpt, setSelectedOpt] = createSignal("opt-a");
  const [previewMode, setPreviewMode] = createSignal<"carousel" | "reel">("carousel");
  const [slide, setSlide] = createSignal(0);

  const profileId = () => params.profileId || "";

  const reload = async () => {
    const id = profileId();
    if (!id) return;
    const [pf, pc, dec] = await Promise.all([
      api.getStudioProfile(id),
      api.listStudioPieces({ profile_id: id }),
      api.listStudioDecisions({ profile_id: id, status: "pending" }),
    ]);
    setProfile(mapStudioProfile(pf));
    setPieces(pc.map(mapStudioPiece));
    const mapped = dec.map(mapStudioDecision);
    setDecisions(mapped);
    const pauta = mapped.find((d) => d.kind === "pauta");
    if (pauta?.selectedOptionId) setSelectedOpt(pauta.selectedOptionId);
    else if (pauta?.options?.[0]) setSelectedOpt(pauta.options[0].id);
  };

  onMount(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        console.warn(err);
        showToast("Não foi possível abrir o workspace", "Studio", "error");
      } finally {
        setLoading(false);
      }
    })();
  });

  const view = createMemo<StudioViewId>(() => {
    const v = (search.view as StudioViewId) || "dash";
    return WORKSPACE_NAV.some((n) => n.id === v) ? v : "dash";
  });

  const setView = (id: StudioViewId) => setSearch({ view: id });

  const profilePieces = createMemo(() => piecesForProfile(profileId(), pieces()));
  const profileDecisions = createMemo(() => decisions());
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
      when={!loading()}
      fallback={
        <div class="stu-empty" style={{ height: "100%", border: "none" }}>
          <h2>Abrindo workspace…</h2>
        </div>
      }
    >
      <Show
        when={profile()}
        fallback={
          <div class="stu-empty" style={{ height: "100%", border: "none" }}>
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
                <div style={{ "min-width": 0 }}>
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
                    <strong style={{ "font-size": "14px", "line-height": "1.3" }}>
                      {pf().designSystem.toneOfVoice}
                    </strong>
                    <em>{pf().niche}</em>
                  </article>
                </div>
                <div class="stu-card">
                  <div class="stu-card-head">
                    <h2 style={{ margin: 0, "font-size": "16px" }}>Redes do perfil</h2>
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
                    <h2 style={{ margin: 0, "font-size": "16px" }}>Design system</h2>
                  </div>
                  <div class="stu-ds-card">
                    <div class="stu-swatches">
                      <div class="stu-swatch" style={{ background: pf().designSystem.primary }} />
                      <div class="stu-swatch" style={{ background: pf().designSystem.secondary }} />
                      <div class="stu-swatch" style={{ background: pf().designSystem.accent }} />
                    </div>
                    <div style={{ "font-size": "13px", "line-height": "1.55", color: "var(--text-secondary)" }}>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Tipografia:</strong>{" "}
                        {pf().designSystem.fontDisplay} · {pf().designSystem.fontBody}
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Fazer:</strong>{" "}
                        {pf().designSystem.doList}
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Evitar:</strong>{" "}
                        {pf().designSystem.dontList}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: "var(--text-primary)" }}>Visual:</strong>{" "}
                        {pf().designSystem.visualNotes}
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
                            <h2 style={{ margin: "10px 0 0", "font-size": "18px" }}>{dec.title}</h2>
                            <p style={{ margin: "6px 0 0", "font-size": "12px", color: "var(--text-muted)" }}>
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
                              void (async () => {
                                try {
                                  const net =
                                    (dec.platformLabel || "").toLowerCase() ||
                                    pf().nets[0]?.net ||
                                    "ig";
                                  await api.selectStudioDecision(
                                    dec.id,
                                    selectedOpt(),
                                    defaultSquadForNet(net),
                                  );
                                  showToast(
                                    "Opção aprovada · pacote gerado para revisão",
                                    "Centro de Decisões",
                                    "success",
                                  );
                                  await reload();
                                  setView("decisions");
                                } catch (err) {
                                  console.warn(err);
                                  showToast("Falha ao aprovar opção", "Studio", "error");
                                }
                              })();
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
                              <h2 style={{ margin: "10px 0 0", "font-size": "18px" }}>{dec.title}</h2>
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
                              <div
                                class="stu-card-actions"
                                style={{ "border-top": "none", "padding-top": 0, "margin-top": "8px" }}
                              >
                                <button
                                  type="button"
                                  class="stu-btn-sm"
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        await api.returnStudioOracle(dec.id);
                                        showToast("Devolvido ao Oráculo", "Revisão final", "info");
                                        await reload();
                                        setView("decisions");
                                      } catch (err) {
                                        console.warn(err);
                                        showToast("Falha ao devolver", "Studio", "error");
                                      }
                                    })();
                                  }}
                                >
                                  Devolver ao Oráculo
                                </button>
                                <div class="stu-card-actions-left">
                                  <button type="button" class="stu-btn-sm" onClick={() => setAjusteOpen(true)}>
                                    Solicitar ajuste
                                  </button>
                                  <button
                                    type="button"
                                    class="stu-btn-lg"
                                    onClick={() => {
                                      void (async () => {
                                        try {
                                          await api.approveStudioPackage(dec.id);
                                          showToast("Publicação aprovada", "Revisão final", "success");
                                          await reload();
                                        } catch (err) {
                                          console.warn(err);
                                          showToast("Falha ao aprovar", "Studio", "error");
                                        }
                                      })();
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
                  onRetryError={(pieceId) => {
                    void (async () => {
                      try {
                        const target =
                          pieceId ||
                          profilePieces().find((p) => p.stage === "error" || p.stage === "prod")?.id;
                        if (!target) {
                          showToast("Nenhuma peça para reprocessar", "Esteira", "info");
                          return;
                        }
                        await api.produceStudioPiece(target, {
                          squad_id: defaultSquadForNet(
                            profilePieces().find((p) => p.id === target)?.net || pf().nets[0]?.net,
                          ),
                        });
                        showToast("Squad regenerando pacote", "Esteira", "info");
                        await reload();
                        setView("decisions");
                      } catch (err) {
                        console.warn(err);
                        showToast("Falha ao reprocessar", "Studio", "error");
                      }
                    })();
                  }}
                />
              </Show>

              <Show when={view() === "oracle"}>
                <OraclePanel
                  profile={pf()}
                  onProfilePatch={(next) => setProfile(next)}
                  onNovaRodada={() => {
                    void (async () => {
                      try {
                        await api.runStudioOracle(pf().id, { net: pf().nets[0]?.net || "ig" });
                        showToast("Nova rodada do Oráculo iniciada", "Mesa do Oráculo", "success");
                        await reload();
                        setView("decisions");
                      } catch (err) {
                        console.warn(err);
                        showToast("Falha ao iniciar Oráculo", "Studio", "error");
                      }
                    })();
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
            profiles={profile() ? [profile()!] : []}
            lockedProfileId={pf().id}
            onClose={() => setProdOpen(false)}
            onCreated={(draft) => {
              setProdOpen(false);
              void reload().then(() => {
                setView(draft.decisionId ? "decisions" : "pipeline");
                showToast("Produção na esteira", "Nova produção", "success");
              });
            }}
          />

          <NovoAnguloModal
            open={anguloOpen()}
            onClose={() => setAnguloOpen(false)}
            onSubmit={(payload) => {
              setAnguloOpen(false);
              void (async () => {
                try {
                  const theme = [payload.style, payload.seed].filter(Boolean).join(" · ");
                  await api.runStudioOracle(pf().id, {
                    net: pf().nets[0]?.net || "ig",
                    theme: theme || undefined,
                  });
                  showToast(
                    `Oráculo regenerando · ${payload.style}${payload.seed ? ` · ${payload.seed}` : ""}`,
                    "Novo ângulo",
                    "info",
                  );
                  await reload();
                } catch (err) {
                  console.warn(err);
                  showToast("Falha ao pedir novo ângulo", "Studio", "error");
                }
              })();
            }}
          />

          <AjusteFinoModal
            open={ajusteOpen()}
            selectedTitle={selectedOptionTitle() || reviewPiece()?.title}
            onClose={() => setAjusteOpen(false)}
            onSubmit={(payload) => {
              setAjusteOpen(false);
              void (async () => {
                const piece =
                  reviewPiece() ||
                  profilePieces().find((p) => p.stage === "review" || p.stage === "prod");
                if (!piece) {
                  showToast("Nenhum pacote para ajustar — aprove uma pauta antes", "Ajuste fino", "info");
                  return;
                }
                try {
                  const guidance = [
                    `intensidade:${payload.intensity}`,
                    `campos:${payload.fields.join(",")}`,
                    payload.notes,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  await api.produceStudioPiece(piece.id, {
                    squad_id: defaultSquadForNet(piece.net),
                    guidance,
                  });
                  showToast(
                    `Ajuste ${payload.intensity} aplicado · pacote regenerado`,
                    "Ajuste fino",
                    "success",
                  );
                  await reload();
                  setView("decisions");
                } catch (err) {
                  console.warn(err);
                  showToast("Falha ao aplicar ajuste", "Studio", "error");
                }
              })();
            }}
          />
        </div>
      )}
      </Show>
    </Show>
  );
}
