/**
 * F8 T8.2 e T8.3 — e-mail do Raio-X pelo Resend (convite e entrega).
 *
 * Portado de tools/office.py (_raiox_resend_*), com as travas do Escritório:
 *  - nada sai sem a liberação "liberado CP-10" (R5) e, antes do CP-12, só para o domínio do
 *    remetente (R6);
 *  - entrega em dois atos do Carlos: "Preparar entrega" (Supabase confere aprovação, consentimento,
 *    e-mail confirmado e revogação) e "Autorizar envio para <e-mail>";
 *  - idempotência: a chave da entrega vai para o Resend; entrega já enviada não sai de novo;
 *  - nenhuma mensagem leva a chave do Resend, o corpo da resposta ou o endereço de outra pessoa.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RAIOX_CATALOG, type RaioxCase, type RaioxOptin } from '../../shared/raiox';
import { getBundle } from '../credentials';
import {
  createRemoteCase,
  deliveryFinalize,
  deliveryPrepare,
  inviteFinalize,
  persistReview,
  safeFormUrl,
  type RaioxDocHash,
  type WriteDeps,
} from './raioxBridge';
import { repoRoot } from './raioxContext';
import { documentPath } from './raioxDocs';
import { RaioxError, assertActive, createCase, recordDelivery } from './raioxRules';
import { readCase, writeCase } from './raioxStore';
import { assertRecipientAllowed, assertReleased } from './releases';
import { readVendorCatalog, recordVendor } from './vendors';

const RESEND_URL = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_CONFIGURED = 'Resend sem chave ou remetente. Em Configurações › Resend, preencha a chave e o remetente.';
const SEND_FAILED = 'O Resend não confirmou o envio. Nada foi marcado como enviado; confira o painel do Resend antes de tentar de novo.';

export interface ResendConfig { apiKey: string; from: string; replyTo?: string }

export interface SendDeps extends WriteDeps {
  resend?: () => ResendConfig | null;
  resendFetch?: typeof fetch;
  repo?: string;
}

function resendConfig(deps: SendDeps): ResendConfig {
  const cfg = (deps.resend ?? (() => {
    const bundle = getBundle('resend');
    return bundle ? { apiKey: bundle.apiKey || '', from: bundle.from || '', replyTo: bundle.replyTo || '' } : null;
  }))();
  if (!cfg || !cfg.apiKey || !cfg.from) throw new RaioxError(NOT_CONFIGURED);
  return cfg;
}

/** Texto curto, sem caractere de controle, para nome e empresa no e-mail. */
export function safeText(value: unknown, fallback: string, limit = 160): string {
  const text = String(value ?? '').replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
  return text || fallback;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fill(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [marker, value] of Object.entries(values)) out = out.split(marker).join(value);
  if (out.includes('{{')) throw new RaioxError('Modelo de e-mail incompleto. Nada foi enviado.');
  return out;
}

function asset(repo: string, ...parts: string[]): string {
  const file = path.join(repo, ...parts);
  const stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) throw new RaioxError('Modelo ou logo do e-mail ausente no repositório. Nada foi enviado.');
  return file;
}

function logoAttachment(repo: string) {
  return {
    filename: 'tavir-logo.png',
    content: fs.readFileSync(asset(repo, 'tools', 'marca', 'tavir-primary-transparent.png')).toString('base64'),
    content_type: 'image/png',
    content_id: 'tavir-logo',
  };
}

export function invitePayload(invite: { email: string; contactName: string; companyName: string; formUrl: string }, cfg: ResendConfig, repo: string): Record<string, unknown> {
  const email = String(invite.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new RaioxError('E-mail do convite inválido.');
  const formUrl = safeFormUrl(invite.formUrl);
  const contato = safeText(invite.contactName, 'Olá');
  const empresa = safeText(invite.companyName, 'sua empresa');
  const html = fill(fs.readFileSync(asset(repo, 'raiox', 'modelos', 'email-convite-raiox-tavir.html'), 'utf8'), {
    '{{CONTACT_NAME}}': escapeHtml(contato), '{{COMPANY_NAME}}': escapeHtml(empresa), '{{FORM_URL}}': escapeHtml(formUrl),
  });
  const text = fill(fs.readFileSync(asset(repo, 'raiox', 'modelos', 'email-convite-raiox-tavir.txt'), 'utf8'), {
    '{{CONTACT_NAME}}': contato, '{{COMPANY_NAME}}': empresa, '{{FORM_URL}}': formUrl,
  });
  return {
    from: cfg.from, to: [email], subject: `Seu convite para o Raio-X TAVIR · ${empresa}`, html, text,
    attachments: [logoAttachment(repo)],
    ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
  };
}

export function deliveryPayload(delivery: { email: string; contactName: string; companyName: string }, pdfs: string[], cfg: ResendConfig, repo: string): Record<string, unknown> {
  const email = String(delivery.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new RaioxError('E-mail da entrega inválido.');
  if (pdfs.length !== 2) throw new RaioxError('A entrega leva os dois PDFs (relatório e plano). Gere os PDFs antes.');
  const contato = safeText(delivery.contactName, 'Olá');
  const empresa = safeText(delivery.companyName, 'seu negócio');
  const html = fill(fs.readFileSync(asset(repo, 'raiox', 'modelos', 'email-raiox-tavir.html'), 'utf8'), {
    '{{CONTACT_NAME_HTML}}': escapeHtml(contato), '{{COMPANY_NAME_HTML}}': escapeHtml(empresa),
  });
  const text = fill(fs.readFileSync(asset(repo, 'raiox', 'modelos', 'email-raiox-tavir.txt'), 'utf8'), {
    '{{CONTACT_NAME_TEXT}}': contato, '{{COMPANY_NAME_TEXT}}': empresa,
  });
  const attachments = [logoAttachment(repo), ...pdfs.map((file) => {
    const size = fs.statSync(file).size;
    if (size <= 0 || size > 15 * 1024 * 1024) throw new RaioxError('PDF com tamanho inválido. Gere de novo.');
    return { filename: path.basename(file), content: fs.readFileSync(file).toString('base64'), content_type: 'application/pdf' };
  })];
  return {
    from: cfg.from, to: [email], subject: `Seu Raio-X TAVIR e plano de crescimento · ${empresa}`, html, text, attachments,
    ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
  };
}

/** POST no Resend com chave de idempotência. Devolve o id do envio ou lança sem detalhe cru. */
export async function sendResend(payload: Record<string, unknown>, idempotencyKey: string, cfg: ResendConfig, fetchImpl: typeof fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey.slice(0, 256), 'User-Agent': 'TAVIR-Escritorio-RaioX/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new RaioxError(SEND_FAILED);
  }
  if (!response.ok) throw new RaioxError(`${SEND_FAILED} (HTTP ${response.status})`);
  let id = '';
  try {
    id = String(((await response.json()) as { id?: unknown }).id || '').toLowerCase();
  } catch {
    throw new RaioxError(SEND_FAILED);
  }
  if (!UUID_RE.test(id)) throw new RaioxError(SEND_FAILED);
  return id;
}

function remoteId(c: RaioxCase): string {
  if (!c.remote?.supabaseId) throw new RaioxError('Este caso não tem formulário no Supabase.');
  return c.remote.supabaseId;
}

/** Documentos aprovados no formato do Supabase, com a rodada (versão dos documentos). */
function approvedDocs(c: RaioxCase): { round: number; docs: RaioxDocHash[]; pdfs: string[] } {
  const debrief = c.debrief;
  const docs = debrief?.documents || [];
  const approval = debrief?.approval;
  if (!approval) throw new RaioxError('Aprove os documentos antes de preparar a entrega.');
  const relatorio = docs.find((d) => d.kind === 'relatorio');
  const plano = docs.find((d) => d.kind === 'plano');
  if (!relatorio || !plano) throw new RaioxError('A entrega precisa do relatório e do plano.');
  if (approval.hashes.join() !== [relatorio.sha256, plano.sha256].join()) {
    throw new RaioxError('Os documentos mudaram depois da aprovação. Aprove de novo.');
  }
  if (relatorio.version !== plano.version) throw new RaioxError('Relatório e plano estão em versões diferentes. Gere os dois de novo.');
  return {
    round: relatorio.version,
    docs: [{ kind: 'raio_x', sha256: relatorio.sha256 }, { kind: 'plano_crescimento', sha256: plano.sha256 }],
    pdfs: [relatorio.pdf, plano.pdf].filter((p): p is string => !!p),
  };
}

/** Ato 1 do Carlos: registra a aprovação no Supabase e prepara a entrega. */
export async function prepareDelivery(id: string, deps: SendDeps): Promise<RaioxCase> {
  const root = deps.root;
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const c = readCase(root, id);
  assertActive(c);
  if (c.debrief?.delivery) throw new RaioxError('Esta entrega já foi feita. Não reenvie.');
  const supa = remoteId(c);
  const { round, docs, pdfs } = approvedDocs(c);
  if (pdfs.length !== 2) throw new RaioxError('Gere os PDFs antes de preparar a entrega.');
  assertReleased(root, 'escritaSupabase');
  await persistReview(supa, round, docs, deps);
  const prepared = await deliveryPrepare(supa, round, docs, deps);
  const latest = readCase(root, id);
  assertActive(latest);
  if (prepared.alreadySent) {
    throw new RaioxError('Esta entrega já foi feita. Não reenvie.');
  }
  const next: RaioxCase = {
    ...latest,
    debrief: {
      ...latest.debrief!,
      pendingDelivery: {
        deliveryId: prepared.deliveryId, idempotencyKey: prepared.idempotencyKey, email: prepared.email,
        contactName: prepared.contactName, companyName: prepared.companyName, round, preparedAt: now,
      },
    },
    updatedAt: now,
  };
  writeCase(root, next);
  return next;
}

/** Ato 2 do Carlos: "Autorizar envio para <e-mail>". Confere tudo de novo antes de mandar. */
export async function sendPreparedDelivery(id: string, confirmEmail: string, deps: SendDeps): Promise<RaioxCase> {
  const root = deps.root;
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const repo = deps.repo ?? repoRoot();
  const c = readCase(root, id);
  assertActive(c);
  if (c.debrief?.delivery) throw new RaioxError('Esta entrega já foi feita. Não reenvie.');
  const pending = c.debrief?.pendingDelivery;
  if (!pending) throw new RaioxError('Prepare a entrega antes de autorizar o envio.');
  if (String(confirmEmail || '').trim().toLowerCase() !== pending.email) {
    throw new RaioxError('A autorização tem de ser para o mesmo e-mail que o Supabase devolveu.');
  }
  const supa = remoteId(c);
  const { round, pdfs } = approvedDocs(c);
  if (round !== pending.round) throw new RaioxError('Os documentos mudaram depois de preparar a entrega. Prepare de novo.');
  assertReleased(root, 'escritaSupabase');
  const cfg = resendConfig(deps);
  assertRecipientAllowed(root, pending.email, cfg.from);
  const files = pdfs.map((rel) => documentPath(root, id, rel));
  const payload = deliveryPayload(pending, files, cfg, repo);
  let providerId = '';
  try {
    providerId = await sendResend(payload, pending.idempotencyKey, cfg, deps.resendFetch ?? fetch);
  } catch (err) {
    await deliveryFinalize(supa, pending.deliveryId, 'failed', deps, '', 'resend_failed').catch(() => undefined);
    throw err;
  }
  await deliveryFinalize(supa, pending.deliveryId, 'sent', deps, providerId);
  const latest = readCase(root, id);
  let next = recordDelivery(latest, { channel: 'resend', to: pending.email, note: `Resend ${providerId}` }, now);
  next.debrief = { ...next.debrief!, pendingDelivery: undefined };
  next = recordVendor(next, readVendorCatalog(repo), 'resend', 'entrega dos documentos', now);
  writeCase(root, next);
  return next;
}

export interface InviteRequest { company: string; contact: string; email: string; optin: RaioxOptin }

/** T8.3: cria o caso no Supabase (com opt-in), o caso local ligado a ele e manda o convite. */
export async function sendInvite(input: InviteRequest, deps: SendDeps & { uuid?: () => string }): Promise<RaioxCase> {
  const root = deps.root;
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const repo = deps.repo ?? repoRoot();
  assertReleased(root, 'escritaSupabase');
  const cfg = resendConfig(deps);
  // Confere o destinatário antes de criar qualquer coisa no Supabase.
  assertRecipientAllowed(root, input.email, cfg.from);
  const created = await createRemoteCase(input, deps);
  const mode = RAIOX_CATALOG.find((item) => item.id === 'diagnostico');
  let local = createCase({
    company: input.company, contact: input.contact,
    objective: mode?.defaults.objective || '', decisionNeeded: mode?.defaults.decisionNeeded || '',
    mode: 'diagnostico', origin: 'formulario', consent: { kind: 'formulario', at: now, note: 'Convite enviado pelo Escritório.' },
  }, now, (deps.uuid ?? (() => created.caseId))());
  local = {
    ...local,
    optin: input.optin,
    remote: { supabaseId: created.caseId, status: 'draft', syncedAt: now, emailVerified: false, revoked: false },
  };
  const catalog = readVendorCatalog(repo);
  for (const [vendor, use] of [['supabase', 'caso remoto'], ['vercel', 'formulário']] as const) {
    local = recordVendor(local, catalog, vendor, use, now);
  }
  writeCase(root, local);
  try {
    const providerId = await sendResend(
      invitePayload({ email: input.email, contactName: input.contact, companyName: input.company, formUrl: created.formUrl }, cfg, repo),
      created.idempotencyKey, cfg, deps.resendFetch ?? fetch,
    );
    await inviteFinalize(created.caseId, created.inviteDeliveryId, 'sent', deps, providerId);
    local = { ...readCase(root, local.id) };
    local.remote = { ...local.remote!, status: 'form_1_sent' };
    local = recordVendor(local, catalog, 'resend', 'convite', now);
  } catch (err) {
    await inviteFinalize(created.caseId, created.inviteDeliveryId, 'failed', deps, '', 'resend_failed').catch(() => undefined);
    throw err;
  }
  writeCase(root, local);
  return local;
}
