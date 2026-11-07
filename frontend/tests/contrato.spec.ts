import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9158";
const API = "http://127.0.0.1:9157";
const db = path.join(os.tmpdir(), "tavir-contrato-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "contrato-server.log");

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
    "INSERT INTO proposals (id, num, client, stage, status, tone, version, value, summary, created_at, updated_at) "
    "VALUES ('prop-atlas', 'PRO-1', 'Atlas Holdings', 'pending', 'Aceita pelo cliente · aguardando contra-assinatura', 'wait', 1, 48500, 'Landing comercial com três por cento de conversão.', datetime('now'), datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a proposta");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9157"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9158", "--strictPort"], {
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

test("decidir a contra-assinatura abre o contrato", async ({ page }) => {
  await page.goto(`${BASE}/propostas`);
  await page.waitForResponse((res) => res.url().includes("/api/v1/proposals") && res.request().method() === "GET");
  await page.getByRole("button", { name: /Atlas Holdings/ }).click();
  const detail = page.getByRole("dialog", { name: "Detalhamento da proposta" });
  await detail.getByRole("button", { name: "Decidir" }).click();
  await expect(page).toHaveURL(/\/decisoes\?approval=/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Contra-assinatura · Atlas Holdings" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Contrato de Atlas Holdings")).toBeVisible();
  await expect(page.getByText("R$ 48,5 mil")).toBeVisible();

  const saved = await page.evaluate(async () => {
    const rows = await fetch("/api/v1/approvals/").then((res) => res.json());
    return rows.find((row: { kind?: string }) => row.kind === "contract");
  });
  expect(saved.kind).toBe("contract");
  expect(saved.question).toBe("prop-atlas");
  expect(saved.description).toContain("Contrato de Atlas Holdings");
});
