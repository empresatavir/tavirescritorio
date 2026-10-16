---
title: "Checklist de Pré-Entrega de UI"
aliases: ["pre-delivery checklist", "gate de qualidade de interface", "pre-flight check ui"]
domain: design
subdomain: qa
source: "UI UX Pro Max — nextlevelbuilder"
source_type: skill-ia
importance: 8
tags: [design, qa, acessibilidade, frontend, checklist]
related: [[motor-design-system-por-industria]], [[framework-anti-slop-design-ia]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Checklist de Pré-Entrega de UI

## Definição
Uma lista curta e objetiva de verificações mecânicas — não subjetivas — que
toda interface deve passar ANTES de ser considerada entregável, independente do
estilo visual escolhido. Cobre os erros mais comuns e mais baratos de corrigir
cedo (acessibilidade básica, feedback de interação, responsividade), não
julgamento estético.

## Mecanismo
A força do checklist está em ser binário (passa/não passa), não uma opinião:

1. **Sem emoji como ícone** — usar SVG (Heroicons, Lucide) em vez de emoji;
   emoji renderiza diferente por sistema operacional e não escala bem.
2. **`cursor-pointer` em todo elemento clicável** — sinal básico de
   affordance que interfaces genéricas de IA frequentemente esquecem.
3. **Estados de hover com transição suave (150-300ms)** — ausência de
   transição faz a interface parecer "quebrada", não "rápida".
4. **Contraste de texto mínimo 4,5:1 no modo claro** — piso de legibilidade,
   não opcional.
5. **Estados de foco visíveis para navegação por teclado** — acessibilidade
   básica, frequentemente removido "porque não fica bonito".
6. **Respeitar `prefers-reduced-motion`** — usuários com essa preferência do
   sistema não devem receber animação forçada.
7. **Responsivo nos breakpoints-padrão** (375px, 768px, 1024px, 1440px) —
   cobre celular pequeno, tablet, notebook e desktop grande.

## Aplicações Práticas

### Em Toda Entrega de Frontend da Agência (fábrica-lp, e-commerce, CRM)
- Rodar esta lista como gate ANTES de considerar qualquer LP/loja/CRM pronta
  pra revisão do cliente — mesmo papel que testes automatizados cumprem no
  backend, mas pra qualidade de interface.
- Itens 1, 2 e 3 pegam a maioria dos "cheiro de genérico feito por IA" com
  esforço quase zero — bom primeiro filtro barato.
- Itens 4, 5 e 6 são LGPD/acessibilidade-adjacentes — o mesmo espírito da
  auditoria Seg/LGPD já praticada na esteira (ver `crm-whitelabel/agentes/agente-4-auditor.md`),
  aplicado à camada visual em vez de segurança.

### Em Contratos/Propostas
- Citar este checklist como parte do padrão de qualidade entregue reforça
  profissionalismo na proposta comercial sem precisar inventar linguagem nova.

## Contra-indicações
- É um piso, não um teto — passar no checklist não significa que o design tem
  boa "taste" (ver [[taste-como-habilidade-transferivel]]); é condição
  necessária, não suficiente.
- Alguns itens têm exceção legítima (ex.: `cursor-pointer` não se aplica a
  telas touch-only) — aplicar com critério, não cegamente.

## Exemplos Canônicos
- SEC-007 da auditoria do peptxlab (headers de segurança) segue a mesma lógica
  de "gate mecânico e objetivo antes de ir ao ar" — só que na camada de
  segurança HTTP em vez de UI. Mesmo padrão de disciplina, domínio diferente.

## Conexões
- [[motor-design-system-por-industria]] — este checklist é o passo final desse
  motor, depois que estilo/paleta/tipografia já foram decididos.
- [[framework-anti-slop-design-ia]] — este checklist é o "gate antes de
  entregar" desse framework mais amplo.

## Fonte
> "PRE-DELIVERY CHECKLIST: [ ] No emojis as icons (use SVG: Heroicons/Lucide)
> [ ] cursor-pointer on all clickable elements [ ] Hover states with smooth
> transitions (150-300ms) [ ] Light mode: text contrast 4.5:1 minimum [ ] Focus
> states visible for keyboard nav [ ] prefers-reduced-motion respected [ ]
> Responsive: 375px, 768px, 1024px, 1440px"

**Referência:** UI UX Pro Max — nextlevelbuilder | README.md, exemplo de output
do "Design System Generator" | 2026
