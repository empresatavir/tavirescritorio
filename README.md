# TAVIR Escritório

Painel operacional local single-user para orquestração de agentes de IA, jobs, tarefas e conteúdo editorial.

## Requisitos

- **Node.js:** 24 LTS (para build do frontend)
- **Python:** 3.12+ (para backend FastAPI)
- **SQLite:** 3.x (embutido no Python)

## Estrutura

```
frontend/       # SolidJS + Vite (SPA)
backend/        # FastAPI (loopback only)
db/migrations/  # Migrações SQLite versionadas
tests/          # unit/, contract/, integration/, e2e/
docs/           # modules/, adr/, planning/
```

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para detalhes completos.

## Desenvolvimento

Instruções detalhadas serão adicionadas no Goal 2 (scaffold).

## Planejamento

Decisões técnicas e checkpoint de retomada em `docs/planning/`.