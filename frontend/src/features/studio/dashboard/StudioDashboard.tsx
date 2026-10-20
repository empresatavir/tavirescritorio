import { For, Show, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../../shared/components/TvIcon";
import {
  DEMO_DECISIONS,
  DEMO_PIECES,
  DEMO_PROFILES,
  NET_META,
  type ContentProfile,
  type SocialNet,
  formatFollowers,
} from "../demoData";
import { NewProfileModal } from "../new-profile/NewProfileModal";
import { NewProductionModal } from "../new-production/NewProductionModal";
import "./dashboard.css";

type StatusFilter = "all" | "active" | "paused" | "draft";
type NetFilter = SocialNet | null;

const NETWORK_CARDS: Array<{
  id: SocialNet;
  title: string;
  desc: string;
  meta: string;
}> = [
  {
    id: "ig",
    title: "Instagram",
    desc: "Feed 4:5, carrosséis e reels com prévia no dispositivo real.",
    meta: "carrossel · reel · stories",
  },
  {
    id: "yt",
    title: "YouTube",
    desc: "Roteiro, thumbnail e retenção — da pauta ao pacote de publicação.",
    meta: "vídeo longo · short · thumb",
  },
  {
    id: "li",
    title: "LinkedIn",
    desc: "Posts autorais e carrosséis B2B com tom de voz da marca.",
    meta: "texto · carrossel · documento",
  },
];

function statusLabel(s: ContentProfile["status"]) {
  if (s === "active") return "Ativo";
  if (s === "paused") return "Pausado";
  return "Rascunho";
}

function pendingFor(profileId: string) {
  const decisions =
    profileId === "pf-carlos"
      ? DEMO_DECISIONS.length
      : DEMO_PIECES.filter((p) => p.profileId === profileId && p.needs).length;
  return decisions;
}

export function StudioDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = createSignal(DEMO_PROFILES);
  const [pieces] = createSignal(DEMO_PIECES);
  const [query, setQuery] = createSignal("");
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("all");
  const [netFilter, setNetFilter] = createSignal<NetFilter>(null);
  const [profileModal, setProfileModal] = createSignal(false);
  const [prodModal, setProdModal] = createSignal(false);

  const kpis = createMemo(() => {
    const list = profiles();
    const active = list.filter((p) => p.status === "active").length;
    const pending = list.reduce((n, p) => n + pendingFor(p.id), 0);
    const pubs = pieces().filter((p) => p.stage === "done").length;
    const nets = list.reduce((n, p) => n + p.nets.length, 0);
    return { active, total: list.length, pending, pubs, nets };
  });

  const actions = createMemo(() => {
    const items: Array<{ id: string; title: string; profileId: string; profileName: string }> = [];
    for (const d of DEMO_DECISIONS) {
      items.push({
        id: d.id,
        title: d.kind === "pauta" ? d.title : `Revisão · ${d.title}`,
        profileId: "pf-carlos",
        profileName: "Carlos Junior",
      });
    }
    for (const p of pieces().filter((x) => x.needs && x.profileId !== "pf-carlos")) {
      const pf = profiles().find((x) => x.id === p.profileId);
      items.push({
        id: p.id,
        title: p.title,
        profileId: p.profileId,
        profileName: pf?.name || p.profileId,
      });
    }
    return items.slice(0, 6);
  });

  const visible = createMemo(() => {
    const q = query().trim().toLowerCase();
    const st = statusFilter();
    const net = netFilter();
    let list = profiles();
    if (st !== "all") list = list.filter((p) => p.status === st);
    if (net) list = list.filter((p) => p.nets.some((n) => n.net === net));
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q) ||
          p.niche.toLowerCase().includes(q),
      );
    }
    return list;
  });

  const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "active", label: "Ativos" },
    { id: "paused", label: "Pausados" },
    { id: "draft", label: "Rascunhos" },
  ];

  return (
    <div class="stu-dash" data-screen-label="Tavir Studio Dashboard">
      <div class="stu-dash-inner">
        <header class="stu-dash-header">
          <div>
            <p class="stu-dash-eyebrow">Studio editorial · redes sociais</p>
            <h1 class="stu-dash-title">Painel do Studio</h1>
            <p class="stu-dash-lead">
              Gerencie perfis de Instagram, YouTube e LinkedIn. Abra um workspace para decisões,
              esteira e prévia visual.
            </p>
          </div>
          <div class="stu-dash-header-actions">
            <button type="button" class="stu-dash-btn-secondary" onClick={() => setProdModal(true)}>
              <TvIcon name="plus" width="14" height="14" />
              Nova produção
            </button>
            <button type="button" class="stu-dash-btn-primary" onClick={() => setProfileModal(true)}>
              <TvIcon name="plus" width="14" height="14" />
              Novo perfil
            </button>
          </div>
        </header>

        <section class="stu-dash-kpis" aria-label="Indicadores do studio">
          <article class="stu-dash-kpi">
            <div class="stu-dash-kpi-ico" aria-hidden="true">
              <TvIcon name="sparkles" width="16" height="16" />
            </div>
            <div>
              <p class="stu-dash-kpi-label">Perfis ativos</p>
              <p class="stu-dash-kpi-value">{kpis().active}</p>
              <p class="stu-dash-kpi-sub">{kpis().total} no total</p>
            </div>
          </article>
          <article class="stu-dash-kpi">
            <div class="stu-dash-kpi-ico is-warn" aria-hidden="true">
              <TvIcon name="triangle-alert" width="16" height="16" />
            </div>
            <div>
              <p class="stu-dash-kpi-label">Decisões pendentes</p>
              <p class="stu-dash-kpi-value">{kpis().pending}</p>
              <p class="stu-dash-kpi-sub">aguardando você</p>
            </div>
          </article>
          <article class="stu-dash-kpi">
            <div class="stu-dash-kpi-ico is-teal" aria-hidden="true">
              <TvIcon name="share-2" width="16" height="16" />
            </div>
            <div>
              <p class="stu-dash-kpi-label">Redes conectadas</p>
              <p class="stu-dash-kpi-value">{kpis().nets}</p>
              <p class="stu-dash-kpi-sub">IG · YT · LinkedIn</p>
            </div>
          </article>
          <article class="stu-dash-kpi">
            <div class="stu-dash-kpi-ico is-lime" aria-hidden="true">
              <TvIcon name="circle-check" width="16" height="16" />
            </div>
            <div>
              <p class="stu-dash-kpi-label">Publicados no ciclo</p>
              <p class="stu-dash-kpi-value">{kpis().pubs}</p>
              <p class="stu-dash-kpi-sub">peças concluídas</p>
            </div>
          </article>
        </section>

        <Show when={actions().length > 0}>
          <section class="stu-dash-section" aria-labelledby="stu-actions-heading">
            <div class="stu-dash-section-head">
              <h2 id="stu-actions-heading">
                <span class="stu-dash-section-ico is-warn" aria-hidden="true">
                  <TvIcon name="triangle-alert" width="14" height="14" />
                </span>
                Precisa da sua ação
              </h2>
              <span class="stu-dash-muted">{actions().length} itens</span>
            </div>
            <div class="stu-dash-actions">
              <For each={actions()}>
                {(a) => (
                  <button
                    type="button"
                    class="stu-dash-action"
                    onClick={() => navigate(`/studio/${a.profileId}?view=decisions`)}
                  >
                    <span class="stu-dash-action-kind">Decisão</span>
                    <span class="stu-dash-action-body">
                      <strong>{a.title}</strong>
                      <span>{a.profileName}</span>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="stu-dash-section" aria-labelledby="stu-profiles-heading">
          <div class="stu-dash-section-head">
            <h2 id="stu-profiles-heading">Perfis</h2>
            <span class="stu-dash-muted">{visible().length} listados</span>
          </div>

          <div class="stu-dash-toolbar">
            <label class="stu-dash-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar perfil, empresa ou nicho…"
                aria-label="Buscar perfis"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
            </label>
            <div class="stu-dash-tabs" role="tablist" aria-label="Filtrar por status">
              <For each={FILTERS}>
                {(f) => (
                  <button
                    type="button"
                    role="tab"
                    class="stu-dash-tab"
                    classList={{ "is-active": statusFilter() === f.id }}
                    onClick={() => setStatusFilter(f.id)}
                  >
                    {f.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          <Show
            when={visible().length > 0}
            fallback={
              <div class="stu-dash-empty">
                <p>Nenhum perfil neste filtro.</p>
              </div>
            }
          >
            <div class="stu-dash-profiles">
              <For each={visible()}>
                {(pf) => {
                  const pending = () => pendingFor(pf.id);
                  const cyclePct = () =>
                    Math.round((pf.cycleDone / Math.max(pf.cycleGoal, 1)) * 100);
                  const activePieces = () =>
                    pieces().filter((p) => p.profileId === pf.id && p.stage !== "done").length;
                  return (
                    <button
                      type="button"
                      class="stu-dash-profile"
                      onClick={() => navigate(`/studio/${pf.id}`)}
                    >
                      <div class="stu-dash-profile-top">
                        <div class="stu-dash-avatar" style={{ background: pf.color }}>
                          {pf.initials}
                        </div>
                        <div class="stu-dash-profile-badges">
                          <span class="stu-dash-pill">{pf.handle}</span>
                          <span class="stu-dash-status" data-status={pf.status}>
                            {statusLabel(pf.status)}
                          </span>
                        </div>
                      </div>
                      <div class="stu-dash-profile-name">{pf.name}</div>
                      <div class="stu-dash-profile-company">{pf.company}</div>
                      <div class="stu-dash-profile-niche">{pf.niche}</div>
                      <div class="stu-dash-net-row">
                        <For each={pf.nets}>
                          {(n) => (
                            <span class="stu-dash-net-chip">
                              <img src={NET_META[n.net].logo} alt="" />
                              {formatFollowers(n.followers)}
                            </span>
                          )}
                        </For>
                      </div>
                      <div class="stu-dash-profile-stats">
                        <span>
                          Ciclo {pf.cycleDone}/{pf.cycleGoal}
                        </span>
                        <span>{activePieces()} em esteira</span>
                      </div>
                      <div class="stu-dash-progress" aria-hidden="true">
                        <div class="stu-dash-progress-bar" style={{ width: `${cyclePct()}%` }} />
                      </div>
                      <Show when={pending() > 0}>
                        <p class="stu-dash-pending">
                          <TvIcon name="triangle-alert" width="12" height="12" />
                          {pending() === 1
                            ? "1 decisão aguardando você"
                            : `${pending()} decisões aguardando você`}
                        </p>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
        </section>

        <section class="stu-dash-section" aria-labelledby="stu-nets-heading">
          <div class="stu-dash-section-head">
            <h2 id="stu-nets-heading">Redes suportadas</h2>
            <Show when={netFilter()}>
              <button type="button" class="stu-dash-btn-ghost" style={{ flex: "none", width: "auto", padding: "0 12px" }} onClick={() => setNetFilter(null)}>
                Limpar filtro
              </button>
            </Show>
          </div>
          <div class="stu-dash-networks">
            <For each={NETWORK_CARDS}>
              {(card) => {
                const active = () => netFilter() === card.id;
                const count = () =>
                  profiles().filter((p) => p.nets.some((n) => n.net === card.id)).length;
                return (
                  <article class="stu-dash-net-card" classList={{ "is-active": active() }}>
                    <div class="stu-dash-net-top">
                      <span class="stu-dash-net-icon" aria-hidden="true">
                        <img src={NET_META[card.id].logo} alt="" />
                      </span>
                      <span class="stu-dash-net-count">
                        {count()} {count() === 1 ? "perfil" : "perfis"}
                      </span>
                    </div>
                    <h3>{card.title}</h3>
                    <p class="stu-dash-net-desc">{card.desc}</p>
                    <p class="stu-dash-net-meta">{card.meta}</p>
                    <div class="stu-dash-net-actions">
                      <button
                        type="button"
                        class="stu-dash-btn-ghost"
                        onClick={() => setNetFilter(active() ? null : card.id)}
                      >
                        {active() ? "Remover filtro" : "Ver perfis"}
                      </button>
                      <button
                        type="button"
                        class="stu-dash-btn-solid"
                        onClick={() => {
                          setProdModal(true);
                        }}
                      >
                        Nova produção
                      </button>
                    </div>
                  </article>
                );
              }}
            </For>
          </div>
        </section>
      </div>

      <NewProfileModal
        open={profileModal()}
        onClose={() => setProfileModal(false)}
        onCreated={(profile) => {
          setProfiles((prev) => [profile, ...prev]);
          setProfileModal(false);
          navigate(`/studio/${profile.id}`);
        }}
      />

      <NewProductionModal
        open={prodModal()}
        profiles={profiles()}
        onClose={() => setProdModal(false)}
        onCreated={(result) => {
          setProdModal(false);
          navigate(`/studio/${result.profileId}?view=pipeline`);
        }}
      />
    </div>
  );
}
