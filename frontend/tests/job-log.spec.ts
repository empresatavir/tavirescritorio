import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9124";
const API = "http://127.0.0.1:9123";
const VALID = "linha válida do terminal";
const INVALID = "evento sem hora";
const db = path.join(os.tmpdir(), "tavir-job-log-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "job-log-server.log");

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
stamp = "2026-10-29T18:00:00"
conn.execute(
    "INSERT INTO jobs (id, origin, status, cost_usd, tokens_total, created_at, updated_at) VALUES ('job-sse', 'manual', 'running', 0, 0, ?, ?)",
    (stamp, stamp),
)
conn.execute(
    "INSERT INTO events (id, job_id, event_type, action, details, created_at) VALUES ('evt-ok', 'job-sse', 'info', 'log', ?, ?)",
    ("linha válida do terminal", stamp),
)
conn.execute(
    "INSERT INTO events (id, job_id, event_type, action, details, created_at) VALUES ('evt-ruim', 'job-sse', 'info', 'log', 'evento sem hora', 'invalid date')"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o job");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9123"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9124", "--strictPort"], {
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

test("o log mostra a hora válida e esconde o evento sem data", async ({ page }) => {
  await page.goto(`${BASE}/execucoes`);
  const log = page.getByRole("log", { name: "Log ao vivo" });
  await expect(log.getByText(VALID)).toBeVisible({ timeout: 15_000 });
  await expect(log.getByText("15:00:00")).toBeVisible();
  await expect(log.getByText(INVALID)).toHaveCount(0);

  const stored = await page.evaluate(async () => {
    const res = await fetch("/api/v1/jobs/job-sse/stream");
    return res.text();
  });
  expect(stored).toContain(VALID);
  expect(stored).not.toContain(INVALID);
  expect(stored).not.toContain("evt-ruim");
});
