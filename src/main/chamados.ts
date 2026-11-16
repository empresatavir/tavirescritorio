/**
 * Chamados no disco (B1 do PLANO_CHAMADOS).
 *
 * `<projeto>/.tavir/chamados/CH-0001/chamado.json`, anexos em `CH-0001/anexos/`.
 * Numeração por projeto; chamado nunca é apagado. Toda mudança passa por
 * `podeMover` e deixa linha no histórico. Motor nunca move chamado.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escritaDoEscritorio } from './tavirGuarda';
import { attachmentsPrompt, saveAttachments, type AttachmentInput } from './attachments';
import { garantirExclude, lerRetrato, resumoDoRetrato } from './absorcao/retrato';
import * as pfs from './project-fs';
import { converseWithIrisAgent } from './irisAgent';
import {
  FECHADAS, PRIORIDADES, PRIORIDADE_ROTULO, ROTULOS_DESCRICAO, SITUACOES, TIPO_ROTULO, TIPOS, normTitulo, podeMover,
  type Chamado, type OrigemChamado, type Prioridade, type Quem, type Situacao, type TipoChamado,
} from '../shared/chamados';

const now = () => new Date().toISOString();
const MAX_CAMPO = 4000;

export function chamadosDir(root: string): string {
  return path.join(root, '.tavir', 'chamados');
}

function pastaDo(root: string, id: string): string {
  if (!/^CH-\d{4,}$/.test(id)) throw new Error('Id de chamado inválido.');
  return path.join(chamadosDir(root), id);
}

function arquivoDo(root: string, id: string): string {
  return path.join(pastaDo(root, id), 'chamado.json');
}

function gravar(root: string, c: Chamado): Chamado {
  c.atualizado_em = now();
  fs.mkdirSync(pastaDo(root, c.id), { recursive: true });
  fs.writeFileSync(arquivoDo(root, c.id), JSON.stringify(c, null, 2), 'utf8');
  escritaDoEscritorio(arquivoDo(root, c.id));
  return c;
}

function proximoId(root: string): string {
  let max = 0;
  try {
    for (const d of fs.readdirSync(chamadosDir(root))) {
      const m = /^CH-(\d+)$/.exec(d);
      if (m) max = Math.max(max, Number(m[1]));
    }
  } catch {}
  return 'CH-' + String(max + 1).padStart(4, '0');
}

export function lerChamado(root: string, id: string): Chamado | null {
  try {
    return JSON.parse(fs.readFileSync(arquivoDo(root, id), 'utf8')) as Chamado;
  } catch {
    return null;
  }
}

export function listarChamados(root: string): Chamado[] {
  const out: Chamado[] = [];
  try {
    for (const d of fs.readdirSync(chamadosDir(root))) {
      if (!/^CH-\d+$/.test(d)) continue;
      const c = lerChamado(root, d);
      if (c) out.push(c);
    }
  } catch {}
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function texto(v: unknown, max = MAX_CAMPO): string {
  return String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
}

export interface NovoChamado {
  tipo?: string;
  titulo: string;
  descricao?: { a?: string; b?: string; c?: string };
  prioridade?: string;
  autor?: { tipo?: 'ceo' | 'agente'; nome?: string; motor?: string; runId?: string; origem?: OrigemChamado };
  anexos?: AttachmentInput[];
  criterios?: string[];
  evidenciaNaoConferida?: string;
}

export interface ResultadoChamado { ok: boolean; error?: string; chamado?: Chamado; avisos?: string[] }

export function criarChamado(root: string, dados: NovoChamado): ResultadoChamado {
  const titulo = texto(dados?.titulo, 200);
  if (!titulo) return { ok: false, error: 'O título é obrigatório.' };
  const tipo = (TIPOS as string[]).includes(String(dados.tipo)) ? (dados.tipo as TipoChamado) : 'bug';
  const prioridade = (PRIORIDADES as string[]).includes(String(dados.prioridade)) ? (dados.prioridade as Prioridade) : 'media';
  const primeiro = !fs.existsSync(chamadosDir(root));
  fs.mkdirSync(chamadosDir(root), { recursive: true });
  if (primeiro) garantirExclude(root);
  const id = proximoId(root);
  const autorTipo = dados.autor?.tipo === 'agente' ? 'agente' : 'ceo';
  const c: Chamado = {
    id, tipo, titulo,
    descricao: { a: texto(dados.descricao?.a), b: texto(dados.descricao?.b), c: tipo === 'duvida' ? '' : texto(dados.descricao?.c) },
    prioridade, situacao: 'aberto',
    autor: {
      tipo: autorTipo,
      nome: texto(dados.autor?.nome, 80) || (autorTipo === 'agente' ? 'Íris' : 'Carlos'),
      ...(dados.autor?.motor ? { motor: texto(dados.autor.motor, 60) } : {}),
      ...(dados.autor?.runId ? { runId: texto(dados.autor.runId, 80) } : {}),
      origem: dados.autor?.origem || 'formulario',
    },
    anexos: [],
    refinamento: { criterios: (dados.criterios || []).map((x) => texto(x, 500)).filter(Boolean), notas: '', perguntas: [] },
    ...(dados.evidenciaNaoConferida ? { evidenciaNaoConferida: texto(dados.evidenciaNaoConferida, 300) } : {}),
    historico: [{ at: now(), quem: autorTipo === 'agente' ? `agente · ${texto(dados.autor?.nome, 80) || 'Íris'}` : 'Carlos', acao: 'abriu', para: 'aberto' }],
    criado_em: now(), atualizado_em: now(),
  };
  gravar(root, c);
  const avisos: string[] = [];
  if (dados.anexos?.length) {
    const r = anexarAoChamado(root, id, dados.anexos);
    avisos.push(...(r.avisos || []));
    if (r.chamado) return { ok: true, chamado: r.chamado, avisos };
  }
  return { ok: true, chamado: c, avisos };
}

export interface EdicaoChamado {
  tipo?: string;
  titulo?: string;
  descricao?: { a?: string; b?: string; c?: string };
  prioridade?: string;
  criterios?: string[];
  notas?: string;
  perguntas?: string[];
  resposta?: string;
}

/** Edita texto, tipo e prioridade. Chamado fechado não muda. */
export function editarChamado(root: string, id: string, ed: EdicaoChamado, quem = 'Carlos'): ResultadoChamado {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (FECHADAS.includes(c.situacao)) return { ok: false, error: 'Chamado fechado não muda.' };
  const mud: string[] = [];
  if (ed.titulo != null) { const t = texto(ed.titulo, 200); if (!t) return { ok: false, error: 'O título é obrigatório.' }; if (t !== c.titulo) { c.titulo = t; mud.push('título'); } }
  if (ed.tipo != null && (TIPOS as string[]).includes(ed.tipo) && ed.tipo !== c.tipo) { c.tipo = ed.tipo as TipoChamado; mud.push('tipo'); }
  if (ed.prioridade != null && (PRIORIDADES as string[]).includes(ed.prioridade) && ed.prioridade !== c.prioridade) { c.prioridade = ed.prioridade as Prioridade; mud.push('prioridade'); }
  if (ed.descricao) {
    const d = { a: ed.descricao.a != null ? texto(ed.descricao.a) : c.descricao.a, b: ed.descricao.b != null ? texto(ed.descricao.b) : c.descricao.b, c: ed.descricao.c != null ? texto(ed.descricao.c) : c.descricao.c };
    if (c.tipo === 'duvida') d.c = '';
    if (JSON.stringify(d) !== JSON.stringify(c.descricao)) { c.descricao = d; mud.push('descrição'); }
  }
  if (ed.criterios) { const cr = ed.criterios.map((x) => texto(x, 500)).filter(Boolean); if (JSON.stringify(cr) !== JSON.stringify(c.refinamento.criterios)) { c.refinamento.criterios = cr; mud.push('critérios'); } }
  if (ed.notas != null && texto(ed.notas) !== c.refinamento.notas) { c.refinamento.notas = texto(ed.notas); mud.push('notas'); }
  if (ed.perguntas) { c.refinamento.perguntas = ed.perguntas.map((x) => texto(x, 500)).filter(Boolean); mud.push('perguntas'); }
  if (ed.resposta != null && texto(ed.resposta) !== (c.resposta || '')) { c.resposta = texto(ed.resposta); mud.push('resposta'); }
  if (!mud.length) return { ok: true, chamado: c };
  c.historico.push({ at: now(), quem, acao: 'editou ' + mud.join(', ') });
  return { ok: true, chamado: gravar(root, c) };
}

/**
 * Move pela tabela de transições. `quem`: 'ceo' (clique do Carlos), 'escritorio'
 * (depois dos portões) ou 'agente' (sempre recusado).
 */
export function moverChamado(root: string, id: string, para: Situacao, quem: Quem, nota = '', extra?: { ciclo?: Chamado['ciclo'] }): ResultadoChamado {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (!(SITUACOES as string[]).includes(para)) return { ok: false, error: 'Situação desconhecida.' };
  const pode = podeMover(c.situacao, para, quem, { titulo: c.titulo, descricao: c.descricao, criterios: c.refinamento.criterios, tipo: c.tipo, resposta: c.resposta, nota });
  if (pode !== true) return { ok: false, error: pode, chamado: c };
  const de = c.situacao;
  c.situacao = para;
  if (extra?.ciclo) c.ciclo = { ...(c.ciclo || { n: extra.ciclo.n }), ...extra.ciclo };
  const acao = de === 'aguardando_validacao' && para === 'pronto' ? 'reprovou na validação' : de === 'aguardando_validacao' && para === 'concluido' ? 'aprovou no gate' : para === 'recusado' ? 'recusou' : 'moveu';
  c.historico.push({ at: now(), quem: quem === 'ceo' ? 'Carlos' : quem === 'escritorio' ? 'Escritório' : 'agente', acao, de, para, ...(nota.trim() ? { nota: nota.trim().slice(0, 2000) } : {}) });
  return { ok: true, chamado: gravar(root, c) };
}

export function anexarAoChamado(root: string, id: string, itens: AttachmentInput[]): ResultadoChamado {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  const rel = path.relative(root, path.join(pastaDo(root, id), 'anexos')).replace(/\\/g, '/');
  const { saved, errors } = saveAttachments(root, itens, new Date(), rel);
  if (!saved.length) return { ok: false, error: errors[0] || 'Nenhum anexo salvo.', chamado: c, avisos: errors };
  c.anexos.push(...saved.map((s) => ({ name: s.name, rel: s.rel, kind: s.kind, size: s.size })));
  c.historico.push({ at: now(), quem: 'Carlos', acao: `anexou ${saved.map((s) => s.name).join(', ')}` });
  return { ok: true, chamado: gravar(root, c), avisos: errors };
}

/** Igual ignorando caixa e acento, entre os não fechados. */
export function tituloDuplicado(root: string, titulo: string): Chamado | null {
  const n = normTitulo(titulo);
  if (!n) return null;
  return listarChamados(root).find((c) => !FECHADAS.includes(c.situacao) && normTitulo(c.titulo) === n) || null;
}

export interface Contagem {
  total: number;
  abertos: number;
  porSituacao: Record<Situacao, number>;
  /** aguardando_validacao + abertos por agente ainda em `aberto`. */
  aguardandoCarlos: number;
}

export function contarChamados(root: string): Contagem {
  const porSituacao = Object.fromEntries(SITUACOES.map((s) => [s, 0])) as Record<Situacao, number>;
  let aguardandoCarlos = 0;
  const lista = listarChamados(root);
  for (const c of lista) {
    porSituacao[c.situacao] = (porSituacao[c.situacao] || 0) + 1;
    if (c.situacao === 'aguardando_validacao' || (c.situacao === 'aberto' && c.autor.tipo === 'agente')) aguardandoCarlos++;
  }
  return { total: lista.length, abertos: lista.filter((c) => !FECHADAS.includes(c.situacao)).length, porSituacao, aguardandoCarlos };
}

// ------------------------------------------------------------ bloco CHAMADO: (B4, usado já pela absorção)

export interface PropostaChamado {
  tipo: TipoChamado;
  titulo: string;
  prioridade: Prioridade;
  descricao: { a: string; b: string; c: string };
  evidencia?: string;
  evidenciaNaoConferida?: boolean;
}

const CHAVES_A = ['acontece', 'mudar', 'pergunta'];
const CHAVES_B = ['esperado', 'porque', 'por que', 'contexto'];
const CHAVES_C = ['reproduzir', 'pronto', 'como saber'];

function normChave(k: string): string {
  return k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[*_`]/g, '').trim();
}

/**
 * Lê os blocos `CHAMADO:` de uma resposta. Devolve as propostas válidas, o texto
 * sem os blocos e os avisos do que foi descartado. `root` (opcional) confere a
 * evidência: caminho inexistente não derruba, só marca «evidência não conferida».
 */
export function parseChamados(reply: string, opts: { root?: string; max?: number } = {}): { propostas: PropostaChamado[]; texto: string; avisos: string[] } {
  const linhas = String(reply || '').replace(/\r/g, '').split('\n');
  const propostas: PropostaChamado[] = [];
  const avisos: string[] = [];
  const fora: string[] = [];
  const max = opts.max ?? 5;
  let i = 0;
  while (i < linhas.length) {
    if (!/^[\s>*_#`]*CHAMADO\s*:\s*[*_`]*\s*$/i.test(linhas[i])) { fora.push(linhas[i]); i++; continue; }
    i++;
    const campos: Record<string, string> = {};
    let ultima = '';
    while (i < linhas.length) {
      const l = linhas[i];
      if (/^[\s>*_#`]*CHAMADO\s*:\s*[*_`]*\s*$/i.test(l)) break;
      const m = /^\s*[-*]?\s*([A-Za-zÀ-ú ]{3,20})\s*:\s*(.*)$/.exec(l);
      if (m) { ultima = normChave(m[1]); campos[ultima] = m[2].trim(); i++; continue; }
      if (!l.trim()) { i++; break; }
      if (ultima) { campos[ultima] = (campos[ultima] + '\n' + l.trim()).trim(); i++; continue; }
      break;
    }
    const pega = (ks: string[]) => { for (const k of ks) if (campos[k] != null) return campos[k]; return ''; };
    const tipoRaw = normChave(campos['tipo'] || '');
    const prioRaw = normChave(campos['prioridade'] || '');
    const titulo = (campos['titulo'] || '').trim();
    const tipo = tipoRaw === 'duvida' ? 'duvida' : tipoRaw;
    if (!(TIPOS as string[]).includes(tipo)) { avisos.push(`Descartado: tipo «${campos['tipo'] || ''}» fora da taxonomia.`); continue; }
    if (!(PRIORIDADES as string[]).includes(prioRaw)) { avisos.push(`Descartado «${titulo || 'sem título'}»: prioridade «${campos['prioridade'] || ''}» fora da taxonomia.`); continue; }
    if (!titulo) { avisos.push('Descartado: bloco sem título.'); continue; }
    const descricao = { a: pega(CHAVES_A), b: pega(CHAVES_B), c: tipo === 'duvida' ? '' : pega(CHAVES_C) };
    if ([titulo, descricao.a, descricao.b, descricao.c].some((x) => x.length > MAX_CAMPO)) { avisos.push(`Descartado «${titulo.slice(0, 60)}»: campo maior que ${MAX_CAMPO} caracteres.`); continue; }
    if (propostas.length >= max) { avisos.push(`Descartado «${titulo}»: passou do limite de ${max} por resposta.`); continue; }
    const p: PropostaChamado = { tipo: tipo as TipoChamado, titulo: titulo.slice(0, 200), prioridade: prioRaw as Prioridade, descricao };
    const ev = (campos['evidencia'] || '').replace(/[`]/g, '').trim();
    if (ev) {
      p.evidencia = ev;
      if (opts.root) {
        const rel = ev.replace(/:\d+(?:-\d+)?$/, '').replace(/^\.?\//, '');
        const full = path.resolve(opts.root, rel);
        if (!rel || rel.includes('..') || !full.startsWith(path.resolve(opts.root)) || !fs.existsSync(full)) p.evidenciaNaoConferida = true;
      }
    }
    propostas.push(p);
  }
  const textoLimpo = fora.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { propostas, texto: textoLimpo, avisos };
}

/** Registra que o agente apontou de novo um chamado que já existe. */
export function apontadoDeNovo(root: string, c: Chamado, quem = 'Íris'): Chamado {
  const d = new Date().toLocaleDateString('pt-BR');
  c.historico.push({ at: now(), quem: `agente · ${quem}`, acao: `a ${quem} apontou de novo em ${d}` });
  return gravar(root, c);
}

/**
 * Grava propostas como chamados `aberto` por agente (varredura, absorção, trilho).
 * Duplicado não cria: vira linha no histórico do existente.
 */
export function gravarPropostas(root: string, propostas: PropostaChamado[], autor: { nome: string; motor?: string; runId?: string; origem: OrigemChamado }): { criados: Chamado[]; repetidos: Chamado[] } {
  const criados: Chamado[] = [];
  const repetidos: Chamado[] = [];
  for (const p of propostas) {
    const dup = tituloDuplicado(root, p.titulo);
    if (dup) { repetidos.push(apontadoDeNovo(root, dup, autor.nome)); continue; }
    const descricao = { ...p.descricao };
    if (p.evidencia) descricao.c = (descricao.c ? descricao.c + '\n\n' : '') + `Evidência: ${p.evidencia}`;
    const r = criarChamado(root, {
      tipo: p.tipo, titulo: p.titulo, prioridade: p.prioridade, descricao,
      autor: { tipo: 'agente', nome: autor.nome, motor: autor.motor, runId: autor.runId, origem: autor.origem },
      ...(p.evidenciaNaoConferida ? { evidenciaNaoConferida: p.evidencia } : {}),
    });
    if (r.chamado) criados.push(r.chamado);
  }
  return { criados, repetidos };
}

/** Problemas que o passo `riscos` da absorção devolveu entram como chamados `aberto`. */
export function chamadosDaAbsorcao(root: string, textoRiscos: string, runId?: string): { criados: Chamado[]; repetidos: Chamado[]; avisos: string[] } {
  const { propostas, avisos } = parseChamados(textoRiscos, { root, max: 8 });
  const r = gravarPropostas(root, propostas, { nome: 'Dora · Riscos', runId, origem: 'absorcao' });
  return { ...r, avisos };
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

/** Imagem anexada ao chamado como data URL (só arquivos listados em `anexos`, até 8 MB). */
export function anexoComoDataUrl(root: string, id: string, name: string): { ok: boolean; error?: string; dataUrl?: string } {
  const c = lerChamado(root, id);
  const a = c?.anexos.find((x) => x.name === name);
  if (!c || !a) return { ok: false, error: 'Anexo não encontrado.' };
  const ext = (a.name.split('.').pop() || '').toLowerCase();
  const mime = MIME[ext];
  if (!mime || ext === 'svg') return { ok: false, error: 'Só imagem tem prévia.' };
  const full = path.resolve(root, a.rel);
  if (!full.startsWith(path.resolve(pastaDo(root, id)))) return { ok: false, error: 'Anexo fora da pasta do chamado.' };
  const st = fs.statSync(full);
  if (st.size > 8 * 1024 * 1024) return { ok: false, error: 'Imagem grande demais para prévia.' };
  return { ok: true, dataUrl: `data:${mime};base64,${fs.readFileSync(full).toString('base64')}` };
}

// ------------------------------------------------------------ B3: refinar, executar, validar

export type PerguntarChamado = (req: { pedido: string; rotulo: string; onProgress?: (l: string) => void }) => Promise<{ ok: boolean; text: string; runId?: string; error?: string }>;

/** Íris em só leitura, com o motor do projeto. */
export function perguntarSoLeitura(root: string): PerguntarChamado {
  return async ({ pedido, rotulo, onProgress }) => {
    const eng = pfs.projectEngineSpec(root);
    const rec = pfs.resolveProjectRecord(root);
    const r = await converseWithIrisAgent({
      workspace: root, question: pedido, projectName: rec.name, stageName: rotulo, stageOwner: 'Íris · Chamados',
      engineId: eng.id, model: eng.model, effort: eng.effort, finished: false, alterationsOpen: false, asChangeRequest: false,
      recent: [], timeoutMs: 600000, runKind: 'chamado', runLabel: rotulo, onProgress,
    });
    return { ok: r.ok, text: r.text, runId: r.runId, error: r.error };
  };
}

function blocoDoChamado(c: Chamado): string {
  const rot = ROTULOS_DESCRICAO[c.tipo];
  const l = [`## ${c.id} · ${TIPO_ROTULO[c.tipo]} · prioridade ${PRIORIDADE_ROTULO[c.prioridade]}`, '', `Título: ${c.titulo}`];
  if (c.descricao.a) l.push('', `### ${rot[0]}`, c.descricao.a);
  if (c.descricao.b) l.push('', `### ${rot[1]}`, c.descricao.b);
  if (rot[2] && c.descricao.c) l.push('', `### ${rot[2]}`, c.descricao.c);
  return l.join('\n');
}

export function parseRefinamento(texto: string): { criterios: string[]; perguntas: string[]; notas: string; texto: string } | null {
  const t = String(texto || '').replace(/\r/g, '');
  const i = t.search(/^[\s>*_#`]*REFINAMENTO\s*:\s*[*_`]*\s*$/im);
  if (i < 0) return null;
  const antes = t.slice(0, i).trim();
  const bloco = t.slice(i).split('\n').slice(1);
  const out = { criterios: [] as string[], perguntas: [] as string[], notas: '' };
  let sec: 'criterios' | 'perguntas' | 'notas' | '' = '';
  for (const raw of bloco) {
    const l = raw.trim();
    const m = /^[*_]*(crit[eé]rios|perguntas|notas)[*_]*\s*:\s*(.*)$/i.exec(l);
    if (m) {
      const k = m[1].toLowerCase().startsWith('crit') ? 'criterios' : m[1].toLowerCase() === 'perguntas' ? 'perguntas' : 'notas';
      sec = k;
      if (k === 'notas' && m[2]) out.notas = m[2].trim();
      continue;
    }
    if (!l) continue;
    const item = /^[-*•]\s+(.*)$/.exec(l) || /^\d+[.)]\s+(.*)$/.exec(l);
    if ((sec === 'criterios' || sec === 'perguntas') && item) { out[sec].push(item[1].trim().slice(0, 500)); continue; }
    if (sec === 'notas') out.notas = (out.notas + '\n' + l).trim();
  }
  out.criterios = out.criterios.slice(0, 12);
  out.perguntas = out.perguntas.slice(0, 8);
  // O motor às vezes repete o rótulo do formato pedido; ele não é nota.
  out.notas = out.notas.replace(/^o que quem for executar precisa saber.*(?:\r?\n|$)/i, '').trim().slice(0, 3000);
  return { ...out, texto: antes };
}

export function pedidoDeRefinamento(root: string, c: Chamado): string {
  let nome = path.basename(root);
  try { nome = pfs.resolveProjectRecord(root).name || nome; } catch {}
  return [
    `Você é a Íris refinando um chamado do projeto ${nome}. Só leitura: não altere arquivos nem rode comandos que mudem o projeto.`,
    'Leia o código que for preciso para entender o chamado. Responda em português do Brasil.',
    '',
    blocoDoChamado(c),
    c.refinamento.criterios.length ? '\nCritérios já aceitos pelo Carlos:\n' + c.refinamento.criterios.map((x) => `- ${x}`).join('\n') : '',
    '',
    '## Retrato do projeto',
    resumoDoRetrato(root, 3000) || '(projeto sem retrato)',
    '',
    'Explique em poucas linhas o que encontrou (arquivos envolvidos, com caminho) e termine exatamente com o bloco abaixo:',
    '',
    'REFINAMENTO:',
    'criterios:',
    '- critério de aceite verificável (um por linha)',
    'perguntas:',
    '- pergunta ao Carlos, só se faltar informação',
    'notas: o que quem for executar precisa saber (arquivos, riscos, o que não mexer)',
  ].join('\n');
}

function sugestaoPath(root: string, id: string): string {
  return path.join(pastaDo(root, id), 'refinamento-sugerido.json');
}

export function lerSugestao(root: string, id: string): any {
  try { return JSON.parse(fs.readFileSync(sugestaoPath(root, id), 'utf8')); } catch { return null; }
}

export interface Sugestao { criterios: string[]; perguntas: string[]; notas: string; texto: string; runId?: string; em: string }

/** Pede o refinamento à Íris. Devolve sugestão: nada entra no chamado sem o clique do Carlos. */
export async function refinarChamado(root: string, id: string, perguntar: PerguntarChamado = perguntarSoLeitura(root)): Promise<{ ok: boolean; error?: string; sugestao?: Sugestao }> {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (FECHADAS.includes(c.situacao) || c.situacao === 'em_execucao' || c.situacao === 'aguardando_validacao') return { ok: false, error: 'Este chamado não está em refinamento.' };
  const r = await perguntar({ pedido: pedidoDeRefinamento(root, c), rotulo: `Chamado ${c.id} · refinamento` });
  if (!r.ok) return { ok: false, error: r.error || 'O motor não respondeu.' };
  const p = parseRefinamento(r.text);
  if (!p) return { ok: false, error: 'A resposta não trouxe o bloco REFINAMENTO:.' };
  const sugestao: Sugestao = { ...p, runId: r.runId, em: now() };
  fs.writeFileSync(sugestaoPath(root, id), JSON.stringify(sugestao, null, 2), 'utf8');
  escritaDoEscritorio(sugestaoPath(root, id));
  const c2 = lerChamado(root, id)!;
  c2.historico.push({ at: now(), quem: 'agente · Íris', acao: `sugeriu refinamento (${p.criterios.length} critério(s), ${p.perguntas.length} pergunta(s))` });
  gravar(root, c2);
  return { ok: true, sugestao };
}

/** Dúvida: a Íris responde em só leitura e a resposta fica no chamado. Situação não muda. */
export async function responderDuvida(root: string, id: string, perguntar: PerguntarChamado = perguntarSoLeitura(root)): Promise<ResultadoChamado> {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (c.tipo !== 'duvida') return { ok: false, error: 'Só dúvida tem resposta da Íris.' };
  if (FECHADAS.includes(c.situacao)) return { ok: false, error: 'Chamado fechado.' };
  const pedido = [
    'Você é a Íris respondendo uma dúvida do Carlos sobre o projeto. Só leitura: não altere nada.',
    'Responda em português do Brasil, direto, citando os arquivos (caminho) que sustentam a resposta.',
    '', blocoDoChamado(c), '', '## Retrato do projeto', resumoDoRetrato(root, 3000) || '(projeto sem retrato)',
  ].join('\n');
  const r = await perguntar({ pedido, rotulo: `Chamado ${c.id} · dúvida` });
  if (!r.ok) return { ok: false, error: r.error || 'O motor não respondeu.' };
  const c2 = lerChamado(root, id)!;
  c2.resposta = String(r.text || '').trim().slice(0, 12000);
  c2.historico.push({ at: now(), quem: 'agente · Íris', acao: 'respondeu a dúvida' });
  return { ok: true, chamado: gravar(root, c2) };
}

/** Nota de «Mapear gaps» do ciclo: o chamado inteiro, critérios, refinamento, reprovações e anexos. */
export function textoParaMapear(c: Chamado): string {
  const l = [`# Chamado ${c.id} · ${c.titulo}`, '', blocoDoChamado(c)];
  if (c.refinamento.criterios.length) l.push('', '## Critérios de aceite', ...c.refinamento.criterios.map((x) => `- [ ] ${x}`));
  if (c.refinamento.notas) l.push('', '## Notas do refinamento', c.refinamento.notas);
  const reprov = c.historico.filter((h) => h.acao === 'reprovou na validação' && h.nota);
  if (reprov.length) l.push('', '## Orientações de reprovações anteriores', ...reprov.map((h) => `- ${h.at.slice(0, 10)}: ${h.nota}`));
  if (c.anexos.length) l.push('', attachmentsPrompt(c.anexos.map((a) => ({ name: a.name, rel: a.rel, kind: a.kind as any, size: a.size }))).trim());
  l.push('', 'Mapeie só o que este chamado pede. O ciclo fecha para validação do Carlos depois dos portões de QA e segurança.');
  return l.join('\n');
}

function absorvidoSemRetrato(root: string): boolean {
  if (!fs.existsSync(path.join(root, '.tavir', 'absorcao.json'))) return false;
  return !lerRetrato(root)?.aprovado;
}

/**
 * «Executar» (clique do Carlos), com o chamado em `pronto`. Projeto encerrado: abre um
 * ciclo do trilho com o chamado em «Mapear gaps». Projeto em esteira: pede à Íris como
 * pedido de alteração e, ao terminar sem erro, roda os portões; só com eles aprovados o
 * Escritório põe o chamado em validação.
 */
export function executarChamado(root: string, id: string): ResultadoChamado & { trilho?: boolean } {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (c.situacao !== 'pronto') return { ok: false, error: 'Só um chamado pronto vai para execução.' };
  if (c.tipo === 'duvida') return { ok: false, error: 'Dúvida não passa pelo trilho: peça a resposta à Íris.' };
  if (absorvidoSemRetrato(root)) return { ok: false, error: 'Aprove o retrato do projeto antes de executar chamados.' };
  const ctrl = pfs.getProjectAlterationsControl(root);
  if (!ctrl.finished) return executarNaEsteira(root, c);
  if (!ctrl.alterations_open) {
    const lib = pfs.setProjectAlterationsOpen(root, true);
    if (lib?.ok === false) return { ok: false, error: lib.error || 'Não consegui liberar o trilho.' };
  }
  let tr = pfs.getProjectAlterationsControl(root).alt_track;
  const temConteudo = tr.items.some((i) => String(i.note || '').trim());
  if (temConteudo && tr.runStatus !== 'done') {
    const frente = tr.chamados?.[0];
    return { ok: false, error: frente ? `O trilho está ocupado com ${frente}. Feche aquele ciclo antes.` : `O trilho está ocupado com «${tr.title}». Feche aquele ciclo antes.` };
  }
  if (temConteudo) {
    const novo = pfs.startNewAltTrackCycle(root);
    if (novo?.ok === false) return { ok: false, error: novo.error };
  }
  tr = pfs.getProjectAlterationsControl(root).alt_track;
  const n = (tr.cycles || []).length + 1;
  pfs.saveProjectAltTrackNote(root, 0, textoParaMapear(c));
  pfs.setAltTrackChamados(root, `${c.id} · ${c.titulo}`, [c.id]);
  const adv = pfs.advanceProjectAltTrack(root, 0);
  if (adv?.ok === false) return { ok: false, error: adv.error };
  const r = moverChamado(root, id, 'em_execucao', 'ceo', '', { ciclo: { n } });
  return { ...r, trilho: true };
}

function executarNaEsteira(root: string, c: Chamado): ResultadoChamado & { trilho?: boolean } {
  const r = moverChamado(root, c.id, 'em_execucao', 'ceo');
  if (!r.ok) return r;
  void (async () => {
    try {
      const res = await pfs.askProjectIris({ projectPath: root, question: textoParaMapear(c), asChangeRequest: true });
      if (!res || res.ok === false) return;
      const qa = await pfs.runProjectQa(root, { label: `Chamado ${c.id}` });
      const seg = qa.run?.ok ? await pfs.runProjectSeg(root, { label: `Chamado ${c.id}` }) : null;
      aoFecharCicloDoTrilho(root, { chamados: [c.id] }, { qa: !!qa.run?.ok, seg: !!seg?.run?.ok });
    } catch {}
  })();
  return { ...r, trilho: false };
}

/**
 * Ciclo do trilho fechado: os chamados dele vão para `aguardando_validacao` pelo
 * Escritório, só com os portões de QA e segurança aprovados. Sem portão, ficam em execução.
 */
export function aoFecharCicloDoTrilho(root: string, track: { chamados?: string[]; cycles?: unknown[]; branch?: { name?: string } | null; publish?: { url?: string } | null }, portoes: { qa: boolean; seg: boolean }): Chamado[] {
  const ids = track?.chamados || [];
  const out: Chamado[] = [];
  for (const id of ids) {
    const c = lerChamado(root, id);
    if (!c || c.situacao !== 'em_execucao') continue;
    if (!portoes.qa || !portoes.seg) {
      c.historico.push({ at: now(), quem: 'Escritório', acao: `ciclo fechado sem os portões aprovados (QA ${portoes.qa ? 'ok' : 'reprovado'}, segurança ${portoes.seg ? 'ok' : 'reprovada'}): continua em execução` });
      gravar(root, c);
      continue;
    }
    const ciclo = { n: c.ciclo?.n || (Array.isArray(track.cycles) ? track.cycles.length + 1 : 1), ...(track.branch?.name ? { branch: track.branch.name } : {}), ...(track.publish?.url ? { pr: track.publish.url } : {}) };
    const r = moverChamado(root, id, 'aguardando_validacao', 'escritorio', 'Portões de QA e segurança aprovados.', { ciclo });
    if (r.chamado) out.push(r.chamado);
  }
  return out;
}

/** Gate do chamado (clique do Carlos). Reprovar exige nota e volta a `pronto`. */
export function decidirChamado(root: string, id: string, decisao: 'aprovado' | 'reprovado', nota = ''): ResultadoChamado {
  const c = lerChamado(root, id);
  if (!c) return { ok: false, error: 'Chamado não encontrado.' };
  if (c.situacao !== 'aguardando_validacao') return { ok: false, error: 'Só um chamado aguardando validação passa pelo gate.' };
  if (decisao === 'reprovado' && !nota.trim()) return { ok: false, error: 'Reprovar exige uma nota dizendo o que falta.' };
  const r = moverChamado(root, id, decisao === 'aprovado' ? 'concluido' : 'pronto', 'ceo', nota);
  if (!r.ok) return r;
  pfs.registrarDecisao(root, { kind: 'chamado', stage: `${c.id} · ${c.titulo}`, decision: decisao, ...(nota.trim() ? { note: nota.trim() } : {}) });
  return r;
}

/** Anexos que o Carlos mandou na conversa (`.tavir/anexos/…`), lidos para copiar ao chamado. */
export function anexosDaConversa(root: string, rels: string[]): AttachmentInput[] {
  const base = path.resolve(root, '.tavir', 'anexos');
  const out: AttachmentInput[] = [];
  for (const rel of rels.slice(0, 10)) {
    const full = path.resolve(root, String(rel || ''));
    if (!full.startsWith(base + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    out.push({ name: path.basename(full), data: fs.readFileSync(full).toString('base64') });
  }
  return out;
}
