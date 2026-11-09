import { describe, expect, it } from 'vitest';
import { motionConformanceMarkdown, type MotionMotorReport } from '../../src/main/studio/motionConformance';

describe('relatório de motion', () => {
  it('mostra ⛔ quando o motor não tem login', () => {
    const results: MotionMotorReport[] = [{
      motor: 'codex',
      label: 'Codex',
      ok: false,
      blocker: 'Codex sem login. CLI encontrado · sem login',
      scenarios: [],
    }];
    const md = motionConformanceMarkdown(results);
    expect(md).toContain('⛔ Codex sem login');
    expect(md).not.toContain('✅');
  });
});
