# ADR-004: Separação Formal entre Templates da Fábrica e Workflows Canônicos de Negócio

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Decisão D3

## Contexto e Problema
Havia ambiguidade inicial se os "Workflows" eram sinônimos de esteiras de engenharia de software da Fábrica ou processos operacionais corporativos da agência. Misturar ambos no mesmo modelo de banco criaria confusão entre steps de CI/CD (ex: build de landing page) e processos de negócio com supervisão humana (ex: onboarding de cliente).

## Decisão
1. **Modelagem Isolada:**
   - **Templates de Engenharia (`/fabrica` / `engineering_templates`):** 6 esteiras técnicas (LP Criação, LP Manutenção, Oferta Criação, Oferta Manutenção, Sistemas Criação, Sistemas Manutenção), focadas em artefatos de código, repositórios git e comandos CLI.
   - **Workflows Canônicos de Negócio (`/workflows` / `workflows`):** 6 processos formais da agência (Onboarding de Clientes, Pipeline Comercial & Proposta, Ciclo Editorial Studio, Hardening & QA Release, Suporte Operacional N1/N2, Fechamento Financeiro & Cobrança).
2. **Gates Humanos de Governança:** Cada workflow possui sequência de agentes definida e pontos de parada (*Human-in-the-Loop*) que exigem autorização expressa na tela de Aprovações antes de avançar.

## Consequências
- **Positivas:**
  - Clareza conceitual e relacional no banco de dados SQLite.
  - Segurança operacional: ações com impacto financeiro ou de entrega nunca executam em piloto automático irrestrito.
