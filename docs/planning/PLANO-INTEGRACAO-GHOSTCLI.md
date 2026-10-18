# Plano: GhostCLI + Cline + TAVIR Escritório

**Status:** Fase 1 concluída (limpeza OMP + alinhamento de portas). Agente de desenvolvimento migrado para Cline.

## Decisão consolidada

- **OMP:** descontinuado. O arquivo `abrir_omp_tavir.bat` foi esvaziado/removido.
- **GhostCLI:** permanece como gateway oficial do chat do TAVIR (`backend/app/modules/chat/service.py`) para interações leves no produto.
- **Cline:** assume o papel de agente de desenvolvimento e engenharia padrão. Diferente do Cursor SDK (que exigiria adaptador backend e API externa), o Cline opera nativamente no ambiente de desenvolvimento com acesso direto a arquivos, terminal e contexto do repositório, sem camadas intermediárias.
- **Portas oficiais:** API em `9001`, Vite em `9002`. Documentação alinhada. `.claude/launch.json` mantido intacto.

```text
Arquitetura atual:
Desenvolvimento: Cline (agente nativo) → Repo TAVIR
Produto:       TAVIR UI → FastAPI (9001) → GhostCLI → Modelo
               ↘ SQLite/SSE → UI
```

A integração via "Cursor SDK" foi **descartada** em favor do uso direto do Cline, eliminando a necessidade de `CursorAgentRunner`, credenciais de API de IDE ou processos externos de agenting.

## Estado atual do projeto

- O chat do backend chama GhostCLI via HTTPX em `backend/app/modules/chat/service.py`, usando `GHOSTCLI_API_KEY` e `GHOSTCLI_BASE_URL` (padrão `https://ghostcli.cloud/v1`). Esse caminho permanece ativo e é o único gateway de modelos do produto.
- O seletor de modelos no frontend deve refletir apenas IDs válidos na conta GhostCLI; listas estáticas validadas são preferíveis a descoberta automática em `/v1/models`.
- O desenvolvimento do repositório agora ocorre via **Cline**. Não há mais configuração de OMP ou Cursor SDK como clientes de desenvolvimento ou executores acionados pela UI.

## Etapas canceladas (histórico)

As etapas abaixo faziam parte do plano original e foram **canceladas**. Elas permanecem registradas apenas para contexto histórico e NÃO devem ser executadas.

- ~~Configurar OMP como cliente de desenvolvimento (`~/.omp/agent/models.yml`)~~ — cancelado.
- ~~Usar OMP/Cursor SDK como executor acionado pelo TAVIR~~ — cancelado; substituído pelo uso direto do Cline.

## Estratégia de Agenting (Pós-Fase 1)

Com a decisão de adotar o **Cline** como agente nativo, a complexidade de integrar um SDK externo (como o Cursor SDK) foi eliminada.

- **Chat do Produto:** permanece no GhostCLI para interações leves e síncronas na UI do TAVIR.
- **Engenharia e Desenvolvimento:** tarefas complexas, refatorações e implementação de features são delegadas diretamente ao Cline neste ambiente. O Cline possui acesso contextual ao repositório, terminal e ferramentas de edição, operando sem a necessidade de adaptadores backend (`CursorAgentRunner`) ou credenciais de API de IDE.
- **Vantagem:** elimina a latência de adaptação, a gestão de chaves extras e a manutenção de um runner de agente dentro do FastAPI. A aprovação humana e o versionamento continuam sendo feitos via Git e fluxos de trabalho padrão do Cline.ível: leitura de arquivos, proposta de alteração, revisão do diff e build/testes. Não pedir ao OMP para alterar configuração protegida do Claude Code.

**Aceite:** OMP seleciona um modelo GhostCLI e conclui uma tarefa de teste sem expor a chave nem executar ações sem aprovação.

### 2. Consolidar o provedor do chat TAVIR

- Manter o fluxo `ChatView → cliente tipado → FastAPI → adaptador de modelo → GhostCLI → FastAPI → SQLite`. Nunca chamar GhostCLI diretamente do navegador.
- Padronizar a chamada do backend. Pode-se adotar `AsyncOpenAI` com `base_url=https://ghostcli.cloud/v1`, ou manter HTTPX no piloto atual. Deve existir uma única implementação, não duas rotas paralelas.
- Configurar a chave no ambiente do processo FastAPI. O backend espera `GHOSTCLI_API_KEY`; a configuração existente do Claude Code usa `ANTHROPIC_*`, então é preciso fornecer explicitamente a variável correta ao processo do escritório. O `.gitignore` já ignora `.env`, mas o código lido usa `os.environ`; só usar arquivo `.env` se houver carregador explícito.
- Preferir uma chave dedicada ao TAVIR para permitir revogação independente. Confirmar acesso à API e autorização do IP no GhostCLI. [2]

**Aceite:** conversa real responde com a chave disponível apenas no backend; nenhuma chave aparece no bundle, no banco ou nos logs.

### 3. Unificar catálogo e diagnóstico

- Definir uma lista permitida única de modelos para o backend e a interface do chat, alinhada ao catálogo e plano da conta. Não deixar IDs demonstrativos no seletor.
- Transformar falhas de autenticação, API não habilitada, IP não autorizado, modelo/URL inválidos, limite e timeout em erros distinguíveis. Não salvar o erro do gateway como se fosse uma resposta válida do agente.
- Exibir GhostCLI na área de Integrações, usando o domínio já existente no TAVIR, com estado, última verificação, latência e erro sanitizado. Evitar testes automáticos frequentes que consumam chamadas.

**Aceite:** modelos apresentados são válidos para a conta e a tela distingue gateway configurado, indisponível e com erro de credencial/acesso.

### 4. Habilitar ações de agentes com limites

- Só depois do chat estável, habilitar tool calling. O GhostCLI pode transportar solicitações de ferramentas do modelo, mas é o backend TAVIR que precisa validar e executar cada função. [2]
- Começar com ferramentas de leitura, como consultar tarefas/projetos e buscar conhecimento.
- Para operações mutáveis, usar os domínios atuais de tarefas, jobs e aprovações: o agente propõe; o TAVIR registra a aprovação; a execução ocorre apenas após decisão humana.
- Não expor shell, SQL ou acesso irrestrito ao `JobRunner` ao modelo. Registrar ferramenta, argumentos validados, resultado e aprovação.

**Aceite:** ações de leitura não alteram estado; mudanças ficam bloqueadas até aprovação e são auditáveis.

### 5. Avaliar OMP como executor acionado pelo TAVIR — opcional

Este é um objetivo diferente de usar OMP como assistente durante o desenvolvimento. Só avançar se você quiser que a interface do TAVIR dispare trabalhos de programação via OMP. Antes de implementar, validar como o processo OMP seria iniciado/retomado e delimitado a uma cópia de trabalho isolada; definir permissões, cancelamento, logs, limite de tempo e aprovação humana. Não passar credenciais do gateway para prompts ou para ferramentas sem necessidade. Manter esta etapa fora do primeiro lançamento integrado.

## Privacidade e segurança

O TAVIR é local/offline-first, mas cada chamada ao GhostCLI envia conteúdo para um serviço externo. No chat, isso inclui o texto do operador, o contexto recente e a instrução/persona do agente. Minimizar dados enviados e deixar essa saída de dados clara na operação.

No OMP, o risco é diferente: ele trabalha com arquivos e comandos no computador, sob as permissões concedidas à sessão. Usar modo de aprovação restritivo, revisar diffs e nunca compartilhar a chave no contexto do modelo. O mesmo gateway não significa que OMP e TAVIR compartilham permissões ou memória.

## Ordem recomendada

1. Configurar e testar OMP → GhostCLI dentro do repositório, com aprovações restritivas.
2. Confirmar chave e URL separadamente no processo do backend TAVIR.
3. Consolidar o adaptador do chat, tratamento de erros e testes com gateway simulado.
4. Sincronizar o seletor de modelos e exibir o estado da integração.
5. Adicionar tool calling de leitura; depois, ações via aprovações.
6. Só então decidir se vale executar OMP como worker disparado pela UI do TAVIR.

## Referências

[1]: https://raw.githubusercontent.com/can1357/oh-my-pi/main/docs/providers.md "OMP: provedores customizados"
[2]: https://ghostcli.cloud/docs#sdk "GhostCLI: SDK, endpoints e tool calling"
[3]: https://raw.githubusercontent.com/can1357/oh-my-pi/main/docs/settings.md "OMP: configurações e aprovações"
