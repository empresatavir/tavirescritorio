# F7 — checkpoint parcial

A F6 segue sem as 3 imagens do Flow. A narração do Reel começou mesmo assim, pela autorização de seguir quando a fase anterior já está construída. O portão da F6, as imagens na pasta, continua aberto.

## O que este commit cobre

- **7.1** O roteiro de vídeo tem cenas com texto narrado, texto de tela, slot, preset e `duracao_min`. Sem cenas, cada slide vira uma.
- **7.2** `audio.ts` chama `edge-tts` ou `piper`. Sem voz no brand kit, a voz é `pt-BR-FranciscaNeural`. O preflight avisa se o `edge-tts` não está no PATH. Cada cena vira `ativos/narracao-NN.mp3`.
- A tela de Áudio lista as cenas e tem «Gerar narração» e «refazer narração».
- Os parsers de whisper → legenda e de `loudnorm` existem e têm teste. O download do whisper.cpp **não** foi feito: o documento pede confirmação antes.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npx vitest run tests/unit/studio.reel.spec.ts` | ✅ 4 testes |
| `npm run build` | ✅ `dist/renderer/index.html` 699.2 KB |
| Reel 1080×1920 com TTS e loudness | ❌ ainda não rodei |
| Carlos assiste no celular | ❌ |

## Parado no meio da F7

Falta a montagem do `TavirReel` com música, o pacote `final.mp4` + `legendas.srt`, e o render de duas cenas. O whisper só baixa depois de um sim.
