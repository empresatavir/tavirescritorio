import { beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ESTEIRA_TEMPLATES, LEGACY_STAGE_NAMES } from '../../src/shared/esteiras';
import { getProjectEsteira } from '../../src/main/project-fs';

const SCHEMA = `CREATE TABLE projects (id VARCHAR(36) NOT NULL, slug VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL, client VARCHAR(200), repo_url VARCHAR(500), local_path VARCHAR(500), deploy_target VARCHAR(200), status VARCHAR(20) NOT NULL, description TEXT, created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL, company VARCHAR(200), template_code VARCHAR(50), stages_done INTEGER DEFAULT '0' NOT NULL, total_stages INTEGER DEFAULT '0' NOT NULL, stack VARCHAR(200), goal TEXT, audience TEXT, scope_items JSON, pendencies JSON, kanban_cards JSON, files JSON, keys JSON, event_log JSON, ai_settings JSON, control JSON, PRIMARY KEY (id), UNIQUE (slug))`;

let data = '';
const db = () => {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(path.join(data, 'backend', 'tavir.db'));
};

beforeAll(() => {
  data = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-data-'));
  fs.mkdirSync(path.join(data, 'backend'), { recursive: true });
  fs.mkdirSync(path.join(data, 'db'), { recursive: true });
  const sqlite = db();
  sqlite.exec(SCHEMA);
  sqlite.close();
  process.env.TAVIR_DATA_ROOT = data;
});

function projeto(id: string, status: string, stages: Array<Record<string, unknown>>, names?: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-est-'));
  fs.mkdirSync(path.join(dir, '.tavir'));
  fs.writeFileSync(path.join(dir, '.tavir', 'esteira.json'), JSON.stringify({ auto: false, stages, ...(names ? { names } : {}) }));
  const sqlite = db();
  sqlite.prepare('INSERT INTO projects (id, slug, name, local_path, status, template_code, stages_done, total_stages) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, id, id, dir, status, 'sy-c', stages.filter((s) => s.status === 'done').length, stages.length);
  sqlite.close();
  return dir;
}

const lido = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, '.tavir', 'esteira.json'), 'utf8'));
const OLD = LEGACY_STAGE_NAMES['SY-C1']![0];
const NOW = ESTEIRA_TEMPLATES['SY-C1'].stages.map((s) => s.name);

describe('etapas de design em projeto que já existia', () => {
  it('projeto entregue no molde antigo continua entregue: as etapas novas entram como concluídas sem execução', () => {
    const dir = projeto('p-entregue', 'done', OLD.map((n) => ({ status: 'done', note: `feito: ${n}` })), OLD);
    getProjectEsteira(dir);
    const desk = lido(dir);
    expect(desk.names).toEqual(NOW);
    expect(desk.stages).toHaveLength(NOW.length);
    expect(desk.stages.every((s: any) => s.status === 'done')).toBe(true);
    for (const novo of ['Direção de design', 'Aprovação do design', 'Gate · Revisão de design']) {
      expect(desk.stages[NOW.indexOf(novo)].note).toContain('Não foi executada');
    }
    // O que foi feito de verdade segue no lugar certo, pelo nome.
    expect(desk.stages[NOW.indexOf('Construção Front')].note).toBe('feito: Construção Front');
    const sqlite = db();
    const row = sqlite.prepare('SELECT status, stages_done, total_stages FROM projects WHERE id = ?').get('p-entregue') as any;
    sqlite.close();
    expect(row).toMatchObject({ status: 'done', stages_done: NOW.length, total_stages: NOW.length });
  });

  it('projeto no meio da esteira ganha as etapas de design que ainda estão à frente', () => {
    // Parou depois de «Construção Front» (6 primeiras concluídas), gravado sem a lista de nomes.
    const dir = projeto('p-meio', 'running', OLD.map((_n, i) => (i < 6 ? { status: 'done', note: 'ok' } : {})));
    getProjectEsteira(dir);
    const desk = lido(dir);
    const st = (name: string) => desk.stages[NOW.indexOf(name)].status;
    // Direção e aprovação ficaram para trás do ponto em que o projeto está: não travam a construção.
    expect(st('Direção de design')).toBe('done');
    expect(st('Aprovação do design')).toBe('done');
    expect(st('Construção Front')).toBe('done');
    expect(st('Construção Back')).toBe('idle');
    // A revisão de design ainda está à frente: vai rodar.
    expect(st('Gate · Revisão de design')).toBe('idle');
  });
});
