/**
 * F8 T8.4 — convite pedido pelo APK (job `raiox_convite`).
 *
 * O job não envia nada: grava um pedido pendente na pasta privada do Raio-X. O pedido aparece na
 * lista do Raio-X e só vira convite quando o Carlos abre, confere e clica em enviar (R4). O opt-in
 * passa pela mesma regra do controle 1 já na chegada, para o pedido inválido nem aparecer.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_AVISO_VERSAO, type RaioxOptin, type RaioxOptinChannel } from '../../shared/raiox';
import { optinProblem } from './optin';
import { RaioxError } from './raioxRules';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RaioxInviteRequest {
  id: string;
  at: string;
  origin: 'apk';
  company: string;
  contact: string;
  email: string;
  optin: RaioxOptin;
}

function dir(root: string): string {
  return path.join(root, 'convites-pendentes');
}

function fileOf(root: string, id: string): string {
  if (!ID_RE.test(id)) throw new RaioxError('Pedido de convite inválido.');
  return path.join(dir(root), `${id.toLowerCase()}.json`);
}

/** Grava o pedido. Idempotente pelo id do comando do APK. */
export function recordInviteRequest(root: string, id: string, fields: Record<string, string>, now: string): RaioxInviteRequest {
  const f = (k: string) => String(fields[k] ?? '').trim();
  const file = fileOf(root, id);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as RaioxInviteRequest;
  const company = f('empresa').slice(0, 140);
  const contact = f('contato').slice(0, 120);
  const email = f('email').toLowerCase().slice(0, 254);
  if (!company || !contact || !EMAIL_RE.test(email)) throw new RaioxError('Preencha empresa, contato e um e-mail válido.');
  const at = Date.parse(f('optin_em') || f('obtido_em'));
  const optin: RaioxOptin = {
    channel: (f('optin_canal') || f('canal')) as RaioxOptinChannel,
    obtainedAt: Number.isNaN(at) ? '' : new Date(at).toISOString(),
    policyVersion: f('optin_versao') || RAIOX_AVISO_VERSAO,
    operator: f('operador') || 'Carlos',
  };
  const problem = optinProblem(optin, now);
  if (problem) throw new RaioxError(problem);
  const request: RaioxInviteRequest = { id: id.toLowerCase(), at: now, origin: 'apk', company, contact, email, optin };
  fs.mkdirSync(dir(root), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(request, null, 2), 'utf8');
  fs.renameSync(tmp, file);
  return request;
}

export function listInviteRequests(root: string): RaioxInviteRequest[] {
  const out: RaioxInviteRequest[] = [];
  let names: string[] = [];
  try { names = fs.readdirSync(dir(root)); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try { out.push(JSON.parse(fs.readFileSync(path.join(dir(root), name), 'utf8')) as RaioxInviteRequest); } catch { /* ignora */ }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function readInviteRequest(root: string, id: string): RaioxInviteRequest {
  const file = fileOf(root, id);
  if (!fs.existsSync(file)) throw new RaioxError('Pedido de convite não encontrado.');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RaioxInviteRequest;
}

/** Descartado pelo Carlos ou já virou convite. */
export function dropInviteRequest(root: string, id: string): void {
  fs.rmSync(fileOf(root, id), { force: true });
}

/** Gancho do officeCloud (job `raiox_convite`): grava o pedido e devolve o corpo para o APK. */
export function inviteRequestFromApk(
  root: string, id: string, rawFields: unknown, now: string,
): { ok: true; ref: string; body: Record<string, unknown> } | { ok: false; error: string } {
  const fields: Record<string, string> = {};
  if (rawFields && typeof rawFields === 'object') {
    for (const [k, v] of Object.entries(rawFields as Record<string, unknown>)) fields[k] = String(v ?? '').trim();
  }
  try {
    const r = recordInviteRequest(root, id, fields, now);
    return {
      ok: true,
      ref: `RXC-${r.id.slice(0, 8).toUpperCase()}`,
      body: {
        kind: 'raiox_convite', status: 'aguardando_carlos', title: `Convite Raio-X · ${r.company}`,
        detail: 'Pedido guardado no Raio-X do Escritório. O convite só sai quando o Carlos conferir e enviar.',
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof RaioxError ? err.message : 'Não foi possível guardar o pedido.' };
  }
}
