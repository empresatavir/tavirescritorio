# Raio-X — baseline dos testes (T0.1)

Medido em 2026-11-09, na `master` (`dae5798`), antes desta branch.
Estes resultados já falhavam. Este GOAL não corrige nenhum deles.

Reexecução depois do CP-0, já na branch `Raio-x`, com a árvore ainda suja por outro trabalho: `npm run typecheck` exit 0 e `npm test` exit 0 (169 passaram). A lista abaixo continua sendo a baseline deste GOAL.

## Comandos

| Comando | Resultado |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 1 — 10 falharam, 154 passaram (164); 5 arquivos falharam, 21 passaram |
| `npm run build` | exit 0 |

## Testes que já falhavam

1. `tests/backend.spec.ts` — deve carregar o banco de dados com estado de sessão e listas iniciais (`approvals.length` esperado > 0, obtido 0)
2. `tests/backend.spec.ts` — deve persistir alterações no estado do banco de dados (`jobEncontrado` undefined; SQLite `NOT NULL constraint failed: tasks.priority` em `salvarDb`)
3. `tests/backend.spec.ts` — deve expor os 4 motores e permitir alternância de motor padrão (`settings.anthropicEnabled` false, esperado true)
4. `tests/backend.spec.ts` — deve indexar os arquivos de markdown de conhecimento e escopo (timeout 5000 ms)
5. `tests/unit/fabricaFluxo.spec.ts` — commita só o que a execução mudou e deixa de fora o trabalho do Carlos (timeout 5000 ms)
6. `tests/unit/fabricaFluxo.spec.ts` — registra remoção de arquivo (timeout 5000 ms)
7. `tests/unit/runLedger.spec.ts` — grava pedido, saída bruta, transcrição, métricas e o diff real do disco (timeout 5000 ms)
8. `tests/unit/seg.spec.ts` — reprova, mascara, marca corrigido e respeita o risco aceito (timeout 60000 ms)
9. `tests/unit/studio.motionAuthor.spec.ts` — não aprova pela resposta do motor e só copia no gate (timeout 5000 ms)
10. `tests/unit/studio.motionAuthor.spec.ts` — deixa reprovado quando a checagem falha, mesmo se o motor disser aprovado (timeout 5000 ms)
