# Plano integrado: OMP + GhostCLI + TAVIR Escritório

**Status:** planejamento; nenhuma alteração de código foi feita nesta etapa.

## Faz sentido integrar os três?

Sim, desde que cada um tenha uma responsabilidade clara. O OMP é um agente de programação que roda na máquina do desenvolvedor e trabalha no repositório. O GhostCLI é o gateway de modelos. O TAVIR é a aplicação local que usa esses modelos pelo backend. O Claude Code continua sendo outro cliente de desenvolvimento que você já configurou para o mesmo gateway.

Assim, OMP e Claude Code podem usar GhostCLI enquanto você desenvolve o TAVIR; e o chat do próprio TAVIR pode usar GhostCLI quando o escritório estiver em uso. São dois clientes independentes do gateway, não uma cadeia em que o OMP precisa ficar rodando dentro do TAVIR. A documentação do OMP permite cadastrar provedores customizados OpenAI-compatible em `models.yml`; o GhostCLI publica o endpoint OpenAI Chat Completions `/v1/chat/completions` e informa suporte a tool calling. Portanto, o protocolo é compatível em princípio. [1] [2]

```text
Desenvolvimento:
OMP (na máquina, no repositório TAVIR) ──┐
Claude Code (já instalado) ──────────────┼──> GhostCLI ──> modelo selecionado
                                        │
Uso do produto:                         │
TAVIR UI → FastAPI local → adaptador/SDK┘
                      → GhostCLI → FastAPI → histórico SQLite → UI
```

O que **não** vem automaticamente dessa configuração é o TAVIR abrir, controlar ou acompanhar sessões do OMP. Se essa for a intenção futura — por exemplo, apertar “Iniciar job” no TAVIR para o OMP alterar código — será necessário um adaptador de execução separado, com isolamento do repositório, permissões e aprovações. O SDK do GhostCLI, sozinho, apenas fornece acesso ao modelo; não inicia o OMP nem executa ferramentas locais do TAVIR.

## Estado observado do projeto

O chat do backend já chama o GhostCLI via HTTPX em `backend/app/modules/chat/service.py`, usando `GHOSTCLI_API_KEY` e `GHOSTCLI_BASE_URL`, cujo padrão atual é `https://ghostcli.cloud/v1`. Ele envia a instrução/persona do agente e até dez mensagens recentes. Portanto, o uso de GhostCLI no runtime do chat já tem uma base; falta endurecer a configuração e o tratamento de falhas.

O seletor em `frontend/src/features/chat/ChatView.tsx` ainda contém IDs como `claude-opus-4`, `claude-sonnet-4`, `gpt-4o` e `dall-e-3`. Eles devem ser comparados com o catálogo habilitado na sua conta GhostCLI antes de serem apresentados como modelos disponíveis. A documentação atual do OMP e do GhostCLI descreve endpoints e modelos, mas não devemos presumir que o gateway exponha descoberta compatível em `/v1/models`; começar com uma lista estática validada. [1] [2]

## Plano por etapas

### 1. Configurar OMP como cliente de desenvolvimento

- Cadastrar GhostCLI como provedor OpenAI-compatible no arquivo de modelos do OMP (`~/.omp/agent/models.yml`), com `baseUrl: https://ghostcli.cloud/v1`, `api: openai-completions`, `authHeader: true` e os IDs de modelos realmente disponíveis na sua conta. O OMP permite referenciar a chave por nome de variável de ambiente em `apiKey`; não colocar a chave literal no YAML nem no repositório. [1]
- Definir a variável de chave no processo que inicia o OMP. A autenticação do Claude Code não é automaticamente herdada pelo OMP ou pelo backend FastAPI. A documentação do GhostCLI aceita `Authorization: Bearer` e `x-api-key`; a configuração explícita `authHeader: true` usa Bearer. [2]
- Iniciar o OMP dentro da raiz do TAVIR e usar o `AGENTS.md` do projeto como regras de trabalho. Na primeira rodada, manter aprovações restritivas no OMP; não habilitar modo `yolo`. O OMP opera com permissões locais e suas aprovações controlam ações de ferramentas. [3]
- Validar com uma tarefa pequena e reversível: leitura de arquivos, proposta de alteração, revisão do diff e build/testes. Não pedir ao OMP para alterar configuração protegida do Claude Code.

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
