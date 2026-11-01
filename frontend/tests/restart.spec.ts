import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9184";
const API = "http://127.0.0.1:9183";
const db = path.join(os.tmpdir(), "tavir-restart-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "restart-server.log");

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9183"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db, TAVIR_SERVICE_DOUBLE: "1" },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9184", "--strictPort"], {
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

test("reiniciar mostra o retorno do double", async ({ page }) => {
  await page.goto(`${BASE}/doctor`);
  const screen = page.locator("[data-screen-label='Doctor']");
  await screen.getByRole("button", { name: "Reiniciar backend", exact: true }).click();
  await expect(page.locator("[data-restart]")).toHaveText("Double: backend reiniciado sem encerrar a porta.");
  await screen.getByRole("button", { name: "Reiniciar frontend", exact: true }).click();
  await expect(page.locator("[data-restart]")).toHaveText("Double: frontend reiniciado sem encerrar a porta.");

  const saved = await page.evaluate(async () => {
    const backend = await fetch("/api/v1/services/backend/restart", { method: "POST" }).then((res) => res.json());
    const frontend = await fetch("/api/v1/services/frontend/restart", { method: "POST" }).then((res) => res.json());
    return { backend, frontend };
  });
  expect(saved.backend.double).toBe(true);
  expect(saved.backend.scheduled).toBe(false);
  expect(saved.frontend.double).toBe(true);
  expect(saved.frontend.scheduled).toBe(false);
});
