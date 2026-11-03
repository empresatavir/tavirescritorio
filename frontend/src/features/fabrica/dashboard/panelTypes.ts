export type FabStatus = "run" | "paused" | "done";
export type FabFilter = "all" | "run" | "pend" | "paused" | "done";
export type FabSort = "pct" | "name";
export type ActKind = "gate" | "erro" | "auth";

export interface FabPend {
  id: string;
  kind: ActKind;
  t: string;
  d: string;
  who: string;
  at: string;
  btn: string;
  projId: string;
  proj: string;
  kcls: string;
  ibg: string;
  ifg: string;
  icon: string;
}

export interface FabProject {
  id: string;
  name: string;
  client: string;
  code: string;
  line: string;
  slug: string;
  status: FabStatus;
  pct: number;
  done: number;
  n: number;
  pendN: number;
  stepName: string;
  owner: string;
  think: string;
  cap: string;
  stages: string[];
  git?: string;
  kind?: string;
  due?: string;
  pathSlug?: string;
  spent?: string;
  budget?: string;
  fileN?: number;
  secN?: number;
  qaN?: number;
}

export const STAT: Record<FabStatus, [string, string, string]> = {
  run: ["Em andamento", "flow", "#1BC5BD"],
  paused: ["Pausado", "warn", "oklch(.80 .155 78)"],
  done: ["Concluído", "action", "#B7F34A"],
};

export const KIND_META: Record<ActKind, { label: string; kcls: string; ibg: string; ifg: string; icon: string }> = {
  gate: {
    label: "Gate",
    kcls: "warn",
    ibg: "var(--warning-subtle)",
    ifg: "var(--warning)",
    icon: "M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6zM9 12l2 2 4-4",
  },
  erro: {
    label: "Erro",
    kcls: "danger",
    ibg: "var(--danger-subtle)",
    ifg: "var(--danger)",
    icon: "M12 3 2 20h20zM12 10v4M12 17h.01",
  },
  auth: {
    label: "Autorização",
    kcls: "action",
    ibg: "var(--action-subtle)",
    ifg: "var(--action-subtle-text)",
    icon: "M15 9a3 3 0 1 1-3 3M12 12l-7 7M7 17l2 2M9 15l2 2",
  },
};
