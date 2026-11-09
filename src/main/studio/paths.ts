import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PecaDirs {
  root: string;
  ativos: string;
  render: string;
  pacote: string;
}

export interface StudioTree {
  home: string;
  dbPath: string;
  perfis: string;
  pecas: string;
  entradaFlow: string;
  musicas: string;
  motion: string;
  motionJobs: string;
  perfilMarca: (perfilId: string) => string;
  pecaDirs: (pecaId: string) => PecaDirs;
}

/** Pasta de dados (D5). Override de teste: argumento ou `TAVIR_STUDIO_HOME`. */
export function studioHome(override?: string): string {
  const fromArg = override?.trim();
  if (fromArg) return path.resolve(fromArg);
  const fromEnv = process.env.TAVIR_STUDIO_HOME?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), 'TAVIR', 'Studio');
}

export function assertStudioId(id: string): void {
  if (!ID_RE.test(id)) throw new Error('id inválido');
}

export function ensureStudioTree(override?: string): StudioTree {
  const home = studioHome(override);
  const perfis = path.join(home, 'perfis');
  const pecas = path.join(home, 'pecas');
  const entradaFlow = path.join(home, 'entrada-flow');
  const musicas = path.join(home, 'musicas');
  const motion = path.join(home, 'motion');
  const motionJobs = path.join(home, 'motion-jobs');
  for (const dir of [home, perfis, pecas, entradaFlow, musicas, motion, motionJobs]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return {
    home,
    dbPath: path.join(home, 'studio.sqlite'),
    perfis,
    pecas,
    entradaFlow,
    musicas,
    motion,
    motionJobs,
    perfilMarca(perfilId: string) {
      assertStudioId(perfilId);
      return path.join(perfis, perfilId, 'marca');
    },
    pecaDirs(pecaId: string): PecaDirs {
      assertStudioId(pecaId);
      const root = path.join(pecas, pecaId);
      return {
        root,
        ativos: path.join(root, 'ativos'),
        render: path.join(root, 'render'),
        pacote: path.join(root, 'pacote'),
      };
    },
  };
}

export function ensurePerfilDirs(tree: StudioTree, perfilId: string): void {
  fs.mkdirSync(tree.perfilMarca(perfilId), { recursive: true });
}

export function ensurePecaDirs(tree: StudioTree, pecaId: string): void {
  const dirs = tree.pecaDirs(pecaId);
  fs.mkdirSync(dirs.ativos, { recursive: true });
  fs.mkdirSync(dirs.render, { recursive: true });
  fs.mkdirSync(dirs.pacote, { recursive: true });
}
