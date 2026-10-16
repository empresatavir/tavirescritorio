# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G8
- Status: concluído
- Último passo concluído: Modelos Workflow, Idea, IntegrationCheck, KnowledgeEntry criados; migração Alembic add_g8_visibility_knowledge_models aplicada (4 tabelas); repositórios assíncronos com busca textual em KnowledgeEntry; endpoints GET/POST /api/v1/{workflows,ideas,integrations,knowledge} funcionais e validados via curl; seed idempotente executado (3 workflows, 1 idea, 2 integration checks, 2 knowledge entries); tela Visibilidade.tsx com abas Workflows/Ideias/Integrações/Conhecimento conectada aos endpoints reais; rota /visibilidade conectada no App.tsx; build frontend compila sem erros (77.83 kB JS, 2.75 kB CSS); working tree pronto para commit.
- Commit mais recente: 17cc7a6 (G8 pendente de commit)

## Critérios do goal atual (G8)
- [x] Modelos Workflow, Idea, IntegrationCheck, KnowledgeEntry criados
- [x] Migração Alembic add_g8_visibility_knowledge_models aplicada (4 tabelas)
- [x] Repositórios assíncronos WorkflowRepository, IdeaRepository, IntegrationCheckRepository, KnowledgeEntryRepository
- [x] KnowledgeEntry.search(q) com ilike funcional
- [x] Endpoints GET/POST /api/v1/{workflows,ideas} e GET /api/v1/{integrations,knowledge} funcionais
- [x] Seed idempotente: 3 workflows, 1 idea, 2 integration checks, 2 knowledge entries
- [x] Tela Visibilidade.tsx com 4 abas conectada aos endpoints reais
- [x] Rota /visibilidade conectada ao componente Visibilidade no App.tsx
- [x] Build frontend compila sem erros (77.83 kB JS, 2.75 kB CSS)
- [x] Workflows ≠ templates Fábrica (catálogos separados, D3 respeitado)
- [x] Campo metadata renomeado para extra_metadata com mapped_column("metadata") para evitar SAWarning

## Arquivos alterados neste goal
- backend/app/models/workflow.py (adicionado)
- backend/app/models/idea.py (adicionado)
- backend/app/models/integration_check.py (adicionado)
- backend/app/models/knowledge_entry.py (adicionado)
- backend/app/models/__init__.py (modificado — Workflow, Idea, IntegrationCheck, KnowledgeEntry registrados)
- backend/app/modules/visibility/__init__.py (adicionado)
- backend/app/modules/visibility/repository.py (adicionado)
- backend/app/api/v1/visibility.py (adicionado)
- backend/app/shared/seed_visibility.py (adicionado)
- backend/app/main.py (modificado — visibility router registrado)
- backend/migrations/versions/df732ab59552_add_g8_visibility_knowledge_models.py (adicionado)
- frontend/src/features/visibilidade/Visibilidade.tsx (adicionado)
- frontend/src/App.tsx (modificado — import e rota /visibilidade)
- docs/planning/CHECKPOINT-TAVIR.md (atualizado)

## Comandos e resultados
- `npm run build`: exit code 0, 39 modules, 77.83 kB JS, 2.75 kB CSS
- `curl /api/v1/workflows`: 3 workflows retornados
- `curl /api/v1/ideas`: 1 idea retornada
- `curl /api/v1/integrations`: 2 integration checks retornados
- `curl /api/v1/knowledge`: 2 knowledge entries retornados
- `curl /api/v1/knowledge?q=job`: 1 resultado (busca textual)

## Decisões tomadas
- D3: Workflows (negócio) separados dos templates Fábrica (engenharia) — catálogos independentes
- SAWarning 'metadata': campo renomeado para extra_metadata com mapped_column("metadata", JSON)

## Próximo goal autorizado
- G9: Mapa, Social, Utilitárias e Integrações Finais