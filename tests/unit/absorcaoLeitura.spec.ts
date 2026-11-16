import { beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PASSOS_LEITURA } from '../../src/shared/absorcao';
import { conferirDocumento, type Perguntar } from '../../src/main/absorcao/leitura';
import { decidirRetrato, lerEstado, pararAbsorcao, rodarAbsorcao } from '../../src/main/absorcao/fluxo';
import { lerRetrato } from '../../src/main/absorcao/retrato';
import { detectar } from '../../src/main/absorcao/detectores';
import { gravarRetrato, montarRetrato } from '../../src/main/absorcao/retrato';
import { gravarEstado, novoEstado } from '../../src/main/absorcao/fluxo';
import { criarChamado } from '../../src/main/chamados';

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

function projeto(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-abs-'));
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'loja', dependencies: { next: '15', '@supabase/supabase-js': '2' }, scripts: { dev: 'next dev', build: 'next build' } }),
    '.env.example': 'NEXT_PUBLIC_SUPABASE_URL=\nMERCADOPAGO_ACCESS_TOKEN=\n',
    'README.md': '# Loja\n\nLoja de teste.\n',
    'src/app/page.tsx': 'export default function Page() { return null }\n',
    'src/app/layout.tsx': 'export default function L({ children }) { return children }\n',
    'src/lib/db.ts': "import { createClient } from '@supabase/supabase-js';\nexport const db = createClient('u', 'k');\n",
    'src/lib/pay.ts': "export async function pagar() { return fetch('https://api.mercadopago.com/v1/payments') }\n",
    'src/components/Button.tsx': 'export const Button = () => null;\n',
    'docs/a.md': 'a', 'docs/b.md': 'b', 'docs/c.md': 'c', 'docs/d.md': 'd', 'docs/e.md': 'e', 'docs/f.md': 'f', 'docs/g.md': 'g', 'docs/h.md': 'h', 'docs/i.md': 'i', 'docs/j.md': 'j', 'docs/k.md': 'k', 'docs/l.md': 'l',
  };
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

const CITS = ['`package.json`', '`src/app/page.tsx`', '`src/app/layout.tsx:1`', '`src/lib/db.ts:2`', '`src/components/Button.tsx`', '`README.md`'];

function docBom(secoes: string[], extra = ''): string {
  return `# Doc\n\nResumo do passo em ${CITS[0]}.\n\n` + secoes.map((s, i) => `## ${s}\n\nVer ${CITS[i % CITS.length]} e ${CITS[(i + 1) % CITS.length]}.\n${extra}`).join('\n');
}

/** Motor falso: devolve um documento correto para cada passo, salvo os que o teste mandar errar. */
function motorFalso(opts: { erra?: string[]; chamadas?: string[]; integra?: string; antes?: (passo: string) => void } = {}): Perguntar {
  return async ({ passo }) => {
    opts.chamadas?.push(passo.id);
    opts.antes?.(passo.id);
    if (opts.erra?.includes(passo.id)) return { ok: true, text: `# Ruim\n\n## ${passo.secoes[0]}\n\nVer \`nao/existe.ts\`.`, runId: 'r-' + passo.id };
    if (passo.id === 'integracoes' && opts.integra) return { ok: true, text: opts.integra, runId: 'r-int' };
    return { ok: true, text: docBom(passo.secoes), runId: 'r-' + passo.id };
  };
}

function preparar(dir: string) {
  gravarRetrato(dir, montarRetrato('loja', detectar(dir)));
  const st = novoEstado();
  st.etapas.preparar = { situacao: 'ok' };
  st.etapas.detectores = { situacao: 'ok' };
  gravarEstado(dir, st);
}

describe('checagem de citação', () => {
  const dir = projeto();
  const secoes = ['O que é', 'Para quem', 'Fluxos principais', 'Telas e rotas'];
  it('seção faltando reprova', () => {
    const r = conferirDocumento(dir, docBom(secoes.slice(0, 3)), secoes);
    expect(r.ok).toBe(false);
    expect(r.faltando).toEqual(['Telas e rotas']);
  });
  it('caminho inexistente reprova', () => {
    const r = conferirDocumento(dir, docBom(secoes, 'E `src/fantasma.ts:3`.'), secoes);
    expect(r.ok).toBe(false);
    expect(r.invalidos).toContain('src/fantasma.ts:3');
  });
  it('poucas citações reprovam', () => {
    const t = secoes.map((s) => `## ${s}\n\nVer \`package.json\`.`).join('\n');
    expect(conferirDocumento(dir, t, secoes).ok).toBe(false);
  });
  it('rota de URL entre crases não conta como caminho', () => {
    const r = conferirDocumento(dir, docBom(secoes, 'Rotas `/account`, `/signin/[id]` e `/auth/reset_password`; pacotes `@supabase/ssr` e `@types/node`.'), secoes);
    expect(r.invalidos).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('extensão solta, import de dependência e classe CSS não reprovam', () => {
    const r = conferirDocumento(dir, docBom(secoes, 'Fontes `.woff2` e `.ttf`; import `next/font` e `@supabase/supabase-js/dist`; classe `.height-screen-helper`.'), secoes);
    expect(r.invalidos).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('nome de arquivo sem pasta vale se existir no projeto, e reprova se não existir', () => {
    const r = conferirDocumento(dir, docBom(secoes, 'Botão em `Button.tsx:1-2`.'), secoes);
    expect(r.validos).toContain('Button.tsx:1-2');
    const r2 = conferirDocumento(dir, docBom(secoes, 'E `Fantasma.tsx:3`.'), secoes);
    expect(r2.invalidos).toContain('Fantasma.tsx:3');
    expect(r2.ok).toBe(false);
  });
  it('pasta inventada com nome parecido de pacote ainda reprova', () => {
    const r = conferirDocumento(dir, docBom(secoes, 'Em `src/fantasma/`.'), secoes);
    expect(r.invalidos).toContain('src/fantasma/');
  });
  it('documento correto passa', () => {
    expect(conferirDocumento(dir, docBom(secoes), secoes).ok).toBe(true);
  });
  it('«não encontrei» dizendo onde procurou passa', () => {
    const t = secoes.map((s) => `## ${s}\n\nNão encontrei. Procurei em \`src/app/\` e \`package.json\`.`).join('\n');
    expect(conferirDocumento(dir, t, secoes).ok).toBe(true);
  });
  it('domínio e comando entre crases não contam como caminho', () => {
    const t = docBom(secoes, 'Chama `api.mercadopago.com/v1` com `npm run dev` e `SUPABASE_URL`.');
    expect(conferirDocumento(dir, t, secoes).ok).toBe(true);
  });
});

describe('leitura em sete passos', () => {
  it('Riscos recebe os chamados já na fila para não repetir com outras palavras', async () => {
    const dir = projeto();
    preparar(dir);
    criarChamado(dir, { titulo: 'Webhook devolve 400 para evento desconhecido' });
    const pedidos: Record<string, string> = {};
    const base = motorFalso();
    await rodarAbsorcao(dir, { perguntar: async (o) => { pedidos[o.passo.id] = o.pedido; return base(o); } });
    expect(pedidos.riscos).toContain('## Chamados que já estão na fila');
    expect(pedidos.riscos).toContain('CH-0001 · Webhook devolve 400 para evento desconhecido');
    expect(pedidos.produto).not.toContain('Chamados que já estão na fila');
  });
  it('repete uma vez; a segunda falha vira incompleto e o fluxo segue', async () => {
    const dir = projeto();
    preparar(dir);
    const chamadas: string[] = [];
    const res = await rodarAbsorcao(dir, { perguntar: motorFalso({ erra: ['produto'], chamadas }) });
    expect(res.ok).toBe(true);
    expect(chamadas.filter((c) => c === 'produto')).toHaveLength(2);
    expect(chamadas.filter((c) => c === 'riscos')).toHaveLength(1);
    const ret = lerRetrato(dir)!;
    expect(ret.passos.find((p) => p.id === 'produto')!.situacao).toBe('incompleto');
    expect(ret.passos.find((p) => p.id === 'produto')!.motivo).toMatch(/caminho que não existe/);
    expect(ret.passos.filter((p) => p.situacao === 'ok')).toHaveLength(6);
    expect(fs.readFileSync(path.join(dir, 'context', 'produto.md'), 'utf8')).toMatch(/citação não conferida/);
    expect(fs.existsSync(path.join(dir, 'context', 'RETRATO.md'))).toBe(true);
    expect(lerEstado(dir)!.etapas.gate.situacao).toBe('a_fazer');
  });

  it('indício não confirmado continua indício; confirmado com código conferido vira confirmado', async () => {
    const dir = projeto();
    preparar(dir);
    expect(lerRetrato(dir)!.servicos.find((s) => s.servico === 'mercadopago')!.grau).toBe('confirmado');
    // Força um indício: só a variável no .env.example.
    const r0 = lerRetrato(dir)!;
    r0.servicos = r0.servicos.map((s) => (s.servico === 'mercadopago' ? { ...s, grau: 'indicio' as const, provas: s.provas.filter((p) => p.tipo === 'env') } : s));
    r0.servicos.push({ servico: 'stripe', nome: 'Stripe', assunto: 'pagamento', grau: 'indicio', provas: [{ tipo: 'env', arquivo: '.env.example', linha: 9 }] });
    gravarRetrato(dir, r0);
    const integra = docBom(PASSOS_LEITURA.find((p) => p.id === 'integracoes')!.secoes).replace('## Serviços confirmados\n', '## Serviços confirmados\n\n- Mercado Pago: confirmado em `src/lib/pay.ts:1`.\n- Stripe: confirmado em `src/fantasma.ts:1`.\n');
    await rodarAbsorcao(dir, { perguntar: motorFalso({ integra }) });
    const ret = lerRetrato(dir)!;
    expect(ret.servicos.find((s) => s.servico === 'mercadopago')!.grau).toBe('confirmado');
    expect(ret.servicos.find((s) => s.servico === 'stripe')!.grau).toBe('indicio');
    expect(fs.readFileSync(path.join(dir, 'context', 'RETRATO.md'), 'utf8')).toMatch(/Stripe\*\* \(a confirmar\)/);
  });

  it('cobertura calculada pelas citações', async () => {
    const dir = projeto();
    preparar(dir);
    await rodarAbsorcao(dir, { perguntar: motorFalso() });
    const cob = Object.fromEntries(lerRetrato(dir)!.cobertura.map((c) => [c.pasta, c.situacao]));
    expect(cob['src/app']).toBe('lida');
    expect(cob['src/components']).toBe('lida');
    expect(cob['src/lib']).toBe('lida');
    expect(cob.docs).toBe('nao_lida');
  });

  it('fluxo interrompido retoma no passo certo', async () => {
    const dir = projeto();
    preparar(dir);
    const primeira: string[] = [];
    const r1 = await rodarAbsorcao(dir, { perguntar: motorFalso({ chamadas: primeira, antes: (p) => { if (p === 'dados') pararAbsorcao(dir); } }) });
    expect(r1.parado).toBe(true);
    const ret1 = lerRetrato(dir)!;
    expect(ret1.passos.find((p) => p.id === 'produto')!.situacao).toBe('ok');
    expect(ret1.passos.find((p) => p.id === 'arquitetura')!.situacao).toBe('ok');
    expect(ret1.passos.find((p) => p.id === 'dados')!.situacao).toBe('a_fazer');
    expect(lerEstado(dir)!.etapas.leitura.situacao).toBe('falhou');
    const segunda: string[] = [];
    const r2 = await rodarAbsorcao(dir, { perguntar: motorFalso({ chamadas: segunda }) });
    expect(r2.ok).toBe(true);
    expect(segunda).toEqual(['dados', 'design', 'ambiente', 'integracoes', 'riscos']);
  });
});

describe('gate do retrato', () => {
  it('a resposta do motor sozinha não muda status; aprovar encerra e libera o trilho', async () => {
    const pfs = await import('../../src/main/project-fs');
    const dir = projeto();
    const proj = pfs.createOrAbsorbProjectRecord({ local_path: dir, name: 'Loja Gate', absorb: true, baseline: false, ownership: 'externo', company: 'Cliente X' });
    const est0 = lerEstado(dir)!;
    expect(est0.pendencias.map((p) => [p.id, p.situacao])).toEqual([['qa', 'a_fazer'], ['seg', 'a_fazer']]);
    await new Promise((r) => setTimeout(r, 900));
    const ctrl0 = JSON.parse(fs.existsSync(path.join(dir, '.tavir', 'control.json')) ? fs.readFileSync(path.join(dir, '.tavir', 'control.json'), 'utf8') : '{}');
    expect(ctrl0.baseline).toBeUndefined();
    expect(fs.existsSync(path.join(dir, 'qa', 'seguranca'))).toBe(false);

    expect(decidirRetrato(dir, 'aprovado').ok).toBe(false);
    await rodarAbsorcao(dir, { perguntar: motorFalso() });
    expect(pfs.getProjectAlterationsControl(proj.id).status).toBe('running');
    expect(pfs.getProjectAlterationsControl(proj.id).alterations_open).toBe(false);

    expect(decidirRetrato(dir, 'reprovado', '').ok).toBe(false);
    const ok = decidirRetrato(dir, 'aprovado', 'Conferi.');
    expect(ok.ok).toBe(true);
    const ctrl = pfs.getProjectAlterationsControl(proj.id);
    expect(ctrl.status).toBe('done');
    expect(ctrl.finished).toBe(true);
    expect(ctrl.alterations_open).toBe(true);
    expect(lerRetrato(dir)!.aprovado?.nota).toBe('Conferi.');
    const dec = fs.readFileSync(path.join(dir, '.tavir', 'decisoes.jsonl'), 'utf8');
    expect(dec).toMatch(/"kind":"absorcao"/);
    const est = JSON.parse(fs.readFileSync(path.join(dir, '.tavir', 'esteira.json'), 'utf8'));
    expect(est.stages.every((s: any) => s.status === 'done' && s.note.includes('Coberta pela absorção'))).toBe(true);
  });

  it('reprovar grava a correção e devolve só os passos escolhidos', async () => {
    const dir = projeto();
    preparar(dir);
    await rodarAbsorcao(dir, { perguntar: motorFalso() });
    const r = decidirRetrato(dir, 'reprovado', 'O banco é Postgres puro, não Supabase.', ['dados'], { encerrar: () => {}, registrar: () => {} });
    expect(r.ok).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'context', 'correcoes.md'), 'utf8')).toMatch(/Postgres puro/);
    const chamadas: string[] = [];
    let pedidoDados = '';
    await rodarAbsorcao(dir, { perguntar: async (req) => { chamadas.push(req.passo.id); if (req.passo.id === 'dados') pedidoDados = req.pedido; return motorFalso()(req); } });
    expect(chamadas).toEqual(['dados']);
    expect(pedidoDados).toMatch(/Correções do Carlos[\s\S]*Postgres puro/);
  });
});
