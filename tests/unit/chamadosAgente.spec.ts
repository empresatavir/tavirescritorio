import { beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as pfs from '../../src/main/project-fs';
import { buildPrompt, historyBudget } from '../../src/main/irisAgent';
import { criarChamado, listarChamados, lerChamado, parseChamados } from '../../src/main/chamados';

const SCHEMA = `CREATE TABLE projects (id VARCHAR(36) NOT NULL, slug VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL, client VARCHAR(200), repo_url VARCHAR(500), local_path VARCHAR(500), deploy_target VARCHAR(200), status VARCHAR(20) NOT NULL, description TEXT, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, company VARCHAR(200), template_code VARCHAR(50), stages_done INTEGER DEFAULT '0' NOT NULL, total_stages INTEGER DEFAULT '0' NOT NULL, stack VARCHAR(200), goal TEXT, audience TEXT, scope_items JSON, pendencies JSON, kanban_cards JSON, files JSON, keys JSON, event_log JSON, ai_settings JSON, control JSON, PRIMARY KEY (id), UNIQUE (slug))`;

beforeAll(() => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-data-'));
  fs.mkdirSync(path.join(data, 'backend'), { recursive: true });
  fs.mkdirSync(path.join(data, 'db'), { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(data, 'backend', 'tavir.db'));
  db.exec(SCHEMA);
  db.close();
  process.env.TAVIR_DATA_ROOT = data;
});

const BLOCO = (titulo: string, extra = '') => `CHAMADO:\ntipo: bug\ntitulo: ${titulo}\nprioridade: alta\nacontece: Mostra o valor cheio.\nesperado: Descontar o cupom.\nreproduzir: Aplicar TESTE10.\nevidencia: src/total.ts:1${extra}\n`;

function projeto(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-ag-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'total.ts'), 'export const total = 1;\n');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"loja"}');
  pfs.createOrAbsorbProjectRecord({ local_path: dir, name: 'Loja ' + path.basename(dir), absorb: false, baseline: false });
  return dir;
}

describe('parseChamados', () => {
  it('um bloco: proposta válida e texto sem o bloco', () => {
    const r = parseChamados(`O total ignora o cupom.\n\n${BLOCO('Total ignora cupom')}`, {});
    expect(r.propostas).toHaveLength(1);
    expect(r.propostas[0]).toMatchObject({ tipo: 'bug', prioridade: 'alta', titulo: 'Total ignora cupom', descricao: { a: 'Mostra o valor cheio.', b: 'Descontar o cupom.', c: 'Aplicar TESTE10.' }, evidencia: 'src/total.ts:1' });
    expect(r.texto).toBe('O total ignora o cupom.');
    expect(r.texto).not.toMatch(/CHAMADO:/);
  });
  it('vários blocos, com limite por resposta', () => {
    const t = ['Achei:', ...Array.from({ length: 7 }, (_, i) => BLOCO('Defeito ' + i))].join('\n');
    const r = parseChamados(t, { max: 5 });
    expect(r.propostas).toHaveLength(5);
    expect(r.avisos.join(' ')).toMatch(/limite de 5/);
  });
  it('bloco torto, tipo inválido e título vazio são descartados com aviso', () => {
    const t = 'CHAMADO:\ntipo: feature\ntitulo: X\nprioridade: alta\n\nCHAMADO:\ntipo: bug\ntitulo:\nprioridade: alta\n\nCHAMADO:\ntipo: bug\ntitulo: Y\nprioridade: altissima\n';
    const r = parseChamados(t);
    expect(r.propostas).toHaveLength(0);
    expect(r.avisos).toHaveLength(3);
  });
  it('sem bloco: texto igual e nenhuma proposta', () => {
    const r = parseChamados('Só uma resposta.');
    expect(r.propostas).toEqual([]);
    expect(r.texto).toBe('Só uma resposta.');
  });
  it('evidência inexistente não derruba, só marca', () => {
    const dir = projeto();
    const r = parseChamados(BLOCO('A').replace('src/total.ts:1', 'src/fantasma.ts:9'), { root: dir });
    expect(r.propostas[0].evidenciaNaoConferida).toBe(true);
    expect(parseChamados(BLOCO('B'), { root: dir }).propostas[0].evidenciaNaoConferida).toBeUndefined();
  });
});

describe('Íris propõe, varredura grava', () => {
  const fake = (texto: string) => async () => ({ ok: true, text: texto, runId: 'run-x', thoughts: [] });

  it('conversa só propõe: texto sem bloco no histórico e propostas na mensagem', async () => {
    const dir = projeto();
    const r = await pfs.askProjectIris({ projectPath: dir, question: 'O total está errado', converse: fake(`Vi o problema.\n\n${BLOCO('Total ignora cupom')}`) });
    expect(r.replyMessage.t).toBe('Vi o problema.');
    expect(r.replyMessage.propostas).toHaveLength(1);
    expect(listarChamados(dir)).toHaveLength(0);
    const hist = JSON.parse(fs.readFileSync(path.join(dir, '.tavir', 'iris-chat.json'), 'utf8'));
    expect(JSON.stringify(hist.map((m: any) => m.t))).not.toMatch(/CHAMADO:/);
    // o que vai para o motor não cresce com as propostas
    const recent = pfs.chatRecent(hist);
    const sem = historyBudget(recent);
    expect(recent.some((m) => /CHAMADO:/.test(m.text))).toBe(false);
    expect(sem.chars).toBeLessThan(200);
    expect(fs.existsSync(path.join(dir, 'memory', 'projeto', 'CHANGE_REQUESTS.md'))).toBe(false);
  });

  it('varredura grava direto como agente; duplicado vira linha de histórico', async () => {
    const dir = projeto();
    const existente = criarChamado(dir, { titulo: 'Total ignora cupom' }).chamado!;
    const r = await pfs.askProjectIris({ projectPath: dir, question: 'Procure melhorias', varredura: true, converse: fake(`Achei dois.\n\n${BLOCO('Total ignora cupom')}\n${BLOCO('Frete grátis não aplica')}`) });
    expect(r.replyMessage.chamadosVarredura.criados).toHaveLength(1);
    expect(r.replyMessage.chamadosVarredura.repetidos).toEqual([existente.id]);
    const novo = listarChamados(dir).find((c) => c.titulo === 'Frete grátis não aplica')!;
    expect(novo.autor).toMatchObject({ tipo: 'agente', origem: 'varredura', runId: 'run-x' });
    expect(novo.situacao).toBe('aberto');
    expect(lerChamado(dir, existente.id)!.historico.at(-1)!.acao).toMatch(/apontou de novo/);
  });

  it('prompt da conversa em só leitura cita CHAMADO: e não cita «Pedir alteração»', () => {
    const p = buildPrompt({ workspace: '.', question: 'oi', projectName: 'Loja', stageName: 'x', stageOwner: 'y', engineId: 'claude', finished: true, alterationsOpen: false, asChangeRequest: false, recent: [] } as any, 'read');
    expect(p).toMatch(/CHAMADO:/);
    expect(p).not.toMatch(/Pedir altera/);
  });
});
