import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { MotionCheckItem } from '../../src/main/studio/motionChecks';
import { decideMotionGate, startMotionJob } from '../../src/main/studio/motionAuthor';
import { openStudioStore, type StudioStore } from '../../src/main/studio/store';
import type { BrandKit } from '../../src/shared/studio';

const KIT: BrandKit = {
  palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
  fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
  imageStyle: '',
  negatives: [],
  characters: [],
  tone: 'direto',
  canon: [],
};

const dirs: string[] = [];
let store: StudioStore | null = null;

function checks(ok: boolean): MotionCheckItem[] {
  return (['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'] as const).map((id) => ({
    id, ok, detalhe: ok ? 'ok' : 'falhou',
  }));
}

function sourceDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-motion-src-'));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"motion"}\n');
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {};\n');
  fs.writeFileSync(path.join(dir, 'src', 'Root.tsx'), `import React from 'react';
export const RemotionRoot = () => (
  <>
    {/* <kits> */}
    {/* </kits> */}
  </>
);
`);
  return dir;
}

afterEach(() => {
  store?.close();
  store = null;
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('job de motion', () => {
  it('não aprova pela resposta do motor e só copia no gate', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-motion-job-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: KIT });
    const source = sourceDir();
    const job = await startMotionJob({
      perfilId: perfil.id,
      preset: 'titulo-entrada',
      pedido: 'título entra de baixo',
      motor: 'cursor',
      home,
      source,
      store,
      runMotorImpl: async () => ({ ok: true, text: 'aprovado', exitCode: 0 }),
      checkImpl: async () => checks(true),
    });
    expect(job.status).toBe('aguardando_gate');
    const approved = await decideMotionGate(job.id, 'aprovado', '', home, store, source);
    expect(approved.status).toBe('aprovado');
    expect(fs.existsSync(path.join(source, 'src', 'kits', job.kit_id, 'TituloEntrada.tsx'))).toBe(true);
    expect(fs.readFileSync(path.join(source, 'src', 'Root.tsx'), 'utf8')).toContain('id="titulo-entrada"');
    const kit = store.getMotionKit(job.kit_id);
    expect(kit?.status).toBe('aprovado');
    expect(kit?.presets['titulo-entrada']?.approvedAt).toBeTruthy();
  });

  it('deixa reprovado quando a checagem falha, mesmo se o motor disser aprovado', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-motion-job-'));
    dirs.push(home);
    store = openStudioStore(home);
    const perfil = store.savePerfil({ nome: 'Multiverso', iniciais: 'MP', cor_avatar: '#1BC5BD', brand_kit: KIT });
    const job = await startMotionJob({
      perfilId: perfil.id,
      preset: 'zoom-lento',
      pedido: 'zoom',
      motor: 'cursor',
      home,
      source: sourceDir(),
      store,
      maxAutoRetries: 0,
      runMotorImpl: async () => ({ ok: true, text: 'aprovado', exitCode: 0 }),
      checkImpl: async () => checks(false),
    });
    expect(job.status).toBe('reprovado');
    expect(() => store!.applyMotionGate(job.id, 'aprovado')).toThrow(/checagens/);
  });
});
