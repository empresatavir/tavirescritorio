import { execFileSync } from 'node:child_process';
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

/** O `tsc` em CommonJS transforma `import()` em `require()`, e `require` não abre URL de arquivo. */
function loadEsm(file: string): Promise<Record<string, unknown>> {
  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<Record<string, unknown>>;
  return importer(pathToFileURL(file).href);
}

function whisperDir(home?: string): string {
  return path.join(motionDir(home), 'whisper.cpp');
}

export function whisperInstalled(home?: string): boolean {
  const dir = whisperDir(home);
  const exe = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
  return fs.existsSync(exe) && fs.existsSync(path.join(dir, `ggml-${WHISPER_MODEL}.bin`));
}

/** O whisper.cpp só lê WAVE 16 kHz, 16 bit, mono. */
export function whisperWavArgs(source: string, dest: string): string[] {
  return ['-y', '-i', source, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', dest];
}

function toWhisperWav(source: string): string {
  const dest = path.join(path.dirname(source), `${path.parse(source).name}-16k.wav`);
  execFileSync('ffmpeg', whisperWavArgs(source, dest), { windowsHide: true, stdio: 'pipe', timeout: 30000 });
  return dest;
}

export async function installWhisper(confirm: boolean, home?: string): Promise<{ ok: boolean; error?: string }> {
  if (confirm !== true) {
    return { ok: false, error: 'O download do whisper.cpp precisa da sua confirmação.' };
  }
  const motion = motionDir(home);
  const pkg = path.join(motion, 'node_modules', '@remotion', 'install-whisper-cpp', 'dist', 'index.js');
  if (!fs.existsSync(pkg)) return { ok: false, error: 'o pacote do whisper.cpp não está na base de motion' };
  const dir = whisperDir(home);
  const mod = await loadEsm(pkg) as {
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
  const mod = await loadEsm(pkg) as {
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
    const wav = toWhisperWav(clip.src);
    try {
      const output = await mod.transcribe({
        inputPath: wav,
        whisperPath: dir,
        whisperCppVersion: WHISPER_VERSION,
        model: WHISPER_MODEL,
        tokenLevelTimestamps: true,
        language: 'pt',
        printOutput: false,
      });
      const captions = mod.toCaptions({ whisperCppOutput: output }).captions;
      words.push(...placeCaptions(captions, (clip.from / fps) * 1000));
    } finally {
      fs.rmSync(wav, { force: true });
    }
  }
  store.updatePeca(pecaId, { roteiro: { ...(peca.roteiro ?? {}), legendas: words } });
  return { ok: true, count: words.length };
}
