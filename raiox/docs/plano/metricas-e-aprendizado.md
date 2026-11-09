# Métricas internas e aprendizado

## Eventos mínimos

| Evento | Propriedades sem PII | Uso |
|---|---|---|
| `telegram_started` / `telegram_qualified` | canal, nicho, atuação | mede entrada e qualificação |
| `form_link_sent/opened/started/submitted` | case, versão, origem, etapa | mede abandono e fricção |
| `authorization_requested/granted/denied/expired` | ação, categoria de dado, motivo | mede gargalos e respeito a consentimento |
| `analysis_started/completed/failed` | fonte, tipo, duração, classe de erro | mede confiabilidade da esteira |
| `documents_generated/reviewed/approved` | versão, revisão, motivo de ajuste | mede qualidade editorial |
| `email_sent/delivered/bounced` | provedor, tipo, versão | mede entrega, sem e-mail em claro no log |
| `debrief_booked/proposal_created/accepted/pilot_outcome` | etapa, faixa/resultado agregado | mede valor comercial do diagnóstico |

## Painel semanal

1. **Conclusão:** qualificados → formulário submetido → autorização → documentos enviados.
2. **Tempo:** mediana por etapa e tempo total do case.
3. **Confiabilidade:** falhas por fonte, reprovação, retrabalho editorial e causas de bloqueio.
4. **Valor percebido:** debrief marcado, proposta, piloto e retorno qualitativo codificado.
5. **Privacidade:** recusas de consentimento, expirações e operações bloqueadas — sinal de saúde,
   não “perda a corrigir”.

Cada métrica deve ter denominador, período e definição estável. Não comparar poucos cases como se
fossem evidência de causalidade.

## Métricas por cliente, somente como baseline

As métricas de crescimento variam por negócio: pedidos/origem, tempo até primeira resposta,
clique de catálogo → conversa, ações no Maps, avaliações respondidas, recompra e CSAT/CES
consentido. O relatório registra disponibilidade e baseline; não inventa taxa nem atribui receita
à TAVIR sem rastreio.

## Pesquisa de satisfação e reputação

Após uma compra real, a empresa pode enviar, com opt-in, pergunta curta: “Foi fácil resolver o que
você precisava hoje?” + escala e campo aberto. Problemas recebem recuperação privada. Um convite a
avaliar publicamente é opcional, neutro e não condicionado a nota. É proibido filtrar clientes para
obter apenas avaliações positivas, compensar avaliações ou fabricar depoimentos.

## Ritual de aprendizado

Ao fechar cada case: registrar hipótese, ação escolhida, evidência, resultado, falha e decisão
`manter / ajustar / parar`. Após cinco cases, revisar perguntas, critérios de autorização, catálogo
de fontes e modelo de documento antes de ampliar a automação.
