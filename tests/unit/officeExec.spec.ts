import { describe, expect, it } from 'vitest';
import { buildPrompt, ExecQueue, taskRunViews, type ExecStore, type ExecTask, type Runner, type RunnerResult, type TaskRunRow } from '../../src/main/officeExec';
import { applyDeskCommand, type DeskStore, type DeskTask, type Outcome } from '../../src/main/officeCloud';

function montar(tasks: ExecTask[], respostas: Array<RunnerResult | 'travar'> = []) {
  const rows: TaskRunRow[] = [];
  let t = 0;
  const now = () => new Date(Date.UTC(2026, 10, 15, 12, 0, t++)).toISOString();
  const store: ExecStore = {
    all: () => rows.map((r) => ({ ...r })),
    insert: (r) => void rows.push({ ...r }),
    update: (id, patch) => Object.assign(rows.find((r) => r.id === id)!, patch),
  };
  const lista = tasks.map((x) => ({ ...x }));
  const prompts: string[] = [];
  let soltar: ((r: RunnerResult) => void) | null = null;
  let matar = 0;
  const runner: Runner = async (job, registerKill) => {
    prompts.push(job.prompt);
    const r = respostas.shift() || { ok: true, reply: 'feito', runId: 'run-' + prompts.length };
    if (r === 'travar') {
      registerKill(() => { matar++; soltar?.({ ok: false, reply: '', stopped: true }); });
      return new Promise((res) => (soltar = res));
    }
    return r;
  };
  const q = new ExecQueue(
    store,
    { get: (id) => lista.find((x) => x.id === id) || null, setStatus: (id, s) => void (lista.find((x) => x.id === id)!.status = s) },
    runner,
    () => {},
    (task) => 'C:/tarefas/T-' + task.seq,
    now,
  );
  return { q, rows, tasks: lista, prompts, kills: () => matar };
}

const T1: ExecTask = { id: 't1', seq: 1, title: 'Previsão do tempo', desc: 'Para sábado', status: 'to_plan' };
const T2: ExecTask = { id: 't2', seq: 2, title: 'Orçamento', status: 'to_plan' };

describe('fila de execução das tarefas', () => {
  it('Executar com o Agente geral: entra na fila, roda e fica aguardando você', async () => {
    const { q, tasks, prompts } = montar([T1]);
    const r = q.enqueue('t1', 'exec', 'geral');
    expect(r.ok).toBe(true);
    expect(tasks[0].status).toBe('in_progress');
    expect(q.views().t1).toMatchObject({ status: 'queued', queuePos: 1, attempt: 1, agent: 'geral' });
    await q.tick();
    expect(prompts[0]).toContain('Agente geral');
    expect(prompts[0]).toContain('Previsão do tempo');
    expect(q.views().t1).toMatchObject({ status: 'review', summary: 'feito', runId: 'run-1' });
    expect(tasks[0].status).toBe('in_progress');
  });

  it('não entra duas vezes na fila e roda uma por vez, em ordem', async () => {
    const { q, prompts } = montar([T1, T2]);
    q.enqueue('t1', 'exec', 'geral');
    expect(q.enqueue('t1', 'exec', 'geral')).toMatchObject({ ok: false, code: 409 });
    q.enqueue('t2', 'exec', 'geral');
    expect(q.views().t2.queuePos).toBe(2);
    await q.tick();
    expect(prompts).toHaveLength(1);
    expect(q.views().t2.queuePos).toBe(1);
    await q.tick();
    expect(prompts[1]).toContain('Orçamento');
  });

  it('Paula planeja sem executar; depois Executar segue o plano', async () => {
    const { q, tasks, prompts } = montar([T1], [{ ok: true, reply: '1. Objetivo: ver o tempo' }]);
    expect(q.enqueue('t1', 'exec', 'plano')).toMatchObject({ ok: false, code: 400 });
    q.enqueue('t1', 'plan', 'paula');
    await q.tick();
    expect(prompts[0]).toContain('NÃO execute');
    expect(tasks[0].status).toBe('planned');
    expect(q.views().t1).toMatchObject({ status: 'done', mode: 'plan', plan: '1. Objetivo: ver o tempo' });
    q.enqueue('t1', 'exec', 'plano');
    await q.tick();
    expect(prompts[1]).toContain('Plano aprovado pela Paula');
    expect(prompts[1]).toContain('Agente do plano');
  });

  it('aprovar fecha a tarefa; pedir ajuste vira tentativa 2 com a nota e o resultado anterior', async () => {
    const { q, tasks, prompts } = montar([T1, T2], [{ ok: true, reply: 'primeira versão' }]);
    q.enqueue('t1', 'exec', 'geral');
    await q.tick();
    expect(q.revise('t1', '  ')).toMatchObject({ ok: false, code: 400 });
    const r = q.revise('t1', 'faltou o domingo');
    expect(r.ok).toBe(true);
    expect(q.views().t1).toMatchObject({ status: 'queued', attempt: 2 });
    await q.tick();
    expect(prompts[1]).toContain('faltou o domingo');
    expect(prompts[1]).toContain('primeira versão');
    expect(q.approve('t2')).toMatchObject({ ok: false, code: 409 });
    expect(q.approve('t1').ok).toBe(true);
    expect(tasks[0].status).toBe('done');
    expect(q.enqueue('t1', 'exec', 'geral')).toMatchObject({ ok: false, code: 409 });
  });

  it('parar tira da fila ou mata o processo; o motor nunca fecha a tarefa sozinho', async () => {
    const { q, tasks, kills } = montar([T1, T2], ['travar']);
    q.enqueue('t1', 'exec', 'geral');
    q.enqueue('t2', 'exec', 'geral');
    expect(q.stop('t2').ok).toBe(true);
    expect(q.views().t2.status).toBe('canceled');
    const rodando = q.tick();
    await Promise.resolve();
    expect(q.views().t1.status).toBe('running');
    expect(q.stop('t1').ok).toBe(true);
    await rodando;
    expect(kills()).toBe(1);
    expect(q.views().t1.status).toBe('canceled');
    expect(tasks[0].status).toBe('in_progress');
  });

  it('falha guarda o motivo e o app que fechou no meio vira falha na volta', async () => {
    const { q, rows } = montar([T1], [{ ok: false, reply: '', error: 'Motor sem login' }]);
    q.enqueue('t1', 'exec', 'geral');
    await q.tick();
    expect(q.views().t1).toMatchObject({ status: 'failed', error: 'Motor sem login' });
    rows[0].status = 'running';
    expect(q.recover()).toBe(1);
    expect(q.views().t1.error).toContain('fechou');
  });

  it('tarefa excluída antes de rodar não chama o motor', async () => {
    const { q, tasks, prompts } = montar([T1]);
    q.enqueue('t1', 'exec', 'geral');
    tasks.splice(0, 1);
    await q.tick();
    expect(prompts).toHaveLength(0);
    expect(taskRunViews([])).toEqual({});
  });

  it('prompt do agente proíbe publicar e pede resumo no fim', () => {
    const p = buildPrompt({ mode: 'exec', agent: 'geral', task: T1, plan: '', note: '', previous: '', workspace: 'C:/x' });
    expect(p).toContain('Não publique');
    expect(p).toContain('resumo curto');
    expect(p).toContain('C:/x');
  });
});

describe('pedidos de execução vindos do APK', () => {
  function kanban(respostas: RunnerResult[] = []) {
    const { q, tasks } = montar([{ ...T1 }], respostas);
    const ledger = new Map<string, Outcome>();
    const store: DeskStore = {
      list: () => tasks as DeskTask[],
      create: () => { throw new Error('não usado'); },
      update: () => {},
      remove: () => {},
      ledgerGet: (id) => ledger.get(id) || null,
      ledgerPut: (id, _k, o) => void ledger.set(id, o),
      exec: {
        enqueue: (id, mode, agent, opts) => q.enqueue(id, mode, agent, opts),
        approve: (id) => q.approve(id),
        revise: (id, note, origin, cid) => q.revise(id, note, origin, cid),
        stop: (id) => q.stop(id),
        views: () => q.views() as any,
      },
    };
    return { store, q };
  }

  it('task.run entra na fila e o espelho leva o estado; repetir o pedido não duplica', async () => {
    const { store, q } = kanban();
    const cmd = { id: 'c1', kind: 'task.run', target_ref: 'T-1', payload: { agent: 'geral' } };
    const a = applyDeskCommand(store, cmd);
    expect(a.status).toBe('applied');
    expect((a.body as any).run).toMatchObject({ status: 'queued', queuePos: 1 });
    expect(applyDeskCommand(store, cmd).cached).toBe(true);
    expect(applyDeskCommand(store, { ...cmd, id: 'c2' })).toMatchObject({ status: 'rejected', code: 409 });
    await q.tick();
    expect(applyDeskCommand(store, { id: 'c3', kind: 'task.approve', target_ref: 'T-1' }).status).toBe('applied');
  });

  it('task.plan, task.revise e task.stop', async () => {
    const { store, q } = kanban();
    expect(applyDeskCommand(store, { id: 'p1', kind: 'task.plan', target_ref: 'T-1' }).status).toBe('applied');
    expect(applyDeskCommand(store, { id: 's1', kind: 'task.stop', target_ref: 'T-1' }).status).toBe('applied');
    expect(applyDeskCommand(store, { id: 'r1', kind: 'task.revise', target_ref: 'T-1', payload: { note: 'x' } }).code).toBe(409);
    applyDeskCommand(store, { id: 'e1', kind: 'task.run', target_ref: 'T-1', payload: {} });
    await q.tick();
    expect(applyDeskCommand(store, { id: 'r2', kind: 'task.revise', target_ref: 'T-1', payload: { note: 'mais curto' } }).status).toBe('applied');
    expect(q.views().t1.attempt).toBe(2);
  });

  it('sem fila ligada, recusa com motivo', () => {
    const { store } = kanban();
    delete store.exec;
    expect(applyDeskCommand(store, { id: 'x', kind: 'task.run', target_ref: 'T-1' })).toMatchObject({ status: 'rejected', code: 503 });
  });
});

describe('livro das tarefas', () => {
  it('execução de tarefa aparece no livro (id com o tipo tarefa)', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { listRuns, readRun } = await import('../../src/main/runLedger');
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'tarefa-'));
    const id = '20261116-014051-tarefa-819240';
    fs.mkdirSync(path.join(ws, '.tavir', 'runs', id), { recursive: true });
    fs.writeFileSync(path.join(ws, '.tavir', 'runs', id, 'meta.json'), JSON.stringify({ id, kind: 'tarefa', label: 'Teste', stage: 'Execução', owner: 'Agente geral', status: 'ok', startedAt: '2026-11-16T01:40:51Z', workspace: ws }));
    expect(listRuns(ws).map((r) => r.id)).toEqual([id]);
    expect(readRun(ws, id).ok).toBe(true);
  });
});
