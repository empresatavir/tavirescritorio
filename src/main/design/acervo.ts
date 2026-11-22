/**
 * Acervo de código aberto: bibliotecas de interface com licença MIT, clonadas pelo Carlos ou pelo
 * Escritório em `tavir-externo/design-acervo/` (fora do git). Daqui sai um card por biblioteca em
 * `conhecimento/design/acervo/<slug>/`, com as peças, o índice e a licença. Entra como `rascunho`;
 * só chega ao kit dos agentes depois que o Carlos troca para `validado`.
 *
 * O Escritório só lê os arquivos clonados: não instala nem executa nada deles.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { escritorioRoot } from './kit';

export interface AcervoPiece {
  /** Caminho do arquivo dentro do clone. */
  file: string;
  name: string;
  desc?: string;
  tags?: string[];
  /** Animação declarada fora do arquivo (registro da biblioteca): vai num arquivo ao lado. */
  anim?: unknown;
}

export interface AcervoSource {
  slug: string;
  title: string;
  repo: string;
  /** Para que serve, em uma linha (vai no card e no pedido). */
  use: string;
  /** Pilha em que as peças foram escritas. */
  stack: string;
  license: string[];
  collect: (dir: string) => AcervoPiece[];
}

const MAX_PIECE = 120 * 1024;

function read(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function json(file: string): any {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
}

function list(dir: string): string[] {
  try {
    return fs.readdirSync(dir).sort();
  } catch {
    return [];
  }
}

/** Arquivos de uma pasta do clone, em caminho relativo com «/». Pula testes, histórias e dependências. */
function walk(dir: string, rel = ''): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(path.join(dir, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const next = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (!/^(node_modules|fixtures|test-utils|__\w+__)$/.test(ent.name) && !/snapshots$/.test(ent.name)) out.push(...walk(dir, next));
    } else if (ent.isFile() && !/\.(stories|story|demo|test|spec|visual\.spec|features\.stories)\.|\.d\.ts$|\.stories\.module\.css$/.test(ent.name)) {
      out.push(next);
    }
  }
  return out;
}

/** Nome da peça a partir do caminho: «Hero/Hero.tsx» vira «Hero»; «Hero/sub/Eyebrow.tsx» vira «Hero-sub-Eyebrow». */
function pieceName(rel: string): string {
  const parts = rel.replace(/\.module\.css$|\.[a-z]+$/i, '').split('/');
  return parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase()).join('-');
}

/** Componentes do Primer Brand que são seção de página de marketing (o resto é peça de base). */
const PRIMER_SECTIONS = /^(Hero|Bento|BreakoutBanner|CTABanner|CTAForm|ComparisonTable|FeatureComparisonTable|EyebrowBanner|FAQ|Footnotes|LogoSuite|MediaPlaylist|MinimalFooter|Pillar|PricingOptions|river|Section|SectionIntro|SectionIntroStacked|Statistic|SubdomainNavBar|SubNav|AnchorNav|Testimonial|TestimonialGroup|Tiles|Timeline|Card)$/;

const OPEN_PROPS: Record<string, string> = {
  shadows: 'sombras em camadas, do sutil ao profundo, e sombra interna',
  easing: 'curvas de animação (ease, elástica, mola, passo)',
  animations: 'animações prontas com keyframes (entrar, sair, pulsar, girar)',
  sizes: 'escala de tamanhos e espaçamentos, fixa e fluida',
  fonts: 'pilhas de fonte, escala tipográfica, pesos, entrelinha e espaçamento de letra',
  gradients: 'degradês e ruído',
  borders: 'espessuras e raios de borda, inclusive formas orgânicas',
  zindex: 'camadas de empilhamento',
  aspects: 'proporções de mídia',
};

export const ACERVO_SOURCES: AcervoSource[] = [
  {
    slug: 'open-props',
    title: 'Open Props',
    repo: 'https://github.com/argyleink/open-props',
    use: 'fundamentos em CSS puro: sombra, curva de animação, escala de tamanho e de tipografia',
    stack: 'CSS (variáveis), sem framework',
    license: ['LICENSE'],
    collect: (dir) =>
      Object.keys(OPEN_PROPS)
        .filter((k) => fs.existsSync(path.join(dir, 'src', `props.${k}.css`)))
        .map((k) => ({ file: `src/props.${k}.css`, name: k, desc: OPEN_PROPS[k], tags: ['fundamentos'] })),
  },
  {
    slug: 'motion-primitives',
    title: 'Motion Primitives',
    repo: 'https://github.com/ibelick/motion-primitives',
    use: 'microinterações e transições discretas (texto, número, painel, cursor, diálogo que se transforma)',
    stack: 'React + Tailwind + Motion',
    license: ['LICENCE.md', 'LICENSE.md', 'LICENSE'],
    collect: (dir) =>
      list(path.join(dir, 'components', 'core'))
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => ({ file: `components/core/${f}`, name: f.replace(/\.tsx$/, ''), tags: [/^text-|number/.test(f) ? 'texto e número' : 'movimento'] })),
  },
  {
    slug: 'magicui',
    title: 'Magic UI',
    repo: 'https://github.com/magicuidesign/magicui',
    use: 'efeitos de destaque para landing (bento, marquee, brilho de borda, fundo animado, texto animado)',
    stack: 'React + Tailwind + Motion',
    license: ['LICENSE.md', 'LICENSE'],
    collect: (dir) => {
      const out: AcervoPiece[] = [];
      for (const it of json(path.join(dir, 'registry.json'))?.items || []) {
        const f = (it.files || []).find((x: any) => /^registry\/magicui\/[\w-]+\.tsx$/.test(String(x?.path || '')));
        if (!f) continue;
        const name = String(it.name || '');
        const tag = /text|typing|word|number/.test(name) ? 'texto' : /pattern|grid|background|particles|meteors|rays|noise|dither/.test(name) ? 'fundo' : /button/.test(name) ? 'botão' : 'efeito';
        const anim = it.css || it.cssVars ? { cssVars: it.cssVars || undefined, css: it.css || undefined } : undefined;
        out.push({ file: `apps/www/${f.path}`, name, desc: [it.title, it.description].filter(Boolean).join(': '), tags: [tag], anim });
      }
      return out;
    },
  },
  {
    slug: 'origin-ui',
    title: 'Origin UI (coss)',
    repo: 'https://github.com/cosscom/ui',
    use: 'acabamento de sistema: formulário, campo, tabela, navegação, diálogo, calendário, upload',
    stack: 'React + Tailwind',
    license: ['LICENSE', 'apps/origin/LICENSE.md'],
    collect: (dir) => {
      const out: AcervoPiece[] = [];
      for (const it of json(path.join(dir, 'apps', 'origin', 'registry.json'))?.items || []) {
        if (it.type !== 'registry:component' && it.type !== 'registry:ui') continue;
        const files = (it.files || []).map((x: any) => String(x?.path || '')).filter((p: string) => /^registry\/default\/(components|ui)\/[\w-]+\.tsx$/.test(p));
        if (files.length !== 1) continue;
        const tags = ((it.meta?.tags || []) as string[]).map((t) => String(t).trim()).filter((t) => t && !/^(radix|react aria|base ui)$/i.test(t));
        out.push({ file: `apps/origin/${files[0]}`, name: String(it.name || ''), tags: it.type === 'registry:ui' ? ['base'] : tags.length ? tags : ['outros'] });
      }
      return out;
    },
  },
  {
    slug: 'primer-brand',
    title: 'Primer Brand (GitHub)',
    repo: 'https://github.com/primer/brand',
    use: 'seções de página de marketing prontas (abertura, bento, prova, depoimento, preços, perguntas, linha do tempo, rodapé) e as peças de base delas',
    stack: 'React + CSS Modules',
    license: ['LICENSE'],
    // Só o código dos componentes e os tokens: fonte, logotipo, mascote e ilustração do GitHub ficam de fora.
    collect: (dir) => {
      const src = 'packages/react/src';
      const out: AcervoPiece[] = [];
      for (const rel of walk(path.join(dir, src))) {
        const top = rel.split('/')[0];
        if (!rel.includes('/')) continue;
        if (/^(MonaSans|recipes)$/.test(top) || !/\.(tsx|module\.css)$/.test(rel) || /\/index\.tsx?$/.test(rel)) continue;
        out.push({ file: `${src}/${rel}`, name: pieceName(rel), tags: [PRIMER_SECTIONS.test(top) ? 'seção de página' : 'base', top] });
      }
      const tokens = 'packages/design-tokens/src/tokens';
      for (const rel of walk(path.join(dir, tokens))) {
        if (/\.(json|json5)$/.test(rel)) out.push({ file: `${tokens}/${rel}`, name: `tokens-${pieceName(rel)}`, tags: ['tokens'] });
      }
      return out;
    },
  },
  {
    slug: 'untitledui-react',
    title: 'Untitled UI React',
    repo: 'https://github.com/untitleduico/react',
    use: 'componentes de sistema e de aplicação (botão, campo, seleção, tabela, modal, navegação, calendário, upload) e a folha de tema',
    stack: 'React + Tailwind + React Aria',
    license: ['LICENSE'],
    // Ícones de marcas de terceiros, logotipo e ilustrações ficam de fora: são marca, não técnica.
    collect: (dir) => {
      const out: AcervoPiece[] = [];
      for (const group of ['base', 'application']) {
        for (const rel of walk(path.join(dir, 'components', group))) {
          if (!/\.tsx$/.test(rel)) continue;
          out.push({ file: `components/${group}/${rel}`, name: pieceName(rel), tags: [group === 'base' ? 'base' : 'aplicação', rel.split('/')[0]] });
        }
      }
      for (const f of ['theme.css', 'typography.css']) {
        if (fs.existsSync(path.join(dir, 'styles', f))) out.push({ file: `styles/${f}`, name: f.replace(/\.css$/, ''), desc: f === 'theme.css' ? 'folha de tema: cores, raios, sombras e animações' : 'escala tipográfica', tags: ['tokens'] });
      }
      return out;
    },
  },
];

/** Onde ficam os clones (fora do git do Escritório). */
export function acervoSourceRoot(root = escritorioRoot()): string {
  return path.join(root, 'tavir-externo', 'design-acervo');
}

/** Onde fica o acervo catalogado. */
export function acervoRoot(root = escritorioRoot()): string {
  return path.join(root, 'conhecimento', 'design', 'acervo');
}

/** Texto da licença, se o arquivo é mesmo MIT. Vazio = não entra. */
export function mitLicense(dir: string, candidates: string[]): string {
  for (const c of candidates) {
    const text = read(path.join(dir, c));
    if (/\bMIT License\b/i.test(text) && /Permission is hereby granted, free of charge/i.test(text)) return text;
  }
  return '';
}

/** Pacotes de fora que o arquivo importa (o agente precisa saber do que a peça depende). */
export function packagesOf(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    const spec = m[1];
    if (/^(\.|\/|~\/|@\/)/.test(spec)) continue;
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (name !== 'react' && name !== 'react-dom') out.add(name);
  }
  return [...out].sort();
}

function commitOf(dir: string): string {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function field(card: string, key: string): string {
  const front = /^---\s*\n([\s\S]*?)\n---/.exec(card)?.[1] || '';
  return (new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(front)?.[1] || '').replace(/^["']|["']$/g, '').trim();
}

export interface AcervoCard {
  slug: string;
  title: string;
  status: string;
  use: string;
  stack: string;
  pieces: number;
  dir: string;
}

export function listAcervo(root = escritorioRoot()): AcervoCard[] {
  const out: AcervoCard[] = [];
  for (const slug of list(acervoRoot(root))) {
    const dir = path.join(acervoRoot(root), slug);
    const card = read(path.join(dir, 'card.md'));
    if (!card) continue;
    out.push({ slug, title: field(card, 'titulo') || slug, status: field(card, 'status') || 'rascunho', use: field(card, 'serve'), stack: field(card, 'pilha'), pieces: Number(field(card, 'pecas')) || 0, dir });
  }
  return out;
}

export interface CatalogResult {
  slug: string;
  ok: boolean;
  pieces?: number;
  status?: string;
  error?: string;
}

/**
 * Lê os clones e grava o card, o índice, a licença e as peças de cada biblioteca.
 * Biblioteca sem clone, sem licença MIT ou sem peça fica de fora, com o motivo.
 * Regravar mantém o `status` que o Carlos já deu.
 */
export function catalogAcervo(opts: { root?: string; from?: string; sources?: AcervoSource[] } = {}): CatalogResult[] {
  const root = opts.root || escritorioRoot();
  const from = opts.from || acervoSourceRoot(root);
  const results: CatalogResult[] = [];
  for (const src of opts.sources || ACERVO_SOURCES) {
    const dir = path.join(from, src.slug === 'origin-ui' && !fs.existsSync(path.join(from, src.slug)) ? 'coss-ui' : src.slug);
    if (!fs.existsSync(dir)) {
      results.push({ slug: src.slug, ok: false, error: 'Clone não encontrado.' });
      continue;
    }
    const license = mitLicense(dir, src.license);
    if (!license) {
      results.push({ slug: src.slug, ok: false, error: 'Licença MIT não encontrada no clone: não entra no acervo.' });
      continue;
    }
    const dest = path.join(acervoRoot(root), src.slug);
    const status = /^validado$/i.test(field(read(path.join(dest, 'card.md')), 'status')) ? 'validado' : 'rascunho';
    const groups = new Map<string, string[]>();
    let count = 0;
    fs.rmSync(path.join(dest, 'pecas'), { recursive: true, force: true });
    fs.mkdirSync(path.join(dest, 'pecas'), { recursive: true });
    for (const piece of src.collect(dir)) {
      const abs = path.join(dir, piece.file);
      // Só arquivo de dentro do clone, de tamanho razoável.
      if (path.relative(dir, abs).startsWith('..')) continue;
      let size = 0;
      try {
        size = fs.statSync(abs).size;
      } catch {
        continue;
      }
      if (!size || size > MAX_PIECE) continue;
      const code = read(abs);
      const out = `${piece.name.replace(/[^\w.-]+/g, '-')}${path.extname(piece.file)}`;
      fs.writeFileSync(path.join(dest, 'pecas', out), code, 'utf8');
      if (piece.anim) fs.writeFileSync(path.join(dest, 'pecas', `${out}.animacao.json`), JSON.stringify(piece.anim, null, 1), 'utf8');
      const deps = packagesOf(code);
      const line = `- \`pecas/${out}\`${piece.desc ? ` — ${piece.desc.replace(/\s+/g, ' ').slice(0, 160)}` : ''}${(piece.tags || []).length > 1 ? ` · ${(piece.tags || []).join(', ')}` : ''} · ${code.split('\n').length} linhas${deps.length ? ` · usa ${deps.join(', ')}` : ''}${piece.anim ? ` · animação em \`pecas/${out}.animacao.json\`` : ''}`;
      const group = (piece.tags || [])[0] || 'outros';
      groups.set(group, [...(groups.get(group) || []), line]);
      count += 1;
    }
    if (!count) {
      fs.rmSync(dest, { recursive: true, force: true });
      results.push({ slug: src.slug, ok: false, error: 'Nenhuma peça encontrada no clone (a estrutura do repositório pode ter mudado).' });
      continue;
    }
    const commit = commitOf(dir);
    const index = [`# ${src.title} — índice das peças`, '', `${count} peças. Abra só as que servem ao trabalho; não leia a pasta inteira.`, ''];
    for (const g of [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))) index.push(`## ${g}`, ...(groups.get(g) || []), '');
    fs.writeFileSync(path.join(dest, 'indice.md'), index.join('\n'), 'utf8');
    fs.writeFileSync(path.join(dest, 'LICENSE'), license, 'utf8');
    fs.writeFileSync(
      path.join(dest, 'card.md'),
      [
        '---',
        `titulo: ${src.title}`,
        `status: ${status}`,
        'tipo: acervo-codigo',
        `origem: ${src.repo}`,
        `commit: ${commit || 'desconhecido'}`,
        'licenca: MIT',
        `serve: ${src.use}`,
        `pilha: ${src.stack}`,
        `pecas: ${count}`,
        `catalogadoEm: ${new Date().toISOString()}`,
        '---',
        '',
        `# ${src.title}`,
        '',
        `Biblioteca de código aberto (MIT). Serve para: ${src.use}.`,
        '',
        `- Peças em \`pecas/\`, listadas em \`indice.md\`. Escritas em ${src.stack}.`,
        '- Uso: leia como a peça é feita e refaça na pilha e na marca do projeto. Cor, fonte e medida vêm do contrato de design do cliente, não da peça.',
        '- Se um trecho grande for copiado como está, o aviso de licença (`LICENSE` desta pasta) acompanha o código no projeto.',
        '- O Escritório só lê estes arquivos: nada daqui é instalado ou executado.',
        '',
        'Para liberar aos agentes, troque `status: rascunho` por `status: validado` no topo.',
        '',
      ].join('\n'),
      'utf8',
    );
    results.push({ slug: src.slug, ok: true, pieces: count, status });
  }
  return results;
}
