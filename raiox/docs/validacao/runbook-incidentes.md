# Roteiro de incidentes do Raio-X (rascunho)

G-PR1 controle 9. Rascunho operacional: o código escreveu, o Carlos ensaia e o advogado define o
acionamento jurídico. Sem dado de cliente neste arquivo: o registro de cada incidente real fica
fora do git (seção «Evidência»).

Até o CP-10 nada é aplicado no Supabase real sem o Carlos (R5). Os comandos SQL abaixo são para
rodar **junto do Carlos**, no SQL Editor do projeto, trocando `<case_id>` pelo id do caso.

## Ordem em qualquer incidente

1. **Conter**: parar o vazamento antes de entender tudo (seções abaixo).
2. **Registrar**: abrir o registro do incidente (modelo em «Evidência») com horário de quando
   foi percebido e o que já foi feito.
3. **Avaliar**: quais casos, quais dados, quantos titulares, se o dado saiu do nosso controle.
4. **Acionar**: advogado quando houver dado pessoal fora do controle (seção «Acionamento
   jurídico»).
5. **Fechar**: causa, correção, teste que impede a volta e data de encerramento.

Quem conduz: o Carlos. Nenhum agente ou motor fecha incidente, apaga evidência ou fala com o
titular.

## 1. E-mail enviado ao endereço errado

Sinal: titular diz que não recebeu; retorno de e-mail; caso com e-mail digitado errado.

Conter:
- Se o e-mail tinha **link de formulário**: fechar os links do caso (SQL abaixo). O link perde o
  valor na hora; o titular certo recebe um link novo depois que o e-mail for corrigido.
- Se tinha **link de confirmação**: corrigir o e-mail do caso. O gatilho do controle 4 apaga a
  confirmação e todo token antigo fica sem uso.
- Se tinha **documento entregue** (PDF): não dá para recolher. Pedir ao destinatário errado, por
  escrito, que apague e confirme; guardar a resposta. Isso é dado fora do controle: acionar o
  advogado.

```sql
update public.raiox_form_sessions set status = 'revoked'
 where case_id = '<case_id>' and status = 'open';
update public.raiox_email_verifications set used_at = now()
 where case_id = '<case_id>' and used_at is null;
```

Avaliar: o que o e-mail continha (só link, link + nome da empresa, documento).

Evitar a volta: o e-mail só é usado depois de confirmado (controle 4); a entrega recusa sem
confirmação.

## 2. Link de formulário vazado

Sinal: link aparece em grupo, print, encaminhamento; acesso de origem estranha; tentativas
erradas acumuladas.

Conter: fechar os links do caso (mesmo SQL da seção 1). O banco guarda só o hash do token, então
o link vazado deixa de abrir assim que a sessão sai de `open`. Trocar `FORM_LINK_SIGNING_SECRET`
**não** fecha links já emitidos; só muda os próximos.

Avaliar: se houve envio pelo link vazado (respostas novas no caso depois do horário do
vazamento). Resposta enviada por terceiro é dado de qualidade duvidosa: marcar no caso e não
analisar até falar com o titular.

Retomar: novo link só para o e-mail confirmado do caso.

## 3. Telegram comprometido

O Telegram recebe só o código do caso (`notify-dora`), nunca nome, e-mail ou resposta. Ainda
assim, quem tem o token do bot pode mandar mensagem como se fosse o Escritório.

Conter:
1. No BotFather: revogar o token do bot (`/revoke`) e gerar outro.
2. Gravar o token novo em `TELEGRAM_BOT_TOKEN` nos segredos das funções do Supabase.
3. Conferir quem está no chat de `TELEGRAM_CEO_CHAT_ID`; remover quem não deveria.
4. Se o celular ou a conta do Carlos foi o ponto de entrada: encerrar as outras sessões do
   Telegram nas configurações da conta.

Avaliar: mensagens enviadas pelo bot no período (o histórico do chat mostra). Código de caso
sozinho não identifica titular.

## 4. Rotação de segredos

Quando: suspeita de vazamento, saída de alguém com acesso, segredo visto em log, print ou
commit, ou a cada 6 meses.

| Segredo | Onde fica | Quem usa | Efeito da troca |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (gerado) | funções do Supabase | trocar no painel (API keys) e regravar na Vercel |
| `SUPA_SERVICE_ROLE_KEY` | Vercel | formulário (`/api`) e cron | regravar com a chave nova e publicar |
| `FORM_LINK_SIGNING_SECRET` | segredos das funções | `create-case`, `continue-case` | links novos só; os antigos seguem até fechar (seção 2) |
| `RAIOX_INTERNAL_GATE_SECRET` | segredos das funções + máquina do Carlos | `create-case`, `continue-case` | trocar nos dois lados juntos |
| `RAIOX_INVITE_GATE_SECRET` | segredos das funções + Escritório | `invite-case` | trocar nos dois lados juntos |
| `RAIOX_REVIEW_GATE_SECRET` | segredos das funções + Escritório | `review-case` | trocar nos dois lados juntos |
| `RAIOX_DELIVERY_GATE_SECRET` | segredos das funções + Escritório | `delivery-case` | trocar nos dois lados juntos |
| `RAIOX_OFFICE_SYNC_SECRET` | segredos das funções + Escritório (Configurações › Raio-X Supabase) | `office-raiox-sync` | sync para até trocar no Escritório |
| `RAIOX_WEBHOOK_SECRET` | segredos das funções + Database Webhook | `notify-dora` | trocar na função e no cabeçalho do webhook |
| `TELEGRAM_BOT_TOKEN` | segredos das funções | `notify-dora` | seção 3 |
| `RESEND_API_KEY` | Vercel | e-mail de confirmação | apagar a chave antiga no painel do Resend |
| `CRON_SECRET` | Vercel | `/api/cron/supabase-health` | só regravar |
| Chave da RapidAPI | cofre do Escritório (`rapidapi_local`) | ficha do Google na análise | apagar a antiga no painel da RapidAPI |
| Chaves dos motores | conta de cada motor | análise e redação | trocar na conta; nunca passam pelo caso |

Regras da troca:
- Segredo novo com pelo menos 32 caracteres aleatórios; um segredo por função, nunca repetido.
- Segredo nunca vai em chat, issue, commit, print ou log; em relatório, sempre mascarado.
- Depois de trocar: rodar um sync e o `supabase-health`; um 401 mostra o lado que ficou velho.
- Segredo que apareceu em commit: trocar é obrigatório. Apagar do histórico não basta.

## 5. Incidente em fornecedor

Fornecedores: os de `raiox/fornecedores.json` (Vercel, Supabase, Telegram, Resend, RapidAPI e os
motores). Cada caso diz quais tocou (cartão «Serviços que tocaram este caso»).

Conter:
1. Ler o aviso do fornecedor: que dado, que período, se já foi contido.
2. Trocar os segredos daquele fornecedor (seção 4).
3. Se o fornecedor guarda dado de caso (Supabase, Resend, motores): parar novos casos naquele
   serviço até entender o alcance. No Supabase, isso é não emitir convites e não sincronizar.

Avaliar: cruzar o período do aviso com os casos que usaram o fornecedor (campo `vendors` do
caso: primeiro e último uso).

## Contenção rápida (tudo de uma vez)

Para quando não dá para saber ainda o alcance:
- não emitir convite nem rodar análise ou entrega;
- fechar os links abertos de todos os casos ativos (SQL da seção 1 sem o filtro de caso, só com
  o Carlos);
- trocar `RAIOX_INTERNAL_GATE_SECRET`, `RAIOX_INVITE_GATE_SECRET` e `RAIOX_DELIVERY_GATE_SECRET`
  sem atualizar o Escritório: as funções passam a recusar tudo até a volta;
- `RAIOX_EMAIL_ENABLED` fora de `1` na Vercel: nenhum e-mail sai.

## Evidência

O registro de incidente real fica fora do git, em
`%APPDATA%/<app>/raiox/incidentes/<AAAA-MM-DD>-<curto>.md`, com:

- quando foi percebido, por quem e como;
- linha do tempo do que foi feito (horário e ação);
- casos afetados (só o código do caso, `RX-…`), dados envolvidos e número de titulares;
- prints e respostas de fornecedor, com segredo mascarado;
- decisão sobre acionar o advogado e o titular, com data;
- causa, correção e o teste que impede a volta.

Não apagar logs, linhas do banco ou mensagens que sirvam de prova antes de copiar para o
registro. Expurgo de caso envolvido em incidente (botão «Expurgar caso», controle 7) só depois do
registro fechado.

## Acionamento jurídico

Acionar o advogado no mesmo dia quando houver dado pessoal fora do nosso controle: documento ou
resposta em mãos de terceiro, banco ou fornecedor com acesso indevido, segredo do banco vazado.

O advogado decide (pendente de definição):
- se e como comunicar o titular;
- se e quando comunicar a ANPD (comunicação de incidente de segurança);
- o texto de cada comunicação e o que guardar como prova.

Contato do advogado: `[A PREENCHER]` (Carlos).

## Ensaio

Um ensaio com caso fictício, feito pelo Carlos, antes do piloto real. Sugestão: seção 2 (link
vazado) + seção 4 para `RAIOX_OFFICE_SYNC_SECRET`, porque exercita banco, função e Escritório.

| Data | Cenário | Quem | Tempo até conter | O que travou | Ajuste no roteiro |
|---|---|---|---|---|---|
| `[A PREENCHER]` | | Carlos | | | |

## Pendências

- Carlos: ensaio registrado acima; contato do advogado; conferir quem tem acesso aos painéis
  (Supabase, Vercel, Resend, Telegram, RapidAPI).
- Advogado: critério e prazo de comunicação ao titular e à ANPD; textos.
