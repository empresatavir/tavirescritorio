import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9114";
const API = "http://127.0.0.1:9113";
const db = path.join(os.tmpdir(), "tavir-plan-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "plan-server.log");

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

function seed() {
  const script = `
import os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
conn.execute("INSERT INTO projects (id, slug, name, stages_done, total_stages, status) VALUES ('tavir-core', 'tavir-core', 'TAVIR', 0, 0, 'active')")
conn.execute("INSERT INTO agents (id, name, role, sector, status, soul_locked, total_jobs, total_cost) VALUES ('pm-projetos', 'Paula PM', 'Product Manager', 'Operação', 'active', 1, 0, 0)")
conn.execute("INSERT INTO tasks (id, seq, project_id, title, status, priority, gate_held) VALUES ('task-plano', 12, 'tavir-core', 'Revisar o briefing', 'to_plan', 'medium', 0)")
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a task");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9113"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9114", "--strictPort"], {
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

test("pedir plano com a Paula cria o job e leva o card a Planejado", async ({ page }) => {
  await page.goto(`${BASE}/tasks`);
  await expect(page.getByText("Revisar o briefing")).toBeVisible({ timeout: 15_000 });
  await page.getByText("Revisar o briefing").click();
  await page
    .getByRole("dialog", { name: "Detalhamento da task" })
    .getByRole("button", { name: "Planejar com Paula" })
    .click();

  const plan = page.getByRole("dialog", { name: "Planejar tarefa" });
  const confirm = plan.getByRole("button", { name: "Planejar com Paula" });
  await expect(confirm).toBeEnabled({ timeout: 15_000 });
  await confirm.click();

  await expect(page.locator("[data-column='planned']")).toContainText("Revisar o briefing", { timeout: 20_000 });

  const after = await page.evaluate(async () => {
    const task = await (await fetch("/api/v1/tasks/task-plano")).json();
    const jobs = await (await fetch("/api/v1/jobs/")).json();
    const planJob = (jobs as Array<{ task_id: string | null; origin: string; status: string }>).find(
      (job) => job.task_id === "task-plano" && job.origin === "planning",
    );
    return { status: task.status as string, planStatus: planJob?.status || "" };
  });
  expect(after.status).toBe("planned");
  expect(after.planStatus).toBe("succeeded");
});
