import { describe, expect, it } from 'vitest';
import { ExecQueue, parseRaioxTarget, type ExecStore, type ExecTask, type Runner, type RunnerResult, type TaskRunRow } from '../../src/main/officeExec';
import { applyDeskCommand, DeskWorker, jobMirror, jobTask, type DeskRemote, type DeskStore, type DeskTask, type Outcome } from '../../src/main/officeCloud';

import { publishedAgents } from '../../src/shared/officeAgents';

const UUID1 ='11111111-2222-4333-8444-555555555555';
const UUID2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';

/** Kanban + fila em memória, como o Escritório real (tarefa criada pelo pedido do APK). */
function escritorio(respostas: Array<RunnerResult> = []) {
  const rows: TaskRunRow[] = [];
  const tasks: ExecTask[] = [];
  let t = 0;
  const now = () => new Date(Date.UTC(2026, 10, 15, 12, 0, t++)).toISOString();
  const store: ExecStore = {
    all: () => rows.map((r) => ({ ...r })),
    insert: (r) => void rows.push({ ...r }),
    update: (id, patch) => Object.assign(rows.find((r) => r.id === id)!, patch),
  };
  const prompts: string[] = [];
  const agents: string[] = [];
  const runner: Runner = async (job, _kill, say) => {
    prompts.push(job.prompt);
    agents.push(job.row.agent);
    say?.('Lendo o perfil');
    return respostas.shift() || { ok: true, reply: '## Relatório\n- ponto 1' };
  };
  const q = new ExecQueue(
    store,
    { get: (id) => tasks.find((x) => x.id === id) || null, setStatus: (id, s) => void (tasks.find((x) => x.id === id)!.status = s) },
    runner,
    () => {},
    (task) => 'C:/tarefas/T-' + task.seq,
    now,
  );
  const ledger = new Map<string, Outcome>();
  const desk: DeskStore = {
    list: () => tasks as DeskTask[],
    create: (p) => {
      const task: ExecTask = { id: String(p.id), seq: tasks.length + 1, title: String(p.title), desc: String(p.desc || ''), status: String(p.status), sector: String(p.sector), who: String(p.who) };
      tasks.push(task);
      return task as DeskTask;
    },
    update: () => {},
    remove: () => {},
    ledgerGet: (id) => ledger.get(id) || null,
    ledgerPut: (id, _k, o) => void ledger.set(id, o),
    exec: {
      enqueue: (id, mode, agent, opts) => q.enqueue(id, mode, agent, opts),
      approve: (id) => q.approve(id),
      revise: (id, note, origin, cid) => q.revise(id, note, origin, cid),
      stop: (id, why) => q.stop(id, why),
      views: () => q.views() as any,
      rows: () => q.rows(),
      liveLog: (id) => q.liveLog(id),
      model: () => 'claude · sonnet',
    },
  };
  return { q, desk, tasks, rows, prompts, agents };
}

describe('jobs do APK viram execuções reais', () => {
  it('Instagram: vira tarefa + fila com o agente Social; o job publicado é o de verdade', async () => {
    const { q, desk, tasks, prompts, agents } = escritorio();
    const out = applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'instagram', fields: { perfil: '@padariasol', escopo: 'Últimos 30 dias' } } });
    expect(out).toMatchObject({ status: 'applied', code: 201, ref: 'T-1' });
    expect(out.body).toMatchObject({ id: 'T-1', status: 'queue', agent: 'Social', kind: 'instagram', pct: 0 });
    expect(tasks[0]).toMatchObject({ title: 'Análise Instagram · @padariasol · Últimos 30 dias', status: 'in_progress', sector: 'Marketing' });
    // repetir o pedido não cria outro
    expect(applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'instagram', fields: { perfil: 'x' } } }).cached).toBe(true);
    await q.tick();
    expect(agents[0]).toBe('social');
    expect(prompts[0]).toContain('instagram.com/padariasol');
    expect(prompts[0]).toContain('Últimos 30 dias');
    const { jobs, deliveries } = jobMirror(desk.list(), q.rows(), (id) => q.liveLog(id), 'claude · sonnet');
    expect(jobs[0]).toMatchObject({ id: 'T-1', status: 'done', pct: 100, client_ref: UUID1, model: 'claude · sonnet' });
    expect((jobs[0].log as any[]).map((l) => l.m)).toEqual([
      'Na fila do Escritório',
      'Começou · Social',
      'Lendo o perfil',
      'Terminou · aguarda sua aprovação em Pendências',
    ]);
    expect(deliveries[0]).toMatchObject({ slug: 'entrega-T-1', job_id: 'T-1', url: '/reports/entrega-T-1', kind: 'instagram', body: '## Relatório\n- ponto 1' });
    expect(q.views()[UUID1].status).toBe('review');
  });

  it('Editorial e Chamar agente usam o papel certo; campo vazio é recusado', async () => {
    const { q, desk, prompts, agents } = escritorio();
    applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'editorial', fields: { tema: 'Pão de fermentação natural', formato: 'Post' } } });
    applyDeskCommand(desk, { id: UUID2, kind: 'job.create', payload: { kind: 'agent', fields: { agente: 'Revisor', instrucao: 'Revise o contrato da pasta' } } });
    await q.tick();
    await q.tick();
    expect(agents).toEqual(['redator', 'agente:Revisor']);
    expect(prompts[0]).toContain('Post sobre: Pão de fermentação natural');
    expect(prompts[1]).toContain('Você é Revisor');
    expect(prompts[1]).toContain('Revise o contrato da pasta');
    expect(applyDeskCommand(desk, { id: 'v1', kind: 'job.create', payload: { kind: 'agent', fields: { instrucao: '' } } })).toMatchObject({ status: 'rejected', code: 400 });
    expect(applyDeskCommand(desk, { id: 'v2', kind: 'job.create', payload: { kind: 'xpto', fields: {} } })).toMatchObject({ status: 'rejected', code: 400 });
  });

  it('Raio X precisa do site ou @ e vai para o agente raiox', () => {
    expect(jobTask('raiox', { empresa: 'Padaria Sol', profundidade: 'Rápido' })).toHaveProperty('error');
    expect(jobTask('raiox', { empresa: 'Padaria Sol · padariasol.com.br', profundidade: 'Completo' })).toMatchObject({ agent: 'raiox', title: 'Raio X completo · Padaria Sol · padariasol.com.br' });
    expect(parseRaioxTarget('Padaria Sol · padariasol.com.br')).toEqual({ company: 'Padaria Sol', link: 'https://padariasol.com.br' });
    expect(parseRaioxTarget('Padaria Sol @padariasol')).toEqual({ company: 'Padaria Sol', link: 'https://www.instagram.com/padariasol/' });
    expect(parseRaioxTarget('https://www.loja.com.br/')).toEqual({ company: 'loja.com.br', link: 'https://www.loja.com.br/' });
  });

  it('Instagram com vídeo por link vai para a extração pela API; link ruim é recusado', async () => {
    const { q, desk, prompts, agents, rows } = escritorio();
    const link = 'https://www.instagram.com/reel/DAbc123xyz/';
    expect(jobTask('instagram', { escopo: 'Vídeo por link', link: 'https://exemplo.com/video' })).toHaveProperty('error');
    expect(jobTask('instagram', { escopo: 'Vídeo por link' })).toHaveProperty('error');
    expect(jobTask('instagram', { perfil: '@padaria', escopo: 'Stories' })).toMatchObject({ agent: 'social' });
    const out = applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'instagram', fields: { escopo: 'Vídeo por link', link } } });
    expect(out).toMatchObject({ status: 'applied', code: 201 });
    expect((out.body as any).title).toBe('Análise de vídeo · DAbc123xyz');
    expect((out.body as any).kind).toBe('instagram');
    await q.tick();
    expect(agents).toEqual(['video']);
    expect(JSON.parse(rows[0].fields!)).toMatchObject({ link, kind: 'instagram' });
    expect(prompts[0]).toContain('Íris Instagram');
    expect(prompts[0]).toContain('video.json');
    expect(prompts[0]).toContain('## Interessa ao escritório?');
    expect(prompts[0]).toContain('não use navegador');
  });

  it('Chamar agente aceita os agentes do catálogo, a opção pronta e a triagem', async () => {
    const { q, desk, prompts, agents } = escritorio();
    applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'agent', fields: { agent: 'Maicon', action: 'ferramenta', instrucao: 'https://github.com/x/y' } } });
    applyDeskCommand(desk, { id: UUID2, kind: 'job.create', payload: { kind: 'agent', fields: { agent: 'triagem', instrucao: 'Quero melhorar o site da padaria' } } });
    await q.tick();
    await q.tick();
    expect(agents).toEqual(['agente:Maicon', 'triagem']);
    expect(prompts[0]).toContain('Você é Maicon');
    expect(prompts[0]).toContain('Opção escolhida no app: Avaliar ferramenta');
    expect(prompts[1]).toContain('Agente escolhido:');
    expect(prompts[1]).toContain('- Atlas Web:');
    expect(jobTask('agent', { agent: 'Íris Instagram', action: 'video', instrucao: 'veja https://www.instagram.com/p/Cxyz12345/ por favor' })).toMatchObject({ agent: 'video', fields: { link: 'https://www.instagram.com/p/Cxyz12345/' } });
    expect(jobTask('agent', { agent: 'Íris Instagram', action: 'video', instrucao: 'sem link' })).toHaveProperty('error');
    expect(jobTask('agent', { agente: 'Desconhecido', instrucao: 'faça algo' })).toMatchObject({ agent: 'agente:Analista' });
  });

  it('o catálogo publicado traz papel e opções de cada agente, sem repetir nome', () => {
    const list = publishedAgents('claude · sonnet');
    expect(new Set(list.map((a) => a.name)).size).toBe(list.length);
    expect(list.map((a) => a.name)).toEqual(expect.arrayContaining(['Íris Instagram', 'Maicon', 'Yuri UX', 'Paula PM', 'Revisor']));
    for (const a of list) {
      expect(a.role.length).toBeGreaterThan(5);
      expect(a.actions.length).toBeGreaterThan(0);
      expect(a.model).toBe('claude · sonnet');
    }
    expect(list[0].name).not.toBe('Paula PM');
  });

  it('pausar, retomar e cancelar pelo APK', async () => {
    const { q, desk } = escritorio();
    applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'editorial', fields: { tema: 'Natal' } } });
    const p = applyDeskCommand(desk, { id: 'a1', kind: 'job.pause', target_ref: 'T-1' });
    expect(p.body).toMatchObject({ status: 'paused' });
    const r = applyDeskCommand(desk, { id: 'a2', kind: 'job.resume', target_ref: 'T-1' });
    expect(r.body).toMatchObject({ status: 'queue' });
    const c = applyDeskCommand(desk, { id: 'a3', kind: 'job.cancel', target_ref: 'T-1' });
    expect(c.body).toMatchObject({ status: 'cancel' });
    // pausado e depois cancelado também fecha
    applyDeskCommand(desk, { id: UUID2, kind: 'job.create', payload: { kind: 'editorial', fields: { tema: 'Páscoa' } } });
    applyDeskCommand(desk, { id: 'b1', kind: 'job.pause', target_ref: 'T-2' });
    expect(applyDeskCommand(desk, { id: 'b2', kind: 'job.cancel', target_ref: 'T-2' }).body).toMatchObject({ status: 'cancel' });
    expect(applyDeskCommand(desk, { id: 'b3', kind: 'job.pause', target_ref: 'T-9' })).toMatchObject({ status: 'rejected', code: 404 });
    await q.tick();
  });

  it('pendência antiga do office.py é recusada (as de verdade são os resultados de tarefa)', () => {
    const { desk } = escritorio();
    expect(applyDeskCommand(desk, { id: 'x', kind: 'pending.approve', target_ref: 'P-1' })).toMatchObject({ status: 'rejected', code: 410 });
  });

  it('o espelho publica jobs e entregas e apaga as pendências simuladas que estavam na nuvem', async () => {
    const { q, desk } = escritorio();
    applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'instagram', fields: { perfil: 'sol' } } });
    await q.tick();
    const up: Record<string, any[]> = {};
    const del: Record<string, string[]> = {};
    const remote: DeskRemote = {
      rpc: async () => [],
      upsert: async (table, rows) => void (up[table] = [...(up[table] || []), ...rows]),
      markDeleted: async (table, _k, keys) => void (del[table] = keys),
      select: async (table) => (table === 'office_pendings' ? [{ id: 'P-1' }, { id: 'P-2' }] : table === 'office_jobs' ? [{ id: 'J-7' }] : []),
    };
    const w = new DeskWorker(desk, remote, 'escritorio:teste', () => {});
    await w.pushMirror();
    expect(up.office_jobs.map((r) => r.id)).toEqual(['T-1']);
    expect(up.office_deliveries.map((r) => r.slug)).toEqual(['entrega-T-1']);
    expect(up.office_tasks.map((r) => r.id)).toEqual(['T-1']);
    expect(del.office_pendings).toEqual(['P-1', 'P-2']);
    expect(del.office_jobs).toEqual(['J-7']);
    // segunda vez, nada mudou: nada sobe
    const antes = up.office_jobs.length;
    await w.pushMirror();
    expect(up.office_jobs.length).toBe(antes);
    await w.heartbeat();
    const beat = up.office_status[0];
    expect(beat.stats).toMatchObject({ completedToday: expect.any(Number), queued: 0, running: 0 });
    expect(beat.agents.map((a: any) => a.name)).toContain('Social');
  });
});

const NL = String.fromCharCode(10);
const lines = (...l: string[]) => l.join(NL);

describe('entrega leva os arquivos da tarefa', () => {
  it('lista .md/.txt da pasta (o do papel primeiro) e monta a entrega sem repetir', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { taskFiles, deliveryBody } = await import('../../src/main/officeExec');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'entrega-'));
    expect(taskFiles(dir, 'social')).toEqual([]);
    const perfil = lines('# Perfil', '- 403 seguidores');
    fs.writeFileSync(path.join(dir, 'a-notas.txt'), 'notas');
    fs.writeFileSync(path.join(dir, 'analise-instagram.md'), perfil);
    fs.writeFileSync(path.join(dir, 'foto.png'), 'x');
    const files = taskFiles(dir, 'social');
    expect(files.map((f) => f.name)).toEqual(['analise-instagram.md', 'a-notas.txt']);
    const junto = lines(perfil, '', '---', '', 'resumo');
    expect(deliveryBody('resumo', files.slice(0, 1))).toBe(junto);
    // resultado antigo que já trazia o arquivo: não repete
    expect(deliveryBody(junto, files.slice(0, 1))).toBe(junto);
  });

  it('o Kanban publica o resultado inteiro e os arquivos da tarefa', async () => {
    const longo = 'Começo do texto. ' + 'x'.repeat(3000) + ' Fim.';
    const { q, desk } = escritorio([{ ok: true, reply: longo }]);
    desk.exec!.files = () => [{ name: 'analise-instagram.md', body: '# Perfil' }];
    applyDeskCommand(desk, { id: UUID1, kind: 'job.create', payload: { kind: 'instagram', fields: { perfil: 'sol' } } });
    await q.tick();
    const w = new DeskWorker(desk, { rpc: async () => [], upsert: async () => {}, markDeleted: async () => {}, select: async () => [] }, 'escritorio:teste', () => {});
    const tables = w.mirrorTables();
    const run = (tables.find((t) => t.table === 'office_tasks')!.rows[0] as any).run;
    expect(run.summary.startsWith('Começo do texto.')).toBe(true);
    expect(run.summary.endsWith('Fim.')).toBe(true);
    expect(run.files).toEqual([{ name: 'analise-instagram.md', body: '# Perfil' }]);
    const entrega = tables.find((t) => t.table === 'office_deliveries')!.rows[0] as any;
    expect(entrega.body.startsWith(lines('# Perfil', '', '---', '', 'Começo do texto.'))).toBe(true);
  });
});

