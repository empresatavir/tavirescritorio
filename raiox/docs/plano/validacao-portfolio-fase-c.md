# Validação do portfólio TAVIR — Fase C

> Atualizado em 2026-08-23 · Dono: Paula PM · Card: `validar-portfolio-ta`
>
> Placar sanitizado. Identidade, intake e documentos dos cases permanecem no workspace privado
> ignorado pelo Git. Cases sintéticos, técnicos e reprocessamentos da mesma empresa não contam como
> diagnóstico de mercado.

## Critério de conclusão

O card só pode ser concluído quando houver, com evidência:

1. de 3 a 5 empresas distintas com Raio-X assistido concluído;
2. debrief e resultado `proposta emitida | não emitir`, com motivo, em cada case;
3. funil diagnóstico → proposta → fechamento medido;
4. prazo e esforço/custo registrados por case, permitindo calcular margem quando houver receita;
5. primeiro piloto **pago** de Presença Local + Atendimento contratado;
6. escopo revisado a partir dos padrões observados, antes de tiers ou combos.

## Placar auditado

Data de corte: 2026-08-23.

| Indicador | Resultado confirmado | Meta/gate | Veredito |
|---|---:|---:|---|
| Raio-X reais distintos com documentos e revisão | 2 | 3–5 | aberto |
| Raio-X com entrega recebida comprovada | 1 | acompanhar, não substitui diagnóstico | parcial |
| Diagnóstico → proposta | 0/2 confirmados (0%) | medir todos | aberto |
| Proposta → fechamento | não calculável: 0 propostas comprovadas | medir propostas | aberto |
| Piloto pago Presença Local + Atendimento | 0 | 1 | aberto |
| Margem por case/piloto | indisponível: preço, horas e custos não conciliados | registrar por case | aberto |

### Evidência sanitizada por rodada

| Rodada | Evidência válida | Estado comercial | Contagem |
|---|---|---|---:|
| D01 | empresa distinta; relatório e plano produzidos; R1 aprovado | sem entrega, proposta ou pagamento comprovados | 1 |
| D02 | empresa distinta; relatório e plano produzidos; R1 aprovado na rodada 2; entrega enviada e recebida | sem proposta ou pagamento comprovados | 1 |
| S01 | E2E sintético interno | excluído: não é mercado | 0 |
| T01 | case técnico de integração | excluído: não é mercado | 0 |

Os diretórios privados mostram outras execuções, mas não autorizam inflar a amostra: duas possuem
identidades reais distintas e artefatos revisados; as demais são prova técnica/sintética ou não têm
evidência suficiente para entrar no funil comercial.

## Prazo e qualidade da medição

- D01 registra preparo em `2026-08-07T14:05:18.618Z` e aprovação em
  `2026-08-12T08:25:25`, mas o timestamp de aprovação não declara fuso.
- D02 registra preparo em `2026-08-22T23:57:06.561Z`, aprovação/fechamento local em
  `2026-08-23T03:24:41` e envio aceito em três segundos.
- Os timestamps misturam UTC explícito e horário sem offset. Por isso não são comparados como SLA
  nem usados para estimar margem. A próxima rodada deve registrar `started_at`, `ready_at`,
  `approved_at`, `debrief_at` e `proposal_at` em ISO 8601 com offset.

## Padrões observados até aqui

1. Presença Local apareceu como primeira intervenção nos dois diagnósticos: encontrabilidade,
   informação operacional canônica e rota clara até o contato.
2. CTA/WhatsApp apareceu como elo crítico, mas o atendimento real não foi auditado. Isso sustenta
   investigar o combo; ainda não prova fit nem valor do módulo Atendimento.
3. A devolutiva documental existe, porém o handoff para decisão comercial não está registrado.
   O pior elo medido hoje é **diagnóstico → proposta**, atualmente 0/2 confirmados.
4. O escopo deve permanecer modular. Não há amostra para tiers, desconto ou nome de combo.

## Próximo experimento obrigatório

**Hipótese:** uma devolutiva curta, com Presença Local como prioridade e uma pergunta explícita de
compromisso, gera decisão comercial registrável sem entregar um manual de implantação gratuito.

**Métrica primária:** diagnósticos com decisão `proposta emitida | não emitir` ÷ diagnósticos
concluídos. **Janela:** próximos 1–3 cases, até totalizar 3–5 empresas distintas.

Para cada próximo case, o operador registra no fechamento:

```text
case_ref_sanitizado:
conversa_origem:
started_at / ready_at / approved_at / debrief_at / proposal_at: ISO 8601 com offset
horas_humanas:
custo_direto:
prioridade_reconhecida: sim | não
decisao_comercial: proposta emitida | não emitir
motivo:
oferta:
valor_proposto:
fechamento: ganho | perdido | em decisão
valor_fechado:
margem_bruta: (valor_fechado - custo_direto) / valor_fechado
resultado_30d:
```

O card `motor-conversas` continua dono da cadência de prospecção e da origem das conversas; este
card consome somente conversas reais autorizadas e mede o que acontece depois. Nenhuma nova LP,
dashboard, automação, tier ou combo deve ser construída nesta fase.

## Bloqueio do piloto pago

Não há contraparte, proposta aceita ou pagamento comprovado no workspace. Além disso, o TAVIR
Atendimento ainda não está comercialmente liberado: o E2E Meta Cloud API depende do Sprint 3 e a
venda com Evolution permanece bloqueada por revisão OAB e pelo gate pré-venda. Portanto:

- Presença Local pode ser proposta após descoberta e `/orcar`;
- Atendimento só entra no piloto com canal e capacidade efetivamente liberados;
- não substituir o módulo bloqueado por promessa, demo ou canal não homologado;
- não marcar o card como concluído até contrato/aceite e pagamento real do piloto.

## Decisão

`validar-portfolio-ta` permanece **aberto**. Faltam 1–3 diagnósticos válidos, debrief/proposta nos
cases, medição de prazo/custo/margem e o primeiro piloto pago. O card não deve acionar Fase D.
