import { randomUUID } from 'node:crypto';
import { RAIOX_CATALOG, RAIOX_REMOTE_STATUS, type RaioxCase, type RaioxRemoteStatus } from '../../shared/raiox';
import { getBundle } from '../credentials';
import { RaioxError, caseIdFromUuid, createCase } from './raioxRules';
import { listCases, writeCase } from './raioxStore';

const USER_AGENT = 'TAVIR-Escritorio-RaioX/1.0';
const HOST = 'skcbjwqajdovxlsxeszv.supabase.co';
const EDGE_CODE = /^[a-z][a-z0-9_]{1,79}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_MAX = { cliente: 160, status: 64, etapa: 64, criado_em: 64, atualizado_em: 64 };
const WRITE_LOCKED = 'Escrita no Supabase liberada só após o corte (CP-9).';
const NOT_CONFIGURED = 'A sincronização não usa o token da conta Supabase. Em Configurações, no cartão Raio-X Supabase, informe a URL do projeto e o segredo de sincronização.';
const SYNC_CONFIG = 'Sync Raio-X não configurado: confira URL e RAIOX_OFFICE_SYNC_SECRET no ambiente privado.';
const INVALID_SYNC = 'A função de sync Raio-X devolveu uma resposta inválida.';
const INVALID_REPLY = 'A ponte Supabase não respondeu corretamente. Não reenvie os dados agora.';
const NETWORK = 'A rede não conseguiu alcançar o projeto Supabase. Não reenvie os dados agora.';
const PAUSED = 'O endereço do projeto Supabase não existe no DNS. Em projetos gratuitos, isso normalmente indica que o projeto foi pausado; restaure-o no painel antes de tentar novamente.';

export interface RaioxSyncConfig {
  url: string;
  officeSyncSecret: string;
}

export interface SyncDeps {
  fetchImpl?: typeof fetch;
  now?: () => string;
  uuid?: () => string;
  root?: string;
  config?: () => RaioxSyncConfig | null;
  timeoutMs?: number;
}

interface RemoteCase {
  id: string;
  status: RaioxRemoteStatus;
  cliente: string;
  etapa: string;
  criado_em: string;
  atualizado_em: string;
}

function causeCode(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const cause = (err as { cause?: { code?: string } }).cause;
  if (cause && typeof cause.code === 'string') return cause.code;
  const code = (err as { code?: string }).code;
  return typeof code === 'string' ? code : '';
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError' || causeCode(err) === 'ABORT_ERR';
}

function httpMessage(status: number, edgeCode: string): string {
  const suffix = edgeCode ? ` Código: ${edgeCode}.` : '';
  if (status === 401 || status === 403) {
    return `A ponte Supabase recusou a autenticação interna. Verifique os segredos do projeto.${suffix}`;
  }
  if (status === 404) {
    return `A função do Raio X não está publicada no projeto Supabase configurado.${suffix}`;
  }
  if (status >= 500) {
    return `O Supabase não concluiu a etapa interna do Raio X. Não reenvie os dados agora.${suffix}`;
  }
  return `O Supabase recusou esta operação do Raio X.${suffix}`;
}

function networkMessage(err: unknown): string {
  if (isAbort(err)) return INVALID_REPLY;
  const code = causeCode(err);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return PAUSED;
  return NETWORK;
}

async function edgeCodeOf(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const candidate = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : '';
    return EDGE_CODE.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
}

function defaultConfig(): RaioxSyncConfig | null {
  const bundle = getBundle('raiox_supabase');
  if (!bundle) return null;
  return { url: bundle.url || '', officeSyncSecret: bundle.officeSyncSecret || '' };
}

function syncTarget(config: RaioxSyncConfig | null): { url: string; secret: string } {
  if (!config || !config.url || !config.officeSyncSecret) throw new RaioxError(NOT_CONFIGURED);
  let parsed: URL;
  try {
    parsed = new URL(config.url);
  } catch {
    throw new RaioxError(SYNC_CONFIG);
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.hostname !== HOST
    || config.officeSyncSecret.length < 32
  ) {
    throw new RaioxError(SYNC_CONFIG);
  }
  return { url: `${parsed.origin}/functions/v1/office-raiox-sync`, secret: config.officeSyncSecret };
}

async function edgeCall(opts: {
  url: string;
  method: 'GET' | 'POST';
  secret: string;
  secretHeader: string;
  body?: unknown;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<unknown> {
  const headers: Record<string, string> = {
    [opts.secretHeader]: opts.secret,
    'User-Agent': USER_AGENT,
  };
  let body: string | undefined;
  if (opts.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body ?? {});
  }
  let response: Response;
  try {
    response = await opts.fetchImpl(opts.url, {
      method: opts.method,
      headers,
      body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (err) {
    throw new RaioxError(networkMessage(err));
  }
  if (!response.ok) throw new RaioxError(httpMessage(response.status, await edgeCodeOf(response)));
  try {
    return await response.json();
  } catch {
    throw new RaioxError(INVALID_REPLY);
  }
}

function textField(row: Record<string, unknown>, key: keyof typeof FIELD_MAX): string {
  const value = row[key] == null ? '' : row[key];
  if (typeof value !== 'string' || value.length > FIELD_MAX[key] || value.includes('\u0000')) {
    throw new RaioxError(INVALID_SYNC);
  }
  return value;
}

function parseCases(payload: unknown): RemoteCase[] {
  if (!payload || typeof payload !== 'object') throw new RaioxError(INVALID_SYNC);
  const body = payload as { ok?: unknown; cases?: unknown; truncated?: unknown };
  if (body.ok !== true || !Array.isArray(body.cases) || body.cases.length > 500) throw new RaioxError(INVALID_SYNC);
  if (body.truncated !== undefined && typeof body.truncated !== 'boolean') throw new RaioxError(INVALID_SYNC);
  const seen = new Set<string>();
  return body.cases.map((row) => {
    if (!row || typeof row !== 'object') throw new RaioxError(INVALID_SYNC);
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.toLowerCase() : '';
    if (!UUID_RE.test(id) || seen.has(id)) throw new RaioxError(INVALID_SYNC);
    seen.add(id);
    const status = textField(item, 'status');
    if (!(RAIOX_REMOTE_STATUS as readonly string[]).includes(status)) throw new RaioxError(INVALID_SYNC);
    return {
      id,
      status: status as RaioxRemoteStatus,
      cliente: textField(item, 'cliente'),
      etapa: textField(item, 'etapa'),
      criado_em: textField(item, 'criado_em'),
      atualizado_em: textField(item, 'atualizado_em'),
    };
  });
}

function freshUuid(taken: Set<string>, uuid: () => string): string {
  let next = uuid();
  while (taken.has(caseIdFromUuid(next))) next = uuid();
  return next;
}

export async function syncCases(deps: SyncDeps = {}): Promise<{ ok: true; created: number; updated: number }> {
  const target = syncTarget((deps.config ?? defaultConfig)());
  const payload = await edgeCall({
    url: target.url,
    method: 'GET',
    secret: target.secret,
    secretHeader: 'x-raiox-office-sync-secret',
    fetchImpl: deps.fetchImpl ?? fetch,
    timeoutMs: deps.timeoutMs ?? 12_000,
  });
  const remote = parseCases(payload);
  const root = deps.root;
  if (!root) throw new RaioxError('Pasta privada do Raio-X indisponível.');
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const uuid = deps.uuid ?? randomUUID;
  const local = listCases(root);
  const byRemote = new Map(local.filter((item) => item.remote?.supabaseId).map((item) => [item.remote!.supabaseId, item]));
  const taken = new Set(local.map((item) => item.id));
  const mode = RAIOX_CATALOG.find((item) => item.id === 'diagnostico');
  let created = 0;
  let updated = 0;
  for (const item of remote) {
    const existing = byRemote.get(item.id);
    if (existing) {
      const next: RaioxCase = {
        ...existing,
        remote: { ...existing.remote!, status: item.status, syncedAt: now },
        updatedAt: now,
      };
      writeCase(root, next);
      updated += 1;
      continue;
    }
    const localUuid = taken.has(caseIdFromUuid(item.id)) ? freshUuid(taken, uuid) : item.id;
    const createdCase = createCase({
      company: item.cliente.trim() || 'Sem nome no formulário',
      objective: mode?.defaults.objective || '',
      decisionNeeded: mode?.defaults.decisionNeeded || '',
      mode: 'diagnostico',
      origin: 'formulario',
      consent: { kind: 'formulario', at: now, note: '' },
    }, now, localUuid);
    createdCase.remote = { supabaseId: item.id, status: item.status, syncedAt: now };
    writeCase(root, createdCase);
    taken.add(createdCase.id);
    created += 1;
  }
  return { ok: true, created, updated };
}

export function continueCase(): never {
  throw new RaioxError(WRITE_LOCKED);
}

export function reviewCase(): never {
  throw new RaioxError(WRITE_LOCKED);
}

export function deliveryCase(): never {
  throw new RaioxError(WRITE_LOCKED);
}

export function inviteCase(): never {
  throw new RaioxError(WRITE_LOCKED);
}
