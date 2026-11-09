import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { buildLabel, readBuildInfo, resetBuildInfoCache } from '../../src/main/buildInfo';

const require = createRequire(import.meta.url);
// Cada teste roda vários comandos git; no Windows isso passa dos 5 s padrão.
const LENTO = 60000;
const v = require('../../scripts/versioning.js');

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
const dirs: string[] = [];

function repo(version = '1.2.3'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-versao-'));
  dirs.push(dir);
  git(dir, 'init', '-q', '-b', 'master');
  git(dir, 'config', 'user.name', 'QA');
  git(dir, 'config', 'user.email', 'qa@tavir.local');
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'config', 'tag.gpgSign', 'false');
  git(dir, 'config', 'commit.gpgSign', 'false');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version }, null, 2) + '\n');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'feat(base): primeira tela');
  return dir;
}

function commit(dir: string, file: string, msg: string) {
  fs.writeFileSync(path.join(dir, file), msg + '\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', msg);
}

afterEach(() => {
  resetBuildInfoCache();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('versão semântica', () => {
  it('sobe patch, minor e major zerando o que vem depois', () => {
    expect(v.bumpVersion('2.0.0', 'patch')).toBe('2.0.1');
    expect(v.bumpVersion('2.3.4', 'minor')).toBe('2.4.0');
    expect(v.bumpVersion('2.3.4', 'major')).toBe('3.0.0');
    expect(() => v.bumpVersion('2.0.0', 'grande')).toThrow(/patch, minor ou major/);
    expect(() => v.bumpVersion('abc', 'patch')).toThrow(/inválida/);
  });

  it('agrupa os commits do CHANGELOG pelo tipo e ignora merge e release', () => {
    const s = v.changelogSection('2.1.0', '2026-11-08', [
      'feat(cofre): card por conta',
      'fix: rodapé',
      'chore(release): v2.0.0',
      'Merge pull request #1 from x',
      'ajuste solto',
    ]);
    expect(s).toContain('## v2.1.0 · 2026-11-08');
    expect(s).toMatch(/### Novidades\n\n- \*\*cofre:\*\* card por conta/);
    expect(s).toMatch(/### Correções\n\n- rodapé/);
    expect(s).toMatch(/### Outros\n\n- ajuste solto/);
    expect(s).not.toContain('release');
    expect(s).not.toContain('Merge');
    expect(v.changelogSection('1.0.1', '2026-01-01', [])).toContain('Sem mudanças registradas');
  });
});

describe('ficha do build', () => {
  it('lê commit, branch e tag e marca alterações locais só em código', () => {
    const dir = repo();
    let i = v.collectBuildInfo(dir);
    expect(i.version).toBe('1.2.3');
    expect(i.commit).toHaveLength(7);
    expect(i.branch).toBe('master');
    expect(i.tag).toBeNull();
    expect(i.dirty).toBe(false);

    // dados de uso (db/) não contam; código alterado ou novo conta
    fs.mkdirSync(path.join(dir, 'db'));
    fs.writeFileSync(path.join(dir, 'db', 'store.json'), '{}');
    git(dir, 'add', 'db');
    git(dir, 'commit', '-q', '-m', 'chore: db');
    fs.writeFileSync(path.join(dir, 'db', 'store.json'), '{"a":1}');
    expect(v.collectBuildInfo(dir).dirty).toBe(false);
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 2;\n');
    fs.writeFileSync(path.join(dir, 'src', 'novo.ts'), 'x');
    i = v.collectBuildInfo(dir);
    expect(i.dirty).toBe(true);
    expect(i.dirtyFiles).toEqual(['src/a.ts', 'src/novo.ts']);
  }, LENTO);

  it('o rótulo esconde o commit quando o build está na tag da versão', () => {
    expect(buildLabel({ version: '2.0.0', commit: 'abc1234', tag: null, dirty: false })).toBe('v2.0.0 · abc1234');
    expect(buildLabel({ version: '2.0.0', commit: 'abc1234', tag: 'v2.0.0', dirty: false })).toBe('v2.0.0');
    expect(buildLabel({ version: '2.0.0', commit: 'abc1234', tag: null, dirty: true })).toBe('v2.0.0 · abc1234 · local');
    expect(buildLabel({ version: '2.0.0', commit: '', tag: null, dirty: false })).toBe('v2.0.0');
  });

  it('sem ficha gravada, cai na versão do app', () => {
    const i = readBuildInfo('9.9.9', path.join(os.tmpdir(), 'nao-existe-build-info.json'));
    expect(i.known).toBe(false);
    expect(i.label).toBe('v9.9.9');
  });

  it('a ficha gravada vira o rótulo do rodapé', () => {
    const dir = repo();
    v.writeBuildInfo(dir);
    const i = readBuildInfo('0.0.0', path.join(dir, 'dist', 'build-info.json'));
    expect(i.known).toBe(true);
    expect(i.label).toBe(`v1.2.3 · ${git(dir, 'rev-parse', '--short=7', 'HEAD')}`);
  }, LENTO);
});

describe('release', () => {
  it('recusa com código alterado sem commit', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'mudou');
    expect(() => v.release('patch', { root: dir })).toThrow(/sem commit/);
  }, LENTO);

  it('sobe a versão, escreve o CHANGELOG, commita e a tag fecha a versão', () => {
    const dir = repo('2.0.0');
    commit(dir, 'b.txt', 'fix(rodape): versão visível');
    const r = v.release('minor', { root: dir, date: new Date('2026-11-08T12:00:00Z') });
    expect(r).toMatchObject({ from: '2.0.0', to: '2.1.0' });
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version).toBe('2.1.0');
    const cl = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    expect(cl).toMatch(/^# Changelog/);
    expect(cl).toContain('## v2.1.0 · 2026-11-08');
    expect(cl).toContain('Primeira versão com controle de versão');
    expect(cl).toContain('**rodape:** versão visível');
    expect(git(dir, 'log', '-1', '--format=%s')).toBe('chore(release): v2.1.0');

    const t = v.tagRelease({ root: dir });
    expect(t.tag).toBe('v2.1.0');
    expect(v.collectBuildInfo(dir).tag).toBe('v2.1.0');
    expect(() => v.tagRelease({ root: dir })).toThrow(/já existe/);

    // próxima release só traz o que veio depois da tag e mantém a anterior abaixo
    commit(dir, 'c.txt', 'feat: nova aba');
    v.release('patch', { root: dir, date: new Date('2026-11-09T12:00:00Z') });
    const cl2 = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    expect(cl2.indexOf('## v2.1.1')).toBeLessThan(cl2.indexOf('## v2.1.0'));
    const nova = cl2.slice(cl2.indexOf('## v2.1.1'), cl2.indexOf('## v2.1.0'));
    expect(nova).toContain('nova aba');
    expect(nova).not.toContain('versão visível');
    expect(cl2.match(/^# Changelog/gm)).toHaveLength(1);
  }, LENTO);

  it('a tag só sai da master', () => {
    const dir = repo();
    git(dir, 'checkout', '-q', '-b', 'feat/x');
    expect(() => v.tagRelease({ root: dir })).toThrow(/master/);
  }, LENTO);
});
