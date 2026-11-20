import { describe, expect, it } from 'vitest';
import { ENGINE_CATALOG, motorById } from '../../src/shared/engineCatalog';
import { callForRequest, publishedEngines } from '../../src/shared/officeAgents';

const settings = { defaultEngine: 'antigravity', defaultModel: 'gemini-3.8-flash', defaultEffort: 'medium' };
const two = publishedEngines([motorById('antigravity'), motorById('claude')], settings);

describe('motores que o app pode escolher', () => {
  it('publica só os ligados, com o padrão do Escritório marcado', () => {
    expect(two.map((e) => e.id)).toEqual(['antigravity', 'claude']);
    const padrao = two.find((e) => e.isDefault)!;
    expect(padrao.model).toBe('gemini-3.8-flash');
    expect(padrao.defaultEffort).toBe('medium');
    const claude = two.find((e) => e.id === 'claude')!;
    const motor = ENGINE_CATALOG.find((m) => m.id === 'claude')!;
    expect(claude.model).toBe(motor.defaultModel);
    expect(claude.efforts.length).toBeGreaterThan(0);
  });

  it('sem escolha no pedido, vale o padrão do Escritório', () => {
    expect(callForRequest({ instrucao: 'x' }, two, settings)).toEqual({ engine: 'antigravity', model: 'gemini-3.8-flash', effort: 'medium' });
  });

  it('motor e esforço escolhidos no app valem quando o motor está ligado', () => {
    const claude = two.find((e) => e.id === 'claude')!;
    const call = callForRequest({ motor: 'claude', esforco: 'high' }, two, settings);
    expect(call).toEqual({ engine: 'claude', model: claude.model, effort: 'high' });
  });

  it('motor desligado ou esforço que o modelo não tem caem no padrão', () => {
    expect(callForRequest({ motor: 'codex' }, two, settings).engine).toBe('antigravity');
    expect(callForRequest({ motor: 'antigravity', esforco: 'turbo' }, two, settings).effort).toBe('medium');
  });
});
