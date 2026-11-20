---
id: sem-canal-pedido
titulo: Sem canal de pedido
etapa: vender
oferta: catalogo
onda: 2
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: 6
---

# Sem canal de pedido

## Sinal no diagnóstico
- O cliente pergunta o que tem e o preço, e a resposta muda de pessoa para pessoa.

## Pré-requisitos do cliente
- Lista de itens que o dono vende hoje, com preço.
- O WhatsApp ou a página que vai receber o pedido.

## Passo 0 — Linha de base
- Métrica: pedidos | Unidade: pedidos | Como coletar: Contar pedidos fechados nos últimos 7 dias.

## Passo a passo

### Passo 1 — Fechar a lista de itens
- Tempo: 50 min
- Ferramenta: Caso no escritório
- Como: Escreva item e preço que o dono confirma. O que não tem preço fica de fora da lista.
- Prova: Lista no caso.

### Passo 2 — Nomear quem atualiza
- Tempo: 15 min
- Ferramenta: Caso no escritório
- Como: Uma pessoa fica responsável por mudar preço.
- Prova: Nome no caso.

### Passo 3 — Escolher o destino do pedido
- Tempo: 20 min
- Ferramenta: Caso no escritório
- Como: Um destino só: conversa no WhatsApp da empresa ou uma página já existente.
- Prova: Destino escrito.

### Passo 4 — Montar a mensagem de pedido
- Tempo: 40 min
- Ferramenta: WhatsApp Business
- Como: A mensagem mostra itens, preço e como a pessoa pede. A CONFIRMAR NA PRIMEIRA EXECUÇÃO o recurso de mensagem pronta na versão atual.
- Prova: Mensagem salva e testada.

### Passo 5 — Ensaiar um pedido
- Tempo: 30 min
- Ferramenta: WhatsApp Business
- Como: Peça a alguém de fora da operação para fazer um pedido de teste e cancele em seguida.
- Prova: Nota do teste no caso.

## Critério de pronto
- A lista tem item, preço e um destino.
- Um pedido de teste chegou nesse destino.

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. Escreva o que você vende e o preço num único recado.
2. Mande esse recado para o seu próprio WhatsApp.
3. Veja se dá para pedir sem ligar.

## Fica de fora
- Loja com estoque e frete.
- Gateway de pagamento.
- Catálogo de outra marca.

## Riscos
- Preço desatualizado gera pedido que a loja não honra. Quem atualiza está nomeado.

## Fontes
- https://faq.whatsapp.com/
