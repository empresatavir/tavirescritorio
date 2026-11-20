const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function flag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const uuid = flag('--uuid');
const out = flag('--out');
const requested = flag('--src');
const defaults = [
  'C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html',
  path.resolve(__dirname, '../src/renderer/reference_app.html'),
];

if (!uuid || !out) {
  console.error('Uso: node scripts/extract_bundle_page.js --uuid <id> --out <arquivo> [--src <html>]');
  process.exit(1);
}

const src = requested || defaults.find((candidate) => fs.existsSync(candidate));
if (!src) {
  console.error('Bundle não encontrado.');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const match = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('Manifesto não encontrado em ' + src);
  process.exit(1);
}

const manifest = JSON.parse(match[1]);
const entry = manifest[uuid];
if (!entry) {
  console.error('Página ausente: ' + uuid);
  process.exit(1);
}

const text = entry.compressed
  ? zlib.gunzipSync(Buffer.from(entry.data, 'base64')).toString('utf8')
  : String(entry.data);

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, text, 'utf8');
console.log(src);
console.log(out);
console.log(text.length);
