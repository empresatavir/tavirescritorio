/**
 * Credenciais de deploy e dados (Vercel, Supabase, Netlify) no cofre desta máquina.
 *
 * Mesmo contrato das contas do GitHub (gitAccounts.ts): o token é colado pelo
 * usuário, conferido na API do provedor, cifrado com cofreCripto e gravado em
 * db/credentials.json. A tela só recebe a conta, um detalhe e a prévia mascarada.
 * O token em claro só sai por getCredentialToken, no processo main.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { cifrar, decifrar } from './cofreCripto';
import { maskToken } from './gitAccounts';

export type CredentialProvider = 'vercel' | 'supabase' | 'netlify';

export const CREDENTIAL_PROVIDERS: Record<CredentialProvider, { name: string; tokenUrl: string; hint: string }> = {
  vercel: { name: 'Vercel', tokenUrl: 'https://vercel.com/account/settings/tokens', hint: 'Deploy de LPs, ofertas e apps web.' },
  supabase: { name: 'Supabase', tokenUrl: 'https://supabase.com/dashboard/account/tokens', hint: 'Banco, autenticação e funções dos projetos.' },
  netlify: { name: 'Netlify', tokenUrl: 'https://app.netlify.com/user/applications#personal-access-tokens', hint: 'Deploy de sites estáticos.' },
};

interface StoredCredential {
  token: string; // cifrado (v2:)
  login: string;
  name: string;
  detail: string;
  preview: string;
  updated_at: string;
}

export interface CredentialView {
  provider: CredentialProvider;
  name: string;
  hint: string;
  connected: boolean;
  login: string;
  account: string;
  detail: string;
  preview: string;
  updated_at: string;
}

export interface CredentialResult {
  ok: boolean;
  error?: string;
  credential?: CredentialView;
  credentials: CredentialView[];
}

export interface ProviderUser {
  login: string;
  name: string;
  detail: string;
}

function storePath(): string {
  const dir = path.join(process.cwd(), 'db');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, 'credentials.json');
}

function readStore(): Partial<Record<CredentialProvider, StoredCredential>> {
  try {
    const data = JSON.parse(readFileSync(storePath(), 'utf8'));
    return data?.providers && typeof data.providers === 'object' ? data.providers : {};
  } catch {
    return {};
  }
}

function writeStore(providers: Partial<Record<CredentialProvider, StoredCredential>>): void {
  writeFileSync(storePath(), JSON.stringify({ providers }, null, 2), 'utf8');
}

export function isProvider(p: unknown): p is CredentialProvider {
  return p === 'vercel' || p === 'supabase' || p === 'netlify';
}

function view(provider: CredentialProvider, c?: StoredCredential): CredentialView {
  const meta = CREDENTIAL_PROVIDERS[provider];
  return {
    provider,
    name: meta.name,
    hint: meta.hint,
    connected: !!c,
    login: c?.login || '',
    account: c?.name || '',
    detail: c?.detail || '',
    preview: c?.preview || '',
    updated_at: c?.updated_at || '',
  };
}

export function listCredentials(): CredentialView[] {
  const store = readStore();
  return (Object.keys(CREDENTIAL_PROVIDERS) as CredentialProvider[]).map((p) => view(p, store[p]));
}

async function getJson(url: string, token: string): Promise<{ status: number; json: any }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'TAVIR-Escritorio' },
    signal: AbortSignal.timeout(15000),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

/** Confere o token na API do provedor. O token vai só no cabeçalho. */
export async function fetchProviderUser(provider: CredentialProvider, token: string): Promise<ProviderUser> {
  const name = CREDENTIAL_PROVIDERS[provider].name;
  const refuse = (status: number) => {
    if (status === 401 || status === 403) throw new Error(`Token recusado pela ${name} (inválido, expirado ou sem permissão).`);
    throw new Error(`${name} respondeu ${status}.`);
  };
  if (provider === 'vercel') {
    const r = await getJson('https://api.vercel.com/v2/user', token);
    if (r.status !== 200) refuse(r.status);
    const u = r.json?.user || {};
    return { login: String(u.username || u.email || ''), name: String(u.name || u.username || ''), detail: String(u.email || '') };
  }
  if (provider === 'netlify') {
    const r = await getJson('https://api.netlify.com/api/v1/user', token);
    if (r.status !== 200) refuse(r.status);
    const u = r.json || {};
    return { login: String(u.slug || u.email || ''), name: String(u.full_name || u.slug || ''), detail: String(u.email || '') };
  }
  // Supabase não tem rota de "quem sou eu": a lista de projetos prova o acesso.
  const r = await getJson('https://api.supabase.com/v1/projects', token);
  if (r.status !== 200) refuse(r.status);
  const list = Array.isArray(r.json) ? r.json : [];
  const orgs = new Set(list.map((p: any) => p?.organization_id).filter(Boolean));
  return {
    login: `${list.length} projeto(s)`,
    name: list.length ? String(list[0]?.name || '') : '',
    detail: orgs.size ? `${orgs.size} organização(ões)` : 'sem projetos ainda',
  };
}

export async function saveCredential(
  providerRaw: string,
  tokenRaw: string,
  validate: (provider: CredentialProvider, token: string) => Promise<ProviderUser> = fetchProviderUser,
): Promise<CredentialResult> {
  if (!isProvider(providerRaw)) return { ok: false, error: 'Provedor desconhecido.', credentials: listCredentials() };
  const provider = providerRaw;
  const token = String(tokenRaw || '').trim();
  if (!token) return { ok: false, error: 'Cole o token.', credentials: listCredentials() };
  if (/\s/.test(token)) return { ok: false, error: 'O token não pode ter espaços.', credentials: listCredentials() };
  let user: ProviderUser;
  try {
    user = await validate(provider, token);
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), credentials: listCredentials() };
  }
  const store = readStore();
  store[provider] = {
    token: cifrar(token),
    login: user.login,
    name: user.name,
    detail: user.detail,
    preview: maskToken(token),
    updated_at: new Date().toISOString(),
  };
  writeStore(store);
  return { ok: true, credential: view(provider, store[provider]), credentials: listCredentials() };
}

export function removeCredential(providerRaw: string): CredentialResult {
  if (!isProvider(providerRaw)) return { ok: false, error: 'Provedor desconhecido.', credentials: listCredentials() };
  const store = readStore();
  delete store[providerRaw];
  writeStore(store);
  return { ok: true, credentials: listCredentials() };
}

export async function testCredential(
  providerRaw: string,
  validate: (provider: CredentialProvider, token: string) => Promise<ProviderUser> = fetchProviderUser,
): Promise<CredentialResult> {
  if (!isProvider(providerRaw)) return { ok: false, error: 'Provedor desconhecido.', credentials: listCredentials() };
  const store = readStore();
  const c = store[providerRaw];
  if (!c) return { ok: false, error: 'Nada guardado para este provedor.', credentials: listCredentials() };
  const token = decifrar(c.token);
  if (!token) return { ok: false, error: 'Não consegui abrir o token no cofre desta máquina. Guarde de novo.', credentials: listCredentials() };
  try {
    const user = await validate(providerRaw, token);
    Object.assign(c, { login: user.login, name: user.name, detail: user.detail, updated_at: new Date().toISOString() });
    writeStore(store);
    return { ok: true, credential: view(providerRaw, c), credentials: listCredentials() };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), credential: view(providerRaw, c), credentials: listCredentials() };
  }
}

/** Só no main: token em claro para quando a Fábrica fizer deploy. */
export function getCredentialToken(provider: CredentialProvider): string {
  const c = readStore()[provider];
  return c ? decifrar(c.token) : '';
}
