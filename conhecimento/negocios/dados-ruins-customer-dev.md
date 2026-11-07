---
title: "Dados Ruins em Customer Discovery — Elogios, Fluff e Feature Requests"
aliases: ["bad data", "false positives", "compliments validation", "fluff customer"]
domain: negocios
subdomain: validacao
source: "The Mom Test — Rob Fitzpatrick"
source_type: livro
importance: 9
tags: [validacao, customer-discovery, dados, falso-positivo, startup, conversas]
related: [[framework-mom-test]], [[perguntas-mom-test]], [[vies-de-confirmacao]], [[sistema1-sistema2]], [[falacia-do-planejamento]]
created: 2026-05-26
updated: 2026-05-26
status: completo
---

# Dados Ruins em Customer Discovery

## Definição
Os três tipos de dado ruim que sistematicamente contaminam conversas com clientes: elogios (compliments), fluff (genéricos e hipotéticos), e feature requests. Cada um parece positivo ou útil mas não prediz comportamento real de compra. Dado ruim é mais perigoso que ausência de dado: convence o founder de que está no caminho certo enquanto ele se afasta da realidade.

## Mecanismo

### Por Que Dado Ruim é Pior Que Nenhum Dado

"Doing it wrong is worse than doing nothing at all. When you know you're clueless, you tend to be careful. But collecting a fistful of false positives is like convincing a drunk he's sober: not an improvement."

Quando o founder sabe que não tem validação, age com cautela e continua testando hipóteses. Quando acumula falsos positivos, para de questionar, aumenta o investimento e descobre o erro tarde — após gastar capital e tempo irreversíveis.

O mecanismo é o [[vies-de-confirmacao]]: founders buscam conversas para confirmar o que já acreditam. As conversas entregam exatamente isso — não porque os clientes querem enganar, mas porque as perguntas erradas geram respostas que parecem confirmar.

### Tipo 1: Elogios (Compliments)

**O que são:** qualquer resposta positiva sobre a ideia que não é acompanhada de compromisso.
- "Que legal, adorei!"
- "Isso vai mudar tudo."
- "Me avisa quando lançar."
- "Tenho certeza que vai dar certo."

**Por que são inúteis:** elogios não custam nada para a pessoa que os diz. O custo zero implica valor zero como dado. Mesmo que genuínos, não predizem compra — VCs profissionais erram na maioria das suas previsões sobre startups; a opinião de um estranho vale menos ainda.

**Como surgem:** (1) o founder expôs o ego e a pessoa quer protegê-lo; (2) o founder perguntou diretamente se a ideia é boa; (3) a conversa entrou em pitch mode e a pessoa quer que o founder pare de falar.

**Como lidar:** deflect. Não agradeça o elogio — volte para os fatos.
> "Que interessante. Me conta como você resolve isso hoje."

**Sintomas de que você aceitou elogios como dados:**
- "Esse meeting correu muito bem."
- "Estamos recebendo muito feedback positivo."
- "Todo mundo que conversei adorou a ideia."

Todos esses são alertas vermelhos, não indicadores positivos.

---

### Tipo 2: Fluff (Genéricos, Hipotéticos, Promessas Futuras)

**O que são:** respostas que parecem concretas mas descrevem o ideal, não a realidade.

Três formas de fluff:
- **Genéricos:** "Eu sempre faço isso", "Eu nunca uso aquilo", "Normalmente eu..."
- **Futuro-tense:** "Eu compraria", "Eu usaria", "Eu definitivamente..."
- **Hipotéticos:** "Eu poderia", "Talvez eu", "Dependendo de..."

**O fluff mais perigoso:** *"I would definitely buy that."*

Parece comprometido, concreto, confiante. É completamente vazio. O primeiro startup onde Fitzpatrick trabalhou perdeu ~$10M ao tratar essa frase como validação. As pessoas são sistematicamente mais positivas, mais dispostas a pagar e mais motivadas na versão imaginada do futuro do que na realidade — [[falacia-do-planejamento]] aplicada ao comportamento de compra.

**Como lidar:** anchor — ancore o fluff em passado específico.
> "Você falou que normalmente tem esse problema. Quando foi a última vez que aconteceu?"
> "Você disse que definitivamente compraria. O que te impediu de buscar uma solução até agora?"

A transição:
1. Fluff-question (OK, desde que você não valorize a resposta) → "Você costuma ter esse problema?"
2. Fluff-answer → "Sempre, toda semana!"
3. Anchor → "Quando foi a última vez?"
4. Concrete → "Semana passada, quinta-feira..."

---

### Tipo 3: Feature Requests e Ideias

**O que são:** sugestões de funcionalidades, melhorias e ideias de produto que clientes oferecem espontaneamente quando ficam entusiasmados.

**Por que são perigosas:** parecem insight mas são opinião sobre solução, não dado sobre problema. O founder que constrói baseado em feature requests sem entender a motivação produz features que o cliente pediu mas não usa.

**Exemplo paradigmático (caso MTV/Habit):** MTV pediu analytics. Habit construiu um dashboard completo. MTV continuava pedindo reports manuais toda sexta. Meses depois, Fitzpatrick perguntou o motivo. Resposta: "Os clientes da gente gostam de receber algo apresentável no final da semana — se tivesse o logo deles ficaria melhor, sabe?" O problema real não era analytics — era um relatório semanal formatado para o cliente da MTV. A solução correta seria um scheduler automático de PDF com logo, não um dashboard self-serve.

**Como lidar:** dig — entenda a motivação, não obedeça o pedido.
- "Por que você quer isso?"
- "O que isso te permitiria fazer?"
- "Como você lida sem essa funcionalidade hoje?"
- "Isso travaria você de usar o produto, ou seria um nice-to-have?"

A motivação por trás do request é o dado. O request em si é ruído.

**Quando um feature request é um sinal forte:** quando revela que a pessoa está ativamente buscando uma solução (já tentou alternativas, está gastando tempo/dinheiro para compensar a ausência) — nesse caso, o request aponta para um problema real urgente.

---

### O Padrão de Busca de Aprovação

Por baixo dos três tipos de dado ruim há uma causa raiz: o founder buscando aprovação em vez de aprendizado.

**Fishing for compliments:** fazer perguntas com resposta esperada implícita. "Você não acha que esse problema é frustrante?" — o único destino possível é "sim".

**Pathos Problem:** expor o ego faz a pessoa se sentir obrigada a proteger o founder. "É o projeto que larguei meu emprego para fazer — o que você acha?" — nenhuma pessoa sensata vai ser totalmente honesta.

A solução para ambos é remover o ego da conversa: falar sobre o problema deles, não sobre a sua ideia.

**Cut off pitches:** quando você entra em pitch mode, a outra pessoa para de contribuir e começa a concordar para que você pare. Se escorregar, apologize e volte:
> "Desculpa, fiquei animado e comecei a vender. Você estava me contando X — pode continuar?"

## Aplicações Práticas

### Auditoria de Conversas Passadas
- Rever notas de conversas anteriores: quantas eram fatos concretos vs. elogios/fluff?
- Verificar se alguma "validação" foi baseada em "I would definitely buy" — reclassificar como dado nulo
- Identificar feature requests sem investigação de motivação — voltar com perguntas de dig

### No Diagnóstico de Pipeline Estagnado
- Um pipeline cheio de "leads quentes" que não avançam é sintoma de fluff acumulado
- Cada lead "quente" deve ter dado concreto por baixo (usou workaround, gasta dinheiro, procurou solução) — se não tem, é zombie lead

### Em Produtos com Alta Taxa de Churn
- Features com baixo uso apesar de serem "muito pedidas" = feature requests aceitas sem dig
- Revisitar o porquê do pedido original — o problema real pode não ser o que foi construído

## Contra-indicações
- Deflect compliments não significa ignorar entusiasmo emocional — emoção forte sobre um problema é um sinal a ser explorado ("Me conta mais sobre isso")
- Feature requests não são sempre lixo: quando revelam que a pessoa está ativamente buscando soluções, apontam para problema real urgente
- Skepticism excessivo pode fazer o founder descartar dados válidos — a meta é fatos, não negatividade

## Exemplos Canônicos
- **$10M de fluff**: startup da qual Fitzpatrick participou perdeu essa quantia apostando em "I would definitely buy that" como prova de mercado
- **MVP de Buffer (Joel Gascoigne)**: landing page coletou emails, mas a validação real veio de emails diretos para cada pessoa que se cadastrou — conversas reais, não metrics de landing page
- **App de loyalty cards**: pessoa reclamando de cartões de fidelidade na fila → fundador pede opinião sobre app → fluff puro. Versão correta: "Você já baixou algum app de fidelidade?" → âncora no comportamento real

## Conexões
- [[framework-mom-test]] — contexto geral; bad data é um dos três pilares do sistema
- [[perguntas-mom-test]] — boas perguntas evitam que bad data seja coletado desde o início
- [[vies-de-confirmacao]] — founders em busca de aprovação coletam seletivamente dados positivos
- [[sistema1-sistema2]] — elogios e fluff ativam o S1 social do interlocutor (proteção, concordância automática); dig ativa S2 (reflexão sobre experiência real)
- [[falacia-do-planejamento]] — "I would definitely buy" é a falácia do planejamento aplicada ao comportamento do cliente

## Fonte
> "Compliments are the fool's gold of customer learning: shiny, distracting, and entirely worthless."

**Referência:** The Mom Test — Rob Fitzpatrick | Capítulo 2: Avoiding Bad Data
