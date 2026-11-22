/**
 * F4 do GOAL_FLOW: novas entradas. O pedido do APK («Preparar post») e o bloco `PECA:` de um agente
 * viram peça do Studio na etapa `pauta`, com a origem gravada em `pecas/<id>/origem.json`.
 * Daqui nada vai ao DarkFlow: nenhuma agenda, nenhuma ativação. Os gates do Studio seguem os mesmos.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatById, type Peca, type PecaOrigem, type Perfil, type Roteiro } from '../../shared/studio';
import type { StudioStore } from '../studio/store';

/** Formatos que o APK oferece, pelo nome curto. Aceita também o id do formato. */
export const FORMATOS_ENTRADA: Record<string, string> = {
  reel: 'ig-reels-9x16',
  carrossel: 'ig-carrossel-4x5',
  post: 'ig-post-4x5',
  stories: 'ig-stories-9x16',
};

const norm = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^@/, '').trim();

export function formatoDaEntrada(texto: string): string | null {
  const t = norm(texto);
  if (!t) return FORMATOS_ENTRADA.reel;
  if (formatById(String(texto).trim())) return String(texto).trim();
  const chave = Object.keys(FORMATOS_ENTRADA).find((k) => t === k || t.startsWith(k));
  return chave ? FORMATOS_ENTRADA[chave] : null;
}

/** Acha o perfil pelo nome, pelas iniciais ou pelo @ de uma rede. Um perfil só e campo vazio: é ele. */
export function resolverPerfil(store: StudioStore, texto: string): { ok: true; perfil: Perfil } | { ok: false; error: string } {
  const perfis = store.listPerfis();
  if (!perfis.length) return { ok: false, error: 'O Studio não tem perfil. Crie um perfil no Studio antes de pedir post.' };
  const t = norm(texto);
  if (!t) {
    if (perfis.length === 1) return { ok: true, perfil: perfis[0] };
    return { ok: false, error: `Diga para qual perfil é o post: ${perfis.map((p) => p.nome).join(', ')}.` };
  }
  const achados = perfis.filter((p) => norm(p.nome) === t || norm(p.iniciais) === t || store.listRedes(p.id).some((r) => norm(r.handle) === t));
  if (achados.length === 1) return { ok: true, perfil: achados[0] };
  const parciais = achados.length ? achados : perfis.filter((p) => norm(p.nome).includes(t));
  if (parciais.length === 1) return { ok: true, perfil: parciais[0] };
  return { ok: false, error: `Não achei o perfil «${texto.trim()}». Perfis do Studio: ${perfis.map((p) => p.nome).join(', ')}.` };
}

export interface EntradaPeca {
  origem: PecaOrigem['origem'];
  autor: string;
  ref?: string;
  perfil: string;
  formato: string;
  tema: string;
  objetivo?: string;
  roteiro?: string;
  legenda?: string;
  hashtags?: string;
}

const MAX = { tema: 120, objetivo: 2000, roteiro: 6000, legenda: 2200, hashtags: 500 };

/** Texto livre do roteiro (uma linha por cena ou lâmina) no formato da peça. */
function roteiroDoTexto(texto: string, formatoId: string): Roteiro | null {
  const linhas = String(texto || '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  if (!linhas.length) return null;
  const kind = formatById(formatoId)?.kind;
  if (kind === 'video') return { cenas: linhas.map((texto_narrado) => ({ texto_narrado })) };
  return { slides: linhas.map((titulo, i) => ({ titulo, ...(i === 0 ? { layout: 'capa' as const } : {}) })) };
}

function hashtagsDoTexto(texto: string): string[] {
  return String(texto || '').split(/[\s,]+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`));
}

/** Cria a peça na etapa `pauta`. Não agenda e não fala com o DarkFlow. */
export function criarPecaDeEntrada(store: StudioStore, e: EntradaPeca): { ok: true; peca: Peca } | { ok: false; error: string } {
  const tema = String(e.tema || '').trim();
  if (!tema) return { ok: false, error: 'Informe o tema do post.' };
  for (const [k, lim] of Object.entries(MAX)) {
    const v = String((e as unknown as Record<string, string>)[k] ?? '');
    if (v.length > lim) return { ok: false, error: `${k} passou de ${lim} caracteres.` };
  }
  const formatoId = formatoDaEntrada(e.formato);
  if (!formatoId) return { ok: false, error: `Formato «${e.formato}» não existe. Use Reel, Carrossel, Post ou Stories.` };
  const formato = formatById(formatoId)!;
  const perfil = resolverPerfil(store, e.perfil);
  if (!perfil.ok) return perfil;
  try {
    let peca = store.createPeca({
      perfil_id: perfil.perfil.id,
      rede: formato.network,
      formato_id: formatoId,
      titulo: tema,
      pauta: { tema, ...(e.objetivo?.trim() ? { objetivo: e.objetivo.trim() } : {}), fonte: e.origem === 'apk' ? 'Pedido pelo APK' : `Proposta de ${e.autor}` },
    });
    const roteiro = roteiroDoTexto(e.roteiro ?? '', formatoId);
    const legenda = String(e.legenda ?? '').trim();
    const hashtags = hashtagsDoTexto(e.hashtags ?? '');
    if (roteiro || legenda || hashtags.length) {
      peca = store.updatePeca(peca.id, { ...(roteiro ? { roteiro } : {}), ...(legenda ? { legenda } : {}), ...(hashtags.length ? { hashtags } : {}) });
    }
    const origem: PecaOrigem = {
      origem: e.origem,
      autor: e.autor,
      ...(e.ref ? { ref: e.ref } : {}),
      pedido: [tema, e.objetivo?.trim()].filter(Boolean).join(' · '),
      criado_em: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(store.tree.pecaDirs(peca.id).root, 'origem.json'), JSON.stringify(origem, null, 2));
    return { ok: true, peca: store.getPeca(peca.id)! };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Pedido «Preparar post» do APK (`job.create` com `kind: 'studio_post'`). Resposta no formato de job do APK. */
export function postDoApk(store: StudioStore, cmdId: string, fields: Record<string, unknown>): { ok: true; body: Record<string, unknown>; ref: string } | { ok: false; error: string } {
  const f = (k: string) => String(fields?.[k] ?? '').trim();
  const r = criarPecaDeEntrada(store, {
    origem: 'apk',
    autor: 'Carlos pelo APK',
    ref: cmdId,
    perfil: f('perfil'),
    formato: f('formato'),
    tema: f('tema'),
    objetivo: f('instrucao'),
  });
  if (!r.ok) return r;
  const p = r.peca;
  const dono = store.getPerfil(p.perfil_id);
  const perfil = dono?.nome ?? '';
  const ref = `P-${dono?.iniciais ? dono.iniciais + '-' : ''}${p.numero}`;
  const detail = `Peça nº ${p.numero} criada no Studio (${perfil}, ${formatById(p.formato_id)?.label ?? p.formato_id}), etapa pauta. O resto segue no Escritório.`;
  return {
    ok: true,
    ref,
    body: {
      id: ref,
      detail,
      title: `Post · ${p.titulo}`,
      agent: 'Studio',
      model: '',
      status: 'done',
      pct: 100,
      cost: 0,
      costCeiling: 0,
      startedAt: '',
      log: [{ t: '', m: detail }],
      checkpoint: null,
      queueOrder: 0,
      kind: 'studio_post',
      fields: { peca_id: p.id, perfil, formato: p.formato_id },
    },
  };
}

// ------------------------------------------------------------ bloco PECA: de agente

export interface PropostaPeca {
  perfil: string;
  formato: string;
  tema: string;
  objetivo: string;
  roteiro: string;
  legenda: string;
  hashtags: string;
}

const CAMPOS_PECA: Record<string, keyof PropostaPeca> = {
  perfil: 'perfil', formato: 'formato', tema: 'tema', titulo: 'tema', objetivo: 'objetivo',
  roteiro: 'roteiro', legenda: 'legenda', hashtags: 'hashtags',
};
const CAMPOS_DE_AGENDA = ['agenda', 'agendar', 'data', 'hora', 'horario', 'quando', 'publicar'];
const ABRE = /^[\s>*_#`]*PECA\s*:\s*[*_`]*\s*$/i;

/**
 * Lê os blocos `PECA:` de uma resposta de agente. Campos em `chave: valor`; o valor continua
 * nas linhas seguintes até a próxima chave ou uma linha em branco. Campo de data ou agenda
 * é descartado com aviso: agente cria peça, nunca agenda.
 */
export function parsePecas(reply: string, max = 3): { propostas: PropostaPeca[]; texto: string; avisos: string[] } {
  const linhas = String(reply || '').replace(/\r/g, '').split('\n');
  const propostas: PropostaPeca[] = [];
  const avisos: string[] = [];
  const fora: string[] = [];
  let i = 0;
  while (i < linhas.length) {
    if (!ABRE.test(linhas[i].normalize('NFD').replace(/[̀-ͯ]/g, ''))) { fora.push(linhas[i]); i++; continue; }
    i++;
    const campos: Partial<PropostaPeca> = {};
    let ultima: keyof PropostaPeca | '' = '';
    const ignorados = new Set<string>();
    while (i < linhas.length) {
      const l = linhas[i];
      if (ABRE.test(l.normalize('NFD').replace(/[̀-ͯ]/g, ''))) break;
      const m = /^\s*[-*]?\s*([A-Za-zÀ-ú]{3,12})\s*:\s*(.*)$/.exec(l);
      const chave = m ? norm(m[1]) : '';
      if (m && CAMPOS_PECA[chave]) { ultima = CAMPOS_PECA[chave]; campos[ultima] = m[2].trim(); i++; continue; }
      if (m && CAMPOS_DE_AGENDA.includes(chave)) { ignorados.add(m[1]); ultima = ''; i++; continue; }
      if (!l.trim()) { i++; break; }
      if (ultima) { campos[ultima] = `${campos[ultima] ?? ''}\n${l.trim()}`.trim(); i++; continue; }
      if (m) { i++; continue; }
      break;
    }
    if (ignorados.size) avisos.push(`Ignorado na peça «${campos.tema || 'sem tema'}»: ${[...ignorados].join(', ')}. Agente não agenda; data e hora são do Flow.`);
    if (!campos.tema) { avisos.push('Descartado: bloco PECA sem tema.'); continue; }
    if (propostas.length >= max) { avisos.push(`Descartado «${campos.tema}»: passou do limite de ${max} peças por resposta.`); continue; }
    propostas.push({ perfil: '', formato: '', objetivo: '', roteiro: '', legenda: '', hashtags: '', ...campos, tema: campos.tema });
  }
  return { propostas, texto: fora.join('\n').replace(/\n{3,}/g, '\n\n').trim(), avisos };
}

/** Grava as propostas `PECA:` de uma resposta como peças do Studio. Devolve o que criou e o que recusou. */
export function pecasDoAgente(store: StudioStore, reply: string, autor: string, ref?: string): { criadas: Peca[]; avisos: string[]; texto: string } {
  const { propostas, texto, avisos } = parsePecas(reply);
  const criadas: Peca[] = [];
  for (const p of propostas) {
    const r = criarPecaDeEntrada(store, { origem: 'agente', autor, ...(ref ? { ref } : {}), ...p });
    if (r.ok) criadas.push(r.peca);
    else avisos.push(`Peça «${p.tema}» não criada: ${r.error}`);
  }
  return { criadas, avisos, texto };
}

/** Agentes da fila que podem propor peça: Redator, Social e, chamados pelo nome, Íris, Redator e Social. */
export function agentePropoePeca(agent: string): boolean {
  if (agent === 'redator' || agent === 'social') return true;
  const m = /^agente:(.+)$/.exec(agent || '');
  return !!m && /^(iris|redator|social)\b/.test(norm(m[1]));
}

const NOME_AGENTE: Record<string, string> = { redator: 'Redator', social: 'Social' };

/**
 * Resultado de execução da fila: tira os blocos `PECA:` e cria as peças. Sem bloco, ou agente
 * que não pode propor, o texto volta igual e o banco do Studio nem é aberto.
 */
export function aplicarPecasDoAgente(agent: string, reply: string, ref: string, store: () => StudioStore): string {
  if (!agentePropoePeca(agent) || !/PECA\s*:/i.test(reply.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return reply;
  const autor = NOME_AGENTE[agent] ?? agent.replace(/^agente:/, '');
  let r: ReturnType<typeof pecasDoAgente>;
  try {
    r = pecasDoAgente(store(), reply, autor, ref);
  } catch (err) {
    return `${reply}\n\nAs peças propostas não foram criadas no Studio: ${err instanceof Error ? err.message : String(err)}`;
  }
  const linhas = [
    ...r.criadas.map((p) => `- Peça nº ${p.numero} «${p.titulo}» criada no Studio, etapa pauta.`),
    ...r.avisos.map((a) => `- ${a}`),
  ];
  return linhas.length ? `${r.texto}\n\n**Studio**\n${linhas.join('\n')}` : r.texto;
}

/** Instrução que vai no pedido dos agentes que podem propor peça (Íris, Redator, Social). */
export const INSTRUCAO_PECA = [
  'Se o pedido for preparar um post, termine com um bloco PECA: para cada post (até três). O Escritório cria a peça no Studio, na etapa pauta; o Carlos segue pelos gates.',
  'PECA:',
  'perfil: nome do perfil do Studio',
  'formato: Reel, Carrossel, Post ou Stories',
  'tema: título curto',
  'objetivo: o que o post precisa fazer',
  'roteiro: uma linha por cena (Reel/Stories) ou por lâmina (Carrossel/Post)',
  'legenda: texto da legenda',
  'hashtags: até cinco',
  'Não escreva data, hora nem agenda: quem agenda é o Carlos, no Flow.',
].join('\n');
