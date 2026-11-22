import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  BUILD_SPEC_FILE,
  lerSpec,
  parseBuilds,
  fatosParaIris,
  mascararSaida,
  rodarBuild,
  ultimoBuild,
  buildRodando,
} from '../../src/main/buildProjeto';

let root: string;

const ALVO_APK = {
  id: 'apk',
  nome: 'APK do app',
  comando: ['powershell', '-NoProfile', '-File', 'aplicativo\\build_apk.ps1'],
  cwd: '.',
  timeoutMin: 25,
  prova: ['fila na nuvem conferida dentro do APK'],
  artefato: 'aplicativo/build/app-release.apk',
  requisitos: 'Card do Supabase completo.',
};

function spec(alvos: unknown[]) {
  fs.writeFileSync(path.join(root, BUILD_SPEC_FILE), JSON.stringify({ versao: 1, alvos }), 'utf8');
}

/** Runner falso: opcionalmente grava o artefato e devolve a saída pedida. */
function runner(out: string, code = 0, opts: { grava?: boolean; timedOut?: boolean } = {}) {
  const calls: Array<{ cmd: string; args: string[]; cwd: string; timeoutMs: number }> = [];
  const fn = async (cmd: string, args: string[], cwd: string, timeoutMs: number, track: (c: any) => void) => {
    calls.push({ cmd, args, cwd, timeoutMs });
    track(null);
    if (opts.grava) {
      const f = path.join(root, 'aplicativo/build/app-release.apk');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.alloc(3 * 1048576));
    }
    return { code, out, ms: 1234, timedOut: !!opts.timedOut };
  };
  return { fn, calls };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-build-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('tavir.build.json', () => {
  it('sem arquivo: nada para a Íris', () => {
    expect(lerSpec(root)).toEqual({ alvos: [], erros: [], existe: false });
    expect(fatosParaIris(root)).toEqual([]);
  });

  it('lê alvo válido e descarta o que sai do projeto ou não tem o que conferir', () => {
    spec([
      ALVO_APK,
      { id: 'fora', comando: ['x'], cwd: '../outro', prova: ['ok'] },
      { id: 'cego', comando: ['x'] },
      { id: 'Maiusc', comando: ['x'], prova: ['ok'] },
      { id: 'vazio', comando: [], prova: ['ok'] },
    ]);
    const s = lerSpec(root);
    expect(s.alvos.map((a) => a.id)).toEqual(['apk']);
    expect(s.alvos[0].timeoutMin).toBe(25);
    expect(s.erros).toHaveLength(4);
    expect(s.erros.join(' ')).toMatch(/fora do projeto/);
    expect(s.erros.join(' ')).toMatch(/declare a prova/);
  });

  it('JSON quebrado vira erro, não exceção', () => {
    fs.writeFileSync(path.join(root, BUILD_SPEC_FILE), '{', 'utf8');
    const s = lerSpec(root);
    expect(s.existe).toBe(true);
    expect(s.erros[0]).toMatch(/não é um JSON válido/);
  });

  it('fato para a Íris lista os alvos e diz que quem roda é o Escritório', () => {
    spec([ALVO_APK]);
    const f = fatosParaIris(root).join(' ');
    expect(f).toContain('apk (APK do app)');
    expect(f).toContain('BUILD:');
    expect(f).toMatch(/você não roda build/);
  });
});

describe('bloco BUILD: da Íris', () => {
  it('vira proposta com o comando declarado e sai do texto', () => {
    spec([ALVO_APK]);
    const r = parseBuilds('Posso gerar o APK agora.\n\nBUILD:\nalvo: apk\nmotivo: formulário do convite pronto', root);
    expect(r.texto).toBe('Posso gerar o APK agora.');
    expect(r.propostas).toEqual([
      {
        alvo: 'apk',
        nome: 'APK do app',
        comando: 'powershell -NoProfile -File aplicativo\\build_apk.ps1',
        motivo: 'formulário do convite pronto',
        requisitos: 'Card do Supabase completo.',
      },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it('alvo que não está no projeto é descartado com aviso (o motor não inventa comando)', () => {
    spec([ALVO_APK]);
    const r = parseBuilds('Ok.\n**BUILD:**\nalvo: deploy-prod\n', root);
    expect(r.propostas).toEqual([]);
    expect(r.avisos[0]).toMatch(/deploy-prod.*não está em tavir.build.json/);
  });

  it('resposta sem bloco fica igual', () => {
    expect(parseBuilds('Nada de build aqui.', root)).toEqual({ propostas: [], texto: 'Nada de build aqui.', avisos: [] });
  });
});

describe('rodar e conferir', () => {
  it('passa só com código 0, prova na saída e artefato novo; grava a evidência fora do git', async () => {
    spec([ALVO_APK]);
    const { fn, calls } = runner('compilando...\nAPK pronto: fila na nuvem conferida dentro do APK · 1.0.0 · 3 MB\n', 0, { grava: true });
    const r = await rodarBuild(root, 'apk', { runner: fn as any });
    expect(r.ok).toBe(true);
    expect(r.motivos).toEqual([]);
    expect(r.provas).toEqual([{ texto: 'fila na nuvem conferida dentro do APK', achou: true }]);
    expect(r.artefato).toMatchObject({ rel: 'aplicativo/build/app-release.apk', existe: true, novo: true, mb: 3 });
    expect(calls[0]).toMatchObject({ cmd: 'powershell', cwd: path.resolve(root), timeoutMs: 25 * 60_000 });
    expect(fs.existsSync(path.join(root, r.pasta, 'saida.log'))).toBe(true);
    expect(r.pasta).toMatch(/^qa\/builds\/BLD-\d{8}-\d{6}$/);
    expect(ultimoBuild(root, 'apk')?.id).toBe(r.id);
    expect(buildRodando(root)).toBe(false);
  });

  it('código 0 sem a prova não passa (o motor ou o script dizer que passou não basta)', async () => {
    spec([ALVO_APK]);
    const { fn } = runner('Build concluído com sucesso!\n', 0, { grava: true });
    const r = await rodarBuild(root, 'apk', { runner: fn as any });
    expect(r.ok).toBe(false);
    expect(r.motivos).toEqual(['A saída não trouxe a prova «fila na nuvem conferida dentro do APK».']);
  });

  it('artefato velho ou ausente e falha do comando aparecem no motivo', async () => {
    spec([ALVO_APK]);
    const { fn } = runner('ERRO: não achei as chaves do APK.\n', 2);
    const r = await rodarBuild(root, 'apk', { runner: fn as any });
    expect(r.ok).toBe(false);
    expect(r.motivos).toContain('O comando terminou com código 2.');
    expect(r.motivos).toContain('O arquivo aplicativo/build/app-release.apk não existe.');
    expect(r.final).toContain('não achei as chaves');
  });

  it('tempo estourado vira motivo', async () => {
    spec([ALVO_APK]);
    const { fn } = runner('', null as any, { timedOut: true });
    const r = await rodarBuild(root, 'apk', { runner: fn as any });
    expect(r.motivos[0]).toMatch(/Passou do tempo de 25 min/);
  });

  it('alvo desconhecido não roda nada', async () => {
    spec([ALVO_APK]);
    const { fn, calls } = runner('x');
    await expect(rodarBuild(root, 'deploy', { runner: fn as any })).rejects.toThrow(/não está em tavir.build.json/);
    expect(calls).toHaveLength(0);
  });

  it('segredo na saída fica mascarado no log e no resultado', async () => {
    spec([ALVO_APK]);
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.abcdefghijklmnop';
    const { fn } = runner(`anon_key=${jwt}\nsb_secret_ABCDEFGHIJKLMNOP\npassword: hunter2hunter2\nERRO\n`, 1);
    const r = await rodarBuild(root, 'apk', { runner: fn as any });
    const log = fs.readFileSync(path.join(root, r.pasta, 'saida.log'), 'utf8');
    for (const txt of [log, r.final]) {
      expect(txt).not.toContain(jwt);
      expect(txt).not.toContain('sb_secret_ABCDEFGHIJKLMNOP');
      expect(txt).not.toContain('hunter2hunter2');
    }
  });
});

describe('mascararSaida', () => {
  it('não mexe em texto comum', () => {
    expect(mascararSaida('APK pronto: fila na nuvem conferida dentro do APK')).toBe('APK pronto: fila na nuvem conferida dentro do APK');
  });
});
