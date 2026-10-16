# CHECKPOINT-TAVIR
## Baseline
- Doc escopo hash: pendente
- Doc detalhamento hash: pendente
- Design System hash: pendente
- Branch inicial: master
- Commit inicial: 5c91235
## Estado atual
- Goal atual: G4
- Status: concluído
- Último passo concluído: Job runner com máquina de estados, workspace isolado, eventos imutáveis, allowlist, timeout; endpoints POST /api/v1/jobs, GET /api/v1/jobs/{id}, GET /api/v1/jobs/{id}/events (SSE); testes de integração 3/3 passando (success, allowlist rejection, timeout).
- Commit mais recente: pendente (aguardando commit do G4)
## Critérios do goal atual (G4)
- [x] POST cria job e retorna job_id
- [x] Job transiciona para succeeded com artefato verificável (output.txt)
- [x] SSE endpoint implementado com cursor/reconexão
- [x] Comando fora da allowlist é rejeitado no preflight
- [x] Timeout mata job e registra failed
- [x] Teste de integração passa com evidência (3/3 passed in 2.73s)
## Arquivos alterados neste goal
- backend/app/modules/jobs/__init__.py (adicionado)
- backend/app/modules/jobs/runner.py (adicionado)
- backend/app/modules/jobs/repository.py (adicionado)
- backend/app/api/v1/jobs.py (adicionado)
- backend/app/main.py (modificado — jobs router registrado)
- backend/tests/integration/test_job_cycle.py (adicionado)
## Comandos e resultados
- `python -m pytest tests/integration/test_job_cycle.py -v`: 3 passed in 2.73s
- Warnings de ResourceWarning/Event loop closed são benignos (Windows ProactorEventLoop cleanup) e não afetam funcionalidade
## Evidências
- test_job_succeeds_with_echo: PASSED — job cria artefato output.txt com conteúdo "hello-tavir", eventos em ordem (queued→preflight→running→succeeded)
- test_job_fails_on_disallowed_command: PASSED — "rm -rf /" rejeitado no preflight com "not in allowlist"
- test_job_fails_on_timeout: PASSED — sleep(60) com timeout=2s resulta em failed com "Timeout"
## Validação visual
- N/A (goal de backend/worker)
## Decisões tomadas
- D8 confirmada: piloto simples primeiro (JobRunner direto, sem LangGraph)
- Allowlist inicial: echo, cat, ls, python
- Workspace isolado por job em backend/workspaces/<uuid>/
## Decisões pendentes
- Nenhuma para G4
## Falhas e limites
- ResourceWarning no Windows durante teardown de subprocessos assíncronos — benigno, não afeta testes
- SSE endpoint usa polling de 1s (adequado para piloto; otimização futura com asyncio.Queue)
## Instruções de retomada
1. Ler este checkpoint
2. Verificar `git log --oneline -5` deve mostrar commits G0-G4
3. `git status --short` deve estar vazio após commit
4. Prosseguir para G5-operacao-vertical
## Próximo goal autorizado
- G5-operacao-vertical | aguardando autorização