import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export function exportReelForDarkFlow(input: {
  video: string;
  outputRoot: string;
  projectRoot: string;
  width: number;
  height: number;
  duration: number;
}): { video: string; manifest: string } {
  const outputRoot = path.resolve(input.outputRoot);
  const projectRoot = path.resolve(input.projectRoot);
  fs.mkdirSync(outputRoot, { recursive: true });
  const video = path.join(outputRoot, path.basename(input.video));
  if (path.resolve(input.video) !== video) fs.copyFileSync(input.video, video);
  const relative = path.relative(projectRoot, video).split(path.sep).join('/');
  if (relative.startsWith('..') || path.relative(outputRoot, video).startsWith('..')) {
    throw new Error('o reel precisa ficar dentro de storage/output do DarkFlow');
  }
  const sha256 = createHash('sha256').update(fs.readFileSync(video)).digest('hex');
  const payload = {
    schema_version: 1,
    output_id: randomUUID(),
    created_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    relative_path: relative,
    resolved_path: video,
    sha256,
    source_batch_id: null,
    media: {
      container: 'mp4',
      video_codec: 'h264',
      audio_codec: 'aac',
      width: input.width,
      height: input.height,
      duration_seconds: input.duration,
      size_bytes: fs.statSync(video).size,
    },
    editorial: { state: 'approved', attested_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') },
  };
  const manifest = video.replace(/\.mp4$/i, '.manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(payload, null, 2));
  return { video, manifest };
}
