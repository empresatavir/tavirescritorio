import type { DatabaseSync } from 'node:sqlite';

export const STUDIO_SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS perfis (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  iniciais TEXT NOT NULL,
  cor_avatar TEXT NOT NULL,
  brand_kit_json TEXT NOT NULL,
  motion_kit_id TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS perfil_redes (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  rede TEXT NOT NULL,
  handle TEXT NOT NULL,
  formatos_json TEXT NOT NULL,
  posts_semana INTEGER NOT NULL,
  publicacao TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  descricao TEXT
);
CREATE TABLE IF NOT EXISTS pecas (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL,
  perfil_id TEXT NOT NULL,
  serie_id TEXT,
  rede TEXT NOT NULL,
  formato_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  etapa TEXT NOT NULL,
  status TEXT NOT NULL,
  pauta_json TEXT,
  angulos_json TEXT NOT NULL DEFAULT '[]',
  angulo_escolhido TEXT,
  roteiro_json TEXT,
  legenda TEXT,
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  agendado_para TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  peca_id TEXT NOT NULL,
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  formato_px TEXT,
  ativo_id TEXT
);
CREATE TABLE IF NOT EXISTS ativos (
  id TEXT PRIMARY KEY,
  peca_id TEXT NOT NULL,
  slot_id TEXT,
  tipo TEXT NOT NULL,
  origem TEXT NOT NULL,
  caminho TEXT NOT NULL,
  sha256 TEXT,
  largura INTEGER,
  altura INTEGER,
  duracao_ms INTEGER,
  licenca TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  alvo TEXT NOT NULL,
  versao INTEGER NOT NULL,
  camadas_json TEXT NOT NULL,
  texto TEXT NOT NULL,
  nota TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  peca_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  caminho TEXT NOT NULL,
  status TEXT NOT NULL,
  checks_json TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gates (
  id TEXT PRIMARY KEY,
  peca_id TEXT NOT NULL,
  etapa TEXT NOT NULL,
  decisao TEXT NOT NULL,
  comentario TEXT,
  decidido_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS motion_kits (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  versao INTEGER NOT NULL,
  status TEXT NOT NULL,
  tokens_json TEXT NOT NULL,
  presets_json TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS motion_jobs (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL,
  preset TEXT NOT NULL,
  motor TEXT NOT NULL,
  modelo TEXT,
  pedido TEXT NOT NULL,
  workspace TEXT NOT NULL,
  status TEXT NOT NULL,
  checks_json TEXT,
  run_id TEXT,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  ref_tipo TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  detalhe TEXT,
  quando TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_perfil_redes_perfil ON perfil_redes(perfil_id);
CREATE INDEX IF NOT EXISTS idx_series_perfil ON series(perfil_id);
CREATE INDEX IF NOT EXISTS idx_pecas_perfil ON pecas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_slots_peca ON slots(peca_id);
CREATE INDEX IF NOT EXISTS idx_ativos_peca ON ativos(peca_id);
CREATE INDEX IF NOT EXISTS idx_renders_peca ON renders(peca_id);
CREATE INDEX IF NOT EXISTS idx_gates_peca ON gates(peca_id);
CREATE INDEX IF NOT EXISTS idx_motion_kits_perfil ON motion_kits(perfil_id);
CREATE INDEX IF NOT EXISTS idx_eventos_ref ON eventos(ref_tipo, ref_id);
`;

export function migrate(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    aplicado_em TEXT NOT NULL
  )`);
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_version').get() as { v: number | null } | undefined;
  const current = row?.v ?? 0;
  if (current >= STUDIO_SCHEMA_VERSION) return;
  db.exec('BEGIN');
  try {
    db.exec(SCHEMA);
    db.prepare('INSERT INTO schema_version (version, aplicado_em) VALUES (?, ?)').run(
      STUDIO_SCHEMA_VERSION,
      new Date().toISOString(),
    );
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* transação já encerrada */ }
    throw err;
  }
}
