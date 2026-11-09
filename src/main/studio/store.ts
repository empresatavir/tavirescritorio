import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { migrate, STUDIO_SCHEMA_VERSION } from './migrations';
import { ensurePecaDirs, ensurePerfilDirs, ensureStudioTree, type StudioTree } from './paths';
import { advance, applyGate } from './rules';
import {
  formatById,
  isGateDecision,
  isPieceStage,
  isPieceStatus,
  isStudioNetwork,
  type Angulo,
  type Ativo,
  type AtivoInput,
  type AtivoOrigem,
  type BrandKit,
  type EventoRow,
  type Gate,
  type GateDecision,
  type MotionJob,
  type MotionJobInput,
  type MotionJobStatus,
  type MotionKitInput,
  type MotionKitRecord,
  type Pauta,
  type Peca,
  type PecaCreateInput,
  type PecaFiltro,
  type PecaRow,
  type PecaUpdate,
  type Perfil,
  type PerfilInput,
  type PerfilRede,
  type PerfilRedeInput,
  type PerfilRedeRow,
  type PerfilRow,
  type PieceStage,
  type PieceStatus,
  type Prompt,
  type PromptAlvo,
  type PromptInput,
  type PromptNota,
  type PublicacaoModo,
  type RenderCheck,
  type RenderInput,
  type RenderItem,
  type RenderTipo,
  type Roteiro,
  type Serie,
  type SerieInput,
  type SerieRow,
  type Slot,
  type SlotInput,
  type SlotTipo,
  type StudioEvento,
  type StudioNetwork,
} from '../../shared/studio';

export class StudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudioError';
  }
}

type GateCall = { ok: true; peca: Peca } | { ok: false; error: string };

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function assertBrandKit(kit: BrandKit): void {
  if (!kit || typeof kit !== 'object') throw new StudioError('brand_kit incompleto');
  if (!kit.palette || !kit.fonts) throw new StudioError('brand_kit incompleto');
  if (!Array.isArray(kit.negatives) || !Array.isArray(kit.characters) || !Array.isArray(kit.canon)) {
    throw new StudioError('brand_kit incompleto');
  }
  if (typeof kit.imageStyle !== 'string' || typeof kit.tone !== 'string') throw new StudioError('brand_kit incompleto');
  if (typeof kit.palette.ink !== 'string' || typeof kit.fonts.title !== 'string' || typeof kit.fonts.body !== 'string') {
    throw new StudioError('brand_kit incompleto');
  }
}

function asNetwork(value: string): StudioNetwork {
  if (!isStudioNetwork(value)) throw new StudioError('rede inválida');
  return value;
}

function asStage(value: string): PieceStage {
  if (!isPieceStage(value)) throw new StudioError('etapa inválida');
  return value;
}

function asStatus(value: string): PieceStatus {
  if (!isPieceStatus(value)) throw new StudioError('status inválido');
  return value;
}

export class StudioStore {
  readonly tree: StudioTree;
  private readonly db: DatabaseSync;

  constructor(home?: string) {
    this.tree = ensureStudioTree(home);
    this.db = new DatabaseSync(this.tree.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    migrate(this.db);
  }

  close(): void {
    this.db.close();
  }

  schemaVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) AS v FROM schema_version').get() as { v: number | null };
    return row?.v ?? 0;
  }

  tableNames(): string[] {
    const rows = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  }

  columnNames(table: string): string[] {
    if (!/^[a-z_]+$/.test(table)) throw new StudioError('tabela inválida');
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  }

  private evento(refTipo: string, refId: string, acao: string, detalhe: string | null): void {
    this.db.prepare(
      'INSERT INTO eventos (id, ref_tipo, ref_id, acao, detalhe, quando) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(randomUUID(), refTipo, refId, acao, detalhe, now());
  }

  listEventos(refId: string): StudioEvento[] {
    const rows = this.db.prepare('SELECT * FROM eventos WHERE ref_id = ? ORDER BY quando').all(refId) as unknown as EventoRow[];
    return rows.map((r) => ({ ...r }));
  }

  private mapPerfil(row: PerfilRow, redes?: PerfilRede[]): Perfil {
    return {
      id: row.id,
      nome: row.nome,
      iniciais: row.iniciais,
      cor_avatar: row.cor_avatar,
      brand_kit: parseJson<BrandKit>(row.brand_kit_json, {} as BrandKit),
      motion_kit_id: row.motion_kit_id,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      redes,
    };
  }

  private mapRede(row: PerfilRedeRow): PerfilRede {
    return {
      id: row.id,
      perfil_id: row.perfil_id,
      rede: asNetwork(row.rede),
      handle: row.handle,
      formatos: parseJson<string[]>(row.formatos_json, []),
      posts_semana: row.posts_semana,
      publicacao: row.publicacao === 'darkflow' ? 'darkflow' : 'manual',
      ativo: row.ativo !== 0,
    };
  }

  listPerfis(): Perfil[] {
    const rows = this.db.prepare('SELECT * FROM perfis ORDER BY nome').all() as unknown as PerfilRow[];
    return rows.map((row) => this.mapPerfil(row, this.listRedes(row.id)));
  }

  getPerfil(id: string): Perfil | null {
    const row = this.db.prepare('SELECT * FROM perfis WHERE id = ?').get(id) as PerfilRow | undefined;
    if (!row) return null;
    return this.mapPerfil(row, this.listRedes(row.id));
  }

  savePerfil(input: PerfilInput): Perfil {
    const nome = input.nome?.trim();
    const iniciais = input.iniciais?.trim();
    const cor = input.cor_avatar?.trim();
    if (!nome || !iniciais || !cor) throw new StudioError('nome, iniciais e cor são obrigatórios');
    assertBrandKit(input.brand_kit);
    const stamp = now();
    const existing = input.id ? this.getPerfil(input.id) : null;
    const id = existing?.id ?? input.id ?? randomUUID();
    if (input.id && !existing) {
      /* id novo informado pelo chamador */
    }
    const kit = JSON.stringify(input.brand_kit);
    const motion = input.motion_kit_id ?? null;
    if (existing) {
      this.db.prepare(
        `UPDATE perfis SET nome = ?, iniciais = ?, cor_avatar = ?, brand_kit_json = ?, motion_kit_id = ?, atualizado_em = ? WHERE id = ?`,
      ).run(nome, iniciais, cor, kit, motion, stamp, existing.id);
      this.evento('perfil', existing.id, 'perfil_atualizado', nome);
    } else {
      this.db.prepare(
        `INSERT INTO perfis (id, nome, iniciais, cor_avatar, brand_kit_json, motion_kit_id, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, nome, iniciais, cor, kit, motion, stamp, stamp);
      this.evento('perfil', id, 'perfil_criado', nome);
    }
    ensurePerfilDirs(this.tree, id);
    return this.getPerfil(id)!;
  }

  removePerfil(id: string): void {
    const perfil = this.getPerfil(id);
    if (!perfil) throw new StudioError('perfil não encontrado');
    const pecas = this.db.prepare('SELECT id FROM pecas WHERE perfil_id = ?').all(id) as Array<{ id: string }>;
    this.db.exec('BEGIN');
    try {
      for (const peca of pecas) this.deletePecaRows(peca.id);
      const kits = this.db.prepare('SELECT id FROM motion_kits WHERE perfil_id = ?').all(id) as Array<{ id: string }>;
      for (const kit of kits) {
        this.db.prepare('DELETE FROM motion_jobs WHERE kit_id = ?').run(kit.id);
      }
      this.db.prepare('DELETE FROM motion_kits WHERE perfil_id = ?').run(id);
      this.db.prepare('DELETE FROM series WHERE perfil_id = ?').run(id);
      this.db.prepare('DELETE FROM perfil_redes WHERE perfil_id = ?').run(id);
      this.db.prepare('DELETE FROM eventos WHERE ref_id = ?').run(id);
      this.db.prepare('DELETE FROM perfis WHERE id = ?').run(id);
      this.db.exec('COMMIT');
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  listRedes(perfilId: string): PerfilRede[] {
    const rows = this.db.prepare('SELECT * FROM perfil_redes WHERE perfil_id = ? ORDER BY rede').all(perfilId) as unknown as PerfilRedeRow[];
    return rows.map((r) => this.mapRede(r));
  }

  saveRede(perfilId: string, input: PerfilRedeInput): PerfilRede {
    if (!this.getPerfil(perfilId)) throw new StudioError('perfil não encontrado');
    const rede = asNetwork(input.rede);
    const handle = input.handle?.trim();
    if (!handle) throw new StudioError('handle obrigatório');
    if (!Number.isInteger(input.posts_semana) || input.posts_semana < 0) throw new StudioError('posts_semana inválido');
    const publicacao: PublicacaoModo = input.publicacao === 'darkflow' ? 'darkflow' : input.publicacao === 'manual' ? 'manual' : (() => { throw new StudioError('publicação inválida'); })();
    const formatos = input.formatos ?? [];
    for (const fid of formatos) {
      const format = formatById(fid);
      if (!format) throw new StudioError(`formato desconhecido: ${fid}`);
      if (format.network !== rede) throw new StudioError(`formato ${fid} não é da rede ${rede}`);
    }
    const ativo = input.ativo === false ? 0 : 1;
    const formatosJson = JSON.stringify(formatos);
    const byId = input.id
      ? this.db.prepare('SELECT * FROM perfil_redes WHERE id = ?').get(input.id) as PerfilRedeRow | undefined
      : undefined;
    const byRede = this.db.prepare('SELECT * FROM perfil_redes WHERE perfil_id = ? AND rede = ?').get(perfilId, rede) as PerfilRedeRow | undefined;
    const current = byId ?? byRede;
    if (byId && byId.perfil_id !== perfilId) throw new StudioError('rede de outro perfil');
    if (current) {
      this.db.prepare(
        `UPDATE perfil_redes SET rede = ?, handle = ?, formatos_json = ?, posts_semana = ?, publicacao = ?, ativo = ? WHERE id = ?`,
      ).run(rede, handle, formatosJson, input.posts_semana, publicacao, ativo, current.id);
      this.evento('perfil', perfilId, 'rede_atualizada', rede);
      return this.mapRede(this.db.prepare('SELECT * FROM perfil_redes WHERE id = ?').get(current.id) as unknown as PerfilRedeRow);
    }
    const id = randomUUID();
    this.db.prepare(
      `INSERT INTO perfil_redes (id, perfil_id, rede, handle, formatos_json, posts_semana, publicacao, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, perfilId, rede, handle, formatosJson, input.posts_semana, publicacao, ativo);
    this.evento('perfil', perfilId, 'rede_criada', rede);
    return this.mapRede(this.db.prepare('SELECT * FROM perfil_redes WHERE id = ?').get(id) as unknown as PerfilRedeRow);
  }

  removeRede(id: string): void {
    const row = this.db.prepare('SELECT * FROM perfil_redes WHERE id = ?').get(id) as PerfilRedeRow | undefined;
    if (!row) throw new StudioError('rede não encontrada');
    this.db.prepare('DELETE FROM perfil_redes WHERE id = ?').run(id);
    this.evento('perfil', row.perfil_id, 'rede_removida', row.rede);
  }

  saveSerie(input: SerieInput): Serie {
    if (!this.getPerfil(input.perfil_id)) throw new StudioError('perfil não encontrado');
    const nome = input.nome?.trim();
    const sigla = input.sigla?.trim().toUpperCase();
    if (!nome) throw new StudioError('nome da série obrigatório');
    if (!sigla || !/^[A-Z]{2,6}$/.test(sigla)) throw new StudioError('sigla deve ter 2 a 6 letras');
    const descricao = input.descricao ?? null;
    const existing = input.id
      ? this.db.prepare('SELECT * FROM series WHERE id = ?').get(input.id) as SerieRow | undefined
      : undefined;
    if (input.id && !existing) throw new StudioError('série não encontrada');
    if (existing && existing.perfil_id !== input.perfil_id) throw new StudioError('série de outro perfil');
    if (existing) {
      this.db.prepare('UPDATE series SET nome = ?, sigla = ?, descricao = ? WHERE id = ?').run(nome, sigla, descricao, existing.id);
      return this.getSerie(existing.id)!;
    }
    const id = randomUUID();
    this.db.prepare('INSERT INTO series (id, perfil_id, nome, sigla, descricao) VALUES (?, ?, ?, ?, ?)').run(
      id, input.perfil_id, nome, sigla, descricao,
    );
    this.evento('perfil', input.perfil_id, 'serie_criada', sigla);
    return this.getSerie(id)!;
  }

  getSerie(id: string): Serie | null {
    const row = this.db.prepare('SELECT * FROM series WHERE id = ?').get(id) as SerieRow | undefined;
    return row ? { ...row } : null;
  }

  listSeries(perfilId: string): Serie[] {
    return (this.db.prepare('SELECT * FROM series WHERE perfil_id = ? ORDER BY nome').all(perfilId) as unknown as SerieRow[]).map((r) => ({ ...r }));
  }

  listAllSeries(): Serie[] {
    return (this.db.prepare('SELECT * FROM series ORDER BY nome').all() as unknown as SerieRow[]).map((r) => ({ ...r }));
  }

  removeSerie(id: string): void {
    const row = this.getSerie(id);
    if (!row) throw new StudioError('série não encontrada');
    this.db.prepare('UPDATE pecas SET serie_id = NULL WHERE serie_id = ?').run(id);
    this.db.prepare('DELETE FROM series WHERE id = ?').run(id);
  }

  private mapPeca(row: PecaRow, hydrated: boolean): Peca {
    const peca: Peca = {
      id: row.id,
      numero: row.numero,
      perfil_id: row.perfil_id,
      serie_id: row.serie_id,
      rede: asNetwork(row.rede),
      formato_id: row.formato_id,
      titulo: row.titulo,
      etapa: asStage(row.etapa),
      status: asStatus(row.status),
      pauta: parseJson<Pauta | null>(row.pauta_json, null),
      angulos: parseJson<Angulo[]>(row.angulos_json, []),
      angulo_escolhido: row.angulo_escolhido,
      roteiro: parseJson<Roteiro | null>(row.roteiro_json, null),
      legenda: row.legenda,
      hashtags: parseJson<string[]>(row.hashtags_json, []),
      agendado_para: row.agendado_para,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
    };
    if (!hydrated) return peca;
    const slots = this.listSlots(row.id).map((s) => ({ id: s.id, ativo_id: s.ativo_id }));
    const finais = this.listRenders(row.id).filter((r) => r.tipo === 'final');
    const ultimo = finais[finais.length - 1];
    const pacote = this.tree.pecaDirs(row.id).pacote;
    peca.slots = slots;
    peca.render_final = ultimo ? { status: ultimo.status, checks: ultimo.checks ?? [] } : null;
    peca.pacote_montado = fs.existsSync(path.join(pacote, 'manifest.json'));
    return peca;
  }

  private readPecaRow(id: string): PecaRow | undefined {
    return this.db.prepare('SELECT * FROM pecas WHERE id = ?').get(id) as PecaRow | undefined;
  }

  listPecas(filtro: PecaFiltro = {}): Peca[] {
    const where: string[] = [];
    const args: Array<string> = [];
    if (filtro.perfil_id) { where.push('perfil_id = ?'); args.push(filtro.perfil_id); }
    if (filtro.rede) { where.push('rede = ?'); args.push(filtro.rede); }
    if (filtro.etapa) { where.push('etapa = ?'); args.push(filtro.etapa); }
    if (filtro.status) { where.push('status = ?'); args.push(filtro.status); }
    if (filtro.serie_id) { where.push('serie_id = ?'); args.push(filtro.serie_id); }
    const sql = `SELECT * FROM pecas${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY numero`;
    const rows = this.db.prepare(sql).all(...args) as unknown as PecaRow[];
    return rows.map((r) => this.mapPeca(r, false));
  }

  getPeca(id: string): Peca | null {
    const row = this.readPecaRow(id);
    return row ? this.mapPeca(row, true) : null;
  }

  createPeca(input: PecaCreateInput): Peca {
    if (!this.getPerfil(input.perfil_id)) throw new StudioError('perfil não encontrado');
    const rede = asNetwork(input.rede);
    const format = formatById(input.formato_id);
    if (!format) throw new StudioError('formato desconhecido');
    if (format.network !== rede) throw new StudioError('formato não pertence à rede');
    const titulo = input.titulo?.trim();
    if (!titulo) throw new StudioError('título obrigatório');
    if (input.serie_id) {
      const serie = this.getSerie(input.serie_id);
      if (!serie || serie.perfil_id !== input.perfil_id) throw new StudioError('série inválida para o perfil');
    }
    const stamp = now();
    const id = randomUUID();
    this.db.exec('BEGIN');
    try {
      const max = this.db.prepare('SELECT COALESCE(MAX(numero), 0) AS n FROM pecas WHERE perfil_id = ?').get(input.perfil_id) as { n: number };
      this.db.prepare(
        `INSERT INTO pecas (
          id, numero, perfil_id, serie_id, rede, formato_id, titulo, etapa, status,
          pauta_json, angulos_json, angulo_escolhido, roteiro_json, legenda, hashtags_json,
          agendado_para, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pauta', 'ativa', ?, '[]', NULL, NULL, NULL, '[]', NULL, ?, ?)`,
      ).run(id, max.n + 1, input.perfil_id, input.serie_id ?? null, rede, input.formato_id, titulo, input.pauta ? JSON.stringify(input.pauta) : null, stamp, stamp);
      this.evento('peca', id, 'peca_criada', titulo);
      this.db.exec('COMMIT');
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
    ensurePecaDirs(this.tree, id);
    return this.getPeca(id)!;
  }

  updatePeca(id: string, campos: PecaUpdate): Peca {
    const current = this.getPeca(id);
    if (!current) throw new StudioError('peça não encontrada');
    if (current.status !== 'ativa') throw new StudioError('peça não está ativa');
    const titulo = campos.titulo !== undefined ? campos.titulo.trim() : current.titulo;
    if (!titulo) throw new StudioError('título obrigatório');
    let serieId = current.serie_id;
    if (campos.serie_id !== undefined) {
      if (campos.serie_id) {
        const serie = this.getSerie(campos.serie_id);
        if (!serie || serie.perfil_id !== current.perfil_id) throw new StudioError('série inválida para o perfil');
      }
      serieId = campos.serie_id;
    }
    const pauta = campos.pauta !== undefined ? campos.pauta : current.pauta;
    const angulos = campos.angulos !== undefined ? (campos.angulos ?? []) : current.angulos;
    const angulo = campos.angulo_escolhido !== undefined ? campos.angulo_escolhido : current.angulo_escolhido;
    const roteiro = campos.roteiro !== undefined ? campos.roteiro : current.roteiro;
    const legenda = campos.legenda !== undefined ? campos.legenda : current.legenda;
    const hashtags = campos.hashtags !== undefined ? (campos.hashtags ?? []) : current.hashtags;
    const agendado = campos.agendado_para !== undefined ? campos.agendado_para : current.agendado_para;
    this.db.prepare(
      `UPDATE pecas SET titulo = ?, serie_id = ?, pauta_json = ?, angulos_json = ?, angulo_escolhido = ?,
       roteiro_json = ?, legenda = ?, hashtags_json = ?, agendado_para = ?, atualizado_em = ? WHERE id = ?`,
    ).run(
      titulo,
      serieId,
      pauta ? JSON.stringify(pauta) : null,
      JSON.stringify(angulos),
      angulo,
      roteiro ? JSON.stringify(roteiro) : null,
      legenda,
      JSON.stringify(hashtags),
      agendado,
      now(),
      id,
    );
    this.evento('peca', id, 'peca_atualizada', null);
    return this.getPeca(id)!;
  }

  private persistEtapa(peca: Peca): void {
    this.db.prepare('UPDATE pecas SET etapa = ?, status = ?, atualizado_em = ? WHERE id = ?').run(
      peca.etapa, peca.status, now(), peca.id,
    );
  }

  gatePeca(id: string, etapa: PieceStage, decisao: GateDecision, comentario = ''): GateCall {
    if (!isPieceStage(etapa) || !isGateDecision(decisao)) return { ok: false, error: 'etapa ou decisão inválida' };
    const peca = this.getPeca(id);
    if (!peca) return { ok: false, error: 'peça não encontrada' };
    const result = applyGate(peca, etapa, decisao, comentario);
    if (!result.ok || !result.gate) return { ok: false, error: result.motivo || 'gate recusado' };
    this.db.exec('BEGIN');
    try {
      this.persistEtapa(result.peca);
      this.db.prepare(
        'INSERT INTO gates (id, peca_id, etapa, decisao, comentario, decidido_em) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(randomUUID(), id, result.gate.etapa, result.gate.decisao, result.gate.comentario, now());
      this.evento('peca', id, `gate_${decisao}`, comentario || null);
      this.db.exec('COMMIT');
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
    return { ok: true, peca: this.getPeca(id)! };
  }

  advancePeca(id: string): GateCall {
    const peca = this.getPeca(id);
    if (!peca) return { ok: false, error: 'peça não encontrada' };
    const result = advance(peca);
    if (!result.ok) return { ok: false, error: result.motivo };
    this.persistEtapa(result.peca);
    this.evento('peca', id, 'avancou', result.peca.etapa);
    return { ok: true, peca: this.getPeca(id)! };
  }

  listGates(pecaId: string): Gate[] {
    const rows = this.db.prepare('SELECT * FROM gates WHERE peca_id = ? ORDER BY decidido_em').all(pecaId) as unknown as Gate[];
    return rows.map((r) => ({
      ...r,
      etapa: asStage(r.etapa),
      decisao: isGateDecision(r.decisao) ? r.decisao : 'recusado',
    }));
  }

  private deletePecaRows(pecaId: string): void {
    const slots = this.db.prepare('SELECT id FROM slots WHERE peca_id = ?').all(pecaId) as Array<{ id: string }>;
    for (const slot of slots) this.db.prepare('DELETE FROM prompts WHERE slot_id = ?').run(slot.id);
    this.db.prepare('DELETE FROM ativos WHERE peca_id = ?').run(pecaId);
    this.db.prepare('DELETE FROM slots WHERE peca_id = ?').run(pecaId);
    this.db.prepare('DELETE FROM renders WHERE peca_id = ?').run(pecaId);
    this.db.prepare('DELETE FROM gates WHERE peca_id = ?').run(pecaId);
    this.db.prepare('DELETE FROM eventos WHERE ref_id = ?').run(pecaId);
    this.db.prepare('DELETE FROM pecas WHERE id = ?').run(pecaId);
  }

  saveSlot(input: SlotInput): Slot {
    if (!this.readPecaRow(input.peca_id)) throw new StudioError('peça não encontrada');
    if (input.tipo !== 'imagem' && input.tipo !== 'video') throw new StudioError('tipo de slot inválido');
    const codigo = input.codigo?.trim();
    if (!codigo) throw new StudioError('código do slot obrigatório');
    const existing = input.id
      ? this.db.prepare('SELECT * FROM slots WHERE id = ?').get(input.id) as Slot | undefined
      : undefined;
    if (input.id && !existing) throw new StudioError('slot não encontrado');
    if (existing) {
      this.db.prepare(
        'UPDATE slots SET codigo = ?, tipo = ?, descricao = ?, formato_px = ?, ativo_id = ? WHERE id = ?',
      ).run(codigo, input.tipo, input.descricao ?? null, input.formato_px ?? null, input.ativo_id ?? null, existing.id);
      return this.getSlot(existing.id)!;
    }
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO slots (id, peca_id, codigo, tipo, descricao, formato_px, ativo_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, input.peca_id, codigo, input.tipo, input.descricao ?? null, input.formato_px ?? null, input.ativo_id ?? null);
    return this.getSlot(id)!;
  }

  getSlot(id: string): Slot | null {
    const row = this.db.prepare('SELECT * FROM slots WHERE id = ?').get(id) as Slot | undefined;
    if (!row) return null;
    return { ...row, tipo: row.tipo as SlotTipo };
  }

  listSlots(pecaId: string): Slot[] {
    return (this.db.prepare('SELECT * FROM slots WHERE peca_id = ? ORDER BY codigo').all(pecaId) as unknown as Slot[]).map((r) => ({
      ...r,
      tipo: r.tipo as SlotTipo,
    }));
  }

  saveAtivo(input: AtivoInput): Ativo {
    if (!this.readPecaRow(input.peca_id)) throw new StudioError('peça não encontrada');
    const origens: AtivoOrigem[] = ['flow', 'local', 'render', 'tts'];
    if (!origens.includes(input.origem)) throw new StudioError('origem inválida');
    if (!input.caminho?.trim() || !input.tipo?.trim()) throw new StudioError('ativo incompleto');
    if (input.slot_id && !this.getSlot(input.slot_id)) throw new StudioError('slot não encontrado');
    const stamp = now();
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.db.prepare('SELECT id FROM ativos WHERE id = ?').get(input.id) : undefined;
    if (input.id && !existing) throw new StudioError('ativo não encontrado');
    if (existing) {
      this.db.prepare(
        `UPDATE ativos SET slot_id = ?, tipo = ?, origem = ?, caminho = ?, sha256 = ?, largura = ?, altura = ?, duracao_ms = ?, licenca = ? WHERE id = ?`,
      ).run(input.slot_id ?? null, input.tipo, input.origem, input.caminho, input.sha256 ?? null, input.largura ?? null, input.altura ?? null, input.duracao_ms ?? null, input.licenca ?? null, id);
    } else {
      this.db.prepare(
        `INSERT INTO ativos (id, peca_id, slot_id, tipo, origem, caminho, sha256, largura, altura, duracao_ms, licenca, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, input.peca_id, input.slot_id ?? null, input.tipo, input.origem, input.caminho, input.sha256 ?? null, input.largura ?? null, input.altura ?? null, input.duracao_ms ?? null, input.licenca ?? null, stamp);
    }
    if (input.slot_id) {
      this.db.prepare('UPDATE slots SET ativo_id = ? WHERE id = ?').run(id, input.slot_id);
    }
    return this.getAtivo(id)!;
  }

  getAtivo(id: string): Ativo | null {
    const row = this.db.prepare('SELECT * FROM ativos WHERE id = ?').get(id) as Ativo | undefined;
    return row ? { ...row, origem: row.origem as AtivoOrigem } : null;
  }

  listAtivos(pecaId: string): Ativo[] {
    return (this.db.prepare('SELECT * FROM ativos WHERE peca_id = ? ORDER BY criado_em').all(pecaId) as unknown as Ativo[]).map((r) => ({
      ...r,
      origem: r.origem as AtivoOrigem,
    }));
  }

  savePrompt(input: PromptInput): Prompt {
    if (!this.getSlot(input.slot_id)) throw new StudioError('slot não encontrado');
    if (input.alvo !== 'flow-imagem' && input.alvo !== 'flow-video') throw new StudioError('alvo inválido');
    const stamp = now();
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.db.prepare('SELECT id FROM prompts WHERE id = ?').get(input.id) : undefined;
    if (input.id && !existing) throw new StudioError('prompt não encontrado');
    const nota = input.nota ?? null;
    if (nota && nota !== 'funcionou' && nota !== 'nao') throw new StudioError('nota inválida');
    const versao = input.versao ?? 1;
    const camadas = JSON.stringify(input.camadas ?? {});
    if (existing) {
      this.db.prepare('UPDATE prompts SET alvo = ?, versao = ?, camadas_json = ?, texto = ?, nota = ? WHERE id = ?').run(
        input.alvo, versao, camadas, input.texto, nota, id,
      );
    } else {
      this.db.prepare(
        'INSERT INTO prompts (id, slot_id, alvo, versao, camadas_json, texto, nota, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, input.slot_id, input.alvo, versao, camadas, input.texto, nota, stamp);
    }
    return this.getPrompt(id)!;
  }

  getPrompt(id: string): Prompt | null {
    const row = this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as {
      id: string; slot_id: string; alvo: PromptAlvo; versao: number; camadas_json: string; texto: string; nota: string | null; criado_em: string;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      slot_id: row.slot_id,
      alvo: row.alvo,
      versao: row.versao,
      camadas: parseJson(row.camadas_json, {}),
      texto: row.texto,
      nota: (row.nota as PromptNota) ?? null,
      criado_em: row.criado_em,
    };
  }

  saveRender(input: RenderInput): RenderItem {
    if (!this.readPecaRow(input.peca_id)) throw new StudioError('peça não encontrada');
    if (input.tipo !== 'still' && input.tipo !== 'proxy' && input.tipo !== 'final') throw new StudioError('tipo de render inválido');
    if (!input.caminho?.trim()) throw new StudioError('caminho do render obrigatório');
    const stamp = now();
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.db.prepare('SELECT id FROM renders WHERE id = ?').get(input.id) : undefined;
    if (input.id && !existing) throw new StudioError('render não encontrado');
    const checks = input.checks ? JSON.stringify(input.checks) : null;
    if (existing) {
      this.db.prepare('UPDATE renders SET tipo = ?, caminho = ?, status = ?, checks_json = ? WHERE id = ?').run(
        input.tipo, input.caminho, input.status, checks, id,
      );
    } else {
      this.db.prepare(
        'INSERT INTO renders (id, peca_id, tipo, caminho, status, checks_json, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id, input.peca_id, input.tipo, input.caminho, input.status, checks, stamp);
    }
    return this.listRenders(input.peca_id).find((r) => r.id === id)!;
  }

  listRenders(pecaId: string): RenderItem[] {
    const rows = this.db.prepare('SELECT * FROM renders WHERE peca_id = ? ORDER BY criado_em').all(pecaId) as Array<{
      id: string; peca_id: string; tipo: RenderTipo; caminho: string; status: string; checks_json: string | null; criado_em: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      peca_id: r.peca_id,
      tipo: r.tipo,
      caminho: r.caminho,
      status: r.status,
      checks: r.checks_json ? parseJson<RenderCheck[]>(r.checks_json, []) : null,
      criado_em: r.criado_em,
    }));
  }

  saveMotionKit(input: MotionKitInput): MotionKitRecord {
    if (!this.getPerfil(input.perfil_id)) throw new StudioError('perfil não encontrado');
    if (!input.nome?.trim()) throw new StudioError('nome do kit obrigatório');
    if (input.status === 'aprovado') throw new StudioError('kit de motion só fica aprovado pelo gate do CEO');
    const status = 'rascunho';
    const stamp = now();
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.db.prepare('SELECT id FROM motion_kits WHERE id = ?').get(input.id) : undefined;
    if (input.id && !existing) throw new StudioError('kit não encontrado');
    const versao = input.versao ?? 1;
    const tokens = JSON.stringify(input.tokens);
    const presets = JSON.stringify(input.presets ?? {});
    if (existing) {
      this.db.prepare(
        'UPDATE motion_kits SET nome = ?, versao = ?, status = ?, tokens_json = ?, presets_json = ? WHERE id = ?',
      ).run(input.nome.trim(), versao, status, tokens, presets, id);
    } else {
      this.db.prepare(
        `INSERT INTO motion_kits (id, perfil_id, nome, versao, status, tokens_json, presets_json, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, input.perfil_id, input.nome.trim(), versao, status, tokens, presets, stamp);
    }
    if (!existing) {
      this.db.prepare('UPDATE perfis SET motion_kit_id = ?, atualizado_em = ? WHERE id = ? AND motion_kit_id IS NULL').run(id, stamp, input.perfil_id);
    }
    return this.listMotionKits(input.perfil_id).find((k) => k.id === id)!;
  }

  listMotionKits(perfilId: string): MotionKitRecord[] {
    const rows = this.db.prepare('SELECT * FROM motion_kits WHERE perfil_id = ? ORDER BY criado_em').all(perfilId) as Array<{
      id: string; perfil_id: string; nome: string; versao: number; status: 'rascunho' | 'aprovado'; tokens_json: string; presets_json: string; criado_em: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      perfil_id: r.perfil_id,
      nome: r.nome,
      versao: r.versao,
      status: r.status,
      tokens: parseJson(r.tokens_json, {} as MotionKitRecord['tokens']),
      presets: parseJson(r.presets_json, {}),
      criado_em: r.criado_em,
    }));
  }

  saveMotionJob(input: MotionJobInput): MotionJob {
    const kit = this.db.prepare('SELECT id FROM motion_kits WHERE id = ?').get(input.kit_id);
    if (!kit) throw new StudioError('kit não encontrado');
    const statuses: MotionJobStatus[] = ['rodando', 'reprovado', 'aguardando_gate', 'recusado'];
    const status = input.status ?? 'rodando';
    if (input.status === 'aprovado') throw new StudioError('job de motion só fica aprovado pelo gate do CEO');
    if (!statuses.includes(status)) throw new StudioError('status de job inválido');
    if (!input.pedido?.trim() || !input.workspace?.trim() || !input.preset?.trim() || !input.motor?.trim()) {
      throw new StudioError('job incompleto');
    }
    const stamp = now();
    const id = input.id ?? randomUUID();
    const existing = input.id ? this.db.prepare('SELECT id FROM motion_jobs WHERE id = ?').get(input.id) : undefined;
    if (input.id && !existing) throw new StudioError('job não encontrado');
    const checks = input.checks === undefined ? null : JSON.stringify(input.checks);
    if (existing) {
      this.db.prepare(
        'UPDATE motion_jobs SET status = ?, checks_json = ?, run_id = ?, modelo = ? WHERE id = ?',
      ).run(status, checks, input.run_id ?? null, input.modelo ?? null, id);
    } else {
      this.db.prepare(
        `INSERT INTO motion_jobs (id, kit_id, preset, motor, modelo, pedido, workspace, status, checks_json, run_id, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, input.kit_id, input.preset, input.motor, input.modelo ?? null, input.pedido, input.workspace, status, checks, input.run_id ?? null, stamp);
    }
    return this.getMotionJob(id)!;
  }

  getMotionJob(id: string): MotionJob | null {
    const row = this.db.prepare('SELECT * FROM motion_jobs WHERE id = ?').get(id) as {
      id: string; kit_id: string; preset: string; motor: string; modelo: string | null; pedido: string; workspace: string;
      status: MotionJobStatus; checks_json: string | null; run_id: string | null; criado_em: string;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      kit_id: row.kit_id,
      preset: row.preset,
      motor: row.motor,
      modelo: row.modelo,
      pedido: row.pedido,
      workspace: row.workspace,
      status: row.status,
      checks: row.checks_json ? parseJson(row.checks_json, null) : null,
      run_id: row.run_id,
      criado_em: row.criado_em,
    };
  }
}

let singleton: StudioStore | null = null;

export function openStudioStore(home?: string): StudioStore {
  return new StudioStore(home);
}

export function getStudioStore(): StudioStore {
  if (!singleton) singleton = openStudioStore();
  return singleton;
}

export function expectedSchemaVersion(): number {
  return STUDIO_SCHEMA_VERSION;
}
