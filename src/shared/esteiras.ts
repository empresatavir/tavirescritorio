/**
 * Moldes das esteiras da Fábrica — fonte única.
 * O main usa para contar etapas, achar gates e gravar o progresso no banco;
 * o build do renderer injeta a mesma lista no Fabrica.dc.html.
 */

export type EsteiraCode = 'LP-C1' | 'LP-M1' | 'OF-C1' | 'OF-M0' | 'SY-C1' | 'SY-M1';

export interface EsteiraStage {
  name: string;
  owner: string;
  skill: string;
  /** Peso relativo no roadmap (dias). */
  weight: number;
  /** Gate: o agente resume e a etapa só fecha com a decisão do Carlos. */
  gate: boolean;
  /** Portão de QA: depois do agente, a suíte automática roda e a etapa só fecha se passar. */
  qa: boolean;
  /** Portão de segurança: depois do agente, a varredura white box roda e a etapa só fecha sem achado crítico ou alto aberto. */
  seg: boolean;
}

export interface EsteiraTemplate {
  code: EsteiraCode;
  name: string;
  stages: EsteiraStage[];
}

type Row = [name: string, owner: string, skill: string, weight: number];

const isGate = (name: string, skill: string) => /^gate\b|aprova/i.test(name) || /aprova[cç][aã]o humana/i.test(skill);
const isQa = (name: string) => /^QA\b|Loop Linter|Completion Guard/i.test(name);
const isSeg = (name: string) => /^Security\b|^Segurança\b/i.test(name);

const build = (code: EsteiraCode, name: string, rows: Row[]): EsteiraTemplate => ({
  code,
  name,
  stages: rows.map(([n, owner, skill, weight]) => ({ name: n, owner, skill, weight, gate: isGate(n, skill), qa: !isGate(n, skill) && isQa(n), seg: !isGate(n, skill) && isSeg(n) })),
});

export const ESTEIRA_TEMPLATES: Record<EsteiraCode, EsteiraTemplate> = {
  'LP-C1': build('LP-C1', 'LPs · Criação', [
    ['Entender', 'Paula PM', 'Orquestradora', 1],
    ['Refinar', 'Arquiteto de Nicho', 'Arquitetura de soluções', 1],
    ['Dossiê', 'Dora Descoberta', 'Intake e descoberta', 1],
    ['Arquitetura', 'Théo Tech Lead', 'Liderança técnica', 1],
    ['Construção', 'Vitor Construtor', 'Dev frontend sênior', 2],
    ['QA', 'Edna E2E', 'QA end-to-end', 1],
    ['Security', 'Auditor Seg/LGPD', 'Segurança e LGPD', 2],
    ['SEO', 'Nina SEO', 'SEO técnico', 2],
    ['Handoff', 'Paulo Publicador', 'Publicação e release', 2],
  ]),
  'LP-M1': build('LP-M1', 'LPs · Manutenção', [
    ['Gate 0 · Diagnóstico da LP atual', 'Dora Descoberta', 'brand-context', 1],
    ['Auditoria de conversão', 'Bianca Estrategista', 'cro-audit', 1],
    ['Requisitos da evolução', 'Marina + Yuri', 'requirements', 1],
    ['Aprovação dos requisitos', 'Comercial TAVIR', 'aprovação humana', 1],
    ['Prova visual', 'Yuri UX', 'visual-proof', 1],
    ['Construção incremental', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 3],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 1],
    ['Segurança & LGPD', 'Sérgio Seg/LGPD', 'web-security', 1],
    ['Auditoria SEO', 'Nina SEO', 'seo-audit', 1],
    ['Documentação & runbook', 'Dante Doc', 'documentacao-sistema', 1],
    ['Gate Final CEO · Completion Guard', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'OF-C1': build('OF-C1', 'Ofertas · Criação', [
    ['Gate 0 · Problema e público', 'Dora Descoberta', 'brand-context', 1],
    ['Evidência de público', 'Bianca Estrategista', 'audience-research', 2],
    ['Validação de viabilidade', 'Bianca Estrategista', 'viability-check', 2],
    ['Precificação', 'Comercial TAVIR', 'pricing', 1],
    ['Claims e compliance', 'Sérgio Seg/LGPD', 'claims-check', 1],
    ['Página da oferta', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 2],
    ['QA de copy e oferta', 'Talita QA', 'copy-qa', 1],
    ['Gate Final CEO', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'OF-M0': build('OF-M0', 'Ofertas · Manutenção', [
    ['Revisão da oferta', 'Bianca Estrategista', 'offer-review', 1],
    ['Evidência atualizada', 'Bianca Estrategista', 'audience-research', 1],
    ['Claims e compliance', 'Sérgio Seg/LGPD', 'claims-check', 1],
    ['Ajuste de preço', 'Comercial TAVIR', 'pricing', 1],
    ['Página revisada', 'Diego Desenvolvedor', 'frontend-excelencia-tavir', 1],
    ['Gate Final CEO', 'Carlos Henrique', 'aprovação humana', 1],
  ]),
  'SY-C1': build('SY-C1', 'Sistemas · Criação', [
    ['Gate 0 · Demanda e briefing', 'Dora Descoberta', 'brand-context', 1],
    ['Requisitos verificáveis', 'Ari Arquiteto', 'requirements', 2],
    ['Arquitetura & modelagem', 'Ari Arquiteto', 'archify · sql-queries', 2],
    ['Planejamento ágil', 'Paula PM', 'agile-planning', 1],
    ['Scaffold físico oficial', 'Diego Dev Front & Back', 'flutter create · pnpm create vite', 1],
    ['Construção Front', 'Diego Dev Front & Back', 'frontend-excelencia-tavir', 4],
    ['Construção Back', 'Diego Dev Front & Back', 'test-driven-development', 4],
    ['Loop Linter & Compiler', 'Compiler TAVIR', 'dart analyze · tsc --noEmit', 1],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 2],
    ['QA Mobile · emulador tavir_qa', 'Talita QA', 'mobile-mcp', 1],
    ['Segurança & LGPD', 'Sérgio Seg/LGPD', 'web-security', 1],
    ['Completion Guard · 8 regras físicas', 'Compiler TAVIR', 'completion-guard', 1],
    ['Documentação & runbook', 'Dante Doc', 'documentacao-sistema', 1],
    ['Gate Final CEO · Completion Guard', 'Carlos Henrique', 'aprovação humana', 1],
    ['Handoff', 'Paulo Publicador', 'pacote-entrega', 1],
  ]),
  'SY-M1': build('SY-M1', 'Sistemas · Manutenção', [
    ['Entender', 'Paula PM', 'intake', 1],
    ['Refinar', 'Arquiteto de Nicho', 'refino', 1],
    ['Dossiê', 'Dora Descoberta', 'brand-context', 1],
    ['Diagnóstico técnico', 'Théo Tech Lead', 'code-review', 1],
    ['Correção e migração', 'Diego Dev Front & Back', 'test-driven-development', 3],
    ['Loop Linter & Compiler', 'Compiler TAVIR', 'tsc --noEmit · dart analyze', 1],
    ['QA E2E Playwright', 'Talita QA', 'playwright', 1],
    ['Segurança & LGPD', 'Sérgio Seg/LGPD', 'web-security', 1],
    ['Handoff', 'Paulo Publicador', 'pacote-entrega', 1],
  ]),
};

/**
 * Contrato de cada etapa: o que ela entrega e como se sabe que ficou pronta. Vai no pedido ao motor
 * no lugar de um "levante o que a etapa pede". A instrução escrita pelo Carlos na etapa vem por cima.
 * Chave: nome da etapa nos moldes acima.
 */
export interface StageContract {
  /** O que a etapa resolve, numa frase. */
  objetivo: string;
  /** O que precisa existir na pasta no fim (arquivos, código, testes). */
  entrega: string;
  /** Como se confere que ficou pronta. */
  pronto: string;
}

const C = (objetivo: string, entrega: string, pronto: string): StageContract => ({ objetivo, entrega, pronto });

const DESCOBERTA = C(
  'Entender o pedido, o público e o que o projeto já tem, a partir da pasta.',
  'Um resumo curto do que se sabe (com o arquivo de origem de cada fato) e do que falta saber. Não altere código.',
  'Cada fato aponta o arquivo de onde veio; as perguntas em aberto estão listadas.',
);
const QA_JORNADA = C(
  'Provar com teste automatizado que as jornadas principais do app funcionam.',
  'Testes de jornada no framework que o projeto já usa (ou Playwright, se não houver), no lugar que ele espera, e qa/plano.md com as jornadas cobertas.',
  'Os testes rodam pelo comando do projeto. O portão automático roda em seguida e decide.',
);
const SEGURANCA = C(
  'Achar e corrigir o que for seguro corrigir em segurança e LGPD.',
  'Correções no código (segredo em variável de ambiente, validação, autorização) e a lista do que depende de decisão.',
  'A varredura automática roda em seguida e decide; crítico ou alto aberto reprova.',
);

export const STAGE_CONTRACTS: Record<string, StageContract> = {
  // Sistemas
  'Gate 0 · Demanda e briefing': DESCOBERTA,
  'Requisitos verificáveis': C(
    'Ter a lista de requisitos desta versão, cada um com critério verificável.',
    'specs/requirements.md (crie ou atualize só o que mudou): requisito, critério de pronto e onde está no código, se já existir.',
    'Todo requisito tem critério que alguém consegue conferir; nenhum requisito sem origem na pasta.',
  ),
  'Arquitetura & modelagem': C(
    'Decidir estrutura, dados e contratos que a construção vai seguir.',
    'specs/architecture.md com só o que é decisão: módulos, modelo de dados, contratos de API e o motivo de cada escolha nova.',
    'As decisões batem com o código que já existe ou dizem o que muda nele.',
  ),
  'Planejamento ágil': C(
    'Transformar requisitos em trabalho priorizado para as etapas de construção.',
    'specs/kanban.md com os itens de A fazer de Front e de Back, cada um com critério de pronto e arquivo provável.',
    'As etapas de construção conseguem pegar cada item sem perguntar o que é.',
  ),
  'Scaffold físico oficial': C(
    'Garantir que a estrutura de pastas, dependências e o build vazio funcionam.',
    'Projeto que instala e compila (crie o que faltar com o gerador oficial: flutter create, pnpm create vite). Se a estrutura já existe e compila, não mude nada.',
    'Instalação e build rodam sem erro.',
  ),
  'Construção Front': C(
    'Implementar no código as telas e comportamentos de front que ainda faltam.',
    'Código de interface e testes de componente ou jornada para cada item de Front de A fazer no kanban (ou requisito sem implementação).',
    'Cada item implementado tem teste que passa. Se nada falta, diga quais itens conferiu e não mude arquivos.',
  ),
  'Construção Back': C(
    'Implementar no código as regras, endpoints e dados de back que ainda faltam.',
    'Código de back e testes para cada item de Back de A fazer no kanban (ou requisito sem implementação), um teste falhando antes de cada mudança.',
    'Cada item implementado tem teste novo que passa junto com a suíte do back. Se nada falta, diga quais itens conferiu e não mude arquivos.',
  ),
  'Loop Linter & Compiler': C(
    'Deixar o projeto compilando e sem erro de analisador.',
    'Correções de tipo, import e lint apontadas por tsc --noEmit, eslint, dart analyze ou flutter analyze (o que o projeto tiver).',
    'Cada analisador roda sem erro. O que ficou como aviso está listado com o motivo.',
  ),
  'QA E2E Playwright': QA_JORNADA,
  'QA Mobile · emulador tavir_qa': C(
    'Provar as jornadas principais do app no emulador.',
    'Testes de integração ou de widget do app mobile cobrindo as jornadas principais.',
    'Os testes rodam pelo comando do projeto (flutter test ou equivalente).',
  ),
  'Segurança & LGPD': SEGURANCA,
  'Completion Guard · 8 regras físicas': C(
    'Conferir que nada ficou pela metade antes da entrega.',
    'Correção do que estiver incompleto: TODO deixado na entrega, mock em produção, tela sem dado real, build quebrado.',
    'Build e testes passam; nenhum mock ou TODO em código de produção.',
  ),
  'Documentação & runbook': C(
    'Deixar escrito como instalar, rodar, testar e publicar o sistema.',
    'README ou docs/runbook.md com os comandos conferidos na pasta.',
    'Cada comando documentado roda como está escrito.',
  ),
  'Handoff': C(
    'Montar o pacote de entrega.',
    'Resumo do que foi entregue, como rodar e o que ficou pendente. Não faça deploy nem push.',
    'O pacote cita arquivos que existem.',
  ),
  // Manutenção de sistemas
  'Entender': DESCOBERTA,
  'Refinar': C(
    'Transformar o pedido em escopo técnico.',
    'O que muda, em que arquivos, com que risco e o que fica fora. Não altere código.',
    'Cada mudança aponta onde no código vai acontecer.',
  ),
  'Dossiê': DESCOBERTA,
  'Diagnóstico técnico': C(
    'Dizer o que está errado no código e onde.',
    'Lista com arquivo, linha, problema e correção proposta, ordenada por risco. Não altere código.',
    'Cada item aponta um trecho real do código.',
  ),
  'Correção e migração': C(
    'Aplicar no código as correções do diagnóstico.',
    'Código corrigido e um teste para cada correção, falhando antes e passando depois.',
    'Os testes novos e a suíte da área passam.',
  ),
  // LPs
  'Arquitetura': C('Decidir estrutura e tecnologia da página.', 'Decisões curtas com o motivo de cada uma.', 'A construção consegue seguir sem perguntar.'),
  'Construção': C('Construir a página.', 'Código da página no design system do projeto.', 'O build passa e a página abre.'),
  'Construção incremental': C('Aplicar na página as mudanças aprovadas.', 'Código alterado só no que os requisitos aprovados pedem.', 'O build passa e cada mudança aparece na página.'),
  'QA': QA_JORNADA,
  'Security': SEGURANCA,
  'SEO': C('Deixar a página correta para busca.', 'Título, descrição, cabeçalhos, dados estruturados e sitemap corrigidos.', 'Cada item conferido no HTML gerado.'),
  'Auditoria SEO': C('Apontar e corrigir problemas técnicos de SEO.', 'Correções técnicas e a lista do que depende de conteúdo.', 'Cada item conferido no HTML gerado.'),
  'Auditoria de conversão': C('Apontar o que atrapalha a conversão da página.', 'Lista com o trecho da página, o problema e a mudança proposta. Não altere código.', 'Cada item aponta um trecho real.'),
  'Requisitos da evolução': C('Escrever o que a nova versão da página precisa ter.', 'Requisitos com critério verificável e a seção afetada.', 'Todo requisito tem critério conferível.'),
  'Prova visual': C('Mostrar a mudança visual antes de construir.', 'Descrição ou protótipo de cada tela que muda.', 'Cada mudança tem a tela e o motivo.'),
  // Ofertas
  'Evidência de público': C('Reunir evidência de que o público existe e quer a oferta.', 'Lista de evidências com a fonte de cada uma.', 'Nenhuma afirmação sem fonte.'),
  'Evidência atualizada': C('Atualizar a evidência de público.', 'Evidências novas com fonte; as antigas que caíram, marcadas.', 'Nenhuma afirmação sem fonte.'),
  'Validação de viabilidade': C('Dizer se a oferta se sustenta.', 'Custos, preço e riscos com a fonte de cada número.', 'Cada número aponta a origem.'),
  'Precificação': C('Definir o preço.', 'Preço proposto e a conta que o sustenta.', 'A conta fecha com os números da pasta.'),
  'Ajuste de preço': C('Revisar o preço.', 'Preço revisado e o motivo.', 'A conta fecha com os números da pasta.'),
  'Claims e compliance': C('Garantir que a oferta não promete o que não pode.', 'Lista de afirmações com risco e a versão segura.', 'Nenhuma afirmação sem base.'),
  'Página da oferta': C('Construir a página da oferta.', 'Código da página.', 'O build passa e a página abre.'),
  'Página revisada': C('Aplicar na página as mudanças da revisão.', 'Código alterado só no que a revisão pede.', 'O build passa.'),
  'QA de copy e oferta': C('Conferir texto e oferta na página.', 'Lista de erros de texto, preço ou promessa, com a correção.', 'Cada item aponta o trecho da página.'),
  'Revisão da oferta': C('Revisar a oferta atual.', 'O que manter, o que mudar e por quê.', 'Cada ponto aponta a fonte.'),
};

export function stageContract(name: string | undefined | null): StageContract | null {
  if (!name) return null;
  return STAGE_CONTRACTS[name.trim()] || null;
}

/**
 * Nomes das etapas de moldes que mudaram depois de haver projetos gravados. Esteiras antigas
 * guardavam só a posição; com isto o main remapeia pelo nome em vez de deslocar os registros.
 */
export const LEGACY_STAGE_NAMES: Partial<Record<EsteiraCode, string[]>> = {
  'SY-M1': ['Entender', 'Refinar', 'Dossiê', 'Diagnóstico técnico', 'Correção e migração', 'Loop Linter & Compiler', 'QA E2E Playwright', 'Handoff'],
};

/** `sy-c`, `SY_M1`, `of-m`… → código do molde. Mesma regra que o painel usava. */
export function normalizeEsteiraCode(raw: string | null | undefined): EsteiraCode {
  const t = String(raw || 'lp-c').toLowerCase().replace(/_/g, '-');
  const maint = /-m|^..m/.test(t);
  if (t.startsWith('sy')) return maint ? 'SY-M1' : 'SY-C1';
  if (t.startsWith('of')) return maint ? 'OF-M0' : 'OF-C1';
  return maint ? 'LP-M1' : 'LP-C1';
}

export function esteiraTemplate(raw: string | null | undefined): EsteiraTemplate {
  return ESTEIRA_TEMPLATES[normalizeEsteiraCode(raw)];
}

/** Formato que o Fabrica.dc.html usa em TPL_STAGES: [nome, dono, skill, peso]. */
export function templateStagesForPanel(): Record<EsteiraCode, Row[]> {
  const out = {} as Record<EsteiraCode, Row[]>;
  for (const t of Object.values(ESTEIRA_TEMPLATES)) {
    out[t.code] = t.stages.map((s) => [s.name, s.owner, s.skill, s.weight]);
  }
  return out;
}
