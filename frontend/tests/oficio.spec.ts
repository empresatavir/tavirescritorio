import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9120";
const API = "http://127.0.0.1:9119";
const OFICIO = "Ofício novo da Paula para o teste.";
const db = path.join(os.tmpdir(), "tavir-oficio-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "oficio-server.log");

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
conn.execute("INSERT INTO agents (id, name, role, sector, status, soul_locked, total_jobs, total_cost) VALUES ('pm-paula', 'Paula PM', 'Product Manager', 'Operação', 'idle', 1, 0, 0)")
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o agente");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9119"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9120", "--strictPort"], {
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

test("salvar o ofício e abrir o chat da Paula", async ({ page }) => {
  await page.goto(`${BASE}/agentes`);
  const row = page.locator("[data-agent-id='pm-paula']");
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: "Paula PM", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Ofício do agente" });
  await dialog.getByLabel("Ofício").fill(OFICIO);
  await dialog.getByRole("button", { name: "Salvar Alma Operacional" }).click();
  await expect(page.locator(".toast")).toContainText("persistida");

  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/agents/pm-paula/soul");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<{ craft_text: string | null }>;
  });
  expect(saved.craft_text).toBe(OFICIO);

  await row.getByRole("button", { name: "Abrir chat de Paula PM" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect.poll(async () => {
    return page.evaluate(async () => {
      const res = await fetch("/api/v1/chat/conversations");
      if (!res.ok) return "";
      const list = (await res.json()) as Array<{ agent_id: string }>;
      return list.map((item) => item.agent_id).join(",");
    });
  }).toContain("pm-paula");
});
