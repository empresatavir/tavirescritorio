---
title: "Teoria do Prospecto"
aliases: ["prospect theory", "teoria dos prospectos"]
domain: psicologia
subdomain: decisao
source: "Thinking Fast and Slow — Daniel Kahneman"
source_type: livro
importance: 10
tags: [decisao, comportamento, economia-comportamental, frameworks, pricing]
related: [[sistema1-sistema2]], [[aversao-a-perda]], [[efeito-posse]], [[prospect-theory-framework]], [[narrow-framing]]
created: 2026-05-25
updated: 2026-05-25
status: completo
---

# Teoria do Prospecto

## Definição
Um modelo descritivo que explica como as pessoas tomam decisões sob condições de risco e incerteza. Diferente da teoria clássica da utilidade esperada (que assume racionalidade ideal), a Teoria do Prospecto demonstra que os humanos avaliam resultados não pelo estado de riqueza final, mas por ganhos e perdas em relação a um ponto de referência.

## Mecanismo
Desenvolvida por Daniel Kahneman e Amos Tversky em 1979 (trabalho que rendeu o Nobel de Economia em 2002), a teoria baseia-se em três propriedades psicológicas fundamentais representadas por uma curva de valor em formato de S (assimétrica):

```
                     Valor Psicológico (+)
                              ^
                              |       .--- Ganhos (Concavo: aversão ao risco)
                              |      /
                              |     /
                              |    /
                              |   /
     - Perdas ----------------+---------------------> Mudança de Riqueza
            \                 | (Ponto de Referência)
             \                |
              \               |
               \              |
                \             |
                 |            |
                 '---         |
                     Losses   v
             (Convexo: risco) Valor Psicológico (-)
```

### 1. Ponto de Referência
Os resultados são codificados como ganhos (positivos) ou perdas (negativos) em relação a um marco inicial, que geralmente é o *status quo* atual (a riqueza ou estado do momento). Um ganho de R$ 1.000 é avaliado de forma diferente por quem está quebrado vs. quem tem R$ 1 milhão, pois seus pontos de referência diferem.

### 2. Sensibilidade Decrescente (Diminishing Sensitivity)
A percepção de valor diminui à medida que nos afastamos do ponto de referência.
- A diferença subjetiva entre ganhar R$ 100 e R$ 200 é muito maior do que a diferença entre ganhar R$ 900 e R$ 1.000.
- A curva é **côncava no domínio dos ganhos** (induzindo à aversão ao risco para proteger o ganho garantido) e **convexa no domínio das perdas** (induzindo à busca por risco para evitar uma perda certa).

### 3. Aversão à Perda (Loss Aversion)
A curva de valor é significativamente mais íngreme para perdas do que para ganhos. O impacto psicológico de uma perda de R$ 100 é aproximadamente o dobro da atratividade de um ganho de R$ 100.

### O Padrão de Quatro Vias (Fourfold Pattern)
A Teoria do Prospecto descreve como a combinação de probabilidades e atitudes frente a perdas e ganhos gera quatro comportamentos padrão:

| Probabilidade | Ganhos (Gains) | Perdas (Losses) |
|---|---|---|
| **Alta** (ex: 95%) | **Aversão ao Risco** (Aceita sure thing menor)<br>*Medo de decepção.* | **Busca pelo Risco** (Rejeita sure loss menor)<br>*Esperança de evitar a perda.* |
| **Baixa** (ex: 5%) | **Busca pelo Risco** (Loteria/Apostas)<br>*Esperança de ganho grande.* | **Aversão ao Risco** (Seguros)<br>*Medo de ruína.* |

## Aplicações Práticas

### Em Precificação e Estrutura de Ofertas
- **Segmente os Ganhos, Agregue as Perdas**:
  - Se você oferece múltiplos bônus em uma venda, apresente-os de forma separada (segmentada) em momentos diferentes do fluxo de vendas. Por sensibilidade decrescente, receber 3 presentes de R$ 10 separados gera mais felicidade do que 1 presente de R$ 30.
  - Ao cobrar taxas ou custos adicionais, apresente-os todos consolidados em uma única fatura. Pagar R$ 100 uma vez dói muito menos do que pagar R$ 10 dez vezes seguidas.
- **Transforme Perda em Custo**: As pessoas aceitam pagar um "custo" (ex: taxa de adesão, assinatura) muito mais facilmente do que sofrer uma "perda" (ex: pagar uma multa). Mude a linguagem das cobranças.

## Contra-indicações
- **Não ignore o Ponto de Referência do Cliente**: Se o seu cliente atual está acostumado a pagar R$ 10 por um serviço, tentar vender um plano de R$ 100 sem alterar drasticamente o ponto de referência (redefinindo o valor percebido do produto) ativará a convexidade das perdas de forma violenta, resultando em rejeição total.

## Exemplos Canônicos
- **O Experimento das Vidas Humanas (Problema de Doença Asiática)**:
  Imagine que um país se prepara para o surto de uma doença que deve matar 600 pessoas. Dois programas são propostos:
  - **Frame de Ganhos**:
    - Programa A: 200 pessoas serão salvas (garantido). [72% escolhem]
    - Programa B: 1/3 de probabilidade de salvar 600 e 2/3 de salvar ninguém. [28% escolhem]
  - **Frame de Perdas**:
    - Programa C: 400 pessoas vão morrer (garantido). [22% escolhem]
    - Programa D: 1/3 de probabilidade de que ninguém morra, e 2/3 de que 600 pessoas morram. [78% escolhem]
  
  Matematicamente, A é idêntico a C, e B é idêntico a D. No entanto, quando apresentados em termos de "vidas salvas" (ganhos), as pessoas evitam o risco (escolhem A). Quando apresentados em termos de "mortes" (perdas), as pessoas buscam o risco (escolhem D). O frame altera o ponto de referência.

## Conexões
- [[sistema1-sistema2]] — as respostas emocionais às perdas e ganhos são geradas automaticamente pelo S1; o S2 racionaliza a decisão a posteriori.
- [[aversao-a-perda]] — a aversão à perda é o fator multiplicador do eixo das perdas na teoria.
- [[prospect-theory-framework]] — o framework estratégico de aplicação prática deste modelo mental em SaaS, marketing e vendas.
- [[narrow-framing]] — como a aversão à perda da teoria do prospecto paralisa decisões individuais em enquadramento estrito.

## Fonte
> "Our model of choice, Prospect Theory, differs from utility theory in that the carriers of value are not states of wealth but changes of wealth—gains and losses."

**Referência:** Thinking Fast and Slow — Daniel Kahneman | Part 4 | p. 270–281
