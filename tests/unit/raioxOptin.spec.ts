import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_AVISO_VERSAO, RAIOX_OPTIN_CHANNELS, type RaioxOptin } from '../../src/shared/raiox';
import { createCasePayload, optinProblem } from '../../src/main/raiox/optin';

const NOW = '2026-11-21T15:00:00.000Z';
const REPO = path.resolve(__dirname, '../..');
const WEB = path.join(REPO, 'raiox', 'web');
const read = (...p: string[]) => fs.readFileSync(path.join(WEB, ...p), 'utf8');

const OK: RaioxOptin = { channel: 'whatsapp', obtainedAt: '2026-11-21T14:30:00.000Z', policyVersion: RAIOX_AVISO_VERSAO, operator: 'Carlos' };
const INPUT = { company: 'Padaria Exemplo', contact: 'Fulana', email: 'Contato@Exemplo.com.br' };

describe('G-PR1 controle 1 — opt-in antes do caso', () => {
  it('sem opt-in, nenhum corpo para o create-case', () => {
    expect(() => createCasePayload({ ...INPUT }, NOW)).toThrow(/aceitou receber o convite/);
    expect(() => createCasePayload({ ...INPUT, optin: null }, NOW)).toThrow(/aceitou receber o convite/);
  });

  it('recusa canal fora da lista, aceite no futuro, velho, de outra versão ou sem operador', () => {
    expect(optinProblem({ ...OK, channel: 'instagram' as never }, NOW)).toMatch(/canal/);
    expect(optinProblem({ ...OK, obtainedAt: '' }, NOW)).toMatch(/quando/);
    expect(optinProblem({ ...OK, obtainedAt: '2026-11-21T15:10:00.000Z' }, NOW)).toMatch(/futuro/);
    expect(optinProblem({ ...OK, obtainedAt: '2026-10-01T10:00:00.000Z' }, NOW)).toMatch(/30 dias/);
    expect(optinProblem({ ...OK, policyVersion: '2026-07-25' }, NOW)).toMatch(/aviso em vigor/);
    expect(optinProblem({ ...OK, operator: ' ' }, NOW)).toMatch(/quem registrou/);
    expect(optinProblem(OK, NOW)).toBeNull();
  });

  it('com opt-in válido, manda canal, horário, versão e operador', () => {
    const body = createCasePayload({ ...INPUT, optin: OK }, NOW);
    expect(body).toEqual({
      empresa_nome: 'Padaria Exemplo', contato_nome: 'Fulana', contato_email: 'contato@exemplo.com.br',
      optin: { canal: 'whatsapp', obtido_em: OK.obtainedAt, versao_aviso: RAIOX_AVISO_VERSAO, operador: 'Carlos' },
    });
  });

  it('recusa caso sem empresa, contato ou e-mail válido mesmo com opt-in', () => {
    expect(() => createCasePayload({ ...INPUT, email: 'sem-arroba', optin: OK }, NOW)).toThrow(/e-mail válido/);
  });

  it('Escritório, formulário, função e banco usam a mesma versão e os mesmos canais', () => {
    expect(read('api', '_raiox.mjs')).toContain(`AVISO_VERSAO = "${RAIOX_AVISO_VERSAO}"`);
    const migration = read('supabase', 'migrations', '20261121130000_raiox_gpr1_optin.sql');
    const edge = read('supabase', 'functions', 'create-case', 'index.ts');
    const list = RAIOX_OPTIN_CHANNELS.map((c) => `'${c}'`).join(', ');
    expect(migration.split(`channel in (${list})`).length - 1).toBe(1);
    expect(migration).toContain(`v_channel not in (${list})`);
    expect(edge).toContain(`const OPTIN_CHANNELS = [${RAIOX_OPTIN_CHANNELS.map((c) => `"${c}"`).join(', ')}]`);
  });

  it('create-case falha fechado: recusa antes de tocar o banco e o banco exige optin_id', () => {
    const edge = read('supabase', 'functions', 'create-case', 'index.ts');
    expect(edge.indexOf('optin_required')).toBeGreaterThan(0);
    expect(edge.indexOf('optin_required')).toBeLessThan(edge.indexOf('createClient(Deno'));
    expect(edge).not.toMatch(/from\("raiox_cases"\)\.insert/);
    expect(edge).toContain('create_raiox_case_with_optin');
    const migration = read('supabase', 'migrations', '20261121130000_raiox_gpr1_optin.sql');
    expect(migration).toMatch(/check \(optin_id is not null\) not valid/);
    expect(migration).toMatch(/revoke all on function public\.create_raiox_case_with_optin[^;]+from public, anon, authenticated/);
  });
});
