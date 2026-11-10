import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { attachmentsLine, attachmentsPrompt, extractZip, kindOf, readZipEntries, safeName, saveAttachments } from '../../src/main/attachments';

const dirs: string[] = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-anexo-')); dirs.push(d); return d; };
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

/** Zip mínimo (deflate ou store) montado à mão, para testar sem depender de biblioteca. */
function makeZip(files: Array<{ name: string; body: string; store?: boolean }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const raw = Buffer.from(f.body);
    const data = f.store ? raw : zlib.deflateRawSync(raw);
    const name = Buffer.from(f.name, 'utf8');
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(f.store ? 0 : 8, 8);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(f.store ? 0 : 8, 10);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, name, data);
    centrals.push(ch, name);
    offset += lh.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

describe('anexos', () => {
  it('classifica e limpa o nome', () => {
    expect(kindOf('print.png')).toBe('imagem');
    expect(kindOf('x', 'image/jpeg')).toBe('imagem');
    expect(kindOf('logs.zip')).toBe('zip');
    expect(kindOf('erro.log')).toBe('texto');
    expect(safeName('..\\..\\etc/passwd')).toBe('passwd');
    expect(safeName('a<b>:c?.png')).toBe('a_b__c_.png');
    expect(safeName('')).toBe('anexo');
  });

  it('grava o print colado em .tavir/anexos e monta o bloco para o agente', () => {
    const root = tmp();
    const { saved, errors } = saveAttachments(root, [{ name: 'print.png', type: 'image/png', data: 'data:image/png;base64,' + PNG }, { name: 'print.png', type: 'image/png', data: PNG }]);
    expect(errors).toEqual([]);
    expect(saved.map((a) => a.kind)).toEqual(['imagem', 'imagem']);
    expect(saved[0].rel).toMatch(/^\.tavir\/anexos\/\d{8}-\d{6}\/print\.png$/);
    expect(saved[1].name).toBe('print (2).png');
    expect(fs.readFileSync(path.join(root, saved[0].rel))).toEqual(Buffer.from(PNG, 'base64'));
    const block = attachmentsPrompt(saved);
    expect(block).toContain('## Anexos enviados pelo Carlos');
    expect(block).toContain(`- ${saved[0].rel} (imagem: abra o arquivo para ver`);
    expect(attachmentsLine(saved)).toBe(`Anexos: ${saved[0].rel}, ${saved[1].rel}`);
    expect(attachmentsPrompt([])).toBe('');
  });

  it('extrai o zip ao lado e lista os arquivos', () => {
    const root = tmp();
    const zip = makeZip([{ name: 'logs/app.log', body: 'erro 500 na rota /x' }, { name: 'leia.txt', body: 'oi', store: true }]);
    const { saved } = saveAttachments(root, [{ name: 'evidencias.zip', data: zip.toString('base64') }]);
    const z = saved[0];
    expect(z.kind).toBe('zip');
    expect(z.extractedTo).toMatch(/\/evidencias$/);
    expect(z.files).toEqual(['logs/app.log', 'leia.txt']);
    expect(fs.readFileSync(path.join(root, z.extractedTo!, 'logs/app.log'), 'utf8')).toBe('erro 500 na rota /x');
    expect(attachmentsPrompt(saved)).toContain(`  - ${z.extractedTo}/logs/app.log`);
  });

  it('não deixa o zip escrever fora da pasta', () => {
    const dest = path.join(tmp(), 'saida');
    const r = extractZip(makeZip([{ name: '../fora.txt', body: 'x' }, { name: 'dentro.txt', body: 'y' }]), dest);
    expect(r.files).toEqual(['dentro.txt']);
    expect(r.skipped[0]).toMatch(/fora da pasta/);
    expect(fs.existsSync(path.join(dest, '..', 'fora.txt'))).toBe(false);
  });

  it('respeita os limites e explica o que ficou de fora', () => {
    const zip = makeZip([{ name: 'a.txt', body: 'x'.repeat(2000) }]);
    expect(() => extractZip(zip, path.join(tmp(), 'z'), { maxItems: 10, maxItemBytes: 1e9, maxTotalBytes: 1e9, zipMaxEntries: 10, zipMaxBytes: 100, listFiles: 40 })).toThrow(/passa de/);
    expect(() => readZipEntries(Buffer.from('não é zip'))).toThrow(/zip válido/);
    const root = tmp();
    const { saved } = saveAttachments(root, [{ name: 'quebrado.zip', data: Buffer.from('lixo').toString('base64') }]);
    expect(saved[0].note).toMatch(/não extraído/);
    const vazio = saveAttachments(root, [{ name: 'x.png', data: '' }]);
    expect(vazio.saved).toEqual([]);
  });
});
