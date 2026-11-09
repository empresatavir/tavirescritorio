import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const MAX_BODY_BYTES = 16 * 1024;
const encoder = new TextEncoder();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
const sha = (value: string) => /^[0-9a-f]{64}$/.test(value);
const safeEqual = (left: string, right: string) => {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};
const normalizeDocuments = (documents: unknown) => {
  if (!Array.isArray(documents) || documents.length !== 2) return null;
  const normalized = documents.map((doc) => ({
    kind: String((doc as Record<string, unknown>)?.kind || ""),
    sha256: String((doc as Record<string, unknown>)?.sha256 || "").toLowerCase(),
  })).sort((a, b) => a.kind.localeCompare(b.kind));
  if (normalized.some((doc) => !["plano_crescimento", "raio_x"].includes(doc.kind) || !sha(doc.sha256))
      || new Set(normalized.map((doc) => doc.kind)).size !== 2) return null;
  return normalized;
};

Deno.serve(async (request) => {
  const supplied = request.headers.get("x-raiox-delivery-secret") || "";
  const expected = Deno.env.get("RAIOX_DELIVERY_GATE_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 || !safeEqual(supplied, expected)) {
    return response({ error: "unauthorized" }, 401);
  }
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return response({ error: "invalid_request" }, 400); }
  const caseId = String(body.case_id || "");
  const action = String(body.action || "");
  if (!uuid(caseId) || !["prepare", "finalize"].includes(action)) {
    return response({ error: "invalid_request" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (action === "finalize") {
    const deliveryId = String(body.delivery_id || "");
    const status = String(body.status || "");
    const providerId = String(body.provider_id || "").trim();
    if (!uuid(deliveryId) || !["sent", "failed"].includes(status)) {
      return response({ error: "invalid_request" }, 400);
    }
    if (status === "sent" && !uuid(providerId)) return response({ error: "invalid_provider_id" }, 400);
    const { data: current, error: currentError } = await supabase.from("raiox_email_deliveries")
      .select("id,approval_round,status").eq("id", deliveryId).eq("case_id", caseId).maybeSingle();
    if (currentError) return response({ error: "delivery_not_updated" }, 500);
    if (!current) return response({ error: "delivery_not_updated" }, 409);
    if (current.status === status) {
      return response({ ok: true, delivery_id: current.id, status, already_finalized: true });
    }
    if (current.status === "sent") return response({ error: "delivery_immutable" }, 409);

    const now = new Date().toISOString();
    const patch = status === "sent"
      ? { status, provider_id: providerId, error_code: null,
          sent_at: now, updated_at: now }
      : { status, provider_id: null, error_code: String(body.error_code || "delivery_failed").slice(0, 80),
          sent_at: null, updated_at: now };
    const { data: delivery, error } = await supabase.from("raiox_email_deliveries")
      .update(patch).eq("id", deliveryId).eq("case_id", caseId).neq("status", "sent")
      .select("id,approval_round,status").maybeSingle();
    if (error || !delivery) return response({ error: "delivery_not_updated" }, 409);
    if (status === "sent") {
      const [caseResult, documentsResult] = await Promise.all([
        supabase.from("raiox_cases").update({ status: "sent", updated_at: now }).eq("id", caseId),
        supabase.from("raiox_documents").update({ status: "sent" })
          .eq("case_id", caseId).eq("version", delivery.approval_round),
      ]);
      if (caseResult.error || documentsResult.error) return response({ error: "delivery_close_incomplete" }, 500);
    }
    return response({ ok: true, delivery_id: delivery.id, status, already_finalized: false });
  }

  const round = Number(body.approval_round);
  const documents = normalizeDocuments(body.documents);
  if (!Number.isInteger(round) || round < 1 || !documents) return response({ error: "invalid_request" }, 400);

  const [{ data: caseRow, error: caseError }, { data: stageOne, error: stageError },
    { data: consent, error: consentError }, { data: review, error: reviewError }] = await Promise.all([
    supabase.from("raiox_cases").select("id,status,company_name,contact_name,contact_email").eq("id", caseId).maybeSingle(),
    supabase.from("raiox_form_submissions").select("answers").eq("case_id", caseId).eq("stage", 1).maybeSingle(),
    supabase.from("raiox_consents").select("accepted").eq("case_id", caseId).eq("scope", "email_delivery")
      .eq("accepted", true).limit(1).maybeSingle(),
    supabase.from("raiox_approvals").select("id,document_hashes").eq("case_id", caseId)
      .eq("action", "documents_approved").eq("status", "approved").eq("approval_round", round).maybeSingle(),
  ]);
  if (caseError || stageError || consentError || reviewError) return response({ error: "delivery_not_prepared" }, 500);
  if (!caseRow || !["review", "ready"].includes(caseRow.status)) return response({ error: "case_not_approved" }, 409);
  if (!review || JSON.stringify(review.document_hashes) !== JSON.stringify(documents)) {
    return response({ error: "review_not_matched" }, 403);
  }
  const answers = (stageOne?.answers || {}) as Record<string, unknown>;
  const email = String(caseRow.contact_email || answers.email || "").trim().toLowerCase();
  const contactName = String(caseRow.contact_name || answers.contato_nome || "").trim();
  if (!consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response({ error: "delivery_not_authorized" }, 403);
  }

  const fingerprint = documents.map((doc) => `${doc.kind}:${doc.sha256}`).join("|");
  const idempotencyKey = `raiox:${caseId}:${round}:${fingerprint}`;
  const existingQuery = () => supabase.from("raiox_email_deliveries")
    .select("id,status,idempotency_key").eq("idempotency_key", idempotencyKey).maybeSingle();
  const { data: existing, error: existingError } = await existingQuery();
  if (existingError) return response({ error: "delivery_not_prepared" }, 500);
  if (existing?.status === "sent") return response({ ok: true, delivery_id: existing.id,
    delivery_status: existing.status, already_sent: true, send_authorized: false });
  if (existing) return response({ error: "delivery_reconciliation_required",
    delivery_id: existing.id, delivery_status: existing.status }, 409);

  const { data: delivery, error: deliveryError } = await supabase.from("raiox_email_deliveries").insert({
    case_id: caseId, approval_round: round, document_hashes: documents, idempotency_key: idempotencyKey,
  }).select("id,status,idempotency_key").single();
  if (deliveryError || !delivery) {
    if (deliveryError?.code === "23505") {
      const { data: concurrent } = await existingQuery();
      if (concurrent?.status === "sent") return response({ ok: true, delivery_id: concurrent.id,
        delivery_status: concurrent.status, already_sent: true, send_authorized: false });
      if (concurrent) return response({ error: "delivery_reconciliation_required",
        delivery_id: concurrent.id, delivery_status: concurrent.status }, 409);
    }
    return response({ error: "delivery_not_prepared" }, 409);
  }

  const documentResults = await Promise.all(documents.map((doc) => supabase.from("raiox_documents").upsert({
    case_id: caseId, kind: doc.kind, version: round, sha256: doc.sha256,
    storage_path: `private://raiox/${caseId}/${doc.kind}/${doc.sha256}`, status: "approved",
  }, { onConflict: "case_id,kind,version" })));
  if (documentResults.some((result) => result.error)) {
    await supabase.from("raiox_email_deliveries").delete().eq("id", delivery.id);
    return response({ error: "documents_not_recorded" }, 500);
  }
  const now = new Date().toISOString();
  const [approvalResult, caseResult] = await Promise.all([
    supabase.from("raiox_approvals").insert({ case_id: caseId, action: "email_delivery_approved",
      status: "approved", approval_round: round, document_hashes: documents,
      operator_ref: "telegram_ceo", decided_at: now }),
    supabase.from("raiox_cases").update({ status: "ready", updated_at: now }).eq("id", caseId),
  ]);
  if (approvalResult.error || caseResult.error) {
    await supabase.from("raiox_email_deliveries").delete().eq("id", delivery.id);
    return response({ error: "approval_not_recorded" }, 500);
  }
  return response({ ok: true, delivery_id: delivery.id, delivery_status: delivery.status,
    idempotency_key: delivery.idempotency_key, already_sent: false, send_authorized: true, email,
    contact_name: contactName, company_name: caseRow.company_name });
});
