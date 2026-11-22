import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

/** F5: converte uma lâmina PNG do Studio em JPEG simples (a Meta só aceita JPEG). */
export type ToJpeg = (src: string, dest: string) => void;

export const ffmpegToJpeg: ToJpeg = (src, dest) => {
  // -pix_fmt yuvj420p tira o canal alfa do PNG; -q:v 2 é qualidade alta.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-pix_fmt', 'yuvj420p', '-q:v', '2', dest], { windowsHide: true, timeout: 30000, stdio: 'pipe' });
};

export interface ItemV2 {
  arquivo: string;
  tipo: 'video' | 'imagem';
  largura: number;
  altura: number;
  duracao_s?: number;
}

/**
 * Manifesto v2 do DarkFlow (F5): carrossel, imagem ou Stories. As lâminas viram JPEG dentro de
 * `storage/output/<pasta>/`, e o hash do topo é o SHA-256 da lista ordenada dos hashes, um por linha
 * (mesma regra do `combined_sha256` do DarkFlow).
 */
export function exportV2ForDarkFlow(input: {
  itens: ItemV2[];
  mediaType: 'CAROUSEL' | 'IMAGE' | 'STORIES';
  pasta: string;
  displayName: string;
  outputRoot: string;
  projectRoot: string;
  toJpeg?: ToJpeg;
}): { manifest: string; sha256: string; arquivos: string[] } {
  const outputRoot = path.resolve(input.outputRoot);
  const projectRoot = path.resolve(input.projectRoot);
  if (!/^[\w.-]{1,80}$/.test(input.pasta)) throw new Error('pasta inválida para o DarkFlow');
  const dir = path.join(outputRoot, input.pasta);
  if (path.relative(outputRoot, dir).startsWith('..')) throw new Error('a pasta precisa ficar dentro de storage/output do DarkFlow');
  fs.mkdirSync(dir, { recursive: true });
  const toJpeg = input.toJpeg ?? ffmpegToJpeg;
  const items = input.itens.map((it, i) => {
    const n = String(i + 1).padStart(2, '0');
    let dest: string;
    let media: Record<string, unknown>;
    if (it.tipo === 'imagem') {
      dest = path.join(dir, `${n}.jpg`);
      if (/\.jpe?g$/i.test(it.arquivo)) fs.copyFileSync(it.arquivo, dest);
      else toJpeg(it.arquivo, dest);
      media = { container: 'jpeg', width: it.largura, height: it.altura };
    } else {
      dest = path.join(dir, `${n}.mp4`);
      fs.copyFileSync(it.arquivo, dest);
      media = { container: 'mp4', video_codec: 'h264', audio_codec: 'aac', width: it.largura, height: it.altura, duration_seconds: it.duracao_s ?? 0 };
    }
    const relative = path.relative(projectRoot, dest).split(path.sep).join('/');
    if (relative.startsWith('..')) throw new Error('o item precisa ficar dentro do DarkFlow');
    const sha256 = createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
    return { relative_path: relative, resolved_path: dest, sha256, media: { ...media, size_bytes: fs.statSync(dest).size } };
  });
  const sha256 = createHash('sha256').update(items.map((i) => i.sha256).join('\n'), 'ascii').digest('hex');
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const payload = {
    schema_version: 2,
    output_id: randomUUID(),
    created_at_utc: now,
    media_type: input.mediaType,
    display_name: input.displayName.slice(0, 200),
    source_batch_id: null,
    sha256,
    items,
    editorial: { state: 'approved', attested_at_utc: now },
  };
  const manifest = path.join(dir, 'peca.manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(payload, null, 2));
  return { manifest, sha256, arquivos: items.map((i) => i.resolved_path) };
}
