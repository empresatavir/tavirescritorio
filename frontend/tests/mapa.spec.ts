import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9178";
const API = "http://127.0.0.1:9177";
const db = path.join(os.tmpdir(), "tavir-mapa-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "mapa-server.log");

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
    "INSERT INTO agents (id, name, role, sector, status, soul_locked, total_jobs, total_cost, created_at, updated_at) "
    "VALUES ('ag-marina', 'Marina', 'Marca', 'Comercial', 'active', 1, 0, 0, datetime('now'), datetime('now'))"
)
conn.execute(
    "INSERT INTO agents (id, name, role, sector, status, soul_locked, total_jobs, total_cost, created_at, updated_at) "
    "VALUES ('ag-yuri', 'Yuri', 'Experiência', 'Engenharia', 'active', 1, 0, 0, datetime('now'), datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou os agentes");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9177"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9178", "--strictPort"], {
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

test("mapa lista setores e agentes sem isométrico", async ({ page }) => {
  await page.goto(`${BASE}/mapa`);
  const comercial = page.locator("[data-sector='Comercial']");
  const engenharia = page.locator("[data-sector='Engenharia']");
  await expect(comercial).toContainText("Marina", { timeout: 15_000 });
  await expect(engenharia).toContainText("Yuri");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText(/isométr|Habblaud/i)).toHaveCount(0);

  const saved = await page.evaluate(async () => {
    const body = await fetch("/api/v1/agents/sectors").then((res) => res.json());
    return Object.fromEntries(body.sectors.map((row: { name: string; agents: Array<{ name: string }> }) => [row.name, row.agents.map((agent) => agent.name)]));
  });
  expect(saved.Comercial).toEqual(["Marina"]);
  expect(saved.Engenharia).toEqual(["Yuri"]);
});
