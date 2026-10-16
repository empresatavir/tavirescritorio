# Decisões Pendentes — TAVIR Escritório

**Data:** 2026-10-15
**Status:** Resolvidas para Goal 0

| # | Decisão | Resposta | Impacto |
|---|---------|----------|---------|
| D1 | Rota 41 | Aceitar 40 rotas; adições futuras tratadas como incremento | Inventário congelado em 40; G2 não bloqueado |
| D2 | SolidStart vs SPA | SolidJS SPA (Vite + solid-router) | Sem camada SSR; backend FastAPI serve assets estáticos |
| D3 | Workflows vs Fábrica | Catálogos separados | Workflows = 6 processos de negócio; Fábrica = 6 templates de engenharia; sem composição automática |
| D4 | Persona vs Perfil Studio | Entidades separadas com FK | Schema tem `personas` e `profiles` com relacionamento explícito |
| D5 | Contratos externos | Adapter interface + mock até contrato real | Módulos Comercial/Integrações usam interface abstrata; selo "sem contrato" visível |
| D6 | Mapa ↔ Habblaud | Evento/interface sem implementação | Ponto de conexão desacoplado; integração será feita pelo usuário |
| D7 | Fontes | Baixar e commitar Instrument Sans + IBM Plex Mono (OFL) | Fontes self-hosted em `frontend/src/shared/fonts/`; offline-first garantido |
| D8 | Orquestrador | Validar piloto primeiro no G4 | G4 usa worker simples; LangGraph/Deep Agents avaliado após evidência |
| D9 | Checkpoint | `docs/planning/CHECKPOINT-TAVIR.md` | Caminho confirmado para retomada de sessão |
| D10 | Skills prioritárias | Instalar antes do G2: `reference-fidelity-frontend`, `frontend-visual-and-qa-skills`, `Engenheiro de Web Design`, `UI Design Pro` | Fidelidade visual absoluta ao Design System |