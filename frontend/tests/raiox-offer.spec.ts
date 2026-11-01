import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9146";
const API = "http://127.0.0.1:9145";
const CASE_ID = "caso-padaria";
const db = path.join(os.tmpdir(), "tavir-raiox-offer-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "raiox-offer-server.log");

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
    "INSERT INTO raiox_cases (id, company_name, objective, decision_needed, product_id, deep_scan, physical_store, origin, package_id, status) VALUES (?, ?, ?, ?, 'diagnostico', 0, 0, 'amigo', 'basico', 'intake')",
    ("${CASE_ID}", "Padaria do Largo", "Pautar a venda", "Seguir ou parar"),
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o caso");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9145"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9146", "--strictPort"], {
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

test("gerar proposta e registrar oferta ligadas ao caso", async ({ page }) => {
  await page.goto(`${BASE}/raiox/${CASE_ID}`);
  await expect(page.getByRole("heading", { name: "Padaria do Largo" })).toBeVisible({ timeout: 15_000 });
  const panel = page.getByRole("region", { name: "Propostas do caso" });
  await panel.getByRole("button", { name: "Registrar oferta" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Informe o nome da oferta.");

  await panel.getByRole("button", { name: "Gerar proposta" }).click();
  await expect(panel.getByText("Pautar a venda")).toBeVisible();

  await panel.getByLabel("Nome da oferta").fill("Presença Local");
  await panel.getByRole("button", { name: "Registrar oferta" }).click();
  await expect(panel.getByText("Presença Local")).toBeVisible();

  const saved = await page.evaluate(async (caseId) => {
    const res = await fetch(`/api/v1/proposals?raiox_case_id=${caseId}`);
    return res.json();
  }, CASE_ID);
  expect(saved).toHaveLength(2);
  expect(saved.every((row: { raiox_case_id: string }) => row.raiox_case_id === CASE_ID)).toBe(true);
  expect(saved.map((row: { summary: string }) => row.summary).sort()).toEqual(["Pautar a venda", "Presença Local"]);
});
