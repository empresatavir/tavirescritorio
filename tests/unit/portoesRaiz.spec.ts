// Portões de QA e segurança olhando a pasta certa: projeto dentro de outro repositório e app em subpasta.
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gitScope, runSeg, segSummary } from '../../src/main/seg/segScanner';
import { planQa } from '../../src/main/qa/qaPlan';
import { gitHead } from '../../src/main/qa/qaRunner';
import { needsOwnGit } from '../../src/main/cycleBranch';

const LENTO = 120000;
const dirs: string[] = [];
const fake = (prefix: string, n: number) => prefix + 'Q7v'.repeat(Math.ceil(n / 3)).slice(0, n);
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, stdio: 'pipe', windowsHide: true, encoding: 'utf8' }).trim();

function pasta(files: Record<string, string>, base?: string): string {
  const dir = base || fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-raiz-'));
  if (!base) dirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

/** Repositório "Escritório" com um segredo no histórico e a pasta interno/ ignorada. */
function escritorio(): { outer: string; proj: string } {
  const outer = pasta({ '.gitignore': 'interno/\n', 'tests/runLedger.spec.ts': `const k = "${fake('AKIA', 16)}";\n` });
  git(outer, 'init', '-q');
  git(outer, 'config', 'user.name', 'QA');
  git(outer, 'config', 'user.email', 'qa@tavir.local');
  git(outer, 'add', '-A');
  git(outer, 'commit', '-q', '-m', 'base');
  const proj = pasta({ 'aplicativo/lib/main.dart': `const token = "${fake('ghp_', 36)}";\n`, 'aplicativo/pubspec.yaml': 'name: app\n' }, path.join(outer, 'interno', 'novo-app'));
  return { outer, proj };
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('git do próprio projeto', () => {
  it('distingue repositório próprio, de fora e nenhum', () => {
    const { outer, proj } = escritorio();
    expect(gitScope(outer).kind).toBe('own');
    expect(gitScope(proj).kind).toBe('outer');
    expect(gitScope(pasta({ 'a.txt': 'x' })).kind === 'none' || gitScope(os.tmpdir()).kind !== 'own').toBe(true);
    // commit do repositório de fora não vira o commit do projeto
    expect(gitHead(proj)).toBe('sem git');
    expect(gitHead(outer)).not.toBe('sem git');
  }, LENTO);

  it('absorção ganha git quando a pasta está ignorada pelo repositório de fora', () => {
    const { outer, proj } = escritorio();
    expect(needsOwnGit(proj)).toBe(true);
    expect(needsOwnGit(outer)).toBe(false);
    // subpasta versionada por um monorepo continua do monorepo
    const sub = pasta({ 'pacote/index.js': 'x' }, outer);
    git(outer, 'add', '-A');
    git(outer, 'commit', '-q', '-m', 'pacote');
    expect(needsOwnGit(path.join(sub, 'pacote'))).toBe(false);
  }, LENTO);

  it('segurança lê os arquivos do projeto e não o histórico do repositório de fora', async () => {
    const { proj } = escritorio();
    const run = await runSeg({ workspace: proj, projectName: 'Novo app' });
    expect(run.files).toBeGreaterThan(0);
    expect(run.evaluated).toBe(true);
    expect(run.commit).toBe('sem git');
    expect(run.notes.join(' ')).toMatch(/não tem Git próprio/);
    const where = run.findings.map((f) => f.where).join(' | ');
    expect(where).toMatch(/aplicativo\/lib\/main\.dart/);
    expect(where).not.toMatch(/runLedger/);
  }, LENTO);

  it('pasta sem nenhum arquivo legível: não avaliado em vez de nota', async () => {
    const proj = pasta({ 'imagem.png': 'x' });
    const run = await runSeg({ workspace: proj, projectName: 'Vazio' });
    expect(run.evaluated).toBe(false);
    expect(run.ok).toBe(false);
    expect(segSummary(run).split('\n')[0]).toBe('Segurança não avaliada · nenhum arquivo do projeto foi lido');
  }, LENTO);
});

describe('QA com app em subpasta', () => {
  it('junta Flutter de aplicativo/ e pytest de backend/, cada um na sua pasta', () => {
    const dir = pasta({
      'aplicativo/pubspec.yaml': 'name: app\n',
      'aplicativo/test/a_test.dart': '',
      'backend/requirements.txt': 'fastapi\n',
      'backend/tests/test_a.py': '',
      'docs/leia.md': '# docs',
      'qa/x.txt': '',
    });
    const plan = planQa(dir);
    expect(plan.stack).toBe('Flutter · aplicativo/ + Python · backend/');
    expect(plan.checks.map((c) => c.id)).toEqual(['aplicativo-analise', 'aplicativo-testes', 'backend-testes']);
    expect(plan.checks[0].cwd).toBe(path.join(dir, 'aplicativo'));
    expect(plan.checks[2].cwd).toBe(path.join(dir, 'backend'));
    expect(plan.checks[0].name).toMatch(/· aplicativo\/$/);
    expect(plan.target.kind).toBe('none');
    // no Windows o Flutter é .bat: nunca "flutter.cmd"
    expect(plan.checks[0].command).not.toMatch(/flutter\.cmd$/i);
    // dica de estilo (info) não reprova; erro e aviso sim
    expect(plan.checks[0].args).toEqual(['analyze', '--no-fatal-infos']);
  });

  it('frontend sem node_modules bloqueia só as checagens dele, com o comando que resolve', () => {
    const dir = pasta({
      'frontend/package.json': JSON.stringify({ scripts: { test: 'vitest run', dev: 'vite' }, devDependencies: { vite: '1' } }),
      'backend/pyproject.toml': '',
      'backend/tests/test_a.py': '',
    });
    const plan = planQa(dir);
    const front = plan.checks.find((c) => c.id === 'frontend-testes')!;
    expect(front.blocked?.code).toBe('cd frontend && npm install');
    expect(plan.checks.find((c) => c.id === 'backend-testes')!.blocked?.msg ?? '').not.toMatch(/node_modules/);
    expect(plan.target).toMatchObject({ kind: 'dev', cwd: path.join(dir, 'frontend') });
  });

  it('index.html solto em docs/ não esconde o app da subpasta', () => {
    const dir = pasta({ 'docs/index.html': '<html></html>', 'aplicativo/pubspec.yaml': 'name: app\n' });
    expect(planQa(dir).stack).toBe('Flutter · aplicativo/');
  });

  it('com o app na raiz, o plano continua o mesmo de antes', () => {
    const dir = pasta({ 'pubspec.yaml': 'name: app\n', 'test/a_test.dart': '', 'backend/requirements.txt': '' });
    const plan = planQa(dir);
    expect(plan.stack).toBe('Flutter');
    expect(plan.checks.every((c) => !c.cwd)).toBe(true);
  });
});
