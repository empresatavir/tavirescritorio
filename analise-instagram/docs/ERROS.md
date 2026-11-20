# Erros — RapidAPI da Íris

| Código | Condição | Mensagem segura | Ação | Repetição |
|---|---|---|---|---|
| `IG-RAPID-001` | Nenhuma Key no pool | `Nenhuma Key disponível para este provedor.` | Conferir `config/api_keys.env` e a lista de Keys assinadas. | Não repetir até corrigir a configuração. |
| `IG-RAPID-002` | Quota preventiva ou real zerada | `A quota deste provedor foi atingida.` | Consultar o painel RapidAPI ou usar provedor autorizado com contrato equivalente. | Após reset confirmado ou fallback válido. |
| `IG-RAPID-003` | `401`/`403` | `A Key não está autorizada para este provedor.` | Conferir assinatura, host e plano; não exibir a Key. | Após corrigir a assinatura. |
| `IG-RAPID-004` | `429` | `O provedor limitou temporariamente a consulta.` | Aguardar cooldown e verificar quota/rate limit. | Após 60 segundos ou instrução do header. |
| `IG-RAPID-005` | Timeout/DNS/TLS | `O provedor não respondeu.` | Conferir conectividade e status do provedor. | Uma nova tentativa controlada; depois fallback. |
| `IG-RAPID-006` | Rota não cadastrada | `A operação não está mapeada para este provedor.` | Atualizar o adaptador e seu schema, com revisão. | Não repetir automaticamente. |
| `IG-RAPID-007` | Dados parciais | `A consulta terminou com cobertura parcial.` | Registrar o que foi retornado e marcar o restante indisponível. | Não estimar; complementar apenas por rota equivalente. |
| `IG-COLLECT-001` | Lock/PID ativo | `Já existe uma coleta deste perfil em andamento.` | Acompanhar o PID/log atual; não iniciar outra instância. | Somente depois de o PID encerrar; o archive retoma. |
| `IG-REPORT-001` | Relatório incompleto ou com placeholder | `O relatório ainda não está pronto para entrega.` | Completar seções e remover placeholders antes de finalizar. | Depois da correção editorial. |
| `IG-ENV-001` | Painel offline | `O servidor do Escritório não respondeu.` | Executar o starter e conferir o log privado do runtime. | Watchdog tenta novamente em até cinco minutos. |
| `IG-ENV-004` | Worker offline | `O executor da fila não respondeu.` | Conferir Node/dependências e o log privado do sidecar. | Watchdog tenta novamente em até cinco minutos. |

O log técnico pode guardar provedor, status HTTP, código de correlação e Key label
mascarada/ordinal. Nunca guardar Key, senha, cookie, corpo bruto ou PII desnecessária.
