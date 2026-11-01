import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9144";
const API = "http://127.0.0.1:9143";
const db = path.join(os.tmpdir(), "tavir-raiox-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "raiox-server.log");

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

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9143"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9144", "--strictPort"], {
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

test("abrir caso com varredura, evidência e devolutiva", async ({ page }) => {
  await page.goto(`${BASE}/raiox`);
  await page.locator(".rx-modes").getByRole("button", { name: /Leitura completa/ }).click();
  const dialog = page.locator("form").filter({ has: page.getByRole("button", { name: "Abrir caso" }) });
  await dialog.getByRole("checkbox", { name: /Deep scan/ }).check();
  await dialog.getByLabel("Empresa").fill("Padaria do Largo");
  await dialog.getByRole("button", { name: "Abrir caso" }).click();

  await expect(page.getByRole("heading", { name: "Padaria do Largo" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".rx-meta")).toContainText("Deep scan");

  await page.getByRole("button", { name: "Evidências" }).click();
  const scan = page.getByLabel("Frentes do deep scan");
  await expect(scan).toContainText("Falta · Site próprio");
  await page.getByLabel("Fonte").fill("Visita");
  await page.getByLabel("O que mostra").fill("Fila na porta às 8h");
  await page.getByRole("button", { name: "Registrar evidência" }).click();
  await expect(page.getByText("Fila na porta às 8h")).toBeVisible();
  await expect(scan).toContainText("Coberto · Site próprio");

  await page.getByRole("button", { name: "Prioridade", exact: true }).click();
  await page.getByRole("group", { name: "Etapa do gargalo" }).getByRole("button", { name: "Encontrar" }).click();
  await page.getByRole("textbox", { name: "Gargalo", exact: true }).fill("A fila não vira pedido");
  await page.getByLabel("Por que vem primeiro").fill("É o que trava a venda.");
  await page.getByRole("button", { name: "Fixar prioridade" }).click();
  await expect(page.locator(".rx-meta")).toContainText("Prioridade");

  await page.getByRole("button", { name: "Devolutiva" }).click();
  await page.getByRole("button", { name: "Não emitir" }).click();
  await page.getByLabel("Motivo").fill("O dono ainda não decide.");
  await page.getByRole("button", { name: "Registrar devolutiva" }).click();
  await expect(page.locator(".rx-meta")).toContainText("Não emitir");

  const caseId = page.url().split("/").pop();
  const saved = await page.evaluate(async (id) => {
    const res = await fetch(`/api/v1/raiox/cases/${id}`);
    return res.json();
  }, caseId);
  expect(saved.company_name).toBe("Padaria do Largo");
  expect(saved.deep_scan).toBe(true);
  expect(saved.evidence[0].claim).toBe("Fila na porta às 8h");
  expect(saved.evidence[0].front).toBe("site");
  expect(saved.scan.find((row: { id: string }) => row.id === "site").covered).toBe(true);
  expect(saved.debrief_decision).toBe("nao_emitir");
  expect(saved.debrief_reason).toBe("O dono ainda não decide.");
});
