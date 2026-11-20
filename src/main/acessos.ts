/**
 * Cartões de acesso por projeto (A4 do PLANO_CHAMADOS).
 *
 * Um cartão por serviço do retrato (confirmado ou indício) mais o do GitHub.
 * Estado em `.tavir/acessos.json` do projeto; o valor de cada campo vai cifrado
 * (cofreCripto) em `.tavir/credentials.json` do mesmo projeto. A tela só recebe a
 * prévia mascarada. O valor em claro só sai por `lerSegredoDoProjeto`, no main,
 * e nunca entra em pedido a agente nem em log.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escritaDoEscritorio } from './tavirGuarda';
import { cifrar, decifrar, restringirAcesso } from './cofreCripto';
import { maskToken, getGitAccountToken, listGitAccounts, fetchGithubUser } from './gitAccounts';
import { fetchProviderUser } from './credentials';
import { lerRetrato } from './absorcao/retrato';
import { guiaDe, servicoDoCartao, type GuiaAcesso, type SituacaoAcesso } from '../shared/acessos';

export interface CampoEstado {
  preenchido: boolean;
  previa: string;
  atualizado_em: string;
}

export interface CartaoAcesso {
  servico: string;
  nome: string;
  /** A prova do retrato que abriu o cartão (arquivo:linha · tipo) ou o motivo fixo do GitHub. */
  motivo: string;
  grau: 'confirmado' | 'indicio' | 'sempre';
  situacao: SituacaoAcesso;
  campos: Record<string, CampoEstado>;
  nota: string;
  conferido?: { ok: boolean; em: string; detalhe: string };
}

interface ArquivoAcessos {
  versao: 1;
  atualizado_em: string;
  cartoes: CartaoAcesso[];
}

export interface CartaoView extends CartaoAcesso {
  guia: GuiaAcesso & { generico?: boolean };
  faltando: string[];
}

const now = () => new Date().toISOString();

export function acessosPath(root: string): string {
  return path.join(root, '.tavir', 'acessos.json');
}

export function credenciaisPath(root: string): string {
  return path.join(root, '.tavir', 'credentials.json');
}

function lerArquivo(root: string): ArquivoAcessos {
  try {
    const d = JSON.parse(fs.readFileSync(acessosPath(root), 'utf8'));
    if (d && Array.isArray(d.cartoes)) return d as ArquivoAcessos;
  } catch {}
  return { versao: 1, atualizado_em: now(), cartoes: [] };
}

function gravarArquivo(root: string, a: ArquivoAcessos): void {
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  a.atualizado_em = now();
  fs.writeFileSync(acessosPath(root), JSON.stringify(a, null, 2), 'utf8');
  escritaDoEscritorio(acessosPath(root));
}

type Cofre = { versao: 1; servicos: Record<string, Record<string, string>> };

function lerCofre(root: string): Cofre {
  try {
    const d = JSON.parse(fs.readFileSync(credenciaisPath(root), 'utf8'));
    if (d && d.servicos && typeof d.servicos === 'object') return d as Cofre;
  } catch {}
  return { versao: 1, servicos: {} };
}

function gravarCofre(root: string, c: Cofre): void {
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  const f = credenciaisPath(root);
  fs.writeFileSync(f, JSON.stringify(c, null, 2), 'utf8');
  escritaDoEscritorio(f);
  try { restringirAcesso(f); } catch {}
}

function motivoDe(provas: Array<{ tipo: string; arquivo: string; linha?: number }>): string {
  const p = provas[0];
  if (!p) return '';
  const tipo = p.tipo === 'dep' ? 'dependência' : p.tipo === 'env' ? 'variável de ambiente' : p.tipo === 'config' ? 'configuração' : 'uso no código';
  return `${p.arquivo}${p.linha ? ':' + p.linha : ''} · ${tipo}`;
}

function cartaoNovo(servico: string, nome: string, motivo: string, grau: CartaoAcesso['grau']): CartaoAcesso {
  const g = guiaDe(servico, nome);
  const campos: Record<string, CampoEstado> = {};
  for (const c of g.campos) campos[c.chave] = { preenchido: false, previa: '', atualizado_em: '' };
  return { servico, nome: g.nome, motivo, grau, situacao: 'pendente', campos, nota: '' };
}

/**
 * Gera (ou completa) os cartões a partir do retrato. Rodar de novo acrescenta
 * serviço novo e não apaga nem zera o que já foi preenchido.
 */
export function gerarCartoes(root: string): CartaoAcesso[] {
  const arq = lerArquivo(root);
  const tem = new Map(arq.cartoes.map((c) => [c.servico, c]));
  const r = lerRetrato(root);
  const novos: CartaoAcesso[] = [];
  const add = (c: CartaoAcesso) => { if (!tem.has(c.servico)) { tem.set(c.servico, c); novos.push(c); } };
  add(cartaoNovo('github', 'GitHub', 'Repositório do projeto: publicar as alterações exige uma conta com escrita.', 'sempre'));
  const achados = (r?.servicos || []).slice().sort((a, b) => (a.grau === b.grau ? 0 : a.grau === 'confirmado' ? -1 : 1));
  for (const a of achados) {
    const sv = servicoDoCartao(a.servico);
    if (!sv) continue;
    const existente = tem.get(sv);
    if (existente) {
      // Um indício que virou confirmado sobe o grau do cartão; o preenchido fica.
      if (existente.grau === 'indicio' && a.grau === 'confirmado') { existente.grau = 'confirmado'; existente.motivo = motivoDe(a.provas) || existente.motivo; }
      continue;
    }
    add(cartaoNovo(sv, sv === a.servico ? a.nome : guiaDe(sv).nome, motivoDe(a.provas), a.grau));
  }
  // Campos novos de um guia que cresceu entram vazios; os já preenchidos ficam.
  for (const c of arq.cartoes) {
    const g = guiaDe(c.servico, c.nome);
    for (const f of g.campos) if (!c.campos[f.chave]) c.campos[f.chave] = { preenchido: false, previa: '', atualizado_em: '' };
  }
  arq.cartoes = arq.cartoes.concat(novos);
  gravarArquivo(root, arq);
  return arq.cartoes;
}

function faltandoDe(c: CartaoAcesso): string[] {
  const g = guiaDe(c.servico, c.nome);
  return g.campos.filter((f) => !c.campos[f.chave]?.preenchido).map((f) => f.rotulo);
}

/** Lista para a tela: estado + guia + campos que faltam. Nunca leva valor em claro. */
export function listarAcessos(root: string): CartaoView[] {
  if (!fs.existsSync(acessosPath(root))) gerarCartoes(root);
  return lerArquivo(root).cartoes.map((c) => ({ ...c, guia: guiaDe(c.servico, c.nome), faltando: faltandoDe(c) }));
}

function previaDe(valor: string, segredo: boolean): string {
  if (!segredo) return valor.length > 60 ? valor.slice(0, 57) + '…' : valor;
  if (/^\s*\{/.test(valor)) {
    try { const j = JSON.parse(valor); if (j && j.client_email) return `JSON · ${String(j.client_email).replace(/^(.{3}).*(@.*)$/, '$1…$2')}`; } catch {}
    return 'JSON · ••••';
  }
  return maskToken(valor);
}

export interface SalvarAcessoResult { ok: boolean; error?: string; cartao?: CartaoView }

/**
 * Salva os valores de um cartão. Campo vazio não apaga o que já estava. O
 * cartão vira «preenchido» quando todos os campos têm valor.
 */
export function salvarAcesso(root: string, servico: string, valores: Record<string, string>): SalvarAcessoResult {
  const arq = lerArquivo(root);
  let c = arq.cartoes.find((x) => x.servico === servico);
  if (!c) { c = cartaoNovo(servico, servico, 'Cadastrado à mão.', 'indicio'); arq.cartoes.push(c); }
  const g = guiaDe(c.servico, c.nome);
  const cofre = lerCofre(root);
  const sv = (cofre.servicos[servico] = cofre.servicos[servico] || {});
  let mudou = 0;
  for (const f of g.campos) {
    const v = String((valores || {})[f.chave] ?? '').trim();
    if (!v) continue;
    sv[f.chave] = cifrar(v);
    const previa = servico === 'github' && f.chave === 'conta' ? (contasGithub().find((a) => a.id === v)?.rotulo || v) : previaDe(v, f.segredo);
    c.campos[f.chave] = { preenchido: true, previa, atualizado_em: now() };
    mudou++;
  }
  if (!mudou) return { ok: false, error: 'Nenhum valor para salvar.' };
  gravarCofre(root, cofre);
  const falta = faltandoDe(c);
  if (!falta.length) c.situacao = 'preenchido';
  else if (c.situacao === 'nao_se_aplica') c.situacao = 'pendente';
  delete c.conferido;
  gravarArquivo(root, arq);
  return { ok: true, cartao: { ...c, guia: g, faltando: falta } };
}

export function mudarSituacao(root: string, servico: string, situacao: SituacaoAcesso, nota?: string): SalvarAcessoResult {
  if (!['pendente', 'preenchido', 'pedir_ao_cliente', 'nao_se_aplica'].includes(situacao)) return { ok: false, error: 'Situação inválida.' };
  const arq = lerArquivo(root);
  const c = arq.cartoes.find((x) => x.servico === servico);
  if (!c) return { ok: false, error: 'Cartão não encontrado.' };
  if (situacao === 'preenchido' && faltandoDe(c).length) return { ok: false, error: 'Ainda faltam campos: ' + faltandoDe(c).join(', ') + '.' };
  c.situacao = situacao;
  if (nota != null) c.nota = String(nota).slice(0, 500);
  gravarArquivo(root, arq);
  return { ok: true, cartao: { ...c, guia: guiaDe(c.servico, c.nome), faltando: faltandoDe(c) } };
}

/** Apaga os valores de um cartão (o cartão fica, pendente). */
export function removerAcesso(root: string, servico: string): SalvarAcessoResult {
  const arq = lerArquivo(root);
  const c = arq.cartoes.find((x) => x.servico === servico);
  if (!c) return { ok: false, error: 'Cartão não encontrado.' };
  const cofre = lerCofre(root);
  delete cofre.servicos[servico];
  gravarCofre(root, cofre);
  for (const k of Object.keys(c.campos)) c.campos[k] = { preenchido: false, previa: '', atualizado_em: '' };
  c.situacao = 'pendente';
  delete c.conferido;
  gravarArquivo(root, arq);
  return { ok: true, cartao: { ...c, guia: guiaDe(c.servico, c.nome), faltando: faltandoDe(c) } };
}

/** Valor em claro de um campo deste projeto. Só no processo main; nunca em log nem em pedido a agente. */
export function lerSegredoDoProjeto(root: string, servico: string, chave: string): string {
  const raw = lerCofre(root).servicos[servico]?.[chave];
  return raw ? decifrar(raw) : '';
}

type Conferidor = (servico: string, token: string) => Promise<string>;

const conferidorPadrao: Conferidor = async (servico, token) => {
  if (servico === 'github') { const u = await fetchGithubUser(token); return u.login; }
  if (servico === 'vercel' || servico === 'supabase' || servico === 'netlify') { const u = await fetchProviderUser(servico, token); return [u.login, u.detail].filter(Boolean).join(' · '); }
  throw new Error('Sem conferência para este serviço.');
};

/**
 * Confere o cartão na API do serviço (Vercel, Supabase, Netlify, GitHub). Os
 * outros ficam «preenchido, sem conferência». O token vai só no cabeçalho.
 */
export async function conferirAcesso(root: string, servico: string, conferir: Conferidor = conferidorPadrao): Promise<SalvarAcessoResult> {
  const arq = lerArquivo(root);
  const c = arq.cartoes.find((x) => x.servico === servico);
  if (!c) return { ok: false, error: 'Cartão não encontrado.' };
  const g = guiaDe(c.servico, c.nome);
  if (!g.confere) return { ok: false, error: 'Este serviço fica «preenchido, sem conferência».' };
  let token = '';
  if (servico === 'github') {
    const id = lerSegredoDoProjeto(root, 'github', 'conta');
    token = id ? getGitAccountToken(id) : '';
  } else token = lerSegredoDoProjeto(root, servico, 'token');
  if (!token) return { ok: false, error: 'Preencha o token antes de conferir.' };
  try {
    const det = await conferir(servico, token);
    c.conferido = { ok: true, em: now(), detalhe: det };
  } catch (e: any) {
    c.conferido = { ok: false, em: now(), detalhe: String(e?.message || e).split(token).join('••••') };
  }
  gravarArquivo(root, arq);
  return { ok: !!c.conferido.ok, error: c.conferido.ok ? undefined : c.conferido.detalhe, cartao: { ...c, guia: g, faltando: faltandoDe(c) } };
}

/** Contas do GitHub do cofre, para o cartão do GitHub escolher uma (sem token). */
export function contasGithub(): Array<{ id: string; rotulo: string }> {
  try { return listGitAccounts().map((a) => ({ id: a.id, rotulo: `${a.label} · ${a.login}` })); } catch { return []; }
}

/** Pendentes (para o número da aba): pendente ou pedir ao cliente. */
export function pendentesDeAcesso(root: string): number {
  return lerArquivo(root).cartoes.filter((c) => c.situacao === 'pendente' || c.situacao === 'pedir_ao_cliente').length;
}
