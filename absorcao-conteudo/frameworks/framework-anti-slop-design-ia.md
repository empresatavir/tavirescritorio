---
title: "Framework Anti-Slop de Design com IA"
aliases: ["anti-slop framework", "briefing-referencia-gate", "padrao inferir-buscar-gerar-verificar"]
domain: frameworks
subdomain: design
source: "Taste Skill — Leonxlnx / UI UX Pro Max — nextlevelbuilder / AI Skills for Design Engineers — Emil Kowalski"
source_type: skill-ia
importance: 8
tags: [design, ia, frontend, framework, qa, sintese]
related: [[dials-de-intencao-design]], [[motor-design-system-por-industria]], [[checklist-pre-entrega-ui]], [[taste-como-habilidade-transferivel]], [[pre-mortem]], [[natural-planning-model]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Framework Anti-Slop de Design com IA

## Definição
Um padrão de 4 etapas — **inferir briefing → buscar em referência
estruturada/vocabulário → gerar → gate de verificação antes de entregar** —
que aparece de forma quase idêntica em 3 projetos independentes de design
assistido por IA (Taste Skill, UI UX Pro Max, Emil Kowalski). Convergência
independente é o sinal mais forte de que um padrão é robusto, não coincidência
de um projeto só copiando o outro.

## Mecanismo
As 4 etapas, com o equivalente de cada fonte:

1. **Inferir briefing** — extrair do pedido em linguagem natural o contexto
   real (indústria, público, humor, intensidade desejada) antes de gerar
   qualquer coisa. Ver [[dials-de-intencao-design]] (parâmetros explícitos) e o
   passo 1 de [[motor-design-system-por-industria]] (inferência de categoria).
2. **Buscar em referência estruturada** — em vez de improvisar, consultar uma
   base curada (banco de estilos/paletas por indústria, ou um vocabulário
   técnico preciso de movimento). Ver [[motor-design-system-por-industria]] e
   [[vocabulario-de-movimento]].
3. **Gerar** — produzir o resultado (código, layout, animação) já condicionado
   pelas duas etapas anteriores, não a partir de um "estilo médio" genérico.
4. **Gate de verificação antes de entregar** — checklist mecânico e objetivo
   (ver [[checklist-pre-entrega-ui]]) MAIS uma camada de julgamento subjetivo
   que o checklist não cobre (ver [[taste-como-habilidade-transferivel]]).

A falha que o framework inteiro existe pra evitar tem nome nas 3 fontes: "slop"
— o resultado genérico, intercambiável, sem identidade, que uma IA (ou um
humano sem direção) produz por padrão quando nenhuma das 4 etapas acontece
de forma deliberada.

## Aplicações Práticas

### Nas Esteiras de Construção da Agência (fábrica-lp, e-commerce, CRM)
- As esteiras já implementam boa parte disso sem nomear (`/lp-planejar`,
  `/ec-planejar` = inferir + recontextualizar; build final = gerar). O que
  falta formalizar explicitamente em todas: o GATE final antes de considerar
  pronto pra revisão do cliente — hoje existe de forma mais forte só na
  auditoria Seg/LGPD (`crm-whitelabel/agentes/agente-4-auditor.md`), não na
  camada visual.
- Recomendação concreta: adotar [[checklist-pre-entrega-ui]] como gate mecânico
  padrão em toda entrega de frontend, do mesmo jeito que `next build` já é gate
  técnico obrigatório.

### Em Qualquer Processo de Criação Assistida por IA (não só design)
- O padrão generaliza além de UI: qualquer fluxo "peça em linguagem natural →
  IA gera" se beneficia da mesma disciplina — contexto explícito antes de
  gerar, referência estruturada em vez de improviso, verificação antes de
  aceitar o resultado como pronto.

## Contra-indicações
- Um gate de verificação só funciona se alguém de fato PARAR pra rodar — sob
  pressão de prazo, a etapa 4 é a primeira a ser pulada, e é justamente a que
  existe pra pegar o erro que sai mais caro depois.
- Referência estruturada (etapa 2) pode virar muleta: usar sempre o mesmo banco
  de padrões, sem nunca desviar, produz o mesmo problema de genericidade que o
  framework tenta resolver — em nível de agência, não de projeto individual.

## Exemplos Canônicos
- Os 3 projetos-fonte (Taste Skill, UI UX Pro Max, Emil Kowalski) chegaram
  nesse desenho de forma independente — nenhum cita os outros como
  inspiração direta, o que reforça que é uma solução natural pro problema, não
  uma ideia isolada de um autor só.

## Conexões
- [[dials-de-intencao-design]] — implementação da etapa 1 (inferir briefing).
- [[motor-design-system-por-industria]] — implementação das etapas 1+2 juntas,
  condicionadas por indústria.
- [[checklist-pre-entrega-ui]] — implementação mecânica da etapa 4.
- [[taste-como-habilidade-transferivel]] — implementação subjetiva/de
  julgamento da etapa 4, onde o checklist não alcança.
- [[pre-mortem]] — mesmo princípio geral (parar deliberadamente ANTES de
  considerar algo pronto, pra forçar a descoberta de falha), aplicado a
  decisão de negócio/projeto em vez de a interface — pre-mortem pergunta "o que
  vai dar errado", o gate de design pergunta "o que está faltando" — funções
  irmãs, domínios diferentes.
- [[natural-planning-model]] — a etapa de "inferir briefing antes de agir" é o
  mesmo espírito do planejamento natural de Allen (definir o resultado
  desejado antes de listar passos), aplicado especificamente a design.

## Fonte
> Convergência observada entre 3 fontes independentes: Taste Skill
> ("brief inference... hard pre-flight check"), UI UX Pro Max ("AI Reasoning →
> Search Design Database → Generate Code → Quality Checklist") e Emil Kowalski
> ("build animations... review your animations").

**Referência:** síntese de [[taste-skill--fonte]], [[ui-ux-pro-max-skill--fonte]]
e [[emil-kowalski-skill--fonte]] | 2026-07-13
