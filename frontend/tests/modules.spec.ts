import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9134";
const API = "http://127.0.0.1:9133";
const db = path.join(os.tmpdir(), "tavir-modules-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "modules-server.log");

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
conn.execute("INSERT INTO projects (id, slug, name, status, stages_done, total_stages) VALUES ('proj-hub', 'proj-hub', 'Hub', 'active', 0, 0)")
for n in (1, 2):
    conn.execute(
        "INSERT INTO raiox_cases (id, company_name, objective, decision_needed, product_id, deep_scan, physical_store, origin, package_id, status) VALUES (?, ?, 'ver o gargalo', 'seguir ou parar', 'diagnostico', 0, 0, 'amigo', 'basico', 'intake')",
        (f"caso-{n}", f"Casa {n}"),
    )
conn.execute("INSERT INTO pieces (id, title, content_type, stage, needs, status) VALUES ('peca-1', 'Peça do hub', 'article', 'idea', 0, 'draft')")
conn.execute("INSERT INTO factory_runs (id, project_id, template_code, status) VALUES ('run-1', 'proj-hub', 'lp-c', 'running')")
for n in (1, 2, 3):
    conn.execute(
        "INSERT INTO workflows (id, name, category, trigger_type, status, sort_order) VALUES (?, ?, 'editorial', 'manual', 'active', 0)",
        (f"wf-{n}", f"Fluxo {n}"),
    )
for n in range(4):
    conn.execute(
        "INSERT INTO edit_renders (id, label, progress, status) VALUES (?, ?, 0, 'queued')",
        (f"rend-{n}", f"Corte {n}"),
    )
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou os módulos");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9133"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9134", "--strictPort"], {
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

test("o hub abre as cinco esteiras com os números da API", async ({ page }) => {
  await page.goto(`${BASE}/modulos`);
  await expect(page.locator("[data-module]")).toHaveCount(5, { timeout: 15_000 });

  const shown = await page.locator("[data-module]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute("data-module") || "",
      href: (node as HTMLAnchorElement).getAttribute("href") || "",
      count: node.querySelector("[data-count]")?.textContent || "",
    })),
  );
  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/modules/summary");
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<{ modules: Array<{ id: string; href: string; count: number }> }>;
  });
  expect(shown.map((item) => `${item.id}:${item.count}:${item.href}`)).toEqual(
    saved.modules.map((item) => `${item.id}:${item.count}:${item.href}`),
  );
  expect(saved.modules.map((item) => item.count)).toEqual([2, 1, 1, 3, 4]);

  for (const item of saved.modules) {
    await page.goto(`${BASE}/modulos`);
    await page.locator(`[data-module='${item.id}']`).click();
    await expect(page).toHaveURL(new RegExp(`${item.href}$`));
  }
});
