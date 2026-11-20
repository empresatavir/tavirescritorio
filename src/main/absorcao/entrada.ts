/**
 * Entrada da absorção: link do GitHub (clone com a conta do cofre) ou pasta local (cópia).
 * O projeto sempre vai para a pasta do escopo: `tavir-interno/<slug>` ou `tavir-externo/<slug>`.
 * A pasta de origem nunca é tocada. Token nunca vai na URL do remote nem em mensagem.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { SURVEY_SKIP_DIRS, familiaSugerida } from '../../shared/absorcao';
import { detectar } from './detectores';

export const PASTA_ESCOPO = { interno: 'tavir-interno', externo: 'tavir-externo' } as const;
export type Escopo = keyof typeof PASTA_ESCOPO;

export function slugify(nome: string): string {
  return (
    String(nome || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'projeto'
  );
}

export function destinoDoEscopo(ownership: string, nome: string, base = process.cwd()): string {
  const escopo: Escopo = String(ownership || '').toLowerCase() === 'externo' ? 'externo' : 'interno';
  return path.join(base, PASTA_ESCOPO[escopo], slugify(nome));
}

export interface LinkGithub {
  dono: string;
  repo: string;
  url: string;
}

/** Aceita https://github.com/dono/repo(.git)(/) e git@github.com:dono/repo.git. Outro formato vira erro claro. */
export function lerLinkGithub(raw: string): LinkGithub {
  const t = String(raw || '').trim();
  const https = t.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  const ssh = t.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  const m = https || ssh;
  if (!m) throw new Error('Link não reconhecido. Use https://github.com/dono/repositorio ou git@github.com:dono/repositorio.git.');
  return { dono: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}.git` };
}

function vazio(dir: string): boolean {
  try {
    return fs.readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

export function garantirDestinoLivre(destino: string): void {
  if (fs.existsSync(destino) && !vazio(destino)) {
    throw new Error(`A pasta ${destino} já existe e não está vazia. Troque o nome do projeto.`);
  }
}

/** Clone de baixo nível: qualquer origem que o git aceite. Erro passa pelo `limpar`. */
export function clonarRepo(opts: { origem: string; destino: string; env?: Record<string, string>; limpar?: (t: string) => string; onLine?: (l: string) => void; timeoutMs?: number }): Promise<void> {
  const limpar = opts.limpar || ((t: string) => t);
  garantirDestinoLivre(opts.destino);
  fs.mkdirSync(path.dirname(opts.destino), { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['clone', '--progress', opts.origem, opts.destino], {
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...(opts.env || {}) },
    });
    let err = '';
    const onData = (buf: Buffer) => {
      const text = limpar(buf.toString('utf8'));
      err = (err + text).slice(-4000);
      for (const l of text.split(/[\r\n]+/).map((x) => x.trim()).filter(Boolean)) opts.onLine?.(l);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const timer = setTimeout(() => child.kill(), opts.timeoutMs || 15 * 60 * 1000);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(limpar(e.message)));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const last = err.split(/\r?\n/).map((l) => l.trim()).filter((l) => /fatal|error|erro|denied|not found|could not/i.test(l)).pop() || err.trim().split(/\r?\n/).pop() || `git clone saiu com código ${code}`;
        reject(new Error(limpar(last)));
      }
    });
  });
}

/** Clone do GitHub com o token da conta do cofre (por variável de ambiente, nunca na URL). */
export async function clonar(opts: { url: string; accountId?: string | null; destino: string; onLine?: (l: string) => void }): Promise<{ ok: true; url: string }> {
  const link = lerLinkGithub(opts.url);
  let token = '';
  if (opts.accountId) {
    const ga = require('../gitAccounts') as typeof import('../gitAccounts');
    token = ga.getGitAccountToken(opts.accountId);
    if (!token) throw new Error('A conta escolhida não tem token no cofre. Confira em Configurações › Contas e cofre.');
  }
  const ga = require('../gitAccounts') as typeof import('../gitAccounts');
  const limpar = (t: string) => (token ? ga.scrubToken(t, token) : t);
  await clonarRepo({ origem: link.url, destino: opts.destino, env: token ? ga.gitAuthEnv(token) : {}, limpar, onLine: opts.onLine });
  return { ok: true, url: link.url };
}

/** Cópia da pasta local para o escopo, sem dependências instaladas nem build. Mantém `.git` e `.env`. */
export function copiarPasta(opts: { origem: string; destino: string }): { arquivos: number } {
  const origem = path.resolve(opts.origem);
  const destino = path.resolve(opts.destino);
  if (!fs.existsSync(origem) || !fs.statSync(origem).isDirectory()) throw new Error(`Pasta não encontrada: ${origem}`);
  if (destino === origem || destino.startsWith(origem + path.sep)) throw new Error('O destino não pode ficar dentro da pasta de origem.');
  garantirDestinoLivre(destino);
  let arquivos = 0;
  fs.cpSync(origem, destino, {
    recursive: true,
    errorOnExist: false,
    force: false,
    filter: (src) => {
      if (src === origem) return true;
      const base = path.basename(src);
      let st: fs.Stats;
      try {
        st = fs.lstatSync(src);
      } catch {
        return false;
      }
      if (st.isDirectory()) return base === '.git' || !SURVEY_SKIP_DIRS.has(base);
      if (st.isFile()) arquivos++;
      return true;
    },
  });
  return { arquivos };
}

export interface Preenchimento {
  nome: string;
  stack: string[];
  familia: 'sy' | 'lp' | 'of';
  arquivos: number;
  pastas: number;
  servicos: number;
  remote: string;
}

/** Roda os detectores e devolve o que preenche o formulário. */
export function preencher(root: string): Preenchimento {
  const lev = detectar(root);
  return {
    nome: lev.nomeSugerido,
    stack: lev.stack,
    familia: familiaSugerida(lev.stack, lev.arquivos),
    arquivos: lev.arquivos,
    pastas: lev.pastas,
    servicos: lev.servicos.length,
    remote: lev.repositorios[0]?.remote || '',
  };
}

/**
 * Prepara a absorção: clona ou copia para a pasta do escopo e devolve o preenchimento.
 * Com `apenasLer`, só lê a origem (para sugerir o nome antes de copiar).
 */
export async function prepararAbsorcao(params: {
  fonte: 'link' | 'pasta';
  url?: string;
  accountId?: string | null;
  path?: string;
  nome?: string;
  ownership?: string;
  base?: string;
  onLine?: (l: string) => void;
}): Promise<{ ok: boolean; destino?: string; preenchido?: Preenchimento; repo_url?: string; error?: string }> {
  const log = (l: string) => params.onLine?.(l);
  try {
    if (params.fonte === 'link') {
      const link = lerLinkGithub(params.url || '');
      const nome = String(params.nome || '').trim() || link.repo;
      const destino = destinoDoEscopo(params.ownership || 'interno', nome, params.base);
      log(`Clonando ${link.dono}/${link.repo} para ${destino}`);
      const res = await clonar({ url: params.url || '', accountId: params.accountId, destino, onLine: log });
      log('Clone concluído. Lendo a pasta.');
      const preenchido = preencher(destino);
      log(`${preenchido.arquivos} arquivos · ${preenchido.stack.join(', ') || 'stack não identificada'} · ${preenchido.servicos} serviço(s)`);
      return { ok: true, destino, preenchido: { ...preenchido, nome: String(params.nome || '').trim() || link.repo }, repo_url: res.url };
    }
    const origem = path.resolve(String(params.path || '').trim());
    if (!params.path || !fs.existsSync(origem)) throw new Error('Informe uma pasta que exista no computador.');
    const nomeOrigem = String(params.nome || '').trim() || preencher(origem).nome || path.basename(origem);
    const destino = destinoDoEscopo(params.ownership || 'interno', nomeOrigem, params.base);
    log(`Copiando ${origem} para ${destino} (sem node_modules e sem pastas de build)`);
    const c = copiarPasta({ origem, destino });
    log(`${c.arquivos} arquivo(s) copiado(s). A pasta original ficou intacta.`);
    const preenchido = preencher(destino);
    log(`${preenchido.stack.join(', ') || 'stack não identificada'} · ${preenchido.servicos} serviço(s)`);
    return { ok: true, destino, preenchido: { ...preenchido, nome: nomeOrigem }, repo_url: preenchido.remote };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Falhou: ${msg}`);
    return { ok: false, error: msg };
  }
}
