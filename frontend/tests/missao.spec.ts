import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9176";
const API = "http://127.0.0.1:9175";
const db = path.join(os.tmpdir(), "tavir-missao-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "missao-server.log");

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
    "INSERT INTO missions (id, title, period, created_at) "
    "VALUES ('missao-q4', 'Missão Q4', 'Q4', datetime('now'))"
)
conn.execute(
    "INSERT INTO milestones (id, mission_id, title, done, position, created_at) "
    "VALUES ('marco-cap', 'missao-q4', 'Capítulo 4', 0, 0, datetime('now'))"
)
conn.execute(
    "INSERT INTO milestones (id, mission_id, title, done, position, created_at) "
    "VALUES ('marco-lp', 'missao-q4', 'Landing', 0, 1, datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a missão");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9175"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9176", "--strictPort"], {
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

test("concluir marco muda o progresso da missão Q4", async ({ page }) => {
  await page.goto(`${BASE}/mission-control`);
  const mission = page.locator("[data-mission='missao-q4']");
  await expect(mission).toContainText("Missão Q4", { timeout: 15_000 });
  await expect(mission.locator("[data-progress]")).toHaveAttribute("data-progress", "0/2");
  const marco = mission.locator("[data-milestone='marco-cap']");
  await marco.getByRole("button", { name: "Concluir marco" }).click();
  await expect(mission.locator("[data-progress]")).toHaveAttribute("data-progress", "1/2");
  await expect(marco).toContainText("Concluído");
  await expect(mission.locator("[data-milestone='marco-lp']").getByRole("button", { name: "Concluir marco" })).toBeVisible();

  const saved = await page.evaluate(async () => {
    const body = await fetch("/api/v1/missions").then((res) => res.json());
    return body.missions.find((row: { id: string }) => row.id === "missao-q4");
  });
  expect(saved.progress).toBe("1/2");
  expect(saved.milestones.find((row: { id: string }) => row.id === "marco-cap").done).toBe(true);
  expect(saved.milestones.find((row: { id: string }) => row.id === "marco-lp").done).toBe(false);
});
