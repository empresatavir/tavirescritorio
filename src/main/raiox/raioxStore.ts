import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RaioxArtifact, RaioxCase } from '../../shared/raiox';
import { RaioxError } from './raioxRules';

const ID_RE = /^RX-[0-9A-F]{8}$/;
const MAX_BYTES = 25 * 1024 * 1024;

function devRootAllowed(): boolean {
  return process.argv.includes('--dev') || process.env.NODE_ENV === 'test';
}

export function raioxRoot(base?: string): string {
  let root = base;
  if (!root && devRootAllowed() && process.env.TAVIR_RAIOX_ROOT) root = process.env.TAVIR_RAIOX_ROOT;
  if (!root) {
    const { app } = require('electron') as { app: { getPath: (name: string) => string } };
    root = path.join(app.getPath('userData'), 'raiox');
  }
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function caseDir(root: string, id: string): string {
  if (!ID_RE.test(id)) throw new RaioxError('Caso fora da pasta privada.');
  const casos = path.resolve(root, 'casos');
  const dir = path.resolve(casos, id);
  const prefix = casos.endsWith(path.sep) ? casos : casos + path.sep;
  if (!dir.startsWith(prefix)) throw new RaioxError('Caso fora da pasta privada.');
  return dir;
}

export function sha256File(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function readCaseFile(file: string): RaioxCase | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as RaioxCase;
    if (!parsed || typeof parsed !== 'object' || !ID_RE.test(parsed.id)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listCases(root: string): RaioxCase[] {
  const casos = path.join(root, 'casos');
  if (!fs.existsSync(casos)) return [];
  const cases: RaioxCase[] = [];
  for (const entry of fs.readdirSync(casos, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const parsed = readCaseFile(path.join(casos, entry.name, 'caso.json'));
    if (parsed) cases.push(parsed);
  }
  return cases.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

export function readCase(root: string, id: string): RaioxCase {
  const file = path.join(caseDir(root, id), 'caso.json');
  if (!fs.existsSync(file)) throw new RaioxError('Diagnóstico não encontrado.');
  const parsed = readCaseFile(file);
  if (!parsed) throw new RaioxError('Diagnóstico não encontrado.');
  return parsed;
}

export function deleteCase(root: string, id: string): void {
  const dir = caseDir(root, id);
  if (!fs.existsSync(path.join(dir, 'caso.json'))) throw new RaioxError('Diagnóstico não encontrado.');
  fs.rmSync(dir, { recursive: true, force: true });
}

export function writeCase(root: string, c: RaioxCase): void {
  const dir = caseDir(root, c.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const sub of ['evidencias', 'analise', '_contexto', 'documentos', 'execucao']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  const dest = path.join(dir, 'caso.json');
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(c, null, 2), 'utf8');
  fs.renameSync(tmp, dest);
}

function safeName(name: string): string {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]+/g, '_');
  return base.replace(/^\.+/, '') || 'arquivo';
}

export function storeFile(
  root: string,
  id: string,
  sub: 'evidencias' | 'execucao',
  src: string,
): RaioxArtifact {
  const stat = fs.statSync(src);
  if (stat.size > MAX_BYTES) throw new RaioxError('Arquivo acima de 25 MB.');
  const dir = path.join(caseDir(root, id), sub);
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-${safeName(src)}`;
  const dest = path.join(dir, fileName);
  fs.copyFileSync(src, dest);
  return { file: path.posix.join(sub, fileName), sha256: sha256File(dest), collectedAt: new Date().toISOString() };
}
