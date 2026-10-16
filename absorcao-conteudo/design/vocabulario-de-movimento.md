---
title: "Vocabulário de Movimento"
aliases: ["motion vocabulary", "linguagem de animacao", "vocabulario de animacao"]
domain: design
subdomain: motion
source: "AI Skills for Design Engineers — Emil Kowalski"
source_type: skill-ia
importance: 6
tags: [design, animacao, motion, frontend, briefing]
related: [[dials-de-intencao-design]], [[taste-como-habilidade-transferivel]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Vocabulário de Movimento

## Definição
Um conjunto de palavras específicas e técnicas para descrever intenção de
animação/movimento em interface — em oposição a adjetivos vagos ("legal",
"suave", "moderno") que não carregam informação executável, seja pra um
desenvolvedor humano seja pra um modelo de IA gerando código.

## Mecanismo
O problema-raiz: "faz uma animação legal" tem centenas de interpretações
válidas — o resultado vira uma loteria de gosto entre quem pede e quem executa.
Um vocabulário preciso (termos como easing, spring, stagger, magnetic hover,
scroll-linked, overshoot, anticipation) reduz esse espaço de interpretação a
algo próximo de determinístico: duas pessoas (ou um humano e uma IA) que usam o
mesmo termo produzem resultados parecidos, porque o termo já embute a física do
movimento, não só a estética.

Isso espelha por que jargão técnico existe em qualquer disciplina madura:
não é elitismo, é compressão de uma decisão complexa numa palavra que todo
praticante entende igual.

## Aplicações Práticas

### Em Prompts para IA Gerar Animação
- Substituir "anima essa transição de forma suave" por termos específicos:
  "spring transition com leve overshoot" ou "stagger de 40ms entre os itens da
  lista" — resultado muito mais previsível e menos iterações de correção.

### Em Briefing de Cliente
- Clientes não vão saber o jargão técnico, mas o designer/dev interno da
  agência deve traduzir o pedido vago do cliente ("quero que pareça vivo") pro
  vocabulário técnico ANTES de repassar pra implementação — a tradução é o
  trabalho, não repassar a ambiguidade adiante.

### Em Revisão de Trabalho de Terceiros/IA
- Ao revisar uma animação entregue, descrever o problema com o vocabulário
  técnico ("falta easing de saída", "stagger rápido demais") produz correção
  mais rápida do que "não ficou legal, tenta de novo".

## Contra-indicações
- Vocabulário sem critério pra saber QUANDO aplicar cada termo não ajuda
  sozinho — ver [[taste-como-habilidade-transferivel]] pra a camada de
  julgamento que decide a escolha certa entre as opções do vocabulário.
- Excesso de movimento tecnicamente correto ainda pode ser excesso — o
  vocabulário evita ambiguidade de EXECUÇÃO, não decide sozinho a INTENSIDADE
  certa (isso é o dial de [[dials-de-intencao-design]]).

## Exemplos Canônicos
- "Ease-out com leve overshoot" em vez de "suave" — o overshoot (passar
  ligeiramente do alvo e voltar) é o que dá sensação de peso/física real a um
  elemento que entra na tela, diferente de uma parada seca.

## Conexões
- [[dials-de-intencao-design]] — o dial de intensidade de movimento fixa O
  QUANTO; o vocabulário de movimento define COMO executar dentro disso.
- [[taste-como-habilidade-transferivel]] — vocabulário preciso é a ferramenta;
  saber quando/qual termo usar é a habilidade.

## Fonte
> "Use emil-design-eng to build animations and help you make better motion
> decisions. ... Motion Vocabulary — Use these words when prompting an AI."

**Referência:** Emil Kowalski | emilkowal.ski/skill, seção "Related readings" | 2026
