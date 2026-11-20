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
const pick = (source: Record<string, unknown> | null | undefined, fields: string[]) =>
  Object.fromEntries(fields.filter((field) => source?.[field] !== undefined).map((field) => [field, source![field]]));

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
  const caseId = String(body.case_id || "");
  const action = String(body.action || "");
  if (!/^[0-9a-f-]{36}$/i.test(String(caseId)) || !["form2", "analyse"].includes(action)) return response({ error: "invalid_request" }, 400);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (action === "analyse") {
    const [{ data: caseRow }, { data: submissions }, { data: consents }] = await Promise.all([
      supabase.from("raiox_cases").select("id,status,company_name").eq("id", caseId).maybeSingle(),
      supabase.from("raiox_form_submissions").select("stage,answers,submitted_at").eq("case_id", caseId).order("stage"),
      supabase.from("raiox_consents").select("scope,accepted,accepted_at").eq("case_id", caseId).eq("scope", "public_sources").order("accepted_at", { ascending: false }),
    ]);
    if (!caseRow || !["form_2_received", "awaiting_approval"].includes(caseRow.status)) {
      return response({ error: "case_not_ready" }, 409);
    }
    if (!consents?.some((item) => item.accepted === true)) {
      return response({ error: "public_sources_not_authorized" }, 403);
    }
    const stage1 = submissions?.find((item) => item.stage === 1)?.answers as Record<string, unknown> | undefined;
    const stage2 = submissions?.find((item) => item.stage === 2)?.answers as Record<string, unknown> | undefined;
    if (!stage1) return response({ error: "submission_not_found" }, 409);
    const operationalAnswers = stage2 || stage1;
    const packet = {
      case_id: caseRow.id,
      company_name: caseRow.company_name,
      public_sources_authorized: true,
      stage_1: pick(stage1, ["empresa_nome", "cargo_contato", "cidade_uf", "nicho",
        "atuacao_atual", "atuacao_desejada", "objetivo_principal", "horizonte_prioridade",
        "decisao_diagnostico", "links", "objetivo"]),
      stage_2: pick(operationalAnswers, ["oferta_prioritaria", "diferencial", "ticket_faixa",
        "margem_status", "capacidade_status", "capacidade_semanal", "origem_pedidos",
        "pedidos_atual", "tempo_resposta", "canal_fechamento", "modalidades_entrega",
        "mensuracao_status", "frequencia_conteudo", "disponibilidade_conteudo",
        "formatos_conteudo", "aparicao_conteudo", "equipe_operacao", "investimento_faixa",
        "possui_loja_fisica", "endereco", "google_perfil_status", "area_atendida",
        "horarios_funcionamento", "pico_atendimento", "avaliacoes_processo", "acesso_local",
        "tentativas", "limitacoes"]),
      prepared_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase.from("raiox_cases")
      .update({ status: "awaiting_approval", updated_at: new Date().toISOString() })
      .eq("id", caseId);
    if (updateError) return response({ error: "case_not_updated" }, 500);
    return response({ ok: true, action, packet });
  }
  const { data: form2Case, error: form2CaseError } = await supabase.from("raiox_cases")
    .select("id,status").eq("id", caseId).maybeSingle();
  if (form2CaseError) return response({ error: "form2_not_created" }, 500);
  if (!form2Case || form2Case.status !== "form_1_received") {
    return response({ error: "case_not_ready_for_form2" }, 409);
  }
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const { data: session, error } = await supabase.from("raiox_form_sessions")
    .insert({ case_id: caseId, stage: 2, token_hash: await sha256(token), expires_at: expiresAt.toISOString() })
    .select("id").single();
  if (error || !session) return response({ error: "form2_not_created" }, 409);
  const { data: transitioned, error: transitionError } = await supabase.from("raiox_cases")
    .update({ status: "form_2_sent", updated_at: new Date().toISOString() })
    .eq("id", caseId).eq("status", "form_1_received").select("id").maybeSingle();
  if (transitionError || !transitioned) {
    await supabase.from("raiox_form_sessions").delete().eq("id", session.id);
    return response({ error: "form2_not_created" }, 409);
  }
  const exp = Math.floor(expiresAt.getTime() / 1000).toString();
  const sig = await hmac(`${token}.${exp}`);
  return response({ ok: true, action, form_url: `${Deno.env.get("RAIOX_APP_URL")}/form/${token}?exp=${exp}&sig=${sig}` });
});
