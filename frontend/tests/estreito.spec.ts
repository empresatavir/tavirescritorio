import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9192";
const API = "http://127.0.0.1:9191";
const db = path.join(os.tmpdir(), "tavir-estreito-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "estreito-server.log");

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

test.setTimeout(90_000);
test.use({ baseURL: BASE, viewport: { width: 860, height: 900 } });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9191"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9192", "--strictPort"], {
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

test("em 860px a subnav some, a busca fica no ícone e Execuções empilha", async ({ page }) => {
  await page.goto(`${BASE}/sala-operacao`);
  await expect(page.locator("[data-screen-label='Sala de Operação']")).toBeVisible();
  const shellCols = await page.locator(".shell").evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
  expect(shellCols).toBe(2);
  await expect(page.locator(".sub")).toBeHidden();
  await expect(page.locator(".search-copy")).toBeHidden();
  await expect(page.locator(".search-kbd")).toBeHidden();
  await expect(page.getByRole("button", { name: "Buscar telas, tasks, agentes… (Ctrl K)" })).toBeVisible();

  await page.goto(`${BASE}/execucoes`);
  await expect(page.locator(".sub")).toBeHidden();
  const splitCols = await page.locator(".exec-split").evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
  expect(splitCols).toBe(1);
  const list = await page.locator(".exec-list").boundingBox();
  const side = await page.locator(".exec-side").boundingBox();
  expect(list).toBeTruthy();
  expect(side).toBeTruthy();
  expect(side!.y).toBeGreaterThan(list!.y);
  expect(Math.abs(side!.x - list!.x)).toBeLessThan(8);
});
