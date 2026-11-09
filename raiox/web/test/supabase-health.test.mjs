import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/cron/supabase-health.mjs";

const SECRET = "tavir-cron-test-secret-with-32-chars";

function responseMock() {
  return {
    headers: {},
    statusCode: 0,
    body: "",
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = body; },
  };
}

async function call({ method = "GET", authorization } = {}) {
  const response = responseMock();
  await handler({ method, headers: { authorization } }, response);
  return { ...response, json: JSON.parse(response.body) };
}

test.beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPA_SERVICE_ROLE_KEY = "sb_secret_server_only";
});

test.afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPA_SERVICE_ROLE_KEY;
  delete globalThis.fetch;
});

test("recusa chamada sem segredo antes de acessar o Supabase", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("should_not_run"); };

  const result = await call();

  assert.equal(result.statusCode, 401);
  assert.equal(result.json.code, "unauthorized");
  assert.equal(calls, 0);
});

test("faz tres leituras minimas sem devolver dados da tabela", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response('[{"id":"case-private-id"}]', { status: 200 });
  };

  const result = await call({ authorization: `Bearer ${SECRET}` });

  assert.equal(result.statusCode, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.checks, 3);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ options }) => options.headers.apikey === "sb_secret_server_only"));
  assert.ok(!result.body.includes("case-private-id"));
});

test("devolve falha generica quando o Supabase esta indisponivel", async () => {
  globalThis.fetch = async () => new Response("gateway failure", { status: 503 });
  const originalError = console.error;
  console.error = () => {};

  try {
    const result = await call({ authorization: `Bearer ${SECRET}` });
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.json, { ok: false, code: "dependency_unavailable" });
    assert.ok(!result.body.includes("gateway failure"));
  } finally {
    console.error = originalError;
  }
});

test("aceita somente GET", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; };

  const result = await call({ method: "POST", authorization: `Bearer ${SECRET}` });

  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.Allow, "GET");
  assert.equal(calls, 0);
});
