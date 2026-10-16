# Contrato editorial compartilhado

Cada peça mantém estes campos. O conteúdo pode ser Markdown, YAML ou JSON, desde que preserve o
significado e IDs estáveis.

| Campo | Regra |
|---|---|
| `cycle_id` | ciclo de campanha, por exemplo `TAVIR-C01` |
| `content_id` | ideia-mãe estável, por exemplo `TAVIR-C01-P03` |
| `variant_id` | variante de canal, por exemplo `TAVIR-C01-P03-IG-R01` |
| `channel` | exatamente `instagram`, `linkedin` ou `youtube` |
| `format` | formato nativo do canal; não usar “post” genérico |
| `funnel_stage` | `awareness`, `consideration`, `decision` ou `retention` |
| `audience_job` | situação/problema que o público tenta resolver |
| `one_idea` | uma única tese ou transformação por peça |
| `hook` | abertura nativa do canal |
| `proof_class` | `fact`, `goal`, `offer_condition` ou `hypothesis` |
| `proof_source` | arquivo/URL/evidência; obrigatório para afirmação verificável |
| `cta` | próximo passo real, compatível com a etapa do funil |
| `metric` | uma métrica primária e, no máximo, duas de diagnóstico |
| `experiment` | hipótese, baseline, janela e critério de decisão |
| `brand_pack_ref` | caminho/URL da versão aprovada do Brand Context Pack; obrigatório antes de prompt visual ou produção |
| `brand_pack_status` | `approved`, `pending` ou `blocked`; `pending`/`blocked` impedem mídia e agendamento |
| `rights` | origem/licença de logo, foto, áudio, voz e pessoa retratada |
| `ai_disclosure` | `not_required`, `required`, `pending_review` + justificativa |
| `status` | estado do workflow abaixo |

## Estados

`idea → drafted → editorial_review → brand_review → approved_for_production → produced → qa_approved → scheduled → published → measured`

- Pular estado exige justificativa e responsável.
- `approved_for_production` não autoriza publicar.
- `qa_approved` confirma conteúdo, visual, acessibilidade, direitos e disclosure.
- Somente `published` pode receber métricas públicas reais.
- Peça cancelada usa `cancelled` com motivo; não é apagada para esconder teste.

## Gate antes de produção

- uma ideia principal;
- fato/meta/hipótese/condição classificados;
- prova localizável;
- CTA compatível com a oferta vigente;
- nenhum número, depoimento ou tela inventado;
- adaptação nativa do canal;
- Brand Context Pack aprovado, com ativo oficial e responsável identificados;
- nenhuma pendência `[PRECISA ESCLARECER]`.

## Gate antes de agendar

- texto e mídia finais correspondem ao `variant_id`;
- aplicação confere com o Brand Context Pack: logo oficial, tokens, tipografia, voz, direção e proibições;
- ortografia e texto dentro da arte conferidos manualmente;
- área segura, contraste, legenda e alt text quando suportado;
- áudio, imagem, voz e likeness com direitos registrados;
- disclosure de IA revisado conforme a plataforma;
- data, fuso, conta e CTA conferidos pelo responsável;
- aprovação humana explícita registrada.
