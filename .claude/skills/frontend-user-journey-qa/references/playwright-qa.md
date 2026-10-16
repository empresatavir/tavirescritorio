# Fluxo de QA com Playwright (web)

## Instalação e execução

Inspecione primeiro scripts e convenções existentes. Se o projeto não tiver Playwright Test, instale no diretório do projeto usando o gerenciador de pacotes já adotado:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
npx playwright test
npx playwright show-report
```

Use `templates/playwright.config.ts` como ponto de partida, não como substituição de uma configuração existente e válida. Configure o reporter HTML com `open: 'never'`, screenshots só em falha e traces retidos em falha ou primeira repetição. Grave relatórios/evidências em diretório conhecido e ignorado pelo Git; remova segredos antes de compartilhar.

## E2E de UI: agir como usuário

- Navegue até o app renderizado com `page.goto` no início de cada jornada isolada.
- Localize controles reais com `getByRole`/`getByLabel` primeiro; confirme que o locator aponta unicamente para o controle pretendido.
- Use `click`, `fill`, `check`, `selectOption`, teclado e rolagem pelas APIs de página/locator do Playwright.
- Valide resultados visíveis com assertions que aguardam/repetem, como `expect(locator).toBeVisible()`, `toHaveText()` e `toHaveURL()`.
- Aguarde estados semânticos relevantes; evite pausas fixas.
- Registre erros de console/página e falhas de rede relevantes. Não valide estado interno do React/Vue nem invoque handlers do app diretamente.
- Uma UI test pode usar API para preparar estado determinístico ou consultar uma pós-condição somente de leitura, se isso for explicitamente declarado. Nunca substitua por mutação de API a ação do usuário sob teste.

## Testes de API: suíte e categoria separadas

Use o fixture `request`/`APIRequestContext` do Playwright ou o framework existente para verificações diretas de servidor. Teste status, schema, autorização, validação e persistência independentemente. Se o pedido for somente qualidade de API, não gere aprovação de UI. Se uma jornada precisar de confirmação no servidor, mantenha a interação no navegador e identifique a consulta API como pós-condição suplementar.

## Confiabilidade e depuração

Isole contextos e controle os dados de teste. Evite dependência de ordem e tráfego irrestrito para terceiros/produção. Prefira assertions semânticas com retry a verificações instantâneas ou timeouts arbitrários. Não repita indefinidamente: preserve a falha inicial e marque como instável quando só uma repetição passar. Inspecione o relatório HTML e trace para ações, snapshots DOM, screenshots, console e sequência de rede. Nunca exponha storage-state, tokens ou dados pessoais nos artefatos.

## Distinção do mobile nativo

Descritores Playwright simulam viewport/toque de navegador mobile; não testam um app Flutter/Android/iOS nativo. Para app nativo use a skill Mobile-MCP ou automação de plataforma documentada no projeto e leia `references/mobile-mcp.md` antes.