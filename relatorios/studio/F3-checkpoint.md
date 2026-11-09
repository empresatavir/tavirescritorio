# F3 — checkpoint

A F2 foi aceita pela autorização do Carlos para seguir sozinho. A F3 está no branch `studio`. Claude e Codex ficam ⛔ (CLI encontrado, sem login). O portão da tela foi cumprido e a fase segue.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| Testes do Studio (`tests/unit/studio.*.spec.ts` e `tests/motion.spec.ts`) | ✅ 10 arquivos, 26 testes; o teste do gate, de novo, 2 testes |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master e o suite grava no `db/` do usuário |
| `npm run build:renderer` | ✅ `dist/renderer/index.html`, 694.3 KB, com `Studio.dc.html` |
| `npm run test:motores:motion` | ✅ processo destacado, encerrado ao gravar o relatório. Cursor e Antigravity 3/3. Claude e Codex ⛔ |
| Um preset aprovado na tela | ✅ `zoom-lento` do Antigravity, job `3b73fa27-d1cd-49ff-934a-e6373382710e` |

Relatório: `relatorios/motores/motion-2026-11-09T07-25-20.md`.

## Conformidade

| Motor | título de entrada | legenda palavra | zoom lento |
| --- | --- | --- | --- |
| Cursor | ✅ 214 s · 1 tentativa(s) | ✅ 241 s · 1 tentativa(s) | ✅ 227 s · 1 tentativa(s) |
| Claude | ⛔ Claude sem login. CLI encontrado · sem login | ⛔ | ⛔ |
| Codex | ⛔ Codex sem login. CLI encontrado · sem login | ⛔ | ⛔ |
| Antigravity | ✅ 291 s · 1 tentativa(s) | ✅ 261 s · 1 tentativa(s) | ✅ 308 s · 1 tentativa(s) |

Os ⛔ não viram ✅. A autorização para seguir aceita a fase com esses dois motores sem login.

## Gate na tela

Pasta de dados: `%TEMP%\tavir-motion-conformidade` (`TAVIR_STUDIO_HOME`). Os perfis dessa janela são só “Conformidade Motion”.

Caminho clicado: Módulos → Studio → o perfil cujo último job era o zoom → Aprendizados → **Aprovar kit**.

Antes do clique a tela dizia `zoom-lento · aguardando_gate` e `C1 ok` até `C9 ok`. Depois: `zoom-lento · aprovado`. O SQLite passou esse job para `aprovado`. O kit foi copiado para `motion/src/kits/bd709308-8323-4737-8a99-85132fd97e19/ZoomLento.tsx` e registrado no `Root.tsx` dessa pasta (`id="zoom-lento"`). O git da pasta de dados tem o commit `54e01996` com a mensagem `kit zoom-lento`.

O primeiro clique, no perfil errado, mostrou na tela: `o gate só aprova um job que passou nas checagens`. Nenhum job mudou de status nesse clique.

## Desvios

- C7 usa diferença média absoluta entre frames `> 0.25`. O número 2 continua só no desvio-padrão do C8. Uma legenda real media cerca de 0,5 a 0,6 e um quadro chapado mede 0.
- O instantâneo da C1 ignora `.tavir` (o registro da execução) e estes arquivos que a própria checagem grava: `out/frame-0.png`, `out/frame-mid.png`, `out/frame-mid-b.png`, `out/frame-last.png`, `out/frame-enter.png`, `out/proxy.mp4`. Qualquer outro arquivo fora do kit, inclusive `out/job-still.json`, continua reprovando.
- D6: não há cópia vendorizada de `remotion-dev/skills` (o repositório não tem licença). O contexto aponta para a instalação nativa.
- O commit do gate na pasta de dados também versionou `node_modules` e o Chrome Headless, porque essa pasta ainda não tinha `.gitignore`. O código agora grava `node_modules` e `out` no `.gitignore` antes do `git add`. O commit que já foi feito na pasta temporária permanece.
- Trocar de perfil não recarregava o kit da aba Aprendizados, então o botão aprovava o job do primeiro perfil. O clique no perfil passa a buscar `motion.latest` daquele perfil.

## Parado aqui

Nada da F3. A F4 começa em seguida.
