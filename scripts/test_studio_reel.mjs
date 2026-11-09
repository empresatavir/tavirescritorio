import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const home = path.join(os.tmpdir(), 'tavir-studio-f7');
const motionSource = path.join(os.tmpdir(), 'tavir-motion-conformidade', 'motion', 'node_modules');
process.env.TAVIR_STUDIO_HOME = home;
fs.rmSync(path.join(home, 'studio.sqlite'), { force: true });
fs.mkdirSync(path.join(home, 'motion'), { recursive: true });

const linked = path.join(home, 'motion', 'node_modules');
if (!fs.existsSync(motionSource)) {
  console.error('A base de motion com Chrome Headless não está em', motionSource);
  process.exit(1);
}
if (!fs.existsSync(linked)) fs.symlinkSync(motionSource, linked, 'junction');
for (const name of ['package.json', 'package-lock.json']) {
  fs.copyFileSync(path.resolve('studio-motion', name), path.join(home, 'motion', name));
}

function refreshMotionSource(dir) {
  const repo = path.resolve('studio-motion');
  for (const name of ['src', 'scripts']) {
    fs.cpSync(path.join(repo, name), path.join(dir, name), { recursive: true });
  }
}

const { ensureMotionHome } = require('../dist/main/studio/motionHome');
const { buildRenderJob } = require('../dist/main/studio/renderJob');
const { checkMedia, probe } = require('../dist/main/studio/mediaChecks');
const { openStudioStore } = require('../dist/main/studio/store');
const { planReel, buildReelPacote } = require('../dist/main/studio/reel');
const { synthesizeScenes } = require('../dist/main/studio/audio');

function render(dir, job) {
  const jobPath = `${job.output}.json`;
  fs.writeFileSync(jobPath, JSON.stringify(job));
  const result = spawnSync(process.execPath, ['scripts/render.mjs', '--job', jobPath], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 600000,
  });
  const tail = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).slice(-20);
  console.log(tail.join('\n'));
  if (result.status !== 0) process.exit(result.status || 1);
}

(async () => {
  const installed = await ensureMotionHome(home);
  if (!installed.ok) {
    console.error(installed.error);
    process.exit(1);
  }
  refreshMotionSource(installed.dir);
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
  const peca = store.createPeca({ perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-reels-9x16', titulo: 'Reel de duas cenas' });
  store.updatePeca(peca.id, {
    roteiro: {
      cenas: [
        { texto_narrado: 'A porta abre.', texto_tela: 'A porta', duracao_min: 1, slot: 'MP-0001-C01' },
        { texto_narrado: 'O arquivo fica.', texto_tela: 'O arquivo', duracao_min: 1, slot: 'MP-0001-C02' },
      ],
    },
    legenda: 'Duas cenas.',
    hashtags: ['#tavir'],
  });
  // Cada cena com imagem própria 1080×1920 (no uso real vem do Flow). Sem isso o reel sai sem fundo.
  const ativos = path.join(home, 'pecas', peca.id, 'ativos');
  fs.mkdirSync(ativos, { recursive: true });
  for (const [i, codigo] of ['MP-0001-C01', 'MP-0001-C02'].entries()) {
    const file = path.join(ativos, `${codigo}.png`);
    const made = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=1080x1920:rate=1`, '-frames:v', '1', '-vf', `hue=h=${i * 120}`, file], { windowsHide: true });
    if (made.status !== 0) { console.error('ffmpeg não gerou a imagem de teste'); process.exit(1); }
    const slot = store.saveSlot({ peca_id: peca.id, codigo, tipo: 'video', descricao: codigo });
    store.saveAtivo({ peca_id: peca.id, slot_id: slot.id, tipo: 'imagem', origem: 'local', caminho: file, sha256: codigo });
  }
  const edge = spawnSync('where.exe', ['edge-tts'], { encoding: 'utf8', windowsHide: true });
  if (edge.status !== 0) {
    console.log('TTS pulado: edge-tts não está no PATH.');
  } else {
    const narrated = await synthesizeScenes(peca.id, store);
    console.log(narrated.ok ? `narração: ${(narrated.files || []).join(', ')}` : `TTS pulado: ${narrated.error}`);
  }
  const hydrated = store.getPeca(peca.id);
  const plan = planReel(store, hydrated);
  const output = path.join(home, 'reel-2cenas.mp4');
  const job = buildRenderJob({
    peca: hydrated,
    perfil,
    tipo: 'final',
    output,
    scenes: plan.scenes,
    durationInFrames: plan.durationInFrames,
    narrations: plan.narrations,
    music: plan.music,
  });
  render(installed.dir, job);
  const checks = checkMedia(output, job);
  console.log(JSON.stringify(checks, null, 2));
  const info = probe(output);
  if (!info || info.width !== 1080 || info.height !== 1920 || Math.abs(info.fps - 30) >= 0.05) process.exit(1);
  store.saveRender({ peca_id: peca.id, tipo: 'final', caminho: output, status: 'pronto', checks });
  const packed = buildReelPacote(peca.id, store, home);
  console.log(JSON.stringify(packed, null, 2));
  store.close();
  const report = path.resolve('relatorios/studio/F7');
  fs.mkdirSync(report, { recursive: true });
  const packedVideo = packed.dir ? path.join(packed.dir, 'final.mp4') : output;
  fs.copyFileSync(fs.existsSync(packedVideo) ? packedVideo : output, path.join(report, 'reel-2cenas.mp4'));
  console.log('reel em', path.join(report, 'reel-2cenas.mp4'));
})();
