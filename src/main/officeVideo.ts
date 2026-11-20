/**
 * Vídeo do Instagram por link, antes do motor: extrai pela RapidAPI, baixa o arquivo e transcreve.
 *
 * Roda no processo principal. A extração é sempre pelo braço `analise-instagram/` (RapidAPI);
 * sem as chaves daquele braço o pedido falha com o motivo, e não há rota de navegador aqui.
 * O motor só entra depois, para ler `video.json` e `transcricao.txt` e escrever o relatório.
 */
import { execFile, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { VIDEO_LINK_RE } from '../shared/officeAgents';

export interface VideoPrep {
  ok: boolean;
  error?: string;
  stopped?: boolean;
  /** 'ok' gravou transcricao.txt · 'sem_fala' o vídeo não tem fala · 'indisponivel' não deu para transcrever. */
  transcript?: 'ok' | 'sem_fala' | 'indisponivel';
  transcriptNote?: string;
}

export const VIDEO_FILES = { info: 'video.json', media: 'video.mp4', transcript: 'transcricao.txt', report: 'analise-video.md' };

const EXIT_HINT: Record<number, string> = {
  2: 'O link não é de um Reel ou post do Instagram.',
  3: 'A RapidAPI de Instagram não respondeu (chave, cota ou assinatura).',
  4: 'Não deu para baixar o vídeo.',
  5: 'A API respondeu, mas o link não é de vídeo (pode ser foto ou carrossel).',
};

export function instagramRoot(): string {
  return path.join(process.cwd(), 'analise-instagram');
}

/** O braço só coleta com as duas configurações locais (ficam fora do Git). */
export function missingInstagramConfig(root = instagramRoot()): string[] {
  return ['config/api_keys.env', 'config/instagram_rapidapi.env'].filter((f) => !fs.existsSync(path.join(root, f)));
}

function pythonOf(root: string): string {
  const venv = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return fs.existsSync(venv) ? venv : 'python';
}

/** Mensagem do script (stderr), sem caminho local nem nada além da primeira linha útil. */
export function extractionError(code: number | null, stderr: string): string {
  const line = String(stderr || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[A-Z_]+: /.test(l)).pop() || '';
  const detail = line.replace(/^[A-Z_]+: /, '').slice(0, 300);
  const hint = EXIT_HINT[code ?? -1] || 'A extração do vídeo falhou.';
  return detail && !hint.includes(detail) ? `${hint} ${detail}` : hint;
}

function runExtraction(root: string, link: string, workspace: string, registerKill: (kill: () => void) => void): Promise<{ code: number | null; stderr: string; stopped: boolean }> {
  return new Promise((resolve) => {
    let stderr = '';
    let stopped = false;
    const child = spawn(pythonOf(root), ['video_link.py', link, '--out', workspace], {
      cwd: path.join(root, 'rapidapi'),
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const timer = setTimeout(() => child.kill(), 5 * 60 * 1000);
    registerKill(() => {
      stopped = true;
      child.kill();
    });
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.stdout.on('data', () => {});
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: `PYTHON_ERRO: ${err.message}`, stopped });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr, stopped });
    });
  });
}

function loadEsm(file: string): Promise<Record<string, unknown>> {
  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<Record<string, unknown>>;
  return importer(pathToFileURL(file).href);
}

function toWav(source: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', ['-y', '-i', source, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', dest], { windowsHide: true, timeout: 3 * 60 * 1000 }, (err) => (err ? reject(err) : resolve()));
  });
}

/** Transcrição local com o whisper.cpp do Studio. Devolve o texto ('' quando não há fala). */
export async function transcribeLocal(video: string): Promise<string> {
  const { whisperInstalled, WHISPER_MODEL, WHISPER_VERSION } = require('./studio/whisper');
  const { motionDir } = require('./studio/motionHome');
  if (!whisperInstalled()) throw new Error('o whisper.cpp do Studio não está instalado neste notebook');
  const motion = motionDir();
  const mod = (await loadEsm(path.join(motion, 'node_modules', '@remotion', 'install-whisper-cpp', 'dist', 'index.js'))) as {
    transcribe: (input: Record<string, unknown>) => Promise<{ transcription: Array<{ text?: string }> }>;
  };
  const wav = path.join(path.dirname(video), 'audio-16k.wav');
  await toWav(video, wav);
  try {
    const out = await mod.transcribe({
      inputPath: wav,
      whisperPath: path.join(motion, 'whisper.cpp'),
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODEL,
      tokenLevelTimestamps: false,
      // O idioma vem do vídeo: forçar 'pt' faz o whisper "traduzir" fala em inglês e inventar texto.
      language: 'auto',
      printOutput: false,
    });
    return (out.transcription || []).map((t) => String(t.text || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  } finally {
    fs.rmSync(wav, { force: true });
  }
}

export interface VideoDeps {
  root?: string;
  extract?: typeof runExtraction;
  transcribe?: (video: string) => Promise<string>;
}

/** Extrai, baixa e transcreve. Numa nova tentativa reaproveita o que já está na pasta (não gasta cota de novo). */
export async function prepVideo(
  link: string,
  workspace: string,
  say: (line: string) => void,
  registerKill: (kill: () => void) => void,
  deps: VideoDeps = {},
): Promise<VideoPrep> {
  const url = String(link || '').trim();
  if (!VIDEO_LINK_RE.test(url)) return { ok: false, error: EXIT_HINT[2] };
  const root = deps.root || instagramRoot();
  const media = path.join(workspace, VIDEO_FILES.media);
  const info = path.join(workspace, VIDEO_FILES.info);
  if (fs.existsSync(media) && fs.existsSync(info)) {
    say('Vídeo já baixado nesta tarefa: reaproveitando');
  } else {
    const missing = missingInstagramConfig(root);
    if (missing.length) {
      return { ok: false, error: `As chaves da RapidAPI de Instagram não estão neste notebook. Falta ${missing.map((m) => `analise-instagram/${m}`).join(' e ')} (os modelos .example estão na mesma pasta).` };
    }
    say('Extraindo o vídeo pela RapidAPI');
    const res = await (deps.extract || runExtraction)(root, url, workspace, registerKill);
    if (res.stopped) return { ok: false, stopped: true };
    if (res.code !== 0) return { ok: false, error: extractionError(res.code, res.stderr) };
    if (!fs.existsSync(media)) return { ok: false, error: EXIT_HINT[4] };
    say('Vídeo baixado');
  }
  const transcriptFile = path.join(workspace, VIDEO_FILES.transcript);
  if (fs.existsSync(transcriptFile)) return { ok: true, transcript: 'ok' };
  say('Transcrevendo o áudio');
  try {
    const text = await (deps.transcribe || transcribeLocal)(media);
    if (!text) return { ok: true, transcript: 'sem_fala', transcriptNote: 'A transcrição não achou fala no vídeo.' };
    fs.writeFileSync(transcriptFile, text + '\n', 'utf8');
    say('Transcrição pronta');
    return { ok: true, transcript: 'ok' };
  } catch (err: any) {
    const why = String(err?.message || err).split('\n')[0].slice(0, 200);
    say('Transcrição indisponível');
    return { ok: true, transcript: 'indisponivel', transcriptNote: `Não deu para transcrever: ${why}.` };
  }
}

/** Depois do relatório: gera o HTML ao lado do Markdown (melhor esforço; o app lê o Markdown). */
export function renderVideoHtml(workspace: string, root = path.join(process.cwd(), 'agentes', 'escopo', 'skills', 'instagram-profile-audit', 'scripts')): Promise<boolean> {
  const md = path.join(workspace, VIDEO_FILES.report);
  const script = path.join(root, 'render_report.py');
  if (!fs.existsSync(md) || !fs.existsSync(script)) return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile('python', [script, md, '--output', md.replace(/\.md$/, '.html')], { windowsHide: true, timeout: 60000 }, (err) => resolve(!err));
  });
}
