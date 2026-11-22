/**
 * Kit de design do projeto: o Escritório copia para `.tavir/design/kit/` a alma, o cânone,
 * as skills, a base de conhecimento e as referências validadas, e devolve o bloco do pedido.
 *
 * É cópia de arquivo e texto no pedido, sem recurso de skill de motor: qualquer motor que
 * leia arquivo do projeto usa. `.tavir/` fica fora do diff e do commit da etapa.
 */
import { listAcervo } from './acervo';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CONTRACT_TEMPLATE,
  DESIGN_FILES,
  DESIGN_KIT_DIR,
  BRAND_BOARDS,
  BRAND_BOARDS_DIR,
  brandBoardsBlock,
  brandBoardsGaps,
  brandGaps,
  contractGaps,
  contractTokens,
  designBlock,
  designSkills,
  type ContractTokens,
  type DesignMode,
  type DesignFamily,
  type DesignRole,
} from '../../shared/design';

/** Arquivo maior que isto não vai para o kit (fontes e binários das skills). */
const MAX_FILE = 400 * 1024;
const SKIP_DIRS = new Set(['canvas-fonts', 'node_modules', '__pycache__', '.git']);

const SOULS: Record<DesignRole, string[]> = {
  direcao: ['marina-marca.md', 'yuri-ux.md'],
  construcao: [],
  revisao: ['revisor-design.md'],
};

export function escritorioRoot(): string {
  return process.cwd();
}

function read(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** Copia só o que mudou (tamanho ou data), para não regravar megabytes a cada etapa. */
function copyTree(src: string, dest: string): number {
  let copied = 0;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(src, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const ent of entries) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) copied += copyTree(from, to);
      continue;
    }
    if (!ent.isFile()) continue;
    const st = fs.statSync(from);
    if (st.size > MAX_FILE) continue;
    let same = false;
    try {
      const cur = fs.statSync(to);
      same = cur.size === st.size && cur.mtimeMs >= st.mtimeMs;
    } catch {}
    if (same) continue;
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(from, to);
    copied += 1;
  }
  return copied;
}

function writeIfChanged(file: string, body: string): void {
  if (read(file) === body) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, 'utf8');
}

export interface ReferenceCard {
  slug: string;
  family: DesignFamily;
  status: string;
  title: string;
  dir: string;
}

export function referencesRoot(root = escritorioRoot()): string {
  return path.join(root, 'conhecimento', 'design', 'referencias');
}

/** Cards da biblioteca (`conhecimento/design/referencias/<familia>/<slug>/card.md`). */
export function listReferences(root = escritorioRoot()): ReferenceCard[] {
  const out: ReferenceCard[] = [];
  for (const family of ['marketing', 'produto'] as DesignFamily[]) {
    let slugs: string[] = [];
    try {
      slugs = fs.readdirSync(path.join(referencesRoot(root), family));
    } catch {
      continue;
    }
    for (const slug of slugs.sort()) {
      const dir = path.join(referencesRoot(root), family, slug);
      const card = read(path.join(dir, 'card.md'));
      if (!card) continue;
      const front = /^---\s*\n([\s\S]*?)\n---/.exec(card)?.[1] || '';
      const field = (k: string) => (new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(front)?.[1] || '').replace(/^["']|["']$/g, '').trim();
      out.push({ slug, family, status: field('status') || 'rascunho', title: field('titulo') || slug, dir });
    }
  }
  return out;
}

export interface DesignKitOptions {
  role: DesignRole;
  family: DesignFamily;
  maint: boolean;
  /** Pasta de prints do último QA, relativa ao projeto. */
  prints?: string;
  /** Modo de design (padrão quando ausente). */
  mode?: DesignMode;
  /** Letra da prancha de marca escolhida pelo Carlos, quando houve escolha. */
  brandChosen?: string;
  /** Raiz do Escritório (testes). */
  root?: string;
}

export interface DesignKit {
  /** Bibliotecas do acervo de código aberto copiadas para o kit. */
  acervo?: string[];
  block: string;
  skills: string[];
  references: string[];
}

export function readContract(workspace: string): string {
  return read(path.join(workspace, DESIGN_FILES.contract));
}

/** Tokens do contrato do projeto, ou null quando o projeto ainda não está no pilar de design. */
export function projectDesignTokens(workspace: string): ContractTokens | null {
  const text = readContract(workspace);
  return text.trim() ? contractTokens(text) : null;
}

/** O que falta no contrato do projeto. `null` = não há contrato. */
export function projectContractGaps(workspace: string, mode: DesignMode = 'padrao', root?: string): string[] | null {
  const text = readContract(workspace);
  // Com acervo validado, o contrato precisa do plano de movimento. `root` só é passado quando o kit foi montado dele.
  const motion = root ? listAcervo(root).some((l) => l.status === 'validado') : false;
  return text.trim() ? contractGaps(text, mode, { motion }) : null;
}

/** Direções gravadas pela direção de design (`design/direcoes/<nome>/index.html`). */
/** Monta o kit e devolve o pedido da etapa «Marca · três pranchas». */
export function prepareBrandKit(workspace: string, opts: { family: DesignFamily; maint: boolean; root?: string }): string {
  const root = opts.root || escritorioRoot();
  prepareDesignKit(workspace, { role: 'direcao', family: opts.family, maint: opts.maint, root });
  const escopo = path.join(root, 'agentes', 'escopo');
  return brandBoardsBlock({ soul: read(path.join(escopo, 'oficio', 'marina-marca.md')), canon: read(path.join(escopo, 'DESIGN_CANON.md')) });
}

const boardFile = (workspace: string, letter: string, name: string) => path.join(workspace, ...BRAND_BOARDS_DIR.split('/'), letter, name);

/** Conferência das três pranchas para escolha. Lista vazia = completas e dentro das regras de cor. */
export function projectBrandBoardsGaps(workspace: string): string[] {
  const boards: Record<string, { theme: string; board: string }> = {};
  for (const k of BRAND_BOARDS) boards[k] = { theme: read(boardFile(workspace, k, 'tema.css')), board: read(boardFile(workspace, k, 'prancha.html')) };
  return brandBoardsGaps(boards);
}

/** Copia o tema e a prancha escolhidos para `design/`. Quem copia é o Escritório, não o motor. */
export function adoptBrandBoard(workspace: string, letter: string): { ok: boolean; error?: string } {
  const k = String(letter || '').toLowerCase();
  if (!(BRAND_BOARDS as readonly string[]).includes(k)) return { ok: false, error: 'Diga qual prancha você escolheu: A, B ou C.' };
  const theme = read(boardFile(workspace, k, 'tema.css'));
  const board = read(boardFile(workspace, k, 'prancha.html'));
  if (!theme.trim() || !board.trim()) return { ok: false, error: `A prancha ${k.toUpperCase()} não está em ${BRAND_BOARDS_DIR}/${k}/.` };
  writeIfChanged(path.join(workspace, ...DESIGN_FILES.theme.split('/')), theme);
  writeIfChanged(path.join(workspace, ...DESIGN_FILES.board.split('/')), board);
  return { ok: true };
}

/** Tema e prancha de marca contra o contrato. Lista vazia = entregues e coerentes. */
export function projectBrandGaps(workspace: string): string[] {
  const at = (rel: string) => read(path.join(workspace, ...rel.split('/')));
  return brandGaps(at(DESIGN_FILES.theme), at(DESIGN_FILES.board), readContract(workspace));
}

export function projectDirections(workspace: string): string[] {
  const base = path.join(workspace, ...DESIGN_FILES.directions.split('/'));
  try {
    return fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(base, d.name, 'index.html')))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

/** Monta o kit na pasta do projeto e devolve o bloco de design do pedido. */
export function prepareDesignKit(workspace: string, opts: DesignKitOptions): DesignKit {
  const root = opts.root || escritorioRoot();
  const escopo = path.join(root, 'agentes', 'escopo');
  const dest = path.join(workspace, ...DESIGN_KIT_DIR.split('/'));
  const canon = read(path.join(escopo, 'DESIGN_CANON.md'));
  const skills: string[] = [];
  const references: string[] = [];
  const acervo: string[] = [];
  try {
    fs.mkdirSync(dest, { recursive: true });
    writeIfChanged(path.join(dest, 'LEIA.md'), 'Material de design do TAVIR Escritório. Cópia só de leitura: o Escritório regrava a cada etapa.\n');
    if (canon) writeIfChanged(path.join(dest, 'CANON.md'), canon);
    const refStd = read(path.join(escopo, 'WEB_REFERENCE_STANDARD.md'));
    if (refStd) writeIfChanged(path.join(dest, 'REFERENCIAS.md'), refStd);
    writeIfChanged(path.join(dest, 'MODELO-DESIGN.md'), CONTRACT_TEMPLATE);
    try {
      for (const f of fs.readdirSync(path.join(root, 'conhecimento', 'design'))) {
        if (f.endsWith('.md')) writeIfChanged(path.join(dest, 'conhecimento', f), read(path.join(root, 'conhecimento', 'design', f)));
      }
    } catch {}
    for (const name of designSkills(opts.role, opts.family, opts.maint)) {
      const src = path.join(escopo, 'skills', name);
      if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
      copyTree(src, path.join(dest, 'skills', name));
      skills.push(name);
    }
    if (opts.role !== 'revisao') {
      // Acervo de código aberto (MIT) validado pelo Carlos: serve à direção e à construção, em qualquer família.
      for (const lib of listAcervo(root).filter((l) => l.status === 'validado')) {
        copyTree(lib.dir, path.join(dest, 'acervo', lib.slug));
        acervo.push(`\`${DESIGN_KIT_DIR}/acervo/${lib.slug}/indice.md\` (${lib.title}: ${lib.use}; ${lib.stack})`);
      }
    }
    if (opts.role === 'direcao') {
      for (const ref of listReferences(root).filter((r) => r.family === opts.family && r.status === 'validado')) {
        copyTree(ref.dir, path.join(dest, 'referencias', ref.slug));
        references.push(`${DESIGN_KIT_DIR}/referencias/${ref.slug}/card.md`);
      }
    }
  } catch {
    // Pasta sem permissão de escrita: o pedido segue com a alma e o cânone, sem os arquivos.
  }
  const souls = SOULS[opts.role].map((f) => read(path.join(escopo, 'oficio', f))).filter(Boolean);
  const block = designBlock({
    role: opts.role,
    family: opts.family,
    maint: opts.maint,
    souls,
    canon,
    skills,
    references,
    acervo,
    hasContract: !!readContract(workspace).trim(),
    prints: opts.prints,
    mode: opts.mode,
    brandChosen: opts.brandChosen,
  });
  return { block, skills, references, acervo };
}

/** Pasta de prints do QA mais recente (`qa/evidencias/<execução>/prints`), relativa ao projeto. */
export function latestQaPrints(workspace: string): string {
  const base = path.join(workspace, 'qa', 'evidencias');
  let runs: string[] = [];
  try {
    runs = fs.readdirSync(base).sort().reverse();
  } catch {
    return '';
  }
  for (const run of runs) {
    const prints = path.join(base, run, 'prints');
    try {
      if (fs.readdirSync(prints).some((f) => /\.png$/i.test(f))) return `qa/evidencias/${run}/prints`;
    } catch {}
  }
  return '';
}
