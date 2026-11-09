import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createSidecarManager, loadSidecars, parseListeningPid, type SidecarSpec } from '../../src/main/sidecars';
import { exportReelForDarkFlow } from '../../src/main/studio/darkflowExport';
import { darkflowRequest } from '../../src/main/studio/darkflow';
import { docuflowChannel } from '../../src/main/studio/docuflow';
import type { BrandKit } from '../../src/shared/studio';

const KIT: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '',
  negatives: [],
  characters: [],
  tone: 'direto',
  canon: [],
  voice: { provider: 'edge-tts', voiceId: 'pt-BR-FranciscaNeural' },
};

function writeConfig(systems: SidecarSpec[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-sidecars-'));
  const file = path.join(dir, 'sidecars.json');
  fs.writeFileSync(file, JSON.stringify({ sistemas: systems }));
  return file;
}

describe('sidecars', () => {
  it('lê o exemplo sem a flag de publicação', () => {
    const systems = loadSidecars(path.resolve('db/sidecars.example.json'));
    expect(systems.map((item) => item.id)).toEqual(['darkflow', 'docuflow']);
    expect(systems[0].healthUrl).toBe('http://127.0.0.1:8765/api/health');
    expect(systems[1].healthUrl).toBe('http://127.0.0.1:5000/docs');
    expect(JSON.stringify(systems)).not.toContain('enable-meta-publish');
  });

  it('reconhece quem escuta a porta', () => {
    const text = '  TCP    127.0.0.1:8765         0.0.0.0:0              LISTENING       4321';
    expect(parseListeningPid(text, 8765)).toBe(4321);
    expect(parseListeningPid(text, 5000)).toBeNull();
  });

  it('recusa subir quando a porta já tem dono', async () => {
    const file = writeConfig([{
      id: 'darkflow', nome: 'DarkFlow', pasta: 'C:/DarkFlow', comando: 'Iniciar-DarkFlow.bat',
      healthUrl: 'http://127.0.0.1:9/health', portas: [8765],
    }]);
    let spawned = 0;
    const manager = createSidecarManager(file, {
      health: async () => false,
      portOwner: () => ({ pid: 99, nome: 'python.exe' }),
      spawn: () => { spawned += 1; return { pid: 1, kill() {} }; },
    });
    const result = await manager.start('darkflow');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('8765');
    expect(result.error).toContain('python.exe');
    expect(spawned).toBe(0);
  });

  it('recusa subir DarkFlow e Docuflow juntos na porta 8765', async () => {
    const file = writeConfig([
      { id: 'darkflow', nome: 'DarkFlow', pasta: 'C:/DarkFlow', comando: 'Iniciar-DarkFlow.bat', healthUrl: 'http://darkflow/health', portas: [8765] },
      {
        id: 'docuflow', nome: 'Docuflow', pasta: 'C:/Docuflow', comando: 'iniciar.bat', healthUrl: 'http://docuflow/docs', portas: [5000],
        conflito: { com: 'darkflow', porta: 8765, motivo: 'A API do DarkFlow e o TTS local do Docuflow usam a porta 8765. Os dois não sobem juntos.' },
      },
    ]);
    let spawned = 0;
    const manager = createSidecarManager(file, {
      health: async (url) => url.includes('darkflow'),
      portOwner: () => null,
      spawn: () => { spawned += 1; return { pid: 7, kill() {} }; },
    });
    const result = await manager.start('docuflow');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('8765');
    expect(spawned).toBe(0);
  });

  it('não liga a publicação da Meta', async () => {
    const file = writeConfig([{
      id: 'darkflow', nome: 'DarkFlow', pasta: 'C:/DarkFlow', comando: 'Iniciar-DarkFlow.bat --enable-meta-publish',
      healthUrl: 'http://127.0.0.1:9/health', portas: [8765],
    }]);
    const manager = createSidecarManager(file, {
      health: async () => false,
      portOwner: () => null,
      spawn: () => { throw new Error('não deveria iniciar'); },
    });
    const result = await manager.start('darkflow');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('enable-meta-publish');
  });
});

describe('DarkFlow', () => {
  it('manda o CSRF e não pede publicação real', async () => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/publisher/session') {
        res.end(JSON.stringify({ csrf_token: 'tok', mode: 'simulation' }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/publisher/schedules') {
        expect(req.headers['x-csrf-token']).toBe('tok');
        res.writeHead(201);
        res.end(JSON.stringify({ id: 'ag1' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const session = await darkflowRequest(`http://127.0.0.1:${port}`, '/api/publisher/session');
    const created = await darkflowRequest(`http://127.0.0.1:${port}`, '/api/publisher/schedules', {
      method: 'POST',
      csrf: String(session.csrf_token),
      body: { activate: false },
    });
    server.close();
    expect(session.mode).toBe('simulation');
    expect(created.id).toBe('ag1');
  });

  it('copia o reel para a pasta que o DarkFlow varre', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-df-'));
    const project = path.join(root, 'DarkFlow');
    const output = path.join(project, 'storage', 'output');
    const source = path.join(root, 'final.mp4');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(source, 'reel');
    const written = exportReelForDarkFlow({ video: source, outputRoot: output, projectRoot: project, width: 1080, height: 1920, duration: 2 });
    const manifest = JSON.parse(fs.readFileSync(written.manifest, 'utf8'));
    expect(manifest.schema_version).toBe(1);
    expect(manifest.editorial.state).toBe('approved');
    expect(manifest.relative_path).toBe('storage/output/final.mp4');
    expect(manifest.sha256).toBe(createHash('sha256').update('reel').digest('hex'));
    expect(manifest.media).toMatchObject({ container: 'mp4', video_codec: 'h264', audio_codec: 'aac', width: 1080, height: 1920 });
  });
});

describe('Docuflow', () => {
  it('mapeia o perfil para canal e brand kit sem campo extra de voz', () => {
    const mapped = docuflowChannel({
      id: 'p1', nome: 'Multiverso Paranoico', iniciais: 'MP', brand_kit: KIT,
      redes: [{ rede: 'youtube', handle: '@multiverso' }],
    });
    expect(mapped.channel).toMatchObject({ id: 'mp', name: 'Multiverso Paranoico', handle: 'multiverso' });
    expect(mapped.brandKit.colors.primary).toBe('#B7F34A');
    expect(mapped.brandKit.fonts.heading).toBe('Instrument Sans');
    expect(mapped.brandKit).not.toHaveProperty('voice');
    expect(mapped.voz).toBe('pt-BR-FranciscaNeural');
  });
});
