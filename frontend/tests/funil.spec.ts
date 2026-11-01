import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9154";
const API = "http://127.0.0.1:9153";
const db = path.join(os.tmpdir(), "tavir-funil-playwright.db");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontendDir, "..", "backend");
const serverLog = path.resolve(frontendDir, "..", "visual", "funil-server.log");

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
    "INSERT INTO raiox_cases (id, company_name, objective, decision_needed, product_id, deep_scan, physical_store, origin, package_id, status, debrief_decision, created_at, updated_at) "
    "VALUES ('caso-a', 'Padaria do Largo', 'Vender', 'Seguir', 'diagnostico', 0, 1, 'amigo', 'basico', 'intake', 'proposta_emitida', '2026-10-01 12:00:00', '2026-10-01 12:00:00')"
)
conn.execute(
    "INSERT INTO raiox_cases (id, company_name, objective, decision_needed, product_id, deep_scan, physical_store, origin, package_id, status, created_at, updated_at) "
    "VALUES ('caso-b', 'Oficina Norte', 'Agenda', 'Medir', 'diagnostico', 0, 0, 'amigo', 'basico', 'intake', '2026-10-19 12:00:00', '2026-10-19 12:00:00')"
)
conn.execute(
    "INSERT INTO proposals (id, num, client, stage, status, tone, version, value, raiox_case_id, created_at, updated_at) "
    "VALUES ('p-viva', 'PRO-1', 'Padaria do Largo', 'progress', 'Rascunho', 'work', 1, 10000, 'caso-a', '2026-10-01 12:00:00', '2026-10-01 12:00:00')"
)
conn.execute(
    "INSERT INTO proposals (id, num, client, stage, status, tone, version, value, raiox_case_id, created_at, updated_at) "
    "VALUES ('p-env', 'PRO-2', 'Oficina Norte', 'pending', 'Enviada', 'wait', 1, 20000, 'caso-b', '2026-10-01 12:00:00', '2026-10-20 12:00:00')"
)
conn.execute(
    "INSERT INTO proposals (id, num, client, stage, status, tone, version, value, raiox_case_id, created_at, updated_at) "
    "VALUES ('p-ok', 'PRO-3', 'Padaria do Largo', 'done', 'Aceita e contra-assinada', 'ok', 1, 40000, 'caso-a', '2026-10-01 12:00:00', '2026-10-11 12:00:00')"
)
conn.commit()
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_DB: db },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou o funil");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE });

test.beforeAll(async () => {
  removeDb();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9153"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9154", "--strictPort"], {
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

test("funil mostra os quatro números da API", async ({ page }) => {
  await page.goto(`${BASE}/funil`);
  await expect(page.getByRole("heading", { name: "Funil", exact: true })).toBeVisible();
  const shown = await page.locator("[data-metric]").evaluateAll((nodes) =>
    nodes.map((node) => ({ id: node.getAttribute("data-metric"), text: node.textContent?.trim() || "" })),
  );
  const saved = await page.evaluate(async () => {
    const res = await fetch("/api/v1/commercial/funnel");
    return res.json();
  });
  const byId = Object.fromEntries(shown.map((item) => [item.id, item.text]));
  expect(byId.open).toBe(saved.open_label);
  expect(byId.conversion).toBe(saved.conversion_label);
  expect(byId.cycle).toBe(saved.cycle_label);
  expect(byId.ticket).toBe(saved.ticket_label);
  expect(saved.open_label).toBe("R$ 30,0 mil");
  expect(saved.open_count).toBe(2);
  expect(saved.conversion_label).toBe("50%");
  expect(saved.cycle_label).toBe("10 d");
  expect(saved.ticket_label).toBe("R$ 30,0 mil");
});
