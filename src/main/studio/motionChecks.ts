import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MOTION_TOKEN_PADRAO, type MotionPreset } from '../../shared/studio';

export interface MotionCheckItem {
  id: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9';
  ok: boolean;
  detalhe: string;
}

export interface MotionCheckDeps {
  typecheck?: (workspace: string) => Promise<{ ok: boolean; detalhe: string }>;
  selectComposition?: (workspace: string, id: string) => Promise<boolean>;
  renderStill?: (workspace: string, id: string, frame: number, output: string) => Promise<void>;
  renderMedia?: (workspace: string, id: string, output: string) => Promise<void>;
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/Math\.random/, 'Math.random'],
  [/Date\.now/, 'Date.now'],
  [/setTimeout/, 'setTimeout'],
  [/setInterval/, 'setInterval'],
  [/requestAnimationFrame/, 'requestAnimationFrame'],
  [/@keyframes/, '@keyframes'],
  [/transition\s*:/, 'transition:'],
  [/https?:\/\//, 'URL remota'],
];

const SKIP = new Set(['node_modules', '.git', '.tavir']);

export function componentName(preset: string): string {
  return preset.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

export function kitDir(kitId: string): string {
  return `src/kits/${kitId}`;
}

function relPosix(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

export function snapshotTree(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) out.set(relPosix(root, full), createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
    }
  };
  walk(root);
  return out;
}

export function checkAllowedDiff(before: Map<string, string>, after: Map<string, string>, kitId: string): MotionCheckItem {
  const allowed = `${kitDir(kitId)}/`;
  const bad: string[] = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const key of keys) {
    if (key.startsWith(allowed) || CHECK_OUTPUT_KEYS.has(key)) continue;
    if (before.get(key) !== after.get(key)) bad.push(key);
  }
  return { id: 'C1', ok: bad.length === 0, detalhe: bad.length ? bad.slice(0, 8).join(', ') : 'só o kit mudou' };
}

const CHECK_OUTPUTS = ['frame-0.png', 'frame-mid.png', 'frame-mid-b.png', 'frame-last.png', 'frame-enter.png', 'proxy.mp4'];
const CHECK_OUTPUT_KEYS = new Set(CHECK_OUTPUTS.map((name) => `out/${name}`));

/** Os renders da própria checagem não contam como edição do motor na tentativa seguinte. */
export function rememberCheckOutputs(before: Map<string, string>, workspace: string): void {
  for (const name of CHECK_OUTPUTS) {
    const file = path.join(workspace, 'out', name);
    if (!fs.existsSync(file)) continue;
    before.set(`out/${name}`, createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  }
}

export function readKitSource(workspace: string, kitId: string): string {
  const dir = path.join(workspace, 'src', 'kits', kitId);
  if (!fs.existsSync(dir)) return '';
  const parts: string[] = [];
  const walk = (current: string) => {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx|ts|jsx|js|css)$/.test(name)) parts.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(dir);
  return parts.join('\n');
}

export function checkContract(source: string): MotionCheckItem {
  const hits = FORBIDDEN.filter(([re]) => re.test(source)).map(([, label]) => label);
  return { id: 'C3', ok: hits.length === 0, detalhe: hits.length ? hits.join(', ') : 'sem proibidos' };
}

export async function checkRegistration(source: string, preset: string, select?: () => Promise<boolean>): Promise<MotionCheckItem> {
  const hasSchema = /z\.object\(/.test(source) || /from ['"]zod['"]/.test(source) && /schema/.test(source);
  const hasDefaults = /defaultProps/.test(source);
  let found = false;
  if (select) {
    try {
      found = await select();
    } catch (err) {
      return { id: 'C4', ok: false, detalhe: err instanceof Error ? err.message : String(err) };
    }
  } else {
    found = source.includes(`id="${preset}"`) || source.includes(`export const ${componentName(preset)}`);
  }
  const ok = hasSchema && hasDefaults && found;
  return { id: 'C4', ok, detalhe: ok ? preset : 'falta schema, defaultProps ou a composição' };
}

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export async function checkDeterminism(source: string, renderTwice?: () => Promise<[string, string]>): Promise<MotionCheckItem> {
  if (/Math\.random|Date\.now/.test(source)) return { id: 'C9', ok: false, detalhe: 'fonte não determinística' };
  if (!renderTwice) return { id: 'C9', ok: false, detalhe: 'render do frame do meio indisponível' };
  try {
    const [a, b] = await renderTwice();
    const same = sha(a) === sha(b);
    return { id: 'C9', ok: same, detalhe: same ? 'hash igual' : 'hash diferente' };
  } catch (err) {
    return { id: 'C9', ok: false, detalhe: err instanceof Error ? err.message : String(err) };
  }
}

function run(command: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: process.platform === 'win32' && (command === 'npm' || command === 'npx'),
    });
    let output = '';
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      resolve({ code, output });
    };
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('error', (err) => {
      output += err.message;
      finish(1);
    });
    child.on('close', (code) => finish(code ?? 1));
  });
}

async function defaultTypecheck(workspace: string): Promise<{ ok: boolean; detalhe: string }> {
  const result = await run('npx', ['--yes', 'tsc', '--noEmit'], workspace);
  return { ok: result.code === 0, detalhe: result.code === 0 ? 'tsc ok' : result.output.slice(-400) || 'tsc falhou' };
}

function remotionScript(body: string): string {
  return `import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const serveUrl = await bundle({ entryPoint: 'src/index.ts', webpackOverride: (config) => config });
const composition = await selectComposition({ serveUrl, id: job.id, inputProps: job.props || {} });
if (job.op === 'select') process.exit(0);
if (job.op === 'still') {
  await renderStill({ composition, serveUrl, output: job.output, frame: job.frame, inputProps: job.props || {} });
} else {
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: job.output, inputProps: job.props || {}, crf: 28 });
}
`;
}

async function remotionOp(workspace: string, job: Record<string, unknown>): Promise<void> {
  const dir = path.join(workspace, '.tavir');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `motion-check-${process.pid}.mjs`);
  const spec = `${file}.json`;
  fs.writeFileSync(file, remotionScript(''));
  fs.writeFileSync(spec, JSON.stringify(job));
  try {
    const result = await run(process.execPath, [file, spec], workspace);
    if (result.code !== 0) {
      const text = result.output.trim();
      throw new Error(text.length <= 500 ? text : `${text.slice(0, 220)}\n…\n${text.slice(-220)}` || 'remotion falhou');
    }
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmSync(spec, { force: true });
  }
}

function probe(file: string): { width: number; height: number; fps: number; duration: number } | null {
  try {
    const raw = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,duration', '-of', 'json', file], {
      encoding: 'utf8', windowsHide: true, timeout: 20000,
    });
    const stream = JSON.parse(raw).streams?.[0];
    if (!stream) return null;
    const [num, den] = String(stream.avg_frame_rate || '0/1').split('/').map(Number);
    return { width: Number(stream.width), height: Number(stream.height), fps: den ? num / den : 0, duration: Number(stream.duration ?? 0) };
  } catch {
    return null;
  }
}

function rawFrame(file: string): Buffer | null {
  try {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
      windowsHide: true, timeout: 20000, maxBuffer: 32 * 1024 * 1024,
    });
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  } catch {
    return null;
  }
}

function meanDiff(a: Buffer, b: Buffer): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += 48) {
    sum += Math.abs(a[i] - b[i]);
    count += 1;
  }
  return count ? sum / count : 0;
}

function stdev(bytes: Buffer): number {
  if (bytes.length < 3) return 0;
  let count = 0;
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < bytes.length; i += 48) {
    const value = bytes[i];
    sum += value;
    sum2 += value * value;
    count += 1;
  }
  const mean = sum / count;
  return Math.sqrt(Math.max(0, sum2 / count - mean * mean));
}

export interface MotionCheckRequest {
  workspace: string;
  kitId: string;
  preset: MotionPreset | string;
  before: Map<string, string>;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
  deps?: MotionCheckDeps;
}

/** Roda C1–C9. Nenhuma checagem marca o kit como aprovado. */
export async function runMotionChecks(req: MotionCheckRequest): Promise<MotionCheckItem[]> {
  const source = readKitSource(req.workspace, req.kitId);
  const after = snapshotTree(req.workspace);
  const c1 = checkAllowedDiff(req.before, after, req.kitId);
  const deps = req.deps || {};
  const typecheck = deps.typecheck || defaultTypecheck;
  let c2: MotionCheckItem;
  try {
    const typed = await typecheck(req.workspace);
    c2 = { id: 'C2', ok: typed.ok, detalhe: typed.detalhe };
  } catch (err) {
    c2 = { id: 'C2', ok: false, detalhe: err instanceof Error ? err.message : String(err) };
  }
  const c3 = checkContract(source);
  const select = deps.selectComposition
    ? () => deps.selectComposition!(req.workspace, req.preset)
    : async () => {
      if (!fs.existsSync(path.join(req.workspace, 'node_modules', 'remotion'))) return false;
      await remotionOp(req.workspace, { op: 'select', id: req.preset, props: {} });
      return true;
    };
  const c4 = await checkRegistration(source, req.preset, select);
  const frames = req.durationInFrames ?? 90;
  const mid = Math.floor(frames / 2);
  const enter = MOTION_TOKEN_PADRAO.enterFrames;
  const outDir = path.join(req.workspace, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const frame0 = path.join(outDir, 'frame-0.png');
  const frameMid = path.join(outDir, 'frame-mid.png');
  const frameMidB = path.join(outDir, 'frame-mid-b.png');
  const frameLast = path.join(outDir, 'frame-last.png');
  const frameEnter = path.join(outDir, 'frame-enter.png');
  const proxy = path.join(outDir, 'proxy.mp4');
  const renderStill = deps.renderStill || (async (workspace: string, id: string, frame: number, output: string) => {
    await remotionOp(workspace, { op: 'still', id, frame, output, props: {} });
  });
  const renderMedia = deps.renderMedia || (async (workspace: string, id: string, output: string) => {
    await remotionOp(workspace, { op: 'proxy', id, output, props: {} });
  });
  let c5: MotionCheckItem;
  try {
    await renderStill(req.workspace, req.preset, 0, frame0);
    await renderStill(req.workspace, req.preset, mid, frameMid);
    await renderStill(req.workspace, req.preset, Math.max(0, frames - 1), frameLast);
    await renderStill(req.workspace, req.preset, enter, frameEnter);
    await renderMedia(req.workspace, req.preset, proxy);
    c5 = { id: 'C5', ok: true, detalhe: proxy };
  } catch (err) {
    c5 = { id: 'C5', ok: false, detalhe: err instanceof Error ? err.message : String(err) };
  }
  const info = c5.ok ? probe(proxy) : null;
  const width = req.width ?? 540;
  const height = req.height ?? 960;
  const fps = req.fps ?? 30;
  const c6: MotionCheckItem = {
    id: 'C6',
    ok: !!info && info.width === width && info.height === height && Math.abs(info.fps - fps) < 0.05 && Math.abs(info.duration - frames / fps) <= 1 / fps + 0.05,
    detalhe: info ? `${info.width}×${info.height} ${info.fps} fps ${info.duration.toFixed(2)} s` : 'ffprobe não leu o proxy',
  };
  const a = c5.ok ? rawFrame(frame0) : null;
  const b = c5.ok ? rawFrame(frameEnter) : null;
  const moved = a && b ? meanDiff(a, b) : 0;
  const c7: MotionCheckItem = { id: 'C7', ok: moved > 0.25, detalhe: `diferença ${moved.toFixed(2)}` };
  const midBytes = c5.ok ? rawFrame(frameMid) : null;
  const spread = midBytes ? stdev(midBytes) : 0;
  const c8: MotionCheckItem = { id: 'C8', ok: spread > 2, detalhe: `desvio ${spread.toFixed(2)}` };
  const c9 = await checkDeterminism(source, async () => {
    await renderStill(req.workspace, req.preset, mid, frameMid);
    await renderStill(req.workspace, req.preset, mid, frameMidB);
    return [frameMid, frameMidB];
  });
  return [c1, c2, c3, c4, c5, c6, c7, c8, c9];
}
