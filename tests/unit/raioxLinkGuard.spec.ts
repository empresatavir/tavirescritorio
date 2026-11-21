import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MotorResult } from '../../src/main/motors';
import { analyse } from '../../src/main/raiox/raioxAnalyse';
import { checkLink, forbiddenContent, isBlockedAddress, shapeProblem, verifyCaseLinks } from '../../src/main/raiox/linkGuard';
import { createCase, RaioxError, updateFrontier } from '../../src/main/raiox/raioxRules';
import { writeCase } from '../../src/main/raiox/raioxStore';

const NOW = '2026-11-21T10:00:00.000Z';
const UUID = 'a1b2c3d4-77da-43da-bfd4-5c51eb908253';
const dirs: string[] = [];
function temp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'raiox-link-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

/** DNS falso: nome → endereços. */
function dns(map: Record<string, string[]>) {
  return async (host: string) => {
    if (!(host in map)) throw new Error('ENOTFOUND');
    return map[host];
  };
}

/** HTTP falso: URL → status e Location. Registra o que foi acessado. */
function http(map: Record<string, { status: number; location?: string }>, seen: string[] = []) {
  return (async (url: string) => {
    seen.push(String(url));
    const hit = map[String(url)] ?? { status: 200 };
    return new Response(null, { status: hit.status, headers: hit.location ? { location: hit.location } : {} });
  }) as unknown as typeof fetch;
}

describe('G-PR1 controle 5 — forma do link', () => {
  it('aceita link público comum', () => {
    expect(shapeProblem('https://www.instagram.com/loja/')).toBeNull();
    expect(shapeProblem('https://www.google.com/maps/place/Loja/@-22.9,-43.5,17z?entry=ttu')).toBeNull();
    expect(shapeProblem('https://wa.me/5521965014443')).toBeNull();
  });

  it.each([
    ['http://localhost:9001/', 'porta'],
    ['http://localhost/', 'rede interna'],
    ['http://127.0.0.1/', 'IP direto'],
    ['http://[::1]/', 'IP direto'],
    ['http://169.254.169.254/latest/meta-data', 'IP direto'],
    ['http://metadata.google.internal/', 'rede interna'],
    ['http://intranet/', 'rede interna'],
    ['file:///C:/Windows/win.ini', 'protocolo'],
    ['ftp://loja.com.br/', 'protocolo'],
    ['https://user:pw@loja.com.br/', 'usuário ou senha'],
    ['https://drive.google.com/file/d/abc/view', 'arquivo compartilhado'],
    ['https://loja.com.br/contrato.pdf', 'documento'],
    ['https://loja.com.br/painel?token=abc', 'credencial'],
  ])('bloqueia %s', (url, why) => {
    expect(shapeProblem(url)).toContain(why);
  });

  it('reconhece endereço interno, inclusive IPv4 dentro de IPv6', () => {
    for (const ip of ['10.1.2.3', '172.20.0.1', '192.168.0.10', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
    for (const ip of ['142.250.79.36', '2800:3f0:4001:80a::2004']) expect(isBlockedAddress(ip), ip).toBe(false);
  });
});

describe('G-PR1 controle 5 — DNS e redirect', () => {
  it('bloqueia nome público que resolve para IP privado (DNS rebinding)', async () => {
    const r = await checkLink('https://loja.exemplo.com.br/', { lookup: dns({ 'loja.exemplo.com.br': ['10.0.0.8'] }), fetch: http({}) });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('rede interna');
  });

  it('bloqueia redirect para rede interna sem acessar o destino', async () => {
    const seen: string[] = [];
    const r = await checkLink('https://loja.com.br/', {
      lookup: dns({ 'loja.com.br': ['200.1.1.1'], 'painel.loja.com.br': ['192.168.1.1'] }),
      fetch: http({ 'https://loja.com.br/': { status: 302, location: 'https://painel.loja.com.br/admin' } }, seen),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('redirect para painel.loja.com.br');
    expect(seen).toEqual(['https://loja.com.br/']);
  });

  it('bloqueia redirect para IP direto e para localhost', async () => {
    const lookup = dns({ 'loja.com.br': ['200.1.1.1'] });
    const toIp = await checkLink('https://loja.com.br/', { lookup, fetch: http({ 'https://loja.com.br/': { status: 301, location: 'http://127.0.0.1:8080/' } }) });
    expect(toIp.ok).toBe(false);
    const toLocal = await checkLink('https://loja.com.br/', { lookup, fetch: http({ 'https://loja.com.br/': { status: 307, location: 'http://localhost/' } }) });
    expect(toLocal.ok).toBe(false);
  });

  it('segue redirect público e grava o destino final', async () => {
    const r = await checkLink('http://loja.com.br/', {
      lookup: dns({ 'loja.com.br': ['200.1.1.1'], 'www.loja.com.br': ['200.1.1.2'] }),
      fetch: http({ 'http://loja.com.br/': { status: 301, location: 'https://www.loja.com.br/' } }),
    });
    expect(r).toMatchObject({ ok: true, final: 'https://www.loja.com.br/' });
  });

  it('para depois de 5 redirects', async () => {
    const map: Record<string, { status: number; location?: string }> = {};
    for (let i = 0; i < 10; i += 1) map[`https://loja.com.br/${i}`] = { status: 302, location: `https://loja.com.br/${i + 1}` };
    const r = await checkLink('https://loja.com.br/0', { lookup: dns({ 'loja.com.br': ['200.1.1.1'] }), fetch: http(map) });
    expect(r).toMatchObject({ ok: false, reason: 'redirects demais' });
  });

  it('nome que não existe no DNS é bloqueado', async () => {
    const r = await checkLink('https://nao-existe.com.br/', { lookup: dns({}), fetch: http({}) });
    expect(r.ok).toBe(false);
  });
});

describe('G-PR1 controle 5 — caso e análise', () => {
  it('não salva caso com CPF, cartão, senha ou link inseguro', () => {
    const base = { company: 'Casa', objective: 'Ver', decisionNeeded: 'Seguir ou parar' };
    expect(() => createCase({ ...base, contact: 'João CPF 123.456.789-09' }, NOW, UUID)).toThrow(/CPF/);
    expect(() => createCase({ ...base, objective: 'cartão 4111 1111 1111 1111' }, NOW, UUID)).toThrow(/cartão/);
    expect(() => createCase({ ...base, frontier: 'acesso senha: 1234' }, NOW, UUID)).toThrow(/credencial/);
    expect(() => createCase({ ...base, publicLink: 'http://192.168.0.1/' }, NOW, UUID)).toThrow(RaioxError);
    const ok = createCase({ ...base, publicLink: 'https://instagram.com/casa', contact: 'WhatsApp +55 21 96501-4443' }, NOW, UUID);
    expect(() => updateFrontier(ok, { publicLink: 'https://drive.google.com/file/d/x' }, NOW)).toThrow(/arquivo compartilhado/);
  });

  it('forbiddenContent não confunde telefone com cartão', () => {
    expect(forbiddenContent('+55 21 96501-4443')).toBeNull();
    expect(forbiddenContent('5521965014443')).toBeNull();
  });

  it('grava a lista conferida na pasta do caso', async () => {
    const dir = temp();
    const c = createCase({ company: 'Casa', objective: 'Ver', decisionNeeded: 'Seguir', publicLink: 'https://instagram.com/casa https://casa.com.br' }, NOW, UUID);
    const report = await verifyCaseLinks(dir, c, [], {
      lookup: dns({ 'instagram.com': ['157.240.1.1'], 'casa.com.br': ['10.0.0.1'] }),
      fetch: http({}),
      now: () => NOW,
    });
    expect(report.links).toHaveLength(2);
    expect(report.blocked.map((b) => b.url)).toEqual(['https://casa.com.br']);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'analise', 'links-verificados.json'), 'utf8'));
    expect(saved.blocked).toHaveLength(1);
  });

  it('análise não chama o motor quando há link bloqueado', async () => {
    const root = temp();
    const repo = temp();
    fs.mkdirSync(path.join(repo, 'raiox', 'prompts'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'raiox', 'prompts', 'analise.md'), 'Caso {{CASE_ID}}', 'utf8');
    const c = createCase({ company: 'Casa', objective: 'Ver', decisionNeeded: 'Seguir', frontier: 'Sinais públicos.', publicLink: 'https://casa.com.br' }, NOW, UUID);
    writeCase(root, c);
    let called = false;
    const run = async (): Promise<MotorResult> => {
      called = true;
      throw new Error('não devia rodar');
    };
    await expect(analyse(root, c.id, [], {
      repo, run, gitStatus: () => '', now: () => NOW,
      links: (cc) => verifyCaseLinks(path.join(root, cc.id), cc, [], { lookup: dns({ 'casa.com.br': ['127.0.0.1'] }), fetch: http({}) }),
    })).rejects.toThrow(/link bloqueado/);
    expect(called).toBe(false);
  });
});
