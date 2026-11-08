/**
 * O que o QA consegue rodar numa pasta: checagens do próprio projeto (testes, tipos, lint, build)
 * e o alvo web para a jornada no navegador. Só lê arquivos; não instala nada.
 */
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
}

export type QaTarget =
  | { kind: 'dev'; command: string; args: string[]; script: string; framework: string }
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

export function planQa(workspace: string): QaPlan {
  const root = path.resolve(workspace);
  const notes: string[] = [];
  const checks: QaCheck[] = [];
  const pkg = readJson(path.join(root, 'package.json'));
  let target: QaTarget = { kind: 'none', reason: 'Nenhum servidor de desenvolvimento nem index.html encontrado.' };
  let stack = 'desconhecida';
  let manager: QaPlan['manager'] = null;

  if (pkg) {
    manager = managerOf(root);
    const scripts: Record<string, string> = pkg.scripts || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const framework = deps.next ? 'Next.js' : deps.nuxt ? 'Nuxt' : deps.astro ? 'Astro' : deps['@sveltejs/kit'] ? 'SvelteKit' : deps.vite ? 'Vite' : deps['react-scripts'] ? 'Create React App' : 'Node';
    stack = framework;
    const mgr = manager;
    const add = (id: string, name: string, script: string, timeoutMs: number) =>
      checks.push({ id, name, command: bin(mgr), args: runScript(mgr, script), kind: 'script', timeoutMs });

    if (!fs.existsSync(path.join(root, 'node_modules'))) {
      notes.push(`Dependências não instaladas (sem node_modules). Rode ${mgr} install antes; o QA não instala nada sozinho.`);
    }
    const typecheck = ['typecheck', 'type-check', 'check-types', 'tsc'].find((s) => scripts[s]);
    if (typecheck) add('tipos', `Tipos (${mgr} run ${typecheck})`, typecheck, 300000);
    else if (exists(root, 'tsconfig.json') && fs.existsSync(path.join(root, 'node_modules', 'typescript'))) {
      checks.push({ id: 'tipos', name: 'Tipos (tsc --noEmit)', command: bin('npx'), args: ['tsc', '--noEmit'], kind: 'script', timeoutMs: 300000 });
    }
    if (scripts.lint) add('lint', `Lint (${mgr} run lint)`, 'lint', 300000);
    const test = ['test:unit', 'test'].find((s) => scripts[s] && !/no test specified/i.test(scripts[s]) && !/playwright/i.test(scripts[s]));
    if (test) add('testes', `Testes (${mgr} run ${test})`, test, 600000);
    else notes.push('O projeto não tem script de testes unitários.');
    if (scripts.build) add('build', `Build (${mgr} run build)`, 'build', 900000);
    if (exists(root, 'playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs')) {
      checks.push({ id: 'e2e-projeto', name: 'E2E do projeto (playwright test)', command: bin('npx'), args: ['playwright', 'test', '--reporter=json'], kind: 'playwright', timeoutMs: 900000 });
    }
    const dev = ['dev', 'start', 'preview', 'serve'].find((s) => scripts[s]);
    if (dev) target = { kind: 'dev', command: bin(mgr), args: runScript(mgr, dev), script: dev, framework };
  } else if (exists(root, 'pubspec.yaml')) {
    stack = 'Flutter';
    checks.push({ id: 'analise', name: 'Análise (flutter analyze)', command: bin('flutter'), args: ['analyze'], kind: 'script', timeoutMs: 600000 });
    if (exists(root, 'test')) checks.push({ id: 'testes', name: 'Testes (flutter test)', command: bin('flutter'), args: ['test'], kind: 'script', timeoutMs: 900000 });
    else notes.push('O app Flutter não tem pasta test/.');
    notes.push('Jornada no navegador não roda em app Flutter mobile; o QA mobile entra com o emulador.');
  } else if (exists(root, 'pyproject.toml', 'requirements.txt', 'setup.py')) {
    stack = 'Python';
    if (exists(root, 'tests', 'test')) checks.push({ id: 'testes', name: 'Testes (pytest)', command: 'python', args: ['-m', 'pytest', '-q'], kind: 'script', timeoutMs: 900000 });
    else notes.push('O projeto Python não tem pasta tests/.');
  }

  if (target.kind === 'none') {
    const dir = staticDir(root);
    if (dir) {
      target = { kind: 'static', dir };
      if (stack === 'desconhecida') stack = 'Site estático';
    }
  }
  return { workspace: root, stack, manager, checks, target, notes };
}
