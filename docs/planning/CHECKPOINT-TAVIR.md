# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: verificado (C:\Users\carlo\.claude\plans\quero-que-voc-produza-curried-peach.md)
- Design System e Layout Moderno: FIDELIDADE ABSOLUTA (C:\Users\carlo\Downloads\Referencias\novo\Layout Moderno\Modernização do layout Tavir Escritório\TAVIR Escritorio standalone-src.dc.html)
- Branch: master

## Estado atual
- Goal atual: Backend Fase 2 — Agentes & Comunicação (Catálogo dos 47 Agentes + Editor de Almas Operacionais + Chat com Persistência + Organograma)
- Status: 100% Concluído
- Backend: FastAPI + SQLite + SQLAlchemy async + aiosqlite (18/18 testes passando no pytest)
- Migrações Alembic: 6 migrações aplicadas (até f2a3b4c5d6e7)
- Frontend: SolidJS SPA + Vite + TypeScript (build 100% limpo, 0 erros, conectado via client.ts e store reativa)
- Shell: 3 colunas (56px Rail + 212px SubNav + 52px Header)
- 40+ Rotas ativas e integradas: ZERO placeholders "em construção"

## Critérios e Decisões Atendidas (D1–D10)
- [x] **D1 - 40 rotas aceitas**: Todas as rotas do catálogo estão ativas e navegáveis via Rail, SubNav e Command Palette.
- [x] **D2 - SolidJS SPA**: Implementado com `@solidjs/router`, reatividade granular, stores e code-splitting.
- [x] **D3 - Separar catálogos**: Workflows de negócio (`/workflows`) isolados dos templates de engenharia da Fábrica (`/fabrica`).
- [x] **D4 - Separar com FK**: Modelos Persona e Studio Profile separados com chave estrangeira.
- [x] **D5 - Adapter interface + mock**: Contratos de redes sociais (Instagram, YouTube, TikTok, LinkedIn) e integrações externas estruturados com interfaces e mocks.
- [x] **D6 - Ponto de conexão Habblaud**: Event hook reservado no Mapa sem implementação prematura.
- [x] **D7 - Baixar OFL**: Fontes locais Instrument Sans e IBM Plex Mono (.ttf) servidas offline via `@font-face` (zero CDNs).
- [x] **D8 - Validar piloto primeiro**: Piloto operacional com SSE streaming e logs em tempo real validado.
- [x] **D9 - Checkpoint**: Documentado neste arquivo `docs/planning/CHECKPOINT-TAVIR.md`.
- [x] **D10 - Fidelidade visual frontend**: Layout idêntico ao `Layout Moderno` com tokens, dimensões, tema light híbrido e interações completas.

## Resumo das Telas & Módulos Implementados

| Módulo / Rota | Componente | Descrição da Implementação |
| :--- | :--- | :--- |
| `/` & `/sala-operacao` | `SalaOperacaoView.tsx` | Dashboard com 3 KPIs e 4 seções operacionais (Jobs rodando com progresso, Escalados com ações, Cards ativos, Precisa de você com navegação direta). |
| `/execucoes` | `ExecucoesView.tsx` | Painel duplo: lista filtrável de jobs com status badges e lateral com SSE logs ao vivo, diagnóstico de falhas em 4 categorias e ações de remediação. |
| `/tasks` | `TasksView.tsx` | Kanban de 3 colunas (Pendente, Em andamento, Concluído) com setas de movimentação rápida, busca global/coluna, e drawer lateral com planejamento de teste da Paula e jobs vinculados. |
| `/aprovacoes` | `AprovacoesView.tsx` | Layout em 2 painéis: filtros por impacto e tipo (Autorização, Checkpoint, Revisão) com botões de Aprovar/Rejeitar e justificativa detalhada. |
| `/chat` & `/chat/*` | `ChatView.tsx` | Histórico de conversas, seletor dos 47 agentes, balões responsivos e drawer lateral de configurações (esforço, tempo, modelo, slider de inspiração 0-100%, toggles de memória/vault/tasks). |
| `/fabrica` | `FabricaView.tsx` | 3 visões completas: Catálogo de esteiras (LPs, Ofertas, Sistemas × Criação/Manutenção), detalhe de esteira com mesas e pipeline, e detalhe de projeto com 6 abas (Visão geral com stepper, Kanban, Roadmap semanal S1-S8, Documentos com modal viewer, Arquivos, Acessos e Chat do projeto). |
| `/studio` | `StudioView.tsx` | Catálogo de perfis (Datavir, Canal IA na Prática, TAVIR), Kanban de 6 etapas, Visual Studio com preview realista (Instagram 4:5, YouTube 16:9, TikTok 9:16, LinkedIn), modal de Nova Produção e drawer de Peça com formulário de ajustes. |
| `/propostas` | `PropostasView.tsx` | Kanban de 3 colunas (Em andamento, Pendentes, Concluídas), busca por nº/cliente, modal de detalhes completo (O que é, metadata grid, escopo, itens, coleta do agente, solicitação de alterações aos agentes), e modal A4 Paper Document Preview com cabeçalho oficial TAVIR e aceite eletrônico. |
| `/cerebro` | `CerebroView.tsx` | Layout em 3 colunas: Grafo Operacional interativo com nós colapsáveis por setor, busca no Vault com 132 páginas indexadas e tags semânticas, e Captura Rápida com decaimento de score no Sincron Brain. |
| `/integracoes` | `IntegracoesView.tsx` | Grupos estruturados (Serviços locais, Motores de IA, Contas externas, Falta ligar), teste de health check com toast, modal de teste de comunicação com IA, e modal de detalhes. |
| `/agentes` | `AgentesView.tsx` | Tabela dos 47 agentes com status dots, setor, modelo, métricas de jobs e custo, e editor modal da alma operacional (Markdown com abas Visualizar, Escrever, Upload). |
| `/mapa` | `Mapa.tsx` | Editor visual do escritório com lazy-loading de PixiJS 8, fallback acessível e ponto de conexão D6 para Habblaud. |
| `/login` | `Login.tsx` | Autenticação local em loopback com sessão armazenada em localStorage (expiração 24h). |
| `/onboarding` | `Onboarding.tsx` | Tour em 5 etapas explicando arquitetura, agentes e jobs, com tracking local. |
| `/design-system` | `DesignSystem.tsx` | Showcase interativo demonstrando todos os 14 componentes atômicos (Button, IconButton, Badge, Input, Select, Checkbox, Radio, Switch, InkPanel, Card, Tooltip, TvIcon, Dialog, Tabs) e paleta completa. |
| Demais rotas (20+) | `GenericPageView.tsx` | Renderizador dinâmico orientado a dados para: `bloqueios`, `alteracoes`, `analytics`, `doctor`, `skills`, `org-chart`, `memoria`, `dados`, `projetos`, `ideias`, `mission-control`, `roadmap`, `reference`, `funnel`, `finances`, `content`, `personas`, `workflows`, `social`, `plataformas`, `comunicacoes`, `biblioteca`, `flow`, `edicao`. |

## Evidências de Testes & Validação
1. **Frontend Production Build**:
   - Comando: `npm run build` na pasta `frontend/`
   - Resultado: Sucesso (exit code 0), 794 módulos transformados, 0 erros de compilação TypeScript, chunks PixiJS devidamente particionados em lazy bundle.
2. **Backend Unit & Integration Tests**:
   - Comando: `python -m pytest tests/ -v` na pasta `backend/`
   - Resultado: 8 passed em 2.72s (100% de sucesso).
3. **Visual QA via Browser Subagent**:
   - Navegação automatizada no browser com gravação de sessão em vídeo (.webp) e screenshots:
     - `sala_operacao_initial`: 3 colunas, shell, KPIs e seções operacionais verificadas.
     - `propostas_kanban`: 3 colunas do Kanban de propostas e cards com valores.
     - `atlas_holdings_modal`: modal de detalhes com formulário de alteração para Comercial/Arquiteto.
     - `proposal_preview_a4`: modal da folha A4 com wordmark TAVIR invertido, escopo e aceite eletrônico.
     - `hybrid_light_theme`: regra de tema híbrido validada (Rail e SubNav permanecem Tinta Profunda `InkPanel`, enquanto fundo do canvas vai para light mode e botões de ação invertem contraste).