import { spawn, type ChildProcess } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SidecarConflict {
  com: string;
  porta: number;
  motivo: string;
}

export interface SidecarSpec {
  id: string;
  nome: string;
  pasta: string;
  comando: string;
  healthUrl: string;
  portas: number[];
  conflito?: SidecarConflict;
}

export interface PortOwner {
  pid: number;
  nome: string;
}

export interface SidecarDeps {
  health: (url: string) => Promise<boolean>;
  portOwner: (port: number) => PortOwner | null;
  spawn: (spec: SidecarSpec) => { pid: number; kill: () => void };
}

export interface SidecarView {
  id: string;
  nome: string;
  pasta: string;
  comando: string;
  healthUrl: string;
  portas: number[];
  saudavel: boolean;
  nosso: boolean;
  dono: string;
}

const children = new Map<string, { pid: number; kill: () => void }>();

export function loadSidecars(file: string): SidecarSpec[] {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { sistemas?: SidecarSpec[] };
  return (raw.sistemas ?? []).map((item) => ({ ...item, portas: item.portas ?? [] }));
}

export function sidecarConfigPath(root = process.cwd()): string {
  const real = path.join(root, 'db', 'sidecars.json');
  if (fs.existsSync(real)) return real;
  return path.join(root, 'db', 'sidecars.example.json');
}

export function parseListeningPid(text: string, port: number): number | null {
  for (const line of text.split(/\r?\n/)) {
    if (!/\bLISTENING\b|\bESCUTANDO\b/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const local = parts.find((part) => part.endsWith(`:${port}`) || part.endsWith(`]:${port}`));
    if (!local) continue;
    const pid = Number(parts[parts.length - 1]);
    if (Number.isInteger(pid) && pid > 0) return pid;
  }
  return null;
}

function defaultPortOwner(port: number): PortOwner | null {
  let text = '';
  try {
    text = execFileSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true });
  } catch {
    return null;
  }
  const pid = parseListeningPid(text, port);
  if (!pid) return null;
  let nome = `pid ${pid}`;
  try {
    const csv = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
    const match = csv.match(/"([^"]+)"/);
    if (match) nome = match[1];
  } catch {
    nome = `pid ${pid}`;
  }
  return { pid, nome };
}

async function defaultHealth(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const response = await fetch(url, { signal: ctrl.signal });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function defaultSpawn(spec: SidecarSpec): { pid: number; kill: () => void } {
  const command = path.join(spec.pasta, spec.comando);
  const child: ChildProcess = spawn(command, [], {
    cwd: spec.pasta,
    detached: true,
    shell: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.unref();
  const pid = child.pid ?? 0;
  return {
    pid,
    kill: () => {
      if (pid > 0) {
        try {
          execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
        } catch {
          child.kill();
        }
      }
    },
  };
}

function assertNoPublishFlag(spec: SidecarSpec): void {
  const text = `${spec.comando} ${spec.pasta}`;
  if (/enable-meta-publish/i.test(text)) {
    throw new Error('O Escritório não liga --enable-meta-publish. Isso fica no DarkFlow.');
  }
}

function conflictOf(spec: SidecarSpec, all: SidecarSpec[], alive: Set<string>): string | null {
  for (const item of all) {
    if (!item.conflito) continue;
    const blocks = (item.id === spec.id && alive.has(item.conflito.com)) || (item.conflito.com === spec.id && alive.has(item.id));
    if (blocks) return item.conflito.motivo;
  }
  return null;
}

export function createSidecarManager(file: string, deps: Partial<SidecarDeps> = {}) {
  const health = deps.health ?? defaultHealth;
  const portOwner = deps.portOwner ?? defaultPortOwner;
  const spawnSpec = deps.spawn ?? defaultSpawn;
  const systems = () => loadSidecars(file);

  async function aliveIds(all: SidecarSpec[]): Promise<Set<string>> {
    const ids = new Set<string>();
    await Promise.all(all.map(async (item) => {
      if (children.has(item.id) || await health(item.healthUrl)) ids.add(item.id);
    }));
    return ids;
  }

  return {
    async status(): Promise<SidecarView[]> {
      const all = systems();
      return Promise.all(all.map(async (item) => {
        const saudavel = await health(item.healthUrl);
        const owner = item.portas.map((port) => portOwner(port)).find((found) => found);
        return {
          id: item.id,
          nome: item.nome,
          pasta: item.pasta,
          comando: item.comando,
          healthUrl: item.healthUrl,
          portas: item.portas,
          saudavel,
          nosso: children.has(item.id),
          dono: owner ? `${owner.nome} · pid ${owner.pid}` : '',
        };
      }));
    },
    async start(id: string): Promise<{ ok: boolean; error?: string }> {
      const all = systems();
      const spec = all.find((item) => item.id === id);
      if (!spec) return { ok: false, error: 'sistema não encontrado' };
      try {
        assertNoPublishFlag(spec);
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      const alive = await aliveIds(all);
      const blocked = conflictOf(spec, all, alive);
      if (blocked) return { ok: false, error: blocked };
      if (alive.has(spec.id)) return { ok: true };
      for (const port of spec.portas) {
        const owner = portOwner(port);
        const ours = children.get(spec.id);
        if (owner && owner.pid !== ours?.pid) {
          return { ok: false, error: `a porta ${port} está com ${owner.nome} (pid ${owner.pid})` };
        }
      }
      const child = spawnSpec(spec);
      if (!child.pid) return { ok: false, error: 'o comando não devolveu um processo' };
      children.set(spec.id, child);
      return { ok: true };
    },
    stop(id: string): { ok: boolean; error?: string } {
      const child = children.get(id);
      if (!child) return { ok: false, error: 'esse sistema não foi iniciado pelo Escritório' };
      child.kill();
      children.delete(id);
      return { ok: true };
    },
  };
}
