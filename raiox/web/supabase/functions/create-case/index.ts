import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 16 * 1024;
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const hmac = async (value: string) => { const key = await crypto.subtle.importKey("raw", encoder.encode(Deno.env.get("FORM_LINK_SIGNING_SECRET")!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value))); };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const safeEqual = (left: string, right: string) => {
  const a = encoder.encode(left); const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};

Deno.serve(async (request) => {
  const supplied = request.headers.get("x-raiox-internal-secret") || "";
  const expected = Deno.env.get("RAIOX_INTERNAL_GATE_SECRET") || "";
  const signingSecret = Deno.env.get("FORM_LINK_SIGNING_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 || signingSecret.length < 32
      || !safeEqual(supplied, expected)) return response({ error: "unauthorized" }, 401);
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return response({ error: "invalid_request" }, 400); }
  const companyName = String(body.empresa_nome || "").trim().slice(0, 140);
  const contactName = String(body.contato_nome || "").trim().slice(0, 120);
  const contactEmail = String(body.contato_email || "").trim().toLowerCase().slice(0, 254);
  const configuredAppUrl = String(Deno.env.get("RAIOX_APP_URL") || "").replace(/\/+$/, "");
  let appOrigin = "";
  try {
    const parsed = new URL(configuredAppUrl);
    const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password
        || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid_app_url");
    appOrigin = parsed.origin;
  } catch { return response({ error: "server_not_configured" }, 503); }
  if (!companyName || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return response({ error: "invalid_case" }, 400);
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: caseRow, error: caseError } = await supabase.from("raiox_cases").insert({
    company_name: companyName, contact_name: contactName, contact_email: contactEmail,
    status: "form_1_sent",
  }).select("id").single();
  if (caseError || !caseRow) return response({ error: "case_not_created" }, 500);
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const { error: sessionError } = await supabase.from("raiox_form_sessions").insert({ case_id: caseRow.id, stage: 1, token_hash: await sha256(token), expires_at: expiresAt.toISOString() });
  if (sessionError) { await supabase.from("raiox_cases").delete().eq("id", caseRow.id); return response({ error: "form_not_created" }, 500); }
  const idempotencyKey = `raiox-invite:${caseRow.id}:v1`;
  const { data: invite, error: inviteError } = await supabase.from("raiox_invite_deliveries")
    .insert({ case_id: caseRow.id, idempotency_key: idempotencyKey })
    .select("id,idempotency_key").single();
  if (inviteError || !invite) {
    await supabase.from("raiox_cases").delete().eq("id", caseRow.id);
    return response({ error: "invite_not_created" }, 500);
  }
  const exp = Math.floor(expiresAt.getTime() / 1000).toString();
  const sig = await hmac(`${token}.${exp}`);
  return response({
    ok: true, case_id: caseRow.id,
    form_url: `${appOrigin}/form/${token}?exp=${exp}&sig=${sig}`,
    invite_delivery_id: invite.id, idempotency_key: invite.idempotency_key,
  });
});
