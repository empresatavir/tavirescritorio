/**
 * Jornada de QA no navegador (processo separado, roda com ELECTRON_RUN_AS_NODE=1).
 * Percorre as páginas do app como um visitante, em 1440 px e 390 px, gravando vídeo,
 * trace e prints. Uso: node jornada.js <config.json>. Linhas "@@ texto" são progresso.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface JornadaConfig {
  baseUrl: string;
  outDir: string;
  maxPages: number;
  navTimeoutMs: number;
  /** Portão de design: só roda em projeto com contrato (design/DESIGN.md). Fontes vêm do bloco tokens. */
  design?: { fonts: string[] } | null;
}

export interface JornadaTest {
  suite: string;
  name: string;
  st: 'pass' | 'fail';
  dur: number;
  /** Segundos desde o início do vídeo do contexto (para recortar o GIF). */
  startS: number;
  endS: number;
  context: 'desktop' | 'mobile';
  url: string;
  shots: string[];
  err?: { msg: string; exp: string; rec: string; at: string; code: string };
}

export interface JornadaResult {
  ok: boolean;
  error?: string;
  browser: string;
  pages: string[];
  tests: JornadaTest[];
  videos: Record<'desktop' | 'mobile', string | null>;
  /** Segundos (relógio dos testes) em que o quadro magenta de calibração apareceu. */
  markS?: Partial<Record<'desktop' | 'mobile', number>>;
  traces: string[];
}

const progress = (text: string) => process.stdout.write(`@@ ${text}\n`);
const slug = (u: string) =>
  (u.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '') || '/')
    .replace(/^\/$/, 'inicio')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'inicio';
const pathOf = (u: string) => u.replace(/^https?:\/\/[^/]+/, '') || '/';

/** Quadro magenta no começo do vídeo: o QA acha esse quadro e alinha o vídeo ao relógio dos testes. */
async function paintMark(page: import('playwright-core').Page, t0: number): Promise<number> {
  await page.setContent('<html style="background:#ff00ff;height:100%"><body></body></html>');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const at = (Date.now() - t0) / 1000;
  await page.waitForTimeout(400);
  return at;
}

/** Rola a página até o fim e volta: o que entra na tela ao rolar aparece no print inteiro. */
async function settle(page: import('playwright-core').Page): Promise<void> {
  await page
    .evaluate(async () => {
      const step = Math.max(200, window.innerHeight - 80);
      for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 40; y += step, i++) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 110));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    })
    .catch(() => {});
}

async function main(): Promise<void> {
  const cfg: JornadaConfig = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = cfg.outDir;
  for (const d of ['prints', 'videos', 'traces']) fs.mkdirSync(path.join(out, d), { recursive: true });
  const { chromium } = require('playwright-core') as typeof import('playwright-core');
  const result: JornadaResult = { ok: true, browser: '', pages: [], tests: [], videos: { desktop: null, mobile: null }, traces: [] };
  const browser = await chromium.launch({ headless: true });
  result.browser = `Chromium ${browser.version()}`;
  const origin = new URL(cfg.baseUrl).origin;

  const record = async (
    ctxName: 'desktop' | 'mobile',
    t0: number,
    suite: string,
    name: string,
    url: string,
    body: (shots: string[]) => Promise<JornadaTest['err'] | null>,
  ) => {
    const start = Date.now();
    const shots: string[] = [];
    let err: JornadaTest['err'] | null = null;
    try {
      err = await body(shots);
    } catch (e: any) {
      err = { msg: 'A verificação quebrou', exp: 'Página responde e permite a checagem', rec: String(e?.message || e).split('\n')[0].slice(0, 300), at: pathOf(url), code: '' };
    }
    // Segura o estado na tela para o vídeo mostrar o resultado (falha fica mais tempo, com o destaque vermelho).
    await new Promise((r) => setTimeout(r, err ? 1400 : 450));
    const end = Date.now();
    result.tests.push({
      suite,
      name,
      st: err ? 'fail' : 'pass',
      dur: Math.round((end - start) / 100) / 10,
      startS: Math.max(0, (start - t0) / 1000),
      endS: Math.max(0, (end - t0) / 1000),
      context: ctxName,
      url,
      shots,
      ...(err ? { err } : {}),
    });
    progress(`${err ? '✗' : '✓'} ${suite} · ${name}`);
  };

  // ---------------- desktop ----------------
  progress('Abrindo o navegador em 1440 px');
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(out, 'videos'), size: { width: 1280, height: 800 } } });
  await desk.tracing.start({ screenshots: true, snapshots: true });
  const t0d = Date.now();
  const page = await desk.newPage();
  result.markS = { desktop: await paintMark(page, t0d) };
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e).slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) badResponses.push(`${r.status()} ${pathOf(r.url())}`); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) badResponses.push(`falhou ${pathOf(r.url())} (${r.failure()?.errorText || 'erro'})`); });

  const discovered: string[] = [];
  const statusOf = new Map<string, number>();
  const visit = async (url: string, shots: string[]): Promise<JornadaTest['err'] | null> => {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    badResponses.length = 0;
    const resp = await page.goto(url, { waitUntil: 'load', timeout: cfg.navTimeoutMs });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await settle(page);
    const file = `prints/desktop-${slug(url)}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    shots.push(file);
    const status = resp?.status() ?? 0;
    statusOf.set(url, status);
    const problems: string[] = [];
    if (!resp || status >= 400) problems.push(`HTTP ${status || 'sem resposta'}`);
    if (pageErrors.length) problems.push(`${pageErrors.length} erro(s) de JavaScript: ${pageErrors.slice(0, 2).join(' | ')}`);
    if (consoleErrors.length) problems.push(`${consoleErrors.length} erro(s) no console: ${consoleErrors.slice(0, 2).join(' | ')}`);
    if (badResponses.length) problems.push(`Recursos com falha: ${[...new Set(badResponses)].slice(0, 4).join(', ')}`);
    if (!problems.length) return null;
    return {
      msg: problems[0],
      exp: 'Página abre com HTTP 2xx, sem erro de JavaScript, sem erro no console e sem recurso quebrado',
      rec: problems.join('\n'),
      at: pathOf(url),
      code: `const resp = await page.goto('${pathOf(url)}');\nexpect(resp.status()).toBeLessThan(400);\nexpect(consoleErrors).toHaveLength(0);`,
    };
  };

  await record('desktop', t0d, 'Carregamento e navegação', 'Abre a página inicial', cfg.baseUrl, async (shots) => {
    const err = await visit(cfg.baseUrl, shots);
    const hrefs: string[] = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const h of hrefs) {
      if (!h.startsWith(origin)) continue;
      const clean = h.replace(/#.*$/, '');
      if (/\.(pdf|png|jpe?g|gif|svg|webp|zip|mp4|ico|xml|txt)$/i.test(clean)) continue;
      if (!discovered.includes(clean)) discovered.push(clean);
    }
    return err;
  });
  const pages = [cfg.baseUrl.replace(/#.*$/, ''), ...discovered.filter((u) => u !== cfg.baseUrl && u !== cfg.baseUrl + '/' && u + '/' !== cfg.baseUrl)].slice(0, cfg.maxPages);
  result.pages = pages.map(pathOf);
  for (const url of pages.slice(1)) {
    await record('desktop', t0d, 'Carregamento e navegação', `Abre ${pathOf(url)}`, url, (shots) => visit(url, shots));
  }

  await record('desktop', t0d, 'Carregamento e navegação', 'Links internos sem erro', cfg.baseUrl, async () => {
    const broken: string[] = [];
    for (const url of discovered.slice(0, 60)) {
      const r = await desk.request.get(url, { timeout: 15000, failOnStatusCode: false }).catch(() => null);
      if (!r || r.status() >= 400) broken.push(`${r ? r.status() : 'sem resposta'} ${pathOf(url)}`);
    }
    if (!broken.length) return null;
    return { msg: `${broken.length} link(s) interno(s) quebrado(s)`, exp: 'Todo link interno responde com 2xx ou 3xx', rec: broken.join('\n'), at: 'links da página inicial', code: "for (const url of links) expect((await request.get(url)).status()).toBeLessThan(400);" };
  });

  // Acessibilidade básica nas primeiras páginas
  // Página que já respondeu 4xx/5xx não passa pelas checagens seguintes (o erro já está registrado).
  const healthy = pages.filter((u) => (statusOf.get(u) ?? 200) < 400);
  for (const url of healthy.slice(0, 4)) {
    await page.goto(url, { waitUntil: 'load', timeout: cfg.navTimeoutMs }).catch(() => {});
    const a11y = await page.evaluate(() => {
      const nameOf = (el: Element) =>
        ((el as HTMLElement).innerText || '').trim() ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        (el.getAttribute('aria-labelledby') ? document.getElementById(el.getAttribute('aria-labelledby') || '')?.textContent?.trim() : '') ||
        Array.from(el.querySelectorAll('img[alt]')).map((i) => i.getAttribute('alt')).join('').trim() ||
        (el.querySelector('svg title')?.textContent || '').trim();
      const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const imgs = Array.from(document.querySelectorAll('img')).filter((i) => visible(i) && !i.hasAttribute('alt'));
      const unnamed = Array.from(document.querySelectorAll('button, a[href], [role="button"]')).filter((el) => visible(el) && !nameOf(el));
      const mark = (els: Element[], attr: string) => els.slice(0, 20).forEach((el) => el.setAttribute(attr, '1'));
      mark(imgs, 'data-tavir-qa');
      mark(unnamed, 'data-tavir-qa');
      const label = (el: Element) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 140);
      return {
        imgs: imgs.slice(0, 8).map(label),
        imgN: imgs.length,
        unnamed: unnamed.slice(0, 8).map(label),
        unnamedN: unnamed.length,
        title: document.title.trim(),
        lang: document.documentElement.getAttribute('lang') || '',
      };
    });
    const flagged = async (shots: string[], tag: string) => {
      await page.addStyleTag({ content: '[data-tavir-qa]{outline:3px solid #e5484d!important;outline-offset:2px!important}' });
      const file = `prints/a11y-${tag}-${slug(url)}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      shots.push(file);
    };
    await record('desktop', t0d, 'Acessibilidade básica', `Imagens com texto alternativo · ${pathOf(url)}`, url, async (shots) => {
      if (!a11y.imgN) return null;
      await flagged(shots, 'imagens');
      return { msg: `${a11y.imgN} imagem(ns) sem atributo alt`, exp: 'Toda <img> visível tem alt (vazio só se for decorativa)', rec: a11y.imgs.join('\n'), at: pathOf(url), code: "expect(await page.locator('img:not([alt])').count()).toBe(0);" };
    });
    await record('desktop', t0d, 'Acessibilidade básica', `Botões e links com nome · ${pathOf(url)}`, url, async (shots) => {
      if (!a11y.unnamedN) return null;
      await flagged(shots, 'nomes');
      return { msg: `${a11y.unnamedN} botão(ões) ou link(s) sem nome acessível`, exp: 'Botões e links têm texto, aria-label ou title', rec: a11y.unnamed.join('\n'), at: pathOf(url), code: "await expect(page.getByRole('button', { name: '' })).toHaveCount(0);" };
    });
    await record('desktop', t0d, 'Acessibilidade básica', `Título e idioma · ${pathOf(url)}`, url, async () => {
      const miss = [!a11y.title ? 'sem <title>' : '', !a11y.lang ? 'sem <html lang>' : ''].filter(Boolean);
      if (!miss.length) return null;
      return { msg: `Página ${miss.join(' e ')}`, exp: '<title> preenchido e <html lang="pt-BR"> (ou o idioma do site)', rec: `title="${a11y.title}" lang="${a11y.lang}"`, at: pathOf(url), code: "await expect(page).toHaveTitle(/.+/);\nexpect(await page.getAttribute('html', 'lang')).toBeTruthy();" };
    });
  }

  // ---------------- portão de design (só com contrato de design no projeto) ----------------
  if (cfg.design) {
    const SUITE = 'Design';
    const fonts = cfg.design.fonts || [];
    const shoot = async (shots: string[], tag: string, url: string) => {
      await page.addStyleTag({ content: '[data-tavir-qa]{outline:3px solid #e5484d!important;outline-offset:2px!important}' }).catch(() => {});
      const file = `prints/design-${tag}-${slug(url)}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      shots.push(file);
    };
    const open = async (url: string) => {
      await page.goto(url, { waitUntil: 'load', timeout: cfg.navTimeoutMs }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    };
    for (const url of healthy.slice(0, 3)) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(url);
      const probe = await page.evaluate((allowed: string[]) => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const ctx = cv.getContext('2d', { willReadFrequently: true })!;
        const rgba = (c: string): number[] => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000';
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        const lum = (c: number[]) => {
          const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
        };
        const over = (top: number[], bot: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
        const visible = (el: Element) => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.05;
        };
        // Fundo efetivo; null quando há imagem ou degradê no caminho (não dá para medir com segurança).
        const bgOf = (el: Element): number[] | null => {
          const stack: number[][] = [];
          for (let n: Element | null = el; n; n = n.parentElement) {
            const st = getComputedStyle(n);
            if (st.backgroundImage && st.backgroundImage !== 'none') return null;
            const c = rgba(st.backgroundColor);
            if (c[3] > 0) stack.push(c);
            if (c[3] >= 0.99) break;
          }
          let base = [255, 255, 255, 1];
          for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
          return base;
        };
        const label = (el: Element) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 130);
        const generic = /^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|cursive|fantasy|inherit|-apple-system|blinkmacsystemfont|segoe ui|arial|helvetica|helvetica neue|roboto|times new roman|times|georgia|courier new|menlo|consolas)$/;
        const want = allowed.map((f) => f.toLowerCase().trim());
        const low: Element[] = [];
        const lowNote: string[] = [];
        const offFont = new Map<string, Element>();
        const seen = new Set<Element>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        let count = 0;
        while ((node = walker.nextNode()) && count < 2000) {
          if (!node.nodeValue || node.nodeValue.trim().length < 2) continue;
          const el = node.parentElement;
          if (!el || seen.has(el)) continue;
          seen.add(el);
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName) || !visible(el)) continue;
          if (el.closest('[disabled],[aria-disabled="true"]')) continue;
          count += 1;
          const st = getComputedStyle(el);
          const family = (st.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase();
          if (want.length && family && !generic.test(family) && !/icon|symbol|awesome/.test(family) && !want.includes(family) && !offFont.has(family)) offFont.set(family, el);
          const bg = bgOf(el);
          if (!bg) continue;
          const fg = over(rgba(st.color), bg);
          const l1 = lum(fg);
          const l2 = lum(bg);
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          const size = parseFloat(st.fontSize);
          const need = size >= 24 || (size >= 18.66 && Number(st.fontWeight) >= 700) ? 3 : 4.5;
          if (ratio + 0.05 < need) {
            low.push(el);
            if (lowNote.length < 6) lowNote.push(`${ratio.toFixed(2)}:1 (mínimo ${need}:1) · ${label(el)}`);
          }
        }
        const emoji = Array.from(document.querySelectorAll('button, a[href], [role="button"], h1, h2, h3, label')).filter(
          (el) => visible(el) && /\p{Emoji_Presentation}/u.test((el as HTMLElement).innerText || ''),
        );
        const heads = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(visible);
        const h1 = heads.filter((h) => h.tagName === 'H1').length;
        const skips: string[] = [];
        let prev = 0;
        for (const h of heads) {
          const lv = Number(h.tagName[1]);
          if (prev && lv > prev + 1) skips.push(`h${prev} → h${lv}: ${((h as HTMLElement).innerText || '').trim().slice(0, 60)}`);
          prev = lv;
        }
        return {
          lowN: low.length,
          lowNote,
          emojiN: emoji.length,
          emojiNote: emoji.slice(0, 6).map(label),
          h1,
          skips: skips.slice(0, 6),
          fontNote: Array.from(offFont.entries()).slice(0, 6).map(([f, el]) => `${f} · ${label(el)}`),
          _: (() => {
            (window as any).__tvDesign = { low, emoji, font: Array.from(offFont.values()) };
            return 0;
          })(),
        };
      }, fonts);
      const mark = (kind: 'low' | 'emoji' | 'font') =>
        page.evaluate((k) => {
          document.querySelectorAll('[data-tavir-qa]').forEach((el) => el.removeAttribute('data-tavir-qa'));
          (((window as any).__tvDesign || {})[k] || []).slice(0, 20).forEach((el: Element) => el.setAttribute('data-tavir-qa', '1'));
        }, kind);
      await record('desktop', t0d, SUITE, `Conteúdo aparece depois de rolar · ${pathOf(url)}`, url, async (shots) => {
        await settle(page);
        const hidden = await page.evaluate(() => {
          let total = 0;
          let gone = 0;
          const items: string[] = [];
          const seen = new Set<Element>();
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const len = (node.nodeValue || '').trim().length;
            const el = node.parentElement;
            if (len < 2 || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'TITLE'].includes(el.tagName)) continue;
            const r = el.getBoundingClientRect();
            if (!(r.width > 0 && r.height > 0)) continue;
            // Menu, diálogo e conteúdo fechado de propósito não contam.
            if (el.closest('[hidden], [aria-hidden="true"], dialog:not([open]), details:not([open]), .sr-only, .visually-hidden')) continue;
            let opacity = 1;
            let top: Element = el;
            for (let n: Element | null = el; n; n = n.parentElement) {
              const o = Number(getComputedStyle(n).opacity);
              if (o < 1) { opacity *= o; top = n; }
            }
            total += len;
            if (opacity < 0.1) {
              gone += len;
              if (!seen.has(top)) {
                seen.add(top);
                top.setAttribute('data-tavir-qa', '1');
                if (items.length < 6) items.push(top.outerHTML.replace(/\s+/g, ' ').slice(0, 130));
              }
            }
          }
          return { total, gone, items };
        });
        if (!hidden.total || hidden.gone / hidden.total < 0.05) return null;
        await shoot(shots, 'invisivel', url);
        return { msg: `${Math.round((hidden.gone / hidden.total) * 100)}% do texto continua invisível depois de rolar a página`, exp: 'Todo conteúdo fica visível ao passar pela tela; animação de entrada não pode deixar seção em branco', rec: hidden.items.join('\n'), at: pathOf(url), code: '' };
      });
      await record('desktop', t0d, SUITE, `Contraste de texto AA · ${pathOf(url)}`, url, async (shots) => {
        if (!probe.lowN) return null;
        await mark('low');
        await shoot(shots, 'contraste', url);
        return { msg: `${probe.lowN} texto(s) com contraste abaixo do mínimo`, exp: 'Texto com 4,5:1 contra o fundo (3:1 em texto grande)', rec: probe.lowNote.join('\n'), at: pathOf(url), code: '// contraste medido no navegador, texto contra o fundo efetivo' };
      });
      await record('desktop', t0d, SUITE, `Sem clichês de modelo pronto · ${pathOf(url)}`, url, async (shots) => {
        const tells = await page.evaluate(() => {
          document.querySelectorAll('[data-tavir-qa]').forEach((el) => el.removeAttribute('data-tavir-qa'));
          const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const notes: string[] = [];
          // Título com texto em degradê.
          const gradText = Array.from(document.querySelectorAll('h1, h2, h3, span, p, a')).filter((el) => {
            const st = getComputedStyle(el) as CSSStyleDeclaration & { webkitBackgroundClip?: string };
            return visible(el) && /gradient/.test(st.backgroundImage) && (st.backgroundClip === 'text' || st.webkitBackgroundClip === 'text');
          });
          if (gradText.length) notes.push(`${gradText.length} texto(s) em degradê`);
          // Selo pequeno em caixa alta logo acima de título, repetido pela página.
          const eyebrows = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map((h) => h.previousElementSibling)
            .filter((el): el is Element => {
              if (!el || !visible(el) || el.children.length > 1) return false;
              const text = ((el as HTMLElement).innerText || '').trim();
              if (text.length < 2 || text.length > 40) return false;
              const st = getComputedStyle(el);
              const caps = st.textTransform === 'uppercase' || (text === text.toUpperCase() && /[A-ZÀ-Ú]/.test(text));
              return caps && parseFloat(st.fontSize) <= 14;
            });
          if (eyebrows.length >= 3) notes.push(`${eyebrows.length} selos em caixa alta acima de título`);
          const marked = [...gradText, ...(eyebrows.length >= 3 ? eyebrows : [])];
          marked.slice(0, 20).forEach((el) => el.setAttribute('data-tavir-qa', '1'));
          return { notes, items: marked.slice(0, 6).map((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 130)) };
        });
        if (!tells.notes.length) return null;
        await shoot(shots, 'cliches', url);
        return { msg: `Padrão de modelo pronto: ${tells.notes.join('; ')}`, exp: 'Hierarquia feita por tamanho, peso e posição; sem texto em degradê e sem selo em caixa alta repetido acima dos títulos', rec: tells.items.join('\n'), at: pathOf(url), code: '' };
      });
      await record('desktop', t0d, SUITE, `Sem emoji como ícone · ${pathOf(url)}`, url, async (shots) => {
        if (!probe.emojiN) return null;
        await mark('emoji');
        await shoot(shots, 'emoji', url);
        return { msg: `${probe.emojiN} botão(ões), link(s) ou título(s) com emoji`, exp: 'Ícone em SVG; emoji muda de desenho em cada sistema', rec: probe.emojiNote.join('\n'), at: pathOf(url), code: '' };
      });
      await record('desktop', t0d, SUITE, `Hierarquia de títulos · ${pathOf(url)}`, url, async () => {
        const miss = [probe.h1 === 1 ? '' : `${probe.h1} h1 visível(is)`, ...probe.skips].filter(Boolean);
        if (!miss.length) return null;
        return { msg: probe.h1 === 1 ? 'Títulos pulam nível' : `A página tem ${probe.h1} h1`, exp: 'Um só h1 e níveis em sequência (h1, h2, h3)', rec: miss.join('\n'), at: pathOf(url), code: "await expect(page.locator('h1')).toHaveCount(1);" };
      });
      if (fonts.length) {
        await record('desktop', t0d, SUITE, `Fontes dentro dos tokens · ${pathOf(url)}`, url, async (shots) => {
          if (!probe.fontNote.length) return null;
          await mark('font');
          await shoot(shots, 'fontes', url);
          return { msg: `${probe.fontNote.length} fonte(s) fora do contrato de design`, exp: `Só as fontes dos tokens: ${fonts.join(', ')}`, rec: probe.fontNote.join('\n'), at: pathOf(url), code: '' };
        });
      }
      await record('desktop', t0d, SUITE, `Foco visível no teclado · ${pathOf(url)}`, url, async (shots) => {
        await page.evaluate(() => {
          document.querySelectorAll('[data-tavir-qa]').forEach((el) => el.removeAttribute('data-tavir-qa'));
          const sig = (el: Element) => {
            const st = getComputedStyle(el);
            return [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.backgroundColor, st.borderColor, st.textDecorationLine, st.color].join('|');
          };
          const els = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).slice(0, 60);
          (window as any).__tvFocus = new Map(els.map((el) => [el, sig(el)]));
          (window as any).__tvSig = sig;
        });
        const same: string[] = [];
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(220);
          const hit = await page.evaluate(() => {
            const el = document.activeElement;
            const before = (window as any).__tvFocus as Map<Element, string>;
            if (!el || el === document.body || !before.has(el)) return '';
            if (before.get(el) !== (window as any).__tvSig(el)) return '';
            el.setAttribute('data-tavir-qa', '1');
            return el.outerHTML.replace(/\s+/g, ' ').slice(0, 130);
          });
          if (hit && !same.includes(hit)) same.push(hit);
        }
        if (!same.length) return null;
        await shoot(shots, 'foco', url);
        return { msg: `${same.length} controle(s) sem foco visível`, exp: 'Ao navegar com Tab, o controle em foco muda de aparência (contorno, sombra ou cor)', rec: same.join('\n'), at: pathOf(url), code: "await page.keyboard.press('Tab');" };
      });
      for (const width of [768, 1024]) {
        await record('desktop', t0d, SUITE, `Sem rolagem horizontal em ${width} px · ${pathOf(url)}`, url, async (shots) => {
          await page.setViewportSize({ width, height: 900 });
          await page.waitForTimeout(350);
          const over = await page.evaluate(() => ({ w: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
          if (over.sw <= over.w + 1) return null;
          const file = `prints/design-${width}-${slug(url)}.png`;
          await page.screenshot({ path: path.join(out, file), fullPage: true });
          shots.push(file);
          return { msg: `A página rola na horizontal em ${width} px (${over.sw} px de largura)`, exp: `Conteúdo cabe em ${over.w} px`, rec: `scrollWidth=${over.sw}`, at: pathOf(url), code: `await page.setViewportSize({ width: ${width}, height: 900 });` };
        });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    const first = healthy[0];
    if (first) {
      await record('desktop', t0d, SUITE, `Respeita movimento reduzido · ${pathOf(first)}`, first, async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(first);
        await page.waitForTimeout(700);
        const moving = await page.evaluate(() =>
          document.getAnimations().filter((a) => {
            const t = a.effect?.getComputedTiming();
            return a.playState === 'running' && !!t && (t.iterations === Infinity || Number(t.duration) > 400);
          }).length,
        );
        await page.emulateMedia({ reducedMotion: null });
        if (!moving) return null;
        return { msg: `${moving} animação(ões) seguem rodando com movimento reduzido`, exp: 'Com prefers-reduced-motion: reduce, animação longa ou em laço fica desligada', rec: `${moving} animação(ões) em execução`, at: pathOf(first), code: "await page.emulateMedia({ reducedMotion: 'reduce' });" };
      });
    }
  }
  await desk.tracing.stop({ path: path.join(out, 'traces', 'desktop.zip') });
  result.traces.push('traces/desktop.zip');
  const deskVideo = page.video();
  await desk.close();
  if (deskVideo) result.videos.desktop = path.relative(out, await deskVideo.path()).replace(/\\/g, '/');

  // ---------------- celular ----------------
  progress('Repetindo em 390 px (celular)');
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    recordVideo: { dir: path.join(out, 'videos'), size: { width: 390, height: 844 } },
  });
  await mob.tracing.start({ screenshots: true, snapshots: true });
  const t0m = Date.now();
  const mpage = await mob.newPage();
  result.markS = { ...result.markS, mobile: await paintMark(mpage, t0m) };
  for (const url of healthy.slice(0, 4)) {
    await record('mobile', t0m, 'Responsivo 390 px', `Sem rolagem horizontal · ${pathOf(url)}`, url, async (shots) => {
      await mpage.goto(url, { waitUntil: 'load', timeout: cfg.navTimeoutMs });
      await mpage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      const over = await mpage.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const wide = Array.from(document.body.querySelectorAll('*')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed';
        });
        const leaves = wide.filter((el) => !wide.some((o) => o !== el && el.contains(o))).slice(0, 12);
        leaves.forEach((el) => el.setAttribute('data-tavir-qa', '1'));
        return { w, sw, items: leaves.slice(0, 6).map((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 120)) };
      });
      if (over.sw > over.w + 1) await mpage.addStyleTag({ content: '[data-tavir-qa]{outline:3px solid #e5484d!important;outline-offset:-3px!important}' });
      await settle(mpage);
      const file = `prints/celular-${slug(url)}.png`;
      await mpage.screenshot({ path: path.join(out, file), fullPage: true });
      shots.push(file);
      if (over.sw <= over.w + 1) return null;
      return { msg: `A página rola na horizontal em 390 px (${over.sw} px de largura)`, exp: `Conteúdo cabe em ${over.w} px`, rec: over.items.join('\n') || `scrollWidth=${over.sw}`, at: pathOf(url), code: "await page.setViewportSize({ width: 390, height: 844 });\nexpect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);" };
    });
  }
  if (cfg.design) {
    for (const url of healthy.slice(0, 2)) {
      await record('mobile', t0m, 'Design', `Alvo de toque de 44 px · ${pathOf(url)}`, url, async (shots) => {
        await mpage.goto(url, { waitUntil: 'load', timeout: cfg.navTimeoutMs });
        await mpage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        const small = await mpage.evaluate(() => {
          const els = Array.from(document.querySelectorAll('button, [role="button"], a[href], select, textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')).filter((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            if (!(r.width > 0 && r.height > 0) || st.visibility === 'hidden') return false;
            // Link no meio de um parágrafo não é alvo isolado.
            const own = ((el as HTMLElement).innerText || '').trim().length;
            const around = ((el.parentElement as HTMLElement | null)?.innerText || '').trim().length;
            if (el.tagName === 'A' && st.display.startsWith('inline') && around > own + 20) return false;
            return r.width < 43 || r.height < 43;
          });
          els.slice(0, 20).forEach((el) => el.setAttribute('data-tavir-qa', '1'));
          return { n: els.length, items: els.slice(0, 6).map((el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}×${Math.round(r.height)} px · ${el.outerHTML.replace(/\s+/g, ' ').slice(0, 110)}`; }) };
        });
        if (!small.n) return null;
        await mpage.addStyleTag({ content: '[data-tavir-qa]{outline:3px solid #e5484d!important;outline-offset:2px!important}' });
        const file = `prints/design-toque-${slug(url)}.png`;
        await mpage.screenshot({ path: path.join(out, file), fullPage: true });
        shots.push(file);
        return { msg: `${small.n} controle(s) menores que 44 px no celular`, exp: 'Botão, campo e link isolado com pelo menos 44 × 44 px de área de toque', rec: small.items.join('\n'), at: pathOf(url), code: '' };
      });
    }
  }
  await mob.tracing.stop({ path: path.join(out, 'traces', 'celular.zip') });
  result.traces.push('traces/celular.zip');
  const mobVideo = mpage.video();
  await mob.close();
  if (mobVideo) result.videos.mobile = path.relative(out, await mobVideo.path()).replace(/\\/g, '/');
  await browser.close();
  result.ok = result.tests.every((t) => t.st === 'pass');
  fs.writeFileSync(path.join(out, 'jornada.json'), JSON.stringify(result, null, 2), 'utf8');
  progress('Jornada concluída');
}

if (require.main === module) {
  main().catch((err) => {
    const out = (() => {
      try {
        return JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).outDir;
      } catch {
        return null;
      }
    })();
    const failure: JornadaResult = { ok: false, error: String(err?.stack || err), browser: '', pages: [], tests: [], videos: { desktop: null, mobile: null }, traces: [] };
    if (out) fs.writeFileSync(path.join(out, 'jornada.json'), JSON.stringify(failure, null, 2), 'utf8');
    process.stderr.write(String(err?.stack || err));
    process.exit(1);
  });
}
