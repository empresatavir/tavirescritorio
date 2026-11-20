import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { clonarRepo, copiarPasta, destinoDoEscopo, lerLinkGithub, prepararAbsorcao } from '../../src/main/absorcao/entrada';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();

describe('entrada da absorção', () => {
  it('lê os dois formatos de link do GitHub e recusa outro', () => {
    expect(lerLinkGithub('https://github.com/tavir/loja-site')).toEqual({ dono: 'tavir', repo: 'loja-site', url: 'https://github.com/tavir/loja-site.git' });
    expect(lerLinkGithub('https://github.com/tavir/loja-site.git/').repo).toBe('loja-site');
    expect(lerLinkGithub('git@github.com:tavir/app.cliente.git')).toEqual({ dono: 'tavir', repo: 'app.cliente', url: 'https://github.com/tavir/app.cliente.git' });
    expect(() => lerLinkGithub('https://gitlab.com/x/y')).toThrow(/Link não reconhecido/);
    expect(() => lerLinkGithub('C:\\pasta')).toThrow(/Link não reconhecido/);
  });

  it('destinoDoEscopo usa tavir-externo e tavir-interno', () => {
    const base = tmp('tavir-base-');
    expect(destinoDoEscopo('externo', 'Loja Aurora', base)).toBe(path.join(base, 'tavir-externo', 'loja-aurora'));
    expect(destinoDoEscopo('interno', 'App', base)).toBe(path.join(base, 'tavir-interno', 'app'));
    expect(destinoDoEscopo('externo', 'x', base)).not.toMatch(/exterrno/);
  });

  it('copiarPasta pula node_modules e build, mantém .git e .env e não toca a origem', () => {
    const origem = tmp('tavir-orig-');
    fs.mkdirSync(path.join(origem, 'node_modules', 'react'), { recursive: true });
    fs.writeFileSync(path.join(origem, 'node_modules', 'react', 'index.js'), 'x');
    fs.mkdirSync(path.join(origem, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(origem, 'dist', 'app.js'), 'x');
    fs.mkdirSync(path.join(origem, 'src'), { recursive: true });
    fs.writeFileSync(path.join(origem, 'src', 'a.ts'), 'export {}');
    fs.writeFileSync(path.join(origem, '.env'), 'A=1');
    git(origem, 'init', '-q');
    const antes = fs.readdirSync(origem).sort();
    const destino = path.join(tmp('tavir-dest-'), 'tavir-externo', 'proj');
    copiarPasta({ origem, destino });
    expect(fs.existsSync(path.join(destino, 'node_modules'))).toBe(false);
    expect(fs.existsSync(path.join(destino, 'dist'))).toBe(false);
    expect(fs.existsSync(path.join(destino, '.git', 'HEAD'))).toBe(true);
    expect(fs.readFileSync(path.join(destino, '.env'), 'utf8')).toBe('A=1');
    expect(fs.existsSync(path.join(destino, 'src', 'a.ts'))).toBe(true);
    expect(fs.readdirSync(origem).sort()).toEqual(antes);
    expect(fs.existsSync(path.join(origem, 'node_modules', 'react', 'index.js'))).toBe(true);
  });

  it('destino ocupado recusa e não sobrescreve', () => {
    const origem = tmp('tavir-orig-');
    fs.writeFileSync(path.join(origem, 'a.txt'), 'novo');
    const destino = tmp('tavir-ocupado-');
    fs.writeFileSync(path.join(destino, 'a.txt'), 'antigo');
    expect(() => copiarPasta({ origem, destino })).toThrow(/já existe/);
    expect(fs.readFileSync(path.join(destino, 'a.txt'), 'utf8')).toBe('antigo');
  });

  it('clone de repositório local cai na pasta do escopo', async () => {
    const repo = tmp('tavir-repo-');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.name', 'T');
    git(repo, 'config', 'user.email', 't@t');
    git(repo, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'repo-cliente', dependencies: { next: '15' } }));
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'base');
    const base = tmp('tavir-base-');
    const destino = destinoDoEscopo('externo', 'Repo Cliente', base);
    await clonarRepo({ origem: repo, destino });
    expect(destino.startsWith(path.join(base, 'tavir-externo'))).toBe(true);
    expect(fs.existsSync(path.join(destino, 'package.json'))).toBe(true);
    expect(git(destino, 'log', '-1', '--pretty=%s')).toBe('base');
  });

  it('prepararAbsorcao de pasta copia e preenche nome e stack', async () => {
    const origem = tmp('tavir-orig-');
    fs.writeFileSync(path.join(origem, 'package.json'), JSON.stringify({ name: 'site-cliente', dependencies: { next: '15', stripe: '1' } }));
    const base = tmp('tavir-base-');
    const linhas: string[] = [];
    const res = await prepararAbsorcao({ fonte: 'pasta', path: origem, ownership: 'externo', base, onLine: (l) => linhas.push(l) });
    expect(res.ok).toBe(true);
    expect(res.destino).toBe(path.join(base, 'tavir-externo', 'site-cliente'));
    expect(res.preenchido!.nome).toBe('site-cliente');
    expect(res.preenchido!.stack).toContain('Next.js');
    expect(linhas.join('\n')).toMatch(/intacta/);
  });
});
