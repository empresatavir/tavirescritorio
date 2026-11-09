# Studio (app Electron)

O Studio produz a peça no Escritório: perfil, pauta, roteiro, arte, revisão e pacote. O motor de IA sugere texto e presets; quem fecha etapa, gate ou kit é o clique do CEO ou uma checagem que só pode falhar.

Tudo vive no app Electron (`src/`). Os dados da peça ficam fora do git. DarkFlow e Docuflow continuam nos repositórios deles: o Escritório só os inicia e chama a API.

## Peças

| Arquivo | Papel |
| :--- | :--- |
| `src/shared/studio.ts` | Redes, formatos, etapas, gates e tipos do banco. |
| `src/shared/studioPreview.ts` | Zona segura, corte de legenda e alertas da prévia. |
| `src/main/studio/paths.ts` | Pasta de dados. Padrão `%USERPROFILE%\TAVIR\Studio`. Teste: `TAVIR_STUDIO_HOME`. |
| `src/main/studio/store.ts` | SQLite (`node:sqlite`, WAL) em `studio.sqlite`. |
| `src/main/studio/rules.ts` | `nextStage`, `canAdvance`, `applyGate`, `slotCode`, `validateTexts`. |
| `src/main/studio/ipcHandlers.ts` | Canais `studio:*`. O renderer não chama DarkFlow nem Docuflow. |
| `src/main/sidecars.ts` | Sobe e para DarkFlow e Docuflow. O exemplo versionado é `db/sidecars.example.json`. O arquivo real `db/sidecars.json` fica de fora do git. |
| `src/renderer/studio-ref/` | Telas empacotadas: `Studio.dc.html`, `Social.dc.html`, `Flow.dc.html`, `Edicao.dc.html`. |
| `studio-motion/` | Projeto Remotion. É a única pasta nova de código fora de `src/`, `tests/` e `docs/`. |

## Telas

O app empacotado mostra as páginas `.dc.html`, injetadas por `scripts/clean_and_bind_ipc.js`. `StudioView.tsx` é só o aviso do modo dev.

| Página | UUID | O que faz |
| :--- | :--- | :--- |
| Studio | `16017d18-269b-4357-ad7b-a062bb3012c1` | Peça, prévia, prompts, áudio, pacote e sistemas ligados. |
| Social | `4de11384-84d7-4565-aa6e-7c22c5e8ecbd` | Perfis e o scorecard do DarkFlow, ou «—» quando não há número. |
| Flow | `1661c4ce-e992-453f-aac1-d7e20e73d1c5` | Biblioteca e agendas lidas do DarkFlow. |
| Edição | `508d093f-1272-42dd-9a7b-df8fdbe3246d` | Composições e jobs do Docuflow, e a janela «Abrir no Docuflow Studio». |

Configurações, aba Sistema, também lista os sistemas ligados, com iniciar e parar.

## Pasta de dados

`studioHome()` devolve `%USERPROFILE%\TAVIR\Studio`, a menos que `TAVIR_STUDIO_HOME` ou o argumento de teste diga outra pasta.

- `studio.sqlite` — perfis, redes, séries, peças, slots, ativos, prompts, renders e jobs de motion.
- `entrada-flow/` — arquivos que o CEO solta depois do Google Flow. O nome é `SIGLA-0000-S00.png` ou `SIGLA-0000-S00-v2.png`. Sem dono, o arquivo fica na pasta e a tela mostra «sem dono».
- `pecas/<id>/ativos/`, `render/`, `pacote/`.
- `motion/` — cópia do projeto Remotion do perfil, com os kits aprovados.
- `musicas/` — trilha só entra no reel se o arquivo irmão `<nome>.licenca.txt` tiver texto.

Nada disso entra no git do Escritório.

## Peça

As etapas vêm de `src/shared/studio.ts`. Vídeo conserva a etapa de áudio; imagem e carrossel pulam essa etapa. Os gates são ângulo, revisão e publicação. `advance` recusa avançar um gate. O status `aprovado` de um kit ou de um job de motion só existe pelo caminho `decideMotionGate`, nunca pelo texto do motor.

O pacote de imagem copia os stills que já existem (`01.png`, `02.png`, `capa.png`) e escreve `legenda.txt`, `hashtags.txt` e `manifest.json`. Não renderiza. Falta o still e a resposta é `falta o render do slide N`.

## Motion

O job copia a base, liga `node_modules` por junção e escreve o contexto. As checagens C1–C9 rodam no workspace. C1 ignora `node_modules`, `.git`, `.tavir` e os arquivos de conferência `out/frame-0.png`, `out/frame-mid.png`, `out/frame-mid-b.png`, `out/frame-last.png`, `out/frame-enter.png` e `out/proxy.mp4`. Qualquer outro arquivo fora de `src/kits/<kitId>` reprova. C7 exige diferença média absoluta maior que 0,25 entre o quadro 0 e o quadro de entrada. C8 exige desvio padrão maior que 2 no quadro do meio.

Passou nas checagens: o job fica `aguardando_gate`. A frase «aprovado» na resposta do motor não muda o status. O botão «Aprovar kit» copia o kit para a pasta de dados, registra a composition e grava um commit nesse repositório de dados. O `.gitignore` desse repositório deixa `node_modules` e `out` de fora.

A cópia vendida das skills do Remotion não entra no repo. O contrato que o Escritório escreve está em `studio-motion/MOTION_CONTRACT.md` e em `studio-motion/.skills/SUPORTE_NATIVO.md`.

## Reel

`scenesFromRoteiro` usa `roteiro.cenas` quando existe. Sem cenas, cada slide vira uma. A narração padrão é edge-tts, voz `pt-BR-FranciscaNeural`, se o kit não escolher outra. O arquivo sai em `ativos/narracao-NN.mp3`.

`planReel` monta a duração pela narração. `buildReelPacote` não renderiza: exige um `final` pronto, normaliza para −14 LUFS (faixa aceita de −15 a −13) com pico de no máximo −1 dBTP, extrai `capa.png` e grava `legendas.srt`. Sem o whisper.cpp, a legenda é uma linha por cena. O gancho visual passa se a diferença média entre o quadro 0 e o quadro 14 for maior que 0,25.

A música licenciada fica em 0,45 e desce para 0,15 enquanto a narração toca. Esses dois volumes não estão no GOAL; estão aqui para o próximo leitor não procurar um terceiro número.

## Como o DarkFlow acha o reel

O DarkFlow só importa um mp4 cujo manifesto mora em `storage/output` do próprio repositório. `exportReelForDarkFlow` copia o `pacote/final.mp4` para essa pasta e escreve o irmão `<arquivo>.manifest.json`:

- `schema_version` 1 e `output_id` uuid.
- `relative_path` em barras normais, a partir da raiz do DarkFlow, obrigatoriamente dentro de `storage/output`.
- `sha256` do arquivo copiado.
- `source_batch_id` nulo.
- `media.container` mp4, vídeo h264, áudio aac, largura, altura, duração e tamanho.
- `editorial.state` `approved`.

Essa pasta é ignorada pelo git do DarkFlow, menos o `.gitkeep`. O Escritório não edita código de lá.

O agendamento, em `prepareDarkflowSchedule`, só aceita o formato `ig-reels-9x16` e uma data com hora. A ordem é: copiar o manifesto, `GET /api/publisher/session` para o CSRF, `POST /api/publisher/library/scan`, achar o item pelo sha256 e `POST /api/publisher/schedules` com `activate: false` e `editorial_attested: false`. O id fica em `pacote/darkflow.json`.

«Aprovar publicação» chama `activateDarkflowSchedule`: `PATCH` com `editorial_attested: true` e `activate: true`. Sem esse clique, a agenda continua rascunho. O Escritório nunca passa `--enable-meta-publish`. Se a sessão do DarkFlow está em simulação, `real_publish_capable` fica falso e o worker não publica de verdade.

O scorecard vem de `GET /api/publisher/telemetry/scorecard`. Sem mediana, a tela mostra «—». Não inventa zero.

## Docuflow

`sendToDocuflow` só aceita `yt-longo-16x9`. Cria o canal com `POST /channels` (409 significa que já existe), manda a paleta e as fontes em `POST /channels/{id}/brand-kit` e abre o projeto com `POST /projects`. O roteiro vai dentro de `topic`, porque o pedido de criação não tem campo de roteiro. A voz não entra no brand kit: o modelo do Docuflow recusa campo extra. A resposta do Escritório devolve a voz ao lado do corpo.

`stop` no código do Escritório é `render`, que dispara o pipeline a partir da pesquisa. Uma prova local pode pedir `stop=research` para parar depois da Wikipedia. A tela em `http://127.0.0.1:3000` é o Studio web e não lista os projetos dessa API.

«Abrir no Docuflow Studio» abre `http://127.0.0.1:3000` numa `BrowserWindow` de 1280×800, sem `nodeIntegration`, com `contextIsolation`.

## Sistemas ligados

`createSidecarManager` lê `db/sidecars.json` se o arquivo existe, senão o exemplo. Antes de subir:

- recusa um comando que contenha `enable-meta-publish`;
- recusa se o outro lado do conflito da porta 8765 já está no ar;
- recusa se a porta tem um dono que o Escritório não gerou.

Parar só mata o processo que este Escritório subiu. A saúde do DarkFlow é `http://127.0.0.1:8765/api/health`. A do Docuflow é `http://127.0.0.1:5000/docs`.

## Como rodar

Os testes de unidade do Studio usam pasta temporária. Não rode a suíte inteira em cima do `backend/tavir.db` do uso diário: três testes de `tests/backend.spec.ts` já falham na master por um desencontro entre o SQLite e o JSON.

- `npm run typecheck`
- `npx vitest run tests/unit/studio.store.spec.ts tests/unit/studio.rules.spec.ts tests/unit/studio.sidecars.spec.ts tests/unit/studio.ecosystem.spec.ts tests/unit/studio.reel.spec.ts`
- `npm run test:studio:render` — stills de exemplo.
- `npm run test:studio:reel` — reel de duas cenas, se o `edge-tts` estiver no PATH.
- `npm run test:motores:motion` — conformidade de motion. Motor sem login fica ⛔ e não vira ✅.
- `npm run build` — injeta as quatro páginas e a seção de Configurações.
