---
title: "Workflow de Processamento GTD — A Árvore de Decisão Para Esvaziar o In-Basket"
aliases: ["gtd processing", "processamento gtd", "two minute rule", "decision tree gtd", "inbox zero"]
domain: engenharia
subdomain: produtividade
source: "Getting Things Done — David Allen"
source_type: livro
importance: 9
tags: [gtd, produtividade, workflow, decisao, processamento, inbox, two-minute-rule]
related: [[framework-gtd]], [[open-loops-ram]], [[organizacao-gtd]], [[proxima-acao-fisica]]
created: 2026-05-26
updated: 2026-05-26
status: completo
---

# Workflow de Processamento GTD

## Definição
O processamento é a fase do GTD onde cada item coletado é avaliado com uma árvore de decisão padrão para determinar o que é, o que significa, e o que precisa ser feito. O objetivo não é executar tudo — é decidir sobre tudo para que nada fique em estado indefinido consumindo RAM mental.

## Mecanismo

### A Árvore de Decisão Completa

```
                    [ITEM DO IN-BASKET]
                           │
                    É acionável?
                   /              \
                 NÃO               SIM
                  │                 │
        ┌─────────┼────────┐   O que é a próxima ação?
        │         │        │        │
      TRASH   INCUBAR   REFERÊNCIA  │
               (someday/ (arquivar) │
               maybe ou            │
               tickler)      Leva <2 minutos?
                               /         \
                             SIM          NÃO
                              │            │
                         FAZER AGORA    Sou a pessoa certa?
                                        /          \
                                      NÃO           SIM
                                       │              │
                                  DELEGAR          ADIAR
                                  (Waiting For)  (Next Actions)
                                  
                    └──── Precisa de mais de 1 ação?
                               │
                         PROJETO (add to Projects list)
```

### As 3 Categorias Não-Acionáveis

**Trash**: sem utilidade futura de nenhum tipo. Jogar fora sem hesitação. A maioria das pessoas mantém coisas por "talvez precise algum dia" — na prática, se não sabe para que serve agora, raramente vai saber depois.

**Incubar**: potencialmente útil ou relevante, mas não agora. Duas formas:
- *Someday/Maybe list*: coisas que você quer fazer ou considerar em algum momento futuro sem data definida ("aprender espanhol", "visitar Japão", "estudar X")
- *Tickler file*: lembretes para datas específicas no futuro. O sistema de tickler clássico tem 43 pastas (12 meses + 31 dias) onde você "envia cartas para você mesmo" para aparecerem na data certa

**Referência**: informação útil que não requer ação mas pode ser necessária depois. Arquivar em sistema de referência alfabético simples — se leva mais de 60 segundos para arquivar algo, você não vai arquivar. Você vai empilhar.

### A Regra dos 2 Minutos

Se a próxima ação leva menos de 2 minutos, faça agora — independente de ser "importante" ou não.

A lógica é de eficiência pura: o overhead de escrever, organizar, revisar e depois executar a ação é maior que o custo de simplesmente fazê-la agora. Para ações curtas, o sistema tem custo maior que a ação.

Consequências práticas:
- Um executivo de software reduziu de 300-400 emails atrasados por dia para sempre processados — só usando a regra dos 2 min + delegação
- A regra transforma o comportamento médio de "deixar acumular para depois resolver em batch" em "resolver enquanto mantém sistema limpo"
- O prazo exato (2 min) é orientativo — se você tem 2 horas de bloco, pode estender para 5-10 min; se está processando rapidamente, pode ser 30 segundos

### Delegar com Rastreamento

Delegar sem rastrear cria um novo open loop. A distinção: delegar *e registrar no Waiting For* fecha o loop no seu sistema. O item sai do seu radar ativo mas fica rastreado para follow-up.

Para cada item delegado:
- Registrar para quem foi delegado
- Registrar o que foi pedido
- Registrar a data (crítico — este é o campo mais importante para accountability)

"Waiting For" não é uma lista de culpa — é um radar ativo. Você a revisa semanalmente no Weekly Review e decide quando fazer follow-up.

### Deferir para Next Actions

Para ações que são suas e levam mais de 2 minutos: adicionar à lista de Next Actions na categoria de contexto correto. A distinção do contexto é crucial para que você não precise reprocessar a lista quando está pronto para agir — a lista já está filtrada pelo que é possível fazer no contexto atual.

Categorias típicas de Next Actions:
- **@Ligar** — chamadas que podem ser feitas de qualquer lugar com telefone
- **@Computador** — ações que requerem computador
- **@Errandas** — coisas para fazer quando estiver fora de casa
- **@Casa** — ações que só podem ser feitas em casa
- **@Escritório** — ações que requerem estar no escritório
- **@Agenda [Nome]** — coisas para discutir na próxima conversa com uma pessoa específica

### Identificar Projetos

Qualquer outcome que requer mais de uma ação é um **projeto**. Isso inclui coisas aparentemente simples como "Fazer revisão do carro" (que requer encontrar a oficina, ligar, agendar, levar, etc.).

A Projects list é um inventário de "finish lines" — um lembrete de que há algo em andamento. Não é uma lista de próximas ações — é um mapa de todos os outcomes pendentes. Para cada projeto, pelo menos uma próxima ação deve estar na Next Actions list.

### As 3 Regras de Processamento

1. **Processar o item do topo primeiro** — não fazer cherry-picking. Emergency scanning é diferente de processar. Processar sequencialmente evita que itens desconfortáveis fiquem permanentemente no fundo
2. **Processar um item por vez** — pegar apenas um, decidir completamente, descartá-lo antes de pegar o próximo
3. **Nunca colocar de volta no in-basket** — o in-basket é estação de processamento, não de armazenamento. Uma vez pego, vai para outra categoria ou para o trash

## Aplicações Práticas

### Para Email
- Criar pastas/labels: @Ação Necessária, @Waiting For, @Referência, @Projetos
- Processar email não significa responder a todos — significa decidir o que fazer com cada um
- A meta não é inbox zero como métrica de status, mas como indicador de sistema funcionando

### Para Reuniões
- Notas de reunião são itens de in-basket — precisam ser processadas dentro de 24h
- Cada ação discutida na reunião vira: next action (para você), waiting for (para outros), ou projeto
- A reunião sem síntese processada gera open loops para todos os participantes

### Para Entrada de Mensagens/Requests
- WhatsApp, Slack, DMs são in-baskets informais — o processamento precisa acontecer regularmente
- O risco de canais informais: a baixa fricção de entrada cria falsa sensação de que "está sendo gerenciado" quando na verdade está acumulando

## Contra-indicações
- Processar meticulosamente enquanto o in-basket tem 2000 itens é contraproducente — fazer uma triagem rápida inicial (trash óbvio + ações <2 min) antes de processamento sistemático
- A regra dos 2 minutos não se aplica durante períodos de trabalho focado — o processamento tem seu próprio bloco de tempo; não interrompa work sessions para fazer tiny tasks
- "Processar" é diferente de "fazer" — a tentação de executar enquanto processa dispersa a sessão de processamento

## Conexões
- [[framework-gtd]] — o processamento é a etapa 2 das 5 etapas do GTD
- [[open-loops-ram]] — o processamento é como loops são "fechados" no sistema
- [[organizacao-gtd]] — os outputs do processamento são os inputs do sistema organizacional
- [[proxima-acao-fisica]] — a pergunta "qual a próxima ação física?" é o núcleo do processamento

## Fonte
> "Process does not mean 'spend time on.' It just means 'decide what the thing is and what action is required, and then dispatch it accordingly.'"

**Referência:** Getting Things Done — David Allen | Capítulo 6: Processing — Getting "In" to Empty
