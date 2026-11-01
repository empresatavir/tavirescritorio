import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SECRET = "chave-local-de-teste";
const BASE = "http://127.0.0.1:9102";
const API = "http://127.0.0.1:9101";
const db = path.join(os.tmpdir(), "tavir-sessao-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "session-server.log");

let apiProc: ChildProcess | undefined;
let webProc: ChildProcess | undefined;

function removeDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(db + suffix, { force: true });
  }
}

function killTree(child: ChildProcess | undefined) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
}

async function waitOk(url: string) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < 60_000) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      last = `${res.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${url} não respondeu: ${last}`);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9101"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db, TAVIR_AUTH_TEST_CLOCK: "1" },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9102", "--strictPort"], {
    cwd: frontendDir,
    env: { ...process.env, TAVIR_API_TARGET: API },
    stdio: ["ignore", log, log],
  });
  await waitOk(`${API}/api/v1/health`);
  await waitOk(BASE);
  const direct = await fetch(`${API}/api/v1/auth/session`);
  const proxied = await fetch(`${BASE}/api/v1/auth/session`);
  if (!direct.ok || !proxied.ok) {
    throw new Error(`sessão direta ${direct.status}, via vite ${proxied.status}`);
  }
  const state = await proxied.json();
  if (state.setup_required !== true) {
    throw new Error(`banco de teste não está limpo: ${JSON.stringify(state)}`);
  }
});

test.afterAll(() => {
  killTree(webProc);
  killTree(apiProc);
  removeDb();
});

test("chave, onboarding, logout e sessão de 12 h", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Domínios" })).toHaveCount(0);
  await page.getByRole("button", { name: "Acessar painel" }).click();
  await expect(page.getByRole("alert")).toHaveText("Informe a chave local para continuar.");
  await expect(page.getByRole("navigation", { name: "Domínios" })).toHaveCount(0);

  await page.getByLabel("Chave de acesso").fill(SECRET);
  await page.getByRole("button", { name: "Acessar painel" }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo ao TAVIR Escritório" })).toBeVisible();
  await expect(page.getByText("1 de 5")).toBeVisible();

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Rail, menu e miolo" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo ao TAVIR Escritório" })).toBeVisible();

  for (const title of ["Rail, menu e miolo", "O ciclo de um job", "Cinco módulos", "Cérebro, Doctor e Analytics"]) {
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Ir para a Sala" })).toBeVisible();
  await page.getByRole("button", { name: "Pular" }).click();

  await expect(page).toHaveURL(/\/sala-operacao$/);
  await expect(page.getByRole("navigation", { name: "Domínios" })).toBeVisible();
  const opened = await page.request.get("/api/v1/auth/session");
  const openedBody = await opened.json();
  expect(openedBody.authenticated).toBe(true);
  expect(openedBody.onboarding_complete).toBe(true);
  expect(JSON.stringify(openedBody)).not.toContain(SECRET);

  await page.goto("/login");
  await page.getByRole("button", { name: "Encerrar sessão" }).click();
  await expect(page.getByRole("heading", { name: "Entrar no escritório" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Domínios" })).toHaveCount(0);
  const closed = await page.request.get("/api/v1/auth/session");
  expect((await closed.json()).authenticated).toBe(false);

  await page.getByLabel("Chave de acesso").fill("chave-que-nao-confere");
  await page.getByRole("button", { name: "Acessar painel" }).click();
  await expect(page.getByRole("alert")).toHaveText("A chave local não confere.");
  await expect(page.getByRole("navigation", { name: "Domínios" })).toHaveCount(0);
  const refused = await page.request.get("/api/v1/auth/session");
  expect((await refused.json()).authenticated).toBe(false);

  await page.getByLabel("Chave de acesso").fill(SECRET);
  await page.getByRole("button", { name: "Acessar painel" }).click();
  await expect(page).toHaveURL(/\/sala-operacao$/);
  await expect(page.getByRole("heading", { name: "Bem-vindo ao TAVIR Escritório" })).toHaveCount(0);

  const live = await (await page.request.get("/api/v1/auth/session")).json();
  const later = new Date(new Date(live.expires_at).getTime() + 1000).toISOString();
  const clock = await page.request.post("/api/v1/auth/test-clock", { data: { at: later } });
  expect(clock.ok()).toBeTruthy();
  await page.goto("/sala-operacao");
  await expect(page.getByRole("heading", { name: "Entrar no escritório" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Domínios" })).toHaveCount(0);
  const expired = await page.request.get("/api/v1/auth/session");
  expect((await expired.json()).authenticated).toBe(false);
});
