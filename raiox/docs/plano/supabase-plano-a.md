# Plano A — Supabase como espinha dorsal da esteira

## Decisão

Supabase será o sistema de registro dos cases, formulários, consentimentos, aprovações, eventos,
documentos e métricas. Vercel hospeda os formulários e chama rotas server-side; Telegram privado
continua sendo apenas a interface de comando do Carlos.

O navegador do cliente **não acessa o banco diretamente**. Nenhuma `service_role`, token de bot,
chave de Resend ou dado de outro case chega ao JavaScript do formulário.

## Fluxo Plano A

```text
Carlos abre Raio X no Telegram
→ Dora cria case + sessão do Formulário 1 no Supabase
→ Carlos encaminha o link Vercel ao cliente
→ cliente envia Formulário 1
→ rota Vercel valida link/consentimentos e grava submissão + evento atômico
→ webhook/Edge Function avisa Dora no Telegram privado
→ Carlos vê resumo seguro e escolhe “Gerar formulário 2” ou “Iniciar Raio X”
→ Dora cria sessão temporária do Formulário 2
→ Carlos encaminha o novo link ao cliente
→ resposta 2 volta ao mesmo case e libera a análise aprovada
```

O Formulário 2 não é obrigatório por padrão: Dora o sugere quando faltar contexto relevante ou
quando o case exigir investigação complementar. Isso evita colocar duas barreiras desnecessárias
na experiência do cliente.

## Modelo mínimo de dados

| Tabela | Finalidade |
|---|---|
| `raiox_cases` | estado do case, empresa, contato e versão do fluxo |
| `raiox_form_sessions` | etapa 1/2, token opaco com hash, expiração, uso único e estado |
| `raiox_form_submissions` | respostas estruturadas, versão e horário de envio |
| `raiox_consents` | escopo, aceite, texto/versionamento e horário |
| `raiox_events` | outbox idempotente: `form_1_submitted`, `form_2_submitted`, falhas e entrega |
| `raiox_approvals` | decisão do Carlos no Telegram, motivo, expiração e seleção de IA |
| `raiox_documents` | versão, tipo, referência privada e status de revisão/envio |
| `raiox_metrics_events` | telemetria pseudonimizada da operação |

Dados de cliente não são gravados em Git, logs de job ou callbacks do Telegram. A mensagem de
Telegram mostra `case_id`, empresa e próxima decisão; links e respostas ficam no banco.

## Integração entre Vercel, Supabase e Dora

1. A rota Vercel `POST /api/raio-x/form-submit` recebe um token opaco e os campos da etapa.
2. No servidor, valida assinatura, expiração, etapa e uso único; em uma transação grava resposta,
   consentimentos e evento no outbox.
3. Um Database Webhook aciona a Edge Function `notify-dora` para o evento novo. A função envia ao
   bot privado o cartão: “Formulário 1 recebido — Gerar formulário 2 / Iniciar Raio X / Ver lacunas”.
4. Ao clicar, o bot local chama uma Edge Function interna autenticada por segredo próprio para criar
   nova sessão ou mudar o estado. Ele nunca recebe a `service_role` do Supabase.
5. Workers de análise consomem apenas eventos aprovados e devolvem referências de evidência e
   documentos privados ao mesmo `case_id`.

O token do Telegram, se usado pela Edge Function de notificação, fica como segredo do projeto
Supabase; o poller local permanece o único consumidor de atualizações/callbacks. Alternativamente,
a fase de implementação pode usar um adaptador local de eventos para evitar duplicar o token — a
escolha dependerá da auditoria de ameaça e disponibilidade da máquina do Carlos.

## Controles obrigatórios

- RLS em todas as tabelas expostas; nenhuma política permissiva para ler cases.
- Tokens de formulário com hash, validade curta, uso único e sem PII no URL.
- `case_id`/etapa conferidos no servidor; proibir enumeração, troca de etapa e reenvio.
- Webhook/Edge Function com autenticação, allowlist de origem, idempotência e registro de falha.
- `service_role` e segredos somente em Vercel/Supabase/local privado, nunca no browser.
- Storage privado para arquivos e URLs assinadas de vida curta para os dois documentos.
- Retenção, exclusão e base legal definidas antes do primeiro dado real.

## Por que não PDF/e-mail entre formulários

O melhor insumo para Dora é a submissão estruturada do case no Supabase. Markdown é um fallback
legível para humano; PDF é entrega visual, não transporte de dados. Usar arquivo intermediário
perde validação, idempotência, consentimento por etapa e a trilha de auditoria.

## Próximo gate técnico

Antes de criar projeto Supabase ou Vercel: aprovar o schema, regras de retenção, dono do projeto
Supabase e a opção de notificação (Edge Function com token de bot ou adaptador local). Em seguida,
o Auditor Seg/LGPD revisa migration, RLS, funções e threat model antes de deploy.
