import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9118";
const API = "http://127.0.0.1:9117";
const TITLE = "Plano da semana";
const BODY = "texto-que-nao-vai-no-livro";
const db = path.join(os.tmpdir(), "tavir-chat-delete-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "chat-delete-server.log");

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
conn.execute("INSERT INTO agents (id, name, role, sector, status, soul_locked, total_jobs, total_cost) VALUES ('pm-paula', 'Paula PM', 'Product Manager', 'Operação', 'active', 1, 0, 0)")
conn.execute("INSERT INTO chat_conversations (id, agent_id, title) VALUES ('cv-plano', 'pm-paula', ?)", (os.environ["TAVIR_TITLE"],))
conn.execute("INSERT INTO chat_messages (id, conversation_id, role, text) VALUES ('m-plano', 'cv-plano', 'user', ?)", (os.environ["TAVIR_BODY"],))
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db, TAVIR_TITLE: TITLE, TAVIR_BODY: BODY },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a conversa");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9117"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9118", "--strictPort"], {
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

test("confirmar a exclusão tira a conversa e grava o livro sem o texto", async ({ page }) => {
  await page.goto(`${BASE}/chat`);
  const history = page.getByRole("complementary", { name: "Histórico de conversas" });
  await expect(history.getByText(TITLE)).toBeVisible({ timeout: 15_000 });
  await history.getByRole("button", { name: `Apagar ${TITLE}` }).click();
  await expect(history.getByText("Apagar esta conversa?")).toBeVisible();
  await history.getByRole("button", { name: "Sim" }).click();
  await expect(history.getByText(TITLE)).toHaveCount(0);
  await expect(page.getByText("Nenhuma conversa. Use Nova conversa para começar.")).toBeVisible();

  const after = await page.evaluate(async (body) => {
    const conversations = await (await fetch("/api/v1/chat/conversations")).json();
    const ledger = await (await fetch("/api/v1/ledger")).json();
    const dumped = JSON.stringify(ledger);
    const line = (ledger.events || []).find((event: { action: string }) => event.action === "chat.apagada");
    return {
      count: (conversations as unknown[]).length,
      hasLine: Boolean(line),
      hasId: String(line?.details || "").includes("cv-plano"),
      leaked: dumped.includes(body),
    };
  }, BODY);
  expect(after.count).toBe(0);
  expect(after.hasLine).toBe(true);
  expect(after.hasId).toBe(true);
  expect(after.leaked).toBe(false);
});
