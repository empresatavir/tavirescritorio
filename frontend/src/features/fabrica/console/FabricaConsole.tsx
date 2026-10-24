import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
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
import { ArtifactsPanel } from "./panels/ArtifactsPanel";
import { StageReport } from "./panels/StageReport";
import { createFactoryRunController } from "./useFactoryRun";
import { RedoDialog } from "./RedoDialog";
import { ProjectAiDialog } from "../ProjectAiDialog";
import { api, type FactoryStageInstance } from "../../../shared/api/client";

type NavSnap = { view: FabricaViewId; subview: WorkspaceSubview };

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
  const [redoMode, setRedoMode] = createSignal<"gate" | "project" | null>(null);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [redoStageId, setRedoStageId] = createSignal<string | null>(null);
  const [feedOpen, setFeedOpen] = createSignal(false);
  const factory = createFactoryRunController(() => props.projectId);
  const [folderCheck, setFolderCheck] = createSignal("");
  const autoOn = () => factory.run()?.meta?.auto_execute === true;
  let pumping = false;
  let bootPumped = false;

  const pumpAuto = async () => {
    if (pumping || !autoOn()) return;
    pumping = true;
    try {
      while (autoOn()) {
        if (!factory.canAutoRun()) break;
        const stage = factory.currentStage();
        if (!stage) break;
        const stopsForCeo = stage.is_gate || stage.status === "awaiting_gate";
        showToast(`Execução automática · ${stage.title}`);
        await factory.execute();
        if (!autoOn()) {
          showToast("Execução automática desligada.");
          break;
        }
        if (stopsForCeo) {
          showToast("Gate atualizado. A autorização continua com você.");
          break;
        }
        await factory.complete();
        const next = factory.currentStage();
        if (!next || next.is_gate || next.status === "awaiting_gate") {
          showToast("Execução automática parou no gate. Autorize para seguir.");
          break;
        }
      }
    } catch {
      try {
        await factory.setAutoExecute(false);
      } catch {
        /* o aviso abaixo já explica a parada */
      }
      showToast(factory.error() || "Execução automática interrompida.");
    } finally {
      pumping = false;
    }
  };

  const toggleAuto = async () => {
    const next = !autoOn();
    try {
      await factory.setAutoExecute(next);
      showToast(next ? "Execução automática ligada." : "Execução automática desligada.");
      if (next) void pumpAuto();
    } catch {
      showToast(factory.error() || "Não foi possível gravar a execução automática.");
    }
  };

  const authorizeGate = async () => {
    try {
      await factory.authorize();
      showToast("Gate autorizado · esteira avançou.");
      if (autoOn()) void pumpAuto();
    } catch {
      showToast(factory.error() || "Falha ao autorizar gate");
    }
  };

  createEffect(() => {
    if (bootPumped || factory.loading() || !factory.run()) return;
    bootPumped = true;
    if (autoOn()) void pumpAuto();
  });

  const openGateRedo = (stageId?: string | null) => {
    setRedoStageId(stageId || factory.currentStage()?.stage_def_id || null);
    setRedoMode("gate");
  };
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
    const cur = factory.currentStage();
    const done = r?.stages_done ?? stages().filter((s) => s.status === "done").length;
    const total = r?.total_stages ?? stages().length;
    const status =
      r?.status === "paused"
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
      gatePending: factory.canAuthorize(),
      failPending: !!cur && cur.status === "failed",
      currentStageLabel: cur ? `${cur.code} · ${cur.title}` : undefined,
    };
  });

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(""), 4200);
  };

  let reportPrepared = "";
  createEffect(() => {
    const stage = factory.currentStage();
    const currentRun = factory.run();
    if (factory.loading() || factory.busy() || !stage || !currentRun) return;
    const paths = stage.expected_artifacts || [];
    const needsReport =
      stage.is_gate &&
      stage.status === "awaiting_gate" &&
      paths.length > 0 &&
      !stage.artifact_hash;
    if (!needsReport) return;
    if (autoOn() && factory.canAutoRun()) return;
    const key = `${currentRun.id}:${stage.stage_def_id}`;
    if (reportPrepared === key) return;
    reportPrepared = key;
    void (async () => {
      showToast("Gerando o relatório do agente…");
      try {
        await factory.execute("Entrega do agente");
        showToast("Relatório pronto para leitura.");
      } catch {
        showToast(factory.error() || "A IA não entregou o relatório.");
      }
    })();
  });

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

  const openLocalFolder = async () => {
    if (!projectMeta().localPath && !factory.run()?.workspace_path) {
      showToast("Workspace ainda não materializado.");
      return;
    }
    try {
      const res = await api.openFactoryWorkspace(props.projectId);
      showToast(`Explorer: ${res.path}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao abrir pasta no Explorer");
    }
  };

  const validateFolders = async () => {
    try {
      const listed = await api.listFactoryArtifacts(props.projectId);
      const expected = listed.expected || [];
      if (!listed.local_path) {
        setFolderCheck("Sem workspace_path no run.");
        showToast("Sem workspace_path no run.");
        return;
      }
      if (!expected.length) {
        const text = "Esta etapa não declara pastas esperadas.";
        setFolderCheck(text);
        showToast(text);
        return;
      }
      const present = expected.filter((item) => item.present).map((item) => item.path);
      const missing = expected.filter((item) => !item.present).map((item) => item.path);
      const text = [
        present.length ? `Presentes: ${present.join(", ")}` : "",
        missing.length ? `Faltam: ${missing.join(", ")}` : "Nenhuma pasta esperada falta.",
      ]
        .filter(Boolean)
        .join(". ");
      setFolderCheck(text);
      showToast(text);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Não foi possível validar as pastas.";
      setFolderCheck(text);
      showToast(text);
    }
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
      stageDefId: s.stage_def_id,
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
          running={projectMeta().status === "running"}
          busy={factory.busy()}
          canAuthorize={factory.canAuthorize()}
          canResume={factory.canResume()}
          canAutoRun={factory.canAutoRun()}
          autoOn={autoOn()}
          onToggleAuto={toggleAuto}
          canRedo={factory.canAuthorize()}
          canRestart={factory.canRestart()}
          onRedo={() => openGateRedo(factory.currentStage()?.stage_def_id)}
          onRestart={() => setRedoMode("project")}
          onAuthorize={authorizeGate}
          onResume={async () => {
            try {
              await factory.resume();
              showToast("Esteira retomada.");
              if (autoOn()) void pumpAuto();
            } catch {
              showToast(factory.error() || "Falha ao retomar");
            }
          }}
          onToggleRun={async () => {
            try {
              if (factory.canPause()) {
                await factory.pause();
                showToast("Esteira pausada.");
              } else if (factory.canResume()) {
                await factory.resume();
                showToast("Esteira retomada.");
                if (autoOn()) void pumpAuto();
              } else {
                showToast("Esteira não pode pausar/retomar neste estado.");
              }
            } catch {
              showToast(factory.error() || "Falha na pausa/retomada");
            }
          }}
          onOpenFolder={openLocalFolder}
          onValidate={validateFolders}
          folderCheck={folderCheck()}
          onOpenSettings={() => setSettingsOpen(true)}
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
              pendencies={factory.pendencies()}
              current={overviewCurrent()}
              runStatus={factory.run()?.status}
              canAuthorize={factory.canAuthorize()}
              canComplete={factory.canComplete()}
              canExecute={factory.canExecute()}
              canAutoRun={factory.canAutoRun()}
              autoOn={autoOn()}
              onToggleAuto={toggleAuto}
              canRedo={factory.canAuthorize()}
              onRedo={() => openGateRedo(factory.currentStage()?.stage_def_id)}
              onRedoStage={(id) => openGateRedo(id)}
              canFail={factory.canFail()}
              canResume={factory.canResume()}
              busy={factory.busy()}
              error={factory.error()}
              connected={factory.connected()}
              onAuthorize={authorizeGate}
              onComplete={async () => {
                try {
                  await factory.complete();
                  showToast("Etapa concluída · esteira avançou.");
                } catch {
                  showToast(factory.error() || "Falha ao concluir etapa");
                }
              }}
              onExecute={async () => {
                try {
                  await factory.execute();
                  showToast("Etapa executada · artefatos materializados.");
                } catch {
                  showToast(factory.error() || "Falha ao executar etapa");
                }
              }}
              onFail={async () => {
                try {
                  await factory.fail("Falha marcada pelo operador");
                  showToast("Etapa marcada como falha · esteira pausada.");
                } catch {
                  showToast(factory.error() || "Falha ao marcar etapa");
                }
              }}
              onResume={async () => {
                try {
                  await factory.resume();
                  showToast("Esteira retomada.");
                } catch {
                  showToast(factory.error() || "Falha ao retomar");
                }
              }}
              report={
                <StageReport
                  projectId={props.projectId}
                  stageTitle={factory.currentStage()?.title}
                  stageId={factory.currentStage()?.stage_def_id}
                  fresh={Boolean(factory.currentStage()?.artifact_hash)}
                  paths={factory.currentStage()?.expected_artifacts || []}
                  onGenerate={
                    factory.currentStage()?.is_gate &&
                    factory.currentStage()?.status === "awaiting_gate" &&
                    (factory.currentStage()?.expected_artifacts || []).length
                      ? async () => {
                          showToast("Gerando o relatório do agente…");
                          try {
                            await factory.execute("Entrega do agente");
                            showToast("Relatório pronto para leitura.");
                          } catch {
                            showToast(factory.error() || "A IA não entregou o relatório.");
                          }
                        }
                      : undefined
                  }
                />
              }
              showDeliveryProcess={stages().some((stage) =>
                [
                  "m_code",
                  "m_code_be",
                  "m_code_fe",
                  "build",
                  "build_be",
                  "build_fe",
                ].includes(stage.stage_def_id),
              )}
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
                    <Show when={factory.canResume()}>
                      <span class="fc-tag danger">PAUSADA / FALHA</span>
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
                              onClick={() => void authorizeGate()}
                            >
                              Autorizar gate
                            </button>
                          </Show>
                          <Show when={s().is_gate && (s().status === "awaiting_gate" || s().status === "done")}>
                            <button
                              type="button"
                              class="fc-btn-sec"
                              disabled={factory.busy()}
                              onClick={() => openGateRedo(s().stage_def_id)}
                            >
                              Refazer entrega
                            </button>
                          </Show>
                          <Show when={factory.canResume() && s().stage_def_id === factory.currentStage()?.stage_def_id}>
                            <button
                              type="button"
                              class="fc-btn-sec"
                              disabled={factory.busy()}
                              onClick={async () => {
                                try {
                                  await factory.resume();
                                  showToast("Esteira retomada.");
                                } catch {
                                  showToast(factory.error() || "Falha ao retomar");
                                }
                              }}
                            >
                              Retomar
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
                    <p>Arquivos textuais do workspace · leitura e gravação reais.</p>
                  </div>
                </div>
                <ArtifactsPanel projectId={props.projectId} mode="docs" onToast={showToast} />
              </Show>

              <Show when={subview() === "files"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">Arquivos</p>
                    <h1>Arquivos do workspace</h1>
                    <p>Inventário completo em disco (texto e binário).</p>
                  </div>
                </div>
                <ArtifactsPanel projectId={props.projectId} mode="files" onToast={showToast} />
              </Show>

              <Show when={subview() === "access"}>
                <div class="fc-page-head is-slim">
                  <div>
                    <p class="fc-micro">Acesso seguro</p>
                    <h1>Acessos</h1>
                  </div>
                </div>
                <AccessPanel projectId={props.projectId} onToast={showToast} />
              </Show>

              <Show when={subview() === "qa"}>
                <div class="fc-page-head">
                  <div>
                    <p class="fc-micro">QA</p>
                    <h1>Completion Guard & QA</h1>
                  </div>
                </div>
                <QaPanel projectId={props.projectId} onToast={showToast} />
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
                <RoadmapPanel
                  projectId={props.projectId}
                  stages={stages()}
                  templateCode={factory.run()?.template_code}
                  onRedoStage={(id) => openGateRedo(id)}
                />
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
            <ChatPanel
              projectId={props.projectId}
              projectName={props.projectName}
              stages={stages()}
              currentAgent={factory.currentStage()?.agent}
              onToast={showToast}
            />
          </div>
        </section>
      </main>

      <div class={`fc-toast ${toast() ? "show" : ""}`} role="status">
        {toast()}
      </div>
      <RedoDialog
        open={redoMode() !== null}
        mode={redoMode() === "project" ? "project" : "gate"}
        busy={factory.busy()}
        model={String(factory.run()?.meta?.model || "claude-opus-5-5")}
        effort={String(factory.run()?.meta?.effort || "xhigh")}
        onClose={() => setRedoMode(null)}
        onSubmit={async (body) => {
          const mode = redoMode();
          try {
            if (mode === "project") {
              await factory.restartRun(body);
              showToast("Esteira reiniciada no Gate 0. A execução automática só segue depois que você autorizar.");
            } else {
              const id = redoStageId() || factory.currentStage()?.stage_def_id;
              if (!id) {
                showToast("Selecione um gate para refazer.");
              } else {
                await factory.redoGate(id, body);
                showToast("Entrega reaberta. Os arquivos serão reescritos na próxima execução.");
                if (autoOn()) void pumpAuto();
              }
            }
            setRedoMode(null);
          } catch {
            showToast(factory.error() || "Não foi possível refazer");
          }
        }}
      />
      <ProjectAiDialog
        projectId={settingsOpen() ? props.projectId : null}
        projectName={props.projectName}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
