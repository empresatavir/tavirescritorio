import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { engineHub } from '../drivers/engineHub';
import { runMotor, type MotorId } from '../motors';
import { startRun } from '../runLedger';
import { applyRewrite, type PromptLayers } from './promptCompiler';
import { getStudioStore } from './store';

const MOTORS = new Set<MotorId>(['cursor', 'claude', 'codex', 'antigravity']);

function asLayers(value: unknown): PromptLayers | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as PromptLayers;
  if (!row.subject || !row.composition || !row.style || !row.format || !row.restrictions) return null;
  return row;
}

/** Pede ao motor só as camadas 1–3 e 6. Descarta a resposta se o validador reprova. */
export async function polishPrompt(promptId: string): Promise<{ ok: boolean; error?: string; custo: string }> {
  const store = getStudioStore();
  const prompt = store.getPrompt(promptId);
  if (!prompt) return { ok: false, error: 'prompt não encontrado', custo: '—' };
  const camadas = asLayers(prompt.camadas);
  if (!camadas) return { ok: false, error: 'camadas incompletas', custo: '—' };
  let motor: MotorId = 'cursor';
  let model = '';
  let effort = '';
  try {
    const call = engineHub.resolveCall();
    motor = MOTORS.has(call.motor.id) ? call.motor.id : 'cursor';
    model = call.model.id;
    effort = call.effort.id;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), custo: '—' };
  }
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-prompt-'));
  const pedido = [
    'Reescreva só subject, action, setting e light deste prompt de imagem.',
    'Não peça texto, letras, marca d\'água nem logo na imagem.',
    'Se houver Exact description entre aspas, copie esse trecho sem mudar.',
    'Responda só JSON: {"subject":"","action":"","setting":"","light":""}.',
    JSON.stringify(camadas),
  ].join('\n');
  const run = await startRun({
    workspace,
    kind: 'chat',
    label: 'Studio · lapidar prompt',
    stage: 'arte',
    owner: 'Studio',
    projectName: 'Studio',
    engine: motor,
    binary: motor,
    model,
    effort,
    mode: 'read',
    args: [],
    timeoutMs: 180000,
    prompt: pedido,
  });
  const result = await runMotor({
    motor, workspace, prompt: pedido, model, effort, access: 'read', timeoutMs: 180000,
    onRaw: (stream, text) => run.raw(stream, text),
  });
  const meta = await run.finish({ ok: result.ok, status: result.error?.kind === 'paused' ? 'paused' : undefined, exitCode: result.exitCode, reply: result.text, error: result.error?.kind === 'paused' ? 'Pausado por Carlos. A retomada continua deste ponto.' : result.error?.message });
  const custo = typeof meta.usage?.costUsd === 'number' ? `US$ ${meta.usage.costUsd}` : '—';
  if (!result.ok) return { ok: false, error: result.error?.message || 'motor não respondeu', custo };
  const applied = applyRewrite(camadas, result.text);
  if (!applied.ok) return { ok: false, error: applied.error, custo };
  const versao = store.listPrompts(prompt.slot_id).reduce((max, row) => Math.max(max, row.versao), 0) + 1;
  store.savePrompt({
    slot_id: prompt.slot_id,
    alvo: prompt.alvo,
    versao,
    camadas: applied.camadas,
    texto: applied.texto,
  });
  return { ok: true, custo };
}
