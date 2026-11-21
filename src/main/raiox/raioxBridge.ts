import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_CATALOG, RAIOX_REMOTE_STATUS, type RaioxCase, type RaioxRemoteStatus } from '../../shared/raiox';
import { getBundle } from '../credentials';
import { RaioxError, caseIdFromUuid, createCase } from './raioxRules';
import { caseDir, listCases, writeCase } from './raioxStore';
import { assertReleased } from './releases';
import { createCasePayload, type InviteInput } from './optin';
import { repoRoot } from './raioxContext';
import { readVendorCatalog, recordVendor } from './vendors';
import { purgedRemoteIds } from './purge';

const USER_AGENT = 'TAVIR-Escritorio-RaioX/1.0';
const HOST = 'skcbjwqajdovxlsxeszv.supabase.co';
const EDGE_CODE = /^[a-z][a-z0-9_]{1,79}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_MAX = { cliente: 160, status: 64, etapa: 64, criado_em: 64, atualizado_em: 64 };
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
  repo?: string;
}

interface RemoteCase {
  id: string;
  status: RaioxRemoteStatus;
  cliente: string;
  etapa: string;
  criado_em: string;
  atualizado_em: string;
  emailVerified: boolean;
  revoked: boolean;
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
      // G-PR1 controle 4. Função antiga (sem o campo) conta como não confirmado.
      emailVerified: item.email_verificado === true,
      // G-PR1 controle 8. Revogação registrada no Supabase trava o caso local também.
      revoked: item.revogado === true,
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
  const catalog = readVendorCatalog(deps.repo ?? repoRoot());
  let created = 0;
  let updated = 0;
  // G-PR1 controle 7: caso expurgado não volta pelo sync, mesmo que o Supabase ainda o tenha.
  const purged = purgedRemoteIds(root);
  for (const item of remote) {
    if (purged.has(item.id)) continue;
    const existing = byRemote.get(item.id);
    if (existing) {
      const next: RaioxCase = {
        ...existing,
        // Revogação não volta atrás por sync: uma vez revogado, continua revogado.
        remote: { ...existing.remote!, status: item.status, syncedAt: now, emailVerified: item.emailVerified, revoked: item.revoked || existing.remote!.revoked === true },
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
    createdCase.remote = { supabaseId: item.id, status: item.status, syncedAt: now, emailVerified: item.emailVerified, revoked: item.revoked };
    // G-PR1 controle 6: caso que veio do formulário já passou por Vercel, Supabase e o aviso do Telegram.
    let withVendors: RaioxCase = createdCase;
    for (const [vendor, use] of [['vercel', 'formulário'], ['supabase', 'caso remoto'], ['telegram', 'aviso de formulário recebido']] as const) {
      withVendors = recordVendor(withVendors, catalog, vendor, use, now);
    }
    writeCase(root, withVendors);
    taken.add(createdCase.id);
    created += 1;
  }
  return { ok: true, created, updated };
}

// ---------------------------------------------------------------------------
// F8 T8.1 — escrita no Supabase. Cada chamada passa por:
//  1. liberação "liberado CP-10" gravada pelo clique do Carlos (R5);
//  2. URL do projeto conferida (só o host do Raio-X, HTTPS) e segredo da função com 32+ caracteres;
//  3. resposta conferida campo a campo; código de erro da função só no vocabulário estrito.
// Nenhuma mensagem leva segredo, corpo bruto ou detalhe SQL.
// ---------------------------------------------------------------------------

export type RaioxWriteFunction = 'create-case' | 'continue-case' | 'review-case' | 'delivery-case' | 'invite-case';

export interface RaioxWriteConfig {
  url: string;
  internalSecret: string;
  reviewSecret: string;
  deliverySecret: string;
  inviteSecret: string;
}

export interface WriteDeps {
  root: string;
  fetchImpl?: typeof fetch;
  config?: () => RaioxWriteConfig | null;
  now?: () => string;
  timeoutMs?: number;
}

const WRITE_NOT_CONFIGURED = 'Ponte Supabase do Raio-X sem os segredos de escrita. Em Configurações › Raio-X Supabase, preencha URL e segredos.';
const WRITE_INVALID = 'A função do Raio-X devolveu uma resposta fora do formato. Não reenvie os dados agora.';
const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WRITE_SECRET: Record<RaioxWriteFunction, { key: keyof RaioxWriteConfig; header: string }> = {
  'create-case': { key: 'internalSecret', header: 'x-raiox-internal-secret' },
  'continue-case': { key: 'internalSecret', header: 'x-raiox-internal-secret' },
  'review-case': { key: 'reviewSecret', header: 'x-raiox-review-secret' },
  'delivery-case': { key: 'deliverySecret', header: 'x-raiox-delivery-secret' },
  'invite-case': { key: 'inviteSecret', header: 'x-raiox-invite-secret' },
};

function defaultWriteConfig(): RaioxWriteConfig | null {
  const bundle = getBundle('raiox_supabase');
  if (!bundle) return null;
  return {
    url: bundle.url || '',
    internalSecret: bundle.internalSecret || '',
    reviewSecret: bundle.reviewSecret || '',
    deliverySecret: bundle.deliverySecret || '',
    inviteSecret: bundle.inviteSecret || '',
  };
}

function writeTarget(config: RaioxWriteConfig | null, fn: RaioxWriteFunction): { url: string; secret: string; header: string } {
  const spec = WRITE_SECRET[fn];
  if (!config || !config.url || !config[spec.key]) throw new RaioxError(WRITE_NOT_CONFIGURED);
  let parsed: URL;
  try {
    parsed = new URL(config.url);
  } catch {
    throw new RaioxError(WRITE_NOT_CONFIGURED);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hostname !== HOST
      || String(config[spec.key]).length < 32) {
    throw new RaioxError(WRITE_NOT_CONFIGURED);
  }
  return { url: `${parsed.origin}/functions/v1/${fn}`, secret: String(config[spec.key]), header: spec.header };
}

async function edgeWrite(fn: RaioxWriteFunction, body: Record<string, unknown>, deps: WriteDeps): Promise<Record<string, unknown>> {
  assertReleased(deps.root, 'escritaSupabase');
  const target = writeTarget((deps.config ?? defaultWriteConfig)(), fn);
  const payload = await edgeCall({
    url: target.url,
    method: 'POST',
    secret: target.secret,
    secretHeader: target.header,
    body,
    fetchImpl: deps.fetchImpl ?? fetch,
    timeoutMs: deps.timeoutMs ?? 20_000,
  });
  if (!payload || typeof payload !== 'object' || (payload as { ok?: unknown }).ok !== true) {
    throw new RaioxError(WRITE_INVALID);
  }
  return payload as Record<string, unknown>;
}

function uuidOf(value: unknown): string {
  const text = String(value ?? '').toLowerCase();
  if (!UUID_ANY.test(text)) throw new RaioxError(WRITE_INVALID);
  return text;
}

function requireUuid(value: string, what: string): string {
  const text = String(value || '').toLowerCase();
  if (!UUID_ANY.test(text)) throw new RaioxError(`${what} inválido.`);
  return text;
}

/** Link de formulário devolvido pela função: HTTPS, /form/<token>, exp e sig no formato. */
export function safeFormUrl(value: unknown): string {
  const text = String(value ?? '').trim();
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new RaioxError(WRITE_INVALID);
  }
  const keys = [...parsed.searchParams.keys()].sort().join(',');
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash
      || !/^\/form\/[A-Za-z0-9_-]{20,160}$/.test(parsed.pathname) || keys !== 'exp,sig'
      || !/^\d{10}$/.test(parsed.searchParams.get('exp') || '')
      || !/^[0-9a-f]{64}$/.test(parsed.searchParams.get('sig') || '')) {
    throw new RaioxError(WRITE_INVALID);
  }
  return parsed.toString();
}

export interface RaioxDocHash { kind: 'raio_x' | 'plano_crescimento'; sha256: string }

function docHashes(documents: RaioxDocHash[]): RaioxDocHash[] {
  const kinds = new Set(documents.map((d) => d.kind));
  if (documents.length !== 2 || !kinds.has('raio_x') || !kinds.has('plano_crescimento')
      || documents.some((d) => !SHA.test(String(d.sha256).toLowerCase()))) {
    throw new RaioxError('A revisão precisa dos dois documentos aprovados (relatório e plano) com hash.');
  }
  return documents.map((d) => ({ kind: d.kind, sha256: d.sha256.toLowerCase() }));
}

function roundOf(round: number): number {
  if (!Number.isInteger(round) || round < 1) throw new RaioxError('Rodada de aprovação inválida.');
  return round;
}

export interface RemoteCaseCreated { caseId: string; formUrl: string; inviteDeliveryId: string; idempotencyKey: string }

/** create-case: empresa, contato, e-mail e opt-in (controle 1). */
export async function createRemoteCase(input: InviteInput, deps: WriteDeps): Promise<RemoteCaseCreated> {
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const body = createCasePayload(input, now);
  const out = await edgeWrite('create-case', body, deps);
  const caseId = uuidOf(out.case_id);
  const key = String(out.idempotency_key || '');
  if (key !== `raiox-invite:${caseId}:v1`) throw new RaioxError(WRITE_INVALID);
  return { caseId, formUrl: safeFormUrl(out.form_url), inviteDeliveryId: uuidOf(out.invite_delivery_id), idempotencyKey: key };
}

export type ContinueResult = { action: 'form2'; formUrl: string } | { action: 'analyse'; packet: Record<string, unknown> };

/** continue-case: gera o formulário 2 ou libera o pacote para a análise. */
export async function continueRemote(caseId: string, action: 'form2' | 'analyse', deps: WriteDeps): Promise<ContinueResult> {
  const id = requireUuid(caseId, 'Caso remoto');
  if (action !== 'form2' && action !== 'analyse') throw new RaioxError('Ação do Raio-X inválida.');
  const out = await edgeWrite('continue-case', { case_id: id, action }, deps);
  if (out.action !== action) throw new RaioxError(WRITE_INVALID);
  if (action === 'form2') return { action, formUrl: safeFormUrl(out.form_url) };
  const packet = out.packet;
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)
      || String((packet as { case_id?: unknown }).case_id || '').toLowerCase() !== id) {
    throw new RaioxError(WRITE_INVALID);
  }
  return { action, packet: packet as Record<string, unknown> };
}

/** Grava o pacote da análise na pasta do caso, com troca atômica. */
export function writeAnalysisInput(root: string, localId: string, packet: Record<string, unknown>): string {
  const dir = path.join(caseDir(root, localId), 'analise');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'analysis-input.json');
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(packet, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, dest);
  return dest;
}

/** review-case: registra os hashes aprovados pelo Carlos. */
export async function persistReview(caseId: string, round: number, documents: RaioxDocHash[], deps: WriteDeps): Promise<{ reviewId: string; alreadyRecorded: boolean }> {
  const out = await edgeWrite('review-case', {
    case_id: requireUuid(caseId, 'Caso remoto'), approval_round: roundOf(round), documents: docHashes(documents),
  }, deps);
  return { reviewId: uuidOf(out.review_id), alreadyRecorded: out.already_recorded === true };
}

export type DeliveryPrepared =
  | { alreadySent: true; deliveryId: string }
  | { alreadySent: false; deliveryId: string; idempotencyKey: string; email: string; contactName: string; companyName: string };

/** delivery-case prepare: confere aprovação, consentimento, e-mail confirmado e revogação. */
export async function deliveryPrepare(caseId: string, round: number, documents: RaioxDocHash[], deps: WriteDeps): Promise<DeliveryPrepared> {
  const id = requireUuid(caseId, 'Caso remoto');
  const out = await edgeWrite('delivery-case', {
    action: 'prepare', case_id: id, approval_round: roundOf(round), documents: docHashes(documents),
  }, deps);
  const deliveryId = uuidOf(out.delivery_id);
  if (out.already_sent === true) return { alreadySent: true, deliveryId };
  const email = String(out.email || '').trim().toLowerCase();
  const key = String(out.idempotency_key || '');
  if (out.send_authorized !== true || !EMAIL_RE.test(email) || !key.startsWith(`raiox:${id}:`) || key.length > 400) {
    throw new RaioxError(WRITE_INVALID);
  }
  return {
    alreadySent: false, deliveryId, idempotencyKey: key, email,
    contactName: String(out.contact_name || '').slice(0, 160), companyName: String(out.company_name || '').slice(0, 160),
  };
}

function finalizeBody(caseId: string, deliveryId: string, status: 'sent' | 'failed', providerId?: string, errorCode?: string) {
  if (status !== 'sent' && status !== 'failed') throw new RaioxError('Situação do envio inválida.');
  const provider = String(providerId || '').trim().toLowerCase();
  if (status === 'sent' && !UUID_ANY.test(provider)) throw new RaioxError('Id do envio no Resend inválido.');
  const code = String(errorCode || '').replace(/[^a-z0-9_]/g, '').slice(0, 80);
  return {
    case_id: requireUuid(caseId, 'Caso remoto'), delivery_id: requireUuid(deliveryId, 'Entrega'),
    status, provider_id: status === 'sent' ? provider : '', error_code: status === 'failed' ? code : '',
  };
}

/** delivery-case finalize: registra o resultado do envio. */
export async function deliveryFinalize(caseId: string, deliveryId: string, status: 'sent' | 'failed', deps: WriteDeps, providerId?: string, errorCode?: string): Promise<{ status: 'sent' | 'failed'; alreadyFinalized: boolean }> {
  const out = await edgeWrite('delivery-case', { action: 'finalize', ...finalizeBody(caseId, deliveryId, status, providerId, errorCode) }, deps);
  if (out.status !== status) throw new RaioxError(WRITE_INVALID);
  return { status, alreadyFinalized: out.already_finalized === true };
}

/** invite-case: registra o resultado do envio do convite. */
export async function inviteFinalize(caseId: string, deliveryId: string, status: 'sent' | 'failed', deps: WriteDeps, providerId?: string, errorCode?: string): Promise<{ status: 'sent' | 'failed'; alreadyFinalized: boolean }> {
  const out = await edgeWrite('invite-case', finalizeBody(caseId, deliveryId, status, providerId, errorCode), deps);
  if (out.status !== status) throw new RaioxError(WRITE_INVALID);
  return { status, alreadyFinalized: out.already_finalized === true };
}
