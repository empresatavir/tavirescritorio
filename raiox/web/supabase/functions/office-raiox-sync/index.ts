import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";
const encoder = new TextEncoder();
const MAX_CASES = 500;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const safeEqual = (left: string, right: string) => { const a = encoder.encode(left); const b = encoder.encode(right); if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]; return diff === 0; };
Deno.serve(async (request) => {
  const supplied = request.headers.get("x-raiox-office-sync-secret") || "";
  const expected = Deno.env.get("RAIOX_OFFICE_SYNC_SECRET") || "";
  if (request.method !== "GET" || expected.length < 32 || !safeEqual(supplied, expected)) return response({ error: "unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.from("raiox_cases").select("id,status,company_name,created_at,updated_at").order("updated_at", { ascending: false }).limit(MAX_CASES);
  if (error) return response({ error: "sync_unavailable" }, 500);
  const cases = (data || []).map((row) => ({ id: row.id, status: row.status, cliente: row.company_name || "", etapa: row.status, criado_em: row.created_at, atualizado_em: row.updated_at }));
  return response({ ok: true, cases, source: "supabase-raiox", truncated: cases.length === MAX_CASES });
});
