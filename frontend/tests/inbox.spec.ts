import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9166";
const API = "http://127.0.0.1:9165";
const db = path.join(os.tmpdir(), "tavir-inbox-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "inbox-server.log");

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
    "INSERT INTO inbox_messages (id, sender, body, status, kind, created_at, updated_at) "
    "VALUES ('msg-resposta', 'Dono da padaria', 'Quero um site', 'received', 'existing', datetime('now'), datetime('now'))"
)
conn.execute(
    "INSERT INTO inbox_messages (id, sender, body, status, kind, created_at, updated_at) "
    "VALUES ('msg-frente', 'Marina', 'Pode ver este briefing?', 'received', 'existing', datetime('now'), datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a caixa");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9165"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9166", "--strictPort"], {
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

test("responder e encaminhar mudam o status da mensagem", async ({ page }) => {
  await page.goto(`${BASE}/comunicacoes`);
  const reply = page.locator("[data-message='msg-resposta']");
  const forward = page.locator("[data-message='msg-frente']");
  await expect(reply).toContainText("Recebida", { timeout: 15_000 });
  await expect(forward).toContainText("Recebida");

  await reply.getByRole("textbox", { name: "Resposta", exact: true }).fill("Podemos falar amanhã.");
  await reply.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(reply.locator("[data-status]")).toHaveAttribute("data-status", "replied");
  await expect(reply).toContainText("Respondida");

  await forward.getByRole("textbox", { name: "Encaminhar para", exact: true }).fill("Yuri");
  await forward.getByRole("button", { name: "Encaminhar", exact: true }).click();
  await expect(forward.locator("[data-status]")).toHaveAttribute("data-status", "forwarded");
  await expect(forward).toContainText("Encaminhada");

  const saved = await page.evaluate(async () => {
    const body = await fetch("/api/v1/inbox/messages").then((res) => res.json());
    return Object.fromEntries(body.messages.map((row: { id: string; status: string; reply_text: string | null; forward_to: string | null }) => [row.id, row]));
  });
  expect(saved["msg-resposta"].status).toBe("replied");
  expect(saved["msg-resposta"].reply_text).toBe("Podemos falar amanhã.");
  expect(saved["msg-frente"].status).toBe("forwarded");
  expect(saved["msg-frente"].forward_to).toBe("Yuri");
});
