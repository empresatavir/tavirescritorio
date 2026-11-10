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

interface StoreFile {
  providers?: Partial<Record<CredentialProvider, StoredCredential>>;
  bundles?: Partial<Record<BundleProvider, StoredBundle>>;
}

function readFile(): StoreFile {
  try {
    const data = JSON.parse(readFileSync(storePath(), 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeStore(providers: Partial<Record<CredentialProvider, StoredCredential>>): void {
  const all = readFile();
  writeFileSync(storePath(), JSON.stringify({ providers, bundles: all.bundles || {} }, null, 2), 'utf8');
}

function writeBundles(bundles: Partial<Record<BundleProvider, StoredBundle>>): void {
  const all = readFile();
  writeFileSync(storePath(), JSON.stringify({ providers: all.providers || {}, bundles }, null, 2), 'utf8');
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

/** Provedores com vários campos. O token único de Vercel, Supabase e Netlify não usa isto. */
export type BundleProvider = 'raiox_supabase' | 'resend' | 'rapidapi_local';

const BUNDLE_META: Record<BundleProvider, { name: string; hint: string }> = {
  raiox_supabase: {
    name: 'Raio-X Supabase',
    hint: 'URL e segredos da ponte de leitura. Cada segredo fica cifrado; a tela só mostra a prévia.',
  },
  rapidapi_local: {
    name: 'RapidAPI · Local Business Data',
    hint: 'Ficha do Google Maps, avaliações e concorrentes no Raio-X. Uma ou mais chaves separadas por vírgula; o app tenta a próxima quando uma não tem assinatura ou quota.',
  },
  resend: {
    name: 'Resend',
    hint: 'Conta de e-mail do Raio-X. A chave fica cifrada; remetente, resposta e modelo ficam em claro.',
  },
};

const BUNDLE_FIELDS: Record<BundleProvider, { key: string; label: string; secret: boolean }[]> = {
  raiox_supabase: [
    { key: 'url', label: 'URL do projeto', secret: false },
    { key: 'internalSecret', label: 'Segredo interno', secret: true },
    { key: 'reviewSecret', label: 'Segredo de revisão', secret: true },
    { key: 'deliverySecret', label: 'Segredo de entrega', secret: true },
    { key: 'inviteSecret', label: 'Segredo de convite', secret: true },
    { key: 'officeSyncSecret', label: 'Segredo de sincronização', secret: true },
  ],
  rapidapi_local: [
    { key: 'apiKeys', label: 'Chaves da RapidAPI', secret: true },
  ],
  resend: [
    { key: 'apiKey', label: 'Chave da API', secret: true },
    { key: 'from', label: 'Remetente', secret: false },
    { key: 'replyTo', label: 'Resposta para', secret: false },
    { key: 'templateId', label: 'Modelo', secret: false },
  ],
};

interface StoredBundle {
  values: Record<string, string>;
  updated_at: string;
}

export interface BundleFieldView {
  key: string;
  label: string;
  secret: boolean;
  /** Vazio para segredo. O valor em claro de um segredo nunca volta para a tela. */
  value: string;
  preview: string;
}

export interface BundleView {
  provider: BundleProvider;
  name: string;
  hint: string;
  connected: boolean;
  fields: BundleFieldView[];
  updated_at: string;
}

export interface BundleResult {
  ok: boolean;
  error?: string;
  bundle?: BundleView;
  bundles: BundleView[];
}

export function isBundleProvider(p: unknown): p is BundleProvider {
  return p === 'raiox_supabase' || p === 'resend' || p === 'rapidapi_local';
}

function readBundles(): Partial<Record<BundleProvider, StoredBundle>> {
  const bundles = readFile().bundles;
  return bundles && typeof bundles === 'object' ? bundles : {};
}

function bundleView(provider: BundleProvider, stored?: StoredBundle): BundleView {
  const meta = BUNDLE_META[provider];
  const values = stored?.values || {};
  const fields = BUNDLE_FIELDS[provider].map((field) => {
    const raw = values[field.key] || '';
    if (!field.secret) return { ...field, value: raw, preview: raw };
    const clear = raw ? decifrar(raw) : '';
    return { ...field, value: '', preview: clear ? maskToken(clear) : '' };
  });
  const connected = fields.every((field) => (field.secret ? !!field.preview : !!field.value));
  return { provider, name: meta.name, hint: meta.hint, connected, fields, updated_at: stored?.updated_at || '' };
}

export function listBundles(): BundleView[] {
  const store = readBundles();
  return (Object.keys(BUNDLE_META) as BundleProvider[]).map((provider) => bundleView(provider, store[provider]));
}

function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname;
  } catch {
    return false;
  }
}

export function saveBundle(providerRaw: string, input: Record<string, unknown> | null | undefined): BundleResult {
  if (!isBundleProvider(providerRaw)) return { ok: false, error: 'Provedor desconhecido.', bundles: listBundles() };
  const current = readBundles();
  const existing = current[providerRaw];
  const values: Record<string, string> = {};
  for (const field of BUNDLE_FIELDS[providerRaw]) {
    const text = typeof input?.[field.key] === 'string' ? String(input?.[field.key]).trim() : '';
    if (field.secret) {
      if (/[\r\n]/.test(text)) return { ok: false, error: `${field.label} não pode ter quebra de linha.`, bundles: listBundles() };
      if (!text) {
        const prev = existing?.values?.[field.key] || '';
        if (!prev) return { ok: false, error: `Informe ${field.label}.`, bundles: listBundles() };
        values[field.key] = prev;
        continue;
      }
      values[field.key] = cifrar(text);
      continue;
    }
    if (!text) return { ok: false, error: `Informe ${field.label}.`, bundles: listBundles() };
    if (field.key === 'url' && !httpsUrl(text)) return { ok: false, error: 'A URL do projeto precisa começar com https://.', bundles: listBundles() };
    if ((field.key === 'from' || field.key === 'replyTo') && !/@/.test(text)) {
      return { ok: false, error: `${field.label} precisa ser um e-mail.`, bundles: listBundles() };
    }
    values[field.key] = text;
  }
  current[providerRaw] = { values, updated_at: new Date().toISOString() };
  writeBundles(current);
  return { ok: true, bundle: bundleView(providerRaw, current[providerRaw]), bundles: listBundles() };
}

export function removeBundle(providerRaw: string): BundleResult {
  if (!isBundleProvider(providerRaw)) return { ok: false, error: 'Provedor desconhecido.', bundles: listBundles() };
  const current = readBundles();
  delete current[providerRaw];
  writeBundles(current);
  return { ok: true, bundles: listBundles() };
}

/** Só no main. Devolve os campos em claro, ou null se o provedor não está completo. */
export function getBundle(provider: BundleProvider): Record<string, string> | null {
  const stored = readBundles()[provider];
  if (!stored) return null;
  const out: Record<string, string> = {};
  for (const field of BUNDLE_FIELDS[provider]) {
    const raw = stored.values?.[field.key] || '';
    const clear = field.secret ? (raw ? decifrar(raw) : '') : raw;
    if (!clear) return null;
    out[field.key] = clear;
  }
  return out;
}
