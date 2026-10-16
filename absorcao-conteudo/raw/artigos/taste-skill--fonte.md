---
title: "Taste Skill — Leonxlnx"
type: skill-ia
author: Leonxlnx (com patrocínio de Emil Kowalski/animations.dev e Vercel OSS Program)
year: 2026
domain: design
importance: 7
tags: [design, ia, frontend, agente, anti-slop, skill]
pages_generated: [[dials-de-intencao-design]], [[framework-anti-slop-design-ia]]
source_file: "github.com/Leonxlnx/taste-skill (README.md)"
ingested: 2026-07-13
---

# Taste Skill — Leonxlnx

## Tese Central
Agentes de IA de código, deixados sem direção explícita de design, convergem para
interfaces genéricas e intercambiáveis ("slop"). Um conjunto portável de arquivos
de instrução (`SKILL.md`) — carregado automaticamente por ferramentas como
Claude Code, Cursor e Codex — pode corrigir isso: o agente lê o briefing, infere
a linguagem de design apropriada, ajusta parâmetros explícitos de intenção
(variância de layout, intensidade de movimento, densidade visual) e passa por
uma verificação obrigatória antes de entregar.

## Por que é importante
Projeto open source real e maduro (MIT, múltiplos patrocinadores nomeados
incluindo o Vercel Open Source Program e Emil Kowalski), não um artigo teórico —
é a implementação de um padrão que a própria agência já pratica informalmente
(ex.: a esteira `/lp-planejar`, `/ec-planejar` e o trabalho de whitelabel do
peptxlab já fazem "inferir contexto → aplicar design system → checklist" sem
nomear o padrão). Ingerido junto com [[ui-ux-pro-max-skill--fonte]] porque os
dois chegaram, de forma independente, à mesma arquitetura geral — evidência de
que o padrão é robusto, não coincidência de um projeto só.

## Conceitos gerados
- [[dials-de-intencao-design]] — importância: 7
- [[framework-anti-slop-design-ia]] — importância: 8 (síntese com as outras 2 fontes)

## Limitações / Críticas
- Página de produto/README, não um paper — os detalhes de implementação exata
  (o checklist §14 citado, os "canonical GSAP code skeletons") vivem no código
  fonte real, não documentados em prosa; o que foi ingerido é o nível de
  princípio/arquitetura, não a receita linha a linha.
- Focado em ferramentas de coding assistido por IA — os princípios (inferência
  de briefing, dials de intenção, gate de verificação) generalizam bem para
  processos humanos de design também, mas o projeto em si não fala com esse público.
- Projeto ativo/experimental (v2 marcado "experimental" no momento da ingestão)
  — comportamento pode mudar; o que foi capturado aqui é o padrão arquitetural,
  que tende a ser mais estável que os detalhes de versão.

**Referência:** github.com/Leonxlnx/taste-skill — README.md, seções "Skills" e
"Settings (taste-skill only)" | acessado 2026-07-13
