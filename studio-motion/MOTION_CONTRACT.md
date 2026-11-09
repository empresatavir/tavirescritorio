# Contrato de motion

1. Toda animação usa `useCurrentFrame()` + `interpolate()` / `spring()`. Proibido: animação CSS (`@keyframes`, `transition:`), `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now()`, `Math.random()` (use `random(seed)` do Remotion).
2. Tempos vêm só dos `tokens` do kit (props). Nada de número mágico de duração.
3. Toda composição exporta um schema `zod` e `defaultProps` completos; registra no `Root.tsx`.
4. Texto sempre dentro de `<SafeArea zone={...}>` (componente-base do repo).
5. Fontes por `staticFile()` ou `@remotion/google-fonts`; imagens e vídeos por `staticFile()` ou caminho passado em props. Nenhuma URL remota.
6. Uma coisa se mexe por vez; entradas em sequência com `staggerFrames`.
7. Entrada com desaceleração (easing do kit), saída com aceleração.
8. Escrever só dentro de `src/kits/<kitId>/` do workspace do job. Nunca tocar `src/base/`, `Root.tsx` fora do bloco marcado, `package.json` ou `remotion.config.ts`.
