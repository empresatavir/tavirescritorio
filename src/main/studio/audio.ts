import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BrandKit } from '../../shared/studio';
import { scenesFromRoteiro } from './cenas';
import { ensureStudioTree } from './paths';
import type { StudioStore } from './store';

const DEFAULT_EDGE_VOICE = 'pt-BR-FranciscaNeural';

export interface TtsCommand {
  command: string;
  args: string[];
  stdin?: string;
}

export function voiceOf(kit: BrandKit | null | undefined): { provider: 'edge-tts' | 'piper'; voiceId: string; rate?: string } {
  const voice = kit?.voice;
  if (voice?.provider === 'piper' && voice.voiceId) return voice;
  if (voice?.provider === 'edge-tts' && voice.voiceId) return voice;
  return { provider: 'edge-tts', voiceId: DEFAULT_EDGE_VOICE };
}

export function ttsCommand(input: { provider: 'edge-tts' | 'piper'; voiceId: string; rate?: string; text: string; output: string }): TtsCommand | { error: string } {
  if (!input.text.trim()) return { error: 'narração vazia' };
  if (input.provider === 'piper') {
    if (!fs.existsSync(input.voiceId)) return { error: 'a voz do Piper não está nesse caminho' };
    return { command: 'piper', args: ['--model', input.voiceId, '--output_file', input.output], stdin: input.text };
  }
  const args = ['--voice', input.voiceId, '--text', input.text, '--write-media', input.output];
  if (input.rate) args.push('--rate', input.rate);
  return { command: 'edge-tts', args };
}

function run(command: string, args: string[], stdin?: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(command, args, { windowsHide: true, timeout: 180000, maxBuffer: 8_000_000 }, (err, _stdout, stderr) => {
      const code = err && 'code' in err && typeof err.code === 'number' ? err.code : err ? 1 : 0;
      resolve({ code, stderr: stderr || (err ? err.message : '') });
    });
    if (stdin) child.stdin?.end(stdin);
  });
}

export async function synthesizeScenes(pecaId: string, store: StudioStore, onlyIndex?: number): Promise<{ ok: boolean; error?: string; files?: string[] }> {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  const perfil = store.getPerfil(peca.perfil_id);
  const scenes = scenesFromRoteiro(peca.roteiro);
  if (!scenes.length) return { ok: false, error: 'roteiro sem cenas' };
  const voice = voiceOf(perfil?.brand_kit);
  const dir = ensureStudioTree(store.tree.home).pecaDirs(pecaId).ativos;
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (let index = 0; index < scenes.length; index += 1) {
    if (onlyIndex != null && index !== onlyIndex) continue;
    const ext = voice.provider === 'piper' ? 'wav' : 'mp3';
    const output = path.join(dir, `narracao-${String(index + 1).padStart(2, '0')}.${ext}`);
    const command = ttsCommand({ ...voice, text: scenes[index].texto_narrado, output });
    if ('error' in command) return { ok: false, error: command.error };
    const result = await run(command.command, command.args, command.stdin);
    if (result.code !== 0 || !fs.existsSync(output)) {
      return { ok: false, error: result.stderr.slice(-400) || 'o TTS não gerou o arquivo' };
    }
    store.saveAtivo({
      peca_id: pecaId,
      tipo: 'audio',
      origem: 'tts',
      caminho: output,
      licenca: voice.provider,
    });
    files.push(output);
  }
  return { ok: true, files };
}
