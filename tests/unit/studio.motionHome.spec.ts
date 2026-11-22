import { describe, expect, it } from 'vitest';
import { nodeEnvFor } from '../../src/main/studio/motionHome';

describe('nodeEnvFor', () => {
  it('liga ELECTRON_RUN_AS_NODE quando o comando é o próprio executável (electron.exe dentro do app)', () => {
    expect(nodeEnvFor(process.execPath).ELECTRON_RUN_AS_NODE).toBe('1');
  });

  it('não mexe no ambiente de outros comandos', () => {
    const env = nodeEnvFor('npm');
    expect(env).toBe(process.env);
  });
});
