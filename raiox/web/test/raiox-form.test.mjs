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
  consentimento_publico: "on",
  consentimento_email: "on",
  website: "",
};

test("formulário exige os dois consentimentos do piloto", () => {
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
