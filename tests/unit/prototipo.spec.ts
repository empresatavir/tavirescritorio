import { describe, expect, it } from 'vitest';
import { ESTEIRA_TEMPLATES, LEGACY_STAGE_NAMES, stageContract } from '../../src/shared/esteiras';
import { stageDesignRole } from '../../src/shared/design';
import {
  emptyPrototypeFacts,
  prototypeChoiceOf,
  prototypeChoices,
  prototypeCriteria,
  prototypeGaps,
  prototypeHandoff,
  prototypePrompt,
  PROTO_FILES,
  STAGE_PROTOTIPO,
  STAGE_VALIDACAO_PROTOTIPO,
  type PrototypeFacts,
} from '../../src/shared/prototipo';

const NOTES = `# Protótipo — agenda

## Premissas
- Um profissional por horário (docs/briefing.md).

## Decisões em aberto
- Lista ou calendário na tela inicial. Recomendo A.

## Simulado
- Envio de mensagem ao paciente.

## Critérios de aceite
1. Horário ocupado não aparece para escolha.
2. Remarcar mantém o histórico do paciente.
3. Sem paciente escolhido, o botão de confirmar fica desligado.
`;

const good = (over: Partial<PrototypeFacts> = {}): PrototypeFacts => ({
  ...emptyPrototypeFacts(),
  opened: true,
  control: true,
  disclaimer: true,
  fictitious: true,
  states: ['branco', 'exemplo'],
  statesWorking: ['branco', 'exemplo'],
  alternatives: ['a', 'b'],
  alternativesWorking: ['a', 'b'],
  points: [1, 2, 3],
  pointsLocated: [1, 2, 3],
  supportToggle: true,
  ...over,
});

describe('protótipo de validação · esteiras', () => {
  it('entra só nas esteiras de sistema, depois do design e antes da construção', () => {
    const names = (code: keyof typeof ESTEIRA_TEMPLATES) => ESTEIRA_TEMPLATES[code].stages.map((s) => s.name);
    const c = names('SY-C1');
    expect(c.indexOf(STAGE_PROTOTIPO)).toBe(c.indexOf('Aprovação do design') + 1);
    expect(c.indexOf(STAGE_VALIDACAO_PROTOTIPO)).toBe(c.indexOf(STAGE_PROTOTIPO) + 1);
    expect(c.indexOf('Arquitetura & modelagem')).toBe(c.indexOf(STAGE_VALIDACAO_PROTOTIPO) + 1);
    const m = names('SY-M1');
    expect(m.indexOf(STAGE_PROTOTIPO)).toBe(m.indexOf('Direção de design') + 1);
    expect(m.indexOf('Correção e migração')).toBe(m.indexOf(STAGE_VALIDACAO_PROTOTIPO) + 1);
    for (const code of ['LP-C1', 'LP-M1', 'OF-C1', 'OF-M0'] as const) expect(names(code)).not.toContain(STAGE_PROTOTIPO);
  });

  it('a validação é gate do Carlos e o protótipo não é etapa de design nem gate', () => {
    const stage = (n: string) => ESTEIRA_TEMPLATES['SY-C1'].stages.find((s) => s.name === n)!;
    expect(stage(STAGE_VALIDACAO_PROTOTIPO).gate).toBe(true);
    expect(stage(STAGE_PROTOTIPO)).toMatchObject({ gate: false, qa: false, seg: false });
    expect(stageDesignRole(stage(STAGE_PROTOTIPO))).toBeNull();
    expect(stageContract(STAGE_PROTOTIPO)?.entrega).toContain(PROTO_FILES.page);
    expect(stageContract(STAGE_VALIDACAO_PROTOTIPO)).not.toBeNull();
  });

  it('os moldes de antes do protótipo ficaram registrados para remapear projeto antigo', () => {
    for (const code of ['SY-C1', 'SY-M1'] as const) {
      const now = ESTEIRA_TEMPLATES[code].stages.map((s) => s.name);
      const before = now.filter((n) => n !== STAGE_PROTOTIPO && n !== STAGE_VALIDACAO_PROTOTIPO);
      expect(LEGACY_STAGE_NAMES[code]!.some((list) => list.join('|') === before.join('|'))).toBe(true);
      // O remapeamento acha o molde antigo pelo tamanho: não pode haver dois do mesmo tamanho.
      const sizes = LEGACY_STAGE_NAMES[code]!.map((l) => l.length).concat(now.length);
      expect(new Set(sizes).size).toBe(sizes.length);
    }
  });
});

describe('protótipo de validação · conferência', () => {
  it('fecha quando abre sozinho, tem a faixa, os estados, os pontos localizados e os critérios', () => {
    expect(prototypeGaps(good(), NOTES)).toEqual([]);
    expect(prototypeGaps(good({ alternatives: [], alternativesWorking: [] }), NOTES)).toEqual([]);
  });

  it('não abriu, ou não há medição: não fecha', () => {
    expect(prototypeGaps(null, NOTES)[0]).toContain('não abriu');
    expect(prototypeGaps({ ...emptyPrototypeFacts(), errors: ['prototipo/index.html não existe'] }, NOTES)[0]).toContain('não existe');
  });

  it('aponta dependência de rede, faixa sem aviso e erro de script', () => {
    const gaps = prototypeGaps(good({ external: ['https://cdn.exemplo/react.js'], disclaimer: false, fictitious: false, errors: ['x is not defined'] }), NOTES).join(' | ');
    expect(gaps).toContain('depende de rede');
    expect(gaps).toContain('não faz parte do produto');
    expect(gaps).toContain('fictícios');
    expect(gaps).toContain('erro de script');
  });

  it('estado que não muda a tela e ponto sem marcador não passam', () => {
    const gaps = prototypeGaps(good({ statesWorking: ['exemplo'], pointsLocated: [1, 3] }), NOTES).join(' | ');
    expect(gaps).toContain('o estado «branco» não muda a tela');
    expect(gaps).toContain('ponto(s) 2 sem marcador');
    expect(prototypeGaps(good({ states: ['exemplo'], statesWorking: [] }), NOTES).join(' ')).toContain('falta o estado «branco»');
    expect(prototypeGaps(good({ points: [1, 2], pointsLocated: [1, 2] }), NOTES).join(' ')).toContain('2 de 3 pontos');
  });

  it('uma alternativa só não é escolha, e alternativa que não muda a tela não conta', () => {
    expect(prototypeGaps(good({ alternatives: ['a'], alternativesWorking: [] }), NOTES).join(' ')).toContain('uma alternativa só');
    expect(prototypeGaps(good({ alternativesWorking: ['a'] }), NOTES).join(' ')).toContain('a alternativa B não muda a tela');
    expect(prototypeGaps(good({ alternatives: ['a', 'x'], alternativesWorking: ['a', 'x'] }), NOTES).join(' ')).toContain('fora de a, b ou c');
    expect(prototypeChoices(good())).toEqual(['a', 'b']);
    expect(prototypeChoices(good({ alternatives: ['a'] }))).toEqual([]);
  });

  it('em manutenção exige o antes e o depois', () => {
    expect(prototypeGaps(good(), NOTES, { maint: true }).join(' ')).toContain('falta a versão «antes»');
    expect(prototypeGaps(good({ versions: ['antes', 'depois'] }), NOTES, { maint: true })).toEqual([]);
  });

  it('premissas.md precisa das quatro seções e de um critério por ponto', () => {
    expect(prototypeGaps(good(), '').join(' ')).toContain(`falta ${PROTO_FILES.notes}`);
    expect(prototypeGaps(good(), NOTES.replace('## Simulado', '## Outra coisa')).join(' ')).toContain('sem a seção «Simulado»');
    expect(prototypeGaps(good({ points: [1, 2, 3, 4], pointsLocated: [1, 2, 3, 4] }), NOTES).join(' ')).toContain('sem critério de aceite para o(s) ponto(s) 4');
    expect(prototypeCriteria(NOTES).map((c) => c.n)).toEqual([1, 2, 3]);
    expect(prototypeCriteria('## Critérios de aceite\n- [2] Remarcar mantém o histórico.\n- 5) Outro.')).toEqual([
      { n: 2, text: 'Remarcar mantém o histórico.' },
      { n: 5, text: 'Outro.' },
    ]);
  });
});

describe('protótipo de validação · gate e pedido', () => {
  it('lê a alternativa escolhida no texto da decisão', () => {
    expect(prototypeChoiceOf('Alternativa B. Gostei do calendário.')).toBe('b');
    expect(prototypeChoiceOf('a')).toBe('a');
    expect(prototypeChoiceOf('opção C')).toBe('c');
    expect(prototypeChoiceOf('Aprovado, pode seguir.')).toBe('');
    expect(prototypeChoiceOf('')).toBe('');
  });

  it('o pedido descreve a faixa, os atributos e o arquivo único sem rede', () => {
    const text = prototypePrompt();
    for (const part of ['data-proto="controle"', 'data-proto-estado="branco"', 'data-proto-estado="exemplo"', 'data-proto-ponto="N"', 'data-proto-marca="N"', 'data-proto="apoio"', PROTO_FILES.page, PROTO_FILES.notes, 'sem internet', 'descartável']) {
      expect(text).toContain(part);
    }
    expect(text).not.toContain('data-proto-versao');
    expect(prototypePrompt({ maint: true })).toContain('data-proto-versao="antes"');
    expect(prototypePrompt({ hasDesign: true })).toContain('design/tema.css');
    expect(text).not.toMatch(/\n\n\n/);
  });

  it('as etapas seguintes só recebem o protótipo depois de validado', () => {
    expect(prototypeHandoff({ validated: false, criteria: prototypeCriteria(NOTES) })).toBe('');
    const block = prototypeHandoff({ validated: true, choice: 'b', criteria: prototypeCriteria(NOTES) });
    expect(block).toContain('alternativa B');
    expect(block).toContain('não copie o código');
    expect(block).toContain('2. Remarcar mantém o histórico do paciente.');
    expect(prototypeHandoff({ validated: true, criteria: [] })).toContain(PROTO_FILES.notes);
  });
});
