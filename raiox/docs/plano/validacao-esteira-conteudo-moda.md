# Validação operacional — esteira de conteúdo para moda feminina

> Revisão de desenho concluída em 2026-08-22
>
> Veredito: **APROVADA PARA DESCOBERTA E SPIKES CONTROLADOS; BLOQUEADA PARA OPERAÇÃO REAL,
> AUTOMAÇÃO, SAAS E GPU.**

## 1. Escopo da validação

Esta revisão verifica se o plano `esteira-crescimento-conteudo.md` pode orientar a próxima rodada de
descoberta sem antecipar produto ou infraestrutura. Ela não substitui as cinco conversas, a aprovação
da Loja Piloto A, os spikes S0/S1/S2, o gate jurídico/LGPD nem o gate Meta do DarkFlow.

Não foram feitos contato externo, geração de imagem ou vídeo, upload, contratação de fornecedor,
provisionamento RunPod, publicação, anúncio ou uso de conta real.

## 2. Resultado da revisão

| Dimensão | Resultado | Evidência/limite |
|---|---|---|
| Oferta | aprovado | Raio-X, Ativação e Operação de Conteúdo permanecem ofertas separadas |
| Público inicial | aprovado | moda feminina; empresa identificada somente como `Loja Piloto A` no Git |
| Funil | aprovado com gate | cada lote exige hipótese, etapa, CTA e uma métrica-mãe previamente escolhida |
| Entrada de catálogo | aprovado com gate | cinco SKUs representativos e direitos de uso precisam existir antes do S1 |
| Personagem virtual | aprovado com gate | personagem original, adulta, versionada e aprovada em S0 antes de try-on |
| Imagem e vídeo | aprovado para spike | S1 mede fidelidade; S2 mede consistência; geração bruta não é sucesso |
| Unit economics | bloqueante | decisão usa custo por **asset aprovado**, incluindo tentativas e trabalho humano |
| RunPod | candidato, não autorizado | só entra depois de workflow provado e comparação econômica documentada |
| Publicação | trilha separada | DarkFlow/Meta mantém P1; piloto pode usar publicação humana documentada |
| Produto | bloqueado | cockpit depende de piloto pago; SaaS depende de três pilotos pagos e auditorias |
| Provinha | fora do escopo | menores e produto técnico exigem descoberta jurídica própria; nenhum ativo é compartilhado |

O desenho E0–E9 é coerente: cada etapa consome uma saída anterior, aprovação editorial é vinculada à
versão final, publicação não prova resultado comercial e o ciclo seguinte nasce da pior taxa observada.

## 3. Gates executáveis e evidência mínima

| Gate | Responsável | Evidência necessária | Falha fecha |
|---|---|---|---|
| V0 — desenho | Paula PM | este documento + plano mestre | alteração de escopo sem nova revisão |
| A — descoberta | Dora/Paula | cinco conversas concluídas e síntese sanitizada | menos de cinco conversas ou só opiniões futuras |
| B — piloto | Carlos + loja | pagador, aprovador, métrica-mãe, cinco SKUs e direitos confirmados | dado crítico ou direito de uso ausente |
| S0 — personagem | Marina + loja | ficha, prancha, proveniência, direitos, hashes e aprovação | aparência não adulta, inconsistência ou semelhança evidente |
| S1 — imagem | operador + loja | matriz cega, falhas, tentativas, tempo e custo por imagem aprovada | distorção comercial crítica da peça |
| S2 — vídeo | operador + loja | matriz de identidade/roupa/anatomia/flicker, tempo e custo por aprovado | perda de identidade ou fidelidade crítica |
| C0 — economia | Carlos | custo total por asset aprovado e teto aceito antes da proposta | custo desconhecido ou acima do teto |
| P1 — publicação | Auditor Seg/LGPD | gate DarkFlow liberado ou procedimento manual aprovado | automação Meta não auditada |
| D — piloto | Carlos + loja | piloto pago, debrief, capacidade e intenção de renovar | valor/cadência não sustentáveis |

Gate concluído significa evidência registrada, não resultado favorável. Reprovação permanece visível e
leva a `ajustar` ou `parar`; nunca libera silenciosamente a fase seguinte.

## 4. Protocolo das cinco conversas Mom Test

As conversas testam comportamento passado, não aceitação da ideia. Registros com PII ficam no workspace
privado; no Git entra apenas síntese anonimizada.

Perguntas-base, aprofundadas uma por vez:

1. Conte a última vez em que precisava publicar uma peça nova e não conseguiu no ritmo desejado.
2. Como a foto, o vídeo, a legenda, a aprovação e a postagem aconteceram naquela ocasião?
3. Quanto tempo de cada pessoa foi consumido e qual etapa precisou ser refeita?
4. O que você já tentou, contratou ou pagou para resolver isso? O que aconteceu?
5. Como percebe hoje que um conteúdo ajudou a gerar visita, conversa, pedido ou venda?
6. Quem aprova marca, produto e verba? Como foi a última decisão semelhante?
7. Quais cinco tipos de peça mais expõem problemas de foto, caimento ou velocidade?

Para cada conversa, registrar: episódio recente, frequência, workaround, custo/tempo informado, efeito
observável, pagador, aprovador, restrições de catálogo/direitos e força da evidência
`observado | informado | inferido | indisponível`.

**Gate A passa somente quando:** as cinco conversas estiverem concluídas; ao menos três relatarem um
episódio recente e recorrente com workaround ou custo concreto; e a Loja Piloto A confirmar pagador,
aprovador e disponibilidade para um piloto pago. Elogio, intenção futura ou “eu usaria” não contam.

## 5. Lote de prova e scorecard

Os cinco SKUs devem cobrir: peça lisa, estampa, textura, sobreposição e modelagem difícil. Cada SKU
recebe identificador interno, fotos licenciadas, variações relevantes, atributos que não podem mudar e
restrições comerciais. Material real não entra no Git.

Antes de rodar S1/S2, o responsável preenche os limiares sem conhecer os resultados. O scorecard por
asset registra:

- provedor, modelo/versão, parâmetros, tentativa e hash;
- fidelidade de cor, estampa, textura, logo, modelagem e detalhes críticos;
- identidade/anatomia; no vídeo, também flicker e continuidade;
- `aprovado | reprovado`, motivo e revisor;
- custo do provedor, tempo de máquina, tempo humano e retrabalho.

Fórmula canônica:

```text
custo por asset aprovado =
  (fornecedores + GPU + storage/transferência + pós-produção + trabalho humano do lote)
  / quantidade de assets aprovados
```

Relatar também taxa de aprovação na primeira rodada, tentativas por aprovado e tempo de ciclo. Custo por
geração bruta, quantidade produzida, curtidas ou seguidores isolados não aprovam o piloto.

## 6. Experimento de crescimento

Cada `content_batch` contém uma hipótese, uma etapa do funil, um CTA e uma métrica principal. A
métrica é escolhida com a loja antes do lote entre tempo economizado, visitas qualificadas, conversas
ou pedidos; venda só entra quando houver atribuição disponível, sem promessa causal.

O primeiro ciclo registra baseline e executa uma única hipótese por vez. A leitura semanal decide
`continuar | ajustar | parar`, comparando a pior taxa do funil. Benchmarks externos permanecem
`[PREMISSA]` e são substituídos pelos dados próprios assim que existirem.

## 7. Fronteiras técnicas confirmadas

- RunPod não recebe worker, imagem de container, endpoint ou GPU antes de S1/S2 comprovarem workflow e
  C0 aprovar o custo por asset.
- O Raio-X não ganha editor, scheduler, publicador ou portal de cliente nesta fase.
- DarkFlow continua dono de edição em massa e publicação oficial. Enquanto P1 estiver aberto, a
  postagem é manual/assistida, com mídia, legenda, conta, data e CTA aprovados juntos.
- Nenhum asset, personagem, contrato ou conclusão deste piloto pode ser reutilizado em `Provinha`.
- Mudança para pessoa real, menor, clonagem de rosto/voz ou nova finalidade reabre jurídico, direitos,
  consentimento, DPA/LGPD e segurança antes de qualquer geração.

## 8. Decisão

O plano está validado como **roteiro operacional de descoberta e prova**, não como autorização de
produção. A próxima ação é executar Gate A. Só depois seguem cinco SKUs, S0, S1, S2 e C0. SaaS/GPU
permanece explicitamente fora da ordem; publicação manual é o fallback do piloto enquanto P1 estiver
aberto.
