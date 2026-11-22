/**
 * Protótipo de validação: o Escritório abre o arquivo num navegador sem rede, clica nos
 * controles e mede. O contrato e a conferência (pura) ficam em `src/shared/prototipo.ts`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { emptyPrototypeFacts, prototypeCriteria, prototypeGaps, PROTO_FILES, type PrototypeFacts } from '../shared/prototipo';

const at = (workspace: string, rel: string) => path.join(workspace, ...rel.split('/'));
const read = (file: string) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

export const prototypePagePath = (workspace: string) => at(workspace, PROTO_FILES.page);
export const hasPrototype = (workspace: string) => fs.existsSync(prototypePagePath(workspace));
export const readPrototypeNotes = (workspace: string) => read(at(workspace, PROTO_FILES.notes));
export const projectPrototypeCriteria = (workspace: string) => prototypeCriteria(readPrototypeNotes(workspace));

/** Script que roda na página: lê os controles e o que está à vista fora da faixa. */
const PROBE = String.raw`(() => {
  const all = (sel) => Array.from(document.querySelectorAll(sel));
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const bar = document.querySelector('[data-proto="controle"]');
  const flat = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const barText = flat(bar ? bar.innerText : '');
  // Texto à vista fora da faixa: esconde a faixa só para ler.
  const keep = bar ? bar.style.display : '';
  if (bar) bar.style.display = 'none';
  const seen = document.body.innerText.replace(/\s+/g, ' ').trim();
  if (bar) bar.style.display = keep;
  return {
    drawn: document.body.innerText.trim().length > 0,
    control: !!bar,
    disclaimer: /nao faz parte do produto/.test(barText),
    fictitious: /fictici/.test(barText),
    states: all('[data-proto-estado]').map((e) => e.getAttribute('data-proto-estado')),
    alternatives: all('[data-proto-alternativa]').map((e) => e.getAttribute('data-proto-alternativa')),
    versions: all('[data-proto-versao]').map((e) => e.getAttribute('data-proto-versao')),
    points: all('[data-proto-ponto]').map((e) => Number(e.getAttribute('data-proto-ponto'))).filter((n) => Number.isFinite(n) && n > 0),
    marks: all('[data-proto-marca]').filter(vis).map((e) => Number(e.getAttribute('data-proto-marca'))),
    supportToggle: !!document.querySelector('[data-proto="apoio"]'),
    screen: seen,
  };
})()`;

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Abre o protótipo e mede. Não lança: o que der errado vai em `errors`. */
export async function measurePrototype(workspace: string): Promise<PrototypeFacts> {
  const facts = emptyPrototypeFacts();
  const file = prototypePagePath(workspace);
  if (!fs.existsSync(file)) {
    facts.errors.push(`${PROTO_FILES.page} não existe`);
    return facts;
  }
  const { chromium } = require('playwright-core') as typeof import('playwright-core');
  let browser: import('playwright-core').Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const home = pathToFileURL(file).href;
    // Sem rede: tudo o que não for o próprio arquivo é barrado e anotado.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url === home || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return route.continue();
      facts.external.push(url.slice(0, 120));
      return route.abort();
    });
    page.on('pageerror', (err) => facts.errors.push(String(err.message || err).slice(0, 200)));
    await page.goto(home, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(600);
    const probe = async () => (await page.evaluate(PROBE)) as any;
    const click = async (sel: string) => {
      await page.locator(sel).first().click({ timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(350);
    };
    const first = await probe();
    facts.opened = !!first.drawn;
    facts.control = first.control;
    facts.disclaimer = first.disclaimer;
    facts.fictitious = first.fictitious;
    facts.states = uniq<string>(first.states.filter(Boolean));
    facts.alternatives = uniq<string>(first.alternatives.filter(Boolean).map((a: string) => a.toLowerCase()));
    facts.versions = uniq<string>(first.versions.filter(Boolean));
    facts.points = uniq<number>(first.points).sort((a, b) => a - b);
    facts.supportToggle = first.supportToggle;

    // Um controle «funciona» se a tela fica diferente da de outro controle do mesmo grupo.
    const group = async (attr: string, values: string[]): Promise<string[]> => {
      const screens: Record<string, string> = {};
      for (const v of values) {
        await click(`[${attr}="${v}"]`);
        screens[v] = (await probe()).screen;
      }
      return values.filter((v) => values.some((o) => o !== v && screens[o] !== screens[v]));
    };
    if (facts.states.length > 1) facts.statesWorking = await group('data-proto-estado', facts.states);
    if (facts.alternatives.length > 1) facts.alternativesWorking = await group('data-proto-alternativa', facts.alternatives);
    if (facts.states.includes('exemplo')) await click('[data-proto-estado="exemplo"]');
    for (const n of facts.points) {
      await click(`[data-proto-ponto="${n}"]`);
      if (((await probe()).marks as number[]).includes(n)) facts.pointsLocated.push(n);
    }
    facts.external = uniq(facts.external);
  } catch (err) {
    facts.errors.push(String(err instanceof Error ? err.message : err).split('\n')[0].slice(0, 200));
  } finally {
    await browser?.close().catch(() => {});
  }
  return facts;
}

/** Mede e confere. Lista vazia em `gaps` = dá para o Carlos validar. */
export async function checkProjectPrototype(workspace: string, opts: { maint?: boolean; measure?: (workspace: string) => Promise<PrototypeFacts> } = {}): Promise<{ facts: PrototypeFacts; gaps: string[] }> {
  const facts = await (opts.measure || measurePrototype)(workspace);
  return { facts, gaps: prototypeGaps(facts, readPrototypeNotes(workspace), { maint: opts.maint }) };
}
