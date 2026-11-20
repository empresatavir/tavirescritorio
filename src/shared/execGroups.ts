/**
 * Execuções agrupadas por item.
 *
 * Uma linha por item (item do trilho de um projeto, caso do Raio-X, peça do Studio…); cada execução
 * ou retomada vira uma tentativa dentro dela. Nada de percentual inventado: a linha mostra o estado
 * da última tentativa, quantas tentativas houve e o tempo real somado.
 *
 * Fonte única: o main usa nos testes e o build do renderer (scripts/clean_and_bind_ipc.js) injeta
 * dist/shared/execGroups.js na tela Execuções. Por isso este arquivo não importa nada.
 */

export type ExecStatus = 'running' | 'paused' | 'failed' | 'completed' | 'cancelled';

/** O que o livro devolve (OfficeRun) ou o que o evento ao vivo traz. */
export interface ExecRunLike {
  id: string;
  kind?: string;
  label?: string;
  stage?: string;
  owner?: string;
  module?: string;
  place?: string;
  workspace?: string;
  status?: string;
  error?: string;
  startedAt?: string;
  durationMs?: number;
  engine?: string;
  model?: string;
  mode?: string;
  usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number };
  cancelled?: boolean;
  checkpointAt?: string;
  checkpointLabel?: string;
  checkpointHint?: string;
  trackPos?: { index: number; total: number };
}

export interface ExecAttempt {
  id: string;
  key: string;
  kind: string;
  focus: string;
  module: string;
  place: string;
  workspace: string;
  status: ExecStatus;
  startedAt: string;
  startedMs: number;
  /** Duração gravada no livro. Rodando: 0 (o tempo sai de agora − início). */
  durationMs: number;
  error: string;
  stage: string;
  engine: string;
  model: string;
  effort: string;
  costUsd: number;
  tokens: number;
  /** Veio do evento ao vivo e ainda não foi casado com o livro. */
  live: boolean;
  checkpointAt: string;
  checkpointLabel: string;
  checkpointHint: string;
  trackPos?: { index: number; total: number };
}

export interface ExecGroupAttempt extends ExecAttempt {
  /** Número da tentativa dentro da linha (1 = a mais antiga). */
  n: number;
}

export interface ExecGroup {
  key: string;
  title: string;
  module: string;
  place: string;
  workspace: string;
  /** Mais recente primeiro. */
  attempts: ExecGroupAttempt[];
  last: ExecGroupAttempt;
  status: ExecStatus;
  count: number;
  totalMs: number;
  lastStartedMs: number;
  canFollow: boolean;
  checkpointAt: string;
  checkpointHint: string;
  stepText: string;
  /** Como parar a última tentativa: trilho da Fábrica, análise do Raio-X ou nada. */
  stop: '' | 'trilho' | 'raiox' | 'escritorio';
}

export type ExecOverrides = Record<string, 'paused' | 'cancelled'>;

const PAUSE_RE = /pausado por carlos/i;
const CONT_RE = /^continuidade\s*·\s*/i;
/** Janela para casar a linha do evento ao vivo com o run do livro. */
const LIVE_MATCH_MS = 3 * 60 * 1000;
/**
 * Nenhum motor roda mais que isso (o teto é 45 min). Um run "rodando" mais velho ficou órfão:
 * o app fechou antes do fim e o livro nunca recebeu o término.
 */
export const STALE_RUNNING_MS = 6 * 60 * 60 * 1000;
export const STALE_TEXT = 'Interrompida: o processo não terminou (o app pode ter fechado no meio).';

export const GROUP_FILTERS: ReadonlyArray<readonly [string, string]> = [
  ['all', 'Todos'],
  ['running', 'Rodando'],
  ['stopped', 'Parados'],
  ['completed', 'Concluídos'],
  ['Fábrica', 'Fábrica'],
  ['Raio-X', 'Raio-X'],
  ['Studio', 'Studio'],
  ['Flow', 'Flow'],
  ['Edição', 'Edição'],
  ['Escritório', 'Escritório'],
];

export function normPath(p: string | undefined): string {
  return String(p || '').trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

/** O item de uma execução. "Continuidade · X" é uma retomada de X. */
export function focusOf(label: string | undefined): string {
  let s = String(label || '').trim();
  while (CONT_RE.test(s)) s = s.replace(CONT_RE, '').trim();
  return s || 'Execução';
}

export function keyOf(module: string, workspace: string, focus: string): string {
  // Raio-X: o item é o caso (a pasta), não o rótulo de cada análise.
  // Raio-X e Escritório: o item é a pasta (o caso / a tarefa T-n), não o rótulo de cada execução.
  if (module === 'Raio-X' || module === 'Escritório') return `${module}|${normPath(workspace)}`;
  return `${module}|${normPath(workspace)}|${focus.toLowerCase()}`;
}

export function statusOf(run: Pick<ExecRunLike, 'status' | 'error' | 'cancelled'>): ExecStatus {
  if (run.cancelled) return 'cancelled';
  const s = String(run.status || '');
  if (s === 'running') return 'running';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'paused' || (s !== 'ok' && s !== 'completed' && PAUSE_RE.test(String(run.error || '')))) return 'paused';
  if (s === 'failed') return 'failed';
  return 'completed';
}

function ms(iso: string | undefined): number {
  const v = Date.parse(String(iso || ''));
  return Number.isFinite(v) ? v : 0;
}

export function attemptFromRun(run: ExecRunLike, now?: number): ExecAttempt {
  const module = String(run.module || 'Chat');
  const focus = focusOf(run.label);
  const workspace = String(run.workspace || '');
  let status = statusOf(run);
  const stale = status === 'running' && typeof now === 'number' && ms(run.startedAt) > 0 && now - ms(run.startedAt) > STALE_RUNNING_MS;
  if (stale) status = 'failed';
  const usage = run.usage || {};
  return {
    id: String(run.id),
    key: keyOf(module, workspace, focus),
    kind: String(run.kind || ''),
    focus,
    module,
    place: String(run.place || run.owner || ''),
    workspace,
    status,
    startedAt: String(run.startedAt || ''),
    startedMs: ms(run.startedAt),
    durationMs: status === 'running' ? 0 : Math.max(0, Number(run.durationMs) || 0),
    error: stale ? STALE_TEXT : status === 'paused' ? '' : String(run.error || ''),
    stage: String(run.stage || ''),
    engine: String(run.engine || ''),
    model: String(run.model || ''),
    effort: String(run.mode || ''),
    costUsd: Number(usage.costUsd) || 0,
    tokens: (Number(usage.inputTokens) || 0) + (Number(usage.outputTokens) || 0),
    live: false,
    checkpointAt: String(run.checkpointAt || ''),
    checkpointLabel: String(run.checkpointLabel || ''),
    checkpointHint: String(run.checkpointHint || ''),
    trackPos: run.trackPos,
  };
}

/** Linha provisória de um evento ao vivo do trilho, até o livro trazer o run de verdade. */
export function liveAttempt(info: {
  id: string;
  workspace: string;
  focus: string;
  place?: string;
  startedAt?: string;
  status?: ExecStatus;
  engine?: string;
  model?: string;
  error?: string;
}): ExecAttempt {
  const module = 'Fábrica';
  const focus = focusOf(info.focus);
  return {
    id: info.id,
    key: keyOf(module, info.workspace, focus),
    kind: 'trilho',
    focus,
    module,
    place: String(info.place || ''),
    workspace: info.workspace,
    status: info.status || 'running',
    startedAt: String(info.startedAt || ''),
    startedMs: ms(info.startedAt),
    durationMs: 0,
    error: String(info.error || ''),
    stage: '',
    engine: String(info.engine || ''),
    model: String(info.model || ''),
    effort: 'trilho',
    costUsd: 0,
    tokens: 0,
    live: true,
    checkpointAt: '',
    checkpointLabel: '',
    checkpointHint: '',
  };
}

function byRecent(a: ExecAttempt, b: ExecAttempt): number {
  if (a.startedMs !== b.startedMs) return b.startedMs - a.startedMs;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

function applyOverride(a: ExecAttempt, overrides: ExecOverrides | undefined): ExecAttempt {
  const o = overrides && overrides[a.id];
  if (!o) return a;
  if (o === 'cancelled' && a.status !== 'cancelled') return { ...a, status: 'cancelled', error: '' };
  if (o === 'paused' && a.status === 'running') return { ...a, status: 'paused' };
  return a;
}

/**
 * Junta o que já estava na tela com a leitura nova do livro, por id.
 * - o livro manda no estado; custo e tokens que já apareceram não somem se a leitura vier sem;
 * - a linha do evento ao vivo é casada com o run do livro (mesma pasta, mesmo item, início perto)
 *   e sai da lista; `aliases` diz para onde ela foi (logs e seleção seguem junto);
 * - a ordem é estável: início mais recente primeiro, empate por id.
 */
export function mergeAttempts(
  prev: ExecAttempt[],
  fresh: ExecAttempt[],
  overrides?: ExecOverrides,
): { attempts: ExecAttempt[]; aliases: Record<string, string> } {
  const prevById = new Map(prev.map((a) => [a.id, a]));
  const freshIds = new Set(fresh.map((a) => a.id));
  const out: ExecAttempt[] = fresh.map((f) => {
    const old = prevById.get(f.id);
    const merged = old
      ? { ...f, costUsd: f.costUsd || old.costUsd, tokens: f.tokens || old.tokens }
      : f;
    return applyOverride(merged, overrides);
  });
  const aliases: Record<string, string> = {};
  const taken = new Set<string>();
  const lives = prev.filter((a) => a.live && !freshIds.has(a.id)).sort((a, b) => a.startedMs - b.startedMs);
  for (const live of lives) {
    let best: ExecAttempt | null = null;
    let bestDiff = Infinity;
    for (const f of fresh) {
      if (f.live || taken.has(f.id)) continue;
      if (normPath(f.workspace) !== normPath(live.workspace)) continue;
      if (f.focus.toLowerCase() !== live.focus.toLowerCase()) continue;
      const diff = live.startedMs && f.startedMs ? Math.abs(f.startedMs - live.startedMs) : f.status === 'running' ? 0 : Infinity;
      if (diff <= LIVE_MATCH_MS && diff < bestDiff) {
        best = f;
        bestDiff = diff;
      }
    }
    if (best) {
      taken.add(best.id);
      aliases[live.id] = best.id;
    } else {
      out.push(applyOverride(live, overrides));
    }
  }
  out.sort(byRecent);
  return { attempts: out, aliases };
}

/** Tira o que o livro já confirmou; o resto continua valendo até ele alcançar. */
export function pruneOverrides(overrides: ExecOverrides, fresh: ExecAttempt[]): ExecOverrides {
  const next: ExecOverrides = {};
  const byId = new Map(fresh.map((a) => [a.id, a]));
  for (const id of Object.keys(overrides)) {
    const want = overrides[id];
    const got = byId.get(id);
    if (!got) {
      next[id] = want;
      continue;
    }
    if (want === 'cancelled' && got.status === 'cancelled') continue;
    if (want === 'paused' && got.status !== 'running') continue;
    next[id] = want;
  }
  return next;
}

/** Evento ao vivo do trilho (run:event com meta.track). Devolve a lista nova; não muta a antiga. */
export function applyLiveEvent(
  list: ExecAttempt[],
  evt: { runId: string; type?: string; timestamp?: string; content?: string; meta?: Record<string, any> },
  aliases: Record<string, string>,
  now: number,
): { attempts: ExecAttempt[]; id: string; ended: boolean } {
  const meta = evt.meta || {};
  const id = aliases[evt.runId] || evt.runId;
  const ended = !!meta.ended;
  const evStatus: ExecStatus = ended
    ? meta.status === 'failed' || (!meta.status && evt.type === 'error')
      ? 'failed'
      : meta.status === 'paused'
        ? 'paused'
        : 'completed'
    : 'running';
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) {
    // Sem pasta não dá para casar com o livro: só o log guarda a linha.
    if (!meta.workspace || !(meta.focus || meta.title)) return { attempts: list, id, ended };
    const a = liveAttempt({
      id,
      workspace: String(meta.workspace),
      focus: String(meta.focus || meta.title),
      place: String(meta.projectName || ''),
      startedAt: String(meta.startedAt || evt.timestamp || new Date(now).toISOString()),
      status: evStatus,
      engine: meta.motor,
      model: meta.model,
      error: ended && evStatus === 'failed' ? String(evt.content || '') : '',
    });
    return { attempts: [a, ...list].sort(byRecent), id, ended };
  }
  const cur = list[idx];
  // O livro manda nas tentativas que já vieram dele; o evento só atualiza a linha provisória.
  if (!cur.live) return { attempts: list, id, ended };
  if (cur.status === 'cancelled') return { attempts: list, id, ended };
  let next: ExecAttempt = cur;
  if (ended) {
    next = {
      ...cur,
      status: evStatus,
      durationMs: cur.startedMs ? Math.max(0, now - cur.startedMs) : 0,
      error: evStatus === 'failed' ? String(evt.content || '') : '',
    };
  }
  if (next === cur) return { attempts: list, id, ended };
  const copy = list.slice();
  copy[idx] = next;
  return { attempts: copy, id, ended };
}

export function fmtDuration(msValue: number): string {
  const t = Math.max(0, Math.round((Number(msValue) || 0) / 1000));
  if (t < 60) return `${t} s`;
  if (t < 3600) return `${Math.floor(t / 60)} min`;
  return `${Math.floor(t / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')} min`;
}

export function attemptElapsed(a: Pick<ExecAttempt, 'status' | 'startedMs' | 'durationMs'>, now: number): number {
  if (a.status === 'running') return a.startedMs ? Math.max(0, now - a.startedMs) : 0;
  return a.durationMs || 0;
}

export function timeText(status: ExecStatus, elapsed: number): string {
  const t = elapsed > 0 ? fmtDuration(elapsed) : '';
  switch (status) {
    case 'running':
      return t ? `Rodando há ${t}` : 'Iniciando';
    case 'failed':
      return t ? `Falhou em ${t}` : 'Falhou';
    case 'paused':
      return t ? `Pausado em ${t}` : 'Pausado';
    case 'cancelled':
      return t ? `Cancelado em ${t}` : 'Cancelado';
    default:
      return t ? `Concluído em ${t}` : 'Concluído';
  }
}

function checkpointOwner(attempts: ExecAttempt[]): ExecAttempt | null {
  return attempts.find((a) => !a.live && a.checkpointAt) || null;
}

/** O checkpoint é da pasta; só vale para a linha cujo item ele guarda. */
export function checkpointBelongs(group: Pick<ExecGroup, 'module' | 'attempts'>): boolean {
  const owner = checkpointOwner(group.attempts);
  if (!owner) return false;
  if (group.module === 'Raio-X') return true;
  return focusOf(owner.checkpointLabel).toLowerCase() === owner.focus.toLowerCase();
}

export function stopKind(a: Pick<ExecAttempt, 'kind' | 'module' | 'focus'> & { label?: string }): '' | 'trilho' | 'raiox' | 'escritorio' {
  if (a.module === 'Escritório' && a.kind === 'tarefa') return 'escritorio';
  if (a.module === 'Raio-X' && a.kind === 'raiox') return 'raiox';
  if (a.module === 'Fábrica' && a.kind === 'trilho') return 'trilho';
  return '';
}

export function buildGroups(attempts: ExecAttempt[], now: number): ExecGroup[] {
  const byKey = new Map<string, ExecAttempt[]>();
  for (const a of attempts) {
    if (!a || !a.key) continue;
    const list = byKey.get(a.key);
    if (list) list.push(a);
    else byKey.set(a.key, [a]);
  }
  const groups: ExecGroup[] = [];
  for (const [key, list] of byKey) {
    const sorted = list.slice().sort(byRecent);
    const numbered: ExecGroupAttempt[] = sorted.map((a, i) => ({ ...a, n: sorted.length - i }));
    const last = numbered[0];
    const totalMs = numbered.reduce((sum, a) => sum + attemptElapsed(a, now), 0);
    const base = { module: last.module, attempts: numbered };
    const owner = checkpointOwner(numbered);
    const belongs = checkpointBelongs(base);
    const pos = (numbered.find((a) => a.trackPos) || {}).trackPos;
    const stage = numbered.find((a) => a.stage)?.stage || '';
    const stepText = pos
      ? `Item ${pos.index + 1} de ${pos.total}`
      : stage && stage.toLowerCase() !== last.focus.toLowerCase()
        ? stage
        : '';
    groups.push({
      key,
      title: last.focus,
      module: last.module,
      place: (numbered.find((a) => a.place) || last).place,
      workspace: (numbered.find((a) => a.workspace) || last).workspace,
      attempts: numbered,
      last,
      status: last.status,
      count: numbered.length,
      totalMs,
      lastStartedMs: last.startedMs,
      canFollow: belongs && last.status !== 'completed' && last.status !== 'running',
      checkpointAt: belongs && owner ? owner.checkpointAt : '',
      checkpointHint: belongs && owner ? owner.checkpointHint : '',
      stepText,
      stop: last.status === 'running' ? stopKind(last) : '',
    });
  }
  groups.sort((a, b) => (a.lastStartedMs !== b.lastStartedMs ? b.lastStartedMs - a.lastStartedMs : a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return groups;
}

export function matchesFilter(g: Pick<ExecGroup, 'status' | 'module'>, filter: string): boolean {
  switch (filter) {
    case 'all':
    case '':
      return true;
    case 'running':
      return g.status === 'running';
    case 'stopped':
      return g.status === 'paused' || g.status === 'failed' || g.status === 'cancelled';
    case 'completed':
      return g.status === 'completed';
    default:
      return g.module === filter;
  }
}

export function filterCounts(groups: Pick<ExecGroup, 'status' | 'module'>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id] of GROUP_FILTERS) out[id] = groups.filter((g) => matchesFilter(g, id)).length;
  return out;
}

/**
 * Linha e tentativa selecionadas. Tentativa explícita ganha; senão a linha pedida com a última
 * tentativa; senão a primeira linha visível.
 */
export function pickSelection(
  groups: ExecGroup[],
  sel: { groupKey?: string; attemptId?: string },
  visible?: ExecGroup[],
): { group: ExecGroup; attempt: ExecGroupAttempt } | null {
  const shown = (g: ExecGroup) => !visible || !visible.length || visible.some((x) => x.key === g.key);
  if (sel.attemptId) {
    for (const g of groups) {
      const a = g.attempts.find((x) => x.id === sel.attemptId);
      if (a && shown(g)) return { group: g, attempt: a };
    }
  }
  let g = (sel.groupKey && groups.find((x) => x.key === sel.groupKey)) || (visible && visible[0]) || groups[0];
  // Filtro trocado e a linha escolhida saiu da lista: o detalhe acompanha a primeira visível.
  if (g && !shown(g)) g = visible![0];
  if (!g) return null;
  return { group: g, attempt: g.last };
}

/** Campos que o painel da sala (cards de jobs rodando) ainda lê de s.jobs. */
export function jobRow<T extends ExecAttempt>(a: T, now: number) {
  return {
    ...a,
    title: a.focus,
    who: [a.module, a.place].filter(Boolean).join(' · '),
    ini: String(a.module || 'EX').slice(0, 2).toUpperCase(),
    progress: a.status === 'completed' ? 100 : 0,
    progTxt: timeText(a.status, attemptElapsed(a, now)),
    cost: a.costUsd,
    ceiling: 0,
    motor: a.engine || '—',
    task: a.stage || '—',
  };
}
