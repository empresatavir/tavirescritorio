import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CODE_RULES, SECRET_RULES, isPlaceholder, jwtRole, maskSecret } from '../../src/main/seg/segRules';
import { SEG_ITEMS, listSegRuns, runSeg, segItemsOfFinding, segSummary, setSegAccept } from '../../src/main/seg/segScanner';

// Valores montados em tempo de execução para o próprio repositório não carregar "segredos".
const fake = (prefix: string, n: number) => prefix + 'Q7v'.repeat(Math.ceil(n / 3)).slice(0, n);
const rule = (id: string) => CODE_RULES.find((r) => r.id === id)!;
const hits = (id: string, line: string) => rule(id).re.test(rule(id).strip ? line.replace(rule(id).strip!, '') : line);

function projeto(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-segspec-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  const git = (...a: string[]) => execFileSync('git', a, { cwd: dir, stdio: 'pipe', windowsHide: true });
  git('init', '-q');
  git('config', 'user.name', 'QA');
  git('config', 'user.email', 'qa@tavir.local');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return dir;
}

describe('regras de segredo', () => {
  it('reconhece as chaves dos provedores', () => {
    const find = (s: string) => SECRET_RULES.find((r) => r.re.test(s))?.id;
    expect(find(`k = "${fake('sk_live_', 28)}"`)).toBe('stripe');
    expect(find(`t = "${fake('ghp_', 36)}"`)).toBe('github');
    expect(find('-----BEGIN RSA PRIVATE KEY-----')).toBe('chave-privada');
    expect(find('DATABASE_URL=postgres://admin:Sup3r@db:5432/x')).toBe('url-banco');
  });

  it('ignora exemplo, variável e valor de teste', () => {
    expect(isPlaceholder('changeme')).toBe(true);
    expect(isPlaceholder('${API_KEY}')).toBe(true);
    expect(isPlaceholder('process.env.SECRET')).toBe(true);
    expect(isPlaceholder('sk-ant-api03-test-secret-key-1234567890')).toBe(true);
    expect(isPlaceholder('S3nh4F0rte!2024')).toBe(false);
  });

  it('mascara o segredo e lê o papel do JWT', () => {
    const v = fake('sk_live_', 28);
    expect(maskSecret(v)).not.toContain(v.slice(4, -2));
    expect(maskSecret(v).startsWith('sk_l')).toBe(true);
    const jwt = (role: string) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'assinaturaassinatura'].join('.');
    expect(jwtRole(jwt('anon'))).toBe('anon');
    expect(jwtRole(jwt('service_role'))).toBe('service_role');
  });
});

describe('regras de código', () => {
  it('separa exec de shell de RegExp.exec', () => {
    expect(hits('exec-dinamico', 'exec(`tar czf ${nome}.tgz`)')).toBe(true);
    expect(hits('exec-dinamico', "child_process.execSync('rm ' + alvo)")).toBe(true);
    expect(hits('exec-dinamico', 'const m = re.exec(texto)')).toBe(false);
    expect(hits('exec-dinamico', 'while ((m = regex.exec(css)))')).toBe(false);
  });

  it('SQL concatenado sim, IN (${placeholders}) não', () => {
    expect(hits('sql-concat', 'db.query(`SELECT * FROM t WHERE id = ${id}`)')).toBe(true);
    expect(hits('sql-concat', 'cur.execute(f"DELETE FROM a WHERE id = {x}")')).toBe(true);
    expect(hits('sql-concat', 'run(`DELETE FROM e WHERE id IN (${marks})`, ids)')).toBe(false);
  });

  it('TLS desligado, Electron sem isolamento e innerHTML dinâmico', () => {
    expect(hits('tls-off', 'https.request({ rejectUnauthorized: false })')).toBe(true);
    expect(hits('electron-node', 'webPreferences: { contextIsolation: false }')).toBe(true);
    expect(hits('innerhtml', "el.innerHTML = params.get('q')")).toBe(true);
    expect(hits('innerhtml', "el.innerHTML = ''")).toBe(false);
  });
});

describe('varredura', () => {
  it('reprova, mascara, marca corrigido e respeita o risco aceito', async () => {
    const stripe = fake('sk_live_', 28);
    const ws = projeto({
      'index.html': '<!doctype html><html lang="pt-BR"><head><title>x</title><script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script></head><body><input type="email" name="email"></body></html>',
      'app.js': `const k = "${stripe}";\nel.innerHTML = location.hash;\n`,
    });
    const first = await runSeg({ workspace: ws, projectName: 'Teste' });
    expect(first.ok).toBe(false);
    expect(first.findings.map((f) => f.key)).toEqual(expect.arrayContaining(['secrets', 'xss', 'csp', 'cookies', 'consent']));
    expect(fs.readFileSync(first.report, 'utf8')).not.toContain(stripe);
    expect(JSON.stringify(first)).not.toContain(stripe);
    expect(segSummary(first).split('\n')[0]).toMatch(/^Segurança reprovada · \d+ achado/);

    // Corrige o XSS e aceita o rastreador: sobra só o Stripe bloqueando.
    fs.writeFileSync(path.join(ws, 'app.js'), `const k = "${stripe}";\nel.textContent = location.hash;\n`);
    const tracker = first.findings.find((f) => f.key === 'cookies')!;
    setSegAccept(ws, tracker.fp, { by: 'Teste', note: 'banner entra na próxima sprint' });
    const second = await runSeg({ workspace: ws, projectName: 'Teste' });
    expect(second.findings.find((f) => f.key === 'xss')?.st).toBe('corrigida');
    expect(second.findings.find((f) => f.fp === tracker.fp)?.st).toBe('aceita');
    expect(second.blocking).toBe(1);
    expect(listSegRuns(ws).map((r) => r.id)).toEqual([first.id, second.id]);
  }, 240000); // a varredura roda as ferramentas reais; cada uma tem até 180 s no segScanner

  it('acha o segredo que só ficou no histórico do Git', async () => {
    const ws = projeto({ 'old.js': `const t = "${fake('ghp_', 36)}";\n` });
    fs.unlinkSync(path.join(ws, 'old.js'));
    execFileSync('git', ['commit', '-qam', 'remove'], { cwd: ws, stdio: 'pipe', windowsHide: true });
    const run = await runSeg({ workspace: ws, projectName: 'Teste' });
    const hist = run.findings.filter((f) => f.key === 'history');
    expect(hist).toHaveLength(1);
    expect(hist[0].where).toMatch(/^commit [0-9a-f]{7} · old\.js$/);
    expect(hist[0].ev).not.toContain(fake('ghp_', 36));
  }, 240000); // a varredura roda as ferramentas reais; cada uma tem até 180 s no segScanner
});

describe('varredura por itens', () => {
  const finais = ['ok', 'problema', 'erro', 'nao_aplica'];

  it('a completa passa por todos os itens, em ordem, e registra status e hora de cada um', async () => {
    const ws = projeto({ 'app.js': `const k = "${fake('sk_live_', 28)}";\nel.innerHTML = location.hash;\n` });
    const vistos: string[] = [];
    const run = await runSeg({ workspace: ws, projectName: 'Teste', onItem: (ev) => { const it = ev.items[ev.index]; if (it.status === 'rodando') vistos.push(it.key); } });
    expect(run.mode).toBe('completa');
    expect(run.items!.map((i) => i.key)).toEqual(SEG_ITEMS.map((i) => i.key));
    // Nenhum item pulado: todos terminam com um status final e a hora da verificação.
    for (const it of run.items!) {
      expect(finais).toContain(it.status);
      expect(it.at).toBeTruthy();
      expect(it.from).toBe(run.id);
    }
    expect(vistos).toEqual(SEG_ITEMS.map((i) => i.key));
    const byKey = Object.fromEntries(run.items!.map((i) => [i.key, i]));
    expect(byKey.segredos.status).toBe('problema');
    expect(byKey.codigo.status).toBe('problema');
    expect(byKey.historico.status).toBe('ok');
    // Todo achado aponta para um item da lista.
    for (const f of run.findings) expect(segItemsOfFinding(f).length).toBeGreaterThan(0);
  }, 240000);

  it('a isolada roda só o item pedido e mantém os demais como estavam', async () => {
    const stripe = fake('sk_live_', 28);
    const ws = projeto({ 'app.js': `const k = "${stripe}";\nel.innerHTML = location.hash;\n` });
    const full = await runSeg({ workspace: ws, projectName: 'Teste' });
    // Corrige o XSS e também o segredo, mas roda só o item de código.
    fs.writeFileSync(path.join(ws, 'app.js'), 'const k = process.env.STRIPE_KEY;\nel.textContent = location.hash;\n');
    const rodados: string[] = [];
    const iso = await runSeg({ workspace: ws, projectName: 'Teste', only: 'codigo', onItem: (ev) => { const it = ev.items[ev.index]; if (it.status === 'rodando') rodados.push(it.key); } });
    expect(iso.id).not.toBe(full.id);
    expect(iso.mode).toBe('isolada');
    expect(rodados).toEqual(['codigo']);
    const byKey = Object.fromEntries(iso.items!.map((i) => [i.key, i]));
    expect(byKey.codigo.status).toBe('ok');
    expect(byKey.codigo.from).toBe(iso.id);
    expect(byKey.segredos.status).toBe('problema');
    expect(byKey.segredos.from).toBe(full.id);
    expect(iso.findings.find((f) => f.key === 'xss')?.st).toBe('corrigida');
    // O segredo saiu do código, mas o item de segredos não rodou: continua aberto até ser verificado.
    expect(iso.findings.find((f) => f.key === 'secrets')?.st).toBe('aberta');
    expect(JSON.stringify(iso)).not.toContain(stripe);
    expect(fs.readFileSync(path.join(iso.dir, 'itens.json'), 'utf8')).not.toContain(stripe);
  }, 240000);

  it('cancelar preserva o que já rodou e não dá como corrigido o que não foi verificado', async () => {
    const ws = projeto({ 'app.js': `el.innerHTML = location.hash;\n` });
    const full = await runSeg({ workspace: ws, projectName: 'Teste' });
    fs.writeFileSync(path.join(ws, 'app.js'), 'el.textContent = location.hash;\n');
    let kill: () => void = () => {};
    const run = await runSeg({
      workspace: ws, projectName: 'Teste', registerKill: (k) => { kill = k; },
      onItem: (ev) => { if (ev.items[ev.index].key === 'segredos' && ev.items[ev.index].status !== 'rodando') kill(); },
    });
    expect(run.cancelled).toBe(true);
    expect(run.ok).toBe(false);
    const byKey = Object.fromEntries(run.items!.map((i) => [i.key, i]));
    expect(byKey.segredos.from).toBe(run.id);
    expect(byKey.segredos.cancelled).toBeFalsy();
    expect(byKey.codigo.cancelled).toBe(true);
    expect(byKey.codigo.from).toBe(full.id);
    expect(run.findings.find((f) => f.key === 'xss')?.st).toBe('aberta');
    expect(listSegRuns(ws).map((r) => r.id)).toEqual([full.id, run.id]);
  }, 240000);
});
