import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogAcervo, listAcervo, mitLicense, packagesOf, type AcervoSource } from '../../src/main/design/acervo';
import { adoptBrandBoard, prepareDesignKit, projectBrandBoardsGaps, projectContractGaps } from '../../src/main/design/kit';
import { BRAND_BOARDS_DIR, STAGE_ESCOLHA_MARCA, STAGE_MARCA, brandBoardsBlock, brandBoardsGaps, brandChoiceOf, brandGaps, colorRuleGaps, designBlock, isWarmNeutral, motionPlanGap, themeColor } from '../../src/shared/design';
import { ESTEIRA_TEMPLATES, LEGACY_STAGE_NAMES } from '../../src/shared/esteiras';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-acervo-'));
const MIT = 'MIT License\n\nCopyright (c) 2026 Alguém\n\nPermission is hereby granted, free of charge, to any person obtaining a copy…';
const put = (file: string, body: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
};
const source = (slug: string): AcervoSource => ({
  slug,
  title: 'Lib de teste',
  repo: 'https://github.com/exemplo/lib',
  use: 'efeitos de teste',
  stack: 'React + Tailwind',
  license: ['LICENSE'],
  collect: (dir) => fs.readdirSync(path.join(dir, 'src')).map((f) => ({ file: `src/${f}`, name: f.replace(/\.tsx$/, ''), desc: 'Brilho na borda', tags: ['efeito'], anim: { css: { '@keyframes brilho': {} } } })),
});

describe('acervo de código aberto', () => {
  it('lista os pacotes de fora que a peça usa', () => {
    expect(packagesOf('import { cn } from "@/lib/utils";\nimport { motion } from "motion/react";\nimport x from "./x";\nimport * as R from "@radix-ui/react-dialog";\nimport React from "react";')).toEqual(['@radix-ui/react-dialog', 'motion']);
  });

  it('plano de movimento pede três itens com duração', () => {
    const ok = ['## Componentes', '### Movimento', '- Prova: número conta ao entrar na tela, 900 ms, ease-out (magicui number-ticker)', '- Régua: linha se preenche ao rolar, 600 ms', '- Seções: sobem 12 px ao entrar, 400 ms', '## Telas', ''].join('\n');
    expect(motionPlanGap(ok)).toBe('');
    expect(motionPlanGap(ok.replace('- Seções: sobem 12 px ao entrar, 400 ms\n', ''))).toContain('Movimento');
    expect(motionPlanGap(ok.replace(/ms/g, 'segundos'))).toContain('Movimento');
    expect(motionPlanGap('## Telas\nnada')).toContain('Movimento');
  });

  it('só aceita licença MIT de verdade', () => {
    const dir = tmp();
    put(path.join(dir, 'LICENSE'), 'Todos os direitos reservados. Parecido com MIT License, mas não é.');
    expect(mitLicense(dir, ['LICENSE'])).toBe('');
    put(path.join(dir, 'LICENSE'), MIT);
    expect(mitLicense(dir, ['LICENCE.md', 'LICENSE'])).toContain('Permission is hereby granted');
  });

  it('cataloga como rascunho, com índice e licença, e só chega ao kit depois de validado', () => {
    const root = tmp();
    const from = path.join(root, 'clones');
    put(path.join(from, 'boa', 'LICENSE'), MIT);
    put(path.join(from, 'boa', 'src', 'borda.tsx'), 'import { motion } from "motion/react";\nexport const Borda = () => null;\n');
    put(path.join(from, 'fechada', 'LICENSE'), 'Proprietária.');
    put(path.join(from, 'fechada', 'src', 'x.tsx'), 'export {}');
    const res = catalogAcervo({ root, from, sources: [source('boa'), source('fechada'), source('ausente')] });
    expect(res).toMatchObject([{ slug: 'boa', ok: true, pieces: 1, status: 'rascunho' }, { slug: 'fechada', ok: false }, { slug: 'ausente', ok: false }]);
    expect(res[1].error).toContain('MIT');
    const dir = path.join(root, 'conhecimento', 'design', 'acervo', 'boa');
    expect(fs.existsSync(path.join(root, 'conhecimento', 'design', 'acervo', 'fechada'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8')).toBe(MIT);
    const index = fs.readFileSync(path.join(dir, 'indice.md'), 'utf8');
    expect(index).toContain('`pecas/borda.tsx` — Brilho na borda');
    expect(index).toContain('usa motion');
    expect(fs.existsSync(path.join(dir, 'pecas', 'borda.tsx.animacao.json'))).toBe(true);
    expect(listAcervo(root)).toMatchObject([{ slug: 'boa', status: 'rascunho', pieces: 1, use: 'efeitos de teste' }]);

    const ws = tmp();
    const antes = prepareDesignKit(ws, { role: 'construcao', family: 'marketing', maint: false, root });
    expect(antes.acervo).toEqual([]);
    expect(antes.block).not.toContain('Acervo de código aberto');
    const card = path.join(dir, 'card.md');
    fs.writeFileSync(card, fs.readFileSync(card, 'utf8').replace('status: rascunho', 'status: validado'));
    for (const role of ['direcao', 'construcao'] as const) {
      const kit = prepareDesignKit(ws, { role, family: 'produto', maint: false, root });
      expect(kit.block).toContain('.tavir/design/kit/acervo/boa/indice.md');
      expect(kit.block).toContain('aviso de licença');
    }
    expect(fs.existsSync(path.join(ws, '.tavir', 'design', 'kit', 'acervo', 'boa', 'pecas', 'borda.tsx'))).toBe(true);
    expect(prepareDesignKit(ws, { role: 'revisao', family: 'produto', maint: false, root }).block).not.toContain('Acervo de código aberto');
    // Com acervo validado, o contrato precisa do plano de movimento.
    put(path.join(ws, 'design', 'DESIGN.md'), '## Conceito\nUma ideia central bem descrita aqui.\n');
    expect(projectContractGaps(ws, 'padrao', root)!.some((g) => g.startsWith('Movimento'))).toBe(true);
    expect(projectContractGaps(ws, 'padrao')!.some((g) => g.startsWith('Movimento'))).toBe(false);
    // Catalogar de novo não derruba a validação do Carlos.
    expect(catalogAcervo({ root, from, sources: [source('boa')] })[0].status).toBe('validado');
  });
});

describe('marca em tokens e prancha', () => {
  const contract = ['## Tokens', '```tokens', 'cor.marca-100: #E6F4EF', 'cor.marca-300: #9AD3BF', 'cor.marca-500: #1F8A6B', 'cor.marca-700: #14604A', 'cor.marca-900: #0B3A2C', 'cor.tinta: #14181A', 'fonte.titulo: Sora', '```', ''].join('\n');
  const theme = [':root {', '  --cor-marca-100: #E6F4EF;', '  --cor-marca-300: #9AD3BF;', '  --cor-marca-500: #1F8A6B;', '  --cor-marca-700: #14604A;', '  --cor-marca-900: #0B3A2C;', '  --cor-tinta: #14181A;', '  --fundo: var(--cor-marca-100);', '  --superficie: var(--cor-marca-100);', '  --texto: var(--cor-tinta);', '  --acao: var(--cor-marca-500);', '  --borda: var(--cor-marca-300);', '  --foco: var(--cor-marca-700);', '}'].join('\n');
  const board = '<link rel="stylesheet" href="tema.css"><section style="background: var(--acao)"></section><button>Agendar</button><input><figure data-foto="equipe">Retrato dos sócios · 4:5</figure>';

  it('fecha com escala, papéis, cores do contrato e prancha com espécimes', () => {
    expect(brandGaps(theme, board, contract)).toEqual([]);
  });

  it('aponta o que falta no tema e na prancha', () => {
    expect(brandGaps('', '', contract)).toHaveLength(2);
    const semEscala = brandGaps(theme.replace('  --cor-marca-900: #0B3A2C;\n', ''), board, contract).join(' ');
    expect(semEscala).toContain('escala de cor');
    expect(brandGaps(theme.replace(/var\(--cor-tinta\)/, '#14181A'), board, contract).join(' ')).toContain('papéis');
    expect(brandGaps(theme + '\n.x { color: #FF00AA; }', board, contract).join(' ')).toContain('#ff00aa');
    const pranchaRuim = brandGaps(theme, '<style>body{background:#123456}</style><p>marca</p>', contract).join(' | ');
    for (const part of ['não importa tema.css', 'por fora do tema', 'data-foto', 'botão e de campo']) expect(pranchaRuim, part).toContain(part);
  });
});

describe('três pranchas de marca e escolha', () => {
  const theme = (name: string, scale: string[], action: string, background: string) =>
    [':root {', ...scale.map((hex, i) => `  --cor-${name}-${(i + 1) * 200 - 100}: ${hex};`), `  --cor-acento-500: ${action};`, '  --cor-branco-100: #FFFFFF;', '  --cor-areia-100: #EFE8DA;',
      `  --cor-marca: var(--cor-${name}-700);`, '  --cor-acao: var(--cor-acento-500);', `  --cor-fundo: var(${background});`, `  --cor-superficie: var(--cor-${name}-100);`, `  --cor-texto: var(--cor-${name}-900);`, `  --cor-borda: var(--cor-${name}-300);`, `  --cor-foco: var(--cor-${name}-500);`, '}'].join('\n');
  const board = '<link rel="stylesheet" href="tema.css"><header style="background: var(--cor-marca)"><h1>Título</h1><button>Agendar</button></header><input><figure data-foto="abertura">Retrato · 4:5</figure>';
  const azul = theme('cobalto', ['#EDF2FF', '#A9C0F5', '#4A74DE', '#1442B8', '#0C162E'], '#B83309', '--cor-branco-100');
  const verde = theme('esmeralda', ['#E5F8F1', '#9ADBC4', '#2FA57F', '#056046', '#081F17'], '#C2291B', '--cor-branco-100');
  const vinho = theme('ameixa', ['#FCEEF3', '#EBA9BF', '#B5456A', '#7A183A', '#1F0E15'], '#08665B', '--cor-branco-100');
  const tmp2 = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tavir-marca-'));

  it('lê a cor de um papel seguindo var() e reconhece neutro quente', () => {
    expect(themeColor(azul, '--cor-marca')).toBe('#1442b8');
    expect(themeColor(azul, '--cor-fundo')).toBe('#ffffff');
    expect(themeColor(azul, '--nao-existe')).toBe('');
    for (const bege of ['#EFE8DA', '#F4EFE6', '#E8DFD0', '#F7F3EA']) expect(isWarmNeutral(bege), bege).toBe(true);
    for (const ok of ['#FFFFFF', '#EDF2FF', '#E5F8F1', '#1442B8', '#F5F7FA']) expect(isWarmNeutral(ok), ok).toBe(false);
  });

  it('três pranchas vivas e de famílias diferentes fecham', () => {
    expect(brandBoardsGaps({ a: { theme: azul, board }, b: { theme: verde, board }, c: { theme: vinho, board } })).toEqual([]);
  });

  it('reprova fundo bege, cor principal apagada, famílias iguais e pasta faltando', () => {
    expect(colorRuleGaps(azul.replace('var(--cor-branco-100);', 'var(--cor-areia-100);')).join(' ')).toContain('neutro quente');
    expect(colorRuleGaps(theme('pedra', ['#F1F1F0', '#D4D3D0', '#9C9A95', '#5E5C58', '#1F1E1C'], '#B83309', '--cor-branco-100')).join(' ')).toContain('sem saturação');
    expect(colorRuleGaps(':root { --cor-marca: #1442B8; }').join(' ')).toContain('--cor-acao');
    const azul2 = theme('anil', ['#EEF1FF', '#AEB9F7', '#5466E0', '#2338B4', '#0D1230'], '#B83309', '--cor-branco-100');
    const iguais = brandBoardsGaps({ a: { theme: azul, board }, b: { theme: azul2, board }, c: { theme: vinho, board } }).join(' | ');
    expect(iguais).toContain('pranchas a e b são da mesma família de cor');
    const faltando = brandBoardsGaps({ a: { theme: azul, board }, b: { theme: verde, board: '' } });
    expect(faltando).toContain(`${BRAND_BOARDS_DIR}/b (falta tema.css ou prancha.html)`);
    expect(faltando).toContain(`${BRAND_BOARDS_DIR}/c (falta tema.css ou prancha.html)`);
  });

  it('entende a escolha do Carlos e adota a prancha escolhida', () => {
    expect(brandChoiceOf('Prancha B')).toBe('b');
    expect(brandChoiceOf('fico com a paleta: A, a cobalto')).toBe('a');
    expect(brandChoiceOf('c')).toBe('c');
    expect(brandChoiceOf('gostei, pode seguir')).toBe('');
    const ws = tmp2();
    for (const [k, t] of [['a', azul], ['b', verde], ['c', vinho]] as const) {
      put(path.join(ws, 'design', 'pranchas', k, 'tema.css'), t);
      put(path.join(ws, 'design', 'pranchas', k, 'prancha.html'), board);
    }
    expect(projectBrandBoardsGaps(ws)).toEqual([]);
    expect(adoptBrandBoard(ws, 'x').ok).toBe(false);
    expect(adoptBrandBoard(ws, 'B').ok).toBe(true);
    expect(fs.readFileSync(path.join(ws, 'design', 'tema.css'), 'utf8')).toBe(verde);
    expect(fs.existsSync(path.join(ws, 'design', 'prancha.html'))).toBe(true);
  });

  it('os moldes de criação ganham a etapa e o gate antes da direção; os de manutenção não', () => {
    for (const code of ['LP-C1', 'OF-C1', 'SY-C1'] as const) {
      const names = ESTEIRA_TEMPLATES[code].stages.map((s) => s.name);
      const at = names.indexOf(STAGE_MARCA);
      expect(names.slice(at, at + 3), code).toEqual([STAGE_MARCA, STAGE_ESCOLHA_MARCA, 'Direção de design']);
      expect(ESTEIRA_TEMPLATES[code].stages[at].gate).toBe(false);
      expect(ESTEIRA_TEMPLATES[code].stages[at + 1].gate).toBe(true);
      // Projeto gravado antes da etapa nova é remapeado pelo nome: a lista antiga está registrada.
      const antiga = names.filter((n) => n !== STAGE_MARCA && n !== STAGE_ESCOLHA_MARCA && !/prot[oó]tipo/i.test(n));
      expect((LEGACY_STAGE_NAMES[code] || []).some((l) => l.join('|') === antiga.join('|')), code).toBe(true);
    }
    for (const code of ['LP-M1', 'OF-M0', 'SY-M1'] as const) expect(ESTEIRA_TEMPLATES[code].stages.map((s) => s.name)).not.toContain(STAGE_MARCA);
  });

  it('o pedido das pranchas leva as regras de cor, e a direção respeita a marca escolhida', () => {
    const p = brandBoardsBlock({ soul: 'Sou a Marina.', canon: 'Cânone.' });
    for (const part of ['design/pranchas/a/', '--cor-marca', '--cor-acao', '--cor-fundo', 'Bege, creme, areia', '40°', 'data-foto', 'Não busque foto em banco']) expect(p, part).toContain(part);
    const base = { role: 'direcao' as const, family: 'marketing' as const, maint: false, souls: [], canon: '', skills: [], references: [], hasContract: false };
    const escolhida = designBlock({ ...base, brandChosen: 'b' });
    expect(escolhida).toContain('prancha B');
    expect(escolhida).toContain('Não troque cor nem fonte');
    expect(designBlock(base)).not.toContain('já foi escolhida');
    expect(designBlock({ ...base, role: 'construcao', hasContract: true })).toContain('Não troque uma faixa colorida');
  });
});
