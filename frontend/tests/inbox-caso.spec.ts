import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9168";
const API = "http://127.0.0.1:9167";
const db = path.join(os.tmpdir(), "tavir-inbox-caso-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "inbox-caso-server.log");

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
    "VALUES ('msg-novo', 'Padaria Nova', 'Quero aparecer no Google.', 'received', 'new', datetime('now'), datetime('now'))"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a mensagem");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9167"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9168", "--strictPort"], {
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

test("mensagem de cliente novo abre o caso no Raio-X", async ({ page }) => {
  await page.goto(`${BASE}/comunicacoes`);
  const card = page.locator("[data-message='msg-novo']");
  await expect(card.getByRole("button", { name: "Abrir caso no Raio-X" })).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: "Abrir caso no Raio-X" }).click();
  await expect(page).toHaveURL(/\/raiox\/.+/);
  const notice = page.getByRole("button", { name: "Fechar aviso" });
  if (await notice.isVisible().catch(() => false)) {
    await notice.click();
  }
  await expect(page.getByRole("heading", { name: "Padaria Nova" })).toBeVisible();

  const saved = await page.evaluate(async () => {
    const cases = await fetch("/api/v1/raiox/cases").then((res) => res.json());
    const inbox = await fetch("/api/v1/inbox/messages").then((res) => res.json());
    const message = inbox.messages.find((row: { id: string }) => row.id === "msg-novo");
    return {
      company: cases.find((row: { company_name: string }) => row.company_name === "Padaria Nova"),
      caseId: message.raiox_case_id,
    };
  });
  expect(saved.company.company_name).toBe("Padaria Nova");
  expect(saved.company.id).toBe(saved.caseId);
  expect(page.url()).toContain(`/raiox/${saved.caseId}`);
});
