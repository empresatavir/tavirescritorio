import { expect, test, type ChildProcess } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:9188";
const API = "http://127.0.0.1:9187";
const KEY = "sk-cfg003-padaria";
const db = path.join(os.tmpdir(), "tavir-cfg-playwright.db");
const secrets = path.join(os.tmpdir(), "tavir-cfg-secrets.json");
const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(frontendDir, "..");
const backend = path.join(repo, "backend");
const serverLog = path.join(repo, "visual", "cfg-server.log");

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
  try {
    fs.rmSync(secrets, { force: true });
  } catch {
    /* arquivo temporário da chave */
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

function removeWorkspaces() {
  const script = `
import os, shutil
from pathlib import Path
root = Path(os.environ["TAVIR_ROOT"]) / "tavir-interno"
if root.is_dir():
    for path in root.glob("padaria-nova-*"):
        shutil.rmtree(path, ignore_errors=True)
`;
  spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_ROOT: repo },
    encoding: "utf8",
  });
}

function seedMemory(localPath: string) {
  const script = `
import os
from pathlib import Path
folder = Path(os.environ["TAVIR_PROJECT"]) / "memory" / "agente"
folder.mkdir(parents=True, exist_ok=True)
(folder / "fila.md").write_text("# Fila\\n\\nO cliente espera.\\n", encoding="utf-8")
`;
  const result = spawnSync("python", ["-c", script], {
    env: { ...process.env, TAVIR_PROJECT: localPath },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "não gravou a memória");
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
test.use({ baseURL: BASE, viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  removeDb();
  removeWorkspaces();
  fs.mkdirSync(path.dirname(serverLog), { recursive: true });
  const log = fs.openSync(serverLog, "w");
  apiProc = spawn("python", ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "9187"], {
    cwd: backend,
    env: { ...process.env, TAVIR_DB_PATH: db, TAVIR_SECRETS_PATH: secrets },
    stdio: ["ignore", log, log],
  });
  webProc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "9188", "--strictPort"], {
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
  removeWorkspaces();
  removeDb();
});

test("configuração grava projeto, controle, motor e memória", async ({ page }) => {
  await page.goto(`${BASE}/configuracoes/projetos`);
  await page.getByRole("textbox", { name: "Nome do projeto" }).fill("Padaria Nova");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await expect(page.getByText("Projeto criado.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Padaria Nova" })).toBeVisible();

  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("textbox", { name: "Comando de compilação" }).fill("npm run build");
  await page.getByRole("button", { name: "negocios" }).click();
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect(page.getByText("Projeto salvo.")).toBeVisible();

  await page.goto(`${BASE}/configuracoes/credenciais`);
  const claude = page.locator("article[data-tom='claude']");
  await claude.getByPlaceholder(/Cole a chave|Chave guardada/).fill(KEY);
  await claude.getByRole("button", { name: "Plugar" }).click();
  await expect(page.getByText(/plugado/i)).toBeVisible({ timeout: 20_000 });

  const located = await page.evaluate(async () => {
    const body = await fetch("/api/v1/settings").then((res) => res.json());
    return body.projects.find((row: { name: string }) => row.name === "Padaria Nova");
  });
  seedMemory(located.local_path);
  await page.goto(`${BASE}/configuracoes/memorias`);
  await expect(page.getByRole("button", { name: "Aprovar" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);

  const saved = await page.evaluate(async (secret: string) => {
    const settings = await fetch("/api/v1/settings").then((res) => res.json());
    const project = settings.projects.find((row: { name: string }) => row.name === "Padaria Nova");
    const memory = await fetch(`/api/v1/settings/projects/${project.id}/memory`).then((res) => res.json());
    const ledger = await fetch("/api/v1/ledger/export").then((res) => res.text());
    const motors = await fetch("/api/v1/integrations/motors").then((res) => res.json());
    const claude = motors.motors.find((row: { id: string }) => row.id === "claude");
    return {
      command: project.control.build_command,
      bases: project.control.bases,
      projeto: memory.projeto.map((row: { name: string }) => row.name),
      agente: memory.agente.length,
      hasKey: claude.has_key,
      leaked: ledger.includes(secret),
    };
  }, KEY);
  expect(saved.command).toBe("npm run build");
  expect(saved.bases).toContain("negocios");
  expect(saved.projeto).toEqual(["fila.md"]);
  expect(saved.agente).toBe(0);
  expect(saved.hasKey).toBe(true);
  expect(saved.leaked).toBe(false);
});
