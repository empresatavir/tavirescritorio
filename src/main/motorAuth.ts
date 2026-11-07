/**
 * Login dos motores (CLI local) + chaves no cofre cifrado desta máquina.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cifrar, decifrar } from './cofreCripto';

export type MotorId = 'cursor' | 'claude' | 'codex' | 'antigravity';

export interface MotorLoginResult {
  ok: boolean;
  loggedIn: boolean;
  pending: boolean;
  opened: boolean;
  url: string | null;
  error: string | null;
  message: string;
  engine: MotorId;
}

export interface MotorKeyStatus {
  engine: MotorId;
  hasKey: boolean;
  baseUrl: string;
}

interface LoginState {
  proc: ChildProcess | null;
  url: string | null;
  error: string | null;
}

const URL_RE = /https:\/\/[^\s<>"']+/i;
const loginState: Partial<Record<MotorId, LoginState>> = {};

function secretsPath(): string {
  const dir = path.join(process.cwd(), 'db');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, 'engine_secrets.json');
}

function whichBinary(name: string): string | null {
  try {
    const { execFileSync } = require('node:child_process');
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      windowsHide: true,
      encoding: 'utf8',
    });
    return (
      String(out || '')
        .split(/\r?\n/)
        .map((x: string) => x.trim())
        .find(Boolean) || null
    );
  } catch {
    return null;
  }
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

export function normalizeMotorId(engineId: string): MotorId {
  const k = String(engineId || '').toLowerCase();
  if (k.includes('claude') || k.includes('anthropic')) return 'claude';
  if (k.includes('codex')) return 'codex';
  if (k.includes('anti') || k.includes('gemini') || k === 'agy') return 'antigravity';
  return 'cursor';
}

export function findMotorBinary(motor: MotorId): string | null {
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || '';
  const appdata = process.env.APPDATA || '';
  if (motor === 'cursor') {
    return (
      whichBinary('agent') ||
      whichBinary('cursor-agent') ||
      firstExisting([
        path.join(home, '.local', 'bin', 'agent.exe'),
        path.join(home, '.local', 'bin', 'agent.cmd'),
        local ? path.join(local, 'cursor-agent', 'agent.exe') : '',
        local ? path.join(local, 'cursor-agent', 'agent.cmd') : '',
      ])
    );
  }
  if (motor === 'claude') {
    return (
      whichBinary('claude') ||
      firstExisting([
        path.join(appdata, 'npm', 'claude.cmd'),
        path.join(home, '.local', 'bin', 'claude.exe'),
        path.join(home, '.local', 'bin', 'claude.cmd'),
      ])
    );
  }
  if (motor === 'codex') {
    return (
      whichBinary('codex') ||
      firstExisting([
        local ? path.join(local, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe') : '',
        path.join(appdata, 'npm', 'codex.cmd'),
        path.join(home, '.local', 'bin', 'codex.exe'),
      ])
    );
  }
  return (
    whichBinary('agy') ||
    firstExisting([
      path.join(home, '.gemini', 'bin', 'agy.exe'),
      path.join(home, '.gemini', 'bin', 'agy.cmd'),
      local ? path.join(local, 'Programs', 'Antigravity', 'agy.exe') : '',
      local ? path.join(local, 'Programs', 'Antigravity', 'Antigravity.exe') : '',
      local ? path.join(local, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe') : '',
    ])
  );
}

function readSecrets(): Record<string, { api_key?: string; base_url?: string }> {
  try {
    const raw = readFileSync(secretsPath(), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeSecrets(data: Record<string, { api_key?: string; base_url?: string }>): void {
  writeFileSync(secretsPath(), JSON.stringify(data, null, 2), 'utf8');
}

export function saveMotorKey(
  engineId: string,
  apiKey: string,
  baseUrl?: string,
): { ok: boolean; hasKey: boolean; message: string; engine: MotorId } {
  const engine = normalizeMotorId(engineId);
  if (engine === 'cursor' && !(apiKey || '').trim()) {
    return {
      ok: true,
      hasKey: false,
      engine,
      message: 'Cursor usa o login do Agent CLI. Chave opcional não foi gravada.',
    };
  }
  const key = String(apiKey || '').trim();
  if (key && key.length < 8) {
    return { ok: false, hasKey: false, engine, message: 'A chave está curta demais.' };
  }
  const data = readSecrets();
  const prev = data[engine] || {};
  const next: { api_key?: string; base_url?: string } = { ...prev };
  if (key) next.api_key = cifrar(key);
  if (baseUrl != null) next.base_url = String(baseUrl).trim();
  if (engine === 'antigravity' && key && !(next.base_url || '').trim()) {
    return {
      ok: false,
      hasKey: false,
      engine,
      message: 'O Antigravity precisa do endereço da API junto com a chave.',
    };
  }
  data[engine] = next;
  writeSecrets(data);
  return {
    ok: true,
    hasKey: Boolean(next.api_key),
    engine,
    message: key
      ? `Chave do ${labelOf(engine)} salva no cofre local desta máquina.`
      : `Apontamento do ${labelOf(engine)} atualizado no cofre.`,
  };
}

export function getMotorKey(engineId: string): string {
  const engine = normalizeMotorId(engineId);
  const row = readSecrets()[engine] || {};
  const enc = String(row.api_key || '');
  if (!enc) {
    const envFallback: Record<MotorId, string> = {
      cursor: process.env.CURSOR_API_KEY || '',
      claude: process.env.ANTHROPIC_API_KEY || '',
      codex: process.env.OPENAI_API_KEY || '',
      antigravity: process.env.ANTIGRAVITY_API_KEY || '',
    };
    return envFallback[engine] || '';
  }
  return decifrar(enc) || '';
}

export function getMotorBaseUrl(engineId: string): string {
  const engine = normalizeMotorId(engineId);
  const row = readSecrets()[engine] || {};
  return String(row.base_url || process.env.ANTIGRAVITY_BASE_URL || '').trim().replace(/\/$/, '');
}

export function motorHasKey(engineId: string): boolean {
  return Boolean(getMotorKey(engineId));
}

export function motorEnvVars(engineId: string): Record<string, string> {
  const engine = normalizeMotorId(engineId);
  const key = getMotorKey(engine);
  const out: Record<string, string> = {};
  if (!key) return out;
  if (engine === 'claude') out.ANTHROPIC_API_KEY = key;
  if (engine === 'codex') out.OPENAI_API_KEY = key;
  if (engine === 'cursor') {
    out.CURSOR_API_KEY = key;
    out.CURSOR_AGENT_API_KEY = key;
  }
  if (engine === 'antigravity') {
    out.ANTIGRAVITY_API_KEY = key;
    const base = getMotorBaseUrl(engine);
    if (base) out.ANTIGRAVITY_BASE_URL = base;
  }
  return out;
}

function labelOf(engine: MotorId): string {
  return { cursor: 'Cursor', claude: 'Claude', codex: 'Codex', antigravity: 'Antigravity' }[engine];
}

function spawnHidden(args: string[]): ChildProcess {
  const command = [...args];
  let file = command[0];
  let rest = command.slice(1);
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(file)) {
    rest = ['/d', '/c', file, ...rest];
    file = 'cmd.exe';
  }
  return spawn(file, rest, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

function readLoginStream(engine: MotorId, proc: ChildProcess): void {
  const state = loginState[engine] || { proc, url: null, error: null };
  loginState[engine] = state;
  let buf = '';
  const onData = (chunk: Buffer | string) => {
    buf += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    if (!state.url) {
      const match = buf.match(URL_RE);
      if (match) state.url = match[0].replace(/[),.;]+$/, '');
    }
  };
  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);
  proc.on('close', (code) => {
    if (code && code !== 0 && !state.url && !state.error) {
      const tail = buf.replace(/\s+/g, ' ').trim().slice(-240);
      state.error = tail || `O login encerrou com código ${code}.`;
    }
    state.proc = null;
  });
}

function waitForUrl(engine: MotorId, ms = 9000): Promise<void> {
  const deadline = Date.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      const state = loginState[engine];
      if (!state || state.url || state.error || !state.proc) return resolve();
      if (Date.now() >= deadline) return resolve();
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function probeLoggedIn(engine: MotorId, binary: string | null): Promise<boolean> {
  if (!binary) return false;
  try {
    const st = require('node:fs').statSync(binary);
    if (st.isDirectory()) return true;
  } catch {
    /* segue */
  }
  try {
    const { execFile } = require('node:child_process');
    const { promisify } = require('node:util');
    const execFileAsync = promisify(execFile);
    const isWinScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary);
    const file = isWinScript ? 'cmd.exe' : binary;
    if (engine === 'claude') {
      const args = isWinScript
        ? ['/d', '/c', binary, 'auth', 'status']
        : ['auth', 'status'];
      const { stdout } = await execFileAsync(file, args, {
        windowsHide: true,
        timeout: 8000,
        encoding: 'utf8',
      });
      try {
        const data = JSON.parse(String(stdout || '').trim() || '{}');
        return Boolean(data && data.loggedIn);
      } catch {
        return /logged.?in|authenticated/i.test(String(stdout));
      }
    }
    if (engine === 'codex') {
      const args = isWinScript
        ? ['/d', '/c', binary, 'login', 'status']
        : ['login', 'status'];
      const { stdout, stderr } = await execFileAsync(file, args, {
        windowsHide: true,
        timeout: 8000,
        encoding: 'utf8',
      });
      const blob = `${stdout}\n${stderr}`.toLowerCase();
      if (blob.includes('not logged')) return false;
      return blob.includes('logged in');
    }
    if (engine === 'cursor') {
      // Agent autenticado costuma responder whoami/status sem 401
      return motorHasKey('cursor') || existsSync(path.join(os.homedir(), '.cursor'));
    }
    return true;
  } catch {
    return motorHasKey(engine);
  }
}

function openAntigravityGui(): MotorLoginResult {
  const local = process.env.LOCALAPPDATA || '';
  const gui =
    firstExisting([
      local ? path.join(local, 'Programs', 'Antigravity', 'Antigravity.exe') : '',
      local ? path.join(local, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe') : '',
    ]) || findMotorBinary('antigravity');
  if (!gui) {
    return {
      ok: false,
      engine: 'antigravity',
      loggedIn: false,
      pending: false,
      opened: false,
      url: null,
      error: 'O Antigravity não está instalado nesta máquina.',
      message: 'Instale o Antigravity ou cole a chave de API no cofre.',
    };
  }
  try {
    spawn(gui, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    }).unref();
    return {
      ok: true,
      engine: 'antigravity',
      loggedIn: false,
      pending: true,
      opened: true,
      url: null,
      error: null,
      message: 'Abri o Antigravity. Faça o login na janela do aplicativo.',
    };
  } catch (err) {
    return {
      ok: false,
      engine: 'antigravity',
      loggedIn: false,
      pending: false,
      opened: false,
      url: null,
      error: String(err),
      message: 'Não consegui abrir o Antigravity.',
    };
  }
}

export async function startMotorLogin(engineId: string): Promise<MotorLoginResult> {
  const engine = normalizeMotorId(engineId);
  if (engine === 'antigravity') return openAntigravityGui();

  const binary = findMotorBinary(engine);
  if (!binary) {
    return {
      ok: false,
      engine,
      loggedIn: false,
      pending: false,
      opened: false,
      url: null,
      error: 'cli-missing',
      message: `O ${labelOf(engine)} CLI não está instalado nesta máquina.`,
    };
  }

  if (await probeLoggedIn(engine, binary)) {
    return {
      ok: true,
      engine,
      loggedIn: true,
      pending: false,
      opened: false,
      url: null,
      error: null,
      message: `${labelOf(engine)} já está autenticado neste computador.`,
    };
  }

  const args =
    engine === 'claude'
      ? [binary, 'auth', 'login']
      : engine === 'codex'
        ? [binary, 'login']
        : [binary, 'login'];

  const existing = loginState[engine];
  if (!existing?.proc) {
    const child = spawnHidden(args);
    loginState[engine] = { proc: child, url: null, error: null };
    readLoginStream(engine, child);
  }
  await waitForUrl(engine);
  const state = loginState[engine] || { proc: null, url: null, error: null };
  const pending = Boolean(state.proc);
  return {
    ok: Boolean(state.url) || pending,
    engine,
    loggedIn: false,
    pending,
    opened: true,
    url: state.url,
    error: state.url ? null : state.error,
    message: state.url
      ? `Abra o link para entrar no ${labelOf(engine)}. Depois volte e teste a Íris.`
      : pending
        ? `Login do ${labelOf(engine)} em andamento. Confirme no navegador se abriu.`
        : state.error || `Não consegui iniciar o login do ${labelOf(engine)}.`,
  };
}

export async function motorAuthStatus(engineId: string): Promise<{
  id: MotorId;
  name: string;
  installed: boolean;
  loggedIn: boolean;
  hasKey: boolean;
  path: string;
  detail: string;
}> {
  const engine = normalizeMotorId(engineId);
  const binary = findMotorBinary(engine);
  const hasKey = motorHasKey(engine);
  const loggedIn = hasKey || (await probeLoggedIn(engine, binary));
  const parts: string[] = [];
  if (binary) parts.push('CLI encontrado');
  else parts.push('CLI ausente');
  if (loggedIn) parts.push('login ok');
  else parts.push('sem login');
  if (hasKey) parts.push('chave no cofre');
  return {
    id: engine,
    name: labelOf(engine),
    installed: Boolean(binary),
    loggedIn,
    hasKey,
    path: binary || '',
    detail: parts.join(' · '),
  };
}
