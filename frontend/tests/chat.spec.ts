import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9116";
const API = "http://127.0.0.1:9115";
const OFICIO = "Ofício da Paula: escreve o plano com clareza.";
const TEXT = "Olá do escritório";
const db = path.join(os.tmpdir(), "tavir-chat-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "chat-server.log");

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

function seed() {
  const script = `
import os, sqlite3
conn = sqlite3.connect(os.environ["TAVIR_DB"], timeout=10)
conn.execute(
    "INSERT INTO agents (id, name, role, sector, status, soul_text, soul_locked, total_jobs, total_cost) VALUES ('pm-paula', 'Paula PM', 'Product Manager', 'Operação', 'active', ?, 1, 0, 0)",
    (os.environ["TAVIR_OFICIO"],),
)
conn.execute(
    "INSERT INTO agents (id, name, role, sector, status, soul_text, soul_locked, total_jobs, total_cost) VALUES ('ag-marina', 'Marina', 'Marca', 'Comercial', 'active', 'Ofício da Marina.', 1, 0, 0)"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db, TAVIR_OFICIO: OFICIO },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou os agentes");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9115"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9116", "--strictPort"], {
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

test("escolher a Paula abre o ofício e a mensagem fica gravada", async ({ page }) => {
  await page.goto(`${BASE}/chat`);
  await page.getByRole("button", { name: "Nova conversa" }).click();
  const roster = page.getByRole("listbox", { name: "Escolher agente" });
  await expect(roster.getByRole("button", { name: "Paula PM" })).toBeVisible({ timeout: 15_000 });
  await roster.getByRole("button", { name: "Paula PM" }).click();
  await expect(page.getByText("Conversa vazia. O ofício entra no contexto.")).toBeVisible();
  await expect(page.getByText(OFICIO)).toBeVisible();

  const opened = await page.evaluate(async () => {
    const res = await fetch("/api/v1/chat/conversations");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<Array<{ id: string; agent_id: string }>>;
  });
  expect(opened).toHaveLength(1);
  expect(opened[0].agent_id).toBe("pm-paula");

  await page.getByLabel("Mensagem").fill(TEXT);
  await Promise.all([
    page.getByRole("status").filter({ hasText: "está pensando" }).waitFor({ timeout: 10_000 }),
    page.getByRole("button", { name: "Enviar" }).click(),
  ]);
  await expect(page.locator("#chat-scroll").getByText(TEXT)).toBeVisible();

  await expect.poll(async () => {
    return page.evaluate(async (id) => {
      const res = await fetch(`/api/v1/chat/conversations/${id}`);
      if (!res.ok) return "";
      const body = await res.json();
      const texts = (body.messages || []).map((item: { text: string }) => item.text).join("\n");
      return texts;
    }, opened[0].id);
  }).toContain(TEXT);
});
