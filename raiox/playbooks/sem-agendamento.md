---
id: sem-agendamento
titulo: Sem agendamento
etapa: atender
oferta: atendimento
onda: 2
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 5
---

# Sem agendamento

## Sinal no diagnóstico
- O horário é combinado na conversa e some: o cliente chega e o horário não estava em lugar nenhum.

## Pré-requisitos do cliente
- Quem executa o serviço confirma a agenda real.
- Um calendário que o dono já usa, ou o caso se ainda não houver.

## Passo 0 — Linha de base
- Métrica: horarios_cumpridos | Unidade: horários | Como coletar: Contar horários marcados nos últimos 7 dias e quantos aconteceram.

## Passo a passo

### Passo 1 — Ver onde o horário se perde
- Tempo: 30 min
- Ferramenta: WhatsApp Business
- Como: Leia marcações recentes e anote as que não foram parar numa agenda.
- Prova: Nota no caso.

### Passo 2 — Escolher um só lugar da agenda
- Tempo: 20 min
- Ferramenta: Agenda do cliente
- Como: O dono aponta o calendário oficial. A CONFIRMAR NA PRIMEIRA EXECUÇÃO qual aplicativo ele já abre todo dia.
- Prova: Nome da agenda no caso.

### Passo 3 — Escrever o que a marcação precisa ter
- Tempo: 30 min
- Ferramenta: Caso no escritório
- Como: Nome, serviço, dia, hora e quem atende. Sem campo extra.
- Prova: Lista de campos no caso.

### Passo 4 — Reservar um horário de teste
- Tempo: 30 min
- Ferramenta: Agenda do cliente
- Como: Marque um horário interno e desmarque depois. Confira se quem atende viu.
- Prova: Nota de que as duas pessoas viram o mesmo horário.

### Passo 5 — Definir a confirmação
- Tempo: 20 min
- Ferramenta: WhatsApp Business
- Como: Uma frase confirma dia e hora. Não confirme o que não está na agenda.
- Prova: Frase no caso.

## Critério de pronto
- Existe uma agenda só.
- Um horário de teste foi visto por quem atende.

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. Escolha um calendário e pare de marcar em outro lugar.
2. Anote nome, serviço e hora.
3. Mande a confirmação só depois de gravar na agenda.

## Fica de fora
- Sistema novo de agenda.
- Pagamento antecipado.
- Robô de marcação.

## Riscos
- Duas agendas voltam a perder horário. A antiga deixa de receber marcação.

## Fontes
- https://faq.whatsapp.com/
