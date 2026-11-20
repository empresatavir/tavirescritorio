import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ROSTER, SECTOR_ORDER } from '../../src/shared/officeRoster';
import { OFFICE_AGENTS, publishedAgents } from '../../src/shared/officeAgents';
import { jobTask } from '../../src/main/officeCloud';
import { agentSoul, buildPrompt } from '../../src/main/officeExec';

const dirs: string[] = [];
function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-equipe-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('equipe da agência no app', () => {
  it('traz os 58 agentes reais, sem nome nem id repetido, cada um com papel, setor e opção', () => {
    expect(ROSTER).toHaveLength(58);
    expect(new Set(ROSTER.map((r) => r.id)).size).toBe(58);
    expect(new Set(OFFICE_AGENTS.map((a) => a.name)).size).toBe(OFFICE_AGENTS.length);
    for (const a of OFFICE_AGENTS) {
      expect(a.role, a.name).not.toBe('');
      expect(SECTOR_ORDER, a.name).toContain(a.sector);
      expect(a.actions.length, a.name).toBeGreaterThan(0);
    }
  });

  it('mantém os nomes e opções que o app já usa', () => {
    const names = OFFICE_AGENTS.map((a) => a.name);
    for (const n of ['Íris Instagram', 'Maicon', 'Yuri YouTube', 'Paula PM', 'CTO', 'Rafa Construtor', 'Analista', 'Social']) expect(names).toContain(n);
    expect(OFFICE_AGENTS.find((a) => a.name === 'Íris Instagram')!.actions.map((x) => x.id)).toContain('video');
    expect(OFFICE_AGENTS.find((a) => a.name === 'Maicon')!.actions.map((x) => x.id)).toContain('estudo-video');
  });

  it('publica em grupos, na ordem dos setores, começando por análise e conhecimento', () => {
    const pub = publishedAgents('m');
    expect(pub[0].sector).toBe('Análise e conhecimento');
    const order = pub.map((p) => SECTOR_ORDER.indexOf(p.sector));
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });

  it('pedido a um agente da equipe vira tarefa dele, com a opção', () => {
    expect(jobTask('agent', { agent: 'Jano NexLev', action: 'nicho', instrucao: 'canais de história' })).toMatchObject({ agent: 'agente:Jano NexLev', fields: { acao: 'Descobrir nichos em crescimento' } });
  });
});

describe('ficha do agente', () => {
  it('vem do banco e, sem ele, do arquivo da equipe', () => {
    const dir = tmp();
    const db = path.join(dir, 'tavir.db');
    const { DatabaseSync } = require('node:sqlite');
    const conn = new DatabaseSync(db);
    conn.exec('CREATE TABLE agents (id TEXT PRIMARY KEY, soul_text TEXT)');
    conn.prepare('INSERT INTO agents VALUES (?, ?)').run('jano-nexlev', '# Jano\nInteligência de mercado via NexLev.');
    conn.close();
    const agency = path.join(dir, 'AgenciaIA');
    fs.mkdirSync(path.join(agency, 'escritorio', 'equipe'), { recursive: true });
    fs.writeFileSync(path.join(agency, 'escritorio', 'equipe', 'jane.md'), '# Jane\nAnalista comportamental.');
    expect(agentSoul('jano-nexlev', db, agency)).toContain('Inteligência de mercado via NexLev');
    expect(agentSoul('jano-nexlev', db, agency)).toContain(agency);
    expect(agentSoul('jane', db, agency)).toContain('Analista comportamental');
    expect(agentSoul('ninguem', db, agency)).toBe('');
  });

  it('o pedido ao motor leva a ficha do agente da equipe', () => {
    const prompt = buildPrompt({
      mode: 'exec',
      agent: 'agente:Jano NexLev',
      task: { id: 't', seq: 9, title: 'Nichos', desc: '', sector: 'Operação', prio: 'Normal', status: 'in_progress' } as never,
      plan: '',
      note: '',
      previous: '',
      workspace: '/tmp/x',
      fields: { acao: 'Descobrir nichos em crescimento', instrucao: 'canais de história' },
    });
    expect(prompt).toContain('Você é Jano NexLev');
    expect(prompt).toContain('Opção escolhida no app: Descobrir nichos em crescimento');
  });
});
