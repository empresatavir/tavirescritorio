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
| Reel agendado no DarkFlow em simulação, com os sistemas no ar | ✅ agenda `b187a77d-a262-4a52-b72f-860c425037c0`, modo simulation |
| Projeto criado no Docuflow de verdade | ✅ `o-arquivo-de-1974-1794222367`, parado em `research` |
| Prints dos dois fluxos | ✅ `relatorios/studio/F8/darkflow-calendario.png` e `docuflow-studio.png` |
| `git status` limpo no DarkFlow e no Docuflow | ❌ os dois já estavam sujos; esta sessão não escreveu neles |

A F8 não fecha.

## Prova ao vivo em 9 de novembro de 2026

O DarkFlow subiu pelo `start.ps1`, sem `--enable-meta-publish` e sem abrir o navegador. `GET /api/health` devolveu 200, versão `3.0-portao1`. A sessão do publicador está em `simulation`, com `real_publish_capable` falso.

O reel `relatorios/studio/F7/reel-2cenas.mp4` entrou em `storage/output` e virou a agenda `b187a77d-a262-4a52-b72f-860c425037c0`, nome «Reel de duas cenas», status `agendado`, ateste verdadeiro. Essa pasta é ignorada pelo git do DarkFlow. O único status de código dele continua sendo `D storage/input/.gitkeep`, que já existia.

O Studio do Docuflow respondeu 200 em `http://127.0.0.1:3000`. A API na porta 5000 não sobe com o Python global: o FastAPI instalado chama `on_startup` e o Starlette atual recusa. Subi a mesma API num ambiente temporário, fora do repositório, com FastAPI 0.119.1 e Starlette 0.45.3. `GET /docs` devolveu 200.

O projeto `o-arquivo-de-1974-1794222367` foi criado com `POST /projects` e `stop=research`. O status ficou `stopped:research`. A pesquisa da Wikipedia rodou; o render não. A tela do Studio em `http://127.0.0.1:3000` continua em «Nenhum projeto»: ela não lista os projetos dessa API.

O calendário do DarkFlow mostra `final.mp4`, «Reel de duas cenas», 01 de dez. às 09:30, estado Agendado, com o aviso Local / Simulação.

Os dois repositórios externos continuam sujos como já estavam. Nenhum arquivo de código deles foi editado. A F8 não fecha por causa disso.

A seção «Sistemas ligados» também está em Configurações, aba Sistema. O build gravou o bloco em `dist/renderer/index.html`. Ainda não cliquei nela no app empacotado.

O caminho do manifesto do reel está em `docs/modules/studio.md`, na seção «Como o DarkFlow acha o reel».

