import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ESTEIRA_TEMPLATES, stageContract } from '../../src/shared/esteiras';
import { agentProfile } from '../../src/shared/agentes';
import { buildPrompt, type IrisAgentRequest } from '../../src/main/irisAgent';
import { stageHandoff, PACOTE_ETAPA } from '../../src/main/project-fs';
import { startRun, readRun } from '../../src/main/runLedger';

const etapas = Object.values(ESTEIRA_TEMPLATES).flatMap((t) => t.stages);

describe('contrato e dono de cada etapa', () => {
  it('toda etapa que não é gate tem contrato com objetivo, entrega e critério de pronto', () => {
    const sem = etapas.filter((s) => !s.gate && !stageContract(s.name)).map((s) => s.name);
    expect(sem).toEqual([]);
    const c = stageContract('Construção Back')!;
    expect(c.entrega).toMatch(/teste/);
    expect(c.pronto).toMatch(/nada falta/);
  });

  it('todo dono de etapa que não é gate tem perfil', () => {
    const sem = Array.from(new Set(etapas.filter((s) => !s.gate).map((s) => s.owner))).filter((o) => !agentProfile(o));
    expect(sem).toEqual([]);
  });

  it('o pedido de etapa começa pelo perfil do dono, não por um agente genérico', () => {
    const req: IrisAgentRequest = {
      workspace: 'C:/p', question: 'Faça a etapa', projectName: 'Novo App', stageName: 'Construção Back', stageOwner: 'Diego Dev Front & Back',
      engineId: 'antigravity', finished: true, alterationsOpen: true, asChangeRequest: true, recent: [], runKind: 'esteira',
    } as any;
    const p = buildPrompt(req, 'write');
    expect(p.startsWith('Você é Diego Dev Front & Back, desenvolvedor')).toBe(true);
    expect(p).toContain('## Seu papel');
    expect(p).toContain('teste que falha');
    expect(p).toContain('## O que você não faz');
    expect(p).not.toContain('Você é um agente da Fábrica TAVIR');
    // Dono sem perfil continua com o texto genérico.
    expect(buildPrompt({ ...req, stageOwner: 'Fulano' }, 'write')).toContain('Você é um agente da Fábrica TAVIR');
  });
});

describe('pacote entre etapas', () => {
  it('usa o «Pacote para a próxima etapa» quando o agente escreveu', () => {
    const note = `Fiz muita coisa.\n\n### Como foi verificado\n1. pytest 46 passed\n\n${PACOTE_ETAPA}\n- Criei backend/api.py\n- Falta o endpoint de custos\n\n_3 arquivo(s) mudaram · Commit abc · 3 arquivo(s)_`;
    const h = stageHandoff(note);
    expect(h).toBe('- Criei backend/api.py\n- Falta o endpoint de custos');
  });

  it('sem pacote, tira a verificação, os links file:// e não corta no meio da palavra', () => {
    const note = `## Entregue\n- [specs/kanban.md](file:///C:/x/specs/kanban.md): quadro atualizado\n- ${'palavra '.repeat(400)}\n\n### Como foi verificado\n1. pytest 46 passed`;
    const h = stageHandoff(note, 300);
    expect(h).toContain('[specs/kanban.md]: quadro atualizado');
    expect(h).not.toContain('file:///');
    expect(h).not.toContain('pytest');
    expect(h.endsWith('…')).toBe(true);
    expect(h.replace(/\n…$/, '').endsWith('palavra')).toBe(true);
  });
});

describe('hora de cada linha no registro da execução', () => {
  it('grava a hora de chegada e devolve os passos com hora', async () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-tempos-'));
    const run = await startRun({ workspace: ws, kind: 'esteira', engine: 'antigravity', binary: 'agy', model: 'm', effort: 'medium', mode: 'agent', args: [], timeoutMs: 1000, prompt: 'pedido' });
    const t0 = Date.now();
    run.raw('stdout', JSON.stringify({ event: 'step_update', step_update: { step_type: 'tool', state: 'ACTIVE', tool_name: 'run_command', tool_info: { parameters: { CommandLine: 'pytest' } } } }) + '\n');
    run.raw('stdout', 'linha solta do motor\n');
    run.raw('stderr', 'aviso do motor\n');
    // Durante a execução a leitura já traz as horas.
    const vivo = readRun(ws, run.id);
    expect(vivo.passos[0]).toMatchObject({ kind: 'ferramenta', text: 'run_command · pytest' });
    expect(vivo.passos[0].at).toBeGreaterThanOrEqual(t0);
    await run.finish({ ok: true, exitCode: 0, reply: 'feito' });
    const det = readRun(ws, run.id);
    expect(det.passos[0].at).toBeGreaterThanOrEqual(t0);
    expect(det.stdoutLines).toEqual([{ at: expect.any(Number), text: 'linha solta do motor' }]);
    expect(det.stderrLines[0]).toMatchObject({ text: 'aviso do motor' });
    expect(det.stderrLines[0].at).toBeGreaterThanOrEqual(t0);
  });
});

describe('caminhos no log da tela', () => {
  it('mostra caminhos dentro do projeto relativos à pasta', async () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-rel-'));
    const run = await startRun({ workspace: ws, kind: 'esteira', engine: 'antigravity', binary: 'agy', model: 'm', effort: 'medium', mode: 'agent', args: [], timeoutMs: 1000, prompt: 'p' });
    const abs = path.join(ws, 'specs', 'kanban.md');
    run.raw('stdout', JSON.stringify({ event: 'step_update', step_update: { step_type: 'tool', state: 'ACTIVE', tool_name: 'read_file', tool_info: { parameters: { Path: abs.split(path.sep).join('/') } } } }) + '\n');
    await run.finish({ ok: true, exitCode: 0, reply: 'ok' });
    expect(readRun(ws, run.id).passos[0].text).toBe('read_file · specs/kanban.md');
  });
});
