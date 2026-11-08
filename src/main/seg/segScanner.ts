/**
 * Varredura de segurança white box: lê o código e o histórico do Git, audita dependências
 * e grava resultado + relatório em qa/seguranca/<id>/. As regras próprias (segRules.ts)
 * rodam sempre; semgrep, gitleaks e trivy entram quando estão no PATH.
 * Quem aprova é a contagem de achados abertos (crítica/alta), não o texto de um agente.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import {
  CODE_RULES, CONSENT, CSP_DECL, DPO, PERSONAL_INPUT, PRECHECKED_CONSENT, PRIVACY_LINK, SECRET_RULES, SEG_CHECKS, SEV_ORDER, SEV_WEIGHT, SKIP_DIR, SKIP_FILE, TRACKERS,
  isPlaceholder, jwtRole, maskSecret, type Sev,
} from './segRules';
import { renderSegReport } from './segReport';
import { gitHead, runCommand, tail, whenOf } from '../qa/qaRunner';
import { excludeFromProjectGit } from '../runLedger';

export type SegStatus = 'aberta' | 'corrigida' | 'aceita';

export interface SegFinding {
  id: string;
  /** Impressão digital estável (não muda se o trecho só trocar de linha). */
  fp: string;
  sev: Sev;
  title: string;
  key: string;
  tool: string;
  where: string;
  file?: string;
  line?: number;
  desc: string;
  ev: string;
  impact: string;
  fix: string;
  code: string;
  refs: string[];
  st: SegStatus;
  accepted?: { at: string; by: string; note: string };
}

export interface SegCheck {
  area: string;
  title: string;
  key: string;
  st: 'pass' | 'fail' | 'warn' | 'skip';
  note?: string;
}

export interface SegTool {
  name: string;
  ran: boolean;
  note: string;
  ms: number;
  log?: string;
}

export interface SegRun {
  id: string;
  at: string;
  when: string;
  by: string;
  label?: string;
  target: string;
  commit: string;
  ok: boolean;
  score: number;
  /** Abertas de severidade crítica ou alta: o que reprova o portão. */
  blocking: number;
  counts: Record<Sev, number>;
  tools: SegTool[];
  checks: SegCheck[];
  findings: SegFinding[];
  files: number;
  dur: number;
  notes: string[];
  dir: string;
  report: string;
}

export interface SegRunOptions {
  workspace: string;
  projectName: string;
  label?: string;
  onProgress?: (line: string) => void;
  registerKill?: (kill: () => void) => void;
}

const WIN = process.platform === 'win32';
const MAX_FILES = 4000;
const MAX_BYTES = 512 * 1024;
const HISTORY_COMMITS = 400;
const HISTORY_TIMEOUT_MS = 180000;
/** Prefixos das regras de segredo, para o git filtrar o histórico (-G, regex POSIX estendida). */
const HISTORY_PREFIXES = 'PRIVATE KEY|AKIA|ASIA|gh[pousr]_|github_pat_|sk-|sk_live|sk_test|rk_live|AIza|xox[baprs]-|hooks\.slack\.com|SG\.|://[^:/ ]+:[^@ ]+@|eyJ';

const pad = (n: number) => String(n).padStart(2, '0');
const stampId = (d = new Date()) => `SEC-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const toPosix = (p: string) => p.replace(/\\/g, '/');

export function segRoot(workspace: string): string {
  return path.join(workspace, 'qa', 'seguranca');
}

function acceptFile(workspace: string): string {
  return path.join(workspace, '.tavir', 'seguranca-aceites.json');
}

export function readSegAccepts(workspace: string): Record<string, { at: string; by: string; note: string; title?: string }> {
  try {
    return JSON.parse(fs.readFileSync(acceptFile(workspace), 'utf8')) || {};
  } catch {
    return {};
  }
}

/** Risco aceito pelo CEO: sai do portão, mas continua no relatório com a justificativa. */
export function setSegAccept(workspace: string, fp: string, accept: { by: string; note: string; title?: string } | null): void {
  const all = readSegAccepts(workspace);
  if (accept) all[fp] = { at: new Date().toISOString(), ...accept };
  else delete all[fp];
  fs.mkdirSync(path.dirname(acceptFile(workspace)), { recursive: true });
  fs.writeFileSync(acceptFile(workspace), JSON.stringify(all, null, 2), 'utf8');
}

function which(name: string): string | null {
  try {
    const out = execFileSync(WIN ? 'where' : 'which', [name], { stdio: 'pipe', windowsHide: true, encoding: 'utf8' });
    return out.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

function isGitRepo(ws: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ws, stdio: 'pipe', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function gitFiles(ws: string, args: string[]): string[] {
  try {
    const out = execFileSync('git', ['ls-files', '-z', ...args], { cwd: ws, stdio: 'pipe', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    return out.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function walk(ws: string): string[] {
  const out: string[] = [];
  const visit = (rel: string) => {
    if (out.length >= MAX_FILES) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(path.join(ws, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP_DIR.test(r)) visit(r);
      } else if (e.isFile()) out.push(r);
    }
  };
  visit('');
  return out;
}

/** Arquivos que o projeto entrega: os do Git (versionados e novos não ignorados) ou a pasta inteira. */
function listFiles(ws: string, git: boolean): string[] {
  const all = git ? gitFiles(ws, ['-co', '--exclude-standard']) : walk(ws);
  return Array.from(new Set(all.map(toPosix))).filter((f) => !SKIP_DIR.test(f) && !SKIP_FILE.test(f)).slice(0, MAX_FILES);
}

function readText(ws: string, rel: string): string | null {
  try {
    const file = path.join(ws, rel);
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > MAX_BYTES) return null;
    const buf = fs.readFileSync(file);
    if (buf.subarray(0, 4096).includes(0)) return null;
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

type Draft = Omit<SegFinding, 'id' | 'st'>;

const SECRET_TEXT = {
  desc: (title: string) => `${title} aparece em texto no código. Quem tiver acesso ao repositório (ou ao bundle publicado) tem a credencial.`,
  impact: 'Acesso ao serviço com as permissões da credencial: dados, cobrança e infraestrutura.',
  fix: 'Revogar e gerar uma nova credencial no provedor, mover para variável de ambiente (.env fora do Git) e ler com process.env.',
  code: '- const chave = "sk_live_…"\n+ const chave = process.env.STRIPE_SECRET_KEY',
  refs: ['OWASP A07:2021 · Identification and Authentication Failures', 'CWE-798'],
};

function scanSecrets(rel: string, text: string, out: Draft[]): void {
  const lines = text.split(/\r?\n/);
  const isExample = /\.(?:example|sample|template|dist)$|example|exemplo|fixture|mock|__tests__|\.spec\.|\.test\./i.test(rel);
  lines.forEach((line, i) => {
    if (line.length > 2000) return;
    for (const r of SECRET_RULES) {
      const m = r.re.exec(line);
      if (!m) continue;
      const value = m[r.group || 0] || m[0];
      if (r.id !== 'chave-privada' && isPlaceholder(value)) continue;
      let sev = r.sev;
      let title = r.title;
      if (r.id === 'jwt') {
        const role = jwtRole(value);
        if (/anon/i.test(role)) { sev = 'info'; title = 'JWT público (papel anon) no código'; }
        else if (/service_role/i.test(role)) { sev = 'crítica'; title = 'JWT service_role do Supabase no código'; }
      }
      if (isExample && SEV_ORDER[sev] < SEV_ORDER['média']) sev = 'média';
      const shown = line.replace(value, maskSecret(value)).trim().slice(0, 240);
      out.push({
        fp: sha(`segredo|${r.id}|${rel}|${sha(value)}`), sev, title, key: 'secrets', tool: 'Regras TAVIR · segredos', where: `${rel}:${i + 1}`, file: rel, line: i + 1,
        desc: SECRET_TEXT.desc(title) + (isExample ? ' O arquivo parece exemplo ou teste; confira se o valor é real.' : ''), ev: `${rel}:${i + 1}\n${shown}`,
        impact: SECRET_TEXT.impact, fix: SECRET_TEXT.fix, code: SECRET_TEXT.code, refs: SECRET_TEXT.refs,
      });
      break;
    }
  });
}

function scanCode(rel: string, text: string, out: Draft[]): void {
  const lines = text.split(/\r?\n/);
  for (const r of CODE_RULES) {
    if (!r.ext.test(rel)) continue;
    const hits: number[] = [];
    lines.forEach((line, i) => {
      if (line.length > 2000) return;
      const t = line.trim();
      if (/^(?:\/\/|\*|#|<!--)/.test(t)) return;
      if (r.re.test(r.strip ? line.replace(r.strip, '') : line)) hits.push(i);
    });
    if (!hits.length) continue;
    const ev = hits.slice(0, 3).map((i) => `${rel}:${i + 1}  ${lines[i].trim().slice(0, 200)}`).join('\n') + (hits.length > 3 ? `\n… e mais ${hits.length - 3} ocorrência(s)` : '');
    out.push({
      fp: sha(`codigo|${r.id}|${rel}`), sev: r.sev, title: r.title, key: r.key, tool: 'Regras TAVIR · código', where: `${rel}:${hits[0] + 1}${hits.length > 1 ? ` (+${hits.length - 1})` : ''}`, file: rel, line: hits[0] + 1,
      desc: r.desc, ev, impact: r.impact, fix: r.fix, code: r.code, refs: r.refs,
    });
  }
}

interface Signals {
  web: boolean;
  electron: boolean;
  csp: string | null;
  trackers: string[];
  consent: boolean;
  forms: string[];
  privacy: boolean;
  dpo: boolean;
  prechecked: string[];
}

function collectSignals(ws: string, files: string[], texts: Map<string, string>): Signals {
  const sig: Signals = { web: false, electron: false, csp: null, trackers: [], consent: false, forms: [], privacy: false, dpo: false, prechecked: [] };
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    sig.electron = !!deps.electron;
    if (deps.react || deps.vue || deps.next || deps.nuxt || deps.svelte || deps.astro || deps.vite || deps['solid-js'] || deps.express || deps.fastify) sig.web = true;
  } catch {}
  for (const rel of files) {
    const text = texts.get(rel);
    if (!text) continue;
    const front = /\.(?:html?|[jt]sx|vue|svelte|astro)$/i.test(rel);
    if (/\.html?$/i.test(rel)) sig.web = true;
    if (!sig.csp && (CSP_DECL.test(text) || (/(?:^|\/)(?:_headers|vercel\.json|netlify\.toml|firebase\.json)$/.test(rel) && /Content-Security-Policy/i.test(text)))) sig.csp = rel;
    if (front || /\.(?:[cm]?[jt]s)$/i.test(rel)) {
      if (TRACKERS.test(text) && sig.trackers.length < 5) sig.trackers.push(rel);
      if (CONSENT.test(text)) sig.consent = true;
    }
    if (front) {
      if (PERSONAL_INPUT.test(text) && sig.forms.length < 5) sig.forms.push(rel);
      // Só marcação de verdade: <input> dentro de string JS (dado de demonstração, diff) não conta.
      if (PRECHECKED_CONSENT.test(text) && sig.prechecked.length < 5 && text.split(/\r?\n/).some((l) => PRECHECKED_CONSENT.test(l) && !/['"`]\s*[-+]?\s*<input/.test(l))) sig.prechecked.push(rel);
      if (PRIVACY_LINK.test(text)) sig.privacy = true;
      if (DPO.test(text)) sig.dpo = true;
    } else if (/\.(?:md|txt)$/i.test(rel) && /privacidade|privacy/i.test(rel)) {
      sig.privacy = true;
      if (DPO.test(text)) sig.dpo = true;
    }
  }
  return sig;
}

function signalFindings(sig: Signals): Draft[] {
  const out: Draft[] = [];
  if (sig.web && !sig.csp) {
    out.push({
      fp: sha('sinal|csp'), sev: 'média', title: 'Content-Security-Policy não definida', key: 'csp', tool: 'Regras TAVIR · configuração', where: 'Projeto inteiro (HTML, configuração de hospedagem e servidor)',
      desc: 'Nenhum arquivo do projeto declara Content-Security-Policy (meta tag, _headers, vercel.json, netlify.toml, helmet ou config do framework).',
      ev: 'Procurado em: <meta http-equiv="Content-Security-Policy">, _headers, vercel.json, netlify.toml, firebase.json, helmet(), contentSecurityPolicy\nResultado: nenhuma declaração',
      impact: 'Sem CSP, qualquer script injetado (XSS, extensão, CDN comprometida) roda com as permissões da página.',
      fix: 'Declarar a política na hospedagem ou no HTML, liberando só as origens que o site usa.',
      code: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; frame-ancestors 'none'">`,
      refs: ['OWASP A05:2021 · Security Misconfiguration', 'MDN · Content-Security-Policy'],
    });
  }
  if (sig.trackers.length && !sig.consent) {
    out.push({
      fp: sha('sinal|cookies'), sev: 'alta', title: 'Rastreamento carrega sem mecanismo de consentimento', key: 'cookies', tool: 'Regras TAVIR · LGPD', where: sig.trackers.join(', '),
      desc: 'O projeto carrega Google Analytics/Tag Manager, Meta Pixel, Hotjar ou similar, e não há banner ou gestão de consentimento no código.',
      ev: `Rastreadores em: ${sig.trackers.join(', ')}\nProcurado: consent, consentimento, cookie banner, Cookiebot, OneTrust, Klaro, cookieconsent\nResultado: nenhum`,
      impact: 'Coleta de dado pessoal (cookies de identificação) sem base legal.',
      fix: 'Carregar os rastreadores só depois do aceite da categoria correspondente num banner granular.',
      code: "if (consent.analytics) {\n  const s = document.createElement('script')\n  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXX'\n  document.head.appendChild(s)\n}",
      refs: ['LGPD art. 7º, I', 'Guia orientativo da ANPD sobre cookies (2022)'],
    });
  }
  if (sig.forms.length && !sig.privacy) {
    out.push({
      fp: sha('sinal|consent'), sev: 'média', title: 'Formulário coleta dado pessoal sem apontar a política de privacidade', key: 'consent', tool: 'Regras TAVIR · LGPD', where: sig.forms.join(', '),
      desc: 'Há campos de e-mail, telefone, nome ou CPF, e nenhuma página do front menciona política de privacidade.',
      ev: `Campos de dado pessoal em: ${sig.forms.join(', ')}\nProcurado: privacidade, privacy, política de dados\nResultado: nenhum`,
      impact: 'O titular não sabe para que o dado serve; falta transparência exigida pela LGPD.',
      fix: 'Criar a página de política e linkar junto do botão de envio, com aceite explícito.',
      code: '<label><input type="checkbox" name="aceite" required> Li e aceito a <a href="/privacidade">política de privacidade</a></label>',
      refs: ['LGPD art. 6º, VI', 'LGPD art. 9º'],
    });
  }
  if (sig.prechecked.length) {
    out.push({
      fp: sha('sinal|prechecked'), sev: 'média', title: 'Aceite de privacidade já vem marcado', key: 'consent', tool: 'Regras TAVIR · LGPD', where: sig.prechecked.join(', '),
      desc: 'Uma caixa de aceite (privacidade, termos, LGPD) aparece marcada por padrão. Consentimento pré-marcado não é livre nem inequívoco.',
      ev: `Caixa marcada em: ${sig.prechecked.join(', ')}`,
      impact: 'Dados coletados sem base legal válida.',
      fix: 'Deixar desmarcado e bloquear o envio até o aceite.',
      code: '- <input type="checkbox" name="aceite" checked>\n+ <input type="checkbox" name="aceite" required>',
      refs: ['LGPD art. 8º, §4º'],
    });
  }
  if ((sig.forms.length || sig.trackers.length) && !sig.dpo) {
    out.push({
      fp: sha('sinal|dpo'), sev: 'baixa', title: 'Encarregado (DPO) não informado', key: 'dpo', tool: 'Regras TAVIR · LGPD', where: 'Rodapé e política de privacidade',
      desc: 'O projeto coleta dado pessoal e não informa quem é o encarregado nem como falar com ele.',
      ev: 'Procurado: encarregado, DPO, data protection officer\nResultado: nenhum',
      impact: 'Descumpre o dever de transparência.',
      fix: 'Incluir nome e e-mail do encarregado no rodapé e na política.',
      code: '<a href="mailto:dpo@empresa.com.br">Encarregado de dados: Nome Sobrenome</a>',
      refs: ['LGPD art. 41, §1º'],
    });
  }
  return out;
}

/** .env com valor real versionado no Git. */
function envFindings(ws: string, git: boolean): Draft[] {
  if (!git) return [];
  const tracked = gitFiles(ws, []).map(toPosix).filter((f) => /(?:^|\/)\.env(?:\.[\w-]+)?$/.test(f) && !/\.(?:example|sample|template|dist)$/.test(f));
  return tracked.map((f) => ({
    fp: sha(`env|${f}`), sev: 'alta' as Sev, title: 'Arquivo .env versionado no Git', key: 'secrets', tool: 'Regras TAVIR · segredos', where: f, file: f,
    desc: `${f} está no repositório. Arquivos .env guardam credenciais e não devem ir para o Git.`,
    ev: `git ls-files → ${f}`,
    impact: 'Toda credencial do arquivo fica no histórico para sempre, mesmo se apagada depois.',
    fix: 'git rm --cached no arquivo, incluir .env no .gitignore, versionar só um .env.example sem valores e trocar as credenciais.',
    code: `git rm --cached ${f}\necho ".env*" >> .gitignore\necho "!.env.example" >> .gitignore`,
    refs: ['CWE-538', 'OWASP A05:2021'],
  }));
}

/** Segredos que entraram em algum commit (mesmo que já apagados do código). */
async function scanHistory(ws: string, current: Set<string>, track: (c: ChildProcess | null) => void): Promise<{ drafts: Draft[]; note: string; ms: number }> {
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  let commit = '';
  let file = '';
  const onLine = (line: string) => {
    if (line.startsWith('@@@')) { commit = line.slice(3); return; }
    if (line.startsWith('+++ ')) { file = line.replace(/^\+\+\+ (?:b\/)?/, ''); return; }
    if (!line.startsWith('+') || line.length > 2000 || !file || SKIP_FILE.test(file) || SKIP_DIR.test(file)) return;
    const text = line.slice(1);
    for (const r of SECRET_RULES) {
      if (r.id === 'credencial') continue;
      const m = r.re.exec(text);
      if (!m) continue;
      const value = m[r.group || 0] || m[0];
      if (r.id !== 'chave-privada' && isPlaceholder(value)) break;
      if (r.id === 'jwt' && /anon/i.test(jwtRole(value))) break;
      const fpNow = sha(`segredo|${r.id}|${file}|${sha(value)}`);
      const fp = sha(`historico|${r.id}|${sha(value)}`);
      if (current.has(fpNow) || seen.has(fp)) break;
      seen.add(fp);
      const [hash, date] = commit.split(' ');
      drafts.push({
        fp, sev: r.sev === 'crítica' ? 'alta' : r.sev, title: `${r.title} no histórico do Git`, key: 'history', tool: 'Regras TAVIR · histórico', where: `commit ${hash} · ${file}`, file,
        desc: `A credencial não está mais no código atual, mas entrou no commit ${hash} (${date}). Quem clonar o repositório recupera o valor.`,
        ev: `git show ${hash} -- ${file}\n+${text.replace(value, maskSecret(value)).trim().slice(0, 220)}`,
        impact: 'A credencial continua válida para quem tiver o histórico, até ser revogada.',
        fix: 'Revogar a credencial no provedor (obrigatório). Se o repositório for público ou compartilhado, reescrever o histórico com git filter-repo.',
        code: `git filter-repo --path ${file} --invert-paths   # só depois de revogar`,
        refs: ['CWE-798', 'GitHub · Removing sensitive data from a repository'],
      });
      break;
    }
  };
  // Lido em fluxo: o diff de um repositório grande passa de centenas de MB. O -G deixa o
  // próprio git descartar os commits sem nenhum prefixo de segredo.
  const started = Date.now();
  const res = await new Promise<{ code: number | null; err: string; timedOut: boolean }>((resolve) => {
    const child = spawn('git', ['log', '--all', '-p', '-U0', '--no-color', '--no-ext-diff', '--no-renames', `-n${HISTORY_COMMITS}`, '--format=@@@%h %ad %an', '--date=short', `-G${HISTORY_PREFIXES}`, '--', '.', ':(exclude)*.min.js', ':(exclude)*.map', ':(exclude)*lock*'], { cwd: ws, windowsHide: true });
    track(child);
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, HISTORY_TIMEOUT_MS);
    readline.createInterface({ input: child.stdout }).on('line', onLine);
    child.stderr.on('data', (b: Buffer) => { err = (err + b.toString('utf8')).slice(-2000); });
    child.on('error', (e) => { err += e.message; });
    child.on('close', (code) => { clearTimeout(timer); track(null); resolve({ code, err, timedOut }); });
  });
  const ms = Date.now() - started;
  if (res.timedOut) return { drafts, note: `histórico parcial: parou em ${Math.round(HISTORY_TIMEOUT_MS / 1000)} s`, ms };
  if (res.code !== 0 && !drafts.length) return { drafts, note: `git log falhou: ${tail(res.err, 3)}`, ms };
  return { drafts, note: `${HISTORY_COMMITS} commits mais recentes`, ms };
}

const NPM_SEV: Record<string, Sev> = { critical: 'crítica', high: 'alta', moderate: 'média', medium: 'média', low: 'baixa', info: 'info', unknown: 'baixa' };

async function npmAudit(ws: string, outDir: string, track: (c: ChildProcess | null) => void): Promise<{ tool: SegTool; drafts: Draft[] }> {
  const pnpm = fs.existsSync(path.join(ws, 'pnpm-lock.yaml'));
  const lock = pnpm || fs.existsSync(path.join(ws, 'package-lock.json'));
  const name = pnpm ? 'pnpm audit' : 'npm audit';
  if (!lock) return { tool: { name, ran: false, note: fs.existsSync(path.join(ws, 'yarn.lock')) ? 'Projeto com yarn: rode yarn npm audit (não automatizado).' : 'Sem package-lock.json: o npm audit precisa da trava de dependências.', ms: 0 }, drafts: [] };
  const cmd = WIN ? `${pnpm ? 'pnpm' : 'npm'}.cmd` : pnpm ? 'pnpm' : 'npm';
  const res = await runCommand(cmd, ['audit', '--json'], ws, 180000, track);
  const log = path.join(outDir, 'logs', `${pnpm ? 'pnpm' : 'npm'}-audit.json`);
  fs.writeFileSync(log, res.out, 'utf8');
  let data: any = null;
  try { data = JSON.parse(res.out.slice(res.out.indexOf('{'))); } catch {}
  if (!data || data.error) return { tool: { name, ran: false, note: `Não rodou: ${data?.error?.summary || tail(res.out, 3) || 'sem resposta do registro'}`, ms: res.ms, log: 'logs/' + path.basename(log) }, drafts: [] };
  const drafts: Draft[] = [];
  const vulns: Record<string, any> = data.vulnerabilities || {};
  for (const [pkg, v] of Object.entries(vulns)) {
    const advisories = (v.via || []).filter((x: any) => typeof x === 'object');
    if (!advisories.length) continue; // só transitiva: o achado fica no pacote de origem
    const sev = NPM_SEV[v.severity] || 'baixa';
    const fixTxt = v.fixAvailable === true ? `${pnpm ? 'pnpm update' : 'npm audit fix'}` : v.fixAvailable && typeof v.fixAvailable === 'object' ? `Atualizar ${v.fixAvailable.name} para ${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (versão maior, revisar quebras)' : ''}` : 'Sem correção publicada: avaliar troca do pacote ou mitigação.';
    drafts.push({
      fp: sha(`deps|${pkg}|${advisories.map((a: any) => a.source || a.url).sort().join(',')}`), sev, title: `${pkg}: ${advisories[0].title || 'vulnerabilidade conhecida'}`, key: 'deps', tool: name, where: `${pkg} ${v.range || ''}`.trim(),
      desc: advisories.map((a: any) => `${a.title} (${a.severity}${a.cvss?.score ? ` · CVSS ${a.cvss.score}` : ''})`).join('\n'),
      ev: `${name} --json\n${pkg} · faixa afetada ${v.range || '?'}${(v.nodes || []).length ? `\nem ${(v.nodes || []).slice(0, 3).join(', ')}` : ''}`,
      impact: 'Depende do uso do pacote; vulnerabilidades altas e críticas costumam permitir execução de código ou negação de serviço.',
      fix: fixTxt, code: v.fixAvailable === true ? `${pnpm ? 'pnpm update' : 'npm audit fix'}` : '',
      refs: advisories.map((a: any) => a.url).filter(Boolean).slice(0, 3),
    });
  }
  const meta = data.metadata?.vulnerabilities;
  return { tool: { name, ran: true, note: meta ? `${meta.total ?? Object.keys(vulns).length} vulnerabilidade(s) no grafo` : 'ok', ms: res.ms, log: 'logs/' + path.basename(log) }, drafts };
}

const SEMGREP_KEY = (id: string) => (/inject|sqli|command|exec|shell/i.test(id) ? 'inj' : /xss|innerhtml|html/i.test(id) ? 'xss' : /eval|deserial|pickle/i.test(id) ? 'eval' : /crypto|hash|md5|sha1|random/i.test(id) ? 'crypto' : /tls|ssl|cert|http/i.test(id) ? 'tls' : /secret|password|key|token/i.test(id) ? 'secrets' : /cors/i.test(id) ? 'cors' : 'sast');

async function semgrep(bin: string, ws: string, outDir: string, track: (c: ChildProcess | null) => void): Promise<{ tool: SegTool; drafts: Draft[] }> {
  const res = await runCommand(bin, ['scan', '--config', 'p/default', '--metrics=off', '--json', '--quiet', '--timeout', '30', '--exclude', 'qa', '--exclude', '.tavir', '.'], ws, 600000, track);
  fs.writeFileSync(path.join(outDir, 'logs', 'semgrep.json'), res.out, 'utf8');
  let data: any = null;
  try { data = JSON.parse(res.out.slice(res.out.indexOf('{'))); } catch {}
  if (!data) return { tool: { name: 'semgrep', ran: false, note: `Não rodou: ${tail(res.out, 3)}`, ms: res.ms, log: 'logs/semgrep.json' }, drafts: [] };
  const drafts: Draft[] = (data.results || []).map((r: any) => {
    const file = toPosix(String(r.path || ''));
    const sev: Sev = r.extra?.severity === 'ERROR' ? 'alta' : r.extra?.severity === 'WARNING' ? 'média' : 'baixa';
    const id = String(r.check_id || 'semgrep');
    return {
      fp: sha(`semgrep|${id}|${file}|${String(r.extra?.lines || '').trim()}`), sev, title: String(r.extra?.message || id).split('\n')[0].slice(0, 140), key: SEMGREP_KEY(id), tool: 'semgrep', where: `${file}:${r.start?.line || ''}`, file, line: r.start?.line,
      desc: String(r.extra?.message || ''), ev: `${file}:${r.start?.line || ''}\n${String(r.extra?.lines || '').trim().slice(0, 400)}`, impact: String(r.extra?.metadata?.impact || r.extra?.metadata?.category || ''),
      fix: String(r.extra?.fix || r.extra?.metadata?.remediation || 'Ver a regra no registro do semgrep.'), code: String(r.extra?.fix || ''), refs: [id, ...[].concat(r.extra?.metadata?.owasp || []), ...[].concat(r.extra?.metadata?.cwe || [])].slice(0, 4).map(String),
    };
  });
  return { tool: { name: 'semgrep', ran: true, note: `${drafts.length} achado(s) · regras p/default`, ms: res.ms, log: 'logs/semgrep.json' }, drafts };
}

async function gitleaks(bin: string, ws: string, outDir: string, git: boolean, track: (c: ChildProcess | null) => void): Promise<{ tool: SegTool; drafts: Draft[] }> {
  const report = path.join(outDir, 'logs', 'gitleaks.json');
  const args = ['detect', '--source', '.', '--no-banner', '--redact', '--report-format', 'json', '--report-path', report, '--exit-code', '0'];
  if (!git) args.push('--no-git');
  const res = await runCommand(bin, args, ws, 600000, track);
  let data: any[] = [];
  try { data = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    return { tool: { name: 'gitleaks', ran: false, note: `Não rodou: ${tail(res.out, 3)}`, ms: res.ms }, drafts: [] };
  }
  const drafts: Draft[] = data.map((g) => {
    const file = toPosix(String(g.File || ''));
    return {
      fp: sha(`gitleaks|${g.RuleID}|${file}|${g.Fingerprint || g.Secret}`), sev: 'alta' as Sev, title: `${g.Description || g.RuleID} (gitleaks)`, key: g.Commit ? 'history' : 'secrets', tool: 'gitleaks', where: `${file}:${g.StartLine}${g.Commit ? ` · commit ${String(g.Commit).slice(0, 7)}` : ''}`, file, line: g.StartLine,
      desc: SECRET_TEXT.desc(g.Description || 'Uma credencial'), ev: `${file}:${g.StartLine}\n${String(g.Match || '').slice(0, 220)}`,
      impact: SECRET_TEXT.impact, fix: SECRET_TEXT.fix, code: SECRET_TEXT.code, refs: [`gitleaks · ${g.RuleID}`, 'CWE-798'],
    };
  });
  return { tool: { name: 'gitleaks', ran: true, note: `${drafts.length} segredo(s)${git ? ' · histórico inteiro' : ''}`, ms: res.ms, log: 'logs/gitleaks.json' }, drafts };
}

async function trivy(bin: string, ws: string, outDir: string, track: (c: ChildProcess | null) => void): Promise<{ tool: SegTool; drafts: Draft[] }> {
  const res = await runCommand(bin, ['fs', '--quiet', '--format', 'json', '--scanners', 'vuln,misconfig', '--skip-dirs', 'node_modules', '--skip-dirs', 'qa', '--skip-dirs', '.tavir', '.'], ws, 900000, track);
  fs.writeFileSync(path.join(outDir, 'logs', 'trivy.json'), res.out, 'utf8');
  let data: any = null;
  try { data = JSON.parse(res.out.slice(res.out.indexOf('{'))); } catch {}
  if (!data) return { tool: { name: 'trivy', ran: false, note: `Não rodou: ${tail(res.out, 3)}`, ms: res.ms, log: 'logs/trivy.json' }, drafts: [] };
  const drafts: Draft[] = [];
  for (const r of data.Results || []) {
    for (const v of r.Vulnerabilities || []) {
      drafts.push({
        fp: sha(`trivy|${v.VulnerabilityID}|${v.PkgName}|${r.Target}`), sev: NPM_SEV[String(v.Severity).toLowerCase()] || 'baixa', title: `${v.PkgName}: ${v.Title || v.VulnerabilityID}`, key: 'deps', tool: 'trivy', where: `${r.Target} · ${v.PkgName} ${v.InstalledVersion}`,
        desc: String(v.Description || v.Title || '').slice(0, 600), ev: `${v.VulnerabilityID} · ${v.PkgName} ${v.InstalledVersion}${v.FixedVersion ? ` → corrigido em ${v.FixedVersion}` : ''}`,
        impact: 'Ver o aviso do pacote.', fix: v.FixedVersion ? `Atualizar ${v.PkgName} para ${v.FixedVersion}.` : 'Sem versão corrigida publicada.', code: '', refs: [v.PrimaryURL, v.VulnerabilityID].filter(Boolean),
      });
    }
    for (const m of r.Misconfigurations || []) {
      if (m.Status && m.Status !== 'FAIL') continue;
      drafts.push({
        fp: sha(`trivy-cfg|${m.ID}|${r.Target}`), sev: NPM_SEV[String(m.Severity).toLowerCase()] || 'baixa', title: m.Title || m.ID, key: 'iac', tool: 'trivy', where: `${r.Target}${m.CauseMetadata?.StartLine ? `:${m.CauseMetadata.StartLine}` : ''}`, file: toPosix(r.Target),
        desc: String(m.Description || m.Message || ''), ev: String(m.Message || ''), impact: '', fix: String(m.Resolution || ''), code: '', refs: [m.PrimaryURL || m.AVDID || m.ID].filter(Boolean),
      });
    }
  }
  return { tool: { name: 'trivy', ran: true, note: `${drafts.length} achado(s) · vuln + misconfig`, ms: res.ms, log: 'logs/trivy.json' }, drafts };
}

function lastRun(workspace: string): SegRun | null {
  const runs = listSegRuns(workspace, 1, false);
  return runs[runs.length - 1] || null;
}

export async function runSeg(opts: SegRunOptions): Promise<SegRun> {
  const workspace = path.resolve(opts.workspace);
  const started = Date.now();
  const now = new Date();
  const id = stampId(now);
  const prev = lastRun(workspace);
  const dir = path.join(segRoot(workspace), id);
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
  excludeFromProjectGit(workspace);
  const say = (line: string) => opts.onProgress?.(line);
  let child: ChildProcess | null = null;
  let killed = false;
  const track = (c: ChildProcess | null) => { child = c; };
  opts.registerKill?.(() => {
    killed = true;
    try { (child as ChildProcess | null)?.kill(); } catch {}
  });

  const notes: string[] = [];
  const tools: SegTool[] = [];
  const drafts: Draft[] = [];
  const git = isGitRepo(workspace);
  if (!git) notes.push('A pasta não é um repositório Git: histórico não foi verificado e a lista de arquivos veio da pasta inteira.');

  say('Listando os arquivos do projeto');
  const files = listFiles(workspace, git);
  const texts = new Map<string, string>();
  for (const f of files) {
    const t = readText(workspace, f);
    if (t != null) texts.set(f, t);
  }
  if (files.length >= MAX_FILES) notes.push(`O projeto tem mais de ${MAX_FILES} arquivos; só os primeiros foram lidos pelas regras próprias.`);

  say(`Procurando segredos e padrões perigosos em ${texts.size} arquivo(s)`);
  let t0 = Date.now();
  const secretDrafts: Draft[] = [];
  const codeDrafts: Draft[] = [];
  for (const [rel, text] of texts) {
    scanSecrets(rel, text, secretDrafts);
    scanCode(rel, text, codeDrafts);
  }
  secretDrafts.push(...envFindings(workspace, git));
  const sig = collectSignals(workspace, files, texts);
  const sigDrafts = signalFindings(sig);
  drafts.push(...secretDrafts, ...codeDrafts, ...sigDrafts);
  tools.push({ name: 'Regras TAVIR · segredos', ran: true, note: `${secretDrafts.length} achado(s) em ${texts.size} arquivo(s)`, ms: 0 });
  tools.push({ name: 'Regras TAVIR · código', ran: true, note: `${CODE_RULES.length} regras · ${codeDrafts.length} achado(s)`, ms: Date.now() - t0 });
  tools.push({ name: 'Regras TAVIR · LGPD e configuração', ran: true, note: `${sigDrafts.length} achado(s)`, ms: 0 });

  const gl = which('gitleaks');
  if (gl && !killed) {
    say('gitleaks: segredos no código e no histórico');
    const r = await gitleaks(gl, workspace, dir, git, track);
    tools.push(r.tool);
    drafts.push(...r.drafts);
  }
  if (git && !killed && !(gl && tools[tools.length - 1].ran)) {
    say('Procurando segredos no histórico do Git');
    const r = await scanHistory(workspace, new Set(secretDrafts.map((d) => d.fp)), track);
    tools.push({ name: 'Regras TAVIR · histórico do Git', ran: !r.note.startsWith('git log falhou'), note: `${r.drafts.length} achado(s) · ${r.note}`, ms: r.ms });
    drafts.push(...r.drafts);
  }

  const hasNode = fs.existsSync(path.join(workspace, 'package.json'));
  if (hasNode && !killed) {
    say('Auditando dependências');
    const r = await npmAudit(workspace, dir, track);
    tools.push(r.tool);
    drafts.push(...r.drafts);
  }
  const pa = which('pip-audit');
  if (!killed && pa && fs.existsSync(path.join(workspace, 'requirements.txt'))) {
    say('pip-audit: dependências Python');
    const res = await runCommand(pa, ['-r', 'requirements.txt', '-f', 'json'], workspace, 300000, track);
    fs.writeFileSync(path.join(dir, 'logs', 'pip-audit.json'), res.out, 'utf8');
    let data: any = null;
    try { data = JSON.parse(res.out.slice(res.out.indexOf('{'))); } catch {}
    const deps = data?.dependencies || [];
    for (const d of deps) for (const v of d.vulns || []) {
      drafts.push({ fp: sha(`pip|${d.name}|${v.id}`), sev: 'alta', title: `${d.name}: ${v.id}`, key: 'deps', tool: 'pip-audit', where: `${d.name} ${d.version}`, desc: String(v.description || '').slice(0, 600), ev: `${v.id} · ${d.name} ${d.version}`, impact: '', fix: v.fix_versions?.length ? `Atualizar para ${v.fix_versions.join(' ou ')}.` : 'Sem versão corrigida.', code: '', refs: [v.id, ...(v.aliases || [])].slice(0, 3) });
    }
    tools.push({ name: 'pip-audit', ran: !!data, note: data ? `${deps.length} pacote(s) verificados` : `Não rodou: ${tail(res.out, 3)}`, ms: res.ms, log: 'logs/pip-audit.json' });
  }
  const sg = which('semgrep');
  if (sg && !killed) {
    say('semgrep: análise estática');
    const r = await semgrep(sg, workspace, dir, track);
    tools.push(r.tool);
    drafts.push(...r.drafts);
  }
  const tv = which('trivy');
  if (tv && !killed) {
    say('trivy: dependências e configuração');
    const r = await trivy(tv, workspace, dir, track);
    tools.push(r.tool);
    drafts.push(...r.drafts);
  }
  const missing = [!gl && 'gitleaks', !sg && 'semgrep', !tv && 'trivy'].filter(Boolean) as string[];
  if (missing.length) notes.push(`Ferramentas externas ausentes: ${missing.join(', ')}. As regras próprias cobriram segredos, histórico e código; instale para ampliar a cobertura.`);
  if (killed) notes.push('Varredura interrompida antes do fim.');

  // Deduplica por impressão digital, ordena e numera.
  const byFp = new Map<string, Draft>();
  for (const d of drafts) if (!byFp.has(d.fp) || SEV_ORDER[d.sev] < SEV_ORDER[byFp.get(d.fp)!.sev]) byFp.set(d.fp, d);
  const accepts = readSegAccepts(workspace);
  const current = Array.from(byFp.values()).map<SegFinding>((d) => ({ ...d, id: '', st: accepts[d.fp] ? 'aceita' : 'aberta', accepted: accepts[d.fp] }));
  // O que estava aberto na varredura anterior e sumiu agora foi corrigido.
  const fixed = (prev?.findings || []).filter((f) => f.st !== 'corrigida' && !byFp.has(f.fp)).map((f) => ({ ...f, st: 'corrigida' as SegStatus }));
  const findings = current.concat(fixed).sort((a, b) => Number(a.st === 'corrigida') - Number(b.st === 'corrigida') || SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || a.where.localeCompare(b.where));
  findings.forEach((f, i) => { f.id = `F-${String(i + 1).padStart(2, '0')}`; });

  const open = findings.filter((f) => f.st === 'aberta');
  const counts = { 'crítica': 0, 'alta': 0, 'média': 0, 'baixa': 0, 'info': 0 } as Record<Sev, number>;
  for (const f of open) counts[f.sev]++;
  const blocking = counts['crítica'] + counts['alta'];
  const score = Math.max(0, 100 - open.reduce((a, f) => a + SEV_WEIGHT[f.sev], 0));

  const ran = (name: string) => tools.some((t) => t.ran && t.name.startsWith(name));
  const applies: Record<string, string | null> = {
    history: git ? null : 'Pasta sem Git',
    deps: hasNode ? (ran('npm audit') || ran('pnpm audit') || ran('trivy') ? null : 'Auditoria de dependências não rodou') : ran('trivy') || ran('pip-audit') ? null : 'Sem manifesto de dependências reconhecido',
    csp: sig.web ? null : 'Projeto sem front web',
    electron: sig.electron ? null : 'Não é app Electron',
    sast: sg ? null : 'semgrep não instalado',
    iac: tv ? null : 'trivy não instalado',
    cookies: sig.trackers.length ? null : 'Nenhum rastreador encontrado',
    consent: sig.forms.length || sig.prechecked.length ? null : 'Nenhum formulário com dado pessoal',
    dpo: sig.forms.length || sig.trackers.length ? null : 'Projeto não coleta dado pessoal no front',
  };
  const checks: SegCheck[] = SEG_CHECKS.map(([area, title, key]) => {
    const hit = open.filter((f) => f.key === key);
    if (hit.length) return { area, title, key, st: hit.some((f) => SEV_ORDER[f.sev] <= SEV_ORDER['média']) ? 'fail' : 'warn', note: `${hit.length} aberto(s)` };
    if (applies[key]) return { area, title, key, st: key === 'deps' && hasNode ? 'warn' : 'skip', note: applies[key]! };
    return { area, title, key, st: 'pass' };
  });

  const commit = gitHead(workspace);
  const run: SegRun = {
    id, at: now.toISOString(), when: whenOf(now), by: 'Varredura TAVIR · white box', label: opts.label, target: toPosix(workspace), commit,
    ok: !killed && blocking === 0, score, blocking, counts, tools, checks, findings, files: texts.size, dur: Math.round((Date.now() - started) / 100) / 10, notes,
    dir, report: path.join(dir, 'index.html'),
  };
  fs.writeFileSync(path.join(dir, 'resultado.json'), JSON.stringify(run, null, 2), 'utf8');
  fs.writeFileSync(run.report, renderSegReport(opts.projectName, run), 'utf8');
  fs.appendFileSync(path.join(segRoot(workspace), 'index.jsonl'), JSON.stringify({ id, at: run.at, ok: run.ok, score, blocking, open: open.length, label: opts.label || '' }) + '\n', 'utf8');
  say(run.ok ? `Segurança aprovada · nota ${score}` : `Segurança reprovada · ${blocking} achado(s) crítico(s) ou alto(s)`);
  return run;
}

/** Execuções gravadas; com `overlay`, aplica os riscos aceitos depois da varredura. */
export function listSegRuns(workspace: string, limit = 30, overlay = true): SegRun[] {
  const root = segRoot(path.resolve(workspace));
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(root).filter((d) => /^SEC-\d{8}-\d{6}$/.test(d)).sort().slice(-limit);
  } catch {
    return [];
  }
  const accepts = overlay ? readSegAccepts(workspace) : {};
  const out: SegRun[] = [];
  for (const id of ids) {
    try {
      const run: SegRun = JSON.parse(fs.readFileSync(path.join(root, id, 'resultado.json'), 'utf8'));
      if (overlay) for (const f of run.findings) {
        if (f.st === 'corrigida') continue;
        f.st = accepts[f.fp] ? 'aceita' : 'aberta';
        f.accepted = accepts[f.fp];
      }
      out.push(run);
    } catch {}
  }
  return out;
}

export function segSummary(run: SegRun): string {
  const open = run.findings.filter((f) => f.st === 'aberta');
  const head = run.ok ? `Segurança aprovada · nota ${run.score}/100 · ${open.length} achado(s) aberto(s) sem bloqueio` : `Segurança reprovada · ${run.blocking} achado(s) crítico(s) ou alto(s) · nota ${run.score}/100`;
  const list = open.filter((f) => SEV_ORDER[f.sev] <= SEV_ORDER['média']).slice(0, 8).map((f) => `- ${f.id} [${f.sev}] ${f.title} · ${f.where}`);
  return [head, `Relatório: qa/seguranca/${run.id}/index.html`, ...list, ...run.notes.slice(0, 2).map((n) => `Obs.: ${n}`)].join('\n');
}

