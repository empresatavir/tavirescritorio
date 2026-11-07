import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9152";
const API = "http://127.0.0.1:9151";
const db = path.join(os.tmpdir(), "tavir-timeline-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "timeline-server.log");

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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9151"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9152", "--strictPort"], {
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

test("clicar a trilha move o cursor sem transição", async ({ page }) => {
  await page.goto(`${BASE}/edicao`);
  const track = page.getByRole("slider", { name: "Trilha" });
  await expect(track).toBeVisible();
  await expect(page.locator("[data-tc]")).toHaveText("00:04 / 00:45");
  const box = await track.boundingBox();
  if (!box) throw new Error("trilha sem caixa");
  await track.click({ position: { x: Math.max(8, Math.floor(box.width * 0.8)), y: Math.floor(box.height / 2) } });
  const moved = await track.locator("[data-cursor]").evaluate((el) => ({
    left: Number.parseFloat((el as HTMLElement).style.left),
    transition: (el as HTMLElement).style.transition,
    duration: getComputedStyle(el).transitionDuration,
  }));
  expect(moved.left).toBeGreaterThan(50);
  expect(moved.transition).toBe("none");
  expect(moved.duration).toBe("0s");
  await expect(page.locator("[data-tc]")).not.toHaveText("00:04 / 00:45");
});
