/**
 * F2 do GOAL_FLOW: o Flow do Escritório fala com o publicador do DarkFlow pelo processo principal.
 * Cria agenda sempre em rascunho; ativar exige o ateste do Carlos (gate) e nunca liga a publicação real:
 * isso continua sendo o `--enable-meta-publish` do próprio DarkFlow, que o Escritório não passa.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StudioStore } from '../studio/store';
import { darkflowRequest } from '../studio/darkflow';
import { lerEntrega } from './biblioteca';
import type { FlowBoard, NovaAgenda, PecaDoItem } from '../../shared/flow';

export type { FlowBoard, NovaAgenda, PecaDoItem };

type Row = Record<string, any>;
type Res<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

const TZ = 'America/Sao_Paulo';
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const msg = (err: unknown) => (err instanceof Error ? err.message : 'DarkFlow indisponível');

async function csrf(base: string): Promise<{ token: string; mode: string }> {
  const s = await darkflowRequest(base, '/api/publisher/session');
  const token = String(s.csrf_token ?? '');
  if (!token) throw new Error('o DarkFlow não devolveu o CSRF');
  return { token, mode: String(s.mode ?? 'simulation') };
}

export type Miniatura = (src: string, dest: string) => void;

/** Miniatura JPEG pequena (largura 144) para a prévia; o arquivo grande nunca vai para a tela. */
const ffmpegMiniatura: Miniatura = (src, dest) => {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', 'scale=144:-2', '-q:v', '5', dest], { windowsHide: true, timeout: 15000, stdio: 'pipe' });
};

/**
 * Prévia de carrossel e post no Flow (F5): miniaturas das lâminas do pacote, feitas uma vez e
 * guardadas em `pacote/miniaturas/`. Sem lâmina, ou sem ffmpeg, volta lista vazia.
 */
export function miniaturasDoPacote(pacoteDir: string, fazer: Miniatura = ffmpegMiniatura): string[] {
  const file = path.join(pacoteDir, 'manifest.json');
  if (!fs.existsSync(file)) return [];
  let arquivos: Array<{ arquivo?: string }> = [];
  try {
    arquivos = (JSON.parse(fs.readFileSync(file, 'utf8')) as { arquivos?: Array<{ arquivo?: string }> }).arquivos ?? [];
  } catch {
    return [];
  }
  const dir = path.join(pacoteDir, 'miniaturas');
  const out: string[] = [];
  for (const a of arquivos.slice(0, 20)) {
    const nome = String(a.arquivo || '');
    if (!/^[\w.-]+\.(png|jpe?g)$/i.test(nome) || nome === 'capa.png') continue;
    const src = path.join(pacoteDir, nome);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(dir, nome.replace(/\.[^.]+$/, '.jpg'));
    try {
      if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < fs.statSync(src).mtimeMs) {
        fs.mkdirSync(dir, { recursive: true });
        fazer(src, dest);
      }
      out.push(`data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}`);
    } catch {
      return out;
    }
  }
  return out;
}

/** Peças do Studio que já foram para a biblioteca, indexadas pelo item. */
export function pecasPorItem(store: StudioStore | null, fazer?: Miniatura): Record<string, PecaDoItem> {
  const out: Record<string, PecaDoItem> = {};
  if (!store) return out;
  for (const p of store.listPecas()) {
    const e = lerEntrega(store, p.id);
    if (!e) continue;
    const item: PecaDoItem = { peca_id: p.id, titulo: p.titulo || '', legenda: p.legenda || '', hashtags: p.hashtags || [], ia: !!e.ia };
    if (p.formato_id !== 'ig-reels-9x16' && p.formato_id !== 'ig-stories-9x16') {
      const mini = miniaturasDoPacote(store.tree.pecaDirs(p.id).pacote, fazer);
      if (mini.length) item.miniaturas = mini;
    }
    out[e.item_id] = item;
  }
  return out;
}

export async function flowBoard(base: string, store: StudioStore | null): Promise<FlowBoard> {
  const pecas = (() => { try { return pecasPorItem(store); } catch { return {}; } })();
  try {
    const [status, library, schedules, occurrences] = await Promise.all([
      darkflowRequest(base, '/api/publisher/status'),
      darkflowRequest(base, '/api/publisher/library'),
      darkflowRequest(base, '/api/publisher/schedules'),
      darkflowRequest(base, '/api/publisher/occurrences'),
    ]);
    return { online: true, status, library: list(library), schedules: list(schedules), occurrences: list(occurrences), pecas };
  } catch (err) {
    return { online: false, error: msg(err), status: null, library: [], schedules: [], occurrences: [], pecas };
  }
}

/** Erros que dá para dizer antes de chamar o DarkFlow. */
export function problemasDaAgenda(a: NovaAgenda): string[] {
  const out: string[] = [];
  if (!a.item_id) out.push('escolha o vídeo da biblioteca');
  if (!a.name || !a.name.trim()) out.push('dê um nome à agenda');
  if (a.name && a.name.length > 100) out.push('nome com mais de 100 caracteres');
  if (!['once', 'daily', 'weekly'].includes(a.recurrence)) out.push('recorrência inválida');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.start_date || '')) out.push('data inicial no formato AAAA-MM-DD');
  if (a.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(a.end_date)) out.push('data final no formato AAAA-MM-DD');
  if (a.end_date && a.start_date && a.end_date < a.start_date) out.push('a data final vem antes da inicial');
  const times = a.times || [];
  if (times.length < 1 || times.length > 3) out.push('de 1 a 3 horários');
  if (times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) out.push('horário no formato HH:MM');
  if (a.recurrence === 'weekly' && !(a.weekdays || []).length) out.push('escolha ao menos um dia da semana');
  if ((a.caption || '').length > 2200) out.push('legenda com mais de 2200 caracteres');
  if ((a.hashtags || '').length > 500) out.push('hashtags com mais de 500 caracteres');
  return out;
}

function corpo(a: NovaAgenda) {
  return {
    item_id: a.item_id,
    name: a.name.trim(),
    recurrence: a.recurrence,
    timezone: TZ,
    start_date: a.start_date,
    end_date: a.end_date || null,
    times: a.times,
    weekdays: a.recurrence === 'weekly' ? a.weekdays || [] : [],
    caption: a.caption || '',
    hashtags: a.hashtags || '',
    share_to_feed: a.share_to_feed !== false,
    is_ai_generated: !!a.is_ai_generated,
  };
}

/** Cria a agenda em rascunho. Nunca ativa aqui. */
export async function criarAgenda(base: string, a: NovaAgenda): Promise<Res<{ id: string }>> {
  const problemas = problemasDaAgenda(a);
  if (problemas.length) return { ok: false, error: problemas.join('; ') };
  try {
    const { token } = await csrf(base);
    const created = await darkflowRequest(base, '/api/publisher/schedules', { method: 'POST', csrf: token, body: { ...corpo(a), editorial_attested: false, activate: false } });
    const id = String(created.id ?? '');
    if (!id) return { ok: false, error: 'o DarkFlow não devolveu a agenda' };
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: msg(err) };
  }
}

/** Gate do Carlos: ativa uma agenda em rascunho com o ateste editorial. */
export async function ativarAgenda(base: string, id: string, atestado: boolean): Promise<Res> {
  if (atestado !== true) return { ok: false, error: 'confirme que revisou o conteúdo antes de ativar' };
  try {
    const schedules = list(await darkflowRequest(base, '/api/publisher/schedules'));
    const s = schedules.find((row) => row.id === id);
    if (!s) return { ok: false, error: 'agenda não encontrada' };
    if (s.status !== 'rascunho') return { ok: false, error: `só agenda em rascunho pode ser ativada (esta está «${s.status}»)` };
    const body = corpo({
      item_id: s.item_id, name: s.name, recurrence: s.recurrence, start_date: s.start_date, end_date: s.end_date,
      times: s.times || [], weekdays: s.weekdays || [], caption: s.caption, hashtags: s.hashtags,
      share_to_feed: s.share_to_feed, is_ai_generated: s.is_ai_generated,
    });
    const { token } = await csrf(base);
    await darkflowRequest(base, `/api/publisher/schedules/${encodeURIComponent(id)}`, { method: 'PATCH', csrf: token, body: { ...body, timezone: s.timezone || TZ, editorial_attested: true, activate: true } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: msg(err) };
  }
}

export async function cancelarAgenda(base: string, id: string): Promise<Res<{ cancelled: number }>> {
  try {
    const { token } = await csrf(base);
    const out = await darkflowRequest(base, `/api/publisher/schedules/${encodeURIComponent(id)}/cancel`, { method: 'POST', csrf: token, body: {} });
    return { ok: true, cancelled: Number(out.cancelled ?? 0) };
  } catch (err) {
    return { ok: false, error: msg(err) };
  }
}

/** Roda o worker uma vez com o adaptador falso. Recusa se o DarkFlow estiver em modo real. */
export async function rodarSimulacao(base: string): Promise<Res<{ resultado: Row }>> {
  try {
    const { token, mode } = await csrf(base);
    if (mode !== 'simulation') return { ok: false, error: 'o DarkFlow está em modo real; a simulação fica bloqueada' };
    const resultado = await darkflowRequest(base, '/api/publisher/simulation/run-once', { method: 'POST', csrf: token, body: {} });
    return { ok: true, resultado };
  } catch (err) {
    return { ok: false, error: msg(err) };
  }
}
