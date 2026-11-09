const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { ensureMotionHome } = require(path.join(root, 'dist', 'main', 'studio', 'motionHome.js'));
const { runMotionConformance, motionConformanceMarkdown } = require(path.join(root, 'dist', 'main', 'studio', 'motionConformance.js'));

const home = path.join(os.tmpdir(), 'tavir-motion-conformidade');
process.env.TAVIR_STUDIO_HOME = home;
fs.mkdirSync(home, { recursive: true });

(async () => {
  const installed = await ensureMotionHome(home);
  if (!installed.ok) {
    console.error(installed.error || 'base de motion indisponível');
    process.exit(1);
  }
  const results = await runMotionConformance({
    home,
    source: installed.dir,
    onLog: (line) => console.log(line),
  });
  const dir = path.join(root, 'relatorios', 'motores');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(dir, `motion-${stamp}.json`), JSON.stringify(results, null, 2), 'utf8');
  const md = motionConformanceMarkdown(results);
  fs.writeFileSync(path.join(dir, `motion-${stamp}.md`), md, 'utf8');
  console.log('\n' + md);
  console.log(`Relatório: relatorios/motores/motion-${stamp}.md`);
  const failed = results.some((result) => !result.blocker && result.scenarios.some((item) => !item.ok));
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
