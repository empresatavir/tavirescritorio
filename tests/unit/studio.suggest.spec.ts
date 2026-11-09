import { describe, expect, it } from 'vitest';
import { parseAngles, parseRoteiro } from '../../src/main/studio/suggest';

describe('studio suggest', () => {
  it('lê até 3 ângulos do JSON e não escolhe nenhum', () => {
    const text = '```json\n[{"gancho":"a","promessa":"b","prova":"c"},{"hook":"d","promise":"e","proof":"f"},{"gancho":"g"},{"gancho":"h"}]\n```';
    const angles = parseAngles(text);
    expect(angles).toHaveLength(3);
    expect(angles[0]).toEqual({ gancho: 'a', promessa: 'b', prova: 'c' });
    expect(angles[1].gancho).toBe('d');
    expect(angles.every((a) => !('escolhido' in a))).toBe(true);
  });

  it('guarda o texto quando o motor não devolve JSON', () => {
    expect(parseAngles('sem json')).toEqual([{ gancho: 'sem json', promessa: '', prova: '' }]);
  });

  it('lê os slides do roteiro', () => {
    expect(parseRoteiro('{"slides":[{"titulo":"Capa","apoio":"linha"}]}').slides).toEqual([{ titulo: 'Capa', apoio: 'linha' }]);
  });
});
