# Schema de análise — inteligência de negócios em vídeo

## Relatório Markdown

O arquivo `relatorios/inteligencia-negocios.md` deve conter:

1. **Ficha da fonte** — título, canal, convidados, URL, duração, publicação,
   idioma, tipo de legenda e data da análise.
2. **Resumo executivo** — até 10 linhas, escrito para decisão.
3. **Mapa do conteúdo** — capítulos ou blocos temáticos com timestamps.
4. **Teses e modelos mentais** — o que sustenta cada tese e suas condições.
5. **Raio-X do negócio** — proposta, públicos, produtos, monetização, canais,
   operação, pessoas, tecnologia, métricas e vantagens.
6. **Alegações que exigem verificação** — números, resultados ou causalidades.
7. **Oportunidades para a TAVIR** — hipótese, evidência, adaptação e risco.
8. **Experimentos** — 7, 30 e 90 dias, com responsável sugerido, métrica,
   custo/esforço e critério de parada.
9. **O que não copiar** — dependências, vieses, contexto ou riscos.
10. **Lacunas e perguntas** — o que o conteúdo não permite concluir.

Cada item relevante usa pelo menos uma referência no formato `[HH:MM:SS]`.

## JSON

O arquivo `relatorios/insights.json` usa UTF-8 e esta forma:

```json
{
  "schema_version": "1.1",
  "source": {
    "url": "",
    "video_id": "",
    "title": "",
    "channel": "",
    "published_at": "",
    "duration_seconds": 0
  },
  "analysis": {
    "classification": {
      "primary_niche": "",
      "secondary_tags": [],
      "promotion_eligibility": "publica_sanitizada|requer_aprovacao|nao_promover"
    },
    "executive_summary": "",
    "themes": [],
    "business_model": {},
    "claims_to_verify": [],
    "opportunities": [],
    "decisions": [],
    "experiments": [],
    "do_not_copy": [],
    "unknowns": []
  }
}
```

Um insight estruturado inclui `id`, `title`, `statement`, `evidence_type`,
`timestamps`, `confidence`, `tavir_relevance`, `conditions` e `risks`.

Uma decisão inclui `id`, `status`, `decision`, `when_to_use`, `when_not_to_use`
e `based_on`. Um experimento inclui `id`, `status`, hipótese/ação, janela,
métrica, critério de parada e `based_on`. Novas análises usam a versão 1.1;
arquivos 1.0 permanecem válidos e recebem a classificação durante a promoção.

Valores permitidos para `evidence_type`: `OBSERVADO`,
`ALEGACAO_DO_CONVIDADO`, `INFERENCIA`, `OPORTUNIDADE_TAVIR` e `INDISPONIVEL`.

## Critérios de qualidade

- Nenhuma conclusão crítica sem timestamp ou marca explícita de inferência.
- Números falados são alegações até verificação independente.
- Oportunidades incluem condição, risco e teste mínimo.
- Resumo e JSON não se contradizem.
- A análise preserva contexto e não transforma correlação em causalidade.
