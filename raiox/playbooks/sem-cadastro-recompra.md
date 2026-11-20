---
id: sem-cadastro-recompra
titulo: Sem cadastro/recompra
etapa: medir
oferta: crescimento
onda: 3
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 5
---

# Sem cadastro/recompra

## Sinal no diagnóstico
- A empresa não sabe quem já comprou, então a próxima conversa começa do zero.

## Pré-requisitos do cliente
- Quem atende o cliente de novo.
- Um lugar já usado para anotar nome, mesmo que seja o caso.

## Passo 0 — Linha de base
- Métrica: clientes_recorrentes | Unidade: clientes | Como coletar: Contar, nos últimos 7 dias, quantos pedidos foram de alguém que já tinha comprado. Se não der para saber, registrar indisponível.

## Passo a passo

### Passo 1 — Ver o que se anota hoje
- Tempo: 30 min
- Ferramenta: WhatsApp Business
- Como: Confira se nome e última compra ficam em algum lugar. Não exporte a lista de contatos para o git.
- Prova: Nota do que existe, sem a lista de clientes.

### Passo 2 — Definir o mínimo do cadastro
- Tempo: 20 min
- Ferramenta: Caso no escritório
- Como: Campos: nome, o que comprou e quando voltar a chamar. Sem campo de documento.
- Prova: Campos no caso.

### Passo 3 — Escolher onde isso mora
- Tempo: 20 min
- Ferramenta: Agenda ou anotação do cliente
- Como: Use a ferramenta que o dono já abre. A CONFIRMAR NA PRIMEIRA EXECUÇÃO qual é.
- Prova: Nome da ferramenta no caso.

### Passo 4 — Registrar os próximos cinco
- Tempo: 40 min
- Ferramenta: Ferramenta escolhida
- Como: Os próximos cinco pedidos reais ganham os três campos. Pare em cinco.
- Prova: Contagem cinco, sem copiar os nomes para o repositório.

### Passo 5 — Combinar o retorno
- Tempo: 20 min
- Ferramenta: Caso no escritório
- Como: O dono diz em quantos dias faz sentido chamar de novo, se fizer.
- Prova: Prazo no caso, ou a decisão de não chamar.

## Critério de pronto
- Os três campos existem num lugar só.
- Cinco pedidos reais foram anotados lá.

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. Anote nome, o que a pessoa comprou e o dia.
2. Guarde isso onde você já olha todo dia.
3. Não comece uma planilha nova se você não for abrir.

## Fica de fora
- CRM.
- Disparo de recompra.
- Programa de pontos.

## Riscos
- Lista de clientes no repositório vaza dado. A lista fica só na ferramenta do dono.

## Fontes
- https://faq.whatsapp.com/
