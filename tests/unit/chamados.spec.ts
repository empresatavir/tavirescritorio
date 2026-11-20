import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { podeMover, type Situacao } from '../../src/shared/chamados';
import {
  anexarAoChamado, chamadosDaAbsorcao, contarChamados, criarChamado, editarChamado, lerChamado, listarChamados, moverChamado, tituloDuplicado,
} from '../../src/main/chamados';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function projeto(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-ch-'));
  fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'total.ts'), 'export const total = 1;\n');
  return root;
}

function pronto(root: string) {
  const c = criarChamado(root, { tipo: 'bug', titulo: 'Total errado', descricao: { a: 'Mostra 10', b: 'Mostrar 9', c: 'Aplicar cupom' } }).chamado!;
  editarChamado(root, c.id, { criterios: ['Total = subtotal - desconto'] });
  expect(moverChamado(root, c.id, 'pronto', 'ceo').ok).toBe(true);
  return c.id;
}

describe('guardar chamados', () => {
  it('numeração em sequência e exclude no primeiro', () => {
    const root = projeto();
    expect(criarChamado(root, { titulo: 'Um' }).chamado!.id).toBe('CH-0001');
    expect(criarChamado(root, { titulo: 'Dois' }).chamado!.id).toBe('CH-0002');
    expect(criarChamado(root, { titulo: '' }).ok).toBe(false);
    expect(fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf8')).toContain('.tavir/');
    expect(listarChamados(root).map((c) => c.id)).toEqual(['CH-0001', 'CH-0002']);
  });

  it('anexo vai para a pasta do chamado', () => {
    const root = projeto();
    const c = criarChamado(root, { titulo: 'Com print', anexos: [{ name: 'print.png', type: 'image/png', data: PNG }] }).chamado!;
    expect(c.anexos).toHaveLength(1);
    expect(c.anexos[0].rel).toBe('.tavir/chamados/CH-0001/anexos/print.png');
    expect(fs.existsSync(path.join(root, c.anexos[0].rel))).toBe(true);
    const r = anexarAoChamado(root, c.id, [{ name: 'outro.png', type: 'image/png', data: PNG }]);
    expect(r.chamado!.anexos).toHaveLength(2);
  });

  it('histórico cresce a cada mudança', () => {
    const root = projeto();
    const id = pronto(root);
    const c = lerChamado(root, id)!;
    expect(c.historico.length).toBe(3); // abriu, editou critérios, moveu
    moverChamado(root, id, 'em_execucao', 'ceo');
    expect(lerChamado(root, id)!.historico.length).toBe(4);
  });

  it('duplicado e contagem', () => {
    const root = projeto();
    criarChamado(root, { titulo: 'Botão não salva' });
    criarChamado(root, { titulo: 'Outro', autor: { tipo: 'agente', nome: 'Íris', origem: 'conversa' } });
    expect(tituloDuplicado(root, 'BOTÃO NAO   salva')?.id).toBe('CH-0001');
    expect(tituloDuplicado(root, 'Outra coisa')).toBeNull();
    const k = contarChamados(root);
    expect(k.total).toBe(2);
    expect(k.porSituacao.aberto).toBe(2);
    expect(k.aguardandoCarlos).toBe(1); // aberto por agente
  });

  it('problemas do passo riscos viram chamados abertos por agente', () => {
    const root = projeto();
    const t = '# Riscos\n\n## Pontos frágeis\n\nTexto.\n\nCHAMADO:\ntipo: bug\ntitulo: Total ignora cupom\nprioridade: alta\nacontece: Mostra valor cheio.\nesperado: Descontar.\nreproduzir: Aplicar cupom.\nevidencia: src/total.ts:1\n\nCHAMADO:\ntipo: coisa\ntitulo: Inválido\nprioridade: alta\n';
    const r = chamadosDaAbsorcao(root, t, 'run-1');
    expect(r.criados).toHaveLength(1);
    expect(r.avisos.length).toBe(1);
    const c = r.criados[0];
    expect(c.autor).toMatchObject({ tipo: 'agente', origem: 'absorcao', runId: 'run-1' });
    expect(c.situacao).toBe('aberto');
    // rodar de novo não duplica
    expect(chamadosDaAbsorcao(root, t).criados).toHaveLength(0);
    expect(lerChamado(root, c.id)!.historico.at(-1)!.acao).toMatch(/apontou de novo/);
  });
});

describe('tabela de transições', () => {
  const ctx = { titulo: 'T', descricao: { a: 'a', b: '', c: '' }, criterios: ['ok'], tipo: 'bug' as const };
  const casos: Array<[Situacao, Situacao, 'ceo' | 'escritorio' | 'agente', boolean, object?]> = [
    ['aberto', 'em_refinamento', 'ceo', true],
    ['pronto', 'em_refinamento', 'ceo', false],
    ['aberto', 'pronto', 'ceo', true],
    ['em_refinamento', 'pronto', 'ceo', true],
    ['aguardando_validacao', 'pronto', 'ceo', false], // reprovar sem nota
    ['aguardando_validacao', 'pronto', 'ceo', true, { nota: 'falta o rodapé' }],
    ['pronto', 'em_execucao', 'ceo', true],
    ['aberto', 'em_execucao', 'ceo', false],
    ['em_execucao', 'aguardando_validacao', 'escritorio', true],
    ['em_execucao', 'aguardando_validacao', 'ceo', false],
    ['em_execucao', 'aguardando_validacao', 'agente', false],
    ['aguardando_validacao', 'concluido', 'ceo', true],
    ['aguardando_validacao', 'concluido', 'escritorio', false],
    ['em_execucao', 'concluido', 'ceo', false],
    ['aberto', 'recusado', 'ceo', false], // sem motivo
    ['aberto', 'recusado', 'ceo', true, { nota: 'fora do escopo' }],
    ['pronto', 'recusado', 'ceo', true, { nota: 'fora do escopo' }],
    ['em_execucao', 'recusado', 'ceo', false, { nota: 'tarde' }],
    ['aberto', 'em_refinamento', 'agente', false],
    ['aberto', 'pronto', 'agente', false],
  ];
  for (const [de, para, quem, ok, extra] of casos) {
    it(`${de} → ${para} por ${quem}: ${ok ? 'pode' : 'não pode'}`, () => {
      expect(podeMover(de, para, quem, { ...ctx, ...(extra || {}) }) === true).toBe(ok);
    });
  }
  it('pronto sem critério recusa', () => {
    expect(podeMover('aberto', 'pronto', 'ceo', { ...ctx, criterios: [] })).toMatch(/critério/);
  });
  it('dúvida conclui de aberto só com resposta', () => {
    const d = { ...ctx, tipo: 'duvida' as const };
    expect(podeMover('aberto', 'concluido', 'ceo', d)).not.toBe(true);
    expect(podeMover('aberto', 'concluido', 'ceo', { ...d, resposta: 'É assim.' })).toBe(true);
    expect(podeMover('aberto', 'concluido', 'ceo', { ...ctx, resposta: 'x' })).not.toBe(true); // bug não
  });
  it('moverChamado aplica a tabela e guarda o ciclo', () => {
    const root = projeto();
    const id = pronto(root);
    expect(moverChamado(root, id, 'aguardando_validacao', 'escritorio').ok).toBe(false);
    expect(moverChamado(root, id, 'em_execucao', 'agente').ok).toBe(false);
    expect(moverChamado(root, id, 'em_execucao', 'ceo', '', { ciclo: { n: 2 } }).chamado!.ciclo).toEqual({ n: 2 });
    expect(moverChamado(root, id, 'aguardando_validacao', 'escritorio', '', { ciclo: { n: 2, branch: 'tavir/ciclo-2' } }).chamado!.ciclo).toMatchObject({ n: 2, branch: 'tavir/ciclo-2' });
    expect(moverChamado(root, id, 'concluido', 'ceo').ok).toBe(true);
    expect(editarChamado(root, id, { titulo: 'Mudou' }).ok).toBe(false); // fechado não muda
  });
});
