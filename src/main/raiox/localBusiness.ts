/**
 * Presença local pelo Google Maps via RapidAPI "Local Business Data" (local-business-data.p.rapidapi.com).
 *
 * Roda no processo principal, ANTES do motor: a chave sai do cofre (bundle `rapidapi_local`) e nunca
 * entra no prompt, no log nem na pasta do caso. O motor só lê o resultado já gravado em
 * `analise/google/local-business.json` e o resumo em `local-business.md`.
 *
 * Substitui a tentativa de abrir google.com/search pelo navegador, que cai em CAPTCHA.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RaioxCase } from '../../shared/raiox';
import { caseDir } from './raioxStore';

export const LOCAL_HOST = 'local-business-data.p.rapidapi.com';
const TIMEOUT_MS = 30_000;
/** Consulta nova só depois disso; evita gastar quota a cada rodada da análise. */
export const LOCAL_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REQUESTS = 6;

export type FetchLike = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{ status: number; json: () => Promise<any> }>;

export interface LocalTarget {
  /** Link da ficha no Google Maps. Dá nome e coordenada exatos da loja. */
  mapsUrl: string;
  /** De onde veio: colado pelo Carlos ou achado numa análise anterior. */
  origin: 'carlos' | 'analise';
}

export interface LocalDeps {
  keys?: () => string[];
  target?: LocalTarget | null;
  /** Para depurar o formato das respostas sem gravar conteúdo. */
  onShape?: (path: string, shape: string) => void;
  fetch?: FetchLike;
  now?: () => Date;
}

export interface LocalPlace {
  id: string;
  name: string;
  rating: number | null;
  reviews: number | null;
  category: string;
  categories: string[];
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  verified: boolean | null;
  photos: number | null;
  priceLevel: string;
  openingStatus: string;
  hours: { day: string; hours: string }[];
  lat: number | null;
  lng: number | null;
  distanceKm?: number;
  about?: string;
}

export interface LocalReview {
  rating: number | null;
  text: string;
  when: string;
  author: string;
  ownerAnswer: string;
}

export interface LocalResult {
  schema: 'tavir-raiox-local-business/v1';
  collectedAt: string;
  query: string;
  status: 'ok' | 'nao_encontrado' | 'erro' | 'sem_chave';
  message: string;
  /** Como a ficha foi escolhida: pelo link (coordenada) ou só pelo nome, que pode errar de cidade. */
  matchedBy?: 'link' | 'nome';
  target?: LocalTarget | null;
  place: LocalPlace | null;
  candidates: LocalPlace[];
  reviews: LocalReview[];
  reviewStats: { sample: number; average: number | null; withText: number; answered: number; newest: string; oldest: string } | null;
  competitors: LocalPlace[];
  requests: { total: number; byPath: Record<string, number>; failures: number };
}

export class LocalBusinessError extends Error {}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}
function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeText(text: string): string {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hoursOf(raw: unknown): { day: string; hours: string }[] {
  const DAY: Record<string, string> = { monday: 'segunda', tuesday: 'terça', wednesday: 'quarta', thursday: 'quinta', friday: 'sexta', saturday: 'sábado', sunday: 'domingo' };
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw as Record<string, unknown>).map(([day, value]) => ({
    day: DAY[day.toLowerCase()] || day,
    hours: Array.isArray(value) ? value.map(str).join(', ') : str(value),
  }));
}

export function placeOf(raw: any): LocalPlace {
  const subtypes = Array.isArray(raw?.subtypes) ? raw.subtypes.map(str).filter(Boolean) : [];
  return {
    id: str(raw?.business_id || raw?.google_id || raw?.place_id),
    name: str(raw?.name),
    // Ficha sem avaliação devolve nota vazia; nota 0 com 0 avaliações também é "sem nota".
    rating: num(raw?.review_count) === 0 && !num(raw?.rating) ? null : num(raw?.rating),
    reviews: num(raw?.review_count),
    category: str(raw?.type) || subtypes[0] || '',
    categories: subtypes,
    address: str(raw?.full_address || raw?.address),
    phone: str(raw?.phone_number),
    website: str(raw?.website),
    mapsUrl: str(raw?.place_link),
    verified: typeof raw?.verified === 'boolean' ? raw.verified : null,
    photos: num(raw?.photo_count),
    priceLevel: str(raw?.price_level),
    openingStatus: str(raw?.opening_status),
    hours: hoursOf(raw?.working_hours),
    lat: num(raw?.latitude),
    lng: num(raw?.longitude),
    about: str(raw?.about?.summary || raw?.description) || undefined,
  };
}

function reviewOf(raw: any): LocalReview {
  return {
    rating: num(raw?.rating),
    text: str(raw?.review_text).slice(0, 1200),
    when: str(raw?.review_datetime_utc || raw?.review_time),
    // Nome do autor fica só com a inicial: o relatório não precisa identificar cliente do cliente.
    author: str(raw?.author_name) ? str(raw?.author_name).charAt(0) + '.' : '',
    ownerAnswer: str(raw?.owner_answer).slice(0, 600),
  };
}

function distanceKm(a: LocalPlace, b: LocalPlace): number | undefined {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return undefined;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Quanto o nome do resultado bate com o nome do caso (0..1), por palavras em comum. */
export function nameScore(company: string, candidate: string): number {
  const stop = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'ltda', 'me', 'epp']);
  const words = (t: string) => normalizeText(t).split(' ').filter((w) => w && !stop.has(w));
  const want = words(company);
  const got = new Set(words(candidate));
  if (!want.length) return 0;
  return want.filter((w) => got.has(w)).length / want.length;
}

function cityHint(c: RaioxCase): string {
  // Usa o que o caso já informa (link do Maps, objetivo, fronteira). Não inventa cidade.
  const text = [c.publicLink, c.frontier, c.objective].map(str).join(' ');
  const maps = /google\.[^/]+\/maps\/place\/([^/@?]+)/i.exec(text);
  if (maps) return decodeURIComponent(maps[1].replace(/\+/g, ' '));
  return '';
}

/** Extrai nome e coordenada de um link do Google Maps (…/place/NOME/@lat,lng… ou !3dLAT!4dLNG). */
export function parseMapsUrl(url: string): { name: string; lat: number | null; lng: number | null } | null {
  const text = String(url || '');
  if (!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) return null;
  const place = /\/maps\/place\/([^/@?]+)/i.exec(text);
  let name = '';
  try {
    name = place ? decodeURIComponent(place[1].replace(/\+/g, ' ')).trim() : '';
  } catch {
    name = place ? place[1].replace(/\+/g, ' ') : '';
  }
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(text);
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(text);
  const pick = pin || at;
  return { name, lat: pick ? Number(pick[1]) : null, lng: pick ? Number(pick[2]) : null };
}

const TARGET_FILE = 'local-business-alvo.json';

export function readTarget(dir: string): LocalTarget | null {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'analise', 'google', TARGET_FILE), 'utf8'));
    return data && typeof data.mapsUrl === 'string' && parseMapsUrl(data.mapsUrl) ? { mapsUrl: data.mapsUrl, origin: 'carlos' } : null;
  } catch {
    return null;
  }
}

export function saveTarget(dir: string, mapsUrl: string): LocalTarget {
  if (!parseMapsUrl(mapsUrl)) throw new LocalBusinessError('Cole um link do Google Maps (google.com/maps/place/...).');
  const base = path.join(dir, 'analise', 'google');
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, TARGET_FILE), JSON.stringify({ mapsUrl: mapsUrl.trim(), savedAt: new Date().toISOString() }, null, 2), 'utf8');
  return { mapsUrl: mapsUrl.trim(), origin: 'carlos' };
}

/** Link de ficha que uma análise anterior já gravou em analise/google (texto público coletado). */
export function targetFromAnalysis(dir: string): LocalTarget | null {
  const base = path.join(dir, 'analise', 'google');
  let names: string[] = [];
  try {
    names = fs.readdirSync(base).filter((n) => /\.(md|txt)$/i.test(n) && !n.startsWith('local-business'));
  } catch {
    return null;
  }
  for (const name of names) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(base, name), 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(/https:\/\/www\.google\.[a-z.]+\/maps\/place\/[^\s)`'"<>]+/gi)) {
      const parsed = parseMapsUrl(m[0]);
      if (parsed && parsed.lat != null) return { mapsUrl: m[0], origin: 'analise' };
    }
  }
  return null;
}

export function localQuery(c: RaioxCase): string {
  const hint = cityHint(c);
  if (hint) return hint;
  return [c.company, c.segment].map(str).filter(Boolean).join(' ');
}

export function wantsLocal(c: RaioxCase, fronts: string[] = []): boolean {
  if (fronts.length) return fronts.some((f) => f === 'google' || f === 'maps' || f === 'concorrentes');
  const text = normalizeText([c.frontier, c.decisionNeeded, c.publicLink].map(str).join(' '));
  return c.physicalStore || /\bgoogle\b|\bmaps\b|ficha/.test(text);
}

export function resultPaths(dir: string): { json: string; md: string } {
  const base = path.join(dir, 'analise', 'google');
  return { json: path.join(base, 'local-business.json'), md: path.join(base, 'local-business.md') };
}

export function readCached(dir: string, now: Date): LocalResult | null {
  try {
    const data = JSON.parse(fs.readFileSync(resultPaths(dir).json, 'utf8')) as LocalResult;
    if (data.status !== 'ok') return null;
    if (now.getTime() - new Date(data.collectedAt).getTime() > LOCAL_CACHE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

class Client {
  total = 0;
  failures = 0;
  byPath: Record<string, number> = {};
  billable = 0;
  private start = 0;
  private dead = new Set<string>();
  constructor(private keys: string[], private fetcher: FetchLike) {}

  async get(pathname: string, query: Record<string, string | number>): Promise<any> {
    if (!this.keys.length) throw new LocalBusinessError('Nenhuma chave da RapidAPI no cofre.');
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
    const url = `https://${LOCAL_HOST}${pathname}?${qs}`;
    let lastStatus = 0;
    for (let n = 0; n < this.keys.length; n++) {
      if (this.billable >= MAX_REQUESTS) throw new LocalBusinessError('Limite de consultas desta rodada atingido.');
      const key = this.keys[(this.start + n) % this.keys.length];
      if (this.dead.has(key)) continue;
      this.total++;
      this.byPath[pathname] = (this.byPath[pathname] || 0) + 1;
      let res: { status: number; json: () => Promise<any> };
      try {
        res = await this.fetcher(url, {
          headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': LOCAL_HOST, Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        this.failures++;
        throw new LocalBusinessError('Sem resposta da Local Business Data.');
      }
      lastStatus = res.status;
      // 401/403: chave sem assinatura desta API; 429: quota. Tenta a próxima chave.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        this.failures++;
        this.dead.add(key);
        if (res.status === 429) this.billable++;
        continue;
      }
      this.billable++;
      if (res.status >= 400) {
        this.failures++;
        throw new LocalBusinessError(`A Local Business Data respondeu HTTP ${res.status}.`);
      }
      this.start = (this.start + n) % this.keys.length;
      return res.json();
    }
    throw new LocalBusinessError(lastStatus === 429 ? 'Quota da Local Business Data esgotada nas chaves do cofre.' : 'Nenhuma chave do cofre tem assinatura da Local Business Data.');
  }
}

/** Estrutura da resposta (chaves e tipos), sem valores: serve para ajustar o normalizador. */
export function shapeOf(v: any, depth = 0): string {
  if (Array.isArray(v)) return v.length ? `[${shapeOf(v[0], depth + 1)}]×${v.length}` : '[]';
  if (v && typeof v === 'object') {
    if (depth > 2) return '{…}';
    return '{' + Object.keys(v).slice(0, 25).map((k) => `${k}:${shapeOf(v[k], depth + 1)}`).join(',') + '}';
  }
  return typeof v;
}

function reviewList(raw: any): any[] {
  const d = raw?.data;
  if (Array.isArray(d?.reviews)) return d.reviews;
  if (Array.isArray(d) && Array.isArray(d[0]?.reviews)) return d[0].reviews;
  if (Array.isArray(d) && d.length && (d[0]?.review_text !== undefined || d[0]?.rating !== undefined) && !d[0]?.business_id) return d;
  if (Array.isArray(raw?.reviews)) return raw.reviews;
  return [];
}

function listOf(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

export async function collectLocal(c: RaioxCase, deps: LocalDeps = {}): Promise<LocalResult> {
  const now = (deps.now ?? (() => new Date()))();
  const keys = (deps.keys ?? (() => []))().map(str).filter(Boolean);
  const target = deps.target ?? null;
  const query = target && parseMapsUrl(target.mapsUrl)?.name ? parseMapsUrl(target.mapsUrl)!.name : localQuery(c);
  const base: LocalResult = {
    schema: 'tavir-raiox-local-business/v1', collectedAt: now.toISOString(), query, status: 'ok', message: '', target,
    place: null, candidates: [], reviews: [], reviewStats: null, competitors: [], requests: { total: 0, byPath: {}, failures: 0 },
  };
  if (!keys.length) return { ...base, status: 'sem_chave', message: 'Sem chave da RapidAPI no cofre (Configurações › Credenciais › RapidAPI).' };
  const client = new Client(keys, deps.fetch ?? (globalThis.fetch as unknown as FetchLike));
  const finish = (patch: Partial<LocalResult>): LocalResult => ({ ...base, ...patch, requests: { total: client.total, byPath: client.byPath, failures: client.failures } });
  try {
    const pin = target ? parseMapsUrl(target.mapsUrl) : null;
    const searchQuery = pin && pin.name ? pin.name : query;
    const params: Record<string, string | number> = { query: searchQuery, limit: 10, language: 'pt', region: 'br', extract_emails_and_contacts: 'false' };
    if (pin && pin.lat != null && pin.lng != null) Object.assign(params, { lat: pin.lat, lng: pin.lng, zoom: 16 });
    const rawSearch = await client.get('/search', params);
    deps.onShape?.('/search', shapeOf(rawSearch));
    const found = listOf(rawSearch).map(placeOf);
    const ref: LocalPlace | null = pin && pin.lat != null ? ({ lat: pin.lat, lng: pin.lng } as LocalPlace) : null;
    const ranked = found
      .map((p) => {
        const km = ref ? distanceKm(ref, p) : undefined;
        const byName = Math.max(nameScore(c.company, p.name), pin && pin.name ? nameScore(pin.name, p.name) : 0);
        // Com link: vale a ficha no pino (até 300 m) com nome parecido. Sem link: só o nome.
        const score = ref ? (km != null && km <= 0.3 ? 1 + byName - km : km != null && km <= 1.5 && byName >= 0.5 ? byName - km / 3 : -1) : byName;
        return { p: km != null ? { ...p, distanceKm: km } : p, score };
      })
      .sort((a, b) => b.score - a.score);
    const candidates = ranked.map((r) => r.p);
    const best = ranked[0] && ranked[0].score >= 0.5 ? ranked[0].p : null;
    if (!best) {
      return finish({ status: 'nao_encontrado', candidates, message: ref
        ? 'Nenhuma ficha da busca fica no ponto do link do Maps. Confira o link e os candidatos.'
        : candidates.length ? 'Nenhum resultado com nome compatível com o caso. Confira os candidatos ou cole o link da ficha em Dados do Google.' : 'A busca não encontrou ficha no Google Maps.' });
    }
    let place = best;
    try {
      const detail = listOf(await client.get('/business-details', { business_id: best.id, language: 'pt', region: 'br', extract_emails_and_contacts: 'false' }))[0];
      if (detail) place = { ...best, ...Object.fromEntries(Object.entries(placeOf(detail)).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length))) } as LocalPlace;
    } catch {}
    let reviews: LocalReview[] = [];
    if (place.reviews !== 0) {
      try {
        const raw = await client.get('/business-reviews', { business_id: place.id, limit: 20, sort_by: 'newest', language: 'pt', region: 'br' });
        deps.onShape?.('/business-reviews', shapeOf(raw));
        reviews = reviewList(raw).map(reviewOf);
      } catch {}
    }
    let competitors: LocalPlace[] = [];
    if (place.lat != null && place.lng != null && str(c.segment || place.category)) {
      try {
        const near = listOf(await client.get('/search-nearby', { query: str(c.segment) || place.category, lat: place.lat, lng: place.lng, limit: 10, language: 'pt', region: 'br' })).map(placeOf);
        competitors = near.filter((p) => p.id !== place.id && nameScore(c.company, p.name) < 0.5).map((p) => ({ ...p, distanceKm: distanceKm(place, p) })).slice(0, 8);
      } catch {}
    }
    const rated = reviews.filter((r) => r.rating != null);
    const dates = reviews.map((r) => r.when).filter(Boolean).sort();
    const reviewStats = reviews.length ? {
      sample: reviews.length,
      average: rated.length ? Math.round((rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length) * 10) / 10 : null,
      withText: reviews.filter((r) => r.text).length,
      answered: reviews.filter((r) => r.ownerAnswer).length,
      newest: dates[dates.length - 1] || '',
      oldest: dates[0] || '',
    } : null;
    const matchedBy: 'link' | 'nome' = ref ? 'link' : 'nome';
    return finish({ status: 'ok', place, candidates, reviews, reviewStats, competitors, matchedBy, message: matchedBy === 'link' ? 'Ficha encontrada pelo link do Maps.' : 'Ficha escolhida só pelo nome: confira se o endereço é da loja.' });
  } catch (err) {
    return finish({ status: 'erro', message: err instanceof Error ? err.message : 'Falha na consulta.' });
  }
}

function fmt(v: unknown, empty = 'não informado'): string {
  const t = v == null ? '' : String(v).trim();
  return t || empty;
}

export function localMarkdown(r: LocalResult): string {
  const lines: string[] = ['# Google Maps — ficha pública (consulta por API)', ''];
  lines.push(`Consulta: \`${r.query}\` · coletado em ${r.collectedAt.slice(0, 16).replace('T', ' ')} UTC · ${r.requests.total} consultas.`, '');
  if (r.status !== 'ok' || !r.place) {
    lines.push(`**Resultado:** ${r.message}`, '');
    if (r.candidates.length) {
      lines.push('## Candidatos devolvidos pela busca', '', '| Nome | Nota | Avaliações | Endereço |', '|---|---|---|---|');
      for (const p of r.candidates) lines.push(`| ${p.name} | ${fmt(p.rating, '—')} | ${fmt(p.reviews, '—')} | ${p.address || '—'} |`);
      lines.push('');
    }
    return lines.join('\n');
  }
  const p = r.place;
  if (r.matchedBy === 'nome') lines.push('> **Confira:** a ficha foi escolhida só pelo nome. Se o endereço não for da loja, abra Dados do Google no caso e cole o link da ficha do Maps.', '');
  lines.push('## Ficha', '');
  lines.push(`- **Nome:** ${p.name}`);
  lines.push(`- **Nota:** ${p.rating != null ? p.rating.toFixed(1) : 'sem nota'} · **Avaliações:** ${fmt(p.reviews, '0')}`);
  lines.push(`- **Categoria:** ${fmt(p.category)}${p.categories.length > 1 ? ` (também: ${p.categories.slice(1).join(', ')})` : ''}`);
  lines.push(`- **Endereço:** ${fmt(p.address)}`);
  lines.push(`- **Telefone:** ${fmt(p.phone)}`);
  lines.push(`- **Site na ficha:** ${fmt(p.website)}`);
  lines.push(`- **Perfil verificado pelo dono:** ${p.verified == null ? 'não informado' : p.verified ? 'sim' : 'não'}`);
  lines.push(`- **Fotos:** ${fmt(p.photos)}`);
  if (p.openingStatus) lines.push(`- **Situação no momento da coleta:** ${p.openingStatus}`);
  if (p.mapsUrl) lines.push(`- **Link da ficha:** ${p.mapsUrl}`);
  if (p.about) lines.push(`- **Descrição:** ${p.about.replace(/\s+/g, ' ')}`);
  lines.push('');
  if (p.hours.length) {
    lines.push('## Horário', '', '| Dia | Horário |', '|---|---|');
    for (const h of p.hours) lines.push(`| ${h.day} | ${h.hours || '—'} |`);
    lines.push('');
  }
  lines.push('## Avaliações recentes', '');
  if (!r.reviewStats) lines.push(p.reviews === 0 ? '**A ficha ainda não tem nenhuma avaliação.**' : 'A consulta não devolveu avaliações.', '');
  else {
    const s = r.reviewStats;
    lines.push(`Amostra de ${s.sample} avaliações mais novas · média da amostra ${s.average ?? '—'} · ${s.withText} com texto · **${s.answered} respondidas pelo dono** · de ${s.oldest.slice(0, 10) || '—'} a ${s.newest.slice(0, 10) || '—'}.`, '');
    lines.push('| Nota | Quando | Texto | Resposta do dono |', '|---|---|---|---|');
    for (const rv of r.reviews.slice(0, 20)) {
      const clean = (t: string) => t.replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 280);
      lines.push(`| ${fmt(rv.rating, '—')} | ${rv.when.slice(0, 10) || '—'} | ${clean(rv.text) || '—'} | ${clean(rv.ownerAnswer) || '—'} |`);
    }
    lines.push('');
  }
  lines.push('## Concorrentes próximos', '');
  if (!r.competitors.length) lines.push('A consulta não devolveu concorrentes próximos.', '');
  else {
    lines.push('| Nome | Nota | Avaliações | Distância | Categoria |', '|---|---|---|---|---|');
    for (const cp of r.competitors) lines.push(`| ${cp.name} | ${cp.rating != null ? cp.rating.toFixed(1) : '—'} | ${fmt(cp.reviews, '0')} | ${cp.distanceKm != null ? cp.distanceKm + ' km' : '—'} | ${cp.category || '—'} |`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Consulta (ou reaproveita a consulta dos últimos 7 dias) e grava na pasta do caso. */
export async function ensureLocal(root: string, c: RaioxCase, opts: LocalDeps & { force?: boolean } = {}): Promise<LocalResult> {
  const dir = caseDir(root, c.id);
  const now = (opts.now ?? (() => new Date()))();
  const target = opts.target !== undefined ? opts.target : readTarget(dir) || targetFromAnalysis(dir);
  if (!opts.force) {
    const cached = readCached(dir, now);
    // Um link novo da ficha vale mais que a coleta anterior feita só pelo nome.
    if (cached && (!target || cached.target?.mapsUrl === target.mapsUrl)) return cached;
  }
  const result = await collectLocal(c, { ...opts, target });
  const files = resultPaths(dir);
  fs.mkdirSync(path.dirname(files.json), { recursive: true });
  // Sem chave configurada não sobrescreve uma coleta boa anterior.
  if (result.status === 'sem_chave' && fs.existsSync(files.json)) return result;
  fs.writeFileSync(files.json, JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(files.md, localMarkdown(result), 'utf8');
  return result;
}
