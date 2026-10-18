# ADR-006: Papel do GhostCLI como Gateway do Chat e Cline como Agente de Desenvolvimento

- **Status:** Aceito
- **Data:** 2026-10-18
- **Decisores:** Engenharia TAVIR & Operador (CEO)
- **Contexto:** Alinhamento de ferramentas de IA e desenvolvimento

## Contexto e Problema
Havia propostas anteriores de integrar agentes de IDE (como OMP ou Cursor SDK) como processos filhos executados dentro da própria aplicação TAVIR. Essa abordagem gerava acoplamento desnecessário, exigia manter credenciais de IDE no backend e expunha o runtime do produto a subprocessos pesados de edição de código.

## Decisão
1. **Descontinuação do OMP:** O OMP foi descontinuado do ecossistema TAVIR e seus scripts removidos.
2. **GhostCLI como Gateway de Modelos do Produto:** O GhostCLI (`https://ghostcli.cloud/v1`) permanece exclusivamente como gateway HTTP de modelos para o chat embutido no produto (`backend/app/modules/chat/service.py`).
3. **Cline como Agente Nativo de Engenharia:** Tarefas de desenvolvimento, refatoração, testes e CI do repositório são executadas pelo **Cline** diretamente no ambiente de desenvolvimento, sem intermediários.
4. **Degradação Graciosa:** Caso a variável de ambiente `GHOSTCLI_API_KEY` não esteja presente, o chat e a rota de modelos retornam mensagens amigáveis de aviso sem causar crash ou erros 500.

## Consequências
- **Positivas:**
  - Código limpo, sem adaptadores artificiais (`CursorAgentRunner`).
  - Segurança reforçada: nenhuma chave de engenharia é exposta ao browser ou gravada no banco.
  - O produto TAVIR atua como orquestrador de seus próprios 57 agentes canônicos.
