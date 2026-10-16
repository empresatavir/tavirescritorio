# Padrão pétreo de continuidade de projetos

Este padrão é obrigatório para qualquer projeto da TAVIR, interno ou de cliente, e para
qualquer agente, subagente, job ou ferramenta que trabalhe nele. A finalidade é permitir
retomar o trabalho com segurança sem reler todo o repositório nem depender do histórico do chat.

## Contrato obrigatório

1. Todo projeto tem um `PROJECT.md` canônico na raiz do próprio projeto.
2. Antes da primeira análise, plano, edição ou execução, o agente lê o `PROJECT.md`.
3. Se o arquivo ainda não existir, ele é criado a partir de `.agents/templates/PROJECT.md`
   antes do primeiro artefato. Projeto sem repositório próprio usa
   `empresas/<empresa>/projetos/<tipo>/<slug>/PROJECT.md`, conforme
   `.agents/EMPRESA_STANDARD.md`.
4. Depois de cada unidade coerente de trabalho, o agente atualiza o arquivo se houve mudança
   de estado, arquitetura, decisão, entrega, risco, validação ou próximo passo.
5. Um projeto novo ou movido também é registrado em `PROJETOS.md`.
6. Trabalho relevante cujo contexto mudou não está concluído enquanto `PROJECT.md`, o
   histórico aplicável e o Git não estiverem atualizados.
7. A regra vale igualmente para agentes principais, agentes delegados, jobs automáticos e
   ferramentas externas. Quem delega deve incluir essa obrigação no contexto da execução.

## O que o arquivo é

`PROJECT.md` é o retrato vivo e condensado do projeto no presente. Ele é sobrescrito e
curado continuamente; não é diário, changelog nem depósito de conversa. O histórico
cronológico continua em `_LOG.md`, commits e documentos especializados.

O arquivo deve ser curto o bastante para leitura inicial: alvo de até 200 linhas e limite
normal de 250. Use links para detalhes. Nunca grave senhas, tokens, credenciais ou PII.

Contas, `orgId`, `projectId`, repositório e domínio **não** ficam aqui: pertencem ao `AMBIENTE.md`
do projeto, obrigatório por `.agents/PROJECT_ACCESS_STANDARD.md`. `PROJECT.md` responde "o que é e
em que pé está"; `AMBIENTE.md` responde "em qual conta isso vive".

Quando o projeto tem código versionado, o cabeçalho também registra a versão atual e a última tag
estável. A fonte canônica da versão, o `CHANGELOG.md`, os responsáveis de Git e o procedimento de
rollback ficam apontados em **Documentação e suporte**, conforme
`.agents/VERSION_CONTROL_STANDARD.md`.

## Seções obrigatórias

- Objetivo
- Estado atual
- Arquitetura
- Mapa do código e dos artefatos
- Decisões vigentes
- Funcionalidades entregues
- Pendências e próximos gates
- Riscos e armadilhas
- Como validar
- Documentação e suporte
- Retomada rápida
- Marcos condensados

Projetos com qualquer superfície operável também obedecem a
`.agents/DELIVERY_DOCUMENTATION_STANDARD.md`: mantêm `USO.md` canônico, documentação técnica,
regras de negócio e catálogo de erros quando aplicáveis, além do registro seguro no catálogo do
Telegram. Esta seção do `PROJECT.md` aponta todos os artefatos, sua última validação e pendências.
Projeto sem superfície operável declara isso explicitamente nesta seção.

## Hierarquia de confiança

Quando houver divergência, prevalecem nesta ordem:

1. regras de segurança e arquivos `AGENTS.md`/`CLAUDE.md`;
2. código, schema, configuração e comportamento verificados;
3. `PROJECT.md`;
4. README, planos e documentação especializada;
5. logs cronológicos e conversas.

Se a realidade divergir do `PROJECT.md`, o agente corrige o arquivo no mesmo turno. A regra
não autoriza presumir que o resumo está certo sem confrontá-lo com o que a tarefa exige.

## Projetos pausados

Projetos pausados também mantêm `PROJECT.md`. O estado deve dizer claramente por que estão
parados, o que já está comprovado e qual é o primeiro gate objetivo para retomá-los.
