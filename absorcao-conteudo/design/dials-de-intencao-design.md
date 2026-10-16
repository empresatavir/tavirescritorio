---
title: "Dials de Intenção de Design"
aliases: ["design dials", "parametros de intencao visual", "variance motion density"]
domain: design
subdomain: briefing
source: "Taste Skill — Leonxlnx"
source_type: skill-ia
importance: 7
tags: [design, briefing, parametrizacao, ia, frontend]
related: [[vocabulario-de-movimento]], [[taste-como-habilidade-transferivel]], [[framework-anti-slop-design-ia]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Dials de Intenção de Design

## Definição
Um jeito de transformar intenção de design — algo normalmente vago ("mais
moderno", "mais divertido") — em três parâmetros numéricos explícitos (1 a 10)
que qualquer executor (humano ou IA) interpreta de forma consistente:
**variância de layout**, **intensidade de movimento** e **densidade visual**.

## Mecanismo
O problema que os dials resolvem: pedidos de design em linguagem natural são
ambíguos, e cada pessoa (ou modelo de IA) preenche a ambiguidade com um padrão
diferente — geralmente o mais genérico e seguro possível. Três dials cobrem os
eixos que mais variam entre "produto sem graça" e "produto com identidade":

1. **Variância de layout** (baixo = centralizado/limpo · alto = assimétrico/moderno)
   — controla o quanto a composição foge da grade previsível.
2. **Intensidade de movimento** (baixo = só hover · alto = scroll-driven/magnético)
   — controla quanto a interface se move e reage.
3. **Densidade visual** (baixo = espaçoso · alto = denso, tipo dashboard)
   — controla quanta informação cabe por tela.

Cada dial isolado já reduz ambiguidade; os três juntos formam uma "assinatura"
de estilo que se comunica em 3 números em vez de um parágrafo de adjetivos.

## Aplicações Práticas

### Em Briefing de Projetos (Fábrica de LPs / E-commerce / CRM)
- Antes de escrever copy ou código, fixe os 3 dials com o cliente: "Landing de
  SaaS B2B enterprise" tende a variância baixa + movimento baixo + densidade
  média; "Loja de moda jovem" tende a variância alta + movimento alto.
- Serve de checklist de alinhamento ANTES da produção — evita o retrabalho de
  "não é bem isso que eu queria" depois do código pronto.

### Em Briefing para IA (prompts de geração de UI)
- Em vez de "faz uma landing bonita e moderna", especifique os 3 dials
  explicitamente no prompt — reduz a chance do modelo cair no genérico padrão.
- Funciona como um "contrato" reutilizável entre projetos do mesmo cliente:
  fixar os dials uma vez e reaplicar em toda página nova mantém consistência.

### Em Revisão/QA
- Se uma entrega "parece genérica", o diagnóstico rápido é perguntar: qual dial
  não foi respeitado? Geralmente é densidade (tudo com o mesmo respiro) ou
  movimento (zero ou movimento aleatório sem propósito).

## Contra-indicações
- Não substitui critério estético — dois projetos com os mesmos 3 números ainda
  podem ter execuções muito diferentes em qualidade (ver [[taste-como-habilidade-transferivel]]).
  Os dials fixam a INTENÇÃO, não garantem a EXECUÇÃO.
- Para produtos muito regulados/conservadores (bancário, jurídico, saúde), os 3
  dials tendem a convergir pra valores baixos quase sempre — o framework ainda
  ajuda a não improvisar, mas o espaço de variação real é menor.

## Exemplos Canônicos
- Dashboard financeiro enterprise: variância 2-3, movimento 1-2, densidade 8-9.
- Landing de app de música Gen Z: variância 7-8, movimento 7-8, densidade 3-4.
- E-commerce de nicho premium (ex.: peptxlab): variância 4-5, movimento 3-4,
  densidade 4-5 — meio-termo deliberado entre confiança (baixa variância) e
  vitalidade de marca (movimento moderado).

## Conexões
- [[vocabulario-de-movimento]] — o dial de "intensidade de movimento" precisa de
  um vocabulário preciso pra virar execução real, não só um número.
- [[taste-como-habilidade-transferivel]] — os dials fixam a intenção; o critério
  estético decide a execução dentro dela.
- [[framework-anti-slop-design-ia]] — os dials são a peça de "inferência de
  briefing" desse framework mais amplo.

## Fonte
> "DESIGN_VARIANCE: Layout experimentation (lower: centered/clean · higher:
> asymmetric/modern). MOTION_INTENSITY: Animation depth (lower: hover · higher:
> scroll/magnetic). VISUAL_DENSITY: Information per viewport (lower: spacious ·
> higher: dense dashboards)."

**Referência:** Taste Skill — Leonxlnx | README.md, seção "Settings (taste-skill only)" | 2026
