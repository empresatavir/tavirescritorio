import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9112";
const API = "http://127.0.0.1:9111";
const db = path.join(os.tmpdir(), "tavir-tasks-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "tasks-server.log");

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
conn.execute("INSERT INTO tasks (id, project_id, title, status, priority, gate_held) VALUES ('task-livre', 'tavir-core', 'Publicar sem gate', 'planned', 'medium', 0)")
conn.execute("INSERT INTO tasks (id, project_id, title, status, priority, gate_held) VALUES ('task-gate', 'tavir-core', 'Publicar com gate', 'in_progress', 'medium', 1)")
conn.execute(
    "INSERT INTO approvals (id, title, type, status, task_id, impact, \\"group\\", kind, question) VALUES ('ap-gate', 'Gate da publicação', 'checkpoint', 'pending', 'task-gate', 'high', 'block', 'text', 'Pode concluir?')"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou as tasks");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9111"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9112", "--strictPort"], {
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

test("cria a task, move a livre e o gate impede concluir", async ({ page }) => {
  await page.goto(`${BASE}/tasks`);
  await expect(page.getByText("Publicar sem gate")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Nova task" }).first().click();
  await page.getByLabel("Título").fill("Revisar o contrato");
  await page.getByRole("button", { name: "Criar task" }).click();
  await expect(page.locator("[data-column='to_plan']")).toContainText("Revisar o contrato");

  const created = await page.evaluate(async () => {
    const res = await fetch("/api/v1/tasks/");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<Array<{ title: string; status: string }>>;
  });
  expect(created.find((task) => task.title === "Revisar o contrato")?.status).toBe("to_plan");

  await page.keyboard.press("Escape");
  await page.getByText("Publicar sem gate").click();
  await page.getByRole("dialog", { name: "Detalhamento da task" }).getByRole("button", { name: "Mover para Em execução" }).click();
  await expect(page.locator("[data-column='in_progress']")).toContainText("Publicar sem gate");
  await expect.poll(async () => {
    return page.evaluate(async () => {
      const res = await fetch("/api/v1/tasks/task-livre");
      if (!res.ok) return "";
      return (await res.json()).status as string;
    });
  }).toBe("in_progress");

  await page.keyboard.press("Escape");
  await page.getByText("Publicar com gate").click();
  await page.getByRole("dialog", { name: "Detalhamento da task" }).getByRole("button", { name: "Concluir" }).click();
  await expect.poll(async () => {
    return page.evaluate(async () => {
      const res = await fetch("/api/v1/tasks/task-gate");
      if (!res.ok) return "";
      return (await res.json()).status as string;
    });
  }).toBe("in_progress");
  await expect(page.locator("[data-column='in_progress']")).toContainText("Publicar com gate");
  await expect(page.locator("[data-column='done']")).not.toContainText("Publicar com gate");
});
