import { describe, expect, it } from 'vitest';
import {
  applyDeskCommand, colToStatus, DeskWorker, prioToApp, prioToDesk, resolveTask, statusToCol, toAppTask,
  type DeskRemote, type DeskStore, type DeskTask, type Outcome,
} from '../../src/main/officeCloud';

function kanban(inicial: DeskTask[] = []) {
  const tasks = inicial.map((t) => ({ ...t }));
  const ledger = new Map<string, Outcome>();
  let seq = Math.max(0, ...tasks.map((t) => t.seq));
  const store: DeskStore = {
    list: () => tasks.map((t) => ({ ...t })),
    create: (p: any) => {
      const t: DeskTask = { id: p.id, seq: ++seq, title: p.title, desc: p.desc, status: p.status, prio: p.prio, sector: p.sector, who: 'Paula PM' };
      tasks.push(t);
      return { ...t };
    },
    update: (id, patch: any) => {
      const t = tasks.find((x) => x.id === id)!;
      if (patch.title) t.title = patch.title;
      if (patch.desc !== undefined) t.desc = patch.desc;
      if (patch.status) t.status = patch.status;
      if (patch.prio) t.prio = patch.prio;
      if (patch.sector) t.sector = patch.sector;
    },
    remove: (id) => void tasks.splice(tasks.findIndex((x) => x.id === id), 1),
    ledgerGet: (id) => ledger.get(id) || null,
    ledgerPut: (id, _k, o) => void ledger.set(id, o),
  };
  return { store, tasks };
}

const UUID = '3f2b1c4d-1111-4222-8333-444455556666';

describe('conversões APK ↔ Escritório', () => {
  it('colunas, prioridade e id do app', () => {
    expect(['to_plan', 'planned', 'in_progress', 'done'].map(statusToCol)).toEqual(['todo', 'todo', 'doing', 'done']);
    expect(colToStatus('doing')).toBe('in_progress');
    expect(colToStatus('x')).toBeNull();
    expect(prioToDesk('Urgente')).toBe('Crítica');
    expect(prioToApp('Crítica')).toBe('Urgente');
    const t = toAppTask({ id: UUID, seq: 7, title: 'a', status: 'in_progress', prio: 'Alta', sector: 'Comercial', who: 'Paula PM' });
    expect(t).toMatchObject({ id: 'T-7', n: 7, col: 'doing', prio: 'Alta', client_ref: UUID });
    expect(toAppTask({ id: 't-123', seq: 1, title: 'a', status: 'to_plan' }).client_ref).toBeNull();
  });

  it('resolve por T-n, id do Escritório e uuid do pedido', () => {
    const tasks: DeskTask[] = [{ id: 't-1', seq: 4, title: 'a', status: 'to_plan' }, { id: UUID, seq: 5, title: 'b', status: 'to_plan' }];
    expect(resolveTask(tasks, 'T-4')?.id).toBe('t-1');
    expect(resolveTask(tasks, UUID)?.seq).toBe(5);
    expect(resolveTask(tasks, 'T-9')).toBeNull();
  });
});

describe('aplicar pedidos do APK no Kanban do Escritório', () => {
  it('cria com o uuid do pedido e não duplica ao repetir', () => {
    const { store, tasks } = kanban();
    const cmd = { id: UUID, kind: 'task.create', payload: { title: 'Previsão do tempo', prio: 'Urgente', sector: 'Operação' } };
    const a = applyDeskCommand(store, cmd);
    expect(a).toMatchObject({ status: 'applied', ref: 'T-1' });
    expect(tasks[0]).toMatchObject({ id: UUID, prio: 'Crítica', status: 'to_plan' });
    const b = applyDeskCommand(store, cmd);
    expect(b.cached).toBe(true);
    expect(tasks).toHaveLength(1);
  });

  it('move a tarefa criada no app pelo uuid, antes mesmo de saber o T-n', () => {
    const { store, tasks } = kanban();
    applyDeskCommand(store, { id: UUID, kind: 'task.create', payload: { title: 'x' } });
    const m = applyDeskCommand(store, { id: 'm1', kind: 'task.move', target_ref: UUID, payload: { col: 'doing' }, expect: { col: 'todo' } });
    expect(m.status).toBe('applied');
    expect(tasks[0].status).toBe('in_progress');
  });

  it('recusa quando o Kanban mudou desde o pedido, mas aceita se já está no destino', () => {
    const { store } = kanban([{ id: 't-1', seq: 1, title: 'a', status: 'done' }]);
    const r = applyDeskCommand(store, { id: 'm1', kind: 'task.move', target_ref: 'T-1', payload: { col: 'doing' }, expect: { col: 'todo' } });
    expect(r).toMatchObject({ status: 'rejected', code: 409 });
    const ok = applyDeskCommand(store, { id: 'm2', kind: 'task.move', target_ref: 'T-1', payload: { col: 'done' }, expect: { col: 'todo' } });
    expect(ok.status).toBe('applied');
  });

  it('edita, exclui e trata alvo inexistente', () => {
    const { store, tasks } = kanban([{ id: 't-1', seq: 1, title: 'a', status: 'to_plan', prio: 'Normal' }]);
    expect(applyDeskCommand(store, { id: 'u1', kind: 'task.update', target_ref: 'T-1', payload: { title: 'b', prio: 'Alta' } }).status).toBe('applied');
    expect(tasks[0]).toMatchObject({ title: 'b', prio: 'Alta' });
    expect(applyDeskCommand(store, { id: 'u2', kind: 'task.update', target_ref: 'T-1', payload: { title: '  ' } }).code).toBe(400);
    expect(applyDeskCommand(store, { id: 'u3', kind: 'task.update', target_ref: 'T-99', payload: { title: 'c' } }).code).toBe(404);
    expect(applyDeskCommand(store, { id: 'd1', kind: 'task.delete', target_ref: 'T-1' }).status).toBe('applied');
    expect(tasks).toHaveLength(0);
    expect(applyDeskCommand(store, { id: 'd2', kind: 'task.delete', target_ref: 'T-1' }).status).toBe('applied');
  });
});

describe('DeskWorker', () => {
  function nuvem(cmds: any[]) {
    const calls: Array<[string, any]> = [];
    const tabelas: Record<string, Map<string, any>> = { office_tasks: new Map([['T-900', { id: 'T-900' }]]) };
    let falharComplete = 0;
    const remote: DeskRemote = {
      rpc: async (fn, args) => {
        calls.push([fn, args]);
        if (fn === 'claim_office_commands') return cmds.splice(0);
        if (fn === 'complete_office_command' && falharComplete-- > 0) throw new Error('rede');
        return null;
      },
      upsert: async (t, rows) => { for (const r of rows) (tabelas[t] ||= new Map()).set(String(r.id), r); },
      markDeleted: async (t, _k, keys, when) => { for (const k of keys) tabelas[t].get(k).deleted_at = when; },
      select: async (t) => [...(tabelas[t]?.values() || [])].filter((r) => !r.deleted_at),
    };
    return { remote, calls, tabelas, falhar: (n: number) => (falharComplete = n) };
  }

  it('pega só task.*, aplica, publica antes de confirmar e apaga da nuvem o que não é do Kanban', async () => {
    const { store } = kanban();
    const n = nuvem([{ id: UUID, kind: 'task.create', payload: { title: 'Do APK' } }]);
    let avisos = 0;
    const w = new DeskWorker(store, n.remote, 'desk-test', () => {}, () => avisos++);
    const r = await w.drain();
    expect(r).toEqual({ claimed: 1, applied: 1, rejected: 0 });
    expect(n.calls[0][1].p_kinds).toEqual(['task.create', 'task.update', 'task.move', 'task.delete', 'task.run', 'task.plan', 'task.approve', 'task.revise', 'task.stop']);
    const ordem = n.calls.map((c) => c[0]);
    expect(ordem).toEqual(['claim_office_commands', 'complete_office_command']);
    expect(n.tabelas.office_tasks.get('T-1')).toMatchObject({ title: 'Do APK', col: 'todo', client_ref: UUID });
    expect(n.tabelas.office_tasks.get('T-900').deleted_at).toBeTruthy();
    expect(avisos).toBe(1);
    expect(await w.pushMirror()).toEqual({ upserts: 0, deleted: 0 });
  });

  it('queda no confirmar: na volta não cria de novo', async () => {
    const { store, tasks } = kanban();
    const cmd = { id: UUID, kind: 'task.create', payload: { title: 'x' } };
    const n = nuvem([cmd]);
    n.falhar(1);
    const w = new DeskWorker(store, n.remote, 'desk-test', () => {});
    await expect(w.drain()).rejects.toThrow('rede');
    n.remote.rpc = ((orig) => async (fn: string, args: any) => (fn === 'claim_office_commands' ? [cmd] : orig(fn, args)))(n.remote.rpc);
    await w.drain();
    expect(tasks).toHaveLength(1);
  });

  it('batimento como status 2', async () => {
    const { store } = kanban([{ id: 't-1', seq: 1, title: 'a', status: 'to_plan' }]);
    const n = nuvem([]);
    await new DeskWorker(store, n.remote, 'desk-test', () => {}).heartbeat();
    expect(n.tabelas.office_status.get('2')).toMatchObject({ worker_id: 'desk-test', stats: { tasksOpen: 1 } });
  });
});
