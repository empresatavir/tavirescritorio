import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatById } from '../../shared/studio';
import { placeCaptions, type CaptionWord } from './captions';
import { motionDir } from './motionHome';
import { planReel } from './reel';
import type { StudioStore } from './store';

export const WHISPER_VERSION = '1.5.5';
export const WHISPER_MODEL = 'small';

function whisperDir(home?: string): string {
  return path.join(motionDir(home), 'whisper.cpp');
}

export function whisperInstalled(home?: string): boolean {
  const dir = whisperDir(home);
  const exe = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
  return fs.existsSync(exe) && fs.existsSync(path.join(dir, `ggml-${WHISPER_MODEL}.bin`));
}

export async function installWhisper(confirm: boolean, home?: string): Promise<{ ok: boolean; error?: string }> {
  if (confirm !== true) {
    return { ok: false, error: 'O download do whisper.cpp precisa da sua confirmação.' };
  }
  const motion = motionDir(home);
  const pkg = path.join(motion, 'node_modules', '@remotion', 'install-whisper-cpp', 'dist', 'index.js');
  if (!fs.existsSync(pkg)) return { ok: false, error: 'o pacote do whisper.cpp não está na base de motion' };
  const dir = whisperDir(home);
  const mod = await import(pathToFileURL(pkg).href) as {
    installWhisperCpp: (input: { version: string; to: string; printOutput: boolean }) => Promise<unknown>;
    downloadWhisperModel: (input: { model: string; folder: string; printOutput: boolean }) => Promise<unknown>;
  };
  await mod.installWhisperCpp({ version: WHISPER_VERSION, to: dir, printOutput: false });
  await mod.downloadWhisperModel({ model: WHISPER_MODEL, folder: dir, printOutput: false });
  return { ok: true };
}

export async function transcribePeca(pecaId: string, store: StudioStore): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!whisperInstalled(store.tree.home)) {
    return { ok: false, error: 'O whisper.cpp ainda não está instalado. O download precisa da sua confirmação.' };
  }
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const plan = planReel(store, peca);
  const clips = plan.narrations.filter((item) => item.src && fs.existsSync(item.src));
  if (!clips.length) return { ok: false, error: 'não há narração para transcrever' };
  const pkg = path.join(motionDir(store.tree.home), 'node_modules', '@remotion', 'install-whisper-cpp', 'dist', 'index.js');
  const mod = await import(pathToFileURL(pkg).href) as {
    transcribe: (input: {
      inputPath: string;
      whisperPath: string;
      whisperCppVersion: string;
      model: string;
      tokenLevelTimestamps: true;
      language: string;
      printOutput: boolean;
    }) => Promise<{ transcription: unknown }>;
    toCaptions: (input: { whisperCppOutput: { transcription: unknown } }) => { captions: CaptionWord[] };
  };
  const dir = whisperDir(store.tree.home);
  const fps = formatById(peca.formato_id)?.fps ?? 30;
  const words: CaptionWord[] = [];
  for (const clip of clips) {
    const output = await mod.transcribe({
      inputPath: clip.src,
      whisperPath: dir,
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODEL,
      tokenLevelTimestamps: true,
      language: 'Portuguese',
      printOutput: false,
    });
    const captions = mod.toCaptions({ whisperCppOutput: output }).captions;
    words.push(...placeCaptions(captions, (clip.from / fps) * 1000));
  }
  store.updatePeca(pecaId, { roteiro: { ...(peca.roteiro ?? {}), legendas: words } });
  return { ok: true, count: words.length };
}
