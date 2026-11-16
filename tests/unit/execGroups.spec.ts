import { describe, expect, it } from 'vitest';
import {
  applyLiveEvent,
  attemptFromRun,
  buildGroups,
  filterCounts,
  focusOf,
  liveAttempt,
  matchesFilter,
  mergeAttempts,
  pickSelection,
  pruneOverrides,
  timeText,
  type ExecRunLike,
} from '../../src/shared/execGroups';

const WS = 'C:\\proj\\loja';
const T0 = Date.parse('2026-11-15T10:00:00.000Z');
const iso = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

function run(over: Partial<ExecRunLike> & { id: string }): ExecRunLike {
  return {
    kind: 'trilho',
    label: 'Ajustar checkout',
    module: 'Fábrica',
    place: 'Loja',
    workspace: WS,
    status: 'ok',
    startedAt: iso(0),
    durationMs: 60_000,
    ...over,
  };
}

describe('agrupamento por item', () => {
  it('junta tentativas do mesmo item e numera da mais antiga para a mais nova', () => {
    const attempts = [
      attemptFromRun(run({ id: 'a', status: 'paused', error: 'Pausado por Carlos. A retomada continua deste ponto.', durationMs: 120_000 })),
      attemptFromRun(run({ id: 'b', startedAt: iso(300_000), status: 'running', durationMs: undefined })),
      attemptFromRun(run({ id: 'c', label: 'Outro item', startedAt: iso(10_000) })),
    ];
    const groups = buildGroups(attempts, T0 + 360_000);
    expect(groups).toHaveLength(2);
    const g = groups[0];
    expect(g.title).toBe('Ajustar checkout');
    expect(g.count).toBe(2);
    expect(g.attempts.map((a) => [a.id, a.n])).toEqual([['b', 2], ['a', 1]]);
    expect(g.status).toBe('running');
    // 2 min da pausada + 1 min rodando agora
    expect(g.totalMs).toBe(180_000);
    expect(g.attempts[1].status).toBe('paused');
    expect(g.stop).toBe('trilho');
  });

  it('"Continuidade · X" é tentativa de X', () => {
    expect(focusOf('Continuidade · Continuidade · Studio · roteiro')).toBe('Studio · roteiro');
    const groups = buildGroups([
      attemptFromRun(run({ id: 'a', module: 'Studio', kind: 'chat', label: 'Studio · roteiro' })),
      attemptFromRun(run({ id: 'b', module: 'Studio', kind: 'chat', label: 'Continuidade · Studio · roteiro', startedAt: iso(5000) })),
    ], T0);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].stop).toBe('');
  });

  it('Raio-X agrupa pelo caso, mesmo com etapas diferentes', () => {
    const groups = buildGroups([
      attemptFromRun(run({ id: 'a', module: 'Raio-X', kind: 'raiox', label: 'Raio-X · análise', stage: 'coleta', workspace: 'D:/raiox/caso-1' })),
      attemptFromRun(run({ id: 'b', module: 'Raio-X', kind: 'raiox', label: 'Raio-X · análise', stage: 'diagnostico', workspace: 'd:\\raiox\\caso-1\\', startedAt: iso(1000) })),
    ], T0);
    expect(groups).toHaveLength(1);
    expect(groups[0].stepText).toBe('diagnostico');
  });

  it('indicador de etapa do trilho vem da posição real do item', () => {
    const [g] = buildGroups([attemptFromRun(run({ id: 'a', trackPos: { index: 2, total: 7 } }))], T0);
    expect(g.stepText).toBe('Item 3 de 7');
  });
});

describe('estado e tempo', () => {
  it('textos sem percentual', () => {
    expect(timeText('running', 125_000)).toBe('Rodando há 2 min');
    expect(timeText('completed', 45_000)).toBe('Concluído em 45 s');
    expect(timeText('failed', 3_900_000)).toBe('Falhou em 1 h 05 min');
    expect(timeText('running', 0)).toBe('Iniciando');
  });

  it('"rodando" órfão (mais velho que qualquer motor) vira interrompida', () => {
    const r = run({ id: 'a', status: 'running', durationMs: undefined });
    expect(attemptFromRun(r, T0 + 60_000).status).toBe('running');
    const old = attemptFromRun(r, T0 + 7 * 3600_000);
    expect(old.status).toBe('failed');
    expect(old.durationMs).toBe(0);
    expect(old.error).toMatch(/Interrompida/);
  });

  it('cancelado vem do marcador e pausa vem do texto do livro', () => {
    expect(attemptFromRun(run({ id: 'a', status: 'paused', cancelled: true })).status).toBe('cancelled');
    expect(attemptFromRun(run({ id: 'a', status: 'failed', error: 'Pausado por Carlos.' })).status).toBe('paused');
    expect(attemptFromRun(run({ id: 'a', status: 'ok', error: 'Pausado por Carlos.' })).status).toBe('completed');
  });
});

describe('continuar do checkpoint', () => {
  const cp = { checkpointAt: '2026-11-15 10:05:00', checkpointHint: 'Pausado por Carlos.' };

  it('só a linha do item dono do checkpoint pode continuar', () => {
    const groups = buildGroups([
      attemptFromRun(run({ id: 'a', status: 'paused', error: 'Pausado por Carlos.', ...cp, checkpointLabel: 'Ajustar checkout' })),
      attemptFromRun(run({ id: 'b', label: 'Outro item', status: 'failed', ...cp, checkpointLabel: 'Ajustar checkout' })),
    ], T0);
    const own = groups.find((g) => g.title === 'Ajustar checkout')!;
    const other = groups.find((g) => g.title === 'Outro item')!;
    expect(own.canFollow).toBe(true);
    expect(own.checkpointAt).toBe(cp.checkpointAt);
    expect(other.canFollow).toBe(false);
    expect(other.checkpointAt).toBe('');
  });

  it('última tentativa concluída ou rodando não continua', () => {
    const done = buildGroups([attemptFromRun(run({ id: 'a', ...cp, checkpointLabel: 'Ajustar checkout' }))], T0)[0];
    expect(done.canFollow).toBe(false);
    const running = buildGroups([attemptFromRun(run({ id: 'a', status: 'running', ...cp, checkpointLabel: 'Ajustar checkout' }))], T0)[0];
    expect(running.canFollow).toBe(false);
  });
});

describe('merge a cada leitura do livro', () => {
  it('mantém a tentativa antiga intacta quando a nova chega e a ordem é estável', () => {
    const first = [attemptFromRun(run({ id: 'a', status: 'paused', error: 'Pausado por Carlos.', durationMs: 90_000 }))];
    const second = [
      attemptFromRun(run({ id: 'b', status: 'running', startedAt: iso(200_000), durationMs: undefined })),
      attemptFromRun(run({ id: 'a', status: 'paused', error: 'Pausado por Carlos.', durationMs: 90_000 })),
    ];
    const m1 = mergeAttempts([], first).attempts;
    const m2 = mergeAttempts(m1, second).attempts;
    expect(m2.map((a) => a.id)).toEqual(['b', 'a']);
    const old = m2.find((a) => a.id === 'a')!;
    expect(old.status).toBe('paused');
    expect(old.durationMs).toBe(90_000);
    // Leitura repetida não muda nada.
    expect(mergeAttempts(m2, second).attempts).toEqual(m2);
  });

  it('não perde custo e tokens já vistos', () => {
    const withCost = mergeAttempts([], [attemptFromRun(run({ id: 'a', usage: { costUsd: 0.4, inputTokens: 10, outputTokens: 5 } }))]).attempts;
    const again = mergeAttempts(withCost, [attemptFromRun(run({ id: 'a' }))]).attempts;
    expect(again[0].costUsd).toBe(0.4);
    expect(again[0].tokens).toBe(15);
  });

  it('casa a linha do evento ao vivo com o run do livro, sem duplicar', () => {
    const live = liveAttempt({ id: 'trilho-xyz', workspace: 'c:/proj/loja/', focus: 'Ajustar checkout', place: 'Loja', startedAt: iso(1000) });
    const fresh = [
      attemptFromRun(run({ id: '20261115-100002-trilho-abc123', status: 'running', startedAt: iso(2000), durationMs: undefined })),
      attemptFromRun(run({ id: 'velho', startedAt: iso(-3_600_000) })),
    ];
    const { attempts, aliases } = mergeAttempts([live], fresh);
    expect(aliases).toEqual({ 'trilho-xyz': '20261115-100002-trilho-abc123' });
    expect(attempts.map((a) => a.id)).toEqual(['20261115-100002-trilho-abc123', 'velho']);
    expect(buildGroups(attempts, T0 + 5000)[0].count).toBe(2);
  });

  it('linha ao vivo sem run parecido no livro continua na tela', () => {
    const live = liveAttempt({ id: 'trilho-xyz', workspace: WS, focus: 'Item novo', startedAt: iso(0) });
    const { attempts, aliases } = mergeAttempts([live], [attemptFromRun(run({ id: 'a', startedAt: iso(1000) }))]);
    expect(aliases).toEqual({});
    expect(attempts.map((a) => a.id).sort()).toEqual(['a', 'trilho-xyz']);
  });

  it('cancelar vale na tela até o livro confirmar', () => {
    const fresh = [attemptFromRun(run({ id: 'a', status: 'running', durationMs: undefined }))];
    const overrides = { a: 'cancelled' as const };
    expect(mergeAttempts([], fresh, overrides).attempts[0].status).toBe('cancelled');
    expect(pruneOverrides(overrides, fresh)).toEqual(overrides);
    const confirmed = [attemptFromRun(run({ id: 'a', status: 'paused', cancelled: true }))];
    expect(pruneOverrides(overrides, confirmed)).toEqual({});
    // pausa some assim que o livro sai de "rodando"
    expect(pruneOverrides({ a: 'paused' }, [attemptFromRun(run({ id: 'a', status: 'failed' }))])).toEqual({});
  });
});

describe('evento ao vivo', () => {
  const evt = (over: Record<string, unknown> = {}) => ({
    runId: 'trilho-1',
    type: 'thought',
    timestamp: iso(0),
    content: 'Iniciando',
    meta: { track: true, workspace: WS, focus: 'Ajustar checkout', projectName: 'Loja', startedAt: iso(0), ...over },
  });

  it('cria a linha provisória e fecha com o estado do fim', () => {
    const r1 = applyLiveEvent([], evt(), {}, T0);
    expect(r1.attempts).toHaveLength(1);
    expect(r1.attempts[0]).toMatchObject({ id: 'trilho-1', status: 'running', live: true, module: 'Fábrica' });
    const r2 = applyLiveEvent(r1.attempts, { ...evt({ ended: true, status: 'failed' }), type: 'error', content: 'quebrou' }, {}, T0 + 30_000);
    expect(r2.ended).toBe(true);
    expect(r2.attempts[0]).toMatchObject({ status: 'failed', error: 'quebrou', durationMs: 30_000 });
  });

  it('depois de casado, o evento vai para o id do livro e não mexe no estado dele', () => {
    const ledger = mergeAttempts([], [attemptFromRun(run({ id: 'L1', status: 'running', durationMs: undefined }))]).attempts;
    const r = applyLiveEvent(ledger, evt({ ended: true, status: 'completed' }), { 'trilho-1': 'L1' }, T0);
    expect(r.id).toBe('L1');
    expect(r.attempts).toBe(ledger);
  });

  it('evento sem pasta não cria linha fantasma', () => {
    const r = applyLiveEvent([], { runId: 'trilho-2', meta: { track: true, title: 'Trilho' } }, {}, T0);
    expect(r.attempts).toEqual([]);
  });
});

describe('filtros e seleção', () => {
  const groups = buildGroups([
    attemptFromRun(run({ id: 'r', label: 'A', status: 'running', durationMs: undefined, startedAt: iso(4000) })),
    attemptFromRun(run({ id: 'p', label: 'B', status: 'paused', startedAt: iso(3000) })),
    attemptFromRun(run({ id: 'f', label: 'C', status: 'failed', module: 'Studio', kind: 'chat', startedAt: iso(2000) })),
    attemptFromRun(run({ id: 'c', label: 'D', startedAt: iso(1000), module: 'Raio-X', kind: 'raiox', workspace: 'D:/caso' })),
  ], T0 + 10_000);

  it('conta por estado e por módulo', () => {
    expect(filterCounts(groups)).toMatchObject({ all: 4, running: 1, stopped: 2, completed: 1, 'Fábrica': 2, 'Raio-X': 1, Studio: 1, Flow: 0, 'Edição': 0 });
    expect(groups.filter((g) => matchesFilter(g, 'stopped')).map((g) => g.title)).toEqual(['B', 'C']);
  });

  it('tentativa explícita ganha; sem ela fica a última da linha', () => {
    expect(pickSelection(groups, { attemptId: 'p' })!.group.title).toBe('B');
    expect(pickSelection(groups, { groupKey: groups[2].key })!.attempt.id).toBe('f');
    expect(pickSelection(groups, { attemptId: 'sumiu' }, groups.slice(1))!.group.title).toBe('B');
    // linha escolhida fora do filtro: o detalhe vai para a primeira visível
    expect(pickSelection(groups, { groupKey: groups[0].key }, groups.slice(2))!.group.title).toBe('C');
    expect(pickSelection(groups, { attemptId: 'r' }, groups.slice(2))!.group.title).toBe('C');
    expect(pickSelection([], {})).toBeNull();
  });
});
