import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Contrato de Movimento (17 Keyframes Literais)', () => {
  const cssPath = resolve(__dirname, '../src/renderer/styles/motion.css');
  const refPath = resolve(__dirname, '../visual/motion-reference.json');

  const cssContent = readFileSync(cssPath, 'utf8');
  const refJson = JSON.parse(readFileSync(refPath, 'utf8'));

  it('deve conter exatamente os 17 keyframes do redesenho', () => {
    const keyframes = Object.keys(refJson.keyframes);
    expect(keyframes).toHaveLength(17);

    for (const kf of keyframes) {
      const regex = new RegExp(`@keyframes\\s+${kf}\\s*\\{`, 'i');
      expect(cssContent).toMatch(regex);
    }
  });

  it('deve conter os tokens canônicos de tempo no :root', () => {
    expect(cssContent).toContain('--ease: cubic-bezier(.2, .7, .2, 1)');
    expect(cssContent).toContain('--fast: 120ms');
    expect(cssContent).toContain('--std: 180ms');
  });

  it('deve conter a regra estrita de prefers-reduced-motion com 1ms', () => {
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('animation-duration: 1ms !important');
    expect(cssContent).toContain('animation-iteration-count: 1 !important');
    expect(cssContent).toContain('transition-duration: 1ms !important');
  });
});
