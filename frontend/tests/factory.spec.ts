import { expect, test, type ChildProcess, type Page } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9150";
const API = "http://127.0.0.1:9149";
const db = path.join(os.tmpdir(), "tavir-factory-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const repo = path.resolve(frontendDir, "..");
const serverLog = path.resolve(repo, "visual", "factory-server.log");

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

function removeWorkspaces() {
  const root = path.join(repo, "tavir-interno");
  if (!fs.existsSync(root)) return;
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith("padaria-web")) continue;
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
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

function seedFinished() {
  const script = `
import os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
conn.execute(
    "INSERT INTO projects (id, slug, name, client, company, template_code, stages_done, total_stages, status, created_at, updated_at) "
    "VALUES ('padaria-pronta', 'padaria-pronta', 'Padaria pronta', 'TAVIR', 'TAVIR', 'lp-c', 1, 1, 'done', datetime('now'), datetime('now'))"
)
conn.execute(
    "INSERT INTO factory_runs (id, project_id, template_code, status, meta, created_at, updated_at) "
    "VALUES ('run-pronta', 'padaria-pronta', 'lp-c', 'done', '{}', datetime('now'), datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o projeto finalizado");
  }
}

async function closeAiNotice(page: Page, waitMs = 0) {
  const aviso = page.getByRole("alertdialog", { name: /motor de IA/i });
  if (waitMs > 0) {
    await aviso.waitFor({ state: "visible", timeout: waitMs }).catch(() => undefined);
  }
  if (await aviso.isVisible().catch(() => false)) {
    await aviso.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(aviso).toBeHidden();
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  removeWorkspaces();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9149"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9150", "--strictPort"], {
    cwd: frontendDir,
    env: { ...process.env, TAVIR_API_TARGET: API },
    stdio: ["ignore", log, log],
  });
  await waitOk(`${API}/api/v1/health`);
  await waitOk(BASE);
  seedFinished();
});

test.afterAll(() => {
  killTree(webProc);
  killTree(apiProc);
  removeDb();
  removeWorkspaces();
});

test("usar esteira, refazer, pausar, qa e exportar json", async ({ page }) => {
  await page.goto(`${BASE}/fabrica`);
  await page.locator("[data-cat='lp']").getByRole("button", { name: "Usar esteira" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo Projeto" });
  await dialog.getByLabel(/Nome do Projeto/).fill("Padaria web");
  await dialog.getByRole("radio", { name: /Projeto Interno/ }).check();
  await dialog.getByRole("button", { name: "Criar Projeto" }).click();
  await closeAiNotice(page);

  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible({ timeout: 20_000 });
  await closeAiNotice(page);
  const projectId = new URL(page.url()).pathname.split("/").pop();

  const redoButton = page.getByRole("button", {
    name: "Refazer entrega",
    description: /Reabre a entrega/,
  });
  await expect(redoButton).toBeEnabled({ timeout: 15_000 });
  await closeAiNotice(page, 12_000);
  await redoButton.click();
  const redo = page.getByRole("dialog", { name: /Refazer a entrega/ });
  await redo.getByLabel("Como deve ser feito").fill("Reabrir o briefing");
  await redo.getByRole("button", { name: "Refazer entrega" }).click();
  await closeAiNotice(page, 8_000);

  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retomar", description: "Retomar esteira" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /Livro-razão/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar JSON" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`ledger-${projectId}.json`);
  const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  expect(exported.project_id).toBe(projectId);
  expect(JSON.stringify(exported.ledger)).toContain("paused");

  await page.getByRole("button", { name: /Workspace/ }).click();
  await page.getByRole("button", { name: "Completion Guard & QA" }).click();
  await expect(page.getByRole("heading", { name: "Completion Guard & QA" })).toBeVisible();
  await page.getByRole("button", { name: "Rodar QA agora" }).click();

  const saved = await page.evaluate(async (id) => {
    const [run, qa] = await Promise.all([
      fetch(`/api/v1/factory/projects/${id}/run`).then((res) => res.json()),
      fetch(`/api/v1/factory/projects/${id}/qa`).then((res) => res.json()),
    ]);
    return { run, qa };
  }, projectId);
  expect(saved.run.status).toBe("paused");
  expect(saved.run.meta.redo.note).toBe("Reabrir o briefing");
  expect(saved.qa).toBeTruthy();

  const accept = (box: { accept: () => Promise<void> }) => void box.accept();
  page.on("dialog", accept);
  await page.getByRole("button", { name: "Excluir projeto" }).click();
  await expect(page).toHaveURL(/\/fabrica\/?$/, { timeout: 15_000 });
  page.off("dialog", accept);
});

test("manutenção de projeto finalizado abre o pedido de alteração", async ({ page }) => {
  await page.goto(`${BASE}/fabrica/padaria-pronta`);
  await closeAiNotice(page, 8_000);
  await page.getByRole("button", { name: "Entrar em manutenção" }).click();
  await expect(page.getByPlaceholder("Descreva a alteração no projeto…")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Aplicar no projeto" })).toBeVisible();

  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/factory/projects/padaria-pronta/run");
    return res.json();
  });
  expect(saved.status).toBe("done");
  expect(saved.meta.maintenance).toBe(true);
});
