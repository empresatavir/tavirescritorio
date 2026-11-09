# F0 — checkpoint

Data: 2026-11-08. Branch: `studio` (a partir de `master` `a645ae0`). Pedido desta execução: branch chamado `studio`. O documento pede `feat/studio`.

## O que foi feito

- `src/shared/studio.ts` — constantes e tipos da seção 4, tipos de linha da seção 6.2 e objetos da API (JSON já interpretado).
- `src/main/studio/paths.ts` — pasta de dados. Padrão D5: `%USERPROFILE%\TAVIR\Studio`. Override: argumento ou `TAVIR_STUDIO_HOME`.
- `src/main/studio/migrations.ts` + `store.ts` — `node:sqlite`, `journal_mode=WAL`, `schema_version`, CRUD. Gate e avanço de etapa só pelas regras. Status `aprovado` de kit ou job de motion é recusado aqui: isso é gate do CEO na F3.
- `src/main/studio/rules.ts` — `nextStage`, `prevStage`, `canAdvance`, `advance`, `applyGate`, `slotCode`, `validateTexts`.
- `src/main/studio/ipcHandlers.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts` — `window.tavir.studio` para perfis, redes, peças, gates, advance e preflight.
- `src/main/studio/preflight.ts` — Node ≥ 20, ffmpeg, ffprobe, pasta gravável. `studio-motion/node_modules` ausente é aviso, não erro.
- Testes: `tests/unit/studio.store.spec.ts`, `tests/unit/studio.rules.spec.ts`.

Commits:

- `6c5456d` feat(studio): F0.1 constantes e tipos do domínio
- `b21c846` feat(studio): F0.2 pasta de dados do Studio fora do git
- `2c8867f` feat(studio): F0.3 banco SQLite com migrations e CRUD
- `d4e8f03` feat(studio): F0.4 regras de etapa, gate, slot e texto
- `457553d` feat(studio): F0.5 IPC de perfis, redes, peças e gates
- `fd967c2` feat(studio): F0.6 preflight de node, ffmpeg e pasta de dados

O commit F0.3 importa `rules.ts`, que só entra no commit F0.4. A ponta do branch compila. Um checkout isolado de `2c8867f` não.

## Portão

- ✅ `npm run typecheck` — exit 0. Saída:

```
> tavir-escritorio@2.0.0 typecheck
> tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit
```

- ❌ `npm test` — exit 1. Repetido numa cópia limpa do commit `48d7839` (worktree, sem os arquivos locais sujos). 10 arquivos passaram, 1 falhou. Os testes do Studio passaram. As 3 falhas são de `tests/backend.spec.ts` e já estão no conteúdo commitado da master, que esta fase não alterou:
  - `carregarDb()` lê jobs de `backend/tavir.db`; a lista vem vazia, então `jobs.length > 0` falha.
  - O teste de persistência grava o job no JSON, mas a releitura volta ao SQLite e não acha o job.
  - `db/engine_settings.json` commitado tem `anthropicEnabled: false`.

Últimas linhas dessa execução limpa:

```
 FAIL  tests/backend.spec.ts > 3. Multi-Engine Hub > deve expor os 4 motores
 AssertionError: expected false to be true
  ❯ tests/backend.spec.ts:81:41
     81|       expect(settings.anthropicEnabled).toBe(true);

 Test Files  1 failed | 10 passed (11)
      Tests  3 failed | 100 passed (103)
   Duration  56.48s
```

- ✅ Testes do Studio, à parte: 2 arquivos, 9 testes, exit 0.
- ✅ Nenhum arquivo novo desta fase fora de `src/`, `tests/`, `docs/` e `relatorios/`. O banco de teste ficou em pasta temporária.
- Sem print: a F0 não tem tela.

## Desvios

- Branch `studio`, não `feat/studio`, porque o pedido desta conversa nomeou `studio`.
- Havia mudanças locais alheias ao Studio (incluindo `db/`). Não entraram nos commits. O teste de backend chegou a gravar um job "Job de Teste Unitário" em `db/tavir_store.json`; esse job foi removido de volta.
- Colunas JSON saem da API já como objeto (`brand_kit`, `pauta`, `angulos`, `roteiro`, `hashtags`, `formatos`). O arquivo guarda `*_json`.
- `slots`, `render_final` e `pacote_montado` não são colunas. A leitura da peça preenche isso para as regras. Pacote montado = existe `pecas/<id>/pacote/manifest.json`.

## Perguntas abertas

Nenhuma bloqueia a F0. D5 ficou no padrão `%USERPROFILE%\TAVIR\Studio`. Continuam para as fases seguintes: D1 (licença Remotion, F9), D2 (porta 8765, F8), D3 (TTS, F7), D4 (zona segura, F4), D6 (licença das skills, F3).

Parado. Próxima fase só depois de "ok F0".
