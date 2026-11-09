/**
 * Branch por ciclo do trilho de alteração e publicação do ciclo.
 *
 * Cada ciclo trabalha numa branch local tavir/ciclo-N-<assunto>, onde caem os
 * commits por passo. Quando o item de validação passa no QA e na segurança, o
 * CEO publica: com remoto no GitHub abre PR (push com o token da conta, por
 * variável de ambiente); sem remoto junta na branch principal com --no-ff.
 * Nada aqui roda sozinho: publicar é sempre um clique do CEO.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gitAuthEnv, scrubToken } from './gitAccounts';

export interface CycleBranch {
  name: string;
  base: string;
  created_at: string;
  /** true quando o CEO preferiu seguir na branch atual, sem branch do ciclo. */
  here?: boolean;
  /** stash criado para tirar alterações soltas antes de trocar de branch. */
  stash?: string;
}

export interface CyclePublish {
  kind: 'pr' | 'merge';
  at: string;
  url?: string;
  number?: number;
  sha?: string;
  account?: string;
  repo?: string;
}

export interface GithubRepo {
  owner: string;
  repo: string;
}

function git(cwd: string, args: string[], env?: Record<string, string>, timeout = 30000): string {
  return execFileSync('git', args, {
    cwd,
    windowsHide: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    env: env ? { ...process.env, ...env } : process.env,
  }).trim();
}

function gitTry(cwd: string, args: string[]): string {
  try {
    return git(cwd, args);
  } catch {
    return '';
  }
}

function errText(err: any): string {
  return String(err?.stderr || err?.message || err).trim().split(/\r?\n/).filter(Boolean).slice(-3).join(' ').slice(0, 400);
}

export function isGitRepo(root: string): boolean {
  return existsSync(join(root, '.git')) && gitTry(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
}

export function currentBranch(root: string): string {
  return gitTry(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

/** Pastas que a própria Fábrica escreve: não contam como alteração solta do projeto. */
const OWN = /^(\.tavir|qa|context|memory)\//;

/** Arquivos versionados com alteração pendente. Arquivo novo (não versionado) não trava. */
export function dirtyTracked(root: string): string[] {
  let out = '';
  try {
    // -z: sem aspas nem trim que come o primeiro espaço do status.
    out = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=no'], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  } catch {
    return [];
  }
  const parts = out.split('\0');
  const files: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    files.push(entry.slice(3));
    if (entry[0] === 'R' || entry[0] === 'C') i += 1; // rename/cópia: o nome antigo vem no campo seguinte
  }
  return files.filter((p) => !OWN.test(p));
}

export function slugify(text: string, max = 32): string {
  const s = String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (s.slice(0, max).replace(/-+$/g, '') || 'ajuste');
}

export function cycleBranchName(cycleNo: number, title: string): string {
  return `tavir/ciclo-${Math.max(1, Math.floor(cycleNo) || 1)}-${slugify(title)}`;
}

function branchExists(root: string, name: string): boolean {
  return !!gitTry(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]);
}

function uniqueBranch(root: string, name: string): string {
  if (!branchExists(root, name)) return name;
  for (let i = 2; i < 100; i += 1) if (!branchExists(root, `${name}-${i}`)) return `${name}-${i}`;
  return `${name}-${Date.now()}`;
}

export type EnsureBranchResult =
  | { ok: true; branch: CycleBranch | null; created: boolean; skipped?: string }
  | { ok: false; dirty?: string[]; error: string; branch: CycleBranch | null };

/**
 * Garante que o ciclo está na branch dele. Cria na primeira execução com mudança;
 * volta para ela se alguém trocou de branch. Com alteração solta em arquivo
 * versionado, para e devolve a lista para o CEO decidir.
 */
export function ensureCycleBranch(
  root: string,
  current: CycleBranch | null | undefined,
  opts: { cycleNo: number; title: string; resolve?: 'stash' | 'here' },
): EnsureBranchResult {
  if (!isGitRepo(root)) return { ok: true, branch: current || null, created: false, skipped: 'pasta sem git' };
  const head = currentBranch(root);
  if (!head || head === 'HEAD') return { ok: false, branch: current || null, error: 'O projeto está com HEAD solto (fora de uma branch). Volte para uma branch antes de seguir.' };
  if (current?.here) return { ok: true, branch: current, created: false };
  if (current?.name && head === current.name) return { ok: true, branch: current, created: false };
  if (!gitTry(root, ['rev-parse', '--verify', '--quiet', 'HEAD'])) {
    return { ok: true, branch: current || null, created: false, skipped: 'repositório sem nenhum commit' };
  }

  const dirty = dirtyTracked(root);
  let stash: string | undefined;
  if (dirty.length) {
    if (opts.resolve === 'here') {
      const branch: CycleBranch = { name: head, base: head, created_at: new Date().toISOString(), here: true };
      return { ok: true, branch, created: false };
    }
    if (opts.resolve !== 'stash') {
      const where = current?.name ? `voltar para ${current.name}` : 'abrir a branch do ciclo';
      return { ok: false, dirty, branch: current || null, error: `Há ${dirty.length} arquivo(s) alterado(s) fora do trilho em ${head}. Decida antes de ${where}.` };
    }
    try {
      git(root, ['stash', 'push', '-m', `tavir: alterações soltas antes do ciclo (${head})`, '--', ...dirty]);
      stash = gitTry(root, ['rev-parse', '--short', 'stash@{0}']) || 'stash@{0}';
    } catch (err) {
      return { ok: false, dirty, branch: current || null, error: `Não consegui guardar as alterações soltas: ${errText(err)}` };
    }
  }

  try {
    if (current?.name && branchExists(root, current.name)) {
      git(root, ['checkout', '-q', current.name]);
      return { ok: true, branch: { ...current, ...(stash ? { stash } : {}) }, created: false };
    }
    const name = uniqueBranch(root, cycleBranchName(opts.cycleNo, opts.title));
    git(root, ['checkout', '-q', '-b', name]);
    return { ok: true, created: true, branch: { name, base: head, created_at: new Date().toISOString(), ...(stash ? { stash } : {}) } };
  } catch (err) {
    return { ok: false, branch: current || null, error: `Não consegui trocar de branch: ${errText(err)}` };
  }
}

export interface CycleCommit {
  sha: string;
  subject: string;
}

export function cycleCommits(root: string, branch: CycleBranch): CycleCommit[] {
  if (!branch?.name || branch.here) return [];
  const out = gitTry(root, ['log', '--format=%h%x09%s', `${branch.base}..${branch.name}`]);
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const [sha, ...rest] = l.split('\t');
      return { sha, subject: rest.join('\t') };
    });
}

export function cycleDiffStat(root: string, branch: CycleBranch): string {
  if (!branch?.name || branch.here) return '';
  return gitTry(root, ['diff', '--stat', '--stat-width=100', `${branch.base}...${branch.name}`]);
}

/** origin no GitHub (https ou ssh). Outro host ou sem remoto: null. */
export function githubRemote(root: string): GithubRepo | null {
  const url = gitTry(root, ['remote', 'get-url', 'origin']);
  const m = url.match(/github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export function hasAnyRemote(root: string): boolean {
  return !!gitTry(root, ['remote']);
}

// ------------------------------------------------------------------ GitHub

const API = 'https://api.github.com';

async function gh(token: string, method: string, url: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TAVIR-Escritorio',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

/** A conta enxerga o repositório e pode fazer push? */
export async function checkRepoAccess(token: string, repo: GithubRepo): Promise<{ ok: boolean; error?: string; defaultBranch?: string }> {
  const r = await gh(token, 'GET', `/repos/${repo.owner}/${repo.repo}`);
  if (r.status === 404) return { ok: false, error: `A conta não enxerga ${repo.owner}/${repo.repo}. Use a conta certa ou peça acesso ao repositório.` };
  if (r.status === 401) return { ok: false, error: 'Token recusado pelo GitHub. Revalide a conta em Configurações › Contas e cofre.' };
  if (r.status !== 200) return { ok: false, error: `GitHub respondeu ${r.status} ao consultar o repositório.` };
  if (r.json?.permissions && !r.json.permissions.push) {
    return { ok: false, error: `A conta só tem leitura em ${repo.owner}/${repo.repo}. Precisa de permissão de escrita para abrir PR.` };
  }
  return { ok: true, defaultBranch: r.json?.default_branch };
}

export interface PublishPrInput {
  root: string;
  branch: CycleBranch;
  repo: GithubRepo;
  token: string;
  title: string;
  body: string;
}

export async function pushAndOpenPr(input: PublishPrInput): Promise<{ ok: boolean; error?: string; url?: string; number?: number; existed?: boolean }> {
  const { root, branch, repo, token } = input;
  const access = await checkRepoAccess(token, repo);
  if (!access.ok) return { ok: false, error: access.error };
  // URL https explícita: funciona mesmo com origin em ssh, e o token vai só no cabeçalho.
  try {
    git(root, ['push', '--porcelain', `https://github.com/${repo.owner}/${repo.repo}.git`, `refs/heads/${branch.name}:refs/heads/${branch.name}`], gitAuthEnv(token), 180000);
  } catch (err) {
    return { ok: false, error: `Push recusado: ${scrubToken(errText(err), token)}` };
  }
  // Base do PR: a branch de onde o ciclo saiu, se existir no remoto; senão a padrão do repositório.
  let base = branch.base;
  const baseRef = await gh(token, 'GET', `/repos/${repo.owner}/${repo.repo}/branches/${encodeURIComponent(base)}`);
  if (baseRef.status !== 200 && access.defaultBranch) base = access.defaultBranch;
  const r = await gh(token, 'POST', `/repos/${repo.owner}/${repo.repo}/pulls`, {
    title: input.title,
    head: branch.name,
    base,
    body: input.body,
    maintainer_can_modify: true,
  });
  if (r.status === 201) return { ok: true, url: r.json.html_url, number: r.json.number };
  if (r.status === 422) {
    const open = await gh(token, 'GET', `/repos/${repo.owner}/${repo.repo}/pulls?state=open&head=${encodeURIComponent(`${repo.owner}:${branch.name}`)}`);
    const pr = Array.isArray(open.json) ? open.json[0] : null;
    if (pr) return { ok: true, url: pr.html_url, number: pr.number, existed: true };
    const why = (r.json?.errors || []).map((e: any) => e?.message).filter(Boolean).join('; ') || r.json?.message;
    return { ok: false, error: `GitHub não abriu o PR: ${why || 'sem diferença entre as branches'}` };
  }
  return { ok: false, error: `GitHub respondeu ${r.status} ao abrir o PR${r.json?.message ? `: ${r.json.message}` : ''}.` };
}

/** Sem remoto: junta o ciclo na branch de origem com --no-ff e fica nela. */
export function mergeCycleLocal(root: string, branch: CycleBranch, message: string, identity?: Record<string, string>): { ok: boolean; error?: string; sha?: string } {
  if (branch.here) return { ok: false, error: 'Este ciclo rodou direto na branch atual; não há o que juntar.' };
  const dirty = dirtyTracked(root);
  if (dirty.length) return { ok: false, error: `Há ${dirty.length} arquivo(s) alterado(s) sem commit (${dirty.slice(0, 3).join(', ')}). Resolva antes de juntar.` };
  try {
    git(root, ['checkout', '-q', branch.base]);
  } catch (err) {
    return { ok: false, error: `Não consegui ir para ${branch.base}: ${errText(err)}` };
  }
  try {
    git(root, ['merge', '--no-ff', '-q', '-m', message, branch.name], identity, 60000);
    return { ok: true, sha: gitTry(root, ['rev-parse', '--short', 'HEAD']) };
  } catch (err) {
    gitTry(root, ['merge', '--abort']);
    gitTry(root, ['checkout', '-q', branch.name]);
    return { ok: false, error: `Conflito ao juntar em ${branch.base}; nada foi alterado. ${errText(err)}` };
  }
}

/** Depois de publicado, o próximo ciclo sai da branch de origem. Só troca se estiver limpo. */
export function returnToBase(root: string, branch: CycleBranch | null | undefined): boolean {
  if (!branch?.base || branch.here || !isGitRepo(root)) return false;
  if (currentBranch(root) === branch.base) return true;
  if (dirtyTracked(root).length) return false;
  return !!(gitTry(root, ['checkout', '-q', branch.base]) || currentBranch(root) === branch.base);
}
