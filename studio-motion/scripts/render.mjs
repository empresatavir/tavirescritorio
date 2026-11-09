import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

function say(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function even(value) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

const flag = process.argv.indexOf('--job');
const jobPath = flag >= 0 ? process.argv[flag + 1] : '';
if (!jobPath) {
  say({ type: 'error', message: 'falta --job' });
  process.exit(1);
}

try {
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const props = { ...job.props };
  const publicJob = path.resolve(process.cwd(), 'public', 'job');
  let staged = 0;
  const stageLocal = (src) => {
    if (!src || /^(https?:|data:|blob:)/i.test(src) || !path.isAbsolute(src)) return src;
    fs.mkdirSync(publicJob, { recursive: true });
    staged += 1;
    const name = `${staged}${path.extname(src).toLowerCase()}`;
    fs.copyFileSync(src, path.join(publicJob, name));
    return `job/${name}`;
  };
  if (props.background) props.background = stageLocal(props.background);
  if (Array.isArray(props.scenes)) {
    props.scenes = props.scenes.map((scene) => ({ ...scene, src: stageLocal(scene.src) }));
  }
  if (props.narration) props.narration = stageLocal(props.narration);
  if (props.music) props.music = stageLocal(props.music);
  if (Array.isArray(props.narrations)) {
    props.narrations = props.narrations.map((item) => ({ ...item, src: stageLocal(item.src) }));
  }
  if (job.type === 'proxy') {
    props.width = even(job.format.width / 2);
    props.height = even(job.format.height / 2);
  }
  const serveUrl = await bundle({
    entryPoint: path.resolve(process.cwd(), 'src/index.ts'),
    webpackOverride: (config) => config,
  });
  const composition = await selectComposition({
    serveUrl,
    id: job.composition,
    inputProps: props,
  });
  if (job.type === 'still') {
    await renderStill({
      composition,
      serveUrl,
      output: job.output,
      frame: 0,
      inputProps: props,
    });
  } else {
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: job.output,
      inputProps: props,
      crf: job.type === 'proxy' ? 28 : 18,
      onProgress: ({ progress }) => say({ type: 'progress', pct: Math.round(progress * 100) }),
    });
  }
  say({ type: 'done', path: job.output });
} catch (err) {
  say({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
