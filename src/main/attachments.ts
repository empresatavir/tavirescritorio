/**
 * Anexos da conversa com a Íris e dos pedidos de alteração: prints, zips, logs, PDFs.
 *
 * Ficam no próprio projeto, em .tavir/anexos/<carimbo>/, fora do git dele. O agente recebe a lista
 * de caminhos no pedido e abre cada arquivo com a ferramenta de leitura (Claude e Codex enxergam
 * imagens assim). Zip é extraído aqui, com limite de tamanho e sem sair da pasta (zip slip).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

export interface AttachmentInput {
  name: string;
  type?: string;
  /** Conteúdo em base64 (com ou sem prefixo data:...;base64,). */
  data: string;
}

export type AttachmentKind = 'imagem' | 'zip' | 'pdf' | 'texto' | 'arquivo';

export interface SavedAttachment {
  name: string;
  /** Caminho relativo à raiz do projeto, com barras normais. */
  rel: string;
  kind: AttachmentKind;
  size: number;
  /** Zip: pasta onde foi extraído e os primeiros arquivos. */
  extractedTo?: string;
  files?: string[];
  note?: string;
}

export const ATTACH_LIMITS = {
  maxItems: 10,
  maxItemBytes: 25 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
  zipMaxEntries: 2000,
  zipMaxBytes: 200 * 1024 * 1024,
  listFiles: 40,
};

const IMG = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const TXT = /\.(txt|log|md|json|csv|tsv|xml|ya?ml|html?|css|js|ts|tsx|jsx|py|dart|sql|env\.example)$/i;

export function kindOf(name: string, type = ''): AttachmentKind {
  if (/^image\//.test(type) || IMG.test(name)) return 'imagem';
  if (/zip/.test(type) || /\.zip$/i.test(name)) return 'zip';
  if (/pdf/.test(type) || /\.pdf$/i.test(name)) return 'pdf';
  if (/^text\//.test(type) || TXT.test(name)) return 'texto';
  return 'arquivo';
}

/** Nome seguro para gravar: sem pasta, sem caracteres reservados do Windows, sem nome vazio. */
export function safeName(name: string, fallback = 'anexo'): string {
  const base = String(name || '').split(/[\\/]/).pop() || '';
  const clean = base.replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/^\.+/, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return clean || fallback;
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function decode(data: string): Buffer {
  const b64 = String(data || '').replace(/^data:[^,]*,/, '');
  return Buffer.from(b64, 'base64');
}

function unique(dir: string, name: string): string {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 2; i < 1000; i += 1) {
    const n = `${stem} (${i})${ext}`;
    if (!fs.existsSync(path.join(dir, n))) return n;
  }
  return `${stem}-${Date.now()}${ext}`;
}

// ---------------------------------------------------------------- zip

interface ZipEntry { name: string; method: number; csize: number; usize: number; offset: number; flags: number }

/** Lê o diretório central do zip. Zip64 e zip cifrado não são suportados (viram erro com o motivo). */
export function readZipEntries(buf: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Arquivo não parece um zip válido.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new Error('Zip64 não é suportado; compacte de novo em zip comum.');
  const out: ZipEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Diretório do zip corrompido.');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString(flags & 0x800 ? 'utf8' : 'latin1', p + 46, p + 46 + nlen);
    out.push({ name, method, csize, usize, offset, flags });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/** Extrai o zip em `dest`. Recusa caminho que sairia da pasta e para nos limites. */
export function extractZip(buf: Buffer, dest: string, limits = ATTACH_LIMITS): { files: string[]; skipped: string[] } {
  const entries = readZipEntries(buf);
  if (entries.length > limits.zipMaxEntries) throw new Error(`O zip tem ${entries.length} arquivos; o limite é ${limits.zipMaxEntries}.`);
  const total = entries.reduce((a, e) => a + e.usize, 0);
  if (total > limits.zipMaxBytes) throw new Error(`O zip descompactado passa de ${Math.round(limits.zipMaxBytes / 1048576)} MB.`);
  const root = path.resolve(dest);
  fs.mkdirSync(root, { recursive: true });
  const files: string[] = [];
  const skipped: string[] = [];
  for (const e of entries) {
    const rel = e.name.replace(/\\/g, '/');
    if (rel.endsWith('/')) continue;
    const target = path.resolve(root, rel);
    if (!target.startsWith(root + path.sep) || /(^|\/)\.\.(\/|$)/.test(rel) || path.isAbsolute(rel)) { skipped.push(`${rel} (caminho fora da pasta)`); continue; }
    if (e.flags & 0x1) { skipped.push(`${rel} (cifrado)`); continue; }
    const h = e.offset;
    if (buf.readUInt32LE(h) !== 0x04034b50) { skipped.push(`${rel} (cabeçalho inválido)`); continue; }
    const start = h + 30 + buf.readUInt16LE(h + 26) + buf.readUInt16LE(h + 28);
    const raw = buf.subarray(start, start + e.csize);
    let data: Buffer;
    if (e.method === 0) data = Buffer.from(raw);
    else if (e.method === 8) data = zlib.inflateRawSync(raw, { maxOutputLength: Math.max(1, e.usize) });
    else { skipped.push(`${rel} (compressão ${e.method} não suportada)`); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    files.push(rel);
  }
  return { files, skipped };
}

// ---------------------------------------------------------------- gravar

export const ATTACH_DIR = path.join('.tavir', 'anexos');

export function saveAttachments(root: string, items: AttachmentInput[], now = new Date()): { saved: SavedAttachment[]; errors: string[] } {
  const saved: SavedAttachment[] = [];
  const errors: string[] = [];
  const list = (Array.isArray(items) ? items : []).filter((x) => x && x.data);
  if (!list.length) return { saved, errors };
  if (list.length > ATTACH_LIMITS.maxItems) errors.push(`Só os ${ATTACH_LIMITS.maxItems} primeiros anexos foram guardados.`);
  const dir = path.join(root, ATTACH_DIR, stamp(now));
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const item of list.slice(0, ATTACH_LIMITS.maxItems)) {
    const name = safeName(item.name);
    const buf = decode(item.data);
    if (!buf.length) { errors.push(`${name}: arquivo vazio.`); continue; }
    if (buf.length > ATTACH_LIMITS.maxItemBytes) { errors.push(`${name}: passa de ${ATTACH_LIMITS.maxItemBytes / 1048576} MB.`); continue; }
    if (total + buf.length > ATTACH_LIMITS.maxTotalBytes) { errors.push(`${name}: o total dos anexos passou de ${ATTACH_LIMITS.maxTotalBytes / 1048576} MB.`); continue; }
    total += buf.length;
    const file = unique(dir, name);
    fs.writeFileSync(path.join(dir, file), buf);
    const rel = path.relative(root, path.join(dir, file)).replace(/\\/g, '/');
    const kind = kindOf(file, item.type);
    const rec: SavedAttachment = { name: file, rel, kind, size: buf.length };
    if (kind === 'zip') {
      const into = unique(dir, file.replace(/\.zip$/i, '') || 'zip');
      try {
        const r = extractZip(buf, path.join(dir, into));
        rec.extractedTo = path.relative(root, path.join(dir, into)).replace(/\\/g, '/');
        rec.files = r.files.slice(0, ATTACH_LIMITS.listFiles);
        const more = r.files.length - rec.files.length;
        const notes = [`${r.files.length} arquivo(s) extraído(s)${more > 0 ? `, listados os ${rec.files.length} primeiros` : ''}`];
        if (r.skipped.length) notes.push(`ignorados: ${r.skipped.slice(0, 5).join(', ')}`);
        rec.note = notes.join('; ');
      } catch (e: any) {
        rec.note = `não extraído: ${String(e?.message || e)}`;
      }
    }
    saved.push(rec);
  }
  return { saved, errors };
}

const KIND_HINT: Record<AttachmentKind, string> = {
  imagem: 'imagem: abra o arquivo para ver',
  zip: 'zip',
  pdf: 'PDF',
  texto: 'texto',
  arquivo: 'arquivo',
};

/** Bloco do pedido que lista os anexos para o agente. Vazio quando não há anexos. */
export function attachmentsPrompt(saved: SavedAttachment[], errors: string[] = []): string {
  if (!saved.length && !errors.length) return '';
  const lines = ['', '## Anexos enviados pelo Carlos', 'Os arquivos estão na pasta do projeto. Abra cada um com a ferramenta de leitura antes de responder; eles mostram ou provam o que o pedido descreve.'];
  for (const a of saved) {
    lines.push(`- ${a.rel} (${KIND_HINT[a.kind]}, ${Math.max(1, Math.round(a.size / 1024))} KB)`);
    if (a.extractedTo) {
      lines.push(`  extraído em ${a.extractedTo}/ (${a.note || ''})`);
      for (const f of a.files || []) lines.push(`  - ${a.extractedTo}/${f}`);
    } else if (a.note) lines.push(`  ${a.note}`);
  }
  for (const e of errors) lines.push(`- Não anexado: ${e}`);
  return lines.join('\n');
}

/** Linha curta para memória, pedidos e trilho. */
export function attachmentsLine(saved: SavedAttachment[]): string {
  return saved.length ? `Anexos: ${saved.map((a) => a.extractedTo ? `${a.rel} → ${a.extractedTo}/` : a.rel).join(', ')}` : '';
}
