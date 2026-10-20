import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import "./console.css";
import "./console-panels.css";
import { SUBNAV, type FabricaViewId, type WorkspaceSubview } from "./consoleNav";
import { ProjectHero, type ProjectMeta } from "./ProjectHero";
import { OverviewPanel } from "./panels/OverviewPanel";
import { KanbanPanel } from "./panels/KanbanPanel";
import { RoadmapPanel } from "./panels/RoadmapPanel";
import { QaPanel } from "./panels/QaPanel";
import { AccessPanel } from "./panels/AccessPanel";
import { SecurityPanel } from "./panels/SecurityPanel";
import { ChatPanel } from "./panels/ChatPanel";
import { EmptyState } from "./panels/EmptyState";
import { createFactoryRunController } from "./useFactoryRun";
import type { FactoryStageInstance } from "../../../shared/api/client";

type NavSnap = { view: FabricaViewId; subview: WorkspaceSubview };

interface LocalFile {
  id: string;
  name: string;
  type: string;
  sizeLabel: string;
}

function nodeClass(stage: FactoryStageInstance, selectedId: string | null): string {
  const parts = ["fc-flow-node"];
  if (stage.status === "done" || stage.status === "skipped") parts.push("is-complete");
  if (stage.is_gate) parts.push("is-gate");
  if (stage.status === "running" || stage.status === "awaiting_gate") parts.push("is-current");
  if (selectedId === stage.stage_def_id) parts.push("is-current");
  return parts.join(" ");
}

function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function formatLedgerTime(at?: string): string {
  if (!at || Number.isNaN(Date.parse(at))) return "—";
  try {
    return new Date(at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function FabricaConsole(props: {
  projectId: string;
  projectName?: string;
  projectCompany?: string;
  onBackToDashboard?: () => void;
  onOpenTemplates?: () => void;
}) {
  const [view, setView] = createSignal<FabricaViewId>("overview");
  const [subview, setSubview] = createSignal<WorkspaceSubview>("board");
  const [history, setHistory] = createSignal<NavSnap[]>([]);
  const [selectedStageId, setSelectedStageId] = createSignal<string | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = createSignal<string | null>(null);
  const [toast, setToast] = createSignal("");
  const [paused, setPaused] = createSignal(false);
  const [feedOpen, setFeedOpen] = createSignal(false);
  const [files, setFiles] = createSignal<LocalFile[]>([]);
  const factory = createFactoryRunController(() => props.projectId);
  let toastTimer: number | undefined;

  const stages = createMemo(() => factory.run()?.stages ?? []);
  const ledger = createMemo(() => factory.run()?.ledger ?? []);

  const selectedStage = createMemo(() => {
    const list = stages();
    const id = selectedStageId();
    if (id) return list.find((s) => s.stage_def_id === id) ?? null;
    return factory.currentStage() ?? list[0] ?? null;
  });

  const selectedLedger = createMemo(() => {
    const list = ledger();
    const id = selectedLedgerId();
    if (id) return list.find((e) => e.id === id) ?? null;
    return list.length ? list[list.length - 1] : null;
  });

  const artifacts = createMemo(() => {
    const out: string[] = [];
    for (const s of stages()) {
      for (const a of s.expected_artifacts || []) {
        if (a && !out.includes(a)) out.push(a);
      }
    }
    return out;
  });

  const agents = createMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const s of stages()) {
      const name = (s.agent || "").trim();
      if (!name || map.has(name)) continue;
      map.set(name, { name, role: s.agent_role || s.title });
    }
    return [...map.values()];
  });

  const projectMeta = createMemo((): ProjectMeta => {
    const r = factory.run();
    const done = r?.stages_done ?? stages().filter((s) => s.status === "done").length;
    const total = r?.total_stages ?? stages().length;
    const status =
      paused()
        ? ("paused" as const)
        : r?.status === "completed" || r?.status === "done"
          ? ("done" as const)
          : ("running" as const);
    return {
      code: (r?.template_code || "—").toUpperCase(),
      status,
      statusLabel:
        status === "done" ? "Concluído" : status === "paused" ? "Pausado" : "Em andamento",
      stagesDone: done,
      totalStages: total,
      company: props.projectCompany || "—",
      localPath: r?.workspace_path || "",
    };
  });

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(""), 2200);
  };

  onCleanup(() => window.clearTimeout(toastTimer));

  const snap = (): NavSnap => ({ view: view(), subview: subview() });
  const pushHist = () => setHistory((h) => [...h, snap()]);

  const switchView = (next: FabricaViewId) => {
    if (view() !== next) pushHist();
    setView(next);
  };

  const switchSubview = (next: WorkspaceSubview) => {
    if (view() !== "workspace" || subview() !== next) pushHist();
    setView("workspace");
    setSubview(next);
  };

  const goHome = () => {
    setHistory([]);
    setView("overview");
    setSubview("board");
    showToast("Visão geral do projeto");
  };

  const goBack = () => {
    const h = history();
    const prev = h[h.length - 1];
    if (prev) {
      setHistory(h.slice(0, -1));
      setView(prev.view);
      setSubview(prev.subview);
    } else if (view() !== "overview") {
      setView("overview");
    } else if (props.onBackToDashboard) {
      props.onBackToDashboard();
    }
  };

  const runSearch = (raw: string) => {
    const q = raw.trim().toLocaleLowerCase("pt-BR");
    if (!q) return;
    const views: Array<[FabricaViewId, string]> = [
      ["overview", "visão geral"],
      ["topology", "topologia"],
      ["ledger", "livro-razão"],
      ["workspace", "workspace"],
      ["chat", "chat"],
    ];
    const vm = views.find(([id, label]) => id.includes(q) || label.includes(q));
    if (vm) {
      switchView(vm[0]);
      return;
    }
    const sm = SUBNAV.find((s) => s.id.includes(q) || s.label.toLocaleLowerCase("pt-BR").includes(q));
    if (sm) switchSubview(sm.id);
    else showToast("Nenhum módulo encontrado.");
  };

  const openLocalFolder = () => {
    const path = projectMeta().localPath;
    if (!path) {
      showToast("Workspace ainda não materializado.");
      return;
    }
    showToast(`Pasta: ${path}`);
  };

  const validateFolders = () => {
    const path = projectMeta().localPath;
    showToast(path ? `Workspace: ${path}` : "Sem workspace_path no run.");
  };

  const onFilePick = (list: FileList | null) => {
    if (!list?.length) return;
    const next: LocalFile[] = [...files()];
    for (const f of Array.from(list)) {
      next.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: f.name,
        type: f.type || "arquivo",
        sizeLabel: f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB · sessão`,
      });
    }
    setFiles(next);
    showToast("Arquivos mantidos só nesta sessão do navegador.");
  };

  const groups = () => {
    const map = new Map<string, typeof SUBNAV>();
    for (const item of SUBNAV) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  };

  const overviewCurrent = createMemo(() => {
    const r = factory.run();
    const s = factory.currentStage();
    if (!r || !s) return null;
    const idx = r.stages.findIndex((x) => x.stage_def_id === s.stage_def_id) + 1;
    return {
      code: s.code,
      title: s.title,
      agent: s.agent || "—",
      index: idx > 0 ? idx : 1,
      total: r.total_stages ?? r.stages.length,
      status: s.status,
      isGate: s.is_gate,
    };
  });

  return (
    <div class="fc-root" data-screen-label="Tavir Fábrica Console">
      <header class="fc-topbar">
        <div class="fc-brand" aria-label={`TAVIR Fábrica · ${props.projectName || props.projectId}`}>
          <div class="fc-brand-mark" aria-hidden="true">
            TV
          </div>
          <div>
            <span class="fc-brand-title">{props.projectName || "TAVIR Fábrica"}</span>
            <span class="fc-brand-sub">
              {props.projectCompany ? `${props.projectCompany} · ` : ""}
              Console · {props.projectId}
            </span>
          </div>
        </div>
        <div class="fc-nav-row" aria-label="Navegação global">
          <button type="button" class="fc-icon-btn" onClick={goBack} title="Voltar">
            ← Voltar
          </button>
          <button type="button" class="fc-icon-btn" onClick={goHome} title="Retornar ao inicial">
            ⌂ Inicial
          </button>
        </div>
        <nav class="fc-view-nav" aria-label="Visões do projeto">
          <button type="button" class="fc-view-tab" aria-current={view() === "overview" ? "page" : undefined} on:click={() => switchView("overview")}>
            <span class="fc-view-num">00</span> Visão geral
          </button>
          <button type="button" class="fc-view-tab" aria-current={view() === "topology" ? "page" : undefined} on:click={() => switchView("topology")}>
            <span class="fc-view-num">01</span> Topologia
          </button>
          <button type="button" class="fc-view-tab" aria-current={view() === "ledger" ? "page" : undefined} on:click={() => switchView("ledger")}>
            <span class="fc-view-num">02</span> Livro-razão
          </button>
          <button type="button" class="fc-view-tab" aria-current={view() === "workspace" ? "page" : undefined} on:click={() => switchView("workspace")}>
            <span class="fc-view-num">03</span> Workspace
          </button>
          <button type="button" class="fc-view-tab" aria-current={view() === "chat" ? "page" : undefined} on:click={() => switchView("chat")}>
            <span class="fc-view-num">04</span> Chat
          </button>
        </nav>
        <div class="fc-search">
          <label class="fc-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              autocomplete="off"
              placeholder="Buscar módulo ou comando…"
              aria-label="Buscar módulos"
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(e.currentTarget.value);
              }}
            />
            <span class="fc-search-key">Ctrl K</span>
          </label>
        </div>
        <Show when={factory.connected()}>
          <span class="fc-tag ok">SSE</span>
        </Show>
        <Show when={props.onBackToDashboard}>
          <button type="button" class="fc-mode-toggle" onClick={() => props.onBackToDashboard?.()}>
            ← Dashboard
          </button>
        </Show>
        <Show when={props.onOpenTemplates}>
          <button type="button" class="fc-mode-toggle" onClick={() => props.onOpenTemplates?.()}>
            Templates esteira
          </button>
        </Show>
      </header>

      <Show when={view() !== "chat"}>
        <ProjectHero
          projectId={props.projectId}
          projectName={props.projectName}
          meta={projectMeta()}
          running={!paused() && projectMeta().status === "running"}
          onToggleRun={() => {
            setPaused((p) => {
              const next = !p;
              showToast(next ? "Esteira pausada na UI (estado local)." : "Esteira retomada na UI.");
              return next;
            });
          }}
          onOpenFolder={openLocalFolder}
          onValidate={validateFolders}
          onBack={props.onBackToDashboard}
        />
      </Show>

      <main class="fc-main" classList={{ "is-chat": view() === "chat" }}>
        <section class={`fc-screen ${view() === "overview" ? "is-active" : ""}`} aria-label="Visão geral do projeto">
          <div class="fc-scroll-pad">
            <OverviewPanel
              loading={factory.loading()}
              stages={factory.overviewStages()}
              activity={factory.activity()}
              current={overviewCurrent()}
              canAuthorize={factory.canAuthorize()}
              canComplete={factory.canComplete()}
              busy={factory.busy()}
              error={factory.error()}
              connected={factory.connected()}
              onAuthorize={async () => {
                try {
                  await factory.authorize();
                  showToast("Gate autorizado · esteira avançou.");
                } catch {
                  showToast(factory.error() || "Falha ao autorizar gate");
                }
              }}
              onComplete={async () => {
                try {
                  await factory.complete();
                  showToast("Etapa concluída · esteira avançou.");
                } catch {
                  showToast(factory.error() || "Falha ao concluir etapa");
                }
              }}
              onGoAccess={() => {
                setSubview("access");
                switchView("workspace");
              }}
            />
          </div>
        </section>

        <section class={`fc-screen ${view() === "topology" ? "is-active" : ""}`} aria-label="Topologia da execução">
          <div class="fc-topology">
            <section class="fc-canvas" aria-label="Mapa da demanda">
              <div class="fc-canvas-inner">
                <div style={{ display: "flex", "justify-content": "space-between", gap: "16px", "flex-wrap": "wrap" }}>
                  <div>
                    <p class="fc-micro">
                      Projeto {props.projectId}
                      {props.projectCompany ? ` · ${props.projectCompany}` : ""}
                    </p>
                    <h1>{props.projectName || "Projeto"} · Topologia</h1>
                    <p class="fc-sub">Etapas materializadas do run ativo</p>
                  </div>
                  <div class="fc-tags">
                    <Show when={factory.run()}>
                      <span class="fc-tag flow">{factory.run()!.template_code.toUpperCase()}</span>
                    </Show>
                    <Show when={factory.canAuthorize()}>
                      <span class="fc-tag warn">GATE PENDENTE</span>
                    </Show>
                  </div>
                </div>
                <Show
                  when={stages().length}
                  fallback={
                    <EmptyState
                      title="Sem etapas"
                      text={factory.error() || "Nenhum run ativo para este projeto."}
                    />
                  }
                >
                  <div class="fc-flow-window" tabindex="0" aria-label="Mapa horizontal de etapas">
                    <div class="fc-flow-map">
                      <For each={stages()}>
                        {(s) => (
                          <button
                            type="button"
                            class={nodeClass(s, selectedStageId())}
                            aria-pressed={selectedStage()?.stage_def_id === s.stage_def_id}
                            onClick={() => setSelectedStageId(s.stage_def_id)}
                          >
                            <span class="fc-orb">
                              <span>{s.code}</span>
                            </span>
                            <span class="fc-node-title">{s.title}</span>
                            <span class="fc-node-cap">{s.status}</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </section>
            <aside class="fc-inspector" aria-label="Inspector da etapa">
              <div class="fc-panel-head">
                <h2>Inspector · {selectedStage()?.title || "—"}</h2>
              </div>
              <div class="fc-inspector-scroll">
                <Show
                  when={selectedStage()}
                  fallback={<EmptyState title="Selecione uma etapa" />}
                >
                  {(s) => (
                    <>
                      <section class="fc-context">
                        <div class="fc-context-row">
                          <span>Agente</span>
                          <span>{s().agent || "—"}</span>
                        </div>
                        <div class="fc-context-row">
                          <span>Status</span>
                          <span>{s().status}</span>
                        </div>
                        <div class="fc-context-row">
                          <span>Gate</span>
                          <span>{s().is_gate ? "sim" : "não"}</span>
                        </div>
                        <div class="fc-context-row">
                          <span>Hash</span>
                          <span class="fc-mono">{s().artifact_hash || "—"}</span>
                        </div>
                      </section>
                      <section class="fc-section">
                        <p class="fc-section-label">Artefatos esperados</p>
                        <Show
                          when={(s().expected_artifacts || []).length}
                          fallback={<p class="fc-sub">Nenhum artefato declarado nesta etapa.</p>}
                        >
                          <For each={s().expected_artifacts || []}>
                            {(a) => (
                              <div class="fc-artifact">
                                <span class="fc-artifact-type">FILE</span>
                                <span>
                                  <strong>{a}</strong>
                                </span>
                              </div>
                            )}
                          </For>
                        </Show>
                        <div class="fc-btn-row" style={{ "margin-top": "12px" }}>
                          <button type="button" class="fc-btn" onClick={() => switchView("ledger")}>
                            Ver livro-razão
                          </button>
                          <Show when={factory.canAuthorize() && s().status === "awaiting_gate"}>
                            <button
                              type="button"
                              class="fc-btn-sec"
                              disabled={factory.busy()}
                              onClick={async () => {
                                try {
                                  await factory.authorize();
                                  showToast("Gate autorizado.");
                                } catch {
                                  showToast(factory.error() || "Falha ao autorizar");
                                }
                              }}
                            >
                              Autorizar gate
                            </button>
                          </Show>
                        </div>
                      </section>
                    </>
                  )}
                </Show>
              </div>
            </aside>
          </div>
        </section>

        <section class={`fc-screen ${view() === "ledger" ? "is-active" : ""}`} aria-label="Livro-razão">
          <div class="fc-ledger">
            <aside class="fc-tree">
              <div class="fc-panel-head">
                <h2>Hierarquia de eventos</h2>
              </div>
              <div class="fc-tree-scroll">
                <Show
                  when={ledger().length}
                  fallback={<EmptyState title="Ledger vazio" text="Eventos aparecem conforme a esteira avança." />}
                >
                  <ul class="fc-tree-list">
                    <For each={[...ledger()].reverse()}>
                      {(ev) => (
                        <li>
                          <button
                            type="button"
                            class="fc-tree-row"
                            aria-current={selectedLedger()?.id === ev.id ? "true" : undefined}
                            onClick={() => setSelectedLedgerId(ev.id)}
                          >
                            <span class={`fc-tree-kind ${ev.kind || "agent"}`}>
                              {(ev.kind || ev.action || "evt").toString().toUpperCase()}
                            </span>
                            <span class="fc-tree-name">{ev.title || ev.action || ev.id}</span>
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </aside>
            <section class="fc-ledger-detail">
              <div class="fc-panel-head">
                <h2>Rastreabilidade · {selectedLedger()?.title || selectedLedger()?.action || "—"}</h2>
                <Show when={ledger().length}>
                  <button
                    type="button"
                    class="fc-btn-sec"
                    onClick={() => {
                      downloadText(
                        `ledger-${props.projectId}.json`,
                        JSON.stringify(
                          {
                            project_id: props.projectId,
                            run_id: factory.run()?.id,
                            ledger: ledger(),
                          },
                          null,
                          2,
                        ),
                        "application/json;charset=utf-8",
                      );
                      showToast("Ledger exportado.");
                    }}
                  >
                    Exportar JSON
                  </button>
                </Show>
              </div>
              <div class="fc-ledger-body">
                <Show
                  when={selectedLedger()}
                  fallback={<EmptyState title="Selecione um evento" />}
                >
                  {(ev) => (
                    <article class="fc-record">
                      <div class="fc-record-grid fc-record-head">
                        <span>Timestamp</span>
                        <span>Agente / ação</span>
                        <span>Detalhe</span>
                      </div>
                      <div class="fc-record-grid">
                        <span class="fc-mono">{formatLedgerTime(ev().at)}</span>
                        <span>
                          <strong style={{ "font-size": "11px" }}>{ev().actor || "Sistema"}</strong>
                          <br />
                          <span class="fc-mono">{ev().action || ev().kind || "—"}</span>
                        </span>
                        <div>
                          <p style={{ margin: "0 0 6px", "font-size": "11px", "font-weight": "650" }}>
                            {ev().title || "Evento"}
                          </p>
                          <p class="fc-mono">stage: {ev().stage_def_id || "—"}</p>
                          <p class="fc-mono">{ev().note || ""}</p>
                          <div class="fc-json">
                            <div class="fc-panel-head" style={{ "min-height": "36px" }}>
                              <span class="fc-mono">EVENTO</span>
                              <button
                                type="button"
                                class="fc-btn-sec"
                                onClick={() => {
                                  const text = JSON.stringify(ev(), null, 2);
                                  navigator.clipboard?.writeText(text).then(
                                    () => showToast("JSON copiado."),
                                    () => showToast("Copie o bloco manualmente."),
                                  );
                                }}
                              >
                                Copiar
                              </button>
                            </div>
                            <pre>{JSON.stringify(ev(), null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}
                </Show>
              </div>
            </section>
          </div>
        </section>

        <section class={`fc-screen ${view() === "workspace" ? "is-active" : ""}`} aria-label="Workspace">
          <div class="fc-workspace" classList={{ "is-feed-open": feedOpen() }}>
            <aside class="fc-ws-nav" aria-label="Módulos">
              <div class="fc-ws-project" style={{ padding: "4px 6px 12px", "border-bottom": "1px solid var(--line)", "margin-bottom": "8px" }}>
                <span class="fc-ws-label" style={{ margin: 0 }}>
                  Workspace
                </span>
                <strong style={{ display: "block", "margin-top": "4px", "font-size": "12px" }}>
                  {props.projectName || props.projectId}
                </strong>
                <span class="fc-mono" style={{ display: "block", "margin-top": "2px" }}>
                  {projectMeta().localPath || "sem path"}
                </span>
              </div>
              <For each={groups()}>
                {([group, items]) => (
                  <>
                    <p class="fc-ws-label">{group}</p>
                    <For each={items}>
                      {(item) => (
                        <button
                          type="button"
                          class="fc-subnav"
                          aria-current={subview() === item.id ? "page" : undefined}
                          onClick={() => switchSubview(item.id)}
                        >
                          <span class="fc-subnav-glyph">{item.glyph}</span>
                          {item.label}
                        </button>
                      )}
                    </For>
                  </>
                )}
              </For>
            </aside>

            <section class="fc-ws-main">
              <Show when={subview() === "board"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Workspace / kanban</p>
                    <h1>Kanban da esteira</h1>
                    <p>Colunas derivadas do status real das stages.</p>
                  </div>
                  <button
                    type="button"
                    class="fc-btn-sec fc-page-head-feed"
                    aria-expanded={feedOpen()}
                    on:click={() => setFeedOpen((v) => !v)}
                  >
                    {feedOpen() ? "Ocultar feed" : "Feed / contexto"}
                  </button>
                </div>
                <KanbanPanel stages={stages()} />
              </Show>

              <Show when={subview() === "docs"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Artefatos</p>
                    <h1>Documentos gerados</h1>
                    <p>Artefatos esperados declarados nas stages.</p>
                  </div>
                </div>
                <Show
                  when={artifacts().length}
                  fallback={
                    <EmptyState
                      title="Nenhum documento"
                      text="Quando as etapas declararem expected_artifacts, a lista aparece aqui."
                    />
                  }
                >
                  <div class="fc-inner" style={{ padding: "8px" }}>
                    <For each={artifacts()}>
                      {(a) => (
                        <div class="fc-doc-btn" style={{ cursor: "default" }}>
                          <span class="fc-artifact-type">FILE</span>
                          <span>
                            <strong style={{ "font-size": "11px" }}>{a}</strong>
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>

              <Show when={subview() === "files"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Arquivos</p>
                    <h1>Arquivos da sessão</h1>
                    <p>Importação local em memória (não envia ao servidor).</p>
                  </div>
                  <label class="fc-btn">
                    ＋ Selecionar arquivos
                    <input type="file" multiple hidden onChange={(e) => onFilePick(e.currentTarget.files)} />
                  </label>
                </div>
                <Show
                  when={files().length}
                  fallback={<EmptyState title="Nenhum arquivo" text="Selecione arquivos para manter nesta sessão." />}
                >
                  <div style={{ overflow: "auto", border: "1px solid var(--line)", "border-radius": "8px" }}>
                    <table style={{ width: "100%", "border-collapse": "collapse", "min-width": "420px" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-1)", "text-align": "left" }}>
                          <th style={{ padding: "8px", "font-size": "10px" }}>Nome</th>
                          <th style={{ padding: "8px", "font-size": "10px" }}>Tipo</th>
                          <th style={{ padding: "8px", "font-size": "10px" }}>Tamanho</th>
                          <th style={{ padding: "8px", "font-size": "10px" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={files()}>
                          {(f) => (
                            <tr style={{ "border-top": "1px solid var(--line)" }}>
                              <td style={{ padding: "8px", "font-size": "11px" }}>{f.name}</td>
                              <td style={{ padding: "8px", "font-size": "11px" }}>{f.type}</td>
                              <td style={{ padding: "8px", "font-size": "11px" }}>{f.sizeLabel}</td>
                              <td style={{ padding: "8px" }}>
                                <button
                                  type="button"
                                  class="fc-btn-sec"
                                  onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))}
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>

              <Show when={subview() === "access"}>
                <div class="fc-page-head is-slim">
                  <div>
                    <p class="fc-micro">Acesso seguro</p>
                    <h1>Acessos</h1>
                  </div>
                </div>
                <AccessPanel />
              </Show>

              <Show when={subview() === "qa"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">QA</p>
                    <h1>Completion Guard & QA</h1>
                  </div>
                </div>
                <QaPanel />
              </Show>

              <Show when={subview() === "security"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Security</p>
                    <h1>Segurança & LGPD</h1>
                  </div>
                </div>
                <SecurityPanel />
              </Show>

              <Show when={subview() === "agents"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Agentes</p>
                    <h1>Papéis da esteira</h1>
                    <p>Derivados das stages do run ativo.</p>
                  </div>
                </div>
                <Show
                  when={agents().length}
                  fallback={<EmptyState title="Nenhum agente" text="Quando houver stages com agent, a lista aparece." />}
                >
                  <div class="fc-agent-grid">
                    <For each={agents()}>
                      {(a) => (
                        <article class="fc-card">
                          <h2>{a.name}</h2>
                          <p>{a.role}</p>
                        </article>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>

              <Show when={subview() === "roadmap"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Roadmap</p>
                    <h1>Cronograma da esteira</h1>
                    <p>Progresso real das stages.</p>
                  </div>
                </div>
                <RoadmapPanel stages={stages()} templateCode={factory.run()?.template_code} />
              </Show>
            </section>

            <Show when={feedOpen()}>
              <aside class="fc-feed" id="fc-feed-panel" aria-label="Feed contextual">
                <div class="fc-panel-head">
                  <h2>Feed / contexto</h2>
                  <button type="button" class="fc-icon-btn" aria-label="Fechar feed" onClick={() => setFeedOpen(false)}>
                    ✕
                  </button>
                </div>
                <div class="fc-feed-body">
                  <div class="fc-card" style={{ "margin-bottom": "12px" }}>
                    <h2>Projeto</h2>
                    <div class="fc-context-row">
                      <span>ID</span>
                      <strong class="fc-mono">{props.projectId}</strong>
                    </div>
                    <div class="fc-context-row">
                      <span>Run</span>
                      <strong class="fc-mono">{factory.run()?.id || "—"}</strong>
                    </div>
                    <div class="fc-context-row">
                      <span>Etapa</span>
                      <strong class="fc-mono">{factory.currentStage()?.code || "—"}</strong>
                    </div>
                  </div>
                  <For each={factory.activity().slice(0, 6)}>
                    {(a) => (
                      <div class="fc-activity">
                        <span class="fc-activity-time">{a.meta}</span>
                        <i class={`fc-pin ${a.tone === "danger" ? "warn" : a.tone === "warn" ? "now" : "ok"}`} />
                        <span>
                          <strong>{a.title}</strong>
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </aside>
            </Show>
          </div>
        </section>

        <section class={`fc-screen ${view() === "chat" ? "is-active" : ""}`} aria-label="Chat do projeto">
          <div class="fc-chat2-wrap">
            <ChatPanel projectName={props.projectName} stages={stages()} onToast={showToast} />
          </div>
        </section>
      </main>

      <div class={`fc-toast ${toast() ? "show" : ""}`} role="status">
        {toast()}
      </div>
    </div>
  );
}
