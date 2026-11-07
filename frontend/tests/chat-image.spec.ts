import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9122";
const API = "http://127.0.0.1:9121";
const TEXT = "Segue o print do quadro";
const db = path.join(os.tmpdir(), "tavir-chat-image-playwright.db");
const pngPath = path.join(os.tmpdir(), "tavir-chat-anexo.png");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "chat-image-server.log");

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
    "INSERT INTO agents (id, name, role, sector, status, soul_text, soul_locked, total_jobs, total_cost) VALUES ('pm-paula', 'Paula PM', 'Product Manager', 'Operação', 'idle', 'Ofício da Paula.', 1, 0, 0)"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o agente");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.writeFileSync(
    pngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9121"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9122", "--strictPort"], {
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
  try {
    fs.rmSync(pngPath, { force: true });
  } catch {
    /* arquivo temporário */
  }
});

test("anexar uma imagem mostra a foto na mensagem e a serve", async ({ page }) => {
  await page.goto(`${BASE}/chat`);
  await page.getByRole("button", { name: "Nova conversa" }).click();
  const roster = page.getByRole("listbox", { name: "Escolher agente" });
  await expect(roster.getByRole("button", { name: "Paula PM" })).toBeVisible({ timeout: 15_000 });
  await roster.getByRole("button", { name: "Paula PM" }).click();

  await page.locator('input[type="file"]').setInputFiles(pngPath);
  await expect(page.getByRole("img", { name: "tavir-chat-anexo.png" })).toBeVisible();

  await page.getByLabel("Mensagem").fill(TEXT);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator("#chat-scroll").getByText(TEXT)).toBeVisible();

  let served = "";
  await expect.poll(async () => {
    served = await page.evaluate(async () => {
      const list = await fetch("/api/v1/chat/conversations").then((res) => res.json());
      const conv = list[0];
      if (!conv) return "";
      const detail = await fetch(`/api/v1/chat/conversations/${conv.id}`).then((res) => res.json());
      const images = (detail.messages || []).flatMap(
        (item: { images?: Array<{ url: string }> | null }) => item.images || [],
      );
      return images.map((item: { url: string }) => item.url).join(" ");
    });
    return served;
  }, { timeout: 60_000 }).toContain("/api/v1/chat/images/");

  const pathOnly = served.slice(served.indexOf("/api/v1/chat/images/"));
  await expect(page.locator("#chat-scroll").locator(`img[src="${pathOnly}"]`)).toBeVisible();

  const body = await page.evaluate(async (url) => {
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, type: res.headers.get("content-type") || "", head: Array.from(bytes.slice(0, 4)) };
  }, pathOnly);
  expect(body.status).toBe(200);
  expect(body.type).toContain("image");
  expect(body.head).toEqual([0x89, 0x50, 0x4e, 0x47]);
});
