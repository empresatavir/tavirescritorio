import * as http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ativarAgenda, cancelarAgenda, criarAgenda, flowBoard, problemasDaAgenda, rodarSimulacao, type NovaAgenda } from '../../src/main/flow/cliente';

const closers: Array<() => void> = [];
afterEach(() => { for (const c of closers.splice(0)) c(); });

type Call = { method: string; url: string; csrf?: string; body?: any };

/** DarkFlow falso: guarda as chamadas e responde conforme o estado. */
async function fakeDarkflow(opts: { mode?: string; schedules?: any[] } = {}): Promise<{ base: string; calls: Call[] }> {
  const calls: Call[] = [];
  const schedules = opts.schedules ?? [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const call: Call = { method: req.method || '', url: req.url || '', csrf: req.headers['x-csrf-token'] as string | undefined, body: raw ? JSON.parse(raw) : undefined };
      calls.push(call);
      const send = (code: number, body: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
      if (call.url === '/api/publisher/session') return send(200, { csrf_token: 'tok', mode: opts.mode ?? 'simulation' });
      if (call.url === '/api/publisher/status') return send(200, { mode: opts.mode ?? 'simulation', limits: { per_day: 3, per_week: 15 } });
      if (call.url === '/api/publisher/library') return send(200, [{ id: 'lib1', display_name: 'final.mp4' }]);
      if (call.url === '/api/publisher/occurrences') return send(200, []);
      if (call.url === '/api/publisher/schedules' && call.method === 'GET') return send(200, schedules);
      if (call.url === '/api/publisher/schedules' && call.method === 'POST') return send(201, { id: 'sch-new' });
      if (call.url?.startsWith('/api/publisher/schedules/') && call.method === 'PATCH') return send(200, {});
      if (call.url?.endsWith('/cancel')) return send(200, { cancelled: 2 });
      if (call.url === '/api/publisher/simulation/run-once') return send(200, { state: 'publicado', simulation: true });
      send(404, { detail: 'não achei' });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  closers.push(() => server.close());
  const a = server.address();
  return { base: `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`, calls };
}

const nova: NovaAgenda = { item_id: 'lib1', name: 'Reel 1', recurrence: 'once', start_date: '2026-12-01', times: ['09:30'], caption: 'oi', hashtags: '#tavir', is_ai_generated: true };
const rascunho = { id: 'sch1', item_id: 'lib1', name: 'Reel 1', recurrence: 'once', timezone: 'America/Sao_Paulo', start_date: '2026-12-01', end_date: null, times: ['09:30'], weekdays: [], caption: 'oi', hashtags: '#tavir', share_to_feed: true, is_ai_generated: true, editorial_attested: false, status: 'rascunho' };

describe('cliente do Flow (F2)', () => {
  it('confere a agenda antes de chamar o DarkFlow', () => {
    expect(problemasDaAgenda(nova)).toEqual([]);
    expect(problemasDaAgenda({ ...nova, times: ['9:30'] })).toContain('horário no formato HH:MM');
    expect(problemasDaAgenda({ ...nova, times: ['09:00', '12:00', '15:00', '18:00'] })).toContain('de 1 a 3 horários');
    expect(problemasDaAgenda({ ...nova, recurrence: 'weekly' })).toContain('escolha ao menos um dia da semana');
    expect(problemasDaAgenda({ ...nova, start_date: '01/12/2026' })).toContain('data inicial no formato AAAA-MM-DD');
    expect(problemasDaAgenda({ ...nova, recurrence: 'daily', end_date: '2026-11-01' })).toContain('a data final vem antes da inicial');
  });

  it('cria sempre em rascunho, com CSRF e sem ateste', async () => {
    const df = await fakeDarkflow();
    expect(await criarAgenda(df.base, nova)).toEqual({ ok: true, id: 'sch-new' });
    const post = df.calls.find((c) => c.method === 'POST' && c.url === '/api/publisher/schedules')!;
    expect(post.csrf).toBe('tok');
    expect(post.body).toMatchObject({ activate: false, editorial_attested: false, timezone: 'America/Sao_Paulo', is_ai_generated: true, weekdays: [] });
  });

  it('agenda inválida não chega ao DarkFlow', async () => {
    const df = await fakeDarkflow();
    const out = await criarAgenda(df.base, { ...nova, times: [] });
    expect(out.ok).toBe(false);
    expect(df.calls).toEqual([]);
  });

  it('ativar exige o ateste e só vale para rascunho; envia a agenda inteira com ateste', async () => {
    const df = await fakeDarkflow({ schedules: [rascunho, { ...rascunho, id: 'sch2', status: 'agendado' }] });
    expect(await ativarAgenda(df.base, 'sch1', false)).toEqual({ ok: false, error: 'confirme que revisou o conteúdo antes de ativar' });
    expect(df.calls).toEqual([]);
    const ja = await ativarAgenda(df.base, 'sch2', true);
    expect(ja.ok).toBe(false);
    expect(await ativarAgenda(df.base, 'nada', true)).toEqual({ ok: false, error: 'agenda não encontrada' });
    expect(await ativarAgenda(df.base, 'sch1', true)).toEqual({ ok: true });
    const patch = df.calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toBe('/api/publisher/schedules/sch1');
    expect(patch.csrf).toBe('tok');
    expect(patch.body).toMatchObject({ item_id: 'lib1', name: 'Reel 1', times: ['09:30'], caption: 'oi', hashtags: '#tavir', is_ai_generated: true, editorial_attested: true, activate: true });
  });

  it('cancela e simula; simulação recusada em modo real', async () => {
    const df = await fakeDarkflow();
    expect(await cancelarAgenda(df.base, 'sch1')).toEqual({ ok: true, cancelled: 2 });
    expect(await rodarSimulacao(df.base)).toMatchObject({ ok: true, resultado: { state: 'publicado' } });
    const real = await fakeDarkflow({ mode: 'real' });
    expect(await rodarSimulacao(real.base)).toEqual({ ok: false, error: 'o DarkFlow está em modo real; a simulação fica bloqueada' });
    expect(real.calls.some((c) => c.url.includes('run-once'))).toBe(false);
  });

  it('quadro: lê tudo quando no ar e diz que está fora quando não responde', async () => {
    const df = await fakeDarkflow();
    const on = await flowBoard(df.base, null);
    expect(on).toMatchObject({ online: true, library: [{ id: 'lib1' }], schedules: [], occurrences: [], pecas: {} });
    const off = await flowBoard('http://127.0.0.1:1', null);
    expect(off.online).toBe(false);
    expect(off.error).toBeTruthy();
  });
});
