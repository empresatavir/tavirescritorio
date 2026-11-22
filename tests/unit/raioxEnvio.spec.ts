import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RaioxWriteConfig } from '../../src/main/raiox/raioxBridge';
import { createCase, revokeCase } from '../../src/main/raiox/raioxRules';
import { prepareDelivery, sendInvite, sendPreparedDelivery, type SendDeps } from '../../src/main/raiox/raioxSend';
import { caseDir, listCases, readCase, writeCase } from '../../src/main/raiox/raioxStore';
import { grantRelease } from '../../src/main/raiox/releases';
import { RAIOX_AVISO_VERSAO, type RaioxCase } from '../../src/shared/raiox';

const REPO = path.resolve(__dirname, '../..');
const NOW = '2026-11-21T18:00:00.000Z';
const SUPA = 'e7c28036-77da-43da-bfd4-5c51eb908253';
const LOCAL = 'RX-E7C28036';
const DELIVERY = 'a1b2c3d4-77da-43da-bfd4-5c51eb908253';
const PROVIDER = 'b1b2c3d4-77da-43da-bfd4-5c51eb908253';
const RESEND_KEY = 're_' + 'k'.repeat(40);
const SECRETS: RaioxWriteConfig = {
  url: 'https://skcbjwqajdovxlsxeszv.supabase.co',
  internalSecret: 'i'.repeat(32), reviewSecret: 'r'.repeat(32), deliverySecret: 'd'.repeat(32), inviteSecret: 'v'.repeat(32),
};
const FORM = `https://raiox.tavir.com.br/form/${'t'.repeat(64)}?exp=1795000000&sig=${'a'.repeat(64)}`;
const H1 = '1'.repeat(64);
const H2 = '2'.repeat(64);

const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-envio-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

interface Call { url: string; headers: Headers; body: Record<string, unknown> }

/** Supabase e Resend simulados; `resendStatus` controla a resposta do Resend. */
function world(opts: { alreadySent?: boolean; resendStatus?: number; email?: string } = {}) {
  const supa: Call[] = [];
  const resend: Call[] = [];
  const edge = (async (url: string, init?: RequestInit) => {
    const call = { url, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body || '{}')) };
    supa.push(call);
    const fn = url.split('/').pop();
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (fn === 'review-case') return json({ ok: true, review_id: DELIVERY, already_recorded: false });
    if (fn === 'delivery-case' && call.body.action === 'prepare') {
      return json(opts.alreadySent
        ? { ok: true, delivery_id: DELIVERY, delivery_status: 'sent', already_sent: true, send_authorized: false }
        : { ok: true, delivery_id: DELIVERY, delivery_status: 'pending', idempotency_key: `raiox:${SUPA}:1:raio_x:${H1}`, already_sent: false, send_authorized: true, email: opts.email ?? 'ana@tavir.com.br', contact_name: 'Ana', company_name: 'Padaria <b>' });
    }
    if (fn === 'delivery-case' || fn === 'invite-case') return json({ ok: true, status: call.body.status, already_finalized: false });
    if (fn === 'create-case') return json({ ok: true, case_id: SUPA, form_url: FORM, invite_delivery_id: DELIVERY, idempotency_key: `raiox-invite:${SUPA}:v1` });
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  const mail = (async (url: string, init?: RequestInit) => {
    resend.push({ url, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body || '{}')) });
    const status = opts.resendStatus ?? 200;
    return new Response(JSON.stringify(status === 200 ? { id: PROVIDER } : { message: `chave ${RESEND_KEY} inválida` }), { status });
  }) as typeof fetch;
  return { supa, resend, edge, mail };
}

function deps(root: string, w: ReturnType<typeof world>): SendDeps {
  return {
    root, repo: REPO, fetchImpl: w.edge, resendFetch: w.mail, config: () => SECRETS, now: () => NOW, timeoutMs: 50,
    resend: () => ({ apiKey: RESEND_KEY, from: 'TAVIR <raiox@tavir.com.br>' }),
  };
}

/** Caso do formulário com relatório e plano aprovados e em PDF. */
function approvedCase(released = true): string {
  const root = temp();
  if (released) grantRelease(root, 'escritaSupabase', 'liberado CP-10', NOW);
  const base = createCase({ company: 'Padaria', objective: 'Ver', decisionNeeded: 'Seguir' }, NOW, SUPA);
  const docs = [
    { kind: 'relatorio' as const, version: 1, md: 'r', sha256: H1, lint: [], createdAt: NOW, pdf: 'documentos/v1/relatorio-raio-x.pdf' },
    { kind: 'plano' as const, version: 1, md: 'p', sha256: H2, lint: [], createdAt: NOW, pdf: 'documentos/v1/plano-crescimento.pdf' },
  ];
  const c: RaioxCase = {
    ...base,
    remote: { supabaseId: SUPA, status: 'review', syncedAt: NOW, emailVerified: true, revoked: false },
    debrief: { decision: 'proposta_emitida', reason: 'x', documents: docs, approval: { hashes: [H1, H2], at: NOW } },
  };
  writeCase(root, c);
  for (const d of docs) {
    const f = path.join(caseDir(root, LOCAL), d.pdf);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '%PDF-1.4 teste');
  }
  return root;
}

describe('F8 T8.2 — entrega por e-mail', () => {
  it('ato 1 registra a revisão e prepara; ato 2 manda com idempotência e registra a entrega', async () => {
    const root = approvedCase();
    const w = world();
    const prepared = await prepareDelivery(LOCAL, deps(root, w));
    expect(prepared.debrief?.pendingDelivery).toMatchObject({ deliveryId: DELIVERY, email: 'ana@tavir.com.br', round: 1 });
    expect(w.supa.map((c) => c.url.split('/').pop())).toEqual(['review-case', 'delivery-case']);
    expect(w.supa[0].body).toMatchObject({ approval_round: 1, documents: [{ kind: 'raio_x', sha256: H1 }, { kind: 'plano_crescimento', sha256: H2 }] });
    expect(w.resend).toHaveLength(0);

    const sent = await sendPreparedDelivery(LOCAL, 'ana@tavir.com.br', deps(root, w));
    expect(w.resend).toHaveLength(1);
    expect(w.resend[0].headers.get('Idempotency-Key')).toBe(`raiox:${SUPA}:1:raio_x:${H1}`);
    expect(w.resend[0].body.to).toEqual(['ana@tavir.com.br']);
    const files = (w.resend[0].body.attachments as { filename: string }[]).map((a) => a.filename);
    expect(files).toEqual(['tavir-logo.png', 'relatorio-raio-x.pdf', 'plano-crescimento.pdf']);
    expect(String(w.resend[0].body.html)).toContain('Padaria &lt;b&gt;');
    expect(w.supa.at(-1)!.body).toMatchObject({ action: 'finalize', status: 'sent', provider_id: PROVIDER });
    expect(sent.debrief?.delivery).toMatchObject({ channel: 'resend', to: 'ana@tavir.com.br' });
    expect(sent.debrief?.pendingDelivery).toBeUndefined();
    expect(sent.vendors?.some((v) => v.id === 'resend')).toBe(true);
    await expect(sendPreparedDelivery(LOCAL, 'ana@tavir.com.br', deps(root, w))).rejects.toThrow(/já foi feita. Não reenvie/);
    await expect(prepareDelivery(LOCAL, deps(root, w))).rejects.toThrow(/já foi feita. Não reenvie/);
    expect(w.resend).toHaveLength(1);
  });

  it('entrega já feita no Supabase não prepara de novo', async () => {
    const root = approvedCase();
    await expect(prepareDelivery(LOCAL, deps(root, world({ alreadySent: true })))).rejects.toThrow('Esta entrega já foi feita. Não reenvie.');
    expect(readCase(root, LOCAL).debrief?.pendingDelivery).toBeUndefined();
  });

  it('sem aprovação, sem liberação ou sem autorização para o mesmo e-mail, nada sai', async () => {
    const unapproved = approvedCase();
    const c = readCase(unapproved, LOCAL);
    writeCase(unapproved, { ...c, debrief: { ...c.debrief!, approval: undefined } });
    await expect(prepareDelivery(LOCAL, deps(unapproved, world()))).rejects.toThrow(/Aprove os documentos/);

    const locked = approvedCase(false);
    const w1 = world();
    await expect(prepareDelivery(LOCAL, deps(locked, w1))).rejects.toThrow(/CP-10/);
    expect(w1.supa).toHaveLength(0);

    const root = approvedCase();
    const w = world();
    await expect(sendPreparedDelivery(LOCAL, 'ana@tavir.com.br', deps(root, w))).rejects.toThrow(/Prepare a entrega/);
    await prepareDelivery(LOCAL, deps(root, w));
    await expect(sendPreparedDelivery(LOCAL, 'outra@tavir.com.br', deps(root, w))).rejects.toThrow(/mesmo e-mail/);
    expect(w.resend).toHaveLength(0);
  });

  it('antes do CP-12 não manda para fora do domínio do remetente', async () => {
    const root = approvedCase();
    const w = world({ email: 'cliente@gmail.com' });
    await prepareDelivery(LOCAL, deps(root, w));
    await expect(sendPreparedDelivery(LOCAL, 'cliente@gmail.com', deps(root, w))).rejects.toThrow(/CP-12/);
    expect(w.resend).toHaveLength(0);
  });

  it('revogação entre os dois atos trava o envio', async () => {
    const root = approvedCase();
    const w = world();
    await prepareDelivery(LOCAL, deps(root, w));
    writeCase(root, revokeCase(readCase(root, LOCAL), { channel: 'email' }, NOW));
    await expect(sendPreparedDelivery(LOCAL, 'ana@tavir.com.br', deps(root, w))).rejects.toThrow(/revogou/);
    expect(w.resend).toHaveLength(0);
  });

  it('Resend recusa: entrega fica como falha no Supabase, nada vira enviado e a chave não aparece', async () => {
    const root = approvedCase();
    const w = world({ resendStatus: 422 });
    await prepareDelivery(LOCAL, deps(root, w));
    const err = await sendPreparedDelivery(LOCAL, 'ana@tavir.com.br', deps(root, w)).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/não confirmou o envio/);
    expect((err as Error).message).not.toContain(RESEND_KEY);
    expect(w.supa.at(-1)!.body).toMatchObject({ action: 'finalize', status: 'failed', error_code: 'resend_failed' });
    expect(readCase(root, LOCAL).debrief?.delivery).toBeUndefined();
  });
});

describe('F8 T8.3 — convite pelo Escritório', () => {
  const OPTIN = { channel: 'whatsapp' as const, obtainedAt: '2026-11-21T12:00:00.000Z', policyVersion: RAIOX_AVISO_VERSAO, operator: 'Carlos' };

  it('cria o caso remoto com opt-in, o caso local ligado e manda o convite', async () => {
    const root = temp();
    grantRelease(root, 'escritaSupabase', 'liberado CP-10', NOW);
    const w = world();
    const c = await sendInvite({ company: 'Padaria', contact: 'Ana', email: 'ana@tavir.com.br', optin: OPTIN }, deps(root, w));
    expect(w.supa.map((x) => x.url.split('/').pop())).toEqual(['create-case', 'invite-case']);
    expect(w.supa[0].body.optin).toMatchObject({ canal: 'whatsapp', versao_aviso: RAIOX_AVISO_VERSAO });
    expect(w.resend[0].headers.get('Idempotency-Key')).toBe(`raiox-invite:${SUPA}:v1`);
    expect(String(w.resend[0].body.text)).toContain(FORM);
    expect(c).toMatchObject({ id: LOCAL, optin: OPTIN, remote: { supabaseId: SUPA, status: 'form_1_sent' } });
    expect(c.vendors?.map((v) => v.id).sort()).toEqual(['resend', 'supabase', 'vercel']);
  });

  it('sem opt-in, sem liberação ou com destinatário externo antes do CP-12, nada é criado', async () => {
    const root = temp();
    const w = world();
    await expect(sendInvite({ company: 'P', contact: 'A', email: 'ana@tavir.com.br', optin: OPTIN }, deps(root, w))).rejects.toThrow(/CP-10/);
    grantRelease(root, 'escritaSupabase', 'liberado CP-10', NOW);
    await expect(sendInvite({ company: 'P', contact: 'A', email: 'cliente@gmail.com', optin: OPTIN }, deps(root, w))).rejects.toThrow(/CP-12/);
    await expect(sendInvite({ company: 'P', contact: 'A', email: 'ana@tavir.com.br', optin: undefined as never }, deps(root, w))).rejects.toThrow(/aceitou/);
    expect(w.supa).toHaveLength(0);
    expect(w.resend).toHaveLength(0);
    expect(listCases(root)).toEqual([]);
  });

  it('a tela usa a mesma versão do aviso do Escritório', () => {
    const html = fs.readFileSync(path.join(REPO, 'src', 'renderer', 'raiox-ref', 'RaioX.dc.html'), 'utf8');
    expect(html).toContain(`const AVISO_VERSAO = '${RAIOX_AVISO_VERSAO}';`);
  });
});
