import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { derivarEstado, enviarParaBiblioteca, estadoNoFlow, lerEntrega } from '../../src/main/flow/biblioteca';
import type { StudioStore } from '../../src/main/studio/store';
import type { Peca } from '../../src/shared/studio';

const ID = '33333333-3333-4333-8333-333333333333';
const dirs: string[] = [];
const closers: Array<() => void> = [];
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const probe = () => ({ width: 1080, height: 1920, duration: 10 });

afterEach(() => {
  for (const c of closers.splice(0)) c();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-flowlib-'));
  dirs.push(d);
  return d;
}

function listen(handler: http.RequestListener): Promise<string> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const a = server.address();
      closers.push(() => server.close());
      resolve(`http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`);
    });
  });
}

function reel(): { store: StudioStore; home: string } {
  const home = tmp();
  const pacote = path.join(home, 'pecas', ID, 'pacote');
  fs.mkdirSync(pacote, { recursive: true });
  fs.writeFileSync(path.join(pacote, 'final.mp4'), 'reel');
    fs.writeFileSync(path.join(pacote, 'manifest.json'), '{}');
  const peca = { id: ID, perfil_id: 'p', rede: 'instagram', formato_id: 'ig-reels-9x16', titulo: 'Reel', etapa: 'pacote', legenda: 'oi', hashtags: [] } as unknown as Peca;
  const store = { tree: { home }, getPeca: () => peca, getPerfil: () => ({ nome: 'TAVIR' }), listAtivos: () => [{ origem: 'flow' }] } as unknown as StudioStore;
  return { store, home };
}

describe('Studio entrega à biblioteca do Flow (F1)', () => {
  it('importa na biblioteca e nunca cria nem ativa agenda', async () => {
    const calls: string[] = [];
    const base = await listen((req, res) => {
      calls.push(`${req.method} ${req.url}`);
      if (req.url === '/api/publisher/session') return void res.end(JSON.stringify({ csrf_token: 'tok' }));
      if (req.url === '/api/publisher/library/scan') {
        expect(req.headers['x-csrf-token']).toBe('tok');
        return void res.end('{}');
      }
      if (req.url === '/api/publisher/library') return void res.end(JSON.stringify([{ id: 'lib1', sha256: sha('reel') }]));
      res.writeHead(404);
      res.end();
    });
    const { store } = reel();
    const project = tmp();
    const out = await enviarParaBiblioteca(store, ID, base, path.join(project, 'storage', 'output'), project, { probe });
    expect(out).toEqual({ ok: true, itemId: 'lib1' });
    expect(calls).toEqual(['GET /api/publisher/session', 'POST /api/publisher/library/scan', 'GET /api/publisher/library']);
    expect(calls.some((c) => c.includes('/schedules'))).toBe(false);
    expect(lerEntrega(store, ID)).toMatchObject({ item_id: 'lib1', sha256: sha('reel'), ia: true });
  });

  it('se o DarkFlow não importar, não grava a entrega', async () => {
    const base = await listen((req, res) => {
      if (req.url === '/api/publisher/session') return void res.end(JSON.stringify({ csrf_token: 'tok' }));
      if (req.url === '/api/publisher/library/scan') return void res.end('{}');
      if (req.url === '/api/publisher/library') return void res.end('[]');
      res.writeHead(404);
      res.end();
    });
    const { store } = reel();
    const project = tmp();
    const out = await enviarParaBiblioteca(store, ID, base, path.join(project, 'storage', 'output'), project, { probe });
    expect(out).toEqual({ ok: false, error: 'o DarkFlow não importou o vídeo na biblioteca' });
    expect(lerEntrega(store, ID)).toBeNull();
  });

  it('estado: fora antes de enviar, sem conexão quando o DarkFlow não responde', async () => {
    const { store, home } = reel();
    expect(await estadoNoFlow(store, ID, 'http://127.0.0.1:1')).toEqual({ situacao: 'fora' });
    fs.writeFileSync(path.join(home, 'pecas', ID, 'pacote', 'flow.json'), JSON.stringify({ item_id: 'lib1', sha256: sha('reel') }));
    const off = await estadoNoFlow(store, ID, 'http://127.0.0.1:1');
    expect(off.situacao).toBe('sem_conexao');
  });

  it('deriva a situação das agendas e ocorrências do item', () => {
    const s = (status: string, id = 's1') => ({ id, item_id: 'lib1', status });
    const o = (state: string, at: string, extra: Record<string, unknown> = {}) => ({ schedule_id: 's1', state, scheduled_at_utc: at, ...extra });
    expect(derivarEstado('lib1', [], [])).toEqual({ situacao: 'na_biblioteca' });
    expect(derivarEstado('lib1', [{ id: 'x', item_id: 'outro', status: 'agendado' }], [])).toEqual({ situacao: 'na_biblioteca' });
    expect(derivarEstado('lib1', [s('rascunho')], [o('agendado', '2026-12-01T12:00:00Z')])).toEqual({ situacao: 'rascunho' });
    expect(derivarEstado('lib1', [s('agendado')], [o('agendado', '2026-12-02T12:00:00Z'), o('agendado', '2026-12-01T12:00:00Z')])).toEqual({ situacao: 'agendada', quando: '2026-12-01T12:00:00Z' });
    expect(derivarEstado('lib1', [s('pausado')], [o('pausado', '2026-12-01T12:00:00Z')])).toEqual({ situacao: 'pausada' });
    expect(derivarEstado('lib1', [s('agendado')], [o('publicado', '2026-12-01T12:00:00Z', { permalink: 'https://instagram.com/reel/X/' })])).toEqual({ situacao: 'publicada', quando: '2026-12-01T12:00:00Z', permalink: 'https://instagram.com/reel/X/' });
    expect(derivarEstado('lib1', [s('agendado')], [o('reconciliacao', '2026-12-01T12:00:00Z')])).toMatchObject({ situacao: 'atencao', detalhe: 'reconciliacao' });
    expect(derivarEstado('lib1', [s('agendado')], [o('falhou', '2026-12-01T12:00:00Z', { error_message: 'cota' })])).toMatchObject({ situacao: 'falhou', detalhe: 'cota' });
    expect(derivarEstado('lib1', [s('cancelado')], [o('cancelado', '2026-12-01T12:00:00Z')])).toEqual({ situacao: 'na_biblioteca' });
  });
});
