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
      const file = `prints/celular-${slug(url)}.png`;
      await mpage.screenshot({ path: path.join(out, file), fullPage: true });
      shots.push(file);
      if (over.sw <= over.w + 1) return null;
      return { msg: `A página rola na horizontal em 390 px (${over.sw} px de largura)`, exp: `Conteúdo cabe em ${over.w} px`, rec: over.items.join('\n') || `scrollWidth=${over.sw}`, at: pathOf(url), code: "await page.setViewportSize({ width: 390, height: 844 });\nexpect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);" };
    });
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
