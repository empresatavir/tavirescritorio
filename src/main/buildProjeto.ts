/**
 * Build pedido pela Íris: a Íris propõe, o Carlos clica, o Escritório roda e confere.
 *
 * O projeto declara os builds em `tavir.build.json` (na raiz, no git dele): comando, pasta,
 * tempo, a prova que tem de aparecer na saída e o arquivo que tem de sair. A Íris só escreve um
 * bloco `BUILD:` com o id do alvo; o Escritório mostra o cartão e, no clique, roda o comando
 * declarado. Passou ou não quem diz é a checagem (código de saída, prova e artefato novo), nunca
 * a resposta do motor. Saída e resultado ficam em `qa/builds/BLD-AAAAMMDD-HHMMSS/`, fora do git
 * do projeto, com segredos mascarados.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { runCommand, killTree } from './qa/qaRunner';
import { maskSecret } from './seg/segRules';

export const BUILD_SPEC_FILE = 'tavir.build.json';
export const BUILD_DIR = 'qa/builds';
const MAX_ALVOS = 10;
const MAX_POR_RESPOSTA = 2;

export interface BuildAlvo {
  id: string;
  nome: string;
  /** Executável e argumentos. Sem shell: nada de `&&`, pipe ou redirecionamento. */
  comando: string[];
  /** Pasta onde o comando roda, relativa à raiz do projeto. */
  cwd: string;
  timeoutMin: number;
  /** Trechos que têm de aparecer na saída para o build valer. */
  prova: string[];
  /** Arquivo que o build tem de gerar (relativo à raiz). Tem de ser novo nesta execução. */
  artefato?: string;
  /** Texto curto para o Carlos e para a Íris: o que precisa estar pronto antes. */
  requisitos?: string;
}

export interface BuildSpec { alvos: BuildAlvo[]; erros: string[]; existe: boolean }

export interface PropostaBuild { alvo: string; nome: string; comando: string; motivo: string; requisitos?: string }

export interface ResultadoBuild {
  ok: boolean;
  id: string;
  alvo: string;
  nome: string;
  comando: string;
  inicio: string;
  ms: number;
  code: number | null;
  timedOut: boolean;
  provas: Array<{ texto: string; achou: boolean }>;
  artefato: { rel: string; existe: boolean; novo: boolean; mb: number } | null;
  motivos: string[];
  /** Últimas linhas da saída, já mascaradas. */
  final: string;
  /** Pasta da evidência, relativa à raiz do projeto. */
  pasta: string;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

function dentro(root: string, rel: string): string | null {
  const limpo = String(rel || '').replace(/\\/g, '/').trim();
  if (!limpo || limpo.includes('..') || path.isAbsolute(limpo)) return limpo === '' || limpo === '.' ? path.resolve(root) : null;
  const full = path.resolve(root, limpo);
  const base = path.resolve(root);
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

/** Lê e confere `tavir.build.json`. Alvo inválido fica de fora com o motivo em `erros`. */
export function lerSpec(root: string): BuildSpec {
  const file = path.join(root, BUILD_SPEC_FILE);
  if (!fs.existsSync(file)) return { alvos: [], erros: [], existe: false };
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (err) {
    return { alvos: [], erros: [`${BUILD_SPEC_FILE} não é um JSON válido: ${(err as Error).message}`], existe: true };
  }
  const lista: any[] = Array.isArray(raw?.alvos) ? raw.alvos : [];
  const alvos: BuildAlvo[] = [];
  const erros: string[] = [];
  for (const a of lista.slice(0, MAX_ALVOS)) {
    const id = String(a?.id || '').trim();
    const rotulo = id || '(sem id)';
    if (!ID_RE.test(id)) { erros.push(`Alvo ${rotulo}: id precisa ser minúsculo, com letras, números e hífen.`); continue; }
    if (alvos.some((x) => x.id === id)) { erros.push(`Alvo ${id}: id repetido.`); continue; }
    const comando = Array.isArray(a.comando) ? a.comando.map((x: unknown) => String(x)) : [];
    if (!comando.length || !comando[0].trim()) { erros.push(`Alvo ${id}: comando vazio (use uma lista: executável e argumentos).`); continue; }
    const cwd = String(a.cwd ?? '.');
    if (!dentro(root, cwd)) { erros.push(`Alvo ${id}: pasta «${cwd}» fora do projeto.`); continue; }
    const prova = (Array.isArray(a.prova) ? a.prova : a.prova ? [a.prova] : []).map((x: unknown) => String(x)).filter((x: string) => x.trim());
    const artefato = a.artefato ? String(a.artefato) : undefined;
    if (artefato && !dentro(root, artefato)) { erros.push(`Alvo ${id}: artefato «${artefato}» fora do projeto.`); continue; }
    if (!prova.length && !artefato) { erros.push(`Alvo ${id}: declare a prova (texto na saída) ou o artefato; sem isso o Escritório não tem o que conferir.`); continue; }
    const t = Number(a.timeoutMin);
    alvos.push({
      id,
      nome: String(a.nome || id).slice(0, 120),
      comando,
      cwd,
      timeoutMin: Number.isFinite(t) && t > 0 ? Math.min(60, t) : 20,
      prova,
      ...(artefato ? { artefato } : {}),
      ...(a.requisitos ? { requisitos: String(a.requisitos).slice(0, 400) } : {}),
    });
  }
  if (lista.length > MAX_ALVOS) erros.push(`Só os ${MAX_ALVOS} primeiros alvos valem.`);
  return { alvos, erros, existe: true };
}

export function comandoTexto(a: BuildAlvo): string {
  return a.comando.map((p) => (/\s/.test(p) ? `"${p}"` : p)).join(' ');
}

/** Linhas para os fatos do projeto no pedido da Íris. Vazio sem especificação. */
export function fatosParaIris(root: string): string[] {
  const spec = lerSpec(root);
  if (!spec.existe) return [];
  if (!spec.alvos.length) return [`${BUILD_SPEC_FILE} existe, mas sem alvo válido: ${spec.erros.join(' ')}`.slice(0, 400)];
  const lista = spec.alvos.map((a) => `${a.id} (${a.nome})`).join(', ');
  return [
    `Builds declarados em ${BUILD_SPEC_FILE}: ${lista}. Quem roda é o Escritório, depois do clique do Carlos; você não roda build. Quando o Carlos pedir para gerar o build, explique em uma linha e termine com um bloco por alvo, assim: «BUILD:» numa linha, «alvo: <id>» e «motivo: <frase curta>» nas seguintes. O resultado (passou ou não) vem da checagem do Escritório; não diga que o build passou.`,
  ];
}

/** Lê os blocos `BUILD:` da resposta. Só valem alvos declarados no projeto. */
export function parseBuilds(reply: string, root: string): { propostas: PropostaBuild[]; texto: string; avisos: string[] } {
  const linhas = String(reply || '').replace(/\r/g, '').split('\n');
  const cabeca = /^[\s>*_#`]*BUILD\s*:\s*[*_`]*\s*$/i;
  const fora: string[] = [];
  const blocos: Record<string, string>[] = [];
  let i = 0;
  while (i < linhas.length) {
    if (!cabeca.test(linhas[i])) { fora.push(linhas[i]); i++; continue; }
    i++;
    const campos: Record<string, string> = {};
    while (i < linhas.length && !cabeca.test(linhas[i])) {
      const m = /^\s*[-*]?\s*(alvo|motivo)\s*:\s*(.*)$/i.exec(linhas[i]);
      if (!m) break;
      campos[m[1].toLowerCase()] = m[2].replace(/[`*]/g, '').trim();
      i++;
    }
    blocos.push(campos);
  }
  if (!blocos.length) return { propostas: [], texto: String(reply || ''), avisos: [] };
  const spec = lerSpec(root);
  const propostas: PropostaBuild[] = [];
  const avisos: string[] = [];
  for (const b of blocos) {
    const id = (b.alvo || '').toLowerCase();
    const alvo = spec.alvos.find((a) => a.id === id);
    if (!alvo) { avisos.push(`Build «${b.alvo || 'sem alvo'}» descartado: não está em ${BUILD_SPEC_FILE}.`); continue; }
    if (propostas.some((p) => p.alvo === id)) continue;
    if (propostas.length >= MAX_POR_RESPOSTA) { avisos.push(`Build «${id}» descartado: passou do limite de ${MAX_POR_RESPOSTA} por resposta.`); continue; }
    propostas.push({ alvo: id, nome: alvo.nome, comando: comandoTexto(alvo), motivo: (b.motivo || '').slice(0, 300), ...(alvo.requisitos ? { requisitos: alvo.requisitos } : {}) });
  }
  return { propostas, texto: fora.join('\n').replace(/\n{3,}/g, '\n\n').trim(), avisos };
}

const SEGREDOS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT (chaves antigas do Supabase)
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}/g,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bre_[A-Za-z0-9_]{16,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
];

/** Mascara chaves conhecidas e valores de `senha=`/`password:`/`token=` na saída. */
export function mascararSaida(text: string): string {
  let out = String(text || '');
  for (const re of SEGREDOS) out = out.replace(re, (m) => maskSecret(m));
  out = out.replace(/\b((?:password|senha|secret|token|api[_-]?key|anon[_-]?key)\s*[:=]\s*)(["']?)([^\s"']{4,})\2/gi, (_m, k, q, v) => `${k}${q}${maskSecret(v)}${q}`);
  return out;
}

function carimbo(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const rodando = new Map<string, ChildProcess | null>();

export function buildRodando(root: string): boolean {
  return rodando.has(path.resolve(root));
}

/** Para o build em andamento do projeto, se houver. */
export function pararBuild(root: string): boolean {
  const key = path.resolve(root);
  if (!rodando.has(key)) return false;
  killTree(rodando.get(key) || null);
  return true;
}

type Runner = typeof runCommand;

/**
 * Roda o alvo declarado e confere. Chamado só pelo clique do Carlos no cartão.
 * `runner` é injetável para os testes.
 */
export async function rodarBuild(root: string, alvoId: string, opts: { runner?: Runner; agora?: () => Date } = {}): Promise<ResultadoBuild> {
  const key = path.resolve(root);
  const spec = lerSpec(root);
  const alvo = spec.alvos.find((a) => a.id === String(alvoId || '').trim().toLowerCase());
  if (!alvo) throw new Error(spec.existe ? `Alvo «${alvoId}» não está em ${BUILD_SPEC_FILE}.` : `O projeto não tem ${BUILD_SPEC_FILE}.`);
  if (rodando.has(key)) throw new Error('Já tem um build rodando neste projeto.');
  const agora = opts.agora || (() => new Date());
  const inicio = agora();
  const id = `BLD-${carimbo(inicio)}`;
  const pastaRel = `${BUILD_DIR}/${id}`;
  const pasta = path.join(root, pastaRel);
  const cwd = dentro(root, alvo.cwd)!;
  const artefatoAbs = alvo.artefato ? dentro(root, alvo.artefato) : null;
  const antes = artefatoAbs && fs.existsSync(artefatoAbs) ? fs.statSync(artefatoAbs).mtimeMs : 0;

  rodando.set(key, null);
  let r: Awaited<ReturnType<Runner>>;
  try {
    r = await (opts.runner || runCommand)(alvo.comando[0], alvo.comando.slice(1), cwd, alvo.timeoutMin * 60_000, (c) => {
      if (rodando.has(key)) rodando.set(key, c);
    });
  } finally {
    rodando.delete(key);
  }

  const saida = mascararSaida(r.out);
  const provas = alvo.prova.map((texto) => ({ texto, achou: saida.includes(texto) }));
  let artefato: ResultadoBuild['artefato'] = null;
  if (artefatoAbs && alvo.artefato) {
    const existe = fs.existsSync(artefatoAbs);
    const st = existe ? fs.statSync(artefatoAbs) : null;
    artefato = {
      rel: alvo.artefato.replace(/\\/g, '/'),
      existe,
      novo: !!st && st.mtimeMs > antes && st.mtimeMs >= inicio.getTime() - 2000,
      mb: st ? Math.round((st.size / 1048576) * 10) / 10 : 0,
    };
  }
  const motivos: string[] = [];
  if (r.timedOut) motivos.push(`Passou do tempo de ${alvo.timeoutMin} min e foi interrompido.`);
  else if (r.code !== 0) motivos.push(`O comando terminou com código ${r.code}.`);
  for (const p of provas) if (!p.achou) motivos.push(`A saída não trouxe a prova «${p.texto}».`);
  if (artefato && !artefato.existe) motivos.push(`O arquivo ${artefato.rel} não existe.`);
  else if (artefato && !artefato.novo) motivos.push(`O arquivo ${artefato.rel} é de antes deste build.`);

  const linhas = saida.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const resultado: ResultadoBuild = {
    ok: motivos.length === 0,
    id,
    alvo: alvo.id,
    nome: alvo.nome,
    comando: comandoTexto(alvo),
    inicio: inicio.toISOString(),
    ms: r.ms,
    code: r.code,
    timedOut: r.timedOut,
    provas,
    artefato,
    motivos,
    final: linhas.slice(-12).join('\n'),
    pasta: pastaRel,
  };
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, 'saida.log'), saida, 'utf8');
  fs.writeFileSync(path.join(pasta, 'resultado.json'), JSON.stringify(resultado, null, 2), 'utf8');
  return resultado;
}

/** Último resultado gravado de um alvo (ou de qualquer um), para a tela. */
export function ultimoBuild(root: string, alvoId?: string): ResultadoBuild | null {
  const dir = path.join(root, BUILD_DIR);
  let nomes: string[] = [];
  try { nomes = fs.readdirSync(dir).filter((n) => n.startsWith('BLD-')).sort().reverse(); } catch { return null; }
  for (const n of nomes) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, n, 'resultado.json'), 'utf8')) as ResultadoBuild;
      if (!alvoId || r.alvo === alvoId) return r;
    } catch { /* pasta incompleta */ }
  }
  return null;
}
