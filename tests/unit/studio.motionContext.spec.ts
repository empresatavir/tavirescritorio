import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Perfil } from '../../src/shared/studio';
import { MOTION_CONTRACT, motionPrompt, writeMotionContext } from '../../src/main/studio/motionContext';

const dirs: string[] = [];

function perfil(): Perfil {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    nome: 'Multiverso Paranoico',
    iniciais: 'MP',
    cor_avatar: '#1BC5BD',
    brand_kit: {
      palette: { ink: '#0B1220', surface: '#F4F6F2', text: '#F4F6F2', accent: '#B7F34A', accent2: '#1BC5BD' },
      fonts: { title: 'Instrument Sans', body: 'Instrument Sans' },
      imageStyle: '',
      negatives: [],
      characters: [],
      tone: 'direto',
      canon: ['sem clickbait'],
    },
    motion_kit_id: null,
    criado_em: '2026-11-09T00:00:00.000Z',
    atualizado_em: '2026-11-09T00:00:00.000Z',
  };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeMotionContext', () => {
  it('escreve o contrato e os arquivos de cada motor', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-motion-ctx-'));
    dirs.push(workspace);
    const written = writeMotionContext(workspace, perfil());
    expect(written).toEqual([
      'MOTION_CONTRACT.md',
      'KIT.md',
      'AGENTS.md',
      'CLAUDE.md',
      '.cursor/rules/remotion.mdc',
      '.agents/skills/tavir-motion/SKILL.md',
    ]);
    for (const file of written) expect(fs.existsSync(path.join(workspace, file))).toBe(true);
    expect(fs.readFileSync(path.join(workspace, 'MOTION_CONTRACT.md'), 'utf8')).toBe(MOTION_CONTRACT);
    const kit = fs.readFileSync(path.join(workspace, 'KIT.md'), 'utf8');
    expect(kit).toContain('direto');
    expect(kit).toContain('enterFrames: 9');
    expect(kit).not.toContain('Math.random');
    const prompt = motionPrompt('legenda-palavra', 'legenda palavra por palavra');
    expect(prompt).toContain('Contrato de motion');
    expect(prompt).toContain('.agents/skills/remotion-captions/SKILL.md');
  });
});
