import { createSignal, createEffect, createMemo, onCleanup, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  tasks,
  approvals,
  selectedTaskId,
  setSelectedTaskId,
  setSelectedJobId,
  setSelectedApprovalId,
  setCurrentScreenId,
  syncTasks,
  syncLiveJobs,
  syncCockpit,
  syncApprovals,
  moveTaskPersistent,
  showToast,
  type UiTask,
} from "../../state/store";
import { TvIcon } from "../../shared/components/TvIcon";
import { api, parseApiError, type JobArtifact } from "../../shared/api/client";
import { CreateTaskModal } from "./CreateTaskModal";
import { PlanTaskModal } from "./PlanTaskModal";
import {
  TASK_COLUMNS,
  PRIORITY_FILTERS,
  columnForStatus,
  statusLabel,
  resolveColumnDrop,
  type TaskColumnKey,
} from "./taskStatus";
import "./tasks.css";

const SORT_STORAGE_KEY = "tavir.tasks.sort.v1";
type SortKey = "seq" | "created" | "priority" | "title";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "seq", label: "Número (#)" },
  { value: "created", label: "Data de criação" },
  { value: "priority", label: "Prioridade" },
  { value: "title", label: "Título" },
];

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function loadSortPrefs(): { primary: SortKey; secondary: SortKey | ""; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return { primary: "seq", secondary: "", dir: "desc" };
    const parsed = JSON.parse(raw);
    return {
      primary: (["seq", "created", "priority", "title"] as SortKey[]).includes(parsed.primary)
        ? parsed.primary
        : "seq",
      secondary: (["seq", "created", "priority", "title", ""] as Array<SortKey | "">).includes(parsed.secondary)
        ? parsed.secondary
        : "",
      dir: parsed.dir === "asc" ? "asc" : "desc",
    };
  } catch {
    return { primary: "seq", secondary: "", dir: "desc" };
  }
}

function tagValue(tags: string[] | undefined, prefix: string): string | undefined {
  const hit = (tags || []).find((t) => String(t).startsWith(prefix));
  return hit ? String(hit).slice(prefix.length) : undefined;
}

function shortJobRef(jobId?: string): string {
  if (!jobId) return "—";
  return jobId.length > 12 ? jobId.slice(0, 8) : jobId;
}

export function TasksView() {
  const navigate = useNavigate();
  const initialSort = loadSortPrefs();
  const [globalQ, setGlobalQ] = createSignal("");
  const [filterPriority, setFilterPriority] = createSignal("");
  const [filterSector, setFilterSector] = createSignal("");
  const [sortPrimary, setSortPrimary] = createSignal<SortKey>(initialSort.primary);
  const [sortSecondary, setSortSecondary] = createSignal<SortKey | "">(initialSort.secondary);
  const [sortDir, setSortDir] = createSignal<SortDir>(initialSort.dir);
  const [expanded, setExpanded] = createSignal(false);
  const [newTaskOpen, setNewTaskOpen] = createSignal(false);
  const [planModalOpen, setPlanModalOpen] = createSignal(false);
  const [taskToPlan, setTaskToPlan] = createSignal<UiTask | null>(null);
  const [actionBusy, setActionBusy] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editDesc, setEditDesc] = createSignal("");
  const [dragTaskId, setDragTaskId] = createSignal<string | null>(null);
  const [dragOverCol, setDragOverCol] = createSignal<TaskColumnKey | null>(null);
  const [taskArts, setTaskArts] = createSignal<JobArtifact[]>([]);
  const [taskArtJobId, setTaskArtJobId] = createSignal<string | null>(null);
  const [artContent, setArtContent] = createSignal("");
  const [artActive, setArtActive] = createSignal("");
  const [artLoading, setArtLoading] = createSignal(false);

  createEffect(() => {
    syncApprovals().then(() => syncTasks());
    syncLiveJobs();
    syncCockpit();
    const timer = setInterval(() => {
      syncApprovals().then(() => syncTasks());
      syncLiveJobs();
      syncCockpit();
    }, 3000);
    onCleanup(() => clearInterval(timer));
  });

  // Persistir ordenação
  createEffect(() => {
    const payload = {
      primary: sortPrimary(),
      secondary: sortSecondary(),
      dir: sortDir(),
    };
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  });

  // Esc fecha o drawer
  createEffect(() => {
    if (!selectedTaskId()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedTaskId(null);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const selectedTask = () => tasks().find((t) => t.id === selectedTaskId());

  // Carrega artefatos/resultado ao abrir o drawer
  createEffect(() => {
    const t = selectedTask();
    if (!t) {
      setTaskArts([]);
      setTaskArtJobId(null);
      setArtContent("");
      setArtActive("");
      return;
    }
    let cancelled = false;
    setArtLoading(true);
    (async () => {
      try {
        const bundle = await api.listTaskArtifacts(t.id);
        if (cancelled) return;
        const list = bundle.artifacts || [];
        setTaskArts(list);
        setTaskArtJobId(bundle.job_id || null);
        const prefer = ["execucao.md", "output.txt", "plano.md"];
        const first =
          prefer.map((n) => list.find((a) => a.name === n)).find(Boolean)?.name || list[0]?.name || "";
        setArtActive(first);
        if (first) {
          const body = await api.getTaskArtifactContent(t.id, first);
          if (cancelled) return;
          setArtContent(body.content + (body.truncated ? "\n\n… (truncado)" : ""));
        } else {
          setArtContent("");
        }
      } catch {
        if (!cancelled) {
          setTaskArts([]);
          setArtContent("");
        }
      } finally {
        if (!cancelled) setArtLoading(false);
      }
    })();
    onCleanup(() => {
      cancelled = true;
    });
  });

  const openArtifact = async (name: string) => {
    const t = selectedTask();
    if (!t) return;
    setArtActive(name);
    setArtLoading(true);
    try {
      const body = await api.getTaskArtifactContent(t.id, name);
      setArtContent(body.content + (body.truncated ? "\n\n… (truncado)" : ""));
    } catch (err) {
      setArtContent(`Erro ao ler ${name}`);
    } finally {
      setArtLoading(false);
    }
  };

  const sectorOptions = createMemo(() => {
    const set = new Set<string>();
    for (const t of tasks()) {
      if (t.sector?.trim()) set.add(t.sector.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  });

  const matchesFilters = (t: UiTask) => {
    const gq = globalQ().toLowerCase().trim();
    const prio = filterPriority();
    const sector = filterSector();
    if (prio && t.priority !== prio) return false;
    if (sector && t.sector !== sector) return false;
    if (!gq) return true;
    return `#${t.seq} ${t.title} ${t.description || ""} ${t.assignee} ${t.sector}`
      .toLowerCase()
      .includes(gq);
  };

  const sortValue = (t: UiTask, key: SortKey): string | number => {
    switch (key) {
      case "seq":
        return Number(t.seq) || 0;
      case "created":
        return t.createdAt ? Date.parse(t.createdAt) || 0 : 0;
      case "priority":
        return PRIORITY_RANK[t.priority] ?? 9;
      case "title":
        return (t.title || "").toLowerCase();
    }
  };

  const compareTasks = (a: UiTask, b: UiTask) => {
    const dir = sortDir() === "asc" ? 1 : -1;
    const keys: SortKey[] = [sortPrimary()];
    if (sortSecondary() && sortSecondary() !== sortPrimary()) keys.push(sortSecondary() as SortKey);
    for (const key of keys) {
      const va = sortValue(a, key);
      const vb = sortValue(b, key);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return (Number(a.seq) || 0) - (Number(b.seq) || 0);
  };

  const filteredCards = (colKey: TaskColumnKey) =>
    tasks()
      .filter((t) => columnForStatus(t.status) === colKey && matchesFilters(t))
      .slice()
      .sort(compareTasks);

  const openCounts = () => {
    const list = tasks();
    return {
      total: list.length,
      open: list.filter((t) => t.status !== "done").length,
      toPlan: list.filter((t) => columnForStatus(t.status) === "to_plan").length,
      planned: list.filter((t) => t.status === "planned").length,
      running: list.filter((t) => t.status === "in_progress").length,
      done: list.filter((t) => t.status === "done").length,
      filtered: list.filter(matchesFilters).length,
    };
  };

  const linkedApprovals = (taskId: string) =>
    approvals().filter((a) => a.taskId === taskId);

  const visibleTags = (t: UiTask) =>
    (t.tags || []).filter(
      (tag) =>
        !String(tag).startsWith("plan_job:") &&
        !String(tag).startsWith("exec_job:") &&
        !String(tag).startsWith("origin:") &&
        !String(tag).startsWith("depends:#") &&
        !String(tag).startsWith("depends_on:") &&
        !String(tag).startsWith("file_path:")
    );

  const priorityMeta = (prio: string) => {
    switch (prio) {
      case "critical":
        return { label: "Crítica", color: "oklch(.635 .185 27)" };
      case "high":
        return { label: "Alta", color: "oklch(.80 .155 78)" };
      case "normal":
        return { label: "Normal", color: "var(--text-muted, #aeb7c4)" };
      default:
        return { label: "Baixa", color: "#5E6878" };
    }
  };

  const goToExecucoes = (jobId?: string | null) => {
    if (jobId) setSelectedJobId(jobId);
    setCurrentScreenId("exec");
    navigate("/execucoes");
  };

  const goToAprovacoes = (approvalId?: string) => {
    if (approvalId) setSelectedApprovalId(approvalId);
    setCurrentScreenId("approvals");
    navigate("/aprovacoes");
  };

  const handleOpenPlanModal = (task: UiTask) => {
    setTaskToPlan(task);
    setPlanModalOpen(true);
  };

  /** Planejar com Paula → job origin=planning → status planning; ao concluir gera plano.md → planned */
  const handleExecutePlan = async (payload: {
    taskId: string;
    taskSeq: number;
    aiModel: string;
    modelName: string;
    effortLevel: number;
    effortLabel: string;
    orchestrator: string;
  }) => {
    if (actionBusy()) return;
    setActionBusy(true);
    try {
      const createdJob = await api.createJob({
        task_id: payload.taskId,
        project_id: "tavir-core",
        agent_id: "pm-projetos",
        model_name: payload.modelName,
        effort: payload.effortLabel,
        origin: "planning",
        command: `echo "[Paula PM · ${payload.modelName}] Plano Task #${payload.taskSeq} · esforço ${payload.effortLabel}"`,
        timeout: payload.effortLevel === 4 ? 120 : payload.effortLevel === 3 ? 90 : 60,
      });

      if (createdJob?.id) setSelectedJobId(createdJob.id);

      await syncTasks();
      await syncLiveJobs();
      await syncCockpit();

      setPlanModalOpen(false);
      showToast(
        `Paula PM iniciou o planejamento da Task #${payload.taskSeq}. Artefato plano.md será gerado.`,
        "Planejamento",
        "success"
      );
    } catch (err) {
      console.error("Erro ao iniciar planejamento:", err);
      const { status, detail } = parseApiError(err);
      showToast(detail || "Erro ao iniciar planejamento", status === 409 ? "Bloqueio" : "Erro", "error");
      if (status === 409 && /aprovação|gate|dependên/i.test(detail)) {
        setTimeout(() => goToAprovacoes(), 800);
      }
    } finally {
      setActionBusy(false);
    }
  };

  /** Iniciar execução do plano → consome model/effort do plano → in_progress → done */
  const handleStartExecution = async (task: UiTask) => {
    if (actionBusy()) return;
    setActionBusy(true);
    try {
      const modelName = tagValue(task.tags, "model:") || "Fable";
      const effortLabel = tagValue(task.tags, "effort:") || "Máximo";
      const safeTitle = task.title.replace(/"/g, "");

      const createdJob = await api.createJob({
        task_id: task.id,
        project_id: "tavir-core",
        agent_id: "pm-projetos",
        model_name: modelName,
        effort: effortLabel,
        origin: "execution",
        command: `echo "[Paula PM] Executando plano Task #${task.seq}: ${safeTitle} (${modelName} · ${effortLabel})"`,
        timeout: 180,
      });

      if (createdJob?.id) setSelectedJobId(createdJob.id);

      await syncTasks();
      await syncLiveJobs();
      await syncCockpit();

      showToast(`Execução da Task #${task.seq} iniciada com ${modelName}.`, "Execução", "success");
      goToExecucoes(createdJob?.id);
    } catch (err) {
      console.error("Erro ao iniciar execução:", err);
      const { status, detail } = parseApiError(err);
      showToast(detail || "Erro ao iniciar execução", status === 409 ? "Bloqueio" : "Erro", "error");
      if (status === 409) {
        if (/aprovação|gate|altera/i.test(detail)) setTimeout(() => goToAprovacoes(), 800);
        else if (/dependên/i.test(detail)) setTimeout(() => navigate("/bloqueios"), 800);
      }
    } finally {
      setActionBusy(false);
    }
  };

  /** Parar job ativo → volta para Planejado (ou A planejar se ainda planejava) */
  const handleStopExecution = async (task: UiTask) => {
    if (actionBusy() || !task.activeJobId) return;
    setActionBusy(true);
    try {
      await api.cancelJob(task.activeJobId);
      await syncTasks();
      await syncLiveJobs();
      await syncCockpit();
      showToast(
        task.status === "planning"
          ? `Planejamento da Task #${task.seq} interrompido. Voltou para A planejar.`
          : `Execução da Task #${task.seq} parada. Voltou para Planejado.`,
        "Parar",
        "warning"
      );
    } catch (err) {
      console.error("Erro ao parar job:", err);
      const { detail } = parseApiError(err);
      showToast(detail || "Erro ao parar execução", "Erro", "error");
      await syncTasks();
    } finally {
      setActionBusy(false);
    }
  };

  /** Drop no kanban — respeita regras de estágio (resolveColumnDrop). */
  const handleDropOnColumn = async (targetCol: TaskColumnKey) => {
    const id = dragTaskId();
    setDragOverCol(null);
    setDragTaskId(null);
    if (!id || actionBusy()) return;

    const task = tasks().find((t) => t.id === id);
    if (!task) return;

    const action = resolveColumnDrop(task, targetCol);
    if (action.type === "noop") return;
    if (action.type === "blocked") {
      showToast(action.reason, "Movimento bloqueado", "warning");
      return;
    }
    if (action.type === "start_execution") {
      await handleStartExecution(task);
      return;
    }
    if (action.type === "stop_execution") {
      await handleStopExecution(task);
      return;
    }
    if (action.type === "status") {
      await moveTaskPersistent(task.id, action.status);
      await syncCockpit();
    }
  };

  const beginEdit = (task: UiTask) => {
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditing(true);
  };

  const handleSaveEdit = async (task: UiTask) => {
    if (actionBusy()) return;
    const title = editTitle().trim();
    if (!title) {
      showToast("Título é obrigatório", "Edição", "error");
      return;
    }
    setActionBusy(true);
    try {
      await api.updateTask(task.id, {
        title,
        description: editDesc().trim() || null,
      });
      await syncTasks();
      setEditing(false);
      showToast(`Task #${task.seq} atualizada.`, "Edição", "success");
    } catch (err) {
      console.error("Erro ao editar task:", err);
      const { detail } = parseApiError(err);
      showToast(detail || "Erro ao salvar alterações", "Erro", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateTaskFromModal = async (payload: {
    title: string;
    description: string;
    priority: "Baixa" | "Normal" | "Alta" | "baixa" | "normal" | "alta";
    sector: string;
    dependsOn: string[];
    file: File | null;
  }) => {
    setActionBusy(true);
    try {
      const prioMap: Record<string, string> = {
        Baixa: "low",
        baixa: "low",
        Normal: "normal",
        normal: "normal",
        Alta: "high",
        alta: "high",
      };

      const created = await api.createTask({
        project_id: "tavir-core",
        title: payload.title,
        description: payload.description || null,
        priority: prioMap[payload.priority] || "normal",
        assignee_agent_id: "pm-projetos",
        sector: payload.sector || "Estratégia",
        status: "to_plan",
        depends_on: payload.dependsOn.length ? payload.dependsOn : null,
        tags: [],
      });

      if (payload.file && created?.id) {
        try {
          await api.uploadTaskAttachment(created.id, payload.file);
        } catch (upErr) {
          console.error("Anexo falhou após create:", upErr);
          const { detail } = parseApiError(upErr);
          showToast(
            `Task criada, mas o anexo falhou: ${detail}`,
            "Anexo",
            "warning"
          );
        }
      }

      await syncTasks();
      setNewTaskOpen(false);
      if (created?.id) setSelectedTaskId(created.id);
      showToast(`Task #${created?.seq ?? "?"} criada em A planejar.`, "Kanban", "success");
    } catch (err) {
      console.error("Erro ao criar task:", err);
      const { detail } = parseApiError(err);
      showToast(detail || "Erro ao criar task no banco de dados", "Erro", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const dependencyOptions = () =>
    tasks()
      .filter((t) => t.status !== "done" && t.seq > 0)
      .map((t) => ({ id: t.id, seq: t.seq, title: t.title }))
      .sort((a, b) => b.seq - a.seq);

  const cardBorder = (k: UiTask, isSel: boolean) => {
    if (k.awaitingApproval) return "oklch(.635 .185 27)";
    if (isSel) return "var(--flow, #6D96FF)";
    if (k.status === "planning") return "var(--teal)";
    return "rgba(244,246,242,.12)";
  };

  const primaryCta = (t: UiTask) => {
    if (t.awaitingApproval) {
      return {
        label: "Ir para Aprovações",
        tone: "danger" as const,
        onClick: () => goToAprovacoes(t.pendingApprovalId),
      };
    }
    if (t.status === "to_plan") {
      return {
        label: "Planejar",
        tone: "primary" as const,
        onClick: () => handleOpenPlanModal(t),
      };
    }
    if (t.status === "planning") {
      return {
        label: "Ver planejamento",
        tone: "secondary" as const,
        onClick: () => goToExecucoes(t.activeJobId),
      };
    }
    if (t.status === "planned") {
      return {
        label: "Iniciar execução",
        tone: "primary" as const,
        onClick: () => handleStartExecution(t),
      };
    }
    if (t.status === "in_progress") {
      return {
        label: "Abrir execução",
        tone: "secondary" as const,
        onClick: () => goToExecucoes(t.activeJobId),
      };
    }
    return null;
  };

  // Ao trocar de task selecionada, sai do modo edição
  createEffect(() => {
    selectedTaskId();
    setEditing(false);
  });

  const filtersActive = () => Boolean(globalQ().trim() || filterPriority() || filterSector());

  return (
    <div class="tv-tasks-root">
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 12px",
          display: "flex",
          "align-items": "flex-end",
          gap: "12px",
          "flex-wrap": "wrap",
        }}
      >
        <div style={{ flex: 1, "min-width": "200px" }}>
          <h1
            style={{
              margin: 0,
              "font-size": "20px",
              "font-weight": 600,
              "letter-spacing": "-0.01em",
              color: "var(--text-primary)",
            }}
          >
            Tasks
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", "font-size": "13px" }}>
            {openCounts().open} abertas · {openCounts().toPlan} a planejar · {openCounts().planned}{" "}
            planejadas · {openCounts().running} em execução · {openCounts().done} concluídas
            <Show when={filtersActive()}>
              <span style={{ color: "var(--text-muted)", "margin-left": "6px" }}>
                · {openCounts().filtered} no filtro
              </span>
            </Show>
          </p>
        </div>

        <div class="tv-tasks-filters">
          <input
            type="text"
            value={globalQ()}
            onInput={(e) => setGlobalQ(e.currentTarget.value)}
            placeholder="Buscar #ID, título ou descrição"
            style={{
              width: "240px",
              "max-width": "100%",
              height: "34px",
              padding: "0 14px",
              "border-radius": "var(--radius-pill)",
              border: "1px solid rgba(244,246,242,.16)",
              background: "var(--surface-0)",
              color: "var(--text-primary)",
              "font-size": "13px",
              outline: "none",
            }}
          />

          <select
            class="tv-tasks-filter-select"
            value={filterPriority()}
            onChange={(e) => setFilterPriority(e.currentTarget.value)}
            aria-label="Filtrar por prioridade"
          >
            <For each={[...PRIORITY_FILTERS]}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>

          <select
            class="tv-tasks-filter-select"
            value={filterSector()}
            onChange={(e) => setFilterSector(e.currentTarget.value)}
            aria-label="Filtrar por setor"
          >
            <option value="">Todos os setores</option>
            <For each={sectorOptions()}>{(s) => <option value={s}>{s}</option>}</For>
          </select>

          <select
            class="tv-tasks-filter-select"
            value={sortPrimary()}
            onChange={(e) => setSortPrimary(e.currentTarget.value as SortKey)}
            aria-label="Ordenar por"
            title="Ordenação principal (salva no navegador)"
          >
            <For each={SORT_OPTIONS}>{(o) => <option value={o.value}>Ordenar: {o.label}</option>}</For>
          </select>

          <select
            class="tv-tasks-filter-select"
            value={sortSecondary()}
            onChange={(e) => setSortSecondary((e.currentTarget.value || "") as SortKey | "")}
            aria-label="Segundo critério"
            title="Segundo critério (opcional)"
          >
            <option value="">+ 2º critério</option>
            <For each={SORT_OPTIONS.filter((o) => o.value !== sortPrimary())}>
              {(o) => <option value={o.value}>{o.label}</option>}
            </For>
          </select>

          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir() === "asc" ? "Crescente" : "Decrescente"}
            style={{
              height: "34px",
              padding: "0 12px",
              "border-radius": "var(--radius-pill)",
              border: "1px solid rgba(244,246,242,.16)",
              background: "transparent",
              color: "var(--text-secondary)",
              "font-size": "12px",
              "font-family": "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {sortDir() === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>

          <Show when={filtersActive()}>
            <button
              type="button"
              onClick={() => {
                setGlobalQ("");
                setFilterPriority("");
                setFilterSector("");
              }}
              style={{
                height: "34px",
                padding: "0 12px",
                "border-radius": "var(--radius-pill)",
                border: "1px solid rgba(244,246,242,.16)",
                background: "transparent",
                color: "var(--text-secondary)",
                "font-size": "12px",
                cursor: "pointer",
              }}
            >
              Limpar
            </button>
          </Show>

          <button
            type="button"
            onClick={() => setNewTaskOpen(true)}
            style={{
              display: "inline-flex",
              "align-items": "center",
              gap: "8px",
              height: "34px",
              padding: "0 16px",
              "border-radius": "var(--radius-pill)",
              border: "none",
              background: "var(--action-bg, var(--lime, #B7F34A))",
              color: "var(--action-fg, var(--ink-panel, #25360a))",
              "font-size": "13px",
              "font-weight": 600,
              cursor: "pointer",
            }}
          >
            <TvIcon name="plus" style={{ width: "14px", height: "14px" }} />
            Nova task
          </button>
        </div>
      </div>

      <p class="tv-tasks-hint">
        Arraste o card entre colunas — o fluxo é respeitado (ex.: Planejado → Em execução inicia o job).
        Gate humano fica em <strong>vermelho</strong> dentro de Em execução.
      </p>

      {/* 4 Colunas */}
      <div class="tv-tasks-board">
        <For each={TASK_COLUMNS}>
          {(col) => {
            const cards = () => filteredCards(col.key);
            const isOver = () => dragOverCol() === col.key;
            const dragTask = () => tasks().find((t) => t.id === dragTaskId());
            const dropPreview = () => {
              const t = dragTask();
              if (!t || !isOver()) return null;
              return resolveColumnDrop(t, col.key);
            };

            return (
              <section
                class={`tv-tasks-col ${
                  isOver()
                    ? dropPreview()?.type === "blocked"
                      ? "is-drag-over-blocked"
                      : "is-drag-over"
                    : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => {
                  if (dragOverCol() === col.key) setDragOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnColumn(col.key);
                }}
              >
                <div
                  style={{
                    padding: "12px 12px 10px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "4px",
                    "border-bottom": "1px solid rgba(244,246,242,.10)",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        "border-radius": "50%",
                        background: col.color,
                      }}
                    />
                    <span style={{ "font-weight": 600, color: "var(--text-primary)" }}>{col.label}</span>
                    <span
                      style={{
                        "font-family": "var(--font-mono)",
                        "font-size": "11px",
                        color: "var(--text-muted, #aeb7c4)",
                      }}
                    >
                      {cards().length}
                    </span>
                  </div>
                  <span style={{ "font-size": "11px", color: "var(--text-muted, #aeb7c4)" }}>{col.hint}</span>
                </div>

                <div class="tv-tasks-col-body">
                  <For each={cards()}>
                    {(k) => {
                      const prio = () => priorityMeta(k.priority);
                      const isSel = () => selectedTaskId() === k.id;
                      const awaiting = () => Boolean(k.awaitingApproval);
                      const escalated = () => Boolean(k.escalation && String(k.escalation).trim());
                      const hasGate = () => (k.gates || []).length > 0;
                      const isDragging = () => dragTaskId() === k.id;

                      return (
                        <div
                          class={`tv-tasks-card ${isDragging() ? "is-dragging" : ""}`}
                          tabIndex={0}
                          draggable={k.status !== "planning"}
                          onDragStart={(e) => {
                            setDragTaskId(k.id);
                            e.dataTransfer?.setData("text/plain", k.id);
                            e.dataTransfer!.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDragTaskId(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => setSelectedTaskId(k.id)}
                          style={{
                            border: `1px solid ${cardBorder(k, isSel())}`,
                            background: awaiting()
                              ? "rgba(180, 40, 40, 0.18)"
                              : "var(--surface-1, #121c30)",
                            "box-shadow": awaiting()
                              ? "0 0 0 1px oklch(.635 .185 27 / 0.45)"
                              : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              "align-items": "center",
                              gap: "8px",
                              "font-size": "11px",
                            }}
                          >
                            <span
                              style={{
                                "font-family": "var(--font-mono)",
                                "font-size": "12px",
                                "font-weight": 500,
                                color: "var(--text-primary)",
                              }}
                            >
                              #{k.seq}
                            </span>
                            <span style={{ color: prio().color, "font-weight": 600 }}>{prio().label}</span>
                            <span
                              style={{
                                color: "var(--text-muted, #aeb7c4)",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                                "white-space": "nowrap",
                              }}
                            >
                              {k.sector}
                            </span>
                          </div>

                          <div class="tv-tasks-card-title">{k.title}</div>

                          <div class="tv-tasks-chip-row">
                            <Show when={k.status === "planning"}>
                              <span class="tv-tasks-chip is-teal">
                                <span class="tv-tasks-chip-dot is-pulse" />
                                planejando…
                              </span>
                            </Show>
                            <Show when={k.status === "in_progress" && k.activeJobId && !awaiting()}>
                              <span class="tv-tasks-chip is-teal">
                                <span class="tv-tasks-chip-dot" />
                                job ativo
                              </span>
                            </Show>
                            <Show when={tagValue(k.tags, "plan:") === "ready" && k.status === "planned"}>
                              <span class="tv-tasks-chip is-lime">plano pronto</span>
                            </Show>
                            <Show when={awaiting()}>
                              <span class="tv-tasks-chip is-danger">
                                <TvIcon name="octagon-alert" width="10" height="10" />
                                Aguardando aprovação
                              </span>
                            </Show>
                            <Show when={Boolean(k.pendingHomologation)}>
                              <span
                                class="tv-tasks-chip is-warn"
                                style={{ cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToAprovacoes(k.pendingApprovalId);
                                }}
                              >
                                homologação
                              </span>
                            </Show>
                            <Show when={escalated() && !awaiting()}>
                              <span class="tv-tasks-chip is-danger">escalado</span>
                            </Show>
                            <Show when={hasGate() && !awaiting()}>
                              <span class="tv-tasks-chip is-warn">gate</span>
                            </Show>
                            <Show when={(k.dependsOn || []).length > 0}>
                              <span class="tv-tasks-chip is-warn">
                                deps {(k.dependsOn || []).map((d) => `#${d}`).join(" ")}
                              </span>
                            </Show>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              "align-items": "center",
                              gap: "10px",
                              "font-size": "11px",
                              color: "var(--text-muted, #aeb7c4)",
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>{k.assignee}</span>
                          </div>
                        </div>
                      );
                    }}
                  </For>

                  <Show when={cards().length === 0}>
                    <div class="tv-tasks-empty">
                      <span>
                        {filtersActive()
                          ? "Nenhuma task com este filtro"
                          : "Nenhuma task nesta coluna"}
                      </span>
                      <Show when={col.key === "to_plan" && !filtersActive()}>
                        <button type="button" class="tv-tasks-empty-btn" onClick={() => setNewTaskOpen(true)}>
                          Nova task
                        </button>
                      </Show>
                      <Show when={filtersActive()}>
                        <button
                          type="button"
                          class="tv-tasks-empty-btn"
                          style={{ background: "transparent", border: "1px solid rgba(244,246,242,.2)", color: "var(--text-primary)" }}
                          onClick={() => {
                            setGlobalQ("");
                            setFilterPriority("");
                            setFilterSector("");
                          }}
                        >
                          Limpar filtros
                        </button>
                      </Show>
                    </div>
                  </Show>
                </div>
              </section>
            );
          }}
        </For>
      </div>

      {/* Drawer */}
      <Show when={selectedTask()}>
        {(t) => {
          const prio = () => priorityMeta(t().priority);
          const cta = () => primaryCta(t());

          return (
            <>
              <div
                onClick={() => setSelectedTaskId(null)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(7,12,22,.62)",
                  "backdrop-filter": "blur(2px)",
                  "z-index": 40,
                }}
              />

              <aside
                role="dialog"
                aria-label="Detalhamento da task"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: expanded() ? "720px" : "480px",
                  "max-width": "100%",
                  background: "var(--surface-ink, #0f1729)",
                  "border-left": t().awaitingApproval
                    ? "2px solid oklch(.635 .185 27)"
                    : "1px solid rgba(244,246,242,.16)",
                  display: "flex",
                  "flex-direction": "column",
                  "box-shadow": "-20px 0 40px rgba(0,0,0,0.35)",
                  "z-index": 50,
                  transition: "width var(--duration-standard) var(--ease-standard)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "10px",
                    padding: "14px 20px",
                    "border-bottom": "1px solid rgba(244,246,242,.10)",
                  }}
                >
                  <span style={{ "font-family": "var(--font-mono)", "font-size": "13px", "font-weight": 500 }}>
                    #{t().seq}
                  </span>
                  <span style={{ "font-size": "12px", "font-weight": 600, color: prio().color }}>
                    Prioridade {prio().label}
                  </span>
                  <span
                    style={{
                      "font-size": "11px",
                      padding: "2px 8px",
                      "border-radius": "999px",
                      background: "rgba(244,246,242,.08)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {statusLabel(t().status)}
                  </span>
                  <span style={{ flex: 1 }} />

                  <Show when={cta()}>
                    {(c) => (
                      <button
                        type="button"
                        disabled={actionBusy()}
                        onClick={() => c().onClick()}
                        style={{
                          height: "28px",
                          padding: "0 12px",
                          "border-radius": "var(--radius-pill)",
                          border: c().tone === "secondary" ? "1px solid rgba(244,246,242,.16)" : "none",
                          background:
                            c().tone === "danger"
                              ? "oklch(.635 .185 27)"
                              : c().tone === "primary"
                                ? "var(--lime, #B7F34A)"
                                : "transparent",
                          color:
                            c().tone === "danger"
                              ? "#fff"
                              : c().tone === "primary"
                                ? "#0B1220"
                                : "var(--text-primary)",
                          "font-weight": 600,
                          cursor: actionBusy() ? "wait" : "pointer",
                          "font-size": "12px",
                          display: "flex",
                          "align-items": "center",
                          gap: "6px",
                          opacity: actionBusy() ? 0.7 : 1,
                        }}
                      >
                        <Show when={c().tone === "primary"}>
                          <TvIcon name="sparkles" width="13" height="13" />
                        </Show>
                        {c().label}
                      </button>
                    )}
                  </Show>

                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded())}
                    style={{
                      height: "28px",
                      padding: "0 10px",
                      "border-radius": "var(--radius-pill)",
                      border: "1px solid rgba(244,246,242,.16)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      "font-size": "12px",
                      display: "flex",
                      "align-items": "center",
                      gap: "6px",
                    }}
                  >
                    <TvIcon name="maximize" width="12" height="12" />
                    {expanded() ? "Reduzir" : "Ampliar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(null)}
                    style={{
                      height: "28px",
                      padding: "0 10px",
                      "border-radius": "var(--radius-pill)",
                      border: "1px solid rgba(244,246,242,.16)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      "font-size": "12px",
                    }}
                  >
                    Fechar · Esc
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    "overflow-y": "auto",
                    padding: "20px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "20px",
                  }}
                >
                  <Show
                    when={editing() && t().status === "to_plan"}
                    fallback={
                      <div style={{ display: "flex", "align-items": "flex-start", gap: "10px" }}>
                        <h2
                          style={{
                            margin: 0,
                            flex: 1,
                            "font-size": "18px",
                            "font-weight": 600,
                            "line-height": 1.35,
                            color: "var(--text-primary)",
                          }}
                        >
                          {t().title}
                        </h2>
                        <Show when={t().status === "to_plan"}>
                          <button
                            type="button"
                            onClick={() => beginEdit(t())}
                            style={{
                              height: "28px",
                              padding: "0 10px",
                              "border-radius": "var(--radius-pill)",
                              border: "1px solid rgba(244,246,242,.16)",
                              background: "transparent",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              "font-size": "12px",
                            }}
                          >
                            Editar
                          </button>
                        </Show>
                      </div>
                    }
                  >
                    <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                      <input
                        value={editTitle()}
                        onInput={(e) => setEditTitle(e.currentTarget.value)}
                        style={{
                          height: "36px",
                          padding: "0 12px",
                          "border-radius": "10px",
                          border: "1px solid rgba(244,246,242,.16)",
                          background: "var(--surface-1, #121c30)",
                          color: "var(--text-primary)",
                          "font-size": "15px",
                          "font-weight": 600,
                          outline: "none",
                        }}
                      />
                      <textarea
                        value={editDesc()}
                        onInput={(e) => setEditDesc(e.currentTarget.value)}
                        rows={5}
                        style={{
                          padding: "12px",
                          "border-radius": "10px",
                          border: "1px solid rgba(244,246,242,.16)",
                          background: "var(--surface-1, #121c30)",
                          color: "var(--text-primary)",
                          "font-size": "13px",
                          "line-height": 1.5,
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          disabled={actionBusy()}
                          onClick={() => handleSaveEdit(t())}
                          style={{
                            height: "30px",
                            padding: "0 14px",
                            "border-radius": "999px",
                            border: "none",
                            background: "var(--lime, #B7F34A)",
                            color: "#0B1220",
                            "font-weight": 600,
                            "font-size": "12px",
                            cursor: "pointer",
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          style={{
                            height: "30px",
                            padding: "0 14px",
                            "border-radius": "999px",
                            border: "1px solid rgba(244,246,242,.16)",
                            background: "transparent",
                            color: "var(--text-primary)",
                            "font-size": "12px",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </Show>

                  <Show when={t().awaitingApproval}>
                    <div
                      style={{
                        padding: "12px 14px",
                        "border-radius": "12px",
                        background: "oklch(.635 .185 27 / 0.18)",
                        border: "1px solid oklch(.635 .185 27 / 0.55)",
                        color: "oklch(.82 .14 27)",
                        "font-size": "13px",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "10px",
                      }}
                    >
                      <strong>Aguardando aprovação humana</strong>
                      <span style={{ "font-size": "12px", opacity: 0.9 }}>
                        A execução permanece listada em Execuções. Decida em Aprovações para desbloquear.
                      </span>
                      <button
                        type="button"
                        onClick={() => goToAprovacoes(t().pendingApprovalId)}
                        style={{
                          "align-self": "flex-start",
                          height: "30px",
                          padding: "0 14px",
                          "border-radius": "999px",
                          border: "none",
                          background: "oklch(.635 .185 27)",
                          color: "#fff",
                          "font-weight": 600,
                          "font-size": "12px",
                          cursor: "pointer",
                        }}
                      >
                        Ir para Aprovações →
                      </button>
                    </div>
                  </Show>

                  <Show when={!editing()}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Detalhamento da solicitação
                      </span>
                      <div
                        style={{
                          padding: "14px",
                          "border-radius": "14px",
                          background: "var(--surface-1, #121c30)",
                          border: "1px solid rgba(244,246,242,.12)",
                          "line-height": 1.6,
                          "white-space": "pre-wrap",
                          color: "var(--text-primary)",
                        }}
                      >
                        {t().description || "Sem descrição adicional registrada."}
                      </div>
                    </div>
                  </Show>

                  <Show when={t().status === "planned" || t().status === "in_progress" || t().status === "done"}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Plano da Paula
                      </span>
                      <div
                        style={{
                          padding: "14px",
                          "border-radius": "14px",
                          background: "var(--surface-1, #121c30)",
                          border: "1px solid rgba(244,246,242,.12)",
                          display: "grid",
                          "grid-template-columns": "1fr 1fr",
                          gap: "10px",
                          "font-size": "12px",
                        }}
                      >
                        <div>
                          <div style={{ color: "var(--text-muted, #aeb7c4)", "font-size": "10px" }}>Modelo</div>
                          <div style={{ "font-weight": 600, color: "var(--teal)" }}>
                            {tagValue(t().tags, "model:") || "Fable"}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--text-muted, #aeb7c4)", "font-size": "10px" }}>Esforço</div>
                          <div style={{ "font-weight": 600 }}>{tagValue(t().tags, "effort:") || "Máximo"}</div>
                        </div>
                        <div style={{ "grid-column": "1 / -1" }}>
                          <div style={{ color: "var(--text-muted, #aeb7c4)", "font-size": "10px" }}>Handoffs</div>
                          <div style={{ "margin-top": "2px", color: "var(--text-secondary)" }}>
                            {(t().handoffs || []).join(" · ") || "Paula PM → Especialistas"}
                          </div>
                        </div>
                        <Show when={(t().gates || []).length > 0}>
                          <div style={{ "grid-column": "1 / -1" }}>
                            <div style={{ color: "var(--text-muted, #aeb7c4)", "font-size": "10px" }}>Gates</div>
                            <div style={{ "margin-top": "2px", color: "oklch(.80 .155 78)" }}>
                              {(t().gates || []).join(" · ")}
                            </div>
                          </div>
                        </Show>
                        <Show when={tagValue(t().tags, "plan:") === "ready"}>
                          <div
                            style={{
                              "grid-column": "1 / -1",
                              "font-size": "11px",
                              color: "var(--teal)",
                              "font-weight": 600,
                            }}
                          >
                            ✓ plano.md gerado no workspace
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Show>

                  <Show when={(t().dependsOn || []).length > 0}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Dependências
                      </span>
                      <div style={{ display: "flex", "flex-wrap": "wrap", gap: "6px" }}>
                        <For each={t().dependsOn || []}>
                          {(dep) => {
                            const linked = () => tasks().find((x) => String(x.seq) === String(dep) || x.id === dep);
                            return (
                              <button
                                type="button"
                                class="tv-tasks-tag"
                                onClick={() => {
                                  const L = linked();
                                  if (L) setSelectedTaskId(L.id);
                                }}
                                style={{ cursor: linked() ? "pointer" : "default" }}
                                title={linked()?.title || `Dependência #${dep}`}
                              >
                                #{dep}
                                <Show when={linked()}>
                                  <span style={{ "margin-left": "4px", opacity: 0.7 }}>
                                    · {statusLabel(linked()!.status)}
                                  </span>
                                </Show>
                              </button>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <Show when={visibleTags(t()).length > 0}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Tags
                      </span>
                      <div style={{ display: "flex", "flex-wrap": "wrap", gap: "6px" }}>
                        <For each={visibleTags(t()).filter((tag) => !String(tag).startsWith("depends:#"))}>
                          {(tag) => <span class="tv-tasks-tag">{tag}</span>}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <Show when={linkedApprovals(t().id).length > 0}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Aprovações vinculadas
                      </span>
                      <For each={linkedApprovals(t().id)}>
                        {(ap) => (
                          <button
                            type="button"
                            onClick={() => goToAprovacoes(ap.id)}
                            style={{
                              width: "100%",
                              "text-align": "left",
                              padding: "10px 12px",
                              "border-radius": "12px",
                              border:
                                ap.status === "pending"
                                  ? "1px solid oklch(.635 .185 27 / 0.55)"
                                  : "1px solid rgba(244,246,242,.12)",
                              background:
                                ap.status === "pending"
                                  ? "oklch(.635 .185 27 / 0.12)"
                                  : "var(--surface-1, #121c30)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              display: "flex",
                              "flex-direction": "column",
                              gap: "4px",
                            }}
                          >
                            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                              <span style={{ "font-weight": 600, "font-size": "13px", flex: 1 }}>
                                {ap.title}
                              </span>
                              <span
                                style={{
                                  "font-size": "10px",
                                  "font-weight": 600,
                                  color:
                                    ap.status === "pending"
                                      ? "oklch(.78 .16 27)"
                                      : ap.status === "approved"
                                        ? "var(--teal)"
                                        : "var(--text-muted)",
                                }}
                              >
                                {ap.status === "pending"
                                  ? "Pendente"
                                  : ap.status === "approved"
                                    ? "Aprovada"
                                    : "Rejeitada"}
                              </span>
                            </div>
                            <span style={{ "font-size": "11px", color: "var(--text-muted)" }}>
                              {ap.type} · {ap.impact} · abrir em Aprovações →
                            </span>
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>

                  <div
                    class="tv-tasks-meta-grid"
                    style={{
                      display: "grid",
                      "grid-template-columns": "1fr 1fr",
                      border: "1px solid rgba(244,246,242,.12)",
                      "border-radius": "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        "border-right": "1px solid rgba(244,246,242,.12)",
                        "border-bottom": "1px solid rgba(244,246,242,.12)",
                        "min-height": "58px",
                      }}
                    >
                      <div style={{ "font-size": "11px", "line-height": "1.35", color: "var(--text-muted, #aeb7c4)" }}>
                        Responsável
                      </div>
                      <div style={{ "margin-top": "4px", "font-weight": 500, "line-height": "1.45", "font-size": "13px" }}>
                        {t().assignee}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "12px 14px",
                        "border-bottom": "1px solid rgba(244,246,242,.12)",
                        "min-height": "58px",
                      }}
                    >
                      <div style={{ "font-size": "11px", "line-height": "1.35", color: "var(--text-muted, #aeb7c4)" }}>
                        Setor
                      </div>
                      <div style={{ "margin-top": "4px", "font-weight": 500, "line-height": "1.45", "font-size": "13px" }}>
                        {t().sector}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "12px 14px",
                        "border-right": "1px solid rgba(244,246,242,.12)",
                        "min-height": "58px",
                      }}
                    >
                      <div style={{ "font-size": "11px", "line-height": "1.35", color: "var(--text-muted, #aeb7c4)" }}>
                        Status
                      </div>
                      <div
                        style={{
                          "margin-top": "4px",
                          "font-weight": 600,
                          "line-height": "1.45",
                          "font-size": "13px",
                          color: "var(--lime, #B7F34A)",
                        }}
                      >
                        {statusLabel(t().status)}
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px", "min-height": "58px" }}>
                      <div style={{ "font-size": "11px", "line-height": "1.35", color: "var(--text-muted, #aeb7c4)" }}>
                        Escalação
                      </div>
                      <div
                        style={{
                          "margin-top": "4px",
                          "font-weight": 500,
                          "line-height": "1.45",
                          "font-size": "13px",
                          color: t().escalation ? "oklch(.635 .185 27)" : "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        {t().escalation || "Nenhuma"}
                      </div>
                    </div>
                  </div>

                  {/* CTAs de estágio */}
                  <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                    <span
                      style={{
                        "font-family": "var(--font-mono)",
                        "font-size": "11px",
                        "font-weight": 500,
                        "letter-spacing": "0.14em",
                        "text-transform": "uppercase",
                        color: "var(--text-muted, #aeb7c4)",
                      }}
                    >
                      Próxima ação
                    </span>
                    <div
                      style={{
                        padding: "16px",
                        "border-radius": "14px",
                        border: "1px solid rgba(244,246,242,.12)",
                        background: "var(--surface-1, #121c30)",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "12px",
                      }}
                    >
                      <Show when={t().status === "to_plan"}>
                        <p style={{ margin: 0, "font-size": "13px", color: "var(--text-secondary)" }}>
                          Paula PM estrutura o plano e despacha para os agentes. Depois o card vai para{" "}
                          <strong style={{ color: "var(--text-primary)" }}>Planejado</strong>.
                        </p>
                        <button
                          type="button"
                          disabled={actionBusy()}
                          onClick={() => handleOpenPlanModal(t())}
                          style={{
                            "align-self": "flex-start",
                            height: "32px",
                            padding: "0 16px",
                            "border-radius": "var(--radius-pill)",
                            border: "none",
                            background: "var(--lime, #B7F34A)",
                            color: "#0B1220",
                            "font-weight": 600,
                            "font-size": "12px",
                            cursor: "pointer",
                            display: "flex",
                            "align-items": "center",
                            gap: "6px",
                          }}
                        >
                          <TvIcon name="sparkles" width="14" height="14" />
                          Planejar com Paula
                        </button>
                      </Show>

                      <Show when={t().status === "planning"}>
                        <p style={{ margin: 0, "font-size": "13px", color: "var(--text-secondary)" }}>
                          Planejamento em curso. Ao finalizar, o card move automaticamente para{" "}
                          <strong style={{ color: "var(--text-primary)" }}>Planejado</strong>.
                        </p>
                        <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
                          <button
                            type="button"
                            onClick={() => goToExecucoes(t().activeJobId)}
                            style={{
                              height: "32px",
                              padding: "0 16px",
                              "border-radius": "var(--radius-pill)",
                              border: "1px solid rgba(244,246,242,.16)",
                              background: "transparent",
                              color: "var(--text-primary)",
                              "font-weight": 600,
                              "font-size": "12px",
                              cursor: "pointer",
                            }}
                          >
                            Acompanhar em Execuções →
                          </button>
                          <Show when={t().activeJobId}>
                            <button
                              type="button"
                              disabled={actionBusy()}
                              onClick={() => handleStopExecution(t())}
                              style={{
                                height: "32px",
                                padding: "0 16px",
                                "border-radius": "var(--radius-pill)",
                                border: "1px solid oklch(.635 .185 27 / 0.5)",
                                background: "transparent",
                                color: "oklch(.78 .16 27)",
                                "font-weight": 600,
                                "font-size": "12px",
                                cursor: "pointer",
                              }}
                            >
                              Parar planejamento
                            </button>
                          </Show>
                        </div>
                      </Show>

                      <Show when={t().status === "planned"}>
                        <p style={{ margin: 0, "font-size": "13px", color: "var(--text-secondary)" }}>
                          Plano pronto. Ao iniciar, a execução usa agentes, modelo e esforço definidos pela Paula.
                        </p>
                        <button
                          type="button"
                          disabled={actionBusy()}
                          onClick={() => handleStartExecution(t())}
                          style={{
                            "align-self": "flex-start",
                            height: "32px",
                            padding: "0 16px",
                            "border-radius": "var(--radius-pill)",
                            border: "none",
                            background: "var(--lime, #B7F34A)",
                            color: "#0B1220",
                            "font-weight": 600,
                            "font-size": "12px",
                            cursor: "pointer",
                            display: "flex",
                            "align-items": "center",
                            gap: "6px",
                          }}
                        >
                          <TvIcon name="play" width="14" height="14" />
                          Iniciar execução
                        </button>
                      </Show>

                      <Show when={t().status === "in_progress"}>
                        <p style={{ margin: 0, "font-size": "13px", color: "var(--text-secondary)" }}>
                          Execução ativa. Ao concluir, o card vai para{" "}
                          <strong style={{ color: "var(--text-primary)" }}>Concluído</strong>. Parar
                          devolve o card para <strong style={{ color: "var(--text-primary)" }}>Planejado</strong>.
                        </p>
                        <div style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
                          <button
                            type="button"
                            onClick={() => goToExecucoes(t().activeJobId)}
                            style={{
                              height: "32px",
                              padding: "0 16px",
                              "border-radius": "var(--radius-pill)",
                              border: "1px solid rgba(244,246,242,.16)",
                              background: "transparent",
                              color: "var(--text-primary)",
                              "font-weight": 600,
                              "font-size": "12px",
                              cursor: "pointer",
                            }}
                          >
                            Abrir execução →
                          </button>
                          <Show when={t().activeJobId}>
                            <button
                              type="button"
                              disabled={actionBusy()}
                              onClick={() => handleStopExecution(t())}
                              style={{
                                height: "32px",
                                padding: "0 16px",
                                "border-radius": "var(--radius-pill)",
                                border: "1px solid oklch(.635 .185 27 / 0.5)",
                                background: "oklch(.635 .185 27 / 0.15)",
                                color: "oklch(.78 .16 27)",
                                "font-weight": 600,
                                "font-size": "12px",
                                cursor: "pointer",
                              }}
                            >
                              Parar execução
                            </button>
                          </Show>
                        </div>
                      </Show>

                      <Show when={t().status === "done"}>
                        <p style={{ margin: 0, "font-size": "13px", color: "var(--text-secondary)" }}>
                          Task concluída.
                        </p>
                      </Show>
                    </div>
                  </div>

                  <Show when={taskArts().length > 0 || artLoading()}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Resultado / arquivos gerados
                      </span>
                      <div
                        style={{
                          border: "1px solid rgba(244,246,242,.12)",
                          "border-radius": "14px",
                          background: "var(--surface-1, #121c30)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            padding: "10px 12px",
                            "border-bottom": "1px solid rgba(244,246,242,.10)",
                            "flex-wrap": "wrap",
                          }}
                        >
                          <For each={taskArts()}>
                            {(a) => (
                              <button
                                type="button"
                                onClick={() => openArtifact(a.name)}
                                style={{
                                  height: "26px",
                                  padding: "0 10px",
                                  "border-radius": "6px",
                                  border:
                                    artActive() === a.name
                                      ? "1px solid rgba(27,197,189,.45)"
                                      : "1px solid rgba(244,246,242,.12)",
                                  background:
                                    artActive() === a.name ? "rgba(27,197,189,.12)" : "transparent",
                                  color: artActive() === a.name ? "var(--teal)" : "var(--text-secondary)",
                                  "font-family": "var(--font-mono)",
                                  "font-size": "11px",
                                  cursor: "pointer",
                                }}
                              >
                                {a.name}
                              </button>
                            )}
                          </For>
                          <Show when={taskArtJobId()}>
                            <button
                              type="button"
                              onClick={() => goToExecucoes(taskArtJobId()!)}
                              style={{
                                height: "26px",
                                padding: "0 10px",
                                "border-radius": "6px",
                                border: "1px solid rgba(244,246,242,.12)",
                                background: "transparent",
                                color: "var(--teal)",
                                "font-size": "11px",
                                cursor: "pointer",
                                "margin-left": "auto",
                              }}
                            >
                              Abrir em Execuções →
                            </button>
                          </Show>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "12px 14px",
                            "max-height": "280px",
                            overflow: "auto",
                            "font-family": "var(--font-mono)",
                            "font-size": "11px",
                            "line-height": "1.55",
                            color: "var(--text-secondary, #cbd3de)",
                            "white-space": "pre-wrap",
                            background: "#070c16",
                          }}
                        >
                          {artLoading() ? "Carregando…" : artContent() || "Sem conteúdo neste arquivo."}
                        </pre>
                      </div>
                    </div>
                  </Show>

                  <Show when={t().activeJobId || taskArtJobId()}>
                    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
                      <span
                        style={{
                          "font-family": "var(--font-mono)",
                          "font-size": "11px",
                          "font-weight": 500,
                          "letter-spacing": "0.14em",
                          "text-transform": "uppercase",
                          color: "var(--text-muted, #aeb7c4)",
                        }}
                      >
                        Execução vinculada
                      </span>
                      <button
                        type="button"
                        onClick={() => goToExecucoes(t().activeJobId || taskArtJobId() || undefined)}
                        title={t().activeJobId || taskArtJobId() || ""}
                        style={{
                          width: "100%",
                          "text-align": "left",
                          padding: "12px",
                          "border-radius": "14px",
                          border: "1px solid rgba(244,246,242,.12)",
                          background: "var(--surface-1, #121c30)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          display: "flex",
                          "align-items": "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            "border-radius": "50%",
                            background: "var(--teal)",
                            flex: "none",
                          }}
                        />
                        <span style={{ "font-family": "var(--font-mono)", "font-weight": 500 }}>
                          Job {shortJobRef(t().activeJobId || taskArtJobId() || undefined)}
                        </span>
                        <span style={{ flex: 1 }} />
                        <span style={{ color: "var(--teal)", "font-size": "12px" }}>abrir execução →</span>
                      </button>
                    </div>
                  </Show>
                </div>
              </aside>
            </>
          );
        }}
      </Show>

      <CreateTaskModal
        isOpen={newTaskOpen()}
        submitting={actionBusy()}
        dependencyOptions={dependencyOptions()}
        onClose={() => !actionBusy() && setNewTaskOpen(false)}
        onCreate={handleCreateTaskFromModal}
      />

      <PlanTaskModal
        task={taskToPlan()}
        isOpen={planModalOpen()}
        submitting={actionBusy()}
        onClose={() => !actionBusy() && setPlanModalOpen(false)}
        onConfirmPlan={handleExecutePlan}
      />
    </div>
  );
}
