import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

const require = createRequire(import.meta.url);

const home = path.join(os.tmpdir(), `tavir-studio-f2-${Date.now()}`);
process.env.TAVIR_STUDIO_HOME = home;
fs.mkdirSync(home, { recursive: true });

const { ensureMotionHome } = require('../dist/main/studio/motionHome');
const { buildRenderJob } = require('../dist/main/studio/renderJob');
const { checkMedia } = require('../dist/main/studio/mediaChecks');
const { findRemotionBrowser } = require('../dist/main/studio/preflight');
const { openStudioStore } = require('../dist/main/studio/store');

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', ...args], { stdio: 'inherit', windowsHide: true });
}

function render(dir, job) {
  const jobPath = `${job.output}.json`;
  fs.writeFileSync(jobPath, JSON.stringify(job));
  const result = spawnSync(process.execPath, ['scripts/render.mjs', '--job', jobPath], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 300000,
  });
  const tail = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).slice(-12);
  console.log(tail.join('\n'));
  if (result.status !== 0) process.exit(result.status || 1);
  const checks = checkMedia(job.output, job);
  console.log(JSON.stringify(checks, null, 2));
  if (checks.some((item) => !item.ok)) process.exit(1);
}

(async () => {
  const installed = await ensureMotionHome(home);
  if (!installed.ok) {
    console.error(installed.error);
    console.error(installed.log.slice(-1500));
    process.exit(1);
  }
  if (!findRemotionBrowser()) {
    console.error('Chrome Headless do Remotion ausente. Confirme o download na tela do Studio antes deste teste.');
    process.exit(1);
  }
  const fixtures = path.join(home, 'fixtures');
  fs.mkdirSync(fixtures, { recursive: true });
  const png = path.join(fixtures, 'slide.png');
  const clip = path.join(fixtures, 'clip.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'testsrc=size=1080x1350:rate=1', '-frames:v', '1', png]);
  ffmpeg(['-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30', '-t', '3', '-pix_fmt', 'yuv420p', clip]);

  const store = openStudioStore(home);
  const perfil = store.savePerfil({
    nome: 'Multiverso Paranoico',
    iniciais: 'MP',
    cor_avatar: '#1BC5BD',
    brand_kit: {
      palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
      fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
      imageStyle: '', negatives: [], characters: [], tone: 'direto', canon: [],
    },
  });
  const slide = store.createPeca({ perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-carrossel-4x5', titulo: 'Capa' });
  const reel = store.createPeca({ perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-reels-9x16', titulo: 'Reel' });
  store.close();

  const stillJob = buildRenderJob({ peca: slide, perfil, tipo: 'still', output: path.join(home, 'still.png'), background: png });
  const reelJob = buildRenderJob({
    peca: reel,
    perfil,
    tipo: 'final',
    output: path.join(home, 'reel.mp4'),
    scenes: [{ src: clip, kind: 'video', durationFrames: 90, caption: 'teste' }],
  });
  render(installed.dir, stillJob);
  render(installed.dir, reelJob);

  const report = path.resolve('relatorios/studio/F2');
  fs.mkdirSync(report, { recursive: true });
  fs.copyFileSync(stillJob.output, path.join(report, 'exemplo.png'));
  fs.copyFileSync(reelJob.output, path.join(report, 'exemplo.mp4'));
  console.log('exemplos em', report);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
