import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BrandKit } from '../../src/shared/studio';
import { buildPacote } from '../../src/main/studio/pacote';
import { reviewChecklist } from '../../src/main/studio/rules';
import { needsSourceSlide, slidesFromRoteiro } from '../../src/main/studio/slides';
import { openStudioStore, type StudioStore } from '../../src/main/studio/store';

const KIT: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '', negatives: [], characters: [], tone: 'direto',
  canon: ['toda afirmação histórica cita fonte no último slide'],
};

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('carrossel e pacote', () => {
  const dirs: string[] = [];
  let store: StudioStore | null = null;

  afterEach(() => {
    store?.close();
    store = null;
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('gera slides e acrescenta a fonte quando o canon exige', () => {
    const slides = slidesFromRoteiro({
      slides: [{ titulo: 'Capa do caso', apoio: 'gancho' }, { titulo: 'O meio', layout: 'texto' }],
    }, KIT.canon, 'jornal de 1974');
    expect(slides[0].layout).toBe('capa');
    expect(slides[1].layout).toBe('texto');
    expect(slides[2].layout).toBe('fonte');
    expect(slides[2].apoio).toBe('jornal de 1974');
    expect(needsSourceSlide([])).toBe(false);
  });

  it('reprova a revisão sem a fonte citada', () => {
    const items = reviewChecklist({
      roteiro: { slides: [{ titulo: 'Capa', layout: 'capa' }, { titulo: 'Meio' }] },
      formatoId: 'ig-carrossel-4x5',
      canon: KIT.canon,
    });
    expect(items.find((item) => item.nome === 'fonte citada')?.ok).toBe(false);
  });

  it('grava o manifest com o sha256 dos png', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-pacote-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso Paranoico', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: KIT });
    const peca = store.createPeca({
      perfil_id: perfil.id, rede: 'instagram', formato_id: 'ig-carrossel-4x5', titulo: 'Caso',
      pauta: { tema: 'arquivo', fonte: 'jornal' },
    });
    store.updatePeca(peca.id, {
      legenda: 'legenda do caso',
      hashtags: ['#caso'],
      roteiro: { slides: [{ titulo: 'Capa', layout: 'capa' }, { titulo: 'Meio' }, { titulo: 'Fonte', layout: 'fonte', apoio: 'jornal' }] },
    });
    for (let i = 0; i < 3; i += 1) {
      const file = path.join(home, `still-f${i}-teste.png`);
      fs.writeFileSync(file, PNG);
      store.saveRender({ peca_id: peca.id, tipo: 'still', caminho: file, status: 'pronto', checks: [] });
    }
    const built = buildPacote(peca.id, store, home);
    expect(built.ok).toBe(true);
    const names = built.manifest?.arquivos.map((item) => item.arquivo);
    expect(names).toEqual(['01.png', 'capa.png', '02.png', '03.png']);
    const first = path.join(built.dir!, '01.png');
    const hash = createHash('sha256').update(fs.readFileSync(first)).digest('hex');
    expect(built.manifest?.arquivos[0].sha256).toBe(hash);
    expect(fs.readFileSync(path.join(built.dir!, 'legenda.txt'), 'utf8')).toBe('legenda do caso');
    expect(built.manifest?.perfil).toBe('Multiverso Paranoico');
  });
});
