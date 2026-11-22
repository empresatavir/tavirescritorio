/**
 * F1 do GOAL_FLOW: o Studio entrega a peça aprovada à biblioteca do Flow (DarkFlow) e lê de volta
 * onde ela está. Não cria agenda nem ativa: data, hora e ativação são do Flow, por clique do Carlos.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FlowEstado } from '../../shared/flow';
import { darkflowRequest } from '../studio/darkflow';
import { ensureStudioTree } from '../studio/paths';
import type { StudioStore } from '../studio/store';
import { pacoteDaPeca, paraManifestoDarkflow } from './pacote';

export interface EntregaFlow {
  item_id: string;
  sha256: string;
  ia: boolean;
  enviado_em: string;
}

type Probe = Parameters<typeof pacoteDaPeca>[2];

function entregaPath(store: StudioStore, pecaId: string): string {
  return path.join(ensureStudioTree(store.tree.home).pecaDirs(pecaId).pacote, 'flow.json');
}

export function lerEntrega(store: StudioStore, pecaId: string): EntregaFlow | null {
  const file = entregaPath(store, pecaId);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<EntregaFlow>;
    return raw.item_id && raw.sha256 ? (raw as EntregaFlow) : null;
  } catch {
    return null;
  }
}

/** Copia o pacote para o DarkFlow, importa na biblioteca e grava `pacote/flow.json`. */
export async function enviarParaBiblioteca(
  store: StudioStore,
  pecaId: string,
  base: string,
  outputRoot: string,
  projectRoot: string,
  deps: Probe = {},
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const built = pacoteDaPeca(store, pecaId, deps);
  if (!built.ok) return built;
  const exported = paraManifestoDarkflow(built.pacote, outputRoot, projectRoot);
  if (!exported.ok) return exported;
  try {
    const session = await darkflowRequest(base, '/api/publisher/session');
    const csrf = String(session.csrf_token ?? '');
    if (!csrf) return { ok: false, error: 'o DarkFlow não devolveu o CSRF' };
    await darkflowRequest(base, '/api/publisher/library/scan', { method: 'POST', csrf, body: {} });
    const library = await darkflowRequest(base, '/api/publisher/library');
    const item = (Array.isArray(library) ? library : []).find((row: { sha256?: string }) => row?.sha256 === exported.sha256) as { id?: string } | undefined;
    if (!item?.id) return { ok: false, error: 'o DarkFlow não importou o vídeo na biblioteca' };
    const entrega: EntregaFlow = { item_id: String(item.id), sha256: exported.sha256, ia: built.pacote.ia, enviado_em: new Date().toISOString() };
    fs.writeFileSync(entregaPath(store, pecaId), JSON.stringify(entrega, null, 2));
    return { ok: true, itemId: entrega.item_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'DarkFlow indisponível' };
  }
}

type Row = Record<string, unknown>;
const EM_CURSO = ['agendado', 'preflight', 'enviando', 'processando'];
const ATENCAO = ['reconciliacao', 'revisao_atraso'];

/** Situação da peça a partir das agendas e ocorrências do item. Função pura. */
export function derivarEstado(itemId: string, schedules: Row[], occurrences: Row[]): FlowEstado {
  const minhas = schedules.filter((s) => s.item_id === itemId);
  if (!minhas.length) return { situacao: 'na_biblioteca' };
  const ids = new Set(minhas.map((s) => s.id));
  const occ = occurrences.filter((o) => ids.has(o.schedule_id)).sort((a, b) => String(a.scheduled_at_utc).localeCompare(String(b.scheduled_at_utc)));
  const pub = [...occ].reverse().find((o) => o.state === 'publicado');
  if (pub) return { situacao: 'publicada', quando: String(pub.scheduled_at_utc), ...(pub.permalink ? { permalink: String(pub.permalink) } : {}) };
  const alerta = occ.find((o) => ATENCAO.includes(String(o.state)));
  if (alerta) return { situacao: 'atencao', quando: String(alerta.scheduled_at_utc), detalhe: String(alerta.state) };
  const falha = occ.find((o) => o.state === 'falhou');
  if (falha) return { situacao: 'falhou', quando: String(falha.scheduled_at_utc), ...(falha.error_message ? { detalhe: String(falha.error_message) } : {}) };
  const ativa = minhas.some((s) => s.status === 'agendado');
  const proxima = occ.find((o) => EM_CURSO.includes(String(o.state)));
  if (ativa && proxima) return { situacao: 'agendada', quando: String(proxima.scheduled_at_utc) };
  if (minhas.some((s) => s.status === 'pausado')) return { situacao: 'pausada' };
  if (minhas.some((s) => s.status === 'rascunho')) return { situacao: 'rascunho' };
  return { situacao: 'na_biblioteca' };
}

export async function estadoNoFlow(store: StudioStore, pecaId: string, base: string): Promise<FlowEstado> {
  const entrega = lerEntrega(store, pecaId);
  if (!entrega) return { situacao: 'fora' };
  try {
    const [schedules, occurrences, session] = await Promise.all([
      darkflowRequest(base, '/api/publisher/schedules'),
      darkflowRequest(base, '/api/publisher/occurrences'),
      darkflowRequest(base, '/api/publisher/session').catch(() => ({})),
    ]);
    const estado = derivarEstado(entrega.item_id, Array.isArray(schedules) ? schedules : [], Array.isArray(occurrences) ? occurrences : []);
    // Em simulação o worker usa o adaptador falso: «publicada» ali não foi ao Instagram.
    if (estado.situacao === 'publicada' && session?.mode !== 'real') return { ...estado, simulado: true };
    return estado;
  } catch (err) {
    return { situacao: 'sem_conexao', detalhe: err instanceof Error ? err.message : 'DarkFlow indisponível' };
  }
}
