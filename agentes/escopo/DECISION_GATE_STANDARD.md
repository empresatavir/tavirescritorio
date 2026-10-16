# Padrão de gates de decisão do CEO

Um agente não pode encerrar uma fase apenas com “faltam decisões” quando o CEO precisa agir. O
bloqueio deve virar uma interface legível e resolvível no Escritório/Telegram.

## Quando usar

Use um gate de decisão quando uma fase depende de escolhas do CEO que alteram escopo, operação,
custo, risco, arquitetura ou autorização. Defeito técnico e reprovação de auditoria não viram
escolhas: continuam como bloqueio técnico e voltam ao responsável pela correção.

## Entrega obrigatória

1. As perguntas completas permanecem no documento canônico do projeto.
2. O gate é cadastrado em `escritorio/decision_gates.json`, vinculado por `kanban_slug + phase_order`.
3. Cada decisão declara: `id`, título, pergunta, por que importa, recomendação e opções. Opção que
   impede avanço usa `blocking: true`; resposta livre usa a opção reservada `id: custom`.
4. `project_root` e `decision_document` são allowlist server-side; callback nunca carrega caminho,
   pergunta, resposta, agente ou estado.
5. O Telegram apresenta uma decisão por vez, permite ler o documento consolidado e alterar qualquer
   resposta. Senha, token, chave, segredo e PII não entram no gate.
6. A fase só pode ser retomada quando todas as decisões foram respondidas e nenhuma opção bloqueante
   permanece. A retomada recebe o caminho do registro e aplica as respostas no documento do projeto.
7. O agente revalida o gate; a resposta do CEO não aprova automaticamente requisito inconsistente,
   não substitui Jurídico/QA/Auditor e não altera `liberado_para_deploy`.

## Estados

```text
PENDENTE → pergunta atual → resposta auditada → próxima pergunta
                                  ↓
                      opção bloqueante → BLOQUEADO
                                  ↓ alterar
todas não bloqueantes → PRONTO PARA REVALIDAÇÃO → mesmo agente aplica → APROVADO|BLOQUEADO
```

## UX obrigatória

- Nunca mostrar apenas “resolver bloqueio” para gate de decisão.
- Mostrar quantidade respondida/total e o motivo de cada pergunta.
- Recomendação é explícita, não seleção silenciosa.
- Botões mínimos: opções, **Definir outra resposta**, **Ler documento**, **Alterar** e
  **Aplicar decisões e retomar** quando elegível.
- Callback antigo, página inexistente, card/fase alterados ou replay falham fechados.
