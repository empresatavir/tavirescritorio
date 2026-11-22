/**
 * Pilar de design da Fábrica — fonte única.
 *
 * Vale para LP, oferta e sistema, em criação e em manutenção. Tudo aqui é texto e arquivo:
 * o pedido leva a alma e o cânone, e o método (skills, base de conhecimento, referências)
 * vai copiado para `.tavir/design/kit/` do projeto. Nada depende do recurso de skill de um
 * motor específico, então funciona igual em claude, codex, antigravity e cursor.
 */

export type DesignRole = 'direcao' | 'construcao' | 'revisao';
/** marketing = LP e oferta · produto = sistema. */
export type DesignFamily = 'marketing' | 'produto';

/**
 * Modo de design do projeto, escolhido pelo Carlos.
 * padrao = segue as convenções da categoria e ganha no acabamento.
 * conceito = parte de uma ideia central e quebra convenções de propósito.
 * A tarefa do usuário e o portão automático valem igual nos dois.
 */
export type DesignMode = 'padrao' | 'conceito';
export const DESIGN_MODE_LABEL: Record<DesignMode, string> = { padrao: 'Padrão', conceito: 'Conceito' };
/** Quantas convenções da categoria cada direção quebra no modo Conceito. */
export const CONCEPT_BREAKS_MIN = 2;

export function designMode(value: unknown): DesignMode {
  return /^conceito$/i.test(String(value || '').trim()) ? 'conceito' : 'padrao';
}

/** Modo pedido no texto de um item de manutenção («modo conceito», «modo padrão»). null = não disse. */
export function textDesignMode(text: string | null | undefined): DesignMode | null {
  const m = /\bmodo\s+(conceito|conceitual|padr[aã]o|comum)\b/i.exec(String(text || ''));
  if (!m) return null;
  return /^conceit/i.test(m[1]) ? 'conceito' : 'padrao';
}

function modeLines(mode: DesignMode, role: DesignRole): string[] {
  const head = `### Modo de design: ${DESIGN_MODE_LABEL[mode]}`;
  const same = 'O que não muda com o modo: a tarefa do usuário, a ação principal visível na primeira tela, contraste, alvo de toque de 44 px, foco visível e celular.';
  if (mode === 'conceito') {
    if (role === 'direcao') {
      return [
        head,
        'Fora da caixa de propósito. A entrega parte de uma ideia central (uma metáfora, um objeto ou um gesto tirado do negócio deste cliente) e a página ou o sistema inteiro é montado em cima dela. Página correta e comum reprova neste modo.',
        `- Cada direção quebra pelo menos ${CONCEPT_BREAKS_MIN} convenções da categoria e diz quais: estrutura da página, navegação, escala tipográfica, forma de mostrar a prova, relação entre texto e imagem, formato da ação principal.`,
        '- As direções partem de ideias diferentes, não da mesma ideia com outra roupa.',
        '- Nenhuma seção repete a estrutura da anterior. Sequência de título, subtítulo e lista em blocos iguais é o padrão que este modo existe para evitar.',
        '- Movimento e interação podem fazer parte da ideia, desde que parem quando o sistema pede movimento reduzido.',
        `- No contrato, a seção «Conceito» nomeia a ideia central e traz uma linha «Convenções quebradas:» com pelo menos ${CONCEPT_BREAKS_MIN} itens. A conferência do Escritório reprova o contrato sem essa linha.`,
        '- Nos dials da seção «Leitura», variância de layout 8 ou mais.',
        `${same} Conceito que atrapalha a tarefa reprova do mesmo jeito.`,
      ];
    }
    if (role === 'construcao') {
      return [
        head,
        'Construa a ideia central do contrato inteira, sem domesticar: não troque a estrutura proposta por seções empilhadas de mesmo formato. Se um trecho do conceito for inviável, diga qual e por quê no fim da resposta, em vez de cair no layout comum em silêncio.',
        same,
      ];
    }
    return [
      head,
      'Este projeto foi pedido fora da caixa. Além dos casos gerais, devolver também é obrigatório quando: a página parece uma página comum da categoria (seções empilhadas de mesma estrutura); as convenções quebradas que o contrato lista não aparecem na construção; ou a ideia central só existe no texto do contrato e não na tela.',
      'Ousadia não compra desconto na Tarefa: os cinco critérios de Tarefa valem inteiros.',
    ];
  }
  if (role === 'direcao') {
    return [
      head,
      'O visitante tem de reconhecer o tipo de página ou de sistema na hora. Siga as convenções da categoria (ordem das seções, posição da ação principal, navegação) e ganhe no acabamento: tipografia, ritmo, texto e prova real.',
      '- As direções variam tipografia, cor, ritmo e tratamento da prova dentro do reconhecível.',
      '- A ideia própria continua obrigatória (teste da troca), mas mora no conteúdo e no detalhe, não em estrutura inesperada.',
      '- A «Quebra de regra» do contrato é uma só e pequena.',
      same,
    ];
  }
  if (role === 'construcao') return [head, 'Estrutura reconhecível, acabamento alto. Não invente estrutura que o contrato não pede.', same];
  return [head, 'Este projeto foi pedido dentro das convenções da categoria. Não desconte nota por estrutura reconhecível; desconte por acabamento fraco e por quebra de convenção que faça o visitante hesitar.'];
}

/** Arquivos de design dentro do projeto (entram no git dele, como `specs/`). */
export const DESIGN_FILES = { contract: 'design/DESIGN.md', brand: 'design/marca.md', directions: 'design/direcoes', photos: 'design/fotos.md', theme: 'design/tema.css', board: 'design/prancha.html' } as const;
/** Passos mínimos de uma escala de cor no tema. */
export const THEME_SCALE_MIN = 5;
/** Papéis mínimos (variáveis que apontam para outra com var()) no tema. */
export const THEME_ROLES_MIN = 6;
/** Quantas direções diferentes a direção de design apresenta para o Carlos escolher (criação). */
export const DIRECTIONS_MIN = 3;
/** Kit copiado pelo Escritório (fora do git do projeto; `.tavir/` não entra no diff da etapa). */
export const DESIGN_KIT_DIR = '.tavir/design/kit';

export const STAGE_DIRECAO = 'Direção de design';
export const STAGE_APROVACAO = 'Aprovação do design';
export const STAGE_REVISAO = 'Gate · Revisão de design';
export const REVISOR = 'Revisor de Design';

export function designFamily(code: string | null | undefined): DesignFamily {
  return /^sy/i.test(String(code || '')) ? 'produto' : 'marketing';
}

export function isMaintenance(code: string | null | undefined): boolean {
  return /-m/i.test(String(code || ''));
}

/** Papel de design de uma etapa da esteira (null = etapa sem design). */
export function stageDesignRole(stage: { name: string; skill?: string }): DesignRole | null {
  const name = String(stage.name || '');
  if (/revis[aã]o de design/i.test(name)) return 'revisao';
  if (name === STAGE_DIRECAO || /^prova visual$/i.test(name)) return 'direcao';
  if (/frontend-excelencia-tavir/.test(String(stage.skill || '')) || /^(Construção|Construção Front|Construção incremental|Página da oferta|Página revisada)$/.test(name)) return 'construcao';
  return null;
}

const VISUAL_RE = /\b(layout|redesign|redesenh\w*|identidade|visual|marca|branding|design|paleta|tipografia|tema|interface|tela|telas|landing|p[aá]gina|ui|ux)\b/i;
const DESIGNER_RE = /\b(marina|yuri)\b/i;
const FRONT_RE = /\b(diego|vitor|rafa|lia|front|construtor)\b/i;

/**
 * Papel de design de um item do trilho de alteração (manutenção depois da entrega).
 * Marina ou Yuri conduzem a direção; quem constrói interface segue o contrato quando ele existe
 * ou quando o item fala de mudança visual.
 */
export function trackDesignRole(item: { label: string; owner: string; skill?: string }, hasContract: boolean): DesignRole | null {
  const text = `${item.label} ${item.skill || ''}`;
  if (DESIGNER_RE.test(item.owner)) return 'direcao';
  if (/revisor de design/i.test(item.owner)) return 'revisao';
  if (FRONT_RE.test(item.owner) && (hasContract || VISUAL_RE.test(text))) return 'construcao';
  return null;
}

/** Skills copiadas para o kit, na ordem em que o agente deve abrir. Uma estética por trabalho. */
export function designSkills(role: DesignRole, family: DesignFamily, maint: boolean): string[] {
  if (role === 'revisao') return ['audit-ai-design-slop', 'owl-critica-visual', 'jakub-interface'];
  // Base estética: uma por família. `no-ai-design-slop` é o filtro contra escolha por reflexo, em todas.
  const taste = family === 'produto' ? ['ui-ux-pro-max', 'ui-styling'] : ['tastemaker', 'elaya-landing'];
  if (role === 'construcao') return [...taste, 'no-ai-design-slop', 'jakub-interface', 'emil-motion', 'frontend-engineering-canon'];
  return [
    'brand-context',
    'brand-positioning',
    'brand-voice',
    'brand-identity',
    ...taste,
    'no-ai-design-slop',
    'mengto-receitas',
    'emil-motion',
    ...(family === 'produto' ? ['design-system'] : []),
    'visual-reference-absorb',
    ...(maint ? ['redesign-existing-projects'] : []),
  ];
}

/** Seções obrigatórias do contrato de design. A checagem é por título, não por opinião do motor. */
export const CONTRACT_SECTIONS = [
  'Leitura',
  'Conceito',
  'Tarefa do usuário',
  'Tokens',
  'Tipografia',
  'Componentes e estados',
  'Telas',
  'Referências',
  'Proibido',
] as const;

export const CONTRACT_TEMPLATE = `# Contrato de design — <projeto>

## Leitura
Uma linha: tipo de página ou sistema, público, linguagem visual e família.
Dials de 1 a 10: variância de layout · intensidade de movimento · densidade visual.

## Conceito
A ideia própria desta entrega, em uma frase: o que ela tem que só serve para este cliente.
- Teste da troca: trocando o logo, esta página serviria para um concorrente? Se sim, o conceito
  ainda não existe. Diga o que impede a troca.
- Estrutura: a forma da página, com nome, e por que não é a sequência de sempre (abertura,
  três cartões, depoimento, chamada).
- Quebra de regra: o único ponto em que o layout sai do previsível de propósito, e o motivo.
- Imagem: onde a página tem foto e onde não tem, e por quê. A foto vem do cliente: cada espaço
  de foto tem nome, proporção e o que mostrar. Forma abstrata e degradê decorativo não ocupam
  lugar de foto.

## Tarefa do usuário
O que a pessoa veio fazer, em ordem. Para cada tela: a ação principal e o que precisa
estar visível sem rolar para ela acontecer. Bonito que não entrega a tarefa reprova.

## Tokens
Cores, fontes, raio e espaçamento. Toda cor e toda fonte usada neste contrato entra no bloco
abaixo, uma por linha, com nome de papel (cor.fundo, cor.botao-whatsapp, cor.erro). A conferência
do Escritório reprova cor citada no contrato que não esteja no bloco.

\`\`\`tokens
cor.fundo: #FFFFFF
cor.texto: #111111
cor.acento: #0B5FFF
fonte.titulo: Nome da Fonte
fonte.corpo: Nome da Fonte
\`\`\`

Contraste de cada par texto/fundo usado (mínimo 4,5:1; 3:1 para texto grande).

## Tipografia
Escala (display, título, corpo, legenda) com tamanho, peso e altura de linha. Licença das fontes.

## Componentes e estados
Botão, campo, cartão, navegação e o que mais existir. Para cada um: normal, hover, foco
visível, desabilitado. Para cada tela com dado: vazio, carregando e erro.

## Telas
Lista de telas ou seções na ordem, com a hierarquia de cada uma (o que é primeiro, segundo,
terceiro) e o comportamento em 390, 768, 1024 e 1440 px.

## Referências
As referências usadas (da biblioteca do kit ou capturadas agora), com o que se aproveita da
estrutura de cada uma e o que não se copia. Sem referência, diga por quê.

## Proibido
O que esta entrega não pode ter (os clichês do cânone e os específicos deste projeto).
`;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Seções do contrato que faltam ou estão vazias. Lista vazia = contrato completo. */
/**
 * Conferência do tema (`design/tema.css`) e da prancha (`design/prancha.html`) contra o contrato.
 * Lista vazia = marca entregue em tokens e mostrada na prancha.
 */
export function brandGaps(theme: string | null | undefined, board: string | null | undefined, contract: string | null | undefined): string[] {
  const gaps: string[] = [];
  const css = String(theme || '');
  if (!css.trim()) gaps.push(`${DESIGN_FILES.theme} (não foi gravado)`);
  else {
    const scales = new Map<string, Set<string>>();
    for (const m of css.matchAll(/--([a-z][\w-]*?)-(\d{2,3})\s*:/gi)) scales.set(m[1].toLowerCase(), (scales.get(m[1].toLowerCase()) || new Set()).add(m[2]));
    if (![...scales.values()].some((s) => s.size >= THEME_SCALE_MIN)) gaps.push(`${DESIGN_FILES.theme} (nenhuma escala de cor com ${THEME_SCALE_MIN} passos ou mais)`);
    const roles = [...css.matchAll(/--[\w-]+\s*:\s*var\(\s*--[\w-]+/g)].length;
    if (roles < THEME_ROLES_MIN) gaps.push(`${DESIGN_FILES.theme} (camada de papéis: ${roles} de ${THEME_ROLES_MIN} variáveis apontando para a escala com var())`);
    // `contract === null`: ainda não há contrato (pranchas para escolha); a conferência das cores fica para a direção.
    const allowed = new Set(contractTokens(contract).colors.map(hex6));
    const loose = contract === null ? [] : [...new Set([...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => hex6(m[0])))].filter((c) => !allowed.has(c));
    if (loose.length) gaps.push(`${DESIGN_FILES.theme} (cores fora do bloco tokens do contrato: ${loose.slice(0, 8).join(', ')}${loose.length > 8 ? ` e mais ${loose.length - 8}` : ''})`);
  }
  const html = String(board || '');
  if (!html.trim()) gaps.push(`${DESIGN_FILES.board} (não foi gravada)`);
  else {
    if (!/tema\.css/i.test(html)) gaps.push(`${DESIGN_FILES.board} (não importa tema.css)`);
    // Só conta cor declarada em estilo; o código da cor escrito como legenda da amostra é texto.
    const styled = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).concat([...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1])).join('\n');
    const own = [...new Set([...styled.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => hex6(m[0])))];
    if (own.length) gaps.push(`${DESIGN_FILES.board} (declara cor por fora do tema: ${own.slice(0, 6).join(', ')})`);
    if (!/data-foto/i.test(html)) gaps.push(`${DESIGN_FILES.board} (falta o espécime de espaço de foto, com data-foto)`);
    if (!/<button\b/i.test(html) || !/<input\b|<textarea\b|<select\b/i.test(html)) gaps.push(`${DESIGN_FILES.board} (faltam os espécimes de botão e de campo)`);
  }
  return gaps;
}

/** Etapa em que a Marina entrega as pranchas para escolha, e o gate em que o Carlos escolhe. */
export const STAGE_MARCA = 'Marca · três pranchas';
export const STAGE_ESCOLHA_MARCA = 'Escolha da marca';
/** Pasta das pranchas para escolha: `design/pranchas/a|b|c/` com `tema.css` e `prancha.html`. */
export const BRAND_BOARDS_DIR = 'design/pranchas';
export const BRAND_BOARDS = ['a', 'b', 'c'] as const;
/** Papéis que todo tema de prancha declara, para o Escritório conferir as regras de cor. */
export const BRAND_ROLES = { brand: '--cor-marca', action: '--cor-acao', background: '--cor-fundo' } as const;
/** Distância mínima de matiz entre as cores principais de duas pranchas (graus). */
export const BRAND_HUE_GAP = 40;
/** Saturação mínima da cor principal (HSL, 0 a 1): abaixo disso lê como neutro. */
export const BRAND_MIN_SATURATION = 0.4;

/** Valor final de uma variável do tema, seguindo `var()` até um hex. Vazio se não resolve. */
export function themeColor(css: string, name: string): string {
  let current = name;
  for (let i = 0; i < 8; i += 1) {
    const m = new RegExp(`${current.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*([^;}]+)`).exec(css);
    if (!m) return '';
    const value = m[1].trim();
    const hex = /^#[0-9a-f]{3,8}\b/i.exec(value);
    if (hex) return hex6(hex[0]);
    const ref = /^var\(\s*(--[\w-]+)/.exec(value);
    if (!ref) return '';
    current = ref[1];
  }
  return '';
}

/** Matiz (0 a 360), saturação e luminosidade (0 a 1) de um hex. */
export function hsl(hex: string): { h: number; s: number; l: number } {
  const n = hex6(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

/** Bege, creme, areia e cinza-quente: claro, pouco saturado e de matiz quente. */
export function isWarmNeutral(hex: string): boolean {
  const { h, s, l } = hsl(hex);
  return l >= 0.72 && s >= 0.06 && s <= 0.6 && h >= 15 && h <= 75;
}

/** Regras de cor de um tema: papéis declarados, cor principal viva e fundo que não é neutro quente. */
export function colorRuleGaps(theme: string | null | undefined): string[] {
  const css = String(theme || '');
  const gaps: string[] = [];
  const brand = themeColor(css, BRAND_ROLES.brand);
  const action = themeColor(css, BRAND_ROLES.action);
  const background = themeColor(css, BRAND_ROLES.background);
  const missing = Object.values(BRAND_ROLES).filter((v) => !themeColor(css, v));
  if (missing.length) return [`papéis ${missing.join(', ')} não declarados no tema ou sem chegar a uma cor`];
  if (hsl(brand).s < BRAND_MIN_SATURATION) gaps.push(`cor principal ${brand} sem saturação (lê como neutro)`);
  if (isWarmNeutral(brand)) gaps.push(`cor principal ${brand} é neutro quente (bege, creme, areia)`);
  if (isWarmNeutral(background)) gaps.push(`fundo ${background} é neutro quente (bege, creme, areia); use branco, um tom claro da cor da marca ou a cor da marca em bloco`);
  if (action === brand) gaps.push('a ação usa a mesma cor da marca: falta o acento que destaca o botão principal');
  return gaps;
}

const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/**
 * Conferência das pranchas para escolha. `boards` traz, por letra, o tema e a prancha.
 * Lista vazia = três pranchas completas, vivas e de famílias de cor diferentes.
 */
export function brandBoardsGaps(boards: Partial<Record<string, { theme: string; board: string }>>): string[] {
  const gaps: string[] = [];
  const hues: Array<[string, number]> = [];
  for (const k of BRAND_BOARDS) {
    const b = boards[k];
    const where = `${BRAND_BOARDS_DIR}/${k}`;
    if (!b || !b.theme.trim() || !b.board.trim()) {
      gaps.push(`${where} (falta tema.css ou prancha.html)`);
      continue;
    }
    for (const g of brandGaps(b.theme, b.board, null)) gaps.push(g.replace(/^design\//, `${where}/`));
    const colour = colorRuleGaps(b.theme);
    for (const g of colour) gaps.push(`${where}/tema.css (${g})`);
    if (!colour.length) hues.push([k, hsl(themeColor(b.theme, BRAND_ROLES.brand)).h]);
  }
  for (let i = 0; i < hues.length; i += 1) {
    for (let j = i + 1; j < hues.length; j += 1) {
      if (hueGap(hues[i][1], hues[j][1]) < BRAND_HUE_GAP) gaps.push(`pranchas ${hues[i][0]} e ${hues[j][0]} são da mesma família de cor (matizes a menos de ${BRAND_HUE_GAP}° uma da outra)`);
    }
  }
  return gaps;
}

/** Letra da prancha escolhida no texto da decisão («Prancha B», «a B», «b»). Vazio se não diz. */
export function brandChoiceOf(text: string | null | undefined): string {
  const t = String(text || '').trim().toLowerCase();
  const m = /\b(?:prancha|paleta|op[cç][aã]o|marca)\s*:?\s*([abc])\b/.exec(t) || /^(?:a\s+)?([abc])\b/.exec(t);
  return m ? m[1] : '';
}

/** Regras de cor que valem para marca, direção e construção. */
export const COLOR_RULES = [
  'Bege, creme, areia e cinza-quente não são fundo dominante. O fundo é branco limpo, um tom claro da própria cor da marca ou a cor da marca em bloco.',
  'A cor da marca ocupa área: na página, pelo menos duas faixas de largura inteira (a abertura é uma delas). Cor que só aparece em texto e detalhe é enfeite, não marca.',
  'Na proporção de uso, a cor da marca (principal mais apoio) fica com 40% ou mais da área, e o neutro com 50% ou menos.',
  'O acento contrasta com a principal e fica reservado para a ação principal.',
];

/** Pedido da etapa «Marca · três pranchas». */
export function brandBoardsBlock(input: { soul: string; canon: string }): string {
  const dir = BRAND_BOARDS_DIR;
  return [
    '## Marca — três pranchas para o Carlos escolher',
    'O Carlos escolhe a marca olhando, não lendo. Antes de qualquer página, ele compara três pranchas de marca e fica com uma.',
    `O material de apoio está em \`${DESIGN_KIT_DIR}/\` (cópia do Escritório, só leitura). Abra os arquivos com a leitura de arquivo do seu ambiente; não dependa de recurso de skill do motor.`,
    ...(input.soul.trim() ? ['', '### Quem você é nesta etapa', input.soul.trim()] : []),
    ...(input.canon.trim() ? ['', '### Cânone de design', input.canon.trim()] : []),
    '',
    '### O que entregar',
    `1. \`${DESIGN_FILES.brand}\`: contexto com origem, posicionamento em uma frase, público e tom de voz com exemplos. A paleta e a tipografia ficam em aberto até a escolha. Se o projeto já tem marca definida pelo cliente (cores, logotipo), registre-a com o arquivo de origem: as três pranchas partem dela e variam o apoio, o acento e a tipografia, sem trocar a cor do cliente.`,
    `2. \`${dir}/a/\`, \`${dir}/b/\` e \`${dir}/c/\`, cada pasta com \`tema.css\` e \`prancha.html\`.`,
    `3. \`${dir}/LEIA.md\`: uma linha por prancha (nome, ideia, para quem funciona melhor, risco) e a sua recomendação.`,
    'Não escreva página, contrato de design nem código de produção nesta etapa.',
    '',
    '### Regras das três pranchas',
    `- Três famílias de cor diferentes de verdade: a cor principal de cada uma fica a pelo menos ${BRAND_HUE_GAP}° de matiz das outras duas. Três tons da mesma cor não são três opções.`,
    '- Cor principal viva e saturada, adequada ao público e ao que o cliente pediu no briefing.',
    ...COLOR_RULES.map((r) => `- ${r}`),
    '- Contraste de texto de 4,5:1 em todo par usado; a prancha mostra o valor dos pares principais.',
    '- Tipografia com licença livre; pode variar entre as pranchas. Diga qual e a licença.',
    '',
    '### Formato de cada pasta',
    `- \`tema.css\` em duas camadas. Primeira, as escalas: cada cor do claro ao escuro em ${THEME_SCALE_MIN} passos ou mais (\`--cor-<nome>-100\` … \`--cor-<nome>-900\`), mais espaço, raio, sombra e fontes. Segunda, os papéis, que apontam para a primeira com \`var()\`. Três papéis têm nome fixo, porque o Escritório confere por eles: \`${BRAND_ROLES.brand}\` (cor principal), \`${BRAND_ROLES.action}\` (botão da ação principal) e \`${BRAND_ROLES.background}\` (fundo da página). Os demais: superfície, texto, texto secundário, texto sobre a marca, borda, foco, erro e sucesso.`,
    '- `prancha.html` importa só o `tema.css` da própria pasta e não declara cor nem fonte por fora dele. Nesta ordem: (1) no topo, uma amostra da primeira tela da página, em largura inteira e com a cor da marca em área: cabeçalho, o título principal tirado do briefing, o botão da ação principal, os números de prova que o briefing traz e um espaço de foto com legenda e `data-foto`; (2) a paleta em blocos na proporção de uso; (3) cada escala do claro ao escuro com o nome da variável; (4) a tipografia em tamanho real, com frases do briefing; (5) os espécimes: botão principal e secundário (normal, foco e desabilitado), campo de formulário, cartão, etiqueta e espaço de foto.',
    '- As três pranchas usam a mesma estrutura e os mesmos textos, para o Carlos comparar marca com marca.',
    '- HTML estático e autônomo, que abre com duplo clique. Sem JavaScript obrigatório, sem imagem externa, sem texto de enchimento.',
    '- Foto: quem fornece é o cliente, depois. O espaço de foto é um marcador com proporção e legenda do que fotografar. Não busque foto em banco nem gere imagem.',
    'Escreva um arquivo por vez e confira que os sete existem antes de responder. Sem as três pastas completas e dentro das regras de cor, a etapa não fecha.',
  ].join('\n');
}

/** Linhas mínimas do plano de movimento quando há acervo validado no kit. */
export const MOTION_PLAN_MIN = 3;

/** Plano de movimento: título «Movimento» com pelo menos três itens, cada um com a duração em ms. */
export function motionPlanGap(body: string): string {
  const want = `Movimento (título «Movimento» com pelo menos ${MOTION_PLAN_MIN} itens de lista, cada um com onde acontece, o gatilho, a duração em ms e a peça do acervo)`;
  const head = /^#{2,4}[ \t]+Movimento\b.*$/im.exec(body);
  if (!head) return want;
  const rest = body.slice(head.index + head[0].length);
  const block = rest.slice(0, /^#{1,4}\s/m.exec(rest)?.index ?? rest.length);
  const items = block.split(/\r?\n/).filter((l) => /^\s*(?:[-*]|\d+[.)])\s+\S/.test(l) && /\d+\s*ms\b/i.test(l));
  return items.length >= MOTION_PLAN_MIN ? '' : want;
}

export function contractGaps(text: string | null | undefined, mode: DesignMode = 'padrao', opts: { motion?: boolean } = {}): string[] {
  const body = String(text || '');
  const motionGap = opts.motion ? motionPlanGap(body) : '';
  if (motionGap) return [...contractGaps(body, mode), motionGap];
  const conceptGap = mode === 'conceito' ? conceptBreaksGap(body) : '';
  if (conceptGap) return [...contractGaps(body), conceptGap];
  const heads = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => ({ title: norm(m[1]), at: m.index || 0, end: (m.index || 0) + m[0].length }));
  const gaps: string[] = [];
  for (const section of CONTRACT_SECTIONS) {
    const i = heads.findIndex((h) => h.title.startsWith(norm(section)));
    if (i < 0) {
      gaps.push(section);
      continue;
    }
    const content = body.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].at : body.length).trim();
    if (content.length < 20) gaps.push(section);
  }
  if (!gaps.includes('Tokens') && !contractTokens(body).colors.length) gaps.push('Tokens (bloco ```tokens com as cores)');
  const loose = looseColors(body);
  if (loose.length) gaps.push(`Tokens (cores usadas fora do bloco: ${loose.slice(0, 8).join(', ')}${loose.length > 8 ? ` e mais ${loose.length - 8}` : ''})`);
  return gaps;
}

/** Modo Conceito: a seção «Conceito» precisa da linha «Convenções quebradas:» com o mínimo de itens. */
function conceptBreaksGap(body: string): string {
  const section = /^##\s+Conceito\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(body)?.[1] || '';
  const at = /conven[cç][oõ]es quebradas\s*:?/i.exec(section);
  const want = `Conceito (modo Conceito: linha «Convenções quebradas:» com pelo menos ${CONCEPT_BREAKS_MIN} itens)`;
  if (!at) return want;
  const rest = section.slice(at.index + at[0].length);
  // «**Convenções quebradas:**» em negrito deixa só os asteriscos na linha: não conta como item.
  const sameLine = rest.split(/\r?\n/)[0].replace(/^[\s*_]+/, '').trim();
  const items = sameLine
    ? sameLine.split(/[;,]|\s+e\s+/).map((x) => x.trim()).filter((x) => x.length > 3)
    : rest.split(/\r?\n/).slice(1).filter((l, i, all) => /^\s*(?:[-*]|\d+[.)])\s+\S/.test(l) && all.slice(0, i).every((p) => /^\s*(?:[-*]|\d+[.)])\s+\S/.test(p) || !p.trim()));
  return items.length >= CONCEPT_BREAKS_MIN ? '' : want;
}

const hex6 = (c: string) => {
  const h = c.toLowerCase();
  return h.length === 4 ? '#' + h.slice(1).split('').map((x) => x + x).join('') : h.slice(0, 7);
};

/**
 * Cores citadas no contrato que não estão no bloco de tokens. As seções «Referências» e
 * «Proibido» ficam de fora: ali a cor é de outro site ou é exemplo do que não usar.
 */
export function looseColors(text: string | null | undefined): string[] {
  const body = String(text || '');
  const allowed = new Set(contractTokens(body).colors.map(hex6));
  const skip = ['referencias', 'proibido'];
  const out: string[] = [];
  let skipping = false;
  let inTokens = false;
  for (const line of body.split(/\r?\n/)) {
    const head = /^##\s+(.+?)\s*$/.exec(line);
    if (head) skipping = skip.some((k) => norm(head[1]).startsWith(k));
    if (/^```tokens/.test(line)) inTokens = true;
    else if (inTokens && /^```/.test(line)) inTokens = false;
    if (skipping || inTokens) continue;
    for (const m of line.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const c = hex6(m[0]);
      if (!allowed.has(c) && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

export interface ContractTokens {
  colors: string[];
  fonts: string[];
}

/** Cores e fontes do bloco ```tokens do contrato. O portão de design confere a página contra isto. */
export function contractTokens(text: string | null | undefined): ContractTokens {
  const block = /```tokens\s*\n([\s\S]*?)```/.exec(String(text || ''));
  const out: ContractTokens = { colors: [], fonts: [] };
  if (!block) return out;
  for (const line of block[1].split(/\r?\n/)) {
    const m = /^\s*([\w.-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '').trim();
    if (/^cor\b/i.test(m[1]) && /^#[0-9a-f]{3,8}$/i.test(value)) out.colors.push(value.toLowerCase());
    else if (/^fonte\b/i.test(m[1]) && value) out.fonts.push(value);
  }
  return out;
}

/** Rubrica do revisor: metade do peso em tarefa, metade em acabamento. */
export const REVIEW_RUBRIC = [
  ['Tarefa', 'A primeira tela diz o que é e qual é a ação principal, sem rolar.'],
  ['Tarefa', 'O caminho até a ação principal não tem passo sobrando nem campo desnecessário.'],
  ['Tarefa', 'Estados vazio, carregando e erro existem e dizem o que fazer.'],
  ['Tarefa', 'Funciona no celular com o polegar: nada cortado, alvo de toque folgado, texto legível.'],
  ['Tarefa', 'O texto da interface é direto e diz a consequência de cada ação.'],
  ['Acabamento', 'Hierarquia: dá para dizer o que é primeiro, segundo e terceiro em cada tela.'],
  ['Acabamento', 'Segue os tokens do contrato: cor, fonte, raio e espaçamento sem exceção solta.'],
  ['Acabamento', 'Ritmo e alinhamento: espaçamento consistente, nada desalinhado por poucos pixels.'],
  ['Acabamento', 'Tem ideia própria: trocando o logo, não serviria para outro negócio; não cai nos clichês do cânone.'],
  ['Acabamento', 'Movimento só onde comunica; nada pisca, pula ou atrasa a tarefa.'],
] as const;

export interface DesignBlockInput {
  role: DesignRole;
  family: DesignFamily;
  maint: boolean;
  /** Texto das almas (ofício) de quem conduz. */
  souls: string[];
  canon: string;
  /** Skills que o kit realmente tem (nomes de pasta). */
  skills: string[];
  /** Cards de referência validados que o kit tem (caminhos relativos ao projeto). */
  references: string[];
  /** Letra da prancha de marca que o Carlos escolheu; o tema e a prancha já estão em `design/`. */
  brandChosen?: string;
  /** Índices do acervo de código aberto já no kit, cada um com o que a biblioteca serve. */
  acervo?: string[];
  /** O contrato já existe no projeto. */
  hasContract: boolean;
  /** Pasta de prints do último QA, relativa ao projeto (revisão). */
  prints?: string;
  /** Modo de design do projeto ou do item de manutenção. */
  mode?: DesignMode;
}

const kit = (rel: string) => `${DESIGN_KIT_DIR}/${rel}`;

/** Bloco de design do pedido. Só texto e caminhos do projeto: serve a qualquer motor. */
export function designBlock(input: DesignBlockInput): string {
  const { role, family, maint } = input;
  const lines: string[] = ['## Design — pilar da Fábrica TAVIR'];
  lines.push(
    'Útil e bonito na mesma proporção: a interface primeiro entrega a tarefa de quem usa, e faz isso com acabamento profissional. Uma não compensa a falta da outra.',
    `O material de apoio está em \`${DESIGN_KIT_DIR}/\` (cópia do Escritório, só leitura). Abra os arquivos com a leitura de arquivo do seu ambiente; não dependa de recurso de skill do motor.`,
  );
  if (input.souls.length) lines.push('', '### Quem você é nesta etapa', ...input.souls.map((s) => s.trim()));
  if (input.canon.trim()) lines.push('', '### Cânone de design', input.canon.trim());
  lines.push('', ...modeLines(input.mode || 'padrao', role));

  if (role === 'direcao') {
    lines.push(
      '',
      '### O que entregar',
      `1. \`${DESIGN_FILES.brand}\`: quem a marca é (posicionamento em uma frase, público, tom de voz com exemplos do que dizer e do que não dizer), paleta com o contraste de cada par e tipografia com licença. Se o projeto já tem marca, registre a que existe, com o arquivo de origem; não invente outra.`,
      `2. \`${DESIGN_FILES.contract}\`: o contrato de design, com todas as seções do modelo em \`${kit('MODELO-DESIGN.md')}\`. A construção vai seguir este arquivo e o portão automático lê o bloco \`tokens\` dele: toda cor e toda fonte que o contrato usa precisa estar nesse bloco.`,
      maint
        ? `Este projeto já existe. Leia a interface atual antes de propor: diga o que fica, o que muda e por quê. Mudança de layout ou de identidade altera \`${DESIGN_FILES.contract}\` primeiro e o código depois. Se o pedido deste ciclo não muda nada visual, diga isso em uma linha e não altere os arquivos de design.`
        : 'Projeto novo: a marca vem antes da tela, e o contrato vem antes de qualquer código de interface.',
      maint
        ? `3. Só se o pedido for redesenho ou mudança de identidade: ${DIRECTIONS_MIN} direções em \`${DESIGN_FILES.directions}/a\`, \`b\` e \`c\` (um \`index.html\` estático em cada), como descrito no cânone.`
        : `3. \`${DESIGN_FILES.directions}/a/index.html\`, \`b\` e \`c\`: ${DIRECTIONS_MIN} direções diferentes para o Carlos escolher, cada uma um HTML estático e autônomo com a primeira tela e a seção seguinte. Diferentes de verdade: outra estrutura, outra tipografia e outra relação entre texto e imagem, não a mesma página com outra paleta. Diga qual recomenda e por quê; o contrato descreve a recomendada. Sem a pasta com as ${DIRECTIONS_MIN}, a etapa não fecha.`,
      ...(maint
        ? [`Se o pedido mexe em identidade, entregue também \`${DESIGN_FILES.theme}\` e \`${DESIGN_FILES.board}\`, como em projeto novo.`]
        : input.brandChosen
          ? [
              `4. A marca já foi escolhida pelo Carlos entre três pranchas (prancha ${input.brandChosen.toUpperCase()}): \`${DESIGN_FILES.theme}\` e \`${DESIGN_FILES.board}\` já estão na pasta e são a marca do projeto. Não troque cor nem fonte. Registre a paleta e a tipografia em \`${DESIGN_FILES.brand}\`, ponha todas as cores do tema no bloco \`tokens\` do contrato e vista as três direções com esse tema: elas variam estrutura, composição e relação entre texto e imagem, não a marca.`,
              'Se o contrato precisar de uma cor que o tema não tem (um estado, um gráfico), acrescente ao tema como passo de uma escala existente e diga na resposta; não crie família de cor nova.',
            ]
          : [
            `4. \`${DESIGN_FILES.theme}\`: a marca em variáveis CSS, em duas camadas. Primeira, as escalas: cada cor da marca do claro ao escuro em pelo menos ${THEME_SCALE_MIN} passos (\`--cor-<nome>-100\` … \`--cor-<nome>-900\`), mais espaço, raio, sombra e as fontes. Segunda, os papéis, que apontam para a primeira com \`var()\`: fundo, superfície, texto, texto secundário, ação, texto sobre a ação, borda, foco, erro e sucesso. Página e componente usam só os papéis. Toda cor deste arquivo está também no bloco \`tokens\` do contrato.`,
            `5. \`${DESIGN_FILES.board}\`: a prancha de marca, um HTML estático que importa \`tema.css\` e não declara cor nem fonte por fora dele. Mostra, nesta ordem: a paleta em blocos na proporção de uso, com a cor principal da marca ocupando uma faixa de tela inteira (cor que só aparece em texto e detalhe não é marca, é enfeite); cada escala do claro ao escuro com o nome da variável; a tipografia em tamanho real, com frases do briefing; e os espécimes vestidos com a marca: botão principal e secundário (normal, foco e desabilitado), campo de formulário, cartão, etiqueta e um espaço de foto com legenda. Sem texto de enchimento. É por ela que o Carlos julga a marca antes de olhar as páginas.`,
            `O tema e a prancha descrevem a direção recomendada. Sem os dois, a etapa não fecha.`,
          ]),
      `Cor, nas páginas e na prancha: ${COLOR_RULES.join(' ')}`,
      `Foto: quem fornece é o cliente, depois. Desenhe a página com os espaços de foto que ela pede, como se as fotos já existissem; falta de material não é motivo para página só de texto. Cada espaço é um marcador visível: bloco na proporção final, com fundo de um token da marca e uma legenda curta dizendo o que fotografar e a proporção (exemplo: «Retrato dos dois sócios na sala de atendimento · 4:5»), e o atributo \`data-foto\` com o nome do espaço. Liste todos em \`${DESIGN_FILES.photos}\`: nome, onde fica, proporção, o que mostrar e se é obrigatória. Não busque foto em banco nem gere imagem. Forma abstrata, degradê decorativo e ilustração genérica não ocupam lugar de foto.`,
      `Ícone de banco, só pelos scripts de \`${kit('skills/tastemaker/scripts/')}\` (cópia revisada pelo Escritório) e só se o seu ambiente rodar Python; o termo de busca nunca leva nome de cliente nem dado do projeto.`,
      'Não escreva código de produção nesta etapa.',
      '',
      '### Fontes, nesta ordem',
      input.references.length
        ? `1. Biblioteca de referências do Escritório (já validadas pelo Carlos): ${input.references.map((r) => `\`${r}\``).join(', ')}. Quando a pasta do card tem \`dossie.md\`, é uma absorção completa do Kakashi (estrutura, componentes, movimento, interações, tempos e a receita para refazer com outra marca), com \`absorcao.json\` e \`telas/\` ao lado: leia o dossiê inteiro antes de propor. Refaça a técnica com a marca deste cliente; imagem, texto e código da referência não entram.`
        : '1. Biblioteca de referências do Escritório: ainda não há referência validada para este tipo de projeto.',
      `2. Base de conhecimento em \`${kit('conhecimento/')}\` (dials, checklist de pré-entrega, sistema de design por setor).`,
      family === 'produto'
        ? `3. Tabelas de \`${kit('skills/ui-ux-pro-max/data/')}\` (estilos, cores, tipografia e regras de UX por tipo de produto). Leia os CSV direto se o ambiente não rodar Python.`
        : `3. \`${kit('skills/tastemaker/SKILL.md')}\` e \`${kit('skills/elaya-landing/SKILL.md')}\` para a direção de landing e oferta.`,
      `4. Internet, só se as três anteriores não bastarem e se o seu ambiente tiver navegação. Siga \`${kit('REFERENCIAS.md')}\`: estrutura sim, cópia de asset não. Sem navegação, diga que ficou sem referência externa; não descreva site de memória.`,
    );
  } else if (role === 'construcao') {
    lines.push(
      '',
      '### Como construir',
      input.hasContract
        ? `Siga \`${DESIGN_FILES.contract}\` e \`${DESIGN_FILES.brand}\`: tokens, tipografia, componentes, estados e a ordem das telas. Cor ou fonte fora do bloco \`tokens\` reprova no portão automático.`
        : `Este projeto ainda não tem \`${DESIGN_FILES.contract}\`. Use o design system que o código já tem e não invente identidade nova; diga na resposta que o contrato de design está faltando.`,
      `Se o projeto tem \`${DESIGN_FILES.theme}\`, ele é a folha de tokens da interface: copie para o código como está e use só os papéis (segunda camada) nas páginas e nos componentes. Cor ou fonte declarada por fora do tema é desvio do contrato. \`${DESIGN_FILES.board}\` mostra como botão, campo, cartão e etiqueta devem ficar.`,
      `Cor: ${COLOR_RULES.slice(0, 2).join(' ')} Não troque uma faixa colorida do contrato por fundo neutro.`,
      `Foto vem do cliente, depois. Cada espaço de foto do contrato (lista em \`${DESIGN_FILES.photos}\`) vira um marcador visível com \`data-foto\`, proporção fixa por \`aspect-ratio\` e a legenda do que fotografar; trocar o marcador pela foto não pode mexer no layout. Não busque foto em banco nem gere imagem, e não remova um espaço de foto por falta de material.`,
      'Se o contrato não cobre um caso, não improvise em silêncio: decida pelo que está mais perto dele e liste a decisão no fim, para a direção de design confirmar.',
      'Antes de dizer que terminou, confira: contraste 4,5:1, foco visível no teclado, alvo de toque de 44 px, um só h1, nenhum emoji como ícone, nada rolando na horizontal em 390, 768 e 1024 px, e animação desligada quando o sistema pede movimento reduzido. O portão automático confere exatamente isso.',
    );
  } else {
    lines.push(
      '',
      '### Como revisar',
      'Você não participou da construção e não recebe o histórico dela de propósito: julgue o que está na pasta, não a intenção de quem fez.',
      `Compare a interface construída com \`${DESIGN_FILES.contract}\`. ${input.prints ? `Os prints do último QA (1440 px e 390 px) estão em \`${input.prints}\`; se o seu ambiente lê imagem, olhe os prints antes do código. Se não lê, diga isso na primeira linha e revise pelo código e pelo relatório do QA.` : 'Não há prints de QA nesta pasta: revise pelo código e diga que a revisão foi sem imagem.'}`,
      'Dê nota de 0 a 10 para cada critério abaixo, com o arquivo, a tela ou o print que sustenta a nota:',
      ...REVIEW_RUBRIC.map(([group, text], i) => `${i + 1}. [${group}] ${text}`),
      'Feche com as médias de Tarefa e de Acabamento, a lista do que corrigir (do mais grave ao menos grave, com onde está) e uma linha final: "Parecer: aprovar" ou "Parecer: devolver". Devolver é obrigatório em qualquer um destes casos: média abaixo de 7; algum critério com nota 5 ou menos; ação principal que não funciona ou aparece em estado de erro; conteúdo que não aparece na tela ou no print; página que, trocando o logo, serviria para outro negócio (cara de modelo pronto). Quem decide é o Carlos.',
    );
  }

  if (role !== 'revisao' && (input.acervo || []).length) {
    lines.push(
      '',
      '### Acervo de código aberto (MIT, validado pelo Carlos)',
      ...(input.acervo || []).map((a) => `- ${a}`),
      role === 'direcao'
        ? `Leia o índice e abra só as peças que servem; não leia a pasta inteira. O contrato ganha um título \`### Movimento\` com pelo menos ${MOTION_PLAN_MIN} itens de lista, um por movimento: onde acontece (seção e elemento), o gatilho (ao carregar, ao entrar na tela, ao passar o mouse, ao clicar), o que muda, a duração em ms, a curva e a peça do acervo que ensina a técnica. Movimento é algo que se vê mudar na tela: entrada de seção, número que conta, linha que se preenche, destaque que acompanha o cursor. Formatar número ou abrir uma pergunta não conta. Cada um diz o que comunica; se não comunica nada, não entra. Sem esse título com os itens, a etapa não fecha.`
        : 'Implemente cada item do título «Movimento» do contrato, lendo antes a peça do acervo que ele cita: gatilho, duração e curva como estão lá. No fim da resposta, liste cada item do plano com o arquivo e o seletor onde ficou; item que não deu para fazer aparece na lista com o motivo. Todo movimento para sob `prefers-reduced-motion: reduce`, e o conteúdo aparece mesmo sem JavaScript. Leia o índice e abra só as peças que servem; não leia a pasta inteira.',
      'A peça ensina a técnica: refaça na pilha deste projeto, com as cores, fontes e medidas do contrato. Não instale a biblioteca só para usar uma peça, e não traga dependência que o projeto não tem sem dizer na resposta. Se copiar um trecho grande como está, leve junto o aviso de licença da pasta da biblioteca.',
    );
  }
  if (input.skills.length) {
    lines.push(
      '',
      '### Método (leia o que for usar, nesta ordem)',
      ...input.skills.map((s) => `- \`${kit(`skills/${s}/SKILL.md`)}\``),
      'Use uma só linha estética por trabalho. Se duas skills discordarem, vale o cânone acima.',
    );
  }
  return lines.join('\n');
}
