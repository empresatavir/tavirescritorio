# F2 — checkpoint

A F1 foi aceita por autorização do Carlos para seguir sozinho. O download do Chrome Headless foi confirmado com “feito”. A F2 está no branch `studio`.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| Testes do Studio (`studio.render`, `studio.rules`, `studio.store`, `studio.suggest`, `studio.bind`) | ✅ 16 testes |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master e o suite grava no `db/` do usuário |
| `npm run build` | ✅ o teste de bind regravou `dist/renderer/index.html` com a faixa do Chrome |
| `npm run test:studio:render` | ✅ exit 0 |
| PNG e MP4 de exemplo | ✅ `relatorios/studio/F2/exemplo.png` (1080×1350, desvio 125.47) e `exemplo.mp4` (1080×1920, 30 fps, 3.00 s) |

## Saída do render (final)

```
{"type":"done","path":"...\\still.png"}
dimensão 1080×1350 ✅
fps imagem estática ✅
não chapado desvio 125.47 ✅
{"type":"progress","pct":100}
{"type":"done","path":"...\\reel.mp4"}
dimensão 1080×1920 ✅
fps 30 ✅
duração 3.00 s ✅
exemplos em relatorios/studio/F2
```

## O que entrou

- `studio-motion/` com Remotion `4.0.541`, React `19.0.0` e Zod `3.25.76`, versões fixas.
- Base `TavirSlide` e `TavirReel`, com o bloco `// <kits>`.
- `scripts/render.mjs` escreve progresso em JSON. Proxy sai na metade da resolução, com `crf` 28.
- Arquivo local entra em `public/job` antes do bundle. O Chrome Headless recusa `file://`.
- `render.ts` monta o job, sobe o processo em `<dados>/motion` e cancela matando o processo.
- `motionHome.ts` copia o projeto, roda `npm ci` e faz o commit inicial no git da pasta de dados. No Windows o `npm` usa o shell; o `node` e o `git` não, para o caminho `C:\Program Files` não ser cortado.
- O preflight passa a exigir `<dados>/motion/node_modules` e o Chrome Headless. O download só roda se a tela confirmar. O Carlos confirmou com “feito”; o gate chama `downloadRemotionBrowser(true)` quando a pasta de teste ainda não tem o browser.
- `mediaChecks.ts` confere dimensão, fps, duração e, no still, se a imagem não é chapada. PNG não guarda fps: a checagem de fps do still registra “imagem estática”.

## Desvio

O proxy é metade do formato, então a checagem de dimensão compara com essa metade. Still e final comparam com o formato inteiro.

O teste de render reutiliza `%TEMP%\tavir-studio-f2-gate` e recopía `src` e `scripts` do repositório. O Chrome do Remotion fica em `node_modules/.remotion` daquela pasta, não em `%LOCALAPPDATA%\remotion`.

## Parado aqui

Nada da F2. A F3 começa em seguida, pela licença das skills (D6).
