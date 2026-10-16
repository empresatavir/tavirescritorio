# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G10
- Status: concluído
- Último passo concluído: Bateria completa de testes executada (8 passed); migrações Alembic forward/backward verificadas (downgrade base + upgrade head); frontend build validado (zero erros, PixiJS code-split); todos os seeds idempotentes re-executados após round-trip de migração (2 agents, 1 project, 1 task, 6 templates, 2 personas, 2 profiles, 1 piece, 3 workflows, 1 idea, 2 integration checks, 2 knowledge entries); ARCHITECTURE.md e README.md atualizados; projeto completo G0-G10.
- Commit mais recente: 64c4fc2 (G10 pendente de commit)

## Critérios do goal atual (G10)
- [x] Todos os testes passam (8 passed, 2 warnings não-críticas de event loop Windows)
- [x] Migrações Alembic reversíveis (downgrade base → upgrade head sem erro)
- [x] Frontend build compila sem erros (PixiJS code-split em chunks separados)
- [x] Seeds idempotentes funcionam após round-trip de migração
- [x] Offline-first confirmado (zero CDN, fontes locais, SQLite local)
- [x] Workflows ≠ templates Fábrica (D3 respeitado em todo o ciclo)
- [x] Adapter interface + mock para contratos externos (D5)
- [x] Habblaud ponto de conexão reservado sem implementação (D6)
- [x] Login local com sessão loopback e expiração 24h
- [x] Onboarding tour com marcação localStorage
- [x] Design System showcase com todos os tokens e estados

## Arquivos alterados neste goal
- docs/planning/CHECKPOINT-TAVIR.md (atualizado — G10 final)

## Comandos e resultados
- `pytest tests/ -v`: 8 passed, 2 warnings (Windows ProactorEventLoop cleanup — não-crítico)
- `alembic downgrade base`: OK (4 migrações revertidas)
- `alembic upgrade head`: OK (4 migrações reaplicadas)
- `npm run build`: exit code 0, built in ~1s, zero erros
- Seeds: todos os 4 scripts executados com sucesso após round-trip

## Resumo do Projeto Completo (G0-G10)
### Goals Concluídos
- G0: Decisões pendentes e baseline documental
- G1: Fundação do repositório e estrutura de pastas
- G2: Scaffold frontend/backend, health endpoint, Design System
- G3: SQLite, migrações e modelos fundamentais
- G4: Worker isolado e ciclo de job mínimo
- G5: Fatia vertical operação (Execuções, Tasks, Aprovações)
- G6: Fábrica e templates de engenharia
- G7: Studio, comercial e personas
- G8: Visibilidade, conhecimento, workflows e integrações
- G9: Mapa, login, design system showcase e onboarding
- G10: Hardening, regressão e aceite final

### Stack Final
- Frontend: SolidJS + Vite + TypeScript + PixiJS (lazy)
- Backend: FastAPI + SQLAlchemy async + aiosqlite
- Dados: SQLite local com Alembic migrations
- Fontes: Instrument Sans + IBM Plex Mono (self-hosted woff2/ttf)
- Design System: Tokens CSS completos, tema light híbrido

### Commits
- 5c91235: G0 baseline
- G1-G7: commits intermediários
- bac4220: G8 visibilidade & conhecimento
- 64c4fc2: G9 mapa, login, design system, onboarding
- (pendente): G10 hardening final

## Próximo goal autorizado
- Nenhum — projeto completo G0-G10