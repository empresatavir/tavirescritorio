# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: verificado (C:\Users\carlo\.claude\plans\quero-que-voc-produza-curried-peach.md)
- Design System e Layout Moderno: FIDELIDADE ABSOLUTA (C:\Users\carlo\Downloads\Referencias\novo\Layout Moderno\Modernização do layout Tavir Escritório\TAVIR Escritorio standalone-src.dc.html)
- Branch: feat/fase-5-visibilidade-conhecimento-workflows

## Estado atual
- Goal atual: Fase 5 — Visibilidade, Conhecimento, Workflows e Integrações (Goal G8)
- Status: 100% Concluído
- Backend: FastAPI + SQLite + SQLAlchemy async + aiosqlite (30/30 testes passando no pytest)
- Acervo do Vault: 187 páginas reais de `absorcao-conteudo/` indexadas no SQLite com busca semântica, metadados e tags
- 6 Workflows de Negócio Canônicos (Decisão D3): isolados da Fábrica com etapas, agentes e gates humanos protegidos
- Doctor Operacional: radar de saúde ponderado em 6 dimensões (Engenharia, Conhecimento, Comercial, Marketing & Studio, Governança & QA, Fábrica & Templates) com score geral (89-93%) e evidências em tempo real
- Analytics & Finanças: telemetria consolidada por modelo (Claude Sonnet 53%, Opus 27%, GPT-4o 15%, DALL-E 3 5%) reconciliada com faturamento em BRL
- Catálogo de Skills: mapeamento operacional cobrindo os 57 agentes canônicos
- Frontend: SolidJS SPA + Vite + TypeScript (build 100% limpo, 0 erros TypeScript, conectado via client.ts e store reativa)
- Shell: 3 colunas (56px Rail + 212px SubNav + 52px Header)

## Critérios e Decisões Atendidas (D1–D10)
- [x] **D1 - 40 rotas aceitas**: Todas as rotas do catálogo estão ativas e navegáveis via Rail, SubNav e Command Palette.
- [x] **D2 - SolidJS SPA**: Implementado com `@solidjs/router`, reatividade granular, stores e code-splitting.
- [x] **D3 - Separar catálogos**: Workflows de negócio (`/workflows`) formalmente isolados dos templates de engenharia da Fábrica (`/fabrica`).
- [x] **D4 - Separar com FK**: Modelos Persona e Studio Profile separados com chave estrangeira.
- [x] **D5 - Adapter interface + mock**: Contratos externos estruturados com interfaces e mocks, com selo transparente.
- [x] **D6 - Ponto de conexão Habblaud**: Event hook reservado no Mapa sem implementação prematura.
- [x] **D7 - Baixar OFL**: Fontes locais Instrument Sans e IBM Plex Mono (.ttf) servidas offline via `@font-face` (zero CDNs).
- [x] **D8 - Validar piloto primeiro**: Piloto operacional com SSE streaming e logs em tempo real validado.
- [x] **D9 - Checkpoint**: Documentado neste arquivo `docs/planning/CHECKPOINT-TAVIR.md`.
- [x] **D10 - Fidelidade visual frontend**: Layout idêntico ao `Layout Moderno` com tokens, dimensões, tema light híbrido e interações completas.

## Resumo das Telas & Módulos Implementados (Fases 1 a 5)

| Módulo / Rota | Componente | Descrição da Implementação |
| :--- | :--- | :--- |
| `/` & `/sala-operacao` | `SalaOperacaoView.tsx` | Dashboard com 3 KPIs e 4 seções operacionais (Jobs rodando, Escalados, Cards ativos, Precisa de você). |
| `/execucoes` | `ExecucoesView.tsx` | Painel duplo: lista filtrável de jobs com status badges e lateral com SSE logs ao vivo e diagnóstico de falhas. |
| `/tasks` | `TasksView.tsx` | Kanban de 3 colunas (Pendente, Em andamento, Concluído) com busca, drawer lateral e modal de criação e iniciação rápida. |
| `/aprovacoes` | `AprovacoesView.tsx` | Layout em 2 painéis: filtros por impacto e tipo com botões de Aprovar/Rejeitar e justificativa detalhada. |
| `/chat` & `/chat/*` | `ChatView.tsx` | Histórico de conversas, seletor dos 57 agentes, balões responsivos e drawer lateral de configurações. |
| `/fabrica` | `FabricaView.tsx` | 3 visões completas: Catálogo de esteiras (LPs, Ofertas, Sistemas), detalhe de esteira e detalhe de projeto com 6 abas. |
| `/studio` | `StudioView.tsx` | Catálogo de perfis (Datavir, Canal IA na Prática, TAVIR), Kanban de 6 etapas, Visual Studio com preview realista (Instagram 4:5, YouTube 16:9, TikTok 9:16, LinkedIn), modal de Nova Produção e drawer de Peça. |
| `/propostas` | `PropostasView.tsx` | Kanban de 3 colunas, modal de detalhes completo com alteração de escopo, e modal A4 Paper Document Preview com aceite eletrônico. |
| `/cerebro` | `CerebroView.tsx` | Grafo Operacional interativo, busca semântica em 187 páginas indexadas do Vault, Reader Modal completo com citações de autores (Kahneman, Ariely, Hormozi, Thiel) e Captura Rápida persistindo na fila de ideias. |
| `/workflows` | `GenericPageView.tsx` | Catálogo dos 6 processos de negócio canônicos (Onboarding, Comercial, Editorial, QA/Hardening, Suporte, Fechamento Financeiro) com sequência de agentes e badges de gates humanos. |
| `/doctor` | `GenericPageView.tsx` | Radar de saúde operacional com avaliação ponderada nas 6 dimensões (Engenharia, Conhecimento, Comercial, Marketing & Studio, Governança & QA, Fábrica & Templates) com scores e evidências auditáveis. |
| `/biblioteca` | `GenericPageView.tsx` | Acervo de 187 páginas e referências atômicas do Vault distribuídas em 9 domínios ativos com 100% de sincronização. |
| `/analytics` | `GenericPageView.tsx` | Telemetria de custos por modelo de IA (Claude Sonnet 53%, Opus 27%, GPT-4o 15%, DALL-E 3 5%), evolução diária nos últimos 14 dias e reconciliação financeira em BRL. |
| `/skills` | `GenericPageView.tsx` | Catálogo operacional de habilidades com descrição técnica, arquivos de origem e os 57 agentes cobertos. |
| `/integracoes` | `IntegracoesView.tsx` | Grupos estruturados, teste de health check em tempo real medindo latência em ms, gestão de serviços locais e logs. |
| `/agentes` & `/org-chart` | `AgentesView.tsx` / `GenericPageView.tsx` | Tabela dos 57 agentes com status dots, setor, modelo, custos e editor de alma operacional; Org Chart agrupado por setor. |
| `/mapa` | `Mapa.tsx` | Editor visual do escritório com lazy-loading de PixiJS 8, fallback acessível e ponto de conexão D6 para Habblaud. |
| `/login` | `Login.tsx` | Autenticação local em loopback com sessão armazenada em localStorage (expiração 24h). |
| `/onboarding` | `Onboarding.tsx` | Tour em 5 etapas explicando arquitetura, agentes e jobs, com tracking local. |
| `/design-system` | `DesignSystem.tsx` | Showcase interativo demonstrando todos os 14 componentes atômicos e paleta de cores completa. |

## Evidências de Testes & Validação
1. **Frontend Production Build**:
   - Comando: `npm run build` na pasta `frontend/`
   - Resultado: Sucesso (exit code 0), 797 módulos transformados, 0 erros TypeScript, chunks lazy-loaded particionados.
2. **Backend Unit & Integration Tests**:
   - Comando: `python -m pytest tests/ -v` na pasta `backend/`
   - Resultado: 30 passed (100% de sucesso). Inclui suíte completa de visibilidade, conhecimento, workflows, doctor e analytics.
3. **Visual QA via Browser Subagent**:
   - Gravação de sessão em vídeo (.webp) e screenshots das telas da Fase 5:
     - `cerebro_view`: 187 páginas indexadas no Vault e grafo operacional.
     - `article_modal`: leitura do artigo de Ancoragem com citação de Daniel Kahneman (*Thinking Fast and Slow*).
     - `workflows_view`: 6 processos de negócio canônicos com etapas e gates humanos.
     - `doctor_view`: radar de saúde nas 6 dimensões com score de 89% e telemetria SQLite.
     - `biblioteca_view`: catálogo do Vault em 9 domínios ativos.
     - `analytics_view`: telemetria de custos por modelo e evolução diária nos últimos 14 dias.
     - `skills_view`: catálogo de habilidades cobrindo os 57 agentes.