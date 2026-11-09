import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { activateDarkflowSchedule, editionBoard, prepareDarkflowSchedule, presentScorecard, sendToDocuflow } from '../../src/main/studio/ecosystem';
import type { StudioStore } from '../../src/main/studio/store';
import type { BrandKit, Peca, Perfil } from '../../src/shared/studio';

const KIT: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '', negatives: [], characters: [], tone: 'direto', canon: [],
};

function listen(handler: http.RequestListener): Promise<{ base: string; close: () => void }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ base: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

describe('ecossistema', () => {
  it('mostra travessão quando o scorecard não tem janela', () => {
    expect(presentScorecard({})).toEqual([{ k: 'scorecard', v: '—' }]);
    expect(presentScorecard({ summary_by_window: [{ window_hours: 24, sample_size: 2, medians: { reach: 10 } }] })[0].v).toBe('reach 10');
  });

  it('grava a agenda em rascunho e só ativa no gate', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-eco-'));
    const project = path.join(home, 'DarkFlow');
    const output = path.join(project, 'storage', 'output');
    fs.mkdirSync(output, { recursive: true });
    const pecaId = '11111111-1111-4111-8111-111111111111';
    const pacote = path.join(home, 'pecas', pecaId, 'pacote');
    fs.mkdirSync(pacote, { recursive: true });
    const video = path.join(pacote, 'final.mp4');
    fs.writeFileSync(video, 'reel');
    const sha = createHash('sha256').update('reel').digest('hex');
    let activated = false;
    const server = await listen((req, res) => {
      if (req.url === '/api/publisher/session') { res.end(JSON.stringify({ csrf_token: 'tok' })); return; }
      if (req.url === '/api/publisher/library/scan') {
        expect(req.headers['x-csrf-token']).toBe('tok');
        res.end('{}');
        return;
      }
      if (req.url === '/api/publisher/library') { res.end(JSON.stringify([{ id: 'lib1', sha256: sha }])); return; }
      if (req.method === 'POST' && req.url === '/api/publisher/schedules') {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          const body = JSON.parse(raw);
          expect(body.activate).toBe(false);
          expect(body.editorial_attested).toBe(false);
          res.writeHead(201);
          res.end(JSON.stringify({ id: 'sch1' }));
        });
        return;
      }
      if (req.method === 'PATCH' && req.url === '/api/publisher/schedules/sch1') {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          const body = JSON.parse(raw);
          expect(body.activate).toBe(true);
          expect(body.editorial_attested).toBe(true);
          activated = true;
          res.end('{}');
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    const peca = { id: pecaId, formato_id: 'ig-reels-9x16', titulo: 'Reel', legenda: 'oi', hashtags: ['#tavir'], agendado_para: '2026-12-01T09:30:00', roteiro: null } as Peca;
    const store = { getPeca: () => peca, tree: { home } } as unknown as StudioStore;
    const draft = await prepareDarkflowSchedule(store, pecaId, server.base, output, project);
    expect(draft.ok).toBe(true);
    const live = await activateDarkflowSchedule(store, pecaId, server.base);
    expect(live.ok).toBe(true);
    expect(activated).toBe(true);
    server.close();
  });

  it('cria o canal e o projeto longo sem inventar campo de voz', async () => {
    const seen: string[] = [];
    const server = await listen((req, res) => {
      seen.push(`${req.method} ${req.url}`);
      if (req.url === '/channels') { res.writeHead(409); res.end('{}'); return; }
      if (req.url === '/channels/mp/brand-kit') { res.writeHead(201); res.end('{}'); return; }
      if (req.url === '/projects') {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          const body = JSON.parse(raw);
          expect(body.stop).toBe('research');
          expect(body.topic).toContain('A porta abre.');
          res.writeHead(202);
          res.end(JSON.stringify({ slug: 'o-arquivo' }));
        });
        return;
      }
      if (req.url === '/compositions') { res.end(JSON.stringify({ projects: [{ projectId: 'c1', title: 'Corte' }] })); return; }
      if (req.url === '/jobs') { res.end(JSON.stringify({ jobs: [{ jobId: 'j1', status: 'done' }] })); return; }
      res.writeHead(404);
      res.end();
    });
    const perfil = { id: 'p', nome: 'Multiverso Paranoico', iniciais: 'MP', brand_kit: KIT, redes: [{ id: 'r', perfil_id: 'p', rede: 'youtube', handle: '@multiverso', formatos: [], posts_por_semana: 1, publicacao: 'manual' }] } as Perfil;
    const peca = { id: 'p1', formato_id: 'yt-longo-16x9', titulo: 'O arquivo', roteiro: { cenas: [{ texto_narrado: 'A porta abre.' }] } } as Peca;
    const sent = await sendToDocuflow(server.base, perfil, peca);
    expect(sent).toEqual({ ok: true, slug: 'o-arquivo' });
    expect(seen).toContain('POST /channels');
    const board = await editionBoard(server.base);
    expect(board.compositions).toHaveLength(1);
    expect(board.jobs).toHaveLength(1);
    server.close();
  });
});
