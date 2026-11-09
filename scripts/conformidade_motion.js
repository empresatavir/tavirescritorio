const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { ensureMotionHome } = require(path.join(root, 'dist', 'main', 'studio', 'motionHome.js'));
const { runMotionConformance, motionConformanceMarkdown } = require(path.join(root, 'dist', 'main', 'studio', 'motionConformance.js'));

const home = path.join(os.tmpdir(), 'tavir-motion-conformidade');
process.env.TAVIR_STUDIO_HOME = home;
fs.mkdirSync(home, { recursive: true });
const liveLog = path.join(root, 'relatorios', 'motores', 'motion-live.log');
fs.mkdirSync(path.dirname(liveLog), { recursive: true });
fs.writeFileSync(liveLog, `inicio ${new Date().toISOString()}\n`, 'utf8');
function note(line) {
  fs.appendFileSync(liveLog, `${line}\n`);
  console.log(line);
}

(async () => {
  const installed = await ensureMotionHome(home);
  if (!installed.ok) {
    console.error(installed.error || 'base de motion indisponível');
    process.exit(1);
  }
  const results = await runMotionConformance({
    home,
    source: installed.dir,
    onLog: note,
    onProgress: (partial) => {
      fs.writeFileSync(path.join(root, 'relatorios', 'motores', 'motion-partial.json'), JSON.stringify(partial, null, 2), 'utf8');
    },
  });
  const dir = path.join(root, 'relatorios', 'motores');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(dir, `motion-${stamp}.json`), JSON.stringify(results, null, 2), 'utf8');
  const md = motionConformanceMarkdown(results);
  fs.writeFileSync(path.join(dir, `motion-${stamp}.md`), md, 'utf8');
  note('\n' + md);
  note(`Relatório: relatorios/motores/motion-${stamp}.md`);
  const failed = results.some((result) => !result.blocker && result.scenarios.some((item) => !item.ok));
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  const text = err instanceof Error ? err.stack || err.message : String(err);
  try { fs.appendFileSync(liveLog, `${text}\n`); } catch { /* o relatório em disco é o que importa */ }
  console.error(text);
  process.exit(1);
});
