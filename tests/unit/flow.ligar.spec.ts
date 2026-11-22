import { describe, expect, it } from 'vitest';
import { avisoDePorta, garantirDarkflow } from '../../src/main/flow/ligar';

const URL = 'http://127.0.0.1:8765/api/health';
const sleep = async () => undefined;

describe('Flow sobe o DarkFlow (F3)', () => {
  it('não pede para subir quando o DarkFlow já está no ar', async () => {
    let starts = 0;
    const res = await garantirDarkflow(URL, { health: async () => true, start: async () => { starts++; return { ok: true }; }, sleep });
    expect(res).toEqual({ ok: true, jaEstava: true });
    expect(starts).toBe(0);
  });

  it('sobe pelo sidecar e espera a saúde responder', async () => {
    let checks = 0;
    const ids: string[] = [];
    const res = await garantirDarkflow(URL, {
      health: async () => ++checks > 3,
      start: async (id) => { ids.push(id); return { ok: true }; },
      sleep,
      intervalMs: 10,
      timeoutMs: 1000,
    });
    expect(res).toEqual({ ok: true, jaEstava: false });
    expect(ids).toEqual(['darkflow']);
  });

  it('para de esperar e diz quanto esperou', async () => {
    const res = await garantirDarkflow(URL, { health: async () => false, start: async () => ({ ok: true }), sleep, intervalMs: 100, timeoutMs: 300 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('não respondeu');
  });

  it('porta ocupada vira aviso do conflito com o TTS do Docuflow', async () => {
    const res = await garantirDarkflow(URL, { health: async () => false, start: async () => ({ ok: false, error: 'a porta 8765 está com python.exe (pid 99)' }), sleep });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('python.exe');
      expect(res.aviso).toContain('TTS local do Docuflow');
    }
  });

  it('recusa do sidecar sem relação com a porta passa sem aviso', async () => {
    const res = await garantirDarkflow(URL, { health: async () => false, start: async () => ({ ok: false, error: 'O Escritório não liga --enable-meta-publish. Isso fica no DarkFlow.' }), sleep });
    expect(res).toEqual({ ok: false, error: 'O Escritório não liga --enable-meta-publish. Isso fica no DarkFlow.' });
    expect(avisoDePorta('sistema não encontrado')).toBeUndefined();
  });
});
