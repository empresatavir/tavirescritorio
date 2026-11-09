import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { BrandKit } from '../../src/shared/studio';
import { STUDIO_FORMATS } from '../../src/shared/studio';
import { chromeOf, cutCaption, formatsForProfile, frameScale, previewAlerts } from '../../src/shared/studioPreview';
import { readPreview } from '../../src/main/studio/previewMedia';
import { openStudioStore, type StudioStore } from '../../src/main/studio/store';

const KIT: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '',
  negatives: [],
  characters: [],
  tone: 'direto',
  canon: [],
};

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('prévia no dispositivo', () => {
  const dirs: string[] = [];
  let store: StudioStore | null = null;

  afterEach(() => {
    store?.close();
    store = null;
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('corta a legenda em 125 caracteres sem partir a palavra', () => {
    const text = `${'palavra '.repeat(20)}final`;
    const cut = cutCaption(text);
    expect(cut.endsWith('…mais')).toBe(true);
    const body = cut.slice(0, -'…mais'.length);
    expect(Array.from(body).length).toBeLessThanOrEqual(125);
    expect(body.endsWith('palavra')).toBe(true);
    expect(cutCaption('legenda curta')).toBe('legenda curta');
  });

  it('calcula a escala da moldura de 390 pt', () => {
    expect(frameScale(390)).toBe(1);
    expect(frameScale(195)).toBeCloseTo(0.5);
  });

  it('avisa título, slides, duração e texto fora da zona', () => {
    const feed = STUDIO_FORMATS.find((item) => item.id === 'ig-carrossel-4x5')!;
    const reel = STUDIO_FORMATS.find((item) => item.id === 'ig-reels-9x16')!;
    expect(previewAlerts({ format: feed, title: 'x'.repeat(61), slideIndex: 0, slideCount: 2 }).some((item) => item.id === 'title')).toBe(true);
    expect(previewAlerts({ format: feed, title: 'ok', slideIndex: 0, slideCount: 1 }).some((item) => item.id === 'slides')).toBe(true);
    expect(previewAlerts({ format: feed, title: 'ok', slideIndex: 0, slideCount: 21 }).some((item) => item.text.startsWith('Slide a mais'))).toBe(true);
    expect(previewAlerts({ format: reel, title: 'ok', slideIndex: 0, slideCount: 1, seconds: 91 }).some((item) => item.id === 'duration')).toBe(true);
    const outside = previewAlerts({ format: reel, title: 'palavra '.repeat(80), slideIndex: 0, slideCount: 1 });
    expect(outside.some((item) => item.id === 'safe')).toBe(true);
    expect(previewAlerts({ format: feed, title: 'Título curto', slideIndex: 0, slideCount: 3 }).some((item) => item.id === 'safe')).toBe(false);
  });

  it('escolhe a moldura e só as redes do perfil', () => {
    expect(chromeOf(STUDIO_FORMATS.find((item) => item.id === 'ig-carrossel-4x5')!)).toBe('feed');
    expect(chromeOf(STUDIO_FORMATS.find((item) => item.id === 'ig-reels-9x16')!)).toBe('vertical');
    expect(chromeOf(STUDIO_FORMATS.find((item) => item.id === 'yt-thumb-16x9')!)).toBe('thumb');
    expect(chromeOf(STUDIO_FORMATS.find((item) => item.id === 'li-post-4x5')!)).toBe('linkedin');
    const ids = formatsForProfile(['ig-carrossel-4x5'], 'ig-reels-9x16').map((item) => item.id);
    expect(ids).toContain('ig-carrossel-4x5');
    expect(ids).toContain('ig-reels-9x16');
    expect(ids).not.toContain('tt-video-9x16');
  });

  it('mostra o arquivo renderizado e fica vazio sem ele', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-preview-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: KIT });
    store.saveRede(perfil.id, { rede: 'instagram', handle: '@mp', formatos: ['ig-carrossel-4x5'], posts_semana: 1, publicacao: 'manual' });
    const peca = store.createPeca({ perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-carrossel-4x5', titulo: 'Caso', pauta: { tema: 'arquivo' } });
    store.updatePeca(peca.id, { legenda: `${'palavra '.repeat(20)}final`, roteiro: { slides: [{ titulo: 'Capa', apoio: '' }, { titulo: 'Dois', apoio: '' }] } });
    const empty = readPreview(peca.id, 0, '', store);
    expect(empty.empty).toBe(true);
    expect(empty.caption.endsWith('…mais')).toBe(true);
    const file = path.join(home, 'still-f0-teste.png');
    fs.writeFileSync(file, PNG);
    store.saveRender({ peca_id: peca.id, tipo: 'still', caminho: file, status: 'pronto', checks: [] });
    const ready = readPreview(peca.id, 0, '', store);
    expect(ready.empty).toBe(false);
    expect(ready.image.startsWith('data:image/png;base64,')).toBe(true);
    expect(ready.chrome).toBe('feed');
  });
});
