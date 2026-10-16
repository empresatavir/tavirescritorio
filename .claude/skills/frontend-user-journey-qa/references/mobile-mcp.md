# Testes de UI mobile nativa com Mobile-MCP

## Descobrir antes de usar

Quando o projeto declarar Mobile-MCP instalado:

1. Localize e leia `.agents/skills/mobile-mcp/SKILL.md` a partir da raiz do projeto. Se houver skill vinculada em `.claude/skills/mobile-mcp`, resolva o link e leia o destino real; não presuma que o link funciona.
2. Siga as ações, nomes de ferramentas, inicialização/anexação ao app, semântica de seletores, capturas e limitações exatamente como a skill documenta.
3. Se as ferramentas MCP estiverem disponíveis, descubra a definição/schema completo antes de chamar. Não invente nome de ferramenta, argumento, ID de simulador nem formato de coordenada baseado apenas no nome “Mobile-MCP”.
4. Confirme build do app, emulador/aparelho, versão do SO, permissões e conjunto seguro de dados/usuário de teste antes de executar jornadas.

A skill local Mobile-MCP pode não estar disponível em outra sessão de agente. Nesse caso, registre a dependência como bloqueada e solicite acesso ao repositório ou à instalação documentada. Não declare teste em smartphone quando só houve screenshot, browser ou emulação de viewport.

## Padrões para jornada mobile

- Execute ações pela interface renderizada com primitivas documentadas: toque/clique, digitação, swipe/scroll, voltar e espera por estado visível.
- Prefira labels/roles de acessibilidade ou hierarquia exposta pelo Mobile-MCP em vez de coordenadas frágeis. Use coordenadas só quando não houver referência semântica confiável; capture a tela e registre dimensões/resolução antes.
- Redefina/resemeie o estado de teste entre casos por mecanismo seguro e documentado. Não dependa da navegação deixada por outro teste.
- Confirme o resultado em mudança de tela, label, mensagem, item ou diálogo observável. Capture evidência após transições importantes e nas falhas.
- Teste teclado, sua dispensa, safe areas, orientação, voltar do sistema e rolagem quando fizerem parte do escopo.
- Não exponha PII, credenciais reais de pagamento, mutações destrutivas em produção nem mensagens para destinatários reais. Se a ação tiver efeito real e não houver caminho seguro, marque como bloqueada e pare antes da ação irreversível.

## Relate a capacidade realmente usada

Para cada execução mobile registre app/pacote/build, SO/dispositivo/emulador, tamanho/densidade/orientação da tela, versão da ferramenta se informada, tipo de dados, horário, IDs dos fluxos e caminhos de screenshots/logs. Diferencie aparelho real, emulador e browser simulado. Se a hierarquia não expuser um controle, registre a limitação; use coordenadas guiadas por screenshot somente se a ferramenta documentar esse suporte.