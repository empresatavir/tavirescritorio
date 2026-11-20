/**
 * O que o QA consegue rodar numa pasta: checagens do próprio projeto (testes, tipos, lint, build)
 * e o alvo web para a jornada no navegador. Só lê arquivos; não instala nada.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface QaCheck {
  id: string;
  /** Nome mostrado no relatório. */
  name: string;
  command: string;
  args: string[];
  /** Testes do próprio projeto com Playwright: o resultado vem do reporter JSON. */
  kind: 'script' | 'playwright';
  timeoutMs: number;
  /** Pasta onde o comando roda (projeto com app em subpasta). Sem ela, a raiz do projeto. */
  cwd?: string;
  /** Não dá para rodar (ferramenta fora do PATH, dependências não instaladas): vira falha com o motivo. */
  blocked?: { msg: string; code: string };
}

export type QaTarget =
  | { kind: 'dev'; command: string; args: string[]; script: string; framework: string; cwd?: string }
  | { kind: 'static'; dir: string }
  | { kind: 'none'; reason: string };

export interface QaPlan {
  workspace: string;
  stack: string;
  manager: 'npm' | 'pnpm' | 'yarn' | null;
  checks: QaCheck[];
  target: QaTarget;
  /** Por que alguma coisa ficou de fora (vai para o relatório). */
  notes: string[];
}

const WIN = process.platform === 'win32';
const bin = (name: string) => (WIN ? `${name}.cmd` : name);

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function exists(root: string, ...names: string[]): string | null {
  for (const n of names) if (fs.existsSync(path.join(root, n))) return n;
  return null;
}

function managerOf(root: string): 'npm' | 'pnpm' | 'yarn' {
  if (exists(root, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(root, 'yarn.lock')) return 'yarn';
  return 'npm';
}

const runScript = (mgr: 'npm' | 'pnpm' | 'yarn', script: string, extra: string[] = []) =>
  mgr === 'npm' ? ['run', script, ...(extra.length ? ['--', ...extra] : [])] : ['run', script, ...extra];

/** Pasta com index.html servível sem build (LP estática ou build já gerado). */
function staticDir(root: string): string | null {
  for (const d of ['', 'public', 'dist', 'build', 'out', 'site', 'docs']) {
    const dir = path.join(root, d);
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

/**
 * Caminho do executável no PATH. No Windows, o Flutter e o Python vêm como .bat/.exe, não .cmd:
 * chamar "flutter.cmd" falharia mesmo com o Flutter instalado.
 */
export function resolveTool(name: string): string | null {
  try {
    const out = execFileSync(WIN ? 'where' : 'which', [name], { stdio: 'pipe', windowsHide: true, encoding: 'utf8' });
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return (WIN ? lines.find((l) => /\.(exe|cmd|bat)$/i.test(l)) : lines[0]) || null;
  } catch {
    return null;
  }
}

interface DirPlan {
  stack: string | null;
  manager: QaPlan['manager'];
  checks: QaCheck[];
  target: QaTarget;
  notes: string[];
}

const NO_TARGET: QaTarget = { kind: 'none', reason: 'Nenhum servidor de desenvolvimento nem index.html encontrado.' };

/** Plano de uma pasta só (a raiz do projeto ou uma subpasta como aplicativo/ ou backend/). */
function planDir(dir: string, rel: string): DirPlan {
  const at = rel ? `${rel}/: ` : '';
  const notes: string[] = [];
  const checks: QaCheck[] = [];
  const pkg = readJson(path.join(dir, 'package.json'));
  let target: QaTarget = NO_TARGET;
  let stack: string | null = null;
  let manager: QaPlan['manager'] = null;
  const cwd = rel ? dir : undefined;

  if (pkg) {
    manager = managerOf(dir);
    const scripts: Record<string, string> = pkg.scripts || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const framework = deps.next ? 'Next.js' : deps.nuxt ? 'Nuxt' : deps.astro ? 'Astro' : deps['@sveltejs/kit'] ? 'SvelteKit' : deps.vite ? 'Vite' : deps['react-scripts'] ? 'Create React App' : 'Node';
    stack = framework;
    const mgr = manager;
    const noDeps = !fs.existsSync(path.join(dir, 'node_modules'));
    const blocked = noDeps ? { msg: 'Pasta sem node_modules', code: `${rel ? `cd ${rel} && ` : ''}${mgr} install` } : undefined;
    const add = (id: string, name: string, script: string, timeoutMs: number) =>
      checks.push({ id, name, command: bin(mgr), args: runScript(mgr, script), kind: 'script', timeoutMs, cwd, blocked });

    if (noDeps) notes.push(`${at}Dependências não instaladas (sem node_modules). Rode ${mgr} install antes; o QA não instala nada sozinho.`);
    const typecheck = ['typecheck', 'type-check', 'check-types', 'tsc'].find((s) => scripts[s]);
    if (typecheck) add('tipos', `Tipos (${mgr} run ${typecheck})`, typecheck, 300000);
    else if (exists(dir, 'tsconfig.json') && fs.existsSync(path.join(dir, 'node_modules', 'typescript'))) {
      checks.push({ id: 'tipos', name: 'Tipos (tsc --noEmit)', command: bin('npx'), args: ['tsc', '--noEmit'], kind: 'script', timeoutMs: 300000, cwd });
    }
    if (scripts.lint) add('lint', `Lint (${mgr} run lint)`, 'lint', 300000);
    const test = ['test:unit', 'test'].find((s) => scripts[s] && !/no test specified/i.test(scripts[s]) && !/playwright/i.test(scripts[s]));
    if (test) add('testes', `Testes (${mgr} run ${test})`, test, 600000);
    else notes.push(`${at}O projeto não tem script de testes unitários.`);
    if (scripts.build) add('build', `Build (${mgr} run build)`, 'build', 900000);
    if (exists(dir, 'playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs')) {
      checks.push({ id: 'e2e-projeto', name: 'E2E do projeto (playwright test)', command: bin('npx'), args: ['playwright', 'test', '--reporter=json'], kind: 'playwright', timeoutMs: 900000, cwd, blocked });
    }
    const dev = ['dev', 'start', 'preview', 'serve'].find((s) => scripts[s]);
    // Sem node_modules o alvo continua no plano; o runner não sobe o servidor e diz por quê.
    if (dev) target = { kind: 'dev', command: bin(mgr), args: runScript(mgr, dev), script: dev, framework, cwd };
  } else if (exists(dir, 'pubspec.yaml')) {
    stack = 'Flutter';
    const flutter = resolveTool('flutter');
    const blocked = flutter ? undefined : { msg: 'Flutter não está no PATH', code: 'Instale o Flutter SDK e coloque a pasta flutter/bin no PATH' };
    const command = flutter || 'flutter';
    checks.push({ id: 'analise', name: 'Análise (flutter analyze)', command, args: ['analyze', '--no-fatal-infos'], kind: 'script', timeoutMs: 600000, cwd, blocked });
    if (exists(dir, 'test')) checks.push({ id: 'testes', name: 'Testes (flutter test)', command, args: ['test'], kind: 'script', timeoutMs: 900000, cwd, blocked });
    else notes.push(`${at}O app Flutter não tem pasta test/.`);
    notes.push(`${at}Jornada no navegador não roda em app Flutter mobile; o QA mobile entra com o emulador.`);
  } else if (exists(dir, 'pyproject.toml', 'requirements.txt', 'setup.py')) {
    stack = 'Python';
    if (exists(dir, 'tests', 'test')) {
      const py = resolveTool('python');
      checks.push({ id: 'testes', name: 'Testes (pytest)', command: py || 'python', args: ['-m', 'pytest', '-q'], kind: 'script', timeoutMs: 900000, cwd, blocked: py ? undefined : { msg: 'Python não está no PATH', code: 'Instale o Python e coloque no PATH' } });
    } else notes.push(`${at}O projeto Python não tem pasta tests/.`);
  }

  if (target.kind === 'none' && stack !== 'Flutter') {
    const sdir = staticDir(dir);
    if (sdir) {
      target = { kind: 'static', dir: sdir };
      if (!stack) stack = 'Site estático';
    }
  }
  return { stack, manager, checks, target, notes };
}

/** Pastas que nunca são o app: registros da Fábrica, documentação e saída de build. */
const NOT_APP = /^(?:\.|_)|^(?:node_modules|qa|docs|doc|dist|build|out|coverage|vendor|venv|memory|context|specs|issues|handoff|artifacts|relatorios|trilho)$/i;

export function planQa(workspace: string): QaPlan {
  const root = path.resolve(workspace);
  const top = planDir(root, '');
  const asTop = (): QaPlan => ({ workspace: root, stack: top.stack || 'desconhecida', manager: top.manager, checks: top.checks, target: top.target, notes: top.notes });
  // Stack na raiz manda. Só um index.html solto (ex.: docs/) não impede de procurar o app nas subpastas.
  if (top.stack && top.stack !== 'Site estático') return asTop();

  // Raiz sem stack: o app costuma estar numa subpasta (aplicativo/, backend/, frontend/…). Junta todas.
  let subs: string[] = [];
  try {
    subs = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && !NOT_APP.test(e.name)).map((e) => e.name).sort();
  } catch {}
  const parts = subs.map((name) => ({ name, p: planDir(path.join(root, name), name) })).filter((x) => x.p.stack);
  if (!parts.length) return asTop();

  const checks = parts.flatMap(({ name, p }) => p.checks.map((c) => ({ ...c, id: `${name}-${c.id}`, name: `${c.name} · ${name}/` })));
  const withTarget = parts.find((x) => x.p.target.kind === 'dev') || parts.find((x) => x.p.target.kind === 'static');
  const target = withTarget ? withTarget.p.target : top.target;
  const manager = withTarget?.p.manager || parts.find((x) => x.p.manager)?.p.manager || null;
  const notes = [`App em subpasta: ${parts.map((x) => `${x.name}/ (${x.p.stack})`).join(', ')}.`, ...parts.flatMap((x) => x.p.notes)];
  return { workspace: root, stack: parts.map((x) => `${x.p.stack} · ${x.name}/`).join(' + '), manager, checks, target, notes };
}
