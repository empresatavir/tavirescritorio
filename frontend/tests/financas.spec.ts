import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9162";
const API = "http://127.0.0.1:9161";
const db = path.join(os.tmpdir(), "tavir-financas-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "financas-server.log");

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

function seed() {
  const script = `
import os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
conn.execute(
    "INSERT INTO jobs (id, origin, status, cost_usd, tokens_total, created_at, updated_at) "
    "VALUES ('job-custo', 'manual', 'running', 0, 0, datetime('now'), datetime('now'))"
)
conn.execute(
    "INSERT INTO usage_samples (id, job_id, model_name, cost_usd, tokens, sampled_at) "
    "VALUES ('s1', 'job-custo', 'claude-sonnet-4', 12.5, 100, datetime('now'))"
)
conn.execute(
    "INSERT INTO usage_samples (id, job_id, model_name, cost_usd, tokens, sampled_at) "
    "VALUES ('s2', 'job-custo', 'claude-sonnet-4', 7.5, 50, datetime('now', '-1 day'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a série");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9161"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9162", "--strictPort"], {
    cwd: frontendDir,
    env: { ...process.env, TAVIR_API_TARGET: API },
    stdio: ["ignore", log, log],
  });
  await waitOk(`${API}/api/v1/health`);
  await waitOk(BASE);
  seed();
});

test.afterAll(() => {
  killTree(webProc);
  killTree(apiProc);
  removeDb();
});

test("finanças mostra a série de custo da API", async ({ page }) => {
  await page.goto(`${BASE}/finances`);
  await expect(page.getByRole("heading", { name: "Finanças", exact: true })).toBeVisible();
  await expect(page.locator("[data-day]")).toHaveCount(2, { timeout: 15_000 });
  const shown = await page.locator("[data-day]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      day: node.getAttribute("data-day"),
      usd: node.querySelector("[data-usd]")?.textContent?.trim() || "",
    })),
  );
  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/analytics/cost?range=30d");
    return res.json();
  });
  expect(saved.total_usd).toBe(20);
  expect(saved.total_tokens).toBe(150);
  await expect(page.locator("[data-metric='usd']")).toContainText(String(saved.total_usd));
  await expect(page.locator("[data-metric='tokens']")).toHaveText(String(saved.total_tokens));
  const apiDays = saved.days.map((day: { day: string; usd: number }) => `${day.day}:${day.usd}`).sort();
  const uiDays = shown.map((day) => `${day.day}:${day.usd}`).sort();
  expect(uiDays).toEqual(apiDays);
});
