import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9126";
const API = "http://127.0.0.1:9125";
const SECRET = "supabase-segredo-teto";
const db = path.join(os.tmpdir(), "tavir-ceiling-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "ceiling-server.log");

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
    "INSERT INTO jobs (id, origin, status, cost_usd, tokens_total, budget_ceiling, created_at, updated_at) VALUES ('job-teto', 'manual', 'running', 0, 0, 1.0, ?, ?)",
    (stamp, stamp),
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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9125"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9126", "--strictPort"], {
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

test("estourar o teto pausa o job e abre o gate sem gravar o segredo", async ({ page }) => {
  await page.goto(`${BASE}/execucoes`);
  const detail = page.getByRole("complementary", { name: "Detalhe do job" });
  await expect(detail.getByText("Rodando")).toBeVisible({ timeout: 15_000 });
  await page.locator("[data-job-id='job-teto']").click();

  const posted = await page.evaluate(async (secret) => {
    const res = await fetch("/api/v1/usage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        job_id: "job-teto",
        cost_usd: 1,
        tokens: 10,
        model: "claude",
        secret,
        at: "2026-10-29T18:00:00+00:00",
      }),
    });
    return res.ok;
  }, SECRET);
  expect(posted).toBe(true);

  await expect(detail.getByText("Pausado")).toBeVisible({ timeout: 15_000 });
  await expect(detail.getByText("Teto do job atingido")).toBeVisible();
  await expect(detail.getByRole("button", { name: "Retomar" })).toBeVisible();

  await page.goto(`${BASE}/decisoes`);
  await expect(page.getByRole("heading", { name: "Teto de gasto" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Teto do job atingido").first()).toBeVisible();

  const proof = await page.evaluate(async (secret) => {
    const job = await fetch("/api/v1/jobs/job-teto").then((res) => res.json());
    const approvals = await fetch("/api/v1/approvals/").then((res) => res.json());
    const ledger = await fetch("/api/v1/ledger?day=2026-10-29").then((res) => res.text());
    const gate = (approvals as Array<{ type?: string; status?: string; job_id?: string; reason?: string }>).find(
      (item) => item.type === "ceiling" && item.job_id === "job-teto",
    );
    return {
      status: job.status as string,
      reason: job.error_message as string,
      gate: gate?.status || "",
      ledgerHasReason: ledger.includes("Teto do job atingido"),
      ledgerHasSecret: ledger.includes(secret),
    };
  }, SECRET);
  expect(proof.status).toBe("paused");
  expect(proof.reason).toBe("Teto do job atingido");
  expect(proof.gate).toBe("pending");
  expect(proof.ledgerHasReason).toBe(true);
  expect(proof.ledgerHasSecret).toBe(false);
});
