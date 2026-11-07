# Cânone de design — TAVIR

Roteador. Não substitui o corpo das skills. Uma skill estética por job.

## Fronteira

Marina decide quem a marca é: entregas 1 (tokens), 6 (apresentação) e 7 (infográfico). Yuri decide como isso vira interface: entregas 2 a 5 (design system, esqueleto, protótipo, hero). Conflito de contraste sobe ao CEO com as duas posições. Nenhum substitui o token do outro.

## Ordem

Token antes de design system. Esqueleto antes de protótipo. Hero animado (`scroll-world`) só com protótipo aprovado e custo do CEO.

## Antes de pixel

Design Read, uma linha: tipo de página, público, linguagem, família. Dials de 1 a 10: variância de layout, intensidade de movimento, densidade visual. Fonte: `conhecimento/design/dials-de-intencao-design.md`. Nível 2: Reference Card via `visual-reference-absorb` antes de pixel. Não copiar asset.

## Qual skill

- Landing, portfolio, redesign de marketing: `design-taste-frontend`.
- UI de produto: `ui-ux-pro-max`, depois `ui-styling`.
- Marca nova: `brand-context` primeiro. As outras skills de marca só depois.
- Logo, CIP, banner e ícone: skill `design`. Scripts em `agentes/escopo/skills/design/scripts/`. Nunca `~/.claude/skills`.

Não abrir no mesmo job: `design-taste-frontend-v1`, `stitch-design-taste`, `gpt-taste`, `high-end-visual-design`. São reserva. `minimalist-ui` e `industrial-brutalist-ui` só se o Design Read nomear esse estilo.

## Anti-default

Gradiente roxo, hero centralizado sobre malha escura, três cards iguais, glass em tudo, Inter com slate-900.

## Sistema

shadcn ou Radix Themes, nunca os dois. Tokens da Marina. WCAG AA, foco visível, alvo de 44px.

## Ferramentas

`ui-ux-pro-max/scripts/search.py --design-system` para o sistema. `visual-reference-absorb` para o card. `imagegen-frontend-web` e `imagegen-frontend-mobile` para prancha de imagem, não para o HTML do protótipo.

Padrão completo: `agentes/escopo/DESIGN_PROOF_STANDARD.md`.
