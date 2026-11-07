import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOURS } from "../src/features/tour/tours";

const BASE = "http://127.0.0.1:9190";
const API = "http://127.0.0.1:9189";
const db = path.join(os.tmpdir(), "tavir-tour-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "tour-server.log");

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

async function walk(page: import("@playwright/test").Page, key: "exec" | "client") {
  const steps = TOURS[key].steps;
  await page.goto(`${BASE}/fluxo-guiado`);
  await expect(page.locator(`[data-tour='${key}']`)).toHaveAttribute("data-seen", "nao");
  await page.getByRole("button", { name: TOURS[key].name, exact: true }).click();
  for (let index = 0; index < steps.length; index += 1) {
    const card = page.locator(`[data-tour-step='${index}']`);
    await expect(card.getByText("Por que importa.")).toBeVisible();
    await expect(card.locator("[data-why]")).toHaveText(steps[index].why);
    await expect(card.locator("[data-where]")).toHaveText(steps[index].where);
    if (index === 0) await expect(card.getByRole("button", { name: "Anterior" })).toBeDisabled();
    const label = index === steps.length - 1 ? "Concluir" : "Próximo";
    await card.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Escolha um percurso" })).toBeVisible();
  await expect(page.locator(`[data-tour='${key}']`)).toHaveAttribute("data-seen", "sim");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9189"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9190", "--strictPort"], {
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

test("ciclo de execução mostra o porquê de cada passo e grava o percurso visto", async ({ page }) => {
  await walk(page, "exec");
  const saved = await page.evaluate(async () => fetch("/api/v1/tours").then((res) => res.json()));
  expect(saved.seen).toContain("exec");
});

test("jornada do cliente percorre Raio-X, propostas, decisão, funil e finanças", async ({ page }) => {
  await walk(page, "client");
  const wheres = TOURS.client.steps.map((step) => step.where);
  expect(wheres).toEqual([
    "Módulos / Raio-X",
    "Raio-X / Loja da Rua",
    "Comercial / Propostas",
    "Operação / Decisões",
    "Comercial / Funil",
    "Comercial / Finanças",
  ]);
  const saved = await page.evaluate(async () => fetch("/api/v1/tours").then((res) => res.json()));
  expect(saved.seen).toEqual(["exec", "client"]);
});
