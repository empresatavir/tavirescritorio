---
id: nao-mede
titulo: Não mede nada
etapa: medir
oferta: crescimento
onda: 3
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 4
---

# Não mede nada

## Sinal no diagnóstico
- O dono não tem um número da semana: nem conversa, nem pedido, nem visita.

## Pré-requisitos do cliente
- Acesso de leitura ao canal principal e, se existir, ao perfil público.
- Alguém que repete a contagem.

## Passo 0 — Linha de base
- Métrica: conversas_recebidas | Unidade: conversas | Como coletar: Contar as conversas novas dos últimos 7 dias no canal principal.
- Métrica: pedidos | Unidade: pedidos | Como coletar: Contar os pedidos fechados nos mesmos 7 dias.
- Métrica: visitas_perfil | Unidade: visitas | Como coletar: Anotar as visitas do perfil no mesmo período. Se o painel não mostrar, registrar indisponível.

## Passo a passo

### Passo 1 — Escolher o período
- Tempo: 15 min
- Ferramenta: Caso no escritório
- Como: Fixe sete dias corridos. Não mude o recorte no meio da contagem.
- Prova: Datas de início e fim no caso.

### Passo 2 — Contar conversas
- Tempo: 30 min
- Ferramenta: WhatsApp Business ou Instagram
- Como: Conte conversas novas no canal principal. Não conte status nem grupo alheio.
- Prova: Número de conversas_recebidas no caso.

### Passo 3 — Contar pedidos
- Tempo: 30 min
- Ferramenta: Canal do pedido
- Como: Conte só pedido que a empresa aceitou cumprir. Orçamento sem aceite não entra.
- Prova: Número de pedidos no caso.

### Passo 4 — Ler visitas se existirem
- Tempo: 20 min
- Ferramenta: Painel do perfil
- Como: Anote o número que o painel mostrar. Se não mostrar, escreva indisponível. A CONFIRMAR NA PRIMEIRA EXECUÇÃO onde o painel exibe o número.
- Prova: Número ou indisponível no caso.

### Passo 5 — Marcar a próxima contagem
- Tempo: 15 min
- Ferramenta: Agenda do cliente
- Como: A mesma pessoa repete as três contagens daqui a 30 dias.
- Prova: Data e nome no caso.

## Critério de pronto
- As três métricas-base estão no caso para o período de 7 dias.
- A repetição em 30 dias tem dono e data.

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. Conte as conversas da última semana.
2. Conte os pedidos que você aceitou.
3. Anote o número numa nota e a data de olhar de novo.

## Fica de fora
- Ferramenta nova de analytics.
- Meta de crescimento.
- Anúncio.

## Riscos
- Número estimado entra como se fosse contado. O que não deu para ver fica indisponível.

## Fontes
- https://faq.whatsapp.com/
- https://help.instagram.com/
- https://support.google.com/business/
