---
title: "Heurística de Representatividade"
aliases: ["representativeness heuristic", "heurística da representatividade", "viés de representatividade", "falácia da conjunção"]
domain: psicologia
subdomain: decisao
source: "Thinking Fast and Slow — Daniel Kahneman"
source_type: livro
importance: 10
tags: [decisao, comportamento, viés, cognição, estatistica]
related: [[sistema1-sistema2]], [[wysiati]], [[vies-de-confirmacao]], [[efeito-isca]]
created: 2026-05-25
updated: 2026-05-25
status: completo
---

# Heurística de Representatividade

## Definição
O atalho mental no qual as pessoas julgam a probabilidade de um objeto, pessoa ou evento pertencer a uma determinada categoria com base no grau de semelhança que ele tem com o estereótipo ou protótipo dessa categoria, ignorando dados estatísticos objetivos como taxas de base (base rates).

## Mecanismo
Fiel à sua natureza associativa, o [[sistema1-sistema2|Sistema 1]] substitui a pergunta estatística difícil ("Qual é a probabilidade matemática de que X pertença a Y?") por uma avaliação de semelhança automática ("O quanto X se parece com a minha imagem mental de Y?").

A representatividade leva a erros lógicos e estatísticos graves:

### 1. Negligência de Taxas de Base (Base-Rate Neglect)
O cérebro ignora a frequência real de um grupo na população. Se um indivíduo é descrito como tímido e organizado, e nos perguntam se ele é piloto de avião ou bibliotecário, o S1 responde "bibliotecário" porque a descrição se assemelha ao protótipo da profissão. No entanto, estatisticamente existem centenas de vezes mais pilotos de avião do que bibliotecários masculinos na população. A probabilidade matemática dita que ele tem mais chances de ser piloto, mas a semelhança visual cega o julgamento.

### 2. Falácia da Conjunção (Conjunction Fallacy)
A crença de que uma combinação de duas condições é mais provável do que uma única condição isolada, apenas porque a combinação descreve uma história mais rica ou "representativa".
- **Lógica**: A probabilidade de A ocorrer sozinho sempre será maior ou igual à probabilidade de A e B ocorrerem juntos ($P(A) \ge P(A \cap B)$).
- **Viés**: Quando adicionamos detalhes plausíveis e representativos, a história se torna mais coerente para o [[sistema1-sistema2|Sistema 1]], fazendo o cenário composto parecer injustamente mais provável.

### 3. Insensibilidade ao Tamanho da Amostra (Lei dos Pequenos Números)
As pessoas assumem que pequenas amostras estatísticas representam a população com a mesma precisão que grandes amostras. O S1 não calcula variância estatística; ele assume que o padrão visto em 5 casos se aplica a 10.000.

## Aplicações Práticas

### Em Vendas e Posicionamento
- **Mimetismo de Categoria**: Se você quer que seu SaaS seja percebido como uma ferramenta de nível empresarial (enterprise), ele deve ter o visual, o tom de voz e o processo de onboarding típicos desse nicho (ex: botão "Falar com Especialista" em vez de "Testar Grátis"). O cliente usará a representatividade para classificá-lo como "seguro e robusto" com base na semelhança visual com outros softwares consolidados.
- **Autoridade Visual**: Vendedores que usam ternos sob medida e relógios caros são julgados como mais competentes. O S1 do cliente associa a aparência com o protótipo de "sucesso financeiro" e transfere essa confiança para o produto vendido.

### Em Marketing / Copy
- **Criação de Personas Extremas**: Ao escrever um estudo de caso ou depoimento, desenhe o cliente de forma que ele seja a representação viva e caricata do seu público-alvo (ex: "O designer cansado de trabalhar 14 horas por dia..."). Outros designers lerão e se identificarão imediatamente por representatividade, ignorando se o caso é um ponto fora da curva estatística.
- **Narrativas de Coerência Ricas**: Detalhes específicos e plausíveis tornam uma promessa de venda muito mais crível. Em vez de dizer "Nosso método ajuda você a economizar dinheiro", diga "Nosso método ajuda você a economizar R$ 150 na próxima compra de supermercado". A segunda parece mais real porque ativa um protótipo de cenário cotidiano.

## Contra-indicações
- **Estereótipos Ultrapassados ou Ofensivos**: Depender de imagens mentais caricatas ou preconceituosas na comunicação de marketing pode alienar fatias importantes do mercado. A representatividade deve se basear em arquétipos profissionais ou de comportamento de compra saudáveis, nunca em preconceitos de gênero, raça ou classe.

## Exemplos Canônicos
- **O Problema de Linda**: Kahneman e Tversky apresentavam a descrição: *"Linda tem 31 anos, é solteira, sincera e muito brilhante. Formou-se em filosofia. Quando estudante, era profundamente preocupada com questões de discriminação e justiça social, e também participava de demonstrações antinucleares."* Em seguida, pediam para ordenar opções por probabilidade:
  1. Linda é caixa de banco.
  2. Linda é caixa de banco e ativa no movimento feminista.
  
  Surpreendentemente, **85% a 90%** dos participantes (incluindo estudantes de pós-graduação em estatística) escolheram a opção 2 como mais provável do que a opção 1. Eles caíram na falácia da conjunção porque Linda combinava perfeitamente com o estereótipo de feminista, ignorando que o conjunto de "caixas de banco feministas" é apenas uma pequena fração do conjunto maior de "caixas de banco".

## Conexões
- [[sistema1-sistema2]] — a representatividade é uma substituição de perguntas operada de forma invisível pelo S1 para poupar energia do S2.
- [[wysiati]] — o julgamento por representatividade foca apenas nas características descritas e ignora toda a informação estatística oculta (taxas de base).
- [[efeito-isca]] — a isca funciona adicionando uma opção representativamente inferior que faz a opção preferida parecer mais coerente com o protótipo de "boa escolha".

## Fonte
> "Representativeness is an assessment of similarity, and when people judge probability by representativeness, they violate the rules of probability."

**Referência:** Thinking Fast and Slow — Daniel Kahneman | Part 2 | p. 144–162
