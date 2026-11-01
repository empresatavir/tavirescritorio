import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9170";
const API = "http://127.0.0.1:9169";
const db = path.join(os.tmpdir(), "tavir-conhecimento-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "conhecimento-server.log");

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
test.use({ baseURL: BASE, viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9169"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9170", "--strictPort"], {
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

test("guardar nota com escopo aparece na lista e no grafo", async ({ page }) => {
  await page.goto(`${BASE}/cerebro`);
  await expect(page.getByRole("heading", { name: "Cérebro" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("textbox", { name: "Nova ideia ou insight" }).fill("Fila na padaria");
  await page.getByRole("combobox", { name: "Escopo" }).selectOption("comercial");
  await page.getByRole("button", { name: "Guardar nota" }).click();

  const note = page.locator("[data-note]");
  await expect(note).toContainText("Fila na padaria");
  await expect(note).toContainText("comercial");
  const graphNode = page.locator("[data-graph-node='note']");
  await graphNode.scrollIntoViewIfNeeded();
  await expect(graphNode).toContainText("Fila na padaria");
  await expect(graphNode).toContainText("comercial");

  const saved = await page.evaluate(async () => {
    const listed = await fetch("/api/v1/knowledge").then((res) => res.json());
    const graph = await fetch("/api/v1/knowledge/graph").then((res) => res.json());
    const row = listed.find((item: { title: string }) => item.title === "Fila na padaria");
    const node = graph.nodes.find((item: { id: string }) => item.id === row.id);
    return { domain: row.extra_metadata.domain, node };
  });
  expect(saved.domain).toBe("comercial");
  expect(saved.node.type).toBe("note");
  expect(saved.node.scope).toBe("comercial");
});
