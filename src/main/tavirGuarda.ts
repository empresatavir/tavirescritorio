/**
 * Guarda do estado do Escritório em `.tavir/` durante as rodadas de motor.
 *
 * O agente roda com permissão no projeto inteiro, e `.tavir/` mora dentro dele. Etapa,
 * chamado, decisão e credencial só mudam pelo Escritório (gate do Carlos, portão de QA
 * ou de segurança), então: antes da rodada guardamos os arquivos de estado; o que o
 * Escritório grava durante a rodada é avisado aqui (`escritaDoEscritorio`); no fim,
 * qualquer outra diferença é do agente e volta ao que era. A versão do agente fica em
 * `barrados/` da execução para conferência (a do cofre não, para não copiar segredo).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Arquivos de estado na raiz de `.tavir/`. */
export const ESTADO_PROTEGIDO = [
  'control.json',
  'esteira.json',
  'retrato.json',
  'decisoes.jsonl',
  'absorcao.json',
  'acessos.json',
  'credentials.json',
] as const;
const COFRE = 'credentials.json';

type Foto = Map<string, Buffer>;

export interface Guarda {
  root: string;
  foto: Foto;
  /** Última versão gravada pelo Escritório durante a rodada (null = removido por ele). */
  aceitos: Map<string, Buffer | null>;
}

export interface Barrado {
  /** Caminho relativo a `.tavir/`, com barras normais. */
  rel: string;
  acao: 'restaurado' | 'removido' | 'recriado';
}

const ativas = new Set<Guarda>();

function tavirDir(root: string): string {
  return path.join(root, '.tavir');
}

function ler(f: string): Buffer | null {
  try {
    return fs.readFileSync(f);
  } catch {
    return null;
  }
}

/** Relativos (a `.tavir/`) de todos os arquivos protegidos que existem agora. */
export function arquivosProtegidos(root: string): string[] {
  const t = tavirDir(root);
  const out: string[] = [];
  for (const n of ESTADO_PROTEGIDO) if (fs.existsSync(path.join(t, n))) out.push(n);
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(path.join(t, 'chamados'));
  } catch {}
  for (const id of ids) {
    let nomes: string[] = [];
    try {
      nomes = fs.readdirSync(path.join(t, 'chamados', id));
    } catch {
      continue;
    }
    // Anexos ficam de fora: são arquivos do Carlos, não estado.
    for (const n of nomes) if (n.endsWith('.json')) out.push(`chamados/${id}/${n}`);
  }
  return out;
}

function protegido(rel: string): boolean {
  if ((ESTADO_PROTEGIDO as readonly string[]).includes(rel)) return true;
  return /^chamados\/[^/]+\/[^/]+\.json$/.test(rel);
}

function fotografar(root: string): Foto {
  const foto: Foto = new Map();
  for (const rel of arquivosProtegidos(root)) {
    const b = ler(path.join(tavirDir(root), rel));
    if (b) foto.set(rel, b);
  }
  return foto;
}

function relDe(root: string, file: string): string | null {
  const rel = path.relative(tavirDir(root), path.resolve(file));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.replace(/\\/g, '/');
}

function mesmoRoot(a: string, b: string): boolean {
  const n = (s: string) => path.resolve(s).toLowerCase();
  return n(a) === n(b);
}

/** Abre a guarda antes de uma rodada de motor no projeto. */
export function abrirGuarda(root: string): Guarda {
  const g: Guarda = { root, foto: fotografar(root), aceitos: new Map() };
  ativas.add(g);
  return g;
}

/**
 * O Escritório acabou de gravar `file`. Chame depois de toda gravação de estado em
 * `.tavir/` para que a guarda aberta não desfaça o que é legítimo.
 */
export function escritaDoEscritorio(file: string): void {
  if (!ativas.size) return;
  for (const g of ativas) {
    const rel = relDe(g.root, file);
    if (!rel || !protegido(rel)) continue;
    g.aceitos.set(rel, ler(file));
  }
}

function iguais(a: Buffer | null | undefined, b: Buffer | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.equals(b);
}

function anotarNoChamado(root: string, rel: string, nota: string): void {
  const m = /^chamados\/([^/]+)\/chamado\.json$/.exec(rel);
  if (!m) return;
  const f = path.join(tavirDir(root), rel);
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!Array.isArray(c.historico)) return;
    c.historico.push({ at: new Date().toISOString(), quem: 'Escritório', acao: nota });
    fs.writeFileSync(f, JSON.stringify(c, null, 2), 'utf8');
  } catch {}
}

/**
 * Fecha a guarda: devolve ao estado esperado tudo que o agente mexeu nos arquivos de
 * estado. `barradosDir` recebe a versão do agente (menos a do cofre).
 */
export function fecharGuarda(g: Guarda, opts: { barradosDir?: string; rodada?: string } = {}): Barrado[] {
  ativas.delete(g);
  const t = tavirDir(g.root);
  const agora = fotografar(g.root);
  const esperado = new Map<string, Buffer | null>();
  for (const [rel, b] of g.foto) esperado.set(rel, b);
  for (const [rel, b] of g.aceitos) esperado.set(rel, b);
  const todos = new Set<string>([...esperado.keys(), ...agora.keys()]);
  const out: Barrado[] = [];
  for (const rel of [...todos].sort()) {
    const exp = esperado.get(rel) ?? null;
    const cur = agora.get(rel) ?? null;
    if (iguais(exp, cur)) continue;
    const f = path.join(t, rel);
    if (cur && opts.barradosDir && rel !== COFRE) {
      try {
        fs.mkdirSync(opts.barradosDir, { recursive: true });
        fs.writeFileSync(path.join(opts.barradosDir, rel.replace(/\//g, '__')), cur);
      } catch {}
    }
    try {
      if (exp) {
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, exp);
        out.push({ rel, acao: cur ? 'restaurado' : 'recriado' });
        anotarNoChamado(
          g.root,
          rel,
          `desfez alteração feita direto no arquivo pelo agente${opts.rodada ? ` (rodada ${opts.rodada})` : ''}; chamado só muda pelo Escritório`,
        );
      } else {
        fs.unlinkSync(f);
        out.push({ rel, acao: 'removido' });
      }
      // Outra guarda aberta no mesmo projeto aceita a restauração como do Escritório.
      for (const o of ativas) if (mesmoRoot(o.root, g.root)) o.aceitos.set(rel, ler(f));
    } catch {}
  }
  return out;
}

/** Linha curta para o log da etapa. */
export function resumoBarrados(b: Barrado[]): string {
  if (!b.length) return '';
  const nomes = b.map((x) => `${x.rel} (${x.acao})`).join(', ');
  return `O agente mexeu em arquivo de estado do Escritório e foi desfeito: ${nomes}.`;
}
