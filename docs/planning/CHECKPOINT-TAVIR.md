# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G6
- Status: concluído
- Último passo concluído: Modelo EngineeringTemplate criado; migração aplicada; repositório e endpoints GET/POST /api/v1/factory/templates funcionais; seed dos 6 templates executado; tela Fabrica.tsx com abas por categoria e pipeline de etapas; rota /fabrica conectada; build frontend compila (61.83 kB JS); commit 5ae7688 realizado.
- Commit mais recente: 5ae7688

## Critérios do goal atual (G6)
- [x] 6 templates renderizam com etapas corretas (LP/Oferta/Sistemas × Criação/Manutenção)
- [x] Endpoints GET/POST /api/v1/factory/templates funcionais e validados via curl
- [x] Seed idempotente dos 6 templates executado com sucesso
- [x] Tela Fabrica.tsx com abas por categoria, pipeline de etapas e badges de gate
- [x] Rota /fabrica conectada ao componente real no App.tsx
- [x] Build frontend compila sem erros (61.83 kB JS, 2.75 kB CSS)
- [x] Correção: TemplateResponse usa datetime para created_at/updated_at (erro 500 resolvido)

## Arquivos alterados neste goal
- backend/app/models/template.py (adicionado)
- backend/app/models/__init__.py (modificado — EngineeringTemplate registrado)
- backend/app/modules/factory/__init__.py (adicionado)
- backend/app/modules/factory/repository.py (adicionado)
- backend/app/api/v1/factory.py (adicionado)
- backend/app/shared/seed_factory.py (adicionado)
- backend/app/main.py (modificado — factory router registrado)
- backend/migrations/versions/597d2291795f_add_engineering_templates.py (adicionado)
- frontend/src/features/fabrica/Fabrica.tsx (adicionado)
- frontend/src/App.tsx (modificado — import e rota /fabrica)
- docs/planning/CHECKPOINT-TAVIR.md (atualizado)

## Comandos e resultados
- `python -m alembic revision --autogenerate -m "add_engineering_templates"`: exit code 0
- `python -m alembic upgrade head`: exit code 0, migração 597d2291795f aplicada
- `python -m app.shared.seed_factory`: Seeded 6 engineering templates
- `curl http://127.0.0.1:8000/api/v1/factory/templates/`: 6 templates retornados corretamente
- `npm run build`: exit code 0, 61.83 kB JS + 2.75 kB CSS
- `git add -A && git commit`: exit code 0, commit 5ae7688
- `git status --short`: vazio (limpo)

## Evidências
- 6 templates confirmados: LP Criação, LP Manutenção, Oferta Criação, Oferta Manutenção, Sistemas Criação, Sistemas Manutenção
- API retorna stages JSON com gates marcados corretamente
- Build output: 37 modules transformed, built in 428ms
- Commit 5ae7688 no histórico; working tree limpo confirmado

## Validação visual
- Pendente: comparação lado a lado com screenshots de referência da Fábrica
- Componentes renderizam com tokens CSS do Design System (abas, badges, pipeline)

## Decisões tomadas
- D3 confirmada: Workflows ≠ Fábrica (catálogos separados; templates são engenharia, workflows são negócio)
- Stages armazenados como JSON no SQLite (flexibilidade para evolução)
- Gate obrigatório marcado por campo booleano + badge visual 🔒

## Decisões pendentes
- Validação visual completa contra screenshots da Fábrica
- Integração Fábrica → Worker (criar job a partir de template/stage)
- Transição Criação → Manutenção com confirmação

## Falhas e limites
- Erro 500 ResponseValidationError corrigido: TemplateResponse.created_at/updated_at alterados de str para datetime
- Tela Fabrica ainda não integra criação de jobs via worker (pendente para G7/G8)
- Chat do projeto pré-carregado não implementado (depende de módulo Chat)

## Instruções de retomada
1. Ler este checkpoint
2. Verificar `git log --oneline -7` deve mostrar commits G0-G6
3. `git status --short` deve estar vazio
4. Prosseguir para G7-studio-comercial

## Próximo goal autorizado
- G7-studio-comercial | em andamento