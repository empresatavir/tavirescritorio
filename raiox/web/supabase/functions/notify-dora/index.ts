import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST" || request.headers.get("x-raiox-webhook-secret") !== Deno.env.get("RAIOX_WEBHOOK_SECRET")) return json({ error: "unauthorized" }, 401);
  const payload = await request.json();
  const event = payload.record ?? payload;
  if (!event?.id || !["form_1_submitted", "form_2_submitted"].includes(event.event_type) || event.status !== "pending") return json({ ignored: true });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: claimed } = await supabase.from("raiox_events").update({ status: "processing" }).eq("id", event.id).eq("status", "pending").select("id,case_id,event_type,payload").maybeSingle();
  if (!claimed) return json({ duplicate: true });
  const stage = claimed.event_type === "form_1_submitted" ? 1 : 2;
  const buttons = stage === 1
    ? [[{ text: "Gerar formulário 2", callback_data: `rx|form2|${claimed.case_id}` }], [{ text: "Iniciar Raio X", callback_data: `rx|analyse|${claimed.case_id}` }]]
    : [[{ text: "Iniciar Raio X", callback_data: `rx|analyse|${claimed.case_id}` }]];
  const unified = stage === 2 && claimed.payload?.mode === "unified";
  const message = unified
    ? `Raio X ${claimed.case_id}\nIntake completo recebido em um único envio. Autorize quando quiser iniciar a análise.`
    : `Raio X ${claimed.case_id}\nFormulário ${stage} recebido. Escolha o próximo passo.`;
  const response = await fetch(`https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: Deno.env.get("TELEGRAM_CEO_CHAT_ID"), text: message, reply_markup: { inline_keyboard: buttons } })
  });
  if (!response.ok) { await supabase.from("raiox_events").update({ status: "failed" }).eq("id", claimed.id); return json({ error: "telegram_failed" }, 502); }
  await supabase.from("raiox_events").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", claimed.id);
  return json({ ok: true });
});
