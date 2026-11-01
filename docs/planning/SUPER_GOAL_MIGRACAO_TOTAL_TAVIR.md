# SUPER GOAL: Convergência Industrial & Migração Fiel do TAVIR Escritório

> **Documento de Unificação Estratégica e Plano de Ação Único**  
> **Data:** 01 de Novembro de 2026  
> **Fontes Mandatórias:**
> - **Visual & Comportamento:** [`C:\Users\carlo\Downloads\TAVIR Escritório — redesenho.html`](C:\Users\carlo\Downloads\TAVIR%20Escrit%C3%B3rio%20%E2%80%94%20redesenho.html) (Bundle React/dc-runtime de 558 KB).
> - **Chassi & Motor Industrial:** [`C:\Users\carlo\Downloads\Projetos a Estudar\newConcierge`](file:///C:/Users/carlo/Downloads/Projetos%20a%20Estudar/newConcierge) (Electron 43, React 19, TS, Claude Agent SDK, Git Worktrees, Cofre DPAPI, Approvals).
> - **Ecossistema & Inteligência:** [`c:\Users\carlo\Downloads\Projetos a Estudar\tavirescritorio`](file:///c:/Users/carlo/Downloads/Projetos%20a%20Estudar/tavirescritorio) (57 agentes, 187 notas do Vault, personas, esteiras da Fábrica, Studio, Raio-X, Flow, Comercial).

---

## 1. A Grande Virada Arquitetural (A Alquimia Perfeita)

O plano anterior enfrentava um atrito estrutural desgastante: tentar transpor um HTML de referência que **já foi construído em React** para SolidJS, enquanto mantinha um backend Python desacoplado em portas de rede manuais, sem motor autônomo real de execução.

Ao unificarmos com a stack do **Concierge**, eliminamos a barreira:
1. **O Frontend Agora Fala a Mesma Língua:** O chassi desktop do Concierge roda **React 19 + TypeScript**. A transposição dos componentes, modais, drawers, kanbans e dos **17 keyframes literais** de `TAVIR Escritório — redesenho.html` torna-se direta, orgânica e com **fidelidade pixel-perfect de 100%**, sem perdas na tradução de frameworks.
2. **O Backend Ganha Musculatura Industrial:** Toda ação de interface (botões "Iniciar job", "Planejar", "Aprovar", "Nova Produção") deixa de ser mock ou completion solta de LLM e passa a disparar **execuções reais em Git Worktrees isoladas**, gerando diffs, consumindo o cofre DPAPI e passando pelo crivo do portão de Approvals.
3. **Liberdade Total de Motores (Multi-Engine Hub):** O usuário pode ligar e desligar na interface os 4 motores locais: **Anthropic (Claude SDK)**, **Cursor (`agent.exe`)**, **Antigravity (`agy` / Gemini)** e **Codex (OpenAI)**.

---

## 2. Os 3 Portões de Aceite Inflexíveis (Critério de Conclusão)

O Super Goal **NÃO** considera nenhuma tela ou função pronta se não passar pelos 3 portões:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OS 3 PORTÕES DE PROVA REAL                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PORTÃO DE CONTRATO (API & ESTADO)                                   │
│    Testes automatizados conferem efeito real no SQLite (WAL) e no      │
│    ledger imutável. Sem mock falso. Chaves fora de logs.               │
├────────────────────────────────────────────────────────────────────────┤
│ 2. PORTÃO DE JORNADA (PLAYWRIGHT E2E)                                  │
│    Navegação por cliques reais nos controles acessíveis da referência, │
│    validando pré-condições, animações e pós-condições no backend.      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. PORTÃO DE FIDELIDADE VISUAL & MOVIMENTO (PIXEL & SEMÂNTICA)         │
│    Comparador automatizado (Threshold 12, congruência > 97%), relógio  │
│    congelado (29/10/2026 15:00), zero ausência semântica e 100% dos    │
│    17 keyframes literais de motion.css validados via spec.             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Inventário Atômico de Transposição (Mapeamento Completo)

### 3.1. Chassi & Movimento (Fundação Visual e Shell)
- **Shell Canônico:**
  - Rail: `64px`, `#070d18`, botão `44×44`, ícone stroke `20px` / `1.9`, marca `30px`, tooltip no hover.
  - SubNav: `236px`, wordmark 15px + "Escritório", item `40px`, ícone `18px`. Some no breakpoint de `860px`.
  - Header: `64px`, busca com altura `40px` (apenas ícone em 860px), botão "Iniciar job" Lima.
  - Área Principal: `padding: 28px 32px 48px`, `max-width: 1480px`, scroll independente.
  - Drawers: `min(520px, 100%)`, Modais: `560px` e `760px` (lg).
  - Tema Claro Híbrido: Rail e SubNav em Tinta Profunda (`#0B1220`); miolo em Nuvem (`#F4F6F2`); ação primária em Tinta + texto Lima.
- **Contrato de Movimento (17 Keyframes Literais em `motion.css`):**
  1. `fade` (0 → 1)
  2. `rise` (translateY 10px, scale .985)
  3. `slidein` (translateX 40px)
  4. `toast` (translateY -12px)
  5. `pulse` (box-shadow teal 0 0 0 0 até 8px)
  6. `grow` (scaleY 0 → 1)
  7. `growx` (scaleX 0 → 1)
  8. `sweep` (background-position -60px → calc(100% + 60px) na barra running)
  9. `blink` (opacity .25 / 1 / .25 no chat)
  10. `spot` (opacity 1 / .35 / 1 no tour)
  11. `dash` (stroke-dashoffset até 0)
  12. `spin` (rotate 360deg)
  13. `flowdot` (left 0 → 100%)
  14. `stamp` (scale 1.18 → 1 de decisão registrada)
  15. `shimmer` (background -300px → 300px)
  16. `ringwarn` (box-shadow âmbar até 12px)
  17. `slideup` (translateY 14px)
  - Tokens de tempo: `--ease: cubic-bezier(.2,.7,.2,1)`, `--fast: 120ms`, `--std: 180ms`.
  - Modo `prefers-reduced-motion: reduce`: duração `1ms` e `1 iteration` universal.

### 3.2. Os 7 Domínios Funcionais do Redesenho

| Domínio | Rotas / Vistas no Redesenho | Integração de Backend Real & Motor Concierge |
| :--- | :--- | :--- |
| **1. Operação** | `/sala-operacao` (Cockpit), `/execucoes` (Logs SSE/Sweep), `/tasks` (Kanban 3 colunas), `/decisoes` (Aprovações unificadas com Stamp), `/agentes` (Roster), `/chat` | Motor Multi-Engine (Claude/Cursor/Antigravity/Codex) rodando em Git Worktree, fila de aprovações com diff e cofre DPAPI. |
| **2. Módulos** | `/modulos` (Hub), `/raiox` (5 etapas + evidências), `/studio` (6 etapas + preview multiformato), `/fabrica` (6 esteiras + build), `/flow` (workflow_runs + faixa beta), `/edicao` (timeline + .srt) | `gitFlow.ts` para builds da Fábrica; workers locais para coleta do Raio-X; esteira de copy do Studio com sanitização de assets. |
| **3. Comercial** | `/funil` (4 KPIs), `/propostas` (A4 Paper Document Preview), `/financas` (custo real de motor vs receita), `/personas` (CRUD) | Propostas A4 geram PDF real; custos baseados em tokens reais gravados no ledger imutável. |
| **4. Social** | `/social` (perfis), `/inbox` (central de mensagens e encaminhamento para Raio-X) | Armazenamento de conexões sociais e histórico de mensagens conectadas a clientes. |
| **5. Conhecimento** | `/cerebro` (grafo operacional e busca no acervo), `/memoria` (187 notas do Vault), `/ideias` (captura rápida) | Injeção dinâmica de notas do Vault no contexto dos agentes durante a execução. |
| **6. Estratégia** | `/mission-control` (metas e marcos), `/roadmap`, `/mapa` (conexão de arquitetura sem isométrico prematuro) | Metas integradas às tarefas e esteiras em andamento. |
| **7. Sistema** | `/analytics` (telemetria de modelos e BRL), `/doctor` (radar 6D), `/skills`, `/org-chart`, `/configuracoes`, `/como-funciona`, `/tour` | Testes de integridade, gestão de chaves no cofre Windows e seletor de motores ativos. |

### 3.3. Overlays, Modais e Drawers
- Wizard de Iniciar Job: escolha de motor, modelo, esforço e teto de custo (bloqueia se teto estiver vazio).
- Drawer de Task: histórico, ledger e botão de planejamento com Paula.
- Modal de Decisão: contexto da aprovação, diff de arquivos, revelação segura de segredos do cofre e carimbo stamp.
- Paleta de Comandos (Ctrl+K): busca instantânea indexada com navegação via setas/Enter e mensagens fiéis de estado vazio.
- Onboarding (4 passos) e Tour Guiado (2 percursos: Ciclo de Execução e Jornada do Cliente).

---

## 4. O Roadmap de Execução Unificado (10 Fases Sequenciais)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ROADMAP DE EXECUÇÃO DO SUPER GOAL                    │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 01: Scaffolding Electron + React 19 + Tokens & Motion CSS         │
│ FASE 02: Fixture Visual Congelado + SCREEN-MAP + Manifest de Teste     │
│ FASE 03: Shell Canônico (64/236/64), Login, Sessão e Onboarding        │
│ FASE 04: Backend Core (IPC, SQLite WAL, Cofre DPAPI, Ledger, SSE)      │
│ FASE 05: Hub Multi-Motor (Anthropic, Cursor, Antigravity, Codex)       │
│ FASE 06: Domínio Operação (Sala, Execuções, Tasks, Decisões, Chat)     │
│ FASE 07: Domínio Módulos (Hub, Fábrica, Studio, Raio-X, Flow, Edição)  │
│ FASE 08: Domínios Comercial, Social, Conhecimento, Estratégia, Sistema │
│ FASE 09: Carga Integral de Conhecimento (57 Agentes + 187 Notas Vault) │
│ FASE 10: Três Portões de Aceite (Pytest/Node, Playwright e Pixel/Sem)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento das Fases

- **Fase 01 — Base & Motion:** Criar a estrutura Electron + React 19 + TypeScript, importar os 17 keyframes literais do HTML em `motion.css` e validar o spec de animação (`motion.spec.ts`).
- **Fase 02 — Fixture & Comparador:** Congelar o relógio em `2026-10-29T15:00:00-03:00` e configurar o runner de Playwright para comparação lado a lado entre o HTML de redesenho e o novo app.
- **Fase 03 — Shell & Sessão:** Implementar Rail, SubNav, Header, Login com chave local (sessão 12h) e Onboarding de 4 passos.
- **Fase 04 — Chassi de Dados e Segurança:** Persistência relacional em SQLite WAL com migrações numeradas, cofre DPAPI do Windows para guardar as chaves cifradas e ledger imutável de eventos.
- **Fase 05 — Hub Multi-Motor & Git Worktrees:** Conectar os 4 motores intercambiáveis (Anthropic via Claude SDK, Cursor via `agent.exe`, Antigravity via `agy`, Codex via OpenAI sandbox), todos operando dentro de `.work/wt-<id>/`.
- **Fase 06 — Operação Completa:** Cockpit da Sala, lista de Execuções com sweep na barra e SSE, Tasks com Kanban e Decisões unificadas com carimbo de aprovação.
- **Fase 07 — Módulos em Produção:** Fábrica executando builds de templates reais, Studio com Kanban de 6 etapas e previews multiformato, Raio-X com coleta de evidências e Flow com workflow runs.
- **Fase 08 — Comercial até Sistema:** Funil, Propostas em papel A4, Finanças com custo real de tokens, acervo do Cérebro, Doctor 6D e painel de Configurações com toggles de motores.
- **Fase 09 — Conhecimento & Dossiês:** Embarcar as 187 notas do Vault e os 57 escopos canônicos de agentes em `resources/`, criando os dossiês de documentação no estilo do Concierge.
- **Fase 10 — Certificação Final:** Executar a bateria completa dos 3 portões: suite de testes de backend verde, jornadas Playwright 100% verdes e relatório de comparação pixel/semântica aprovado sem discrepâncias.

---

## 5. Conclusão

Ao atrelar o **plano de redesenho visual** à **arquitetura do Concierge com suporte multi-motor**, eliminamos a duplicidade de trabalho e resolvemos o problema de forma definitiva.

O resultado não é um protótipo com cara de pronto, mas um **Escritório Executivo Nativo para Windows**, pixel-perfect em relação ao HTML de redesenho, com a força de execução industrial do Concierge e a inteligência completa da TAVIR.
