import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9130";
const API = "http://127.0.0.1:9129";
const db = path.join(os.tmpdir(), "tavir-sala-order-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "sala-order-server.log");

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9129"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9130", "--strictPort"], {
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

test("reordenar os blocos muda a Sala e fica gravado", async ({ page }) => {
  await page.goto(`${BASE}/configuracoes/visao`);
  const row = page.locator("[data-block='precisa']");
  await expect(row).toBeVisible({ timeout: 15_000 });
  const up = row.getByRole("button", { name: "Subir Precisa de você" });
  await up.click();
  await up.click();
  await up.click();
  await expect(page.locator("[data-block]").first()).toHaveAttribute("data-block", "precisa");

  await page.getByRole("button", { name: "Salvar visão" }).click();
  await expect(page.getByText("Visão salva.")).toBeVisible();

  await page.goto(`${BASE}/sala-operacao`);
  await expect(page.locator("[data-sala-block='precisa']")).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => {
    return page.locator("[data-sala-block]").evaluateAll((nodes) =>
      nodes
        .map((node) => ({
          id: node.getAttribute("data-sala-block") || "",
          order: Number(getComputedStyle(node).order) || 0,
        }))
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id)
        .join(","),
    );
  }).toBe("precisa,jobs,escalados,cards");

  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/settings");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<{ overview: { ordem: string[] } }>;
  });
  expect(saved.overview.ordem).toEqual(["precisa", "jobs", "escalados", "cards"]);
});
