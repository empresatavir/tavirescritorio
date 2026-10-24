# Relatório QA — http://localhost:9002/fabrica/d49fe638-14a1-4291-8692-f0c350102f60

**Data:** 2026-10-22T15:50:00  
**Ambiente:** preview  
**Viewport:** 1440x900  
**Duração:** 540.0s | **Ações:** 12  

## ❌ Resultado: FALHOU

| Severidade | Quantidade |
|------------|-----------|
| 🔴 CRÍTICO | 0 |
| 🟠 ALTO | 3 |
| 🟡 MÉDIO | 4 |
| 🔵 BAIXO | 1 |
| **Total** | **8** |

## Achados Detalhados

### 1. [🟠 ALTO] Validar pastas não valida a pasta

- **ID:** `QA-001`
- **Categoria:** interatividade
- **Ação:** Clicar em Validar pastas
- **Comportamento da UI:** O botão só repete o caminho do workspace. Ele não diz se as pastas esperadas existem.
- **Rede:** `Nenhuma chamada de API`
- **💡 Sugestão:** Conferir no backend as pastas esperadas da etapa e mostrar o que existe e o que falta.

### 2. [🟠 ALTO] Dois modelos do Cursor são recusados pelo agente local

- **ID:** `QA-002`
- **Categoria:** motores
- **Ação:** Ler GPT-5 e Sonnet Thinking no diálogo Configurar
- **Comportamento da UI:** Os dois modelos aparecem como escolhíveis.
- **Rede:** `O agente local respondeu: Cannot use this model: gpt-5. O mesmo ocorreu com sonnet-4-thinking.`
- **💡 Sugestão:** Listar só os ids que o agente local aceita, ou mapear cada rótulo para um id aceito.

### 3. [🟠 ALTO] O relatório da etapa atual é de uma entrega anterior

- **ID:** `QA-003`
- **Categoria:** consistência
- **Ação:** Ler o relatório do agente na visão geral
- **Comportamento da UI:** A etapa em execução é Implementação controlada · backend. O texto é changes/NOTES.md e o rodapé diz que o arquivo foi gerado na etapa m_code, com o modelo claude-opus-5-5.
- **Rede:** `GET ai-settings devolve cursor, auto-smart, balanced.`
- **💡 Sugestão:** Marcar o arquivo como entrega anterior enquanto a etapa atual ainda está em execução.

### 4. [🟡 MÉDIO] O chat abre no primeiro agente e mistura as mensagens

- **ID:** `QA-004`
- **Categoria:** interatividade
- **Ação:** Abrir a aba Chat
- **Comportamento da UI:** O título do fio é Dora Descoberta. As mensagens visíveis são do Diego Sistemas.
- **💡 Sugestão:** Abrir no agente da etapa atual e mostrar só as mensagens desse agente.

### 5. [🟡 MÉDIO] A execução automática não existe no backend

- **ID:** `QA-005`
- **Categoria:** consistência
- **Ação:** Ler os dois interruptores e o run
- **Comportamento da UI:** Os dois interruptores dizem desligada. Isso está certo neste navegador.
- **Rede:** `O run não guarda esse estado. O valor fica só no localStorage.`
- **💡 Sugestão:** Guardar ligado ou desligado no run. O interruptor não foi ligado neste teste.

### 6. [🟡 MÉDIO] A primeira pintura diz que a esteira está vazia

- **ID:** `QA-006`
- **Categoria:** interatividade
- **Ação:** Recarregar a tela do projeto
- **Comportamento da UI:** Por cerca de um segundo a visão geral diz que o run ainda não materializou stages. Depois as 10 etapas aparecem.
- **Rede:** `GET /run já devolvia as 10 etapas.`
- **💡 Sugestão:** Mostrar carregando até o pedido voltar.

### 7. [🟡 MÉDIO] O modo do Auto não chega ao agente

- **ID:** `QA-007`
- **Categoria:** motores
- **Ação:** Selecionar Cursor e Auto em Configurar
- **Comportamento da UI:** O terceiro campo vira Modo, com Cost, Balance e Intelligence.
- **Rede:** `A chamada local usa só o modelo auto. O modo salvo não entra no comando.`
- **💡 Sugestão:** Enviar o modo quando o agente local aceitar, ou tirar o campo enquanto ele não tiver efeito.

### 8. [🔵 BAIXO] A nota do modal tem um espaço antes do ponto

- **ID:** `QA-008`
- **Categoria:** modais
- **Ação:** Abrir Configurar com Auto selecionado
- **Comportamento da UI:** A nota termina com a palavra modo, um espaço e o ponto.
- **💡 Sugestão:** Remover o espaço antes do ponto.

## Caminho Feliz

- **Status:** ❌ parcial
- **Ações:** 12
- **Observações:** Esteira, kanban, SSE, Configurar e Pasta local conferem com o backend. Ghost Opus, Cursor Auto e Cursor Composer responderam ok. Executar, Concluir, Marcar falha, Pausar, Refazer e Autorizar não foram acionados.

## Limitações

- Upload não se aplica a esta tela.
- Executar, Concluir etapa, Marcar falha, Pausar, Refazer projeto, Refazer entrega e Autorizar não foram clicados, para não alterar a esteira.
- O interruptor de execução automática não foi ligado.
- Sonnet e Fable do Ghost não receberam uma chamada própria. Só o Opus foi sondado.
- O runner genérico não enxerga os controles desta tela. Os achados vêm da passagem dirigida.

---
*Gerado por QA Usabilidade TAVIR em 2026-10-22 12:48*