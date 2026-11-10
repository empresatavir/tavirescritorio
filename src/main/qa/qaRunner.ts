/**
 * Portão de QA determinístico: roda as checagens do projeto, sobe o app, percorre a jornada
 * no navegador, recorta GIFs das falhas e grava resultado + relatório em qa/evidencias/<id>/.
 * Quem aprova é o resultado (código de saída e asserções), não o texto de um agente.
 */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as path from 'node:path';
import { planQa, type QaCheck, type QaPlan } from './qaPlan';
import type { JornadaResult, JornadaTest } from './jornada';
import { renderQaReport } from './qaReport';
import { excludeFromProjectGit } from '../runLedger';

export type QaTestStatus = 'pass' | 'fail';

export interface QaTestResult {
  name: string;
  st: QaTestStatus;
  dur: number;
  err?: { msg: string; exp: string; rec: string; at: string; code: string } | null;
  shots?: string[];
  gif?: string;
  log?: string;
}

export interface QaSuite {
  name: string;
  tests: QaTestResult[];
}

export interface QaEvidence {
  i: number;
  kind: 'video' | 'gif' | 'img' | 'report' | 'trace' | 'log';
  name: string;
  /** Caminho relativo à pasta da execução. */
  path: string;
  /** Caminho absoluto, para abrir no painel. */
  file: string;
  suite?: number;
  test?: string;
  fail: boolean;
  mobile: boolean;
  size: string;
  dur?: number;
  note?: string;
}

export interface QaRun {
  id: string;
  at: string;
  when: string;
  by: string;
  motor: string;
  commit: string;
  preview: boolean;
  stack: string;
  target: string;
  ok: boolean;
  /** Nenhum teste rodou: o portão reprova, mas o motivo é outro. */
  empty: boolean;
  suites: QaSuite[];
  total: number;
  pass: number;
  fail: number;
  dur: number;
  browsers: string;
  ev: QaEvidence[];
  notes: string[];
  dir: string;
  report: string;
  label?: string;
  /** Execução anterior usada na comparação. */
  prevId?: string;
  /** Testes que passavam na execução anterior e falham nesta. */
  regress?: string[];
}

export interface QaRunOptions {
  workspace: string;
  projectName: string;
  /** Quem pediu (etapa da esteira, trilho, botão do painel). */
  label?: string;
  maxPages?: number;
  onProgress?: (line: string) => void;
  registerKill?: (kill: () => void) => void;
}

const WIN = process.platform === 'win32';
const LOG_TAIL = 60;

const pad = (n: number) => String(n).padStart(2, '0');
function stampId(d = new Date()): string {
  return `QA-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
export const whenOf = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function qaRoot(workspace: string): string {
  return path.join(workspace, 'qa', 'evidencias');
}

export function sizeOf(file: string): string {
  try {
    const b = fs.statSync(file).size;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  } catch {
    return '—';
  }
}

export function tail(text: string, lines = LOG_TAIL): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).filter((l) => l.trim()).slice(-lines).join('\n');
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

export function killTree(child: ChildProcess | null): void {
  if (!child || child.exitCode != null || !child.pid) return;
  try {
    if (WIN) spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    try { child.kill(); } catch {}
  }
}

function spawnCmd(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
  // .cmd no Windows precisa passar pelo cmd.exe (Node 20+ recusa spawn direto).
  if (WIN && /\.(cmd|bat)$/i.test(command)) {
    const line = [command, ...args].map((a) => (/[\s&|<>^"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a)).join(' ');
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], { cwd, env, windowsHide: true, windowsVerbatimArguments: true });
  }
  return spawn(command, args, { cwd, env, windowsHide: true, detached: !WIN });
}

function qaEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', BROWSER: 'none', ...extra };
  delete env.ELECTRON_RUN_AS_NODE;
  for (const k of Object.keys(env)) if (/^(MSYSTEM|MSYS|MINGW_)/.test(k)) delete env[k];
  return env;
}

export function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  track: (c: ChildProcess | null) => void,
): Promise<{ code: number | null; out: string; ms: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = '';
    let timedOut = false;
    let child: ChildProcess;
    try {
      child = spawnCmd(cmd, args, cwd, qaEnv());
    } catch (err) {
      resolve({ code: -1, out: String(err), ms: 0, timedOut: false });
      return;
    }
    track(child);
    const add = (b: Buffer) => {
      out += b.toString('utf8');
      if (out.length > 4 * 1024 * 1024) out = out.slice(-2 * 1024 * 1024);
    };
    child.stdout?.on('data', add);
    child.stderr?.on('data', add);
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs);
    child.on('error', (err) => { out += `\n${err.message}`; });
    child.on('close', (code) => {
      clearTimeout(timer);
      track(null);
      resolve({ code, out, ms: Date.now() - started, timedOut });
    });
  });
}

/** Testes do reporter JSON do Playwright do próprio projeto. */
function parsePlaywrightJson(out: string): QaTestResult[] | null {
  const start = out.indexOf('{');
  if (start < 0) return null;
  try {
    const data = JSON.parse(out.slice(start));
    const tests: QaTestResult[] = [];
    const walk = (suite: any, prefix: string) => {
      const title = [prefix, suite.title].filter(Boolean).join(' › ');
      for (const spec of suite.specs || []) {
        const results = (spec.tests || []).flatMap((t: any) => t.results || []);
        const dur = results.reduce((a: number, r: any) => a + (r.duration || 0), 0) / 1000;
        const firstErr = results.map((r: any) => r.error || (r.errors || [])[0]).find(Boolean);
        tests.push({
          name: [title, spec.title].filter(Boolean).join(' › '),
          st: spec.ok ? 'pass' : 'fail',
          dur: Math.round(dur * 10) / 10,
          err: spec.ok ? null : { msg: String(firstErr?.message || 'Teste falhou').split('\n')[0].slice(0, 240), exp: 'Teste E2E do projeto passa', rec: tail(String(firstErr?.message || ''), 20), at: `${spec.file || suite.file || ''}:${spec.line || ''}`, code: String(firstErr?.snippet || '').slice(0, 800) },
        });
      }
      for (const child of suite.suites || []) walk(child, title);
    };
    for (const s of data.suites || []) walk(s, '');
    return tests;
  } catch {
    return null;
  }
}

function serveStatic(dir: string, port: number): http.Server {
  const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };
  const root = path.resolve(dir);
  const srv = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    let file = path.resolve(root, '.' + urlPath);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  srv.listen(port, '127.0.0.1');
  return srv;
}

async function waitHttp(url: string, ms: number, alive: () => boolean): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until && alive()) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get(url, (res) => { res.resume(); resolve((res.statusCode || 500) < 500); });
      req.on('error', () => resolve(false));
      req.setTimeout(4000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function ffmpegPath(): string | null {
  try {
    execFileSync(WIN ? 'where' : 'which', ['ffmpeg'], { stdio: 'pipe', windowsHide: true });
    return 'ffmpeg';
  } catch {
    return null;
  }
}

/** Segundo do vídeo em que aparece o primeiro quadro magenta de calibração. */
export function markInVideo(ffmpeg: string, file: string): number | null {
  const fps = 25;
  try {
    const raw = execFileSync(ffmpeg, ['-v', 'error', '-t', '6', '-i', file, '-vf', `fps=${fps},scale=1:1,format=rgb24`, '-f', 'rawvideo', '-'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    for (let i = 0; i + 2 < raw.length; i += 3) {
      if (raw[i] > 200 && raw[i + 1] < 90 && raw[i + 2] > 200) return i / 3 / fps;
    }
  } catch {}
  return null;
}

function makeGif(ffmpeg: string, video: string, out: string, start: number, dur: number, width: number): boolean {
  try {
    execFileSync(
      ffmpeg,
      ['-y', '-loglevel', 'error', '-ss', start.toFixed(2), '-t', dur.toFixed(2), '-i', video, '-vf', `fps=8,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, out],
      { stdio: 'pipe', windowsHide: true, timeout: 120000 },
    );
    return fs.existsSync(out);
  } catch {
    return false;
  }
}

export function gitHead(workspace: string): string {
  // Sem .git na própria pasta, o git responderia com o commit de um repositório de fora.
  if (!fs.existsSync(path.join(workspace, '.git'))) return 'sem git';
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: workspace, stdio: 'pipe', windowsHide: true, encoding: 'utf8' }).trim();
  } catch {
    return 'sem git';
  }
}

function jornadaScript(): string {
  const local = path.join(__dirname, 'jornada.js');
  return fs.existsSync(local) ? local : path.join(process.cwd(), 'dist', 'main', 'qa', 'jornada.js');
}

export interface StartedTarget {
  up: boolean;
  baseUrl: string;
  label: string;
  server: ChildProcess | null;
  staticSrv: http.Server | null;
  /** Por que não subiu (fim do log do servidor). */
  error: string;
  stop: () => void;
}

/**
 * Sobe o app do projeto como o plano de QA manda (servidor de dev ou estático) numa porta
 * livre em 127.0.0.1 e espera responder. Usado pelo QA e pela varredura gray box.
 */
export async function startTarget(
  workspace: string,
  plan: QaPlan,
  logFile: string,
  track: (c: ChildProcess | null) => void,
  stopped: () => boolean,
): Promise<StartedTarget> {
  const port = await freePort();
  let baseUrl = `http://127.0.0.1:${port}/`;
  let server: ChildProcess | null = null;
  let staticSrv: http.Server | null = null;
  let up = false;
  let label = 'sem alvo web';
  let error = '';
  if (plan.target.kind === 'static') {
    staticSrv = serveStatic(plan.target.dir, port);
    label = `estático · ${path.relative(workspace, plan.target.dir) || '.'}`;
    up = await waitHttp(baseUrl, 10000, () => true);
    if (!up) error = 'Servidor estático não respondeu';
  } else if (plan.target.kind === 'dev') {
    const t = plan.target;
    const args = plan.manager === 'npm' ? [...t.args, '--', '--port', String(port)] : [...t.args, '--port', String(port)];
    label = `${t.framework} · ${plan.manager} run ${t.script}`;
    let serverOut = '';
    const srv = spawnCmd(t.command, args, t.cwd || workspace, qaEnv({ PORT: String(port), HOST: '127.0.0.1' }));
    server = srv;
    track(srv);
    const grab = (b: Buffer) => {
      serverOut += b.toString('utf8');
      const m = serverOut.replace(/\x1b\[[0-9;]*m/g, '').match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)/);
      if (m && m[1] !== String(port)) baseUrl = `http://127.0.0.1:${m[1]}/`;
    };
    srv.stdout?.on('data', grab);
    srv.stderr?.on('data', grab);
    const alive = () => srv.exitCode == null && !stopped();
    up = await waitHttp(baseUrl, 180000, alive);
    if (!up && serverOut) {
      const m = serverOut.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
      if (m) { baseUrl = `http://127.0.0.1:${m[1]}/`; up = await waitHttp(baseUrl, 20000, alive); }
    }
    fs.writeFileSync(logFile, serverOut, 'utf8');
    srv.stdout?.on('data', (b: Buffer) => fs.appendFileSync(logFile, b));
    srv.stderr?.on('data', (b: Buffer) => fs.appendFileSync(logFile, b));
    track(null);
    if (!up) error = tail(serverOut, 30) || 'O servidor de desenvolvimento não respondeu';
  } else {
    error = plan.target.reason;
  }
  return {
    up, baseUrl, label, server, staticSrv, error,
    stop: () => { killTree(server); staticSrv?.close(); },
  };
}

export async function runQa(opts: QaRunOptions): Promise<QaRun> {
  const workspace = path.resolve(opts.workspace);
  const started = new Date();
  const id = stampId(started);
  const dir = path.join(qaRoot(workspace), id);
  for (const d of ['logs', 'gifs']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  excludeFromProjectGit(workspace);
  const say = (line: string) => opts.onProgress?.(line);
  let current: ChildProcess | null = null;
  let stopped = false;
  opts.registerKill?.(() => { stopped = true; killTree(current); });
  const track = (c: ChildProcess | null) => { current = c; };

  const plan: QaPlan = planQa(workspace);
  const notes = plan.notes.slice();
  const suites: QaSuite[] = [];
  say(`Plano de QA · ${plan.stack} · ${plan.checks.length} checagem(ns) · alvo ${plan.target.kind}`);

  const installed = new Set<string>();
  const mgr = plan.manager || 'npm';
  const installCmd = process.platform === 'win32' ? `${mgr}.cmd` : mgr;
  for (const check of plan.checks) {
    if (stopped) break;
    if (!check.blocked || !/node_modules/.test(check.blocked.msg)) continue;
    const cwd = check.cwd || workspace;
    if (!installed.has(cwd)) {
      installed.add(cwd);
      say(`Instalando dependências · ${mgr} install`);
      const res = await runCommand(installCmd, ['install'], cwd, 10 * 60 * 1000, track);
      const logRel = `logs/install-${installed.size}.log`;
      fs.writeFileSync(path.join(dir, logRel), `$ ${installCmd} install\n\n${res.out}\n\n[código de saída ${res.code}${res.timedOut ? ' · tempo esgotado' : ''}]\n`, 'utf8');
      if (res.code === 0 && fs.existsSync(path.join(cwd, 'node_modules'))) say('Dependências instaladas');
      else notes.push(`A instalação em ${path.relative(workspace, cwd) || '.'} não terminou. O log está em qa/evidencias/${id}/${logRel}.`);
    }
    if (fs.existsSync(path.join(cwd, 'node_modules'))) check.blocked = undefined;
  }

  // 1. Checagens do próprio projeto
  const checkTests: QaTestResult[] = [];
  const extraSuites: QaSuite[] = [];
  {
    for (const check of plan.checks) {
      if (stopped) break;
      // Sem ferramenta ou sem dependências: falha com o motivo e o comando que resolve, sem rodar.
      if (check.blocked) {
        checkTests.push({ name: check.name, st: 'fail', dur: 0, err: { msg: check.blocked.msg, exp: 'Ambiente pronto para rodar a checagem', rec: notes.find((n) => n.includes('Dependências não instaladas')) || '', at: check.cwd || workspace, code: check.blocked.code } });
        say(`✗ ${check.name} · ${check.blocked.msg}`);
        continue;
      }
      say(`Rodando ${check.name}`);
      const res = await runCommand(check.command, check.args, check.cwd || workspace, check.timeoutMs, track);
      const logRel = `logs/${check.id}.log`;
      fs.writeFileSync(path.join(dir, logRel), `$ ${check.command} ${check.args.join(' ')}\n\n${res.out}\n\n[código de saída ${res.code}${res.timedOut ? ' · tempo esgotado' : ''} · ${Math.round(res.ms / 1000)} s]\n`, 'utf8');
      if (check.kind === 'playwright') {
        const parsed = parsePlaywrightJson(res.out);
        if (parsed && parsed.length) {
          extraSuites.push({ name: 'E2E do projeto (Playwright)', tests: parsed.map((t) => ({ ...t, log: logRel })) });
          continue;
        }
      }
      const ok = res.code === 0 && !res.timedOut;
      checkTests.push({
        name: check.name,
        st: ok ? 'pass' : 'fail',
        dur: Math.round(res.ms / 100) / 10,
        log: logRel,
        err: ok ? null : { msg: res.timedOut ? `Tempo esgotado (${Math.round(check.timeoutMs / 60000)} min)` : `Saiu com código ${res.code}`, exp: 'Comando termina com código 0', rec: tail(res.out, 30), at: `${check.command} ${check.args.join(' ')}`, code: `${check.command} ${check.args.join(' ')}` },
      });
      say(`${ok ? '✓' : '✗'} ${check.name}`);
    }
  }
  if (checkTests.length) suites.push({ name: 'Checagens do projeto', tests: checkTests });
  suites.push(...extraSuites);

  // 2. Jornada no navegador
  let jornada: JornadaResult | null = null;
  let server: ChildProcess | null = null;
  let staticSrv: http.Server | null = null;
  let targetLbl = 'sem alvo web';
  const serverTests: QaTestResult[] = [];
  const devNoDeps = plan.target.kind === 'dev' && !fs.existsSync(path.join(plan.target.cwd || workspace, 'node_modules'));
  if (devNoDeps) notes.push('O app web não subiu para a jornada: dependências não instaladas.');
  if (!stopped && plan.target.kind !== 'none' && !devNoDeps) {
    const t0 = Date.now();
    if (plan.target.kind === 'dev') say(`Subindo o app (${plan.manager} run ${plan.target.script})`);
    const tg = await startTarget(workspace, plan, path.join(dir, 'logs', 'servidor.log'), track, () => stopped);
    server = tg.server;
    staticSrv = tg.staticSrv;
    targetLbl = tg.label;
    const up = tg.up;
    const baseUrl = tg.baseUrl;
    serverTests.push({
      name: 'App sobe e responde',
      st: up ? 'pass' : 'fail',
      dur: Math.round((Date.now() - t0) / 100) / 10,
      log: plan.target.kind === 'dev' ? 'logs/servidor.log' : undefined,
      err: up ? null : { msg: 'O app não respondeu', exp: `HTTP em ${baseUrl}`, rec: tg.error, at: targetLbl, code: '' },
    });
    if (up && !stopped) {
      say(`App no ar em ${baseUrl} · iniciando a jornada`);
      const cfgFile = path.join(dir, 'jornada-config.json');
      fs.writeFileSync(cfgFile, JSON.stringify({ baseUrl, outDir: dir, maxPages: opts.maxPages || 6, navTimeoutMs: 45000 }), 'utf8');
      const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
      const jr = await new Promise<{ code: number | null; err: string }>((resolve) => {
        const child = spawn(process.execPath, [jornadaScript(), cfgFile], { cwd: process.cwd(), env, windowsHide: true });
        track(child);
        let err = '';
        let buf = '';
        child.stdout.on('data', (b: Buffer) => {
          buf += b.toString('utf8');
          const lines = buf.split(/\r?\n/);
          buf = lines.pop() || '';
          for (const l of lines) if (l.startsWith('@@ ')) say(l.slice(3));
        });
        child.stderr.on('data', (b: Buffer) => { err += b.toString('utf8'); });
        const timer = setTimeout(() => killTree(child), 15 * 60000);
        child.on('close', (code) => { clearTimeout(timer); track(null); resolve({ code, err }); });
      });
      try {
        jornada = JSON.parse(fs.readFileSync(path.join(dir, 'jornada.json'), 'utf8'));
      } catch {
        jornada = { ok: false, error: jr.err || `jornada saiu com código ${jr.code}`, browser: '', pages: [], tests: [], videos: { desktop: null, mobile: null }, traces: [] };
      }
      if (jornada && jornada.error) {
        fs.writeFileSync(path.join(dir, 'logs', 'jornada.log'), jornada.error, 'utf8');
        serverTests.push({ name: 'Jornada no navegador roda', st: 'fail', dur: 0, log: 'logs/jornada.log', err: { msg: 'A jornada quebrou antes de terminar', exp: 'Navegador abre e percorre as páginas', rec: tail(jornada.error, 20), at: 'jornada.js', code: '' } });
      }
    }
  } else if (plan.target.kind === 'none') {
    notes.push(plan.target.reason);
  }
  killTree(server);
  staticSrv?.close();
  if (serverTests.length) suites.push({ name: 'App no ar', tests: serverTests });

  // 3. Suítes da jornada + GIFs
  const ev: Omit<QaEvidence, 'i'>[] = [];
  const ffmpeg = ffmpegPath();
  if (!ffmpeg && jornada?.tests.length) notes.push('GIFs não gerados: ffmpeg não está no PATH.');
  if (jornada && jornada.tests.length) {
    // O relógio do vídeo não bate com o dos testes (começa no primeiro quadro). A jornada pinta um
    // quadro magenta e anota a hora; achar esse quadro no vídeo dá a diferença exata.
    const shift: Record<'desktop' | 'mobile', number> = { desktop: 0, mobile: 0 };
    for (const ctx of ['desktop', 'mobile'] as const) {
      const video = jornada.videos[ctx];
      const markS = jornada.markS?.[ctx];
      const inVideo = video && ffmpeg ? markInVideo(ffmpeg, path.join(dir, video)) : null;
      if (markS != null && inVideo != null) shift[ctx] = markS - inVideo;
    }
    const bySuite = new Map<string, JornadaTest[]>();
    for (const t of jornada.tests) bySuite.set(t.suite, [...(bySuite.get(t.suite) || []), t]);
    for (const [name, tests] of bySuite) {
      const suiteIdx = suites.length;
      const out: QaTestResult[] = [];
      for (const t of tests) {
        const row: QaTestResult = { name: t.name, st: t.st, dur: t.dur, err: t.err || null, shots: t.shots };
        const video = jornada.videos[t.context];
        if (t.st === 'fail' && video && ffmpeg) {
          const gifRel = `gifs/falha-${row.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}.gif`;
          const from = Math.max(0, t.startS - shift[t.context] + 0.15);
          const len = Math.min(12, Math.max(1, t.endS - t.startS + 0.1));
          if (makeGif(ffmpeg, path.join(dir, video), path.join(dir, gifRel), from, len, t.context === 'mobile' ? 360 : 720)) row.gif = gifRel;
        }
        out.push(row);
        for (const shot of t.shots) ev.push({ kind: 'img', name: path.basename(shot), path: shot, file: path.join(dir, shot), suite: suiteIdx, test: t.name, fail: t.st === 'fail', mobile: t.context === 'mobile', size: sizeOf(path.join(dir, shot)), note: t.name });
        if (row.gif) ev.push({ kind: 'gif', name: path.basename(row.gif), path: row.gif, file: path.join(dir, row.gif), suite: suiteIdx, test: t.name, fail: true, mobile: t.context === 'mobile', size: sizeOf(path.join(dir, row.gif)) });
      }
      suites.push({ name, tests: out });
    }
    for (const ctx of ['desktop', 'mobile'] as const) {
      const video = jornada.videos[ctx];
      if (!video) continue;
      const tests = jornada.tests.filter((t) => t.context === ctx);
      const total = tests.length ? Math.max(...tests.map((t) => t.endS)) - shift[ctx] : 0;
      const flowFrom = tests.length ? Math.max(0, tests[0].startS - shift[ctx] + 0.15) : 0;
      const suiteIdx = suites.findIndex((s) => s.name === (ctx === 'mobile' ? 'Responsivo 390 px' : 'Carregamento e navegação'));
      ev.push({ kind: 'video', name: ctx === 'mobile' ? 'jornada-celular.webm' : 'jornada-desktop.webm', path: video, file: path.join(dir, video), suite: suiteIdx >= 0 ? suiteIdx : undefined, fail: tests.some((t) => t.st === 'fail'), mobile: ctx === 'mobile', size: sizeOf(path.join(dir, video)), dur: Math.round(total) });
      if (ffmpeg) {
        const gifRel = `gifs/fluxo-${ctx === 'mobile' ? 'celular' : 'desktop'}.gif`;
        if (makeGif(ffmpeg, path.join(dir, video), path.join(dir, gifRel), flowFrom, Math.min(15, Math.max(3, total - flowFrom)), ctx === 'mobile' ? 300 : 720)) {
          ev.push({ kind: 'gif', name: path.basename(gifRel), path: gifRel, file: path.join(dir, gifRel), fail: false, mobile: ctx === 'mobile', size: sizeOf(path.join(dir, gifRel)), note: 'Fluxo completo acelerado' });
        }
      }
    }
    for (const tr of jornada.traces) ev.push({ kind: 'trace', name: path.basename(tr), path: tr, file: path.join(dir, tr), fail: false, mobile: /celular/.test(tr), size: sizeOf(path.join(dir, tr)), note: 'npx playwright show-trace' });
  }
  for (const f of fs.readdirSync(path.join(dir, 'logs'))) ev.push({ kind: 'log', name: f, path: `logs/${f}`, file: path.join(dir, 'logs', f), fail: false, mobile: false, size: sizeOf(path.join(dir, 'logs', f)) });

  const all = suites.flatMap((s) => s.tests);
  const fail = all.filter((t) => t.st === 'fail').length;
  const empty = all.length === 0;
  if (empty) notes.push('Nenhum teste rodou nesta pasta. O portão de QA reprova até existir pelo menos uma checagem ou um alvo web.');
  if (stopped) notes.push('Execução interrompida pelo Carlos antes do fim.');
  const finished = new Date();
  const run: QaRun = {
    id,
    at: started.toISOString(),
    when: whenOf(started),
    by: 'QA TAVIR · Playwright',
    motor: 'determinístico',
    commit: gitHead(workspace),
    preview: false,
    stack: plan.stack,
    target: targetLbl,
    ok: !empty && fail === 0 && !stopped,
    empty,
    suites,
    total: all.length,
    pass: all.length - fail,
    fail,
    dur: Math.round((finished.getTime() - started.getTime()) / 1000),
    browsers: jornada?.browser ? `${jornada.browser} · 1440 × 900 e 390 × 844` : 'sem navegador nesta execução',
    ev: [],
    notes,
    dir,
    report: path.join(dir, 'index.html'),
    label: opts.label,
  };
  // Regressão: o que passava na execução anterior e quebrou agora.
  const prev = listQaRuns(workspace).filter((r) => r.id !== id).pop();
  if (prev) {
    const passedBefore = new Set(prev.suites.flatMap((su) => su.tests.filter((t) => t.st === 'pass').map((t) => `${su.name} · ${t.name}`)));
    run.prevId = prev.id;
    run.regress = suites.flatMap((su) => su.tests.filter((t) => t.st === 'fail' && passedBefore.has(`${su.name} · ${t.name}`)).map((t) => `${su.name} · ${t.name}`));
  }
  run.ev = [{ kind: 'report' as const, name: 'index.html', path: 'index.html', file: run.report, fail: fail > 0, mobile: false, size: '', note: 'Relatório completo' }, ...ev].map((e, i) => ({ ...e, i }));
  fs.writeFileSync(run.report, renderQaReport(opts.projectName, run), 'utf8');
  run.ev[0].size = sizeOf(run.report);
  fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(run, null, 2), 'utf8');
  fs.appendFileSync(path.join(qaRoot(workspace), 'index.jsonl'), JSON.stringify({ id, at: run.at, ok: run.ok, total: run.total, fail, label: opts.label || '' }) + '\n', 'utf8');
  say(run.ok ? `QA aprovado · ${run.pass}/${run.total}` : empty ? 'QA reprovado · nenhum teste rodou' : `QA reprovado · ${fail} falha(s) de ${run.total}`);
  return run;
}

export function listQaRuns(workspace: string, limit = 30): QaRun[] {
  const root = qaRoot(path.resolve(workspace));
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(root).filter((d) => /^QA-\d{8}-\d{6}$/.test(d)).sort().slice(-limit);
  } catch {
    return [];
  }
  const out: QaRun[] = [];
  for (const id of ids) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(root, id, 'resultado.json'), 'utf8')));
    } catch {}
  }
  return out;
}

/** Resumo curto para nota de etapa e trilho. */
export function qaSummary(run: QaRun): string {
  const regress = run.regress && run.regress.length ? [`Regressões desde ${run.prevId}: ${run.regress.length}`, ...run.regress.slice(0, 5).map((r) => `- ${r}`)] : [];
  const head = run.ok ? `QA aprovado · ${run.pass}/${run.total} testes` : run.empty ? 'QA reprovado · nenhum teste rodou' : `QA reprovado · ${run.fail} de ${run.total} testes falharam`;
  const fails = run.suites
    .flatMap((s) => s.tests.filter((t) => t.st === 'fail').map((t) => `- ${s.name} · ${t.name}: ${t.err?.msg || 'falhou'}`))
    .slice(0, 8);
  return [head, `Relatório: qa/evidencias/${run.id}/index.html`, ...regress, ...fails, ...run.notes.slice(0, 3).map((n) => `Obs.: ${n}`)].join('\n');
}
