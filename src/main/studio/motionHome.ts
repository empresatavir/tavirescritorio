import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureStudioTree } from './paths';

const SKIP = new Set(['node_modules', 'out', '.git']);

export function repoMotionDir(): string {
  return path.resolve(__dirname, '../../..', 'studio-motion');
}

export function motionDir(home?: string): string {
  return ensureStudioTree(home).motion;
}

function copyTree(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (SKIP.has(name)) continue;
    const src = path.join(from, name);
    const dest = path.join(to, name);
    if (fs.statSync(src).isDirectory()) copyTree(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function run(command: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: process.platform === 'win32' && command === 'npm',
    });
    let output = '';
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

async function initialCommit(dir: string): Promise<string> {
  const git = async (args: string[]) => run('git', ['-c', 'user.name=TAVIR Studio', '-c', 'user.email=studio@tavir.local', ...args], dir);
  await run('git', ['init'], dir);
  await git(['add', '-A']);
  const commit = await git(['commit', '-m', 'base de motion']);
  return commit.output;
}

/** Copia o projeto para a pasta de dados e instala com npm ci. Não baixa o Chrome. */
export async function ensureMotionHome(home?: string): Promise<{ ok: boolean; dir: string; error?: string; log: string }> {
  const source = repoMotionDir();
  const dir = motionDir(home);
  if (!fs.existsSync(path.join(source, 'package.json'))) {
    return { ok: false, dir, error: 'studio-motion não encontrado no repositório', log: '' };
  }
  const installed = fs.existsSync(path.join(dir, 'node_modules', 'remotion'));
  if (!installed) copyTree(source, dir);
  if (!fs.existsSync(path.join(dir, 'package-lock.json'))) {
    return { ok: false, dir, error: 'package-lock.json ausente em studio-motion', log: '' };
  }
  if (installed) return { ok: true, dir, log: 'já instalado' };
  const npm = await run('npm', ['ci', '--no-audit', '--no-fund'], dir);
  const logPath = path.join(dir, 'npm-ci.log');
  fs.writeFileSync(logPath, npm.output);
  if (npm.code !== 0) return { ok: false, dir, error: 'npm ci falhou', log: npm.output };
  const gitLog = await initialCommit(dir);
  return { ok: true, dir, log: `${npm.output}\n${gitLog}` };
}

/** Baixa o Chrome Headless do Remotion só depois da confirmação explícita. */
export async function downloadRemotionBrowser(confirm: boolean, home?: string): Promise<{ ok: boolean; error?: string; log: string }> {
  if (confirm !== true) {
    return { ok: false, error: 'O download do Chrome Headless do Remotion precisa da sua confirmação.', log: '' };
  }
  const ready = await ensureMotionHome(home);
  if (!ready.ok) return { ok: false, error: ready.error, log: ready.log };
  const result = await run(process.execPath, ['--input-type=module', '-e', "import { ensureBrowser } from '@remotion/renderer'; await ensureBrowser();"], ready.dir);
  return { ok: result.code === 0, error: result.code === 0 ? undefined : result.output.slice(-800), log: result.output };
}

/** Atualiza só a base e os scripts. Não mexe em kits nem em node_modules. */
export async function updateMotionBase(home?: string): Promise<{ ok: boolean; error?: string }> {
  const source = repoMotionDir();
  const dir = motionDir(home);
  if (!fs.existsSync(dir)) {
    const created = await ensureMotionHome(home);
    return { ok: created.ok, error: created.error };
  }
  copyTree(path.join(source, 'src', 'base'), path.join(dir, 'src', 'base'));
  copyTree(path.join(source, 'scripts'), path.join(dir, 'scripts'));
  return { ok: true };
}
