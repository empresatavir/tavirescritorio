import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatById, type Peca, type RoteiroCena } from '../../shared/studio';
import { toSrt, type CaptionWord } from './captions';
import { scenesFromRoteiro } from './cenas';
import { loudnessChecks, parseLoudnorm, parseLoudnormMeasure, visualHookOk, type Loudness } from './loudnorm';
import { probe } from './mediaChecks';
import { ensureStudioTree } from './paths';
import type { StudioStore } from './store';

// Fundo de reserva: um pixel na cor Tinta Profunda (#0B1220). O antigo era vermelho meio transparente.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgFlIAAABpAD4z6GE4AAAAAElFTkSuQmCC', 'base64');

export function framesForScene(minSeconds: number, narrationSeconds: number, fps: number): number {
  const seconds = Math.max(minSeconds > 0 ? minSeconds : 1, narrationSeconds > 0 ? narrationSeconds : 0);
  return Math.max(1, Math.round(seconds * fps));
}

export function licensedTracks(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /\.(mp3|wav|m4a)$/i.test(name))
    .filter((name) => {
      const note = path.join(dir, `${path.parse(name).name}.licenca.txt`);
      return fs.existsSync(note) && fs.readFileSync(note, 'utf8').trim().length > 0;
    })
    .map((name) => path.join(dir, name));
}

export function draftCaptions(scenes: RoteiroCena[], durations: number[], fps: number): CaptionWord[] {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const frames = durations[index] ?? fps;
    const startMs = Math.round((cursor / fps) * 1000);
    cursor += frames;
    const endMs = Math.round((cursor / fps) * 1000);
    return { text: scene.texto_tela || scene.texto_narrado, startMs, endMs };
  });
}

export interface ReelPlan {
  scenes: Array<{ src: string; kind: 'image' | 'video'; durationFrames: number; caption: string; preset: string }>;
  narrations: Array<{ src: string; from: number; durationFrames: number }>;
  durationInFrames: number;
  music: string;
}

export function planReel(store: StudioStore, peca: Peca): ReelPlan {
  const format = formatById(peca.formato_id);
  const fps = format?.fps ?? 30;
  const scenes = scenesFromRoteiro(peca.roteiro);
  const tree = ensureStudioTree(store.tree.home);
  const ativos = tree.pecaDirs(peca.id).ativos;
  const placeholder = path.join(ativos, 'vazio-tinta.png');
  if (!fs.existsSync(placeholder)) {
    fs.mkdirSync(ativos, { recursive: true });
    fs.writeFileSync(placeholder, PNG);
  }
  const slots = store.listSlots(peca.id);
  let cursor = 0;
  const narrations: ReelPlan['narrations'] = [];
  const planned = scenes.map((scene, index) => {
    const narracao = ['mp3', 'wav'].map((ext) => path.join(ativos, `narracao-${String(index + 1).padStart(2, '0')}.${ext}`)).find((file) => fs.existsSync(file));
    const heard = narracao ? probe(narracao) : null;
    const durationFrames = framesForScene(scene.duracao_min ?? 1, heard?.duration ?? 0, fps);
    if (narracao) narrations.push({ src: narracao, from: cursor, durationFrames });
    const slot = scene.slot ? slots.find((row) => row.codigo === scene.slot) : undefined;
    const ativo = slot?.ativo_id ? store.getAtivo(slot.ativo_id) : null;
    const src = ativo && fs.existsSync(ativo.caminho) ? ativo.caminho : placeholder;
    const kind = ativo?.tipo === 'video' || src.endsWith('.mp4') ? 'video' as const : 'image' as const;
    const item = {
      src,
      kind,
      durationFrames,
      caption: scene.texto_tela || scene.texto_narrado,
      preset: scene.preset || 'zoom-lento',
    };
    cursor += durationFrames;
    return item;
  });
  const music = licensedTracks(tree.musicas)[0] ?? '';
  return { scenes: planned, narrations, durationInFrames: Math.max(1, cursor), music };
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function frameBytes(file: string, frame: number): Buffer | null {
  try {
    return execFileSync('ffmpeg', [
      '-v', 'error', '-i', file, '-vf', `select=eq(n\\,${frame}),scale=32:32`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ], { windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
  } catch {
    return null;
  }
}

export function measureHook(file: string): number | null {
  const first = frameBytes(file, 0);
  const later = frameBytes(file, 14);
  if (!first || !later || first.length !== later.length || !first.length) return null;
  let sum = 0;
  for (let i = 0; i < first.length; i += 1) sum += Math.abs(first[i] - later[i]);
  return sum / first.length;
}

function ffmpegLog(args: string[]): string {
  const result = spawnSync('ffmpeg', args, { windowsHide: true, timeout: 30000, encoding: 'utf8' });
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

export function readLoudness(file: string): Loudness | null {
  return parseLoudnorm(ffmpegLog(['-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']));
}

/** Segundo passe do loudnorm para o alvo −14 LUFS e pico −1,5 dBTP. */
export function normalizeLoudness(file: string): boolean {
  const measure = parseLoudnormMeasure(ffmpegLog(['-i', file, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']));
  if (!measure) return false;
  const tmp = `${file}.norm.mp4`;
  const filter = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${measure.inputI}:measured_TP=${measure.inputTp}:measured_LRA=${measure.inputLra}:measured_thresh=${measure.inputThresh}:offset=${measure.targetOffset}:linear=true`;
  const result = spawnSync('ffmpeg', ['-y', '-i', file, '-af', filter, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', tmp], {
    windowsHide: true,
    timeout: 30000,
    encoding: 'utf8',
  });
  if (result.status !== 0 || !fs.existsSync(tmp)) {
    fs.rmSync(tmp, { force: true });
    return false;
  }
  fs.copyFileSync(tmp, file);
  fs.rmSync(tmp, { force: true });
  return true;
}

export function buildReelPacote(pecaId: string, store: StudioStore, home?: string, frame = 0): { ok: boolean; dir?: string; error?: string; checks?: Array<{ nome: string; ok: boolean; detalhe: string }> } {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const format = formatById(peca.formato_id);
  if (!format || format.kind !== 'video') return { ok: false, error: 'o pacote de reel é de vídeo' };
  const final = store.listRenders(pecaId).filter((item) => item.tipo === 'final' && item.status === 'pronto' && fs.existsSync(item.caminho)).slice(-1)[0];
  if (!final) return { ok: false, error: 'falta o render final' };
  const dir = ensureStudioTree(home ?? store.tree.home).pecaDirs(pecaId).pacote;
  fs.mkdirSync(dir, { recursive: true });
  const video = path.join(dir, 'final.mp4');
  fs.copyFileSync(final.caminho, video);
  normalizeLoudness(video);
  const cover = path.join(dir, 'capa.png');
  try {
    execFileSync('ffmpeg', ['-y', '-i', video, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', '-update', '1', cover], { windowsHide: true, timeout: 20000, stdio: 'pipe' });
  } catch {
    return { ok: false, error: 'não foi possível extrair a capa' };
  }
  const info = probe(video);
  const level = readLoudness(video);
  const hook = measureHook(video);
  const checks = [
    ...loudnessChecks(level, info?.duration ?? 0, format.maxSeconds),
    { nome: 'gancho', ok: hook != null && visualHookOk(hook), detalhe: hook == null ? 'sem comparação de quadro' : `diferença ${hook.toFixed(2)}` },
  ];
  const scenes = scenesFromRoteiro(peca.roteiro);
  const plan = planReel(store, peca);
  const words = peca.roteiro?.legendas?.length ? peca.roteiro.legendas : draftCaptions(scenes, plan.scenes.map((scene) => scene.durationFrames), format.fps ?? 30);
  fs.writeFileSync(path.join(dir, 'legendas.srt'), toSrt(words), 'utf8');
  fs.writeFileSync(path.join(dir, 'legenda.txt'), peca.legenda || '', 'utf8');
  fs.writeFileSync(path.join(dir, 'hashtags.txt'), (peca.hashtags || []).join(' '), 'utf8');
  const perfil = store.getPerfil(peca.perfil_id);
  const arquivos = ['final.mp4', 'capa.png', 'legenda.txt', 'hashtags.txt', 'legendas.srt'].map((nome) => ({
    arquivo: nome,
    sha256: sha256(path.join(dir, nome)),
    largura: nome.endsWith('.mp4') || nome.endsWith('.png') ? format.width : 0,
    altura: nome.endsWith('.mp4') || nome.endsWith('.png') ? format.height : 0,
  }));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
    perfil: perfil?.nome ?? '',
    rede: peca.rede,
    formato: peca.formato_id,
    agendamento: peca.agendado_para,
    musica: plan.music || null,
    arquivos,
  }, null, 2));
  const ok = checks.every((item) => item.ok);
  return { ok, dir, checks, error: ok ? undefined : checks.filter((item) => !item.ok).map((item) => item.detalhe).join('; ') };
}
