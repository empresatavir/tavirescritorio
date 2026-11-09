import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatById, type Peca, type Perfil } from '../../shared/studio';
import { darkflowRequest } from './darkflow';
import { exportReelForDarkFlow } from './darkflowExport';
import { docuflowChannel } from './docuflow';
import { probe } from './mediaChecks';
import { ensureStudioTree } from './paths';
import type { StudioStore } from './store';

export interface ScoreLine {
  k: string;
  v: string;
}

export function presentScorecard(raw: unknown): ScoreLine[] {
  const summary = raw && typeof raw === 'object' && Array.isArray((raw as { summary_by_window?: unknown }).summary_by_window)
    ? (raw as { summary_by_window: Array<{ window_hours?: number; sample_size?: number; medians?: Record<string, number> }> }).summary_by_window
    : [];
  if (!summary.length) return [{ k: 'scorecard', v: '—' }];
  return summary.map((row) => {
    const medians = row.medians ?? {};
    const shown = Object.entries(medians).filter((entry) => Number.isFinite(entry[1]));
    const value = shown.length ? shown.map(([name, number]) => `${name} ${number}`).join(' · ') : '—';
    return { k: row.window_hours == null ? 'janela' : `${row.window_hours} h · n ${row.sample_size ?? '—'}`, v: value };
  });
}

function whenOf(value: string | null): { start_date: string; times: string[] } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) return null;
  return { start_date: match[1], times: [match[2]] };
}

function draftPath(home: string, pecaId: string): string {
  return path.join(ensureStudioTree(home).pecaDirs(pecaId).pacote, 'darkflow.json');
}

export async function prepareDarkflowSchedule(store: StudioStore, pecaId: string, base: string, outputRoot: string, projectRoot: string): Promise<{ ok: boolean; error?: string; scheduleId?: string }> {
  const peca = store.getPeca(pecaId);
  if (!peca) return { ok: false, error: 'peça não encontrada' };
  if (peca.formato_id !== 'ig-reels-9x16') return { ok: false, error: 'o DarkFlow só recebe Reel do Instagram' };
  const format = formatById(peca.formato_id);
  const when = whenOf(peca.agendado_para);
  if (!when) return { ok: false, error: 'informe quando publicar, com data e hora' };
  const video = path.join(ensureStudioTree(store.tree.home).pecaDirs(pecaId).pacote, 'final.mp4');
  if (!fs.existsSync(video)) return { ok: false, error: 'falta o pacote do reel' };
  const info = probe(video);
  const exported = exportReelForDarkFlow({
    video,
    outputRoot,
    projectRoot,
    width: info?.width ?? format?.width ?? 1080,
    height: info?.height ?? format?.height ?? 1920,
    duration: info?.duration ?? 0,
  });
  const session = await darkflowRequest(base, '/api/publisher/session');
  const csrf = String(session.csrf_token ?? '');
  if (!csrf) return { ok: false, error: 'o DarkFlow não devolveu o CSRF' };
  await darkflowRequest(base, '/api/publisher/library/scan', { method: 'POST', csrf, body: {} });
  const library = await darkflowRequest(base, '/api/publisher/library');
  const items = Array.isArray(library) ? library : [];
  const manifest = JSON.parse(fs.readFileSync(exported.manifest, 'utf8')) as { sha256: string };
  const item = items.find((row) => row && typeof row === 'object' && (row as { sha256?: string }).sha256 === manifest.sha256) as { id?: string } | undefined;
  if (!item?.id) return { ok: false, error: 'o DarkFlow não importou o reel' };
  const body = {
    item_id: item.id,
    name: peca.titulo || 'Reel',
    recurrence: 'once',
    timezone: 'America/Sao_Paulo',
    start_date: when.start_date,
    times: when.times,
    weekdays: [],
    caption: peca.legenda || '',
    hashtags: (peca.hashtags || []).join(' '),
    share_to_feed: true,
    is_ai_generated: false,
    editorial_attested: false,
    activate: false,
  };
  const created = await darkflowRequest(base, '/api/publisher/schedules', { method: 'POST', csrf, body });
  const scheduleId = String(created.id ?? '');
  if (!scheduleId) return { ok: false, error: 'o DarkFlow não devolveu a agenda' };
  fs.writeFileSync(draftPath(store.tree.home, pecaId), JSON.stringify({ scheduleId, body }, null, 2));
  return { ok: true, scheduleId };
}

export async function activateDarkflowSchedule(store: StudioStore, pecaId: string, base: string): Promise<{ ok: boolean; error?: string }> {
  const file = draftPath(store.tree.home, pecaId);
  if (!fs.existsSync(file)) return { ok: false, error: 'ainda não há agenda em rascunho' };
  const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as { scheduleId: string; body: Record<string, unknown> };
  const session = await darkflowRequest(base, '/api/publisher/session');
  const csrf = String(session.csrf_token ?? '');
  await darkflowRequest(base, `/api/publisher/schedules/${saved.scheduleId}`, {
    method: 'PATCH',
    csrf,
    body: { ...saved.body, editorial_attested: true, activate: true },
  });
  return { ok: true };
}

export async function darkflowBoard(base: string): Promise<{ ok: boolean; error?: string; library: unknown[]; schedules: unknown[]; occurrences: unknown[] }> {
  try {
    const [library, schedules, occurrences] = await Promise.all([
      darkflowRequest(base, '/api/publisher/library'),
      darkflowRequest(base, '/api/publisher/schedules'),
      darkflowRequest(base, '/api/publisher/occurrences'),
    ]);
    return {
      ok: true,
      library: Array.isArray(library) ? library : [],
      schedules: Array.isArray(schedules) ? schedules : [],
      occurrences: Array.isArray(occurrences) ? occurrences : [],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'DarkFlow indisponível', library: [], schedules: [], occurrences: [] };
  }
}

export async function readScorecard(base: string): Promise<ScoreLine[]> {
  try {
    const raw = await darkflowRequest(base, '/api/publisher/telemetry/scorecard');
    return presentScorecard(raw);
  } catch {
    return [{ k: 'scorecard', v: '—' }];
  }
}

export async function sendToDocuflow(
  base: string,
  perfil: Perfil,
  peca: Peca,
  opts: { waitMs?: number; pollMs?: number } = {},
): Promise<{ ok: boolean; error?: string; slug?: string }> {
  if (peca.formato_id !== 'yt-longo-16x9') return { ok: false, error: 'só o vídeo 16:9 vai para a Edição' };
  const scenes = docuflowScenes(peca);
  if (!scenes.length) return { ok: false, error: 'o roteiro não tem cena com fala' };
  const mapped = docuflowChannel(perfil);
  const channel = await fetch(`${base.replace(/\/$/, '')}/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapped.channel),
  });
  if (!channel.ok && channel.status !== 409) {
    return { ok: false, error: `Docuflow recusou o canal (${channel.status})` };
  }
  const kit = await fetch(`${base.replace(/\/$/, '')}/channels/${mapped.channel.id}/brand-kit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapped.brandKit),
  });
  if (!kit.ok && kit.status !== 409) {
    return { ok: false, error: `Docuflow recusou o brand kit (${kit.status})` };
  }
  const cenas = (peca.roteiro?.cenas ?? []).map((cena) => cena.texto_narrado).filter(Boolean).join('\n');
  const slides = (peca.roteiro?.slides ?? []).map((slide) => slide.titulo).filter(Boolean).join('\n');
  const topic = [peca.titulo, cenas || slides].filter(Boolean).join('\n\n');
  const created = await fetch(`${base.replace(/\/$/, '')}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, lang: 'pt', minutes: 3, stop: 'research' }),
  });
  const payload = await created.json().catch(() => ({})) as { slug?: string; detail?: string };
  if (!created.ok) return { ok: false, error: payload.detail || `Docuflow recusou o projeto (${created.status})` };
  const slug = payload.slug;
  if (!slug) return { ok: false, error: 'Docuflow não devolveu o projeto' };

  // A tela do Docuflow lista composições, não projetos do pipeline. Então: esperar a pesquisa
  // gravar o project.json, pôr as cenas do roteiro nele e importar como composição.
  const root = base.replace(/\/$/, '');
  const project = await waitDocuflowProject(root, slug, opts.waitMs ?? 120000, opts.pollMs ?? 1500);
  if (!project) return { ok: false, error: 'a pesquisa do Docuflow não terminou a tempo; tente de novo', slug };
  const updated = await fetch(`${root}/projects/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...project, title: peca.titulo, scenes }),
  });
  if (!updated.ok) return { ok: false, error: `Docuflow recusou as cenas (${updated.status})`, slug };
  const imported = await fetch(`${root}/compositions/import-legacy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath: `${slug}/project.json`, projectId: slug, title: peca.titulo }),
  });
  if (!imported.ok) {
    const detail = await imported.json().catch(() => ({})) as { message?: string; detail?: string; error?: { message?: string } };
    return { ok: false, error: detail.error?.message || detail.message || detail.detail || `Docuflow não importou a composição (${imported.status})`, slug };
  }
  return { ok: true, slug };
}

/** Cenas do roteiro no formato do pipeline do Docuflow. A duração é estimada pela fala (~2,6 palavras/s). */
export function docuflowScenes(peca: Peca): Array<{ id: number; narration: string; visual_query: string; on_screen_text: string; duration: number }> {
  const raw = peca.roteiro?.cenas?.length
    ? peca.roteiro.cenas.map((cena) => ({ fala: cena.texto_narrado, tela: cena.texto_tela ?? '' }))
    : (peca.roteiro?.slides ?? []).map((slide) => ({ fala: slide.apoio || slide.titulo, tela: slide.titulo }));
  return raw
    .filter((item) => item.fala?.trim())
    .map((item, index) => {
      const fala = item.fala.trim();
      const words = fala.split(/\s+/).filter(Boolean).length;
      return {
        id: index + 1,
        narration: fala,
        visual_query: (item.tela || fala).trim().slice(0, 120),
        on_screen_text: (item.tela || '').trim(),
        duration: Math.max(2, Math.round((words / 2.6) * 10) / 10),
      };
    });
}

async function waitDocuflowProject(root: string, slug: string, waitMs: number, pollMs: number): Promise<Record<string, unknown> | null> {
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      const res = await fetch(`${root}/projects/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const project = await res.json() as Record<string, unknown>;
        const status = String(project.status ?? '');
        if (/^(stopped|error|cancelled|done)/.test(status)) return project;
      }
    } catch {
      /* Docuflow ocupado: tenta de novo */
    }
    if (Date.now() >= until) return null;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export async function editionBoard(base: string): Promise<{ ok: boolean; error?: string; compositions: unknown[]; jobs: unknown[] }> {
  try {
    const root = base.replace(/\/$/, '');
    const [compositions, jobs] = await Promise.all([
      fetch(`${root}/compositions`).then((response) => response.json()),
      fetch(`${root}/jobs`).then((response) => response.json()),
    ]);
    return {
      ok: true,
      compositions: Array.isArray(compositions?.projects) ? compositions.projects : [],
      jobs: Array.isArray(jobs?.jobs) ? jobs.jobs : [],
    };
  } catch {
    return { ok: false, error: 'Docuflow indisponível', compositions: [], jobs: [] };
  }
}
