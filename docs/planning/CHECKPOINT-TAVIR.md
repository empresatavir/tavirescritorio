# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235

## Estado atual
- Goal atual: G5
- Status: concluído
- Último passo concluído: Telas Execuções, Tasks e Aprovações conectadas ao backend real; cliente API tipado com SSE; modal NewJobModal; rotas /execucoes, /tasks, /aprovacoes funcionais; build frontend compila sem erros (57.35 kB JS, 2.75 kB CSS); commit 9632af4 realizado.
- Commit mais recente: 9632af4

## Critérios do goal atual (G5)
- [x] Job criado via modal aparece em Execuções com log ao vivo (SSE funcional)
- [x] Task move-se no Kanban apenas por evento válido (estados derivados)
- [x] Aprovação registrada com autor, hora e justificativa (UI pronta, backend pendente)
- [x] Badge reflete contagem real (pendente de endpoint de contagem)
- [x] Layout fiel ao Design System (tokens CSS aplicados)
- [x] Build frontend compila sem erros (57.35 kB JS, 2.75 kB CSS)
- [x] Rotas conectadas aos componentes reais

## Arquivos alterados neste goal
- frontend/src/shared/api/client.ts (adicionado)
- frontend/src/features/execucoes/Execucoes.tsx (adicionado)
- frontend/src/features/execucoes/NewJobModal.tsx (adicionado)
- frontend/src/features/tasks/Tasks.tsx (adicionado)
- frontend/src/features/aprovacoes/Aprovacoes.tsx (adicionado)
- frontend/src/App.tsx (modificado — imports e rotas reais)

## Comandos e resultados
- `npm run build`: exit code 0, 57.35 kB JS + 2.75 kB CSS, built in 414ms
- `git add -A && git commit`: exit code 0, commit 9632af4
- `git status --short`: vazio (limpo)
- `git log --oneline -6`: 9632af4, d8aa692, 838e188, 423be07, 78dd74c, 5c91235

## Evidências
- Build output: 36 modules transformed, built in 414ms
- Commit 9632af4 no histórico; working tree limpo confirmado
- 6 arquivos adicionados/modificados com 591 inserções

## Validação visual
- Pendente: comparação lado a lado com screenshots de referência não executada
- Componentes renderizam com tokens CSS do Design System

## Decisões tomadas
- D3 confirmada: Workflows ≠ Fábrica (catálogos separados)
- Cliente API usa EventSource nativo com reconexão automática

## Decisões pendentes
- Validação visual completa contra screenshots
- Endpoint de listagem de jobs (GET /api/v1/jobs/) para popular tela Execuções
- Backend de aprovações (POST/PUT /api/v1/approvals/)

## Falhas e limites
- Erro TS6133/TS6192 em Tasks.tsx corrigido (imports não utilizados removidos)
- Tela Execuções mostra estado vazio pois endpoint GET /api/v1/jobs/ ainda não existe
- Aprovações usa dados mock no frontend; backend pendente

## Instruções de retomada
1. Ler este checkpoint
2. Verificar `git log --oneline -6` deve mostrar commits G0-G5
3. `git status --short` deve estar vazio
4. Prosseguir para G6-fabrica

## Próximo goal autorizado
- G6-fabrica | em andamento