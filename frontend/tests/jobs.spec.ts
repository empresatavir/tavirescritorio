import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9106";
const API = "http://127.0.0.1:9105";
const db = path.join(os.tmpdir(), "tavir-jobs-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "jobs-server.log");

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

function seedJobs() {
  const script = `
import os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
rows = [
    ("job-fila", "queued", "2026-10-29T18:00:01"),
    ("job-roda", "running", "2026-10-29T18:00:02"),
    ("job-pausa", "paused", "2026-10-29T18:00:03"),
    ("job-fim", "failed", "2026-10-29T18:00:04"),
    ("job-cancela", "running", "2026-10-29T18:00:05"),
]
for job_id, status, stamp in rows:
    conn.execute(
        "INSERT INTO jobs (id, origin, status, cost_usd, tokens_total, created_at, updated_at) VALUES (?, 'manual', ?, 0, 0, ?, ?)",
        (job_id, status, stamp, stamp),
    )
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou os jobs");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9105"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9106", "--strictPort"], {
    cwd: frontendDir,
    env: { ...process.env, TAVIR_API_TARGET: API },
    stdio: ["ignore", log, log],
  });
  await waitOk(`${API}/api/v1/health`);
  await waitOk(BASE);
  seedJobs();
});

test.afterAll(() => {
  killTree(webProc);
  killTree(apiProc);
  removeDb();
});

test("botões de execução mudam o status e o filtro vazio avisa", async ({ page }) => {
  await page.goto(`${BASE}/execucoes`);
  const detail = page.getByRole("complementary", { name: "Detalhe do job" });
  const fila = page.locator("[data-job-id='job-fila']");
  await expect(fila).toBeVisible({ timeout: 15_000 });

  await fila.click();
  await page.getByRole("button", { name: "Iniciar agora", exact: true }).click();
  await expect(detail).toContainText("job-fila");
  await expect(detail).toContainText("Rodando");

  const roda = page.locator("[data-job-id='job-roda']");
  await roda.click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(detail).toContainText("job-roda");
  await expect(detail).toContainText("Pausado");

  const pausa = page.locator("[data-job-id='job-pausa']");
  await pausa.click();
  await page.getByRole("button", { name: "Retomar", exact: true }).click();
  await expect(detail).toContainText("job-pausa");
  await expect(detail).toContainText("Rodando");

  const fim = page.locator("[data-job-id='job-fim']");
  await fim.click();
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await expect(detail).toContainText("job-fim");
  await expect(detail).toContainText("Na fila");

  const cancela = page.locator("[data-job-id='job-cancela']");
  await cancela.click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(detail).toContainText("job-cancela");
  await expect(detail).toContainText("Falhou");

  const jobs = await page.evaluate(async () => {
    const res = await fetch("/api/v1/jobs/");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<Array<{ id: string; status: string }>>;
  });
  const status = Object.fromEntries(jobs.map((job) => [job.id, job.status]));
  expect(status["job-fila"]).toBe("running");
  expect(status["job-roda"]).toBe("paused");
  expect(status["job-pausa"]).toBe("running");
  expect(status["job-fim"]).toBe("queued");
  expect(status["job-cancela"]).toBe("failed");

  await page.getByRole("button", { name: /Concluídos/ }).click();
  await expect(page.getByText("Nenhum job neste filtro.")).toBeVisible();
});
