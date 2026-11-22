/**
 * Biblioteca de referências de design.
 *
 *   npm run design:ref -- <url> [--familia marketing|produto] [--nicho "clínica"] [--slug nome]
 *   npm run design:ref -- --listar
 *
 * Captura as telas (1440 px e 390 px) e as medidas do site em
 * conhecimento/design/referencias/<familia>/<slug>/ e deixa o card em rascunho.
 * Só entra no kit dos agentes depois que o Carlos trocar status para validado no card.md.
 */
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist', 'main', 'design');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] || '' : '';
};

async function main() {
  const { listReferences } = require(path.join(dist, 'kit.js'));
  if (args.includes('--listar')) {
    const refs = listReferences();
    if (!refs.length) console.log('Biblioteca vazia.');
    for (const r of refs) console.log(`${r.status.padEnd(9)} ${r.family}/${r.slug} · ${r.title}`);
    return;
  }
  const url = args.find((a) => /^https?:\/\//i.test(a));
  if (!url) {
    console.error('Uso: npm run design:ref -- <url> [--familia marketing|produto] [--nicho "…"] [--slug nome]');
    process.exit(2);
  }
  const family = flag('familia') === 'produto' ? 'produto' : 'marketing';
  const { captureReference } = require(path.join(dist, 'referencias.js'));
  const res = await captureReference({ url, family, niche: flag('nicho'), slug: flag('slug') || undefined });
  if (!res.ok) {
    console.error(res.error);
    process.exit(1);
  }
  console.log(`Capturado em ${path.relative(process.cwd(), res.dir)}`);
  console.log('Preencha a seção "Leitura" do card.md e troque status para validado para liberar aos agentes.');
}

main().catch((err) => {
  console.error(String((err && err.message) || err));
  process.exit(1);
});
