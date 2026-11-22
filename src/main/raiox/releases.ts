/**
 * Liberações do Raio-X (R4, R5, R6): escrita no Supabase e e-mail para fora da TAVIR.
 *
 * Ficam em `<raiz privada>/liberacoes.json`, fora do git. Só mudam pelo handler IPC chamado pelo
 * clique do Carlos com a frase exata; nenhum motor, job ou sync liga uma liberação.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RaioxError } from './raioxRules';

export type RaioxReleaseKind = 'escritaSupabase' | 'emailExterno';

/** Frase que o Carlos digita; a mesma que ele escreve no checkpoint. */
export const RELEASE_PHRASE: Record<RaioxReleaseKind, string> = {
  escritaSupabase: 'liberado CP-10',
  emailExterno: 'liberado piloto',
};

export const RELEASE_LOCKED: Record<RaioxReleaseKind, string> = {
  escritaSupabase: 'Escrita no Supabase desligada até o smoke do CP-10. Libere em Raio-X › Liberações com a frase "liberado CP-10".',
  emailExterno: 'E-mail para fora da TAVIR desligado até o CP-12. Até lá, só endereço do mesmo domínio do remetente.',
};

export interface RaioxReleases {
  escritaSupabase?: { at: string };
  emailExterno?: { at: string };
}

function file(root: string): string {
  return path.join(root, 'liberacoes.json');
}

export function readReleases(root: string): RaioxReleases {
  try {
    const parsed = JSON.parse(fs.readFileSync(file(root), 'utf8')) as RaioxReleases;
    const out: RaioxReleases = {};
    for (const kind of Object.keys(RELEASE_PHRASE) as RaioxReleaseKind[]) {
      const at = parsed?.[kind]?.at;
      if (typeof at === 'string' && !Number.isNaN(Date.parse(at))) out[kind] = { at };
    }
    return out;
  } catch {
    return {};
  }
}

export function isReleased(root: string, kind: RaioxReleaseKind): boolean {
  return Boolean(readReleases(root)[kind]);
}

export function assertReleased(root: string, kind: RaioxReleaseKind): void {
  if (!isReleased(root, kind)) throw new RaioxError(RELEASE_LOCKED[kind]);
}

/** Só pelo clique do Carlos (IPC). O e-mail externo exige a escrita liberada antes. */
export function grantRelease(root: string, kind: RaioxReleaseKind, phrase: string, now: string): RaioxReleases {
  if (!(kind in RELEASE_PHRASE)) throw new RaioxError('Liberação desconhecida.');
  if (String(phrase || '').trim() !== RELEASE_PHRASE[kind]) {
    throw new RaioxError(`Para liberar, digite exatamente "${RELEASE_PHRASE[kind]}".`);
  }
  const current = readReleases(root);
  if (kind === 'emailExterno' && !current.escritaSupabase) {
    throw new RaioxError('Libere a escrita no Supabase (CP-10) antes do e-mail externo.');
  }
  const next: RaioxReleases = { ...current, [kind]: { at: now } };
  fs.mkdirSync(root, { recursive: true });
  const tmp = file(root) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, file(root));
  return next;
}

export function revokeRelease(root: string, kind: RaioxReleaseKind): RaioxReleases {
  const current = readReleases(root);
  delete current[kind];
  if (kind === 'escritaSupabase') delete current.emailExterno;
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(file(root), JSON.stringify(current, null, 2), 'utf8');
  return current;
}

/** Domínio do remetente configurado: o "interno" antes do CP-12. */
export function senderDomain(from: string): string {
  const match = /<?([^\s<>@]+)@([^\s<>@]+)>?\s*$/.exec(String(from || '').trim());
  return match ? match[2].toLowerCase() : '';
}

export function assertRecipientAllowed(root: string, email: string, from: string): void {
  if (isReleased(root, 'emailExterno')) return;
  const domain = senderDomain(from);
  const target = String(email || '').trim().toLowerCase().split('@')[1] || '';
  if (!domain || target !== domain) throw new RaioxError(RELEASE_LOCKED.emailExterno);
}
