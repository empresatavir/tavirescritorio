---
name: seo-growth
description: Planejar, implementar e auditar SEO técnico, conteúdo, presença no Google e distribuição orgânica para LPs, sites, e-commerces e páginas públicas de SaaS/CRM da TAVIR. Usar SEMPRE em descoberta, arquitetura, copy, construção, revisão ou deploy web; e quando houver SEO Title, meta description, palavra-chave, intenção de busca, ranking/posicionamento no Google, indexação, canonical, sitemap, robots, dados estruturados, linkagem interna, Search Console, Perfil da Empresa, SEO local, conteúdo, analytics, tráfego orgânico ou divulgação.
---

# SEO & Growth

## Contrato canônico

Ler `../../SEO_GROWTH_STANDARD.md` por completo antes de agir. Para dados atuais do Google,
consultar `references/google-official-sources.md` e verificar novamente a fonte oficial se a
decisão depender de política, recurso ou interface que possa ter mudado. Usar
`references/seo-report-template.md` no gate.

## Roteamento

- **Descoberta:** levantar intenção, região, demanda, conversão, presença e baseline.
- **Planejamento/copy:** definir mapa intenção→URL, title, description, H1, conteúdo, links,
  dados estruturados aplicáveis e distribuição.
- **Construção:** implementar metadata, canonical, indexação, sitemap/robots, schema, links,
  performance, social preview e mensuração conforme o plano.
- **Auditoria:** Nina SEO revisa com evidências e emite `seo_ready_for_launch`.
- **Pós-lançamento:** Search Console, analytics, Perfil da Empresa quando elegível, baseline,
  conteúdo/distribuição e experimentos com Gael Growth.

Acionar também `funil-vendas` quando a tarefa envolver aquisição, campanha, canais ou metas. Acionar
`web-security` quando houver deploy, analytics, pixels, tag manager, formulário, scripts externos,
CMS ou infraestrutura. O gate de SEO não substitui o gate do Auditor Seg/LGPD.

## Fluxo obrigatório

1. Ler `PROJECT.md`, requisitos, plano e conteúdo real.
2. Identificar objetivo/conversão, público, intenção, região, URLs e dados disponíveis.
3. Declarar fatos observados, dados de ferramenta, `[PREMISSA]` e lacunas separadamente.
4. Definir por URL: `indexar|noindex`, intenção, title, description, H1, canonical, conteúdo,
   links internos, schema e CTA.
5. Implementar ou auditar toda a cadeia: descoberta → indexação → apresentação → conversão.
6. Planejar distribuição por canal com responsável, data, UTM e métrica; não confundir Ads com SEO.
7. Testar produção/preview na medida do escopo e registrar evidências.
8. Produzir `seo_report.md`, retestar correções e atualizar o `PROJECT.md`.

## Regras de verdade

- Não prometer primeira posição, tráfego, rich result, indexação ou prazo fixo.
- Google pode reescrever title e snippet; title/description não são texto garantido do resultado.
- Não usar contagem rígida de caracteres como regra oficial. Faixa de preview é heurística.
- `meta keywords` não é usado pelo Google. Open Graph é compartilhamento, não fator direto alegado.
- E-E-A-T é lente de qualidade, não nota ou fator único de ranking.
- Search Console mede busca orgânica; analytics mede comportamento/conversão. Não inventar volume,
  posição, CTR ou dificuldade sem fonte e data.
- Não produzir conteúdo em escala, páginas por cidade, links ou reviews para manipular ranking.
- Dados estruturados representam conteúdo visível e verdadeiro; teste verde não garante exibição.
- `robots.txt` não protege informação privada. Auth e autorização pertencem à segurança.

## Saída mínima

Entregar mapa intenção→URL, decisões de indexação, titles/descriptions/H1, checklist técnico,
conteúdo/provas, links/schema, mensuração, distribuição, evidências, achados priorizados,
pendências manuais e `seo_ready_for_launch`. Se faltarem dados, acesso ou domínio, registrar
responsável e prazo em vez de presumir conclusão.
