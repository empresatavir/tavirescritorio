import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ABSORB_FILES,
  DOSSIER_SECTIONS,
  absorbSite,
  automaticCycles,
  breakpointsOf,
  dossierGaps,
  keyframesFromCss,
  publishAbsorption,
  summarizeEvents,
  type AbsorbEvent,
} from '../../src/main/design/absorcao';
import { baseDomain, cookiesFor, looksLikeLogin, sessionCookies } from '../../src/main/design/sessao';
import { listReferences, prepareDesignKit } from '../../src/main/design/kit';
import { jobTask } from '../../src/main/officeCloud';
import { absorbPrompt, isAgent, kindOfAgent } from '../../src/main/officeExec';
import { ACTION_ABSORB, KAKASHI, absorbHints, firstSiteLink, officeAgent } from '../../src/shared/officeAgents';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-absorcao-'));
const ev = (phase: string, type: string, t: number, name: string, target: string, elapsed?: number): AbsorbEvent => ({ phase, type, t, name, target, elapsed });
const dossier = (skip: string[] = []) => DOSSIER_SECTIONS.filter((s) => !skip.includes(s)).map((s) => `## ${s}\nConteúdo medido desta seção, com a chave do absorcao.json ao lado.`).join('\n\n');

describe('absorção: leitura do que foi medido', () => {
  it('separa keyframes de uma folha lida como texto, sem repetir nome', () => {
    const css = '.a{color:red}@keyframes sobe{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}@media (min-width:768px){.b{x:y}}@-webkit-keyframes sobe{0%{opacity:0}}@keyframes gira{to{transform:rotate(360deg)}}';
    const out = keyframesFromCss(css);
    expect(out.map((k) => k.name)).toEqual(['sobe', 'gira']);
    expect(out[0].css).toContain('translateY(12px)');
    expect(out[0].css.endsWith('}}')).toBe(true);
  });

  it('tira as larguras de quebra das media queries, em px', () => {
    expect(breakpointsOf(['(min-width: 768px)', 'screen and (max-width: 1023.98px)', '(min-width: 48em)', '(prefers-reduced-motion: reduce)'])).toEqual([768, 1024]);
  });

  it('acha o que se repete sozinho e o intervalo; movimento irregular não vira ciclo', () => {
    const events = [
      ...[0, 4000, 8000, 12010].map((t) => ev('idle', 'mutation', t, 'class', 'div.carrossel')),
      ...[100, 900, 5200].map((t) => ev('idle', 'mutation', t, 'style', 'div.solto')),
      ...[0, 4000, 8000].map((t) => ev('scroll', 'mutation', t, 'class', 'div.outro')),
    ];
    expect(automaticCycles(events)).toEqual([{ alvo: 'div.carrossel', o_que: 'muda class', vezes: 4, intervaloMs: 4000 }]);
  });

  it('resume os eventos de uma fase com início e duração', () => {
    const events = [
      ev('scroll', 'transitionstart', 320, 'opacity', 'section.prova'),
      ev('scroll', 'transitionend', 920, 'opacity', 'section.prova', 600),
      ev('scroll', 'mutation', 300, 'class', 'section.prova'),
      ev('hover', 'transitionstart', 10, 'color', 'a.link'),
    ];
    expect(summarizeEvents(events, 'scroll')).toEqual([{ alvo: 'section.prova', tipo: 'transição', nome: 'opacity', inicioMs: 320, duracaoMs: 600, vezes: 1 }]);
  });

  it('grava absorcao.json com o que o navegador devolveu e recusa endereço incompleto', async () => {
    const dir = tmp();
    expect((await absorbSite({ url: 'exemplo.com', dir })).ok).toBe(false);
    const res = await absorbSite({ url: 'https://exemplo.com', dir, browse: async () => ({ data: { titulo: 'Exemplo', secoes: [{}, {}], componentes: [{}], movimento: { keyframes: [{}], aoRolar: [] } }, limits: ['um aviso'] }) });
    expect(res.ok).toBe(true);
    expect(res.limits).toEqual(['um aviso']);
    expect(res.counts).toMatchObject({ secoes: 2, componentes: 1, keyframes: 1 });
    expect(JSON.parse(fs.readFileSync(path.join(dir, ABSORB_FILES.data), 'utf8')).titulo).toBe('Exemplo');
  });

  it('falha de navegador volta como erro em uma linha, sem estourar', async () => {
    const res = await absorbSite({ url: 'https://exemplo.com', dir: tmp(), browse: async () => { throw new Error('net::ERR_NAME_NOT_RESOLVED\nstack'); } });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('ERR_NAME_NOT_RESOLVED');
    expect(res.error).not.toContain('stack');
  });
});

describe('sessão de referências', () => {
  const jar = [
    { name: 'sid', value: 'a', domain: '.refero.design', path: '/', secure: true, httpOnly: true, sameSite: 'no_restriction', expirationDate: 1900000000.5 },
    { name: 'pref', value: 'b', domain: 'app.refero.design', path: '/', sameSite: 'unspecified' },
    { name: 'outro', value: 'c', domain: '.google.com', path: '/', secure: true, sameSite: 'lax' },
    { name: 'falso', value: 'd', domain: 'naorefero.design', path: '/' },
  ];

  it('só leva os cookies do domínio do site pedido, no formato do navegador da medição', () => {
    expect(baseDomain('https://www.refero.design/apps')).toBe('refero.design');
    expect(baseDomain('https://loja.exemplo.com.br/x')).toBe('exemplo.com.br');
    const out = cookiesFor('https://refero.design/search?q=pricing', jar);
    expect(out.map((c) => c.name)).toEqual(['sid', 'pref']);
    expect(out[0]).toMatchObject({ domain: '.refero.design', secure: true, httpOnly: true, sameSite: 'None', expires: 1900000000 });
    expect(out[1].sameSite).toBeUndefined();
    expect(cookiesFor('endereço ruim', jar)).toEqual([]);
  });

  it('reconhece quando o site jogou para a tela de login', () => {
    expect(looksLikeLogin('https://refero.design/login?next=/apps', 'https://refero.design/apps')).toBe(true);
    expect(looksLikeLogin('https://accounts.google.com/signin/v2', 'https://refero.design/apps')).toBe(true);
    expect(looksLikeLogin('https://refero.design/apps', 'https://refero.design/apps')).toBe(false);
    expect(looksLikeLogin('https://site.com/login', 'https://site.com/login')).toBe(false);
    expect(looksLikeLogin('https://site.com/author/ana', 'https://site.com/')).toBe(false);
  });

  it('fora do app não há sessão: lista vazia, sem estourar', async () => {
    expect(await sessionCookies('https://refero.design')).toEqual([]);
  });
});

describe('absorção: dossiê e biblioteca', () => {
  it('dossiê só fecha com as treze seções preenchidas', () => {
    expect(DOSSIER_SECTIONS).toHaveLength(13);
    expect(dossierGaps(dossier())).toEqual([]);
    expect(dossierGaps(dossier(['Movimento', 'Lacunas']))).toEqual(['Movimento', 'Lacunas']);
    expect(dossierGaps(dossier().replace(/## Interações\n[^\n]+/, '## Interações\nok'))).toEqual(['Interações']);
    expect(dossierGaps('')).toHaveLength(13);
  });

  it('vai para a biblioteca como rascunho e só chega ao kit depois de validado', () => {
    const root = tmp();
    const from = tmp();
    fs.mkdirSync(path.join(from, ABSORB_FILES.shots));
    fs.writeFileSync(path.join(from, ABSORB_FILES.shots, 'desktop-dobra.jpg'), 'x');
    fs.writeFileSync(path.join(from, ABSORB_FILES.data), JSON.stringify({ titulo: 'Site "bom"', capturadoEm: '2026-11-21T10:00:00.000Z' }));
    expect(publishAbsorption({ from, url: 'https://exemplo.com/pagina', family: 'marketing', root }).ok).toBe(false);
    fs.writeFileSync(path.join(from, ABSORB_FILES.dossier), dossier());
    const pub = publishAbsorption({ from, url: 'https://exemplo.com/pagina', family: 'marketing', niche: 'clínica', mode: 'conceito', root });
    expect(pub.ok).toBe(true);
    const card = fs.readFileSync(path.join(pub.dir!, 'card.md'), 'utf8');
    expect(card).toContain('status: rascunho');
    expect(card).toContain('nicho: clínica');
    expect(card).toContain('modo: conceito');
    expect(card).toContain("Site 'bom'");
    for (const f of [ABSORB_FILES.dossier, ABSORB_FILES.data, `${ABSORB_FILES.shots}/desktop-dobra.jpg`]) expect(fs.existsSync(path.join(pub.dir!, f)), f).toBe(true);
    expect(listReferences(root)).toMatchObject([{ slug: 'exemplo-com-pagina', status: 'rascunho' }]);

    const ws = tmp();
    expect(prepareDesignKit(ws, { role: 'direcao', family: 'marketing', maint: false, root }).references).toEqual([]);
    fs.writeFileSync(path.join(pub.dir!, 'card.md'), card.replace('status: rascunho', 'status: validado'));
    const kit = prepareDesignKit(ws, { role: 'direcao', family: 'marketing', maint: false, root });
    expect(kit.references).toHaveLength(1);
    expect(fs.existsSync(path.join(ws, '.tavir', 'design', 'kit', 'referencias', 'exemplo-com-pagina', 'dossie.md'))).toBe(true);
    expect(kit.block).toContain('absorção completa do Kakashi');
    // Validada não é sobrescrita por uma nova absorção.
    expect(publishAbsorption({ from, url: 'https://exemplo.com/pagina', family: 'marketing', root }).ok).toBe(false);
  });
});

describe('Kakashi no Chamar agente', () => {
  it('está no catálogo com a ação de absorver e o escopo próprio', () => {
    const ag = officeAgent(KAKASHI)!;
    expect(ag.scope).toBe('kakashi.md');
    expect(ag.actions.map((a) => a.id)).toEqual([ACTION_ABSORB]);
    expect(fs.existsSync(path.join(process.cwd(), 'agentes', 'escopo', 'agentes', 'kakashi.md'))).toBe(true);
    expect(isAgent('absorcao')).toBe(true);
    expect(kindOfAgent('absorcao')).toBe('agent');
  });

  it('lê endereço, família, nicho e modo do pedido', () => {
    expect(firstSiteLink('absorve https://linear.app/features, por favor')).toBe('https://linear.app/features');
    expect(firstSiteLink('olha o stripe.com/br que legal')).toBe('https://stripe.com/br');
    expect(firstSiteLink('sem endereço aqui')).toBe('');
    expect(absorbHints('é um sistema de CRM, nicho: imobiliária. serve para o modo conceito')).toEqual({ family: 'produto', niche: 'imobiliária', mode: 'conceito' });
    expect(absorbHints('landing bonita')).toEqual({ family: 'marketing', niche: '', mode: '' });
  });

  it('pedido ao Kakashi vira tarefa de absorção; sem endereço, pede o endereço', () => {
    const spec = jobTask('agent', { agent: KAKASHI, action: ACTION_ABSORB, instrucao: 'https://linear.app nicho: software, modo conceito' }) as any;
    expect(spec.agent).toBe('absorcao');
    expect(spec.owner).toBe(KAKASHI);
    expect(spec.title).toBe('Absorção de site · linear.app');
    expect(spec.fields).toMatchObject({ link: 'https://linear.app', familia: 'marketing', nicho: 'software', modo: 'conceito' });
    expect((jobTask('agent', { agent: KAKASHI, instrucao: 'aquele site bonito' }) as any).error).toContain('endereço');
  });

  it('o pedido leva o escopo, as treze seções e proíbe navegar e copiar', () => {
    const p = absorbPrompt({ link: 'https://linear.app', familia: 'produto', nicho: 'software' });
    for (const s of DOSSIER_SECTIONS) expect(p, s).toContain(`## ${s}`);
    expect(p).toContain('copiar a técnica, não a roupa');
    expect(p).toContain('sistema ou produto · nicho informado: software');
    expect(p).toContain('Não abra o site');
    expect(p).toContain('Aviso sobre a medição: (sem avisos)');
    expect(p).toContain('duração em ms');
  });
});
