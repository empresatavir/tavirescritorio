---
id: whatsapp-lento
titulo: WhatsApp lento
etapa: conversar
oferta: atendimento
onda: 1
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 5
---

# WhatsApp lento

## Sinal no diagnóstico
- A empresa informou que a primeira resposta passa do horário combinado.

## Pré-requisitos do cliente
- WhatsApp Business no telefone do titular.
- Uma pessoa nomeada para responder no horário de funcionamento.

## Passo 0 — Linha de base
- Métrica: conversas_recebidas | Unidade: conversas | Como coletar: Contar conversas novas dos últimos 7 dias.
- Métrica: respostas_no_prazo | Unidade: conversas | Como coletar: Contar, nas mesmas conversas, quantas tiveram a primeira resposta dentro da janela combinada.

## Passo a passo

### Passo 1 — Medir a demora atual
- Tempo: 40 min
- Ferramenta: WhatsApp Business
- Como: Anote a hora da pergunta e a hora da primeira resposta nas conversas da semana. Sem apagar histórico.
- Prova: Tabela com as conversas da semana.

### Passo 2 — Definir a janela
- Tempo: 20 min
- Ferramenta: Caso no escritório
- Como: O dono escolhe a janela de primeira resposta dentro do horário da loja.
- Prova: Janela escrita no caso.

### Passo 3 — Gravar a mensagem de ausência
- Tempo: 30 min
- Ferramenta: WhatsApp Business
- Como: Siga a Central de Ajuda para a mensagem de ausência. A CONFIRMAR NA PRIMEIRA EXECUÇÃO o caminho na versão atual do aplicativo.
- Prova: Print da mensagem ativa.

### Passo 4 — Gravar a saudação
- Tempo: 20 min
- Ferramenta: WhatsApp Business
- Como: A saudação diz quem responde e qual é o próximo passo. Sem preço inventado.
- Prova: Print da saudação.

### Passo 5 — Nomear o responsável do turno
- Tempo: 20 min
- Ferramenta: Caso no escritório
- Como: Escreva quem responde e quem cobre a falta.
- Prova: Nomes no caso.

## Critério de pronto
- A janela de resposta está escrita.
- Saudação e ausência estão ativas no aplicativo do titular.

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. Conte quanto tempo você levou para responder ontem.
2. Escolha um prazo que caiba no seu horário.
3. Ative a mensagem de fora do expediente pela ajuda do WhatsApp.
4. Deixe o celular com quem responde.

## Fica de fora
- Robô.
- API da Meta.
- Disparo em massa.

## Riscos
- Mensagem automática no número pessoal mistura a loja com a vida do dono. Use o WhatsApp da empresa.

## Fontes
- https://faq.whatsapp.com/
- https://faq.whatsapp.com/smba/account-and-profile/about-away-messages
