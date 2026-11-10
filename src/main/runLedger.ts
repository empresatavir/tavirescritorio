/**
 * Livro de execuções da Fábrica.
 *
 * Cada chamada a um motor (chat da Íris, etapa da esteira, passo do trilho) vira uma pasta
 * `<projeto>/.tavir/runs/<id>/` com o pedido completo, a saída bruta do motor, uma transcrição
 * legível, o que mudou no disco (diff real) e as métricas da execução.
 *
 * O diff vem de um repositório git sombra em `.tavir/shadow.git` (GIT_DIR separado), que tira
 * um retrato da pasta antes e depois do motor rodar. O git do próprio projeto não é tocado.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { execFile } from 'node:child_process';

export type RunKind = 'chat' | 'esteira' | 'trilho' | 'raiox';
export type RunStatus = 'running' | 'ok' | 'failed' | 'paused';

export interface RunUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number;
  turns?: number;
}

export interface RunChanges {
  available: boolean;
  added: string[];
  modified: string[];
  deleted: string[];
  note?: string;
}

export interface RunMeta {
  id: string;
  kind: RunKind;
  label: string;
  stage: string;
  owner: string;
  projectName: string;
  workspace: string;
  engine: string;
  binary: string;
  model: string;
  effort: string;
  mode: string;
  args: string[];
  timeoutMs: number;
  status: RunStatus;
  error?: string;
  exitCode?: number | null;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  promptChars: number;
  replyChars?: number;
  toolCalls?: number;
  toolErrors?: number;
  usage?: RunUsage;
  changes?: RunChanges;
  /** Commit que a Fábrica fez no projeto com o que esta execução mudou. */
  commit?: { sha?: string; files: number; skipped?: string; error?: string };
  stdoutBytes?: number;
  stderrBytes?: number;
}

export interface RunStartInfo {
  workspace: string;
  kind: RunKind;
  label?: string;
  stage?: string;
  owner?: string;
  projectName?: string;
  engine: string;
  binary: string;
  model: string;
  effort: string;
  mode: string;
  args: string[];
  timeoutMs: number;
  prompt: string;
}

export interface RunFinishInfo {
  ok: boolean;
  status?: RunStatus;
  error?: string;
  exitCode?: number | null;
  reply: string;
}

export interface RunHandle {
  id: string;
  dir: string;
  raw: (stream: 'stdout' | 'stderr', text: string) => void;
  finish: (info: RunFinishInfo) => Promise<RunMeta>;
}

const RUNS_KEEP = 300;
const DIFF_LIMIT = 2 * 1024 * 1024;
const SHADOW_EXCLUDES = [
  '.git/',
  '.tavir/',
  'qa/orders/',
  'qa/evidencias/',
  'qa/seguranca/',
  'node_modules/',
  'dist/',
  'build/',
  '.dart_tool/',
  '.gradle/',
  '.next/',
  '.nuxt/',
  '.venv/',
  'venv/',
  '__pycache__/',
  '.pytest_cache/',
  'target/',
  'coverage/',
  '*.apk',
  '*.aab',
  '*.db-wal',
  '*.db-shm',
  '.env',
  '.env.*',
  '!.env.example',
];

// ---------------------------------------------------------------- caminhos

export function runsRoot(workspace: string): string {
  return path.join(workspace, '.tavir', 'runs');
}

function shadowDir(workspace: string): string {
  return path.join(workspace, '.tavir', 'shadow.git');
}

function newRunId(kind: RunKind): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  return `${stamp}-${kind}-${crypto.randomBytes(3).toString('hex')}`;
}

function isRunId(id: string): boolean {
  return /^[0-9]{8}-[0-9]{6}-(chat|esteira|trilho|raiox)-[0-9a-f]{6}$/.test(id);
}

// ---------------------------------------------------------------- segredos

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g,
  /(Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi,
];

function vaultValues(workspace: string): string[] {
  try {
    const raw = fs.readFileSync(path.join(workspace, '.env.project'), 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '').trim().replace(/^["']|["']$/g, ''))
      .filter((v) => v.length >= 8);
  } catch {
    return [];
  }
}

export function makeRedactor(workspace: string): (text: string) => string {
  const values = vaultValues(workspace);
  return (text: string) => {
    let out = String(text || '');
    for (const v of values) out = out.split(v).join('«segredo do cofre»');
    for (const re of SECRET_PATTERNS) {
      out = out.replace(re, (match, prefix) => (typeof prefix === 'string' && /^Bearer/i.test(prefix) ? `${prefix}«segredo»` : '«segredo»'));
    }
    return out;
  };
}

// ---------------------------------------------------------------- git sombra

function git(workspace: string, args: string[], timeoutMs = 60000): Promise<string> {
  const gitDir = shadowDir(workspace);
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      [
        `--git-dir=${gitDir}`,
        `--work-tree=${workspace}`,
        '-c',
        'core.autocrlf=false',
        '-c',
        'core.quotepath=false',
        '-c',
        'core.safecrlf=false',
        '-c',
        'user.name=TAVIR Runs',
        '-c',
        'user.email=runs@tavir.local',
        ...args,
      ],
      { cwd: workspace, windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (err) reject(new Error(String(stderr || err.message).trim()));
        else resolve(String(stdout));
      },
    );
  });
}

async function ensureShadow(workspace: string): Promise<void> {
  const dir = shadowDir(workspace);
  if (!fs.existsSync(path.join(dir, 'HEAD'))) {
    fs.mkdirSync(dir, { recursive: true });
    await git(workspace, ['init', '--quiet']);
  }
  fs.mkdirSync(path.join(dir, 'info'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'info', 'exclude'), SHADOW_EXCLUDES.join('\n') + '\n', 'utf8');
}

/** Garante que o git do cliente (se houver) ignore os registros da Fábrica. */
export function excludeFromProjectGit(workspace: string): void {
  const excludeFile = path.join(workspace, '.git', 'info', 'exclude');
  if (!fs.existsSync(path.join(workspace, '.git'))) return;
  try {
    const current = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf8') : '';
    const want = ['.tavir/runs/', '.tavir/shadow.git/', 'qa/orders/', 'qa/evidencias/', 'qa/seguranca/'];
    const missing = want.filter((line) => !current.split(/\r?\n/).includes(line));
    if (!missing.length) return;
    fs.mkdirSync(path.dirname(excludeFile), { recursive: true });
    fs.appendFileSync(excludeFile, (current && !current.endsWith('\n') ? '\n' : '') + missing.join('\n') + '\n', 'utf8');
  } catch {}
}

/** Fotografa a pasta no git sombra e devolve o hash do commit. */
async function snapshot(workspace: string, message: string): Promise<string> {
  await ensureShadow(workspace);
  await git(workspace, ['add', '-A', '--ignore-errors', '.'], 120000).catch(() => '');
  await git(workspace, ['commit', '--quiet', '--allow-empty', '--no-verify', '-m', message], 60000);
  return (await git(workspace, ['rev-parse', 'HEAD'])).trim();
}

// Retratos do mesmo projeto não podem correr juntos (index do git sombra).
const queues = new Map<string, Promise<unknown>>();
function serial<T>(workspace: string, job: () => Promise<T>): Promise<T> {
  const key = path.resolve(workspace).toLowerCase();
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(job, job);
  queues.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

async function collectChanges(
  workspace: string,
  before: string,
  after: string,
): Promise<{ changes: RunChanges; patch: string }> {
  const status = await git(workspace, ['diff', '--name-status', '--no-renames', before, after]);
  const changes: RunChanges = { available: true, added: [], modified: [], deleted: [] };
  for (const line of status.split(/\r?\n/)) {
    const m = /^([AMDT])\t(.+)$/.exec(line.trim());
    if (!m) continue;
    if (m[1] === 'A') changes.added.push(m[2]);
    else if (m[1] === 'D') changes.deleted.push(m[2]);
    else changes.modified.push(m[2]);
  }
  let patch = '';
  if (changes.added.length + changes.modified.length + changes.deleted.length) {
    patch = await git(workspace, ['diff', '--stat', '--patch', '--no-renames', '--no-color', before, after]);
    if (patch.length > DIFF_LIMIT) {
      patch = patch.slice(0, DIFF_LIMIT) + '\n\n… diff cortado em 2 MB. Veja a lista completa em changes.json.\n';
    }
  }
  return { changes, patch };
}

// ---------------------------------------------------------------- leitura da saída do motor

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function* jsonLines(stdout: string): Generator<any> {
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const piece = line.trim();
    if (!piece.startsWith('{')) continue;
    try {
      const obj = JSON.parse(piece);
      if (obj && typeof obj === 'object') yield obj;
    } catch {}
  }
}

/** Tokens e custo reais, quando o motor informa (Claude, Codex, Cursor). */
export function parseUsage(stdout: string): RunUsage | undefined {
  let usage: RunUsage | undefined;
  for (const obj of jsonLines(stdout)) {
    const u = obj.usage || obj.item?.usage || obj.message?.usage || (obj.event === 'result' ? obj.result?.usage : undefined);
    const final = obj.type === 'result' || obj.type === 'turn.completed' || obj.event === 'result';
    if (u && typeof u === 'object' && (final || !usage)) {
      usage = {
        ...usage,
        inputTokens: num(u.input_tokens ?? u.inputTokens),
        outputTokens: num(u.output_tokens ?? u.outputTokens),
        cacheReadTokens: num(u.cache_read_input_tokens ?? u.cached_input_tokens ?? u.cache_read_tokens ?? u.cacheReadTokens),
        cacheWriteTokens: num(u.cache_creation_input_tokens ?? u.cacheWriteTokens),
      };
    }
    const cost = num(obj.total_cost_usd ?? obj.cost_usd);
    if (cost !== undefined) usage = { ...usage, costUsd: cost };
    const turns = num(obj.num_turns);
    if (turns !== undefined) usage = { ...usage, turns };
  }
  if (!usage) return undefined;
  const clean: RunUsage = {};
  for (const [k, v] of Object.entries(usage)) if (v !== undefined) (clean as any)[k] = v;
  return Object.keys(clean).length ? clean : undefined;
}

function short(value: unknown, limit: number): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const body = String(text ?? '').replace(/\s+$/g, '');
  return body.length > limit ? body.slice(0, limit) + ` … (+${body.length - limit} caracteres)` : body;
}

function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('');
  return content == null ? '' : JSON.stringify(content);
}

/**
 * Converte o stream do motor (stream-json do Cursor/Claude, --json do Codex) numa transcrição
 * legível: o que o agente disse, cada ferramenta chamada com a entrada e o resultado.
 */
export function buildTranscript(stdout: string): { markdown: string; toolCalls: number; toolErrors: number } {
  const out: string[] = [];
  let toolCalls = 0;
  let toolErrors = 0;
  let speech = '';
  const flushSpeech = () => {
    if (speech.trim()) out.push(`**Agente:** ${speech.trim()}`, '');
    speech = '';
  };
  const say = (text: string) => {
    if (!text) return;
    // Snapshots crescentes (Cursor) substituem o trecho anterior; deltas somam.
    if (speech && text.startsWith(speech)) speech = text;
    else if (!speech.endsWith(text)) speech += text;
  };
  const tool = (name: string, input: unknown) => {
    flushSpeech();
    toolCalls++;
    out.push(`🔧 **${name}**`, '```', short(input, 1200), '```', '');
  };
  const result = (text: string, failed = false) => {
    flushSpeech();
    if (failed) toolErrors++;
    out.push(`${failed ? '⛔' : '↳'} resultado`, '```', short(text, 1500), '```', '');
  };
  let sawJson = false;

  for (const line of String(stdout || '').split(/\r?\n/)) {
    const piece = line.trim();
    if (!piece) continue;
    let obj: any = null;
    if (piece.startsWith('{')) {
      try {
        obj = JSON.parse(piece);
      } catch {}
    }
    if (!obj || typeof obj !== 'object') {
      if (!sawJson) say(piece + '\n');
      continue;
    }
    sawJson = true;
    const type = String(obj.type || '');

    // Antigravity: passos (ferramentas) e resultado final.
    if (obj.event === 'step_update' && obj.step_update) {
      const su = obj.step_update;
      if (su.step_type === 'tool' && su.state === 'ACTIVE') tool(su.tool_name || su.tool_info?.name || 'ferramenta', su.tool_info?.parameters);
      continue;
    }
    if (obj.event === 'result' && obj.result) {
      const r = obj.result;
      if (r.response) say(String(r.response));
      flushSpeech();
      for (const d of Array.isArray(r.denied_actions) ? r.denied_actions : []) result(`Ação bloqueada: ${d.display_name || d.action}`, true);
      out.push(`■ fim: ${r.status || '?'}${r.duration_seconds != null ? ` · ${Math.round(Number(r.duration_seconds))} s` : ''}${r.error ? ` · ${r.error}` : ''}`, '');
      continue;
    }

    // Claude stream-json e Cursor: mensagens no formato Anthropic.
    if ((type === 'assistant' || type === 'user') && obj.message && Array.isArray(obj.message.content)) {
      // Cursor com --stream-partial-output: fragmentos têm timestamp_ms e não têm model_call_id.
      const isDelta = type === 'assistant' && obj.timestamp_ms != null && !obj.model_call_id;
      for (const part of obj.message.content) {
        if (part?.type === 'text' && type === 'assistant' && isDelta) speech += part.text || '';
        else if (part?.type === 'text' && type === 'assistant') say(part.text || '');
        else if (part?.type === 'thinking' && part.thinking) {
          flushSpeech();
          out.push(`💭 _${short(part.thinking, 1500)}_`, '');
        } else if (part?.type === 'tool_use') tool(part.name || 'ferramenta', part.input);
        else if (part?.type === 'tool_result') result(toolResultText(part.content), Boolean(part.is_error));
      }
      continue;
    }
    // Cursor: tool_call started/completed.
    if (type === 'tool_call' && obj.tool_call && typeof obj.tool_call === 'object') {
      const name = Object.keys(obj.tool_call)[0] || 'ferramenta';
      const body = obj.tool_call[name] || {};
      if (obj.subtype === 'started') tool(name.replace(/ToolCall$/, ''), body.args ?? body);
      else if (obj.subtype === 'completed') {
        const r = body.result ?? {};
        result(toolResultText(r.success?.content ?? r.success ?? r.error ?? r), Boolean(r.error));
      }
      continue;
    }
    // Codex --json: itens.
    if ((type === 'item.started' || type === 'item.completed') && obj.item) {
      const item = obj.item;
      if (item.type === 'agent_message' && type === 'item.completed') say((item.text || '') + '\n');
      else if (item.type === 'reasoning' && type === 'item.completed' && item.text) {
        flushSpeech();
        out.push(`💭 _${short(item.text, 1500)}_`, '');
      } else if (item.type === 'command_execution') {
        if (type === 'item.started') tool('shell', item.command);
        else result(`${item.aggregated_output || ''}\n(código de saída ${item.exit_code ?? '?'})`, Number(item.exit_code) > 0);
      } else if (item.type === 'file_change' && type === 'item.completed') {
        tool('editar arquivos', (item.changes || []).map((c: any) => `${c.kind || 'update'} ${c.path}`).join('\n'));
      } else if (item.type === 'error') {
        result(item.message || JSON.stringify(item), true);
      }
      continue;
    }
    if (type === 'result') {
      flushSpeech();
      const bits = [
        obj.subtype ? `fim: ${obj.subtype}` : 'fim',
        obj.is_error ? 'com erro' : '',
        obj.num_turns != null ? `${obj.num_turns} turnos` : '',
        obj.duration_ms != null ? `${Math.round(Number(obj.duration_ms) / 1000)} s` : '',
        obj.total_cost_usd != null ? `US$ ${Number(obj.total_cost_usd).toFixed(4)}` : '',
      ].filter(Boolean);
      out.push(`■ ${bits.join(' · ')}`, '');
      continue;
    }
    if (type === 'error' || type === 'turn.failed') {
      result(obj.message || obj.error?.message || JSON.stringify(obj), true);
      continue;
    }
    const delta = obj.delta && (obj.delta.text || obj.delta.thinking);
    if (typeof delta === 'string') say(delta);
  }
  flushSpeech();
  return { markdown: out.join('\n').trim(), toolCalls, toolErrors };
}

// ---------------------------------------------------------------- ciclo de uma execução

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function pruneRuns(workspace: string): void {
  try {
    const dirs = fs
      .readdirSync(runsRoot(workspace))
      .filter(isRunId)
      .sort();
    for (const old of dirs.slice(0, Math.max(0, dirs.length - RUNS_KEEP))) {
      fs.rmSync(path.join(runsRoot(workspace), old), { recursive: true, force: true });
    }
  } catch {}
}

export async function startRun(info: RunStartInfo): Promise<RunHandle> {
  const id = newRunId(info.kind);
  const dir = path.join(runsRoot(info.workspace), id);
  fs.mkdirSync(dir, { recursive: true });
  excludeFromProjectGit(info.workspace);
  const redact = makeRedactor(info.workspace);
  const started = Date.now();

  const meta: RunMeta = {
    id,
    kind: info.kind,
    label: info.label || info.stage || info.kind,
    stage: info.stage || '',
    owner: info.owner || '',
    projectName: info.projectName || path.basename(info.workspace),
    workspace: info.workspace,
    engine: info.engine,
    binary: info.binary,
    model: info.model,
    effort: info.effort,
    mode: info.mode,
    args: info.args.map((a) => (a.length > 400 ? a.slice(0, 400) + '…' : redact(a))),
    timeoutMs: info.timeoutMs,
    status: 'running',
    startedAt: new Date(started).toISOString(),
    promptChars: info.prompt.length,
  };
  fs.writeFileSync(path.join(dir, 'prompt.md'), redact(info.prompt), 'utf8');
  writeJson(path.join(dir, 'meta.json'), meta);

  const stdoutFile = path.join(dir, 'stdout.log');
  const stderrFile = path.join(dir, 'stderr.log');
  const stdoutStream = fs.createWriteStream(stdoutFile, { flags: 'a' });
  const stderrStream = fs.createWriteStream(stderrFile, { flags: 'a' });
  let stdoutAll = '';

  // Retrato "antes". Se falhar (pasta enorme, git ausente), a execução segue sem diff.
  let before = '';
  let snapshotNote = '';
  try {
    before = await serial(info.workspace, () => snapshot(info.workspace, `antes ${id}`));
  } catch (err) {
    snapshotNote = `Retrato do disco indisponível: ${err instanceof Error ? err.message : String(err)}`.slice(0, 400);
  }

  const raw = (stream: 'stdout' | 'stderr', text: string) => {
    if (!text) return;
    if (stream === 'stdout') {
      stdoutAll += text;
      stdoutStream.write(redact(text));
    } else {
      stderrStream.write(redact(text));
    }
  };

  const closeStream = (s: fs.WriteStream) => new Promise<void>((resolve) => s.end(() => resolve()));

  const finish = async (end: RunFinishInfo): Promise<RunMeta> => {
    await Promise.all([closeStream(stdoutStream), closeStream(stderrStream)]);
    const finishedAt = Date.now();
    meta.status = end.status || (end.ok ? 'ok' : 'failed');
    if (end.error) meta.error = redact(end.error).slice(0, 2000);
    meta.exitCode = end.exitCode ?? null;
    meta.finishedAt = new Date(finishedAt).toISOString();
    meta.durationMs = finishedAt - started;
    meta.replyChars = end.reply.length;
    meta.usage = parseUsage(stdoutAll);
    try {
      meta.stdoutBytes = fs.statSync(stdoutFile).size;
      meta.stderrBytes = fs.statSync(stderrFile).size;
    } catch {}

    fs.writeFileSync(path.join(dir, 'resposta.md'), redact(end.reply), 'utf8');
    const transcript = buildTranscript(stdoutAll);
    meta.toolCalls = transcript.toolCalls;
    meta.toolErrors = transcript.toolErrors;
    fs.writeFileSync(path.join(dir, 'transcricao.md'), redact(transcript.markdown), 'utf8');

    if (before) {
      try {
        const after = await serial(info.workspace, () => snapshot(info.workspace, `depois ${id}`));
        const { changes, patch } = await collectChanges(info.workspace, before, after);
        meta.changes = changes;
        if (patch) fs.writeFileSync(path.join(dir, 'diff.patch'), redact(patch), 'utf8');
      } catch (err) {
        meta.changes = {
          available: false,
          added: [],
          modified: [],
          deleted: [],
          note: `Não consegui comparar o disco: ${err instanceof Error ? err.message : String(err)}`.slice(0, 400),
        };
      }
    } else {
      meta.changes = { available: false, added: [], modified: [], deleted: [], note: snapshotNote };
    }

    writeJson(path.join(dir, 'meta.json'), meta);
    try {
      fs.appendFileSync(path.join(runsRoot(info.workspace), 'index.jsonl'), JSON.stringify(summaryOf(meta)) + '\n', 'utf8');
    } catch {}
    pruneRuns(info.workspace);
    return meta;
  };

  return { id, dir, raw, finish };
}

// ---------------------------------------------------------------- consulta

export interface RunSummary {
  id: string;
  kind: RunKind;
  label: string;
  stage: string;
  owner: string;
  engine: string;
  model: string;
  mode: string;
  status: RunStatus;
  error?: string;
  exitCode?: number | null;
  startedAt: string;
  durationMs?: number;
  toolCalls?: number;
  toolErrors?: number;
  usage?: RunUsage;
  filesChanged?: number;
  changesAvailable?: boolean;
}

function summaryOf(meta: RunMeta): RunSummary {
  const c = meta.changes;
  return {
    id: meta.id,
    kind: meta.kind,
    label: meta.label,
    stage: meta.stage,
    owner: meta.owner,
    engine: meta.engine,
    model: meta.model,
    mode: meta.mode,
    status: meta.status,
    error: meta.error ? meta.error.slice(0, 240) : undefined,
    exitCode: meta.exitCode,
    startedAt: meta.startedAt,
    durationMs: meta.durationMs,
    toolCalls: meta.toolCalls,
    toolErrors: meta.toolErrors,
    usage: meta.usage,
    filesChanged: c ? c.added.length + c.modified.length + c.deleted.length : undefined,
    changesAvailable: c ? c.available : undefined,
  };
}

function readMeta(workspace: string, id: string): RunMeta | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(runsRoot(workspace), id, 'meta.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Acrescenta campos ao meta.json depois que a execução fechou (commit do passo, decisão…). */
export function annotateRun(workspace: string, id: string, patch: Partial<RunMeta>): void {
  if (!isRunId(id)) return;
  const meta = readMeta(workspace, id);
  if (!meta) return;
  try {
    writeJson(path.join(runsRoot(workspace), id, 'meta.json'), { ...meta, ...patch });
  } catch {}
}

export function listRuns(workspace: string, limit = 100): RunSummary[] {
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(runsRoot(workspace)).filter(isRunId).sort().reverse().slice(0, limit);
  } catch {
    return [];
  }
  const out: RunSummary[] = [];
  for (const id of ids) {
    const meta = readMeta(workspace, id);
    if (meta) out.push(summaryOf(meta));
  }
  return out;
}

function readText(file: string, limit: number): { text: string; cut: boolean; bytes: number } {
  try {
    const stat = fs.statSync(file);
    if (stat.size <= limit) return { text: fs.readFileSync(file, 'utf8'), cut: false, bytes: stat.size };
    // Arquivo grande: mostra o fim, que é onde ficam erro e resultado.
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(limit);
    fs.readSync(fd, buf, 0, limit, stat.size - limit);
    fs.closeSync(fd);
    return { text: buf.toString('utf8'), cut: true, bytes: stat.size };
  } catch {
    return { text: '', cut: false, bytes: 0 };
  }
}

export function readRun(workspace: string, id: string): any {
  if (!isRunId(id)) return { ok: false, error: 'Execução inválida.' };
  const meta = readMeta(workspace, id);
  if (!meta) return { ok: false, error: 'Execução não encontrada.' };
  const dir = path.join(runsRoot(workspace), id);
  const stdout = readText(path.join(dir, 'stdout.log'), 400 * 1024);
  let transcricao = readText(path.join(dir, 'transcricao.md'), 400 * 1024).text;
  // Enquanto roda, a transcrição ainda não foi gravada: monta do stdout que já chegou.
  // O stdout.log já passou pelo redator ao ser escrito.
  if (!transcricao && meta.status === 'running' && stdout.text) {
    const firstBreak = stdout.cut ? stdout.text.indexOf('\n') : -1;
    transcricao = buildTranscript(firstBreak >= 0 ? stdout.text.slice(firstBreak + 1) : stdout.text).markdown;
  }
  return {
    ok: true,
    dir,
    meta,
    live: meta.status === 'running',
    prompt: readText(path.join(dir, 'prompt.md'), 200 * 1024).text,
    resposta: readText(path.join(dir, 'resposta.md'), 200 * 1024).text,
    transcricao,
    diff: readText(path.join(dir, 'diff.patch'), 600 * 1024),
    stdout,
    stderr: readText(path.join(dir, 'stderr.log'), 100 * 1024),
  };
}
