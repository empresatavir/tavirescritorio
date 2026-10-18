# TAVIR Escritório — Arquitetura de Referência

## 1. Visão Geral
O **TAVIR Escritório** é o painel operacional local (*single-user*) da TAVIR para orquestração de **57 agentes de IA**, acompanhamento de jobs e execuções em tempo real via Server-Sent Events (SSE), esteiras da Fábrica, produção do Creative Studio, propostas comerciais e acervo do Vault (187 notas).

Opera com filosofia **Offline-First**, em loopback seguro (`127.0.0.1`), com fidelidade visual estrita ao **Design System TAVIR** (tema escuro e claro híbrido, tipografias Instrument Sans e IBM Plex Mono locais).

---

## 2. Stack Tecnológica
- **Frontend:** SolidJS SPA + Vite + TypeScript (executando na porta **9002**).
- **Backend:** Python 3.12 + FastAPI assíncrono (executando na porta **9001**).
- **Banco de Dados:** SQLite local (`backend/tavir.db`) com modo WAL (*Write-Ahead Logging*), integridade referencial ativa (`PRAGMA foreign_keys = ON`) e migrações versionadas (Alembic).
- **Streaming & Telemetria:** Server-Sent Events (SSE) para logs ao vivo e diagnóstico de jobs.
- **Model Gateway (Produto):** GhostCLI (`https://ghostcli.cloud/v1`) como gateway seguro para os agentes de chat.
- **Ambiente de Desenvolvimento:** Windows nativo com scripts batch padronizados em UTF-8/CRLF e agente padrão **Cline**.

---

## 3. Regra Canônica de Dependência
```
UI (SolidJS) → Cliente Tipado (client.ts) → Endpoints API (/api/v1) → Serviços de Domínio → Repositórios (SQLAlchemy Async) → SQLite (tavir.db)
```
- Componentes do frontend nunca acessam bancos diretamente; comunicam-se via HTTP/SSE através do cliente tipado.
- Domínios backend comunicam-se via serviços formais ou eventos imutáveis.
- Ações com impacto irreversível ou de publicação externa exigem aprovação humana obrigatória (*Human-in-the-Loop*).

---

## 4. Mapa dos Domínios Operacionais

| Domínio | Responsabilidade | Módulos Backend | Telas / Rotas Frontend |
| :--- | :--- | :--- | :--- |
| **Operação** | Jobs, Tarefas, Aprovações, Diagnóstico | `jobs`, `tasks`, `approvals`, `cockpit` | `/sala-operacao`, `/execucoes`, `/tasks`, `/aprovacoes` |
| **Agentes** | Catálogo dos 57 agentes, chat, org chart, skills | `agents`, `chat`, `skills` | `/agentes`, `/chat`, `/org-chart`, `/skills` |
| **Fábrica** | 6 templates de engenharia, projetos | `factory`, `projects` | `/fabrica`, `/projetos` |
| **Studio** | Perfis de marca, esteira de 6 etapas, peças | `studio`, `content` | `/studio`, `/content`, `/personas` |
| **Comercial** | Funil, finanças, propostas paper preview A4 | `commercial`, `proposals`, `finances` | `/funnel`, `/finances`, `/propostas` |
| **Cérebro** | Grafo operacional, 187 notas do Vault, ideias | `knowledge`, `memory`, `ideas` | `/cerebro`, `/biblioteca`, `/dados`, `/ideias` |
| **Visibilidade** | Analytics de modelos, Doctor 6D, Integrações | `analytics`, `doctor`, `visibility` | `/analytics`, `/doctor`, `/integracoes` |
| **Social** | 6 workflows canônicos, distribuição, canais | `workflows`, `social`, `platforms` | `/workflows`, `/social`, `/plataformas`, `/comunicacoes` |
| **Mapa** | Conexão de arquitetura com Habblaud Engine | `map` | `/mapa` (*Implementação Posterior*) |
| **Sistema** | Sessão loopback, tour guiado, Design System | `system`, `auth` | `/login`, `/onboarding`, `/design-system`, `/reference` |

---

## 5. Estrutura do Repositório
```
tavirescritorio/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Roteadores FastAPI por domínio
│   │   ├── modules/        # Schemas Pydantic, Services, Repositories
│   │   └── shared/         # Configurações, banco SQLite, seeds
│   ├── tests/              # 34 testes automatizados (unit + integration + hardening)
│   └── tavir.db            # Banco SQLite local
├── frontend/
│   ├── src/
│   │   ├── app/            # Shell canônico (56px Rail, 212px SubNav, 52px Header)
│   │   ├── features/       # Views funcionais com fidelidade ao Design System
│   │   ├── shared/         # Componentes atômicos (14 JSX), fontes locais, api client
│   │   └── state/          # Store reativa SolidJS
│   └── public/assets/      # Logos e ícones SVG higienizados (sem metadados C2PA)
├── db/
│   └── backups/            # Snapshots atômicos gerados por backup_escritorio.bat
├── scripts/
│   ├── backup_restore.py   # Utilitário SQLite Online Backup API
│   └── clean_svgs.py       # Higienizador de SVGs
├── docs/
│   ├── adr/                # Architectural Decision Records (ADR-001 a ADR-006)
│   └── planning/           # Checkpoints e planos de execução
└── *.bat                   # Scripts de operação Windows (CRLF + UTF-8)
```

---

## 6. Registros de Decisões de Arquitetura (ADRs)
- [ADR-001: Adoção do SolidJS SPA com Arquitetura Offline-First e Fontes Locais](docs/adr/ADR-001-solidjs-spa-offline-first.md)
- [ADR-002: Persistência Local em SQLite com WAL Mode, Integridade Relacional e Backups Online](docs/adr/ADR-002-sqlite-local-wal-migrations.md)
- [ADR-003: Desacoplamento do Habblaud Engine da Rota /mapa](docs/adr/ADR-003-desacoplamento-habblaud-mapa.md)
- [ADR-004: Separação Formal entre Templates da Fábrica e Workflows Canônicos de Negócio](docs/adr/ADR-004-separacao-templates-fabrica-workflows-negocio.md)
- [ADR-005: Governança de Portas Oficiais (9001/9002) e Execução Windows](docs/adr/ADR-005-portas-oficiais-e-processos-windows.md)
- [ADR-006: Papel do GhostCLI como Gateway do Chat e Cline como Agente de Desenvolvimento](docs/adr/ADR-006-gateway-ghostcli-e-cline-desenvolvimento.md)