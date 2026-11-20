/**
 * Camada 1 da absorção: lê a pasta inteira sem motor e devolve o levantamento com provas.
 *
 * - Sem corte de quantidade de arquivos. Conteúdo só de arquivo de texto de até 512 KB.
 * - De `.env*` só os nomes das variáveis; nenhum valor sai daqui.
 * - Trecho de código passa por máscara de segredo antes de virar prova.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SERVICOS, SURVEY_SKIP_DIRS, type Achado, type Prova, type TipoProva } from '../../shared/absorcao';
import { maskSecret } from '../seg/segRules';

export const MAX_TEXTO = 512 * 1024;

const LANG: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', dart: 'Dart', kt: 'Kotlin', kts: 'Kotlin', java: 'Java', go: 'Go', rs: 'Rust',
  php: 'PHP', rb: 'Ruby', cs: 'C#', vue: 'Vue', svelte: 'Svelte', html: 'HTML', css: 'CSS',
  scss: 'SCSS', sql: 'SQL', swift: 'Swift',
};

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|dart|go|php|rb|vue|svelte|html?|astro|kt|java|swift|cs|rs|json|toml|ya?ml|gradle|plist|xml|sql|sh)$/i;
const SKIP_FILE = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Pipfile\.lock|composer\.lock|Cargo\.lock|pubspec\.lock|bun\.lockb)$|\.min\.(?:js|css)$|\.map$/i;
const MANIFESTS = new Set(['package.json', 'pubspec.yaml', 'requirements.txt', 'pyproject.toml', 'go.mod', 'composer.json', 'gemfile']);

export interface Levantamento {
  root: string;
  arquivos: number;
  pastas: number;
  linguagens: Array<{ nome: string; arquivos: number }>;
  stack: string[];
  servicos: Achado[];
  repositorios: Array<{ remote: string; branch: string; ultimo: string; pasta: string }>;
  submodulos: string[];
  monorepo: string[];
  dependencias: Array<{ manifesto: string; total: number; principais: string[]; versoes: Record<string, string> }>;
  comandos: Array<{ manifesto: string; nome: string; comando: string }>;
  env: string[];
  designSystem: { sinais: string[] };
  /** Arquivos por pasta: primeiro nível e segundo nível dentro de src, app, lib e packages. */
  porPasta: Record<string, number>;
  topDirs: string[];
  topFiles: string[];
  sobre: string;
  nomeSugerido: string;
  commit: string | null;
}

function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, { cwd, windowsHide: true, encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** Máscara de linha de código: valor depois de chave/token/segredo e literais longos que parecem chave. */
export function mascararLinha(line: string): string {
  let out = String(line || '').trim().slice(0, 200);
  out = out.replace(/((?:key|token|secret|senha|password|passwd|pwd|auth)[A-Za-z_]*\s*[:=]\s*['"`]?)([^'"`\s,;]{6,})/gi, (_m, a, v) => a + maskSecret(v));
  out = out.replace(/(['"`])([A-Za-z0-9_\-\.]{24,})\1/g, (_m, q, v) => (/^[a-z@][\w\-./]*$/.test(v) && !/\d{6,}/.test(v) ? `${q}${v}${q}` : `${q}${maskSecret(v)}${q}`));
  out = out.replace(/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/g, (v) => maskSecret(v));
  out = out.replace(/\b(APP_USR|TEST)-[0-9a-f-]{16,}/gi, (v) => maskSecret(v));
  out = out.replace(/:\/\/([^:/\s]+):([^@/\s]+)@/g, (_m, u, p) => `://${u}:${maskSecret(p)}@`);
  return out;
}

function lerTexto(full: string): string | null {
  try {
    const st = fs.statSync(full);
    if (st.size > MAX_TEXTO) return null;
    const buf = fs.readFileSync(full);
    if (buf.subarray(0, 4096).includes(0)) return null;
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

function linhaDe(texto: string, idx: number): number {
  let n = 1;
  for (let i = 0; i < idx && i < texto.length; i++) if (texto.charCodeAt(i) === 10) n++;
  return n;
}

interface Manifesto {
  arquivo: string;
  nome?: string;
  deps: Record<string, string>;
  scripts: Record<string, string>;
  texto: string;
}

function lerManifesto(rel: string, base: string, texto: string): Manifesto {
  const m: Manifesto = { arquivo: rel, deps: {}, scripts: {}, texto };
  try {
    if (base === 'package.json') {
      const pkg = JSON.parse(texto);
      m.nome = typeof pkg.name === 'string' ? pkg.name : undefined;
      Object.assign(m.deps, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {});
      for (const [k, v] of Object.entries(pkg.scripts || {})) m.scripts[k] = String(v);
    } else if (base === 'composer.json') {
      const pkg = JSON.parse(texto);
      m.nome = pkg.name;
      Object.assign(m.deps, pkg.require || {}, pkg['require-dev'] || {});
      for (const [k, v] of Object.entries(pkg.scripts || {})) m.scripts[k] = Array.isArray(v) ? v.join(' && ') : String(v);
    } else if (base === 'pubspec.yaml') {
      const lines = texto.replace(/\r/g, '').split('\n');
      let sec = '';
      for (const ln of lines) {
        const top = ln.match(/^([A-Za-z_]+):\s*(.*)$/);
        if (top) {
          sec = top[1];
          if (sec === 'name') m.nome = top[2].trim();
          continue;
        }
        const dep = ln.match(/^  ([A-Za-z0-9_]+):\s*(.*)$/);
        if (dep && (sec === 'dependencies' || sec === 'dev_dependencies')) m.deps[dep[1]] = dep[2].trim() || '*';
      }
    } else if (base === 'requirements.txt') {
      for (const ln of texto.split(/\r?\n/)) {
        const d = ln.trim().match(/^([A-Za-z0-9_.\-\[\]]+)\s*([=<>!~]=?.*)?$/);
        if (d && !ln.trim().startsWith('#') && !ln.trim().startsWith('-')) m.deps[d[1].replace(/\[.*\]/, '').toLowerCase()] = (d[2] || '*').trim();
      }
    } else if (base === 'pyproject.toml') {
      const nome = texto.match(/^name\s*=\s*["']([^"']+)/m);
      if (nome) m.nome = nome[1];
      const arr = texto.match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m);
      if (arr) for (const d of arr[1].matchAll(/["']([A-Za-z0-9_.\-]+)\s*([^"']*)["']/g)) m.deps[d[1].toLowerCase()] = d[2].trim() || '*';
      const poetry = texto.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
      if (poetry) for (const d of poetry[1].matchAll(/^([A-Za-z0-9_.\-]+)\s*=\s*(.+)$/gm)) if (d[1] !== 'python') m.deps[d[1].toLowerCase()] = d[2].trim();
      const scripts = texto.match(/\[(?:project|tool\.poetry)\.scripts\]([\s\S]*?)(?:\n\[|$)/);
      if (scripts) for (const d of scripts[1].matchAll(/^([A-Za-z0-9_.\-]+)\s*=\s*["']([^"']+)/gm)) m.scripts[d[1]] = d[2];
    } else if (base === 'go.mod') {
      const nome = texto.match(/^module\s+(\S+)/m);
      if (nome) m.nome = nome[1].split('/').pop();
      for (const d of texto.matchAll(/^\s*(?:require\s+)?([a-z0-9.\-]+\.[a-z]{2,}\/\S+)\s+(v\S+)/gm)) m.deps[d[1]] = d[2];
    } else if (base === 'gemfile') {
      for (const d of texto.matchAll(/^\s*gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+))?/gm)) m.deps[d[1]] = d[2] || '*';
    }
  } catch {
    /* manifesto ilegível: fica sem dependências */
  }
  return m;
}

const STACK_DEPS: Array<[RegExp, string]> = [
  [/^next$/, 'Next.js'], [/^react$/, 'React'], [/^react-native$/, 'React Native'], [/^expo$/, 'Expo'],
  [/^vue$/, 'Vue'], [/^nuxt$/, 'Nuxt'], [/^svelte$|^@sveltejs\/kit$/, 'Svelte'], [/^solid-js$/, 'SolidJS'], [/^astro$/, 'Astro'],
  [/^electron$/, 'Electron'], [/^express$/, 'Express'], [/^fastify$/, 'Fastify'], [/^@nestjs\/core$/, 'NestJS'], [/^hono$/, 'Hono'],
  [/^typescript$/, 'TypeScript'], [/^tailwindcss$|^@tailwindcss\/vite$/, 'Tailwind CSS'], [/^vite$/, 'Vite'],
  [/^flutter$/, 'Flutter'], [/^django$/, 'Django'], [/^fastapi$/, 'FastAPI'], [/^flask$/, 'Flask'],
  [/^laravel\/framework$/, 'Laravel'], [/^rails$/, 'Rails'], [/^github\.com\/gin-gonic\/gin$/, 'Gin'],
];

export function detectar(rootIn: string): Levantamento {
  const root = path.resolve(rootIn);
  const tavirAqui = fs.existsSync(path.join(root, '.tavir', 'project.json'));
  const langCount: Record<string, number> = {};
  const porPasta: Record<string, number> = {};
  const topDirs: string[] = [];
  const topFiles: string[] = [];
  const envNomes = new Set<string>();
  const manifestos: Manifesto[] = [];
  const provas = new Map<string, Prova[]>();
  const sinaisDs = new Set<string>();
  const fontes = new Set<string>();
  let arquivos = 0;
  let pastas = 0;
  let cssVars = 0;
  const cssVarFiles: string[] = [];

  const servEnv = SERVICOS.map((s) => ({ s, re: (s.env || []).map((r) => new RegExp(r, 'i')) }));
  const servCod = SERVICOS.map((s) => ({ s, re: (s.codigo || []).map((r) => new RegExp(r)) }));
  const addProva = (id: string, p: Prova) => {
    const list = provas.get(id) || [];
    // Até 4 provas de cada tipo por serviço: o bastante para conferir, sem inchar o retrato.
    if (list.filter((x) => x.tipo === p.tipo).length >= 4) return;
    if (list.some((x) => x.tipo === p.tipo && x.arquivo === p.arquivo && x.linha === p.linha)) return;
    list.push(p);
    provas.set(id, list);
  };

  const contaPasta = (rel: string) => {
    const parts = rel.split('/');
    if (parts.length < 2) return;
    const first = parts[0];
    porPasta[first] = (porPasta[first] || 0) + 1;
    if (['src', 'app', 'lib', 'packages', 'apps'].includes(first) && parts.length >= 3) {
      const key = `${first}/${parts[1]}`;
      porPasta[key] = (porPasta[key] || 0) + 1;
    }
  };

  const walk = (dir: string, rel: string, depth: number) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SURVEY_SKIP_DIRS.has(ent.name) || ent.name === '.tavir') continue;
        if (depth === 0 && tavirAqui && ['context', 'memory'].includes(ent.name)) continue;
        if (childRel === 'qa/evidencias' || childRel === 'qa/seguranca') continue;
        pastas++;
        if (depth === 0) topDirs.push(ent.name);
        walk(full, childRel, depth + 1);
        continue;
      }
      if (!ent.isFile() || ent.name === '.DS_Store' || ent.name === '.env.project') continue;
      arquivos++;
      if (depth === 0) topFiles.push(ent.name);
      contaPasta(childRel);
      const low = ent.name.toLowerCase();
      const ext = low.includes('.') ? low.split('.').pop() || '' : '';
      const lang = LANG[ext];
      if (lang) langCount[lang] = (langCount[lang] || 0) + 1;
      const relLow = childRel.toLowerCase();

      // Configuração por nome de arquivo.
      for (const s of SERVICOS) {
        for (const c of s.config || []) {
          const hit = c.endsWith('/') ? relLow.includes(c) : low === c || relLow.endsWith('/' + c) || relLow === c;
          if (hit) addProva(s.id, { tipo: 'config', arquivo: childRel });
        }
      }

      // Variáveis de ambiente: só os nomes.
      if (/^\.env(\..+)?$/.test(low)) {
        const t = lerTexto(full);
        if (t) {
          t.split(/\r?\n/).forEach((ln, i) => {
            const m = ln.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
            if (!m) return;
            envNomes.add(m[1]);
            for (const { s, re } of servEnv) if (re.some((r) => r.test(m[1]))) addProva(s.id, { tipo: 'env', arquivo: childRel, linha: i + 1, trecho: m[1] });
          });
        }
        continue;
      }

      if (MANIFESTS.has(low)) {
        const t = lerTexto(full);
        if (t) manifestos.push(lerManifesto(childRel, low, t));
      }

      // Sinais de design system.
      if (/^tailwind\.config\.(js|cjs|mjs|ts)$/.test(low)) sinaisDs.add(`Tailwind: \`${childRel}\``);
      if (low === 'components.json') sinaisDs.add(`shadcn/ui: \`${childRel}\``);
      if (low === 'theme.ts' || low === 'theme.js' || low === 'tokens.json' || low === 'app_theme.dart' || low === 'theme.dart') sinaisDs.add(`Tema: \`${childRel}\``);

      if (SKIP_FILE.test(childRel)) continue;
      const isCss = /\.(css|scss|sass|less)$/.test(low);
      if (!CODE_EXT.test(low) && !isCss) continue;
      const t = lerTexto(full);
      if (!t) continue;
      if (isCss) {
        const vars = (t.match(/(?:^|[\s{;])--[A-Za-z0-9\-_]+\s*:/g) || []).length;
        if (vars) {
          cssVars += vars;
          if (cssVarFiles.length < 6) cssVarFiles.push(`\`${childRel}\` (${vars})`);
        }
        for (const f of t.matchAll(/font-family\s*:\s*['"]?([A-Za-z0-9 \-]+)/g)) if (fontes.size < 8) fontes.add(f[1].trim());
        for (const f of t.matchAll(/fonts\.googleapis\.com\/css2?\?family=([A-Za-z0-9+]+)/g)) if (fontes.size < 8) fontes.add(f[1].replace(/\+/g, ' '));
        continue;
      }
      for (const f of t.matchAll(/import\s*\{\s*([A-Z][A-Za-z_]+)\s*(?:,[^}]*)?\}\s*from\s+['"]next\/font\/google['"]/g)) {
        if (f[1] && fontes.size < 8) fontes.add(f[1].replace(/_/g, ' '));
      }
      for (const f of t.matchAll(/fonts\.googleapis\.com\/css2?\?family=([A-Za-z0-9+]+)/g)) if (fontes.size < 8) fontes.add(f[1].replace(/\+/g, ' '));
      const lines = t.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (ln.length > 2000) continue;
        for (const { s, re } of servCod) {
          if (!re.length) continue;
          if (re.some((r) => r.test(ln))) addProva(s.id, { tipo: 'codigo', arquivo: childRel, linha: i + 1, trecho: mascararLinha(ln) });
        }
      }
    }
  };
  walk(root, '', 0);

  // Dependências declaradas nos manifestos.
  const allDeps = new Map<string, string>();
  for (const m of manifestos) {
    for (const [dep, ver] of Object.entries(m.deps)) {
      allDeps.set(dep, ver);
      for (const s of SERVICOS) {
        if (!(s.deps || []).includes(dep)) continue;
        const idx = m.texto.indexOf(`"${dep}"`) >= 0 ? m.texto.indexOf(`"${dep}"`) : m.texto.search(new RegExp(`(^|\\s)${dep.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`, 'm'));
        addProva(s.id, { tipo: 'dep', arquivo: m.arquivo, linha: idx >= 0 ? linhaDe(m.texto, idx) : undefined, trecho: `${dep} ${ver}`.trim() });
      }
    }
  }

  const servicos: Achado[] = [];
  for (const s of SERVICOS) {
    const list = provas.get(s.id);
    if (!list?.length) continue;
    const tipos = new Set<TipoProva>(list.map((p) => p.tipo));
    servicos.push({ servico: s.id, nome: s.nome, assunto: s.assunto, grau: tipos.size >= 2 ? 'confirmado' : 'indicio', provas: list });
  }

  // Stack.
  const stack = new Set<string>();
  for (const dep of allDeps.keys()) for (const [re, nome] of STACK_DEPS) if (re.test(dep)) stack.add(nome);
  for (const m of manifestos) {
    const base = path.basename(m.arquivo).toLowerCase();
    if (base === 'pubspec.yaml') stack.add(m.deps.flutter ? 'Flutter' : 'Dart');
    if (base === 'requirements.txt' || base === 'pyproject.toml') stack.add('Python');
    if (base === 'go.mod') stack.add('Go');
    if (base === 'composer.json') stack.add('PHP');
    if (base === 'gemfile') stack.add('Ruby');
    if (base === 'package.json') stack.add('Node');
  }
  if (!stack.size && langCount.HTML) stack.add('Site estático');

  // Biblioteca de componentes.
  const libs: Array<[RegExp, string]> = [[/^@mui\/material$/, 'MUI'], [/^@chakra-ui\/react$/, 'Chakra UI'], [/^@radix-ui\//, 'Radix UI'], [/^@headlessui\//, 'Headless UI'], [/^antd$/, 'Ant Design'], [/^@mantine\/core$/, 'Mantine'], [/^bootstrap$/, 'Bootstrap']];
  for (const dep of allDeps.keys()) for (const [re, nome] of libs) if (re.test(dep)) sinaisDs.add(`Componentes: ${nome}`);
  for (const m of manifestos) if (path.basename(m.arquivo) === 'pubspec.yaml' && /uses-material-design:\s*true/.test(m.texto)) sinaisDs.add(`Componentes: Material do Flutter (\`${m.arquivo}\`)`);
  if (cssVars) sinaisDs.add(`Variáveis CSS: ${cssVars} em ${cssVarFiles.join(', ')}`);
  if (fontes.size) sinaisDs.add(`Fontes: ${Array.from(fontes).join(', ')}`);

  // Comandos dos manifestos.
  const comandos: Levantamento['comandos'] = [];
  for (const m of manifestos) {
    for (const [nome, cmd] of Object.entries(m.scripts)) {
      if (/^(dev|start|build|test|lint|typecheck|serve|preview|e2e|deploy|migrate|db:.*|test:.*|build:.*)$/i.test(nome)) comandos.push({ manifesto: m.arquivo, nome, comando: cmd.slice(0, 200) });
    }
  }

  const dependencias = manifestos
    .filter((m) => Object.keys(m.deps).length)
    .map((m) => ({ manifesto: m.arquivo, total: Object.keys(m.deps).length, principais: Object.keys(m.deps).slice(0, 15), versoes: m.deps }));

  // Repositórios e monorepo.
  const repositorios: Levantamento['repositorios'] = [];
  const submodulos: string[] = [];
  let commit: string | null = null;
  if (fs.existsSync(path.join(root, '.git'))) {
    commit = git(['rev-parse', 'HEAD'], root) || null;
    const remotes = git(['remote', '-v'], root).split(/\r?\n/).filter((l) => /\(fetch\)$/.test(l)).map((l) => l.split(/\s+/)[1]).filter(Boolean);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    const ultimo = git(['log', '-1', '--pretty=%h %s (%cs)'], root);
    if (remotes.length) for (const r of remotes) repositorios.push({ remote: limparRemote(r), branch, ultimo, pasta: '.' });
    else repositorios.push({ remote: '', branch, ultimo, pasta: '.' });
  }
  const gm = path.join(root, '.gitmodules');
  if (fs.existsSync(gm)) {
    for (const m of fs.readFileSync(gm, 'utf8').matchAll(/path\s*=\s*(.+)/g)) submodulos.push(m[1].trim());
  }
  const monorepo: string[] = [];
  for (const m of manifestos) {
    if (path.basename(m.arquivo) !== 'package.json') continue;
    try {
      const pkg = JSON.parse(m.texto);
      const ws = Array.isArray(pkg.workspaces) ? pkg.workspaces : Array.isArray(pkg.workspaces?.packages) ? pkg.workspaces.packages : [];
      if (ws.length) monorepo.push(`workspaces em \`${m.arquivo}\`: ${ws.join(', ')}`);
    } catch {}
  }
  for (const f of ['pnpm-workspace.yaml', 'melos.yaml', 'lerna.json', 'turbo.json', 'nx.json']) if (fs.existsSync(path.join(root, f))) monorepo.push(`\`${f}\``);

  const sobre = lerSobre(root);
  const nomeSugerido = sugerirNome(root, repositorios[0]?.remote || '', manifestos.find((m) => !m.arquivo.includes('/'))?.nome || '', sobre.titulo);

  return {
    root,
    arquivos,
    pastas,
    linguagens: Object.entries(langCount).sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, arquivos: n })),
    stack: Array.from(stack),
    servicos,
    repositorios,
    submodulos,
    monorepo,
    dependencias,
    comandos,
    env: Array.from(envNomes).sort(),
    designSystem: { sinais: Array.from(sinaisDs) },
    porPasta,
    topDirs,
    topFiles,
    sobre: sobre.texto,
    nomeSugerido,
    commit,
  };
}

/** Remote sem credencial embutida (https://user:token@host → https://host). */
export function limparRemote(url: string): string {
  return String(url || '').replace(/^(https?:\/\/)[^@/]+@/, '$1');
}

function lerSobre(root: string): { titulo: string; texto: string } {
  const readme = ['README.md', 'readme.md', 'Readme.md', 'README.txt', 'README'].map((n) => path.join(root, n)).find((p) => fs.existsSync(p));
  if (!readme) return { titulo: '', texto: '' };
  try {
    const raw = fs.readFileSync(readme, 'utf8').replace(/\r/g, '').split('\n');
    const titulo = (raw.find((l) => /^#\s+\S/.test(l)) || '').replace(/^#\s+/, '').trim().slice(0, 80);
    const texto = (raw.map((l) => l.replace(/^#+\s*/, '').trim()).find((l) => l && !l.startsWith('![') && !l.startsWith('<') && !l.startsWith('[!')) || '').slice(0, 280);
    return { titulo, texto };
  } catch {
    return { titulo: '', texto: '' };
  }
}

/** Nome do repositório no remote, senão `name` do manifesto, senão título do README, senão nome da pasta. */
export function sugerirNome(root: string, remote: string, manifesto: string, readme: string): string {
  const fromRemote = remote.replace(/\.git$/, '').split(/[/:]/).pop() || '';
  if (fromRemote) return fromRemote;
  if (manifesto) return manifesto.replace(/^@[^/]+\//, '');
  if (readme) return readme;
  return path.basename(root);
}
