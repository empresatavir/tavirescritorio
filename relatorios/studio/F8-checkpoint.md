# F8 — checkpoint parcial

A F6 continua sem as 3 imagens do Flow. A F7 continua sem o whisper e sem o reel visto no celular. A F8 começou mesmo assim.

## O que este commit cobre

- **8.1** `src/main/sidecars.ts` lê `db/sidecars.json` e, se ele não existir, `db/sidecars.example.json`. O arquivo real fica fora do git. DarkFlow: `http://127.0.0.1:8765/api/health`. Docuflow: `http://127.0.0.1:5000/docs`.
- Antes de subir, a porta ocupada gera recusa com o nome do processo. Se um dos dois já está no ar, o outro não sobe: a mensagem diz que a porta 8765 é dos dois.
- O comando configurado com `--enable-meta-publish` é recusado. O Escritório não acrescenta essa flag.
- **8.2** A produção do Studio mostra "Sistemas ligados", com iniciar e parar. A página de Configurações ainda não ganhou a seção; o controle está na tela do Studio.
- **8.3** O Reel do Instagram, com data e hora, é copiado para `storage/output` do DarkFlow com manifesto. A agenda nasce com `activate: false`. O botão «Aprovar publicação» é que manda `editorial_attested` e `activate: true`. Sem `--enable-meta-publish`.
- A página Flow lista biblioteca e agendas. O Social mostra o scorecard real ou «—».
- **8.4** «Enviar para Edição» vale só para `yt-longo-16x9`: cria o canal se o Docuflow ainda não tiver (409 segue) e o projeto com o tema e o roteiro no campo `topic`, porque a API não tem campo de roteiro. A voz não entra no brand kit. A página Edição lista composições e jobs e abre `http://127.0.0.1:3000` sem `nodeIntegration`. A rota de dev `edicao` não usa mais o `StudioView`.

## Comandos

`npx vitest run tests/unit/studio.sidecars.spec.ts tests/unit/studio.ecosystem.spec.ts` — 11 testes, saída 0.

`npm run typecheck` — saída 0.

`npm run build` — Flow e Edição injetados. `dist/renderer/index.html` 691.2 KB.

## Portão

| Item | Resultado |
| --- | --- |
| Testes do sidecar, do CSRF, da agenda em rascunho e do canal | ✅ |
| Reel agendado no DarkFlow em simulação, com os sistemas no ar | ❌ |
| Projeto criado no Docuflow de verdade | ❌ |
| Prints dos dois fluxos | ❌ |
| `git status` limpo no DarkFlow e no Docuflow | ❌ os dois já estavam sujos; esta sessão não escreveu neles |

A F8 não fecha.

