import crypto from "node:crypto";

const CHECKS_PER_RUN = 3;
const MIN_SECRET_LENGTH = 32;

function reply(response, status, body) {
  response.status(status);
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.end(JSON.stringify(body));
}

function securelyMatches(received, expected) {
  if (!received?.startsWith("Bearer ") || !expected) return false;
  const supplied = Buffer.from(received.slice(7));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && crypto.timingSafeEqual(supplied, configured);
}

function supabaseKey() {
  return process.env.SUPA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function supabaseHeaders(key) {
  const headers = {
    apikey: key,
    Accept: "application/json",
    "Cache-Control": "no-store",
    "X-Client-Info": "tavir-raiox-health/1.0",
  };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function performHealthChecks() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = supabaseKey();
  if (!baseUrl || !key) throw new Error("health_configuration_missing");

  const url = `${baseUrl}/rest/v1/raiox_cases?select=id&limit=1`;
  for (let attempt = 0; attempt < CHECKS_PER_RUN; attempt += 1) {
    const result = await fetch(url, {
      method: "GET",
      headers: supabaseHeaders(key),
      signal: AbortSignal.timeout(8_000),
    });
    await result.arrayBuffer();
    if (!result.ok) throw new Error(`health_supabase_${result.status}`);
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return reply(response, 405, { ok: false, code: "method_not_allowed" });
  }

  const secret = process.env.CRON_SECRET || "";
  if (secret.length < MIN_SECRET_LENGTH) {
    console.error("supabase_health_misconfigured");
    return reply(response, 503, { ok: false, code: "health_check_unavailable" });
  }
  if (!securelyMatches(request.headers.authorization, secret)) {
    return reply(response, 401, { ok: false, code: "unauthorized" });
  }

  try {
    await performHealthChecks();
    return reply(response, 200, {
      ok: true,
      checks: CHECKS_PER_RUN,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    const reason = error instanceof Error && /^health_(configuration_missing|supabase_\d{3})$/.test(error.message)
      ? error.message
      : "health_dependency_error";
    console.error("supabase_health_failed", reason);
    return reply(response, 503, { ok: false, code: "dependency_unavailable" });
  }
}
