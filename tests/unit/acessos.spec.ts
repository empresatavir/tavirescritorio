import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SERVICOS } from '../../src/shared/absorcao';
import { GUIAS, SEM_CREDENCIAL, CREDENCIAL_DE, guiaDe, servicoDoCartao } from '../../src/shared/acessos';
import { gerarCartoes, listarAcessos, salvarAcesso, lerSegredoDoProjeto, mudarSituacao, removerAcesso, conferirAcesso, acessosPath, credenciaisPath } from '../../src/main/acessos';
import { gravarRetrato } from '../../src/main/absorcao/retrato';
import type { Retrato } from '../../src/shared/absorcao';

function projeto(servicos: Array<[string, string, 'confirmado' | 'indicio']>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-acessos-'));
  const r: Retrato = {
    versao: 1, projeto: path.basename(root), lido_em: new Date().toISOString(), commit: null, stack: [], linguagens: [],
    servicos: servicos.map(([servico, nome, grau]) => ({ servico, nome, assunto: 'deploy', grau, provas: [{ tipo: 'dep', arquivo: 'package.json', linha: 3 }] })),
    repositorios: [], monorepo: [], dependencias: [], comandos: [], env: [], designSystem: { sinais: [] }, cobertura: [], passos: [],
  };
  gravarRetrato(root, r);
  return root;
}

const TOKEN = 'vercel_SEGREDO_abcdef1234567890';

describe('cartões de acesso', () => {
  it('nascem dos serviços do retrato, mais o GitHub', () => {
    const root = projeto([['vercel', 'Vercel', 'confirmado'], ['supabase-auth', 'Supabase Auth', 'indicio'], ['prisma', 'Prisma', 'confirmado'], ['sendgrid', 'SendGrid', 'indicio']]);
    const cs = gerarCartoes(root).map((c) => c.servico);
    expect(cs).toContain('github');
    expect(cs).toContain('vercel');
    expect(cs).toContain('supabase'); // Supabase Auth usa a credencial do Supabase
    expect(cs).toContain('sendgrid'); // sem guia: campo genérico
    expect(cs).not.toContain('prisma'); // não pede credencial
    const v = listarAcessos(root).find((c) => c.servico === 'vercel')!;
    expect(v.motivo).toMatch(/package\.json:3/);
    expect(v.situacao).toBe('pendente');
    expect(listarAcessos(root).find((c) => c.servico === 'sendgrid')!.guia.generico).toBe(true);
  });

  it('gerar de novo preserva o preenchido e acrescenta serviço novo', () => {
    const root = projeto([['vercel', 'Vercel', 'confirmado']]);
    gerarCartoes(root);
    expect(salvarAcesso(root, 'vercel', { token: TOKEN, projeto: 'loja' }).ok).toBe(true);
    const r = JSON.parse(fs.readFileSync(path.join(root, '.tavir', 'retrato.json'), 'utf8'));
    r.servicos.push({ servico: 'stripe', nome: 'Stripe', assunto: 'pagamento', grau: 'confirmado', provas: [] });
    fs.writeFileSync(path.join(root, '.tavir', 'retrato.json'), JSON.stringify(r));
    const cs = gerarCartoes(root);
    const v = cs.find((c) => c.servico === 'vercel')!;
    expect(v.situacao).toBe('preenchido');
    expect(v.campos.token.preenchido).toBe(true);
    expect(cs.some((c) => c.servico === 'stripe')).toBe(true);
    expect(lerSegredoDoProjeto(root, 'vercel', 'token')).toBe(TOKEN);
  });

  it('o valor salvo não aparece em claro em acessos.json, credentials.json nem na listagem', () => {
    const root = projeto([['vercel', 'Vercel', 'confirmado']]);
    const r = salvarAcesso(root, 'vercel', { token: TOKEN, projeto: 'loja' });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
    expect(fs.readFileSync(acessosPath(root), 'utf8')).not.toContain(TOKEN);
    expect(fs.readFileSync(credenciaisPath(root), 'utf8')).not.toContain(TOKEN);
    expect(JSON.stringify(listarAcessos(root))).not.toContain(TOKEN);
    expect(listarAcessos(root).find((c) => c.servico === 'vercel')!.campos.token.previa).toMatch(/…/);
  });

  it('credencial do projeto A não é lida pelo projeto B', () => {
    const a = projeto([['vercel', 'Vercel', 'confirmado']]);
    const b = projeto([['vercel', 'Vercel', 'confirmado']]);
    salvarAcesso(a, 'vercel', { token: TOKEN });
    expect(lerSegredoDoProjeto(b, 'vercel', 'token')).toBe('');
    expect(listarAcessos(b).find((c) => c.servico === 'vercel')!.campos.token.preenchido).toBe(false);
  });

  it('situação, remover e conferência sem vazar o token', async () => {
    const root = projeto([['vercel', 'Vercel', 'confirmado'], ['stripe', 'Stripe', 'confirmado']]);
    gerarCartoes(root);
    expect(mudarSituacao(root, 'stripe', 'pedir_ao_cliente').cartao!.situacao).toBe('pedir_ao_cliente');
    expect(mudarSituacao(root, 'stripe', 'preenchido').ok).toBe(false); // falta campo
    salvarAcesso(root, 'vercel', { token: TOKEN, projeto: 'loja' });
    const ok = await conferirAcesso(root, 'vercel', async () => 'carlos · carlos@exemplo');
    expect(ok.cartao!.conferido!.ok).toBe(true);
    const ruim = await conferirAcesso(root, 'vercel', async (_s, t) => { throw new Error('recusado ' + t); });
    expect(ruim.ok).toBe(false);
    expect(JSON.stringify(ruim)).not.toContain(TOKEN);
    expect((await conferirAcesso(root, 'stripe')).ok).toBe(false); // Stripe: sem conferência
    removerAcesso(root, 'vercel');
    expect(lerSegredoDoProjeto(root, 'vercel', 'token')).toBe('');
  });
});

describe('catálogo de guias', () => {
  it('todo serviço do catálogo de A1 está classificado: guia, credencial de outro, sem credencial ou genérico', () => {
    const comGuia = new Set(GUIAS.map((g) => g.servico));
    for (const s of SERVICOS) {
      const alvo = servicoDoCartao(s.id);
      if (!alvo) { expect(SEM_CREDENCIAL.has(s.id)).toBe(true); continue; }
      if (CREDENCIAL_DE[s.id]) expect(comGuia.has(alvo)).toBe(true);
      expect(guiaDe(alvo, s.nome).campos.length).toBeGreaterThan(0);
    }
  });
  it('guia tem endereço e de 3 a 6 passos, e o pedido ao cliente', () => {
    for (const g of GUIAS) {
      expect(g.onde.url).toMatch(/^https:\/\//);
      expect(g.onde.passos.length).toBeGreaterThanOrEqual(3);
      expect(g.onde.passos.length).toBeLessThanOrEqual(6);
      expect(g.pedidoAoCliente.length).toBeGreaterThan(40);
    }
    for (const id of ['github', 'vercel', 'netlify', 'supabase', 'cloudflare', 'firebase', 'stripe', 'mercadopago', 'resend', 'openai', 'anthropic']) expect(GUIAS.some((g) => g.servico === id)).toBe(true);
  });
});
