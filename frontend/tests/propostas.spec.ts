import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9156";
const API = "http://127.0.0.1:9155";
const db = path.join(os.tmpdir(), "tavir-propostas-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "propostas-server.log");
const CLIENT = "Padaria Dois Irmãos";

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9155"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9156", "--strictPort"], {
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

test("criar, enviar e aceitar uma proposta muda o estágio", async ({ page }) => {
  await page.goto(`${BASE}/propostas`);
  await page.waitForResponse((res) => res.url().includes("/api/v1/proposals") && res.request().method() === "GET");
  await page.getByRole("button", { name: "Nova proposta" }).click();
  const create = page.getByRole("dialog", { name: "Nova proposta" });
  await create.getByRole("textbox", { name: /Cliente/ }).fill(CLIENT);
  await create.getByRole("button", { name: "Salvar proposta" }).click();

  const card = page.getByRole("button", { name: new RegExp(CLIENT) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText("Coletando informações com o cliente");
  await card.click();

  const detail = page.getByRole("dialog", { name: "Detalhamento da proposta" });
  await detail.getByLabel("E-mail do cliente").fill("dono@padaria.test");
  await detail.getByRole("button", { name: "Gerar link & Enviar" }).click();
  await expect(detail).toContainText("Enviada · aguardando resposta do cliente", { timeout: 15_000 });
  await expect(detail).toContainText("pendentes");

  await detail.getByRole("button", { name: "Contra-assinar e Concluir Proposta" }).click();
  await expect(detail).toContainText("Aceita e contra-assinada", { timeout: 15_000 });
  await expect(detail).toContainText("concluídas");

  const saved = await page.evaluate(async (client) => {
    const rows = await fetch("/api/v1/proposals").then((res) => res.json());
    return rows.find((row: { client: string }) => row.client === client);
  }, CLIENT);
  expect(saved.stage).toBe("done");
  expect(saved.status).toBe("Aceita e contra-assinada");
  expect(saved.send_info.sentTo).toBe("dono@padaria.test");
  expect(saved.send_info.accept[0]).toBe("signed");
});
