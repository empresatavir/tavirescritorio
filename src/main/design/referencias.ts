/**
 * Biblioteca de referências de design: o Carlos indica o site, o Escritório captura as telas
 * e mede o que dá para medir (fontes, cores, escala, seções). O card nasce como rascunho e só
 * entra no kit dos agentes depois que o Carlos troca `status` para `validado`.
 *
 * Fica em `conhecimento/design/referencias/<familia>/<slug>/`. As imagens são de terceiros:
 * servem de consulta local e não entram no git.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DesignFamily } from '../../shared/design';
import { referencesRoot } from './kit';

export interface ReferenceMeasures {
  url: string;
  title: string;
  capturedAt: string;
  fonts: Array<{ family: string; share: number }>;
  colors: { background: string[]; text: string[]; accent: string[] };
  type: { h1: string; h2: string; body: string };
  sections: number;
  firstViewport: { headline: string; actions: string[] };
  maxWidth: number;
}

export interface CaptureOptions {
  url: string;
  family: DesignFamily;
  slug?: string;
  niche?: string;
  root?: string;
  /** Substitui a captura no navegador (testes). */
  measure?: (url: string, dir: string) => Promise<ReferenceMeasures>;
}

export function referenceSlug(url: string): string {
  let host = url;
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, '') + u.pathname;
  } catch {}
  return host.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'referencia';
}

/** Card em rascunho: fatos medidos preenchidos, julgamento em branco para quem valida. */
export function referenceCard(m: ReferenceMeasures, family: DesignFamily, niche: string): string {
  const list = (xs: string[]) => (xs.length ? xs.join(', ') : '—');
  return `---
titulo: "${m.title.replace(/"/g, "'").slice(0, 90) || m.url}"
url: ${m.url}
familia: ${family}
nicho: ${niche || '—'}
capturado: ${m.capturedAt.slice(0, 10)}
status: rascunho
---

# Referência — ${m.title.slice(0, 90) || m.url}

Telas: \`desktop.jpg\` (1440 px) e \`celular.jpg\` (390 px), nesta pasta.

## Medido pelo Escritório

- Primeira tela: "${m.firstViewport.headline || '—'}" · ações: ${list(m.firstViewport.actions)}
- Fontes: ${m.fonts.length ? m.fonts.map((f) => `${f.family} (${Math.round(f.share * 100)}%)`).join(', ') : '—'}
- Escala: h1 ${m.type.h1 || '—'} · h2 ${m.type.h2 || '—'} · corpo ${m.type.body || '—'}
- Fundos: ${list(m.colors.background)}
- Texto: ${list(m.colors.text)}
- Acento (botões e links): ${list(m.colors.accent)}
- Seções na página: ${m.sections} · largura do conteúdo: ${m.maxWidth || '—'} px

## Leitura (preencher antes de validar)

- Família de layout:
- Densidade (1 a 10):
- Material (chapado, vidro, papel, bruto, sombra suave):
- Movimento que comunica hierarquia:
- O que aproveitar da estrutura:
- O que não copiar (asset, logo, texto, foto):
- Serve para qual tipo de projeto:

Para liberar aos agentes, troque \`status: rascunho\` por \`status: validado\` no topo.
Estrutura pode inspirar; imagem, logo e texto deste site não vão para projeto de cliente.
`;
}

async function measureInBrowser(url: string, dir: string): Promise<ReferenceMeasures> {
  const { chromium } = require('playwright-core') as typeof import('playwright-core');
  const browser = await chromium.launch({ headless: true });
  try {
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desk.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.screenshot({ path: path.join(dir, 'desktop.jpg'), type: 'jpeg', quality: 70 });
    const data = await page.evaluate(() => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      const hex = (c: string): string => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        if (d[3] < 128) return '';
        return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      };
      const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const top = (m: Map<string, number>, n: number) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
      const add = (m: Map<string, number>, k: string, w = 1) => { if (k) m.set(k, (m.get(k) || 0) + w); };
      const fonts = new Map<string, number>();
      const text = new Map<string, number>();
      const bg = new Map<string, number>();
      const accent = new Map<string, number>();
      let chars = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      let n = 0;
      while ((node = walker.nextNode()) && n < 3000) {
        const len = (node.nodeValue || '').trim().length;
        const el = node.parentElement;
        if (len < 2 || !el || !visible(el)) continue;
        n += 1;
        const st = getComputedStyle(el);
        add(fonts, (st.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim(), len);
        add(text, hex(st.color), len);
        chars += len;
      }
      for (const el of Array.from(document.querySelectorAll('body, main, section, header, footer, div')).slice(0, 1500)) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < 40000) continue;
        add(bg, hex(getComputedStyle(el).backgroundColor), r.width * r.height);
      }
      for (const el of Array.from(document.querySelectorAll('button, [role="button"], a[href]')).filter(visible).slice(0, 200)) {
        const st = getComputedStyle(el);
        add(accent, hex(st.backgroundColor) || (el.tagName === 'A' ? hex(st.color) : ''));
      }
      const sizeOf = (sel: string) => {
        const el = Array.from(document.querySelectorAll(sel)).find(visible);
        if (!el) return '';
        const st = getComputedStyle(el);
        return `${Math.round(parseFloat(st.fontSize))}px/${st.fontWeight}`;
      };
      const fold = window.innerHeight;
      const inFold = (el: Element) => { const r = el.getBoundingClientRect(); return visible(el) && r.top < fold && r.bottom > 0; };
      const headline = Array.from(document.querySelectorAll('h1, h2')).find(inFold) as HTMLElement | undefined;
      const actions = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((el) => inFold(el) && !el.closest('nav, header'))
        .map((el) => ((el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' '))
        .filter((t) => t && t.length < 40);
      const main = document.querySelector('main') || document.body;
      const widths = Array.from(main.querySelectorAll('section > div, main > div, .container, [class*="container"], [class*="wrapper"]'))
        .filter(visible)
        .map((el) => Math.round(el.getBoundingClientRect().width))
        .filter((w) => w < window.innerWidth - 20 && w > 480);
      return {
        title: document.title.trim(),
        fonts: top(fonts, 4).map(([family, c]) => ({ family, share: chars ? c / chars : 0 })),
        text: top(text, 3).map(([c]) => c),
        bg: top(bg, 4).map(([c]) => c),
        accent: top(accent, 3).map(([c]) => c),
        type: { h1: sizeOf('h1'), h2: sizeOf('h2'), body: sizeOf('p') },
        sections: Array.from(document.querySelectorAll('section, main > div')).filter(visible).length,
        headline: (headline?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 140),
        actions: Array.from(new Set(actions)).slice(0, 4),
        maxWidth: widths.length ? Math.max(...widths) : 0,
      };
    });
    await desk.close();
    const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mpage = await mob.newPage();
    await mpage.goto(url, { waitUntil: 'load', timeout: 45000 });
    await mpage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await mpage.screenshot({ path: path.join(dir, 'celular.jpg'), type: 'jpeg', quality: 70 });
    await mob.close();
    return {
      url,
      title: data.title,
      capturedAt: new Date().toISOString(),
      fonts: data.fonts,
      colors: { background: data.bg, text: data.text, accent: data.accent },
      type: data.type,
      sections: data.sections,
      firstViewport: { headline: data.headline, actions: data.actions },
      maxWidth: data.maxWidth,
    };
  } finally {
    await browser.close();
  }
}

/** Captura um site para a biblioteca. Não sobrescreve um card que o Carlos já validou. */
export async function captureReference(opts: CaptureOptions): Promise<{ ok: boolean; dir?: string; error?: string }> {
  if (!/^https?:\/\//i.test(opts.url)) return { ok: false, error: 'Informe a URL completa (https://…).' };
  const slug = (opts.slug || referenceSlug(opts.url)).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const dir = path.join(referencesRoot(opts.root), opts.family, slug);
  const cardFile = path.join(dir, 'card.md');
  try {
    if (/^status:\s*validado\s*$/m.test(fs.readFileSync(cardFile, 'utf8'))) {
      return { ok: false, dir, error: `A referência ${opts.family}/${slug} já está validada. Use outro nome (--slug) para capturar de novo.` };
    }
  } catch {}
  fs.mkdirSync(dir, { recursive: true });
  try {
    const measures = await (opts.measure || measureInBrowser)(opts.url, dir);
    fs.writeFileSync(path.join(dir, 'medidas.json'), JSON.stringify(measures, null, 2), 'utf8');
    fs.writeFileSync(cardFile, referenceCard(measures, opts.family, opts.niche || ''), 'utf8');
    return { ok: true, dir };
  } catch (err) {
    return { ok: false, dir, error: `Não deu para capturar ${opts.url}: ${String((err as Error)?.message || err).split('\n')[0].slice(0, 200)}` };
  }
}
