import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { motionDir } from './motionHome';

export const WHISPER_VERSION = '1.5.5';
export const WHISPER_MODEL = 'small';

export async function installWhisper(confirm: boolean, home?: string): Promise<{ ok: boolean; error?: string }> {
  if (confirm !== true) {
    return { ok: false, error: 'O download do whisper.cpp precisa da sua confirmação.' };
  }
  const motion = motionDir(home);
  const pkg = path.join(motion, 'node_modules', '@remotion', 'install-whisper-cpp', 'dist', 'index.js');
  if (!fs.existsSync(pkg)) return { ok: false, error: 'o pacote do whisper.cpp não está na base de motion' };
  const dir = path.join(motion, 'whisper.cpp');
  const mod = await import(pathToFileURL(pkg).href) as {
    installWhisperCpp: (input: { version: string; to: string; printOutput: boolean }) => Promise<unknown>;
    downloadWhisperModel: (input: { model: string; folder: string; printOutput: boolean }) => Promise<unknown>;
  };
  await mod.installWhisperCpp({ version: WHISPER_VERSION, to: dir, printOutput: false });
  await mod.downloadWhisperModel({ model: WHISPER_MODEL, folder: dir, printOutput: false });
  return { ok: true };
}
