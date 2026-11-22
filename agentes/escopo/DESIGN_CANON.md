# Cânone de design — TAVIR

Roteador. Não substitui o corpo das skills. Uma skill estética por job.

## Fronteira

Marina decide quem a marca é: entregas 1 (tokens), 6 (apresentação) e 7 (infográfico). Yuri decide como isso vira interface: entregas 2 a 5 (design system, esqueleto, protótipo, hero). Conflito de contraste sobe ao CEO com as duas posições. Nenhum substitui o token do outro.

## Ordem

Token antes de design system. Esqueleto antes de protótipo. Hero animado (`scroll-world`) só com protótipo aprovado e custo do CEO.

## Antes de pixel

Design Read, uma linha: tipo de página, público, linguagem, família. Dials de 1 a 10: variância de layout, intensidade de movimento, densidade visual. Fonte: `conhecimento/design/dials-de-intencao-design.md`. Nível 2: Reference Card via `visual-reference-absorb` antes de pixel. Não copiar asset.

## Qual skill

- Landing, oferta, portfolio, redesign de marketing: `tastemaker` (base) e `elaya-landing` (sistema de conversão).
- Em todo trabalho de interface: `no-ai-design-slop` como filtro. O problema não é uma cor ou uma fonte; é a escolha feita por reflexo, que poderia ser colada em outro produto sem mudar nada.
- Estética nomeada ou efeito específico: `mengto-receitas` (catálogo; uma por trabalho).
- Acabamento na construção: `jakub-interface`. Movimento: `emil-motion` (primeiro decidir se anima).
- Revisão: `audit-ai-design-slop`, `owl-critica-visual` e `interface-review` do `jakub-interface`.
- UI de produto: `ui-ux-pro-max`, depois `ui-styling`.
- Marca nova: `brand-context` primeiro. As outras skills de marca só depois.
- Logo, CIP, banner e ícone: skill `design`. Scripts em `agentes/escopo/skills/design/scripts/`. Nunca `~/.claude/skills`.

Não abrir no mesmo job: `design-taste-frontend`, `design-taste-frontend-v1`, `stitch-design-taste`, `gpt-taste`, `high-end-visual-design`. São reserva. `minimalist-ui` e `industrial-brutalist-ui` só se o Design Read nomear esse estilo.

## Anti-default

Gradiente roxo, hero centralizado sobre malha escura, três cards iguais, glass em tudo, Inter com slate-900.

A receita seguinte também é default e reprova: serifa de display (Fraunces e parecidas) com verde-sálvia e creme; selo em caixa alta acima de cada título; botão cheio ao lado de botão vazado; faixas alternadas de fundo; forma abstrata ou degradê no lugar de foto; sequência abertura, três cartões, depoimento, chamada; navegação com marca à esquerda, links e botão à direita quando a página tem dois destinos.

## Conceito

Toda entrega tem uma ideia própria, escrita na seção Conceito do contrato. Teste da troca: se trocar o logo e a página servir para um concorrente, não há conceito. Uma quebra de regra intencional por página: tudo na grade, igual e seguro, lê como gerado. Foto vem do cliente: a página reserva o espaço de cada uma, com proporção e descrição do que mostrar, e a lista vai em `design/fotos.md`. Falta de foto não é motivo para página só de texto. Não se busca foto em banco nem se gera imagem.

Em criação, a direção apresenta três direções diferentes em `design/direcoes/` (estrutura, tipografia e relação texto-imagem distintas) e o Carlos escolhe no gate. Em manutenção, só quando o pedido é redesenho ou mudança de identidade.

## Sistema

shadcn ou Radix Themes, nunca os dois. Tokens da Marina. WCAG AA, foco visível, alvo de 44px.

## Ferramentas

`ui-ux-pro-max/scripts/search.py --design-system` para o sistema. `visual-reference-absorb` para o card. `imagegen-frontend-web` e `imagegen-frontend-mobile` para prancha de imagem, não para o HTML do protótipo.

## Na Fábrica

Vale para LP, oferta e sistema, em criação e em manutenção. Útil e bonito na mesma proporção: a tela primeiro entrega a tarefa de quem usa.

- Marca em `design/marca.md` (Marina). Contrato em `design/DESIGN.md` (Yuri), com as seções do modelo e o bloco `tokens`. A construção segue o contrato.
- Mudança de layout ou de identidade em projeto pronto altera o contrato primeiro e o código depois.
- O material chega copiado em `.tavir/design/kit/` do projeto. Leia os arquivos; não dependa de recurso de skill do motor.
- Fontes, nesta ordem: biblioteca validada (`conhecimento/design/referencias/`), base de conhecimento, tabelas do `ui-ux-pro-max`, internet por último.
- Quem fecha: a conferência do contrato, o portão automático de design no QA e o gate do Carlos com o parecer do Revisor de Design.

Padrão completo: `agentes/escopo/DESIGN_PROOF_STANDARD.md`.
