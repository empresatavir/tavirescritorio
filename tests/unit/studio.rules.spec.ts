import { describe, expect, it } from 'vitest';
import { formatById, PIECE_GATES, TEXT_LIMITS, type Peca, type PieceStage } from '../../src/shared/studio';
import { advance, applyGate, canAdvance, nextStage, slotCode, validateTexts } from '../../src/main/studio/rules';

function peca(etapa: PieceStage, extra: Partial<Peca> = {}): Peca {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    numero: 14,
    perfil_id: '22222222-2222-4222-8222-222222222222',
    serie_id: null,
    rede: 'instagram',
    formato_id: 'ig-carrossel-4x5',
    titulo: 'Peça',
    etapa,
    status: 'ativa',
    pauta: { tema: 'tema' },
    angulos: [],
    angulo_escolhido: null,
    roteiro: null,
    legenda: null,
    hashtags: [],
    agendado_para: null,
    criado_em: '2026-11-08T00:00:00.000Z',
    atualizado_em: '2026-11-08T00:00:00.000Z',
    slots: [],
    render_final: null,
    pacote_montado: false,
    ...extra,
  };
}

const anguloPronto = {
  angulos: [{ id: 'a1', gancho: 'g', promessa: 'p', prova: 'v' }],
  angulo_escolhido: 'a1',
};
const roteiroPronto = { roteiro: { slides: [{ titulo: 'Capa', layout: 'capa' as const }, { titulo: 'Meio' }] } };
const artePronta = { slots: [{ id: 's1', ativo_id: 'ativo-1' }] };
const revisaoPronta = { render_final: { status: 'ok', checks: [{ ok: true, nome: 'tamanho' }] } };

function pronto(etapa: PieceStage): Peca {
  switch (etapa) {
    case 'pauta':
      return peca(etapa);
    case 'angulo':
      return peca(etapa, anguloPronto);
    case 'roteiro':
      return peca(etapa, roteiroPronto);
    case 'arte':
      return peca(etapa, artePronta);
    case 'revisao':
      return peca(etapa, revisaoPronta);
    case 'pacote':
      return peca(etapa, { pacote_montado: true });
    case 'publicado':
      return peca(etapa, { pacote_montado: true });
    default:
      return peca(etapa);
  }
}

describe('regras da peça', () => {
  it('aplica as três decisões em cada etapa', () => {
    const etapas: PieceStage[] = ['pauta', 'angulo', 'roteiro', 'arte', 'revisao', 'pacote', 'publicado'];
    for (const etapa of etapas) {
      const base = pronto(etapa);
      const aprovado = applyGate(base, etapa, 'aprovado', '');
      const ajuste = applyGate(base, etapa, 'ajuste', 'encurtar o gancho');
      const recusado = applyGate(base, etapa, 'recusado', 'fora do canon');

      if (etapa === 'publicado') {
        expect(aprovado.ok).toBe(false);
      } else {
        expect(aprovado.ok).toBe(true);
        expect(aprovado.peca.etapa).toBe(nextStage(base));
        expect(aprovado.peca.status).toBe('ativa');
      }

      if (etapa === 'pauta') {
        expect(ajuste.ok).toBe(false);
      } else {
        expect(ajuste.ok).toBe(true);
        expect(ajuste.peca.etapa).not.toBe(etapa);
        expect(ajuste.gate?.comentario).toBe('encurtar o gancho');
        expect(ajuste.peca.status).toBe('ativa');
      }

      expect(recusado.ok).toBe(true);
      expect(recusado.peca.status).toBe('arquivada');
      expect(recusado.peca.etapa).toBe(etapa);
      expect(recusado.gate?.decisao).toBe('recusado');
    }
  });

  it('canAdvance fica falso sem a pré-condição e advance recusa etapa com gate', () => {
    expect(canAdvance(peca('roteiro'))).toBe(false);
    expect(canAdvance(peca('roteiro', { roteiro: { slides: [{ titulo: 'só um' }] } }))).toBe(false);
    expect(canAdvance(peca('arte', { slots: [{ id: 's', ativo_id: null }] }))).toBe(false);
    expect(canAdvance(peca('revisao'))).toBe(false);
    expect(canAdvance(peca('pacote'))).toBe(false);
    expect(canAdvance(peca('angulo'))).toBe(false);
    expect(canAdvance(peca('pauta'))).toBe(true);

    const comAngulo = peca('angulo', anguloPronto);
    expect(PIECE_GATES).toContain('angulo');
    expect(canAdvance(comAngulo)).toBe(false);
    const recusa = advance(comAngulo);
    expect(recusa.ok).toBe(false);
    expect(recusa.motivo).toBe('etapa com gate');
    expect(recusa.peca.etapa).toBe('angulo');

    const seguiu = advance(peca('pauta'));
    expect(seguiu.ok).toBe(true);
    expect(seguiu.peca.etapa).toBe('angulo');
  });

  it('no áudio do vídeo, as três decisões seguem o trilho', () => {
    const base = peca('audio', { formato_id: 'ig-reels-9x16' });
    expect(applyGate(base, 'audio', 'aprovado', '').peca.etapa).toBe('revisao');
    expect(applyGate(base, 'audio', 'ajuste', 'de novo').peca.etapa).toBe('arte');
    expect(applyGate(base, 'audio', 'recusado', 'fora').peca.status).toBe('arquivada');
  });

  it('no vídeo, ajuste da revisão volta para o áudio', () => {
    const base = peca('revisao', { ...revisaoPronta, formato_id: 'ig-reels-9x16' });
    const ajuste = applyGate(base, 'revisao', 'ajuste', 'narrar de novo');
    expect(ajuste.ok).toBe(true);
    expect(ajuste.peca.etapa).toBe('audio');
  });

  it('slotCode gera MP-0014-S03 e C para cena', () => {
    expect(slotCode('MP', 14, 3, 'imagem')).toBe('MP-0014-S03');
    expect(slotCode('mp', 14, 3, 'video')).toBe('MP-0014-C03');
  });

  it('validateTexts reprova capa com 61 caracteres', () => {
    const formato = formatById('ig-carrossel-4x5');
    expect(formato).toBeTruthy();
    const titulo = 'a'.repeat(TEXT_LIMITS.capaMaxChars + 1);
    const ruim = validateTexts({ slides: [{ titulo, layout: 'capa' }, { titulo: 'ok' }] }, formato!);
    expect(ruim.ok).toBe(false);
    expect(ruim.erros[0]).toContain('61');
    const bom = validateTexts(
      { slides: [{ titulo: 'a'.repeat(TEXT_LIMITS.capaMaxChars), layout: 'capa' }, { titulo: 'ok' }] },
      formato!,
    );
    expect(bom.ok).toBe(true);
  });
});
