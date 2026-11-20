/**
 * Estudo de vídeo (Instagram ou YouTube), antes do motor.
 *
 * O Escritório prepara a pasta da tarefa e o motor só lê:
 *   video.json         dados do vídeo (autor/canal, legenda ou descrição, duração)
 *   video.mp4          o arquivo (Instagram pela RapidAPI; YouTube pelo yt-dlp em baixa resolução)
 *   transcricao.txt    o que foi falado (legenda do YouTube ou whisper.cpp local)
 *   quadros/           imagens do vídeo a cada trecho, para o motor "ver" a tela (quadros/indice.md)
 *   links.json         sites e repositórios citados na legenda, descrição ou fala
 *   escritorio.md      retrato do Escritório (regras, módulos, skills e agentes) para o cruzamento
 *
 * Instagram continua só pela RapidAPI (regra do braço analise-instagram). YouTube é público e vai pelo yt-dlp.
 */
import { execFile, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { OFFICE_AGENTS, VIDEO_LINK_RE } from '../shared/officeAgents';
import { prepVideo, transcribeLocal, type VideoDeps } from './officeVideo';

export const STUDY_FILES = {
  info: 'video.json',
  media: 'video.mp4',
  transcript: 'transcricao.txt',
  frames: 'quadros',
  links: 'links.json',
  office: 'escritorio.md',
  report: 'estudo-video.md',
};

export const YOUTUBE_LINK_RE = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i;

export type StudySource = 'instagram' | 'youtube';

/** De onde é o link (ou '' se não for vídeo que o estudo aceita). */
export function studySource(link: string | null | undefined): StudySource | '' {
  const url = String(link || '').trim();
  if (VIDEO_LINK_RE.test(url)) return 'instagram';
  if (YOUTUBE_LINK_RE.test(url)) return 'youtube';
  return '';
}

export function studyCode(link: string | null | undefined): string {
  const url = String(link || '').trim();
  const ig = VIDEO_LINK_RE.exec(url);
  if (ig) return ig[2];
  const yt = YOUTUBE_LINK_RE.exec(url);
  return yt ? yt[1] : '';
}

/** Primeiro link de vídeo aceito dentro de um texto (o Carlos cola link com comentário). */
export function firstStudyLink(text: string | null | undefined): string {
  for (const m of String(text || '').matchAll(/https?:\/\/\S+/g)) {
    const url = m[0].replace(/[),.;!?»"']+$/, '');
    if (studySource(url)) return url;
  }
  return '';
}

// ---------------------------------------------------------------- links citados

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
/** Domínio falado ou escrito sem https ("github.com/fulano/repo", "site.ai"). */
const BARE_RE = /(?<![@\w./-])(?:github\.com|gitlab\.com|huggingface\.co|npmjs\.com\/package|pypi\.org\/project)\/[A-Za-z0-9_.\-/]+|(?<![@\w./-])[a-z0-9-]{2,}\.(?:ai|io|dev|app|com|com\.br|so|sh|tech|tools)\b(?:\/[^\s<>"'`)\]]*)?/gi;
const SKIP_HOSTS = /(?:^|\.)(instagram\.com|youtube\.com|youtu\.be|fbcdn\.net|cdninstagram\.com|googlevideo\.com|ytimg\.com)$/i;

export interface CitedLink {
  url: string;
  tipo: 'repositorio' | 'pacote' | 'site';
  onde: string;
}

/** Sites e repositórios citados. Sem chamar a rede: o motor é quem abre. */
export function citedLinks(sources: Array<{ onde: string; texto: string }>): CitedLink[] {
  const seen = new Set<string>();
  const out: CitedLink[] = [];
  for (const { onde, texto } of sources) {
    const found = [...String(texto || '').matchAll(URL_RE), ...String(texto || '').matchAll(BARE_RE)].map((m) => m[0]);
    for (const raw of found) {
      let url = raw.replace(/[),.;:!?»"']+$/, '');
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      let host = '';
      try {
        host = new URL(url).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (SKIP_HOSTS.test(host)) continue;
      const key = url.toLowerCase().replace(/\/+$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      const tipo = /github\.com|gitlab\.com|huggingface\.co/.test(host) ? 'repositorio' : /npmjs\.com|pypi\.org/.test(host) ? 'pacote' : 'site';
      out.push({ url, tipo, onde });
      if (out.length >= 25) return out;
    }
  }
  return out;
}

// ---------------------------------------------------------------- retrato do Escritório

function firstLine(file: string): string {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const desc = /^description:\s*>?-?\s*\n?\s*(.+)$/m.exec(text);
    if (desc) return desc[1].trim();
    return (text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('---')) || '').replace(/^#+\s*/, '').trim();
  } catch {
    return '';
  }
}

/**
 * O que o motor precisa saber do Escritório para dizer se vale implementar ou absorver:
 * regras do projeto, módulos documentados, skills e agentes que já existem.
 */
export function officeBrief(root = process.cwd()): string {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const lines: string[] = [
    '# O TAVIR Escritório hoje',
    '',
    `Pasta do Escritório: ${root} (só leitura para este estudo).`,
    'App em uso: Electron (src/main = processo principal, src/renderer = telas, src/shared = regras comuns).',
    '',
  ];
  const claude = path.join(root, 'CLAUDE.md');
  if (fs.existsSync(claude)) {
    const heads = fs.readFileSync(claude, 'utf8').split(/\r?\n/).filter((l) => /^###? /.test(l)).map((l) => `- ${l.replace(/^#+\s*/, '')}`);
    lines.push('## Regras do projeto (CLAUDE.md)', ...heads, '');
  }
  const mods = path.join(root, 'docs', 'modules');
  if (fs.existsSync(mods)) {
    lines.push('## Módulos documentados (docs/modules)');
    for (const f of fs.readdirSync(mods).filter((f) => f.endsWith('.md')).sort()) lines.push(`- ${f}: ${cut(firstLine(path.join(mods, f)), 140)}`);
    lines.push('');
  }
  const skills = path.join(root, 'agentes', 'escopo', 'skills');
  if (fs.existsSync(skills)) {
    lines.push('## Skills que já existem (agentes/escopo/skills)');
    for (const d of fs.readdirSync(skills).sort()) {
      const sk = path.join(skills, d, 'SKILL.md');
      if (fs.existsSync(sk)) lines.push(`- ${d}: ${cut(firstLine(sk), 160)}`);
    }
    lines.push('');
  }
  lines.push('## Agentes do Escritório (Chamar agente)', ...OFFICE_AGENTS.map((a) => `- ${a.name}: ${a.role}`), '');
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).sort();
    if (deps.length) lines.push('## Bibliotecas já usadas (package.json)', cut(deps.join(', '), 2500), '');
  } catch {
    /* sem package.json */
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- ferramentas locais

function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs: number; registerKill?: (kill: () => void) => void }): Promise<{ code: number | null; stdout: string; stderr: string; stopped: boolean }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let stopped = false;
    const child = spawn(cmd, args, { cwd: opts.cwd, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    const timer = setTimeout(() => child.kill(), opts.timeoutMs);
    opts.registerKill?.(() => {
      stopped = true;
      child.kill();
    });
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}\n${err.message}`, stopped });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, stopped });
    });
  });
}

function ytdlp(): { cmd: string; pre: string[] } {
  // O YouTube exige um runtime de JavaScript para liberar os formatos; o Node já está aqui.
  return { cmd: 'python', pre: ['-m', 'yt_dlp', '--no-update', '--js-runtimes', 'node'] };
}

function lastErrorLine(stderr: string): string {
  return (String(stderr || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => /ERROR|erro/i.test(l)).pop() || '').slice(0, 240);
}

function duration(file: string): Promise<number> {
  return new Promise((resolve) => {
    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { windowsHide: true, timeout: 30000 }, (err, out) => resolve(err ? 0 : Number(String(out).trim()) || 0));
  });
}

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Quadros do vídeo em intervalos iguais (até 12), com o instante de cada um em quadros/indice.md. */
export async function extractFrames(video: string, dir: string, max = 12): Promise<number> {
  const total = await duration(video);
  if (!total) return 0;
  const step = Math.max(2, total / max);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/\.jpg$/.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  const res = await run('ffmpeg', ['-y', '-i', video, '-vf', `fps=1/${step.toFixed(2)},scale=720:-2`, '-frames:v', String(max), '-q:v', '4', path.join(dir, 'q%02d.jpg')], { timeoutMs: 3 * 60 * 1000 });
  const frames = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^q\d+\.jpg$/.test(f)).sort() : [];
  if (res.code !== 0 && !frames.length) return 0;
  const index = ['# Quadros do vídeo', '', `Duração: ${mmss(total)} · um quadro a cada ${Math.round(step)} s.`, '', ...frames.map((f, i) => `- ${f}: ${mmss(i * step + step / 2)}`)];
  fs.writeFileSync(path.join(dir, 'indice.md'), index.join('\n') + '\n', 'utf8');
  return frames.length;
}

/** Legenda .vtt → texto com o instante de cada fala, sem repetição das legendas automáticas. */
export function vttToText(vtt: string): string {
  const out: string[] = [];
  let stamp = '';
  let last = '';
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    const t = /^(\d{2}):(\d{2}):(\d{2})[.,]\d{3}\s+-->/.exec(line);
    if (t) {
      stamp = `${Number(t[1]) ? `${t[1]}:` : ''}${t[2]}:${t[3]}`;
      continue;
    }
    if (!line || /^(WEBVTT|Kind:|Language:|NOTE)/.test(line) || /^\d+$/.test(line)) continue;
    const text = line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text === last) continue;
    last = text;
    out.push(`[${stamp}] ${text}`);
  }
  return out.join('\n');
}

const YT_FIELDS = ['id', 'title', 'channel', 'uploader', 'duration', 'upload_date', 'webpage_url', 'description', 'view_count', 'like_count', 'comment_count', 'tags', 'chapters'];

/** YouTube: dados, legenda (pt, en ou automática) e o vídeo em baixa resolução para os quadros. */
async function prepYoutube(link: string, workspace: string, say: (line: string) => void, registerKill: (kill: () => void) => void, transcribe: (video: string) => Promise<string> = transcribeLocal): Promise<{ ok: boolean; error?: string; stopped?: boolean; transcript: boolean }> {
  const info = path.join(workspace, STUDY_FILES.info);
  const media = path.join(workspace, STUDY_FILES.media);
  const transcript = path.join(workspace, STUDY_FILES.transcript);
  const y = ytdlp();
  if (!fs.existsSync(info)) {
    say('Lendo os dados do vídeo no YouTube');
    const meta = await run(y.cmd, [...y.pre, '--dump-single-json', '--skip-download', '--no-playlist', link], { timeoutMs: 2 * 60 * 1000, registerKill });
    if (meta.stopped) return { ok: false, stopped: true, transcript: false };
    if (meta.code !== 0) return { ok: false, error: `O YouTube não devolveu os dados do vídeo. ${lastErrorLine(meta.stderr)}`.trim(), transcript: false };
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(meta.stdout);
    } catch {
      return { ok: false, error: 'O yt-dlp devolveu dados que não deu para ler.', transcript: false };
    }
    const picked: Record<string, unknown> = { fonte: 'youtube', link };
    for (const k of YT_FIELDS) if (raw[k] != null) picked[k] = raw[k];
    fs.writeFileSync(info, JSON.stringify(picked, null, 2) + '\n', 'utf8');
  }
  if (!fs.existsSync(transcript)) {
    say('Buscando a legenda do vídeo');
    const subs = path.join(workspace, 'legendas');
    fs.mkdirSync(subs, { recursive: true });
    await run(y.cmd, [...y.pre, '--skip-download', '--no-playlist', '--write-subs', '--write-auto-subs', '--sub-langs', 'pt.*,pt,en.*,en', '--sub-format', 'vtt', '-o', path.join(subs, '%(id)s.%(ext)s'), link], { timeoutMs: 2 * 60 * 1000, registerKill });
    const files = fs.readdirSync(subs).filter((f) => f.endsWith('.vtt'));
    const pick = files.find((f) => /\.pt/.test(f)) || files[0];
    if (pick) {
      const text = vttToText(fs.readFileSync(path.join(subs, pick), 'utf8'));
      if (text) fs.writeFileSync(transcript, `Fonte: legenda do YouTube (${pick.split('.').slice(-2, -1)[0]})\n\n${text}\n`, 'utf8');
    }
  }
  if (!fs.existsSync(media)) {
    say('Baixando o vídeo em baixa resolução para ver a tela');
    // O YouTube separa vídeo e áudio: baixa os dois em baixa resolução e o ffmpeg junta em mp4.
    const dl = await run(y.cmd, [...y.pre, '--no-playlist', '-f', 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/bv*[height<=480]+ba/b[height<=480]/b', '--merge-output-format', 'mp4', '--max-filesize', '400M', '-o', media, link], { timeoutMs: 10 * 60 * 1000, registerKill });
    if (dl.stopped) return { ok: false, stopped: true, transcript: fs.existsSync(transcript) };
    if (dl.code !== 0 || !fs.existsSync(media)) say('Não deu para baixar o vídeo; o estudo segue sem os quadros');
  }
  if (!fs.existsSync(transcript) && fs.existsSync(media)) {
    say('Sem legenda no YouTube: transcrevendo o áudio aqui');
    try {
      const text = await transcribe(media);
      if (text) fs.writeFileSync(transcript, `Fonte: transcrição local (whisper.cpp)\n\n${text}\n`, 'utf8');
    } catch (err: any) {
      say(`Transcrição indisponível: ${String(err?.message || err).split('\n')[0].slice(0, 160)}`);
    }
  }
  return { ok: true, transcript: fs.existsSync(transcript) };
}

export interface StudyPrep {
  ok: boolean;
  error?: string;
  stopped?: boolean;
  source?: StudySource;
  /** Aviso para o relatório (transcrição ou quadros que faltaram). */
  notes: string[];
  frames: number;
  links: number;
}

export interface StudyDeps extends VideoDeps {
  youtube?: typeof prepYoutube;
  frames?: typeof extractFrames;
  officeRoot?: string;
}

/** Prepara a pasta do estudo. Numa nova tentativa reaproveita o que já baixou (não gasta cota de novo). */
export async function prepStudy(link: string, workspace: string, say: (line: string) => void, registerKill: (kill: () => void) => void, deps: StudyDeps = {}): Promise<StudyPrep> {
  const url = String(link || '').trim();
  const source = studySource(url);
  if (!source) return { ok: false, error: 'Informe o link de um vídeo do Instagram (Reel ou post) ou do YouTube.', notes: [], frames: 0, links: 0 };
  fs.mkdirSync(workspace, { recursive: true });
  const notes: string[] = [];
  if (source === 'instagram') {
    const prep = await prepVideo(url, workspace, say, registerKill, deps);
    if (!prep.ok) return { ok: false, error: prep.error, stopped: prep.stopped, source, notes, frames: 0, links: 0 };
    if (prep.transcriptNote) notes.push(prep.transcriptNote);
  } else {
    const prep = await (deps.youtube || prepYoutube)(url, workspace, say, registerKill, deps.transcribe);
    if (!prep.ok) return { ok: false, error: prep.error, stopped: prep.stopped, source, notes, frames: 0, links: 0 };
    if (!prep.transcript) notes.push('O vídeo não tem legenda no YouTube; o estudo usa os dados, a descrição e os quadros.');
  }
  const media = path.join(workspace, STUDY_FILES.media);
  let frames = 0;
  if (fs.existsSync(media)) {
    say('Separando quadros do vídeo');
    frames = await (deps.frames || extractFrames)(media, path.join(workspace, STUDY_FILES.frames)).catch(() => 0);
  }
  if (!frames) notes.push('Sem quadros do vídeo: o motor não viu a tela, só o texto.');
  const read = (f: string) => (fs.existsSync(path.join(workspace, f)) ? fs.readFileSync(path.join(workspace, f), 'utf8') : '');
  let info: Record<string, unknown> = {};
  try {
    info = JSON.parse(read(STUDY_FILES.info) || '{}');
  } catch {
    info = {};
  }
  const links = citedLinks([
    { onde: source === 'youtube' ? 'descrição' : 'legenda', texto: String(info.description || info.legenda || '') },
    { onde: 'fala', texto: read(STUDY_FILES.transcript) },
  ]);
  fs.writeFileSync(path.join(workspace, STUDY_FILES.links), JSON.stringify(links, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(workspace, STUDY_FILES.office), officeBrief(deps.officeRoot) + '\n', 'utf8');
  say(`Pasta pronta: ${frames} quadro(s), ${links.length} link(s) citado(s)`);
  return { ok: true, source, notes, frames, links: links.length };
}
