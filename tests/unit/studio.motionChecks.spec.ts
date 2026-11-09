import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkAllowedDiff,
  checkContract,
  checkDeterminism,
  checkRegistration,
  snapshotTree,
  rememberCheckOutputs,
} from '../../src/main/studio/motionChecks';

const dirs: string[] = [];

function workspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-motion-check-'));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, 'src', 'kits', 'kit'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"motion"}\n');
  return dir;
}

const good = `
import { z } from 'zod';
export const schema = z.object({ title: z.string() });
export const defaultProps = { title: 'Olá' };
export const TituloEntrada = () => null;
`;

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('checagens de motion', () => {
  it('aceita um kit que só mexe na pasta dele', async () => {
    const dir = workspace();
    fs.writeFileSync(path.join(dir, 'src', 'kits', 'kit', 'TituloEntrada.tsx'), good);
    const before = snapshotTree(dir);
    fs.writeFileSync(path.join(dir, 'src', 'kits', 'kit', 'TituloEntrada.tsx'), good + '\n');
    fs.mkdirSync(path.join(dir, '.tavir', 'runs'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.tavir', 'runs', 'stdout.log'), 'registro\n');
    const c1 = checkAllowedDiff(before, snapshotTree(dir), 'kit');
    expect(c1.ok).toBe(true);
    expect(checkContract(good).ok).toBe(true);
    const c4 = await checkRegistration(good, 'titulo-entrada', async () => true);
    expect(c4.ok).toBe(true);
    const a = path.join(dir, 'a.png');
    const b = path.join(dir, 'b.png');
    const c9 = await checkDeterminism(good, async () => {
      fs.writeFileSync(a, 'frame');
      fs.writeFileSync(b, 'frame');
      return [a, b];
    });
    expect(c9.ok).toBe(true);
  });

  it('reprova Math.random em C3 e C9', async () => {
    const source = `${good}\nconst n = Math.random();\n`;
    expect(checkContract(source).ok).toBe(false);
    const c9 = await checkDeterminism(source);
    expect(c9.ok).toBe(false);
  });

  it('reprova alteração fora do kit', () => {
    const dir = workspace();
    const before = snapshotTree(dir);
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"mudou"}\n');
    const c1 = checkAllowedDiff(before, snapshotTree(dir), 'kit');
    expect(c1.ok).toBe(false);
    expect(c1.detalhe).toContain('package.json');
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'out', 'proxy.mp4'), 'render da checagem');
    fs.writeFileSync(path.join(dir, 'out', 'job-still.json'), 'preview do motor');
    rememberCheckOutputs(before, dir);
    const again = checkAllowedDiff(before, snapshotTree(dir), 'kit');
    expect(again.ok).toBe(false);
    expect(again.detalhe).toContain('out/job-still.json');
    expect(again.detalhe).not.toContain('proxy.mp4');
  });
});
