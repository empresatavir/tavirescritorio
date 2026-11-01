# Contrato de movimento

Fonte: `TAVIR Escritório — redesenho.html`, bloco `<style>` do template.

O arquivo declara **17** `@keyframes`. A enumeração do goal cita esses mesmos nomes (fade, rise, slidein, toast, pulse, grow, growx, sweep, blink, spot, dash, spin, flowdot, stamp, shimmer, ringwarn, slideup). Não há um 18º keyframe no HTML, então nenhum foi inventado.

Implementação: [`frontend/src/styles/motion.css`](../frontend/src/styles/motion.css).

Tokens: `--ease: cubic-bezier(.2,.7,.2,1)`, `--fast: 120ms`, `--std: 180ms`.

`prefers-reduced-motion: reduce` no seletor `.tv *, .tv *::before, .tv *::after` força `animation-duration: 1ms`, `animation-iteration-count: 1` e `transition-duration: 1ms`. O `<body>` da aplicação carrega a classe `tv` para esse seletor valer.

Prova prevista, ainda não executada: `cd frontend && npm run test:motion`. O spec deve comparar o texto dos keyframes com `visual/motion-reference.json` e o estilo computado no Chromium, com e sem reduced-motion.

Estado deste checkpoint: o CSS e o JSON de referência não puderam ser gravados. O modo plano só aceita markdown, e a troca para o modo agente foi recusada. O bloco abaixo é a cópia fiel, pronta para virar `frontend/src/styles/motion.css` assim que a escrita de código for permitida.

```css
:root {
  --ease: cubic-bezier(.2, .7, .2, 1);
  --fast: 120ms;
  --std: 180ms;
}
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rise { from { opacity: 0; transform: translateY(10px) scale(.985) } to { opacity: 1; transform: none } }
@keyframes slidein { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes toast { from { transform: translateY(-12px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(27, 197, 189, .45) } 70% { box-shadow: 0 0 0 8px rgba(27, 197, 189, 0) } 100% { box-shadow: 0 0 0 0 rgba(27, 197, 189, 0) } }
@keyframes grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes growx { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes sweep { from { background-position: -60px 0 } to { background-position: calc(100% + 60px) 0 } }
@keyframes blink { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
@keyframes spot { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes dash { to { stroke-dashoffset: 0 } }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes flowdot { 0% { left: 0; opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { left: 100%; opacity: 0 } }
@keyframes stamp { from { transform: scale(1.18); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes shimmer { from { background-position: -300px 0 } to { background-position: 300px 0 } }
@keyframes ringwarn { 0% { box-shadow: 0 0 0 0 oklch(.80 .155 78 / .55) } 70% { box-shadow: 0 0 0 12px oklch(.80 .155 78 / 0) } 100% { box-shadow: 0 0 0 0 oklch(.80 .155 78 / 0) } }
@keyframes slideup { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
```

Declarações que o spec de estilo computado precisa achar, com o tempo do HTML: `.live-dot` pulse 2.4s infinito; `.live-dot.warn` animation none; `.screen` e `.bubble` e `.kcard` e `.back` fade 180ms both; `.fill` transição de width 600ms; `.fill.run` sweep 1.8s linear infinito; `.chart-bars .b` grow 700ms both; `.modal` rise 240ms; `.drawer` slidein 260ms; `.toast` toast 280ms; `.pal` rise 200ms; `.tour` rise 260ms; `.spot::after` spot 1.8s infinito; `.typing i` blink 1.2s com atraso 0 / .2s / .4s; `.log div` fade 300ms; `.shimmer` shimmer 1.3s linear; `.draw` dash 1.4s forwards; `.spin` spin 1s linear. Inline da referência, sem classe própria: stamp 420ms, slideup 220ms, growx 600ms, flowdot 1.8s linear, ringwarn 2s infinito. Hover: `.lift:hover` translateY(-2px); `.rail-btn:hover .rail-tip` opacity 1. Transições de rail, nav, toggle e lift usam `--fast` (120ms) ou `--std` (180ms) com `--ease`.
