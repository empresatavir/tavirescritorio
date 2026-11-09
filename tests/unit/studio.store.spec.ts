import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { BrandKit } from '../../src/shared/studio';
import { openStudioStore, type StudioStore } from '../../src/main/studio/store';

const KIT: BrandKit = {
  palette: { ink: '#111111', surface: '#222222', text: '#f4f6f2', accent: '#d6ff3f', accent2: '#7aa2ff' },
  fonts: { title: 'Fonte Titulo', body: 'Fonte Corpo' },
  imageStyle: 'fotografia documental',
  negatives: ['texto na imagem'],
  characters: [],
  tone: 'direto',
  canon: ['toda afirmação histórica cita fonte'],
};

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('banco do Studio', () => {
  let tmp: string;
  let store: StudioStore | null;

  afterEach(() => {
    store?.close();
    store = null;
    if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  function abrir(): StudioStore {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-studio-'));
    store = openStudioStore(tmp);
    return store;
  }

  it('grava perfil com duas redes e a migration roda duas vezes', () => {
    const db = abrir();
    expect(db.schemaVersion()).toBe(1);
    const perfil = db.savePerfil({
      nome: 'Multiverso Paranoico',
      iniciais: 'MP',
      cor_avatar: '#1b2433',
      brand_kit: KIT,
    });
    db.saveRede(perfil.id, {
      rede: 'instagram',
      handle: '@multiverso',
      formatos: ['ig-carrossel-4x5', 'ig-reels-9x16'],
      posts_semana: 4,
      publicacao: 'manual',
    });
    db.saveRede(perfil.id, {
      rede: 'youtube',
      handle: '@multiversoyt',
      formatos: ['yt-shorts-9x16'],
      posts_semana: 1,
      publicacao: 'darkflow',
    });
    const lido = db.getPerfil(perfil.id);
    expect(lido?.redes).toHaveLength(2);
    expect(lido?.redes?.map((r) => r.rede).sort()).toEqual(['instagram', 'youtube']);
    expect(lido?.brand_kit.canon[0]).toContain('fonte');

    const peca = db.createPeca({
      perfil_id: perfil.id,
      rede: 'instagram',
      formato_id: 'ig-carrossel-4x5',
      titulo: 'O caso',
      pauta: { tema: 'arquivo', fonte: 'jornal', objetivo: 'duvida' },
    });
    expect(peca.numero).toBe(1);
    expect(peca.etapa).toBe('pauta');
    const segunda = db.createPeca({
      perfil_id: perfil.id,
      rede: 'instagram',
      formato_id: 'ig-post-1x1',
      titulo: 'Outra',
    });
    expect(segunda.numero).toBe(2);

    db.close();
    store = openStudioStore(tmp);
    expect(store.schemaVersion()).toBe(1);
    expect(store.getPerfil(perfil.id)?.nome).toBe('Multiverso Paranoico');
    expect(store.listPecas({ perfil_id: perfil.id })).toHaveLength(2);
    expect(store.columnNames('pecas')).toEqual([
      'id', 'numero', 'perfil_id', 'serie_id', 'rede', 'formato_id', 'titulo', 'etapa', 'status',
      'pauta_json', 'angulos_json', 'angulo_escolhido', 'roteiro_json', 'legenda', 'hashtags_json',
      'agendado_para', 'criado_em', 'atualizado_em',
    ]);
  });

  it('advance recusa a etapa que tem gate', () => {
    const db = abrir();
    const perfil = db.savePerfil({ nome: 'TAVIR', iniciais: 'TV', cor_avatar: '#000', brand_kit: KIT });
    const peca = db.createPeca({
      perfil_id: perfil.id,
      rede: 'instagram',
      formato_id: 'ig-carrossel-4x5',
      titulo: 'Pauta livre',
    });
    const foi = db.advancePeca(peca.id);
    expect(foi.ok).toBe(true);
    if (foi.ok) expect(foi.peca.etapa).toBe('angulo');
    const parado = db.advancePeca(peca.id);
    expect(parado.ok).toBe(false);
    if (!parado.ok) expect(parado.error).toBe('etapa com gate');
    expect(db.getPeca(peca.id)?.etapa).toBe('angulo');
  });

  it('não cria arquivo fora da pasta temporária', () => {
    const db = abrir();
    const perfil = db.savePerfil({ nome: 'B2B', iniciais: 'B2', cor_avatar: '#333', brand_kit: KIT });
    db.saveRede(perfil.id, {
      rede: 'linkedin',
      handle: '@tavir',
      formatos: ['li-post-4x5'],
      posts_semana: 2,
      publicacao: 'manual',
    });
    const peca = db.createPeca({
      perfil_id: perfil.id,
      rede: 'linkedin',
      formato_id: 'li-post-4x5',
      titulo: 'Nota',
    });
    expect(db.tree.home).toBe(tmp);
    expect(db.tree.dbPath.startsWith(tmp)).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'perfis', perfil.id, 'marca'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'pecas', peca.id, 'ativos'))).toBe(true);
    const files = walk(tmp);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const rel = path.relative(tmp, file);
      expect(rel.startsWith('..')).toBe(false);
      expect(path.isAbsolute(rel)).toBe(false);
    }
    expect(files.some((file) => file.endsWith('studio.sqlite'))).toBe(true);
  });
});
