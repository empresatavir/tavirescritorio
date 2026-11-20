import { beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as pfs from '../../src/main/project-fs';
import { buildPrompt } from '../../src/main/irisAgent';
import { detectar } from '../../src/main/absorcao/detectores';
import { escreverRetratoMd, gravarRetrato, lerRetrato, montarRetrato } from '../../src/main/absorcao/retrato';
import { criarChamado, listarChamados } from '../../src/main/chamados';
import { gerarCartoes, listarAcessos, salvarAcesso } from '../../src/main/acessos';

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

function projeto(nome: string, dep: string, marca: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tavir-iso-${nome}-`));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: nome, dependencies: { [dep]: '1' } }));
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), `// ${marca}\nexport const x = 1;\n`);
  pfs.createOrAbsorbProjectRecord({ local_path: dir, name: nome, absorb: false, baseline: false });
  const r = montarRetrato(nome, detectar(dir));
  gravarRetrato(dir, r);
  escreverRetratoMd(dir, lerRetrato(dir)!);
  fs.appendFileSync(path.join(dir, 'context', 'RETRATO.md'), `\nMarca exclusiva: ${marca}\n`);
  return dir;
}

describe('isolamento entre projetos', () => {
  it('o pedido da Íris de um projeto não traz nome, caminho nem retrato do outro', async () => {
    const a = projeto('lojaAlfa', 'stripe', 'MARCA-ALFA-7781');
    const b = projeto('lojaBeta', '@supabase/supabase-js', 'MARCA-BETA-3349');
    let pedido = '';
    await pfs.askProjectIris({ projectPath: a, question: 'Resuma o projeto', converse: async (req: any) => { pedido = buildPrompt(req, 'read'); return { ok: true, text: 'ok', thoughts: [] }; } });
    expect(pedido).toContain('MARCA-ALFA-7781'); // o retrato do próprio projeto entra
    expect(pedido).toContain('## Retrato do projeto');
    expect(pedido).not.toContain('lojaBeta');
    expect(pedido).not.toContain(b);
    expect(pedido).not.toContain(path.basename(b));
    expect(pedido).not.toContain('MARCA-BETA-3349');
    // o retrato entra com teto fixo
    fs.appendFileSync(path.join(a, 'context', 'RETRATO.md'), 'x'.repeat(20000));
    await pfs.askProjectIris({ projectPath: a, question: 'De novo', converse: async (req: any) => { pedido = buildPrompt(req, 'read'); return { ok: true, text: 'ok', thoughts: [] }; } });
    const bloco = pedido.split('## Retrato do projeto')[1].split('\n## ')[0];
    expect(bloco.length).toBeLessThan(3200);
  });

  it('chamados, acessos e retrato de um não aparecem no outro', () => {
    const a = projeto('appGama', 'stripe', 'MARCA-GAMA');
    const b = projeto('appDelta', 'openai', 'MARCA-DELTA');
    criarChamado(a, { titulo: 'Defeito só do Gama' });
    gerarCartoes(a);
    gerarCartoes(b);
    salvarAcesso(a, 'stripe', { chave_teste: 'sk_test_gama_1234567890' });
    expect(listarChamados(b)).toHaveLength(0);
    expect(listarAcessos(b).some((c) => c.servico === 'stripe')).toBe(false);
    expect(JSON.stringify(listarAcessos(b))).not.toContain('gama');
    expect(lerRetrato(b)!.projeto).toBe('appDelta');
    expect(JSON.stringify(lerRetrato(b))).not.toContain('MARCA-GAMA');
  });
});
