# Estrutura do relatório profissional

## Regras de redação

- Abrir com decisão e implicação, não com descrição do processo.
- Declarar perfil, data da coleta, período, volume e cobertura.
- Declarar `Requests RapidAPI usados` como inteiro verificável pelo manifesto;
  separar de tráfego do Instagram via Chrome/gallery-dl, que não é estimado.
- Separar observado, inferido e indisponível.
- Citar evidências como caminhos relativos/IDs do inventário.
- Não preencher métricas ausentes com estimativas.
- Priorizar recomendações por impacto e esforço; cada uma recebe uma métrica.

## Seções obrigatórias

1. **Resumo executivo** — leitura em uma tela: posição percebida, maior força,
   maior gargalo e três prioridades.
2. **Escopo e cobertura** — corpus, período, categorias, profundidade e falhas.
3. **Leitura do perfil** — bio, promessa, público percebido, prova e CTA.
4. **Arquitetura de conteúdo** — pilares, funções editoriais e mix de formatos.
5. **Narrativa e copy** — ganchos, estruturas, provas, CTAs e recorrências.
6. **Voz e linguagem** — tom, registro, vocabulário, ritmo e consistência.
7. **Identidade visual** — sistema percebido, legibilidade, capas e coerência.
8. **Reels e audiovisual** — abertura, ritmo, edição, texto em tela, áudio e duração.
9. **Marca e posicionamento** — território, diferenciação, autoridade e coerência.
10. **Funil e conversão** — papel das peças, destino dos CTAs e lacunas da jornada.
11. **Forças e fragilidades** — cada item com evidência e impacto.
12. **Oportunidades priorizadas** — ação, motivo, esforço, impacto e métrica.
13. **Plano de testes de 30 dias** — poucos experimentos verificáveis, não um
    calendário infinito.
14. **Apêndice de evidências** — tabela com ID, arquivo, formato, pilar e observação.
15. **Limitações** — dados não fornecidos, conteúdo efêmero ausente e vieses da amostra.

## Variantes obrigatórias

- `relatorio-<perfil>-AAAA-MM-DD.md` + `.html`: versão completa, com todas as
  lentes, evidências e apêndices.
- `relatorio-<perfil>-AAAA-MM-DD-resumo.md` + `.html`: versão executiva derivada,
  contendo decisão, cobertura, prioridades, plano de testes e limitações.
- A versão resumida nunca é a fonte de verdade e não autoriza retirar conteúdo
  do relatório completo.

## JSON de inteligência de Marketing

`relatorios/inteligencia-marketing.json` usa UTF-8 e `schema_version: "1.0"`.
Campos obrigatórios:

- `source`: perfil/URL, data, período, cobertura e natureza `publica|privada|cliente`;
- `classification`: `primary_niche`, `secondary_tags` e justificativa;
- `insights[]`: `id`, `title`, `statement`, `evidence_type`, `evidence_ids`,
  `confidence`, `conditions`, `risks` e `applicable_channels`;
- `decisions[]`: `id`, `status`, `decision`, `when_to_use`, `when_not_to_use`
  e `based_on`;
- `experiments[]`: `id`, `status`, `hypothesis`, `duration_days`, `metric`,
  `stop_criteria` e `based_on`;
- `do_not_copy[]`, `privacy_review` e `promotion_eligibility`.

Status inicial de conclusão não testada é `HIPOTESE`. `ADOTADO` exige decisão
operacional explícita; `VALIDADO` e `REFUTADO` exigem resultado medido.

## Quadro mínimo de recomendação

| Prioridade | Achado | Ação | Esforço | Impacto | Métrica |
|---|---|---|---:|---:|---|
| P1 | Evidência | Mudança testável | B/M/A | B/M/A | Indicador em prazo definido |
