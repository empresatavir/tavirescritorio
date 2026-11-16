import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { abrirGuarda, escritaDoEscritorio, fecharGuarda, resumoBarrados } from '../../src/main/tavirGuarda';
import { criarChamado, lerChamado, moverChamado } from '../../src/main/chamados';
import { buildPrompt } from '../../src/main/irisAgent';

function projeto(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-guarda-'));
  fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
  fs.mkdirSync(path.join(root, '.tavir'), { recursive: true });
  fs.writeFileSync(path.join(root, '.tavir', 'control.json'), JSON.stringify({ alt_track: { step: 6, items: [] } }, null, 2));
  fs.writeFileSync(path.join(root, '.tavir', 'credentials.json'), JSON.stringify({ versao: 1, servicos: { stripe: { chave: 'sk_test_FAKE' } } }));
  return root;
}

const t = (root: string, rel: string) => path.join(root, '.tavir', rel);
const json = (root: string, rel: string) => JSON.parse(fs.readFileSync(t(root, rel), 'utf8'));

describe('guarda do .tavir na rodada do motor', () => {
  it('desfaz etapa avançada e linha em nome do Carlos escritas pelo agente', () => {
    const root = projeto();
    const id = criarChamado(root, { tipo: 'bug', titulo: 'Total errado' }).chamado!.id;
    const antes = lerChamado(root, id)!;
    const g = abrirGuarda(root);

    // O que o agente fez na rodada real: node -e mexendo no estado.
    const ctrl = json(root, 'control.json');
    ctrl.alt_track.step = 7;
    fs.writeFileSync(t(root, 'control.json'), JSON.stringify(ctrl));
    const ch = json(root, `chamados/${id}/chamado.json`);
    ch.historico.push({ at: 'x', quem: 'Carlos', acao: 'validou e homologou critérios de aceite' });
    fs.writeFileSync(t(root, `chamados/${id}/chamado.json`), JSON.stringify(ch));

    const barradosDir = path.join(root, '.tavir', 'runs', 'r1', 'barrados');
    const b = fecharGuarda(g, { barradosDir, rodada: 'r1' });

    expect(b.map((x) => x.rel).sort()).toEqual(['chamados/' + id + '/chamado.json', 'control.json']);
    expect(json(root, 'control.json').alt_track.step).toBe(6);
    const depois = lerChamado(root, id)!;
    expect(depois.historico.some((h) => h.acao.includes('homologou'))).toBe(false);
    expect(depois.historico.length).toBe(antes.historico.length + 1);
    expect(depois.historico.at(-1)!.quem).toBe('Escritório');
    expect(depois.historico.at(-1)!.acao).toContain('rodada r1');
    // A versão do agente fica para conferência.
    expect(fs.readFileSync(path.join(barradosDir, 'control.json'), 'utf8')).toContain('"step":7');
    expect(resumoBarrados(b)).toContain('control.json (restaurado)');
  });

  it('mantém o que o Escritório gravou durante a rodada', () => {
    const root = projeto();
    const g = abrirGuarda(root);
    const c = criarChamado(root, { tipo: 'bug', titulo: 'Aberto pelo Escritório' }).chamado!;
    expect(moverChamado(root, c.id, 'recusado', 'ceo', 'Duplicado').ok).toBe(true);
    const ctrl = json(root, 'control.json');
    ctrl.alt_track.step = 7;
    fs.writeFileSync(t(root, 'control.json'), JSON.stringify(ctrl));
    escritaDoEscritorio(t(root, 'control.json'));

    expect(fecharGuarda(g)).toEqual([]);
    expect(lerChamado(root, c.id)!.situacao).toBe('recusado');
    expect(json(root, 'control.json').alt_track.step).toBe(7);
  });

  it('agente mexe depois do Escritório: volta à versão do Escritório', () => {
    const root = projeto();
    const g = abrirGuarda(root);
    fs.writeFileSync(t(root, 'control.json'), JSON.stringify({ alt_track: { step: 6, note: 'escritório' } }));
    escritaDoEscritorio(t(root, 'control.json'));
    fs.writeFileSync(t(root, 'control.json'), JSON.stringify({ alt_track: { step: 9 } }));
    const b = fecharGuarda(g);
    expect(b).toEqual([{ rel: 'control.json', acao: 'restaurado' }]);
    expect(json(root, 'control.json').alt_track).toEqual({ step: 6, note: 'escritório' });
  });

  it('chamado criado pelo agente sai, apagado volta, decisão inventada some', () => {
    const root = projeto();
    const id = criarChamado(root, { titulo: 'Existente' }).chamado!.id;
    fs.writeFileSync(t(root, 'decisoes.jsonl'), '{"kind":"gate"}\n');
    const g = abrirGuarda(root);
    fs.mkdirSync(t(root, 'chamados/CH-0099'), { recursive: true });
    fs.writeFileSync(t(root, 'chamados/CH-0099/chamado.json'), '{}');
    fs.rmSync(t(root, `chamados/${id}/chamado.json`));
    fs.appendFileSync(t(root, 'decisoes.jsonl'), '{"kind":"gate","decision":"aprovado"}\n');
    fs.writeFileSync(t(root, 'esteira.json'), '{"done":true}');

    const b = fecharGuarda(g);
    expect(b).toEqual(
      expect.arrayContaining([
        { rel: 'chamados/CH-0099/chamado.json', acao: 'removido' },
        { rel: `chamados/${id}/chamado.json`, acao: 'recriado' },
        { rel: 'decisoes.jsonl', acao: 'restaurado' },
        { rel: 'esteira.json', acao: 'removido' },
      ]),
    );
    expect(fs.existsSync(t(root, 'chamados/CH-0099/chamado.json'))).toBe(false);
    expect(lerChamado(root, id)!.titulo).toBe('Existente');
    expect(fs.readFileSync(t(root, 'decisoes.jsonl'), 'utf8')).toBe('{"kind":"gate"}\n');
    expect(fs.existsSync(t(root, 'esteira.json'))).toBe(false);
  });

  it('cofre volta sem cópia do valor em barrados; anexos e código ficam', () => {
    const root = projeto();
    const id = criarChamado(root, { titulo: 'Com anexo' }).chamado!.id;
    const g = abrirGuarda(root);
    fs.writeFileSync(t(root, 'credentials.json'), JSON.stringify({ versao: 1, servicos: { stripe: { chave: 'sk_test_OUTRA' } } }));
    fs.mkdirSync(t(root, `chamados/${id}/anexos`), { recursive: true });
    fs.writeFileSync(t(root, `chamados/${id}/anexos/print.png`), 'png');
    fs.writeFileSync(path.join(root, 'app.ts'), 'export {};\n');
    const barradosDir = path.join(root, 'barr');
    const b = fecharGuarda(g, { barradosDir });
    expect(b).toEqual([{ rel: 'credentials.json', acao: 'restaurado' }]);
    expect(fs.readFileSync(t(root, 'credentials.json'), 'utf8')).toContain('sk_test_FAKE');
    expect(fs.existsSync(barradosDir) ? fs.readdirSync(barradosDir) : []).toEqual([]);
    expect(fs.existsSync(t(root, `chamados/${id}/anexos/print.png`))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app.ts'))).toBe(true);
  });

  it('sem guarda aberta, aviso de escrita não faz nada', () => {
    const root = projeto();
    expect(() => escritaDoEscritorio(t(root, 'control.json'))).not.toThrow();
  });

  it('pedido com escrita diz que .tavir/ é do Escritório', () => {
    const p = buildPrompt(
      {
        workspace: '/x', question: 'Ajuste', projectName: 'P', stageName: 'Ajustar', stageOwner: 'Agentes', engineId: 'claude', model: '', effort: '',
        finished: true, alterationsOpen: true, asChangeRequest: true, runKind: 'trilho', recent: [],
      } as any,
      'write',
    );
    expect(p).toContain('A pasta .tavir/ é do Escritório');
  });
});
