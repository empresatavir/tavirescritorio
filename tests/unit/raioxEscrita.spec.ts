import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  continueRemote,
  createRemoteCase,
  deliveryFinalize,
  deliveryPrepare,
  inviteFinalize,
  persistReview,
  safeFormUrl,
  writeAnalysisInput,
  type RaioxWriteConfig,
} from '../../src/main/raiox/raioxBridge';
import { createCase } from '../../src/main/raiox/raioxRules';
import { writeCase } from '../../src/main/raiox/raioxStore';
import { assertRecipientAllowed, grantRelease, isReleased, revokeRelease } from '../../src/main/raiox/releases';
import { RAIOX_AVISO_VERSAO } from '../../src/shared/raiox';

const HOST = 'https://skcbjwqajdovxlsxeszv.supabase.co';
const NOW = '2026-11-21T18:00:00.000Z';
const CASE = 'e7c28036-77da-43da-bfd4-5c51eb908253';
const DELIVERY = 'a1b2c3d4-77da-43da-bfd4-5c51eb908253';
const PROVIDER = 'b1b2c3d4-77da-43da-bfd4-5c51eb908253';
const SECRETS: RaioxWriteConfig = {
  url: HOST,
  internalSecret: 'i'.repeat(32),
  reviewSecret: 'r'.repeat(32),
  deliverySecret: 'd'.repeat(32),
  inviteSecret: 'v'.repeat(32),
};
const FORM = `https://raiox.tavir.com.br/form/${'t'.repeat(64)}?exp=1795000000&sig=${'a'.repeat(64)}`;
const DOCS = [{ kind: 'raio_x' as const, sha256: '1'.repeat(64) }, { kind: 'plano_crescimento' as const, sha256: '2'.repeat(64) }];
const OPTIN = { channel: 'whatsapp' as const, obtainedAt: '2026-11-21T12:00:00.000Z', policyVersion: RAIOX_AVISO_VERSAO, operator: 'Carlos' };

const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-escrita-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function released(): string {
  const root = temp();
  grantRelease(root, 'escritaSupabase', 'liberado CP-10', NOW);
  return root;
}

interface Call { url: string; headers: Headers; body: Record<string, unknown> }
function fake(reply: (call: Call) => { status?: number; body: unknown }, calls: Call[] = []) {
  return (async (url: string, init?: RequestInit) => {
    const call = { url, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body || '{}')) };
    calls.push(call);
    const out = reply(call);
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

const deps = (root: string, fetchImpl: typeof fetch) => ({ root, fetchImpl, config: () => SECRETS, now: () => NOW, timeoutMs: 50 });

describe('F8 T8.1 — liberações (R5/R6)', () => {
  it('escrita só liga com a frase exata, e e-mail externo só depois dela', () => {
    const root = temp();
    expect(isReleased(root, 'escritaSupabase')).toBe(false);
    expect(() => grantRelease(root, 'escritaSupabase', 'liberado', NOW)).toThrow(/liberado CP-10/);
    expect(() => grantRelease(root, 'emailExterno', 'liberado piloto', NOW)).toThrow(/antes do e-mail externo/);
    grantRelease(root, 'escritaSupabase', ' liberado CP-10 ', NOW);
    expect(isReleased(root, 'escritaSupabase')).toBe(true);
    grantRelease(root, 'emailExterno', 'liberado piloto', NOW);
    revokeRelease(root, 'escritaSupabase');
    expect(isReleased(root, 'emailExterno')).toBe(false);
  });

  it('antes do CP-12 só manda para o domínio do remetente', () => {
    const root = released();
    expect(() => assertRecipientAllowed(root, 'carlos@tavir.com.br', 'TAVIR <raiox@tavir.com.br>')).not.toThrow();
    expect(() => assertRecipientAllowed(root, 'cliente@gmail.com', 'TAVIR <raiox@tavir.com.br>')).toThrow(/CP-12/);
    expect(() => assertRecipientAllowed(root, 'carlos@tavir.com.br', '')).toThrow(/CP-12/);
    grantRelease(root, 'emailExterno', 'liberado piloto', NOW);
    expect(() => assertRecipientAllowed(root, 'cliente@gmail.com', 'TAVIR <raiox@tavir.com.br>')).not.toThrow();
  });

  it('sem liberação nenhuma função de escrita chama a rede', async () => {
    const root = temp();
    const calls: Call[] = [];
    const f = fake(() => ({ body: { ok: true } }), calls);
    await expect(createRemoteCase({ company: 'A', contact: 'B', email: 'b@c.com', optin: OPTIN }, deps(root, f))).rejects.toThrow(/CP-10/);
    await expect(continueRemote(CASE, 'form2', deps(root, f))).rejects.toThrow(/CP-10/);
    await expect(persistReview(CASE, 1, DOCS, deps(root, f))).rejects.toThrow(/CP-10/);
    await expect(deliveryPrepare(CASE, 1, DOCS, deps(root, f))).rejects.toThrow(/CP-10/);
    await expect(deliveryFinalize(CASE, DELIVERY, 'sent', deps(root, f), PROVIDER)).rejects.toThrow(/CP-10/);
    await expect(inviteFinalize(CASE, DELIVERY, 'sent', deps(root, f), PROVIDER)).rejects.toThrow(/CP-10/);
    expect(calls).toHaveLength(0);
  });
});

describe('F8 T8.1 — funções de escrita', () => {
  it('create-case leva opt-in, usa o segredo interno e confere a resposta', async () => {
    const root = released();
    const calls: Call[] = [];
    const f = fake(() => ({ body: { ok: true, case_id: CASE, form_url: FORM, invite_delivery_id: DELIVERY, idempotency_key: `raiox-invite:${CASE}:v1` } }), calls);
    const out = await createRemoteCase({ company: 'Padaria', contact: 'Ana', email: 'Ana@Exemplo.com', optin: OPTIN }, deps(root, f));
    expect(out).toEqual({ caseId: CASE, formUrl: FORM, inviteDeliveryId: DELIVERY, idempotencyKey: `raiox-invite:${CASE}:v1` });
    expect(calls[0].url).toBe(`${HOST}/functions/v1/create-case`);
    expect(calls[0].headers.get('x-raiox-internal-secret')).toBe(SECRETS.internalSecret);
    expect(calls[0].body).toMatchObject({ contato_email: 'ana@exemplo.com', optin: { canal: 'whatsapp', operador: 'Carlos' } });
    await expect(createRemoteCase({ company: 'Padaria', contact: 'Ana', email: 'ana@exemplo.com', optin: null }, deps(root, f))).rejects.toThrow(/aceitou/);
    expect(calls).toHaveLength(1);
  });

  it('cada função usa o próprio segredo e cabeçalho', async () => {
    const root = released();
    const calls: Call[] = [];
    const f = fake((call) => {
      if (call.url.endsWith('review-case')) return { body: { ok: true, review_id: DELIVERY, already_recorded: false } };
      if (call.url.endsWith('invite-case')) return { body: { ok: true, status: 'sent', already_finalized: false } };
      return { body: { ok: true, delivery_id: DELIVERY, status: 'sent', already_finalized: true } };
    }, calls);
    await persistReview(CASE, 1, DOCS, deps(root, f));
    await deliveryFinalize(CASE, DELIVERY, 'sent', deps(root, f), PROVIDER);
    await inviteFinalize(CASE, DELIVERY, 'sent', deps(root, f), PROVIDER);
    expect(calls.map((c) => [c.headers.get('x-raiox-review-secret'), c.headers.get('x-raiox-delivery-secret'), c.headers.get('x-raiox-invite-secret')])).toEqual([
      [SECRETS.reviewSecret, null, null],
      [null, SECRETS.deliverySecret, null],
      [null, null, SECRETS.inviteSecret],
    ]);
    expect(calls[1].body).toMatchObject({ action: 'finalize', provider_id: PROVIDER, error_code: '' });
  });

  it('continue-case: formulário 2 com link conferido e pacote gravado na pasta do caso', async () => {
    const root = released();
    const f = fake((call) => (call.body.action === 'form2'
      ? { body: { ok: true, action: 'form2', form_url: FORM } }
      : { body: { ok: true, action: 'analyse', packet: { case_id: CASE, respostas: { a: 1 } } } }));
    expect(await continueRemote(CASE, 'form2', deps(root, f))).toEqual({ action: 'form2', formUrl: FORM });
    const got = await continueRemote(CASE, 'analyse', deps(root, f));
    const local = createCase({ company: 'X', objective: 'Y', decisionNeeded: 'Z' }, NOW, CASE);
    writeCase(root, local);
    const file = writeAnalysisInput(root, local.id, got.action === 'analyse' ? got.packet : {});
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ case_id: CASE, respostas: { a: 1 } });
    expect(fs.existsSync(file + '.tmp')).toBe(false);
    const other = fake(() => ({ body: { ok: true, action: 'analyse', packet: { case_id: DELIVERY } } }));
    await expect(continueRemote(CASE, 'analyse', deps(root, other))).rejects.toThrow(/fora do formato/);
  });

  it('entrega: prepare devolve destinatário; já enviada não reenvia', async () => {
    const root = released();
    const ready = fake(() => ({ body: { ok: true, delivery_id: DELIVERY, delivery_status: 'pending', idempotency_key: `raiox:${CASE}:1:x`, already_sent: false, send_authorized: true, email: 'ana@exemplo.com', contact_name: 'Ana', company_name: 'Padaria' } }));
    expect(await deliveryPrepare(CASE, 1, DOCS, deps(root, ready))).toMatchObject({ alreadySent: false, email: 'ana@exemplo.com' });
    const sent = fake(() => ({ body: { ok: true, delivery_id: DELIVERY, delivery_status: 'sent', already_sent: true, send_authorized: false } }));
    expect(await deliveryPrepare(CASE, 1, DOCS, deps(root, sent))).toEqual({ alreadySent: true, deliveryId: DELIVERY });
    await expect(deliveryPrepare(CASE, 1, [DOCS[0]], deps(root, ready))).rejects.toThrow(/dois documentos/);
  });

  it('erros da função viram mensagem curta, sem segredo nem corpo bruto', async () => {
    const root = released();
    const cases: [number, unknown, RegExp][] = [
      [403, { error: 'case_revoked' }, /case_revoked/],
      [403, { error: 'email_not_verified' }, /email_not_verified/],
      [409, { error: 'delivery_reconciliation_required', delivery_id: DELIVERY }, /delivery_reconciliation_required/],
      [500, { error: 'detalhe SQL: relation "x" e senha' }, /Não reenvie/],
    ];
    for (const [status, body, re] of cases) {
      const err = await deliveryPrepare(CASE, 1, DOCS, deps(root, fake(() => ({ status, body })))).catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toMatch(re);
      for (const secret of Object.values(SECRETS).slice(1)) expect((err as Error).message).not.toContain(secret);
      expect((err as Error).message).not.toContain('SQL');
    }
  });

  it('recusa URL fora do projeto, segredo curto e link de formulário fora do formato', async () => {
    const root = released();
    const f = fake(() => ({ body: { ok: true } }));
    await expect(persistReview(CASE, 1, DOCS, { ...deps(root, f), config: () => ({ ...SECRETS, url: 'https://outro.supabase.co' }) })).rejects.toThrow(/segredos de escrita/);
    await expect(persistReview(CASE, 1, DOCS, { ...deps(root, f), config: () => ({ ...SECRETS, reviewSecret: 'curto' }) })).rejects.toThrow(/segredos de escrita/);
    for (const bad of ['http://raiox.tavir.com.br/form/' + 't'.repeat(40) + '?exp=1795000000&sig=' + 'a'.repeat(64),
      FORM + '&x=1', FORM + '#frag', 'https://raiox.tavir.com.br/outra?exp=1795000000&sig=' + 'a'.repeat(64)]) {
      expect(() => safeFormUrl(bad), bad).toThrow(/fora do formato/);
    }
  });
});
