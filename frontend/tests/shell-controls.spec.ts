import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9104";
const API = "http://127.0.0.1:9103";
const db = path.join(os.tmpdir(), "tavir-shell-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "shell-controls-server.log");

let apiProc: ChildProcess | undefined;
let webProc: ChildProcess | undefined;

function removeDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(db + suffix, { force: true });
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
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9103"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9104", "--strictPort"], {
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

test("sino marca lida e a paleta busca na API", async ({ page }) => {
  const created = await fetch(`${API}/api/v1/approvals/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Gate do sino", reason: "Esperando você" }),
  });
  expect(created.ok).toBe(true);

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(`${BASE}/sala-operacao`);
  const bell = page.getByRole("button", { name: "Notificações" });
  await expect(bell, errors.join("\n") || page.url()).toBeVisible({ timeout: 15_000 });
  await expect(bell).toContainText("1");
  await bell.click();
  await expect(page.getByRole("region", { name: "Lista de notificações" })).toContainText("Gate do sino");
  await page.getByRole("button", { name: "Marcar lida" }).click();
  await expect(bell).not.toContainText("1");

  const notesBody = await page.evaluate(async () => {
    const res = await fetch("/api/v1/notifications");
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  });
  expect(notesBody.unread_count).toBe(0);
  expect(notesBody.items.some((item: { title: string; read: boolean }) => item.title === "Gate do sino" && item.read)).toBe(true);

  await page.getByRole("button", { name: "Buscar telas, tasks, agentes… (Ctrl K)" }).click();
  const box = page.getByRole("dialog", { name: "Busca" });
  await box.getByRole("textbox", { name: "Buscar no escritório" }).fill("zzzz-nada");
  await expect(box.getByText("Nada com esse termo.")).toBeVisible();
  const missed = await page.evaluate(async () => {
    const res = await fetch("/api/v1/search?q=zzzz-nada");
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  });
  expect(missed.items).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(box).toHaveCount(0);

  await page.keyboard.press("Control+k");
  await box.getByRole("textbox", { name: "Buscar no escritório" }).fill("a");
  await expect(box.getByRole("option").nth(1)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  const href = await box.locator('[aria-selected="true"]').getAttribute("data-href");
  expect(href).toBeTruthy();
  const foundBody = await page.evaluate(async () => {
    const res = await fetch("/api/v1/search?q=a");
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  });
  expect(foundBody.items.some((item: { href: string }) => item.href === href)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});
