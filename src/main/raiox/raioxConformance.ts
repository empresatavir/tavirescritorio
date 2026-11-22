/**
 * F11 — mesma qualidade do Raio-X em qualquer motor.
 *
 * Roda a análise e a redação do caso fictício (`tests/fixtures/raiox/caso-ficticio/`) em cada
 * motor, pelo mesmo caminho do app (`analyse` e `writeDocuments`), sem rede. Passa quando:
 *  - `sugestoes.json` válido (a própria análise recusa se não for) e com evidências na taxonomia;
 *  - nenhuma escrita fora da pasta do caso (nem no repositório, nem na pasta privada);
 *  - documentos aprovados pela checagem (seções, termos proibidos, corte público);
 *  - nenhum número que não esteja nas fontes do caso fictício, nos modelos ou no prompt.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RaioxCase } from '../../shared/raiox';
import { MOTOR_IDS, MOTOR_LABEL, findMotorBinary, type MotorId } from '../motors';
import { analyse, type AnalyseDeps } from './raioxAnalyse';
import { repoRoot } from './raioxContext';
import { writeDocuments, type DocsDeps } from './raioxDocs';
import { addEvidence, createCase, reviewEvidence, setDebrief, setPriority } from './raioxRules';
import { caseDir, readCase, writeCase } from './raioxStore';

export const FIXTURE_UUID = 'c0ffee00-1111-4222-8333-444455556666';
export const FIXTURE_ID = 'RX-C0FFEE00';

export const OFFLINE_NOTE = [
  'RODADA DE CONFORMIDADE (caso fictício). Não acesse a internet nesta rodada: nenhum navegador,',
  'curl, busca ou API. As páginas públicas do caso já foram copiadas para `analise/fontes/`',
  '(site.md e instagram.md); use só elas e o intake em `analise/analysis-input.json`. O que',
  'depender de outra fonte é `indisponivel`. Não escreva nada fora da pasta do caso.',
].join(' ');

export interface RaioxCheck { id: 'analise' | 'redacao'; title: string; ok: boolean; ms: number; detail: string }
export interface RaioxConformance { motor: MotorId; label: string; model: string; effort: string; available: boolean; ok: boolean; checks: RaioxCheck[] }

export interface RaioxConformanceOptions {
  motors?: MotorId[];
  models?: Partial<Record<MotorId, string>>;
  effort?: string;
  repo?: string;
  workdir?: string;
  onLog?: (line: string) => void;
  /** Testes: troca o motor de verdade. */
  run?: AnalyseDeps['run'];
  /** Testes: troca o git status do repositório. */
  gitStatus?: () => string;
}

const DEFAULT_MODEL: Record<MotorId, string> = {
  cursor: 'auto-smart',
  claude: 'claude-sonnet-5-5',
  codex: 'codex-default',
  antigravity: 'gemini-4-argon',
};

function fixtureDir(repo: string): string {
  return path.join(repo, 'tests', 'fixtures', 'raiox', 'caso-ficticio');
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** Caso fictício pronto para a análise: campos, intake e fontes copiadas. */
export function seedAnalysis(root: string, repo: string, now: string): RaioxCase {
  const fx = fixtureDir(repo);
  const c = createCase(readJson(path.join(fx, 'caso.json')), now, FIXTURE_UUID);
  writeCase(root, c);
  const dir = caseDir(root, c.id);
  fs.mkdirSync(path.join(dir, 'analise', 'fontes'), { recursive: true });
  fs.copyFileSync(path.join(fx, 'analysis-input.json'), path.join(dir, 'analise', 'analysis-input.json'));
  for (const name of fs.readdirSync(path.join(fx, 'fontes'))) {
    fs.copyFileSync(path.join(fx, 'fontes', name), path.join(dir, 'analise', 'fontes', name));
  }
  return c;
}

/** Caso fictício pronto para a redação: evidências aprovadas, prioridade e devolutiva pelas regras. */
export function seedWriting(root: string, repo: string, now: string): RaioxCase {
  const fx = fixtureDir(repo);
  let c = seedAnalysis(root, repo, now);
  const plan = readJson<{ evidence: Array<Record<string, unknown>>; priority: Record<string, string>; debrief: Record<string, string> }>(path.join(fx, 'redacao.json'));
  plan.evidence.forEach((ev, i) => {
    const id = `fx-${i + 1}`;
    c = addEvidence(c, { ...ev, author: 'carlos' } as never, now, id);
    c = reviewEvidence(c, id, 'aprovada', now);
  });
  c = setPriority(c, plan.priority as never, now);
  c = setDebrief(c, plan.debrief as never, 'rascunho', now);
  writeCase(root, c);
  return c;
}

/** Arquivos da pasta privada fora da pasta do caso (para provar que o motor não escreveu lá). */
function outsideSnapshot(root: string, caseFolder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (path.resolve(full) === path.resolve(caseFolder)) continue;
      if (e.isDirectory()) walk(full);
      else out.push(`${path.relative(root, full)}:${fs.statSync(full).size}`);
    }
  };
  walk(root);
  return out.sort();
}

/** Números com dois dígitos ou mais (ou com R$/%) que não aparecem no material permitido. */
export function inventedNumbers(text: string, allowed: string): string[] {
  const norm = (n: string) => n.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  const pool = new Set((allowed.match(/\d[\d.,]*\d|\d/g) || []).map(norm));
  const found = new Set<string>();
  const body = text
    .replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g, ' ') // datas
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ') // datas dd/mm/aaaa
    .replace(/\bRX-[0-9A-F]{8}\b/g, ' ') // código do caso
    .replace(/\bv\d+\b/g, ' ') // versão do documento
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ' '); // uuid
  for (const m of body.matchAll(/(R\$\s*)?(\d[\d.,]*\d|\d)(\s*%)?/g)) {
    const n = norm(m[2]);
    const money = !!m[1] || !!m[3];
    if (!money && n.replace(/\D/g, '').length < 2) continue;
    // Fases do plano (30/60/90 dias, inclusive "dias 31 a 60") e o ano da rodada.
    if (['30', '31', '60', '61', '90', '2026'].includes(n)) continue;
    if (!pool.has(n)) found.add(m[0].trim());
  }
  return [...found];
}

function allowedText(repo: string, dir: string): string {
  const parts: string[] = [];
  const add = (file: string) => { try { parts.push(fs.readFileSync(file, 'utf8')); } catch { /* sem arquivo */ } };
  const fx = fixtureDir(repo);
  for (const f of ['caso.json', 'analysis-input.json', 'redacao.json']) add(path.join(fx, f));
  for (const f of fs.readdirSync(path.join(fx, 'fontes'))) add(path.join(fx, 'fontes', f));
  const ctx = path.join(dir, '_contexto');
  add(path.join(ctx, 'prompt.md'));
  add(path.join(ctx, 'playbook.md'));
  const modelos = path.join(ctx, 'modelos');
  if (fs.existsSync(modelos)) for (const f of fs.readdirSync(modelos)) add(path.join(modelos, f));
  return parts.join('\n');
}

/**
 * Arquivos novos no git status que trazem o caso fictício. Outras sessões podem mexer no
 * repositório ao mesmo tempo; só conta como vazamento o que leva a marca do caso.
 */
export function repoLeaks(before: string, after: string, repo: string): string[] {
  const prior = new Set(before.split(/\r?\n/).filter(Boolean));
  const fresh = after.split(/\r?\n/).filter((line) => line && !prior.has(line)).map((line) => line.slice(3).trim().replace(/^"|"$/g, ''));
  return fresh.filter((rel) => {
    const full = path.join(repo, rel);
    try {
      if (fs.statSync(full).isDirectory()) return true;
      return /Lumen|RX-C0FFEE00|c0ffee00-1111/.test(fs.readFileSync(full, 'utf8'));
    } catch {
      return false;
    }
  });
}

export async function runRaioxConformance(opts: RaioxConformanceOptions = {}): Promise<RaioxConformance[]> {
  const motors = opts.motors?.length ? opts.motors : MOTOR_IDS;
  const effort = opts.effort || 'medium';
  const repo = opts.repo || repoRoot();
  const log = opts.onLog || (() => {});
  const base = opts.workdir || path.join(os.tmpdir(), 'tavir-conformidade-raiox');
  const out: RaioxConformance[] = [];

  for (const motor of motors) {
    const model = opts.models?.[motor] || DEFAULT_MODEL[motor];
    const report: RaioxConformance = {
      motor, label: MOTOR_LABEL[motor], model, effort,
      available: !!opts.run || !!findMotorBinary(motor), ok: false, checks: [],
    };
    out.push(report);
    if (!report.available) {
      report.checks.push({ id: 'analise', title: 'Análise', ok: false, ms: 0, detail: `CLI do ${report.label} não encontrado.` });
      log(`✗ ${report.label}: CLI não encontrado.`);
      continue;
    }
    const engine = { motor, model, effort };
    const noNetwork = { links: async () => ({ checkedAt: new Date().toISOString(), links: [], blocked: [] }) };

    // 1) Análise
    {
      const root = path.join(base, `${motor}-analise-${Date.now()}`);
      const now = new Date().toISOString();
      seedAnalysis(root, repo, now);
      const dir = caseDir(root, FIXTURE_ID);
      const outsideBefore = outsideSnapshot(root, dir);
      const repoBefore = (opts.gitStatus ?? (() => ''))();
      const t0 = Date.now();
      let detail = '';
      try {
        await analyse(root, FIXTURE_ID, [], {
          // O vazamento no repositório é conferido abaixo pela marca do caso: outras sessões
          // podem mexer no repositório ao mesmo tempo e o git status sozinho acusaria elas.
          ...noNetwork, repo, engine, extra: OFFLINE_NOTE, run: opts.run, gitStatus: () => '',
          local: async () => ({ status: 'sem_chave', message: 'rodada sem rede', requests: { total: 0 } }) as never,
        });
        const c = readCase(root, FIXTURE_ID);
        const problems: string[] = [];
        if (c.evidence.length < 3) problems.push(`só ${c.evidence.length} evidência(s)`);
        const outsideAfter = outsideSnapshot(root, dir);
        const extra = outsideAfter.filter((f) => !outsideBefore.includes(f));
        if (extra.length) problems.push(`escreveu fora da pasta do caso: ${extra.join(', ')}`);
        if (opts.gitStatus) {
          const leaked = repoLeaks(repoBefore, opts.gitStatus(), repo);
          if (leaked.length) problems.push(`escreveu no repositório: ${leaked.join(', ')}`);
        }
        // Só o texto das evidências e hipóteses; índices e estrutura do JSON não são número de cliente.
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'analise', 'sugestoes.json'), 'utf8')) as {
          evidencias?: Array<{ claim?: string; source?: string }>; hipoteses?: Array<{ texto?: string }>;
        };
        const sugestoes = [
          ...(parsed.evidencias || []).flatMap((e) => [e.claim || '', e.source || '']),
          ...(parsed.hipoteses || []).map((h) => h.texto || ''),
        ].join('\n');
        const invented = inventedNumbers(sugestoes, allowedText(repo, dir));
        if (invented.length) problems.push(`número sem fonte: ${invented.slice(0, 6).join(', ')}`);
        detail = problems.join('; ');
      } catch (err) {
        detail = err instanceof Error ? err.message.slice(0, 400) : 'falhou';
      }
      const ok = !detail;
      report.checks.push({ id: 'analise', title: 'Análise', ok, ms: Date.now() - t0, detail: ok ? 'ok' : detail });
      log(`${ok ? '✓' : '✗'} ${report.label} · análise (${Math.round((Date.now() - t0) / 1000)} s)${ok ? '' : ` — ${detail}`}`);
    }

    // 2) Redação
    {
      const root = path.join(base, `${motor}-redacao-${Date.now()}`);
      const now = new Date().toISOString();
      seedWriting(root, repo, now);
      const dir = caseDir(root, FIXTURE_ID);
      const outsideBefore = outsideSnapshot(root, dir);
      const before = (opts.gitStatus ?? (() => ''))();
      const t0 = Date.now();
      let detail = '';
      try {
        const docsDeps: DocsDeps = { repo, engine, extra: OFFLINE_NOTE, run: opts.run };
        const res = await writeDocuments(root, FIXTURE_ID, docsDeps);
        const problems: string[] = [...res.problems.map((p) => `checagem: ${p}`)];
        const outsideAfter = outsideSnapshot(root, dir);
        const extra = outsideAfter.filter((f) => !outsideBefore.includes(f));
        if (extra.length) problems.push(`escreveu fora da pasta do caso: ${extra.join(', ')}`);
        if (opts.gitStatus) {
          const leaked = repoLeaks(before, opts.gitStatus(), repo);
          if (leaked.length) problems.push(`escreveu no repositório: ${leaked.join(', ')}`);
        }
        const allowed = allowedText(repo, dir);
        for (const name of ['relatorio-raio-x.md', 'plano-crescimento.md']) {
          const md = fs.readFileSync(path.join(dir, 'documentos', `v${res.version}`, name), 'utf8');
          const invented = inventedNumbers(md, allowed);
          if (invented.length) problems.push(`${name}: número sem fonte: ${invented.slice(0, 6).join(', ')}`);
        }
        detail = problems.join('; ');
      } catch (err) {
        detail = err instanceof Error ? err.message.slice(0, 400) : 'falhou';
      }
      const ok = !detail;
      report.checks.push({ id: 'redacao', title: 'Redação', ok, ms: Date.now() - t0, detail: ok ? 'ok' : detail });
      log(`${ok ? '✓' : '✗'} ${report.label} · redação (${Math.round((Date.now() - t0) / 1000)} s)${ok ? '' : ` — ${detail}`}`);
    }
    report.ok = report.checks.length === 2 && report.checks.every((c) => c.ok);
  }
  return out;
}

export function raioxConformanceMarkdown(results: RaioxConformance[]): string {
  const lines = ['# Conformidade do Raio-X nos motores', '', `Gerado em ${new Date().toLocaleString('pt-BR')}. Caso fictício, sem rede.`, ''];
  lines.push('| Motor | Modelo | Resultado | Análise | Redação |', '|---|---|---|---|---|');
  for (const r of results) {
    const cell = (id: string) => {
      const c = r.checks.find((x) => x.id === id);
      return c ? `${c.ok ? '✅' : '❌'} ${Math.round(c.ms / 1000)} s` : '—';
    };
    lines.push(`| ${r.label} | ${r.model} | ${r.ok ? '✅ conforme' : r.available ? '❌ falhou' : '⛔ sem CLI'} | ${cell('analise')} | ${cell('redacao')} |`);
  }
  for (const r of results) {
    const bad = r.checks.filter((c) => !c.ok);
    if (!bad.length) continue;
    lines.push('', `## ${r.label}`);
    for (const c of bad) lines.push(`- ${c.title}: ${c.detail.replace(/\r?\n/g, ' ')}`);
  }
  return lines.join('\n') + '\n';
}
