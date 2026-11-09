import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_FRONTS } from '../../shared/raiox';
import { engineHub } from '../drivers/engineHub';
import { findMotorBinary, runMotor, type MotorCall, type MotorId, type MotorResult } from '../motors';
import { startRun, type RunHandle } from '../runLedger';
import { buildContext, repoRoot } from './raioxContext';
import { suggestionShape } from './raioxDocLint';
import { RaioxError, addEvidence, addHypotheses } from './raioxRules';
import { caseDir, readCase, writeCase } from './raioxStore';

function officeMotor(id: string): MotorId {
  if (id === 'claude' || id === 'anthropic') return 'claude';
  if (id === 'codex') return 'codex';
  if (id === 'antigravity') return 'antigravity';
  return 'cursor';
}

const TIMEOUT_MS = 45 * 60 * 1000;
const kills = new Map<string, () => void>();
const live = new Map<string, { running: boolean; speech: string; activity: string }>();

export interface AnalyseDeps {
  run?: (call: MotorCall) => Promise<MotorResult>;
  gitStatus?: () => string;
  now?: () => string;
  uuid?: () => string;
  ledger?: { start: typeof startRun };
  onProgress?: (progress: { id: string; speech: string; activity: string; running: boolean }) => void;
  repo?: string;
}

function blank(value: string | undefined): boolean {
  return !(value || '').trim();
}

function porcelain(repo: string): string {
  return execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' });
}

function leaked(before: string, after: string): string[] {
  const prior = new Set(before.split(/\r?\n/).filter(Boolean));
  return after.split(/\r?\n/).filter((line) => line && !prior.has(line));
}

export function analysisLive(id: string): { running: boolean; speech: string; activity: string } {
  return live.get(id) || { running: false, speech: '', activity: '' };
}

export function stopAnalyse(id: string): void {
  const kill = kills.get(id);
  if (kill) kill();
}

export async function analyse(root: string, id: string, fronts: string[], deps: AnalyseDeps = {}): Promise<{ ok: true; created: number }> {
  if (fronts.some((front) => !RAIOX_FRONTS.some((item) => item.id === front))) {
    throw new RaioxError('Frente de varredura inválida.');
  }
  const current = readCase(root, id);
  const input = path.join(caseDir(root, id), 'analise', 'analysis-input.json');
  if (!fs.existsSync(input) && (blank(current.frontier) || blank(current.publicLink))) {
    throw new RaioxError('Preencha a fronteira e o link público antes da análise.');
  }
  if (live.get(id)?.running) throw new RaioxError('Já existe uma análise em andamento neste caso.');

  const repo = deps.repo || repoRoot();
  const before = (deps.gitStatus ?? (() => porcelain(repo)))();
  buildContext(root, current, 'analise', { fronts, repo });
  const prompt = fs.readFileSync(path.join(caseDir(root, id), '_contexto', 'prompt.md'), 'utf8');
  const settings = engineHub.getSettings();
  const motor = officeMotor(settings.defaultEngine);
  const model = settings.defaultModel;
  const effort = settings.defaultEffort;
  const workspace = caseDir(root, id);
  const binary = findMotorBinary(motor) || '';
  const now = (deps.now ?? (() => new Date().toISOString()))();
  let handle: RunHandle | null = null;
  const ledger = deps.ledger ?? { start: startRun };
  try {
    handle = await ledger.start({
      workspace, kind: 'raiox', label: 'Raio-X · análise', stage: current.status, owner: 'Raio-X',
      projectName: current.id, engine: motor, binary, model, effort, mode: 'write', args: [], timeoutMs: TIMEOUT_MS, prompt,
    });
  } catch (err) {
    throw new RaioxError(err instanceof Error ? err.message : 'Não foi possível abrir o livro de execuções.');
  }
  live.set(id, { running: true, speech: '', activity: 'Preparando a análise' });
  deps.onProgress?.({ id, speech: '', activity: 'Preparando a análise', running: true });
  const runner = deps.run ?? runMotor;
  let result: MotorResult;
  try {
    result = await runner({
      motor, workspace, prompt, model, effort, access: 'write', timeoutMs: TIMEOUT_MS,
      onProgress: (progress) => {
        live.set(id, { running: true, speech: progress.speech, activity: progress.activity });
        deps.onProgress?.({ id, speech: progress.speech, activity: progress.activity, running: true });
      },
      registerKill: (kill) => kills.set(id, kill),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'A análise não terminou.';
    await handle.finish({ ok: false, error: message, reply: '' });
    live.set(id, { running: false, speech: '', activity: '' });
    kills.delete(id);
    throw new RaioxError(message);
  }
  kills.delete(id);
  const after = (deps.gitStatus ?? (() => porcelain(repo)))();
  const news = leaked(before, after);
  if (news.length) {
    const message = `A análise escreveu no repositório. Nada foi aceito.\n${news.join('\n')}`;
    await handle.finish({ ok: false, status: 'failed', error: message, reply: result.text || '', exitCode: result.exitCode });
    live.set(id, { running: false, speech: '', activity: '' });
    throw new RaioxError(message);
  }
  if (!result.ok) {
    const message = result.error?.message || 'A análise não terminou.';
    await handle.finish({ ok: false, error: message, reply: result.text || '', exitCode: result.exitCode });
    live.set(id, { running: false, speech: '', activity: '' });
    throw new RaioxError(message);
  }
  let parsed: ReturnType<typeof suggestionShape>;
  try {
    const file = path.join(workspace, 'analise', 'sugestoes.json');
    parsed = suggestionShape(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    const reason = err instanceof SyntaxError || err instanceof Error ? (err instanceof SyntaxError ? 'JSON quebrado' : err.message) : 'arquivo ausente';
    const message = `A análise não devolveu sugestões válidas: ${reason}`;
    await handle.finish({ ok: false, status: 'failed', error: message, reply: result.text || '', exitCode: result.exitCode });
    live.set(id, { running: false, speech: '', activity: '' });
    throw new RaioxError(message);
  }
  if (current.deepScan && parsed.evidencias.some((item) => !item.front)) {
    const message = 'A análise não devolveu sugestões válidas: frente obrigatória no deep scan';
    await handle.finish({ ok: false, status: 'failed', error: message, reply: result.text || '' });
    live.set(id, { running: false, speech: '', activity: '' });
    throw new RaioxError(message);
  }
  let next = current;
  const ids: string[] = [];
  try {
    parsed.evidencias.forEach((item, index) => {
      const evId = deps.uuid ? deps.uuid() : `ev-${index + 1}-${now}`;
      ids.push(evId);
      next = addEvidence(next, {
        stage: item.stage, source: item.source, claim: item.claim, classification: item.classification,
        front: item.front, gapIds: item.gapIds, author: 'dora',
        artifact: item.url ? { file: item.arquivo || 'analise/sugestoes.json', sha256: '', url: item.url, collectedAt: now } : undefined,
      }, now, evId);
    });
    if (parsed.hipoteses.length) {
      next = addHypotheses(next, parsed.hipoteses.map((item, index) => ({
        id: `H-${next.hypotheses.length + index + 1}`,
        gapId: item.gapId,
        text: item.texto,
        evidenceIds: item.evidencias.map((n) => ids[n]),
      })), now);
    }
  } catch (err) {
    const message = `A análise não devolveu sugestões válidas: ${err instanceof Error ? err.message : 'não foi possível gravar'}`;
    await handle.finish({ ok: false, status: 'failed', error: message, reply: result.text || '' });
    live.set(id, { running: false, speech: '', activity: '' });
    throw new RaioxError(message);
  }
    writeCase(root, next);
    await handle.finish({ ok: true, reply: result.text || '', exitCode: result.exitCode });
    live.set(id, { running: false, speech: '', activity: '' });
    deps.onProgress?.({ id, speech: '', activity: '', running: false });
    return { ok: true, created: parsed.evidencias.length };
  }
