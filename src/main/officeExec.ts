/**
 * Fila de execução das tarefas do Kanban do Escritório.
 *
 * Um clique em "Executar" (no Escritório ou no APK) vira uma linha em `task_runs`. A fila roda
 * uma tarefa por vez, em ordem de chegada:
 *   - plan  · a Paula escreve o plano (não mexe em nada). Ao terminar, a tarefa vai para Planejado.
 *   - exec  · o Agente geral (ou o agente do plano) executa na pasta da tarefa. Ao terminar, a
 *             tarefa fica "aguarda você": Carlos aprova (Concluído) ou pede ajuste (nova tentativa).
 * O motor nunca fecha a tarefa sozinho.
 *
 * Cada execução também vai para o livro (`.tavir/runs/` da pasta da tarefa), e por isso aparece em
 * Execuções como módulo "Escritório", com tentativas e log.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export type RunMode = 'plan' | 'exec';
export type TaskRunStatus = 'queued' | 'running' | 'review' | 'done' | 'approved' | 'failed' | 'canceled';
export type AgentChoice = 'geral' | 'plano';

export interface TaskRunRow {
  id: string;
  task_id: string;
  mode: RunMode;
  agent: string;
  status: TaskRunStatus;
  attempt: number;
  note: string;
  origin: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  run_id: string | null;
  result: string;
  error: string;
}

/** O que a tela e o APK precisam saber da execução de uma tarefa. */
export interface TaskRunView {
  status: TaskRunStatus;
  mode: RunMode;
  agent: string;
  attempt: number;
  queuePos: number;
  summary: string;
  plan: string;
  error: string;
  at: string;
  runId: string;
}

export interface ExecTask {
  id: string;
  seq: number;
  title: string;
  desc?: string;
  status: string;
  who?: string;
  sector?: string;
  prio?: string;
}

export interface ExecStore {
  all(): TaskRunRow[];
  insert(row: TaskRunRow): void;
  update(id: string, patch: Partial<TaskRunRow>): void;
}

export interface ExecTasks {
  get(id: string): ExecTask | null;
  setStatus(id: string, status: string): void;
}

export interface RunnerResult {
  ok: boolean;
  reply: string;
  error?: string;
  stopped?: boolean;
  runId?: string;
}

export type Runner = (job: { row: TaskRunRow; task: ExecTask; prompt: string; owner: string; stage: string }, registerKill: (kill: () => void) => void) => Promise<RunnerResult>;

export type ExecResult = { ok: true; run: TaskRunRow } | { ok: false; code: number; error: string };

export const AGENT_LABEL: Record<string, string> = { geral: 'Agente geral', paula: 'Paula PM', plano: 'Agente do plano' };
const OPEN: TaskRunStatus[] = ['queued', 'running'];

// ---------------------------------------------------------------- visão

function byCreated(a: TaskRunRow, b: TaskRunRow): number {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function latestOf(rows: TaskRunRow[], taskId: string, mode?: RunMode): TaskRunRow | null {
  const list = rows.filter((r) => r.task_id === taskId && (!mode || r.mode === mode)).sort(byCreated);
  return list.length ? list[list.length - 1] : null;
}

export function planOf(rows: TaskRunRow[], taskId: string): string {
  const done = rows.filter((r) => r.task_id === taskId && r.mode === 'plan' && r.status === 'done' && r.result.trim()).sort(byCreated);
  return done.length ? done[done.length - 1].result : '';
}

export function taskRunViews(rows: TaskRunRow[]): Record<string, TaskRunView> {
  const queued = rows.filter((r) => r.status === 'queued').sort(byCreated);
  const out: Record<string, TaskRunView> = {};
  const ids = [...new Set(rows.map((r) => r.task_id))];
  for (const id of ids) {
    const last = latestOf(rows, id)!;
    out[id] = {
      status: last.status,
      mode: last.mode,
      agent: last.agent,
      attempt: last.attempt,
      queuePos: last.status === 'queued' ? queued.findIndex((r) => r.id === last.id) + 1 : 0,
      summary: last.result.slice(-1500),
      plan: planOf(rows, id).slice(0, 4000),
      error: last.error.slice(0, 600),
      at: last.finished_at || last.started_at || last.created_at,
      runId: last.run_id || '',
    };
  }
  return out;
}

// ---------------------------------------------------------------- prompt

export function buildPrompt(opts: { mode: RunMode; agent: string; task: ExecTask; plan: string; note: string; previous: string; workspace: string }): string {
  const { mode, task } = opts;
  const head = [
    `Tarefa T-${task.seq}: ${task.title}`,
    task.desc ? `Contexto:\n${task.desc}` : '',
    `Setor: ${task.sector || 'Operação'} · Prioridade: ${task.prio || 'Normal'}`,
  ].filter(Boolean).join('\n\n');
  if (mode === 'plan') {
    return [
      'Você é a Paula PM, do TAVIR Escritório. Planeje a tarefa abaixo. NÃO execute nada e não crie arquivos.',
      head,
      'Responda só com o plano, em português, curto e verificável:',
      '1. Objetivo (uma frase)\n2. Passos numerados\n3. Agente sugerido para executar\n4. Riscos ou dúvidas\n5. Critério de pronto',
    ].join('\n\n');
  }
  return [
    `Você é o ${AGENT_LABEL[opts.agent] || opts.agent} do TAVIR Escritório. Execute a tarefa abaixo.`,
    head,
    opts.plan ? `Plano aprovado pela Paula (siga):\n${opts.plan.slice(0, 6000)}` : '',
    opts.note ? `Ajuste pedido pelo Carlos nesta tentativa:\n${opts.note}` : '',
    opts.previous ? `Resultado da tentativa anterior:\n${opts.previous.slice(-4000)}` : '',
    `Trabalhe só nesta pasta (${opts.workspace}). Grave os entregáveis como arquivos aqui.`,
    'Não publique, não envie mensagens e não gaste dinheiro. Se precisar de algo que não tem, diga o que falta.',
    'Termine com um resumo curto: o que fez, onde estão os arquivos e o que ficou pendente.',
  ].filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------- fila

export class ExecQueue {
  private kills = new Map<string, () => void>();
  private busy = false;

  constructor(
    private store: ExecStore,
    private tasks: ExecTasks,
    private runner: Runner,
    private onChange: () => void = () => {},
    private workspaceOf: (task: ExecTask) => string = () => '',
    private now: () => string = () => new Date().toISOString(),
  ) {}

  /** Execução que estava rodando quando o app fechou não volta sozinha: vira falha. */
  recover(): number {
    let n = 0;
    for (const r of this.store.all()) {
      if (r.status === 'running') {
        this.store.update(r.id, { status: 'failed', finished_at: this.now(), error: 'Interrompida: o Escritório fechou durante a execução.' });
        n++;
      }
    }
    if (n) this.onChange();
    return n;
  }

  views(): Record<string, TaskRunView> {
    return taskRunViews(this.store.all());
  }

  /** Resultados esperando decisão, para a tela Decisões. */
  approvals(tasks: ExecTask[], now = Date.now()): Array<Record<string, unknown>> {
    return reviewApprovals(this.store.all(), tasks, now);
  }

  enqueue(taskId: string, mode: RunMode, agent: string, opts: { origin?: string; note?: string; id?: string } = {}): ExecResult {
    const task = this.tasks.get(taskId);
    if (!task) return { ok: false, code: 404, error: 'Tarefa não existe no Escritório.' };
    const rows = this.store.all();
    const open = rows.find((r) => r.task_id === taskId && OPEN.includes(r.status));
    if (open) return { ok: false, code: 409, error: open.status === 'running' ? 'Esta tarefa já está executando.' : 'Esta tarefa já está na fila.' };
    if (mode === 'exec' && task.status === 'done') return { ok: false, code: 409, error: 'Tarefa concluída. Reabra antes de executar de novo.' };
    let who = mode === 'plan' ? 'paula' : agent || 'geral';
    if (mode === 'exec' && who === 'plano') {
      if (!planOf(rows, taskId)) return { ok: false, code: 400, error: 'Ainda não há plano da Paula para esta tarefa.' };
    }
    if (who !== 'geral' && who !== 'plano' && who !== 'paula') who = 'geral';
    const attempt = rows.filter((r) => r.task_id === taskId && r.mode === mode).length + 1;
    const row: TaskRunRow = {
      id: opts.id || randomUUID(),
      task_id: taskId,
      mode,
      agent: who,
      status: 'queued',
      attempt,
      note: String(opts.note || '').trim(),
      origin: opts.origin || 'escritorio',
      created_at: this.now(),
      started_at: null,
      finished_at: null,
      run_id: null,
      result: '',
      error: '',
    };
    this.store.insert(row);
    if (mode === 'exec' && task.status !== 'in_progress') this.tasks.setStatus(taskId, 'in_progress');
    this.onChange();
    return { ok: true, run: row };
  }

  approve(taskId: string): ExecResult {
    const last = latestOf(this.store.all(), taskId, 'exec');
    if (!last || last.status !== 'review') return { ok: false, code: 409, error: 'Não há resultado aguardando aprovação.' };
    this.store.update(last.id, { status: 'approved' });
    this.tasks.setStatus(taskId, 'done');
    this.onChange();
    return { ok: true, run: { ...last, status: 'approved' } };
  }

  revise(taskId: string, note: string, origin = 'escritorio', id?: string): ExecResult {
    const text = String(note || '').trim();
    if (!text) return { ok: false, code: 400, error: 'Escreva o que precisa mudar.' };
    const last = latestOf(this.store.all(), taskId, 'exec');
    if (!last || !['review', 'failed', 'canceled'].includes(last.status)) return { ok: false, code: 409, error: 'Não há execução terminada para ajustar.' };
    if (last.status === 'review') this.store.update(last.id, { status: 'done' });
    return this.enqueue(taskId, 'exec', last.agent, { origin, note: text, id });
  }

  stop(taskId: string): ExecResult {
    const open = this.store.all().find((r) => r.task_id === taskId && OPEN.includes(r.status));
    if (!open) return { ok: false, code: 409, error: 'Nada na fila ou executando para esta tarefa.' };
    this.store.update(open.id, { status: 'canceled', finished_at: this.now(), error: 'Cancelado por Carlos.' });
    const kill = this.kills.get(open.id);
    if (kill) kill();
    this.onChange();
    return { ok: true, run: { ...open, status: 'canceled' } };
  }

  /** Roda a próxima da fila, se não houver outra rodando. Devolve a linha que rodou. */
  async tick(): Promise<TaskRunRow | null> {
    if (this.busy) return null;
    const rows = this.store.all();
    if (rows.some((r) => r.status === 'running')) return null;
    const next = rows.filter((r) => r.status === 'queued').sort(byCreated)[0];
    if (!next) return null;
    const task = this.tasks.get(next.task_id);
    if (!task) {
      this.store.update(next.id, { status: 'failed', finished_at: this.now(), error: 'A tarefa foi excluída.' });
      this.onChange();
      return null;
    }
    this.busy = true;
    try {
      this.store.update(next.id, { status: 'running', started_at: this.now() });
      this.onChange();
      const previousExec = rows.filter((r) => r.task_id === task.id && r.mode === 'exec' && r.id !== next.id && r.result).sort(byCreated).pop();
      const plan = next.mode === 'exec' && next.agent === 'plano' ? planOf(rows, task.id) : next.mode === 'exec' ? planOf(rows, task.id) : '';
      const prompt = buildPrompt({
        mode: next.mode,
        agent: next.agent,
        task,
        plan,
        note: next.note,
        previous: next.note && previousExec ? previousExec.result : '',
        workspace: this.workspaceOf(task),
      });
      const owner = AGENT_LABEL[next.agent] || 'Agente geral';
      const stage = next.mode === 'plan' ? 'Plano da Paula' : next.note ? 'Ajuste' : 'Execução';
      let res: RunnerResult;
      try {
        res = await this.runner({ row: next, task, prompt, owner, stage }, (kill) => this.kills.set(next.id, kill));
      } catch (err: any) {
        res = { ok: false, reply: '', error: String(err?.message || err) };
      } finally {
        this.kills.delete(next.id);
      }
      const now = this.store.all().find((r) => r.id === next.id);
      if (now && now.status === 'canceled') {
        this.store.update(next.id, { run_id: res.runId || null, result: res.reply || '' });
      } else if (res.ok) {
        const status: TaskRunStatus = next.mode === 'plan' ? 'done' : 'review';
        this.store.update(next.id, { status, finished_at: this.now(), run_id: res.runId || null, result: res.reply || '', error: '' });
        if (next.mode === 'plan' && task.status === 'to_plan') this.tasks.setStatus(task.id, 'planned');
      } else {
        this.store.update(next.id, {
          status: res.stopped ? 'canceled' : 'failed',
          finished_at: this.now(),
          run_id: res.runId || null,
          result: res.reply || '',
          error: res.error || (res.stopped ? 'Parado.' : 'A execução não terminou.'),
        });
      }
      this.onChange();
      return this.store.all().find((r) => r.id === next.id) || next;
    } finally {
      this.busy = false;
    }
  }
}

// ---------------------------------------------------------------- decisões

export const REVIEW_PREFIX = 'revisao-T-';

function plainText(md: string): string {
  return String(md || '')
    .replace(/\r/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^(\s*)[*-]\s+/gm, '$1• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ageOf(iso: string, now = Date.now()): { age: string; ageH: number } {
  const ms = Math.max(0, now - (Date.parse(iso) || now));
  const min = Math.round(ms / 60000);
  const ageH = ms / 3600000;
  return { age: min < 1 ? 'agora' : min < 60 ? `há ${min} min` : `há ${Math.round(ageH)} h`, ageH };
}

/** Tarefas com resultado esperando o Carlos, no formato da tela Decisões (ApprovalItem). */
export function reviewApprovals(rows: TaskRunRow[], tasks: ExecTask[], now = Date.now()): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const t of tasks) {
    const last = latestOf(rows, t.id, 'exec');
    if (!last || last.status !== 'review') continue;
    const { age, ageH } = ageOf(last.finished_at || last.created_at, now);
    out.push({
      id: REVIEW_PREFIX + t.seq,
      group: 'review',
      kind: 'hardening',
      title: `Resultado da T-${t.seq} · ${t.title}`,
      who: AGENT_LABEL[last.agent] || 'Agente geral',
      ini: 'AG',
      type: 'Resultado de tarefa',
      status: 'pending',
      impact: 'baixo',
      task: `#${t.seq}`,
      age,
      ageH,
      reason: plainText(last.result).slice(0, 900) || 'O agente terminou sem texto de resumo.',
      question: `O resultado atende a tarefa (tentativa ${last.attempt})?`,
      yes: ['A tarefa vai para Concluído'],
      no: ['O agente roda de novo com o seu motivo (nova tentativa)'],
      more: ['Abra a tarefa no Kanban para ler o resultado completo'],
      scope: 'Tarefa avulsa',
      cost: '—',
      time: '—',
      link: ['Abrir tarefas', 'tasks'],
    });
  }
  return out;
}

// ---------------------------------------------------------------- ligações reais

export function tarefasRoot(): string {
  let base = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    base = require('electron').app.getPath('userData');
  } catch {
    base = path.join(process.env.APPDATA || process.cwd(), 'tavir-escritorio');
  }
  return path.join(base, 'escritorio', 'tarefas');
}

export function taskWorkspace(task: ExecTask): string {
  const dir = path.join(tarefasRoot(), `T-${task.seq}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sqliteStore(): ExecStore {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(process.cwd(), 'backend', 'tavir.db');
  const withDb = <T>(fn: (db: any) => T): T => {
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS task_runs (
        id TEXT PRIMARY KEY, task_id TEXT NOT NULL, mode TEXT NOT NULL, agent TEXT NOT NULL,
        status TEXT NOT NULL, attempt INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', origin TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT, run_id TEXT,
        result TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '')`);
      return fn(db);
    } finally {
      db.close();
    }
  };
  const COLS = ['id', 'task_id', 'mode', 'agent', 'status', 'attempt', 'note', 'origin', 'created_at', 'started_at', 'finished_at', 'run_id', 'result', 'error'];
  return {
    all: () => withDb((db) => db.prepare('SELECT * FROM task_runs ORDER BY created_at').all() as TaskRunRow[]),
    insert: (row) => withDb((db) => db.prepare(`INSERT INTO task_runs (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`).run(...COLS.map((c) => (row as any)[c]))),
    update: (id, patch) =>
      withDb((db) => {
        const keys = Object.keys(patch).filter((k) => COLS.includes(k) && k !== 'id');
        if (!keys.length) return;
        db.prepare(`UPDATE task_runs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => (patch as any)[k]), id);
      }),
  };
}

function realTasks(): ExecTasks {
  const fsx = require('./project-fs');
  return {
    get: (id) => (fsx.listTaskRecords() as ExecTask[]).find((t) => t.id === id) || null,
    setStatus: (id, status) => void fsx.updateTaskRecord(id, { status }),
  };
}

const realRunner: Runner = async (job, registerKill) => {
  const { startRun } = require('./runLedger');
  const { runMotor, findMotorBinary, normalizeMotorId } = require('./motors');
  const { engineHub } = require('./drivers/engineHub');
  const settings = engineHub.getSettings();
  const motor = normalizeMotorId(settings.defaultEngine);
  const workspace = taskWorkspace(job.task);
  const access = job.row.mode === 'plan' ? 'read' : 'write';
  const timeoutMs = 45 * 60 * 1000;
  const handle = await startRun({
    workspace,
    kind: 'tarefa',
    label: job.task.title,
    stage: job.stage,
    owner: job.owner,
    projectName: 'Escritório',
    engine: motor,
    binary: findMotorBinary(motor) || '',
    model: settings.defaultModel,
    effort: settings.defaultEffort,
    mode: access,
    args: [],
    timeoutMs,
    prompt: job.prompt,
  });
  let stopped = false;
  const result = await runMotor({
    motor,
    workspace,
    prompt: job.prompt,
    model: settings.defaultModel,
    effort: settings.defaultEffort,
    access,
    timeoutMs,
    onRaw: (stream: 'stdout' | 'stderr', text: string) => handle.raw(stream, text),
    registerKill: (kill: () => void) => registerKill(() => { stopped = true; kill(); }),
  });
  const paused = stopped || result.error?.kind === 'paused';
  await handle.finish({
    ok: result.ok && !paused,
    status: paused ? 'paused' : undefined,
    error: paused ? 'Cancelado por Carlos.' : result.error?.message,
    reply: result.text || '',
    exitCode: result.exitCode,
  });
  return { ok: !!result.ok && !paused, reply: result.text || '', error: result.error?.message, stopped: paused, runId: handle.id };
};

let queue: ExecQueue | null = null;
let timer: NodeJS.Timeout | null = null;
const listeners = new Set<() => void>();

export function execQueue(): ExecQueue {
  if (!queue) {
    queue = new ExecQueue(sqliteStore(), realTasks(), realRunner, () => listeners.forEach((fn) => { try { fn(); } catch {} }), taskWorkspace);
  }
  return queue;
}

export function onExecChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startExecQueue(): void {
  const q = execQueue();
  q.recover();
  if (timer) clearInterval(timer);
  timer = setInterval(() => void q.tick().catch((err) => console.warn('[fila] erro', err?.message || err)), 2000);
}

export function stopExecQueue(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Acha a tarefa pela pasta de trabalho (Execuções conhece a pasta, não o id). */
export function taskIdByWorkspace(workspace: string): string | null {
  const m = /[\\/]T-(\d+)[\\/]?$/.exec(String(workspace || ''));
  if (!m) return null;
  const fsx = require('./project-fs');
  const t = (fsx.listTaskRecords() as ExecTask[]).find((x) => Number(x.seq) === Number(m[1]));
  return t ? t.id : null;
}
