# F2 — checkpoint

A F1 foi aceita por autorização do Carlos para seguir sozinho. A F2 está no branch `studio`.

## Portão

| Item | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ |
| Testes do Studio (`studio.render`, `studio.rules`, `studio.store`, `studio.suggest`, `studio.bind`) | ✅ 16 testes |
| `npm test` completo | ❌ não rodei. Os 3 casos de `tests/backend.spec.ts` já falhavam na master e o suite grava no `db/` do usuário |
| `npm run build` | ✅ o teste de bind regravou `dist/renderer/index.html` com a faixa do Chrome |
| `npm run test:studio:render` | ❌ a base de motion instalou; o teste parou porque o Chrome Headless do Remotion não está na máquina |
| PNG e MP4 de exemplo | ❌ dependem do teste acima |

## O que entrou

- `studio-motion/` com Remotion `4.0.541`, React `19.0.0` e Zod `3.25.76`, versões fixas.
- Base `TavirSlide` e `TavirReel`, com o bloco `// <kits>`.
- `scripts/render.mjs` escreve progresso em JSON. Proxy sai na metade da resolução, com `crf` 28.
- `render.ts` monta o job, sobe o processo em `<dados>/motion` e cancela matando o processo.
- `motionHome.ts` copia o projeto, roda `npm ci` e faz o commit inicial no git da pasta de dados.
- O preflight passa a exigir `<dados>/motion/node_modules` e o Chrome Headless. O download só roda se a tela confirmar.
- `mediaChecks.ts` confere dimensão, fps, duração e, no still, se a imagem não é chapada.

## Desvio

O proxy é metade do formato, então a checagem de dimensão compara com essa metade. Still e final comparam com o formato inteiro.

## Parado aqui

O documento pede confirmação antes de baixar o Chrome Headless do Remotion. Sem esse download, o render de exemplo não roda e a F3 não começa.
