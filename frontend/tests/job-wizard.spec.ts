import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9108";
const API = "http://127.0.0.1:9107";
const db = path.join(os.tmpdir(), "tavir-wizard-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "job-wizard-server.log");

let apiProc: ChildProcess | undefined;
let webProc: ChildProcess | undefined;

function removeDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(db + suffix, { force: true });
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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9107"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9108", "--strictPort"], {
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

test("teto vazio não cria job; teto preenchido cria, avisa e entra no ledger", async ({ page }) => {
  await page.goto(`${BASE}/sala-operacao`);
  await page.getByRole("button", { name: "Iniciar novo job operacional" }).click();
  const dialog = page.getByRole("dialog", { name: "Iniciar novo job" });
  const next = dialog.getByRole("button", { name: "Continuar" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
  await next.click();
  await next.click();

  await dialog.getByLabel("Teto de gasto").fill("");
  await dialog.getByRole("button", { name: "Iniciar job" }).click();
  await expect(dialog.getByText("Informe o teto para continuar.")).toBeVisible();

  const before = await page.evaluate(async () => {
    const res = await fetch("/api/v1/jobs/");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<unknown[]>;
  });
  expect(before).toHaveLength(0);

  await dialog.getByLabel("Teto de gasto").fill("2.5");
  await dialog.getByRole("button", { name: "Iniciar job" }).click();
  await expect(page.locator(".toast")).toContainText("Job em execução");

  const created = await page.evaluate(async () => {
    const jobsRes = await fetch("/api/v1/jobs/");
    const ledgerRes = await fetch("/api/v1/ledger");
    if (!jobsRes.ok || !ledgerRes.ok) throw new Error(`${jobsRes.status}/${ledgerRes.status}`);
    return {
      jobs: (await jobsRes.json()) as Array<{
        id: string;
        budget_ceiling: number | null;
        model_name: string | null;
        effort: string | null;
        motor: string | null;
      }>,
      ledger: (await ledgerRes.json()) as { events: Array<{ action: string; details: string | null }> },
    };
  });
  expect(created.jobs).toHaveLength(1);
  expect(created.jobs[0].budget_ceiling).toBe(2.5);
  expect(created.jobs[0].motor).toBeTruthy();
  expect(created.jobs[0].model_name).toBeTruthy();
  expect(created.jobs[0].effort).toBeTruthy();
  const line = created.ledger.events.find((event) => event.action === "job.criado");
  expect(line?.details || "").toContain(created.jobs[0].id);
  expect(line?.details || "").toContain("2.5");
});
