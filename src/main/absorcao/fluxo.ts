/**
 * Absorção como sequência retomável, com estado em `.tavir/absorcao.json`:
 * preparar → detectores → sete passos de leitura → retrato → acessos → gate.
 *
 * Quem fecha é o gate do Carlos (`decidirRetrato`). Resposta de motor nunca aprova retrato.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Retrato } from '../../shared/absorcao';
import { lerRetrato } from './retrato';

export type EtapaFluxo = 'preparar' | 'detectores' | 'leitura' | 'retrato' | 'acessos' | 'gate';
export const ETAPAS_FLUXO: EtapaFluxo[] = ['preparar', 'detectores', 'leitura', 'retrato', 'acessos', 'gate'];

export interface Pendencia {
  id: 'qa' | 'seg';
  titulo: string;
  situacao: 'a_fazer' | 'rodando' | 'feito';
  runId?: string;
  em?: string;
}

export interface EstadoAbsorcao {
  versao: 1;
  iniciado_em: string;
  atualizado_em: string;
  origem?: { tipo: 'link' | 'pasta'; valor: string };
  etapas: Record<EtapaFluxo, { situacao: 'a_fazer' | 'rodando' | 'ok' | 'falhou'; inicio?: string; fim?: string; runId?: string; nota?: string }>;
  /** Passo da leitura em curso (id de PASSOS_LEITURA). */
  passoAtual?: string;
  /** Passos pedidos de novo pelo Carlos ao reprovar o retrato. */
  refazer?: string[];
  decisao?: { em: string; decisao: 'aprovado' | 'reprovado'; nota?: string };
  pendencias: Pendencia[];
  log: string[];
}

export function absorcaoPath(root: string): string {
  return path.join(root, '.tavir', 'absorcao.json');
}

export function novoEstado(origem?: EstadoAbsorcao['origem']): EstadoAbsorcao {
  const now = new Date().toISOString();
  const etapas = {} as EstadoAbsorcao['etapas'];
  for (const e of ETAPAS_FLUXO) etapas[e] = { situacao: 'a_fazer' };
  return {
    versao: 1,
    iniciado_em: now,
    atualizado_em: now,
    ...(origem ? { origem } : {}),
    etapas,
    pendencias: [
      { id: 'qa', titulo: 'Retrato inicial de QA', situacao: 'a_fazer' },
      { id: 'seg', titulo: 'Retrato inicial de segurança', situacao: 'a_fazer' },
    ],
    log: [],
  };
}

export function lerEstado(root: string): EstadoAbsorcao | null {
  try {
    const e = JSON.parse(fs.readFileSync(absorcaoPath(root), 'utf8'));
    if (!e || e.versao !== 1) return null;
    for (const k of ETAPAS_FLUXO) if (!e.etapas?.[k]) e.etapas[k] = { situacao: 'a_fazer' };
    if (!Array.isArray(e.pendencias)) e.pendencias = [];
    if (!Array.isArray(e.log)) e.log = [];
    return e as EstadoAbsorcao;
  } catch {
    return null;
  }
}

export function gravarEstado(root: string, e: EstadoAbsorcao): void {
  e.atualizado_em = new Date().toISOString();
  e.log = e.log.slice(-200);
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  fs.writeFileSync(absorcaoPath(root), JSON.stringify(e, null, 2), 'utf8');
}

/** Primeira etapa que ainda não fechou: de onde a absorção retoma. */
export function etapaDeRetomada(e: EstadoAbsorcao): EtapaFluxo | null {
  for (const k of ETAPAS_FLUXO) if (e.etapas[k].situacao !== 'ok') return k;
  return null;
}

/** Visão para a tela: retrato, estado do fluxo e pendências. */
export function visaoDaAbsorcao(root: string): { retrato: Retrato | null; estado: EstadoAbsorcao | null; retratoMd: string } {
  let retratoMd = '';
  try {
    retratoMd = fs.readFileSync(path.join(root, 'context', 'RETRATO.md'), 'utf8');
  } catch {
    retratoMd = '';
  }
  return { retrato: lerRetrato(root), estado: lerEstado(root), retratoMd };
}
