import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  currentBranch,
  cycleBranchName,
  cycleCommits,
  dirtyTracked,
  ensureCycleBranch,
  githubRemote,
  mergeCycleLocal,
  returnToBase,
  slugify,
} from '../../src/main/cycleBranch';
import {
  addGitAccount,
  gitAuthEnv,
  listGitAccounts,
  maskToken,
  removeGitAccount,
  resolveGitAccount,
  scrubToken,
  setDefaultGitAccount,
  getGitAccountToken,
} from '../../src/main/gitAccounts';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();

function repo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-ciclo-'));
  git(dir, 'init', '-q', '-b', 'master');
  git(dir, 'config', 'user.name', 'QA');
  git(dir, 'config', 'user.email', 'qa@tavir.local');
  git(dir, 'config', 'core.autocrlf', 'false');
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>loja</h1>\n');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1);\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return dir;
}

function commitFile(dir: string, file: string, body: string, msg: string) {
  fs.writeFileSync(path.join(dir, file), body);
  git(dir, 'add', '--', file);
  git(dir, 'commit', '-q', '-m', msg);
}

describe('branch por ciclo do trilho', { timeout: 30000 }, () => {
  it('nome da branch sai do assunto, sem acento nem espaço', () => {
    expect(slugify('Corrigir formulário de contato e rodapé!')).toBe('corrigir-formulario-de-contato-e');
    expect(cycleBranchName(3, 'Ajustar preço da oferta')).toBe('tavir/ciclo-3-ajustar-preco-da-oferta');
    expect(cycleBranchName(0, '')).toBe('tavir/ciclo-1-ajuste');
  });

  it('cria a branch do ciclo a partir da branch atual', () => {
    const dir = repo();
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'Botão de compra' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.created).toBe(true);
    expect(res.branch).toMatchObject({ name: 'tavir/ciclo-1-botao-de-compra', base: 'master' });
    expect(currentBranch(dir)).toBe('tavir/ciclo-1-botao-de-compra');
  });

  it('arquivo novo e pastas da Fábrica não travam a troca de branch', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'novo.txt'), 'x');
    fs.mkdirSync(path.join(dir, '.tavir'));
    fs.writeFileSync(path.join(dir, '.tavir', 'control.json'), '{}');
    expect(dirtyTracked(dir)).toEqual([]);
    expect(ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' }).ok).toBe(true);
  });

  it('para e pergunta quando há arquivo versionado alterado', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(2);\n');
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.dirty).toEqual(['app.js']);
    expect(currentBranch(dir)).toBe('master');
  });

  it('guardar no stash leva a alteração solta e abre a branch', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(2);\n');
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x', resolve: 'stash' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.branch?.stash).toBeTruthy();
    expect(currentBranch(dir)).toBe('tavir/ciclo-1-x');
    expect(fs.readFileSync(path.join(dir, 'app.js'), 'utf8')).toBe('console.log(1);\n');
    expect(git(dir, 'stash', 'list')).toContain('alterações soltas');
  });

  it('seguir aqui roda o ciclo na branch atual, sem branch própria', () => {
    const dir = repo();
    fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(2);\n');
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x', resolve: 'here' });
    expect(res.ok && res.branch).toMatchObject({ name: 'master', here: true });
    expect(currentBranch(dir)).toBe('master');
  });

  it('volta para a branch do ciclo se alguém trocou, e não duplica nome', () => {
    const dir = repo();
    const first = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' });
    if (!first.ok) throw new Error(first.error);
    git(dir, 'checkout', '-q', 'master');
    const again = ensureCycleBranch(dir, first.branch, { cycleNo: 1, title: 'x' });
    expect(again.ok && again.created).toBe(false);
    expect(currentBranch(dir)).toBe('tavir/ciclo-1-x');
    git(dir, 'checkout', '-q', 'master');
    const other = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' });
    expect(other.ok && other.branch?.name).toBe('tavir/ciclo-1-x-2');
  });

  it('lista os commits do ciclo e junta na principal com --no-ff', () => {
    const dir = repo();
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'oferta' });
    if (!res.ok || !res.branch) throw new Error('sem branch');
    commitFile(dir, 'app.js', 'console.log(3);\n', 'tavir: trilho · Ajustar (Dev)');
    commitFile(dir, 'index.html', '<h1>loja nova</h1>\n', 'tavir: trilho · Validar & build (QA)');
    const commits = cycleCommits(dir, res.branch);
    expect(commits.map((c) => c.subject)).toEqual(['tavir: trilho · Validar & build (QA)', 'tavir: trilho · Ajustar (Dev)']);
    const merged = mergeCycleLocal(dir, res.branch, 'tavir: ciclo 1 · oferta');
    expect(merged.ok).toBe(true);
    expect(currentBranch(dir)).toBe('master');
    expect(git(dir, 'log', '-1', '--format=%P').split(' ').length).toBe(2); // merge commit de verdade
    expect(fs.readFileSync(path.join(dir, 'app.js'), 'utf8')).toBe('console.log(3);\n');
  });

  it('conflito ao juntar desfaz o merge e volta para a branch do ciclo', () => {
    const dir = repo();
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' });
    if (!res.ok || !res.branch) throw new Error('sem branch');
    commitFile(dir, 'app.js', 'console.log("ciclo");\n', 'ciclo');
    git(dir, 'checkout', '-q', 'master');
    commitFile(dir, 'app.js', 'console.log("master");\n', 'master');
    git(dir, 'checkout', '-q', res.branch.name);
    const merged = mergeCycleLocal(dir, res.branch, 'tavir: ciclo 1');
    expect(merged.ok).toBe(false);
    expect(merged.error).toMatch(/Conflito/);
    expect(currentBranch(dir)).toBe(res.branch.name);
    expect(dirtyTracked(dir)).toEqual([]);
  });

  it('próximo ciclo volta para a branch de origem só se estiver limpo', () => {
    const dir = repo();
    const res = ensureCycleBranch(dir, null, { cycleNo: 1, title: 'x' });
    if (!res.ok || !res.branch) throw new Error('sem branch');
    fs.writeFileSync(path.join(dir, 'app.js'), 'sujo\n');
    expect(returnToBase(dir, res.branch)).toBe(false);
    git(dir, 'checkout', '--', 'app.js');
    expect(returnToBase(dir, res.branch)).toBe(true);
    expect(currentBranch(dir)).toBe('master');
  });

  it('reconhece remoto do GitHub em https e ssh', () => {
    const dir = repo();
    expect(githubRemote(dir)).toBeNull();
    git(dir, 'remote', 'add', 'origin', 'git@github.com:empresatavir/loja-aurora.git');
    expect(githubRemote(dir)).toEqual({ owner: 'empresatavir', repo: 'loja-aurora' });
    git(dir, 'remote', 'set-url', 'origin', 'https://github.com/CarlosHenriqJr/site.pessoal');
    expect(githubRemote(dir)).toEqual({ owner: 'CarlosHenriqJr', repo: 'site.pessoal' });
    git(dir, 'remote', 'set-url', 'origin', 'https://gitlab.com/a/b.git');
    expect(githubRemote(dir)).toBeNull();
  });
});

describe('contas do GitHub no cofre', () => {
  const fakeToken = (n: string) => 'ghp_' + n.repeat(36).slice(0, 36);
  const user = (login: string, scopes = ['repo', 'read:org']) => async () => ({ login, name: login, avatar: '', scopes });
  let dir = '';
  afterEach(() => {
    vi.restoreAllMocks();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });
  const isolate = () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-contas-'));
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
  };

  it('guarda cifrado e a tela só vê a prévia', async () => {
    isolate();
    const token = fakeToken('a');
    const res = await addGitAccount({ label: 'TAVIR', token }, user('tavir-bot'));
    expect(res.ok).toBe(true);
    expect(res.account).toMatchObject({ login: 'tavir-bot', label: 'TAVIR', is_default: true, canPush: true, preview: maskToken(token) });
    expect(JSON.stringify(res)).not.toContain(token);
    const raw = fs.readFileSync(path.join(dir, 'db', 'git_accounts.json'), 'utf8');
    expect(raw).not.toContain(token);
    expect(raw).toContain('"v2:');
    expect(getGitAccountToken(res.account!.id)).toBe(token);
  });

  it('token recusado não entra no cofre', async () => {
    isolate();
    const res = await addGitAccount({ label: 'Pessoal', token: fakeToken('b') }, async () => {
      throw new Error('Token recusado pelo GitHub (inválido ou expirado).');
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/recusado/);
    expect(listGitAccounts()).toEqual([]);
  });

  it('escolhe a conta pelo perfil git do projeto, depois a padrão', async () => {
    isolate();
    const t = await addGitAccount({ label: 'TAVIR', token: fakeToken('c') }, user('tavir-bot'));
    const p = await addGitAccount({ label: 'Pessoal', token: fakeToken('d') }, user('CarlosHenriqJr'));
    expect(resolveGitAccount({ profile: 'Pessoal (Carlos)' })?.login).toBe('CarlosHenriqJr');
    expect(resolveGitAccount({ profile: 'TAVIR (Empresa)' })?.login).toBe('tavir-bot');
    expect(resolveGitAccount({ accountId: p.account!.id, profile: 'TAVIR (Empresa)' })?.login).toBe('CarlosHenriqJr');
    setDefaultGitAccount(p.account!.id);
    expect(resolveGitAccount({})?.login).toBe('CarlosHenriqJr');
    removeGitAccount(p.account!.id);
    expect(listGitAccounts().map((a) => [a.login, a.is_default])).toEqual([['tavir-bot', true]]);
    expect(t.ok).toBe(true);
  });

  it('mesma conta de novo troca o token em vez de duplicar', async () => {
    isolate();
    await addGitAccount({ label: 'TAVIR', token: fakeToken('e') }, user('tavir-bot', ['public_repo']));
    const again = await addGitAccount({ label: 'TAVIR', token: fakeToken('f') }, user('tavir-bot'));
    expect(listGitAccounts()).toHaveLength(1);
    expect(getGitAccountToken(again.account!.id)).toBe(fakeToken('f'));
  });

  it('sem escopo repo a conta avisa que não publica', async () => {
    isolate();
    const res = await addGitAccount({ label: 'TAVIR', token: fakeToken('g') }, user('leitor', ['read:org']));
    expect(res.account?.canPush).toBe(false);
  });

  it('token vai por ambiente, nunca em argumento, e some do texto de erro', () => {
    const token = fakeToken('h');
    const env = gitAuthEnv(token);
    expect(env.GIT_CONFIG_KEY_0).toBe('http.https://github.com/.extraheader');
    expect(env.GIT_CONFIG_VALUE_0).toBe('AUTHORIZATION: basic ' + Buffer.from('x-access-token:' + token).toString('base64'));
    expect(env.GIT_TERMINAL_PROMPT).toBe('0');
    const basic = Buffer.from('x-access-token:' + token).toString('base64');
    expect(scrubToken(`fatal: ${token} e ${basic}`, token)).toBe('fatal: •••• e ••••');
  });
});
