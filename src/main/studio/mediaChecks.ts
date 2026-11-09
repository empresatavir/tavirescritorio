import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import type { RenderCheck } from '../../shared/studio';
import type { RenderJob } from './renderJob';

function even(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function probe(file: string): { width: number; height: number; fps: number; duration: number } | null {
  try {
    const raw = execFileSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,avg_frame_rate,duration',
      '-of', 'json',
      file,
    ], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
    const stream = JSON.parse(raw).streams?.[0];
    if (!stream) return null;
    const [num, den] = String(stream.avg_frame_rate || '0/1').split('/').map(Number);
    const fps = den ? num / den : Number(stream.avg_frame_rate);
    return {
      width: Number(stream.width),
      height: Number(stream.height),
      fps,
      duration: Number(stream.duration ?? 0),
    };
  } catch {
    return null;
  }
}

function stdev(file: string): number | null {
  try {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
      windowsHide: true,
      timeout: 20000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (bytes.length < 3) return null;
    let count = 0;
    let sum = 0;
    let sum2 = 0;
    for (let i = 0; i < bytes.length; i += 48) {
      const value = bytes[i];
      sum += value;
      sum2 += value * value;
      count += 1;
    }
    const mean = sum / count;
    return Math.sqrt(Math.max(0, sum2 / count - mean * mean));
  } catch {
    return null;
  }
}

/** Confere o arquivo contra o formato pedido. Proxy é metade da resolução, com lados pares. */
export function checkMedia(file: string, job: RenderJob): RenderCheck[] {
  const checks: RenderCheck[] = [];
  if (!fs.existsSync(file)) {
    return [{ ok: false, nome: 'arquivo', detalhe: 'render não encontrado' }];
  }
  const info = probe(file);
  const expectedWidth = job.type === 'proxy' ? even(job.format.width / 2) : job.format.width;
  const expectedHeight = job.type === 'proxy' ? even(job.format.height / 2) : job.format.height;
  checks.push({
    ok: !!info && info.width === expectedWidth && info.height === expectedHeight,
    nome: 'dimensão',
    detalhe: info ? `${info.width}×${info.height}` : 'ffprobe não leu o arquivo',
  });
  checks.push({
    ok: !!info && Math.abs(info.fps - job.format.fps) < 0.05,
    nome: 'fps',
    detalhe: info ? String(info.fps) : '—',
  });
  if (job.type !== 'still') {
    const limit = job.format.maxSeconds;
    checks.push({
      ok: !!info && (limit == null || info.duration <= limit + 0.05),
      nome: 'duração',
      detalhe: info ? `${info.duration.toFixed(2)} s` : '—',
    });
  } else {
    const spread = stdev(file);
    checks.push({
      ok: spread != null && spread > 2,
      nome: 'não chapado',
      detalhe: spread == null ? 'não foi possível ler os pixels' : `desvio ${spread.toFixed(2)}`,
    });
  }
  return checks;
}
