---
title: "Taste como Habilidade Transferível"
aliases: ["developing taste", "agents with taste", "criterio estetico treinavel"]
domain: design
subdomain: criterio-estetico
source: "AI Skills for Design Engineers — Emil Kowalski"
source_type: skill-ia
importance: 7
tags: [design, criterio-estetico, ia, frontend, revisao]
related: [[vocabulario-de-movimento]], [[dials-de-intencao-design]], [[framework-anti-slop-design-ia]]
created: 2026-07-13
updated: 2026-07-13
status: completo
---

# Taste como Habilidade Transferível

## Definição
"Taste" — o julgamento estético que reconhece uma interface excelente sem
precisar de uma regra escrita pra cada caso — não é talento inato fixo: é uma
habilidade desenvolvida por exposição repetida e prática deliberada, e pode ser
parcialmente transferida para um agente de IA através de um ciclo de
construir → revisar, não de uma lista de regras estáticas sozinha.

## Mecanismo
Duas ideias centrais sustentam isso:

1. **Taste se desenvolve, não nasce pronto** — vem de ver muito trabalho bom
   E ruim, e de conseguir articular a diferença, não só "sentir" que um é
   melhor. Quem não consegue explicar POR QUE algo é melhor ainda não
   desenvolveu o taste até o ponto de ensinar/transferir.
2. **Transferência funciona melhor como CICLO, não como regra única** — em vez
   de tentar escrever uma regra que cubra todo caso de bom design (impossível,
   sempre vai faltar caso), separa-se construir de revisar: uma ferramenta gera
   a primeira versão, outra critica especificamente o que está fraco. O ciclo
   captura mais nuance do que qualquer checklist estático — porque a crítica
   pode reagir ao resultado real, não só prever casos abstratos de antemão.

Isso é uma resposta diferente ao mesmo problema que [[checklist-pre-entrega-ui]]
resolve: checklist cobre o que é MECÂNICO e verificável (contraste, foco,
responsivo); taste cobre o que é JULGAMENTO (esse layout está desequilibrado,
essa escolha de cor não combina com o tom da marca) — não dá pra reduzir tudo a
checkbox.

## Aplicações Práticas

### Em Formação de Time/Processo Interno
- Designers e devs júnior da agência desenvolvem taste revisando trabalho
  variado (bom e ruim) com alguém sênior articulando o PORQUÊ, não só
  aprovando/reprovando silenciosamente.
- Documentar decisões de design com o "porquê", não só o "o quê" (mesmo
  princípio de comentário de código: só vale a pena registrar o não-óbvio) —
  cada decisão registrada com razão vira material de transferência de taste
  pra próxima pessoa/IA que trabalhar no projeto.

### Em Revisão de Entregas de IA
- Separar o papel de "gerar" do papel de "revisar" mesmo quando os dois são
  feitos por IA — pedir uma segunda passada de crítica específica (o que
  citação de [[motor-design-system-por-industria]] chama controle de
  qualidade) tende a pegar mais problema do que confiar na primeira geração.

### Em Apresentação pro Cliente
- Quando um cliente pede uma mudança "porque não gostei", vale perguntar o
  que especificamente incomodou — traduzir feedback vago em termos concretos
  (contraste? hierarquia? cor?) é o mesmo exercício de "desenvolver taste"
  aplicado à comunicação com cliente.

## Contra-indicações
- Taste sem checklist mecânico ainda deixa passar erro básico (acessibilidade,
  responsividade) — os dois são complementares, não substitutos um do outro.
- É subjetivo por natureza — não confundir "isso fere meu taste pessoal" com
  "isso está objetivamente errado pro público/marca daquele projeto". Taste
  bem desenvolvido inclui saber quando o taste PESSOAL não é o critério certo.

## Exemplos Canônicos
- Par de ferramentas `emil-design-eng` (construir) + `review-animations`
  (revisar) — a separação explícita de papel é o próprio exemplo do mecanismo.

## Conexões
- [[vocabulario-de-movimento]] — vocabulário preciso é o meio de comunicar o
  taste depois que ele existe; não substitui tê-lo.
- [[dials-de-intencao-design]] — os dials fixam a intenção; taste decide a
  qualidade da execução dentro da intenção fixada.
- [[framework-anti-slop-design-ia]] — o ciclo construir→revisar é a peça de
  "gate de qualidade" desse framework, na versão que cobre julgamento
  subjetivo, não só checklist mecânico.

## Fonte
> "Developing Taste — Why taste matters and how to develop it. Agents with
> Taste — How to transfer taste to coding agents."

**Referência:** Emil Kowalski | emilkowal.ski/skill, seção "Related readings" | 2026
