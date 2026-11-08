import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ESTEIRA_TEMPLATES, esteiraTemplate, normalizeEsteiraCode, templateStagesForPanel } from '../../src/shared/esteiras';
import { commitStep } from '../../src/main/stepCommit';
import { APPROVAL_RE } from '../../src/main/project-fs';

describe('moldes das esteiras', () => {
  it('normaliza os códigos que o banco grava', () => {
    expect(normalizeEsteiraCode('sy-c')).toBe('SY-C1');
    expect(normalizeEsteiraCode('sy-m')).toBe('SY-M1');
    expect(normalizeEsteiraCode('SY_M1')).toBe('SY-M1');
    expect(normalizeEsteiraCode('of-m')).toBe('OF-M0');
    expect(normalizeEsteiraCode('of-c')).toBe('OF-C1');
    expect(normalizeEsteiraCode('lp-m')).toBe('LP-M1');
    expect(normalizeEsteiraCode('lp-c')).toBe('LP-C1');
    expect(normalizeEsteiraCode(undefined)).toBe('LP-C1');
  });

  it('conta as etapas de cada molde (o banco usava 12 para quase tudo)', () => {
    expect(esteiraTemplate('lp-c').stages).toHaveLength(9);
    expect(esteiraTemplate('lp-m').stages).toHaveLength(11);
    expect(esteiraTemplate('of-c').stages).toHaveLength(8);
    expect(esteiraTemplate('of-m').stages).toHaveLength(6);
    expect(esteiraTemplate('sy-c').stages).toHaveLength(15);
    expect(esteiraTemplate('sy-m').stages).toHaveLength(9);
  });

  it('marca como gate só as etapas de decisão humana', () => {
    const gates = (code: keyof typeof ESTEIRA_TEMPLATES) => ESTEIRA_TEMPLATES[code].stages.filter((s) => s.gate).map((s) => s.name);
    expect(gates('SY-C1')).toEqual(['Gate 0 · Demanda e briefing', 'Gate Final CEO · Completion Guard']);
    expect(gates('LP-M1')).toEqual(['Gate 0 · Diagnóstico da LP atual', 'Aprovação dos requisitos', 'Gate Final CEO · Completion Guard']);
    expect(gates('SY-M1')).toEqual([]);
    expect(gates('LP-C1')).toEqual([]);
  });

  it('entrega ao painel o formato [nome, dono, skill, peso]', () => {
    const panel = templateStagesForPanel();
    expect(Object.keys(panel).sort()).toEqual(['LP-C1', 'LP-M1', 'OF-C1', 'OF-M0', 'SY-C1', 'SY-M1']);
    expect(panel['SY-M1'][0]).toEqual(['Entender', 'Paula PM', 'intake', 1]);
  });
});

describe('marcador de aprovação do trilho', () => {
  it('só vale no começo da resposta', () => {
    expect(APPROVAL_RE.test('AGUARDANDO APROVAÇÃO: posso apagar a pasta legado?')).toBe(true);
    expect(APPROVAL_RE.test('  **AGUARDANDO APROVAÇÃO:** troco o banco?')).toBe(true);
    expect(APPROVAL_RE.test('## AGUARDANDO APROVACAO: confirma?')).toBe(true);
    expect(APPROVAL_RE.test('Feito. Não precisei de AGUARDANDO APROVAÇÃO: tudo seguiu.')).toBe(false);
    expect(APPROVAL_RE.test('Concluí o ajuste sem pendências.')).toBe(false);
  });
});

describe('commit por passo', () => {
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
  const repo = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-commit-'));
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.name', 'Teste');
    git(dir, 'config', 'user.email', 'teste@tavir.local');
    git(dir, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(dir, '.gitignore'), 'segredo.env\n');
    fs.writeFileSync(path.join(dir, 'base.txt'), 'base\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');
    return dir;
  };
  const changes = (added: string[], modified: string[] = [], deleted: string[] = []) => ({ available: true, added, modified, deleted });

  it('commita só o que a execução mudou e deixa de fora o trabalho do Carlos', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'do-carlos.txt'), 'rascunho\n');
    git(dir, 'add', 'do-carlos.txt');
    fs.writeFileSync(path.join(dir, 'novo.txt'), 'agente\n');
    fs.writeFileSync(path.join(dir, 'base.txt'), 'base alterada\n');
    fs.writeFileSync(path.join(dir, 'segredo.env'), 'TOKEN=1\n');
    const res = commitStep(dir, changes(['novo.txt', 'segredo.env'], ['base.txt']), 'tavir: teste');
    expect(res.ok).toBe(true);
    expect(res.sha).toBeTruthy();
    expect(res.files).toBe(2);
    expect(git(dir, 'show', '--name-only', '--format=', 'HEAD').split(/\r?\n/).sort()).toEqual(['base.txt', 'novo.txt']);
    expect(git(dir, 'diff', '--cached', '--name-only')).toBe('do-carlos.txt');
  });

  it('não commita sem mudança, sem git ou sem retrato', () => {
    const dir = repo();
    expect(commitStep(dir, changes([]), 'x').skipped).toBe('nenhum arquivo mudou');
    expect(commitStep(dir, { available: false, added: [], modified: [], deleted: [] }, 'x').skipped).toBe('sem retrato do disco');
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-semgit-'));
    expect(commitStep(plain, changes(['a.txt']), 'x').skipped).toBe('pasta sem git');
  });

  it('registra remoção de arquivo', () => {
    const dir = repo();
    fs.unlinkSync(path.join(dir, 'base.txt'));
    const res = commitStep(dir, changes([], [], ['base.txt']), 'tavir: remove');
    expect(res.sha).toBeTruthy();
    expect(git(dir, 'ls-files')).toBe('.gitignore');
  });
});
