import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

const require = createRequire(import.meta.url);

const home = path.join(os.tmpdir(), 'tavir-studio-f2-gate');
process.env.TAVIR_STUDIO_HOME = home;
fs.rmSync(path.join(home, 'studio.sqlite'), { force: true });
fs.mkdirSync(home, { recursive: true });

function refreshMotionSource(dir) {
  const repo = path.resolve('studio-motion');
  for (const name of ['src', 'scripts']) {
    fs.cpSync(path.join(repo, name), path.join(dir, name), { recursive: true });
  }
}

const { downloadRemotionBrowser, ensureMotionHome } = require('../dist/main/studio/motionHome');
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
    timeout: 600000,
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
  refreshMotionSource(installed.dir);
  if (!findRemotionBrowser()) {
    const downloaded = await downloadRemotionBrowser(true, home);
    if (!downloaded.ok || !findRemotionBrowser()) {
      console.error(downloaded.error || 'Chrome Headless do Remotion ausente.');
      console.error((downloaded.log || '').slice(-800));
      process.exit(1);
    }
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

  const carouselStore = openStudioStore(home);
  const carousel = carouselStore.createPeca({
    perfil_id: perfil.id,
    rede: 'instagram',
    formato_id: 'ig-carrossel-4x5',
    titulo: 'O arquivo',
  });
  carouselStore.updatePeca(carousel.id, {
    roteiro: {
      slides: [
        { tag: 'capa', titulo: 'O arquivo', apoio: 'três slides', layout: 'capa' },
        { tag: 'texto', titulo: 'O meio', apoio: 'o que o caso mostra', layout: 'texto' },
        { tag: 'fonte', titulo: 'Fonte', apoio: 'jornal de 1974', layout: 'fonte' },
      ],
    },
  });
  const hydrated = carouselStore.getPeca(carousel.id);
  carouselStore.close();
  const f5 = path.resolve('relatorios/studio/F5');
  fs.mkdirSync(f5, { recursive: true });
  for (let frame = 0; frame < 3; frame += 1) {
    const output = path.join(f5, `${String(frame + 1).padStart(2, '0')}.png`);
    const job = buildRenderJob({ peca: hydrated, perfil, tipo: 'still', output, frame });
    render(installed.dir, job);
  }
  console.log('carrossel em', f5);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
