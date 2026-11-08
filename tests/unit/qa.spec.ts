import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { planQa } from '../../src/main/qa/qaPlan';
import { markInVideo, qaSummary, type QaRun } from '../../src/main/qa/qaRunner';
import { renderQaReport } from '../../src/main/qa/qaReport';

function pasta(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-qaplan-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

function execucao(over: Partial<QaRun> = {}): QaRun {
  return {
    id: 'QA-20261108-120000', at: '2026-11-08T12:00:00.000Z', when: '08/11 12:00', by: 'QA TAVIR', motor: 'Playwright', commit: 'abc1234',
    preview: false, stack: 'Site estático', target: 'estático', ok: false, empty: false,
    suites: [{ name: 'Jornada · desktop', tests: [
      { name: 'Abre /', st: 'pass', dur: 300 },
      { name: 'Abre /promo.html', st: 'fail', dur: 200, err: { msg: 'HTTP 404', exp: 'HTTP 2xx', rec: 'HTTP 404', at: '/promo.html', code: '' } },
    ] }],
    total: 2, pass: 1, fail: 1, dur: 3, browsers: 'Chromium', ev: [], notes: ['Sem script de testes.'], dir: '', report: '', ...over,
  };
}

describe('plano de QA', () => {
  it('LP estática: alvo estático e nenhuma checagem de script', () => {
    const dir = pasta({ 'index.html': '<!doctype html><title>x</title>' });
    const plan = planQa(dir);
    expect(plan.stack).toBe('Site estático');
    expect(plan.target).toEqual({ kind: 'static', dir });
    expect(plan.checks).toHaveLength(0);
  });

  it('acha o index.html dentro de public/', () => {
    const dir = pasta({ 'public/index.html': '<!doctype html>' });
    expect(planQa(dir).target).toEqual({ kind: 'static', dir: path.join(dir, 'public') });
  });

  it('projeto Node: tipos, lint, testes e build, servidor de dev e aviso de node_modules', () => {
    const dir = pasta({
      'package.json': JSON.stringify({
        scripts: { typecheck: 'tsc --noEmit', lint: 'eslint .', test: 'vitest run', build: 'vite build', dev: 'vite' },
        devDependencies: { vite: '^6.0.0' },
      }),
    });
    const plan = planQa(dir);
    expect(plan.stack).toBe('Vite');
    expect(plan.manager).toBe('npm');
    expect(plan.checks.map((c) => c.id)).toEqual(['tipos', 'lint', 'testes', 'build']);
    expect(plan.checks[2].args).toEqual(['run', 'test']);
    expect(plan.target).toMatchObject({ kind: 'dev', script: 'dev', framework: 'Vite' });
    expect(plan.notes.some((n) => /node_modules/.test(n))).toBe(true);
  });

  it('ignora o test padrão do npm e o test que só chama playwright', () => {
    const vazio = pasta({ 'package.json': JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }) });
    expect(planQa(vazio).checks.some((c) => c.id === 'testes')).toBe(false);
    const e2e = pasta({ 'package.json': JSON.stringify({ scripts: { test: 'playwright test' } }), 'playwright.config.ts': 'export default {}' });
    const plan = planQa(e2e);
    expect(plan.checks.some((c) => c.id === 'testes')).toBe(false);
    expect(plan.checks.find((c) => c.id === 'e2e-projeto')?.kind).toBe('playwright');
  });

  it('pnpm passa argumentos sem o separador --', () => {
    const dir = pasta({ 'package.json': JSON.stringify({ scripts: { lint: 'eslint .' } }), 'pnpm-lock.yaml': '' });
    const plan = planQa(dir);
    expect(plan.manager).toBe('pnpm');
    expect(plan.checks[0].args).toEqual(['run', 'lint']);
  });

  it('pasta vazia: sem alvo e com o motivo', () => {
    const plan = planQa(pasta({}));
    expect(plan.target.kind).toBe('none');
    expect(plan.checks).toHaveLength(0);
  });
});

describe('resumo e relatório', () => {
  it('o resumo do portão lista as falhas e aponta o relatório', () => {
    const txt = qaSummary(execucao());
    expect(txt.split('\n')[0]).toBe('QA reprovado · 1 de 2 testes falharam');
    expect(txt).toContain('Relatório: qa/evidencias/QA-20261108-120000/index.html');
    expect(txt).toContain('- Jornada · desktop · Abre /promo.html: HTTP 404');
    expect(txt).toContain('Obs.: Sem script de testes.');
    expect(qaSummary(execucao({ ok: true, fail: 0, pass: 2 })).split('\n')[0]).toBe('QA aprovado · 2/2 testes');
    expect(qaSummary(execucao({ empty: true, total: 0 })).split('\n')[0]).toBe('QA reprovado · nenhum teste rodou');
  });

  it('o relatório HTML escapa o que vem do projeto', () => {
    const html = renderQaReport('<script>alert(1)</script>', execucao());
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Abre /promo.html');
  });
});

const ffmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore', windowsHide: true });
    return 'ffmpeg';
  } catch {
    return null;
  }
})();

describe.skipIf(!ffmpeg)('calibração dos GIFs', () => {
  it('acha o quadro magenta no vídeo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-mark-'));
    const file = path.join(dir, 'v.webm');
    // 1,2 s de cinza, depois magenta: o marcador tem que aparecer perto de 1,2 s.
    execFileSync(ffmpeg!, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=gray:s=64x48:d=1.2:r=25', '-f', 'lavfi', '-i', 'color=c=0xff00ff:s=64x48:d=1:r=25',
      '-filter_complex', '[0][1]concat=n=2:v=1', '-c:v', 'libvpx', '-b:v', '200k', file], { windowsHide: true });
    const at = markInVideo(ffmpeg!, file);
    expect(at).not.toBeNull();
    expect(Math.abs(at! - 1.2)).toBeLessThan(0.1);
  });
});
