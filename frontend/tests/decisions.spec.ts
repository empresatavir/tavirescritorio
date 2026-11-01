import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9110";
const API = "http://127.0.0.1:9109";
const SECRET = "https://cofre-tela.supabase.co";
const db = path.join(os.tmpdir(), "tavir-decisions-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "decisions-server.log");

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
conn.execute("INSERT INTO projects (id, slug, name, stages_done, total_stages, status) VALUES ('proj-dec', 'proj-dec', 'Meridian', 0, 0, 'active')")
conn.execute("INSERT INTO tasks (id, project_id, title, status, priority, gate_held) VALUES ('task-dec', 'proj-dec', 'Publicar a revisão', 'in_progress', 'medium', 1)")
conn.execute("INSERT INTO jobs (id, task_id, origin, status, cost_usd, tokens_total) VALUES ('job-dec', 'task-dec', 'manual', 'paused', 0, 0)")
conn.execute("INSERT INTO jobs (id, task_id, origin, status, cost_usd, tokens_total) VALUES ('job-recusa', 'task-dec', 'manual', 'paused', 0, 0)")
conn.execute(
    "INSERT INTO approvals (id, title, type, status, job_id, task_id, impact, \\"group\\", kind, question, created_at, updated_at) VALUES (?, ?, 'checkpoint', 'pending', 'job-dec', 'task-dec', 'high', 'block', 'deploy', ?, '2026-10-29T18:00:01', '2026-10-29T18:00:01')",
    ("ap-02", "Deploy landing Meridian", "Publicar com a variável?"),
)
conn.execute(
    "INSERT INTO approvals (id, title, type, status, job_id, task_id, impact, \\"group\\", kind, question, created_at, updated_at) VALUES (?, ?, 'checkpoint', 'pending', 'job-recusa', 'task-dec', 'medium', 'block', 'text', ?, '2026-10-29T18:00:02', '2026-10-29T18:00:02')",
    ("ap-recusa", "Recusa do texto", "Seguir com o texto?"),
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db, TAVIR_SECRET: SECRET },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou as decisões");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9109"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9110", "--strictPort"], {
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

test("teclado aprova o deploy no cofre, recusa a outra e o filtro vazio avisa", async ({ page }) => {
  await page.goto(`${BASE}/decisoes`);
  const selected = page.locator("[data-approval-id][aria-selected='true']");
  await expect(page.locator("[data-approval-id='ap-recusa']")).toBeVisible({ timeout: 15_000 });
  await expect(selected).toHaveAttribute("data-approval-id", "ap-recusa");

  await page.keyboard.press("j");
  await expect(selected).toHaveAttribute("data-approval-id", "ap-02");
  await page.keyboard.press("k");
  await expect(selected).toHaveAttribute("data-approval-id", "ap-recusa");
  await page.keyboard.press("j");
  await page.keyboard.press("c");
  await expect(page.getByRole("region", { name: "Contexto da decisão" })).toContainText("Publicar com a variável?");

  await page.getByLabel("Valor do cofre").fill(SECRET);
  await page.getByRole("heading", { name: "Decisões" }).click();
  await page.keyboard.press("a");
  await expect(page.locator(".stamp")).toContainText("Decisão registrada: Aprovado");

  await expect.poll(async () => {
    return page.evaluate(async () => {
      const res = await fetch("/api/v1/jobs/job-dec");
      if (!res.ok) return "";
      return (await res.json()).status as string;
    });
  }).toBe("running");

  await page.keyboard.press("k");
  await page.getByLabel("Comentário da recusa").fill("Não segue.");
  await page.getByRole("heading", { name: "Decisões" }).click();
  await page.keyboard.press("r");
  await expect(page.locator(".stamp")).toContainText("Decisão registrada: Rejeitado");

  const after = await page.evaluate(async (secret) => {
    const job = await (await fetch("/api/v1/jobs/job-recusa")).json();
    const task = await (await fetch("/api/v1/tasks/task-dec")).json();
    const vault = await (await fetch("/api/v1/vault")).json();
    const ledger = await (await fetch("/api/v1/ledger")).json();
    const refused = await (await fetch("/api/v1/approvals/ap-recusa")).json();
    const dumped = JSON.stringify({ vault, ledger });
    return {
      refusedJob: job.status as string,
      gate: Boolean(task.gate_held),
      comment: refused.justification as string,
      commentInLedger: dumped.includes("Não segue."),
      leaked: dumped.includes(secret),
    };
  }, SECRET);
  expect(after.refusedJob).toBe("paused");
  expect(after.gate).toBe(false);
  expect(after.comment).toBe("Não segue.");
  expect(after.commentInLedger).toBe(true);
  expect(after.leaked).toBe(false);

  await page.getByRole("tab", { name: /Alterações/ }).click();
  await expect(page.getByText("Nada neste filtro.")).toBeVisible();
});
