# Preparação de ambiente — Raio X controlado

## Componentes

- Vercel: LP privada por convite e APIs server-side.
- Supabase: cases, sessões de uso único, consentimentos, eventos, aprovações e entregas.
- Escritório/Telegram: criação do convite, análise assistida, revisão por hash e envio explícito.
- Resend: convite inicial automático e transporte dos dois PDFs somente após o segundo gate humano.

## Release em ambiente de teste

1. Vincule o Supabase CLI ao projeto correto sem versionar credenciais.
2. Aplique, nesta ordem, as migrations `20260725170000_raiox_core.sql`,
   `20260822170000_raiox_controlled_pilot.sql`, `20260822200000_raiox_persisted_review_gate.sql` e
   `20260823190000_raiox_unified_intake_invites.sql` e
   `20260823213000_raiox_rpc_least_privilege.sql`.
3. Configure os segredos listados em `supabase/functions/.env.example` com valores aleatórios e
   diferentes para assinatura, webhook e gate interno.
4. Publique `create-case`, `invite-case`, `continue-case`, `notify-dora`, `review-case` e `delivery-case` com JWT desabilitado;
   as funções fazem autenticação própria pelo segredo interno ou do webhook.
5. Mantenha o Database Webhook de `raiox_events` apontando para `notify-dora`.
6. Na Vercel, mantenha o Root Directory do projeto Git em
   `raiox/web` e configure
   `.env.example`; segredos ficam apenas no ambiente server-side. O cron
   `/api/cron/supabase-health` usa `CRON_SECRET` com pelo menos 32 caracteres. Se o Root Directory
   voltar para `.`, a build Git falhará procurando `/vercel/path0/package.json`. O
   `ignoreCommand` versionado em `vercel.json` compara somente este Root Directory: saída `0`
   ignora commits que não alteram o Raio X; saída `1` mantém o build quando algum arquivo do app
   muda. Não remover esse freio para corrigir um preview; revalidar primeiro raiz, diff e projeto.
7. Em `empresas/tavir/privado/.env`, configure:

```dotenv
RAIOX_SUPABASE_URL=https://<project-ref>.supabase.co
RAIOX_INTERNAL_GATE_SECRET=<mesmo valor da Edge Function>
RAIOX_INVITE_GATE_SECRET=<segredo exclusivo para confirmar o estado do convite>
RAIOX_REVIEW_GATE_SECRET=<segredo exclusivo do gate R1 persistido>
RAIOX_DELIVERY_GATE_SECRET=<segredo exclusivo do segundo gate de entrega>
RESEND_API_KEY=<chave privada do remetente verificado>
RAIOX_EMAIL_FROM=TAVIR <raiox@tavir.com.br>
RAIOX_EMAIL_REPLY_TO=empresatavir@gmail.com
RAIOX_RESEND_TEMPLATE_ID=raiox-entrega-v1
RAIOX_APP_URL=https://raiox.tavir.com.br
```

Não envie valores reais pelo chat. `tavir.com.br` está verificado na Resend; somente o token da API
é secreto e permanece no ambiente privado. O template `raiox-entrega-v1` está publicado; sua fonte
versionada fica em `06-entrega/email-raiox-tavir.html` e `.txt`. O logo é anexado pelo runtime como
imagem inline `cid:tavir-logo`, sem depender de asset externo.

A chave administrativa só é necessária para criar, editar ou publicar templates. Depois de publicar,
o runtime deve usar chave separada com **Sending Access** e, quando disponível, restrita a
`tavir.com.br`; Full Access no runtime é proibido antes do gate de produção.

Para gerar os PDFs no computador do Escritório:

```powershell
python -m pip install -r tools/requirements-publicar.txt
```

O runtime tenta Chrome e Edge em perfis efêmeros. A aprovação local só avança depois que
`review-case` persistir `case_id + rodada + os dois hashes`; `delivery-case` exige correspondência exata.
O convite usa os arquivos versionados `06-entrega/email-convite-raiox-tavir.html` e `.txt`, enviados
como HTML/texto transacional pela chave de **Sending Access**. Ele não exige permissão administrativa
de templates e possui registro e chave de idempotência separados da entrega final.

## Teste de aceite

1. `npm run build` e `npm audit --omit=dev` devem passar.
2. `/raiox` exige empresa, contato e e-mail; cria o case e envia automaticamente um link individual.
   URL alterada, vencida ou usada novamente deve falhar.
3. Origem externa, payload acima de 32 KiB, honeypot preenchido e consentimento ausente devem falhar.
4. As duas telas devem permanecer no mesmo link e realizar somente um POST final, sem expor o e-mail
   ao navegador, ao evento do webhook ou ao job de análise.
5. A análise gera exatamente `relatorio-raio-x.md` e `plano-crescimento.md`.
6. Aprovar os documentos persiste a rodada e os dois hashes, mas não envia e-mail; um segundo botão
   prepara a entrega somente quando o registro persistido coincide.
7. Alterar qualquer documento depois da aprovação bloqueia o envio.
8. Repetir o clique não pode gerar segunda entrega; timeout ambíguo exige conferência na Resend.
9. Verificar template TAVIR, logo inline, fallback de texto, anexos, assunto e destinatário usando
   caixa de teste autorizada.
10. Auditor independente registra o veredito antes do uso com convidados reais.
11. Após qualquer `CREATE OR REPLACE FUNCTION` ou mudança de privilégios padrão, conferir os grants
    efetivos: `anon` e `authenticated` não executam as três RPCs do formulário; `service_role`
    continua executando. `REVOKE ... FROM PUBLIC` sozinho não remove grants diretos herdados.

## DOCUMENTAÇÃO E ENTREGA

O operador usa `USO.md`. Mudança em variáveis, gates, comandos ou recuperação de falhas deve atualizar
esse guia no mesmo commit.
