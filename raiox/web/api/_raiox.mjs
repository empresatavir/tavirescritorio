import crypto from "node:crypto";

const now = () => Math.floor(Date.now() / 1000);
const env = (name) => { const value = process.env[name]; if (!value) throw new Error(`missing_${name}`); return value; };
export const json = (response, status, body) => { response.status(status).setHeader("Content-Type", "application/json"); response.setHeader("Cache-Control", "no-store"); response.end(JSON.stringify(body)); };
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const ENUMS = {
  cargo_contato: ["Proprietário(a) ou sócio(a)", "Gestor(a)", "Marketing ou comunicação", "Atendimento ou vendas", "Outro"],
  atuacao_atual: ["Física", "Online", "Física e online"],
  atuacao_desejada: ["Física", "Online", "Física e online"],
  objetivo_principal: ["Aumentar visitas à loja física", "Gerar mais conversas no WhatsApp", "Gerar mais pedidos ou vendas", "Fortalecer a presença e a confiança", "Melhorar recorrência e pós-venda", "Organizar marketing e conteúdo", "Lançar uma oferta ou canal", "Entender qual gargalo atacar primeiro"],
  horizonte_prioridade: ["Próximos 30 dias", "Entre 30 e 90 dias", "Entre 3 e 6 meses", "Ainda não há prazo definido"],
  ticket_faixa: ["Até R$ 50", "De R$ 51 a R$ 150", "De R$ 151 a R$ 500", "De R$ 501 a R$ 2.000", "Acima de R$ 2.000", "Varia muito", "Ainda não medimos", "Prefiro não informar"],
  margem_status: ["Sim, por produto ou serviço", "Temos uma estimativa geral", "Ainda não calculamos", "Prefiro não informar"],
  capacidade_status: ["Há capacidade disponível", "Há capacidade limitada", "Já estamos próximos do limite", "Não sabemos ainda"],
  tempo_resposta: ["Até 5 minutos", "De 6 a 30 minutos", "De 31 minutos a 2 horas", "No mesmo dia", "Mais de um dia", "Varia muito ou não sabemos"],
  canal_fechamento: ["No balcão ou presencialmente", "No WhatsApp", "No site ou loja virtual", "Em marketplace ou delivery", "Por telefone", "Em mais de um canal", "Não há um processo definido"],
  mensuracao_status: ["CRM ou sistema com origem registrada", "Planilha ou etiquetas no WhatsApp", "Perguntamos ao cliente", "Observamos informalmente", "Não registramos a origem", "Não sei"],
  frequencia_conteudo: ["Todos ou quase todos os dias", "De 2 a 4 vezes por semana", "Uma vez por semana", "Algumas vezes por mês", "Raramente", "Não publica"],
  disponibilidade_conteudo: ["Menos de 1 hora", "De 1 a 3 horas", "De 4 a 6 horas", "Mais de 6 horas", "Não há tempo disponível hoje"],
  aparicao_conteudo: ["Sim, com frequência", "Sim, ocasionalmente", "Preferimos mostrar produtos, ambiente e mãos", "Não neste momento"],
  equipe_operacao: ["O próprio dono ou sócio", "Uma pessoa da equipe acumula a função", "Equipe interna dedicada", "Freelancer ou agência", "Ninguém de forma definida"],
  investimento_faixa: ["Sem verba definida", "Até R$ 500", "De R$ 501 a R$ 1.500", "De R$ 1.501 a R$ 5.000", "Acima de R$ 5.000", "Depende da proposta", "Prefiro não informar"],
  possui_loja_fisica: ["Sim", "Não"],
  google_perfil_status: ["Existe, está verificado e temos acesso", "Existe, mas não temos acesso", "Existe, mas não sabemos se está verificado", "Não existe", "Não sabemos"],
  avaliacoes_processo: ["Pede avaliações e responde com frequência", "Responde, mas não pede avaliações", "Pede ocasionalmente", "Não há processo", "Não sabemos"],
};

const MULTI_ENUMS = {
  origem_pedidos: { values: ["Loja física ou passagem na rua", "Instagram", "Google ou Maps", "WhatsApp", "Indicação ou boca a boca", "Site ou loja virtual", "Marketplace ou aplicativo de delivery", "Anúncios pagos", "Não sabemos"], exclusive: "Não sabemos" },
  modalidades_entrega: { values: ["Retirada no local", "Entrega própria", "Entrega por aplicativo ou terceiro", "Atendimento no local", "Serviço remoto ou digital", "Nenhuma destas"], exclusive: "Nenhuma destas" },
  formatos_conteudo: { values: ["Fotos de produtos ou serviços", "Vídeos curtos ou Reels", "Stories de rotina", "Bastidores e processos", "Depoimentos ou avaliações autorizadas", "Nenhum com consistência"], exclusive: "Nenhum com consistência" },
};

function validateStructuredAnswers(answers) {
  for (const [field, allowed] of Object.entries(ENUMS)) {
    if (answers[field] && !allowed.includes(answers[field])) return false;
  }
  for (const [field, rule] of Object.entries(MULTI_ENUMS)) {
    if (!answers[field]) continue;
    const values = answers[field].split("|").map((value) => value.trim());
    if (values.some((value) => !value || !rule.values.includes(value))
        || new Set(values).size !== values.length
        || (values.includes(rule.exclusive) && values.length !== 1)) return false;
    answers[field] = values.join(" | ");
  }
  return true;
}

// G-PR1 controle 5: o formulário recusa link de rede interna, arquivo compartilhado ou com credencial,
// e texto com CPF, cartão ou senha. A checagem de DNS e redirect roda no Escritório antes da análise.
const FILE_HOSTS = /(^|\.)(drive\.google\.com|docs\.google\.com|dropbox\.com|dropboxusercontent\.com|wetransfer\.com|we\.tl|onedrive\.live\.com|1drv\.ms|sharepoint\.com|mega\.nz|icloud\.com)$/i;
const SECRET_PARAM = /^(token|access_token|password|senha|pass|pwd|key|api_?key|secret|auth|session|sid|code)$/i;
const LOCAL_NAME = /(^localhost$|\.localhost$|\.local$|\.internal$|\.lan$|\.home$|\.corp$|^metadata(\.google\.internal)?$)/i;

export function linkProblem(raw) {
  let url;
  try { url = new URL(raw); } catch { return "invalid"; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "protocol";
  if (url.username || url.password) return "credentials";
  if (url.port && url.port !== "80" && url.port !== "443") return "port";
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(":")) return "ip";
  if (LOCAL_NAME.test(host) || !host.includes(".")) return "internal";
  if (FILE_HOSTS.test(host)) return "file_share";
  if (/\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z)$/i.test(url.pathname)) return "document";
  for (const key of url.searchParams.keys()) if (SECRET_PARAM.test(key)) return "secret_param";
  return null;
}

function luhnCard(text) {
  for (const m of text.matchAll(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g)) {
    const digits = m[0].replace(/\D/g, "");
    let sum = 0;
    for (let i = 0; i < digits.length; i += 1) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    if (sum % 10 === 0) return true;
  }
  return false;
}

export function forbiddenContent(text) {
  const value = String(text || "");
  if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(value)) return "cpf";
  if (luhnCard(value)) return "card";
  if (/\b(senha|password|passwd|token|api[_ -]?key|secret)\s*[:=]\s*\S+/i.test(value)) return "credential";
  return null;
}

function answersAreSafe(answers) {
  for (const value of Object.values(answers)) if (forbiddenContent(value)) return false;
  const links = String(answers.links || "").match(/\bhttps?:\/\/[^\s<>"'`)\]]+/gi) || [];
  return links.every((link) => !linkProblem(link.replace(/[.,;:!?]+$/, "")));
}

const supabaseServerKey = () => {
  const key = process.env.SUPA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("missing_SUPA_SERVICE_ROLE_KEY");
  return key;
};

export function supabaseHeaders(key) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function linkIsValid(token, exp, sig) {
  if (!/^[A-Za-z0-9_-]{20,160}$/.test(token) || !/^\d{10}$/.test(exp) || !/^[a-f0-9]{64}$/i.test(sig)) return false;
  const expiry = Number(exp); if (expiry < now() || expiry > now() + 7 * 86400) return false;
  const expected = crypto.createHmac("sha256", env("FORM_LINK_SIGNING_SECRET")).update(`${token}.${exp}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

async function supabase(path, options = {}) {
  const key = supabaseServerKey();
  const response = await fetch(`${env("SUPABASE_URL").replace(/\/$/, "")}/rest/v1${path}`, {
    ...options, headers: { ...supabaseHeaders(key), ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`supabase_${response.status}`);
  return response.json();
}

export async function sessionFor(token, exp, sig) {
  if (!linkIsValid(token, exp, sig)) return null;
  const rows = await supabase(`/raiox_form_sessions?select=id,stage,status,expires_at,raiox_cases(company_name,contact_name,contact_email)&token_hash=eq.${hash(token)}&limit=1`);
  const session = rows[0];
  return session && session.status === "open"
    && new Date(session.expires_at).getTime() > Date.now() ? session : null;
}

async function recordFailure(token) {
  await supabase("/rpc/record_raiox_form_failure", {
    method: "POST", body: JSON.stringify({ p_token_hash: hash(token) })
  });
}

export function parseAnswers(body, stage) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const fields = stage === 1 ? {
    empresa_nome: 140, contato_nome: 120, cargo_contato: 80, cidade_uf: 120, email: 254,
    nicho: 120, atuacao_atual: 40, atuacao_desejada: 40, objetivo_principal: 100,
    horizonte_prioridade: 60, decisao_diagnostico: 800, links: 3000, objetivo: 1800,
    consentimento_aviso: 8, consentimento_publico: 8, consentimento_email: 8, website: 200,
  } : {
    oferta_prioritaria: 600, diferencial: 600, ticket_faixa: 80, margem_status: 80,
    capacidade_status: 80, capacidade_semanal: 80, origem_pedidos: 700,
    pedidos_atual: 1600, tempo_resposta: 80, canal_fechamento: 100,
    modalidades_entrega: 500, mensuracao_status: 100, frequencia_conteudo: 80,
    disponibilidade_conteudo: 80, formatos_conteudo: 500, aparicao_conteudo: 100,
    equipe_operacao: 100, investimento_faixa: 80, possui_loja_fisica: 8, endereco: 600,
    google_perfil_status: 100, area_atendida: 300, horarios_funcionamento: 400,
    pico_atendimento: 200, avaliacoes_processo: 100, acesso_local: 300,
    tentativas: 1600, limitacoes: 1200, consentimento_aviso: 8, consentimento_publico: 8,
    consentimento_email: 8, website: 200,
  };
  const answers = {};
  for (const [key, limit] of Object.entries(fields)) {
    if (typeof body[key] === "string") answers[key] = body[key].trim().slice(0, limit);
  }
  const required = stage === 1
    ? ["empresa_nome", "contato_nome", "cidade_uf", "email", "nicho", "atuacao_atual",
      "atuacao_desejada", "objetivo_principal", "horizonte_prioridade", "decisao_diagnostico"]
    : ["oferta_prioritaria", "capacidade_status", "origem_pedidos", "pedidos_atual",
      "tempo_resposta", "canal_fechamento", "mensuracao_status", "frequencia_conteudo",
      "disponibilidade_conteudo", "possui_loja_fisica"];
  if (required.some((key) => !answers[key]) || answers.website || answers.consentimento_aviso !== "on" || answers.consentimento_publico !== "on" || answers.consentimento_email !== "on"
      || !validateStructuredAnswers(answers) || !answersAreSafe(answers)) return null;
  if (stage === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) return null;
  if (stage === 2 && answers.possui_loja_fisica === "Sim" && (!answers.endereco || !answers.google_perfil_status)) return null;
  const localFields = ["endereco", "google_perfil_status", "area_atendida", "horarios_funcionamento",
    "pico_atendimento", "avaliacoes_processo", "acesso_local"];
  if (stage === 2 && answers.possui_loja_fisica === "Não"
      && localFields.some((field) => answers[field])) return null;
  return answers;
}

export function parseIntakeAnswers(body, identity = {}) {
  const enriched = {
    ...(body && typeof body === "object" && !Array.isArray(body) ? body : {}),
    empresa_nome: String(identity.company_name || "").trim(),
    contato_nome: String(identity.contact_name || "").trim(),
    email: String(identity.contact_email || "").trim().toLowerCase(),
  };
  const strategic = parseAnswers(enriched, 1);
  const operational = parseAnswers(enriched, 2);
  return strategic && operational ? { ...strategic, ...operational } : null;
}

export async function submit(token, exp, sig, body) {
  const session = await sessionFor(token, exp, sig); if (!session) return false;
  const combined = session.stage === 1;
  const answers = combined
    ? parseIntakeAnswers(body, session.raiox_cases || {})
    : parseAnswers(body, session.stage);
  if (!answers) {
    try { await recordFailure(token); } catch { /* compatibilidade até a migration do piloto ser aplicada */ }
    return false;
  }
  const result = await supabase(combined ? "/rpc/submit_raiox_intake" : "/rpc/submit_raiox_form", {
    method: "POST",
    body: JSON.stringify(combined
      ? { p_token_hash: hash(token), p_answers: answers,
          p_consents: { privacy_notice: true, public_sources: true, email_delivery: true, policy_version: AVISO_VERSAO } }
      : { p_token_hash: hash(token), p_stage: session.stage, p_answers: answers,
          p_consents: { public_sources: true, email_delivery: true } }),
  });
  if (!result?.accepted) return false;
  if (combined && result.case_id) {
    // A confirmação do e-mail é um reforço do envio: se falhar, o caso fica sem e-mail confirmado
    // e a análise segue bloqueada até o Carlos reenviar.
    try { await sendEmailVerification(result.case_id); } catch (error) {
      console.error("raiox_email_verification_failed", error instanceof Error ? error.message : "unknown_error");
    }
  }
  return true;
}

// ── G-PR1 controle 4: e-mail confirmado ─────────────────────────────────────
/** Versão do aviso de privacidade que o formulário mostra. Muda junto com o texto do aviso. */
export const AVISO_VERSAO = "2026-11-21";

/** Token opaco (32 bytes) para o link de confirmação; o banco guarda só o hash. */
export function newVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function verificationTokenIsWellFormed(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Emite o token e manda o e-mail de confirmação. O envio só acontece com RAIOX_EMAIL_ENABLED=1
 * (R6: nenhum e-mail externo antes do CP-12); sem isso, o token fica emitido e nada sai.
 */
export async function sendEmailVerification(caseId, deps = {}) {
  const call = deps.supabase ?? supabase;
  const send = deps.fetch ?? fetch;
  const token = deps.token ?? newVerificationToken();
  const issued = await call("/rpc/issue_raiox_email_verification", {
    method: "POST", body: JSON.stringify({ p_case_id: caseId, p_token_hash: hash(token) }),
  });
  if (!issued?.issued || !issued.email) return { sent: false, reason: "not_issued" };
  if ((deps.env ?? process.env).RAIOX_EMAIL_ENABLED !== "1") return { sent: false, reason: "email_disabled" };
  const origin = normalizeOrigin((deps.env ?? process.env).RAIOX_APP_URL);
  if (!origin) return { sent: false, reason: "no_app_url" };
  const link = `${origin}/confirmar/${token}`;
  const env = deps.env ?? process.env;
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json",
      "Idempotency-Key": `raiox-verify:${hash(token).slice(0, 32)}` },
    body: JSON.stringify({
      from: env.RAIOX_EMAIL_FROM, to: [issued.email],
      subject: "Confirme seu e-mail para o Raio X TAVIR",
      text: `Recebemos suas respostas do Raio X TAVIR. Para a análise começar e o resultado chegar a este e-mail, confirme que ele é seu:\n\n${link}\n\nO link vale por 48 horas e funciona uma vez. Se não foi você, ignore esta mensagem.`,
    }),
  });
  return response.ok ? { sent: true } : { sent: false, reason: `resend_${response.status}` };
}

/** Consome o token (uso único, com validade). */
export async function confirmEmail(token, deps = {}) {
  if (!verificationTokenIsWellFormed(token)) return false;
  const call = deps.supabase ?? supabase;
  const result = await call("/rpc/verify_raiox_email", { method: "POST", body: JSON.stringify({ p_token_hash: hash(token) }) });
  return Boolean(result?.verified);
}

function normalizeOrigin(value) {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.origin;
  } catch {
    return "";
  }
}

export function trustedOrigin(request) {
  const received = normalizeOrigin(request.headers.origin);
  if (!received) return false;
  const allowed = [
    process.env.RAIOX_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].map(normalizeOrigin).filter(Boolean);
  return allowed.includes(received);
}
