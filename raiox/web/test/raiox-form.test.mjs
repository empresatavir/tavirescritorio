import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseAnswers, parseIntakeAnswers, supabaseHeaders } from "../api/_raiox.mjs";

const stageOne = {
  empresa_nome: "Loja Piloto",
  contato_nome: "Contato",
  cidade_uf: "Rio de Janeiro - RJ",
  email: "contato@example.com",
  nicho: "Moda feminina",
  atuacao_atual: "Física",
  atuacao_desejada: "Física e online",
  objetivo_principal: "Gerar mais pedidos ou vendas",
  horizonte_prioridade: "Entre 30 e 90 dias",
  decisao_diagnostico: "Entender qual gargalo corrigir primeiro.",
  consentimento_aviso: "on",
  consentimento_publico: "on",
  consentimento_email: "on",
  website: "",
};

test("formulário exige as três decisões do piloto", () => {
  assert.equal(parseAnswers({ ...stageOne, consentimento_aviso: "" }, 1), null);
  assert.equal(parseAnswers({ ...stageOne, consentimento_email: "" }, 1), null);
  assert.equal(parseAnswers({ ...stageOne, consentimento_publico: "" }, 1), null);
  assert.equal(parseAnswers(stageOne, 1).empresa_nome, "Loja Piloto");
});

test("formulário rejeita honeypot e e-mail inválido", () => {
  assert.equal(parseAnswers({ ...stageOne, website: "spam" }, 1), null);
  assert.equal(parseAnswers({ ...stageOne, email: "invalido" }, 1), null);
});

const stageTwo = {
  oferta_prioritaria: "Coleção principal",
  capacidade_status: "Há capacidade limitada",
  origem_pedidos: "Instagram | WhatsApp",
  pedidos_atual: "A pessoa vê a peça e chama no WhatsApp.",
  tempo_resposta: "De 6 a 30 minutos",
  canal_fechamento: "No WhatsApp",
  mensuracao_status: "Não registramos a origem",
  frequencia_conteudo: "Uma vez por semana",
  disponibilidade_conteudo: "De 1 a 3 horas",
  possui_loja_fisica: "Sim",
  endereco: "Rua Exemplo, 100, Centro, Rio de Janeiro - RJ",
  google_perfil_status: "Não existe",
  consentimento_aviso: "on",
  consentimento_publico: "on",
  consentimento_email: "on",
  website: "",
};

test("formulário físico exige endereço e situação do Perfil da Empresa", () => {
  assert.equal(parseAnswers({ ...stageTwo, endereco: "" }, 2), null);
  assert.equal(parseAnswers({ ...stageTwo, google_perfil_status: "" }, 2), null);
  assert.equal(parseAnswers(stageTwo, 2).origem_pedidos, "Instagram | WhatsApp");
});

test("formulário online não exige dados de presença local", () => {
  const online = { ...stageTwo, possui_loja_fisica: "Não", endereco: "", google_perfil_status: "" };
  assert.equal(parseAnswers(online, 2).possui_loja_fisica, "Não");
  assert.equal(parseAnswers({ ...online, possui_loja_fisica: "Talvez" }, 2), null);
});

test("servidor rejeita opções forjadas, duplicadas e contraditórias", () => {
  assert.equal(parseAnswers({ ...stageOne, objetivo_principal: "VALOR_FORA_DA_LISTA" }, 1), null);
  assert.equal(parseAnswers({ ...stageTwo, capacidade_status: "FORJADO" }, 2), null);
  assert.equal(parseAnswers({ ...stageTwo, origem_pedidos: "Instagram | Instagram" }, 2), null);
  assert.equal(parseAnswers({ ...stageTwo, origem_pedidos: "Instagram | Não sabemos" }, 2), null);
  assert.equal(parseAnswers({ ...stageTwo, modalidades_entrega: "Retirada no local | Nenhuma destas" }, 2), null);
  assert.equal(parseAnswers({ ...stageTwo, possui_loja_fisica: "Não" }, 2), null);
});

test("servidor normaliza multiseleções permitidas", () => {
  const parsed = parseAnswers({ ...stageTwo, origem_pedidos: "Instagram| WhatsApp" }, 2);
  assert.equal(parsed.origem_pedidos, "Instagram | WhatsApp");
});

test("intake unificado exige as duas telas e injeta a identidade registrada no convite", () => {
  const clientBody = { ...stageOne, ...stageTwo, empresa_nome: "Alterada", contato_nome: "Outro",
    email: "outro@example.com" };
  const parsed = parseIntakeAnswers(clientBody, {
    company_name: "Loja Piloto", contact_name: "Contato", contact_email: "contato@example.com",
  });
  assert.equal(parsed.empresa_nome, "Loja Piloto");
  assert.equal(parsed.contato_nome, "Contato");
  assert.equal(parsed.email, "contato@example.com");
  assert.equal(parseIntakeAnswers({ ...stageOne }, {
    company_name: "Loja Piloto", contact_name: "Contato", contact_email: "contato@example.com",
  }), null);
});

test("página unificada possui duas telas e um único envio", async () => {
  const html = await readFile(new URL("../public/form.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../public/form.js", import.meta.url), "utf8");
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  assert.match(html, /data-stage="1"/);
  assert.match(html, /data-stage="2"/);
  assert.match(html, /id="next"/);
  assert.match(html, /id="back"/);
  assert.doesNotMatch(html, /name="(?:empresa_nome|contato_nome|email)"/);
  assert.doesNotMatch(html, /Gerar formulário 2/);
  assert.match(script, /hasAttribute\("data-required"\)/);
  assert.match(script, /Preencha os campos obrigatórios antes de continuar/);
});

test("chave secreta nova não é repetida no bearer", () => {
  const headers = supabaseHeaders("sb_secret_test");
  assert.equal(headers.apikey, "sb_secret_test");
  assert.equal(headers.Authorization, undefined);
});

test("G-PR1 controle 5: formulário recusa link inseguro e dado proibido", async () => {
  const { linkProblem, forbiddenContent } = await import("../api/_raiox.mjs");
  const withLinks = (links) => parseAnswers({ ...stageOne, links }, 1);
  assert.ok(withLinks("https://instagram.com/lojapiloto\nhttps://www.google.com/maps/place/Loja"));
  for (const bad of [
    "http://localhost:3000/admin", "http://127.0.0.1/", "http://10.0.0.5/painel", "http://[::1]/",
    "https://user:pw@loja.com.br/", "https://drive.google.com/file/d/abc", "https://loja.com.br/contrato.pdf",
    "https://loja.com.br/?token=abc", "http://metadata.google.internal/", "https://loja.com.br:8443/",
  ]) {
    assert.ok(linkProblem(bad), bad);
    assert.equal(withLinks(bad), null, bad);
  }
  assert.equal(forbiddenContent("CPF 123.456.789-09"), "cpf");
  assert.equal(forbiddenContent("cartão 4111 1111 1111 1111"), "card");
  assert.equal(forbiddenContent("senha: abc123"), "credential");
  assert.equal(forbiddenContent("WhatsApp +55 21 96501-4443"), null);
  assert.equal(parseAnswers({ ...stageOne, objetivo: "meu CPF 123.456.789-09" }, 1), null);
});

test("G-PR1 controle 3: três caixas, nenhuma pré-marcada", async () => {
  const html = await readFile(new URL("../public/form.html", import.meta.url), "utf8");
  for (const name of ["consentimento_aviso", "consentimento_publico", "consentimento_email"]) {
    const tag = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] || "";
    assert.ok(tag, name);
    assert.ok(/type="checkbox"/.test(tag) && /required/.test(tag), name);
    assert.ok(!/checked/.test(tag), `${name} não pode vir marcada`);
  }
  const migration = await readFile(new URL("../supabase/migrations/20261121120000_raiox_gpr1_decisoes_email.sql", import.meta.url), "utf8");
  assert.match(migration, /'privacy_notice', true, v_version/);
  assert.match(migration, /p_consents->>'privacy_notice'/);
});

test("G-PR1 controle 4: token opaco, e-mail só sai com a chave ligada", async () => {
  const { newVerificationToken, verificationTokenIsWellFormed, sendEmailVerification, confirmEmail, AVISO_VERSAO } = await import("../api/_raiox.mjs");
  const a = newVerificationToken(); const b = newVerificationToken();
  assert.notEqual(a, b);
  assert.ok(verificationTokenIsWellFormed(a));
  assert.ok(!verificationTokenIsWellFormed("curto"));
  assert.match(AVISO_VERSAO, /^\d{4}-\d{2}-\d{2}$/);

  const calls = [];
  const supabase = async (path, opts) => { calls.push([path, JSON.parse(opts.body)]); return { issued: true, email: "dono@loja.com.br" }; };
  let sent = 0;
  const fetchStub = async () => { sent += 1; return { ok: true }; };
  const off = await sendEmailVerification("case-1", { supabase, fetch: fetchStub, env: {}, token: newVerificationToken() });
  assert.deepEqual(off, { sent: false, reason: "email_disabled" });
  assert.equal(sent, 0);
  assert.equal(calls[0][0], "/rpc/issue_raiox_email_verification");
  assert.match(calls[0][1].p_token_hash, /^[a-f0-9]{64}$/, "banco recebe só o hash");

  const on = await sendEmailVerification("case-1", { supabase, fetch: fetchStub, token: newVerificationToken(),
    env: { RAIOX_EMAIL_ENABLED: "1", RAIOX_APP_URL: "https://raiox.exemplo.com", RESEND_API_KEY: "x", RAIOX_EMAIL_FROM: "a@b.com" } });
  assert.deepEqual(on, { sent: true });
  assert.equal(sent, 1);

  let rpc = 0;
  assert.equal(await confirmEmail("../../etc", { supabase: async () => { rpc += 1; return { verified: true }; } }), false);
  assert.equal(rpc, 0, "token malformado nem chega ao banco");
  assert.equal(await confirmEmail(newVerificationToken(), { supabase: async () => ({ verified: false }) }), false);
  assert.equal(await confirmEmail(newVerificationToken(), { supabase: async () => ({ verified: true }) }), true);
});

test("G-PR1 controle 2: aviso permanente, versionado e sem token", async () => {
  const { AVISO_VERSAO } = await import("../api/_raiox.mjs");
  const page = await readFile(new URL(`../public/privacidade/${AVISO_VERSAO}.html`, import.meta.url), "utf8");
  assert.match(page, new RegExp(`<meta name="raiox-aviso-versao" content="${AVISO_VERSAO}">`));
  for (const id of ["controlador", "canal", "finalidades", "dados", "fornecedores", "transferencia", "retencao", "direitos", "revisao-humana"]) {
    assert.match(page, new RegExp(`<section id="${id}">`), `falta a seção ${id}`);
  }
  for (const nome of ["Vercel", "Supabase", "Resend", "Telegram", "RapidAPI", "Anthropic", "OpenAI", "Google", "Cursor"]) {
    assert.ok(page.includes(nome), `fornecedor ${nome} fora do aviso`);
  }
  assert.doesNotMatch(page, /<script|style=|token|\{\{/i, "aviso não pode ter script, estilo inline, token ou modelo aberto");
  // Enquanto houver lacuna, a página se declara minuta (não liberar o piloto assim).
  if (page.includes("[A PREENCHER")) {
    assert.match(page, /name="raiox-aviso-status" content="minuta"/);
    assert.match(page, /data-minuta/);
  }

  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const current = vercel.rewrites.find((r) => r.source === "/privacidade");
  assert.equal(current?.destination, `/privacidade/${AVISO_VERSAO}.html`);
  assert.ok(vercel.rewrites.some((r) => r.source === "/privacidade/:versao" && r.destination === "/privacidade/:versao.html"));

  const form = await readFile(new URL("../public/form.html", import.meta.url), "utf8");
  const aviso = form.match(/<label><input name="consentimento_aviso"[^\n]*<\/label>/)?.[0] || "";
  assert.ok(aviso.includes(`href="/privacidade/${AVISO_VERSAO}"`), "caixa do aviso aponta para a versão gravada");
  assert.ok(aviso.includes(`versão ${AVISO_VERSAO}`), "texto da caixa mostra a versão gravada");
});
