import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const MAX_BODY_BYTES = 8 * 1024;
const encoder = new TextEncoder();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
const safeEqual = (left: string, right: string) => {
  const a = encoder.encode(left); const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};

Deno.serve(async (request) => {
  const supplied = request.headers.get("x-raiox-invite-secret") || "";
  const expected = Deno.env.get("RAIOX_INVITE_GATE_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 || !safeEqual(supplied, expected)) {
    return response({ error: "unauthorized" }, 401);
  }
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return response({ error: "invalid_request" }, 400); }
  const caseId = String(body.case_id || "");
  const deliveryId = String(body.delivery_id || "");
  const status = String(body.status || "");
  const providerId = String(body.provider_id || "").trim();
  if (!uuid(caseId) || !uuid(deliveryId) || !["sent", "failed", "uncertain"].includes(status)) {
    return response({ error: "invalid_request" }, 400);
  }
  if (status === "sent" && !uuid(providerId)) return response({ error: "invalid_provider_id" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: current, error: currentError } = await supabase.from("raiox_invite_deliveries")
    .select("id,status").eq("id", deliveryId).eq("case_id", caseId).maybeSingle();
  if (currentError) return response({ error: "invite_not_updated" }, 500);
  if (!current) return response({ error: "invite_not_updated" }, 409);
  if (current.status === status) return response({ ok: true, status, already_finalized: true });
  if (current.status === "sent") return response({ error: "invite_immutable" }, 409);

  const now = new Date().toISOString();
  const patch = status === "sent"
    ? { status, provider_id: providerId, error_code: null, sent_at: now, updated_at: now }
    : { status, provider_id: null, error_code: String(body.error_code || `invite_${status}`).slice(0, 80),
        sent_at: null, updated_at: now };
  const { data: updated, error } = await supabase.from("raiox_invite_deliveries")
    .update(patch).eq("id", deliveryId).eq("case_id", caseId).neq("status", "sent")
    .select("id,status").maybeSingle();
  if (error || !updated) return response({ error: "invite_not_updated" }, 409);
  return response({ ok: true, status: updated.status, already_finalized: false });
});
