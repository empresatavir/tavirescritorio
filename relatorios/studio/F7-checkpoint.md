# F7 — checkpoint

A F6 segue sem as 3 imagens do Flow. O portão da pasta `entrada-flow` continua aberto. O whisper.cpp não foi baixado: o documento pede confirmação antes.

## O que este commit cobre

- **7.1** O roteiro de vídeo tem cenas. Sem cenas, cada slide vira uma.
- **7.2** `edge-tts` gera `ativos/narracao-NN.mp3`. Sem voz no brand kit, a voz é `pt-BR-FranciscaNeural`.
- **7.4** Música só entra se existir `musicas/<nome>.licenca.txt` com texto. Sob a narração o volume vai de 0,45 para 0,15. Esses dois números não estão no documento.
- **7.5** O `TavirReel` usa o preset da cena: zoom em `titulo-entrada` e `zoom-lento`, a entrada some no fade (troca), e o `encerramento-cta` pinta o texto na cor de acento.
- **7.6** A etapa Áudio ouve a narração, refaz uma cena e grava a correção em `texto_tela` (ou na legenda, se ela já existir).
- **7.7** O pacote mede loudnorm, pico, duração e o gancho. Antes da medida, um segundo passe leva o áudio para −14 LUFS e pico −1,5 dBTP.
- **7.8** O pacote de vídeo grava `final.mp4`, `capa.png`, `legenda.txt`, `hashtags.txt`, `legendas.srt` e `manifest.json`. Sem whisper, o SRT é uma linha por cena.

## Comandos

`npm run typecheck` — saída 0.

`npx vitest run tests/unit/studio.reel.spec.ts tests/unit/studio.pacote.spec.ts` — 8 testes, saída 0.

`npm run build` — `dist/renderer/index.html` 699.5 KB.

`npm run test:studio:reel` — duas cenas com `edge-tts`, MP4 1080×1920, 30 fps, 2,00 s. Pacote: loudness −14,0 LUFS, pico −2,6 dBTP, gancho diferença 48,71. Arquivo em `relatorios/studio/F7/reel-2cenas.mp4`.

## Portão

| Item | Resultado |
| --- | --- |
| Typecheck, testes de unidade e build | ✅ |
| Reel 1080×1920 30 fps com TTS | ✅ |
| Loudness, pico, duração e gancho | ✅ no pacote deste teste |
| Whisper baixado | ❌ falta o sim |
| Carlos assiste no celular | ❌ |

A F7 não fecha enquanto o reel não for visto no celular.
