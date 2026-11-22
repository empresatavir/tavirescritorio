import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MotorCall, MotorResult } from '../../src/main/motors';
import {
  FIXTURE_ID,
  inventedNumbers,
  raioxConformanceMarkdown,
  runRaioxConformance,
  seedWriting,
} from '../../src/main/raiox/raioxConformance';
import { caseDir } from '../../src/main/raiox/raioxStore';

const REPO = path.resolve(__dirname, '../..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'raiox', 'caso-ficticio');
const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-conf-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

const REPORT = ['Resumo executivo', 'Escopo e cobertura', 'Presença atual', 'Jornada de compra observada',
  'Reputação e relacionamento', 'Oportunidades priorizadas', 'Plano de testes', 'Limitações', 'Fontes analisadas e limites'];
const PLAN = ['Objetivo operacional', 'Plano priorizado', 'Rotina orgânica', 'Relacionamento e satisfação', 'Experimentos e decisão'];
const PLAN30 = "Colocar na bio um link único para pedir pelo WhatsApp e um destaque 'Como encomendar'.";

function doc(sections: string[], body: (title: string) => string): string {
  return sections.map((t) => `## ${t}\n\n${body(t)}\n`).join('\n') + '\n<!-- CORTAR-PUBLICO -->\n\nAnexo interno.\n';
}

/** Motor simulado: grava o que a análise e a redação pedem, com ou sem defeito. */
function fakeMotor(kind: 'bom' | 'inventa' | 'vaza') {
  return async (call: MotorCall): Promise<MotorResult> => {
    const ws = call.workspace;
    if (/Execute o Raio X assistido/.test(call.prompt)) {
      const claim = kind === 'inventa' ? 'O perfil tem 15.000 seguidores.' : 'O perfil tem 2.340 seguidores e nenhum link na bio.';
      fs.writeFileSync(path.join(ws, 'analise', 'sugestoes.json'), JSON.stringify({
        evidencias: [
          { stage: 'encontrar', source: 'analise/fontes/instagram.md', claim, classification: 'observado', front: '', gapIds: ['instagram-sem-destino'], url: '', arquivo: '' },
          { stage: 'conversar', source: 'analise/fontes/instagram.md', claim: 'Perguntas de preço sem resposta em 4 das 7 fotos.', classification: 'observado', front: '', gapIds: ['whatsapp-lento'], url: '', arquivo: '' },
          { stage: 'vender', source: 'analise/fontes/site.md', claim: 'O site não tem link para pedido.', classification: 'observado', front: '', gapIds: ['sem-canal-pedido'], url: '', arquivo: '' },
        ],
        hipoteses: [{ gapId: 'instagram-sem-destino', texto: 'O Instagram não leva ao pedido.', evidencias: [0] }],
      }), 'utf8');
      if (kind === 'vaza') fs.writeFileSync(path.join(ws, '..', '..', 'vazou.txt'), 'x');
    } else {
      const folder = path.join(ws, 'documentos', 'v1');
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, 'relatorio-raio-x.md'), doc(REPORT, (t) => (t === 'Oportunidades priorizadas' ? 'Instagram sem destino: foi observado que a bio não tem link.' : 'Foi observado que o perfil tem 2.340 seguidores.')), 'utf8');
      fs.writeFileSync(path.join(folder, 'plano-crescimento.md'), doc(PLAN, (t) => (t === 'Plano priorizado' ? `30 dias: ${PLAN30}` : 'Rotina simples.')), 'utf8');
    }
    return { motor: call.motor, binary: '', args: [], model: call.model, stdout: '', stderr: '', exitCode: 0, ok: true, text: 'ok' } as never;
  };
}

describe('F11 T11.1 — caso fictício de referência', () => {
  it('passa pelas regras do Escritório (evidências, prioridade e devolutiva) e não tem dado real', () => {
    const root = temp();
    const c = seedWriting(root, REPO, '2026-11-21T18:00:00.000Z');
    expect(c.id).toBe(FIXTURE_ID);
    expect(c.evidence.every((e) => e.review === 'aprovada')).toBe(true);
    expect(c.priority?.gapId).toBe('instagram-sem-destino');
    expect(c.debrief?.plan30).toBe(PLAN30);
    expect(fs.existsSync(path.join(caseDir(root, FIXTURE_ID), 'analise', 'fontes', 'instagram.md'))).toBe(true);
    for (const f of ['caso.json', 'analysis-input.json', 'redacao.json']) {
      const text = fs.readFileSync(path.join(FIXTURE, f), 'utf8');
      expect(text).toMatch(/fictíci|Ficticia|ficticio/i);
      expect(text).not.toMatch(/@(gmail|hotmail|outlook)\./);
    }
  });
});

describe('F11 T11.2 — conformidade do Raio-X', () => {
  it('número sem fonte é apontado; número das fontes, datas e 30/60/90 passam', () => {
    const allowed = 'Seguidores: 2.340. 4 das 7 fotos. 12 encomendas.';
    expect(inventedNumbers('Tem 2.340 seguidores e 12 encomendas; plano 30/60/90 em 2026-11-21, coleta 21/11/2026, dias 31 a 60 e 61 a 90.', allowed)).toEqual([]);
    expect(inventedNumbers('Tem 15.000 seguidores e ticket de R$ 80.', allowed)).toEqual(['15.000', 'R$ 80']);
  });

  it('motor que cumpre passa nas duas etapas', async () => {
    const results = await runRaioxConformance({ motors: ['claude'], repo: REPO, workdir: temp(), run: fakeMotor('bom'), gitStatus: () => '' });
    expect(results[0].checks.map((c) => [c.id, c.ok, c.detail])).toEqual([['analise', true, 'ok'], ['redacao', true, 'ok']]);
    expect(results[0].ok).toBe(true);
    expect(raioxConformanceMarkdown(results)).toContain('✅ conforme');
  });

  it('motor que inventa número ou escreve fora da pasta do caso reprova', async () => {
    const inventa = await runRaioxConformance({ motors: ['cursor'], repo: REPO, workdir: temp(), run: fakeMotor('inventa'), gitStatus: () => '' });
    expect(inventa[0].checks[0]).toMatchObject({ ok: false });
    expect(inventa[0].checks[0].detail).toMatch(/15\.000/);
    const vaza = await runRaioxConformance({ motors: ['codex'], repo: REPO, workdir: temp(), run: fakeMotor('vaza'), gitStatus: () => '' });
    expect(vaza[0].checks[0].detail).toMatch(/fora da pasta do caso: vazou\.txt/);
    expect(raioxConformanceMarkdown(vaza)).toContain('❌ falhou');
  });
});

describe('F11 T11.3 — prompt da análise lista os ids aceitos', () => {
  it('gaps e frentes do prompt são exatamente os do Escritório', async () => {
    const { RAIOX_FRONTS, RAIOX_GAPS } = await import('../../src/shared/raiox');
    const prompt = fs.readFileSync(path.join(REPO, 'raiox', 'prompts', 'analise.md'), 'utf8');
    const gapLine = prompt.split('\n').find((l) => l.includes('só aceitam estes ids da taxonomia'))!;
    const listed = (gapLine.split('só aceitam estes ids da taxonomia:')[1].split('.')[0].match(/`([a-z-]+)`/g) || []).map((s) => s.slice(1, -1));
    expect(listed.sort()).toEqual(RAIOX_GAPS.map((g) => g.id).sort());
    const fronts = (gapLine.split('`front` só pode ser um destes ids:')[1].split('.')[0].match(/`([a-z]+)`/g) || []).map((s) => s.slice(1, -1));
    expect(fronts.sort()).toEqual(RAIOX_FRONTS.map((f) => f.id).sort());
  });
});
