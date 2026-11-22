import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pacoteDaPeca, paraManifestoDarkflow } from '../../src/main/flow/pacote';
import type { StudioStore } from '../../src/main/studio/store';
import { aceitoPeloDarkflow, mediaTypeDarkflow, problemasDoPacote, type PacoteAprovado } from '../../src/shared/flow';
import type { Ativo, Peca } from '../../src/shared/studio';

const ID = '22222222-2222-4222-8222-222222222222';
const dirs: string[] = [];
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-flow-'));
  dirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function fake(peca: Partial<Peca>, ativos: Partial<Ativo>[] = []): { store: StudioStore; pacote: string } {
  const home = tmp();
  const pacote = path.join(home, 'pecas', ID, 'pacote');
  fs.mkdirSync(pacote, { recursive: true });
  const full = { id: ID, perfil_id: 'p1', rede: 'instagram', formato_id: 'ig-reels-9x16', titulo: 'Reel', etapa: 'pacote', legenda: 'oi', hashtags: ['#tavir'], ...peca } as Peca;
  const store = {
    tree: { home },
    getPeca: () => full,
    getPerfil: () => ({ nome: 'TAVIR' }),
    listAtivos: () => ativos as Ativo[],
  } as unknown as StudioStore;
  return { store, pacote };
}

const probe = () => ({ width: 1080, height: 1920, duration: 12 });

describe('pacote aprovado (F0)', () => {
  it('monta o pacote do Reel com sha256, dimensões e marca de IA vinda dos ativos', () => {
    const { store, pacote } = fake({}, [{ origem: 'local' }, { origem: 'tts' }]);
    fs.writeFileSync(path.join(pacote, 'final.mp4'), 'reel');
    fs.writeFileSync(path.join(pacote, 'manifest.json'), '{}');
    const out = pacoteDaPeca(store, ID, { probe });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pacote).toMatchObject({ origem: 'studio', peca_id: ID, perfil: 'TAVIR', formato: 'ig-reels-9x16', ia: true, hashtags: ['#tavir'] });
    expect(out.pacote.midias).toEqual([{ arquivo: path.join(pacote, 'final.mp4'), tipo: 'video', sha256: sha('reel'), largura: 1080, altura: 1920, duracao_s: 12 }]);
  });

  it('sem ativo de IA, ia fica falso; antes do pacote, recusa', () => {
    const a = fake({}, [{ origem: 'local' }]);
    fs.writeFileSync(path.join(a.pacote, 'final.mp4'), 'reel');
    fs.writeFileSync(path.join(a.pacote, 'manifest.json'), '{}');
    const out = pacoteDaPeca(a.store, ID, { probe });
    expect(out.ok && out.pacote.ia).toBe(false);
    const b = fake({ etapa: 'revisao' });
    expect(pacoteDaPeca(b.store, ID, { probe })).toEqual({ ok: false, error: 'a peça ainda não chegou ao pacote' });
    const c = fake({});
    expect(pacoteDaPeca(c.store, ID, { probe })).toEqual({ ok: false, error: 'pacote não montado' });
    fs.writeFileSync(path.join(c.pacote, 'manifest.json'), '{}');
    expect(pacoteDaPeca(c.store, ID, { probe })).toEqual({ ok: false, error: 'falta o vídeo final no pacote' });
  });

  it('carrossel vira lista de imagens em ordem, sem a capa, e detecta arquivo trocado', () => {
    const { store, pacote } = fake({ formato_id: 'ig-carrossel-4x5' });
    const arquivos = ['01.png', '02.png', '03.png'].map((n) => {
      fs.writeFileSync(path.join(pacote, n), n);
      return { arquivo: n, sha256: sha(n), largura: 1080, altura: 1350 };
    });
    fs.writeFileSync(path.join(pacote, 'capa.png'), '01.png');
    arquivos.splice(1, 0, { arquivo: 'capa.png', sha256: sha('01.png'), largura: 1080, altura: 1350 });
    fs.writeFileSync(path.join(pacote, 'manifest.json'), JSON.stringify({ arquivos }));
    const out = pacoteDaPeca(store, ID);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.pacote.midias.map((m) => path.basename(m.arquivo))).toEqual(['01.png', '02.png', '03.png']);
    expect(out.pacote.midias.every((m) => m.tipo === 'imagem')).toBe(true);

    fs.writeFileSync(path.join(pacote, '02.png'), 'outra');
    expect(pacoteDaPeca(store, ID)).toEqual({ ok: false, error: '02.png mudou depois de montar o pacote' });
  });

  it('confere coerência: mídias, hashtags e tamanho da legenda', () => {
    const base: PacoteAprovado = {
      versao: 1, origem: 'studio', peca_id: ID, titulo: 't', perfil: 'p', rede: 'instagram', formato: 'ig-reels-9x16',
      midias: [{ arquivo: 'a.mp4', tipo: 'video', sha256: sha('a'), largura: 1080, altura: 1920, duracao_s: 30 }],
      legenda: 'oi', hashtags: [], ia: false,
    };
    expect(problemasDoPacote(base)).toEqual([]);
    expect(problemasDoPacote({ ...base, midias: [] })).toContain('pacote sem mídia');
    expect(problemasDoPacote({ ...base, midias: [{ ...base.midias[0], duracao_s: 120 }] })).toContain('vídeo passa de 90 s');
    expect(problemasDoPacote({ ...base, hashtags: ['#a', '#b', '#c', '#d', '#e', '#f'] })).toContain('mais de 5 hashtags');
    expect(problemasDoPacote({ ...base, legenda: 'x'.repeat(2201) })[0]).toContain('2200');
    expect(problemasDoPacote({ ...base, formato: 'ig-carrossel-4x5' })).toContain('carrossel precisa de 2 a 20 lâminas');
    expect(aceitoPeloDarkflow('ig-reels-9x16')).toBe(true);
    expect(aceitoPeloDarkflow('ig-carrossel-4x5')).toBe(true);
    expect(aceitoPeloDarkflow('tt-video-9x16')).toBe(false);
    expect(mediaTypeDarkflow('ig-post-1x1')).toBe('IMAGE');
    expect(mediaTypeDarkflow('ig-stories-9x16')).toBe('STORIES');
  });

  it('converte o Reel para o manifesto v1 do DarkFlow e recusa formato que ele ainda não recebe', () => {
    const { store, pacote } = fake({});
    fs.writeFileSync(path.join(pacote, 'final.mp4'), 'reel');
    fs.writeFileSync(path.join(pacote, 'manifest.json'), '{}');
    const built = pacoteDaPeca(store, ID, { probe });
    if (!built.ok) throw new Error(built.error);
    const project = tmp();
    const output = path.join(project, 'storage', 'output');
    const out = paraManifestoDarkflow(built.pacote, output, project);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.sha256).toBe(sha('reel'));
    const manifest = JSON.parse(fs.readFileSync(out.manifest, 'utf8'));
    expect(manifest).toMatchObject({ schema_version: 1, relative_path: 'storage/output/final.mp4', sha256: sha('reel'), editorial: { state: 'approved' } });
    expect(manifest.media).toMatchObject({ width: 1080, height: 1920, duration_seconds: 12 });

    const tiktok = { ...built.pacote, formato: 'tt-video-9x16' };
    const refused = paraManifestoDarkflow(tiktok, output, project);
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.error).toContain('não recebe');
  });

  it('carrossel vai pelo manifesto v2: lâminas em JPEG, hash do topo pela lista e limite de 10 da Meta (F5)', () => {
    const { store, pacote } = fake({ formato_id: 'ig-carrossel-4x5' });
    const arquivos = ['01.png', '02.png', '03.png'].map((nome, i) => {
      fs.writeFileSync(path.join(pacote, nome), `lamina-${i}`);
      return { arquivo: nome, sha256: sha(`lamina-${i}`), largura: 1080, altura: 1350 };
    });
    fs.writeFileSync(path.join(pacote, 'manifest.json'), JSON.stringify({ arquivos }));
    const built = pacoteDaPeca(store, ID);
    if (!built.ok) throw new Error(built.error);
    const project = tmp();
    const output = path.join(project, 'storage', 'output');
    const convertidos: string[] = [];
    const toJpeg = (src: string, dest: string) => { convertidos.push(path.basename(src)); fs.writeFileSync(dest, `jpeg:${fs.readFileSync(src, 'utf8')}`); };
    const out = paraManifestoDarkflow(built.pacote, output, project, { toJpeg });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(convertidos).toEqual(['01.png', '02.png', '03.png']);
    const m = JSON.parse(fs.readFileSync(out.manifest, 'utf8'));
    expect(m).toMatchObject({ schema_version: 2, media_type: 'CAROUSEL', editorial: { state: 'approved' } });
    expect(m.items.map((i: { relative_path: string }) => i.relative_path)).toEqual([1, 2, 3].map((n) => `storage/output/studio-${ID}/0${n}.jpg`));
    const hashes = [0, 1, 2].map((i) => sha(`jpeg:lamina-${i}`));
    expect(m.items.map((i: { sha256: string }) => i.sha256)).toEqual(hashes);
    expect(out.sha256).toBe(createHash('sha256').update(hashes.join(String.fromCharCode(10))).digest('hex'));
    expect(m.items[0].media).toMatchObject({ container: 'jpeg', width: 1080, height: 1350 });

    const onze = { ...built.pacote, midias: Array.from({ length: 11 }, () => built.pacote.midias[0]) };
    const recusa = paraManifestoDarkflow(onze, output, project, { toJpeg });
    expect(!recusa.ok && recusa.error).toContain('até 10');

    fs.writeFileSync(path.join(pacote, '02.png'), 'trocada');
    const mudou = paraManifestoDarkflow(built.pacote, output, project, { toJpeg });
    expect(!mudou.ok && mudou.error).toContain('02.png mudou');
  });

  it('vídeo trocado depois do pacote não vai para o DarkFlow', () => {
    const { store, pacote } = fake({});
    fs.writeFileSync(path.join(pacote, 'final.mp4'), 'reel');
    fs.writeFileSync(path.join(pacote, 'manifest.json'), '{}');
    const built = pacoteDaPeca(store, ID, { probe });
    if (!built.ok) throw new Error(built.error);
    fs.writeFileSync(path.join(pacote, 'final.mp4'), 'outro');
    const project = tmp();
    expect(paraManifestoDarkflow(built.pacote, path.join(project, 'storage', 'output'), project)).toEqual({ ok: false, error: 'o vídeo mudou depois de montar o pacote' });
  });
});
