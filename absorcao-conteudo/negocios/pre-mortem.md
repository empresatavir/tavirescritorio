---
title: "Pre-Mortem"
aliases: ["análise pré-morte", "klein premortem", "premortem"]
domain: negocios
subdomain: gestao
source: "Thinking Fast and Slow — Daniel Kahneman"
source_type: livro
importance: 10
tags: [gestao, lideranca, projetos, decisao, mitigacao]
related: [[falacia-do-planejamento]], [[sistema1-sistema2]], [[wysiati]], [[7-perguntas-negocio-thiel]], [[natural-planning-model]], [[dialogo-robusto-execucao]], [[framework-anti-slop-design-ia]]
created: 2026-05-25
updated: 2026-05-25
status: completo
---

# Pre-Mortem

## Definição
Uma técnica de gestão e tomada de decisão na qual uma equipe de projeto se reúne antes do lançamento de uma iniciativa e simula mentalmente o pior cenário possível: **imagina que o projeto falhou de forma catastrófica no futuro e trabalha de trás para frente para mapear todas as possíveis causas desse fracasso.**

## Mecanismo
Desenvolvido originalmente pelo psicólogo Gary Klein e amplamente elogiado e divulgado por Daniel Kahneman, o Pre-Mortem é projetado especificamente para desarmar dois grandes inimigos do planejamento racional: o **viés de otimismo** e o **pensamento de grupo (groupthink)**.

O Pre-Mortem altera a dinâmica social de uma reunião de planejamento através de dois mecanismos psicológicos:

### 1. Legitimação da Crítica
Em reuniões de projeto normais, a pressão social para manter a harmonia faz com que membros da equipe que tenham dúvidas legítimas permaneçam em silêncio. Críticas são interpretadas como negatividade ou deslealdade ao time. 
- O Pre-Mortem inverte o incentivo social: expressar dúvidas e fraquezas torna-se uma **competição intelectual legítima** de quem consegue antecipar o perigo mais sutil.

### 2. Ativação da Visão Retrospectiva Simulada
Dizer à equipe "Pensem em possíveis riscos" ativa apenas a visão interna rasa. Dizer "O projeto fracassou completamente. Agora expliquem o porquê" força o cérebro a adotar uma visão retrospectiva (hindsight). O cérebro humano é excelente em conectar causas a efeitos que *já ocorreram*; o Pre-Mortem sequestra essa habilidade para eventos futuros simulados.

## Guia de Execução (Playbook)
A sessão de Pre-Mortem deve durar de 45 a 60 minutos e seguir quatro passos simples:

```
1. PREMISSA DO FRACASSO → O facilitador anuncia: "O projeto falhou terrivelmente. O que aconteceu?"
2. ESCRITA INDEPENDENTE  → Cada participante escreve em silêncio todas as causas possíveis por 10 minutos.
3. CONSOLIDAÇÃO        → Os riscos são lidos e agrupados em um mural visual público.
4. PLANO DE MITIGAÇÃO    → A equipe prioriza os 3 maiores riscos e cria ações imediatas para preveni-los.
```

- **Passo 1: A Premissa**: O facilitador começa a reunião dizendo: *"Imagine que estamos a um ano no futuro. Nós lançamos o projeto exatamente como planejado. Ele foi um desastre completo, um fracasso humilhante. Reservem os próximos 10 minutos para escrever o histórico detalhado deste desastre."*
- **Passo 2: Geração de Ideias**: Cada membro da equipe escreve de forma anônima ou individual (para evitar contágio de ideias) os motivos do fracasso.
- **Passo 3: Compartilhamento**: Cada participante lê um item de sua lista por vez. Nenhuma crítica ou debate sobre a plausibilidade das ideias é permitida nesta fase.
- **Passo 4: Ação**: A equipe revisa a lista agregada e seleciona as ameaças mais prováveis ou perigosas para reestruturar o plano original de ação.

## Aplicações Práticas

### Em Lançamentos de Produtos e Startups
- **Antes de Rodar Campanhas ou Features**: Reúna os líderes de marketing, produto e suporte dois dias antes do lançamento público e rode um Pre-Mortem. Riscos como "o servidor caiu sob carga", "o e-mail de onboarding caiu no spam" ou "o preço foi considerado confuso" serão detectados e corrigidos antes de causarem prejuízos reais.

### Em Propostas de Vendas e Negociações complexas
- **Antecipação de Objeções**: Antes de enviar uma proposta comercial para um grande cliente (Enterprise), faça um Pre-Mortem com a equipe comercial focando na rejeição: "O cliente recusou nossa proposta. Por quê?". Isso identificará lacunas de valor, fragilidades no ROI apresentado ou falta de alinhamento com stakeholders internos que você ainda pode consertar no documento final.

## Exemplos Canônicos
- **O Resgate de Planos de Saúde Corporativos (Klein)**: Klein relata um caso em que uma grande seguradora de saúde estava planejando um novo sistema de processamento de sinistros que consumira milhões de dólares. A equipe estava 100% confiante. Klein realizou um Pre-Mortem. Um dos engenheiros seniores, que estivera calado o tempo todo, revelou: *"Nós simulamos que tudo funcionaria na nossa nuvem, mas o cliente final ainda usa navegadores obsoletos incompatíveis com o sistema."* O projeto foi pausado imediatamente para ajustes, poupando a empresa de um fracasso vergonhoso de relações públicas e técnico.

## Conexões
- [[falacia-do-planejamento]] — o Pre-Mortem é a ferramenta mais rápida e barata para quebrar a visão interna otimista que causa a falácia do planejamento.
- [[sistema1-sistema2]] — a técnica acorda o S2 analítico e cético em uma equipe que estava hipnotizada pelo conforto otimista do S1.
- [[wysiati]] — força a equipe a olhar além do plano desenhado no papel (o que está visível) e a buscar ativamente as ameaças ocultas.
- [[7-perguntas-negocio-thiel]] — os 7 business questions de Thiel são um pre-mortem estruturado aplicado antes da fundação: cada pergunta antecipa uma categoria de falha fatal
- [[natural-planning-model]] — o NPM de Allen e o pre-mortem de Kahneman são complementares: NPM imagina o sucesso total (visão positiva), pre-mortem imagina a falha total — juntos cobrem o espaço de planejamento completo
- [[dialogo-robusto-execucao]] — o diálogo robusto de Bossidy e o pre-mortem de Kahneman endereçam o mesmo problema por caminhos diferentes: fazer as verdades desconfortáveis aparecerem antes de virarem crise. Pre-mortem é um exercício episódico; diálogo robusto é uma cultura contínua
- [[framework-anti-slop-design-ia]] — o "gate de verificação antes de entregar" desse framework de design é a mesma disciplina do pre-mortem aplicada a interface em vez de projeto/decisão: parar deliberadamente antes de considerar pronto, pra forçar a descoberta do que falta ou vai dar errado

## Fonte
> "The pre-mortem is a great idea. Gary Klein proposed it. [...] When a team is gathered to make a decision, a pre-mortem legitimizes doubts and encourages supporters of the decision to search for threats they had not considered before."

**Referência:** Thinking Fast and Slow — Daniel Kahneman | Part 3 | p. 263–265
