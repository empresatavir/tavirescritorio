# Flow — postagem do Escritório

O **Studio cria**, o **Flow posta** e o **Social mede**. O Flow é a tela de postagem do Escritório; quem publica é o DarkFlow, que continua no repositório dele e roda por trás, em `127.0.0.1:8765`. Plano e decisões em `docs/planning/GOAL_FLOW.md`.

**Publicação real desligada.** O Escritório nunca passa `--enable-meta-publish`. Carrossel, imagem e Stories só rodam em simulação no DarkFlow até a reauditoria Seg/LGPD.

## Caminho de uma peça

1. **Studio, gate do pacote** («Aprovar e enviar ao Flow»): `enviarParaBiblioteca` exporta a peça para `storage/output/` do DarkFlow, pede o scan e acha o item pelo sha256. Grava `pacote/flow.json` com o `item_id`. Não cria agenda nem ativa.
2. **Flow, biblioteca:** o item aparece com o tipo, a origem (Studio, lote do DarkFlow ou pasta) e, no carrossel, as miniaturas das lâminas.
3. **Nova agenda:** cria rascunho (`activate: false`, `editorial_attested: false`). Data e hora moram na agenda, não na peça (D1).
4. **Ativar agenda:** gate do Carlos. Mostra peça, tipo, legenda, data e o modo; o botão só libera com o ateste marcado.
5. **Worker do DarkFlow** publica no horário. Em simulação usa o adaptador falso; «Rodar o worker uma vez» em Publicações força uma rodada.
6. **Studio espelha:** a peça fica «No Flow» e mostra a situação lida das agendas e ocorrências (`derivarEstado`): na biblioteca, rascunho, agendada, publicada (simulação), atenção, falhou. Ela nunca pula sozinha para publicada.

## Quem entra na biblioteca

| Origem | Como | Arquivo |
|---|---|---|
| Studio | gate do pacote | `src/main/flow/biblioteca.ts` |
| APK | job «Preparar post» (`studio_post`) vira peça na etapa pauta | `src/main/flow/entrada.ts` (`postDoApk`) |
| Agentes | Íris, Redator e Social propõem até 3 peças por blocos `PECA:` | `src/main/flow/entrada.ts` (`aplicarPecasDoAgente`) |
| Lote do DarkFlow | item com `source_batch_id` | lido direto da biblioteca |

APK e agentes **criam** peça; nunca agendam nem ativam. Campo de data ou agenda vindo deles é ignorado com aviso.

## Formatos

| Formato do Studio | DarkFlow | Manifesto |
|---|---|---|
| `ig-reels-9x16` | `REELS` | v1 (`exportReelForDarkFlow`) |
| `ig-carrossel-4x5` | `CAROUSEL` (2 a 10 lâminas) | v2 |
| `ig-post-4x5`, `ig-post-1x1` | `IMAGE` | v2 |
| `ig-stories-9x16` | `STORIES` | v2 |

No v2 (`exportV2ForDarkFlow`) as lâminas PNG viram JPEG por ffmpeg em `storage/output/studio-<peça>/`, e o hash do topo é o SHA-256 da lista dos hashes dos itens, um por linha. Acima de 10 lâminas o Flow recusa (limite da Meta, D5).

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/shared/flow.ts` | `PacoteAprovado`, formatos aceitos, `mediaTypeDarkflow`, situações e rótulos, `FlowBoard` |
| `src/main/flow/pacote.ts` | monta o pacote da peça e converte para o manifesto (v1 ou v2) |
| `src/main/flow/biblioteca.ts` | envio à biblioteca, `derivarEstado`, `estadoNoFlow` |
| `src/main/flow/cliente.ts` | cliente do publicador com CSRF: board, criar, ativar, cancelar, simular; miniaturas |
| `src/main/flow/ligar.ts` | `garantirDarkflow`: sobe o sidecar quando o Flow abre e avisa do conflito de porta com o TTS do Docuflow |
| `src/main/flow/entrada.ts` | entradas do APK e dos agentes |
| `src/main/studio/darkflowExport.ts` | export do Reel (v1) e das lâminas (v2) |
| `src/main/studio/ipcHandlers.ts` | IPC `flow:*` e `studio:flow:*` |
| `src/renderer/studio-ref/Flow.dc.html` | biblioteca, agendas, calendário, gate, publicações, conexão |
| `db/sidecars.example.json` | como o DarkFlow sobe (`start.ps1`, portas 8765 e 5174) |

O renderer nunca chama o DarkFlow: tudo passa pelo processo principal.

## Testes e jornadas

- Unitários: `tests/unit/flow.*.spec.ts` e `studio.flow.spec.ts`, com servidor HTTP falso do DarkFlow e pasta temporária.
- Jornadas com prints em `relatorios/flow/F1` a `F6`. A F6 roda o app real contra o backend **real** do DarkFlow em simulação, com raiz e storage numa pasta temporária: Studio aprova, Flow agenda, Carlos ativa, worker publica em simulação e a peça espelha «publicada (simulação)».
- Mudou o contrato do manifesto? Rode também `pytest` no DarkFlow (`backend/tests/test_publisher_v2.py`).
