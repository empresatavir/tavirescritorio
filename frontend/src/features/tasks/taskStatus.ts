/** Status canônicos do fluxo Tasks (kanban de 4 colunas). */

export type TaskStatus =
  | "to_plan"
  | "planning"
  | "planned"
  | "in_progress"
  | "done";

/** Colunas visíveis no quadro. `planning` permanece em "A planejar". */
export type TaskColumnKey = "to_plan" | "planned" | "in_progress" | "done";

export const TASK_COLUMNS: Array<{
  key: TaskColumnKey;
  label: string;
  hint: string;
  color: string;
  emptyCta?: string;
}> = [
  {
    key: "to_plan",
    label: "A planejar",
    hint: "Novas demandas e planejamento em curso",
    color: "oklch(.80 .155 78)",
    emptyCta: "Nova task",
  },
  {
    key: "planned",
    label: "Planejado",
    hint: "Plano da Paula pronto — aguarda início",
    color: "var(--teal)",
    emptyCta: undefined,
  },
  {
    key: "in_progress",
    label: "Em execução",
    hint: "Jobs ativos · gate em vermelho no card",
    color: "var(--lime)",
    emptyCta: undefined,
  },
  {
    key: "done",
    label: "Concluído",
    hint: "Entregue e validado",
    color: "var(--text-muted, #aeb7c4)",
    emptyCta: undefined,
  },
];

export const PRIORITY_FILTERS = [
  { value: "", label: "Todas prioridades" },
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
] as const;

/** Normaliza status legados do backend/seed para o contrato atual. */
export function normalizeTaskStatus(raw: string | null | undefined): TaskStatus {
  switch (raw) {
    case "to_plan":
    case "planning":
    case "planned":
    case "in_progress":
    case "done":
      return raw;
    case "pending":
    case "todo":
      return "to_plan";
    case "queued":
      return "planned";
    case "completed":
    case "succeeded":
      return "done";
    default:
      return "to_plan";
  }
}

export function columnForStatus(status: TaskStatus): TaskColumnKey {
  if (status === "planning") return "to_plan";
  return status;
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "to_plan":
      return "A planejar";
    case "planning":
      return "Planejando…";
    case "planned":
      return "Planejado";
    case "in_progress":
      return "Em execução";
    case "done":
      return "Concluído";
  }
}

/** Tasks que pedem ação no badge do SubNav (exclui concluídas). */
export function isOpenTaskStatus(status: TaskStatus): boolean {
  return status !== "done";
}

export type DropAction =
  | { type: "noop" }
  | { type: "status"; status: TaskStatus }
  | { type: "start_execution" }
  | { type: "stop_execution" }
  | { type: "blocked"; reason: string };

/**
 * Resolve o que acontece ao soltar um card em uma coluna.
 * Respeita o fluxo: A planejar → Planejar → Planejado → Iniciar → Em execução → Concluído.
 */
export function resolveColumnDrop(
  task: { status: TaskStatus; activeJobId?: string },
  targetCol: TaskColumnKey
): DropAction {
  const fromCol = columnForStatus(task.status);
  if (fromCol === targetCol) return { type: "noop" };

  if (task.status === "planning") {
    return {
      type: "blocked",
      reason: "Pare o planejamento antes de mover o card (ou aguarde o plano terminar).",
    };
  }

  // Origem: A planejar
  if (fromCol === "to_plan") {
    if (targetCol === "planned") {
      return { type: "blocked", reason: "Use Planejar com Paula para gerar o plano." };
    }
    if (targetCol === "in_progress") {
      return { type: "blocked", reason: "Planeje a task antes de iniciar a execução." };
    }
    if (targetCol === "done") {
      return { type: "blocked", reason: "Não é possível concluir sem planejar e executar." };
    }
  }

  // Origem: Planejado
  if (fromCol === "planned") {
    if (targetCol === "to_plan") return { type: "status", status: "to_plan" };
    if (targetCol === "in_progress") return { type: "start_execution" };
    if (targetCol === "done") {
      return { type: "blocked", reason: "Inicie a execução antes de concluir." };
    }
  }

  // Origem: Em execução
  if (fromCol === "in_progress") {
    if (targetCol === "planned") {
      return task.activeJobId
        ? { type: "stop_execution" }
        : { type: "status", status: "planned" };
    }
    if (targetCol === "done") return { type: "status", status: "done" };
    if (targetCol === "to_plan") {
      return { type: "blocked", reason: "Pare a execução (volta para Planejado) antes de replanejar." };
    }
  }

  // Origem: Concluído
  if (fromCol === "done") {
    if (targetCol === "to_plan") return { type: "status", status: "to_plan" };
    if (targetCol === "planned") return { type: "status", status: "planned" };
    if (targetCol === "in_progress") {
      return { type: "blocked", reason: "Reabra em Planejado e use Iniciar execução." };
    }
  }

  return { type: "blocked", reason: "Movimento não permitido neste fluxo." };
}
