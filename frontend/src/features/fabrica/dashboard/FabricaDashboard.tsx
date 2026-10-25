import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TvIcon } from "../../../shared/components/TvIcon";
import { api, type FactoryProject, type ProjectItem } from "../../../shared/api/client";
import { NewProjectModalHost } from "../new-project/NewProjectModalHost";
import { ProjectAiDialog } from "../ProjectAiDialog";
import "./dashboard.css";

type TemplateCat = "lp" | "of" | "sy";
type ProjectStatus = "running" | "paused" | "done" | string;
type ActionKind = "auth" | "error";
type StatusFilter = "all" | "running" | "pending" | "paused" | "done";
type SortMode = "progress" | "name";

interface DashProject {
  id: string;
  name: string;
  company: string;
  cat: TemplateCat;
  code: string;
  stagesDone: number;
  totalStages: number;
  status: ProjectStatus;
  trackLabel: string;
  currentStage: string;
  pendingCount: number;
  localPath: string;
}

interface DashAction {
  id: string;
  kind: ActionKind;
  title: string;
  projectId: string;
  projectName: string;
}

const TEMPLATES: Array<{
  id: TemplateCat;
  title: string;
  subtitle: string;
  desc: string;
  stagesHint: string;
  icon: string;
}> = [
  {
    id: "lp",
    title: "Landing Pages",
    subtitle: "LP · Criação e manutenção",
    desc: "Esteira com prova visual, comercial, construção, QA, SEO e handoff documentado.",
    stagesHint: "até 16 etapas · gates humanos",
    icon: "layers",
  },
  {
    id: "of",
    title: "Ofertas",
    subtitle: "Ofertas · Produto e preço",
    desc: "Criação ou revisão de oferta com evidência de público, viabilidade e claims.",
    stagesHint: "6–8 etapas · growth + jurídico",
    icon: "sparkles",
  },
  {
    id: "sy",
    title: "Sistemas",
    subtitle: "Sistemas · Criação e manutenção",
    desc: "Criação do zero, criação com especificação pronta, ou manutenção de um sistema que já existe.",
    stagesHint: "criação 15 etapas · manutenção 12 etapas",
    icon: "workflow",
  },
];

const RING_C = 2 * Math.PI * 18;

function catFromTemplate(code?: string | null): TemplateCat {
  const c = (code || "").toLowerCase();
  if (c.startsWith("of") || c.includes("oferta")) return "of";
  if (c.startsWith("sy") || c.includes("sistema") || c.includes("crm")) return "sy";
  return "lp";
}

function codeFrom(cat: TemplateCat, trackLabel: string, name: string): string {
  const prefix = cat === "of" ? "OF" : cat === "sy" ? "SY" : "LP";
  const suffix = trackLabel.toLowerCase().includes("zero") || name.toLowerCase().includes("criação")
    ? "C"
    : "M";
  return `${prefix}-${suffix}`;
}

function statusLabel(status: string): string {
  if (status === "running" || status === "active") return "Em andamento";
  if (status === "paused") return "Pausado";
  if (status === "done" || status === "completed") return "Concluído";
  return status;
}

function normalizeStatus(status: string): ProjectStatus {
  if (status === "active") return "running";
  if (status === "completed") return "done";
  return status;
}

function pctOf(p: DashProject): number {
  return Math.round((p.stagesDone / Math.max(p.totalStages, 1)) * 100);
}

function ProgressRing(props: { pct: number; done?: boolean }) {
  const offset = () => RING_C * (1 - Math.min(100, Math.max(0, props.pct)) / 100);
  return (
    <div class="fab-dash-ring" aria-hidden="true">
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle class="fab-dash-ring-track" cx="22" cy="22" r="18" />
        <circle
          class="fab-dash-ring-value"
          classList={{ "is-done": !!props.done }}
          cx="22"
          cy="22"
          r="18"
          stroke-dasharray={String(RING_C)}
          stroke-dashoffset={String(offset())}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <strong>{props.pct}%</strong>
    </div>
  );
}

export function FabricaDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = createSignal<DashProject[]>([]);
  const [actions, setActions] = createSignal<DashAction[]>([]);
  const [filterCat, setFilterCat] = createSignal<TemplateCat | null>(null);
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("all");
  const [sortMode, setSortMode] = createSignal<SortMode>("progress");
  const [query, setQuery] = createSignal("");
  const [modalOpen, setModalOpen] = createSignal(false);
  const [settingsId, setSettingsId] = createSignal<string | null>(null);
  const [settingsName, setSettingsName] = createSignal("");
  const [preferredCat, setPreferredCat] = createSignal<TemplateCat | undefined>();

  onMount(async () => {
    try {
      const [factory, general] = await Promise.all([
        api.listFactoryProjects().catch(() => [] as FactoryProject[]),
        api.listProjects().catch(() => [] as ProjectItem[]),
      ]);

      const mapOne = (p: FactoryProject | ProjectItem): DashProject => {
        const cat = catFromTemplate(p.template_code);
        const raw = (p.template_code || "").toLowerCase();
        const known = /^(lp|of|sy)-(c|m)$/.exec(raw);
        const trackLabel = known
          ? known[2] === "c"
            ? "Criação"
            : "Manutenção"
          : p.template_code === "ideacao-dora"
            ? "Projeto do zero"
            : p.template_code === "execucao-direta"
              ? "Escopo fechado"
              : "Esteira";
        const pendencies = "pendencies" in p && Array.isArray(p.pendencies) ? p.pendencies : [];
        return {
          id: p.id,
          name: p.name,
          company: p.company || p.client || "—",
          cat,
          code: known ? raw.toUpperCase() : codeFrom(cat, trackLabel, p.name),
          stagesDone: p.stages_done ?? 0,
          totalStages: p.total_stages || 1,
          status: normalizeStatus(p.status),
          trackLabel,
          currentStage: "Etapa em curso",
          pendingCount: pendencies.length,
          localPath: p.local_path || "",
        };
      };

      const byKey = new Map<string, DashProject>();
      for (const p of [...(factory || []), ...(general || [])]) {
        const mapped = mapOne(p);
        const key = mapped.id;
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, mapped);
          continue;
        }
        const richer =
          mapped.stagesDone + mapped.totalStages > prev.stagesDone + prev.totalStages ||
          mapped.pendingCount > prev.pendingCount;
        if (richer) byKey.set(key, { ...prev, ...mapped });
      }

      const list = [...byKey.values()];
      setProjects(list);

      const nextActions: DashAction[] = [];
      for (const p of factory || []) {
        for (const pend of p.pendencies || []) {
          nextActions.push({
            id: `${p.id}-${pend.id}`,
            kind: pend.kind === "error" ? "error" : "auth",
            title: pend.title,
            projectId: p.id,
            projectName: p.name,
          });
        }
      }
      setActions(nextActions);
    } catch {
      setProjects([]);
      setActions([]);
    }
  });

  const kpis = createMemo(() => {
    const list = projects();
    const active = list.filter((p) => p.status === "running" || p.status === "active").length;
    const pending = list.reduce((n, p) => n + (p.pendingCount || 0), 0);
    const avg =
      list.length === 0 ? 0 : Math.round(list.reduce((n, p) => n + pctOf(p), 0) / list.length);
    const guard = list.filter((p) => p.status === "done" || p.status === "completed").length;
    return { active, total: list.length, pending, avg, guard };
  });

  const visible = createMemo(() => {
    const cat = filterCat();
    const st = statusFilter();
    const q = query().trim().toLowerCase();
    let list = projects();
    if (cat) list = list.filter((p) => p.cat === cat);
    if (st === "running") list = list.filter((p) => p.status === "running" || p.status === "active");
    if (st === "paused") list = list.filter((p) => p.status === "paused");
    if (st === "done") list = list.filter((p) => p.status === "done" || p.status === "completed");
    if (st === "pending") list = list.filter((p) => (p.pendingCount || 0) > 0);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      );
    }
    const mode = sortMode();
    return [...list].sort((a, b) => {
      if (mode === "name") return a.name.localeCompare(b.name, "pt-BR");
      return pctOf(b) - pctOf(a);
    });
  });

  const openNew = (cat?: TemplateCat) => {
    setPreferredCat(cat);
    setModalOpen(true);
  };

  const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "running", label: "Em andamento" },
    { id: "pending", label: "Com pendências" },
    { id: "paused", label: "Pausados" },
    { id: "done", label: "Concluídos" },
  ];

  return (
    <div class="fab-dash" data-screen-label="Tavir Fábrica Dashboard">
      <div class="fab-dash-inner">
        <header class="fab-dash-header">
          <div class="fab-dash-header-text">
            <p class="fab-dash-eyebrow">Fábrica de software · esteiras ao vivo</p>
            <h1 class="fab-dash-title">Painel da Fábrica</h1>
            <p class="fab-dash-lead">
              Acompanhe cada esteira, destrave gates e veja o QA em tempo real.
            </p>
          </div>
        </header>

        <section class="fab-dash-kpis" aria-label="Indicadores da fábrica">
          <article class="fab-dash-kpi">
            <div class="fab-dash-kpi-ico" aria-hidden="true">
              <TvIcon name="folder-kanban" width="16" height="16" />
            </div>
            <div>
              <p class="fab-dash-kpi-label">Projetos ativos</p>
              <p class="fab-dash-kpi-value">{kpis().active}</p>
              <p class="fab-dash-kpi-sub">{kpis().total} no total</p>
            </div>
          </article>
          <article class="fab-dash-kpi">
            <div class="fab-dash-kpi-ico is-warn" aria-hidden="true">
              <TvIcon name="triangle-alert" width="16" height="16" />
            </div>
            <div>
              <p class="fab-dash-kpi-label">Pendências abertas</p>
              <p class="fab-dash-kpi-value">{kpis().pending}</p>
              <p class="fab-dash-kpi-sub">aguardando você</p>
            </div>
          </article>
          <article class="fab-dash-kpi">
            <div class="fab-dash-kpi-ico is-teal" aria-hidden="true">
              <TvIcon name="activity" width="16" height="16" />
            </div>
            <div>
              <p class="fab-dash-kpi-label">Progresso médio</p>
              <p class="fab-dash-kpi-value">{kpis().avg}%</p>
              <p class="fab-dash-kpi-sub">de todas as esteiras</p>
            </div>
          </article>
          <article class="fab-dash-kpi">
            <div class="fab-dash-kpi-ico is-lime" aria-hidden="true">
              <TvIcon name="shield-check" width="16" height="16" />
            </div>
            <div>
              <p class="fab-dash-kpi-label">Completion Guard 8/8</p>
              <p class="fab-dash-kpi-value">{kpis().guard}</p>
              <p class="fab-dash-kpi-sub">projetos aprovados no QA</p>
            </div>
          </article>
        </section>

        <section class="fab-dash-section" aria-labelledby="fab-templates-heading">
          <div class="fab-dash-section-head">
            <h2 id="fab-templates-heading">Templates de Esteira</h2>
            <Show when={filterCat()}>
              <button type="button" class="fab-dash-link" on:click={() => setFilterCat(null)}>
                Limpar filtro
              </button>
            </Show>
          </div>
          <div class="fab-dash-templates">
            <For each={TEMPLATES}>
              {(t) => {
                const active = () => filterCat() === t.id;
                const count = () => projects().filter((p) => p.cat === t.id).length;
                return (
                  <article
                    class="fab-dash-card"
                    classList={{ "is-active": active() }}
                    data-cat={t.id}
                  >
                    <div class="fab-dash-card-top">
                      <span class="fab-dash-card-icon" aria-hidden="true">
                        <TvIcon name={t.icon} width="18" height="18" />
                      </span>
                      <span class="fab-dash-card-count">
                        {count()} {count() === 1 ? "projeto" : "projetos"}
                      </span>
                    </div>
                    <h3>{t.title}</h3>
                    <p class="fab-dash-card-sub">{t.subtitle}</p>
                    <p class="fab-dash-card-desc">{t.desc}</p>
                    <p class="fab-dash-card-meta">{t.stagesHint}</p>
                    <div class="fab-dash-card-actions">
                      <button
                        type="button"
                        class="fab-dash-btn-ghost"
                        on:click={() => setFilterCat(active() ? null : t.id)}
                      >
                        {active() ? "Remover filtro" : "Ver projetos"}
                      </button>
                      <button type="button" class="fab-dash-btn-solid" on:click={() => openNew(t.id)}>
                        Usar esteira
                      </button>
                    </div>
                  </article>
                );
              }}
            </For>
          </div>
        </section>

        <section class="fab-dash-section" aria-labelledby="fab-actions-heading">
          <div class="fab-dash-section-head">
            <h2 id="fab-actions-heading">
              <span class="fab-dash-section-ico is-warn" aria-hidden="true">
                <TvIcon name="triangle-alert" width="14" height="14" />
              </span>
              Precisa da sua ação
            </h2>
            <span class="fab-dash-muted">{actions().length} itens</span>
          </div>
          <div class="fab-dash-actions">
            <Show
              when={actions().length}
              fallback={<p class="fab-dash-muted">Nenhuma pendência no momento.</p>}
            >
              <For each={actions()}>
                {(a) => (
                  <button
                    type="button"
                    class="fab-dash-action"
                    classList={{ "is-error": a.kind === "error" }}
                    on:click={() => navigate(`/fabrica/${a.projectId}`)}
                  >
                    <span class={`fab-dash-action-kind is-${a.kind}`}>
                      {a.kind === "error" ? "Erro" : "Autorização"}
                    </span>
                    <span class="fab-dash-action-body">
                      <strong>{a.title}</strong>
                      <span>{a.projectName}</span>
                    </span>
                    <span class="fab-dash-action-go" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </section>

        <section class="fab-dash-section" aria-labelledby="fab-projects-heading">
          <div class="fab-dash-section-head">
            <h2 id="fab-projects-heading">Projetos</h2>
            <span class="fab-dash-muted">{visible().length} listados</span>
          </div>

          <div class="fab-dash-toolbar">
            <label class="fab-dash-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar projeto, cliente ou código…"
                aria-label="Buscar projetos"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
            </label>
            <div class="fab-dash-tabs" role="tablist" aria-label="Filtrar por status">
              <For each={FILTERS}>
                {(f) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter() === f.id}
                    class="fab-dash-tab"
                    classList={{ "is-active": statusFilter() === f.id }}
                    on:click={() => setStatusFilter(f.id)}
                  >
                    {f.label}
                  </button>
                )}
              </For>
            </div>
            <label class="fab-dash-sort">
              <span class="sr-only">Ordenar</span>
              <select
                aria-label="Ordenar"
                value={sortMode()}
                onChange={(e) => setSortMode(e.currentTarget.value as SortMode)}
              >
                <option value="progress">Ordenar por progresso</option>
                <option value="name">Ordenar por nome</option>
              </select>
            </label>
          </div>

          <Show
            when={visible().length > 0}
            fallback={
              <div class="fab-dash-empty">
                <p>Nenhum projeto neste filtro.</p>
              </div>
            }
          >
            <div class="fab-dash-projects">
              <For each={visible()}>
                {(pj) => {
                  const pct = () => pctOf(pj);
                  const done = () => pj.status === "done" || pj.status === "completed";
                  return (
                    <div
                      class="fab-dash-project"
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/fabrica/${pj.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") navigate(`/fabrica/${pj.id}`);
                      }}
                    >
                      <div class="fab-dash-project-top">
                        <ProgressRing pct={pct()} done={done()} />
                        <div class="fab-dash-project-badges">
                          <span class="fab-dash-pill">{pj.code}</span>
                          <span class="fab-dash-status" data-status={pj.status}>
                            {statusLabel(pj.status)}
                          </span>
                          <button
                            type="button"
                            class="fab-dash-gear"
                            aria-label={`Excluir ${pj.name}`}
                            title="Excluir o projeto. A pergunta seguinte decide se a pasta sai do disco."
                            onClick={async (event) => {
                              event.stopPropagation();
                              if (!window.confirm(`Excluir ${pj.name} da Fábrica?`)) return;
                              const folder = pj.localPath ? `\n\n${pj.localPath}` : "";
                              const deleteFolder = window.confirm(`Deseja excluir a pasta do projeto?${folder}`);
                              try {
                                const result = await api.deleteFactoryProject(pj.id, deleteFolder);
                                setProjects((list) => list.filter((item) => item.id !== pj.id));
                                setActions((list) => list.filter((item) => item.projectId !== pj.id));
                                if (result.folder_error) {
                                  window.alert(`O projeto saiu da Fábrica. A pasta permaneceu: ${result.folder_error}`);
                                }
                              } catch {
                                window.alert("Não foi possível excluir o projeto.");
                              }
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            class="fab-dash-gear"
                            aria-label={`Configurações de ${pj.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSettingsId(pj.id);
                              setSettingsName(pj.name);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <TvIcon name="sliders" width="14" height="14" />
                          </button>
                        </div>
                      </div>
                      <div class="fab-dash-project-name">{pj.name}</div>
                      <div class="fab-dash-project-company">{pj.company}</div>
                      <div class="fab-dash-project-stage">
                        <span>
                          {done() ? "Entregue" : `Agora: ${pj.currentStage}`}
                        </span>
                        <span class="fab-dash-stage-count">
                          {pj.stagesDone}/{pj.totalStages}
                        </span>
                      </div>
                      <div class="fab-dash-progress" aria-hidden="true">
                        <div class="fab-dash-progress-bar" style={{ width: `${pct()}%` }} />
                      </div>
                      <Show when={pj.pendingCount > 0}>
                        <p class="fab-dash-pending">
                          <TvIcon name="triangle-alert" width="12" height="12" />
                          {pj.pendingCount === 1
                            ? "1 pendência aguardando você"
                            : `${pj.pendingCount} pendências aguardando você`}
                        </p>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </section>
      </div>

      <ProjectAiDialog
        projectId={settingsId()}
        projectName={settingsName()}
        onClose={() => setSettingsId(null)}
      />
      <NewProjectModalHost
        open={modalOpen()}
        preferredCategory={preferredCat()}
        onClose={() => {
          setModalOpen(false);
          setPreferredCat(undefined);
        }}
        onCreated={(project) => {
          setModalOpen(false);
          setPreferredCat(undefined);
          navigate(`/fabrica/${project.id}`);
        }}
      />
    </div>
  );
}
