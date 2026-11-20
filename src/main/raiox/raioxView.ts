/**
 * Leitura interna do caso: transforma o relatório da análise (dados do caso + arquivos de
 * `analise/`) e os documentos .md numa página HTML legível, aberta numa janela do próprio app.
 * Tudo fica na pasta do caso (fora do git). Nenhum conteúdo é enviado para fora.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BrowserWindow, shell } from 'electron';
import { RAIOX_GAPS, RAIOX_FRONTS, type RaioxCase, type RaioxEvidence } from '../../shared/raiox';
import { raioxView } from './raioxRules';
import { caseDir } from './raioxStore';
import { RaioxError } from './raioxRules';

const STAGE_LABEL: Record<string, string> = { encontrar: 'Encontrar', conversar: 'Conversar', atender: 'Atender', vender: 'Vender', medir: 'Medir' };
const CLASS_LABEL: Record<string, string> = { observado: 'Observado', informado: 'Informado', inferido: 'Inferido', indisponivel: 'Indisponível' };
const REVIEW_LABEL: Record<string, string> = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
const MAX_FILE = 400 * 1024;

export function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(url: string): string | null {
  const u = url.trim();
  return /^https?:\/\//i.test(u) || /^mailto:/i.test(u) ? u : null;
}

function inline(text: string): string {
  // Código em linha primeiro, para não formatar o que está dentro dele.
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_m, code) => {
    codes.push(`<code>${esc(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  const links: string[] = [];
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const ok = safeHref(href);
    links.push(ok ? `<a href="${esc(ok)}">${esc(label)}</a>` : esc(label));
    return `\u0001${links.length - 1}\u0001`;
  });
  s = s.replace(/https?:\/\/[^\s<>()]+/g, (url) => {
    links.push(`<a href="${esc(url)}">${esc(url)}</a>`);
    return `\u0001${links.length - 1}\u0001`;
  });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|\s)_([^_\s][^_]*)_(?=\s|$|[.,;:!?])/g, '$1<em>$2</em>');
  s = s.replace(/\u0001(\d+)\u0001/g, (_m, i) => links[Number(i)]);
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
}

/** Markdown suficiente para os documentos do Raio-X: títulos, listas, tabelas, citações e código. */
export function mdToHtml(md: string): string {
  const lines = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = Math.min(h[1].length + 1, 6);
      out.push(`<h${level}>${inline(h[2].replace(/\s+#+\s*$/, ''))}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>',
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${mdToHtml(body.join('\n'))}</blockquote>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) item += ' ' + lines[i++].trim();
        const task = /^\[( |x|X)\]\s+/.exec(item);
        items.push(task ? `<li class="task">${task[1] === ' ' ? '☐' : '☑'} ${inline(item.slice(task[0].length))}</li>` : `<li>${inline(item)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush();
  return out.join('\n');
}

const CSS = `
:root{--ink:#0B1220;--cloud:#F4F6F2;--lime:#C6F24E;--flow:#2BB3A3;--warn:#E0A526;--danger:#D9534F;--muted:#6B7280;--line:#E3E6E0;--card:#FFFFFF}
*{box-sizing:border-box}
body{margin:0;background:var(--cloud);color:#1A2230;font:15px/1.6 "Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
header{background:var(--ink);color:#EEF2EA;padding:28px 48px 24px}
header .eyebrow{font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--lime)}
header h1{margin:10px 0 4px;font-size:28px;line-height:1.2}
header p{margin:0;color:#B9C2B4}
nav.toc{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--line);padding:10px 48px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px}
nav.toc a{color:#334;text-decoration:none}nav.toc a:hover{color:var(--flow)}
main{max-width:1080px;margin:0 auto;padding:28px 48px 64px;overflow-wrap:anywhere}
html,body{overflow-x:hidden}pre{white-space:pre-wrap}
h2{font-size:21px;margin:34px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--line)}
h3{font-size:17px;margin:24px 0 8px}h4,h5,h6{font-size:15px;margin:18px 0 6px}
a{color:#137a6f}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:8px 0 8px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.kpi b{display:block;font-size:24px}.kpi span{color:var(--muted);font-size:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0}
.ev{display:grid;grid-template-columns:1fr auto;gap:6px 12px}
.ev .src{font-weight:600}.ev .meta{grid-column:1/-1;color:var(--muted);font-size:12px}
.badge{display:inline-block;font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;padding:4px 8px;border-radius:999px;border:1px solid var(--line);white-space:nowrap}
.b-observado{background:#E4F6F3;border-color:#BFE7E1;color:#0F6B61}.b-inferido{background:#FDF3DE;border-color:#F1D9A0;color:#8A5B00}
.b-indisponivel{background:#FBE7E6;border-color:#F0C3C1;color:#9C2B27}.b-informado{background:#EEF0F3;color:#444}
.b-aprovada{background:#E4F6F3;color:#0F6B61}.b-rejeitada{background:#FBE7E6;color:#9C2B27}.b-pendente{background:#FDF3DE;color:#8A5B00}
.bar{height:8px;background:var(--line);border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:var(--flow)}
.cov{display:grid;grid-template-columns:110px 1fr 70px;gap:10px;align-items:center;margin:6px 0;font-size:13px}
.tbl{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px;background:#fff}
th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}th{background:#F0F2EE}
blockquote{margin:12px 0;padding:8px 16px;border-left:4px solid var(--flow);background:#fff}
pre{background:#0F1726;color:#DDE6D8;padding:12px 14px;border-radius:10px;overflow:auto;font-size:12.5px}
code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.9em}p code,li code{background:#E9ECE6;padding:1px 5px;border-radius:5px}
.doc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:8px 28px 20px;margin:14px 0}
.muted{color:var(--muted)}.task{list-style:none;margin-left:-18px}
@media print{nav.toc{display:none}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function page(title: string, eyebrow: string, lead: string, body: string, toc: { id: string; label: string }[] = []): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: file:">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(lead)}</p></header>
${toc.length ? `<nav class="toc">${toc.map((t) => `<a href="#${esc(t.id)}">${esc(t.label)}</a>`).join('')}</nav>` : ''}
<main>${body}</main></body></html>`;
}

function gapLabel(id: string): string {
  return RAIOX_GAPS.find((g) => g.id === id)?.label || id;
}
function frontLabel(id?: string): string {
  return (id && RAIOX_FRONTS.find((f) => f.id === id)?.label) || id || '';
}

function evidenceCard(ev: RaioxEvidence, index: number): string {
  const url = ev.artifact?.url ? safeHref(ev.artifact.url) : null;
  const meta = [
    STAGE_LABEL[ev.stage] || ev.stage,
    ev.front ? frontLabel(ev.front) : '',
    (ev.gapIds || []).map(gapLabel).join(', '),
    ev.author === 'dora' ? 'sugerida pela análise' : 'registrada por Carlos',
  ].filter(Boolean).join(' · ');
  return `<div class="card ev" id="ev-${index + 1}">
<div><span class="src">${esc(ev.source)}</span>${url ? ` · <a href="${esc(url)}">abrir fonte</a>` : ''}</div>
<div><span class="badge b-${esc(ev.classification)}">${esc(CLASS_LABEL[ev.classification] || ev.classification)}</span> <span class="badge b-${esc(ev.review)}">${esc(REVIEW_LABEL[ev.review] || ev.review)}</span></div>
<div style="grid-column:1/-1">${inline(ev.claim)}</div>
${ev.note ? `<div class="meta">Nota: ${esc(ev.note)}</div>` : ''}
<div class="meta">${esc(meta)}</div></div>`;
}

function listAnalysisFiles(dir: string): string[] {
  const base = path.join(dir, 'analise');
  const found: string[] = [];
  const walk = (folder: string, depth: number) => {
    if (depth > 3) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (/\.md$/i.test(entry.name)) found.push(full);
    }
  };
  walk(base, 0);
  return found.sort();
}

/** Relatório interno da análise: o que a Dora sugeriu, o que o Carlos aprovou e o material coletado. */
export function analysisReportHtml(c: RaioxCase, dir: string): string {
  const view = raioxView(c);
  const evidence = c.evidence || [];
  const byReview = (r: string) => evidence.filter((ev) => ev.review === r).length;
  const toc = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'hipoteses', label: 'Hipóteses' },
    { id: 'evidencias', label: 'Evidências' },
    { id: 'material', label: 'Material coletado' },
  ];
  const parts: string[] = [];
  parts.push(`<h2 id="resumo">Resumo</h2>
<div class="card"><p><b>Objetivo:</b> ${esc(c.objective)}</p><p><b>Decisão a destravar:</b> ${esc(c.decisionNeeded)}</p>
${c.frontier ? `<p><b>O que esta rodada olha:</b> ${esc(c.frontier)}</p>` : ''}
${c.publicLink && safeHref(c.publicLink) ? `<p><b>Link público:</b> <a href="${esc(c.publicLink)}">${esc(c.publicLink)}</a></p>` : ''}</div>
<div class="kpis">
<div class="kpi"><b>${evidence.length}</b><span>evidências no caso</span></div>
<div class="kpi"><b>${byReview('pendente')}</b><span>aguardando sua revisão</span></div>
<div class="kpi"><b>${byReview('aprovada')}</b><span>aprovadas</span></div>
<div class="kpi"><b>${view.confidence.ratio}%</b><span>das utilizáveis foram observadas</span></div>
</div>
<div class="card">${view.coverage.map((row) => {
    const w = row.total ? Math.round((row.usable / Math.max(1, row.total)) * 100) : 0;
    return `<div class="cov"><span>${esc(row.label)}</span><div class="bar"><i style="width:${w}%"></i></div><span class="muted">${row.usable}/${row.total}</span></div>`;
  }).join('')}<p class="muted" style="font-size:12px;margin:6px 0 0">Aprovadas utilizáveis / total de evidências por etapa.</p></div>`);
  if (c.priority) {
    parts.push(`<div class="card"><b>Prioridade escolhida:</b> ${esc(STAGE_LABEL[c.priority.stage] || c.priority.stage)} · ${esc(gapLabel(c.priority.gapId))}<p>${esc(c.priority.bottleneck)}</p><p class="muted">${esc(c.priority.rationale)}</p></div>`);
  }
  parts.push('<h2 id="hipoteses">Hipóteses</h2>');
  if (!c.hypotheses?.length) parts.push('<p class="muted">A análise ainda não levantou hipóteses.</p>');
  for (const h of c.hypotheses || []) {
    const refs = h.evidenceIds.map((id) => evidence.findIndex((ev) => ev.id === id)).filter((n) => n >= 0);
    parts.push(`<div class="card"><span class="badge">${esc(h.id)}</span> <b>${esc(gapLabel(h.gapId))}</b><p>${inline(h.text)}</p>${refs.length ? `<p class="muted" style="font-size:12px">Apoiada em: ${refs.map((n) => `<a href="#ev-${n + 1}">evidência ${n + 1}</a>`).join(', ')}</p>` : ''}</div>`);
  }
  parts.push('<h2 id="evidencias">Evidências por etapa</h2>');
  if (!evidence.length) parts.push('<p class="muted">Nenhuma evidência registrada.</p>');
  for (const stage of Object.keys(STAGE_LABEL)) {
    const list = evidence.map((ev, index) => ({ ev, index })).filter((item) => item.ev.stage === stage);
    if (!list.length) continue;
    parts.push(`<h3>${esc(STAGE_LABEL[stage])} <span class="muted" style="font-weight:400;font-size:13px">${list.length}</span></h3>`);
    parts.push(list.map((item) => evidenceCard(item.ev, item.index)).join(''));
  }
  parts.push('<h2 id="material">Material coletado na análise</h2>');
  const files = listAnalysisFiles(dir);
  if (!files.length) parts.push('<p class="muted">A análise não deixou notas em texto na pasta <code>analise/</code>.</p>');
  for (const file of files) {
    let md = '';
    try {
      const stat = fs.statSync(file);
      md = stat.size > MAX_FILE ? fs.readFileSync(file, 'utf8').slice(0, MAX_FILE) + '\n\n_(arquivo cortado)_' : fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(dir, file).split(path.sep).join('/');
    parts.push(`<div class="doc"><p class="muted" style="font-size:12px;margin-top:14px"><code>${esc(rel)}</code></p>${mdToHtml(md)}</div>`);
  }
  return page(c.company, `Raio-X · ${c.id} · relatório interno`, 'Leitura do que a análise encontrou. Uso interno: nada aqui foi aprovado para o cliente sem a sua revisão.', parts.join('\n'), toc);
}

export function documentHtml(c: RaioxCase, title: string, md: string): string {
  return page(title, `Raio-X · ${c.id} · ${c.company}`, 'Documento gerado pela redação. Confira antes de aprovar.', `<div class="doc">${mdToHtml(md)}</div>`);
}

const windows = new Map<string, BrowserWindow>();

/** Grava a página em `<caso>/_leitura/` e abre numa janela do app. Links externos vão para o navegador. */
export async function openReader(root: string, id: string, key: string, title: string, html: string): Promise<{ ok: true }> {
  const dir = caseDir(root, id);
  const folder = path.join(dir, '_leitura');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${key.replace(/[^a-z0-9-]/gi, '_')}.html`);
  fs.writeFileSync(file, html, 'utf8');
  const winKey = `${id}:${key}`;
  let win = windows.get(winKey);
  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      width: 1180,
      height: 860,
      title,
      autoHideMenuBar: true,
      backgroundColor: '#F4F6F2',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, javascript: false },
    });
    const opened = win;
    windows.set(winKey, opened);
    opened.on('closed', () => windows.delete(winKey));
    const external = (url: string) => {
      if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) void shell.openExternal(url);
    };
    opened.webContents.setWindowOpenHandler(({ url }) => {
      external(url);
      return { action: 'deny' };
    });
    opened.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('file:') && url.split('#')[0] === opened.webContents.getURL().split('#')[0]) return;
      event.preventDefault();
      external(url);
    });
  }
  await win.loadFile(file);
  win.setTitle(title);
  win.show();
  win.focus();
  return { ok: true };
}

export function assertInside(dir: string, relative: string): string {
  const full = path.resolve(dir, relative);
  const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
  if (!full.startsWith(prefix) || !fs.existsSync(full)) throw new RaioxError('Documento não encontrado.');
  return full;
}
