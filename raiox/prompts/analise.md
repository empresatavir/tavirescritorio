Execute o Raio X assistido do caso `{{CASE_ID}}`.

Leia primeiro `_contexto/prompt.md`, os modelos em `_contexto/modelos/` e, se existir, `_contexto/nicho/`. O intake autorizado está em `analise/analysis-input.json` quando esse arquivo existir. Não copie conteúdo de cliente para o Git, logs, comentários de commit ou qualquer canal fora da pasta do caso.

Frentes desta rodada: {{FRENTES}}.
Nicho informado: {{NICHO}}.

Analise exclusivamente as fontes públicas informadas e não interaja com contas, atendentes, checkout, avaliações ou áreas autenticadas. Quando houver perfil do Instagram, use a skill `instagram-profile-audit` em `_contexto/skills/instagram-profile-audit` e grave a auditoria em `analise/instagram/`. Registre a quantidade exata de Requests RapidAPI consumidos (Chrome/gallery-dl = 0; requisições internas do gallery-dl = não mensuradas). Para sites use `web-platform-audit` e grave a auditoria em `analise/web/`. Para Google, Maps e presença orgânica use `seo-growth`. Não abra a página de resultados de busca do Google (`google.com/search`) por navegador, curl, `Invoke-WebRequest` ou qualquer automação: o Google responde com desafio (`google.com/sorry`, CAPTCHA) e a tentativa não pode ser repetida nem contornada. Para presença local, leia primeiro `analise/google/local-business.json` e `analise/google/local-business.md` quando existirem: o escritório já consultou a ficha do Google Maps (nota, número de avaliações, avaliações recentes e se o dono responde, horário, telefone, fotos, verificação e concorrentes próximos com nota e distância). Use esses dados como `observado`, com a fonte "Google Maps · ficha pública" e a data da coleta, e não repita a consulta no navegador. Se o arquivo disser `nao_encontrado`, confira os candidatos antes de concluir que a ficha não existe. Sem o arquivo, use apenas a ficha pública do Google Maps e o que o caso informar; registre posição orgânica, snippet e concorrentes na busca como `indisponivel` com a fonte "Busca orgânica do Google (sem API nesta rodada)", uma única vez, e siga. Se qualquer página mostrar CAPTCHA, verificação de robô ou bloqueio, pare naquela fonte, registre `indisponivel` e não tente de novo. Sintetize com `funil-vendas` e aplique `web-security` ao tratamento dos links. Revalide redirects e destinos antes de navegar. Consulte `_contexto/nicho/_INDEX.md` e a ficha do nicho; use itens existentes somente conforme status, evidência e condições. Dados deste caso vencem qualquer benchmark.

Diferencie em toda conclusão: observado, informado, inferido e indisponível. Não invente preço, promoção, estoque, depoimento ou capacidade. Não prometa faturamento, ranking ou prazo.

Não envie mensagem, não aprove documento e não altere arquivo fora da pasta do caso. A saída obrigatória desta rodada é só `analise/sugestoes.json`, com este formato e nada além dele:

```
{ "evidencias": [ { "stage": "encontrar|conversar|atender|vender|medir", "source": "", "claim": "", "classification": "observado|informado|inferido|indisponivel", "front": "", "gapIds": [], "url": "", "arquivo": "" } ], "hipoteses": [ { "gapId": "", "texto": "", "evidencias": [0] } ] }
```

`evidencias` dentro de cada hipótese são índices da lista `evidencias`. `gapIds` e `gapId` só podem ser ids da taxonomia do Escritório. Se uma ação exigir autorização adicional, registre a evidência como indisponível e pare essa ação. Quem decide é o Carlos, na tela do Raio-X.
