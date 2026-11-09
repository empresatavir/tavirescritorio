/**
 * Contas do GitHub no cofre desta máquina (TAVIR e Pessoal).
 *
 * O token é colado pelo usuário, validado na API do GitHub e gravado cifrado
 * (cofreCripto) em db/git_accounts.json. O token só existe no processo main:
 * a tela recebe apenas login, rótulo e uma prévia mascarada. Para push e PR o
 * token entra por variável de ambiente, nunca na linha de comando nem em log.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cifrar, decifrar } from './cofreCripto';

export type GitAccountLabel = 'TAVIR' | 'Pessoal';

interface StoredAccount {
  id: string;
  label: GitAccountLabel;
  login: string;
  name: string;
  avatar: string;
  /** id numérico e e-mail público do GitHub: assinam os commits do projeto. */
  gh_id?: number;
  email?: string;
  token: string; // cifrado (v2:)
  scopes: string[];
  preview: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitAccountView {
  id: string;
  label: GitAccountLabel;
  login: string;
  name: string;
  avatar: string;
  /** Nome e e-mail que assinam os commits feitos com esta conta. */
  commitName: string;
  commitEmail: string;
  scopes: string[];
  preview: string;
  is_default: boolean;
  updated_at: string;
  /** false quando o token clássico não tem escopo repo (não consegue push/PR em repositório privado). */
  canPush: boolean;
}

export interface GitAccountResult {
  ok: boolean;
  error?: string;
  account?: GitAccountView;
  accounts: GitAccountView[];
}

export const TOKEN_PAGE_URL =
  'https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=TAVIR%20Escritorio';

const API = 'https://api.github.com';

function storePath(): string {
  const dir = path.join(process.cwd(), 'db');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, 'git_accounts.json');
}

function readStore(): StoredAccount[] {
  try {
    const data = JSON.parse(readFileSync(storePath(), 'utf8'));
    return Array.isArray(data?.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

function writeStore(accounts: StoredAccount[]): void {
  writeFileSync(storePath(), JSON.stringify({ accounts }, null, 2), 'utf8');
}

export function maskToken(token: string): string {
  const t = String(token || '');
  if (t.length <= 12) return '••••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function normLabel(label: unknown): GitAccountLabel {
  return /pessoal|personal/i.test(String(label || '')) ? 'Pessoal' : 'TAVIR';
}

function view(a: StoredAccount): GitAccountView {
  const scopes = a.scopes || [];
  return {
    id: a.id,
    label: a.label,
    login: a.login,
    name: a.name,
    avatar: a.avatar,
    ...commitIdentity(a),
    scopes,
    preview: a.preview,
    is_default: !!a.is_default,
    updated_at: a.updated_at,
    // Token fine-grained não informa escopos: confia e deixa o push dizer.
    canPush: scopes.length === 0 || scopes.includes('repo') || scopes.includes('public_repo'),
  };
}

export function listGitAccounts(): GitAccountView[] {
  return readStore().map(view);
}

export interface GithubUser {
  login: string;
  name: string;
  avatar: string;
  scopes: string[];
  id?: number;
  email?: string;
}

/**
 * Identidade dos commits: o e-mail público da conta ou, sem ele, o noreply do
 * GitHub (id+login@users.noreply.github.com), que o GitHub liga ao perfil.
 */
export function commitIdentity(a: { login: string; name?: string; gh_id?: number; email?: string }): { commitName: string; commitEmail: string } {
  const email = a.email || (a.gh_id ? `${a.gh_id}+${a.login}@users.noreply.github.com` : `${a.login}@users.noreply.github.com`);
  return { commitName: a.name || a.login, commitEmail: email };
}

/** Variáveis que fazem o git assinar com a conta, sem mexer no .git/config do projeto. */
export function commitIdentityEnv(account: { commitName: string; commitEmail: string } | null | undefined): Record<string, string> | undefined {
  if (!account) return undefined;
  return {
    GIT_AUTHOR_NAME: account.commitName,
    GIT_AUTHOR_EMAIL: account.commitEmail,
    GIT_COMMITTER_NAME: account.commitName,
    GIT_COMMITTER_EMAIL: account.commitEmail,
  };
}

/** Valida o token na API do GitHub. O token vai só no cabeçalho. */
export async function fetchGithubUser(token: string): Promise<GithubUser> {
  const res = await fetch(`${API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TAVIR-Escritorio',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) throw new Error('Token recusado pelo GitHub (inválido ou expirado).');
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}.`);
  const body: any = await res.json();
  const scopes = String(res.headers.get('x-oauth-scopes') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    login: String(body.login || ''),
    name: String(body.name || body.login || ''),
    avatar: String(body.avatar_url || ''),
    scopes,
    id: Number(body.id) || undefined,
    email: body.email ? String(body.email) : undefined,
  };
}

export async function addGitAccount(
  payload: { label?: string; token?: string },
  validate: (token: string) => Promise<GithubUser> = fetchGithubUser,
): Promise<GitAccountResult> {
  const token = String(payload?.token || '').trim();
  const label = normLabel(payload?.label);
  if (!token) return { ok: false, error: 'Cole o token do GitHub.', accounts: listGitAccounts() };
  if (/\s/.test(token)) return { ok: false, error: 'O token não pode ter espaços.', accounts: listGitAccounts() };
  let user: GithubUser;
  try {
    user = await validate(token);
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), accounts: listGitAccounts() };
  }
  if (!user.login) return { ok: false, error: 'GitHub não devolveu o login da conta.', accounts: listGitAccounts() };
  // Uma conta por rótulo: a TAVIR nova substitui a TAVIR anterior (o mesmo vale para Pessoal).
  const all = readStore();
  const prevOfLabel = all.find((a) => a.label === label);
  const accounts = all.filter((a) => a.label !== label || a.login.toLowerCase() === user.login.toLowerCase());
  const now = new Date().toISOString();
  let acc = accounts.find((a) => a.label === label);
  if (!acc && prevOfLabel?.is_default) accounts.forEach((a) => { a.is_default = false; });
  if (acc) {
    Object.assign(acc, { name: user.name, avatar: user.avatar, gh_id: user.id, email: user.email, scopes: user.scopes, token: cifrar(token), preview: maskToken(token), updated_at: now });
  } else {
    acc = {
      id: randomUUID(),
      label,
      login: user.login,
      name: user.name,
      avatar: user.avatar,
      gh_id: user.id,
      email: user.email,
      token: cifrar(token),
      scopes: user.scopes,
      preview: maskToken(token),
      is_default: !accounts.some((a) => a.is_default),
      created_at: now,
      updated_at: now,
    };
    accounts.push(acc);
  }
  writeStore(accounts);
  return { ok: true, account: view(acc), accounts: accounts.map(view) };
}

export function removeGitAccount(id: string): GitAccountResult {
  const accounts = readStore();
  const gone = accounts.find((a) => a.id === id);
  if (!gone) return { ok: false, error: 'Conta não encontrada.', accounts: accounts.map(view) };
  const rest = accounts.filter((a) => a.id !== id);
  if (gone.is_default && rest.length && !rest.some((a) => a.is_default)) rest[0].is_default = true;
  writeStore(rest);
  return { ok: true, accounts: rest.map(view) };
}

export function setDefaultGitAccount(id: string): GitAccountResult {
  const accounts = readStore();
  if (!accounts.some((a) => a.id === id)) return { ok: false, error: 'Conta não encontrada.', accounts: accounts.map(view) };
  accounts.forEach((a) => { a.is_default = a.id === id; });
  writeStore(accounts);
  return { ok: true, accounts: accounts.map(view) };
}

/** Revalida o token guardado (expirou? perdeu escopo?). */
export async function testGitAccount(
  id: string,
  validate: (token: string) => Promise<GithubUser> = fetchGithubUser,
): Promise<GitAccountResult> {
  const accounts = readStore();
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return { ok: false, error: 'Conta não encontrada.', accounts: accounts.map(view) };
  const token = decifrar(acc.token);
  if (!token) return { ok: false, error: 'Não consegui abrir o token no cofre desta máquina. Cadastre de novo.', accounts: accounts.map(view) };
  try {
    const user = await validate(token);
    Object.assign(acc, { login: user.login || acc.login, name: user.name, avatar: user.avatar, gh_id: user.id ?? acc.gh_id, email: user.email ?? acc.email, scopes: user.scopes, updated_at: new Date().toISOString() });
    writeStore(accounts);
    return { ok: true, account: view(acc), accounts: accounts.map(view) };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), account: view(acc), accounts: accounts.map(view) };
  }
}

/**
 * Contas gravadas antes do id/e-mail do GitHub entrarem no cofre: confere de novo
 * para a assinatura dos commits sair com o noreply certo (id+login).
 */
export async function backfillGitAccounts(
  validate: (token: string) => Promise<GithubUser> = fetchGithubUser,
): Promise<void> {
  for (const a of readStore().filter((x) => !x.gh_id)) {
    await testGitAccount(a.id, validate).catch(() => undefined);
  }
}

/** Só no main: devolve o token em claro para push/PR. */
export function getGitAccountToken(id: string): string {
  const acc = readStore().find((a) => a.id === id);
  return acc ? decifrar(acc.token) : '';
}

/**
 * Conta que publica o projeto: a escolhida no projeto (accountId) ou a que casa
 * com o perfil git dele ("TAVIR (Empresa)" / "Pessoal (Carlos)"), senão a padrão.
 */
export function resolveGitAccount(opts: { accountId?: string | null; profile?: string | null }): GitAccountView | null {
  const accounts = readStore();
  if (!accounts.length) return null;
  if (opts.accountId) {
    const hit = accounts.find((a) => a.id === opts.accountId);
    if (hit) return view(hit);
  }
  if (opts.profile) {
    const label = normLabel(opts.profile);
    const byLabel = accounts.filter((a) => a.label === label);
    if (byLabel.length) return view(byLabel.find((a) => a.is_default) || byLabel[0]);
  }
  return view(accounts.find((a) => a.is_default) || accounts[0]);
}

/**
 * Variáveis de ambiente para git push e gh com o token, sem pôr o token na
 * linha de comando (onde apareceria na lista de processos) nem no .git/config.
 */
export function gitAuthEnv(token: string): Record<string, string> {
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
    // Sem isso o Git Credential Manager pode atropelar o cabeçalho com outra conta.
    GIT_CONFIG_KEY_1: 'credential.helper',
    GIT_CONFIG_VALUE_1: '',
    GH_TOKEN: token,
    GITHUB_TOKEN: token,
    GH_PROMPT_DISABLED: '1',
  };
}

/** Remove qualquer pedaço do token de um texto antes de ir para tela ou log. */
export function scrubToken(text: string, token: string): string {
  let out = String(text || '');
  if (!token) return out;
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  for (const s of [token, basic]) out = out.split(s).join('••••');
  return out;
}
