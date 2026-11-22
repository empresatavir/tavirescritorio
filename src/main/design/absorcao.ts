/**
 * Absorção de site (agente Kakashi): o Escritório abre o site num navegador próprio e mede o
 * que dá para medir, sem depender do motor: tokens, tipografia, seções, componentes e estados,
 * animações e transições (com duração, atraso e curva), o que acontece sozinho com o tempo,
 * o que aparece ao rolar, ao passar o mouse e ao clicar, e como muda em cada largura.
 *
 * Grava na pasta de trabalho: `absorcao.json` (tudo medido), `telas/` (prints) e `video/`
 * (gravação da sessão). O Kakashi lê isso e redige o dossiê; nada aqui é opinião.
 *
 * Mede e descreve. Não baixa imagem, fonte, texto nem código do site: o que vai para projeto
 * de cliente é a estrutura e o comportamento, refeitos com a marca do cliente.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DesignFamily } from '../../shared/design';
import { referencesRoot } from './kit';
import { referenceSlug } from './referencias';
import { looksLikeLogin, type RefCookie } from './sessao';

export const ABSORB_FILES = { data: 'absorcao.json', shots: 'telas', video: 'video', dossier: 'dossie.md', card: 'card.md' } as const;
/** Larguras medidas. A primeira é a principal (interações e vídeo). */
export const ABSORB_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'notebook', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'celular', width: 390, height: 844 },
] as const;
/** Seções obrigatórias do dossiê que o Kakashi redige. */
export const DOSSIER_SECTIONS = [
  'Resumo',
  'Estrutura',
  'Tokens',
  'Tipografia',
  'Componentes e estados',
  'Movimento',
  'Interações',
  'Tempos automáticos',
  'Responsivo',
  'Receita de reprodução',
  'Com a marca do cliente',
  'Não copiar',
  'Lacunas',
] as const;

const IDLE_MS = 8000;
const MAX_HOVER = 16;
const MAX_CLICK = 8;
const MAX_SCROLL_SHOTS = 14;

export interface AbsorbEvent {
  /** load | idle | scroll | hover | click */
  phase: string;
  /** animationstart | animationend | transitionstart | transitionend | mutation */
  type: string;
  /** Milissegundos desde o início da fase. */
  t: number;
  name: string;
  target: string;
  /** Duração informada pelo navegador, em ms (animationend/transitionend). */
  elapsed?: number;
}

export interface AbsorbResult {
  ok: boolean;
  error?: string;
  dir?: string;
  /** Avisos sobre o que não deu para medir (vão para «Lacunas»). */
  limits: string[];
  counts?: Record<string, number>;
}

export interface AbsorbOptions {
  url: string;
  dir: string;
  say?: (line: string) => void;
  registerKill?: (kill: () => void) => void;
  /** Cookies da sessão de referências para este site (design/sessao): a leitura entra logada. Nunca são gravados na pasta. */
  cookies?: RefCookie[];
  /** Substitui o navegador (testes). */
  browse?: (url: string, dir: string, say: (line: string) => void) => Promise<{ data: Record<string, unknown>; limits: string[] }>;
}

/** Roda dentro da página antes de qualquer script dela: registra animação, transição e mudança de DOM com o instante. */
const RECORDER = `(() => {
  if (window.__kk) return;
  const kk = (window.__kk = { phase: 'load', t0: performance.now(), events: [] });
  const hint = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };
  const seen = {};
  const push = (type, name, target, elapsed) => {
    if (kk.events.length >= 4000) return;
    const key = kk.phase + '|' + type + '|' + name + '|' + hint(target);
    seen[key] = (seen[key] || 0) + 1;
    if (seen[key] > 12) return;
    kk.events.push({ phase: kk.phase, type, t: Math.round(performance.now() - kk.t0), name: String(name || '').slice(0, 60), target: hint(target), elapsed });
  };
  for (const type of ['animationstart', 'animationend', 'animationiteration', 'transitionstart', 'transitionend']) {
    document.addEventListener(type, (e) => push(type, e.animationName || e.propertyName, e.target, e.elapsedTime ? Math.round(e.elapsedTime * 1000) : undefined), true);
  }
  const start = () => {
    new MutationObserver((list) => {
      const seen = new Set();
      for (const m of list) {
        const key = hint(m.target) + '|' + (m.type === 'attributes' ? m.attributeName : 'filhos');
        if (seen.has(key) || m.attributeName === 'data-kk') continue;
        seen.add(key);
        push('mutation', m.type === 'attributes' ? m.attributeName : 'filhos', m.target);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'aria-hidden', 'aria-expanded', 'data-state', 'data-active', 'hidden', 'open'] });
  };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  kk.setPhase = (p) => { kk.phase = p; kk.t0 = performance.now(); };
})();`;

/** Propriedades comparadas antes e depois de hover, foco e clique. */
const STATE_PROPS = ['color', 'backgroundColor', 'backgroundImage', 'borderColor', 'borderWidth', 'boxShadow', 'transform', 'opacity', 'textDecorationLine', 'outlineStyle', 'outlineColor', 'outlineWidth', 'outlineOffset', 'filter', 'letterSpacing', 'scale', 'translate'];

/**
 * Leitura estática da página. Roda no navegador: não pode usar nada de fora desta função.
 * Marca os elementos amostrados com `data-kk` para o lado do Node interagir com eles.
 */
function readPage(arg: { tag: boolean }): Record<string, any> {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const hex = (c: string): string => {
    if (!c || c === 'transparent') return '';
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    if (d[3] < 26) return '';
    const h = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    return d[3] < 250 ? `${h} @${Math.round((d[3] / 255) * 100)}%` : h;
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = (el: Element) => el.getBoundingClientRect();
  const visible = (el: Element) => {
    const r = rect(el);
    if (r.width < 1 || r.height < 1) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.01;
  };
  const hint = (el: Element | null): string => {
    if (!el) return '';
    const cls = (typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };
  const txt = (el: Element, n = 60) => ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, n);
  const px = (v: string) => Math.round(parseFloat(v) || 0);
  const tally = () => new Map<string, { n: number; sample: string }>();
  const add = (m: Map<string, { n: number; sample: string }>, k: string, w = 1, sample = '') => {
    if (!k) return;
    const cur = m.get(k);
    if (cur) cur.n += w;
    else m.set(k, { n: w, sample });
  };
  const top = (m: Map<string, { n: number; sample: string }>, n: number) =>
    Array.from(m.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([value, v]) => ({ value, n: Math.round(v.n), sample: v.sample }));

  // ---- folhas de estilo: variáveis, keyframes, media queries, fontes ----
  const cssVars: Record<string, string> = {};
  const keyframes: Array<{ name: string; css: string }> = [];
  const media = new Set<string>();
  const fontFaces: Array<Record<string, string>> = [];
  const blocked: string[] = [];
  const walkRules = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const anyRule = rule as any;
      if (rule.type === 7 || anyRule.constructor?.name === 'CSSKeyframesRule') {
        if (keyframes.length < 80) keyframes.push({ name: anyRule.name, css: String(rule.cssText).replace(/\s+/g, ' ').slice(0, 1400) });
      } else if (rule.type === 5 || anyRule.constructor?.name === 'CSSFontFaceRule') {
        const st = anyRule.style as CSSStyleDeclaration;
        const src = String(st.getPropertyValue('src') || '');
        const file = (/url\(["']?([^"')]+)/.exec(src)?.[1] || '').split('/').pop() || '';
        if (fontFaces.length < 40) fontFaces.push({ family: st.getPropertyValue('font-family').replace(/["']/g, ''), weight: st.getPropertyValue('font-weight'), style: st.getPropertyValue('font-style'), arquivo: file.split('?')[0].slice(0, 60), display: st.getPropertyValue('font-display') });
      } else if (anyRule.media && anyRule.cssRules) {
        media.add(String(anyRule.media.mediaText || anyRule.conditionText || '').slice(0, 120));
        walkRules(anyRule.cssRules);
      } else if (anyRule.cssRules && !anyRule.selectorText) {
        walkRules(anyRule.cssRules);
      } else if (anyRule.selectorText && /(^|,)\s*(:root|html|body)\s*(,|$)/.test(anyRule.selectorText)) {
        const st = anyRule.style as CSSStyleDeclaration;
        for (let i = 0; i < st.length; i += 1) {
          const prop = st[i];
          if (prop.startsWith('--') && Object.keys(cssVars).length < 160) cssVars[prop] = st.getPropertyValue(prop).trim().slice(0, 80);
        }
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRules(sheet.cssRules);
    } catch {
      if (sheet.href) blocked.push(sheet.href);
    }
  }

  // ---- cor, fonte, escala, espaçamento ----
  const fonts = tally();
  const textColor = tally();
  const bgColor = tally();
  const borderColor = tally();
  const gradients = tally();
  const scale = tally();
  const spacing = tally();
  const gaps = tally();
  const radii = tally();
  const shadows = tally();
  const transitions = tally();
  const animated: Array<Record<string, any>> = [];
  const sticky: Array<Record<string, any>> = [];
  const zIndex = new Set<number>();
  let chars = 0;
  let shadowRoots = 0;
  const all = Array.from(document.querySelectorAll('body *')).slice(0, 6000);
  for (const el of all) {
    if ((el as any).shadowRoot) shadowRoots += 1;
    if (!visible(el)) continue;
    const st = getComputedStyle(el);
    const r = rect(el);
    const area = r.width * r.height;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => (n.nodeValue || '').trim()).join(' ').trim();
    if (own.length > 1) {
      chars += own.length;
      const family = (st.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      add(fonts, `${family} ${st.fontWeight}`, own.length);
      add(textColor, hex(st.color), own.length, own.slice(0, 30));
      const ls = st.letterSpacing === 'normal' ? '0' : st.letterSpacing;
      add(scale, `${family} · ${px(st.fontSize)}px · peso ${st.fontWeight} · linha ${st.lineHeight === 'normal' ? 'normal' : px(st.lineHeight) + 'px'} · espaço ${ls}${st.textTransform !== 'none' ? ' · ' + st.textTransform : ''}`, 1, `${el.tagName.toLowerCase()}: ${own.slice(0, 40)}`);
    }
    if (area > 1600) {
      add(bgColor, hex(st.backgroundColor), area, hint(el));
      if (st.backgroundImage.includes('gradient')) add(gradients, st.backgroundImage.replace(/\s+/g, ' ').slice(0, 220), 1, hint(el));
      if (px(st.borderTopWidth) > 0 && st.borderTopStyle !== 'none') add(borderColor, `${px(st.borderTopWidth)}px ${st.borderTopStyle} ${hex(st.borderTopColor)}`, 1, hint(el));
      if (st.borderTopLeftRadius !== '0px') add(radii, st.borderTopLeftRadius, 1, hint(el));
      if (st.boxShadow !== 'none') add(shadows, st.boxShadow.replace(/\s+/g, ' ').slice(0, 160), 1, hint(el));
      for (const v of [st.paddingTop, st.paddingBottom, st.paddingLeft, st.paddingRight, st.marginTop, st.marginBottom]) if (px(v) > 0) add(spacing, `${px(v)}px`);
      if ((st.display.includes('flex') || st.display.includes('grid')) && px(st.rowGap || st.columnGap) > 0) add(gaps, `${px(st.rowGap)}px / ${px(st.columnGap)}px`, 1, hint(el));
    }
    if (st.transitionDuration && st.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) {
      add(transitions, `${st.transitionProperty} · ${st.transitionDuration} · ${st.transitionTimingFunction} · atraso ${st.transitionDelay}`.slice(0, 220), 1, hint(el));
    }
    if (st.animationName && st.animationName !== 'none' && animated.length < 60) {
      animated.push({ alvo: hint(el), texto: txt(el, 30), nome: st.animationName, duracao: st.animationDuration, atraso: st.animationDelay, curva: st.animationTimingFunction, repeticoes: st.animationIterationCount, direcao: st.animationDirection, preenchimento: st.animationFillMode, estado: st.animationPlayState });
    }
    if ((st.position === 'fixed' || st.position === 'sticky') && area > 2000 && sticky.length < 20) {
      sticky.push({ alvo: hint(el), posicao: st.position, topo: st.top, base: st.bottom, altura: Math.round(r.height), largura: Math.round(r.width), z: st.zIndex, fundo: hex(st.backgroundColor), desfoque: st.backdropFilter && st.backdropFilter !== 'none' ? st.backdropFilter : '' });
    }
    if (st.zIndex !== 'auto' && st.position !== 'static') zIndex.add(Number(st.zIndex));
  }

  // ---- animações vivas (Web Animations: pega também as feitas por biblioteca) ----
  const live: Array<Record<string, any>> = [];
  try {
    for (const a of (document as any).getAnimations().slice(0, 80)) {
      const eff = a.effect;
      const timing = eff && eff.getComputedTiming ? eff.getComputedTiming() : {};
      let frames: Array<Record<string, any>> = [];
      try {
        frames = eff && eff.getKeyframes ? eff.getKeyframes() : [];
      } catch {}
      const props = Array.from(new Set(frames.flatMap((f) => Object.keys(f)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k))));
      live.push({
        tipo: a.constructor?.name || '',
        nome: a.animationName || a.transitionProperty || a.id || '',
        alvo: hint(eff && eff.target),
        duracao: Math.round(Number(timing.duration) || 0),
        atraso: Math.round(Number(timing.delay) || 0),
        curva: timing.easing || '',
        repeticoes: timing.iterations === Infinity ? 'infinito' : timing.iterations,
        estado: a.playState,
        propriedades: props.slice(0, 8),
        quadros: frames.slice(0, 6).map((f) => `${Math.round(Number(f.computedOffset ?? f.offset ?? 0) * 100)}% ${props.slice(0, 4).map((p) => `${p}: ${String(f[p]).slice(0, 50)}`).join('; ')}${f.easing && f.easing !== 'linear' ? ` (${f.easing})` : ''}`),
      });
    }
  } catch {}

  // ---- seções, em ordem ----
  let root: Element = document.querySelector('main') || document.body;
  for (let i = 0; i < 6; i += 1) {
    const kids = Array.from(root.children).filter((c) => visible(c) && rect(c).height > 60);
    if (kids.length === 1 && rect(kids[0]).height > rect(root).height * 0.8) root = kids[0];
    else break;
  }
  const blocks: Element[] = [];
  const pushBlocks = (parent: Element) => {
    for (const c of Array.from(parent.children)) {
      if (!visible(c) || rect(c).height < 60 || rect(c).width < vw * 0.5) continue;
      blocks.push(c);
    }
  };
  if (root !== document.body) {
    for (const c of Array.from(document.body.children)) if ((c.tagName === 'HEADER' || c.tagName === 'NAV') && visible(c)) blocks.push(c);
  }
  pushBlocks(root);
  if (root !== document.body) {
    for (const c of Array.from(document.body.children)) if (c.tagName === 'FOOTER' && visible(c)) blocks.push(c);
  }
  const scrollY = window.scrollY;
  const sections = blocks.slice(0, 40).map((el, i) => {
    const st = getComputedStyle(el);
    const r = rect(el);
    const inner = el.querySelector(':scope > div, :scope > section') || el;
    let layoutEl: Element = el;
    for (let d = 0; d < 4; d += 1) {
      const lst = getComputedStyle(layoutEl);
      const kids = Array.from(layoutEl.children).filter(visible);
      if ((lst.display.includes('grid') || lst.display.includes('flex')) && kids.length > 1) break;
      if (kids.length === 1) layoutEl = kids[0];
      else break;
    }
    const lst = getComputedStyle(layoutEl);
    const kids = Array.from(layoutEl.children).filter(visible);
    const cols = new Set(kids.map((k) => Math.round(rect(k).left / 8))).size;
    const heading = el.querySelector('h1, h2, h3');
    if (arg.tag) el.setAttribute('data-kk-sec', String(i));
    return {
      n: i + 1,
      alvo: hint(el),
      titulo: heading ? `${heading.tagName.toLowerCase()}: ${txt(heading, 90)}` : '',
      y: Math.round(r.top + scrollY),
      altura: Math.round(r.height),
      fundo: hex(st.backgroundColor) || (st.backgroundImage !== 'none' ? st.backgroundImage.replace(/\s+/g, ' ').slice(0, 80) : ''),
      padding: `${px(st.paddingTop)} ${px(st.paddingRight)} ${px(st.paddingBottom)} ${px(st.paddingLeft)}`,
      larguraConteudo: Math.round(rect(inner).width),
      layout: `${lst.display}${lst.display.includes('grid') ? ` · colunas ${lst.gridTemplateColumns.split(' ').length}` : lst.display.includes('flex') ? ` · ${lst.flexDirection}` : ''} · ${kids.length} filho(s) em ${cols} coluna(s) · gap ${px(lst.rowGap)}/${px(lst.columnGap)}`,
      conteudo: {
        titulos: Array.from(el.querySelectorAll('h1, h2, h3, h4')).filter(visible).slice(0, 8).map((h) => `${h.tagName.toLowerCase()}: ${txt(h, 60)}`),
        paragrafos: el.querySelectorAll('p').length,
        botoes: Array.from(el.querySelectorAll('button, [role="button"], a[class*="btn"], a[class*="button"]')).filter(visible).slice(0, 6).map((b) => txt(b, 30)),
        links: el.querySelectorAll('a[href]').length,
        imagens: el.querySelectorAll('img, picture, svg[width]').length,
        videos: el.querySelectorAll('video').length,
        campos: el.querySelectorAll('input, select, textarea').length,
        caracteres: txt(el, 100000).length,
      },
    };
  });

  // ---- componentes, agrupados por assinatura de estilo ----
  let tagN = 0;
  const groups = new Map<string, Record<string, any>>();
  const consider = (el: Element, kind: string) => {
    if (!visible(el)) return;
    const st = getComputedStyle(el);
    const r = rect(el);
    const style = {
      fonte: `${(st.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim()} ${px(st.fontSize)}px/${st.fontWeight}`,
      cor: hex(st.color),
      fundo: hex(st.backgroundColor) || (st.backgroundImage !== 'none' ? 'imagem/degradê' : ''),
      borda: px(st.borderTopWidth) > 0 ? `${px(st.borderTopWidth)}px ${st.borderTopStyle} ${hex(st.borderTopColor)}` : '',
      raio: st.borderTopLeftRadius,
      padding: `${px(st.paddingTop)} ${px(st.paddingRight)} ${px(st.paddingBottom)} ${px(st.paddingLeft)}`,
      sombra: st.boxShadow === 'none' ? '' : st.boxShadow.replace(/\s+/g, ' ').slice(0, 120),
      caixa: st.textTransform !== 'none' ? st.textTransform : '',
      espacoLetra: st.letterSpacing === 'normal' ? '' : st.letterSpacing,
    };
    const key = kind + '|' + JSON.stringify(style);
    const cur = groups.get(key);
    if (cur) {
      cur.quantidade += 1;
      return;
    }
    let id = '';
    if (arg.tag && tagN < 60) {
      id = String(tagN);
      el.setAttribute('data-kk', id);
      tagN += 1;
    }
    groups.set(key, {
      tipo: kind,
      id,
      alvo: hint(el),
      texto: txt(el, 40),
      quantidade: 1,
      tamanho: `${Math.round(r.width)}x${Math.round(r.height)}`,
      estilo: style,
      transicao: st.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ? `${st.transitionProperty} · ${st.transitionDuration} · ${st.transitionTimingFunction}` : '',
      cursor: st.cursor,
    });
  };
  for (const el of Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')).slice(0, 300)) consider(el, 'botão');
  for (const el of Array.from(document.querySelectorAll('a[href]')).slice(0, 400)) {
    const st = getComputedStyle(el);
    const looksButton = hex(st.backgroundColor) !== '' || px(st.borderTopWidth) > 0;
    consider(el, looksButton ? 'botão (link)' : el.closest('nav, header') ? 'link de navegação' : el.closest('footer') ? 'link de rodapé' : 'link');
  }
  for (const el of Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')).slice(0, 80)) consider(el, 'campo');
  // Cartões: três ou mais irmãos com a mesma classe e algum tratamento de caixa.
  const cardParents = new Set<Element>();
  for (const el of all) {
    const p = el.parentElement;
    if (!p || cardParents.has(p) || !visible(el)) continue;
    const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
    if (!cls) continue;
    const same = Array.from(p.children).filter((c) => (c as HTMLElement).className === cls && visible(c));
    if (same.length < 3) continue;
    const r = rect(el);
    if (r.width < 140 || r.height < 80) continue;
    cardParents.add(p);
    const before = groups.size;
    consider(el, 'cartão');
    if (groups.size > before) {
      const g = Array.from(groups.values()).pop()!;
      g.quantidade = same.length;
      g.grade = `${same.length} itens · ${new Set(same.map((c) => Math.round(rect(c).left / 8))).size} coluna(s)`;
      g.dentro = { titulos: el.querySelectorAll('h2, h3, h4, h5').length, imagens: el.querySelectorAll('img, svg').length, paragrafos: el.querySelectorAll('p').length, acoes: el.querySelectorAll('a, button').length };
    }
    if (cardParents.size > 24) break;
  }
  const components = Array.from(groups.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 70);

  // ---- gatilhos de interação ----
  const triggers: Array<Record<string, any>> = [];
  const trigSel = '[aria-expanded], [aria-haspopup], [aria-controls], summary, [role="tab"], [data-state="closed"], [data-toggle], [data-bs-toggle]';
  for (const el of Array.from(document.querySelectorAll(trigSel)).filter(visible).slice(0, 40)) {
    const a = el as HTMLAnchorElement;
    const href = el.tagName === 'A' ? a.getAttribute('href') || '' : '';
    const safe = !href || href.startsWith('#') || href.startsWith('javascript');
    let id = '';
    if (arg.tag && safe && triggers.filter((t) => t.id).length < 12 && !(el as HTMLInputElement).form) {
      id = `t${triggers.length}`;
      el.setAttribute('data-kk-trig', id);
    }
    triggers.push({ id, alvo: hint(el), texto: txt(el, 40) || el.getAttribute('aria-label') || '', papel: el.getAttribute('role') || el.tagName.toLowerCase(), expandido: el.getAttribute('aria-expanded') || '', popup: el.getAttribute('aria-haspopup') || '', controla: el.getAttribute('aria-controls') || '', naNavegacao: !!el.closest('nav, header') });
  }

  // ---- navegação, formulários, mídia, bibliotecas ----
  const header = document.querySelector('header, [role="banner"], nav');
  const nav = header
    ? { alvo: hint(header), posicao: getComputedStyle(header).position, altura: Math.round(rect(header).height), fundo: hex(getComputedStyle(header).backgroundColor), links: Array.from(header.querySelectorAll('a[href]')).filter(visible).slice(0, 14).map((a) => txt(a, 24)).filter(Boolean), botoes: Array.from(header.querySelectorAll('button')).filter(visible).slice(0, 6).map((b) => txt(b, 24) || b.getAttribute('aria-label') || '(sem texto)') }
    : null;
  const forms = Array.from(document.querySelectorAll('form')).slice(0, 6).map((f) => ({
    alvo: hint(f),
    campos: Array.from(f.querySelectorAll('input:not([type="hidden"]), select, textarea')).slice(0, 14).map((i) => {
      const inp = i as HTMLInputElement;
      const label = (inp.id && document.querySelector(`label[for="${inp.id}"]`)) || inp.closest('label');
      return { tipo: inp.type || i.tagName.toLowerCase(), rotulo: label ? txt(label, 40) : inp.getAttribute('aria-label') || '', placeholder: inp.placeholder || '', obrigatorio: inp.required };
    }),
    enviar: Array.from(f.querySelectorAll('button, input[type="submit"]')).map((b) => txt(b, 30) || (b as HTMLInputElement).value || '').filter(Boolean).slice(0, 3),
  }));
  const imgs = Array.from(document.querySelectorAll('img'));
  const formats: Record<string, number> = {};
  for (const img of imgs) {
    const ext = (/\.(avif|webp|png|jpe?g|svg|gif)(\?|$)/i.exec(img.currentSrc || img.src)?.[1] || 'outro').toLowerCase();
    formats[ext] = (formats[ext] || 0) + 1;
  }
  const w = window as any;
  const libs: string[] = [];
  const has = (name: string, test: boolean) => { if (test) libs.push(name); };
  const scripts = Array.from(document.scripts).map((s) => s.src).join(' ');
  has('GSAP', !!w.gsap || /gsap/i.test(scripts));
  has('ScrollTrigger', !!w.ScrollTrigger);
  has('Lenis (rolagem suave)', !!w.Lenis || !!w.lenis || !!document.querySelector('.lenis, [data-lenis-prevent]'));
  has('Locomotive Scroll', !!w.LocomotiveScroll || !!document.querySelector('[data-scroll-container]'));
  has('Framer Motion / Framer', !!document.querySelector('[data-framer-name], [data-framer-component-type], [data-projection-id]'));
  has('Swiper', !!w.Swiper || !!document.querySelector('.swiper'));
  has('Splide', !!document.querySelector('.splide'));
  has('Embla', !!document.querySelector('[class*="embla"]'));
  has('Three.js', !!w.THREE || !!w.__THREE__);
  has('Lottie', !!w.lottie || !!document.querySelector('lottie-player, dotlottie-player, [data-lottie]'));
  has('AOS', !!w.AOS || !!document.querySelector('[data-aos]'));
  has('jQuery', !!w.jQuery);
  has('Alpine', !!w.Alpine || !!document.querySelector('[x-data]'));
  has('Next.js', !!w.__NEXT_DATA__ || !!document.querySelector('#__next, script[src*="/_next/"]'));
  has('Nuxt', !!w.__NUXT__);
  has('Astro', !!document.querySelector('astro-island, [data-astro-cid]'));
  has('Webflow', !!w.Webflow || !!document.querySelector('html[data-wf-site]'));
  has('Shopify', !!w.Shopify);
  has('WordPress', /wp-content|wp-includes/.test(scripts) || !!document.querySelector('link[href*="wp-content"]'));
  has('Elementor', !!document.querySelector('[class*="elementor-"]'));
  has('Radix UI', !!document.querySelector('[data-radix-collection-item], [data-radix-popper-content-wrapper], [id^="radix-"]'));
  has('Tailwind (classes utilitárias)', document.querySelectorAll('[class*="px-"][class*="py-"], [class*="md:"], [class*="lg:"]').length > 8);
  has('View Transitions', !!(document as any).startViewTransition && Array.from(document.styleSheets).some((s) => { try { return Array.from(s.cssRules).some((r) => /view-transition/.test(r.cssText)); } catch { return false; } }));
  const canvases = Array.from(document.querySelectorAll('canvas'));

  return {
    titulo: document.title.trim(),
    idioma: document.documentElement.lang || '',
    descricao: (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content?.slice(0, 200) || '',
    gerador: (document.querySelector('meta[name="generator"]') as HTMLMetaElement | null)?.content || '',
    janela: { largura: vw, altura: vh, alturaPagina: document.documentElement.scrollHeight, rolagemHorizontal: document.documentElement.scrollWidth > vw + 1 },
    variaveisCss: cssVars,
    cores: { texto: top(textColor, 8), fundo: top(bgColor, 10), borda: top(borderColor, 8), degrades: top(gradients, 6) },
    fontes: { uso: top(fonts, 10).map((f) => ({ ...f, parte: chars ? Math.round((f.n / chars) * 100) + '%' : '' })), arquivos: fontFaces },
    escalaTipografica: top(scale, 26),
    espacamento: { valores: top(spacing, 18), gaps: top(gaps, 10) },
    raios: top(radii, 8),
    sombras: top(shadows, 8),
    camadas: Array.from(zIndex).sort((a, b) => a - b).slice(-14),
    secoes: sections,
    componentes: components,
    navegacao: nav,
    fixos: sticky,
    formularios: forms,
    movimento: { keyframes, animadosAgora: animated, animacoesVivas: live, transicoes: top(transitions, 24) },
    gatilhos: triggers,
    mediaQueries: Array.from(media).filter(Boolean).slice(0, 60),
    midia: { imagens: imgs.length, formatos: formats, preguicosas: imgs.filter((i) => i.loading === 'lazy').length, videos: Array.from(document.querySelectorAll('video')).slice(0, 8).map((v) => ({ autoplay: v.autoplay, loop: v.loop, mudo: v.muted, controles: v.controls, tamanho: `${Math.round(rect(v).width)}x${Math.round(rect(v).height)}` })), svgsEmLinha: document.querySelectorAll('svg').length, canvas: canvases.length, iframes: Array.from(document.querySelectorAll('iframe')).slice(0, 8).map((f) => { try { return new URL(f.src).hostname; } catch { return '(sem endereço)'; } }) },
    bibliotecas: libs,
    naoLidos: { folhasBloqueadas: blocked.slice(0, 20), shadowRoots, canvas: canvases.length },
  };
}

/** Estado visual de um elemento marcado (roda no navegador). */
function readState(arg: { sel: string; props: string[] }): Record<string, string> | null {
  const el = document.querySelector(arg.sel);
  if (!el) return null;
  const st = getComputedStyle(el) as any;
  const out: Record<string, string> = {};
  for (const p of arg.props) out[p] = String(st[p] ?? '');
  return out;
}

/** O que está aberto por cima da página (roda no navegador). */
function readOverlays(): Array<Record<string, any>> {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out: Array<Record<string, any>> = [];
  const sel = 'dialog[open], [role="dialog"], [aria-modal="true"], [role="menu"], [role="listbox"], [role="tabpanel"], [data-state="open"], details[open] > :not(summary)';
  const seen = new Set<Element>();
  const consider = (el: Element, why: string) => {
    if (seen.has(el)) return;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) < 0.02) return;
    seen.add(el);
    const cls = (typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    out.push({ alvo: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''), tipo: why, papel: el.getAttribute('role') || '', posicao: st.position, caixa: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`, cobreTela: r.width >= vw * 0.95 && r.height >= vh * 0.95, fundo: st.backgroundColor, raio: st.borderTopLeftRadius, sombra: st.boxShadow === 'none' ? '' : st.boxShadow.slice(0, 120), desfoque: st.backdropFilter && st.backdropFilter !== 'none' ? st.backdropFilter : '', transicao: `${st.transitionProperty} · ${st.transitionDuration} · ${st.transitionTimingFunction}`, animacao: st.animationName !== 'none' ? `${st.animationName} · ${st.animationDuration} · ${st.animationTimingFunction}` : '', z: st.zIndex, texto: ((el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80) });
  };
  for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 40)) consider(el, 'painel');
  for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 5000)) {
    const st = getComputedStyle(el);
    if (st.position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width >= vw * 0.95 && r.height >= vh * 0.95) consider(el, 'fundo de modal');
  }
  return out.slice(0, 12);
}

/** Guarda quem está visível agora, para comparar depois de um clique (roda no navegador). */
function markVisible(): number {
  const set = new WeakSet<Element>();
  let n = 0;
  for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 8000)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width > 1 && r.height > 1 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.02) {
      set.add(el);
      n += 1;
    }
  }
  (window as any).__kkVis = set;
  return n;
}

/** Blocos que ficaram visíveis desde `markVisible` (roda no navegador). */
function newlyVisible(): Array<Record<string, any>> {
  const set: WeakSet<Element> | undefined = (window as any).__kkVis;
  if (!set) return [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fresh = new Set<Element>();
  for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 9000)) {
    if (set.has(el)) continue;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width > 1 && r.height > 1 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.02) fresh.add(el);
  }
  const out: Array<Record<string, any>> = [];
  for (const el of fresh) {
    if (el.parentElement && fresh.has(el.parentElement)) continue;
    const r = el.getBoundingClientRect();
    // Fora da tela é conteúdo da página que se mexe sozinho, não resposta ao clique.
    if (r.width * r.height < 3000 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const st = getComputedStyle(el);
    const cls = (typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    out.push({
      alvo: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
      papel: el.getAttribute('role') || '',
      posicao: st.position,
      caixa: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      cobreTela: r.width >= vw * 0.95 && r.height >= vh * 0.95,
      fundo: st.backgroundColor,
      raio: st.borderTopLeftRadius,
      sombra: st.boxShadow === 'none' ? '' : st.boxShadow.slice(0, 120),
      desfoque: st.backdropFilter && st.backdropFilter !== 'none' ? st.backdropFilter : '',
      transicao: st.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ? `${st.transitionProperty} · ${st.transitionDuration} · ${st.transitionTimingFunction}` : '',
      animacao: st.animationName !== 'none' ? `${st.animationName} · ${st.animationDuration} · ${st.animationTimingFunction}` : '',
      z: st.zIndex,
      itens: el.querySelectorAll('a, button, [role="menuitem"], [role="option"]').length,
      texto: ((el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    });
  }
  // Painel flutuante (fixo ou absoluto) primeiro; depois o maior.
  const float = (o: Record<string, any>) => (o.posicao === 'fixed' || o.posicao === 'absolute' ? 1 : 0);
  const area = (o: Record<string, any>) => { const m = /(\d+)x(\d+)$/.exec(o.caixa); return m ? Number(m[1]) * Number(m[2]) : 0; };
  out.sort((a, b) => float(b) - float(a) || area(b) - area(a));
  return out.slice(0, 5);
}

/** Layout resumido numa largura (roda no navegador). */
function readLayout(): Record<string, any> {
  const vw = window.innerWidth;
  const visible = (el: Element) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
  const size = (sel: string) => { const el = Array.from(document.querySelectorAll(sel)).find(visible); if (!el) return ''; const st = getComputedStyle(el); return `${Math.round(parseFloat(st.fontSize))}px/${st.fontWeight} linha ${st.lineHeight}`; };
  const header = document.querySelector('header, [role="banner"], nav');
  const navLinks = header ? Array.from(header.querySelectorAll('a[href]')).filter(visible).length : 0;
  const menuButton = header ? Array.from(header.querySelectorAll('button, [role="button"]')).filter(visible).some((b) => /menu|nav|abrir|open|hamb/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.className || '') + ' ' + (b.textContent || ''))) : false;
  const secs = Array.from(document.querySelectorAll('[data-kk-sec]')).map((el) => {
    let layoutEl: Element = el;
    for (let d = 0; d < 4; d += 1) {
      const kids = Array.from(layoutEl.children).filter(visible);
      const st = getComputedStyle(layoutEl);
      if ((st.display.includes('grid') || st.display.includes('flex')) && kids.length > 1) break;
      if (kids.length === 1) layoutEl = kids[0];
      else break;
    }
    const kids = Array.from(layoutEl.children).filter(visible);
    const st = getComputedStyle(el);
    return { n: Number(el.getAttribute('data-kk-sec')) + 1, visivel: visible(el), altura: Math.round(el.getBoundingClientRect().height), colunas: new Set(kids.map((k) => Math.round(k.getBoundingClientRect().left / 8))).size, padding: `${Math.round(parseFloat(st.paddingTop))} ${Math.round(parseFloat(st.paddingRight))} ${Math.round(parseFloat(st.paddingBottom))} ${Math.round(parseFloat(st.paddingLeft))}` };
  });
  return { largura: vw, alturaPagina: document.documentElement.scrollHeight, rolagemHorizontal: document.documentElement.scrollWidth > vw + 1, h1: size('h1'), h2: size('h2'), corpo: size('p'), navegacao: { linksVisiveis: navLinks, botaoDeMenu: menuButton, altura: header ? Math.round(header.getBoundingClientRect().height) : 0 }, secoes: secs };
}

/** Keyframes de folha de estilo que o navegador não deixa ler (outra origem): lê o texto e separa. */
export function keyframesFromCss(css: string, max = 40): Array<{ name: string; css: string }> {
  const out: Array<{ name: string; css: string }> = [];
  const re = /@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) && out.length < max) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    if (!out.some((k) => k.name === m![1])) out.push({ name: m[1], css: css.slice(m.index, i).replace(/\s+/g, ' ').slice(0, 1400) });
  }
  return out;
}

/** Larguras de quebra citadas nas media queries, em ordem. */
export function breakpointsOf(queries: string[]): number[] {
  const set = new Set<number>();
  for (const q of queries) for (const m of q.matchAll(/(?:min|max)-width:\s*([\d.]+)(px|em|rem)/g)) set.add(Math.round(Number(m[1]) * (m[2] === 'px' ? 1 : 16)));
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * O que se repete sozinho: mesmo alvo e mesmo nome, três vezes ou mais, com intervalo regular.
 * É assim que aparece o tempo de um carrossel, de um letreiro ou de um texto que troca.
 */
export function automaticCycles(events: AbsorbEvent[]): Array<{ alvo: string; o_que: string; vezes: number; intervaloMs: number }> {
  const by = new Map<string, number[]>();
  for (const e of events) {
    if (e.phase !== 'idle' || !/start|mutation|iteration/.test(e.type)) continue;
    const key = `${e.target}|${e.type === 'mutation' ? 'muda ' + e.name : e.name}`;
    by.set(key, (by.get(key) || []).concat(e.t));
  }
  const out: Array<{ alvo: string; o_que: string; vezes: number; intervaloMs: number }> = [];
  for (const [key, times] of by) {
    if (times.length < 3) continue;
    const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g > 80);
    if (gaps.length < 2) continue;
    const sorted = gaps.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const regular = gaps.filter((g) => Math.abs(g - median) <= median * 0.25).length >= gaps.length * 0.6;
    if (!regular) continue;
    const [alvo, what] = key.split('|');
    out.push({ alvo, o_que: what, vezes: times.length, intervaloMs: Math.round(median / 10) * 10 });
  }
  return out.sort((a, b) => b.vezes - a.vezes).slice(0, 20);
}

/** Resume os eventos de uma fase: quem animou, o quê, quando começou e quanto durou. */
export function summarizeEvents(events: AbsorbEvent[], phase: string, max = 40): Array<Record<string, any>> {
  const rows = new Map<string, Record<string, any>>();
  for (const e of events) {
    if (e.phase !== phase || e.type === 'mutation' || e.type === 'animationiteration') continue;
    const kind = e.type.startsWith('animation') ? 'animação' : 'transição';
    const key = `${e.target}|${kind}|${e.name}`;
    const row = rows.get(key) || { alvo: e.target, tipo: kind, nome: e.name, inicioMs: null as number | null, duracaoMs: null as number | null, vezes: 0 };
    if (e.type.endsWith('start')) {
      if (row.inicioMs === null) row.inicioMs = e.t;
      row.vezes += 1;
    } else if (e.elapsed) row.duracaoMs = e.elapsed;
    rows.set(key, row);
  }
  return Array.from(rows.values()).sort((a, b) => (a.inicioMs ?? 1e9) - (b.inicioMs ?? 1e9)).slice(0, max);
}

function diffState(before: Record<string, string> | null, after: Record<string, string> | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!before || !after) return out;
  for (const k of Object.keys(before)) if (before[k] !== after[k]) out[k] = `${before[k].slice(0, 70)} → ${after[k].slice(0, 70)}`;
  return out;
}

async function browseSite(url: string, dir: string, say: (line: string) => void, registerKill?: (kill: () => void) => void, cookies: RefCookie[] = []): Promise<{ data: Record<string, unknown>; limits: string[] }> {
  const { chromium } = require('playwright-core') as typeof import('playwright-core');
  const limits: string[] = [];
  const shots = path.join(dir, ABSORB_FILES.shots);
  const videoDir = path.join(dir, ABSORB_FILES.video);
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  registerKill?.(() => { browser.close().catch(() => {}); });
  const shot = (page: import('playwright-core').Page, name: string, full = false) =>
    page.screenshot({ path: path.join(shots, name), type: 'jpeg', quality: 72, fullPage: full }).catch(() => { limits.push(`Print ${name} não saiu.`); });
  const events = async (page: import('playwright-core').Page): Promise<AbsorbEvent[]> => (await page.evaluate('window.__kk ? window.__kk.events : []').catch(() => [])) as AbsorbEvent[];
  const phase = (page: import('playwright-core').Page, p: string) => page.evaluate(`window.__kk && window.__kk.setPhase(${JSON.stringify(p)})`).catch(() => {});
  try {
    const main = ABSORB_VIEWPORTS[0];
    const ctx = await browser.newContext({ viewport: { width: main.width, height: main.height }, recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } } });
    await ctx.addInitScript(RECORDER);
    if (cookies.length) await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    say(cookies.length ? 'Abrindo o site com a sessão de referências' : 'Abrindo o site');
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    const status = resp ? resp.status() : 0;
    if (looksLikeLogin(page.url(), url)) {
      throw new Error(cookies.length
        ? 'o site levou para a tela de login: a sessão de referências venceu ou não vale para esta página. Entre de novo em «Sessão de referências» e repita.'
        : 'o site pede login. Entre nele em «Sessão de referências» (Fábrica › etapa de design) e repita.');
    }
    if (status >= 400) limits.push(`O site respondeu ${status}: pode ter barrado a leitura automática; confira os prints antes de confiar nas medidas.`);
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const finalUrl = page.url();
    await shot(page, 'desktop-dobra.jpg');

    say('Medindo tokens, seções e componentes');
    const data = (await page.evaluate(readPage, { tag: true })) as Record<string, any>;

    // Folhas de outra origem: o navegador não entrega as regras, então lê o texto.
    const blocked: string[] = data.naoLidos?.folhasBloqueadas || [];
    let recovered = 0;
    for (const href of blocked.slice(0, 8)) {
      try {
        const res = await ctx.request.get(href, { timeout: 12000 });
        if (!res.ok()) continue;
        const css = await res.text();
        for (const k of keyframesFromCss(css)) if (!data.movimento.keyframes.some((x: any) => x.name === k.name)) data.movimento.keyframes.push(k);
        for (const m of css.matchAll(/@media\s*([^{]{3,120})\{/g)) if (!data.mediaQueries.includes(m[1].trim())) data.mediaQueries.push(m[1].trim());
        recovered += 1;
      } catch {}
    }
    if (blocked.length > recovered) limits.push(`${blocked.length - recovered} folha(s) de estilo de outra origem não puderam ser lidas: pode faltar keyframe ou media query.`);
    data.quebras = breakpointsOf(data.mediaQueries || []);

    say(`Observando ${IDLE_MS / 1000} s sem tocar em nada`);
    await phase(page, 'idle');
    await page.waitForTimeout(IDLE_MS);
    const afterIdle = await events(page);

    say('Rolando a página');
    await phase(page, 'scroll');
    const total = Number(data.janela?.alturaPagina) || main.height;
    const step = Math.round(main.height * 0.6);
    const steps = Math.min(60, Math.ceil(Math.max(0, total - main.height) / step));
    const every = Math.max(1, Math.ceil((steps + 1) / MAX_SCROLL_SHOTS));
    const headerSel = data.navegacao?.alvo ? 'header, [role="banner"], nav' : '';
    const headerProps = ['backgroundColor', 'boxShadow', 'height', 'backdropFilter', 'borderBottomColor', 'paddingTop', 'transform', 'opacity'];
    const headerTop = headerSel ? await page.evaluate(readState, { sel: headerSel, props: headerProps }).catch(() => null) : null;
    let frames = 0;
    for (let i = 1; i <= steps; i += 1) {
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(650);
      if (i % every === 0 && frames < MAX_SCROLL_SHOTS) {
        frames += 1;
        await shot(page, `rolagem-${String(frames).padStart(2, '0')}.jpg`);
      }
    }
    const headerScrolled = headerSel ? await page.evaluate(readState, { sel: headerSel, props: headerProps }).catch(() => null) : null;
    await page.waitForTimeout(600);
    const afterScroll = await events(page);
    await shot(page, 'desktop-inteira.jpg', true);
    await page.evaluate('window.scrollTo(0, 0)');
    await page.waitForTimeout(500);

    say('Passando o mouse e o foco pelos componentes');
    await phase(page, 'hover');
    const states: Array<Record<string, any>> = [];
    const samples = (data.componentes as Array<Record<string, any>>).filter((c) => c.id !== '' && c.tipo !== 'campo').slice(0, MAX_HOVER);
    for (const c of samples) {
      const sel = `[data-kk="${c.id}"]`;
      const loc = page.locator(sel).first();
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
        const before = await page.evaluate(readState, { sel, props: STATE_PROPS });
        await loc.hover({ timeout: 2000, force: true });
        await page.waitForTimeout(520);
        const hover = diffState(before, await page.evaluate(readState, { sel, props: STATE_PROPS }));
        await page.mouse.move(2, 2);
        await page.waitForTimeout(260);
        const calm = await page.evaluate(readState, { sel, props: STATE_PROPS });
        await loc.focus({ timeout: 1500 }).catch(() => {});
        const focus = diffState(calm, await page.evaluate(readState, { sel, props: STATE_PROPS }));
        await page.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur()').catch(() => {});
        c.hover = Object.keys(hover).length ? hover : 'sem mudança medida';
        c.foco = Object.keys(focus).length ? focus : 'sem mudança medida';
        states.push({ alvo: c.alvo, texto: c.texto, hover: c.hover, foco: c.foco });
      } catch {
        c.hover = 'não deu para alcançar';
      }
    }
    for (const c of (data.componentes as Array<Record<string, any>>).filter((x) => x.tipo === 'campo' && x.id !== '').slice(0, 4)) {
      const sel = `[data-kk="${c.id}"]`;
      try {
        const before = await page.evaluate(readState, { sel, props: STATE_PROPS });
        await page.locator(sel).first().focus({ timeout: 1500 });
        await page.waitForTimeout(300);
        const focus = diffState(before, await page.evaluate(readState, { sel, props: STATE_PROPS }));
        c.foco = Object.keys(focus).length ? focus : 'sem mudança medida';
        await page.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur()').catch(() => {});
      } catch {}
    }
    const afterHover = await events(page);

    say('Abrindo menus, abas e modais');
    await phase(page, 'click');
    const opened: Array<Record<string, any>> = [];
    const trigs = (data.gatilhos as Array<Record<string, any>>).filter((t) => t.id).slice(0, MAX_CLICK);
    let shotN = 0;
    for (const t of trigs) {
      const sel = `[data-kk-trig="${t.id}"]`;
      try {
        const loc = page.locator(sel).first();
        await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
        const before = (await page.evaluate(readOverlays)) as Array<Record<string, any>>;
        await page.evaluate(markVisible);
        const mark = (await events(page)).length;
        await loc.click({ timeout: 2500 });
        await page.waitForTimeout(900);
        if (page.url() !== finalUrl) {
          limits.push(`O gatilho «${t.texto || t.alvo}» levou para outra página; os gatilhos seguintes não foram testados.`);
          await page.goBack({ waitUntil: 'load', timeout: 20000 }).catch(() => {});
          break;
        }
        const after = (await page.evaluate(readOverlays)) as Array<Record<string, any>>;
        const overlays = after.filter((a) => !before.some((b) => b.alvo === a.alvo && b.caixa === a.caixa));
        const appeared = (await page.evaluate(newlyVisible)) as Array<Record<string, any>>;
        const fresh = overlays.length ? overlays : appeared;
        const expanded = await page.evaluate((s2: string) => document.querySelector(s2)?.getAttribute('aria-expanded') || '', sel).catch(() => '');
        const evs = (await events(page)).slice(mark).filter((e) => e.type !== 'mutation');
        shotN += 1;
        const file = `interacao-${String(shotN).padStart(2, '0')}.jpg`;
        await shot(page, file);
        opened.push({ gatilho: t.texto || t.alvo, alvo: t.alvo, papel: t.papel, expandidoDepois: expanded, abriu: fresh, apareceu: overlays.length ? appeared.slice(0, 3) : [], movimento: summarizeEvents(evs.map((e) => ({ ...e, phase: 'click', t: e.t })), 'click', 10), print: `${ABSORB_FILES.shots}/${file}`, fechaComEsc: false });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(450);
        const still = ((await page.evaluate(newlyVisible)) as Array<Record<string, any>>).length + ((await page.evaluate(readOverlays)) as Array<Record<string, any>>).filter((c) => overlays.some((f) => f.alvo === c.alvo && f.caixa === c.caixa)).length;
        opened[opened.length - 1].fechaComEsc = fresh.length > 0 && still === 0;
        if (fresh.length > 0 && still > 0) {
          await loc.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(400);
        }
      } catch {
        opened.push({ gatilho: t.texto || t.alvo, alvo: t.alvo, erro: 'não deu para clicar' });
      }
    }
    const allEvents = await events(page);
    await ctx.close();
    try {
      const vids = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
      if (vids[0]) fs.renameSync(path.join(videoDir, vids[0]), path.join(videoDir, 'sessao.webm'));
    } catch {}

    say('Medindo nas outras larguras');
    const responsive: Array<Record<string, any>> = [];
    for (const vp of ABSORB_VIEWPORTS) {
      const mobile = vp.width < 500;
      const c2 = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: mobile, hasTouch: mobile });
      if (cookies.length) await c2.addCookies(cookies);
      const p2 = await c2.newPage();
      try {
        await p2.goto(finalUrl, { waitUntil: 'load', timeout: 45000 });
        await p2.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await p2.waitForTimeout(1200);
        await p2.evaluate(readPage, { tag: true });
        responsive.push({ nome: vp.name, ...((await p2.evaluate(readLayout)) as Record<string, any>) });
        if (vp.name !== 'desktop') {
          await shot(p2, `${vp.name}-dobra.jpg`);
          await p2.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
          await p2.waitForTimeout(700);
          await p2.evaluate('window.scrollTo(0, 0)');
          await p2.waitForTimeout(300);
          await shot(p2, `${vp.name}-inteira.jpg`, true);
        }
      } catch {
        limits.push(`Não deu para medir em ${vp.width} px.`);
      }
      await c2.close();
    }

    if (data.naoLidos?.canvas) limits.push(`${data.naoLidos.canvas} canvas na página: o que é desenhado dentro dele (3D, partículas, WebGL) não foi medido, só aparece nos prints e no vídeo.`);
    if (data.naoLidos?.shadowRoots) limits.push(`${data.naoLidos.shadowRoots} componente(s) com shadow DOM: o interior não foi medido.`);
    if ((data.midia?.iframes || []).length) limits.push(`Conteúdo em iframe (${(data.midia.iframes as string[]).join(', ')}) não foi medido.`);
    if ((data.bibliotecas || []).some((l: string) => /GSAP|Lenis|Locomotive|Three|Framer/.test(l))) limits.push('Há animação controlada por JavaScript: a duração e a curva exatas de parte dela não estão na folha de estilo; o que foi observado está em «movimento» e o resto só no vídeo.');
    if (allEvents.length >= 4000) limits.push('O registro de eventos encheu (4.000): movimentos do fim da sessão podem ter ficado de fora.');
    limits.push(cookies.length
      ? 'Lido com a sessão de referências (conta do Carlos): o conteúdo pode ser de área paga ou restrita. Só a página do endereço informado foi lida; páginas internas e fluxo depois de enviar formulário ficaram de fora.'
      : 'Só a página do endereço informado foi lida: páginas internas, área logada e fluxo depois de enviar formulário ficaram de fora.');
    data.comSessao = cookies.length > 0;
    limits.push('Aviso de cookies, se havia, não foi fechado: pode aparecer nos prints.');

    data.url = url;
    data.urlFinal = finalUrl;
    data.resposta = status;
    data.capturadoEm = new Date().toISOString();
    data.cabecalhoAoRolar = diffState(headerTop, headerScrolled);
    data.movimento.aoCarregar = summarizeEvents(allEvents, 'load', 140);
    data.movimento.aoRolar = summarizeEvents(afterScroll, 'scroll', 60);
    data.movimento.sozinho = automaticCycles(afterIdle);
    data.movimento.semTocar = summarizeEvents(afterIdle, 'idle', 30);
    data.movimento.aoPassarMouse = summarizeEvents(afterHover, 'hover', 40);
    data.estados = states;
    data.interacoes = opened;
    data.responsivo = responsive;
    data.arquivos = { prints: fs.readdirSync(shots).sort(), video: fs.existsSync(path.join(videoDir, 'sessao.webm')) ? `${ABSORB_FILES.video}/sessao.webm` : '' };
    data.lacunas = limits;
    return { data, limits };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Abre o site, mede e grava `absorcao.json`, `telas/` e `video/` em `dir`. */
export async function absorbSite(opts: AbsorbOptions): Promise<AbsorbResult> {
  const say = opts.say || (() => {});
  if (!/^https?:\/\//i.test(opts.url)) return { ok: false, error: 'Informe o endereço completo do site (https://…).', limits: [] };
  fs.mkdirSync(opts.dir, { recursive: true });
  try {
    const { data, limits } = opts.browse ? await opts.browse(opts.url, opts.dir, say) : await browseSite(opts.url, opts.dir, say, opts.registerKill, opts.cookies || []);
    fs.writeFileSync(path.join(opts.dir, ABSORB_FILES.data), JSON.stringify(data, null, 1), 'utf8');
    const d = data as Record<string, any>;
    const counts = {
      secoes: (d.secoes || []).length,
      componentes: (d.componentes || []).length,
      keyframes: (d.movimento?.keyframes || []).length,
      transicoes: (d.movimento?.transicoes || []).length,
      aoRolar: (d.movimento?.aoRolar || []).length,
      ciclos: (d.movimento?.sozinho || []).length,
      interacoes: (d.interacoes || []).length,
      prints: (d.arquivos?.prints || []).length,
    };
    say(`Medido: ${counts.secoes} seções, ${counts.componentes} componentes, ${counts.keyframes} keyframes, ${counts.interacoes} interações, ${counts.prints} prints`);
    return { ok: true, dir: opts.dir, limits, counts };
  } catch (err) {
    return { ok: false, dir: opts.dir, limits: [], error: `Não deu para abrir ${opts.url}: ${String((err as Error)?.message || err).split('\n')[0].slice(0, 200)}` };
  }
}

/** Seções do dossiê que faltam ou estão vazias. Lista vazia = dossiê completo. */
export function dossierGaps(text: string | null | undefined): string[] {
  const body = String(text || '');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const heads = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => ({ title: norm(m[1]), at: m.index || 0, end: (m.index || 0) + m[0].length }));
  const gaps: string[] = [];
  for (const section of DOSSIER_SECTIONS) {
    const i = heads.findIndex((h) => h.title.startsWith(norm(section)));
    if (i < 0) { gaps.push(section); continue; }
    if (body.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].at : body.length).trim().length < 40) gaps.push(section);
  }
  return gaps;
}

export interface PublishOptions {
  /** Pasta de trabalho com absorcao.json, dossie.md e telas/. */
  from: string;
  url: string;
  family: DesignFamily;
  niche?: string;
  slug?: string;
  /** padrao | conceito | ambos: para qual modo de design a referência serve (proposta do Kakashi). */
  mode?: string;
  root?: string;
}

/**
 * Leva a absorção para a biblioteca de referências, como rascunho. Só entra no kit dos agentes
 * depois que o Carlos troca `status` para `validado`. Não sobrescreve referência já validada.
 */
export function publishAbsorption(opts: PublishOptions): { ok: boolean; dir?: string; error?: string } {
  const slug = (opts.slug || referenceSlug(opts.url)).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const dir = path.join(referencesRoot(opts.root), opts.family, slug);
  const cardFile = path.join(dir, ABSORB_FILES.card);
  try {
    if (/^status:\s*validado\s*$/m.test(fs.readFileSync(cardFile, 'utf8'))) return { ok: false, dir, error: `A referência ${opts.family}/${slug} já está validada. Absorva com outro nome para não sobrescrever.` };
  } catch {}
  const dossier = path.join(opts.from, ABSORB_FILES.dossier);
  if (!fs.existsSync(dossier)) return { ok: false, error: 'O dossiê (dossie.md) não foi gravado.' };
  let data: Record<string, any> = {};
  try {
    data = JSON.parse(fs.readFileSync(path.join(opts.from, ABSORB_FILES.data), 'utf8'));
  } catch {}
  fs.mkdirSync(path.join(dir, ABSORB_FILES.shots), { recursive: true });
  fs.copyFileSync(dossier, path.join(dir, ABSORB_FILES.dossier));
  if (fs.existsSync(path.join(opts.from, ABSORB_FILES.data))) fs.copyFileSync(path.join(opts.from, ABSORB_FILES.data), path.join(dir, ABSORB_FILES.data));
  try {
    for (const f of fs.readdirSync(path.join(opts.from, ABSORB_FILES.shots))) fs.copyFileSync(path.join(opts.from, ABSORB_FILES.shots, f), path.join(dir, ABSORB_FILES.shots, f));
  } catch {}
  const title = String(data.titulo || opts.url).replace(/"/g, "'").slice(0, 90);
  const mode = /^(padrao|conceito|ambos)$/.test(String(opts.mode || '')) ? opts.mode : 'ambos';
  fs.writeFileSync(
    cardFile,
    `---
titulo: "${title}"
url: ${opts.url}
familia: ${opts.family}
nicho: ${opts.niche || '—'}
modo: ${mode}
capturado: ${String(data.capturadoEm || new Date().toISOString()).slice(0, 10)}
origem: absorção (Kakashi)
status: rascunho
---

# Referência — ${title}

Absorção completa nesta pasta:
- \`${ABSORB_FILES.dossier}\`: o dossiê (estrutura, tokens, componentes, movimento, interações, tempos e a receita para refazer com a marca do cliente).
- \`${ABSORB_FILES.data}\`: tudo o que o Escritório mediu no navegador.
- \`${ABSORB_FILES.shots}/\`: prints em 1440, 1024, 768 e 390 px, da rolagem e de cada interação.

Para liberar aos agentes, confira o dossiê contra os prints e troque \`status: rascunho\` por \`status: validado\` no topo.
Estrutura e comportamento podem ser refeitos; imagem, logo, texto e código deste site não vão para projeto de cliente.
`,
    'utf8',
  );
  return { ok: true, dir };
}
