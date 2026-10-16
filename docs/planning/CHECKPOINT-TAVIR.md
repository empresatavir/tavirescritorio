# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G3
- Status: concluído
- Último passo concluído: Schema SQLite criado via Alembic; modelos Agent/Project/Task/Job/Approval/Artifact/Event; repositórios assíncronos; seed idempotente executado; endpoints GET /api/v1/agents e /api/v1/projects funcionais; pytest.ini configurado; 5/5 testes passando (unit + integration).
- Commit mais recente: pendente (aguardando commit do G3)

## Critérios do goal atual (G3)
- [x] Migração aplica sem erro; PRAGMA table_info confirma colunas
- [x] Seed cria dados verificáveis (2 agents, 1 project, 1 task)
- [x] GET /api/v1/agents retorna lista com ≥2 agentes
- [x] GET /api/v1/projects retorna lista com ≥1 projeto
- [x] Testes unitários passam (exit code 0) — 3/3
- [x] Teste de integração passa — 2/2
- [x] pytest.ini configurado com asyncio_mode=auto

## Arquivos alterados neste goal
- backend/alembic.ini (adicionado)
- backend/migrations/env.py (adicionado)
- backend/migrations/versions/b32e31c484df_initial_schema.py (adicionado)
- backend/app/shared/database.py (adicionado)
- backend/app/shared/seed.py (adicionado)
- backend/app/models/__init__.py (adicionado)
- backend/app/models/agent.py (adicionado)
- backend/app/models/project.py (adicionado)
- backend/app/models/task.py (adicionado)
- backend/app/models/job.py (adicionado)
- backend/app/models/approval.py (adicionado)
- backend/app/models/artifact.py (adicionado)
- backend/app/models/event.py (adicionado)
- backend/app/modules/agents/repository.py (adicionado)
- backend/app/modules/projects/repository.py (adicionado)
- backend/app/modules/tasks/repository.py (adicionado)
- backend/app/api/v1/schemas.py (adicionado)
- backend/app/api/v1/agents.py (adicionado)
- backend/app/api/v1/projects.py (adicionado)
- backend/app/main.py (modificado — routers registrados)
- backend/requirements.txt (modificado — sqlalchemy, aiosqlite, alembic)
- backend/pytest.ini (adicionado)
- backend/tests/unit/test_repositories.py (adicionado)
- backend/tests/integration/test_migrations.py (adicionado)
- backend/tavir.db (gerado — não versionado)

## Comandos e resultados
- `python -m alembic revision --autogenerate -m "initial_schema"`: exit code 0, 7 tabelas detectadas
- `python -m alembic upgrade head`: exit code 0, migração b32e31c484df aplicada
- `python -m app.shared.seed`: exit code 0, 2 agents + 1 project + 1 task
- `curl http://127.0.0.1:8000/api/v1/agents/`: 2 agentes retornados
- `curl http://127.0.0.1:8000/api/v1/projects/`: 1 projeto retornado
- `python -m pytest tests/ -v`: 5 passed in 0.58s

## Evidências
- 7 tabelas SQLite confirmadas: agents, approvals, artifacts, events, jobs, projects, tasks
- API agents: [{"name":"Atlas","role":"Engenheiro de Software"},{"name":"Luna","role":"Designer de Produto"}]
- API projects: [{"slug":"tavir-escritorio","name":"TAVIR Escritório"}]
- pytest output: 5 passed (2 integration + 3 unit)

## Validação visual
- N/A (goal de backend/dados)

## Decisões tomadas
- D8 confirmada: piloto simples primeiro (sem LangGraph neste goal)
- Ferramenta de migração: Alembic com SQLAlchemy async + aiosqlite

## Decisões pendentes
- Nenhuma para G3

## Falhas e limites
- Erro pytest-asyncio AssertionError corrigido com pytest.ini (asyncio_mode=auto)
- tavir.db não versionado (.gitignore já cobre *.db)

## Instruções de retomada
1. Ler este checkpoint
2. Verificar `git log --oneline -4` deve mostrar commits G0, G1, G2 e G3
3. `git status --short` deve estar vazio após commit
4. Prosseguir para G4-worker-job-cycle

## Próximo goal autorizado
- G4-worker-job-cycle | aguardando autorização