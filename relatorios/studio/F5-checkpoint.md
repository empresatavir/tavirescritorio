# F5 — checkpoint

A F4 ficou com a zona segura nos valores iniciais da seção 4.3. Essa comparação com o celular (D4) continua aberta. O carrossel de três slides foi renderizado mesmo assim.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npx tsc --noEmit -p tsconfig.json` em `studio-motion` | ✅ |
| `npx vitest run tests/unit/studio.*.spec.ts` | ✅ 11 arquivos, 31 testes |
| `npm run test:studio:render` | ✅ still, reel e três PNG |
| `npm run build` | ✅ `dist/renderer/index.html` 697.1 KB |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master |
| PNG | ✅ `relatorios/studio/F5/01.png`, `02.png`, `03.png`, os três em 1080×1350 |

## O que entrou

- O roteiro vira slides com tag, título, apoio, slot e layout. Se o canon pede fonte no último slide e o último layout não é `fonte`, entra um slide de fonte.
- Layouts em `studio-motion/src/base/layouts/SlideLayout.tsx`: capa, texto, imagem-cheia, dado, fonte e cta. A cor e a fonte vêm do BrandKit. Não há arquivo de logo desenhado.
- Arte: cada slide mostra o still, o status do slot e os botões "refazer render" e "trocar".
- Revisão: checklist de limites, zona segura, slots e fonte citada, com comentário. O gate de carrossel passa se o render final já está verde ou se o checklist passa. Vídeo continua exigindo o render final.
- `buildPacote` copia os stills prontos para `01.png`…`NN.png`, `capa.png`, `legenda.txt`, `hashtags.txt` e `manifest.json` com sha256. Não renderiza. O botão "Abrir pasta" abre `pacote/`.

## Desvio

O still do Remotion tem duração de 1 frame. O índice do slide vai nas props; o render pede sempre o frame 0. A conta da zona segura usada no bundle copiado está em `studio-motion/src/base/safeMath.ts`, igual à de `src/shared/studioPreview.ts`.

## Parado aqui

Os três PNG estão em `relatorios/studio/F5/`. O portão pede que o Carlos abra esses arquivos no celular. Isso ainda não aconteceu. D4 também segue sem confirmação.
