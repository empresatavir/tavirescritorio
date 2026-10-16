# Estratégia de QA: jornadas de usuário e backend

## Modelo de cobertura

Comece pela superfície visível do produto, não pela lista de rotas de backend. Monte um inventário de telas e controles e conecte-os em jornadas.

Para cada tela/controle registre: ID estável da tela e do controle; rótulo/nome acessível; tipo e estado inicial/habilitado; ação do usuário (toque/clique, digitação, seleção, envio, voltar, swipe/scroll); resultado visível esperado (rota/tela, mensagem, valor/lista alterados, diálogo ou validação); ID da jornada e pré-condições/fixture; risco/prioridade e status (aprovado, falhou, bloqueado, não executado ou não aplicável).

Cubra no mínimo: a jornada principal da entrada até o objetivo; controles de navegação (abas, links, menus, voltar/cancelar); formulários válidos, inválidos, limites e respostas de erro quando aplicável; diálogos/gavetas, confirmar/cancelar e formas de dispensar; estados vazio, carregando, sucesso e erro que façam parte do produto; persistência/recarga e envio duplicado quando relevante; e comportamento responsivo/específico do aparelho dentro do escopo.

Inventariar um controle não autoriza acionar todos cegamente. Classifique as ações: navegação/leitura segura, mutação reversível em teste, destrutiva/externa. Use dados sintéticos e plano de limpeza para mutações reversíveis. Nunca faça compra real, exclusão irreversível, publicação pública ou envio a destinatários reais em produção para fins de QA.

## Três camadas complementares

### A. E2E pela UI frontend

Comece no ponto de entrada real do usuário (ou numa fixture de login segura e declarada), interaja com controles renderizados e valide o que a pessoa vê. Uma ação não está provada se o teste chama handler interno, altera diretamente local storage para simular a ação ou grava o resultado esperado via API. Pré-condições criadas por API podem ser aceitáveis se documentadas; a ação sob teste deve ocorrer pela UI.

Para cada fluxo crítico, valide o feedback imediato e o estado final. Exemplo: clique em “Criar”, confirme o toast/mensagem e verifique o item criado na lista renderizada. No app nativo, as ações correspondentes devem acontecer pela interface usando Mobile-MCP ou automação de UI da plataforma documentada.

### B. Testes de API/backend

Exercite endpoints, contratos de serviço, validação, autorização e persistência diretamente. Relate em API/backend, nunca como prova de que alguém conseguiu completar a jornada no navegador/celular. Use dados isolados, credenciais de teste com privilégio mínimo e só limpe dados criados pelo próprio teste.

### C. Confirmação entre camadas

Quando ajudar: faça a mutação pela UI, valide o resultado visível e depois consulte API/banco em modo de leitura para confirmar persistência. A ação continua sendo feita pela UI. Identifique a consulta como evidência suplementar no relatório.

## Priorização e severidade

Priorize crashes, jornadas centrais bloqueadas, perda/corrupção de dados, falhas de autenticação/autorização e exposição relevante. Escala de referência:

- **Crítica:** app inutilizável, exposição insegura, perda grave de dados ou jornada central impossível para todos.
- **Alta:** recurso importante ou jornada comum falha sem alternativa razoável.
- **Média:** falha parcial, validação/estado confuso ou alternativa viável.
- **Baixa:** problema cosmético ou caso raro de impacto limitado.

Separe fatos observados de causa presumida. Evite correções especulativas sem evidência. Em QA-only, relate achados e não altere silenciosamente o comportamento de produção; só corrija quando mudanças estiverem dentro do pedido do usuário.

## Evidência e confiança

Para cada falha anexe nome do teste/ID de fluxo, passos exatos, esperado vs. atual, screenshot/vídeo/trace ou captura do aparelho, logs e erro de rede/dispositivo relevante. Preserve a primeira falha. Se uma repetição passar, marque como instável (flaky), não como aprovado sem ressalvas. Diferencie “não executado” (não tentado), “bloqueado” (ambiente/ferramenta/dado necessário indisponível) e “ignorado” (exclusão intencional) de “aprovado”. Nunca extrapole a qualidade geral a partir de uma smoke suite pequena.