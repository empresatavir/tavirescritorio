# Relatório SEO — Raio X por convite

> `seo_ready_for_launch: true` · gate técnico aprovado para esta superfície operacional `noindex`

## Decisão de indexação

O Raio X não é uma página de aquisição orgânica. É uma superfície operacional por convite e deve
permanecer fora dos mecanismos de busca. A descoberta comercial acontece no site institucional e
na abordagem da TAVIR, não neste formulário.

## Evidências implementadas

- `meta robots` com `noindex,nofollow,noarchive` na raiz e no formulário.
- Header global `X-Robots-Tag: noindex, nofollow, noarchive`.
- `robots.txt` corrigido para permitir o crawl técnico necessário à leitura do `noindex`; ele não é
  tratado como controle de acesso.
- Ausência de sitemap, canonical público e dados estruturados nesta aplicação operacional.
- Link assinado e formulário não aparecem na navegação do site institucional.

## Evidência de produção — 2026-08-22

O deployment `dpl_Y4cKT9giGPaCu6hs1zSR7eSpYNyD` corrigiu a divergência anterior. A raiz, o formulário e
as APIs passaram a emitir `X-Robots-Tag`; `robots.txt` responde 200 com `Allow: /`; o formulário usa
`no-store`. A checagem utilizou somente token sintético localmente formado, nunca URL de convidado.
Reauditoria independente aprovou o mapa técnico: raiz, formulário e APIs permanecem `noindex`, o
crawl de `robots.txt` permite que o sinal seja lido e sitemap/canonical/schema são N/A nesta aplicação
privada. Esse gate não libera clientes nem substitui segurança/LGPD.

## Revisão de conteúdo v2 — evidência do implementador — 2026-08-23

A ampliação do intake não alterou a decisão de indexação, `meta robots`, `X-Robots-Tag`,
`robots.txt`, sitemap, canonical, schema ou navegação pública. O módulo Google/Maps pertence ao
diagnóstico do cliente e não transforma o formulário por convite em página orgânica. Nenhum deploy
foi feito. `seo_ready_for_launch: true` continua sendo o parecer anterior para a superfície privada;
o release v2 ainda precisa de rechecagem independente dos headers após publicação candidata.
