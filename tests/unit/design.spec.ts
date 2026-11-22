import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ESTEIRA_TEMPLATES, LEGACY_STAGE_NAMES, type EsteiraCode } from '../../src/shared/esteiras';
import { agentProfile } from '../../src/shared/agentes';
import {
  CONTRACT_TEMPLATE,
  DESIGN_KIT_DIR,
  REVIEW_RUBRIC,
  STAGE_DIRECAO,
  STAGE_REVISAO,
  contractGaps,
  contractTokens,
  designBlock,
  designFamily,
  designMode,
  designSkills,
  textDesignMode,
  isMaintenance,
  stageDesignRole,
  trackDesignRole,
} from '../../src/shared/design';
import { latestQaPrints, listReferences, prepareDesignKit, projectContractGaps, projectDesignTokens, projectDirections } from '../../src/main/design/kit';
import { captureReference, referenceSlug } from '../../src/main/design/referencias';

const dirs: string[] = [];
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-design-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const REPO = process.cwd();
const CODES = Object.keys(ESTEIRA_TEMPLATES) as EsteiraCode[];

describe('pilar de design nas esteiras', () => {
  it('as seis esteiras têm direção de design antes da construção e revisão isolada depois', () => {
    for (const code of CODES) {
      const roles = ESTEIRA_TEMPLATES[code].stages.map((s) => stageDesignRole(s));
      const dir = roles.indexOf('direcao');
      const build = roles.indexOf('construcao');
      const rev = roles.indexOf('revisao');
      expect(dir, `${code} sem direção`).toBeGreaterThanOrEqual(0);
      expect(rev, `${code} sem revisão`).toBeGreaterThan(dir);
      if (build >= 0) {
        expect(build, `${code}: construção antes da direção`).toBeGreaterThan(dir);
        expect(rev, `${code}: revisão antes da construção`).toBeGreaterThan(build);
      }
      const review = ESTEIRA_TEMPLATES[code].stages[rev];
      expect(review.name).toBe(STAGE_REVISAO);
      expect(review.gate).toBe(true);
    }
  });

  it('criação tem gate do Carlos logo depois da direção', () => {
    for (const code of CODES.filter((c) => !isMaintenance(c))) {
      const stages = ESTEIRA_TEMPLATES[code].stages;
      const dir = stages.findIndex((s) => s.name === STAGE_DIRECAO);
      expect(stages[dir + 1].name).toBe('Aprovação do design');
      expect(stages[dir + 1].gate).toBe(true);
    }
  });

  it('todo molde alterado guarda a lista antiga de etapas, com tamanhos distintos', () => {
    for (const code of CODES) {
      const lists = LEGACY_STAGE_NAMES[code] || [];
      expect(lists.length, code).toBeGreaterThan(0);
      const now = ESTEIRA_TEMPLATES[code].stages.map((s) => s.name);
      for (const old of lists) {
        expect(old.length).toBeLessThan(now.length);
        expect(old.filter((n) => !now.includes(n)), `${code}: etapa antiga sumiu`).toEqual([]);
      }
      expect(new Set(lists.map((l) => l.length)).size).toBe(lists.length);
    }
  });

  it('Marina, Yuri e o revisor têm perfil; família e manutenção saem do código do molde', () => {
    for (const who of ['Marina Marca', 'Yuri UX', 'Marina + Yuri', 'Revisor de Design']) expect(agentProfile(who), who).toBeTruthy();
    expect(designFamily('SY-M1')).toBe('produto');
    expect(designFamily('OF-C1')).toBe('marketing');
    expect(isMaintenance('LP-M1')).toBe(true);
    expect(isMaintenance('SY-C1')).toBe(false);
  });

  it('no trilho de manutenção, Marina e Yuri dirigem e quem constrói tela segue o contrato', () => {
    expect(trackDesignRole({ label: 'Novo layout da home', owner: 'Yuri UX' }, false)).toBe('direcao');
    expect(trackDesignRole({ label: 'Rebranding', owner: 'Marina Marca' }, true)).toBe('direcao');
    expect(trackDesignRole({ label: 'Aplicar novo layout', owner: 'Diego Desenvolvedor' }, false)).toBe('construcao');
    expect(trackDesignRole({ label: 'Corrigir cálculo de frete', owner: 'Diego Desenvolvedor' }, true)).toBe('construcao');
    expect(trackDesignRole({ label: 'Corrigir cálculo de frete', owner: 'Diego Dev Front & Back' }, false)).toBeNull();
    expect(trackDesignRole({ label: 'Migrar tabela', owner: 'Théo Tech Lead' }, true)).toBeNull();
  });
});

describe('contrato de design', () => {
  it('o modelo passa na estrutura; contrato sem seção ou sem tokens reprova', () => {
    expect(contractGaps(CONTRACT_TEMPLATE)).toEqual([]);
    expect(contractGaps('')).toHaveLength(9);
    expect(contractGaps(CONTRACT_TEMPLATE.replace(/## Conceito[\s\S]*?(?=## Tarefa)/, ''))).toEqual(['Conceito']);
    const semTokens = CONTRACT_TEMPLATE.replace(/```tokens[\s\S]*?```/, 'cores a definir depois, sem bloco nenhum');
    expect(contractGaps(semTokens).join(' ')).toContain('tokens');
    const semTelas = CONTRACT_TEMPLATE.replace(/## Telas[\s\S]*?(?=## Referências)/, '## Telas\n\n');
    expect(contractGaps(semTelas)).toEqual(['Telas']);
  });

  it('cor citada fora do bloco de tokens reprova; em Referências e Proibido não conta', () => {
    const solta = CONTRACT_TEMPLATE.replace('## Tipografia', 'Botão do WhatsApp em #0F7A4D e erro em #b91c1c.\n\n## Tipografia');
    expect(contractGaps(solta)).toEqual(['Tokens (cores usadas fora do bloco: #0f7a4d, #b91c1c)']);
    const citada = CONTRACT_TEMPLATE.replace('O que esta entrega não pode ter', 'Nada de creme #F4F1EA com terracota. O que esta entrega não pode ter');
    expect(contractGaps(citada)).toEqual([]);
    // Cor do bloco citada no texto, em maiúscula ou abreviada, passa.
    const repetida = CONTRACT_TEMPLATE.replace('## Tipografia', 'Fundo #FFF e texto #111111.\n\n## Tipografia');
    expect(contractGaps(repetida)).toEqual([]);
  });

  it('lê cores e fontes do bloco tokens', () => {
    const t = contractTokens('```tokens\ncor.fundo: #F4F6F2\ncor.acento: "#0B1220"\nfonte.titulo: Fraunces\nfonte.corpo: Inter Tight\nraio: 8px\n```');
    expect(t.colors).toEqual(['#f4f6f2', '#0b1220']);
    expect(t.fonts).toEqual(['Fraunces', 'Inter Tight']);
    expect(contractTokens('sem bloco')).toEqual({ colors: [], fonts: [] });
  });

  it('a rubrica pesa tarefa e acabamento na mesma proporção', () => {
    const count = (g: string) => REVIEW_RUBRIC.filter(([group]) => group === g).length;
    expect(count('Tarefa')).toBe(count('Acabamento'));
  });
});

describe('kit de design no projeto', () => {
  it('direção: copia cânone, skills e modelo, e o pedido leva a alma da Marina e do Yuri', () => {
    const ws = tmp();
    const kit = prepareDesignKit(ws, { role: 'direcao', family: 'marketing', maint: false, root: REPO });
    const at = (rel: string) => path.join(ws, ...DESIGN_KIT_DIR.split('/'), ...rel.split('/'));
    expect(fs.existsSync(at('CANON.md'))).toBe(true);
    expect(fs.existsSync(at('MODELO-DESIGN.md'))).toBe(true);
    expect(fs.existsSync(at('skills/tastemaker/SKILL.md'))).toBe(true);
    expect(fs.existsSync(at('skills/tastemaker/LICENSE'))).toBe(true);
    expect(fs.existsSync(at('skills/no-ai-design-slop/SKILL.md'))).toBe(true);
    expect(fs.existsSync(at('skills/mengto-receitas/SKILL.md'))).toBe(true);
    expect(kit.block).toContain('design/direcoes/a/index.html');
    expect(kit.block).toContain('nunca leva nome de cliente');
    expect(fs.existsSync(at('skills/brand-context/SKILL.md'))).toBe(true);
    expect(fs.existsSync(at('conhecimento/checklist-pre-entrega-ui.md'))).toBe(true);
    expect(kit.skills).toContain('visual-reference-absorb');
    expect(kit.block).toContain('Decido quem a marca é');
    expect(kit.block).toContain('Dono da interface');
    expect(kit.block).toContain('design/DESIGN.md');
    expect(kit.block).toContain('Útil e bonito na mesma proporção');
    // Nada no pedido depende de recurso de skill de um motor.
    expect(kit.block).toContain('não dependa de recurso de skill do motor');
  });

  it('sistema usa as skills de produto; manutenção acrescenta o redesenho do que existe', () => {
    expect(designSkills('direcao', 'produto', true)).toEqual(expect.arrayContaining(['ui-ux-pro-max', 'ui-styling', 'design-system', 'redesign-existing-projects']));
    expect(designSkills('direcao', 'marketing', false)).not.toContain('redesign-existing-projects');
    expect(designSkills('construcao', 'marketing', false)).toEqual(['tastemaker', 'elaya-landing', 'no-ai-design-slop', 'jakub-interface', 'emil-motion', 'frontend-engineering-canon']);
    expect(designSkills('revisao', 'produto', false)).toEqual(['audit-ai-design-slop', 'owl-critica-visual', 'jakub-interface']);
    // Uma base estética por família: a antiga não vai junto com a nova.
    for (const role of ['direcao', 'construcao'] as const) expect(designSkills(role, 'marketing', true)).not.toContain('design-taste-frontend');
  });

  it('não copia binário grande das skills (fontes do ui-styling)', () => {
    const ws = tmp();
    prepareDesignKit(ws, { role: 'construcao', family: 'produto', maint: false, root: REPO });
    const base = path.join(ws, ...DESIGN_KIT_DIR.split('/'), 'skills', 'ui-styling');
    expect(fs.existsSync(path.join(base, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(base, 'canvas-fonts'))).toBe(false);
  });

  it('construção cobra o contrato quando ele existe e avisa quando falta', () => {
    const ws = tmp();
    const sem = prepareDesignKit(ws, { role: 'construcao', family: 'marketing', maint: false, root: REPO }).block;
    expect(sem).toContain('ainda não tem `design/DESIGN.md`');
    fs.mkdirSync(path.join(ws, 'design'));
    fs.writeFileSync(path.join(ws, 'design', 'DESIGN.md'), CONTRACT_TEMPLATE);
    const com = prepareDesignKit(ws, { role: 'construcao', family: 'marketing', maint: false, root: REPO }).block;
    expect(com).toContain('Cor ou fonte fora do bloco `tokens` reprova');
    expect(projectContractGaps(ws)).toEqual([]);
    expect(projectDesignTokens(ws)?.fonts).toEqual(['Nome da Fonte', 'Nome da Fonte']);
    expect(projectDesignTokens(tmp())).toBeNull();
  });

  it('revisão: alma do revisor, rubrica, prints do último QA e só as skills de crítica', () => {
    const ws = tmp();
    for (const run of ['QA-20261101-100000', 'QA-20261119-090000']) {
      fs.mkdirSync(path.join(ws, 'qa', 'evidencias', run, 'prints'), { recursive: true });
      fs.writeFileSync(path.join(ws, 'qa', 'evidencias', run, 'prints', 'desktop-inicio.png'), 'x');
    }
    expect(latestQaPrints(ws)).toBe('qa/evidencias/QA-20261119-090000/prints');
    const kit = prepareDesignKit(ws, { role: 'revisao', family: 'produto', maint: false, prints: latestQaPrints(ws), root: REPO });
    expect(kit.skills).toEqual(['audit-ai-design-slop', 'owl-critica-visual', 'jakub-interface']);
    expect(kit.block).toContain('trocando o logo');
    expect(kit.block).toContain('Não participei da construção');
    expect(kit.block).toContain('qa/evidencias/QA-20261119-090000/prints');
    expect(kit.block).toContain('Parecer: devolver');
    expect(kit.block).toContain('Quem decide é o Carlos');
    expect(kit.block).toContain('algum critério com nota 5 ou menos');
  });

  it('direções: só conta pasta com index.html', () => {
    const ws = tmp();
    expect(projectDirections(ws)).toEqual([]);
    for (const d of ['a', 'b', 'c']) fs.mkdirSync(path.join(ws, 'design', 'direcoes', d), { recursive: true });
    for (const d of ['a', 'c']) fs.writeFileSync(path.join(ws, 'design', 'direcoes', d, 'index.html'), '<html></html>');
    expect(projectDirections(ws)).toEqual(['a', 'c']);
  });

  it('skills de terceiros entram com licença e origem', () => {
    for (const name of ['tastemaker', 'no-ai-design-slop', 'audit-ai-design-slop', 'mengto-receitas', 'jakub-interface', 'emil-motion', 'elaya-landing', 'owl-critica-visual']) {
      const dir = path.join(REPO, 'agentes', 'escopo', 'skills', name);
      for (const f of ['SKILL.md', 'LICENSE', 'ORIGEM.md']) expect(fs.existsSync(path.join(dir, f)), `${name}/${f}`).toBe(true);
    }
  });

  it('modo: padrão por omissão, conceito só quando escolhido', () => {
    expect(designMode(undefined)).toBe('padrao');
    expect(designMode('Conceito')).toBe('conceito');
    expect(designMode('qualquer')).toBe('padrao');
    expect(textDesignMode('Refazer a página em modo conceito')).toBe('conceito');
    expect(textDesignMode('Trocar a paleta, modo padrão')).toBe('padrao');
    expect(textDesignMode('Trocar a paleta')).toBeNull();
  });

  it('modo muda o pedido dos três papéis, sem mexer na tarefa do usuário', () => {
    const base = { family: 'marketing' as const, maint: false, souls: [], canon: '', skills: [], references: [], hasContract: true };
    for (const role of ['direcao', 'construcao', 'revisao'] as const) {
      const padrao = designBlock({ ...base, role });
      const conceito = designBlock({ ...base, role, mode: 'conceito' });
      expect(padrao).toContain('### Modo de design: Padrão');
      expect(conceito).toContain('### Modo de design: Conceito');
      expect(conceito).not.toContain('### Modo de design: Padrão');
    }
    const dir = designBlock({ ...base, role: 'direcao', mode: 'conceito' });
    expect(dir).toContain('Convenções quebradas:');
    expect(dir).toContain('alvo de toque de 44 px');
    expect(designBlock({ ...base, role: 'revisao', mode: 'conceito' })).toContain('os cinco critérios de Tarefa valem inteiros');
  });

  it('modo conceito: o contrato só fecha com as convenções quebradas listadas', () => {
    expect(contractGaps(CONTRACT_TEMPLATE)).toEqual([]);
    expect(contractGaps(CONTRACT_TEMPLATE, 'conceito').join(' ')).toContain('Convenções quebradas');
    const add = (line: string) => CONTRACT_TEMPLATE.replace('## Tarefa do usuário', `${line}\n\n## Tarefa do usuário`);
    expect(contractGaps(add('Convenções quebradas: navegação lateral em vez de topo; prova antes da promessa'), 'conceito')).toEqual([]);
    expect(contractGaps(add('Convenções quebradas:\n- navegação lateral em vez de topo\n- prova antes da promessa'), 'conceito')).toEqual([]);
    expect(contractGaps(add('Convenções quebradas: só a navegação'), 'conceito')).toHaveLength(1);
    // Fora da seção Conceito não conta.
    expect(contractGaps(CONTRACT_TEMPLATE.replace('## Proibido', '## Proibido\nConvenções quebradas: a; b; c demais'), 'conceito')).toHaveLength(1);
  });

  it('bloco sem alma e sem skills ainda sai inteiro (pasta do Escritório incompleta)', () => {
    const b = designBlock({ role: 'direcao', family: 'marketing', maint: true, souls: [], canon: '', skills: [], references: [], hasContract: false });
    expect(b).toContain('Este projeto já existe');
    expect(b).toContain('ainda não há referência validada');
  });
});

describe('biblioteca de referências', () => {
  const measures = {
    url: 'https://exemplo.com/',
    title: 'Clínica Exemplo',
    capturedAt: '2026-11-20T12:00:00.000Z',
    fonts: [{ family: 'Fraunces', share: 0.6 }],
    colors: { background: ['#ffffff'], text: ['#111111'], accent: ['#0b5fff'] },
    type: { h1: '64px/600', h2: '40px/600', body: '18px/400' },
    sections: 7,
    firstViewport: { headline: 'Agende sua consulta', actions: ['Agendar'] },
    maxWidth: 1200,
  };

  it('captura vira rascunho; só referência validada entra no kit da direção', async () => {
    const root = tmp();
    fs.mkdirSync(path.join(root, 'agentes', 'escopo'), { recursive: true });
    const res = await captureReference({ url: 'https://www.exemplo.com/', family: 'marketing', niche: 'clínica', root, measure: async () => measures });
    expect(res.ok).toBe(true);
    const card = path.join(res.dir!, 'card.md');
    expect(fs.readFileSync(card, 'utf8')).toContain('status: rascunho');
    expect(listReferences(root)).toMatchObject([{ slug: 'exemplo-com', family: 'marketing', status: 'rascunho' }]);
    const ws = tmp();
    expect(prepareDesignKit(ws, { role: 'direcao', family: 'marketing', maint: false, root }).references).toEqual([]);

    fs.writeFileSync(card, fs.readFileSync(card, 'utf8').replace('status: rascunho', 'status: validado'));
    const kit = prepareDesignKit(ws, { role: 'direcao', family: 'marketing', maint: false, root });
    expect(kit.references).toEqual([`${DESIGN_KIT_DIR}/referencias/exemplo-com/card.md`]);
    expect(fs.existsSync(path.join(ws, ...kit.references[0].split('/')))).toBe(true);
    // Outra família não recebe.
    expect(prepareDesignKit(tmp(), { role: 'direcao', family: 'produto', maint: false, root }).references).toEqual([]);
    // Card validado não é sobrescrito por nova captura.
    const again = await captureReference({ url: 'https://www.exemplo.com/', family: 'marketing', root, measure: async () => measures });
    expect(again.ok).toBe(false);
    expect(again.error).toContain('já está validada');
  });

  it('recusa URL incompleta e gera nome de pasta estável', async () => {
    expect((await captureReference({ url: 'exemplo.com', family: 'produto', root: tmp() })).ok).toBe(false);
    expect(referenceSlug('https://www.Linear.app/features/')).toBe('linear-app-features');
  });
});
