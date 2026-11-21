import { lookup as dnsLookup } from 'node:dns/promises';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import type { RaioxCase } from '../../shared/raiox';

/**
 * G-PR1 controle 5: todo link do caso é conferido antes de qualquer acesso.
 * Protocolo, destino, DNS (nada de rede interna) e cada salto de redirect.
 * A análise só roda com todos os links aprovados; o motor recebe a lista em
 * `analise/links-verificados.json`.
 */

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

const BLOCKED = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) BLOCKED.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96],
] as const) BLOCKED.addSubnet(addr, prefix, 'ipv6');

/** Compartilhamento de arquivo: documento do cliente não entra pelo link público. */
const FILE_HOSTS = /(^|\.)(drive\.google\.com|docs\.google\.com|dropbox\.com|dropboxusercontent\.com|wetransfer\.com|we\.tl|onedrive\.live\.com|1drv\.ms|sharepoint\.com|mega\.nz|icloud\.com)$/i;
const SECRET_PARAM = /^(token|access_token|password|senha|pass|pwd|key|api_?key|secret|auth|session|sid|code)$/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z)$/i;
const LOCAL_NAME = /(^localhost$|\.localhost$|\.local$|\.internal$|\.lan$|\.home$|\.corp$|^metadata(\.google\.internal)?$)/i;

export function isBlockedAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (!kind) return true;
  if (kind === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (mapped) return BLOCKED.check(mapped[1], 'ipv4');
    return BLOCKED.check(ip, 'ipv6');
  }
  return BLOCKED.check(ip, 'ipv4');
}

/** Motivo do bloqueio pela forma do link, ou null se a forma está boa. Não acessa a rede. */
export function shapeProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'link inválido';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'protocolo não permitido';
  if (url.username || url.password) return 'link com usuário ou senha';
  if (url.port && url.port !== '80' && url.port !== '443') return 'porta não permitida';
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return 'link sem endereço';
  if (net.isIP(host)) return 'endereço IP direto não é aceito';
  if (LOCAL_NAME.test(host) || !host.includes('.')) return 'endereço de rede interna';
  if (FILE_HOSTS.test(host)) return 'link de arquivo compartilhado (documento não entra pelo link público)';
  if (DOC_EXT.test(url.pathname)) return 'link direto para documento';
  for (const key of url.searchParams.keys()) {
    if (SECRET_PARAM.test(key)) return 'link com credencial na URL';
  }
  return null;
}

/** Links http(s) dentro de um texto livre (caso, fronteira, formulário). */
export function extractLinks(text: string): string[] {
  const found = new Set<string>();
  for (const m of String(text || '').matchAll(/\bhttps?:\/\/[^\s<>"'`)\]]+/gi)) {
    found.add(m[0].replace(/[.,;:!?]+$/, ''));
  }
  return [...found];
}

/** Links do caso que o motor pode acessar: link público, fronteira, objetivo e o link do Maps salvo. */
export function caseLinks(c: RaioxCase, extra: string[] = []): string[] {
  const text = [c.publicLink, c.frontier, c.objective, c.decisionNeeded, ...extra].map((v) => String(v || '')).join('\n');
  return extractLinks(text);
}

export interface LinkDeps {
  lookup?: (host: string) => Promise<string[]>;
  fetch?: typeof fetch;
  now?: () => string;
}

async function defaultLookup(host: string): Promise<string[]> {
  const rows = await dnsLookup(host, { all: true, verbatim: true });
  return rows.map((row) => row.address);
}

export interface LinkCheck {
  url: string;
  ok: boolean;
  final?: string;
  hops?: string[];
  reason?: string;
}

async function hostProblem(url: URL, lookup: (host: string) => Promise<string[]>): Promise<string | null> {
  let addrs: string[];
  try {
    addrs = await lookup(url.hostname);
  } catch {
    return 'o endereço não existe no DNS';
  }
  if (!addrs.length) return 'o endereço não existe no DNS';
  if (addrs.some(isBlockedAddress)) return 'o endereço aponta para rede interna';
  return null;
}

/** Confere forma, DNS e cada redirect (sem seguir automaticamente). Não lê o corpo da página. */
export async function checkLink(raw: string, deps: LinkDeps = {}): Promise<LinkCheck> {
  const lookup = deps.lookup ?? defaultLookup;
  const doFetch = deps.fetch ?? fetch;
  const hops: string[] = [];
  let current = raw;
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const shape = shapeProblem(current);
    if (shape) return { url: raw, ok: false, hops, reason: i ? `redirect para ${current}: ${shape}` : shape };
    const url = new URL(current);
    const host = await hostProblem(url, lookup);
    if (host) return { url: raw, ok: false, hops, reason: i ? `redirect para ${url.hostname}: ${host}` : host };
    hops.push(current);
    let res: Response;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      res = await doFetch(current, { method: 'HEAD', redirect: 'manual', signal: ctrl.signal });
      if (res.status === 405 || res.status === 501) {
        res = await doFetch(current, { method: 'GET', redirect: 'manual', signal: ctrl.signal });
        res.body?.cancel().catch(() => undefined);
      }
    } catch {
      clearTimeout(timer);
      // Site que não responde não é risco de rede interna: o motor tenta e registra a falha.
      return { url: raw, ok: true, final: current, hops };
    }
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return { url: raw, ok: true, final: current, hops };
      try {
        current = new URL(location, current).toString();
      } catch {
        return { url: raw, ok: false, hops, reason: 'redirect inválido' };
      }
      continue;
    }
    return { url: raw, ok: true, final: current, hops };
  }
  return { url: raw, ok: false, hops, reason: 'redirects demais' };
}

export interface LinkReport {
  checkedAt: string;
  links: LinkCheck[];
  blocked: LinkCheck[];
}

export const LINKS_FILE = path.join('analise', 'links-verificados.json');

/** Confere todos os links do caso e grava o resultado na pasta do caso. */
export async function verifyCaseLinks(dir: string, c: RaioxCase, extra: string[] = [], deps: LinkDeps = {}): Promise<LinkReport> {
  const links = caseLinks(c, extra);
  const results: LinkCheck[] = [];
  for (const link of links) results.push(await checkLink(link, deps));
  const report: LinkReport = {
    checkedAt: (deps.now ?? (() => new Date().toISOString()))(),
    links: results,
    blocked: results.filter((r) => !r.ok),
  };
  const file = path.join(dir, LINKS_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return report;
}

/** Texto proibido nos campos do caso: CPF, cartão e credencial. Devolve o motivo ou null. */
export function forbiddenContent(text: string): string | null {
  const value = String(text || '');
  if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(value)) return 'CPF';
  if (luhnSomewhere(value)) return 'número de cartão';
  if (/\b(senha|password|passwd|token|api[_ -]?key|secret)\s*[:=]\s*\S+/i.test(value)) return 'senha ou credencial';
  return null;
}

function luhnSomewhere(text: string): boolean {
  // Só o formato de cartão (4 grupos de 4 dígitos): telefone com DDI não cai aqui.
  for (const m of text.matchAll(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g)) {
    const digits = m[0].replace(/\D/g, '');
    let sum = 0;
    for (let i = 0; i < digits.length; i += 1) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    if (sum % 10 === 0) return true;
  }
  return false;
}
