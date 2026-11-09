import { describe, expect, it } from 'vitest';
import type { Peca, Perfil } from '../../src/shared/studio';
import { buildRenderJob, parseProgressLine } from '../../src/main/studio/renderJob';

function peca(formato: string): Peca {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    numero: 1,
    perfil_id: '22222222-2222-4222-8222-222222222222',
    serie_id: null,
    rede: 'instagram',
    formato_id: formato,
    titulo: 'O mapa',
    etapa: 'arte',
    status: 'ativa',
    pauta: { tema: 'carta' },
    angulos: [],
    angulo_escolhido: null,
    roteiro: { slides: [{ titulo: 'Capa', apoio: '1953' }] },
    legenda: null,
    hashtags: [],
    agendado_para: null,
    criado_em: '2026-11-09T00:00:00.000Z',
    atualizado_em: '2026-11-09T00:00:00.000Z',
  };
}

const perfil = {
  id: '22222222-2222-4222-8222-222222222222',
  nome: 'Multiverso',
  iniciais: 'MP',
  cor_avatar: '#1BC5BD',
  brand_kit: {
    palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
    fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
    imageStyle: '',
    negatives: [],
    characters: [],
    tone: '',
    canon: [],
  },
  motion_kit_id: null,
  criado_em: '',
  atualizado_em: '',
  redes: [],
} as Perfil;

describe('studio render job', () => {
  it('monta still, proxy e vídeo com o tamanho certo', () => {
    const still = buildRenderJob({ peca: peca('ig-carrossel-4x5'), perfil, tipo: 'still', output: 'a.png' });
    expect(still.composition).toBe('TavirSlide');
    expect(still.props.width).toBe(1080);
    expect(still.props.height).toBe(1350);
    expect(still.frame).toBe(0);
    const proxy = buildRenderJob({ peca: peca('ig-reels-9x16'), perfil, tipo: 'proxy', output: 'a.mp4' });
    expect(proxy.composition).toBe('TavirReel');
    expect(proxy.props.width).toBe(540);
    expect(proxy.props.height).toBe(960);
    expect(proxy.props.durationInFrames).toBe(90);
    expect(proxy.frame).toBeUndefined();
  });

  it('lê o progresso e ignora texto solto', () => {
    expect(parseProgressLine('{"type":"progress","pct":42}')).toEqual({ type: 'progress', pct: 42 });
    expect(parseProgressLine('{"type":"done","path":"out.mp4"}')?.path).toBe('out.mp4');
    expect(parseProgressLine('bundling')).toBeNull();
    expect(parseProgressLine('{"type":"outro"}')).toBeNull();
  });
});
