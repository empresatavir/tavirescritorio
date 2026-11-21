import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MotorResult } from '../../src/main/motors';
import { analyse } from '../../src/main/raiox/raioxAnalyse';
import { createCase } from '../../src/main/raiox/raioxRules';
import { readCase, writeCase } from '../../src/main/raiox/raioxStore';
import { motorVendor, readVendorCatalog, recordVendor, unconfirmedVendors } from '../../src/main/raiox/vendors';

const NOW = '2026-11-21T10:00:00.000Z';
const LATER = '2026-11-22T10:00:00.000Z';
const UUID = 'b1b2c3d4-77da-43da-bfd4-5c51eb908253';
const REPO = path.resolve(__dirname, '../..');
const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-vendor-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

const base = () => createCase({ company: 'Casa', objective: 'Ver', decisionNeeded: 'Seguir', frontier: 'Sinais públicos.', publicLink: 'https://casa.com.br' }, NOW, UUID);

describe('G-PR1 controle 6 — fornecedores por caso', () => {
  it('o catálogo do repositório cobre todos os serviços e nada vem confirmado', () => {
    const catalog = readVendorCatalog(REPO);
    const ids = catalog.map((item) => item.id).sort();
    expect(ids).toEqual(['anthropic', 'cursor', 'google', 'openai', 'rapidapi', 'resend', 'supabase', 'telegram', 'vercel']);
    for (const item of catalog) {
      expect(item.finalidade && item.dados, item.id).toBeTruthy();
      // Só o Carlos confirma região e retenção (R3 aplicado aos fornecedores).
      expect(item.confirmado, item.id).toBe(false);
    }
  });

  it('cada motor do Escritório tem fornecedor no catálogo', () => {
    const ids = new Set(readVendorCatalog(REPO).map((item) => item.id));
    for (const motor of ['claude', 'codex', 'antigravity', 'cursor'] as const) expect(ids.has(motorVendor(motor)), motor).toBe(true);
  });

  it('registra o uso sem repetir e guarda primeiro e último uso', () => {
    const catalog = readVendorCatalog(REPO);
    let c = recordVendor(base(), catalog, 'google', 'análise · gemini-3.8-flash', NOW);
    c = recordVendor(c, catalog, 'google', 'análise · gemini-3.8-flash', LATER);
    c = recordVendor(c, catalog, 'google', 'redação · gemini-3.8-flash', LATER);
    expect(c.vendors).toHaveLength(1);
    expect(c.vendors![0]).toMatchObject({
      id: 'google', primeiroUso: NOW, ultimoUso: LATER, regiao: 'a confirmar',
      usos: ['análise · gemini-3.8-flash', 'redação · gemini-3.8-flash'],
    });
    expect(unconfirmedVendors(c)).toHaveLength(1);
  });

  it('sem catálogo, registra o serviço com termos a confirmar', () => {
    const c = recordVendor(base(), [], 'resend', 'convite', NOW);
    expect(c.vendors![0]).toMatchObject({ id: 'resend', nome: 'resend', regiao: 'a confirmar', confirmado: false });
  });

  it('termos confirmados depois pelo Carlos substituem os pendentes', () => {
    const pending = recordVendor(base(), readVendorCatalog(REPO), 'supabase', 'caso remoto', NOW);
    const confirmed = [{ id: 'supabase', nome: 'Supabase', finalidade: 'x', dados: 'y', regiao: 'EUA (us-east-1)', retencao: '90 dias', exclusao: 'botão Expurgar', confirmado: true }];
    const c = recordVendor(pending, confirmed, 'supabase', 'caso remoto', LATER);
    expect(c.vendors![0]).toMatchObject({ regiao: 'EUA (us-east-1)', confirmado: true, primeiroUso: NOW });
  });

  it('a análise registra o motor antes de rodar, mesmo quando a rodada falha', async () => {
    const root = temp();
    writeCase(root, base());
    const run = async (): Promise<MotorResult> => ({ motor: 'cursor', binary: '', args: [], model: 'm', stdout: '', stderr: '', exitCode: 1, ok: false, text: '', error: { kind: 'exit', message: 'falhou' } } as never);
    await expect(analyse(root, 'RX-B1B2C3D4', [], { repo: REPO, run, gitStatus: () => '', now: () => NOW, ledger: { start: async () => ({ id: 'run', dir: '', raw() {}, finish: async () => ({ id: 'run' }) }) } as never })).rejects.toThrow();
    const saved = readCase(root, 'RX-B1B2C3D4');
    expect(saved.vendors?.length).toBe(1);
    expect(saved.vendors![0].usos[0]).toMatch(/^análise · /);
  });
});
