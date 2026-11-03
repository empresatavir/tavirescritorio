import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { api, type FactoryProject, type ProjectItem } from "../../../shared/api/client";
import { NewProjectModalHost } from "../new-project/NewProjectModalHost";
import { ESTEIRAS } from "./esteiras";
import { DEMO_PENDS, DEMO_PROJECTS } from "./demoSeed";
import { KIND_META, STAT, type FabFilter, type FabPend, type FabProject, type FabSort } from "./panelTypes";
import { FabricaConsolePane } from "../console/FabricaConsolePane";
import "../fabrica-ref.css";

function pctOf(done: number, n: number): number {
  return Math.round((done / Math.max(n, 1)) * 100);
}

function statusOf(raw: string): FabProject["status"] {
  if (raw === "paused") return "paused";
  if (raw === "done" || raw === "completed") return "done";
  return "run";
}

function mapApiProject(p: FactoryProject | ProjectItem): FabProject {
  const done = p.stages_done ?? 0;
  const n = p.total_stages || 1;
  const pendencies = "pendencies" in p && Array.isArray(p.pendencies) ? p.pendencies : [];
  const code = (p.template_code || "LP-C").toUpperCase().slice(0, 4).replace(/-$/, "") || "LP-C";
  return {
    id: p.id,
    name: p.name,
    client: p.company || p.client || "—",
    code: code.length <= 4 ? code : code.slice(0, 4),
    line: (p.template_code || "LP-C1").toUpperCase(),
    slug: (p.local_path || p.id).replace(/\\/g, "/"),
    status: statusOf(p.status),
    pct: pctOf(done, n),
    done,
    n,
    pendN: pendencies.length,
    stepName: pendencies[0]?.title || (done >= n ? "Entregue" : "Etapa em curso"),
    owner: done >= n ? "gate final assinado" : "mesa atual",
    think: pendencies[0]?.title || (done >= n ? "Entregue" : "Em execução"),
    cap: "CURSOR · AUTO",
    stages: Array.from({ length: n }, (_, i) => `s${i}`),
  };
}

function mapApiPends(factory: FactoryProject[]): FabPend[] {
  const out: FabPend[] = [];
  for (const p of factory) {
    for (const pend of p.pendencies || []) {
      const kind = pend.kind === "error" ? "erro" : pend.kind === "decision" ? "gate" : "auth";
      const meta = KIND_META[kind];
      out.push({
        id: `${p.id}-${pend.id}`,
        kind,
        t: pend.title,
        d: pend.text || "",
        who: pend.from || "mesa",
        at: "agora",
        btn: kind === "gate" ? "Abrir gate" : kind === "erro" ? "Resolver em Acessos" : "Autorizar",
        projId: p.id,
        proj: p.name,
        kcls: meta.kcls,
        ibg: meta.ibg,
        ifg: meta.ifg,
        icon: meta.icon,
      });
    }
  }
  return out;
}

function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  );
}

function IconFolderPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10H3zM12 12v5M9.5 14.5h5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3zM9.5 20h5" />
    </svg>
  );
}

export function FabricaDashboard(props: { initialProjectId?: string } = {}) {
  const navigate = useNavigate();
  const params = useParams();
  const [projects, setProjects] = createSignal<FabProject[]>([]);
  const [pends, setPends] = createSignal<FabPend[]>([]);
  const [filter, setFilter] = createSignal<FabFilter>("all");
  const [sort, setSort] = createSignal<FabSort>("pct");
  const [modalOpen, setModalOpen] = createSignal(false);
  const [usingDemo, setUsingDemo] = createSignal(false);
  const [pid, setPid] = createSignal<string | null>(props.initialProjectId || params.projectId || null);

  createEffect(() => {
    setPid(params.projectId || props.initialProjectId || null);
  });

  const reload = async () => {
    try {
      const settings = await api.getOfficeSettings().catch(() => null);
      if (settings?.visual_fixture === true) {
        setProjects(DEMO_PROJECTS);
        setPends(DEMO_PENDS);
        setUsingDemo(true);
        return;
      }
      const [factory, general] = await Promise.all([
        api.listFactoryProjects().catch(() => [] as FactoryProject[]),
        api.listProjects().catch(() => [] as ProjectItem[]),
      ]);
      const byKey = new Map<string, FabProject>();
      for (const p of [...(factory || []), ...(general || [])]) {
        byKey.set(p.id, mapApiProject(p));
      }
      setProjects([...byKey.values()]);
      setPends(mapApiPends(factory || []));
      setUsingDemo(false);
    } catch {
      setProjects([]);
      setPends([]);
      setUsingDemo(false);
    }
  };

  onMount(() => {
    void reload();
  });

  const openProject = (id: string) => {
    setPid(id);
    navigate(`/fabrica/${id}`);
  };

  const backToPainel = () => {
    setPid(null);
    navigate("/fabrica");
  };

  const fl = {
    all: () => true,
    run: (p: FabProject) => p.status === "run",
    pend: (p: FabProject) => p.pendN > 0,
    paused: (p: FabProject) => p.status === "paused",
    done: (p: FabProject) => p.status === "done",
  };

  const rows = createMemo(() => {
    const list = projects().filter(fl[filter()]);
    return [...list].sort((a, b) => (sort() === "name" ? a.name.localeCompare(b.name, "pt-BR") : b.pct - a.pct));
  });

  const runN = () => projects().filter((p) => p.status === "run").length;
  const avg = () => {
    const list = projects();
    if (!list.length) return 0;
    return Math.round(list.reduce((a, p) => a + p.pct, 0) / list.length);
  };
  const guardOk = () => projects().filter((p) => p.status === "done").length;
  const actN = () => pends().length;

  const kpis = () => {
    const total = projects().length || 1;
    const pending = actN();
    return [
      {
        k: "Projetos ativos",
        v: String(runN()),
        n: `${projects().length} no total`,
        c: "var(--text-primary)",
        pct: Math.round((runN() / total) * 100),
        fill: "run",
        pick: () => setFilter("run"),
      },
      {
        k: "Pendências abertas",
        v: String(pending),
        n: pending ? "aguardando você" : "nada aguardando você",
        c: pending ? "var(--warning)" : "var(--flow)",
        pct: Math.min(100, pending * 20),
        fill: pending ? "warn" : "run",
        pick: () => setFilter("pend"),
      },
      {
        k: "Progresso médio",
        v: `${avg()}%`,
        n: "de todas as esteiras",
        c: "var(--text-primary)",
        pct: avg(),
        fill: "lime",
        pick: () => setFilter("all"),
      },
      {
        k: "Completion Guard",
        v: `${guardOk()} de ${projects().length}`,
        n: "projetos com 8/8 no QA",
        c: "var(--flow)",
        pct: Math.round((guardOk() / total) * 100),
        fill: "run",
        pick: () => setFilter("done"),
      },
    ];
  };

  const filters: Array<{ id: FabFilter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "run", label: "Em andamento" },
    { id: "pend", label: "Com pendências" },
    { id: "paused", label: "Pausados" },
    { id: "done", label: "Concluídos" },
  ];

  const sorts: Array<{ id: FabSort; label: string }> = [
    { id: "pct", label: "Por progresso" },
    { id: "name", label: "Por nome" },
  ];

  const esteiraUse = (code: string) => {
    const used = projects().filter((p) => p.line === code).length;
    return used ? `${used} ${used === 1 ? "projeto" : "projetos"}` : "sem uso";
  };

  return (
    <div class="fab" data-screen-label={pid() ? "Tavir Fábrica Console" : "Tavir Fábrica Dashboard"}>
      <aside class="fb-side" aria-label="Projetos da Fábrica">
        <div class="fb-brand">
          <span class="fb-logo">F</span>
          <div>
            <b>TAVIR Fábrica</b>
            <small>esteiras ao vivo</small>
          </div>
        </div>
        <button
          type="button"
          class={`fb-nav ${pid() ? "" : "on"}`}
          aria-current={pid() ? undefined : "page"}
          onClick={backToPainel}
        >
          <IconGrid />
          <span>Painel</span>
          <Show when={actN() > 0}>
            <em class="fb-cnt">{actN()}</em>
          </Show>
        </button>
        <div class="eyebrow fb-lbl">Projetos · {projects().length}</div>
        <For each={projects()}>
          {(p) => (
            <button type="button" class={`fb-proj ${pid() === p.id ? "on" : ""}`} onClick={() => openProject(p.id)}>
              <span class="fb-ring" style={{ background: `conic-gradient(${STAT[p.status][2]} 0 ${p.pct}%, var(--line) 0)` }}>
                <i>{p.pct}</i>
              </span>
              <span class="fb-pt">
                <b>{p.name}</b>
                <small>
                  <span class="mono">{p.code}</span> · {p.stepName}
                </small>
              </span>
              <Show when={p.pendN > 0}>
                <em class="fb-cnt">{p.pendN}</em>
              </Show>
            </button>
          )}
        </For>
        <div class="fb-foot">
          <span class="av">CH</span>
          <div>
            <b>Carlos Henrique</b>
            <small>CEO · aprovador</small>
          </div>
        </div>
      </aside>

      <div class="main-pane">
        <Show
          when={pid()}
          fallback={
        <div class="page">
          <div class="phead">
            <div class="grow">
              <div class="eyebrow">Fábrica de software · esteiras ao vivo</div>
              <h1 style={{ "margin-top": "8px" }}>Painel da Fábrica</h1>
              <p>Acompanhe cada esteira, destrave gates e veja o QA em tempo real. O Completion Guard decide quando acabou, e você assina.</p>
            </div>
            <div class="actions">
              <button
                type="button"
                class="btn secondary"
                onClick={() => {
                  window.alert("Absorver pasta: escolha a pasta do projeto no próximo passo (Product Lab).");
                }}
              >
                <IconFolderPlus />
                Absorver pasta
              </button>
              <button type="button" class="btn primary" onClick={() => setModalOpen(true)}>
                <IconPlus />
                Novo projeto
              </button>
            </div>
          </div>

          <div class="g4">
            <For each={kpis()}>
              {(k) => (
                <button type="button" class="metric lift" onClick={k.pick} style={{ "text-align": "left", cursor: "pointer" }}>
                  <span class="eyebrow">{k.k}</span>
                  <strong style={{ color: k.c }}>{k.v}</strong>
                  <small>{k.n}</small>
                  <div class="track" style={{ height: "4px", "margin-top": "2px" }}>
                    <div class={`fill ${k.fill}`} style={{ width: `${k.pct}%` }} />
                  </div>
                </button>
              )}
            </For>
          </div>

          <section class="card">
            <div class="card-h">
              <h3>Precisa da sua ação</h3>
              <span class="badge warn">{actN()}</span>
              <div class="grow" />
              <span class="muted" style={{ "font-size": "12px" }}>
                Autorize daqui ou abra o projeto
              </span>
            </div>
            <Show when={actN() === 0}>
              <div style={{ padding: "26px 20px", display: "flex", gap: "12px", "align-items": "center", color: "var(--text-secondary)", "font-size": "13.5px" }}>
                <span style={{ width: "36px", height: "36px", "border-radius": "10px", display: "grid", "place-items": "center", background: "var(--flow-subtle)", color: "var(--flow)" }}>
                  <IconCheck />
                </span>
                Nada aguardando você. As esteiras seguem sozinhas.
              </div>
            </Show>
            <div class="rows">
              <For each={pends()}>
                {(a) => (
                  <div class="row" style={{ cursor: "default", gap: "14px", animation: "fade 220ms var(--ease) both" }}>
                    <span style={{ width: "38px", height: "38px", "border-radius": "11px", display: "grid", "place-items": "center", background: a.ibg, color: a.ifg, flex: "none" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d={a.icon} />
                      </svg>
                    </span>
                    <div class="grow" style={{ "min-width": "0" }}>
                      <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
                        <span class={`badge ${a.kcls}`}>{KIND_META[a.kind].label}</span>
                        <b style={{ "font-size": "14px" }}>{a.t}</b>
                      </div>
                      <div class="m" style={{ "margin-top": "3px" }}>
                        {a.proj} · {a.who} · {a.at}
                      </div>
                    </div>
                    <button type="button" class="btn sm ghost" onClick={() => openProject(a.projId)}>
                      Abrir projeto
                    </button>
                    <button type="button" class="btn sm secondary" onClick={() => openProject(a.projId)}>
                      {a.btn}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </section>

          <section class="card">
            <div class="card-h" style={{ "flex-wrap": "wrap", gap: "12px" }}>
              <h3>Projetos</h3>
              <div class="segs">
                <For each={filters}>
                  {(f) => (
                    <button type="button" class={`seg ${filter() === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)} style={{ height: "30px", "font-size": "12.5px" }}>
                      {f.label}
                      <span class="c">{projects().filter(fl[f.id]).length}</span>
                    </button>
                  )}
                </For>
              </div>
              <div class="grow" />
              <div class="segs">
                <For each={sorts}>
                  {(f) => (
                    <button type="button" class={`seg ${sort() === f.id ? "on" : ""}`} onClick={() => setSort(f.id)} style={{ height: "30px", "font-size": "12.5px" }}>
                      {f.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <div class="rows">
              <For each={rows()}>
                {(l) => {
                  const col = () => STAT[l.status][2];
                  const gate = () => l.pendN > 0;
                  return (
                    <div
                      class="row"
                      role="link"
                      tabIndex={0}
                      onClick={() => openProject(l.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProject(l.id);
                        }
                      }}
                      style={{ padding: "16px 18px", gap: "18px", "flex-wrap": "wrap", animation: "fade 200ms var(--ease) both", cursor: "pointer" }}
                    >
                      <span class="fb-ring" style={{ width: "50px", height: "50px", background: `conic-gradient(${col()} 0 ${l.pct}%, var(--line) 0)` }}>
                        <i style={{ width: "40px", height: "40px", "font-size": "11px" }}>{l.pct}%</i>
                      </span>
                      <div style={{ flex: "0 0 240px", "min-width": "0" }}>
                        <div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
                          <span class="badge">{l.code}</span>
                          <span class={`badge ${STAT[l.status][1]}`}>
                            <i />
                            {STAT[l.status][0]}
                          </span>
                        </div>
                        <div class="t" style={{ "font-size": "15px", "margin-top": "7px" }}>
                          {l.name}
                        </div>
                        <div class="m">{l.client}</div>
                        <div class="mono" style={{ "font-size": "10.5px", color: "var(--text-muted)", "margin-top": "3px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                          {l.slug}
                        </div>
                      </div>
                      <div style={{ flex: "1 1 300px", "min-width": "0", display: "flex", "flex-direction": "column", gap: "10px" }}>
                        <div style={{ display: "flex", "align-items": "center" }}>
                          <For each={l.stages}>
                            {(_, i) => {
                              const idx = i();
                              const done = idx < l.done;
                              const cur = idx === l.done && l.status !== "done";
                              const size = cur ? 16 : 12;
                              return (
                                <div style={{ display: "flex", "align-items": "center", flex: idx > 0 ? "1" : "0 0 auto" }}>
                                  <Show when={idx > 0}>
                                    <i style={{ flex: "1", height: "2px", background: idx <= l.done ? "var(--flow)" : "var(--line)", "min-width": "3px" }} />
                                  </Show>
                                  <span
                                    style={{
                                      width: `${size}px`,
                                      height: `${size}px`,
                                      "border-radius": "50%",
                                      flex: "none",
                                      display: "grid",
                                      "place-items": "center",
                                      background: done ? "var(--flow)" : cur ? "var(--warning-subtle)" : "var(--surface-2)",
                                      border: `2px solid ${done ? "var(--flow)" : cur ? "var(--warning)" : "var(--line-strong)"}`,
                                      color: "var(--surface-1)",
                                      animation: cur && gate() && l.status === "run" ? "ringwarn 2s var(--ease) infinite" : "none",
                                    }}
                                  >
                                    <Show when={done}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M5 12.5l4.5 4.5L19 7" />
                                      </svg>
                                    </Show>
                                  </span>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                        <div style={{ display: "flex", gap: "6px", "align-items": "center", "font-size": "12px", "min-width": "0" }}>
                          <span class="muted">Agora:</span>
                          <b style={{ "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>{l.stepName}</b>
                          <span class="muted" style={{ "white-space": "nowrap" }}>
                            · {l.owner}
                          </span>
                        </div>
                        <div class="fb-thought">
                          <span class="badge flow" style={{ height: "20px", flex: "none" }}>
                            {l.cap}
                          </span>
                          <IconBulb />
                          <span>{l.think}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", "flex-direction": "column", "align-items": "flex-end", gap: "6px", flex: "0 0 170px" }}>
                        <span class="num" style={{ "font-size": "13px" }}>
                          {`${l.done}/${l.n} etapas`}
                        </span>
                        <Show when={l.pendN > 0} fallback={<span class="muted" style={{ "font-size": "12px" }}>sem pendências</span>}>
                          <span class="badge warn">
                            {`${l.pendN} ${l.pendN === 1 ? "pendência" : "pendências"}`}
                          </span>
                        </Show>
                      </div>
                      <IconChevron />
                    </div>
                  );
                }}
              </For>
              <Show when={rows().length === 0}>
                <p class="muted" style={{ padding: "22px 20px", "font-size": "13px" }}>
                  Nenhum projeto neste filtro.
                </p>
              </Show>
            </div>
          </section>

          <div class="sec-title">
            <h2>Esteiras disponíveis</h2>
            <span class="muted" style={{ "font-size": "13px" }}>
              Cada esteira começa com etapas, mesas e critérios de pronto
            </span>
          </div>
          <div class="g3">
            <For each={[...ESTEIRAS]}>
              {(e) => (
                <article class="card lift" style={{ padding: "20px", display: "flex", "flex-direction": "column", gap: "12px" }}>
                  <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
                    <span class="badge flow">{e.code}</span>
                    <span class="badge">{e.fam}</span>
                    <div class="grow" />
                    <span class="muted" style={{ "font-size": "12px" }}>
                      {esteiraUse(e.code)}
                    </span>
                  </div>
                  <h3 style={{ "font-size": "17px", "font-weight": "600" }}>{e.name}</h3>
                  <p class="sec" style={{ "font-size": "13px" }}>
                    {e.d}
                  </p>
                  <div style={{ display: "flex", gap: "4px", "flex-wrap": "wrap" }}>
                    <For each={[...e.st]}>
                      {(x) => (
                        <span class="mono" style={{ "font-size": "10.5px", padding: "3px 7px", "border-radius": "6px", background: "var(--surface-0)", border: "1px solid var(--line)", color: "var(--text-secondary)" }}>
                          {x}
                        </span>
                      )}
                    </For>
                  </div>
                  <Show when={e.guard}>
                    <span class="badge action" style={{ "align-self": "flex-start" }}>
                      Compiler & Completion Guard
                    </span>
                  </Show>
                  <div style={{ display: "flex", "align-items": "center", "margin-top": "auto", "padding-top": "6px" }}>
                    <div>
                      <span class="num muted" style={{ "font-size": "12px" }}>
                        {e.stages} etapas · {e.mesas} mesas
                      </span>
                      <div class="muted" style={{ "font-size": "11.5px", "margin-top": "2px" }}>
                        Lead: {e.lead} · isolamento Git/.env
                      </div>
                    </div>
                    <div class="grow" />
                    <button type="button" class="btn sm secondary" onClick={() => setModalOpen(true)}>
                      Usar esteira
                    </button>
                  </div>
                </article>
              )}
            </For>
          </div>
        </div>
          }
        >
          {(id) => <FabricaConsolePane projectId={id()} onBack={backToPainel} />}
        </Show>
      </div>

      <NewProjectModalHost
        open={modalOpen()}
        onClose={() => setModalOpen(false)}
        onCreated={(project) => {
          setModalOpen(false);
          void reload();
          if (project?.id) {
            setPid(project.id);
            navigate(`/fabrica/${project.id}`);
          }
        }}
      />
    </div>
  );
}
