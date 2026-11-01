import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9140";
const API = "http://127.0.0.1:9139";
const db = path.join(os.tmpdir(), "tavir-srt-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "srt-server.log");
const EXPECTED = "1\n00:00:01,000 --> 00:00:03,500\nOlá do escritório\n\n2\n00:00:04,000 --> 00:00:06,200\nSegunda fala\n";

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
conn.execute("INSERT INTO edit_cues (id, project_id, project_label, seq, start_ms, end_ms, text) VALUES ('c1', 'corte-sala', 'Corte da sala', 1, 1000, 3500, 'Olá do escritório')")
conn.execute("INSERT INTO edit_cues (id, project_id, project_label, seq, start_ms, end_ms, text) VALUES ('c2', 'corte-sala', 'Corte da sala', 2, 4000, 6200, 'Segunda fala')")
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a legenda");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9139"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9140", "--strictPort"], {
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

test("exportar a legenda baixa o arquivo srt", async ({ page }) => {
  await page.goto(`${BASE}/edicao`);
  const card = page.locator("[data-project='corte-sala']");
  await expect(card.getByText("Olá do escritório")).toBeVisible({ timeout: 15_000 });
  const [download, response] = await Promise.all([
    page.waitForEvent("download"),
    page.waitForResponse((res) => res.url().includes("/srt") && res.request().method() === "POST"),
    card.getByRole("button", { name: "Exportar .srt" }).click(),
  ]);
  expect(response.ok()).toBe(true);
  expect(download.suggestedFilename()).toBe("corte-sala.srt");
  const text = fs.readFileSync(await download.path(), "utf8");
  expect(text).toBe(EXPECTED);
});
