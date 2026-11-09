import * as fs from 'node:fs';
import * as path from 'node:path';
import { engineHub } from '../drivers/engineHub';
import { runMotor, type MotorId } from '../motors';
import { startRun } from '../runLedger';
import type { Angulo, Roteiro, RoteiroSlide } from '../../shared/studio';
import { studioHome } from './paths';
import { getStudioStore } from './store';

export type SuggestAlvo = 'angulos' | 'roteiro';

const MOTORS = new Set<MotorId>(['cursor', 'claude', 'codex', 'antigravity']);

function motorId(engine: string): MotorId {
  if (engine === 'anthropic') return 'claude';
  if (MOTORS.has(engine as MotorId)) return engine as MotorId;
  return 'cursor';
}

function custoDe(costUsd: number | undefined): string {
  return typeof costUsd === 'number' && Number.isFinite(costUsd) ? `US$ ${costUsd}` : '—';
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[\[{]/);
  if (start < 0) return null;
  const slice = body.slice(start);
  try {
    return JSON.parse(slice);
  } catch {
    const end = Math.max(slice.lastIndexOf(']'), slice.lastIndexOf('}'));
    if (end < 0) return null;
    try {
      return JSON.parse(slice.slice(0, end + 1));
    } catch {
      return null;
    }
  }
}

export function parseAngles(text: string): Array<Pick<Angulo, 'gancho' | 'promessa' | 'prova'>> {
  const raw = extractJson(text);
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { angulos?: unknown }).angulos)
      ? (raw as { angulos: unknown[] }).angulos
      : null;
  if (!arr) {
    const gancho = text.trim().slice(0, 500);
    return gancho ? [{ gancho, promessa: '', prova: '' }] : [];
  }
  return arr.slice(0, 3).map((item) => {
    const a = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      gancho: String(a.gancho ?? a.hook ?? '').slice(0, 500),
      promessa: String(a.promessa ?? a.promise ?? '').slice(0, 500),
      prova: String(a.prova ?? a.proof ?? '').slice(0, 500),
    };
  }).filter((a) => a.gancho || a.promessa || a.prova);
}

export function parseRoteiro(text: string): Roteiro {
  const raw = extractJson(text);
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const slidesRaw = Array.isArray(raw) ? raw : Array.isArray(obj.slides) ? obj.slides : [];
  const slides: RoteiroSlide[] = slidesRaw.map((item) => {
    const s = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      titulo: String(s.titulo ?? s.title ?? '').slice(0, 500),
      apoio: String(s.apoio ?? s.body ?? '').slice(0, 500),
    };
  }).filter((s) => s.titulo || s.apoio);
  if (!slides.length) {
    const titulo = text.trim().slice(0, 500);
    return titulo ? { slides: [{ titulo }] } : { slides: [] };
  }
  return { slides };
}

/** Pede ângulos ou roteiro ao motor padrão. Não escolhe ângulo e não avança etapa. */
export async function suggestForPiece(pecaId: string, alvo: SuggestAlvo): Promise<{ ok: boolean; peca?: ReturnType<ReturnType<typeof getStudioStore>['getPeca']>; error?: string; custo: string }> {
  const store = getStudioStore();
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada', custo: '—' };
  const perfil = store.getPerfil(peca.perfil_id);
  let motor: MotorId = 'cursor';
  let model = '';
  let effort = '';
  let binary = 'cursor';
  try {
    const call = engineHub.resolveCall();
    motor = motorId(call.motor.id);
    model = call.model.id;
    effort = call.effort.id;
    binary = motor;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), custo: '—' };
  }

  const home = path.join(studioHome(), 'motion-jobs');
  fs.mkdirSync(home, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(home, 'suggest-'));
  const canon = (perfil?.brand_kit.canon ?? []).join('\n');
  const tom = perfil?.brand_kit.tone ?? '';
  const prompt = alvo === 'angulos'
    ? [
        'Sugira até 3 ângulos para esta peça. Responda só com JSON: [{"gancho":"","promessa":"","prova":""}].',
        'Não escolha um ângulo. Não invente número, porcentagem ou custo.',
        `Perfil: ${perfil?.nome ?? ''}`,
        `Tom: ${tom}`,
        `Canon:\n${canon}`,
        `Título: ${peca.titulo}`,
        `Tema: ${peca.pauta?.tema ?? ''}`,
        `Fonte: ${peca.pauta?.fonte ?? ''}`,
        `Objetivo: ${peca.pauta?.objetivo ?? ''}`,
      ].join('\n')
    : [
        'Escreva o roteiro desta peça. Responda só com JSON: {"slides":[{"titulo":"","apoio":""}]}.',
        'Não invente número, porcentagem ou custo.',
        `Perfil: ${perfil?.nome ?? ''}`,
        `Tom: ${tom}`,
        `Canon:\n${canon}`,
        `Título: ${peca.titulo}`,
        `Ângulo: ${JSON.stringify(peca.angulos.find((a) => a.id === peca.angulo_escolhido) ?? peca.angulos[0] ?? null)}`,
        `Tema: ${peca.pauta?.tema ?? ''}`,
      ].join('\n');

  const run = await startRun({
    workspace,
    kind: 'chat',
    label: alvo === 'angulos' ? 'Studio · ângulos' : 'Studio · roteiro',
    stage: peca.etapa,
    owner: 'Studio',
    projectName: perfil?.nome || 'Studio',
    engine: motor,
    binary,
    model,
    effort,
    mode: 'read',
    args: [],
    timeoutMs: 180000,
    prompt,
  });

  try {
    const result = await runMotor({
      motor,
      workspace,
      prompt,
      model,
      effort,
      access: 'read',
      timeoutMs: 180000,
      onRaw: (stream, text) => run.raw(stream, text),
    });
    const meta = await run.finish({
      ok: result.ok,
      exitCode: result.exitCode,
      reply: result.text,
      error: result.error?.message,
    });
    const custo = custoDe(meta.usage?.costUsd);
    if (!result.ok) return { ok: false, error: result.error?.message || 'motor não respondeu', custo };
    if (alvo === 'angulos') {
      const atuais = peca.angulos.filter((a) => a.origem !== 'motor');
      const vagas = Math.max(0, 3 - atuais.length);
      const novos: Angulo[] = parseAngles(result.text).slice(0, vagas).map((a, i) => ({
        id: `m${Date.now().toString(36)}${i}`,
        gancho: a.gancho,
        promessa: a.promessa,
        prova: a.prova,
        origem: 'motor',
      }));
      const updated = store.updatePeca(pecaId, { angulos: atuais.concat(novos) });
      return { ok: true, peca: updated, custo };
    }
    const updated = store.updatePeca(pecaId, { roteiro: parseRoteiro(result.text) });
    return { ok: true, peca: updated, custo };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await run.finish({ ok: false, reply: '', error }).catch(() => undefined);
    return { ok: false, error, custo: '—' };
  }
}
