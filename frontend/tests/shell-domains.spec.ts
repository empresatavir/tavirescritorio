import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9194";
const API = "http://127.0.0.1:9193";
const db = path.join(os.tmpdir(), "tavir-shell-domains-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "shell-domains-server.log");

const menus: Array<[string, string, string]> = [
  ["Operação", "Sala de Operação", "Funil"],
  ["Módulos", "Visão dos módulos", "Sala de Operação"],
  ["Comercial", "Funil", "Visão dos módulos"],
  ["Social", "Perfis e calendário", "Funil"],
  ["Conhecimento", "Cérebro", "Perfis e calendário"],
  ["Estratégia", "Mission Control", "Cérebro"],
  ["Sistema", "Analytics", "Mission Control"],
];

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

test.setTimeout(90_000);
test.use({ baseURL: BASE, viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9193"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9194", "--strictPort"], {
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

test("cada domínio troca o menu e o hover mostra o tooltip", async ({ page }) => {
  await page.goto(`${BASE}/sala-operacao`);
  const rail = page.getByRole("navigation", { name: "Domínios" });
  const sub = page.getByRole("complementary", { name: "Menu da área" });

  for (const [domain, first, absent] of menus) {
    const button = rail.getByRole("button", { name: domain, exact: true });
    await button.hover();
    await expect(button.locator(".rail-tip")).toBeVisible();
    await expect(button.locator(".rail-tip")).toHaveText(domain);
    await button.click();
    await expect(sub.getByRole("button", { name: first, exact: true })).toBeVisible();
    await expect(sub.getByRole("button", { name: absent, exact: true })).toHaveCount(0);
  }
});
