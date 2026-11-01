import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9128";
const API = "http://127.0.0.1:9127";
const db = path.join(os.tmpdir(), "tavir-profile-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "profile-server.log");

let apiProc: ChildProcess | undefined;
let webProc: ChildProcess | undefined;

function removeDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(db + suffix, { force: true });
    } catch {
      /* o processo do banco pode ainda estar soltando o arquivo */
    }
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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9127"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db, TAVIR_AUTH_TEST_CLOCK: "1" },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9128", "--strictPort"], {
    cwd: frontendDir,
    env: { ...process.env, TAVIR_API_TARGET: API },
    stdio: ["ignore", log, log],
  });
  await waitOk(`${API}/api/v1/health`);
  await waitOk(BASE);
});

test.afterAll(() => {
  killTree(webProc);
  killTree(apiProc);
  removeDb();
});

test("salvar nome e idioma muda a saudação da Sala", async ({ page }) => {
  await page.goto(`${BASE}/configuracoes`);
  await page.evaluate(async () => {
    const res = await fetch("/api/v1/auth/test-clock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ at: "2026-10-29T18:00:00+00:00" }),
    });
    if (!res.ok) throw new Error(String(res.status));
  });

  await page.getByLabel("Nome").fill("Helena");
  await page.getByLabel("Idioma").selectOption("en");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.goto(`${BASE}/sala-operacao`);
  await expect(page.locator("[data-greeting]")).toHaveText("Good afternoon, Helena.", { timeout: 15_000 });

  await page.goto(`${BASE}/configuracoes`);
  await page.getByLabel("Idioma").selectOption("pt");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.goto(`${BASE}/sala-operacao`);
  await expect(page.locator("[data-greeting]")).toHaveText("Boa tarde, Helena.");

  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/settings");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<{ perfil: { nome: string; idioma: string }; greeting: string }>;
  });
  expect(saved.perfil.nome).toBe("Helena");
  expect(saved.perfil.idioma).toBe("pt");
  expect(saved.greeting).toBe("Boa tarde, Helena.");
});
