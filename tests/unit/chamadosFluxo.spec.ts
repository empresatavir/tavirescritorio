import { beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as pfs from '../../src/main/project-fs';
import { decidirRetrato, rodarAbsorcao } from '../../src/main/absorcao/fluxo';
import type { Perguntar } from '../../src/main/absorcao/leitura';
import {
  aoFecharCicloDoTrilho, criarChamado, decidirChamado, editarChamado, executarChamado, lerChamado, moverChamado, parseRefinamento, refinarChamado, responderDuvida,
} from '../../src/main/chamados';

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

const CITS = ['`package.json`', '`src/app/page.tsx`', '`src/app/layout.tsx:1`', '`src/lib/db.ts:2`', '`README.md`'];
const motor: Perguntar = async ({ passo }) => ({ ok: true, text: `# ${passo.titulo}\n\n` + passo.secoes.map((s, i) => `## ${s}\n\nVer ${CITS[i % 5]} e ${CITS[(i + 1) % 5]} e ${CITS[(i + 2) % 5]}.`).join('\n'), runId: 'r' });

function pasta(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-chf-'));
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'loja', dependencies: { next: '15' } }),
    'README.md': '# Loja\n',
    'src/app/page.tsx': 'export default function Page() { return null }\n',
    'src/app/layout.tsx': 'export default function L({ children }) { return children }\n',
    'src/lib/db.ts': 'export const db = 1;\nexport const x = 2;\n',
  };
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

async function absorvido(aprovar = true): Promise<string> {
  const dir = pasta();
  pfs.createOrAbsorbProjectRecord({ local_path: dir, name: 'Loja ' + path.basename(dir), absorb: true, baseline: false, ownership: 'externo', company: 'Cliente' });
  await rodarAbsorcao(dir, { perguntar: motor });
  if (aprovar) expect(decidirRetrato(dir, 'aprovado', 'ok').ok).toBe(true);
  return dir;
}

function pronto(root: string, titulo = 'Total errado'): string {
  const c = criarChamado(root, { tipo: 'bug', titulo, descricao: { a: 'Mostra 10', b: 'Mostrar 9', c: 'Aplicar cupom' } }).chamado!;
  editarChamado(root, c.id, { criterios: ['Total = subtotal - desconto'], notas: 'Mexer só em src/lib/db.ts' });
  expect(moverChamado(root, c.id, 'pronto', 'ceo').ok).toBe(true);
  return c.id;
}

describe('executar pelo trilho', () => {
  it('projeto absorvido sem retrato aprovado recusa', async () => {
    const dir = await absorvido(false);
    const id = pronto(dir);
    expect(executarChamado(dir, id).error).toBe('Aprove o retrato do projeto antes de executar chamados.');
  });

  it('executar preenche Mapear gaps, título e chamados; o campo sobrevive à leitura; trilho ocupado recusa', async () => {
    const dir = await absorvido();
    const id = pronto(dir);
    const r = executarChamado(dir, id);
    expect(r.ok).toBe(true);
    expect(r.trilho).toBe(true);
    expect(lerChamado(dir, id)!.situacao).toBe('em_execucao');
    expect(lerChamado(dir, id)!.ciclo?.n).toBe(1);
    const tr = pfs.getProjectAlterationsControl(dir).alt_track;
    expect(tr.title).toBe(`${id} · Total errado`);
    expect(tr.chamados).toEqual([id]);
    expect(tr.step).toBe(1); // foco foi para Planejar
    expect(tr.items[0].note).toContain('Total = subtotal - desconto');
    expect(tr.items[0].note).toContain('Mexer só em src/lib/db.ts');
    // mudar o foco não apaga título nem chamados
    pfs.setProjectAltTrackStep(dir, 1);
    pfs.setProjectAlterationsOpen(dir, true);
    const tr2 = pfs.getProjectAlterationsControl(dir).alt_track;
    expect(tr2.title).toBe(`${id} · Total errado`);
    expect(tr2.chamados).toEqual([id]);
    // outro chamado com o trilho ocupado
    const id2 = pronto(dir, 'Outro defeito');
    expect(executarChamado(dir, id2).error).toMatch(new RegExp(`ocupado com ${id}`));
  });

  it('resposta do motor sozinha não leva a aguardando validação; portão reprovado deixa em execução', async () => {
    const dir = await absorvido();
    const id = pronto(dir);
    executarChamado(dir, id);
    // Percorre o trilho até o fim gravando os pacotes (como se o motor respondesse) e fecha o último à mão.
    let tr = pfs.getProjectAlterationsControl(dir).alt_track;
    while (tr.step < tr.items.length - 1) {
      pfs.saveProjectAltTrackNote(dir, tr.step, 'feito pelo agente');
      pfs.advanceProjectAltTrack(dir, tr.step);
      tr = pfs.getProjectAlterationsControl(dir).alt_track;
    }
    pfs.closeProjectAltTrackItem(dir, tr.step); // sem rodada de QA/segurança: portões não aprovados
    expect(pfs.getProjectAlterationsControl(dir).alt_track.runStatus).toBe('done');
    const c = lerChamado(dir, id)!;
    expect(c.situacao).toBe('em_execucao');
    expect(c.historico.at(-1)!.acao).toMatch(/sem os portões aprovados/);
    // o mesmo fechamento com portões aprovados leva a validação, pelo Escritório
    const fechados = aoFecharCicloDoTrilho(dir, { chamados: [id], branch: { name: 'tavir/ciclo-1' } }, { qa: true, seg: true });
    expect(fechados).toHaveLength(1);
    const c2 = lerChamado(dir, id)!;
    expect(c2.situacao).toBe('aguardando_validacao');
    expect(c2.ciclo).toMatchObject({ n: 1, branch: 'tavir/ciclo-1' });
    expect(c2.historico.at(-1)!.quem).toBe('Escritório');
  });

  it('gate: aprovar grava em decisoes.jsonl; reprovar sem nota recusa e com nota volta a pronto', async () => {
    const dir = await absorvido();
    const id = pronto(dir);
    executarChamado(dir, id);
    aoFecharCicloDoTrilho(dir, { chamados: [id] }, { qa: true, seg: true });
    expect(decidirChamado(dir, id, 'reprovado', '').ok).toBe(false);
    expect(decidirChamado(dir, id, 'reprovado', 'Falta o rodapé.').chamado!.situacao).toBe('pronto');
    // a orientação da reprovação vai no próximo «Mapear gaps»
    const tr0 = pfs.getProjectAlterationsControl(dir).alt_track;
    pfs.closeProjectAltTrackItem(dir, tr0.items.length - 1);
    expect(executarChamado(dir, id).ok).toBe(true);
    expect(pfs.getProjectAlterationsControl(dir).alt_track.items[0].note).toContain('Falta o rodapé.');
    aoFecharCicloDoTrilho(dir, { chamados: [id] }, { qa: true, seg: true });
    expect(decidirChamado(dir, id, 'aprovado').chamado!.situacao).toBe('concluido');
    const dec = fs.readFileSync(path.join(dir, '.tavir', 'decisoes.jsonl'), 'utf8');
    expect(dec).toMatch(/"kind":"chamado".*"decision":"reprovado"/);
    expect(dec).toMatch(/"kind":"chamado".*"decision":"aprovado"/);
  });
});

describe('refinar e dúvida', () => {
  it('parseRefinamento lê o bloco', () => {
    const p = parseRefinamento('Olhei src/a.ts.\n\nREFINAMENTO:\ncriterios:\n- Total certo\n- Cupom aplicado\nperguntas:\n- Vale para frete?\nnotas: Mexer em src/a.ts');
    expect(p).toMatchObject({ criterios: ['Total certo', 'Cupom aplicado'], perguntas: ['Vale para frete?'], notas: 'Mexer em src/a.ts', texto: 'Olhei src/a.ts.' });
    expect(parseRefinamento('sem bloco')).toBeNull();
    const eco = parseRefinamento('REFINAMENTO:\ncriterios:\n- A\nnotas: o que quem for executar precisa saber (arquivos, riscos, o que não mexer)\n- Mexer em src/a.ts');
    expect(eco!.notas).toBe('- Mexer em src/a.ts');
  });
  it('refinamento é sugestão: nada entra no chamado sem o clique', async () => {
    const dir = pasta();
    const c = criarChamado(dir, { titulo: 'Botão' }).chamado!;
    const r = await refinarChamado(dir, c.id, async () => ({ ok: true, text: 'REFINAMENTO:\ncriterios:\n- Salva\nperguntas:\nnotas: nada' }));
    expect(r.ok).toBe(true);
    expect(r.sugestao!.criterios).toEqual(['Salva']);
    const depois = lerChamado(dir, c.id)!;
    expect(depois.refinamento.criterios).toEqual([]);
    expect(depois.situacao).toBe('aberto');
  });
  it('dúvida: a Íris responde e a situação não muda; o Carlos conclui', async () => {
    const dir = pasta();
    const c = criarChamado(dir, { tipo: 'duvida', titulo: 'Onde fica o banco?', descricao: { a: 'Onde?' } }).chamado!;
    const r = await responderDuvida(dir, c.id, async () => ({ ok: true, text: 'Em src/lib/db.ts.' }));
    expect(r.chamado!.resposta).toBe('Em src/lib/db.ts.');
    expect(r.chamado!.situacao).toBe('aberto');
    expect(moverChamado(dir, c.id, 'concluido', 'ceo').chamado!.situacao).toBe('concluido');
  });
});
