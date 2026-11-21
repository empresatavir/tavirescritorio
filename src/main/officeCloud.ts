/**
 * Fila na nuvem · lado do TAVIR Escritório.
 *
 * O APK (TAVIR Controle Mobile) grava pedidos em `office_commands` no Supabase do Escritório
 * (card "TAVIR Escritório · Supabase" em Contas e cofre). Este worker, no processo main:
 *   1. pega só os pedidos de tarefa (`task.*`), em ordem;
 *   2. aplica no Kanban avulso do Escritório (mesmas funções da tela);
 *   3. publica o Kanban em `office_tasks` (ele é o único escritor dessa tabela);
 *   4. confirma o pedido.
 * v4 (sem migração): os pedidos de job do APK (Instagram, Raio X, Editorial, Chamar agente) também
 * são do Escritório. Viram tarefa no Kanban + execução real na fila (officeExec), e o Escritório publica
 * `office_jobs`, `office_deliveries` e `office_pendings`. O server.py fica só com as preferências.
 * O Escritório bate ponto como status id 2.
 *
 * Só conexões de saída. A chave de serviço sai do cofre e fica neste processo.
 */
import { createHash } from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';
import { deliveryBody } from './officeExec';
import { ACTION_STUDY, ACTION_VIDEO, IRIS, MAICON, OFFICE_AGENTS, STUDY_OWNERS, isTriage, officeAction, officeAgent, publishedAgents, videoShortcode, type PublishedEngine } from '../shared/officeAgents';
import { firstStudyLink, studyCode, studySource } from './officeStudy';
import { inviteRequestFromApk } from './raiox/inviteRequests';
import { raioxRoot } from './raiox/raioxStore';

export const DESK_KINDS = [
  'task.create', 'task.update', 'task.move', 'task.delete',
  // v3: fila de execução (officeExec)
  'task.run', 'task.plan', 'task.approve', 'task.revise', 'task.stop',
  // v4: jobs do APK viram execuções reais
  'job.create', 'job.pause', 'job.resume', 'job.cancel', 'pending.approve', 'pending.reject',
] as const;
const EXEC_KINDS = new Set(['task.run', 'task.plan', 'task.approve', 'task.revise', 'task.stop']);
const JOB_KINDS = new Set(['job.create', 'job.pause', 'job.resume', 'job.cancel']);
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
  enqueue(taskId: string, mode: 'plan' | 'exec', agent: string, opts: { origin: string; id: string; fields?: Record<string, string> }): ExecOutcome;
  approve(taskId: string): ExecOutcome;
  revise(taskId: string, note: string, origin: string, id: string): ExecOutcome;
  stop(taskId: string, why?: 'cancel' | 'pause'): ExecOutcome;
  views(): Record<string, Record<string, unknown>>;
  /** Linhas cruas da fila (para publicar os jobs). */
  rows?(): RunRow[];
  liveLog?(rowId: string): Array<{ at: string; m: string }>;
  /** Modelo padrão do motor, só para mostrar. */
  model?(): string;
  /** Motores ligados, para o app escolher motor e esforço (só aparece a escolha com mais de um). */
  engines?(): PublishedEngine[];
  /** Arquivos .md/.txt que o agente gravou na pasta da tarefa. */
  files?(task: DeskTask, agent: string): Array<{ name: string; body: string }>;
}

/** O que os jobs precisam de uma linha da fila (officeExec.TaskRunRow). */
export interface RunRow {
  id: string;
  task_id: string;
  mode: string;
  agent: string;
  status: string;
  attempt: number;
  note: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result: string;
  error: string;
  fields?: string;
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

// ---------------------------------------------------------------- jobs (v4)

export const JOB_AGENT: Record<string, string> = { instagram: 'social', editorial: 'redator', raiox: 'raiox' };
const JOB_SECTOR: Record<string, string> = { instagram: 'Marketing', editorial: 'Conteúdo', raiox: 'Comercial', agent: 'Operação' };
export const ROLE_NAMES = OFFICE_AGENTS.map((a) => a.name);

function agentName(agent: string): string {
  const m = /^agente:(.+)$/.exec(agent || '');
  if (m) return m[1];
  return ({ social: 'Social', redator: 'Redator', raiox: 'Pesquisador', paula: 'Paula PM', plano: 'Agente do plano', video: IRIS, estudo: MAICON, triagem: 'Triagem' } as Record<string, string>)[agent] || 'Agente geral';
}

function kindOf(agent: string): string {
  if (agent === 'social' || agent === 'video') return 'instagram';
  if (agent === 'redator') return 'editorial';
  if (agent === 'raiox') return 'raiox';
  if (agent === 'triagem' || agent === 'estudo' || /^agente:/.test(agent || '')) return 'agent';
  return 'tarefa';
}

function parseFields(raw?: string): Record<string, string> {
  try {
    const v = JSON.parse(raw || '{}');
    const out: Record<string, string> = {};
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) out[k] = String(x ?? '');
    return out;
  } catch {
    return {};
  }
}

/** Título e descrição da tarefa que nasce de um pedido de job. Erro em `error` se faltou campo. */
export type JobSpec = { title: string; desc: string; sector: string; agent: string; fields?: Record<string, string>; owner?: string };

/** Vídeo do Instagram por link: vai para a extração pela RapidAPI (agente `video`). */
function videoTask(link: string): JobSpec | { error: string } {
  const code = videoShortcode(link);
  if (!code) return { error: 'Informe o link de um Reel ou post do Instagram (instagram.com/reel/… ou /p/…).' };
  return {
    title: `Análise de vídeo · ${code}`,
    desc: `Pedido pelo APK. Vídeo do Instagram por link: ${link}\nExtração pela RapidAPI, download, transcrição e relatório.`,
    sector: JOB_SECTOR.instagram,
    agent: 'video',
    fields: { link, escopo: 'Vídeo por link' },
  };
}

/** Estudo de vídeo (Instagram ou YouTube) pelo Maicon: ver, transcrever, abrir os links e cruzar com o Escritório. */
function studyTask(link: string, instrucao = '', owner = MAICON): JobSpec | { error: string } {
  const source = studySource(link);
  if (!source) return { error: 'Cole o link de um vídeo do Instagram (Reel ou post) ou do YouTube.' };
  const origem = source === 'youtube' ? 'YouTube' : 'Instagram';
  const pedido = instrucao.replace(link, '').trim();
  return {
    title: `Estudo de vídeo · ${origem} · ${studyCode(link)}`,
    desc: `Pedido pelo APK a ${owner}. Vídeo do ${origem}: ${link}${pedido ? `
O que o Carlos quer saber: ${pedido}` : ''}
O Escritório baixa, transcreve e separa quadros e links; ${owner} estuda e cruza com o Escritório.`,
    sector: JOB_SECTOR.agent,
    agent: 'estudo',
    owner,
    fields: { link, fonte: source, dono: owner, ...(pedido ? { pergunta: pedido } : {}) },
  };
}

export function jobTask(kind: string, fields: Record<string, string>): JobSpec | { error: string } {
  const f = (k: string) => String(fields[k] ?? '').trim();
  if (kind === 'instagram') {
    if (/estud/i.test(f('escopo'))) return studyTask(f('link') || f('perfil'));
    if (f('link') || /v[ií]deo/i.test(f('escopo'))) return videoTask(f('link') || f('perfil'));
    const perfil = f('perfil').replace(/^@/, '');
    if (!perfil) return { error: 'Informe o perfil do Instagram.' };
    return { title: `Análise Instagram · @${perfil} · ${f('escopo') || 'Perfil completo'}`, desc: `Pedido pelo APK. Perfil @${perfil}, escopo ${f('escopo') || 'perfil completo'}.`, sector: JOB_SECTOR.instagram, agent: 'social' };
  }
  if (kind === 'editorial') {
    if (!f('tema')) return { error: 'Informe o tema.' };
    return { title: `Motor Editorial · ${f('formato') || 'Texto'} · ${f('tema')}`, desc: `Pedido pelo APK. ${f('formato') || 'Texto'} sobre: ${f('tema')}.`, sector: JOB_SECTOR.editorial, agent: 'redator' };
  }
  if (kind === 'raiox') {
    const empresa = f('empresa');
    if (!empresa) return { error: 'Informe a empresa e o site ou @ do Instagram.' };
    if (!/https?:\/\/|@[A-Za-z0-9_.]{2,}|\b[a-z0-9-]+\.[a-z]{2,}/i.test(empresa)) {
      return { error: 'Informe também o site ou o @ do Instagram da empresa (ex.: Padaria Sol · padariasol.com.br).' };
    }
    const depth = /complet/i.test(f('profundidade')) ? 'completo' : 'rápido';
    return { title: `Raio X ${depth} · ${empresa}`, desc: `Pedido pelo APK. Abre um caso no Raio-X e roda a análise ${depth} só com fontes públicas.`, sector: JOB_SECTOR.raiox, agent: 'raiox' };
  }
  if (kind === 'agent') {
    const instrucao = f('instrucao');
    if (!instrucao) return { error: 'Escreva a instrução para o agente.' };
    const who = f('agent') || f('agente');
    const title = instrucao.length > 70 ? `${instrucao.slice(0, 67)}…` : instrucao;
    if (isTriage(who) && firstStudyLink(instrucao)) return studyTask(firstStudyLink(instrucao), instrucao);
    if (isTriage(who)) return { title: `Triagem · ${title}`, desc: `Pedido pelo APK sem agente escolhido:\n${instrucao}`, sector: JOB_SECTOR.agent, agent: 'triagem' };
    const ag = officeAgent(who);
    const action = officeAction(ag, f('action') || f('acao'));
    if (ag && STUDY_OWNERS.includes(ag.name) && action && action.id === ACTION_STUDY) return studyTask(firstStudyLink(instrucao) || (/https?:\/\/\S+/.exec(instrucao) || [instrucao])[0], instrucao, ag.name);
    if (ag && ag.name === IRIS && action && action.id === ACTION_VIDEO) return videoTask((/https?:\/\/\S+/.exec(instrucao) || [instrucao])[0]);
    const nome = ag ? ag.name : 'Analista';
    return {
      title: `${nome} · ${title}`,
      desc: `Pedido pelo APK a ${nome}${action ? ` (${action.label})` : ''}:\n${instrucao}`,
      sector: JOB_SECTOR.agent,
      agent: `agente:${nome}`,
      fields: action ? { acao: action.label } : undefined,
    };
  }
  return { error: `Tipo de job desconhecido: ${kind || '(vazio)'}` };
}

function hhmm(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isToday(iso: string | null | undefined, now: Date): boolean {
  const d = iso ? new Date(iso) : null;
  return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function jobStatus(row: RunRow): 'run' | 'queue' | 'paused' | 'done' | 'cancel' {
  if (row.status === 'queued') return 'queue';
  if (row.status === 'running') return 'run';
  if (row.status === 'canceled' && /^Pausado/.test(row.error || '')) return 'paused';
  if (row.status === 'failed' || row.status === 'canceled') return 'cancel';
  return 'done';
}

function finishLine(r: RunRow): string {
  if (r.status === 'review') return 'Terminou · aguarda sua aprovação em Pendências';
  if (r.status === 'approved') return 'Aprovado por Carlos';
  if (r.status === 'done') return 'Terminou · você pediu ajuste';
  if (r.status === 'failed') return `Falhou: ${(r.error || 'sem detalhe').slice(0, 300)}`;
  if (r.status === 'canceled') return r.error || 'Cancelado';
  return '';
}

/** Linhas da fila (execuções) → linhas de office_jobs e office_deliveries para o APK. */
export function jobMirror(
  tasks: DeskTask[],
  rows: RunRow[],
  liveLog: (rowId: string) => Array<{ at: string; m: string }> = () => [],
  model = '',
  filesOf: (task: DeskTask, agent: string) => Array<{ name: string; body: string }> = () => [],
): { jobs: Record<string, unknown>[]; deliveries: Record<string, unknown>[] } {
  const jobs: Record<string, unknown>[] = [];
  const deliveries: Record<string, unknown>[] = [];
  const queued = rows.filter((r) => r.status === 'queued').sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  for (const t of tasks) {
    const execs = rows.filter((r) => r.task_id === t.id && r.mode === 'exec').sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    if (!execs.length) continue;
    const last = execs[execs.length - 1];
    const first = execs[0];
    const kind = kindOf(last.agent);
    const fields = parseFields(first.fields);
    const log: Array<{ t: string; m: string }> = [];
    for (const r of execs) {
      log.push({ t: hhmm(r.created_at), m: r.attempt > 1 ? `Tentativa ${r.attempt} na fila${r.note ? ` · ${r.note.slice(0, 160)}` : ''}` : 'Na fila do Escritório' });
      if (r.started_at) log.push({ t: hhmm(r.started_at), m: `Começou · ${agentName(r.agent)}` });
      for (const l of liveLog(r.id)) log.push({ t: hhmm(l.at), m: l.m });
      if (r.finished_at && finishLine(r)) log.push({ t: hhmm(r.finished_at), m: finishLine(r) });
    }
    const status = jobStatus(last);
    const ref = UUID.test(t.id) ? t.id : null;
    const qpos = last.status === 'queued' ? queued.findIndex((r) => r.id === last.id) + 1 : 0;
    jobs.push({
      id: `T-${t.seq}`,
      n: Number(t.seq) || 0,
      queue_seq: qpos || Number(t.seq) || 0,
      title: t.title,
      agent: agentName(last.agent),
      model,
      status,
      pct: status === 'done' ? 100 : 0,
      cost_cents: 0,
      started_at: hhmm(first.started_at || first.created_at),
      checkpoint: null,
      log: log.slice(-40),
      spend_flag: '',
      kind,
      fields,
      client_ref: ref,
      origin_command_id: ref,
    });
    const delivered = [...execs].reverse().find((r) => (r.status === 'review' || r.status === 'approved' || r.status === 'done') && String(r.result || '').trim());
    if (delivered) {
      const estado = delivered.status === 'review' ? 'aguarda sua aprovação' : delivered.status === 'approved' ? 'aprovado' : 'ajuste pedido';
      deliveries.push({
        slug: `entrega-T-${t.seq}`,
        n: Number(t.seq) || 0,
        job_id: `T-${t.seq}`,
        kind,
        title: t.title,
        meta: `${agentName(delivered.agent)} · tentativa ${delivered.attempt} · ${estado}`,
        url: `/reports/entrega-T-${t.seq}`,
        body: deliveryBody(String(delivered.result || ''), filesOf(t, delivered.agent)),
        created_at: delivered.finished_at || delivered.created_at,
      });
    }
  }
  return { jobs, deliveries };
}

/** Job no formato que o APK lê como resposta (Job.fromJson). */
export function toAppJob(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    agent: row.agent,
    model: row.model,
    status: row.status,
    pct: row.pct,
    cost: 0,
    costCeiling: 5,
    startedAt: row.started_at,
    log: row.log,
    checkpoint: row.checkpoint,
    queueOrder: row.queue_seq,
    kind: row.kind,
    fields: row.fields,
  };
}

function jobBody(store: DeskStore, taskId: string): Record<string, unknown> | null {
  const ex = store.exec;
  if (!ex || !ex.rows) return null;
  const t = store.list().find((x) => x.id === taskId);
  if (!t) return null;
  const { jobs } = jobMirror([t], ex.rows(), ex.liveLog ? (id) => ex.liveLog!(id) : undefined, ex.model ? ex.model() : '');
  return jobs.length ? toAppJob(jobs[0]) : null;
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

  if (cmd.kind === 'job.create') {
    // F8 T8.4: convite do Raio-X pedido pelo APK vira pedido pendente no Raio-X; nada é enviado aqui (R4).
    if (text(p.kind) === 'raiox_convite') {
      const r = inviteRequestFromApk(raioxRoot(), cmd.id, p.fields, new Date().toISOString());
      return r.ok ? { status: 'applied', code: 201, body: r.body, ref: r.ref } : reject(400, r.error);
    }
    if (!store.exec) return reject(503, 'A fila de execução não está ligada neste Escritório');
    const kind = text(p.kind);
    const raw = p.fields && typeof p.fields === 'object' ? (p.fields as Record<string, unknown>) : {};
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) fields[k] = String(v ?? '').trim();
    let task = tasks.find((t) => t.id === cmd.id) || null;
    if (!task) {
      const spec = jobTask(kind, fields);
      if ('error' in spec) return reject(400, spec.error);
      task = store.create({ id: cmd.id, title: spec.title, desc: spec.desc, prio: 'Normal', sector: spec.sector, status: 'to_plan', who: spec.owner || agentName(spec.agent) });
      const r = store.exec.enqueue(task.id, 'exec', spec.agent, { origin: 'apk', id: cmd.id, fields: { ...fields, ...(spec.fields || {}), kind } });
      if (!r.ok) return reject(r.code, r.error);
    }
    const body = jobBody(store, task.id);
    return { status: 'applied', code: 201, body, ref: `T-${task.seq}` };
  }

  if (cmd.kind === 'pending.approve' || cmd.kind === 'pending.reject') {
    // Desde a v4 as pendências são os resultados de tarefa (tarefa:T-n), decididos por task.approve/revise.
    return reject(410, 'Essa pendência não existe mais. Atualize a tela.');
  }

  const alvo = resolveTask(tasks, String(cmd.target_ref || ''));

  if (cmd.kind === 'task.delete') {
    // Já não existe: o estado final é o pedido. Não é erro.
    if (!alvo) return { status: 'applied', code: 204, body: null, ref: null };
    store.remove(alvo.id);
    return { status: 'applied', code: 204, body: null, ref: `T-${alvo.seq}` };
  }

  if (JOB_KINDS.has(cmd.kind)) {
    if (!alvo) return reject(404, `Job ${cmd.target_ref} não existe no Escritório`);
    if (!store.exec) return reject(503, 'A fila de execução não está ligada neste Escritório');
    let r: ExecOutcome;
    if (cmd.kind === 'job.pause') r = store.exec.stop(alvo.id, 'pause');
    else if (cmd.kind === 'job.cancel') r = store.exec.stop(alvo.id, 'cancel');
    else r = store.exec.revise(alvo.id, 'Continue de onde parou. Aproveite o que já está feito na pasta.', 'apk', cmd.id);
    if (!r.ok) return reject(r.code, r.error);
    return { status: 'applied', code: 200, body: jobBody(store, alvo.id), ref: `T-${alvo.seq}` };
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

  /** Tabelas que o Escritório publica: tarefas e, desde a v4, jobs, entregas e pendências. */
  mirrorTables(): Array<{ table: string; key: string; rows: Record<string, unknown>[] }> {
    const ex = this.store.exec;
    const runs = ex ? ex.views() : {};
    const tasks = this.store.list();
    const filesOf = (t: DeskTask, agent: string) => (ex && ex.files ? ex.files(t, agent) : []);
    const withFiles = (t: DeskTask) => {
      const run = runs[t.id];
      if (!run || run.mode !== 'exec') return run;
      const files = filesOf(t, String(run.agent || ''));
      return files.length ? { ...run, files } : run;
    };
    const out = [{ table: 'office_tasks', key: 'id', rows: tasks.map((t) => toAppTask(t, withFiles(t)) as unknown as Record<string, unknown>) }];
    if (ex && ex.rows) {
      const { jobs, deliveries } = jobMirror(tasks, ex.rows(), ex.liveLog ? (id) => ex.liveLog!(id) : undefined, ex.model ? ex.model() : '', filesOf);
      out.push({ table: 'office_jobs', key: 'id', rows: jobs });
      out.push({ table: 'office_deliveries', key: 'slug', rows: deliveries });
      // Pendências do office.py eram simuladas; as de verdade são os resultados de tarefa (o APK monta).
      out.push({ table: 'office_pendings', key: 'id', rows: [] });
    }
    return out;
  }

  async pushMirror(): Promise<{ upserts: number; deleted: number }> {
    const now = new Date().toISOString();
    const total = { upserts: 0, deleted: 0 };
    for (const { table, key, rows } of this.mirrorTables()) {
      const hk = (k: string) => `${table}:${k}`;
      const vivos = new Set(rows.map((r) => String(r[key])));
      const mudou: Record<string, unknown>[] = [];
      const novos = new Map<string, string>();
      for (const row of rows) {
        const k = String(row[key]);
        const h = createHash('sha1').update(JSON.stringify(row)).digest('hex');
        if (this.hashes.get(hk(k)) === h && this.fullPushDone) continue;
        const v = (this.versions.get(hk(k)) || 0) + (this.hashes.get(hk(k)) === h ? 0 : 1);
        this.versions.set(hk(k), Math.max(v, 1));
        novos.set(hk(k), h);
        mudou.push({ ...row, version: Math.max(v, 1), synced_at: now, deleted_at: null });
      }
      let removidos = [...this.hashes.keys()].filter((x) => x.startsWith(`${table}:`)).map((x) => x.slice(table.length + 1)).filter((k) => !vivos.has(k));
      if (!this.fullPushDone) {
        // Na partida, some da nuvem o que não está aqui (inclusive o que outro escritor deixou).
        const naNuvem = (await this.remote.select(table, { select: key, deleted_at: 'is.null' })) || [];
        removidos = [...new Set([...removidos, ...naNuvem.map((r: any) => String(r[key])).filter((k) => !vivos.has(k))])];
      }
      if (mudou.length) await this.remote.upsert(table, mudou, key);
      if (removidos.length) await this.remote.markDeleted(table, key, removidos, now);
      for (const [k, h] of novos) this.hashes.set(k, h);
      for (const k of removidos) this.hashes.delete(hk(k));
      total.upserts += mudou.length;
      total.deleted += removidos.length;
    }
    this.fullPushDone = true;
    return total;
  }

  async heartbeat(): Promise<void> {
    const tasks = this.store.list();
    const ex = this.store.exec;
    const rows = ex && ex.rows ? ex.rows() : [];
    const today = new Date();
    const model = ex && ex.model ? ex.model() : '';
    const running = rows.filter((r) => r.status === 'running').length;
    const queued = rows.filter((r) => r.status === 'queued').length;
    await this.remote.upsert(
      'office_status',
      [{
        id: 2,
        worker_id: this.workerId,
        online_since: this.onlineSince,
        last_seen_at: new Date().toISOString(),
        last_drain_at: this.lastDrainAt,
        stats: {
          tasksOpen: tasks.filter((t) => t.status !== 'done').length,
          spentToday: 0,
          completedToday: rows.filter((r) => r.mode === 'exec' && ['review', 'approved', 'done'].includes(r.status) && isToday(r.finished_at, today)).length,
          running,
          queued,
          engines: ex && ex.engines ? ex.engines() : [],
        },
        services: [
          { label: 'TAVIR Escritório · Kanban', meta: `${tasks.length} tarefa(s)`, status: 'ok' },
          { label: 'Fila de execução', meta: running ? `executando · ${queued} na fila` : queued ? `${queued} na fila` : 'parada, sem pedidos', status: 'ok' },
        ],
        agents: publishedAgents(model),
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
        stop: (taskId, why) => q().stop(taskId, why),
        views: () => q().views(),
        rows: () => q().rows(),
        liveLog: (rowId) => q().liveLog(rowId),
        files: (task, agent) => {
          const ox = require('./officeExec');
          return ox.taskFiles(path.join(ox.tarefasRoot(), `T-${task.seq}`), agent);
        },
        model: () => {
          try {
            const s = require('./drivers/engineHub').engineHub.getSettings();
            return [s.defaultEngine, s.defaultModel].filter(Boolean).join(' · ');
          } catch {
            return '';
          }
        },
        engines: () => {
          try {
            const hub = require('./drivers/engineHub').engineHub;
            const { motorById } = require('../shared/engineCatalog');
            const { publishedEngines } = require('../shared/officeAgents');
            return publishedEngines(hub.getCatalog().engines.map((e: { id: string }) => motorById(e.id)), hub.getSettings());
          } catch {
            return [];
          }
        },
      } as DeskExec;
    })(),
  };
}

let timer: NodeJS.Timeout | null = null;

/** Liga o worker se o card do Supabase do Escritório estiver preenchido. Chamado no boot e ao salvar o card. */
export function startDeskCloud(onApplied: () => void = () => {}): boolean {
  stopDeskCloud();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getBundle, exportEscritorioEnv } = require('./credentials');
  // Mantém em dia os arquivos derivados do card (worker e chaves do build do APK).
  try {
    exportEscritorioEnv();
  } catch (err: any) {
    console.warn('[nuvem] não regravou os arquivos do card:', err?.message || err);
  }
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
