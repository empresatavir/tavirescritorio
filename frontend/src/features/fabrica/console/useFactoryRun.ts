import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import {
  api,
  type FactoryLedgerEntry,
  type FactoryRunPayload,
  type FactoryRunPendency,
  type FactoryStageInstance,
} from "../../../shared/api/client";

export type OverviewStageState = "done" | "blocked" | "queued" | "running";

function mapStageState(status: FactoryStageInstance["status"]): OverviewStageState {
  if (status === "done") return "done";
  if (status === "running") return "running";
  if (status === "awaiting_gate" || status === "blocked" || status === "failed") return "blocked";
  return "queued";
}

function formatLedgerMeta(entry: FactoryLedgerEntry): string {
  const actor = entry.actor || "Sistema";
  const at = entry.at;
  if (at && !Number.isNaN(Date.parse(at))) {
    try {
      return `${actor} · ${new Date(at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      /* fallthrough */
    }
  }
  return actor;
}

export function createFactoryRunController(projectId: Accessor<string>) {
  const [run, setRun] = createSignal<FactoryRunPayload | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [liveFeed, setLiveFeed] = createSignal<
    Array<{ id: string; title: string; meta: string; tone: "ok" | "warn" | "danger" }>
  >([]);
  const [connected, setConnected] = createSignal(false);

  let sse: AbortController | undefined;
  let gen = 0;

  const currentStage = createMemo(() => {
    const r = run();
    if (!r?.current_stage_id) return null;
    return r.stages.find((s) => s.stage_def_id === r.current_stage_id) ?? null;
  });

  const overviewStages = createMemo(() => {
    const r = run();
    if (!r) return [];
    return r.stages.map((s) => ({
      n: s.code,
      title: s.title,
      agent: s.agent || "—",
      state: mapStageState(s.status),
      hash: s.artifact_hash || undefined,
      stage_def_id: s.stage_def_id,
      is_gate: s.is_gate,
      status: s.status,
    }));
  });

  const pendencies = createMemo((): FactoryRunPendency[] => run()?.pendencies || []);

  const activity = createMemo(() => {
    const live = liveFeed();
    if (live.length) return live;
    const ledger = run()?.ledger || [];
    return [...ledger]
      .reverse()
      .slice(0, 12)
      .map((e) => ({
        id: e.id,
        title: e.title || e.action || "Evento",
        meta: formatLedgerMeta(e),
        tone:
          e.action === "failed"
            ? ("danger" as const)
            : e.action === "authorized" || e.action === "paused" || e.kind === "gate"
              ? ("warn" as const)
              : ("ok" as const),
      }));
  });

  const canAuthorize = createMemo(() => {
    const s = currentStage();
    const r = run();
    return !!s && !!r && r.status !== "done" && s.is_gate && s.status === "awaiting_gate";
  });

  const canComplete = createMemo(() => {
    const s = currentStage();
    const r = run();
    return !!s && !!r && r.status === "running" && !s.is_gate && s.status === "running";
  });

  const canExecute = createMemo(() => {
    const s = currentStage();
    const r = run();
    return !!s && !!r && r.status === "running" && !s.is_gate && s.status === "running";
  });

  const canFail = createMemo(() => {
    const s = currentStage();
    const r = run();
    return (
      !!s &&
      !!r &&
      r.status === "running" &&
      (s.status === "running" || s.status === "awaiting_gate")
    );
  });

  const canResume = createMemo(() => {
    const r = run();
    const s = currentStage();
    return !!r && r.status === "paused" && !!s;
  });

  const canPause = createMemo(() => {
    const r = run();
    return !!r && r.status === "running";
  });

  const detachSse = () => {
    sse?.abort();
    sse = undefined;
    setConnected(false);
  };

  const attachSse = (runId: string) => {
    detachSse();
    sse = api.subscribeFactoryRunEvents(runId, {
      onSnapshot: () => setConnected(true),
      onEventAppended: (data) => {
        const at = data.occurred_at;
        if (typeof at === "string" && Number.isNaN(Date.parse(at))) {
          /* ignore bad date */
        }
        const id = String(data.id || `${Date.now()}`);
        const action = String(data.action || "");
        const title = String(data.title || action || "Evento");
        const actor = String(data.actor || "Sistema");
        const occurred = typeof at === "string" ? at : undefined;
        setLiveFeed((prev) => {
          if (prev.some((p) => p.id === id)) return prev;
          const tone: "ok" | "warn" | "danger" =
            action === "failed"
              ? "danger"
              : action === "authorized" || action === "paused"
                ? "warn"
                : "ok";
          return [
            {
              id,
              title:
                action === "authorized"
                  ? `Gate autorizado · ${title}`
                  : action === "resumed"
                    ? `Retomada · ${title}`
                    : title,
              meta: formatLedgerMeta({ id, at: occurred, actor, action, title }),
              tone,
            },
            ...prev,
          ].slice(0, 24);
        });
      },
      onStageChanged: async () => {
        try {
          const next = await api.getFactoryRun(projectId());
          setRun(next);
        } catch {
          /* ignore transient */
        }
      },
      onRunCompleted: async () => {
        try {
          const next = await api.getFactoryRun(projectId());
          setRun(next);
        } catch {
          /* ignore */
        }
      },
      onError: () => setConnected(false),
    });
  };

  const load = async () => {
    const id = projectId();
    if (!id) return;
    const my = ++gen;
    setLoading(true);
    setError(null);
    try {
      const payload = await api.getFactoryRun(id);
      if (my !== gen) return;
      setRun(payload);
      const ledger = payload.ledger || [];
      setLiveFeed(
        [...ledger]
          .reverse()
          .slice(0, 24)
          .map((e) => ({
            id: e.id,
            title: e.title || e.action || "Evento",
            meta: formatLedgerMeta(e),
            tone:
              e.action === "failed"
                ? ("danger" as const)
                : e.action === "authorized" || e.action === "paused"
                  ? ("warn" as const)
                  : ("ok" as const),
          })),
      );
      attachSse(payload.id);
    } catch (err) {
      if (my !== gen) return;
      setRun(null);
      setLiveFeed([]);
      detachSse();
      setError(err instanceof Error ? err.message : "Falha ao carregar esteira");
    } finally {
      if (my === gen) setLoading(false);
    }
  };

  createEffect(() => {
    const id = projectId();
    void id;
    void load();
  });

  onCleanup(() => {
    gen += 1;
    detachSse();
  });

  const withBusy = async (fn: () => Promise<FactoryRunPayload>, errMsg: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setRun(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : errMsg);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const authorize = async (note?: string) => {
    const s = currentStage();
    if (!s || !canAuthorize()) return;
    return withBusy(
      () =>
        api.authorizeFactoryStage(projectId(), s.stage_def_id, {
          note,
          actor: "CEO local",
        }),
      "Falha ao autorizar gate",
    );
  };

  const complete = async (note?: string) => {
    const s = currentStage();
    if (!s || !canComplete()) return;
    return withBusy(
      () => api.completeFactoryStage(projectId(), s.stage_def_id, { note }),
      "Falha ao concluir etapa",
    );
  };

  const fail = async (note?: string) => {
    const s = currentStage();
    if (!s || !canFail()) return;
    return withBusy(
      () => api.failFactoryStage(projectId(), s.stage_def_id, { note }),
      "Falha ao marcar etapa",
    );
  };

  const resume = async (note?: string) => {
    if (!canResume()) return;
    const s = currentStage();
    return withBusy(
      () =>
        s
          ? api.resumeFactoryStage(projectId(), s.stage_def_id, {
              note,
              actor: "CEO local",
            })
          : api.resumeFactoryRun(projectId(), { note, actor: "CEO local" }),
      "Falha ao retomar esteira",
    );
  };

  const pause = async (note?: string) => {
    if (!canPause()) return;
    return withBusy(
      () => api.pauseFactoryRun(projectId(), { note, actor: "CEO local" }),
      "Falha ao pausar esteira",
    );
  };

  const execute = async (note?: string) => {
    const s = currentStage();
    const r = run();
    if (!s || !r) return;
    const forceIds = ((r.meta?.redo as { force_ids?: string[] } | undefined)?.force_ids) || [];
    const forced = forceIds.includes(s.stage_def_id);
    const deliveryGate =
      s.is_gate && s.status === "awaiting_gate" && (s.expected_artifacts || []).length > 0;
    if (!forced && !deliveryGate && !canExecute()) return;
    return withBusy(
      () =>
        api.executeFactoryStage(projectId(), s.stage_def_id, {
          note: note || (forced || deliveryGate ? "Entrega do agente" : undefined),
        }),
      "Falha ao executar etapa",
    );
  };

  const canAutoRun = createMemo(() => {
    const r = run();
    if (!r || r.status === "done") return false;
    const s = currentStage();
    if (!s) return false;
    const redo = (r.meta?.redo || {}) as { force_ids?: string[] };
    const forced = (redo.force_ids || []).includes(s.stage_def_id);
    if (s.is_gate || s.status === "awaiting_gate") {
      return forced && (r.status === "running" || r.status === "paused");
    }
    if (s.status === "failed") return false;
    return r.status === "running" || r.status === "paused";
  });

  const canRestart = createMemo(() => !!run());

  const redoGate = async (
    stageDefId: string,
    body: { note?: string; model?: string; effort?: string },
  ) => {
    if (!stageDefId || !run()) return;
    return withBusy(
      () =>
        api.redoFactoryGate(projectId(), stageDefId, {
          ...body,
          actor: "CEO local",
        }),
      "Falha ao refazer a entrega do gate",
    );
  };

  const restartRun = async (body: { note?: string; model?: string; effort?: string }) => {
    if (!canRestart()) return;
    return withBusy(
      () => api.restartFactoryRun(projectId(), { ...body, actor: "CEO local" }),
      "Falha ao reiniciar o projeto",
    );
  };

  const setAutoExecute = async (enabled: boolean) => {
    if (!run()) return;
    return withBusy(
      () => api.setFactoryAutoSwitch(projectId(), enabled),
      "Falha ao gravar a execução automática",
    );
  };

  const autoRun = async () => {
    if (!canAutoRun()) return;
    return withBusy(
      () =>
        api.autoExecuteFactoryRun(projectId(), {
          actor: "Executor automático",
          note: "Execução automática até o próximo gate",
        }),
      "Falha na execução automática",
    );
  };

  return {
    run,
    loading,
    busy,
    error,
    connected,
    currentStage,
    overviewStages,
    pendencies,
    activity,
    canAuthorize,
    canComplete,
    canExecute,
    canAutoRun,
    canRestart,
    canFail,
    canResume,
    canPause,
    authorize,
    complete,
    execute,
    autoRun,
    setAutoExecute,
    redoGate,
    restartRun,
    fail,
    resume,
    pause,
    reload: load,
  };
}
