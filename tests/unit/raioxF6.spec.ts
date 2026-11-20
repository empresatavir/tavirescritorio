import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MotorResult } from '../../src/main/motors';
import { analyse } from '../../src/main/raiox/raioxAnalyse';
import { lintDocument } from '../../src/main/raiox/raioxDocLint';
import { approveDocuments, closeCase, createCase, recordDelivery, setDebrief, setPriority, addEvidence } from '../../src/main/raiox/raioxRules';
import { readCase, writeCase } from '../../src/main/raiox/raioxStore';
import type { RaioxCase } from '../../src/shared/raiox';

const NOW = '2026-11-09T20:00:00.000Z';
const UUID = 'e7c28036-77da-43da-bfd4-5c51eb908253';
const dirs: string[] = [];

function temp(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-f6-'));
  dirs.push(root);
  return root;
}

afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function repoOf(): string {
  const repo = temp();
  fs.mkdirSync(path.join(repo, 'raiox', 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'raiox', 'prompts', 'analise.md'), 'Caso {{CASE_ID}} frentes {{FRENTES}} nicho {{NICHO}}', 'utf8');
  return repo;
}

function baseCase(root: string): RaioxCase {
  const created = createCase({
    company: 'Casa',
    objective: 'Ver onde a conversa para.',
    decisionNeeded: 'Seguir ou parar.',
    publicLink: 'https://exemplo.com',
    frontier: 'Sinais públicos.',
  }, NOW, UUID);
  writeCase(root, created);
  return created;
}

function okMotor(payload: unknown): () => Promise<MotorResult> {
  return async (call) => {
    const file = path.join(call.workspace, 'analise', 'sugestoes.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
    return { motor: call.motor, binary: '', args: [], model: call.model, stdout: '', stderr: '', exitCode: 0, ok: true, text: 'ok' };
  };
}

const ledger = { start: async () => ({ id: 'run', dir: '', raw() {}, finish: async () => ({ id: 'run' }) }) };

function run(root: string, repo: string, payload: unknown, git: () => string) {
  const c = baseCase(root);
  return analyse(root, c.id, [], {
    repo,
    run: okMotor(payload),
    gitStatus: git,
    now: () => NOW,
    uuid: (() => { let n = 0; return () => `ev-${++n}`; })(),
    ledger: ledger as never,
  });
}

const valid = {
  evidencias: [{ stage: 'encontrar', source: 'Site', claim: 'A página não tem pedido.', classification: 'observado', gapIds: ['instagram-sem-destino'] }],
  hipoteses: [{ gapId: 'instagram-sem-destino', texto: 'O Instagram não leva ao pedido.', evidencias: [0] }],
};

describe('análise do Raio-X', () => {
  it('grava sugestão válida como evidência pendente da Dora', async () => {
    const root = temp();
    const repo = repoOf();
    const result = await run(root, repo, valid, () => '');
    expect(result).toEqual({ ok: true, created: 1 });
    const saved = readCase(root, 'RX-E7C28036');
    expect(saved.evidence[0]).toMatchObject({ author: 'dora', review: 'pendente', claim: 'A página não tem pedido.' });
    expect(saved.hypotheses).toHaveLength(1);
  });

  it.each([
    [{ evidencias: [{ stage: 'encontrar', source: 'Site', claim: 'x', classification: 'observado', gapIds: ['nao-existe'] }], hipoteses: [] }, 'gap inválido'],
    [{ evidencias: [{ stage: 'encontrar', source: 'Site', claim: 'x', classification: 'chutada', gapIds: [] }], hipoteses: [] }, 'classe inválida'],
    [{ evidencias: [{ stage: 'encontrar', source: 'Site', claim: 'x', classification: 'observado', gapIds: [] }], hipoteses: [{ gapId: 'instagram-sem-destino', texto: 'y', evidencias: [4] }] }, 'índice inexistente'],
    ['{', 'JSON quebrado'],
  ])('recusa sugestão inválida (%s)', async (payload, reason) => {
    const root = temp();
    await expect(run(root, repoOf(), payload, () => '')).rejects.toThrow(`A análise não devolveu sugestões válidas: ${reason}`);
    expect(readCase(root, 'RX-E7C28036').evidence).toEqual([]);
  });

  it('recusa quando a análise escreve no repositório', async () => {
    const root = temp();
    let n = 0;
    await expect(run(root, repoOf(), valid, () => (n++ === 0 ? '' : '?? vazou.txt'))).rejects.toThrow('A análise escreveu no repositório. Nada foi aceito.');
    expect(readCase(root, 'RX-E7C28036').evidence).toEqual([]);
  });
});

function report(extra = ''): string {
  return [
    '## Resumo executivo', 'Foi observado que a página não pede.',
    '## Escopo e cobertura', 'A empresa informou que atende no bairro.',
    '## Presença atual', 'Uma hipótese a validar é o cardápio.',
    '## Jornada de compra observada', 'Não foi possível verificar o checkout.',
    '## Reputação e relacionamento', 'Sem pesquisa.',
    '## Oportunidades priorizadas', 'Instagram sem destino vem primeiro.',
    '## Plano de testes', 'Um teste.',
    '## Limitações', 'Sem acesso.',
    '## Fontes analisadas e limites', 'O site público.',
    extra,
    '<!-- CORTAR-PUBLICO -->',
    '## Anexo interno',
  ].join('\n');
}

function plan(plan30: string): string {
  return [
    '## Objetivo operacional', 'Facilitar o pedido.',
    '## Plano priorizado', plan30,
    '## Rotina orgânica', 'Uma vez por semana.',
    '## Relacionamento e satisfação', 'Pergunta curta.',
    '## Experimentos e decisão', 'Continuar ou parar.',
    '<!-- CORTAR-PUBLICO -->',
  ].join('\n');
}

describe('checagem dos documentos', () => {
  const c = createCase({ company: 'Casa', objective: 'Ver', decisionNeeded: 'Parar ou seguir' }, NOW, UUID);

  it('aponta cada regra da checagem', () => {
    expect(lintDocument('sem secoes', 'relatorio', c).some((item) => item.includes('Resumo executivo'))).toBe(true);
    expect(lintDocument(report().replace('<!-- CORTAR-PUBLICO -->', ''), 'relatorio', c)).toContain('Falta o marcador <!-- CORTAR-PUBLICO -->.');
    expect(lintDocument(report('Resultado garantido.'), 'relatorio', c).some((item) => item.includes('garantido'))).toBe(true);
    const withPriority = { ...c, priority: { stage: 'encontrar' as const, gapId: 'instagram-sem-destino', bottleneck: 'x', rationale: 'y', confidence: 'alta' as const, decidedAt: NOW } };
    expect(lintDocument(report().replace('Instagram sem destino', 'outro'), 'relatorio', withPriority).some((item) => item.includes('gap da prioridade'))).toBe(true);
    const withPlan = { ...c, debrief: { decision: 'proposta_emitida' as const, reason: 'cabe', plan30: 'Publicar o cardápio.' } };
    expect(lintDocument(plan('outro passo'), 'plano', withPlan).some((item) => item.includes('30 dias'))).toBe(true);
    const pilot = { ...withPlan, debrief: { ...withPlan.debrief, depth: 'piloto' as const } };
    expect(lintDocument(plan('Publicar o cardápio.'), 'plano', pilot).some((item) => item.includes('piloto'))).toBe(true);
    const loja = { ...c, physicalStore: true };
    expect(lintDocument(report(), 'relatorio', loja).some((item) => item.includes('Presença local no Google'))).toBe(true);
  });

  it('só aprova, entrega e encerra nessa ordem e com a checagem limpa', () => {
    let next = addEvidence(c, { stage: 'encontrar', source: 'Site', claim: 'Sem pedido.', classification: 'observado' }, NOW, 'ev-1');
    next = setPriority(next, { stage: 'encontrar', gapId: 'instagram-sem-destino', bottleneck: 'Sem destino', rationale: 'É o primeiro atrito', confidence: 'alta' }, NOW);
    next = setDebrief(next, { decision: 'proposta_emitida', reason: 'Cabe um passo.', offerId: 'crescimento', depth: 'guiado', plan30: 'Publicar o cardápio.' }, 'rascunho', NOW);
    const dirty = [{ kind: 'relatorio' as const, version: 1, md: 'documentos/v1/relatorio-raio-x.md', sha256: 'a', lint: ['Falta a seção.'], createdAt: NOW }, { kind: 'plano' as const, version: 1, md: 'documentos/v1/plano-crescimento.md', sha256: 'b', lint: [], createdAt: NOW }];
    expect(() => approveDocuments({ ...next, debrief: { ...next.debrief!, documents: dirty } }, ['a', 'b'], NOW)).toThrow('Corrija os problemas apontados na checagem antes de aprovar.');
    const clean = dirty.map((doc) => ({ ...doc, lint: [] }));
    next = approveDocuments({ ...next, debrief: { ...next.debrief!, documents: clean } }, ['a', 'b'], NOW);
    expect(() => closeCase(next, NOW)).toThrow('Registre a entrega antes de encerrar.');
    next = recordDelivery(next, { channel: 'manual', to: 'Carlos' }, NOW);
    next = closeCase(next, NOW);
    expect(next.status).toBe('fechado');
  });
});
