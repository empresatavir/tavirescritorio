/**
 * Camada única dos 4 motores (Cursor, Claude, Codex, Antigravity).
 *
 * Todos recebem o mesmo pedido pelo stdin, com o mesmo significado de acesso:
 *  - read: só lê o workspace (nenhuma escrita, nenhum comando que mude algo);
 *  - write: pode editar arquivos e rodar comandos locais no workspace.
 * A saída de cada CLI é lida para um formato comum (texto final, falas, ferramentas, uso),
 * e as falhas viram um tipo conhecido com a ação para o Carlos.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

export type MotorId = 'cursor' | 'claude' | 'codex' | 'antigravity';
export type MotorAccess = 'read' | 'write';
export type MotorErrorKind = 'missing' | 'auth' | 'plan' | 'model' | 'timeout' | 'idle' | 'paused' | 'empty' | 'failed';

export const MOTOR_IDS: MotorId[] = ['cursor', 'claude', 'codex', 'antigravity'];
export const MOTOR_LABEL: Record<MotorId, string> = {
  cursor: 'Cursor',
  claude: 'Claude',
  codex: 'Codex',
  antigravity: 'Antigravity',
};

export interface MotorCall {
  motor: MotorId;
  workspace: string;
  prompt: string;
  /** Id do modelo no catálogo do Escritório (ex.: claude-opus-5-5, gemini-4-argon, auto-smart). */
  model: string;
  /** low | medium | high | xhigh (aliases do catálogo também são aceitos). */
  effort: string;
  access: MotorAccess;
  timeoutMs: number;
  /** Silêncio máximo antes de considerar o motor travado. */
  idleMs?: number;
  /** Saída bruta, para o livro de execuções. */
  onRaw?: (stream: 'stdout' | 'stderr', text: string) => void;
  /** Progresso legível: fala atual do agente ou a ferramenta em uso. */
  onProgress?: (p: MotorProgress) => void;
  registerKill?: (kill: () => void) => void;
}

export interface MotorProgress {
  /** O que o agente está dizendo agora (desde a última ferramenta). */
  speech: string;
  /** Última ferramenta chamada, em português curto (ex.: "Lendo src/app.ts"). */
  activity: string;
}

export interface MotorInvocation {
  binary: string;
  args: string[];
  stdin: string;
  model: string;
}

export interface MotorResult {
  ok: boolean;
  text: string;
  motor: MotorId;
  model: string;
  binary: string;
  args: string[];
  exitCode: number | null;
  error?: { kind: MotorErrorKind; message: string };
  stdout: string;
  stderr: string;
}

// ---------------------------------------------------------------- binários

function which(name: string): string | null {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 5000,
    });
    return String(out || '').split(/\r?\n/).map((x) => x.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) if (p && fs.existsSync(p)) return p;
  return null;
}

const binaryCache = new Map<MotorId, { at: number; path: string | null }>();

export function findMotorBinary(motor: MotorId): string | null {
  const hit = binaryCache.get(motor);
  if (hit && Date.now() - hit.at < 60000) return hit.path;
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || '';
  let found: string | null = null;
  if (motor === 'cursor') {
    found =
      firstExisting([
        local ? path.join(local, 'cursor-agent', 'agent.cmd') : '',
        local ? path.join(local, 'cursor-agent', 'agent.exe') : '',
        path.join(home, '.local', 'bin', 'agent.exe'),
        path.join(home, '.local', 'bin', 'cursor-agent'),
      ]) ||
      which('agent') ||
      which('cursor-agent');
  } else if (motor === 'claude') {
    found =
      which('claude') ||
      firstExisting([
        path.join(home, '.local', 'bin', 'claude.exe'),
        path.join(home, '.local', 'bin', 'claude'),
        path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
      ]);
  } else if (motor === 'codex') {
    found =
      firstExisting([local ? path.join(local, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe') : '']) ||
      which('codex') ||
      firstExisting([path.join(process.env.APPDATA || '', 'npm', 'codex.cmd'), path.join(home, '.local', 'bin', 'codex')]);
  } else {
    found =
      firstExisting([path.join(home, '.gemini', 'bin', 'agy.exe'), path.join(home, '.gemini', 'bin', 'agy')]) || which('agy');
  }
  binaryCache.set(motor, { at: Date.now(), path: found });
  return found;
}

export function normalizeMotorId(id: string | null | undefined): MotorId {
  const k = String(id || '').toLowerCase();
  if (k.includes('claude') || k.includes('anthropic')) return 'claude';
  if (k.includes('codex') || k.includes('openai')) return 'codex';
  if (k.includes('anti') || k.includes('gemini') || k === 'agy') return 'antigravity';
  return 'cursor';
}

// ---------------------------------------------------------------- modelo e esforço

export function effortLevel(effort: string): 'low' | 'medium' | 'high' | 'xhigh' {
  const raw = String(effort || '').toLowerCase().trim();
  const map: Record<string, 'low' | 'medium' | 'high' | 'xhigh'> = {
    low: 'low', baixo: 'low', cost: 'low', minimal: 'low',
    medium: 'medium', médio: 'medium', medio: 'medium', balanced: 'medium', balance: 'medium',
    high: 'high', alto: 'high', intelligence: 'high',
    xhigh: 'xhigh', max: 'xhigh', máximo: 'xhigh', maximo: 'xhigh',
  };
  return map[raw] || 'medium';
}

/** Converte o id do catálogo no nome que o CLI do motor aceita. '' = padrão do próprio CLI. */
export function cliModel(motor: MotorId, model: string, effort: string): string {
  const m = String(model || '').trim().toLowerCase();
  const level = effortLevel(effort);
  if (motor === 'cursor') {
    if (!m || m.includes('auto')) return 'auto';
    if (m === 'sonnet-4-thinking') return 'claude-sonnet-5-thinking-high';
    if (m === 'gpt-5') return 'gpt-5.3-codex';
    return m;
  }
  if (motor === 'claude') {
    if (!m || m === 'default') return '';
    if (m.includes('sonnet-4') || m === 'claude-sonnet-4-5') return 'claude-sonnet-5-5';
    if (m.includes('opus-4-1')) return 'claude-opus-5-5';
    if (m.includes('haiku-4')) return 'claude-haiku-5-5';
    return m;
  }
  if (motor === 'codex') {
    // Ids antigos do catálogo caem no padrão do ~/.codex/config.toml.
    if (!m || m === 'default' || m === 'codex-default' || m === 'gpt-5' || m === 'gpt-5-codex') return '';
    return m;
  }
  // Antigravity: o esforço faz parte do nome (gemini-4-argon-medium); xhigh vira high.
  const tier = level === 'xhigh' ? 'high' : level;
  let base = m.replace(/-(low|medium|high)$/, '');
  if (!base || base.includes('2.5-pro') || base === 'gemini-pro') base = 'gemini-4-argon';
  if (base.includes('2.5-flash') || base === 'gemini-flash') base = 'gemini-3.8-flash';
  if (base.startsWith('gpt-oss')) return 'gpt-oss-120b-medium';
  return `${base}-${tier}`;
}

// ---------------------------------------------------------------- invocação

/** Como cada CLI recebe o mesmo pedido, com o mesmo significado de acesso. */
export function buildInvocation(call: Pick<MotorCall, 'motor' | 'workspace' | 'prompt' | 'model' | 'effort' | 'access'>, binary: string): MotorInvocation {
  const model = cliModel(call.motor, call.model, call.effort);
  const level = effortLevel(call.effort);
  const write = call.access === 'write';

  if (call.motor === 'cursor') {
    const args = ['-p', '--output-format', 'stream-json', '--stream-partial-output', '--trust', '--workspace', call.workspace];
    args.push('--model', model);
    if (write) args.push('--force', '--sandbox', 'disabled');
    else args.push('--mode', 'ask');
    return { binary, args, stdin: call.prompt, model };
  }

  if (call.motor === 'claude') {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (model) args.push('--model', model);
    args.push('--effort', level);
    if (write) args.push('--dangerously-skip-permissions');
    else args.push('--allowedTools', 'Read', 'Glob', 'Grep', 'LS', '--disallowedTools', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash');
    return { binary, args, stdin: call.prompt, model: model || 'padrão do Claude Code' };
  }

  if (call.motor === 'codex') {
    const args = ['exec', '--json', '--skip-git-repo-check', '-C', call.workspace];
    if (model) args.push('-m', model);
    args.push('-c', `model_reasoning_effort="${level}"`, '-c', 'approval_policy="never"');
    if (write) args.push('-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true');
    else args.push('-s', 'read-only');
    args.push('-');
    return { binary, args, stdin: call.prompt, model: model || 'padrão do ~/.codex/config.toml' };
  }

  // Antigravity: o stdin em stream-json aceita mensagens {"event":"user", ...}.
  const args = ['--output-format', 'stream-json', '--input-format', 'stream-json', '--model', model];
  if (write) args.push('--mode', 'auto', '--dangerously-skip-permissions');
  else args.push('--mode', 'plan');
  const stdin = JSON.stringify({ event: 'user', message: { role: 'user', content: call.prompt } }) + '\n';
  return { binary, args, stdin, model };
}

// ---------------------------------------------------------------- ambiente

const WIN_CONNECT_JS = `"use strict";
const net = require("net");
const orig = net.Socket.prototype.connect;
function localPort() {
  return 18000 + Math.floor(Math.random() * 4000);
}
net.Socket.prototype.connect = function (options, ...rest) {
  if (options && typeof options === "object" && options.localPort == null && !options.path) {
    return orig.call(this, Object.assign({}, options, { localPort: localPort() }), ...rest);
  }
  return orig.call(this, options, ...rest);
};
`;

/**
 * Ambiente igual para os 4 motores, venha o Escritório de onde vier.
 * Variáveis do Git Bash (MSYSTEM etc.) fazem o Cursor rodar hooks pelo bash, que quebram
 * e bloqueiam as ferramentas de leitura — por isso saem daqui.
 */
export function motorEnv(motor: MotorId): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^(MSYSTEM|MSYSTEM_.*|MSYS|MSYS2_.*|MINGW_.*|SHELL|CHERE_INVOKING|ORIGINAL_PATH|ORIGINAL_TEMP|ORIGINAL_TMP|EXEPATH|TERM_PROGRAM.*)$/i.test(k)) {
      delete env[k];
    }
  }
  env.NO_COLOR = '1';
  env.FORCE_COLOR = '0';
  try {
    const { motorEnvVars } = require('./motorAuth') as typeof import('./motorAuth');
    Object.assign(env, motorEnvVars(motor));
  } catch {}
  if (process.platform === 'win32' && motor === 'cursor') {
    try {
      const folder = path.join(process.env.LOCALAPPDATA || os.homedir(), 'tavir-cursor');
      fs.mkdirSync(folder, { recursive: true });
      const hook = path.join(folder, 'win-connect.js');
      if (!fs.existsSync(hook) || fs.readFileSync(hook, 'utf8') !== WIN_CONNECT_JS) fs.writeFileSync(hook, WIN_CONNECT_JS, 'utf8');
      // NODE_OPTIONS trata "\" dentro de aspas como escape: o caminho vai com barras normais.
      const hookArg = hook.replace(/\\/g, '/');
      const current = env.NODE_OPTIONS || '';
      const extra = [current.includes('--use-system-ca') ? '' : '--use-system-ca', current.includes(hookArg) ? '' : `--require "${hookArg}"`]
        .filter(Boolean)
        .join(' ');
      env.NODE_OPTIONS = `${current} ${extra}`.trim();
    } catch {}
  }
  return env;
}

// ---------------------------------------------------------------- leitura dos eventos

/** Estado comum montado a partir do stream de qualquer motor. */
export class MotorStream {
  private speech = '';
  private finalText = '';
  private resultText = '';
  private lastTool = '';
  private hardError = '';
  private resultIsError = false;
  readonly messages: string[] = [];

  constructor(private motor: MotorId) {}

  /** Texto que o agente disse depois da última ferramenta = a resposta ao Carlos. */
  reply(): string {
    const candidates = [this.finalText, this.speech, this.resultText];
    return (candidates.find((t) => t && t.trim()) || '').trim();
  }

  error(): string {
    if (this.resultIsError) return this.resultText || this.hardError || 'O motor encerrou com erro.';
    return this.hardError;
  }

  progress(): MotorProgress {
    return { speech: this.speech.trim(), activity: this.lastTool };
  }

  private sayDelta(text: string) {
    this.speech += text;
  }

  private saySnapshot(text: string) {
    // Snapshots crescentes substituem; mensagens novas acumulam com quebra de linha.
    if (!this.speech || text.startsWith(this.speech)) this.speech = text;
    else if (!this.speech.endsWith(text)) this.speech += (this.speech.endsWith('\n') ? '' : '\n\n') + text;
  }

  private tool(label: string) {
    if (this.speech.trim()) this.messages.push(this.speech.trim());
    this.speech = '';
    this.finalText = '';
    this.lastTool = label.slice(0, 160);
  }

  /** Processa uma linha do stdout. Devolve true se mudou algo visível. */
  feed(line: string): boolean {
    const piece = line.trim();
    if (!piece.startsWith('{')) return false;
    let o: any;
    try {
      o = JSON.parse(piece);
    } catch {
      return false;
    }
    if (!o || typeof o !== 'object') return false;
    const type = String(o.type || o.event || '');

    // ---- Antigravity
    if (this.motor === 'antigravity') {
      if (type === 'step_update') {
        const su = o.step_update || {};
        if (su.step_type === 'tool' && su.state === 'ACTIVE') {
          this.tool(describeTool(su.tool_name || su.tool_info?.name || 'ferramenta', su.tool_info?.parameters));
          return true;
        }
        const text = su.text || su.response || su.content;
        if (su.step_type === 'agent_response' && typeof text === 'string' && text.trim()) {
          this.saySnapshot(text);
          return true;
        }
        return false;
      }
      if (type === 'result') {
        const r = o.result || {};
        this.resultText = String(r.response || '').trim();
        if (this.resultText) this.finalText = this.resultText;
        if (String(r.status || '').toUpperCase() !== 'SUCCESS') {
          this.resultIsError = true;
          this.resultText = String(r.error || this.resultText || 'O Antigravity encerrou com erro.');
        } else if (!this.resultText && Array.isArray(r.denied_actions) && r.denied_actions.length) {
          this.hardError = `O Antigravity tentou uma ação bloqueada (${r.denied_actions.map((d: any) => d.display_name || d.action).join(', ')}).`;
        }
        return true;
      }
      if (type === 'error') {
        this.hardError = String(o.message || o.error || 'Erro no Antigravity.');
        return true;
      }
      return false;
    }

    // ---- Codex
    if (type.startsWith('item.') && o.item) {
      const it = o.item;
      if (it.type === 'agent_message' && type === 'item.completed' && typeof it.text === 'string') {
        this.saySnapshot(it.text);
        this.finalText = it.text;
        return true;
      }
      if (it.type === 'command_execution' && type === 'item.started') {
        this.tool(describeTool('shell', { command: it.command }));
        return true;
      }
      if (it.type === 'file_change' && type === 'item.completed') {
        this.tool(`Editando ${(it.changes || []).map((c: any) => c.path).slice(0, 3).join(', ')}`);
        return true;
      }
      if (it.type === 'error' && type === 'item.completed') {
        const msg = String(it.message || '');
        if (/401|unauthor|auth|login|bearer|quota|rate limit|model/i.test(msg)) this.hardError = msg;
        return false;
      }
      return false;
    }
    if (type === 'turn.failed') {
      this.hardError = String(o.error?.message || o.message || 'O Codex encerrou com erro.');
      return true;
    }
    if (type === 'error' && o.message) {
      this.hardError = String(o.message);
      return true;
    }

    // ---- Cursor e Claude (mensagens no formato Anthropic)
    if (type === 'assistant' && o.message && Array.isArray(o.message.content)) {
      let changed = false;
      for (const part of o.message.content) {
        if (part?.type === 'text' && typeof part.text === 'string' && part.text) {
          // Cursor com --stream-partial-output manda deltas; o Claude manda a mensagem inteira.
          if (this.motor === 'cursor' && o.timestamp_ms != null && !o.model_call_id) this.sayDelta(part.text);
          else this.saySnapshot(part.text);
          changed = true;
        } else if (part?.type === 'tool_use') {
          this.tool(describeTool(part.name, part.input));
          changed = true;
        }
      }
      return changed;
    }
    if (type === 'tool_call' && o.subtype === 'started' && o.tool_call) {
      const name = Object.keys(o.tool_call)[0] || 'ferramenta';
      this.tool(describeTool(name.replace(/ToolCall$/, ''), o.tool_call[name]?.args));
      return true;
    }
    if (type === 'result') {
      this.resultText = String(o.result ?? '').trim();
      if (o.is_error) this.resultIsError = true;
      return true;
    }
    if (type === 'stream_event' && o.event?.delta?.text) {
      this.sayDelta(o.event.delta.text);
      return true;
    }
    return false;
  }

  /** O Cursor manda a última mensagem completa ao fim; usa ela quando existir. */
  settle(): void {
    if (this.motor === 'cursor' && this.resultText && !this.resultIsError) {
      // result do Cursor junta todas as falas; a resposta é o trecho depois da última ferramenta.
      const tail = this.speech.trim();
      this.finalText = tail || this.resultText;
    }
    if (this.motor === 'claude' && this.resultText && !this.resultIsError) this.finalText = this.resultText;
  }
}

function describeTool(name: string, input: any): string {
  const n = String(name || '').toLowerCase();
  const arg = input && typeof input === 'object'
    ? input.path || input.file_path || input.Path || input.AbsolutePath || input.filePath || input.pattern || input.Pattern || input.query || input.command || input.CommandLine || input.globPattern || ''
    : String(input || '');
  const target = String(arg || '').replace(/\\/g, '/').split('/').slice(-2).join('/').slice(0, 120);
  if (/read|view|cat|open/.test(n)) return `Lendo ${target}`.trim();
  if (/grep|search|find|glob|ls|list/.test(n)) return `Procurando ${target}`.trim();
  if (/write|edit|replace|patch|create|multi/.test(n)) return `Editando ${target}`.trim();
  if (/shell|bash|command|terminal|run/.test(n)) return `Rodando ${target}`.trim();
  return `${name} ${target}`.trim();
}

// ---------------------------------------------------------------- erros

export function classifyMotorError(motor: MotorId, text: string): { kind: MotorErrorKind; message: string } {
  const t = String(text || '');
  const label = MOTOR_LABEL[motor];
  if (/requires? (a )?(pro|max|team|paid) plan|subscription|upgrade your plan|403/i.test(t) && /plan|subscr/i.test(t)) {
    return { kind: 'plan', message: `A conta do ${label} não tem acesso a esse modelo (o provedor pediu um plano pago). Troque o modelo ou o plano.` };
  }
  if (/unknown model|model[^.]{0,40}(not found|not exist|unavailable|not supported|invalid)|invalid model|unsupported model/i.test(t)) {
    return { kind: 'model', message: `O ${label} não reconhece esse modelo. Escolha outro modelo no seletor.` };
  }
  if (/401|unauthor|not logged|not authenticated|login required|failed to authenticate|missing bearer|oauth|sign in|auth(entication)? (failed|error)/i.test(t)) {
    return { kind: 'auth', message: `O ${label} não está autenticado. Em Configurações → Motores, use «Entrar com login» ou salve a chave no cofre.` };
  }
  return { kind: 'failed', message: `O ${label} falhou: ${t.replace(/\s+/g, ' ').trim().slice(0, 300) || 'sem detalhe.'}` };
}

// ---------------------------------------------------------------- execução

export async function runMotor(call: MotorCall): Promise<MotorResult> {
  const binary = findMotorBinary(call.motor);
  const base = { motor: call.motor, binary: binary || '', args: [] as string[], model: cliModel(call.motor, call.model, call.effort), stdout: '', stderr: '', exitCode: null };
  if (!binary) {
    return {
      ...base,
      ok: false,
      text: '',
      error: { kind: 'missing', message: `Não achei o CLI do ${MOTOR_LABEL[call.motor]} neste computador. Instale e faça login para usar este motor.` },
    };
  }
  const inv = buildInvocation(call, binary);
  const isScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary);
  const cmd = isScript ? process.env.ComSpec || 'cmd.exe' : binary;
  const args = isScript ? ['/d', '/s', '/c', binary, ...inv.args] : inv.args;

  return new Promise((resolve) => {
    const stream = new MotorStream(call.motor);
    let stdout = '';
    let stderr = '';
    let pending = '';
    let finished = false;
    let aborted = false;
    let stopReason: { kind: MotorErrorKind; message: string } | null = null;
    let lastEmit = 0;

    const child = spawn(cmd, args, {
      cwd: call.workspace,
      env: motorEnv(call.motor),
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const kill = () => {
      try {
        if (process.platform === 'win32' && child.pid) {
          // cmd.exe → powershell → node: mata a árvore inteira.
          spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
        } else child.kill();
      } catch {}
    };
    call.registerKill?.(() => {
      aborted = true;
      kill();
    });

    const idleMs = call.idleMs ?? Math.min(300000, Math.max(60000, call.timeoutMs / 2));
    let idleTimer: NodeJS.Timeout;
    const armIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        stopReason = { kind: 'idle', message: `O ${MOTOR_LABEL[call.motor]} ficou ${Math.round(idleMs / 1000)} s sem enviar nada e foi encerrado.` };
        kill();
      }, idleMs);
    };
    const hardTimer = setTimeout(() => {
      stopReason = { kind: 'timeout', message: `O ${MOTOR_LABEL[call.motor]} não concluiu em ${Math.round(call.timeoutMs / 1000)} s e foi encerrado.` };
      kill();
    }, call.timeoutMs);
    armIdle();

    // No máximo ~3 atualizações por segundo, sem perder a última (envio no fim do intervalo).
    let trailing: NodeJS.Timeout | null = null;
    const emit = (force = false) => {
      if (!call.onProgress) return;
      const now = Date.now();
      const wait = 350 - (now - lastEmit);
      if (!force && wait > 0) {
        if (!trailing) trailing = setTimeout(() => { trailing = null; emit(true); }, wait);
        return;
      }
      if (trailing) { clearTimeout(trailing); trailing = null; }
      lastEmit = now;
      call.onProgress(stream.progress());
    };

    child.stdout.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8');
      stdout += text;
      call.onRaw?.('stdout', text);
      armIdle();
      pending += text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || '';
      let changed = false;
      for (const line of lines) changed = stream.feed(line) || changed;
      if (changed) emit();
    });
    child.stderr.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8');
      stderr += text;
      call.onRaw?.('stderr', text);
      armIdle();
    });
    child.stdin.on('error', () => {});
    child.stdin.end(inv.stdin, 'utf8');

    const done = (exitCode: number | null, spawnError?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(idleTimer);
      clearTimeout(hardTimer);
      if (pending.trim()) stream.feed(pending);
      stream.settle();
      emit(true);
      const text = stream.reply();
      const out = { ...base, args: inv.args, model: inv.model, stdout, stderr, exitCode };
      if (aborted) return resolve({ ...out, ok: false, text, error: { kind: 'paused', message: 'Pausado por Carlos.' } });
      if (stopReason) return resolve({ ...out, ok: false, text, error: stopReason });
      if (spawnError) return resolve({ ...out, ok: false, text, error: classifyMotorError(call.motor, spawnError) });
      const err = stream.error();
      if (err) return resolve({ ...out, ok: false, text, error: classifyMotorError(call.motor, err) });
      if (!text) {
        const tail = (stderr || stdout).slice(-600);
        const c = classifyMotorError(call.motor, tail);
        return resolve({
          ...out,
          ok: false,
          text: '',
          error: c.kind === 'failed' ? { kind: 'empty', message: `O ${MOTOR_LABEL[call.motor]} terminou sem resposta (código ${exitCode}).` } : c,
        });
      }
      resolve({ ...out, ok: true, text });
    };
    child.on('error', (err) => done(null, String(err?.message || err)));
    child.on('close', (code) => done(code));
  });
}
