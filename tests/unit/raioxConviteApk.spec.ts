import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { applyDeskCommand, type DeskStore, type Outcome } from '../../src/main/officeCloud';
import { dropInviteRequest, listInviteRequests, recordInviteRequest } from '../../src/main/raiox/inviteRequests';
import { listCases } from '../../src/main/raiox/raioxStore';
import { RAIOX_AVISO_VERSAO } from '../../src/shared/raiox';

const ID = '3f2b1c4d-1111-4222-8333-444455556666';
const NOW = '2026-11-21T18:00:00.000Z';
let root = '';
let before: string | undefined;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-convite-apk-'));
  before = process.env.TAVIR_RAIOX_ROOT;
  process.env.TAVIR_RAIOX_ROOT = root;
});
afterEach(() => {
  if (before === undefined) delete process.env.TAVIR_RAIOX_ROOT;
  else process.env.TAVIR_RAIOX_ROOT = before;
  fs.rmSync(root, { recursive: true, force: true });
});

function store(): { store: DeskStore; enqueued: string[] } {
  const ledger = new Map<string, Outcome>();
  const enqueued: string[] = [];
  return {
    enqueued,
    store: {
      list: () => [],
      create: () => { throw new Error('não cria tarefa'); },
      update: () => undefined,
      remove: () => undefined,
      ledgerGet: (id) => ledger.get(id) || null,
      ledgerPut: (id, _k, o) => void ledger.set(id, o),
      exec: { enqueue: (id: string) => { enqueued.push(id); return { ok: true }; } } as never,
    },
  };
}

const fields = (patch: Record<string, string> = {}) => ({
  empresa: 'Padaria', contato: 'Ana', email: 'Ana@Exemplo.com', optin_canal: 'whatsapp',
  optin_em: new Date(Date.now() - 60_000).toISOString(), operador: 'Carlos', ...patch,
});

describe('F8 T8.4 — convite pedido pelo APK', () => {
  it('o job vira pedido pendente no Raio-X: nenhuma tarefa, nenhum envio, nenhum caso', () => {
    const s = store();
    const out = applyDeskCommand(s.store, { id: ID, kind: 'job.create', payload: { kind: 'raiox_convite', fields: fields() } });
    expect(out).toMatchObject({ status: 'applied', code: 201, ref: 'RXC-3F2B1C4D', body: { kind: 'raiox_convite', status: 'aguardando_carlos' } });
    expect(s.enqueued).toEqual([]);
    expect(listCases(root)).toEqual([]);
    const [req] = listInviteRequests(root);
    expect(req).toMatchObject({ id: ID, origin: 'apk', company: 'Padaria', email: 'ana@exemplo.com', optin: { channel: 'whatsapp', policyVersion: RAIOX_AVISO_VERSAO, operator: 'Carlos' } });
    // Repetir o comando não duplica.
    applyDeskCommand(s.store, { id: ID, kind: 'job.create', payload: { kind: 'raiox_convite', fields: fields() } });
    expect(listInviteRequests(root)).toHaveLength(1);
  });

  it('sem opt-in válido o APK recebe a recusa e nada fica guardado', () => {
    const s = store();
    const noOptin = applyDeskCommand(s.store, { id: ID, kind: 'job.create', payload: { kind: 'raiox_convite', fields: fields({ optin_canal: '' }) } });
    expect(noOptin).toMatchObject({ status: 'rejected', code: 400 });
    expect(String((noOptin.body as { detail: string }).detail)).toMatch(/canal/);
    const old = applyDeskCommand(s.store, { id: '3f2b1c4d-1111-4222-8333-444455556667', kind: 'job.create', payload: { kind: 'raiox_convite', fields: fields({ optin_em: '2026-01-01T00:00:00.000Z' }) } });
    expect(old).toMatchObject({ status: 'rejected', code: 400 });
    expect(listInviteRequests(root)).toEqual([]);
  });

  it('pedido descartado sai da lista e id fora do formato é recusado', () => {
    recordInviteRequest(root, ID, fields(), new Date().toISOString());
    dropInviteRequest(root, ID);
    expect(listInviteRequests(root)).toEqual([]);
    expect(() => recordInviteRequest(root, '../fora', fields(), NOW)).toThrow(/inválido/);
  });
});
