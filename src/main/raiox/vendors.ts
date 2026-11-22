import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RaioxCase, RaioxVendor } from '../../shared/raiox';
import type { MotorId } from '../motors';

/**
 * G-PR1 controle 6: cada caso registra os serviços que tocaram seus dados, com finalidade, dados,
 * região, retenção e exclusão copiados de `raiox/fornecedores.json` no momento do uso.
 */

export type VendorId = 'vercel' | 'supabase' | 'telegram' | 'resend' | 'rapidapi' | 'anthropic' | 'openai' | 'google' | 'cursor';

type CatalogEntry = Omit<RaioxVendor, 'primeiroUso' | 'ultimoUso' | 'usos'>;

const PENDING = 'a confirmar';

export function motorVendor(motor: MotorId): VendorId {
  if (motor === 'claude') return 'anthropic';
  if (motor === 'codex') return 'openai';
  if (motor === 'antigravity') return 'google';
  return 'cursor';
}

export function readVendorCatalog(repo: string): CatalogEntry[] {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(repo, 'raiox', 'fornecedores.json'), 'utf8'));
    return Array.isArray(data?.fornecedores) ? data.fornecedores : [];
  } catch {
    return [];
  }
}

function fromCatalog(catalog: CatalogEntry[], id: VendorId): CatalogEntry {
  const hit = catalog.find((item) => item.id === id);
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : PENDING);
  return {
    id,
    nome: hit ? text(hit.nome) : id,
    finalidade: text(hit?.finalidade),
    dados: text(hit?.dados),
    regiao: text(hit?.regiao),
    retencao: text(hit?.retencao),
    exclusao: text(hit?.exclusao),
    confirmado: hit?.confirmado === true,
  };
}

/** Registra o uso de um serviço no caso (função pura: devolve o caso novo). */
export function recordVendor(c: RaioxCase, catalog: CatalogEntry[], id: VendorId, use: string, now: string): RaioxCase {
  const vendors = [...(c.vendors || [])];
  const index = vendors.findIndex((item) => item.id === id);
  const entry = fromCatalog(catalog, id);
  if (index < 0) {
    vendors.push({ ...entry, primeiroUso: now, ultimoUso: now, usos: [use] });
  } else {
    const old = vendors[index];
    // Mantém a ficha do primeiro uso; atualiza só se o catálogo foi confirmado depois.
    const terms = entry.confirmado && !old.confirmado ? entry : old;
    vendors[index] = {
      ...old, ...terms,
      primeiroUso: old.primeiroUso,
      ultimoUso: now,
      usos: old.usos.includes(use) ? old.usos : [...old.usos, use],
    };
  }
  return { ...c, vendors };
}

/** Serviços do caso cuja região, retenção ou exclusão ainda não foram confirmadas pelo Carlos. */
export function unconfirmedVendors(c: RaioxCase): RaioxVendor[] {
  return (c.vendors || []).filter((item) => !item.confirmado);
}
