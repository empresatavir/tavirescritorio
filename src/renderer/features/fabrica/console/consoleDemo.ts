import { DEMO_PENDS, DEMO_PROJECTS } from "../dashboard/demoSeed";
import { KIND_META, STAT, type FabPend, type FabProject } from "../dashboard/panelTypes";

export const ICN = {
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4",
  db: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  cms: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  shield: "M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6zM9 12l2 2 4-4",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  play: "M8 5v14l11-7z",
  folder: "M3 7h6l2 2h10v10H3z",
  chat: "M5 5h14v11H9l-4 3z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  bolt: "M13 3 5 14h6l-1 7 8-11h-6z",
  check: "M5 12.5l4.5 4.5L19 7",
  clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2",
  dot: "M12 7v6M12 17h.01",
};

/** Meridian STG row: label, owner, ini, role, dur, cost, tabs */
export const MERIDIAN_STG: Array<[string, string, string, string, string, string, Array<[string, string]>]> = [
  ["Entender", "Paula PM", "PP", "Orquestradora", "40 min", "US$ 0,30", [["resumo", "Resumo"], ["files", "Arquivos"], ["ledger", "Livro-razão"]]],
  ["Refinar", "Arquiteto de Nicho", "AN", "Arquitetura de soluções", "1 h 10", "US$ 0,90", [["resumo", "Resumo"], ["files", "Arquivos"], ["ledger", "Livro-razão"]]],
  ["Dossiê", "Dora Descoberta", "DD", "Intake e descoberta", "2 h", "US$ 1,40", [["concorrentes", "Concorrentes"], ["claims", "Claims"], ["files", "Arquivos"], ["ledger", "Livro-razão"]]],
  ["Arquitetura", "Théo Tech Lead", "TL", "Liderança técnica", "50 min", "US$ 0,60", [["arq", "Arquitetura"], ["decisoes", "Decisões técnicas"], ["files", "Arquivos"], ["ledger", "Livro-razão"]]],
  ["Construção", "Vitor Construtor", "VC", "Dev frontend sênior", "5 h 20", "US$ 5,44", [["preview", "Prévia"], ["build", "Build"], ["files", "Arquivos"], ["ledger", "Livro-razão"]]],
  ["QA", "Edna E2E", "EE", "QA end-to-end", "1 h 30", "US$ 1,10", [["guard", "Completion Guard"], ["files", "Evidências"], ["ledger", "Livro-razão"]]],
  ["Security", "Auditor Seg/LGPD", "AS", "Segurança e LGPD", "—", "—", [["checklist", "Checklist de segurança"], ["ledger", "Livro-razão"]]],
  ["SEO", "Nina SEO", "NS", "SEO técnico", "—", "—", [["checklist", "Checklist de SEO"], ["ledger", "Livro-razão"]]],
  ["Handoff", "Paulo Publicador", "PU", "Publicação e release", "—", "—", [["pacote", "Pacote de entrega"], ["ledger", "Livro-razão"]]],
];

/** GUARD: [group, title, meta, ok, evidenceId?, act?] */
export const MERIDIAN_GUARD: Array<[string, string, string, boolean, string | null, string | null]> = [
  ["Build e código", "Build sem erro", "build.log · 14:02", true, "build", null],
  ["Build e código", "Links internos", "38 links, nenhum quebrado", true, "qa", null],
  ["Build e código", "Lighthouse acima de 90", "Performance 92 · Acessibilidade 96", true, "lh", null],
  ["Prova visual", "Prova visual em 1440 px", "Yuri UX · 13:50", true, "p1440", null],
  ["Prova visual", "Prova visual em 390 px", "a hero compete com o menu", false, "p390", "preview"],
  ["SEO e segurança", "SEO assinado", "Nina termina o job-014", false, null, "seo"],
  ["SEO e segurança", "Headers de segurança", "CSP, HSTS e X-Frame", true, null, null],
  ["SEO e segurança", "Acessibilidade AA", "contraste e foco verificados", true, "qa", null],
];

const MERIDIAN_STAGE_FILES: Record<number, number> = { 0: 2, 1: 1, 2: 3, 3: 2, 4: 5, 5: 3 };
const MERIDIAN_STAGE_LEDGER: Record<number, number> = { 1: 2, 2: 1, 3: 1, 4: 1, 5: 2, 6: 4 };

export interface EsteiraNode {
  i: number;
  label: string;
  meta: string;
  icon: string;
  bg: string;
  fg: string;
  bd: string;
  sh: string;
  anim: string;
  tc: string;
  under: string;
  hasLine: boolean;
  flex: string;
  line: string;
  flow: boolean;
  pressed: boolean;
}

export interface EsteiraSel {
  n: string;
  label: string;
  owner: string;
  ini: string;
  role: string;
  dur: string;
  cost: string;
  fileN: number;
  busy: string;
  state: string;
  locked: boolean;
  waiting: boolean;
  prev: string;
  icon: string;
  ibg: string;
  ifg: string;
}

export interface EsteiraStageTab {
  id: string;
  label: string;
  hasN: boolean;
  n: string | number;
  ncls: string;
  on: boolean;
}

export interface EsteiraGuardItem {
  t: string;
  m: string;
  bg: string;
  fg: string;
  icon: string;
  hasAct: boolean;
  actLabel: string;
  hasEv: boolean;
}

export interface EsteiraGuardGroup {
  label: string;
  n: number;
  ok: number;
  items: EsteiraGuardItem[];
}

export interface EsteiraView {
  cur: number;
  signed: boolean;
  nodes: EsteiraNode[];
  sel: EsteiraSel;
  tabs: EsteiraStageTab[];
  tab: string;
  guardN: number;
  guardT: number;
  guardPct: number;
  guardColor: string;
  guardTitle: string;
  guardNote: string;
  guardBlocked: boolean;
  signLabel: string;
  guardGroups: EsteiraGuardGroup[];
}

export function buildEsteiraMeridian(stage: number, tabHint?: string): EsteiraView {
  const signed = false;
  const cur = signed ? 6 : 5;
  const guard = MERIDIAN_GUARD.map((g) => g[3]);
  const gN = guard.filter(Boolean).length;
  const gT = MERIDIAN_GUARD.length;
  const allOk = gN === gT;
  const pending = gT - gN;
  const S = MERIDIAN_STG[stage] || MERIDIAN_STG[cur];
  const tabKeys = S[6];
  const tab = tabHint && tabKeys.some((t) => t[0] === tabHint) ? tabHint : tabKeys[0][0];

  const nodes: EsteiraNode[] = MERIDIAN_STG.map((row, i) => {
    const done = i < cur;
    const now = i === cur;
    const sel = i === stage;
    return {
      i,
      label: row[0],
      meta: done ? row[4] : now ? (signed ? "em andamento" : "no gate") : row[2],
      icon: done ? ICN.check : now ? (signed ? ICN.clock : ICN.shield) : ICN.clock,
      bg: done ? "var(--flow-subtle)" : now ? "var(--warning-subtle)" : "var(--surface-0)",
      fg: done ? "var(--flow)" : now ? "var(--warning)" : "var(--text-muted)",
      bd: sel ? "var(--flow)" : done ? "var(--flow-subtle-line)" : now ? "var(--warning)" : "var(--line)",
      sh: sel ? "0 0 0 4px var(--flow-subtle)" : "none",
      anim: now ? "ringwarn 2s var(--ease) infinite" : "none",
      tc: sel ? "var(--flow)" : done || now ? "var(--text-primary)" : "var(--text-muted)",
      under: sel ? "var(--flow)" : "transparent",
      hasLine: i > 0,
      flex: i > 0 ? "1 1 0" : "0 0 auto",
      line: i <= cur ? "var(--flow)" : "var(--line)",
      flow: i === cur,
      pressed: sel,
    };
  });

  const sel: EsteiraSel = {
    n: String(stage + 1).padStart(2, "0"),
    label: S[0],
    owner: S[1],
    ini: S[2],
    role: S[3],
    dur: stage === cur && signed ? "em curso" : S[4],
    cost: S[5],
    fileN: MERIDIAN_STAGE_FILES[stage] || 0,
    busy: stage === cur ? "busy" : "",
    state: stage < cur ? "concluída" : stage === cur ? (signed ? "em andamento" : "no gate") : "aguardando",
    locked: stage >= cur,
    waiting: stage > cur,
    prev: MERIDIAN_STG[Math.max(0, stage - 1)][0],
    icon: stage < cur ? ICN.check : stage === cur ? (signed ? ICN.clock : ICN.shield) : ICN.clock,
    ibg: stage < cur ? "var(--flow-subtle)" : stage === cur ? "var(--warning-subtle)" : "var(--surface-0)",
    ifg: stage < cur ? "var(--flow)" : stage === cur ? "var(--warning)" : "var(--text-muted)",
  };

  const tabs: EsteiraStageTab[] = tabKeys.map((x) => {
    const id = x[0];
    let n: string | number | null = null;
    if (id === "guard" && !signed) n = `${pending} abertos`;
    else if (id === "files") n = MERIDIAN_STAGE_FILES[stage] || 0;
    else if (id === "ledger") n = MERIDIAN_STAGE_LEDGER[stage + 1] || 0;
    const hasN = n != null && n !== 0 && n !== "0";
    return {
      id,
      label: x[1],
      hasN: !!hasN,
      n: n ?? 0,
      ncls: id === "guard" ? "warn" : "",
      on: tab === id,
    };
  });

  const groups: EsteiraGuardGroup[] = [];
  MERIDIAN_GUARD.forEach((g, i) => {
    let G = groups.find((x) => x.label === g[0]);
    if (!G) {
      G = { label: g[0], n: 0, ok: 0, items: [] };
      groups.push(G);
    }
    const ok = guard[i];
    G.n += 1;
    if (ok) G.ok += 1;
    G.items.push({
      t: g[1],
      m: ok
        ? g[2].replace("Nina termina o job-014", "assinado por Nina SEO").replace("a hero compete com o menu", "aprovada após o ajuste hero-390")
        : g[2],
      bg: ok ? "var(--flow-subtle)" : "var(--warning-subtle)",
      fg: ok ? "var(--flow)" : "var(--warning)",
      icon: ok ? ICN.check : ICN.dot,
      hasAct: !ok && !!g[5],
      actLabel: g[5] === "preview" ? "Ver na prévia" : "Pedir assinatura à Nina",
      hasEv: !!g[4],
    });
  });

  return {
    cur,
    signed,
    nodes,
    sel,
    tabs,
    tab,
    guardN: gN,
    guardT: gT,
    guardPct: Math.round((gN / gT) * 100),
    guardColor: allOk ? "var(--flow)" : "var(--warning)",
    guardTitle: signed ? "Gate de QA assinado" : allOk ? "Tudo verificado" : `${pending} critérios seguram a entrega`,
    guardNote: signed
      ? "Assinado por Carlos."
      : allOk
        ? "Assinar libera a etapa 7 e registra no livro-razão."
        : "Resolva os itens em âmbar. Cada um tem a ação ao lado.",
    guardBlocked: !allOk || signed,
    signLabel: signed ? "Assinado" : "Assinar gate de QA",
    guardGroups: groups,
  };
}

export type ConsoleTab = "geral" | "esteira" | "kanban" | "roadmap" | "arquivos" | "qa" | "seg" | "acessos";

export interface ConsoleTag {
  t: string;
  icon: string;
}

export interface ConsoleStageRow {
  n: string;
  t: string;
  who: string;
  now: boolean;
  st: string;
  cls: string;
  bg: string;
  fg: string;
  bd: string;
  tc: string;
  rowBg: string;
}

export interface ConsoleTimeline {
  t: string;
  x: string;
  w: string;
  c: string;
}

export interface ConsoleInv {
  k: string;
  v: string;
}

export interface ConsoleMesa {
  n: string;
  ini: string;
  skill: string;
  c: string;
  busy: string;
}

export interface ConsoleCurrent {
  eyebrow: string;
  name: string;
  owner: string;
  ini: string;
  skill: string;
  status: string;
  cls: string;
  d: string;
  btn: string;
  secLbl: string;
  blocked: boolean;
  blockTxt: string;
  icon: string;
  ibg: string;
  ifg: string;
  anim: string;
  bd: string;
}

export interface ConsoleExec {
  cap: string;
  st: string;
  stCls: string;
  meter: string;
  runLbl: string;
  thinkLbl: string;
}

export interface ConsolePend extends FabPend {
  kindLabel: string;
  hasCode: boolean;
  code?: string;
}

export interface ConsoleProjectView {
  id: string;
  name: string;
  code: string;
  line: string;
  kind: string;
  client: string;
  state: string;
  cls: string;
  gN: number;
  gCls: string;
  gCol: string;
  due: string;
  git: string;
  cap: string;
  path: string;
  tags: ConsoleTag[];
  pct: number;
  done: number;
  n: number;
  pendN: number;
  pCol: string;
  pBadge: string;
  spent: string;
  budget: string;
  costPct: number;
  paused: boolean;
  pauseLbl: string;
  pauseIcon: string;
  isDone: boolean;
  filesN: number;
  qaTabN: number | null;
  segTabN: number | null;
  missingN: number;
  cs: ConsoleCurrent;
  ex: ConsoleExec;
  pends: ConsolePend[];
  timeline: ConsoleTimeline[];
  vsteps: ConsoleStageRow[];
  inv: ConsoleInv[];
  mesas: ConsoleMesa[];
  mesasN: string;
}

const ROOT = "C:\\Users\\carlo\\Downloads\\Projetos a Estudar\\tavirescritorio\\";

const MERIDIAN_STAGES: Array<[string, string, string, string]> = [
  ["Entender", "Paula PM", "PP", "Orquestradora"],
  ["Refinar", "Arquiteto de Nicho", "AN", "Arquitetura de soluções"],
  ["Dossiê", "Dora Descoberta", "DD", "Intake e descoberta"],
  ["Arquitetura", "Théo Tech Lead", "TL", "Liderança técnica"],
  ["Construção", "Vitor Construtor", "VC", "Dev frontend sênior"],
  ["QA", "Edna E2E", "EE", "QA end-to-end"],
  ["Security", "Auditor Seg/LGPD", "AS", "Segurança e LGPD"],
  ["SEO", "Nina SEO", "NS", "SEO técnico"],
  ["Handoff", "Paulo Publicador", "PU", "Publicação e release"],
];

const SS = {
  done: ["concluída", "flow", "var(--flow)", "var(--surface-1)", "var(--flow)"],
  run: ["em execução", "flow", "var(--flow-subtle)", "var(--flow)", "var(--flow-subtle-line)"],
  gate: ["no gate", "warn", "var(--warning-subtle)", "var(--warning)", "var(--warning)"],
  paused: ["pausada", "warn", "var(--warning-subtle)", "var(--warning)", "var(--warning)"],
  todo: ["a seguir", "", "var(--surface-0)", "var(--text-muted)", "var(--line)"],
} as const;

function stState(i: number, done: number, status: FabProject["status"], isM: boolean): keyof typeof SS {
  if (i < done) return "done";
  if (i === done) {
    if (status === "paused") return "paused";
    if (isM) return "gate";
    return "run";
  }
  return "todo";
}

function meridianPends(): ConsolePend[] {
  return [
    {
      id: "meridian-gate",
      kind: "gate",
      kindLabel: "Gate",
      t: "Gate de QA · Completion Guard",
      d: "2 critérios ainda seguram a entrega. Resolva e assine para liberar Security.",
      who: "Edna E2E",
      at: "hoje 14:18",
      btn: "Abrir gate",
      projId: "meridian",
      proj: "Landing Meridian Capital",
      kcls: KIND_META.gate.kcls,
      ibg: KIND_META.gate.ibg,
      ifg: KIND_META.gate.ifg,
      icon: KIND_META.gate.icon,
      hasCode: false,
    },
    {
      id: "meridian-err",
      kind: "erro",
      kindLabel: "Erro",
      t: "Build de preview falhou",
      d: "A variável SUPABASE_URL não está cadastrada na conta vercel · tavir. Cadastre em Acessos e o preview é refeito sozinho.",
      who: "Vitor Construtor",
      at: "hoje 14:02",
      btn: "Resolver em Acessos",
      projId: "meridian",
      proj: "Landing Meridian Capital",
      kcls: KIND_META.erro.kcls,
      ibg: KIND_META.erro.ibg,
      ifg: KIND_META.erro.ifg,
      icon: KIND_META.erro.icon,
      hasCode: true,
      code: "HTTP 409 FABRICA-COMPLETION-001",
    },
  ];
}

function meridianTimeline(): ConsoleTimeline[] {
  const rows: Array<[string, string, string]> = [
    ["14:22", "Pedido de ajuste na hero em 390 px", "Yuri UX"],
    ["14:18", "QA aguardando assinatura humana", "Completion Guard"],
    ["14:16", "Regressão: 38 de 38 links ok", "Edna E2E"],
    ["14:10", "Lighthouse 92 · acessibilidade 96", "Edna E2E"],
    ["14:02", "Build gerado sem erro", "Vitor Construtor"],
    ["13:50", "Prova visual em 1440 px aprovada", "Yuri UX"],
  ];
  return rows.map((e, i) => ({
    t: e[0],
    x: e[1],
    w: e[2],
    c: i === 0 ? "var(--flow)" : "var(--line-strong)",
  }));
}

function meridianMesas(done: number): ConsoleMesa[] {
  const map = new Map<string, ConsoleMesa & { skills: string[]; count: number }>();
  MERIDIAN_STAGES.forEach((x, i) => {
    const cur = map.get(x[1]) || {
      n: x[1],
      ini: x[2],
      skill: "",
      c: "",
      busy: "",
      skills: [] as string[],
      count: 0,
    };
    if (!cur.skills.includes(x[3])) cur.skills.push(x[3]);
    cur.count += 1;
    if (i === done) cur.busy = "busy";
    map.set(x[1], cur);
  });
  return [...map.values()].map((m) => ({
    n: m.n,
    ini: m.ini,
    skill: m.skills.join(" · "),
    c: `${m.count} ${m.count === 1 ? "etapa" : "etapas"}`,
    busy: m.busy,
  }));
}

function buildMeridian(): ConsoleProjectView {
  const base = DEMO_PROJECTS.find((p) => p.id === "meridian")!;
  const done = 5;
  const n = 9;
  const gN = 6;
  const pendN = 2;
  const pct = 56;
  const spent = 9.74;
  const budget = 25;
  const vsteps: ConsoleStageRow[] = MERIDIAN_STAGES.map((x, i) => {
    const k = stState(i, done, "run", true);
    const Z = SS[k];
    return {
      n: String(i + 1).padStart(2, "0"),
      t: x[0],
      who: x[1],
      now: k === "run" || k === "gate" || k === "paused",
      st: Z[0],
      cls: Z[1],
      bg: Z[2],
      fg: Z[3],
      bd: Z[4],
      tc: k === "todo" ? "var(--text-secondary)" : "var(--text-primary)",
      rowBg: k === "run" || k === "gate" || k === "paused" ? "var(--surface-3)" : "transparent",
    };
  });

  return {
    id: "meridian",
    name: base.name,
    code: base.code,
    line: base.line,
    kind: "LPs · Criação",
    client: base.client,
    state: STAT.run[0],
    cls: STAT.run[1],
    gN,
    gCls: "warn",
    gCol: "oklch(.80 .155 78)",
    due: "entrega 04/11",
    git: "MERIDIAN",
    cap: "CURSOR · AUTO",
    path: `${ROOT}tavir-clientes\\meridian-lp-a41e`,
    tags: [
      { t: "Nuxt 3 estático", icon: ICN.code },
      { t: "Supabase PostgreSQL", icon: ICN.db },
      { t: "Sem CMS na v1", icon: ICN.cms },
    ],
    pct,
    done,
    n,
    pendN,
    pCol: "oklch(.80 .155 78)",
    pBadge: "warn",
    spent: "9,74",
    budget: "25",
    costPct: Math.min(100, Math.round((spent / budget) * 100)),
    paused: false,
    pauseLbl: "Pausar",
    pauseIcon: ICN.pause,
    isDone: false,
    filesN: 18,
    qaTabN: 2,
    segTabN: 1,
    missingN: 1,
    cs: {
      eyebrow: "Etapa 06 de 09 · no gate",
      name: "QA",
      owner: "Edna E2E",
      ini: "EE",
      skill: "QA end-to-end",
      status: "aguardando gate",
      cls: "warn",
      d: "Prova em 390 px e assinatura de SEO seguram a entrega. O resto passou.",
      btn: "Resolver gate",
      secLbl: "Ver na esteira",
      blocked: true,
      blockTxt: "A etapa só fecha com o Guard em 8 de 8. Os critérios em âmbar têm a ação ao lado.",
      icon: ICN.shield,
      ibg: "var(--warning-subtle)",
      ifg: "var(--warning)",
      anim: "ringwarn 2s var(--ease) infinite",
      bd: "oklch(.80 .155 78 / .45)",
    },
    ex: {
      cap: "CURSOR · AUTO",
      st: "no gate · pode adiantar critérios",
      stCls: "warn",
      meter: "2.480 tok · 3,2 s · US$ 0,04",
      runLbl: "Executar etapa no Cursor",
      thinkLbl: "Ver pensamento",
    },
    pends: meridianPends(),
    timeline: meridianTimeline(),
    vsteps,
    inv: [
      { k: "Seções", v: "5" },
      { k: "Rotas", v: "5 pré-render." },
      { k: "Links verificados", v: "38" },
      { k: "Lighthouse", v: "92 · 96" },
    ],
    mesas: meridianMesas(done),
    mesasN: "9 mesas",
  };
}

/** Console a partir de projeto real (SQLite/IPC) — sem fixture Meridian. */
export function buildConsoleFromProject(p: FabProject): ConsoleProjectView {
  const pends: ConsoleProjectView["pends"] = [];
  const stages = Array.from({ length: p.n }, (_, i) => {
    const k = stState(i, p.done, p.status, false);
    const Z = SS[k];
    return {
      n: String(i + 1).padStart(2, "0"),
      t: i === p.done ? p.stepName : `Etapa ${i + 1}`,
      who: i === p.done ? p.owner : "mesa",
      now: k === "run" || k === "gate" || k === "paused",
      st: Z[0],
      cls: Z[1],
      bg: Z[2],
      fg: Z[3],
      bd: Z[4],
      tc: k === "todo" ? "var(--text-secondary)" : "var(--text-primary)",
      rowBg: k === "run" || k === "gate" || k === "paused" ? "var(--surface-3)" : "transparent",
    };
  });
  const dn = p.status === "done";
  const pz = p.status === "paused";
  const blockP = pends[0];
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    line: p.line,
    kind: p.line.startsWith("LP") ? "LPs" : p.line.startsWith("OF") ? "Ofertas" : "Sistemas",
    client: p.client,
    state: STAT[p.status][0],
    cls: STAT[p.status][1],
    gN: dn ? 8 : Math.min(7, Math.max(1, Math.floor(p.pct / 12))),
    gCls: dn ? "flow" : "warn",
    gCol: dn ? "#1BC5BD" : "oklch(.80 .155 78)",
    due: dn ? "entregue" : pz ? "prazo suspenso" : "entrega —",
    git: "TAVIR",
    cap: p.cap,
    path: `${ROOT}${p.slug.replace(/\//g, "\\")}`,
    tags: [{ t: p.line || "Esteira", icon: ICN.code }],
    pct: p.pct,
    done: p.done,
    n: p.n,
    pendN: p.pendN,
    pCol: p.pendN ? "oklch(.80 .155 78)" : "#F4F6F2",
    pBadge: p.pendN ? "warn" : "flow",
    spent: "0,00",
    budget: "25",
    costPct: 0,
    paused: pz,
    pauseLbl: pz ? "Retomar" : dn ? "Entregue" : "Pausar",
    pauseIcon: pz ? ICN.play : ICN.pause,
    isDone: dn,
    filesN: 4,
    qaTabN: null,
    segTabN: null,
    missingN: 0,
    cs: {
      eyebrow: `Etapa ${String(Math.min(p.done + 1, p.n)).padStart(2, "0")} de ${String(p.n).padStart(2, "0")}`,
      name: dn ? "Projeto entregue" : p.stepName,
      owner: p.owner,
      ini: p.owner.slice(0, 2).toUpperCase(),
      skill: "mesa atual",
      status: dn ? "entregue" : pz ? "pausada" : blockP ? "aguardando autorização" : "em execução",
      cls: dn ? "action" : pz || blockP ? "warn" : "flow",
      d: p.think,
      btn: dn ? "Ver Completion Guard" : pz ? "Retomar esteira" : blockP ? "Autorizar" : "Concluir etapa",
      secLbl: "Ver esteira",
      blocked: !!blockP && !pz,
      blockTxt: "Esta etapa está bloqueada. Resolva a pendência para continuar.",
      icon: dn ? ICN.check : pz ? ICN.pause : blockP ? KIND_META.auth.icon : ICN.bolt,
      ibg: dn ? "var(--action-subtle)" : pz || blockP ? "var(--warning-subtle)" : "var(--flow-subtle)",
      ifg: dn ? "var(--action-subtle-text)" : pz || blockP ? "var(--warning)" : "var(--flow)",
      anim: blockP && !pz ? "ringwarn 2s var(--ease) infinite" : "none",
      bd: blockP && !pz ? "oklch(.80 .155 78 / .45)" : "var(--line)",
    },
    ex: {
      cap: p.cap,
      st: dn ? "100% concluído · monitorando" : pz ? "pausado · contexto preservado" : blockP ? "aguardando autorização" : "pronto para executar",
      stCls: dn ? "action" : pz || blockP ? "warn" : "flow",
      meter: "—",
      runLbl: dn ? "Esteira concluída" : "Executar etapa no Cursor",
      thinkLbl: "Ver pensamento",
    },
    pends,
    timeline: [{ t: "agora", x: p.think, w: p.owner, c: "var(--flow)" }],
    vsteps: stages,
    inv: [
      { k: "Etapas", v: String(p.n) },
      { k: "Feitas", v: String(p.done) },
      { k: "Pendências", v: String(p.pendN) },
      { k: "Status", v: STAT[p.status][0] },
    ],
    mesas: [{ n: p.owner, ini: p.owner.slice(0, 2).toUpperCase(), skill: "mesa", c: "1 etapa", busy: dn ? "" : "busy" }],
    mesasN: "1 mesa",
  };
}

/** Fixtures desligados — use buildConsoleFromProject com dados do IPC. */
export function getConsoleProject(_id: string): ConsoleProjectView | null {
  return null;
}

/* ─── QA Meridian (pt.qa) ─── */

const QA_TPL_LP: Array<[string, string[]]> = [
  ["Navegação e links", ["Menu leva a todas as seções", "Links internos sem 404", "CTA rola até o formulário"]],
  ["Formulário de contato", ["Valida campos obrigatórios", "Envia lead para o Supabase", "Mostra confirmação de envio"]],
  ["Responsivo", ["Layout em 1440 px", "Layout em 390 px", "Menu vira ícone abaixo de 768 px"]],
  ["Acessibilidade", ["Contraste AA", "Foco visível no teclado", "Imagens com texto alternativo"]],
];

const QA_ERR: Record<string, { msg: string; exp: string; rec: string; at: string; bug: string | null }> = {
  "Layout em 390 px": {
    msg: "Menu sobrepõe o título da hero",
    exp: "Título h1 visível acima da dobra em 390 px",
    rec: "Menu aberto cobre 62% do título (z-index 40 sobre 10)",
    at: "tests/responsivo.spec.ts:42:5",
    bug: "menu",
  },
  "Menu vira ícone abaixo de 768 px": {
    msg: "Menu continua em linha abaixo de 768 px",
    exp: 'Botão "Menu" (ícone) visível',
    rec: "5 links em linha e nenhum botão de menu",
    at: "tests/responsivo.spec.ts:58:5",
    bug: "menu",
  },
  "Mostra confirmação de envio": {
    msg: "Asserção falhou",
    exp: "Comportamento descrito no critério de pronto",
    rec: "Resultado diferente do esperado",
    at: "tests/formulario-de-contato.spec.ts:20:3",
    bug: null,
  },
};

function slugify(x: string): string {
  return x
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function fmtDurS(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return m ? `${m} min ${String(r).padStart(2, "0")} s` : `${r} s`;
}

function mmss(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

interface QaEvRaw {
  i: number;
  kind: string;
  name: string;
  size: string;
  fail?: boolean;
  mobile?: boolean;
  dur?: number;
  suite?: number;
  test?: string;
  note?: string;
  bug?: string | null;
}

interface QaRunRaw {
  id: string;
  when: string;
  by: string;
  motor: string;
  commit: string;
  preview: boolean;
  suites: Array<{ name: string; tests: Array<{ name: string; st: string; dur: number; err: (typeof QA_ERR)[string] | null }> }>;
  total: number;
  pass: number;
  fail: number;
  dur: number;
  browsers: string;
  ev: QaEvRaw[];
}

function qaRunLP(opt: { id: string; when: string; fails: string[]; commit: string; preview?: boolean; by?: string; motor?: string }): QaRunRaw {
  let k = 0;
  const suites = QA_TPL_LP.map((su) => ({
    name: su[0],
    tests: su[1].map((tn) => {
      k += 1;
      const fail = opt.fails.indexOf(tn) >= 0;
      return {
        name: tn,
        st: fail ? "fail" : "pass",
        dur: Math.round((((k * 37) % 23) + 4 + (fail ? 21 : 0)) * 10) / 100,
        err: fail ? QA_ERR[tn] || { msg: "Asserção falhou", exp: "…", rec: "…", at: "tests/spec.ts:20:3", bug: null } : null,
      };
    }),
  }));
  // fix dur calc to match HTML: Math.round((((k * 37) % 23) + 4 + (fail ? 21 : 0))) / 10
  k = 0;
  suites.forEach((su) => {
    su.tests.forEach((t) => {
      k += 1;
      const fail = t.st === "fail";
      t.dur = Math.round(((k * 37) % 23) + 4 + (fail ? 21 : 0)) / 10;
    });
  });
  const all = suites.flatMap((s) => s.tests);
  const fails = all.filter((x) => x.st === "fail");
  const ev: Omit<QaEvRaw, "i">[] = [];
  suites.forEach((su, si) => {
    const fs = su.tests.some((x) => x.st === "fail");
    if (fs || si < 2) {
      ev.push({
        kind: "video",
        name: `${slugify(su.name)}.webm`,
        suite: si,
        fail: fs,
        mobile: /Mobile|Responsivo/.test(su.name),
        size: `${(1.2 + su.tests.length * 0.7).toFixed(1).replace(".", ",")} MB`,
        dur: su.tests.length * 2.5,
      });
    }
  });
  fails.forEach((x) => {
    ev.push({
      kind: "gif",
      name: `falha-${slugify(x.name)}.gif`,
      test: x.name,
      fail: true,
      mobile: /390|ícone|Notifica|Mobile/.test(x.name),
      size: "640 KB",
      bug: x.err?.bug || null,
    });
  });
  ev.push({ kind: "gif", name: `fluxo-${slugify(suites[1].name)}.gif`, test: suites[1].tests[0].name, fail: false, mobile: false, size: "820 KB" });
  ev.push({ kind: "img", name: "print-1440.png", fail: false, mobile: false, size: "612 KB · 1440 × 2200", note: "Página inteira em 1440 px" });
  const m390 = fails.find((x) => /390|ícone/.test(x.name));
  ev.push({
    kind: "img",
    name: "print-390.png",
    fail: !!m390,
    mobile: true,
    size: "388 KB · 390 × 1600",
    note: m390 ? "Menu cobre o título em 390 px" : "Página inteira em 390 px",
    bug: m390 ? "menu" : null,
  });
  fails
    .filter((x) => !/390|ícone/.test(x.name))
    .forEach((x) => {
      ev.push({
        kind: "img",
        name: `falha-${slugify(x.name)}.png`,
        fail: true,
        mobile: /Notifica|Mobile/.test(x.name),
        size: "210 KB",
        note: x.err?.msg,
        bug: x.err?.bug || null,
      });
    });
  ev.push({ kind: "report", name: `relatorio-${opt.id.toLowerCase()}.html`, size: "48 KB" });
  const dur = all.reduce((a, x) => a + x.dur, 0) + 41;
  return {
    id: opt.id,
    when: opt.when,
    by: opt.by || "Talita QA · playwright",
    motor: opt.motor || "Cursor · Auto",
    commit: opt.commit,
    preview: !!opt.preview,
    suites,
    total: all.length,
    pass: all.length - fails.length,
    fail: fails.length,
    dur,
    browsers: "Chromium 1440 · WebKit 390",
    ev: ev.map((e, i) => ({ ...e, i })),
  };
}

const KIND_LBL: Record<string, string> = { video: "Vídeo", gif: "GIF", img: "Print", report: "Relatório" };

export interface QaEvThumb {
  name: string;
  tag: string;
  isDoc: boolean;
  isShot: boolean;
  isVideo: boolean;
  isGif: boolean;
  fail: boolean;
  mw: string;
  bg: string;
  hasDur: boolean;
  dur: string;
  meta: string;
  mc: string;
}

export interface QaRunRow {
  id: string;
  when: string;
  by: string;
  res: string;
  cls: string;
  pp: number;
  on: boolean;
  i: number;
}

export interface QaSuiteView {
  name: string;
  ok: string;
  cls: string;
  tests: Array<{
    name: string;
    dur: string;
    fail: boolean;
    msg: string;
    at: string;
    icon: string;
    ic: string;
    cls2: string;
    hasEv: boolean;
  }>;
}

export interface QaView {
  pct: number;
  ring: string;
  title: string;
  note: string;
  runLbl: string;
  stats: Array<{ k: string; v: string; c: string }>;
  hasHint: boolean;
  hint: string;
  runs: QaRunRow[];
  store: string;
  selId: string;
  evf: Array<{ id: string; label: string; n: number; on: boolean }>;
  ev: QaEvThumb[];
  rf: Array<{ id: string; label: string; on: boolean }>;
  suites: QaSuiteView[];
}

function thumbOf(e: QaEvRaw): QaEvThumb {
  return {
    name: e.name,
    tag: e.kind === "report" ? "HTML" : e.name.split(".").pop()!.toUpperCase(),
    isDoc: e.kind === "report",
    isShot: e.kind !== "report",
    isVideo: e.kind === "video",
    isGif: e.kind === "gif",
    fail: !!e.fail,
    mw: e.mobile ? "52px" : "150px",
    bg: e.fail ? "oklch(.635 .185 27 / .14)" : "#0e1626",
    hasDur: e.kind === "video",
    dur: e.kind === "video" ? mmss(e.dur || 0) : "",
    meta: `${KIND_LBL[e.kind] || "Imagem"} · ${e.size}${e.fail ? " · falha" : ""}`,
    mc: e.fail ? "var(--danger)" : "var(--text-muted)",
  };
}

const MERIDIAN_QA_RUNS: QaRunRaw[] = [
  qaRunLP({ id: "QA-0141", when: "ontem 18:20", fails: ["Layout em 390 px", "Menu vira ícone abaixo de 768 px", "Mostra confirmação de envio"], commit: "9b07d11" }),
  qaRunLP({ id: "QA-0142", when: "hoje 14:16", fails: ["Layout em 390 px", "Menu vira ícone abaixo de 768 px"], commit: "a41e9c2" }),
];

export function buildQaMeridian(selIdx = 1, evf = "all", repF = "all"): QaView {
  const runs = MERIDIAN_QA_RUNS;
  const qSel = Math.min(Math.max(0, selIdx), runs.length - 1);
  const QR = runs[qSel];
  const failNow = QR.fail;
  const passPct = Math.round((QR.pass / QR.total) * 100);
  const qaEv = QR.ev.filter((e) => evf === "all" || e.kind === evf);
  const X = "M6 6l12 12M18 6 6 18";
  return {
    pct: passPct,
    ring: failNow ? "var(--danger)" : "var(--flow)",
    title: failNow ? `${failNow} testes falharam em ${QR.id}` : `Todos os ${QR.total} testes passaram em ${QR.id}`,
    note: `${QR.when} · ${QR.by} · ${QR.browsers}`,
    runLbl: "Rodar suíte de QA",
    stats: [
      { k: "Testes", v: String(QR.total), c: "var(--text-primary)" },
      { k: "Passaram", v: String(QR.pass), c: "var(--flow)" },
      { k: "Falharam", v: String(QR.fail), c: QR.fail ? "var(--danger)" : "var(--text-muted)" },
      { k: "Duração", v: fmtDurS(QR.dur), c: "var(--text-primary)" },
      { k: "Evidências", v: String(QR.ev.length), c: "var(--text-primary)" },
    ],
    hasHint: false,
    hint: "",
    runs: [...runs]
      .map((r, i) => ({
        id: r.id,
        when: r.when + (r.preview ? " · prévia" : ""),
        by: r.motor,
        res: r.fail ? `${r.fail} falha${r.fail > 1 ? "s" : ""}` : "ok",
        cls: r.fail ? "danger" : "flow",
        pp: Math.round((r.pass / r.total) * 100),
        on: i === qSel,
        i,
      }))
      .reverse(),
    store: `tavir-clientes/meridian-lp-a41e/evidencias/qa/${QR.id}`,
    selId: QR.id,
    evf: (
      [
        ["all", "Todas"],
        ["video", "Vídeos"],
        ["gif", "GIFs"],
        ["img", "Prints"],
        ["report", "Relatório"],
      ] as Array<[string, string]>
    ).map(([id, label]) => ({
      id,
      label,
      n: QR.ev.filter((e) => id === "all" || e.kind === id).length,
      on: evf === id,
    })),
    ev: qaEv.map(thumbOf),
    rf: (
      [
        ["all", "Todos"],
        ["fail", "Falhas"],
        ["pass", "Passaram"],
      ] as Array<[string, string]>
    ).map(([id, label]) => ({ id, label, on: repF === id })),
    suites: QR.suites
      .map((su, si) => ({
        name: su.name,
        ok: `${su.tests.filter((x) => x.st === "pass").length}/${su.tests.length}`,
        cls: su.tests.some((x) => x.st === "fail") ? "danger" : "flow",
        tests: su.tests
          .filter((x) => repF === "all" || x.st === repF)
          .map((x) => {
            const evi = QR.ev.find((e) => e.test === x.name) || QR.ev.find((e) => e.kind === "video" && e.suite === si);
            return {
              name: x.name,
              dur: `${String(x.dur).replace(".", ",")} s`,
              fail: x.st === "fail",
              msg: x.err?.msg || "",
              at: x.err?.at || "",
              icon: x.st === "pass" ? ICN.check : X,
              ic: x.st === "pass" ? "var(--flow)" : "var(--danger)",
              cls2: x.st === "fail" ? "f" : "",
              hasEv: !!evi,
            };
          }),
      }))
      .filter((su) => su.tests.length),
  };
}

/* ─── Acessos Meridian (pt.acessos) ─── */

const SVC: Record<string, string> = {
  Vercel: "M12 4 21 20H3z",
  Supabase: "M13 3 5 14h6l-1 7 8-11h-6z",
  GitHub: "M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21M9 19c-4 1.5-4-2-6-2.5",
  Google: "M20 12a8 8 0 1 1-2.3-5.7M20 12h-8",
  Local: "M15 9a3 3 0 1 1-3 3M12 12l-7 7M7 17l2 2M9 15l2 2",
};

function maskOf(v: string): string {
  return v.length <= 6 ? "••••••" : v.slice(0, 4) + "••••••••";
}

function realOf(v: string): string {
  let i = 0;
  const pool = "x7k2q9pa3mr5t8";
  return v.replace(/•/g, () => pool[i++ % pool.length]);
}

function svcIcon(name: string): string {
  const n = Object.keys(SVC).find((k) => name.indexOf(k) === 0) || (/Registro|Drive|Play|Apple|Ghost|Conta/.test(name) ? "Google" : "Local");
  return SVC[n] || SVC.Local;
}

export interface AcessosView {
  target: string;
  hasMissing: boolean;
  missingTxt: string;
  hPct: number;
  hCol: string;
  hTxt: string;
  filters: Array<{ id: string; label: string; n: number; on: boolean }>;
  empty: boolean;
  creds: Array<{
    k: string;
    env: string;
    svc: string;
    dest: string;
    icon: string;
    cls: string;
    st: string;
    stCls: string;
    showVal: boolean;
    v: string;
    vc: string;
    meta: string;
    missing: boolean;
    draft: string;
    saveLbl: string;
    canReveal: boolean;
  }>;
  accTxt: string;
  acc: Array<{ s: string; a: string; sc: string; st: string; icon: string; cls: string }>;
  people: Array<{ i: string; n: string; r: string; p: string; cls: string; icon: string; c: string }>;
}

export function buildAcessosMeridian(credF = "all", draft = ""): AcessosView {
  const envOk = false;
  const target = "vercel · tavir";
  const peopleRaw: Array<[string, string, string, string]> = [
    ["CH", "Carlos Henrique", "CEO · aprovador", "admin"],
    ["PP", "Paula PM", "orquestradora", "edição"],
    ["VC", "Vitor Construtor", "construção", "edição"],
    ["MC", "Meridian Capital", "cliente", "leitura"],
  ];
  const envRows: Array<[string, string, string, string?]> = [
    ["NUXT_PUBLIC_SITE", "meridian.com.br", "produção"],
    ["SUPABASE_ANON_KEY", "eyJh••••••••Qk", "produção · preview"],
    envOk ? ["SUPABASE_URL", "https://mrdn••••.supabase.co", "produção · preview"] : ["SUPABASE_URL", "", "produção · preview", "missing"],
  ];
  const credAll = envRows.map((v, i) => {
    const st = v[3] || "ok";
    const miss = st === "missing";
    const later = st === "later";
    const real = miss || later ? "" : realOf(v[1]);
    const svc = /SUPABASE/.test(v[0]) ? "Supabase" : /vercel/i.test(target) ? "Vercel" : "Local";
    return {
      k: v[0],
      val: real,
      note: later ? v[1] : "",
      env: v[2],
      st,
      svc,
      by: peopleRaw[Math.min(1, peopleRaw.length - 1)][1],
      upd: ["23/10", "25/10", "27/10"][Math.min(i, 2)],
    };
  });
  const credFns: Record<string, (c: (typeof credAll)[0]) => boolean> = {
    all: () => true,
    ok: (c) => c.st === "ok",
    missing: (c) => c.st === "missing",
    later: (c) => c.st === "later",
  };
  const shown = credAll.filter(credFns[credF] || credFns.all);
  const missingN = credAll.filter((c) => c.st === "missing").length;
  const credOk = credAll.filter((c) => c.st === "ok").length;
  const accRaw: Array<[string, string, string, string]> = [
    ["Vercel", "tavir · meridian-lp", "deploy e preview", envOk ? "ok" : "falta variável"],
    ["Supabase", "Meridian · meridian-leads", "banco de leads", "ok"],
    ["GitHub", "tavir/meridian-lp", "código", "ok"],
    ["Registro.br", "meridian.com.br", "domínio", "DNS no handoff"],
  ];
  return {
    target,
    hasMissing: missingN > 0,
    missingTxt: `${missingN} variável faltando`,
    hPct: Math.round((credOk / credAll.length) * 100),
    hCol: missingN ? "var(--danger)" : "var(--flow)",
    hTxt: `${credOk} de ${credAll.length} credenciais ativas`,
    filters: (
      [
        ["all", "Todas"],
        ["ok", "Ativas"],
        ["missing", "Faltando"],
        ["later", "Agendadas"],
      ] as Array<[string, string]>
    )
      .filter((f) => f[0] === "all" || credAll.some(credFns[f[0]]))
      .map(([id, label]) => ({
        id,
        label,
        n: credAll.filter(credFns[id]).length,
        on: credF === id,
      })),
    empty: shown.length === 0,
    creds: shown.map((c) => {
      const miss = c.st === "missing";
      const later = c.st === "later";
      return {
        k: c.k,
        env: c.env,
        svc: c.svc,
        dest: target,
        icon: SVC[c.svc] || SVC.Local,
        cls: miss ? "miss" : "",
        st: miss ? "Faltando" : later ? "Agendada" : "Ativa",
        stCls: miss ? "danger" : later ? "" : "flow",
        showVal: !miss,
        v: later ? c.note : maskOf(c.val),
        vc: later ? "var(--text-muted)" : "var(--text-secondary)",
        meta: `${c.svc} · ${c.by} · ${miss ? "aguardando cadastro" : later ? "cadastro previsto" : "atualizada " + c.upd}`,
        missing: miss,
        draft,
        saveLbl: "Salvar e refazer preview",
        canReveal: !miss && !later,
      };
    }),
    accTxt: `${accRaw.filter((a) => a[3] === "ok").length} de ${accRaw.length} ok`,
    acc: accRaw.map((a) => ({
      s: a[0],
      a: a[1],
      sc: a[2],
      st: a[3],
      icon: svcIcon(a[0]),
      cls: a[3] === "ok" ? "flow" : /falta/.test(a[3]) ? "danger" : "warn",
    })),
    people: peopleRaw.map((p, i) => {
      const ad = p[3] === "admin";
      const ed = p[3] === "edição";
      return {
        i: p[0],
        n: p[1] + (ad ? " · CEO" : ""),
        r: (ad ? "Aprovador de gates" : p[2].charAt(0).toUpperCase() + p[2].slice(1)) + " · " + ["visto agora", "visto há 12 min", "visto há 1 h", "visto ontem"][Math.min(i, 3)],
        p: ad ? "Admin" : ed ? "Editor" : "Leitura",
        cls: ad ? "admin" : ed ? "editor" : "",
        icon: ad ? ICN.shield : ed ? "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" : "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
        c: ad ? "var(--action-subtle-text)" : ed ? "var(--flow)" : "var(--text-secondary)",
      };
    }),
  };
}

/* ─── Segurança Meridian (pt.seg) ─── */

const SEV: Record<string, [number, string, number]> = {
  crítica: [0, "danger", 25],
  alta: [1, "danger", 15],
  média: [2, "warn", 7],
  baixa: [3, "", 2],
  info: [4, "", 0],
};

const SEC_CHECKS: Array<[string, string, string]> = [
  ["Headers", "Content-Security-Policy definida", "csp"],
  ["Headers", "HSTS com preload", "hsts"],
  ["Headers", "Sem cabeçalhos que expõem a stack", "xpb"],
  ["Segredos", "Nenhum segredo no bundle ou no Git", "secrets"],
  ["Dependências", "Sem vulnerabilidade crítica (npm audit / pub outdated)", "deps"],
  ["Dados", "RLS ativo em todas as tabelas", "rls"],
  ["Formulários", "Proteção contra envio em massa", "bots"],
  ["LGPD", "Consentimento livre e explícito", "consent"],
  ["LGPD", "Cookies só depois do aceite", "cookies"],
  ["LGPD", "Retenção de dados definida", "retencao"],
  ["LGPD", "Encarregado (DPO) informado", "dpo"],
  ["Transporte", "TLS 1.2+ e redirecionamento para HTTPS", "tls"],
];

const MERIDIAN_SEC_FINDINGS = [
  {
    id: "F-01",
    sev: "alta",
    title: "Content-Security-Policy ausente",
    key: "csp",
    where: "Preview na Vercel · todas as rotas (cabeçalhos HTTP)",
    desc: "O build de preview responde sem o cabeçalho Content-Security-Policy. Qualquer script injetado roda com as mesmas permissões da página.",
    ev: "curl -I https://meridian-lp-preview.vercel.app\nHTTP/2 200\ncontent-type: text/html; charset=utf-8\nx-powered-by: Nuxt\nstrict-transport-security: max-age=63072000\n# content-security-policy: (ausente)",
    impact: "Facilita XSS e a injeção de scripts de terceiros no formulário de lead.",
    fix: "Definir a CSP em routeRules do Nuxt, liberando só o próprio domínio e o Supabase.",
    code: "// nuxt.config.ts\nrouteRules: {\n  '/**': { headers: {\n    'Content-Security-Policy': \"default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; frame-ancestors 'none'\"\n  } }\n}",
    refs: ["OWASP A05:2021 · Security Misconfiguration", "MDN · Content-Security-Policy"],
    img: null as [string, string, string] | null,
    st: "aberta",
  },
  {
    id: "F-02",
    sev: "média",
    title: "Aceite de privacidade já vem marcado",
    key: "consent",
    where: "Formulário de contato · /#contato",
    desc: "O aceite da política de privacidade aparece marcado por padrão. Consentimento pré-marcado não é livre nem inequívoco.",
    ev: '<input type="checkbox" name="aceite" checked>',
    impact: "Leads coletados sem base legal válida e risco em auditoria da ANPD.",
    fix: "Deixar desmarcado e bloquear o envio até o aceite explícito.",
    code: '- <input type="checkbox" name="aceite" checked>\n+ <input type="checkbox" name="aceite" required>',
    refs: ["LGPD art. 8º, §4º", "LGPD art. 7º, I"],
    img: ["consentimento-pre-marcado.png", "Aceite marcado por padrão no formulário", "chk"] as [string, string, string],
    st: "aberta",
  },
  {
    id: "F-03",
    sev: "média",
    title: "Formulário de lead sem limite de envios",
    key: "bots",
    where: "POST /rest/v1/leads (Supabase)",
    desc: "O endpoint aceita envios ilimitados do mesmo IP. Um script inunda a tabela de leads em minutos.",
    ev: 'for i in $(seq 200); do curl -s -o /dev/null -w "%{http_code}\\n" -X POST .../rest/v1/leads; done\n201 × 200',
    impact: "Spam no CRM da Meridian e custo de banco.",
    fix: "Passar o envio por uma Edge Function com limite por IP e campo honeypot.",
    code: '// supabase/functions/lead/index.ts\nif (await tentativas(ip) > 5) {\n  return new Response(\'Muitas tentativas\', { status: 429 })\n}',
    refs: ["OWASP API4:2023 · Unrestricted Resource Consumption"],
    img: null as [string, string, string] | null,
    st: "aberta",
  },
  {
    id: "F-04",
    sev: "baixa",
    title: "Cabeçalho x-powered-by expõe a stack",
    key: "xpb",
    where: "Todas as rotas",
    desc: "O cabeçalho x-powered-by: Nuxt diz ao atacante qual framework procurar.",
    ev: "x-powered-by: Nuxt",
    impact: "Ajuda no reconhecimento, sem risco direto.",
    fix: "Remover o cabeçalho no Nitro.",
    code: "nitro: {\n  routeRules: { '/**': { headers: { 'x-powered-by': '' } } }\n}",
    refs: ["OWASP A05:2021"],
    img: null as [string, string, string] | null,
    st: "aberta",
  },
];

export interface SegView {
  score: number;
  ring: string;
  title: string;
  note: string;
  runLbl: string;
  sevs: Array<{ label: string; n: number; cls: string }>;
  selId: string;
  checksN: number;
  passN: number;
  findN: number;
  tools: Array<{ t: string }>;
  ff: Array<{ id: string; label: string; n: number; on: boolean }>;
  findings: Array<{
    id: string;
    sev: string;
    sevCls: string;
    title: string;
    where: string;
    desc: string;
    ev: string;
    impact: string;
    fix: string;
    code: string;
    refs: string[];
    st: string;
    stCls: string;
    open: boolean;
    chev: string;
    cls: string;
    isOpen: boolean;
    hasImg: boolean;
  }>;
  noFind: boolean;
  runs: Array<{ id: string; when: string; by: string; res: string; cls: string; pp: number; on: boolean }>;
  store: string;
  checkTxt: string;
  checks: Array<{ t: string; area: string; lbl: string; cls: string }>;
  hasImgs: boolean;
  imgs: Array<{ name: string; tag: string; bg: string; mw: string; fail: boolean; meta: string; mc: string; isShot: boolean }>;
}

export function buildSegMeridian(sevF = "all", openIds?: Record<string, boolean>): SegView {
  const SD = MERIDIAN_SEC_FINDINGS.map((f) => ({ ...f, open: f.st !== "corrigida" }));
  const fIn = SD;
  const fOpen = fIn.filter((f) => f.open);
  const score = Math.max(0, 100 - fOpen.reduce((a, f) => a + SEV[f.sev][2], 0));
  const checks = SEC_CHECKS.map((c) => {
    const hit = fOpen.filter((f) => f.key === c[2]);
    const bad = hit.some((f) => SEV[f.sev][0] <= 2);
    const st = !hit.length ? "pass" : bad ? "fail" : "warn";
    return {
      area: c[0],
      t: c[1],
      lbl: st === "pass" ? "passou" : st === "fail" ? "falhou" : "atenção",
      cls: st === "pass" ? "flow" : st === "fail" ? "danger" : "warn",
      st,
    };
  });
  const firstOpen = fOpen.slice().sort((a, b) => SEV[a.sev][0] - SEV[b.sev][0])[0];
  const sevFilter: Record<string, (f: (typeof SD)[0]) => boolean> = {
    all: () => true,
    open: (f) => f.open,
    fixed: (f) => !f.open,
  };
  const fShown = fIn.filter(sevFilter[sevF] || sevFilter.all).sort((a, b) => SEV[a.sev][0] - SEV[b.sev][0]);
  const imgs = fIn
    .filter((f) => f.img)
    .map((f) => ({
      name: f.img![0],
      tag: "PNG",
      bg: f.open ? "oklch(.635 .185 27 / .14)" : "#0e1626",
      mw: "150px",
      fail: f.open,
      meta: `Print · 240 KB${f.open ? " · falha" : ""}`,
      mc: f.open ? "var(--danger)" : "var(--text-muted)",
      isShot: true,
    }));
  const failNow = fOpen.length;
  return {
    score,
    ring: score >= 90 ? "var(--flow)" : score >= 70 ? "var(--warning)" : "var(--danger)",
    title: failNow
      ? `${failNow}${failNow === 1 ? " falha aberta" : " falhas abertas"} em SEC-0031`
      : "Nenhuma falha aberta em SEC-0031",
    note: "hoje 13:40 · prévia · Sérgio Seg/LGPD · web-security · alvo meridian-lp-preview.vercel.app",
    runLbl: "Rodar varredura",
    sevs: (["crítica", "alta", "média", "baixa", "info"] as const).map((v) => {
      const n = fOpen.filter((f) => f.sev === v).length;
      return { label: v, n, cls: n ? SEV[v][1] || "muted" : "zero" };
    }),
    selId: "SEC-0031",
    checksN: checks.length,
    passN: checks.filter((c) => c.st === "pass").length,
    findN: fIn.length,
    tools: ["OWASP ZAP baseline", "npm audit", "gitleaks", "checagem de cabeçalhos", "checklist LGPD"].map((t) => ({ t })),
    ff: [
      ["all", "Todas", fIn.length],
      ["open", "Abertas", fOpen.length],
      ["fixed", "Corrigidas", fIn.length - fOpen.length],
    ].map(([id, label, n]) => ({ id: id as string, label: label as string, n: n as number, on: sevF === id })),
    findings: fShown.map((f) => {
      const ex2 = openIds && openIds[f.id] != null ? openIds[f.id] : !!(firstOpen && firstOpen.id === f.id);
      return {
        id: f.id,
        sev: f.sev,
        sevCls: SEV[f.sev][1],
        title: f.title,
        where: f.where,
        desc: f.desc,
        ev: f.ev,
        impact: f.impact,
        fix: f.fix,
        code: f.code,
        refs: f.refs,
        st: f.st,
        stCls: f.st === "corrigida" ? "flow" : f.st === "em correção" ? "warn" : "danger",
        open: !!ex2,
        chev: ex2 ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6",
        cls: f.open ? "" : "done",
        isOpen: f.open && f.st === "aberta",
        hasImg: !!f.img,
      };
    }),
    noFind: fShown.length === 0,
    runs: [
      {
        id: "SEC-0031",
        when: "hoje 13:40 · prévia",
        by: "5 ferramentas",
        res: failNow ? `${failNow} aberta${failNow > 1 ? "s" : ""}` : "ok",
        cls: failNow ? "danger" : "flow",
        pp: Math.round(((fIn.length - failNow) / Math.max(1, fIn.length)) * 100),
        on: true,
      },
    ],
    store: "tavir-clientes/meridian-lp-a41e/evidencias/seguranca/SEC-0031",
    checkTxt: `${checks.filter((c) => c.st === "pass").length} de ${checks.length} passaram`,
    checks,
    hasImgs: imgs.length > 0,
    imgs,
  };
}
/* ─── Kanban / Roadmap / Workspace Meridian ─── */

const MERIDIAN_STAGE_DAYS = [1, 1, 1, 1, 2, 1, 2, 2, 2];
const MERIDIAN_GATES = [3, 5, 8];
const MERIDIAN_BASE: [number, number, number] = [2026, 10, 23];
const ICX = {
  folder: "M3 7h6l2 2h10v10H3z",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  folderOpen: "M3 7h6l2 2h10v2H3zM3 11h18l-2 8H3z",
};

function ddmm(base: [number, number, number], add: number): string {
  const d = new Date(Date.UTC(base[0], base[1] - 1, base[2]) + add * 86400000);
  return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

function meridianStageRows(): Array<[string, string, string, number, string]> {
  return MERIDIAN_STG.map((x, i) => [x[0], x[1], x[3], MERIDIAN_STAGE_DAYS[i], x[2]]);
}

export interface KanbanCard {
  n: string;
  t: string;
  who: string;
  ini: string;
  skill: string;
  cls: string;
  hasB: boolean;
  b: string;
  bcls: string;
}

export interface KanbanCol {
  t: string;
  col: string;
  n: number;
  cards: KanbanCard[];
  empty: boolean;
}

export function buildKanbanMeridian(): KanbanCol[] {
  const stages = meridianStageRows();
  const done = 5;
  const totalD = MERIDIAN_STAGE_DAYS.reduce((a, b) => a + b, 0);
  const endDate = ddmm(MERIDIAN_BASE, totalD - 1);
  const st = (i: number) => stState(i, done, "run", true);

  return (
    [
      ["todo", "A fazer", "var(--line-strong)"],
      ["run", "Em andamento", "var(--flow)"],
      ["gate", "Aguardando você", "var(--warning)"],
      ["done", "Concluído", "var(--lime)"],
    ] as Array<[string, string, string]>
  ).map(([id, t, col]) => {
    let cards: KanbanCard[] = stages
      .map((x, i) => ({ x, i, k: st(i) }))
      .filter((o) => o.k === id || (id === "run" && o.k === "paused"))
      .map((o) => ({
        n: String(o.i + 1).padStart(2, "0"),
        t: o.x[0],
        who: o.x[1],
        ini: o.x[4],
        skill: o.x[2],
        cls: o.k === "gate" ? "gate" : "",
        hasB: o.k !== "todo" && o.k !== "done",
        b: SS[o.k][0],
        bcls: SS[o.k][1],
      }));
    if (id === "run") {
      cards = cards.concat([
        { n: "QA", t: "Ajuste hero-390 · menu cobre o título", who: "Vitor Construtor", ini: "VC", skill: "branch hero-390", cls: "", hasB: true, b: "subtarefa", bcls: "" },
        { n: "QA", t: "Assinatura de SEO · job-014", who: "Nina SEO", ini: "NS", skill: "meta · schema · sitemap", cls: "", hasB: true, b: "subtarefa", bcls: "" },
      ]);
    }
    if (id === "gate") {
      cards.push({
        n: "ENV",
        t: "Cadastrar SUPABASE_URL na Vercel",
        who: "Carlos Henrique",
        ini: "CH",
        skill: "HTTP 409 FABRICA-COMPLETION-001",
        cls: "gate",
        hasB: true,
        b: "erro",
        bcls: "danger",
      });
    }
    if (id === "todo" && cards.length > 6) {
      const more = cards.length - 5;
      cards = cards.slice(0, 5);
      cards.push({ n: "+" + more, t: "mais " + more + " etapas planejadas", who: "ver no roadmap", ini: "··", skill: "até " + endDate, cls: "", hasB: false, b: "", bcls: "" });
    }
    if (id === "done" && cards.length > 6) {
      const more = cards.length - 5;
      cards = cards.slice(-5);
      cards.unshift({ n: "+" + more, t: more + " etapas anteriores concluídas", who: "várias mesas", ini: "··", skill: "ver na esteira", cls: "", hasB: false, b: "", bcls: "" });
    }
    return { t, col, n: cards.length, cards, empty: cards.length === 0 };
  });
}

export interface RoadmapView {
  range: string;
  today: string;
  days: Array<{ x: string; t: string; lbl: boolean; c: string; fw: number }>;
  rows: Array<{
    n: string;
    t: string;
    who: string;
    x: string;
    w: string;
    gate: boolean;
    gx: string;
    lbl: string;
    bg: string;
    bd: string;
    fg: string;
    tc: string;
  }>;
  miles: Array<{ t: string; d: string; st: string; cls: string; c: string }>;
}

export function buildRoadmapMeridian(): RoadmapView {
  const stages = meridianStageRows();
  const done = 5;
  const daysArr = MERIDIAN_STAGE_DAYS;
  const totalD = daysArr.reduce((a, b) => a + b, 0);
  const startOf = (i: number) => daysArr.slice(0, i).reduce((a, b) => a + b, 0);
  const ci = Math.min(done, stages.length - 1);
  const todayF = done >= stages.length ? 1 : (startOf(ci) + daysArr[ci] * 0.5) / totalD;
  const todayDay = Math.floor(todayF * totalD);
  const st = (i: number) => stState(i, done, "run", true);

  return {
    range: ddmm(MERIDIAN_BASE, 0) + " → " + ddmm(MERIDIAN_BASE, totalD - 1) + " · " + totalD + " dias",
    today: todayF.toFixed(4),
    days: Array.from({ length: totalD }, (_, d) => ({
      x: ((d / totalD) * 100).toFixed(3),
      t: ddmm(MERIDIAN_BASE, d),
      lbl: totalD <= 16 || d % 2 === 0,
      c: d === todayDay ? "var(--warning)" : "var(--text-muted)",
      fw: d === todayDay ? 600 : 400,
    })),
    rows: stages.map((x, i) => {
      const k = st(i);
      const x0 = (startOf(i) / totalD) * 100;
      const w = (x[3] / totalD) * 100;
      const isGate = MERIDIAN_GATES.indexOf(i) >= 0;
      return {
        n: String(i + 1).padStart(2, "0"),
        t: x[0],
        who: x[1],
        x: x0.toFixed(3),
        w: w.toFixed(3),
        gate: isGate,
        gx: (x0 + w).toFixed(3),
        lbl: x[3] + (x[3] === 1 ? " dia" : " dias"),
        bg: k === "done" ? "var(--flow-subtle)" : k === "todo" ? "var(--surface-0)" : "var(--warning-subtle)",
        bd: k === "done" ? "var(--flow-subtle-line)" : k === "todo" ? "var(--line)" : "oklch(.80 .155 78 / .5)",
        fg: k === "done" ? "var(--flow)" : k === "todo" ? "var(--text-muted)" : "var(--warning)",
        tc: k === "todo" ? "var(--text-secondary)" : "var(--text-primary)",
      };
    }),
    miles: MERIDIAN_GATES.map((i) => {
      const k = st(i);
      return {
        t: stages[i][0],
        d: ddmm(MERIDIAN_BASE, startOf(i) + stages[i][3] - 1) + " · etapa " + String(i + 1).padStart(2, "0"),
        st: k === "done" ? "aprovado" : k === "todo" ? "previsto" : "agora",
        cls: k === "done" ? "flow" : k === "todo" ? "" : "warn",
        c: k === "done" ? "var(--flow)" : k === "todo" ? "var(--line-strong)" : "var(--lime)",
      };
    }),
  };
}

type WsFile = {
  id: string;
  name: string;
  dir: string;
  stage: number;
  kind: string;
  by: string;
  when: string;
  size: string;
  text?: string;
  img?: string;
};

const MERIDIAN_FILES: WsFile[] = [
  { id: "brief", name: "briefing.md", dir: "workspace/", stage: 0, kind: "md", by: "Paula PM", when: "23/10", size: "1,2 KB", text: "# Briefing · Meridian Capital\n\n## Quem é o cliente\nGestora patrimonial com 14 anos de mercado e 3 gerações de famílias atendidas.\n\n## Público\n- Famílias com patrimônio acima de R$ 5 mi\n- Herdeiros que vão assumir a gestão nos próximos 5 anos\n\n## Objetivo da landing\nAgendar uma conversa com um consultor.\n\n## Restrições\n- Nenhuma promessa de rentabilidade\n- Textos regulatórios passam pelo jurídico da Meridian\n\n> Prazo combinado: 04/11" },
  { id: "perg", name: "perguntas.md", dir: "workspace/", stage: 0, kind: "md", by: "Paula PM", when: "23/10", size: "0,6 KB", text: "# Perguntas ao cliente\n\n## 1. Quem decide a contratação?\nO patriarca ou a matriarca, quase sempre com um filho junto.\n\n## 2. Qual a principal objeção?\n\"Meu banco já faz isso.\"\n\n## 3. O que não pode aparecer?\nRentabilidade, comparação com CDI e nome de clientes." },
  { id: "refino", name: "refino.md", dir: "workspace/", stage: 1, kind: "md", by: "Arquiteto de Nicho", when: "24/10", size: "0,8 KB", text: "# Refino\n\n## Promessa\nPatrimônio com método, não com promessa.\n\n## Prova\n- 14 anos de mercado\n- 3 gerações atendidas\n- Relatório mensal para toda a família\n\n## Ângulos descartados\n- \"Seu dinheiro rende mais\": claim proibido\n- \"O banco da sua família\": soa como instituição financeira" },
  { id: "dossie", name: "dossie.md", dir: "workspace/", stage: 2, kind: "md", by: "Dora Descoberta", when: "25/10", size: "1,4 KB", text: "# Dossiê\n\n## O que os concorrentes fazem\n- 5 sites lidos\n- 4 prometem rentabilidade na primeira dobra\n- Nenhum fala de sucessão\n\n## Espaço livre\nFalar de método e de sucessão, com linguagem sóbria.\n\n> Ver claims.csv para o que pode e o que não pode ser dito." },
  { id: "claims", name: "claims.csv", dir: "workspace/", stage: 2, kind: "csv", by: "Dora Descoberta", when: "25/10", size: "0,4 KB", text: "claim,permitido,fonte\n14 anos de mercado,sim,contrato social\n3 gerações atendidas,sim,carteira de clientes\nRelatório mensal,sim,contrato padrão\nRentabilidade acima do CDI,não,CVM 175\nMelhor gestora do país,não,sem fonte" },
  { id: "comp", name: "concorrente-patrimonia.png", dir: "workspace/refs/", stage: 2, kind: "img", img: "comp", by: "Dora Descoberta", when: "25/10", size: "420 KB · 1440 × 900" },
  { id: "arq", name: "arquitetura.md", dir: "workspace/", stage: 3, kind: "md", by: "Théo Tech Lead", when: "26/10", size: "0,7 KB", text: "# Arquitetura\n\n## Stack\n- Nuxt 3 estático\n- Formulário com Supabase na conta do cliente\n- Hospedagem na conta da Meridian\n\n## Seções\n- Hero\n- Prova social\n- Serviços\n- Time\n- Contato\n\n> Aprovada por Carlos no gate de 10:05." },
  { id: "nuxt", name: "nuxt.config.ts", dir: "", stage: 3, kind: "code", by: "Théo Tech Lead", when: "26/10", size: "41 linhas", text: "export default defineNuxtConfig({\n  ssr: true,\n  nitro: { preset: 'static' },\n  app: {\n    head: { htmlAttrs: { lang: 'pt-BR' } },\n  },\n  runtimeConfig: {\n    supabaseUrl: process.env.SUPABASE_URL,\n  },\n})" },
  { id: "index", name: "index.vue", dir: "src/pages/", stage: 4, kind: "code", by: "Vitor Construtor", when: "hoje 11:30", size: "412 linhas", text: "<template>\n  <main>\n    <SiteNav :links=\"links\" />\n    <Hero\n      eyebrow=\"Gestão patrimonial\"\n      title=\"Patrimônio com método, não com promessa.\"\n    />\n    <Proof />\n    <Services :items=\"services\" />\n    <Team />\n    <Contact />\n  </main>\n</template>" },
  { id: "hero", name: "Hero.vue", dir: "src/components/", stage: 4, kind: "code", by: "Vitor Construtor", when: "hoje 14:20", size: "88 linhas", text: "<script setup>\ndefineProps({ eyebrow: String, title: String })\n</script>\n\n<template>\n  <section class=\"hero\">\n    <p class=\"eyebrow\">{{ eyebrow }}</p>\n    <h1>{{ title }}</h1>\n    <!-- hero-390: menu vira ícone abaixo de 768 px -->\n    <CtaButton>Agendar conversa</CtaButton>\n  </section>\n</template>" },
  { id: "build", name: "build.log", dir: "workspace/", stage: 4, kind: "code", by: "Vitor Construtor", when: "hoje 14:02", size: "6 linhas", text: "[14:01:12] nuxi generate\n[14:01:31] 5 rotas pré-renderizadas\n[14:01:44] imagens otimizadas · 1,1 MB economizados\n[14:02:03] build ok · 4,2 MB\n[14:02:03] aviso: SUPABASE_URL ausente no ambiente de deploy" },
  { id: "env", name: ".env.example", dir: "", stage: 4, kind: "code", by: "Davi DevOps", when: "hoje 12:31", size: "3 linhas", text: "NUXT_PUBLIC_SITE=meridian.com.br\nSUPABASE_ANON_KEY=\nSUPABASE_URL=" },
  { id: "p1440", name: "prova-1440.png", dir: "workspace/provas/", stage: 4, kind: "img", img: "desk", by: "Yuri UX", when: "hoje 13:50", size: "612 KB · 1440 × 2200" },
  { id: "qa", name: "qa.md", dir: "workspace/", stage: 5, kind: "md", by: "Edna E2E", when: "hoje 14:16", size: "0,5 KB", text: "# QA · Meridian\n\n## Critérios de pronto\n- [x] Build sem erro\n- [x] Links internos (38)\n- [x] Lighthouse 92 / 96\n- [x] Prova visual 1440 px\n- [ ] Prova visual 390 px\n- [ ] SEO assinado\n- [x] Headers de segurança\n- [x] Acessibilidade AA\n\n> Responsável: Edna E2E. O gate só assina com todos marcados." },
  { id: "lh", name: "lighthouse.json", dir: "workspace/", stage: 5, kind: "json", by: "Edna E2E", when: "hoje 14:10", size: "6 linhas", text: "{\n  \"performance\": 92,\n  \"accessibility\": 96,\n  \"best-practices\": 100,\n  \"seo\": 91\n}" },
  { id: "p390", name: "prova-390.png", dir: "workspace/provas/", stage: 5, kind: "img", img: "mob", by: "Yuri UX", when: "hoje 14:22", size: "388 KB · 390 × 1600" },
  { id: "meridian-tproj", name: "project.json", dir: ".tavir/", stage: -1, kind: "json", by: "Product Lab", when: "criação", size: "0,4 KB", text: "{\n  \"projeto\": \"Landing Meridian Capital\",\n  \"esteira\": \"LP-C1\",\n  \"pasta\": \"tavir-clientes/meridian-lp-a41e\",\n  \"motor\": \"cursor · auto\",\n  \"guard\": \"8 regras físicas\"\n}" },
  { id: "meridian-tiso", name: "isolation.json", dir: ".tavir/", stage: -1, kind: "json", by: "Product Lab", when: "criação", size: "0,3 KB", text: "{\n  \"git\": \"repositório próprio · MERIDIAN\",\n  \"env\": \".env local, fora do Git\",\n  \"rede\": \"somente allowlist\",\n  \"escrita\": \"apenas dentro da pasta do projeto\"\n}" },
];

export interface WorkspaceView {
  git: string;
  path: string;
  disk0: number;
  disk1: number;
  disk2: string;
  treeInfo: string;
  tree: Array<{ name: string; pad: number; icon: string; on: string; badge: string; bcls: string; size: string }>;
  ffs: Array<{ id: string | number; label: string; n: number; on: boolean }>;
  projFiles: Array<{
    name: string;
    ext: string;
    stage: string;
    meta: string;
    dirty: boolean;
    isImg: boolean;
    isText: boolean;
    snip: string;
    thumbBg: string;
    imgPaper: string;
    imgInk: string;
  }>;
  noProjFiles: boolean;
}

export function buildWorkspaceMeridian(ff: string | number = "all"): WorkspaceView {
  const stages = meridianStageRows();
  const pFiles = MERIDIAN_FILES;
  const fStages: number[] = [];
  pFiles.forEach((f) => {
    if (fStages.indexOf(f.stage) < 0) fStages.push(f.stage);
  });
  fStages.sort((a, b) => a - b);
  const shown = pFiles.filter((f) => ff === "all" || f.stage === ff);

  const dirSet: Record<string, boolean> = {};
  pFiles.forEach((f) => {
    let d = f.dir;
    while (d) {
      dirSet[d] = true;
      d = d.replace(/[^/]+\/$/, "");
    }
  });
  const kidsOf = (dir: string) =>
    Object.keys(dirSet)
      .filter((d) => d !== dir && d.indexOf(dir) === 0 && d.slice(dir.length).replace(/\/$/, "").indexOf("/") < 0)
      .sort();
  const tree: WorkspaceView["tree"] = [];
  const walk = (dir: string, depth: number) => {
    kidsOf(dir).forEach((d) => {
      const nIn = pFiles.filter((f) => f.dir.indexOf(d) === 0).length;
      tree.push({
        name: d.slice(dir.length),
        pad: 14 + depth * 16,
        icon: ICX.folderOpen,
        on: "dir",
        badge: "DIR",
        bcls: "flow",
        size: nIn + (nIn === 1 ? " item" : " itens"),
      });
      walk(d, depth + 1);
    });
    pFiles
      .filter((f) => f.dir === dir)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((f) =>
        tree.push({
          name: f.name,
          pad: 14 + depth * 16,
          icon: ICX.file,
          on: "",
          badge: f.name.split(".").pop()!.toUpperCase(),
          bcls: "",
          size: f.size.split(" · ")[0],
        }),
      );
  };
  walk("", 0);

  return {
    git: "MERIDIAN",
    path: ROOT + "tavir-clientes\\meridian-lp-a41e",
    disk0: 16,
    disk1: 58,
    disk2: "Nuxt 3",
    treeInfo: "16 pastas · 58 arquivos",
    tree,
    ffs: (
      [{ id: "all" as string | number, label: "Todos", n: pFiles.length, on: ff === "all" }] as Array<{
        id: string | number;
        label: string;
        n: number;
        on: boolean;
      }>
    ).concat(
      fStages.map((i) => ({
        id: i as string | number,
        label: stages[i] ? stages[i][0].replace(/ ·.*$/, "") : ".tavir",
        n: pFiles.filter((f) => f.stage === i).length,
        on: ff === i,
      })),
    ),
    projFiles: shown.map((f) => {
      const txt = f.kind === "img" ? "" : f.text || "";
      return {
        name: f.name,
        ext: f.name.split(".").pop() || "",
        stage: stages[f.stage] ? stages[f.stage][0].replace(/ ·.*$/, "") : "workspace",
        meta: f.by + " · " + f.when,
        dirty: false,
        isImg: f.kind === "img",
        isText: f.kind !== "img",
        snip: txt.split("\n").slice(0, 7).join("\n"),
        thumbBg: f.kind === "img" ? (f.img === "comp" ? "#d1d5db" : "#1a2438") : "var(--surface-0)",
        imgPaper: f.img === "comp" ? "#ffffff" : "#f6f3ee",
        imgInk: f.img === "comp" ? "#1f2937" : "#13233d",
      };
    }),
    noProjFiles: shown.length === 0,
  };
}

