---
title: "Padrão Master + Overrides"
aliases: ["design system master file", "hierarquia de design tokens", "master overrides pattern"]
domain: design
subdomain: sistema-de-design
source: "UI UX Pro Max — nextlevelbuilder"
source_type: skill-ia
importance: 7
tags: [design, sistema-de-design, arquitetura, frontend, whitelabel]
related: [[motor-design-system-por-industria]], [[checklist-pre-entrega-ui]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Padrão Master + Overrides

## Definição
Um jeito de persistir e reutilizar um design system ao longo de um projeto
multi-página: um arquivo `MASTER` central guarda a fonte-única-de-verdade
(cores, tipografia, espaçamento, componentes); páginas específicas só guardam
as EXCEÇÕES ao master, não o sistema inteiro repetido.

## Mecanismo
A hierarquia de consulta é sempre a mesma, em ordem:

1. Ao construir/editar uma página específica, primeiro checa se existe um
   arquivo de override PARA AQUELA página.
2. Se existir, as regras do override têm prioridade — mas só nas exceções
   listadas ali, o resto ainda vem do master.
3. Se não existir override, usa o master inteiro, sem exceção.

Isso resolve um problema recorrente em projetos com IA (ou com múltiplos
desenvolvedores): sem um master explícito, cada página nova reintroduz
pequenas inconsistências (um azul ligeiramente diferente, um espaçamento
diferente) porque a IA/dev "reinventa" a partir do zero a cada página, em vez
de herdar de uma fonte única.

## Aplicações Práticas

### Já em Uso na Agência (sem o nome formal)
- O trabalho de whitelabel do peptxlab (`REBRANDING.md`) já implementa esse
  exato padrão sem nomeá-lo: `globals.css` + `lib/loja.ts` SÃO o "MASTER"
  (tokens de cor/fonte + identidade de marca centralizados); páginas
  específicas de domínio (`calculadora/`, `guia-de-dosagem/`) são os
  "overrides" — conteúdo específico daquele nicho, sem duplicar o design
  system inteiro. Vale usar esse nome (Master + Overrides) explicitamente na
  documentação da fábrica daqui pra frente — dá vocabulário compartilhado.

### Em Novas Lojas/LPs/CRMs
- Ao criar um projeto novo, definir o MASTER primeiro (tokens de design +
  identidade) antes de qualquer página específica — a ordem importa: overrides
  sem master vira o problema que o padrão existe pra resolver.
- Se uma página precisa fugir do master, documentar EXPLICITAMENTE por quê (o
  override deveria ser exceção rara, não a norma) — override virando regra geral
  é sinal de que o master está desatualizado, não de que a página está certa.

## Contra-indicações
- Para projetos de página única (uma LP simples), a hierarquia é overhead
  desnecessário — o padrão paga dividendo em projetos com várias páginas/seções
  que precisam de coerência visual ao longo do tempo.
- Não é sobre CSS/tokens técnicos apenas — o mesmo princípio se aplica a copy e
  tom de voz de marca (um "MASTER" de voz + overrides de página), mas a fonte
  original foca em design visual.

## Exemplos Canônicos
- `design-system/MASTER.md` + `design-system/pages/checkout.md` — ao construir
  a página de checkout, o override é consultado primeiro; qualquer regra não
  mencionada ali vem do master.
- `globals.css` + `lib/loja.ts` no peptxlab — mesmo padrão, nomes diferentes,
  já validado em produção pela própria agência.

## Conexões
- [[motor-design-system-por-industria]] — o motor GERA o conteúdo que este
  padrão persiste e reutiliza.
- [[checklist-pre-entrega-ui]] — o checklist de pré-entrega deveria rodar
  contra o resultado FINAL (master + override aplicado), não contra o master
  isolado.

## Fonte
> "This creates a `design-system/` folder structure: MASTER.md (Global Source
> of Truth) + pages/dashboard.md (Page-specific overrides, only deviations from
> Master). ... If the page file exists, prioritize its rules. If not, use the
> Master rules exclusively."

**Referência:** UI UX Pro Max — nextlevelbuilder | README.md, seção "Persist
Design System (Master + Overrides Pattern)" | 2026
