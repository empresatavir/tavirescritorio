import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RAIOX_CATALOG } from '../../src/shared/raiox';
import {
  continueCase,
  deliveryCase,
  inviteCase,
  reviewCase,
  syncCases,
  type RaioxSyncConfig,
} from '../../src/main/raiox/raioxBridge';
import { RaioxError, createCase } from '../../src/main/raiox/raioxRules';
import { listCases, writeCase } from '../../src/main/raiox/raioxStore';

const HOST = 'https://skcbjwqajdovxlsxeszv.supabase.co';
const SECRET = 'a'.repeat(32);
const NOW = '2026-11-09T18:00:00.000Z';
const LATER = '2026-11-09T19:00:00.000Z';
const REMOTE_ID = 'e7c28036-77da-43da-bfd4-5c51eb908253';
const LOCKED = 'Escrita no Supabase liberada só após o corte (CP-9).';

const dirs: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-sync-'));
  dirs.push(root);
  return root;
}

afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function config(patch: Partial<RaioxSyncConfig> = {}): RaioxSyncConfig {
  return { url: HOST, officeSyncSecret: SECRET, ...patch };
}

function remoteCase(patch: Record<string, unknown> = {}) {
  return {
    id: REMOTE_ID,
    status: 'form_1_received',
    cliente: 'Padaria Dois Irmãos',
    etapa: 'form_1_received',
    criado_em: '2026-11-01T00:00:00.000Z',
    atualizado_em: '2026-11-02T00:00:00.000Z',
    ...patch,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fetchOf(response: Response | (() => Promise<Response> | Response)) {
  return (async (url: string, init?: RequestInit) => {
    expect(url).toBe(`${HOST}/functions/v1/office-raiox-sync`);
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    const headers = new Headers(init?.headers);
    expect(headers.get('x-raiox-office-sync-secret')).toBe(SECRET);
    expect(headers.get('User-Agent')).toBe('TAVIR-Escritorio-RaioX/1.0');
    expect(url.includes(SECRET)).toBe(false);
    return typeof response === 'function' ? response() : response;
  }) as typeof fetch;
}

function run(root: string, fetchImpl: typeof fetch, now = NOW, cfg = config()) {
  return syncCases({
    root,
    fetchImpl,
    now: () => now,
    uuid: () => '11111111-1111-4111-8111-111111111111',
    config: () => cfg,
    timeoutMs: 50,
  });
}

describe('ponte de leitura do Raio-X', () => {
  it.each([
    [401, { error: 'unauthorized' }, 'A ponte Supabase recusou a autenticação interna. Verifique os segredos do projeto. Código: unauthorized.'],
    [403, { error: 'forbidden' }, 'A ponte Supabase recusou a autenticação interna. Verifique os segredos do projeto. Código: forbidden.'],
    [404, {}, 'A função do Raio X não está publicada no projeto Supabase configurado.'],
    [500, { error: 'sync_unavailable' }, 'O Supabase não concluiu a etapa interna do Raio X. Não reenvie os dados agora. Código: sync_unavailable.'],
    [500, { error: 'detalhe SQL cru' }, 'O Supabase não concluiu a etapa interna do Raio X. Não reenvie os dados agora.'],
    [422, { error: 'rejected' }, 'O Supabase recusou esta operação do Raio X. Código: rejected.'],
  ])('mapeia HTTP %s', async (status, body, message) => {
    const root = tempRoot();
    await expect(run(root, fetchOf(jsonResponse(status, body)))).rejects.toThrow(message);
    expect(listCases(root)).toEqual([]);
  });

  it('trata DNS como projeto pausado e os demais erros de rede sem o segredo', async () => {
    const root = tempRoot();
    const dns = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    await expect(run(root, (async () => { throw dns; }) as typeof fetch)).rejects.toThrow(
      'O endereço do projeto Supabase não existe no DNS. Em projetos gratuitos, isso normalmente indica que o projeto foi pausado; restaure-o no painel antes de tentar novamente.',
    );
    const down = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
    await expect(run(root, (async () => { throw down; }) as typeof fetch)).rejects.toThrow(
      'A rede não conseguiu alcançar o projeto Supabase. Não reenvie os dados agora.',
    );
  });

  it('trata tempo esgotado e corpo ilegível como resposta inválida', async () => {
    const root = tempRoot();
    const hanging = (async (_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    })) as typeof fetch;
    await expect(run(root, hanging)).rejects.toThrow(
      'A ponte Supabase não respondeu corretamente. Não reenvie os dados agora.',
    );
    await expect(run(root, fetchOf(new Response('nao-json', { status: 200 })))).rejects.toThrow(
      'A ponte Supabase não respondeu corretamente. Não reenvie os dados agora.',
    );
    await expect(run(root, fetchOf(jsonResponse(200, { ok: true, cases: {} })))).rejects.toThrow(
      'A função de sync Raio-X devolveu uma resposta inválida.',
    );
  });

  it('recusa ponte ausente, URL fora do projeto e segredo curto antes de chamar a rede', async () => {
    const root = tempRoot();
    const fetchImpl = (async () => { throw new Error('não deveria chamar'); }) as typeof fetch;
    await expect(run(root, fetchImpl, NOW, null as unknown as RaioxSyncConfig)).rejects.toThrow(
      'A sincronização não usa o token da conta Supabase. Em Configurações, no cartão Raio-X Supabase, informe a URL do projeto e o segredo de sincronização.',
    );
    await expect(syncCases({ root, fetchImpl, config: () => null })).rejects.toThrow(
      'A sincronização não usa o token da conta Supabase. Em Configurações, no cartão Raio-X Supabase, informe a URL do projeto e o segredo de sincronização.',
    );
    await expect(run(root, fetchImpl, NOW, config({ url: 'https://outro.supabase.co' }))).rejects.toThrow(
      'Sync Raio-X não configurado: confira URL e RAIOX_OFFICE_SYNC_SECRET no ambiente privado.',
    );
    await expect(run(root, fetchImpl, NOW, config({ officeSyncSecret: 'curto' }))).rejects.toThrow(
      'Sync Raio-X não configurado: confira URL e RAIOX_OFFICE_SYNC_SECRET no ambiente privado.',
    );
  });

  it('cria o caso local, atualiza o status e não apaga quem já estava na pasta', async () => {
    const root = tempRoot();
    const local = createCase({
      company: 'Casa local',
      objective: 'Objetivo local',
      decisionNeeded: 'Decisão local',
    }, NOW, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    writeCase(root, local);
    const payload = { ok: true, cases: [remoteCase()], source: 'supabase-raiox', truncated: false };
    const first = await run(root, fetchOf(jsonResponse(200, payload)));
    expect(first).toEqual({ ok: true, created: 1, updated: 0 });
    const created = listCases(root).find((item) => item.remote?.supabaseId === REMOTE_ID);
    const mode = RAIOX_CATALOG.find((item) => item.id === 'diagnostico');
    expect(created).toMatchObject({
      id: 'RX-E7C28036',
      company: 'Padaria Dois Irmãos',
      origin: 'formulario',
      mode: 'diagnostico',
      objective: mode?.defaults.objective,
      decisionNeeded: mode?.defaults.decisionNeeded,
      consent: { kind: 'formulario', at: NOW, note: '' },
      remote: { supabaseId: REMOTE_ID, status: 'form_1_received', syncedAt: NOW },
    });
    expect(listCases(root).some((item) => item.id === local.id)).toBe(true);

    const again = await run(
      root,
      fetchOf(jsonResponse(200, { ok: true, cases: [remoteCase({ status: 'sent', etapa: 'sent', cliente: 'Outro nome' })], truncated: false })),
      LATER,
    );
    expect(again).toEqual({ ok: true, created: 0, updated: 1 });
    const cases = listCases(root);
    expect(cases).toHaveLength(2);
    const updated = cases.find((item) => item.id === 'RX-E7C28036');
    expect(updated?.company).toBe('Padaria Dois Irmãos');
    expect(updated?.remote).toEqual({ supabaseId: REMOTE_ID, status: 'sent', syncedAt: LATER });
    expect(cases.find((item) => item.id === local.id)?.company).toBe('Casa local');
  });

  it('declara a escrita e recusa chamá-la', () => {
    expect(() => continueCase()).toThrow(new RaioxError(LOCKED));
    expect(() => reviewCase()).toThrow(LOCKED);
    expect(() => deliveryCase()).toThrow(LOCKED);
    expect(() => inviteCase()).toThrow(LOCKED);
  });
});
