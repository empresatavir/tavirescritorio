---
name: frontend-user-journey-qa
description: Testa produtos frontend como um usuário real, percorrendo jornadas completas em web ou mobile por controles visíveis e verificando APIs/backend em uma trilha separada. Use para QA, regressões, fluxos de botões/formulários/navegação, testes E2E com Playwright, testes mobile com Mobile-MCP e relatórios HTML baseados em evidências.
---

# QA de Jornadas Frontend

## Regra pétrea

Uma exigência de UI deve ser exercitada pela própria UI. Não substitua toque, clique, digitação, envio, navegação ou uma asserção visível por chamada direta de handler, request de backend, estado mockado de componente ou alteração no banco. Testes de API/backend são uma camada separada: complementam as evidências de UI, mas não provam que uma pessoa consegue concluir o fluxo.

## Fluxo obrigatório

1. **Entenda o app e o alvo seguro de teste.** Inspecione instruções do projeto, stack, scripts, rotas/telas, testes existentes, fixtures e ambiente pretendido. Prefira builds locais isolados ou staging com dados sintéticos determinísticos. Não execute fluxos mutáveis em produção nem contra dados reais de clientes. Se uma ação puder apagar dados, enviar comunicação, publicar externamente, cobrar ou produzir efeito irreversível, use staging/test double seguro; sem isso, marque como bloqueada e peça autorização antes de executar.
2. **Escolha o driver real de UI.** Para web/landing pages, use o Playwright Test existente ou configure-o conforme `references/playwright-qa.md`. Para app nativo, primeiro encontre e leia `.agents/skills/mobile-mcp/SKILL.md` do projeto (ou o destino documentado do link) e siga exatamente as ferramentas e a sintaxe descritas; veja `references/mobile-mcp.md`. Nunca invente comandos Mobile-MCP nem declare teste em aparelho real quando só houve navegador ou emulação de viewport.
3. **Inventarie telas e ações.** Crie `visual/TEST-MATRIX.md` a partir de `templates/TEST-MATRIX.md`. Enumere cada tela relevante, botão/link/menu/aba/campo visível, resultado esperado e caminho pelo app. Inclua jornadas principais, validações/erros, estados vazio/carregando, voltar/cancelar, modais/gavetas e casos negativos seguros. Um botão só está coberto quando sua ação e o resultado visível esperado estão registrados; controle inerte é defeito, não aprovação. Não acione indiscriminadamente controles destrutivos ou com efeitos externos.
4. **Separe as camadas de teste.** Escreva:
   - **UI E2E:** comece na entrada do frontend, interaja por controles visíveis e verifique tela/estado/conteúdo resultante. É obrigatório para alegações sobre jornada e interação.
   - **API/backend:** exercite rotas, serviços e contratos diretamente para localizar defeitos do servidor. Identifique esses resultados separadamente.
   - **Checagem entre camadas:** quando útil, execute a jornada pela UI e depois verifique uma pós-condição no servidor. A ação sob teste continua sendo feita pela UI; declare qualquer API usada para preparação ou verificação.
5. **Implemente testes estáveis e isolados.** No Playwright, priorize `getByRole`, `getByLabel` e `getByText` com nomes acessíveis; use test IDs estáveis quando necessário e CSS/XPath só como último recurso. Cada teste prepara o próprio estado ou usa fixture que possa ser redefinida, sem depender da ordem de execução. Use assertions que aguardem estado semântico e evite sleeps fixos e detalhes internos da implementação. No mobile, use interações, capturas e hierarquia de UI documentadas pelo Mobile-MCP.
6. **Execute fluxos reais e reúna evidências.** Rode os testes no navegador/dispositivo pretendido, capture screenshots e traces/logs em falhas e registre erros de console/rede ou dados do dispositivo quando disponíveis. Repita uma falha apenas para investigar instabilidade; registre a falha inicial e o resultado da repetição, sem converter silenciosamente em aprovação. Similaridade de screenshot não é critério de aprovação funcional.
7. **Relate os resultados com honestidade.** Gere o relatório HTML do Playwright quando aplicável e um `visual/QA-REPORT.md` conciso usando `templates/QA-REPORT.md`. Informe aprovações/falhas/bloqueios/não executados por camada, cobertura de fluxos, ambiente, defeitos com severidade e passos de reprodução, caminhos das evidências e incertezas. Nunca declare “sem erros”; relate apenas o que foi exercitado. Fluxos bloqueados, ignorados ou testados só pela API não podem constar como UI aprovada.
8. **Acople fidelidade visual quando necessário.** Se houver layout de referência, execute a skill irmã `reference-fidelity-frontend` após os fluxos funcionais. O score de similaridade mede diferenças de imagem; não certifica navegação nem comportamento.

## Critérios de aceite

- Todo controle visível dentro do escopo está inventariado e testado com resultado esperado, ou explicitamente marcado como bloqueado/não aplicável com justificativa.
- Jornadas críticas têm entrada, passos, resultado visível e recuperação/voltar/cancelar quando pertinente.
- Resultados de UI e API permanecem separados no relatório.
- Nenhuma falha não investigada, crash, rota quebrada, controle sem ação, defeito de validação ou erro grave de console/rede aparece como aprovada.
- Registrar, quando disponível, ambiente/build, navegador/dispositivo/SO, viewport, tipo de usuário/fixture de teste, comando e evidência.
- Dados sintéticos e testes isolados/repetíveis; efeitos reais não são tratados como dados de teste descartáveis.

## Recursos incluídos

- Leia `references/qa-strategy.md` para planejar cobertura e priorização por risco.
- Leia `references/playwright-qa.md` para separar E2E de UI e testes de API, configurar relatório e traces.
- Leia `references/mobile-mcp.md` antes de usar Mobile-MCP ou qualquer skill de automação de smartphone.
- Leia `references/sources.md` para a documentação oficial consultada.
- Copie `templates/TEST-MATRIX.md` e `templates/QA-REPORT.md` para `visual/` no projeto e preencha com evidências reais.
- Use `templates/playwright.config.ts`, `templates/ui-journeys.spec.ts` e `templates/api-checks.spec.ts` como ponto de partida, adaptando à versão instalada do Playwright e ao app.

## Portabilidade

A skill é independente de framework e linguagem. Preserve o runner e as convenções já válidas do projeto. Claude Code, Codex e outros agentes devem ler a skill Mobile-MCP instalada e os schemas das ferramentas disponíveis, sem presumir uma API específica. Esta skill orienta o agente, mas não o força tecnicamente; os resultados precisam ser auditáveis pelo código do teste, saída de execução e evidências.