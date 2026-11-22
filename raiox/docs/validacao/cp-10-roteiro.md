# CP-10 — Roteiro do smoke com caso fictício

Primeira vez que o Raio-X novo escreve no Supabase e manda e-mail de verdade. O teste usa só dados
inventados e uma caixa de e-mail da própria TAVIR, e termina com o expurgo e a prova de que nada
ficou. Quem clica é o Carlos; o Claude acompanha, confere e anota.

Este roteiro **não** libera o piloto. "liberado piloto" continua proibido até o CP-12.

---

## Parte A — Preparação (uma vez, antes do teste)

### A1. Caixa de e-mail do teste

Antes do CP-12, o Escritório só manda e-mail para o **mesmo domínio do remetente** (hoje
`tavir.com.br`). O `empresatavir@gmail.com` citado no `raiox/web/USO.md` será recusado.

- [ ] Escolher uma caixa `@tavir.com.br` que você consegue ler durante o teste. Chamada aqui de
      **caixa do teste**.

### A2. Supabase (projeto `skcbjwqajdovxlsxeszv`)

Rodar de `raiox/web`. Nenhum valor de segredo passa pelo chat.

1. [ ] Vincular a pasta ao projeto:

   ```powershell
   cd raiox/web; npx supabase link --project-ref skcbjwqajdovxlsxeszv
   ```

2. [ ] Conferir o que já foi aplicado e ver a lista do que falta:

   ```powershell
   npx supabase migration list
   ```

   Devem aparecer como pendentes só as quatro do G-PR1:
   `20261121120000_raiox_gpr1_decisoes_email`, `20261121130000_raiox_gpr1_optin`,
   `20261121140000_raiox_gpr1_revogacao`, `20261121150000_raiox_gpr1_expurgo`.
   Se aparecer qualquer outra como pendente, **parar** e me mostrar a lista.

3. [ ] Aplicar:

   ```powershell
   npx supabase db push
   ```

4. [ ] Conferir as permissões efetivas no SQL Editor (item 11 do teste de aceite do `SETUP.md`):

   ```sql
   select p.proname, r.rolname,
          has_function_privilege(r.rolname, p.oid, 'execute') as pode
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
   cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
   where p.proname like '%raiox%'
   order by 1, 2;
   ```

   Esperado: `anon` e `authenticated` com `pode = false` em todas; `service_role` com `true`.

5. [ ] Segredos das funções (Dashboard › Edge Functions › Secrets). Os que já existem ficam como
   estão. Conferir que existem: `RAIOX_INTERNAL_GATE_SECRET`, `RAIOX_INVITE_GATE_SECRET`,
   `RAIOX_REVIEW_GATE_SECRET`, `RAIOX_DELIVERY_GATE_SECRET`, `FORM_LINK_SIGNING_SECRET`,
   `RAIOX_OFFICE_SYNC_SECRET`. Trocar **só** `RAIOX_APP_URL` para o endereço da prévia da Vercel
   (passo A3). Ele volta para `https://raiox.tavir.com.br` na F9.

6. [ ] Publicar as funções (todas com JWT desligado, já no `config.toml`):

   ```powershell
   foreach ($f in 'create-case','invite-case','continue-case','review-case','delivery-case','office-raiox-sync','titular-case') { npx supabase functions deploy $f --project-ref skcbjwqajdovxlsxeszv }
   ```

   **Não** publicar `notify-dora` (Telegram saiu do Raio-X).

> **Efeito colateral esperado:** depois disso, o formulário antigo que está no ar em
> `raiox.tavir.com.br` (ainda do repositório AgenciaIA) não cria caso novo, porque o `create-case`
> passa a exigir opt-in. Ninguém usa esse caminho hoje; ele é substituído na F9.

### A3. Prévia do formulário novo na Vercel

O formulário com as três decisões e a confirmação de e-mail está só neste repositório. Ele precisa
de uma prévia publicada para o link do convite abrir.

1. [ ] Em Vercel › projeto `agenciaia` › Settings › Environment Variables, escopo **Preview**:
   `SUPABASE_URL`, `SUPA_SERVICE_ROLE_KEY`, `FORM_LINK_SIGNING_SECRET` (mesmo valor do Supabase),
   os quatro `RAIOX_*_GATE_SECRET`, `RESEND_API_KEY` (chave com Sending Access),
   `RAIOX_EMAIL_FROM` e `RAIOX_EMAIL_ENABLED=1`. Não mexer no escopo Production.
2. [ ] Publicar a prévia a partir desta branch:

   ```powershell
   cd raiox/web; npx vercel link; npx vercel
   ```

   Anotar o endereço que ela devolver (`https://...vercel.app`). Esse é o `RAIOX_APP_URL` do
   passo A2.5 e também entra como `RAIOX_APP_URL` no escopo Preview. Depois de trocar as variáveis,
   rodar `npx vercel` de novo para a prévia pegar o valor.
3. [ ] Abrir `<prévia>/privacidade` no navegador: a página do aviso precisa carregar. Se pedir login
   da Vercel, é a proteção de prévia; entre com a conta da TAVIR.

### A4. Escritório

1. [ ] Configurações › **Raio-X Supabase**: URL do projeto e os cinco segredos (interno, revisão,
   entrega, convite, sincronização). Mesmos valores do Supabase.
2. [ ] Configurações › **Resend**: chave da API, remetente `TAVIR <raiox@tavir.com.br>`; resposta e
   modelo podem ficar vazios.
3. [ ] Raio-X › **Liberações** › escrita no Supabase › digitar `liberado CP-10`.
   **Não** liberar o e-mail externo.
4. [ ] Motor: escolher **Cursor** ou **Antigravity** (os dois passaram na conformidade da F11).

Avise quando A1–A4 estiverem prontos. Antes de começar eu rodo testes, build e `raiox:scan` e
confirmo a branch.

---

## Parte B — O teste

Dados do caso: os da fixture fictícia (`tests/fixtures/raiox/caso-ficticio/`).

| Campo | Valor |
|---|---|
| Empresa | `TESTE INTERNO — DADOS FICTÍCIOS · Café Lumen` |
| Contato | `Pessoa Fictícia` |
| E-mail | a caixa do teste |
| Links | nenhum link de terceiro (site e Instagram ficam em branco ou "não tem") |

Use o mesmo conteúdo inventado em todas as respostas. Nada de cliente real.

### B1. Convite pelo Escritório

1. Raio-X › **Enviar convite**. Preencher empresa, contato, e-mail e o registro do aceite
   (canal, horário, versão do aviso).
2. Conferir:
   - [ ] O botão só habilita com o aceite completo.
   - [ ] Aparece um caso local `RX-XXXXXXXX` com o card "Formulário no Supabase".
   - [ ] O convite chega na caixa do teste, com a marca TAVIR e um link `/form/...`.
3. Teste negativo: abrir de novo **Enviar convite** e tentar um e-mail `@gmail.com`.
   - [ ] O Escritório recusa antes de chamar o Supabase.

### B2. Convite pelo APK

Depende do PR [#23](https://github.com/empresatavir/tavirescritorio/pull/23) e de um APK
gerado com o formulário novo. Se o APK ainda não estiver pronto, este passo fica **adiado**: não
trava o resto, mas tem de passar antes do CP-12.

1. No app, pedir um convite com os mesmos dados fictícios (troque a empresa para
   `... · Café Lumen APK`).
2. Conferir:
   - [ ] Aparece em "Convites pedidos pelo app" no Raio-X, sem nenhum e-mail enviado ainda.
   - [ ] "Revisar e enviar" abre o convite preenchido; enviar só com o seu clique.
   - [ ] O convite chega na caixa do teste.

Esse segundo caso serve para o teste de revogação (B7).

### B3. Formulário 1 e confirmação de e-mail

1. Abrir o link do convite B1. Responder as duas telas com os dados fictícios.
2. Conferir:
   - [ ] As três decisões aparecem **desmarcadas**.
   - [ ] Envio sem as decisões obrigatórias é recusado.
   - [ ] Depois de enviar, chega na caixa do teste o e-mail "Confirme seu e-mail para o Raio X TAVIR".
   - [ ] O link de confirmação funciona uma vez; aberto de novo, diz que não vale mais.
   - [ ] Abrir de novo o link do formulário: não aceita outro envio.
3. No Escritório: **Sincronizar formulários**.
   - [ ] O card passa a mostrar o formulário 1 recebido.

### B4. Formulário 2 e autorização da análise

1. No caso: **Gerar formulário 2** › **Copiar link** e mandar para a caixa do teste (você mesmo
   manda; o link só vai para o e-mail confirmado).
2. Responder o formulário 2 com os dados fictícios. **Sincronizar formulários**.
3. **Autorizar análise**.
   - [ ] Sem e-mail confirmado, a autorização seria recusada (já coberto em teste; só observar
         que agora passa).
   - [ ] O intake chega ao caso local (`analysis-input.json`), sem o e-mail.

### B5. Análise, revisão e documentos

Mesmo caminho do CP-8:
1. Rodar a análise no motor escolhido. Revisar as evidências (aprovar e rejeitar pelo menos uma).
2. Escolher a prioridade, preencher a devolutiva, gerar os documentos, checagem, PDFs.
3. **Aprovar** os dois documentos.
   - [ ] Com caso sem link, as fontes aparecem como `indisponivel`, sem número inventado.
   - [ ] Checagem limpa.
   - [ ] A aprovação é gravada no Supabase (`review-case`) com a rodada e os dois hashes.
4. Teste negativo: depois de aprovar, alterar uma vírgula de um `.md` do caso.
   - [ ] O Escritório bloqueia a entrega e pede nova aprovação. Desfazer a alteração e aprovar de
         novo.

### B6. Entrega em dois atos

1. Aba Devolutiva › Entrega › **Preparar entrega por e-mail**.
2. **Autorizar envio para <caixa do teste>**, digitando o e-mail para confirmar.
3. Conferir:
   - [ ] Chega na caixa do teste o e-mail com `relatorio-raio-x.pdf` e `plano-crescimento.pdf`,
         marca TAVIR, versão em texto.
   - [ ] O caso registra a entrega pelo canal `resend`.
   - [ ] Clicar de novo: "Esta entrega já foi feita. Não reenvie." Nenhum segundo e-mail chega.
   - [ ] No painel da Resend aparece um único envio para esse caso.

### B7. Revogação (caso do APK; se B2 foi adiado, use um terceiro convite feito pelo Escritório)

1. No caso: **Registrar revogação**, com o motivo "teste CP-10".
2. Conferir:
   - [ ] As etapas seguintes do caso ficam travadas na tela.
   - [ ] Sem aviso de "O Supabase ainda não recebeu a revogação" (se aparecer, clicar
         **Levar ao Supabase**).
   - [ ] O link do formulário desse caso deixa de abrir.

### B8. Expurgo e prova de ausência

Para cada caso do teste (B1 e B7):
1. **Expurgar caso** › conferir a prévia › digitar o código do caso.
2. Conferir no relatório que o Escritório grava em `<raiz privada>/expurgos/`:
   - [ ] Pasta do caso, PDFs exportados, temporários e conversas do motor: "apagado".
   - [ ] Supabase: contagens "antes" maiores que zero e "depois" todas zero.
   - [ ] Itens marcados "manual" (Resend, arquivo compartilhado do motor): fazer à mão e anotar.
3. Prova independente no SQL Editor, com o UUID do caso (aparece no relatório):

   ```sql
   select 'cases' t, count(*) from raiox_cases where id = '<uuid>'
   union all select 'form_sessions', count(*) from raiox_form_sessions where case_id = '<uuid>'
   union all select 'form_submissions', count(*) from raiox_form_submissions where case_id = '<uuid>'
   union all select 'consents', count(*) from raiox_consents where case_id = '<uuid>'
   union all select 'events', count(*) from raiox_events where case_id = '<uuid>'
   union all select 'approvals', count(*) from raiox_approvals where case_id = '<uuid>'
   union all select 'documents', count(*) from raiox_documents where case_id = '<uuid>'
   union all select 'email_deliveries', count(*) from raiox_email_deliveries where case_id = '<uuid>'
   union all select 'invite_deliveries', count(*) from raiox_invite_deliveries where case_id = '<uuid>'
   union all select 'email_verifications', count(*) from raiox_email_verifications where case_id = '<uuid>';
   ```

   - [ ] Todas as linhas com zero.
4. Apagar da caixa do teste os e-mails do teste (convite, confirmação, entrega).
5. **Sincronizar formulários** no Escritório.
   - [ ] O caso expurgado não volta para a lista.

### B9. Fechamento (Claude)

- [ ] `npm run raiox:scan` limpo e `git status` sem nenhum arquivo do caso.
- [ ] Evidência do CP-10 em `raiox/docs/validacao/g-pr1.md` (horários, resultado de cada passo,
      contagens do expurgo; sem e-mail, sem UUID, sem conteúdo).
- [ ] Falhas viram tarefas `T10.n` e são corrigidas antes da F9.
- [ ] A liberação "liberado CP-10" continua ligada (a F9 precisa dela). `RAIOX_EMAIL_ENABLED=1`
      fica só no escopo Preview da Vercel.

---

## Parte C — Anotações durante o teste

| Passo | Horário | Resultado | Observação |
|---|---|---|---|
| A2 migrações | | | |
| A2 funções | | | |
| A3 prévia | | | |
| B1 convite Escritório | | | |
| B2 convite APK | | | |
| B3 formulário 1 + confirmação | | | |
| B4 formulário 2 + autorização | | | |
| B5 análise e aprovação | | | |
| B6 entrega | | | |
| B7 revogação | | | |
| B8 expurgo + SQL | | | |

## Se algo der errado

- Não repetir nada que diga "incerto" (convite ou entrega): conferir o painel da Resend antes.
- Não editar o banco à mão. Mostrar a mensagem da tela e parar.
- E-mail para lugar errado, link vazado ou segredo exposto: seguir
  `raiox/docs/validacao/runbook-incidentes.md`.
- Erros conhecidos e o que fazer: seção Troubleshooting de `raiox/web/USO.md`.
