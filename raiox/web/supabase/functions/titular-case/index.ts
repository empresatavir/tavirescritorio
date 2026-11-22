// G-PR1 controles 7 e 8 levados ao Supabase pelo Escritório (F8).
// action "revoke": chama revoke_raiox_case (fecha formulário e confirmação; funções passam a
// recusar com case_revoked). action "purge": chama purge_raiox_case e devolve só contagens.
// Autenticação pelo segredo interno do Escritório. Nenhuma resposta leva dado do titular.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 4 * 1024;
// Mesma lista da migração 20261121140000 e de RAIOX_OPTIN_CHANNELS (src/shared/raiox.ts).
const CHANNELS = ["whatsapp", "telefone", "presencial", "videochamada", "email"];
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const safeEqual = (left: string, right: string) => {
  const a = encoder.encode(left); const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};
const counts = (value: unknown) => {
  const out: Record<string, number> = {};
  if (value && typeof value === "object") {
    for (const [key, n] of Object.entries(value as Record<string, unknown>)) {
      if (/^[a-z_]{1,40}$/.test(key) && Number.isInteger(n)) out[key] = Number(n);
    }
  }
  return out;
};

Deno.serve(async (request) => {
  const supplied = request.headers.get("x-raiox-internal-secret") || "";
  const expected = Deno.env.get("RAIOX_INTERNAL_GATE_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 || !safeEqual(supplied, expected)) {
    return response({ error: "unauthorized" }, 401);
  }
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return response({ error: "invalid_request" }, 400); }
  const caseId = String(body.case_id || "").toLowerCase();
  const action = String(body.action || "");
  if (!uuid(caseId) || !["revoke", "purge"].includes(action)) return response({ error: "invalid_request" }, 400);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (action === "revoke") {
    const channel = String(body.channel || "");
    const requestedAt = String(body.requested_at || "");
    if (!CHANNELS.includes(channel) || Number.isNaN(Date.parse(requestedAt))) return response({ error: "invalid_request" }, 400);
    const { data, error } = await supabase.rpc("revoke_raiox_case", {
      p_case_id: caseId, p_channel: channel, p_requested_at: new Date(requestedAt).toISOString(),
    });
    if (error || !data) return response({ error: "revoke_not_recorded" }, 500);
    if (data.revoked !== true) {
      const code = ["invalid_request", "case_not_found"].includes(data.error) ? data.error : "revoke_not_recorded";
      return response({ error: code }, code === "case_not_found" ? 404 : 400);
    }
    return response({ ok: true, action, already: data.already === true });
  }

  const { data, error } = await supabase.rpc("purge_raiox_case", { p_case_id: caseId });
  if (error || !data) return response({ error: "purge_not_completed" }, 500);
  if (data.purged !== true) {
    // Caso que já não existe no banco: expurgo idempotente, nada a apagar.
    if (data.reason === "case_not_found") return response({ ok: true, action, purged: false, before: {}, after: {} });
    return response({ error: "purge_not_completed" }, 500);
  }
  return response({
    ok: true, action, purged: true, before: counts(data.before), after: counts(data.after),
    storage_objects_to_check: Number(data.storage_objects_to_check) || 0,
    provider_messages_to_check: Number(data.provider_messages_to_check) || 0,
  });
});
