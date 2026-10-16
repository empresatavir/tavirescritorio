# TAVIR Escritório — Arquitetura

## Visão Geral
Painel operacional local single-user para orquestração de agentes de IA, jobs, tarefas e conteúdo editorial. Opera offline-first em `127.0.0.1`.

## Stack
- **Frontend:** SolidJS + Vite (SPA) + TypeScript
- **Backend:** Python + FastAPI (loopback only)
- **Dados:** SQLite local com migrações versionadas
- **Mapa:** PixiJS 8 (lazy-loaded)
- **Design System:** Tokens CSS próprios (Instrument Sans + IBM Plex Mono)

## Regra de Dependência
```
UI → Cliente Tipado → Endpoints API → Serviço → Interface Repositório → Adapter Concreto
```
- Rotas não consultam SQLite diretamente.
- Domínios não importam implementação interna de outros domínios; integram via serviço/contrato ou evento.

## Mapa de Domínios

| Domínio | Responsabilidade | Módulos Backend | Telas Frontend |
|---------|-----------------|-----------------|----------------|
| Operação | Jobs, tasks, aprovações, bloqueios | `jobs`, `tasks`, `approvals` | Execuções, Tasks, Aprovações, Bloqueios, Sala de Operação |
| Agentes | Roster, skills, chat | `agents`, `chat` | Agentes, Chat, Org Chart, Skills |
| Fábrica | Templates de engenharia, projetos | `factory`, `projects` | Fábrica, Projetos |
| Studio | Perfis, peças, esteira editorial | `studio`, `content` | Studio, Content, Personas |
| Comercial | Funnel, finanças, propostas | `commercial`, `proposals` | Funnel, Finances, Propostas |
| Conhecimento | Vault, memória, artefatos | `knowledge`, `memory` | Cérebro, Memória, Dados, Ideias |
| Visibilidade | Analytics, doctor, integrações | `analytics`, `integrations` | Analytics, Doctor, Integrações |
| Social | Workflows, plataformas | `workflows`, `social` | Workflows, Social, Plataformas, Comunicações, Biblioteca |
| Mapa | Visualização pixel-art | `map` | Mapa, Mission Control, Roadmap |
| Sistema | Auth, config, health | `system` | Login, Onboarding, Design System, Reference |

## Estrutura de Pastas
```
frontend/
  src/app/          # Shell, rotas, sessão, tema
  src/features/     # Views e componentes por domínio
  src/shared/       # Design system, API client, tipos, utilitários
  src/map/          # Carregamento dinâmico do Mapa (PixiJS)
backend/
  app/main.py       # Composição da aplicação
  app/api/v1/       # Roteadores HTTP por domínio
  app/modules/      # Schemas, service, repository, policies
  app/adapters/     # SQLite, Supabase, filesystem, agents
  app/shared/       # Config, erros, auth local, logging, eventos
db/migrations/      # Migrações SQL versionadas
tests/              # unit/, contract/, integration/, e2e/
docs/               # modules/, adr/, planning/
```

## IDs Canônicos
`project_id`, `task_id`, `job_id`, `workflow_id`, `stage_run_id`, `agent_id`, `approval_id`, `artifact_id`, `profile_id`, `piece_id`, `external_ref`.

## Decisões Técnicas
Ver [docs/planning/DECISOES.md](docs/planning/DECISOES.md) e ADRs em `docs/adr/`.