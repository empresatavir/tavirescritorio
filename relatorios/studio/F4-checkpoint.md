# F4 — checkpoint

A F3 foi aceita pela autorização para seguir. A tela da prévia está no branch `studio`. Os valores de zona segura continuam os iniciais da seção 4.3. O portão pede a comparação com um print real do celular (D4); isso ainda não aconteceu.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npx vitest run tests/unit/studio.preview.spec.ts` | ✅ 5 testes |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master |
| `npm run build` | ✅ main + `dist/renderer/index.html` 696.4 KB, com `Studio.dc.html` |
| Prints | ✅ `relatorios/studio/F4/feed.png`, `reel.png`, `thumb.png`, `grid.png` |

## O que a tela faz

- Moldura de telefone desenhada em HTML, sem imagem de aparelho de terceiros e sem logo oficial.
- Feed: avatar, @, mídia, ícones genéricos, legenda cortada em 125 caracteres com `…mais`, contador e pontinhos. Setas e arrastar trocam o slide.
- Reel, Stories, Shorts e TikTok: mídia em tela cheia, ícones na direita e legenda na base.
- Miniatura do YouTube em três larguras (busca, sugestão, tela inicial), título em duas linhas.
- LinkedIn: texto acima e mídia 4:5.
- Botões: Zona segura (vermelho translúcido), Grade do perfil (capa ao lado das últimas 8, recorte 3:4) e Tamanho real (390 px CSS).
- A mídia é o PNG `still-f<frame>-…` ou o proxy/final. Sem arquivo, a frase é “A prévia aparece quando o roteiro existir.”
- Editar o roteiro pede o still daquele slide depois de 800 ms.
- Alertas: título acima do limite, slide a mais ou a menos, vídeo acima de `maxSeconds`, texto fora da zona. A caixa vem da mesma conta que o `SafeArea` em modo debug.
- O seletor só lista os formatos das redes do perfil, mais o formato da peça.

## Desvio

Os prints foram gerados de `relatorios/studio/F4/molduras.html` com o PNG de exemplo da F2, pelo Chrome Headless do Remotion. A moldura da aplicação é a da `Studio.dc.html`.

## Parado aqui

D4. Os números da seção 4.3 seguem valendo. A F5 não começa até o Carlos comparar estas molduras com o celular e confirmar ou corrigir a zona segura.
