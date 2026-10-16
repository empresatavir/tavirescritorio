---
title: "Motor de Design System por Indústria"
aliases: ["design system generator", "geracao de design system por contexto", "reasoning engine de design"]
domain: design
subdomain: sistema-de-design
source: "UI UX Pro Max — nextlevelbuilder"
source_type: skill-ia
importance: 8
tags: [design, sistema-de-design, ia, briefing, frontend]
related: [[checklist-pre-entrega-ui]], [[padrao-master-overrides]], [[dials-de-intencao-design]], [[framework-anti-slop-design-ia]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Motor de Design System por Indústria

## Definição
Um padrão de 4 passos para transformar um pedido em linguagem natural
("constrói uma landing pra minha clínica veterinária") num design system
completo (estilo, paleta, tipografia, padrão de página, anti-padrões e
checklist), condicionando toda escolha visual à CATEGORIA/indústria do
produto — em vez de aplicar um estilo genérico "bonito" universal.

## Mecanismo
O motor roda em sequência:

1. **Inferência de contexto** — extrai do pedido: tipo de produto, público,
   humor/tom desejado.
2. **Busca paralela em bases categorizadas** — consulta simultaneamente bancos
   de estilo visual, paleta de cor, tipografia e padrão de página, cada um
   já pré-associado a categorias de produto (SaaS, Fintech, Saúde, E-commerce...).
3. **Ranking + filtro de anti-padrão** — prioriza os resultados mais
   relevantes pra categoria (ex.: algoritmo BM25, técnica clássica de busca por
   relevância textual) e EXCLUI explicitamente o que é anti-padrão pra aquele
   setor (ex.: gradiente roxo/rosa "estilo IA" é marcado como erro pra banking
   — remete a hype, não a confiança).
4. **Saída como design system completo** — não devolve só uma cor ou uma fonte
   isolada, devolve o conjunto coerente (padrão de página + estilo + paleta com
   papéis definidos — primária/secundária/CTA/fundo/texto — + tipografia +
   efeitos-chave) mais o que evitar.

A diferença central para "escolher uma paleta bonita": o output nasce
CONDICIONADO à categoria, com justificativa (por que essa paleta serve saúde e
não serve fintech) em vez de ser uma escolha estética solta.

## Aplicações Práticas

### Na Fábrica de LPs / E-commerce / CRM (braços da agência)
- Este é essencialmente o mesmo trabalho que `/lp-planejar` e `/ec-planejar` já
  fazem (recontextualizar design pro nicho do cliente) — a contribuição real
  daqui é a IDEIA DE CONDICIONAR EXPLICITAMENTE por categoria E documentar os
  anti-padrões, não só os padrões. Vale formalizar: toda vez que o Agente 2
  (arquiteto de LP/loja) recontextualiza design, listar explicitamente 2-3
  anti-padrões do nicho, não só o que fazer.
- Setores regulados (saúde, financeiro, jurídico) merecem uma lista de
  anti-padrões própria e documentada — é onde o erro de "parecer genérico de
  IA" custa mais caro em confiança.

### Em Propostas Comerciais
- Justificar escolha de paleta/estilo pro cliente citando a categoria dele
  ("evitamos gradiente vibrante porque seu setor pede sobriedade/confiança")
  é mais persuasivo do que "achamos que ficou bonito" — dá peso de método.

## Contra-indicações
- Não substitui pesquisa de marca real do cliente — o motor generaliza por
  CATEGORIA de produto, não pelo posicionamento específico daquele cliente
  dentro da categoria (ver [[cinco-componentes-posicionamento]] pra essa
  camada mais fina).
- Categorização rígida pode engessar diferenciação: se todo concorrente do
  nicho segue a mesma regra "anti-padrão", segui-la à risca também deixa a
  marca indistinguível dos concorrentes — usar como piso, não teto.

## Exemplos Canônicos
- Clínica de spa/bem-estar → padrão "Hero-Centric + Prova Social", paleta suave
  (rosa/verde-sálvia/dourado), tipografia elegante (serif + sans), evitar cores
  neon e animações agressivas.
- Banking/Fintech → evitar gradiente roxo/rosa "de IA", priorizar contraste
  alto e paleta sóbria — confiança > modernidade estética.

## Conexões
- [[checklist-pre-entrega-ui]] — o motor termina exatamente onde esse checklist começa.
- [[padrao-master-overrides]] — onde o resultado do motor é persistido pra reuso.
- [[dials-de-intencao-design]] — os dials fixam a intenção geral; este motor
  condiciona a intenção à categoria específica do produto.
- [[framework-anti-slop-design-ia]] — este motor é a etapa de "busca em
  referência estruturada" desse framework mais amplo.

## Fonte
> "5 parallel searches: Product type matching (161 categories), Style
> recommendations (67 styles), Color palette selection (161 palettes), Landing
> page patterns (24 patterns), Typography pairing (57 font combinations) ...
> AVOID (Anti-patterns): Bright neon colors + Harsh animations + Dark mode + AI
> purple/pink gradients."

**Referência:** UI UX Pro Max — nextlevelbuilder | README.md, seção
"Intelligent Design System Generation" | 2026
