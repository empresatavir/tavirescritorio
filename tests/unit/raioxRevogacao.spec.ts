import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MotorResult } from '../../src/main/motors';
import { analyse, collectLocalFor } from '../../src/main/raiox/raioxAnalyse';
import { writeDocuments, renderPdfs } from '../../src/main/raiox/raioxDocs';
import { addEvidence, assertActive, createCase, present, revokeCase, updateFrontier } from '../../src/main/raiox/raioxRules';
import { readCase, writeCase } from '../../src/main/raiox/raioxStore';

const NOW = '2026-11-21T16:00:00.000Z';
const UUID = 'c1b2c3d4-77da-43da-bfd4-5c51eb908253';
const ID = 'RX-C1B2C3D4';
const REPO = path.resolve(__dirname, '../..');
const WEB = path.join(REPO, 'raiox', 'web', 'supabase');
const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-revoga-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

const base = () => createCase({ company: 'Casa', objective: 'Ver', decisionNeeded: 'Seguir', frontier: 'Sinais públicos.', publicLink: 'https://casa.com.br' }, NOW, UUID);
const ledger = { start: async () => ({ id: 'run', dir: '', raw() {}, finish: async () => ({ id: 'run' }) }) } as never;

describe('G-PR1 controle 8 — revogação pelo titular', () => {
  it('registra canal, pedido e nota; recusa sem canal, no futuro ou em dobro', () => {
    expect(() => revokeCase(base(), { channel: '' }, NOW)).toThrow(/canal/);
    expect(() => revokeCase(base(), { channel: 'email', requestedAt: '2026-11-22T10:00:00.000Z' }, NOW)).toThrow(/futuro/);
    expect(() => revokeCase(base(), { channel: 'email', note: 'senha: abc12345' }, NOW)).toThrow(/não entra/);
    const c = revokeCase(base(), { channel: 'whatsapp', requestedAt: '2026-11-21T12:00:00.000Z', note: 'pediu para parar' }, NOW);
    expect(c.revocation).toEqual({ at: NOW, requestedAt: '2026-11-21T12:00:00.000Z', channel: 'whatsapp', note: 'pediu para parar' });
    expect(() => revokeCase(c, { channel: 'email' }, NOW)).toThrow(/já está registrada/);
    expect(present(c).next).toMatch(/Revogado/);
  });

  it('depois da revogação nenhuma regra muda o caso', () => {
    const c = revokeCase(base(), { channel: 'email' }, NOW);
    expect(() => assertActive(c)).toThrow(/revogou/);
    expect(() => updateFrontier(c, { objective: 'Outro' }, NOW)).toThrow(/revogou/);
    expect(() => addEvidence(c, { stage: 'descoberta', source: 'x', claim: 'y', classification: 'observado', author: 'carlos' } as never, NOW, 'e1')).toThrow(/revogou/);
  });

  it('revogação vinda do Supabase trava do mesmo jeito', () => {
    const c = { ...base(), remote: { supabaseId: UUID, status: 'form_2_received' as const, syncedAt: NOW, revoked: true } };
    expect(() => assertActive(c)).toThrow(/Supabase/);
    expect(present(c).next).toMatch(/Revogado/);
  });

  it('análise, Google, redação e PDF recusam caso revogado sem chamar motor', async () => {
    const root = temp();
    writeCase(root, revokeCase(base(), { channel: 'telefone' }, NOW));
    let called = false;
    const run = async (): Promise<MotorResult> => { called = true; return {} as never; };
    await expect(analyse(root, ID, [], { repo: REPO, run, gitStatus: () => '', now: () => NOW, ledger })).rejects.toThrow(/revogou/);
    expect(() => collectLocalFor(root, readCase(root, ID))).toThrow(/revogou/);
    await expect(writeDocuments(root, ID, { repo: REPO, run, now: () => NOW, ledger })).rejects.toThrow(/revogou/);
    await expect(renderPdfs(root, ID, 1, { repo: REPO })).rejects.toThrow(/revogou/);
    expect(called).toBe(false);
  });

  it('revogação registrada durante a análise descarta o resultado e não é sobrescrita', async () => {
    const root = temp();
    writeCase(root, base());
    const run = async (): Promise<MotorResult> => {
      // O Carlos registra a revogação enquanto o motor trabalha.
      writeCase(root, revokeCase(readCase(root, ID), { channel: 'email' }, NOW));
      return { motor: 'cursor', binary: '', args: [], model: 'm', stdout: '', stderr: '', exitCode: 0, ok: true, text: 'ok' } as never;
    };
    await expect(analyse(root, ID, [], { repo: REPO, run, gitStatus: () => '', now: () => NOW, ledger })).rejects.toThrow(/revogou/);
    const saved = readCase(root, ID);
    expect(saved.revocation?.channel).toBe('email');
    expect(saved.evidence).toHaveLength(0);
  });

  it('Supabase: funções recusam caso revogado e a revogação fecha formulário e confirmação', () => {
    const read = (...p: string[]) => fs.readFileSync(path.join(WEB, ...p), 'utf8');
    for (const fn of ['continue-case', 'review-case', 'delivery-case']) {
      expect(read('functions', fn, 'index.ts'), fn).toContain('"case_revoked"');
    }
    expect(read('functions', 'office-raiox-sync', 'index.ts')).toContain('revogado: Boolean(row.revoked_at)');
    const migration = read('migrations', '20261121140000_raiox_gpr1_revogacao.sql');
    expect(migration).toMatch(/set status = 'revoked'\s+where case_id = p_case_id and status = 'open'/);
    expect(migration).toMatch(/raiox_email_verifications set used_at = now\(\)\s+where case_id = p_case_id/);
    expect(migration).toMatch(/and revoked_at is null;/);
    expect(migration).toMatch(/revoke all on function public\.revoke_raiox_case[^;]+from public, anon, authenticated/);
  });
});
