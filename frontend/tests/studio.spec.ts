import { expect, test, type ChildProcess, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9148";
const API = "http://127.0.0.1:9147";
const db = path.join(os.tmpdir(), "tavir-studio-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "studio-server.log");

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9147"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9148", "--strictPort"], {
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

async function closeAiNotice(page: Page) {
  const aviso = page.getByRole("alertdialog", { name: /motor de IA/i });
  if (await aviso.isVisible().catch(() => false)) {
    await aviso.getByRole("button", { name: "Fechar aviso" }).click();
  }
}

test("perfil, produção, ângulo, revisão, publicação e instruções", async ({ page }) => {
  await page.goto(`${BASE}/studio`);
  await page.getByRole("button", { name: "Novo perfil" }).click();
  const profileDialog = page.getByRole("dialog");
  await profileDialog.getByRole("textbox", { name: /Nome do perfil/ }).fill("Padaria");
  await profileDialog.getByRole("textbox", { name: /Empresa dona/ }).fill("TAVIR");
  await profileDialog.getByRole("button", { name: "Continuar" }).click();
  await profileDialog.getByRole("button", { name: "Continuar" }).click();
  await profileDialog.getByRole("textbox", { name: /Tom de voz/ }).fill("direto e claro");
  await profileDialog.getByRole("button", { name: "Criar perfil" }).click();
  await expect(page.getByRole("heading", { name: "Dash · Padaria" })).toBeVisible({ timeout: 15_000 });

  await page.locator(".stu-ws-cta").click();
  const prodDialog = page.getByRole("dialog");
  await prodDialog.getByRole("button", { name: /Instagram/ }).click();
  await prodDialog.getByRole("button", { name: "Continuar" }).click();
  await prodDialog.getByRole("button", { name: /Oráculo de Pautas/ }).click();
  await prodDialog.getByRole("button", { name: "Continuar" }).click();
  await prodDialog.getByRole("button", { name: /Tema manual/ }).click();
  await prodDialog.getByRole("textbox", { name: /Tema e ângulo/ }).fill("Fila na padaria às oito");
  await prodDialog.getByRole("button", { name: "Iniciar squad" }).click();

  await expect(page.getByRole("button", { name: "Aprovar opção" })).toBeVisible({ timeout: 15_000 });
  await closeAiNotice(page);
  await page.getByRole("button", { name: "Aprovar opção" }).click();
  await expect(page.getByRole("button", { name: "Aprovar publicação" })).toBeVisible({ timeout: 15_000 });
  await closeAiNotice(page);
  await page.getByRole("button", { name: "Aprovar publicação" }).click();
  await closeAiNotice(page);

  await page.getByRole("button", { name: "Mesa do Oráculo" }).click();
  await page.getByRole("button", { name: "Editar instruções" }).click();
  const instDialog = page.getByRole("dialog", { name: /Editar instruções/ });
  await instDialog.getByRole("button", { name: "+ Adicionar" }).click();
  await instDialog.locator(".stu-inst-row input").last().fill("Começar pela fila");
  await instDialog.getByRole("button", { name: "Salvar instruções" }).click();
  await expect(page.getByText("Começar pela fila")).toBeVisible();

  const profileId = new URL(page.url()).pathname.split("/").pop();
  const saved = await page.evaluate(async (id) => {
    const [pieces, profile] = await Promise.all([
      fetch("/api/v1/studio/pieces").then((res) => res.json()),
      fetch(`/api/v1/studio/profiles/${id}`).then((res) => res.json()),
    ]);
    return { pieces, profile };
  }, profileId);
  const piece = saved.pieces.find((row: { profile_id: string }) => row.profile_id === profileId);
  expect(piece.stage).toBe("done");
  expect(String(piece.script || "").length).toBeGreaterThan(0);
  expect(saved.profile.guidelines).toContain("Começar pela fila");
});
