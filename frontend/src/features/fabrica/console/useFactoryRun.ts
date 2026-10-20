import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import {
  api,
  type FactoryLedgerEntry,
  type FactoryRunPayload,
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
            : e.action === "authorized" || e.kind === "gate"
              ? ("warn" as const)
              : ("ok" as const),
      }));
  });

  const canAuthorize = createMemo(() => {
    const s = currentStage();
    return !!s && s.is_gate && s.status === "awaiting_gate";
  });

  const canComplete = createMemo(() => {
    const s = currentStage();
    return !!s && !s.is_gate && s.status === "running";
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
          /* ignore bad date for display; still show */
        }
        const id = String(data.id || `${Date.now()}`);
        const action = String(data.action || "");
        const title = String(data.title || action || "Evento");
        const actor = String(data.actor || "Sistema");
        const occurred = typeof at === "string" ? at : undefined;
        setLiveFeed((prev) => {
          if (prev.some((p) => p.id === id)) return prev;
          const tone: "ok" | "warn" | "danger" =
            action === "failed" ? "danger" : action === "authorized" ? "warn" : "ok";
          return [
            {
              id,
              title: action === "authorized" ? `Gate autorizado · ${title}` : title,
              meta: formatLedgerMeta({ id, at: occurred, actor, action, title }),
              tone,
            },
            ...prev,
          ].slice(0, 24);
        });
      },
      onStageChanged: async () => {
        // Reconcilia estado completo após mudança
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
                : e.action === "authorized"
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

  const authorize = async (note?: string) => {
    const s = currentStage();
    if (!s || !canAuthorize()) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.authorizeFactoryStage(projectId(), s.stage_def_id, {
        note,
        actor: "CEO local",
      });
      setRun(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autorizar gate");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const complete = async (note?: string) => {
    const s = currentStage();
    if (!s || !canComplete()) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.completeFactoryStage(projectId(), s.stage_def_id, { note });
      setRun(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao concluir etapa");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  return {
    run,
    loading,
    busy,
    error,
    connected,
    currentStage,
    overviewStages,
    activity,
    canAuthorize,
    canComplete,
    authorize,
    complete,
    reload: load,
  };
}
