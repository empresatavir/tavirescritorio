// Roda a suíte de conformidade nos motores, com chamadas reais aos CLIs.
// Uso: npm run test:motores -- [cursor claude codex antigravity] [--modelo motor=id ...]
// Precisa de `npm run build:main` antes (usa dist/main).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { runConformance, conformanceMarkdown } = require(path.join(root, 'dist', 'main', 'motorConformance.js'));

const args = process.argv.slice(2);
const motors = args.filter((a) => ['cursor', 'claude', 'codex', 'antigravity'].includes(a));
const models = {};
args.forEach((a, i) => {
  if (a === '--modelo' && args[i + 1]) {
    const [m, id] = args[i + 1].split('=');
    if (m && id) models[m] = id;
  }
});

// F11: `--raiox` roda a análise e a redação do caso fictício do Raio-X em cada motor.
if (args.includes('--raiox')) {
  const { runRaioxConformance, raioxConformanceMarkdown } = require(path.join(root, 'dist', 'main', 'raiox', 'raioxConformance.js'));
  const { execFileSync } = require('child_process');
  const gitStatus = () => execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  (async () => {
    const results = await runRaioxConformance({ motors, models, repo: root, gitStatus, onLog: (l) => console.log(l) });
    const dir = path.join(root, 'relatorios', 'motores');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(dir, `raiox-${stamp}.json`), JSON.stringify(results, null, 2), 'utf8');
    const md = raioxConformanceMarkdown(results);
    fs.writeFileSync(path.join(dir, `raiox-${stamp}.md`), md, 'utf8');
    console.log('\n' + md);
    console.log(`Relatório: relatorios/motores/raiox-${stamp}.md`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  })();
  return;
}

(async () => {
  const results = await runConformance({ motors, models, onLog: (l) => console.log(l) });
  const dir = path.join(root, 'relatorios', 'motores');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(dir, `conformidade-${stamp}.json`), JSON.stringify(results, null, 2), 'utf8');
  const md = conformanceMarkdown(results);
  fs.writeFileSync(path.join(dir, `conformidade-${stamp}.md`), md, 'utf8');
  console.log('\n' + md);
  console.log(`Relatório: relatorios/motores/conformidade-${stamp}.md`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
