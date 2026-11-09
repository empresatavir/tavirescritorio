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
  const supplied = request.headers.get("x-raiox-review-secret") || "";
  const expected = Deno.env.get("RAIOX_REVIEW_GATE_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 || !safeEqual(supplied, expected)) {
    return response({ error: "unauthorized" }, 401);
  }
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return response({ error: "invalid_request" }, 400); }
  const caseId = String(body.case_id || "");
  const round = Number(body.approval_round);
  const documents = normalizeDocuments(body.documents);
  if (!uuid(caseId) || !Number.isInteger(round) || round < 1 || !documents) {
    return response({ error: "invalid_request" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: caseRow, error: caseError } = await supabase.from("raiox_cases")
    .select("id,status").eq("id", caseId).maybeSingle();
  if (caseError) return response({ error: "review_not_recorded" }, 500);
  if (!caseRow || !["awaiting_approval", "analysing", "review"].includes(caseRow.status)) {
    return response({ error: "case_not_reviewable" }, 409);
  }

  const { data: existing, error: existingError } = await supabase.from("raiox_approvals")
    .select("id,document_hashes").eq("case_id", caseId).eq("action", "documents_approved")
    .eq("status", "approved").eq("approval_round", round).maybeSingle();
  if (existingError) return response({ error: "review_not_recorded" }, 500);
  if (existing) {
    if (JSON.stringify(existing.document_hashes) !== JSON.stringify(documents)) {
      return response({ error: "review_conflict" }, 409);
    }
    const { error: repairError } = await supabase.from("raiox_cases")
      .update({ status: "review", updated_at: new Date().toISOString() }).eq("id", caseId);
    if (repairError) return response({ error: "case_not_updated" }, 500);
    return response({ ok: true, review_id: existing.id, already_recorded: true });
  }

  const now = new Date().toISOString();
  const { data: review, error: reviewError } = await supabase.from("raiox_approvals").insert({
    case_id: caseId, action: "documents_approved", status: "approved", approval_round: round,
    document_hashes: documents, operator_ref: "telegram_ceo", decided_at: now,
  }).select("id").single();
  if (reviewError || !review) {
    if (reviewError?.code === "23505") return response({ error: "review_conflict" }, 409);
    return response({ error: "review_not_recorded" }, 500);
  }
  const { error: updateError } = await supabase.from("raiox_cases")
    .update({ status: "review", updated_at: now }).eq("id", caseId);
  if (updateError) return response({ error: "case_not_updated" }, 500);
  return response({ ok: true, review_id: review.id, already_recorded: false });
});
