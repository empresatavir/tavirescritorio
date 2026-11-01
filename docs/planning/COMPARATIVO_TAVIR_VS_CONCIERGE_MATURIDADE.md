# Comparativo Anatômico & Plano de Convergência: TAVIR Escritório vs. newConcierge

> **Documento de Engenharia & Arquitetura Estratégica**  
> **Data:** 01 de Novembro de 2026  
> **Autor:** Antigravity AI & Arquitetura TAVIR (Maicon / Arquiteto de Integrações)  
> **Alvo:** Transformar o TAVIR Escritório em uma estrutura de máxima maturidade operacional e alta tração para seus módulos (Fábrica, Studio, Flow, Raio-X, Comercial, Cérebro e Sala de Operação).

---

## 1. Sumário Executivo

Este documento estabelece a comparação atômica entre duas ferramentas complementares de alto nível:
1. **`tavirescritorio`**: Uma plataforma de comando operacional abrangente, construída para governar **57 agentes de IA** e múltiplos domínios de negócio de uma agência/empresa de inteligência artificial (Fábrica de Software, Creative Studio, Raio-X Diagnóstico, Flow de Automações, Gestão Comercial e Grafo de Conhecimento com 187 notas do Vault).
2. **`newConcierge`**: Um orquestrador de agentes de IA cirúrgico e de altíssima maturidade de produção para engenharia de software corporativo (TOTVS Hospitalidade / VHF), operando com **Claude Agent SDK**, **Git Worktrees isoladas**, **Cofre DPAPI**, **Gate de Aprovações Blindado**, **telemetria financeira auditável** e arquitetura híbrida de execução (Server vs. Client-Execution).

### O Diagnóstico Central
- **O TAVIR Escritório tem a amplitude, a visão de produto, a identidade visual estrita e o ecossistema de múltiplos módulos**, mas seus "motores" internos ainda operam com mocks, completions isoladas de LLM ou chamadas pontuais de script, faltando tração real de execução nos bastidores.
- **O Concierge tem a musculatura de execução, a robustez industrial de engenharia e a governança à prova de falhas**, mas é afunilado em um único fluxo de negócio (issues de engenharia de software Legado/Delphi/SQL).

**A tese de convergência:** Não se trata de descartar uma stack em favor da outra, mas de **injetar os padrões arquiteturais atômicos do Concierge no TAVIR Escritório**, elevando a robustez dos bastidores do Tavir para que seus módulos (Fábrica, Studio, Raio-X, Flow) passem a rodar com a mesma força e confiabilidade de uma esteira industrial de missão crítica.

---

## 2. Matriz Comparativa Atômica (Módulo a Módulo)

| Dimensão de Análise | `newConcierge` (Referência de Maturidade) | `tavirescritorio` (Estado Atual) | Gap Identificado / O que falta para Nível Industrial |
| :--- | :--- | :--- | :--- |
| **1. Shell & Runtime** | **Electron 43 + React 19 + TypeScript + Node 20**. Executável nativo (.exe), ícone de bandeja, notificações do Windows, perfis (Host/Server vs. Estação Cliente vs. Web :8787). | **SolidJS SPA + Vite + FastAPI (Python 3.12)** rodando em portas de rede loopback (`9001`/`9002`) no navegador. | O Tavir depende de processos de terminal abertos separadamente via `.bat`. Falta empacotamento desktop ou processo supervisor único de alto nível com ciclo de vida gerenciado. |
| **2. Motor de Agentes** | **`@anthropic-ai/claude-agent-sdk` nativo**. Agentes operam com `tool loop` autônomo (leitura/escrita, bash, busca, validações), respeitando `CLAUDE.md` do workspace via `settingSources: ['project']`. | **GhostCLI Gateway (`https://ghostcli.cloud/v1`) + Runner subprocess simples (`ALLOWED_COMMANDS = {echo, cat, ls, python}`)**. | O Tavir não tem agentes com *tool use* autônomo pleno em runtime. Os agentes dependem de scripts específicos ou completions síncronas de chat. |
| **3. Isolamento de Execução** | **Git Worktrees Efêmeras (`gitFlow.ts`)**. Cada issue/tarefa gera uma worktree isolada (`git worktree add -b feature/...`). O diretório principal nunca é sujado; diffs são atômicos e descartáveis. | Diretórios estáticos em `backend/workspaces/` criados manualmente por ID de job/projeto. Sem isolamento de worktree no Git. | Risco de concorrência e sujeira de arquivos em execuções paralelas. Falta isolamento atômico de árvore Git por tarefa. |
| **4. Segurança & Segredos** | **Cofre Criptografado com DPAPI do Windows (`safeStorage`)**. Chaves e senhas cifradas pela conta do usuário do SO. A interface gráfica **nunca** recebe os segredos em texto puro. | Arquivos `.env`, seeds em banco SQLite (`tavir.db`) e configurações locais em texto plano. | Falta proteção criptográfica de credenciais no nível do Sistema Operacional (DPAPI / Windows Credential Manager). |
| **5. Governança & Approvals** | **Portão Universal de Saída (`approvals.ts` - 143 KB)**. Regra de ferro: **nenhuma** ação externa (Jira, Git push, PR, envio) é disparada pelo agente. Tudo vira uma aprovação com diff e inspeção humana obrigatória. | Módulo `approvals` no SQLite e na UI, porém os endpoints ainda estão fracamente acoplados à execução real dos módulos. | O Tavir precisa transformar o módulo de Aprovações no **único canal legal de saída (gatekeeper)** para publicar LPs, enviar mensagens, fechar contratos ou alterar código. |
| **6. Gestão de Inteligência & Prompts** | **Inteligência Centralizada, Cifrada e Efêmera**. Templates e memórias viajam do servidor para o workspace do cliente antes da run, rodam e são **destruídos após a execução**, protegendo o IP. | Arquivos Markdown estáticos em `agentes/escopo/agentes/*.md` e notas do Vault indexadas. | O Tavir tem excelente documentação de escopos, mas não possui injeção dinâmica efêmera de habilidades nem ciclo de vida controlado de memória em 3 camadas. |
| **7. Camadas de Memória** | **3 Níveis Isolados**: (1) Memórias da Versão (curadas/imutáveis), (2) Memórias do Projeto (acumuladas por execução), (3) Memórias Pessoais (com fluxo de promoção para a equipe). | Tabela `ideas`, `memory` e notas do Vault no SQLite. Acervo de 187 notas indexadas, mas estáticas (não retroalimentadas pelos agentes). | O conhecimento do Tavir é uma enciclopédia estática; o do Concierge é um cérebro vivo que aprende com o resultado de cada run. |
| **8. Telemetria & Finanças** | **Auditoria Criptográfica e Imutável**: Tokens exatos de entrada/saída, tempo em milissegundos, custos em USD por modelo e rastreamento de causa-raiz/regressão no MySQL. | Telas de Analytics com distribuição visual estimada (Claude 53%, Opus 27%, etc.) e métricas agregadas pré-computadas. | Falta telemetria em tempo real derivada diretamente do consumo de tokens das APIs em cada step de execução. |
| **9. Banco de Dados & Sincronização** | **MySQL com Migrações Numeradas Estritas (`db.ts`)** + Pool de conexões + Suporte a cliente remoto via SSE e Túnel TLS/ngrok. | **SQLite Local (`tavir.db`) com WAL Mode**, integridade referencial ativa (`foreign_keys = ON`) e Alembic para migrações. | O SQLite do Tavir é excelente para uso local (ADR-002), mas carece de espelhamento remoto resiliente caso se deseje rodar agentes distribuídos. |
| **10. Amplitude de Módulos** | Especializado: Board Jira -> Refinamento -> Desenvolvimento -> Compilação VHF -> Suporte Zendesk -> Relatórios. | **Holístico (8 Domínios)**: Sala de Operação, Execuções, Tasks, Agentes, Fábrica (6 esteiras), Studio (6 etapas), Raio-X (5 etapas), Comercial (Funil/A4), Cérebro, Flow, Mapa. | O Tavir tem um ecossistema 10x mais rico em negócios, pronto para tracionar se o motor por trás for padronizado. |

---

## 3. As 6 Alavancas Anatômicas que o TAVIR Precisa Absorver

Para que o TAVIR Escritório atinja a mesma maturidade de missão crítica do Concierge e consiga tracionar de verdade a **Fábrica**, o **Studio**, o **Flow**, o **Raio-X** e o **Comercial**, devemos incorporar 6 pilares de engenharia:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TAVIR ESCRITÓRIO - CORE INDUSTRIAL              │
├────────────────────────────────────────────────────────────────────────┤
│  1. COFRE NATIVO (DPAPI)   ──► Protege Chaves (Anthropic, Meta, etc.)  │
│  2. AGENT RUNNER REAL       ──► Tool Loop Autônomo com Claude/Cline SDK│
│  3. GIT WORKTREE MANAGER    ──► Isolamento Físico de Jobs sem Conflitos│
│  4. APPROVALS GATEWAY       ──► Human-in-the-Loop Universal Obrigatório│
│  5. MEMÓRIA EM 3 NÍVEIS     ──► Curada (Vault) + Projeto + Execução    │
│  6. TELEMETRIA & FINANÇAS   ──► Custo Real por Token, Latência e Log   │
└────────────────────────────────────────────────────────────────────────┘
```

### Alavanca 1: O "Agent Runner" Baseado em Tool Loop (Fim dos Mocks)
- **Problema Atual:** O `JobRunner` do Tavir em `backend/app/modules/jobs/runner.py` possui uma lista restrita de comandos (`ALLOWED_COMMANDS = {"echo", "cat", "ls", "python"}`) e executa sub-processos estáticos ou simulações SSE. No `factory/executor.py`, há chamadas ao GhostCLI, mas sem um agente autônomo com capacidade de inspecionar diretórios, corrigir erros e testar entregáveis.
- **Solução Concierge:** Utilizar o padrão do `agent.ts`. O agente não apenas "responde texto"; ele recebe um workspace, ferramentas de sistema de arquivos e ferramentas de execução, interagindo em turnos até que o entregável (código, diagnóstico, peça publicitária) atinja os critérios de aceite definidos no `expected_artifacts`.

### Alavanca 2: Gestão de Workspaces via Git Worktrees (Isolamento Físico)
- **Problema Atual:** Quando múltiplos jobs rodam no Tavir, eles compartilham pastas ou usam diretórios manuais em `backend/workspaces/<job-id>`. Não há garantia de versionamento atômico nem facilidade de ver o `git diff` do que o agente realizou.
- **Solução Concierge (`gitFlow.ts`):** 
  - Para qualquer tarefa (Fábrica, Studio ou RaioX), criar dinamicamente:
    ```bash
    git worktree add -b job/TASK-123 .work/wt-TASK-123 base-branch
    ```
  - O agente opera dentro de `.work/wt-TASK-123/`.
  - Ao terminar, o sistema calcula o diff exato (`git diff --stat` e `git diff -U3`).
  - O diff é apresentado no painel de **Aprovações**. Se aprovado, é mergeado; se rejeitado, a worktree é simplesmente deletada (`git worktree remove --force`), garantindo **zero contaminação**.

### Alavanca 3: O Portão Universal de Governança (Approvals como Barreira Única)
- **Problema Atual:** A tela `/decisoes` e `/aprovacoes` no Tavir lista itens de aprovação, mas não é a dona exclusiva dos efeitos colaterais do sistema.
- **Solução Concierge (`approvals.ts`):** 
  - Nenhuma rotina externa do Tavir deve ter permissão de envio direto:
    - *Fábrica:* Não faz deploy de LP nem commit em `main` sem passar por `/aprovacoes`.
    - *Studio:* Não publica post em Instagram/YouTube sem passar por `/aprovacoes`.
    - *Comercial:* Não envia proposta PDF/A4 para o cliente sem passar por `/aprovacoes`.
    - *Raio-X:* Não gera parecer final de consultoria sem homologação humana.
  - Cada item pendente traz: autor, agente responsável, diff de alterações ou preview visual de saída, custo gerado até ali e botão de Aprovar/Rejeitar com justificativa.

### Alavanca 4: Cofre Criptográfico DPAPI (Fim dos Segredos em Texto Plano)
- **Problema Atual:** As chaves de API (RapidAPI, Resend, Telegram, GhostCLI, Anthropic) ficam em variáveis de ambiente ou tabelas do SQLite.
- **Solução Concierge (`vault.ts` / `cofreCripto.ts`):**
  - Implementar no backend Python um módulo de cofre usando a API nativa do Windows: `CryptProtectData` / `CryptUnprotectData` via `ctypes` (ou biblioteca `keyring`).
  - No frontend, os inputs de credenciais aceitam os dados, enviam via rota segura protegida por chave de sessão loopback, o backend cifra com a chave do usuário Windows e armazena os bytes cifrados.
  - O frontend **nunca mais** exibe o valor da chave; exibe apenas `sk-ant-••••••3a` e o status de conexão verificado.

### Alavanca 5: Memória Dinâmica em Três Camadas (O Conhecimento Ativo)
- **Problema Atual:** O Tavir tem um Vault riquíssimo com 187 páginas de autores e metodologias (Hormozi, Kahneman, Thiel, etc.), mas elas estão indexadas apenas como referências estáticas para leitura humana no modal de Cérebro. Os agentes não as utilizam dinamicamente.
- **Solução Concierge (`baseConhecimento.ts` / `memoriasDoProjeto.ts`):**
  - **Camada 1 (Fundação Imutável):** O acervo do Vault e as regras dos 57 agentes formatadas como skills injetáveis sob demanda.
  - **Camada 2 (Memória do Projeto):** Cada esteira da Fábrica ou do Studio grava um resumo do que funcionou ou falhou na pasta do projeto (`.memory/learned.md`).
  - **Camada 3 (Memória de Execução / Efêmera):** Antes de iniciar um job, o orquestrador monta um bundle contendo apenas o conhecimento relevante para aquela etapa e injeta no workspace temporário do agente, apagando-o ao final.

### Alavanca 6: Telemetria de Custo Real e Rastreamento Forense
- **Problema Atual:** A tela `/analytics` do Tavir projeta percentuais estatísticos baseados em simulação.
- **Solução Concierge (`history.ts` / `eventos.ts`):**
  - Cada interação do agente registra um evento atômico imutável:
    `timestamp`, `agent_id`, `model`, `prompt_tokens`, `completion_tokens`, `cost_usd`, `tool_called`, `tool_result_preview`.
  - Isso alimenta a tela de Analytics com reconciliação financeira em centavos de dólar e real (BRL), permitindo precificar exatamente quanto custou produzir uma Landing Page na Fábrica, um lote de posts no Studio ou um diagnóstico no Raio-X.

---

## 4. Como Tracionar Cada Módulo do TAVIR com Esta Arquitetura

Aqui está o mapeamento atômico de como aplicar os princípios do Concierge para fazer cada um dos módulos do TAVIR "acordar" e rodar com força operacional:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE TRAÇÃO DOS MÓDULOS TAVIR                  │
├────────────────────────────────────────────────────────────────────────┤
│ MÓDULO        INPUT OPERACIONAL           MOTOR CONCIERGE APLICADO     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. FÁBRICA    Demanda / Template          Worktree Git + Builder + QA  │
│ 2. STUDIO     Perfil / Pauta de Conteúdo  Esteira 6 Etapas + Preview   │
│ 3. FLOW       Workflow de Negócio         State Machine SSE + Guard    │
│ 4. RAIO-X     URL / Segmento / Empresa    Scraper + Evidence Validator │
│ 5. COMERCIAL  Lead / Requisitos           A4 Generator + Digital Gate  │
│ 6. CÉREBRO    Vault (187 notas)           Dynamic Context Injector     │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Módulo FÁBRICA (Engenharia de LPs, Ofertas e Sistemas)
- **Como tracionar:**
  1. O usuário clica em "Novo Projeto" e seleciona um dos 6 templates (ex: Landing Page de Alta Conversão).
  2. O backend cria uma **Git Worktree** isolada em `.work/wt-<project-id>`.
  3. O **Agent Runner** aloca o agente responsável (ex: `dev-frontend` ou `arquiteto-sistemas`), injetando as diretrizes de código e o template em um `CLAUDE.md` local temporário.
  4. O agente gera o código fonte real (HTML/Tailwind/React/SolidJS), instala dependências locais (`npm install`) e executa o build de validação (`npm run build`).
  5. Um processo headless gera o screenshot de validação (Visual QA).
  6. O resultado cai na esteira de **Aprovações** com o diff completo e o preview visual.
  7. Aprovado pelo usuário, o código é mesclado e disponibilizado para deploy.

### 4.2. Módulo STUDIO (Produção Editorial e Criativa de 6 Etapas)
- **Como tracionar:**
  1. A pauta entra na Etapa 1 (Conceito/Gancho) associada a um Perfil de Marca (Persona).
  2. O agente copywriter formula os 3 ganchos magnéticos respeitando as restrições de formato (Instagram 4:5, YouTube 16:9, Reels 9:16, LinkedIn).
  3. O motor passa para a Etapa 2 (Roteiro Completo) e Etapa 3 (Geração de Assets/Imagens).
  4. A ferramenta gera os metadados finais limpos (sem metadados C2PA, conforme a regra de ouro do Tavir).
  5. O modal de **Visual Studio** da UI renderiza o preview fiel.
  6. A publicação automática fica retida na fila de **Aprovações** até que o operador autorize o despacho para os canais (Meta Graph API / YouTube API / Telegram).

### 4.3. Módulo RAIO-X (Diagnóstico Comercial e Auditoria Empresarial)
- **Como tracionar:**
  1. O operador abre um caso informando o nome da empresa, objetivo comercial e URL.
  2. O módulo dispara workers especializados:
     - Worker de Redes Sociais: consome o adaptador RapidAPI (conforme especificado no escopo do Maicon e Íris) coletando os 20 últimos posts e métricas sem scraping agressivo.
     - Worker de Web: extrai meta-tags, velocidade, stack tecnológica e presença online.
  3. Cada dado coletado gera uma linha imutável em `raiox_evidence` classificada como `observado`, `informado` ou `inferido`.
  4. O agente analista cruza as evidências com os modelos do Vault (ex: matriz de oferta Hormozi) e gera a **Única Prioridade Estratégica**.
  5. Se o diagnóstico for aprovado, o sistema já gera o gancho direto para a criação de uma proposta comercial no módulo Comercial.

### 4.4. Módulo FLOW (Workflows Operacionais e Orquestração Canônica)
- **Como tracionar:**
  1. Formalizar as 6 esteiras de processos de negócio (Onboarding de Clientes, Vendas, Fechamento Financeiro, etc.) como máquinas de estado orientadas a eventos.
  2. Cada passo do fluxo possui agentes designados, condições de entrada e gates humanos obrigatórios.
  3. O status do fluxo é transmitido em tempo real para a **Sala de Operação** via SSE, com telemetria de gargalo e tempo médio por etapa (replicando o painel de BI e Kanban do Concierge).

### 4.5. Módulo COMERCIAL & PROPOSTAS
- **Como tracionar:**
  1. Conectar a esteira do Raio-X diretamente com o gerador de propostas.
  2. A proposta é instanciada com escopo, termos contratuais e precificação vinculados às evidências levantadas.
  3. O modal do frontend já possui o visual **A4 Paper Document Preview**. O backend deve exportar este HTML rigoroso diretamente para PDF estático via renderizador headless (Chromium / WeasyPrint).
  4. O envio de e-mail ao lead é travado no portão de aprovação até a chancela humana.

---

## 5. Decisão Estratégica: Adoção Integral da Stack do Concierge (TAVIR Desktop Nativo)

> [!IMPORTANT]
> **Decisão Aprovada pela Liderança TAVIR:**
> Em vez de tentar consertar ou reescrever motores complexos em Python/FastAPI enquanto o frontend sofre com desalinhamento de estado, **a TAVIR adotará integralmente a stack técnica e a arquitetura comprovada em produção do Concierge**.
>
> **Diretrizes Inegociáveis:**
> 1. **Stack Unificada:** **Electron 43 + React 19 + TypeScript + Node 20** + Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) + Cofre DPAPI (`safeStorage`) + Git Worktrees + Portão de Aprovações.
> 2. **Design System TAVIR Intacto:** Fidelidade absoluta às 3 colunas (Rail 64px, SubNav 236px, Header 64px), tema claro/escuro híbrido, tokens de cor (Tinta Profunda, Nuvem, Lima), tipografia local (Instrument Sans e IBM Plex Mono) e higienização estrita de SVGs (sem metadados C2PA).
> 3. **Preservação Total da Inteligência:** Migração sem perda de nenhum dado: 57 agentes (`agentes/escopo/agentes/*.md`), 187 notas do Vault, personas, perfis do Studio, templates da Fábrica e matriz de evidências do Raio-X.
> 4. **Expurgo do Domínio Específico do Concierge:** Eliminar qualquer dependência ou código voltado para Jira, Zendesk, Delphi DCC32, VHF e TOTVS.
> 5. **Absorção da Disciplina e Rigor de Documentação:** Adotar o padrão de detalhamento cirúrgico do Concierge (o modelo dos 74 arquivos de `docs/conhecimento/`, dossiês de refino, changelogs e registro de regressões) para documentar a TAVIR.

---

## 6. Arquitetura Alvo: TAVIR Desktop (Powered by Concierge Engine)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TAVIR ESCRITÓRIO — DESKTOP NATIVO                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  INTERFACE (src/renderer)                                                   │
│  ├── Design System TAVIR (Tokens CSS, Rail 64px, SubNav 236px, Header 64px) │
│  ├── React 19 + TypeScript + Lucide / TvIcon higienizado                    │
│  └── Vistas: SalaOperacao, Execucoes, Tasks, Aprovacoes, Fabrica, Studio,    │
│              RaioX, Flow, Comercial, Cerebro, Analytics, Configuracoes      │
├─────────────────────────────────────────────────────────────────────────────┤
│  PONTE IPC SEGURA (src/preload / src/shared)                                │
│  ├── window.tavir tipado (sem expor credenciais à interface)                │
│  └── Streaming de Eventos SSE / PushBus em tempo real                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  MOTOR INDUSTRIAL MULTI-ENGINE (src/main)                                  │
│  ├── drivers/         ──► Adaptadores Intercambiáveis (Toggle Ativa/Desativa)│
│  │   ├── anthropic.ts ──► Claude Agent SDK oficial + Claude Code CLI local  │
│  │   ├── cursor.ts    ──► Cursor Agent local (`agent.exe` / CLI headless)   │
│  │   ├── antigravity.ts ─► Antigravity Engine (`agy` CLI / Gemini 3.8/2.0) │
│  │   └── codex.ts     ──► OpenAI Codex / Tool-Loop autônomo com sandbox     │
│  ├── approvals.ts     ──► Portão Universal de Saída (human-in-the-loop)     │
│  ├── gitFlow.ts       ──► Git Worktrees isoladas por tarefa (.work/wt-xxx)  │
│  ├── cofreCripto.ts   ──► DPAPI nativa do Windows (safeStorage)             │
│  ├── knowledge.ts     ──► Injetor dinâmico das 187 notas do Vault           │
│  ├── fabrica.ts       ──► Orquestrador das 6 esteiras de engenharia         │
│  ├── studio.ts        ──► Esteira criativa de 6 etapas (social/audiovisual) │
│  └── raiox.ts         ──► Motor de diagnóstico com evidências auditáveis    │
├─────────────────────────────────────────────────────────────────────────────┤
│  PERSISTÊNCIA & DISTRIBUIÇÃO (src/server / resources)                       │
│  ├── SQLite WAL / MySQL estruturado com migrações numeradas                 │
│  ├── Servidor HTTP/RPC embutido (porta 9001/8787) para acesso via browser   │
│  └── resources/ (187 notas do Vault + 57 escopos de agentes embarcados)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Mapeamento Atômico da Migração & Tracionamento dos Módulos

### Fase 1: Fundação do Shell Desktop & Design System TAVIR
- [ ] **Scaffolding da Stack:** Inicializar a estrutura `src/main`, `src/preload`, `src/renderer`, `src/shared` baseada no modelo Electron + Vite + React 19 do Concierge.
- [ ] **Transposição do Design System TAVIR:**
  - Migrar os tokens de `frontend/src/index.css` (Tinta Profunda `--surface-ink: #0B1220`, Fundo `--surface-0: #F4F6F2`, Lima `--action-fg: var(--lime)`).
  - Preservar fontes locais Instrument Sans e IBM Plex Mono em `@font-face` (zero CDNs).
  - Implementar o Shell Canônico em React 19: Rail (64px fixos), SubNav (236px fixos com colapso em 860px) e Header (64px com breadcrumb e busca Ctrl+K).
  - Garantir o componente `TvIcon.tsx` com `sanitizeSvg()` e `toCssSize()` (blindagem contra bug C2PA).

### Fase 2: Transposição do Motor de Execução Industrial Multi-Motor
- [ ] **Cofre DPAPI do Windows:** Adotar o `vault.ts` / `cofreCripto.ts` do Concierge para gerenciar as chaves Anthropic, OpenAI, Meta, Resend, Telegram e RapidAPI. A chave nunca vai em texto plano para o renderer.
- [ ] **Driver Multi-Engine Intercambiável (`src/main/drivers/`):**
  - Contrato unificado `AgentEngineDriver` emitindo os mesmos `RunEvents` (pensamento, tool calls, diffs, conclusão).
  - **Driver Anthropic:** `@anthropic-ai/claude-agent-sdk` + Claude Code CLI da máquina.
  - **Driver Cursor:** Conector local com o agente do Cursor (`agent.exe` / `cursor-agent`), reaproveitando a inteligência já mapeada em `cursor_link/client.py`.
  - **Driver Antigravity:** Conector com o `agy CLI` e motor Gemini 3.8 / 2.0.
  - **Driver Codex:** Conector OpenAI com tool-loop de leitura/escrita e execução em sandbox.
  - **Toggles na Interface:** Seletor de ativação/desativação no painel de Configurações e no Header do app (escolha do motor padrão ou por tipo de tarefa).
- [ ] **Git Worktrees Dinâmicas:** Replicar `gitFlow.ts`. Qualquer motor (Claude, Cursor, Antigravity ou Codex) opera estritamente dentro da worktree temporária em `.work/wt-<id>/`, commita em branch isolada e gera diffs atômicos.
- [ ] **Portão Universal de Aprovações:** Adaptar `approvals.ts`. Toda saída de impacto (deploy de LP, post social, envio de proposta comercial) fica retida como `PendingApproval` com visualização do diff e aprovação do operador, independentemente de qual motor executou a tarefa.

### Fase 3: Tracionamento dos Módulos de Negócio da TAVIR

| Módulo | Entrada Operacional | Motor do Concierge Adaptado | Entregável Concreto |
| :--- | :--- | :--- | :--- |
| **Fábrica** | Escolha de Template (LP, Oferta, Sistema) | `gitFlow.ts` (Worktree) + `agent.ts` (Dev) + `build.ts` (NPM Build) | Código validado, sem erros TypeScript, com preview e diff para aprovação. |
| **Studio** | Pauta / Briefing + Perfil de Marca | `agent.ts` (Copy/Hooks) + Esteira de 6 etapas + Clean SVG/Assets | Pacote de criativos multiformato (4:5, 16:9, 9:16) pronto para revisão. |
| **Raio-X** | URL da Empresa + Objetivo Comercial | Workers locais de coleta (RapidAPI / Scraper) + `evidence.ts` | Matriz de evidências auditáveis (`observado`, `informado`) e Única Prioridade Estratégica. |
| **Flow** | Definição de Workflow de Negócio | Máquina de estados com `events.ts` + streaming SSE no cockpit | Orquestração autônoma entre múltiplos agentes com handoff rastreável. |
| **Comercial** | Diagnóstico do Raio-X ou Briefing Lead | Gerador de Proposta A4 + Gate de Envio | Proposta formal em A4 Paper Document com aceite digital e exportação PDF. |
| **Cérebro** | Busca Semântica / Captura de Ideias | `knowledge.ts` (Injeção de notas do Vault no contexto dos agentes) | Respostas fundamentadas nas 187 notas (Hormozi, Kahneman, Thiel). |

### Fase 4: Migração de Dados, Inteligência e Memória
- [ ] **Embarcar os 57 Agentes:** Estruturar `resources/agentes/` com todos os escopos canônicos (incluindo o Maicon, Íris, etc.) no formato refinado de skills e instruções de sistema.
- [ ] **Embarcar o Vault (187 Notas):** Estruturar `resources/vault/` com o corpus completo em Markdown, indexado para recuperação rápida por palavra-chave ou similaridade.
- [ ] **Dossiês de Conhecimento TAVIR:** Criar `docs/conhecimento/` no repositório da TAVIR, adotando a disciplina cirúrgica do Concierge para documentar armadilhas, regras de arquitetura e decisões de cada módulo.

### Fase 5: Operação, Scripting e Release
- [ ] **Scripts Windows Padronizados:** Adaptar os scripts com cabeçalho `chcp 65001 >nul` e CRLF:
  - `iniciar_escritorio.bat`: compila e sobe o Electron em desenvolvimento com recarga ao vivo.
  - `dev-prod.bat`: abre com os dados locais reais.
  - `release.bat`: empacota o instalador final `TAVIR-Escritorio-<versao>-x64.exe` via electron-builder.
- [ ] **Modo Híbrido Servidor/Cliente:** Manter a capacidade do Concierge de rodar como servidor local e expor a porta HTTP/RPC (ex: 9001) para acesso direto pelo navegador em outras máquinas da rede.

---

## 8. Conclusão & Próxima Ação

A decisão de adotar a **stack do Concierge com a alma e o visual da TAVIR** elimina meses de retrabalho em infraestrutura que já foi resolvida, blindada e testada no Windows. 

Com isso, o TAVIR Escritório deixa de ser uma promessa visual com motores parciais e se torna um **ambiente de trabalho executivo nativo, robusto e ultra-veloz**, pronto para rodar os 57 agentes e tracionar todos os módulos comerciais da empresa.
