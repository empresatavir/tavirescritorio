import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9160";
const API = "http://127.0.0.1:9159";
const db = path.join(os.tmpdir(), "tavir-personas-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "personas-server.log");

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9159"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9160", "--strictPort"], {
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

test("criar persona aparece na lista", async ({ page }) => {
  await page.goto(`${BASE}/personas`);
  await page.getByRole("button", { name: "Criar persona" }).click();
  await expect(page.getByRole("alert")).toHaveText("Informe o nome da persona.");
  await page.getByLabel("Nome da persona").fill("Dono de negócio local");
  await page.getByLabel("Para quem").fill("loja, padaria, oficina");
  await page.getByRole("textbox", { name: "Dor", exact: true }).fill("Perde cliente fora de hora");
  await page.getByRole("button", { name: "Criar persona" }).click();
  const card = page.locator("[data-persona]").filter({ hasText: "Dono de negócio local" });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText("Perde cliente fora de hora");

  const saved = await page.evaluate(async () => {
    const rows = await fetch("/api/v1/studio/personas").then((res) => res.json());
    return rows.find((row: { name: string }) => row.name === "Dono de negócio local");
  });
  expect(saved.name).toBe("Dono de negócio local");
  expect(saved.demographics).toBe("loja, padaria, oficina");
  expect(saved.pain_points).toBe("Perde cliente fora de hora");
  expect(saved.status).toBe("active");
});
