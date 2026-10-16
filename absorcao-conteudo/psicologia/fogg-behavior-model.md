---
title: "Fogg Behavior Model"
aliases: ["B=MAT", "modelo de comportamento de Fogg", "motivacao habilidade trigger"]
domain: psicologia
subdomain: comportamento
source: "Hooked — Nir Eyal"
source_type: livro
importance: 8
tags: [comportamento, motivacao, habilidade, trigger, produto, ux, persuasao]
related: [[hook-model]], [[trigger-externo-interno]], [[habit-zone]], [[recompensa-variavel]], [[escassez]]
created: 2026-05-23
updated: 2026-05-23
status: completo
---

# Fogg Behavior Model

## Definição
Modelo do Dr. BJ Fogg (Stanford Persuasive Technology Lab) que define a condição necessária e suficiente para qualquer comportamento ocorrer: **B = MAT** — um comportamento (B) acontece quando Motivação (M), Habilidade (A, de *Ability*) e Trigger (T) estão presentes simultaneamente em grau suficiente.

## Mecanismo

Se qualquer um dos três elementos estiver ausente ou insuficiente, o comportamento não ocorre — mesmo que os outros dois sejam fortes.

**Motivação (M)** — energia para agir. Fogg identifica três motivadores centrais (cada um com dois lados):
- Buscar prazer / evitar dor
- Buscar esperança / evitar medo
- Buscar aceitação social / evitar rejeição

**Habilidade (A)** — capacidade de executar a ação. Fogg lista seis fatores de simplicidade que determinam a dificuldade percebida:
1. *Tempo* — quanto tempo a ação leva
2. *Dinheiro* — custo financeiro
3. *Esforço físico* — carga corporal
4. *Brain cycles* — esforço mental e foco exigidos
5. *Desvio social* — o quanto a ação contraria normas sociais
6. *Não-rotina* — o quanto a ação rompe com hábitos existentes

A simplificação correta é: identificar qual desses fatores é o **recurso mais escasso** do usuário *naquele momento* e reduzir exatamente esse gargalo.

**Trigger (T)** — o estímulo que ativa o comportamento. Sem trigger, motivação e habilidade ficam latentes. Ver [[trigger-externo-interno]].

**Implicação prática crítica:** aumentar motivação é caro e demorado. Aumentar habilidade (reduzir fricção) é quase sempre o melhor retorno sobre investimento para designers de produto. *Sempre comece pela habilidade.*

### Heurísticas Cognitivas que Afetam o Modelo
Além de M, A e T, vieses cognitivos modulam a probabilidade de ação:
- **Efeito de Escassez**: itens percebidos como raros têm maior valor percebido → aumenta motivação. Ver [[escassez]] (Cialdini) para os mecanismos de Verlustaversion e Reaktanz
- **Efeito de Framing**: o contexto muda literalmente a percepção de prazer (vinho mais caro = sabor mais intenso em fMRI)
- **Efeito de Ancoragem**: a primeira informação recebida ancora julgamentos subsequentes
- **Efeito de Progresso Dotado**: progresso pré-existente (punch card com dois carimbos grátis) aumenta motivação para completar a tarefa

## Aplicações Práticas

### Em Produto / UX
- Ao diagnosticar por que usuários não completam uma ação, identifique qual dos três elementos está faltando: trigger ausente? Ação difícil demais? Sem motivação suficiente?
- Priorize remover passos antes de adicionar incentivos. Twitter foi de 20 campos de cadastro para 2 — a adoção explodiu sem mudar a proposta de valor.
- Use o efeito de progresso dotado no onboarding: mostre a barra de perfil em 40% completo desde o início, não 0%.
- Reduza brain cycles no momento de decisão: uma única CTA clara > múltiplas opções. Mint.com reduziu todas as ações do email para um único botão laranja.

### Em Copywriting / Marketing
- Headlines que tocam no motivador certo (esperança, medo de perder, aceitação social) aumentam M sem mudar A ou T.
- Remover atrito no CTA (formulário curto, login social, compra em 1 clique) aumenta A — impacto geralmente maior do que copy mais persuasivo.

### Em Vendas
- Objeções são sinais de falta de M (não quer) ou A (não consegue). Diagnóstico errado leva à solução errada: tentar persuadir mais quem só precisa de suporte técnico.

## Contra-indicações
- B=MAT é uma condição necessária, não suficiente para hábito. O modelo descreve um único episódio de comportamento — hábito exige repetição no tempo. Para hábito, veja [[hook-model]].
- Reduzir fricção além do necessário pode criar ações por impulso que o usuário depois lamenta — risco de chargeback e churn em compras.

## Exemplos Canônicos
- **Facebook Login em apps**: elimina os fatores de tempo, esforço físico e brain cycles do cadastro → aumenta radicalmente A → mais conversão.
- **Pinterest infinite scroll**: elimina o clique de "próxima página" → reduz esforço físico e brain cycles → o usuário continua rolando sem decisão consciente.
- **iPhone: câmera direto da tela bloqueada**: reduz de 5 passos para 1 gesto → A extremamente alta → monopoliza o momento de "preciso fotografar isso agora".

## Conexões
- [[hook-model]] — o Fogg Model governa especificamente a fase Action do hook
- [[trigger-externo-interno]] — o T do B=MAT; condição de ativação do comportamento
- [[habit-zone]] — o modelo explica por que comportamentos simples entram na Habit Zone mais rápido
- [[recompensa-variavel]] — a reward aumenta M para a próxima passagem pelo ciclo
- [[escassez]] — o Efeito de Escassez age diretamente sobre o eixo Motivação do modelo de Fogg

## Fonte
> "For any behavior to occur, a trigger must be present at the same time as the user has sufficient ability and motivation to take action."

**Referência:** Hooked — Nir Eyal | Capítulo 3: Action | baseado em Fogg, B.J. — Persuasive Technology Lab, Stanford
