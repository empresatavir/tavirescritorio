/**
 * Fila na nuvem · lado do TAVIR Escritório.
 *
 * O APK (TAVIR Controle Mobile) grava pedidos em `office_commands` no Supabase do Escritório
 * (card "TAVIR Escritório · Supabase" em Contas e cofre). Este worker, no processo main:
 *   1. pega só os pedidos de tarefa (`task.*`), em ordem;
 *   2. aplica no Kanban avulso do Escritório (mesmas funções da tela);
 *   3. publica o Kanban em `office_tasks` (ele é o único escritor dessa tabela);
 *   4. confirma o pedido.
 * Jobs, pendências e preferências continuam com o server.py do novo-app (status id 1).
 * O Escritório bate ponto como status id 2.
 *
 * Só conexões de saída. A chave de serviço sai do cofre e fica neste processo.
 */
import { createHash } from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';

export const DESK_KINDS = [
  'task.create', 'task.update', 'task.move', 'task.delete',
  // v3: fila de execução (officeExec)
  'task.run', 'task.plan', 'task.approve', 'task.revise', 'task.stop',
] as const;
const EXEC_KINDS = new Set(['task.run', 'task.plan', 'task.approve', 'task.revise', 'task.stop']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Como a tela do Escritório devolve uma task (listTaskRecords / createTaskRecord). */
export interface DeskTask {
  id: string;
  seq: number;
  title: string;
  desc?: string;
  status: string;
  who?: string;
  prio?: string;
  sector?: string;
}

/** Como o APK enxerga uma tarefa (mesmo formato do office.py). */
export interface AppTask {
  id: string;
  n: number;
  title: string;
  description: string;
  sector: string;
  prio: string;
  assignee: string;
  col: 'todo' | 'doing' | 'done';
  client_ref: string | null;
  origin_command_id: string | null;
  /** Estado da execução (officeExec.TaskRunView) ou null se nunca rodou. */
  run?: Record<string, unknown> | null;
}

export interface Command {
  id: string;
  kind: string;
  target_ref?: string | null;
  payload?: Record<string, unknown> | null;
  expect?: Record<string, unknown> | null;
}

export interface Outcome {
  status: 'applied' | 'rejected';
  code: number;
  body: unknown;
  ref: string | null;
  cached?: boolean;
}

export interface DeskStore {
  list(): DeskTask[];
  create(params: Record<string, unknown>): DeskTask;
  update(id: string, patch: Record<string, unknown>): void;
  remove(id: string): void;
  ledgerGet(id: string): Outcome | null;
  ledgerPut(id: string, kind: string, outcome: Outcome): void;
  /** Fila de execução. Sem ela, os pedidos task.run/plan/approve/revise/stop são recusados. */
  exec?: DeskExec;
}

export type ExecOutcome = { ok: true } | { ok: false; code: number; error: string };
export interface DeskExec {
  enqueue(taskId: string, mode: 'plan' | 'exec', agent: string, opts: { origin: string; id: string }): ExecOutcome;
  approve(taskId: string): ExecOutcome;
  revise(taskId: string, note: string, origin: string, id: string): ExecOutcome;
  stop(taskId: string): ExecOutcome;
  views(): Record<string, Record<string, unknown>>;
}

export interface DeskRemote {
  rpc(fn: string, args: Record<string, unknown>): Promise<any>;
  upsert(table: string, rows: Record<string, unknown>[], onConflict: string): Promise<void>;
  markDeleted(table: string, keyCol: string, keys: string[], when: string): Promise<void>;
  select(table: string, query: Record<string, string>): Promise<any[]>;
}

// ---------------------------------------------------------------- conversões

export function statusToCol(status: string): AppTask['col'] {
  if (status === 'done') return 'done';
  if (status === 'in_progress') return 'doing';
  return 'todo';
}

export function colToStatus(col: unknown): string | null {
  if (col === 'todo') return 'to_plan';
  if (col === 'doing') return 'in_progress';
  if (col === 'done') return 'done';
  return null;
}

export function prioToApp(prio?: string): string {
  if (prio === 'Crítica') return 'Urgente';
  if (prio === 'Alta') return 'Alta';
  return 'Normal';
}

export function prioToDesk(prio: unknown): string {
  const p = String(prio || '');
  if (p === 'Urgente' || p === 'Crítica') return 'Crítica';
  if (p === 'Alta') return 'Alta';
  return 'Normal';
}

export function toAppTask(t: DeskTask, run?: Record<string, unknown> | null): AppTask {
  const ref = UUID.test(t.id) ? t.id : null;
  return {
    id: `T-${t.seq}`,
    n: Number(t.seq) || 0,
    title: t.title,
    description: t.desc || '',
    sector: t.sector || 'Operação',
    prio: prioToApp(t.prio),
    assignee: t.who || 'Carlos',
    col: statusToCol(t.status),
    client_ref: ref,
    origin_command_id: ref,
    run: run || null,
  };
}

/** Acha a task pelo id do app (T-12), pelo id do Escritório ou pelo uuid do pedido que a criou. */
export function resolveTask(tasks: DeskTask[], ref: string): DeskTask | null {
  const r = String(ref || '').trim();
  if (!r) return null;
  const m = /^T-(\d+)$/i.exec(r);
  if (m) return tasks.find((t) => Number(t.seq) === Number(m[1])) || null;
  return tasks.find((t) => t.id === r) || null;
}

// ---------------------------------------------------------------- aplicar

function reject(code: number, detail: string, extra: Record<string, unknown> = {}): Outcome {
  return { status: 'rejected', code, body: { detail, ...extra }, ref: null };
}

/** Aplica um pedido de tarefa. Idempotente: repetir o mesmo pedido não muda o resultado. */
export function applyDeskCommand(store: DeskStore, cmd: Command): Outcome {
  const cached = store.ledgerGet(cmd.id);
  if (cached) return { ...cached, cached: true };
  const out = applyFresh(store, cmd);
  store.ledgerPut(cmd.id, cmd.kind, out);
  return out;
}

function applyFresh(store: DeskStore, cmd: Command): Outcome {
  const p = (cmd.payload || {}) as Record<string, unknown>;
  const tasks = store.list();
  const text = (v: unknown) => String(v ?? '').trim();

  if (cmd.kind === 'task.create') {
    const existing = tasks.find((t) => t.id === cmd.id);
    if (existing) return { status: 'applied', code: 201, body: toAppTask(existing), ref: `T-${existing.seq}` };
    const title = text(p.title);
    if (!title) return reject(400, 'Preencha este campo para continuar');
    const created = store.create({
      id: cmd.id,
      title,
      desc: text(p.description),
      prio: prioToDesk(p.prio),
      sector: text(p.sector) || 'Operação',
      status: 'to_plan',
    });
    return { status: 'applied', code: 201, body: toAppTask(created), ref: `T-${created.seq}` };
  }

  const alvo = resolveTask(tasks, String(cmd.target_ref || ''));

  if (cmd.kind === 'task.delete') {
    // Já não existe: o estado final é o pedido. Não é erro.
    if (!alvo) return { status: 'applied', code: 204, body: null, ref: null };
    store.remove(alvo.id);
    return { status: 'applied', code: 204, body: null, ref: `T-${alvo.seq}` };
  }

  if (!alvo) return reject(404, `Tarefa ${cmd.target_ref} não existe no Escritório`);
  const atual = toAppTask(alvo);

  if (EXEC_KINDS.has(cmd.kind)) {
    if (!store.exec) return reject(503, 'A fila de execução não está ligada neste Escritório');
    const ex = store.exec;
    let r: ExecOutcome;
    if (cmd.kind === 'task.run') r = ex.enqueue(alvo.id, 'exec', text(p.agent) === 'plano' ? 'plano' : 'geral', { origin: 'apk', id: cmd.id });
    else if (cmd.kind === 'task.plan') r = ex.enqueue(alvo.id, 'plan', 'paula', { origin: 'apk', id: cmd.id });
    else if (cmd.kind === 'task.approve') r = ex.approve(alvo.id);
    else if (cmd.kind === 'task.revise') r = ex.revise(alvo.id, text(p.note), 'apk', cmd.id);
    else r = ex.stop(alvo.id);
    if (!r.ok) return reject(r.code, r.error);
    const depois = resolveTask(store.list(), alvo.id) || alvo;
    return { status: 'applied', code: 200, body: toAppTask(depois, ex.views()[alvo.id]), ref: `T-${depois.seq}` };
  }

  if (cmd.kind === 'task.move') {
    const status = colToStatus(p.col);
    if (!status) return reject(400, 'Coluna inválida');
    const esperado = cmd.expect && typeof cmd.expect === 'object' ? cmd.expect.col : undefined;
    // Se já está onde o pedido quer, é a mesma coisa que aplicar (cobre a repetição depois de queda).
    if (esperado !== undefined && atual.col !== esperado && atual.col !== p.col) {
      return reject(409, 'O estado mudou desde o pedido', { diff: { col: { esperado, atual: atual.col } } });
    }
    store.update(alvo.id, { status });
  } else if (cmd.kind === 'task.update') {
    const patch: Record<string, unknown> = {};
    if ('title' in p) {
      if (!text(p.title)) return reject(400, 'Preencha este campo para continuar');
      patch.title = text(p.title);
    }
    if ('description' in p) patch.desc = text(p.description);
    if ('sector' in p) patch.sector = text(p.sector);
    if ('prio' in p) patch.prio = prioToDesk(p.prio);
    if ('assignee' in p && text(p.assignee)) patch.who = text(p.assignee);
    if ('col' in p) {
      const status = colToStatus(p.col);
      if (!status) return reject(400, 'Coluna inválida');
      patch.status = status;
    }
    if (!Object.keys(patch).length) return reject(400, 'Preencha este campo para continuar');
    store.update(alvo.id, patch);
  } else {
    return reject(400, `Tipo de pedido desconhecido: ${cmd.kind}`);
  }

  const depois = resolveTask(store.list(), alvo.id) || alvo;
  return { status: 'applied', code: 200, body: toAppTask(depois), ref: `T-${depois.seq}` };
}

// ---------------------------------------------------------------- worker

export class DeskWorker {
  private hashes = new Map<string, string>();
  private versions = new Map<string, number>();
  private fullPushDone = false;
  readonly onlineSince = new Date().toISOString();
  lastDrainAt: string | null = null;

  constructor(
    private store: DeskStore,
    private remote: DeskRemote,
    readonly workerId = `escritorio:${os.hostname()}`,
    private log: (m: string) => void = (m) => console.log(m),
    private onApplied: () => void = () => {},
  ) {}

  async drain(batch = 20): Promise<{ claimed: number; applied: number; rejected: number }> {
    const cmds: Command[] =
      (await this.remote.rpc('claim_office_commands', {
        p_worker: this.workerId,
        p_limit: batch,
        p_lease_seconds: 120,
        p_kinds: [...DESK_KINDS],
      })) || [];
    const resumo = { claimed: cmds.length, applied: 0, rejected: 0 };
    if (!cmds.length) return resumo;
    const feitos: Array<[Command, Outcome]> = [];
    for (const cmd of cmds) {
      try {
        feitos.push([cmd, applyDeskCommand(this.store, cmd)]);
      } catch (err: any) {
        // Erro local: devolve este e os de trás, e para (ordem estrita).
        await this.remote.rpc('complete_office_command', {
          p_id: cmd.id, p_worker: this.workerId, p_status: 'failed', p_error: String(err?.message || err),
        });
        const resto = cmds.slice(cmds.indexOf(cmd) + 1).map((c) => c.id);
        if (resto.length) await this.remote.rpc('release_office_commands', { p_ids: resto, p_worker: this.workerId });
        break;
      }
    }
    if (feitos.some(([, o]) => !o.cached)) this.onApplied();
    // Espelho antes da confirmação: quem vê "applied" já vê a tarefa.
    await this.pushMirror();
    for (const [cmd, o] of feitos) {
      await this.remote.rpc('complete_office_command', {
        p_id: cmd.id,
        p_worker: this.workerId,
        p_status: o.status,
        p_result: { status: o.code, body: o.body },
        p_error: o.status === 'rejected' ? String((o.body as any)?.detail || 'Recusado pelo Escritório') : null,
        p_result_ref: o.ref,
      });
      resumo[o.status] += 1;
      this.log(`[nuvem] ${cmd.kind} ${cmd.id.slice(0, 8)} -> ${o.status}${o.cached ? ' (já aplicado)' : ''}`);
    }
    this.lastDrainAt = new Date().toISOString();
    return resumo;
  }

  async pushMirror(): Promise<{ upserts: number; deleted: number }> {
    const now = new Date().toISOString();
    const runs = this.store.exec ? this.store.exec.views() : {};
    const rows = this.store.list().map((t) => toAppTask(t, runs[t.id]));
    const vivos = new Set(rows.map((r) => r.id));
    const mudou: Record<string, unknown>[] = [];
    const novos = new Map<string, string>();
    for (const row of rows) {
      const h = createHash('sha1').update(JSON.stringify(row)).digest('hex');
      if (this.hashes.get(row.id) === h && this.fullPushDone) continue;
      const v = (this.versions.get(row.id) || 0) + (this.hashes.get(row.id) === h ? 0 : 1);
      this.versions.set(row.id, Math.max(v, 1));
      novos.set(row.id, h);
      mudou.push({ ...row, version: Math.max(v, 1), synced_at: now, deleted_at: null });
    }
    let removidos = [...this.hashes.keys()].filter((k) => !vivos.has(k));
    if (!this.fullPushDone) {
      // Na partida, some da nuvem o que não está no Kanban (inclusive o que outro escritor deixou).
      const naNuvem = (await this.remote.select('office_tasks', { select: 'id', deleted_at: 'is.null' })) || [];
      removidos = [...new Set([...removidos, ...naNuvem.map((r: any) => String(r.id)).filter((id) => !vivos.has(id))])];
    }
    if (mudou.length) await this.remote.upsert('office_tasks', mudou, 'id');
    if (removidos.length) await this.remote.markDeleted('office_tasks', 'id', removidos, now);
    for (const [k, h] of novos) this.hashes.set(k, h);
    for (const k of removidos) this.hashes.delete(k);
    this.fullPushDone = true;
    return { upserts: mudou.length, deleted: removidos.length };
  }

  async heartbeat(): Promise<void> {
    const tasks = this.store.list();
    await this.remote.upsert(
      'office_status',
      [{
        id: 2,
        worker_id: this.workerId,
        online_since: this.onlineSince,
        last_seen_at: new Date().toISOString(),
        last_drain_at: this.lastDrainAt,
        stats: { tasksOpen: tasks.filter((t) => t.status !== 'done').length },
        services: [{ label: 'TAVIR Escritório · Kanban', meta: `${tasks.length} tarefa(s)`, status: 'ok' }],
        agents: [],
        app_version: 'escritorio-1',
      }],
      'id',
    );
  }
}

// ---------------------------------------------------------------- ligações reais

export class SupabaseRestTs implements DeskRemote {
  constructor(private url: string, private key: string) {
    this.url = url.replace(/\/+$/, '');
  }

  private headers(prefer?: string): Record<string, string> {
    const h: Record<string, string> = { apikey: this.key, 'Content-Type': 'application/json', Accept: 'application/json' };
    if (!this.key.startsWith('sb_')) h.Authorization = `Bearer ${this.key}`;
    if (prefer) h.Prefer = prefer;
    return h;
  }

  private async call(method: string, pathPart: string, body?: unknown, prefer?: string, query?: Record<string, string>): Promise<any> {
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const res = await fetch(`${this.url}/rest/v1/${pathPart}${qs}`, {
      method,
      headers: this.headers(prefer),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${pathPart} -> ${res.status}: ${text.slice(0, 300)}`);
    return text.trim() ? JSON.parse(text) : null;
  }

  rpc(fn: string, args: Record<string, unknown>) {
    return this.call('POST', `rpc/${fn}`, args);
  }

  async upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
    for (let i = 0; i < rows.length; i += 200) {
      await this.call('POST', table, rows.slice(i, i + 200), 'resolution=merge-duplicates,return=minimal', { on_conflict: onConflict });
    }
  }

  async markDeleted(table: string, keyCol: string, keys: string[], when: string) {
    for (let i = 0; i < keys.length; i += 100) {
      const lote = keys.slice(i, i + 100).map((k) => `"${k}"`).join(',');
      await this.call('PATCH', table, { deleted_at: when, synced_at: when }, 'return=minimal', { [keyCol]: `in.(${lote})` });
    }
  }

  async select(table: string, query: Record<string, string>) {
    return (await this.call('GET', table, undefined, undefined, query)) || [];
  }
}

/** Kanban avulso real: funções da tela + livro de pedidos aplicados no tavir.db. */
export function realDeskStore(): DeskStore {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fsx = require('./project-fs');
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(process.cwd(), 'backend', 'tavir.db');
  const withDb = <T>(fn: (db: any) => T): T => {
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS cloud_commands (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, code INTEGER NOT NULL,
        body TEXT, ref TEXT, applied_at TEXT NOT NULL)`);
      return fn(db);
    } finally {
      db.close();
    }
  };
  return {
    list: () => fsx.listTaskRecords(),
    create: (params) => fsx.createTaskRecord(params),
    update: (id, patch) => void fsx.updateTaskRecord(id, patch),
    remove: (id) => void fsx.deleteTaskRecord(id),
    ledgerGet: (id) =>
      withDb((db) => {
        const r = db.prepare('SELECT status, code, body, ref FROM cloud_commands WHERE id = ?').get(id);
        return r ? { status: r.status, code: r.code, body: r.body ? JSON.parse(r.body) : null, ref: r.ref } : null;
      }),
    ledgerPut: (id, kind, o) =>
      withDb((db) =>
        db
          .prepare('INSERT OR REPLACE INTO cloud_commands (id, kind, status, code, body, ref, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, kind, o.status, o.code, JSON.stringify(o.body ?? null), o.ref, new Date().toISOString()),
      ),
    exec: (() => {
      const q = () => require('./officeExec').execQueue();
      return {
        enqueue: (taskId, mode, agent, opts) => q().enqueue(taskId, mode, agent, opts),
        approve: (taskId) => q().approve(taskId),
        revise: (taskId, note, origin, id) => q().revise(taskId, note, origin, id),
        stop: (taskId) => q().stop(taskId),
        views: () => q().views(),
      } as DeskExec;
    })(),
  };
}

let timer: NodeJS.Timeout | null = null;

/** Liga o worker se o card do Supabase do Escritório estiver preenchido. Chamado no boot e ao salvar o card. */
export function startDeskCloud(onApplied: () => void = () => {}): boolean {
  stopDeskCloud();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getBundle } = require('./credentials');
  const b = getBundle('escritorio_supabase');
  if (!b?.url || !b?.serviceKey) return false;
  const worker = new DeskWorker(realDeskStore(), new SupabaseRestTs(b.url, b.serviceKey), undefined, undefined, onApplied);
  let busy = false;
  let backoff = 0;
  let nextBeat = 0;
  let pausedUntil = 0;
  const tick = async () => {
    if (busy || Date.now() < pausedUntil) return;
    busy = true;
    try {
      if (Date.now() >= nextBeat) {
        await worker.heartbeat();
        nextBeat = Date.now() + 10_000;
      }
      await worker.drain();
      await worker.pushMirror();
      if (backoff) console.log('[nuvem] Supabase de volta');
      backoff = 0;
    } catch (err: any) {
      backoff = Math.min(60_000, (backoff || 2_000) * 2);
      pausedUntil = Date.now() + backoff;
      console.warn(`[nuvem] sem Supabase, nova tentativa em ${backoff / 1000}s · ${err?.message || err}`);
    } finally {
      busy = false;
    }
  };
  timer = setInterval(tick, 3000);
  void tick();
  console.log(`[nuvem] Kanban do Escritório ligado à fila do APK (${worker.workerId})`);
  return true;
}

export function stopDeskCloud(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
