import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9136";
const API = "http://127.0.0.1:9135";
const GATE = "Revisão Editorial";
const db = path.join(os.tmpdir(), "tavir-flow-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "flow-server.log");

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
import json, os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
steps = [
    {"action": "escrever", "arrow": True},
    {"action": "publicar", "gate": "Revisão Editorial", "arrow": False},
]
conn.execute(
    "INSERT INTO workflows (id, name, category, steps, trigger_type, status, sort_order) VALUES ('wf-gate', 'Publicar a peça', 'editorial', ?, 'manual', 'active', 0)",
    (json.dumps(steps),),
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o workflow");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9135"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9136", "--strictPort"], {
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

test("rodar agora para no gate e a faixa beta continua", async ({ page }) => {
  await page.goto(`${BASE}/flow`);
  const banner = page.getByRole("status");
  await expect(banner).toHaveText("Flow em beta. O motor contínuo não está ligado.", { timeout: 15_000 });
  await page.getByRole("button", { name: "Rodar agora Publicar a peça" }).click();
  await expect(page.locator("[data-workflow='wf-gate']")).toContainText(`Parado no gate: ${GATE}`);
  await expect(banner).toBeVisible();

  const proof = await page.evaluate(async () => {
    const runs = await fetch("/api/v1/workflows/wf-gate/runs").then((res) => res.json());
    const approvals = await fetch("/api/v1/approvals/").then((res) => res.json());
    const run = runs[0];
    const gate = (approvals as Array<{ id: string; status: string; title: string }>).find((item) => item.id === run.approval_id);
    return {
      status: run.status as string,
      step: run.step_index as number,
      gate: run.gate as string,
      engine: run.engine as string,
      approval: gate?.status || "",
      title: gate?.title || "",
      total: runs.length as number,
    };
  });
  expect(proof).toEqual({
    status: "waiting_gate",
    step: 1,
    gate: GATE,
    engine: "manual",
    approval: "pending",
    title: GATE,
    total: 1,
  });
});
