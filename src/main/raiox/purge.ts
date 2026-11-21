/**
 * G-PR1 controle 7 — expurgo provado.
 *
 * Apaga tudo o que um caso deixou nesta máquina (pasta do caso com PDFs e histórico de rodadas,
 * cópias exportadas, conversas dos motores sobre a pasta do caso, temporários), confere de novo
 * e grava um relatório de ausência sem dado pessoal em `<raiz>/expurgos/`. O que fica fora do
 * alcance do app (Supabase antes da F8, Telegram, Resend, arquivos compartilhados dos motores)
 * entra no relatório como pendente ou manual, nunca como limpo.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  RAIOX_PURGE_REASONS,
  type RaioxCase,
  type RaioxPurgeArea,
  type RaioxPurgeReason,
  type RaioxPurgeReport,
} from '../../shared/raiox';
import { RaioxError } from './raioxRules';
import { caseDir, readCase, sha256File } from './raioxStore';

const ID_RE = /^RX-[0-9A-F]{8}$/;
const SCAN_FILE_MAX = 8 * 1024 * 1024;
const SHARED_FILE_MAX = 512 * 1024 * 1024;

export interface PurgeDeps {
  /** Pasta pessoal onde os motores guardam conversas (padrão: os.homedir()). */
  home?: string;
  tmp?: string;
  now?: () => string;
}

interface Finding { area: string; paths: string[]; note: string; kind: 'remove' | 'manual' | 'pending' }

function exists(p: string): boolean {
  try { fs.lstatSync(p); return true; } catch { return false; }
}

function listDir(p: string): fs.Dirent[] {
  try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; }
}

/** Formas em que o caminho da pasta do caso aparece em log de motor. */
function needles(dir: string): Buffer[] {
  const forward = dir.replace(/\\/g, '/');
  const set = new Set([dir, JSON.stringify(dir).slice(1, -1), forward]);
  return [...set].map((s) => Buffer.from(s, 'utf8'));
}

/** Procura sem carregar o arquivo inteiro: blocos de 1 MB com sobreposição. */
function fileContains(file: string, patterns: Buffer[], max: number): boolean {
  let fd: number | null = null;
  try {
    const size = fs.statSync(file).size;
    if (size > max) return false;
    fd = fs.openSync(file, 'r');
    const longest = Math.max(...patterns.map((p) => p.length));
    const chunk = Buffer.alloc(1024 * 1024 + longest);
    let carry = 0;
    let pos = 0;
    while (pos < size) {
      const read = fs.readSync(fd, chunk, carry, chunk.length - carry, pos);
      if (read <= 0) break;
      const view = chunk.subarray(0, carry + read);
      if (patterns.some((p) => view.includes(p))) return true;
      carry = Math.min(longest, view.length);
      view.copy(chunk, 0, view.length - carry);
      pos += read;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function anyFileContains(dir: string, patterns: Buffer[], budget = { files: 4000 }): boolean {
  for (const entry of listDir(dir)) {
    if (budget.files <= 0) return false;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (anyFileContains(full, patterns, budget)) return true;
    } else if (entry.isFile()) {
      budget.files -= 1;
      if (fileContains(full, patterns, SCAN_FILE_MAX)) return true;
    }
  }
  return false;
}

function walkFiles(dir: string, match: (name: string) => boolean, out: string[] = []): string[] {
  for (const entry of listDir(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, match, out);
    else if (entry.isFile() && match(entry.name)) out.push(full);
  }
  return out;
}

function firstLine(file: string): string {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(64 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      return buf.subarray(0, n).toString('utf8').split('\n')[0];
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
}

/** Rótulo do caminho no relatório: relativo à pasta pessoal, sem nome de cliente. */
function label(p: string, home: string): string {
  const rel = path.relative(home, p);
  return rel.startsWith('..') || path.isAbsolute(rel) ? path.basename(p) : `~/${rel.replace(/\\/g, '/')}`;
}

function motorFindings(dir: string, home: string): Finding[] {
  const pats = needles(dir);
  const found: Finding[] = [];

  // Claude Code: uma pasta por diretório de trabalho, com o caminho codificado no nome.
  const claude = path.join(home, '.claude', 'projects', dir.replace(/[^A-Za-z0-9]/g, '-'));
  found.push({ area: 'motor · Claude (conversas)', paths: exists(claude) ? [claude] : [], note: 'Conversas do Claude Code com a pasta do caso como diretório de trabalho.', kind: 'remove' });

  // Cursor: chats/<md5 do diretório>/<conversa>/meta.json com o cwd.
  const cursorRoot = path.join(home, '.cursor', 'chats');
  const cursor = new Set<string>();
  const byHash = path.join(cursorRoot, createHash('md5').update(dir).digest('hex'));
  if (exists(byHash)) cursor.add(byHash);
  for (const group of listDir(cursorRoot)) {
    if (!group.isDirectory()) continue;
    for (const chat of listDir(path.join(cursorRoot, group.name))) {
      const meta = path.join(cursorRoot, group.name, chat.name, 'meta.json');
      try {
        const cwd = String((JSON.parse(fs.readFileSync(meta, 'utf8')) as { cwd?: unknown }).cwd || '');
        if (path.resolve(cwd).toLowerCase() === path.resolve(dir).toLowerCase()) cursor.add(path.join(cursorRoot, group.name, chat.name));
      } catch { /* conversa sem meta legível */ }
    }
  }
  found.push({ area: 'motor · Cursor (conversas)', paths: [...cursor].filter((p) => ![...cursor].some((q) => q !== p && p.startsWith(q + path.sep))), note: 'Conversas do Cursor abertas na pasta do caso.', kind: 'remove' });

  // Codex: sessions/**/rollout-*.jsonl; a primeira linha traz o cwd da sessão.
  const codex: string[] = [];
  for (const sub of ['sessions', 'archived_sessions']) {
    for (const file of walkFiles(path.join(home, '.codex', sub), (n) => n.endsWith('.jsonl'))) {
      const head = Buffer.from(firstLine(file), 'utf8');
      if (pats.some((p) => head.includes(p))) codex.push(file);
    }
  }
  found.push({ area: 'motor · Codex (sessões)', paths: codex, note: 'Sessões do Codex com a pasta do caso como diretório de trabalho.', kind: 'remove' });

  // Antigravity: brain/<conversa>/ com o transcript; apaga a conversa que cita a pasta do caso.
  const agy: string[] = [];
  for (const base of ['antigravity-cli', 'antigravity']) {
    const brain = path.join(home, '.gemini', base, 'brain');
    for (const conv of listDir(brain)) {
      if (conv.isDirectory() && anyFileContains(path.join(brain, conv.name), pats)) agy.push(path.join(brain, conv.name));
    }
  }
  found.push({ area: 'motor · Antigravity (conversas)', paths: agy, note: 'Conversas do Antigravity que trabalharam na pasta do caso.', kind: 'remove' });

  // Arquivos que o motor divide entre todas as conversas: o app não edita, só aponta.
  const shared = [
    path.join(home, '.cursor', 'ai-tracking', 'ai-code-tracking.db'),
    path.join(home, '.gemini', 'antigravity-cli', 'conversation_summaries.db'),
    path.join(home, '.gemini', 'antigravity-cli', 'jetbox_summaries_proto.pb'),
    path.join(home, '.gemini', 'antigravity', 'conversation_summaries.db'),
    path.join(home, '.codex', 'history.jsonl'),
    path.join(home, '.codex', 'session_index.jsonl'),
  ].filter((f) => exists(f) && fileContains(f, pats, SHARED_FILE_MAX));
  found.push({ area: 'motor · arquivos compartilhados', paths: shared, note: 'Banco ou índice comum a todas as conversas do motor ainda cita a pasta do caso. O app não edita esses arquivos: limpar pelo próprio motor (apagar histórico) ou aceitar o resíduo com registro.', kind: 'manual' });
  return found;
}

function exportFindings(c: RaioxCase): { remove: string[]; changed: string[] } {
  const remove: string[] = [];
  const changed: string[] = [];
  for (const ex of c.exports || []) {
    for (const f of ex.files) {
      const full = path.join(ex.dir, path.basename(f.name));
      if (!exists(full)) continue;
      try {
        if (sha256File(full) === f.sha256) remove.push(full);
        else changed.push(full);
      } catch { changed.push(full); }
    }
  }
  return { remove, changed };
}

function collect(root: string, c: RaioxCase, deps: PurgeDeps): Finding[] {
  const home = deps.home ?? os.homedir();
  const tmp = deps.tmp ?? os.tmpdir();
  const dir = caseDir(root, c.id);
  const exp = exportFindings(c);
  const temps = listDir(tmp).filter((e) => e.name.includes(c.id)).map((e) => path.join(tmp, e.name));
  const vendors = new Set((c.vendors || []).map((v) => v.id));
  const findings: Finding[] = [
    { area: 'pasta do caso', paths: exists(dir) ? [dir] : [], note: 'caso.json, evidências, análise, documentos e PDFs, execução e histórico de rodadas.', kind: 'remove' },
    { area: 'PDFs exportados', paths: exp.remove, note: 'Cópias levadas para fora da pasta do caso pelo botão Exportar.', kind: 'remove' },
    { area: 'temporários', paths: temps, note: 'Arquivos temporários com o código do caso.', kind: 'remove' },
    ...motorFindings(dir, home),
  ];
  if (exp.changed.length) {
    findings.push({ area: 'PDFs exportados alterados', paths: exp.changed, note: 'Arquivo no lugar da exportação, mas com conteúdo diferente do exportado. Conferir à mão.', kind: 'manual' });
  }
  const hadUntrackedExport = (c.debrief?.documents || []).some((d) => d.pdf) && !(c.exports || []).length;
  if (hadUntrackedExport) {
    findings.push({ area: 'PDFs exportados antes do registro', paths: [], note: 'O caso tem PDF, mas não há registro de exportação (exportações anteriores ao controle 7 não eram registradas). Conferir a pasta para onde foram exportados.', kind: 'manual' });
  }
  if (c.remote?.supabaseId) {
    findings.push({ area: 'Supabase', paths: [], note: `Rodar com o Carlos: select public.purge_raiox_case('${c.remote.supabaseId}'); e guardar o "after" com tudo em zero. Até a F8 o Escritório não escreve no Supabase.`, kind: 'pending' });
  }
  if (vendors.has('telegram') || c.remote?.supabaseId) {
    findings.push({ area: 'Telegram', paths: [], note: `Apagar no chat do bot as mensagens com o código ${c.id}. O bot só recebeu o código do caso.`, kind: 'manual' });
  }
  if (vendors.has('resend')) {
    findings.push({ area: 'Resend', paths: [], note: 'E-mails enviados ficam no histórico do Resend pelo prazo dele. Conferir no painel e registrar a data de expiração.', kind: 'manual' });
  }
  const fabrica = c.execution?.fabricaProjectId;
  if (fabrica) {
    findings.push({ area: 'Fábrica', paths: [], note: `Projeto ${fabrica} aberto a partir do caso não é apagado aqui. O Carlos decide se arquiva ou exclui.`, kind: 'manual' });
  }
  return findings;
}

function toArea(f: Finding, home: string, removed: number, remaining: number): RaioxPurgeArea {
  const status = f.kind === 'pending' ? 'pendente' : f.kind === 'manual' ? 'manual' : remaining === 0 ? 'limpo' : 'manual';
  // Caminho só de motor e de arquivo compartilhado: pasta de exportação pode ter nome de cliente.
  const showWhere = f.paths.length && (f.area.startsWith('motor') || (f.kind === 'manual' && !f.area.startsWith('PDFs')));
  const where = showWhere ? ` Onde: ${f.paths.map((p) => label(p, home)).join(', ')}.` : '';
  const leftover = f.kind === 'remove' && remaining > 0 ? ` Ficaram ${remaining} item(ns) que não puderam ser apagados.` : '';
  return { area: f.area, found: f.paths.length, removed, remaining, status, note: f.note + where + leftover };
}

export interface PurgePreview { caseId: string; areas: RaioxPurgeArea[] }

/** O que o expurgo vai apagar, sem apagar nada. A tela mostra antes da confirmação. */
export function previewPurge(root: string, id: string, deps: PurgeDeps = {}): PurgePreview {
  const c = readCase(root, id);
  const home = deps.home ?? os.homedir();
  // Na prévia, "limpo" quer dizer "vai apagar"; manual e pendente já valem como no relatório.
  return { caseId: c.id, areas: collect(root, c, deps).map((f) => toArea(f, home, 0, f.kind === 'remove' ? 0 : f.paths.length)) };
}

export interface PurgeInput { reason: string; confirm: string }

export function purgeCase(root: string, id: string, input: PurgeInput, deps: PurgeDeps = {}): RaioxPurgeReport {
  const c = readCase(root, id);
  if (!RAIOX_PURGE_REASONS.includes(input.reason as RaioxPurgeReason)) throw new RaioxError('Escolha o motivo do expurgo.');
  if (String(input.confirm || '').trim().toUpperCase() !== c.id) throw new RaioxError(`Para confirmar, digite o código do caso (${c.id}).`);
  const home = deps.home ?? os.homedir();
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const before = collect(root, c, deps);
  const removed = new Map<string, number>();
  for (const f of before) {
    if (f.kind !== 'remove') continue;
    let n = 0;
    for (const p of f.paths) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* conferido abaixo */ }
      if (!exists(p)) n += 1;
    }
    removed.set(f.area, n);
  }
  // Prova: procura de novo, do zero, depois de apagar.
  const after = new Map<string, number>();
  for (const f of before) {
    if (f.kind !== 'remove') continue;
    after.set(f.area, f.paths.filter(exists).length);
  }
  const dir = caseDir(root, c.id);
  for (const f of motorFindings(dir, home)) {
    if (f.kind === 'remove') after.set(f.area, Math.max(after.get(f.area) ?? 0, f.paths.length));
  }
  if (exists(dir)) after.set('pasta do caso', 1);
  const areas = before.map((f) => toArea(f, home, removed.get(f.area) ?? 0, after.get(f.area) ?? (f.kind === 'remove' ? 0 : f.paths.length)));
  const report: RaioxPurgeReport = {
    caseId: c.id,
    ...(c.remote?.supabaseId ? { supabaseId: c.remote.supabaseId } : {}),
    reason: input.reason as RaioxPurgeReason,
    purgedAt: now,
    areas,
    complete: areas.every((a) => a.status === 'limpo'),
  };
  writeReport(root, report);
  return report;
}

function reportsDir(root: string): string {
  return path.join(root, 'expurgos');
}

function writeReport(root: string, report: RaioxPurgeReport): void {
  if (!ID_RE.test(report.caseId)) throw new RaioxError('Código de caso inválido.');
  const dir = reportsDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = report.purgedAt.replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(dir, `${report.caseId}-${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
}

export function listPurgeReports(root: string): RaioxPurgeReport[] {
  const dir = reportsDir(root);
  const out: RaioxPurgeReport[] = [];
  for (const entry of listDir(dir)) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try { out.push(JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8')) as RaioxPurgeReport); } catch { /* ignora */ }
  }
  return out.sort((a, b) => (a.purgedAt < b.purgedAt ? 1 : -1));
}

/** Casos remotos já expurgados: o sync não pode trazê-los de volta. */
export function purgedRemoteIds(root: string): Set<string> {
  return new Set(listPurgeReports(root).map((r) => r.supabaseId).filter((v): v is string => !!v));
}
