# Relatório de segurança — Raio X

> Estado: **deploy técnico validado no domínio próprio / smoke sintético encerrado / clientes reais bloqueados**
>
> `liberado_para_teste_interno_controlado: true`
>
> `smoke_sintetico_encerrado: true`
>
> `liberado_para_piloto_real_assistido: false`
>
> `liberado_para_operacao_comercial: false`
>
> `liberado_para_deploy: true`

## Perfil

`INTERNA` + `LP`; modificadores `dados_pessoais`, `webhook`, `api_publica`, `admin`, `ia_externa` e
integrações externas. O formulário é público por link, mas dados e operação são privados.

## Controles implementados no scaffold

- Rotas server-side; `service_role` apenas no servidor.
- Link opaco, HMAC, expiração, hash no banco e uso único via transação.
- RLS ligado e sem política `anon`/`authenticated`; navegador não consulta tabelas.
- CSP, `frame-ancestors`, `form-action`, headers básicos, `noindex` e limite de payload.
- Eventos com chave de idempotência e callbacks sem resposta de formulário no Telegram.
- Segredos previstos somente em `.env.local`, Vercel, Supabase e arquivo privado do Escritório.

## Bloqueadores antes de produção

1. Validar migration em projeto Supabase de teste e executar testes de replay/BOLA/etapa cruzada.
2. Configurar rate limit e proteção anti-abuso além do honeypot.
3. Provar assinatura/autenticação do Database Webhook e rotação dos segredos.
4. Revisar LGPD: aviso, base legal, retenção, exclusão e uso de IA externa.
5. Auditor independente revisar código, headers em preview e permissões Supabase/Vercel.

## Evidência parcial — gate de análise assistida (2026-07-25)

- `continue-case` valida estado do case e consentimento `public_sources` antes de preparar análise.
- O payload devolvido usa allowlist de campos e exclui nome do contato e e-mail.
- O pacote é gravado no workspace privado ignorado pelo Git; o prompt/job recebe somente o caminho.
- O callback abre um rascunho com escolha de provedor, modelo e esforço; replay não cria job sem o
  clique posterior em `Executar`.
- `python tools/test_telegram_ceo.py`: 33 testes aprovados.
- Nova função publicada pelo painel autenticado na organização TAVIR; chamada interna real retornou
  HTTP 200 com `case_id` correspondente e pacote autorizado. O pacote foi gravado em caminho
  ignorado pelo Git; o runtime abriu o gate `confirming` e permaneceu com zero jobs ativos.

O veredito permanece inalterado: auditoria incompleta e `liberado_para_deploy: false`.

## Disponibilidade operacional — 2026-08-07

- O hostname do projeto retornou `NXDOMAIN` no resolvedor local, Cloudflare e Google; nenhum payload
  chegou à Edge Function durante a tentativa de abrir o case real.
- O tratamento de erro local passou a separar DNS/pausa, autenticação, função ausente e erro 5xx,
  sem imprimir segredo nem orientar reenvio inútil dos mesmos dados.
- `python tools/test_telegram_ceo.py`: 35 testes aprovados.
- Risco residual: plano Free pode pausar novamente após baixa atividade; restauração e estratégia
  de disponibilidade devem ser decididas antes de operação comercial contínua.

### Mitigação preventiva implementada

- Rota `GET /api/cron/supabase-health` acessível somente com `Authorization: Bearer CRON_SECRET`;
  comparação em tempo constante e falha fechada quando o segredo está ausente ou curto.
- `CRON_SECRET` com 32 bytes aleatórios, armazenado como variável sensível somente em Production;
  nenhum valor real foi persistido no repositório ou retornado pela API.
- Três consultas mínimas por execução, sem log ou resposta com identificadores da tabela; timeout
  por chamada, `Cache-Control: no-store` e erro público genérico.
- Cron Vercel diário às 11:17 UTC, compatível com a frequência do plano Hobby.
- `npm run build`: checagem sintática e quatro testes automatizados aprovados.
- Aceite no alias público: chamada sem segredo retornou HTTP 401; chamada com o segredo sensível,
  mantido apenas em memória durante o teste, retornou HTTP 200 e `checks: 3`.

O cron reduz o risco de pausa por inatividade, mas não é SLA nem monitoramento externo. O veredito
geral permanece `liberado_para_deploy: false` até a auditoria independente e os bloqueadores acima.

## Gate móvel de revisão — 2026-08-08

- Perfil permanece `INTERNA` + `dados_pessoais`, `admin` e integração externa Telegram.
- Os documentos saem do diretório privado diretamente para `sendDocument`; não recebem URL pública.
- `case_id` aceita somente UUID e o caminho é resolvido sob `privado/raiox-cases`; symlink, arquivo
  vazio e arquivo acima de 10 MiB são recusados.
- Callback continua restrito ao par `TELEGRAM_CEO_CHAT_ID + TELEGRAM_CEO_USER_ID` já validado.
- A aprovação é idempotente e vinculada aos SHA-256 dos dois anexos; mudança posterior fecha o gate
  como `stale`. Aprovação não dispara e-mail.
- Solicitação de ajustes abre captura temporária no chat privado e enfileira uma nova rodada com o
  mesmo provedor/modelo/esforço, preservando o bloqueio de envio.
- `python tools/test_telegram_ceo.py`: 40 testes offline aprovados, incluindo usuário forjado,
  mutação após upload, aprovação por hash e revisão na mesma rota.
- Aceite operacional: poller reiniciado saudável e dois anexos do primeiro case entregues pela Bot
  API; estado privado `pending_review`, rodada 1, com dois SHA-256 válidos.

Risco residual: o Telegram passa a armazenar cópia dos documentos na conta privada do CEO; proteção
do aparelho, sessão, 2FA e política de retenção continuam controles operacionais. O veredito geral
permanece `liberado_para_deploy: false`; esta evidência não substitui a auditoria independente.

## MicroSaaS controlado e entrega por e-mail — 2026-08-22

### Controles implementados localmente

- LP por convite redesenhada sem dependências externas, com nome da empresa inserido apenas por
  `textContent`, consentimentos obrigatórios e aviso de tratamento/retensão.
- `noindex` em meta, header e `robots.txt`; CSP sem `unsafe-inline`, HSTS, COOP, CORP, política de
  permissões restritiva e cache desativado no formulário.
- Migration nova limita a dez falhas por sessão e registra entrega por case, rodada, hashes e chave
  idempotente sem duplicar o e-mail do destinatário.
- Aprovação dos documentos e envio são callbacks diferentes. Antes do segundo clique, os SHA-256
  locais são recalculados; qualquer alteração fecha o gate.
- Os PDFs são renderizados no diretório privado, limitados a 15 MiB cada e enviados por Resend com
  `Idempotency-Key`. Timeout de resposta vira estado `delivery_uncertain` e bloqueia retry cego.
- O job de análise continua sem nome/e-mail. Esses dados só retornam pela Edge Function interna no
  instante de preparar uma entrega já autorizada.
- Suíte completa do Telegram: 60 testes aprovados. `npm run build`: 7 testes aprovados.
  `npm audit --omit=dev`: zero vulnerabilidades no snapshot verificado.

### Bloqueadores atuais

1. `20260822170000_raiox_controlled_pilot.sql` e `delivery-case` ainda não foram aplicados no
   Supabase; o CLI não estava disponível localmente para validar/publicar a migration.
2. Expurgo em 90 dias está definido como procedimento manual, não como rotina auditada e testada.
3. O aviso de privacidade é rascunho operacional e precisa de revisão jurídica antes do piloto.
4. Faltam teste ponta a ponta em ambiente de teste, matriz negativa completa e auditor independente.

### Evidência Resend runtime — 2026-08-22

- `tavir.com.br` verificado na região `sa-east-1`; DKIM e os dois registros SPF constam como
  `verified`. DMARC foi publicado inicialmente em `p=none` para monitorar antes de enforcement.
- Domínio configurado somente para envio, sem receiving e sem rastreamento de abertura/clique.
- Chave exclusiva `raiox-tavir-production` criada com `sending_access` e solicitação de restrição ao
  domínio TAVIR. Token gravado somente em `empresas/tavir/privado/.env`, arquivo confirmado como
  ignorado pelo Git; presença e prefixo foram validados sem imprimir o valor.
- Prova negativa: `GET /domains` com a chave runtime retornou 401, confirmando ausência de acesso
  administrativo. A API de listagem não expõe permission/domain da chave; o escopo por domínio foi
  definido na criação, mas não é reconsultável por essa rota.
- Prova positiva: envio por `TAVIR <raiox@tavir.com.br>` para caixa interna autorizada foi aceito e
  confirmado como `delivered` (`e88239a3-3865-406b-9e7b-30dcab98f30b`).
- O remetente especial `onboarding@resend.dev` também foi aceito no teste negativo e entregue; esse
  resultado é tratado como exceção/inconclusivo para provar restrição de domínio, não como aprovação.

### Template transacional TAVIR — 2026-08-22

- Template `raiox-entrega-v1` criado e publicado no Resend com fonte HTML e texto versionada em
  `06-entrega/`; usa tabelas, estilos inline, cores oficiais e nenhuma fonte, script ou asset remoto.
- O logo oficial é enviado como anexo inline `cid:tavir-logo`; o runtime falha fechado quando o
  template ou o arquivo de marca não estão disponíveis.
- Variáveis de nome/empresa recebem normalização de controles; valores usados no HTML são escapados.
  Assunto também é normalizado para bloquear injeção de cabeçalho.
- A integração envia por alias publicado e mantém `Idempotency-Key`; a resposta HTTP passou a usar
  `User-Agent: TAVIR-RaioX/1.0` após o endpoint recusar o cliente genérico com Cloudflare 1010.
- `python tools/test_telegram_ceo.py`: 62 testes aprovados, incluindo CID, template obrigatório,
  escape de HTML e remoção de CR/LF. A prévia interna foi confirmada como `delivered`
  (`53564e20-5004-40e5-a9b4-9ad249c3556f`).
- Para publicar o template, Carlos elevou temporariamente `raiox-tavir-production` a **Full Access**.
  Carlos confirmou no mesmo dia que a chave runtime voltou a **Sending Access**; o excesso temporário
  de privilégio está encerrado.

Veredito mantido: `liberado_para_deploy: false`. O código pode ser versionado, mas convidados reais
não devem receber links até os quatro itens acima serem resolvidos e o auditor alterar o gate.

## Preflight independente para produção sintética — 2026-08-22

- Veredito para clientes reais: **REPROVADO**, `liberado_para_deploy: false`.
- Veredito condicional para smoke test interno: permitido somente com dados integralmente fictícios,
  caixa TAVIR autorizada, nenhum link/fonte real, rollback e expurgo integral após o aceite.
- Achado ALTO corrigido localmente: a revisão R1 agora é persistida por `review-case` com
  `case_id + approval_round + dois hashes + operator_ref`; `delivery-case` exige correspondência
  exata e não cria uma aprovação documental em nome do chamador.
- Segredos de operação, revisão e entrega foram separados. Funções exigem segredo com ao menos 32
  caracteres, comparação constante, corpo real de no máximo 16 KiB e falha fechada.
- `delivery-case` impede mutação posterior de entrega `sent`, trata concorrência pela chave única e
  mantém finalize idempotente. `continue-case` agora valida a transição antes de criar o Formulário 2.
- Imports Supabase fixados em `2.112.3`; `deno check` das cinco funções passou.
- PDF: dependência fixada em `Markdown==3.10.3`, HTML bruto/imagens Markdown bloqueados antes do
  Chromium, fallback Chrome→Edge, 3 testes aprovados e inspeção visual de todas as 3 páginas sem
  corte, sobreposição ou glifo ilegível.
- Evidências locais: 63 testes Telegram, 3 testes do publicador, 7 testes Node, build aprovado e
  `npm audit --omit=dev` sem vulnerabilidades.

### Evidência Vercel em produção — 2026-08-22

- Commit `d1a7129` publicado pelo deployment `dpl_Y4cKT9giGPaCu6hs1zSR7eSpYNyD` e promovido ao alias
  `https://agenciaia-one.vercel.app`; o build remoto repetiu os 7 testes Node com sucesso.
- Raiz e `robots.txt` responderam 200 com `X-Robots-Tag: noindex, nofollow, noarchive`, CSP sem
  `unsafe-inline`, HSTS, `X-Frame-Options: DENY` e demais headers previstos.
- `robots.txt` respondeu `User-agent: *` + `Allow: /`. A rota `/form/<token-falso>` respondeu 200 com
  `Cache-Control: no-store`; o status inexistente respondeu 404 genérico e sem cache.
- POST sem origem autorizada foi recusado com 403 antes de qualquer processamento.
- O pacote temporário de deploy e os tokens OIDC transitórios criados pela CLI foram removidos após
  a promoção.

O frontend corrigido está em produção. Em 2026-08-22, as migrations
`20260822170000_raiox_controlled_pilot.sql` e `20260822200000_raiox_persisted_review_gate.sql` foram
aplicadas juntas em transação no projeto TAVIR e o dashboard respondeu `Success. No rows returned`.
Consulta posterior confirmou como verdadeiros: tabela de entregas, colunas de tentativas/hash/gate,
índice único e as RPCs de falha/submissão. As cinco Edge Functions, a matriz negativa e o E2E
sintético foram concluídos posteriormente, conforme as evidências abaixo. Não promover convidado real.

### Reauditoria independente e reconciliação de entrega — 2026-08-22

- Frontend Vercel e smoke limitado da LP: **APROVADOS**. SEO técnico `noindex`: **APROVADO**.
- Prova independente anterior: `review-case` e `delivery-case` respondiam 404; as migrations já foram
  aplicadas, mas o E2E segue bloqueado até publicar as funções. `create-case`, `continue-case` e
  `notify-dora` recusaram anônimo com 401.
- Achado SEC-R1 corrigido localmente: apenas uma inserção nova devolve `send_authorized: true`.
  Registro existente `pending`/`failed` ou corrida de unicidade responde 409 e exige reconciliação;
  registro `sent` apenas informa idempotência e nunca autoriza nova chamada ao provedor.
- O operador também falha fechado se a autorização explícita não vier na resposta. Teste dedicado
  prova que a Resend não é chamada nesse cenário; suíte Telegram agora possui 64 testes aprovados.
- Achado SEC-R2 corrigido localmente: finalizar como `sent` exige `provider_id` UUID válido.

Veredito permaneceu `liberado_para_deploy: false` para clientes reais. O deploy Supabase e o smoke
sintético interno foram executados depois, sob supervisão e com expurgo integral obrigatório ao final.

### Deploy Supabase e E2E sintético — 2026-08-22

- `RAIOX_REVIEW_GATE_SECRET` e `RAIOX_DELIVERY_GATE_SECRET` foram cadastrados no cofre de Edge
  Functions sem exposição dos valores. Os nomes foram confirmados uma única vez na lista.
- `review-case` e `delivery-case` foram publicadas com `verify_jwt=false` e autenticação própria.
  `create-case`, `continue-case` e `notify-dora` foram atualizadas para o código versionado.
- Matriz negativa ao vivo: anônimo, segredo errado e segredo cruzado → 401; JSON inválido → 400;
  corpo acima de 16 KiB → 413; case inexistente → 409; `provider_id` inválido → 400. As funções
  existentes também provaram 401 anônimo e 400 após atravessar autenticação válida.
- Case sintético `65acbf30-d8f0-4368-b6db-be0b0f389a31`: status e submissão dos dois formulários,
  além de `analyse`, responderam 200. Nenhum link real foi informado.
- Revisão por rodada/hashes persistida; dois PDFs sintéticos gerados; somente a inserção nova
  autorizou envio. A Resend aceitou uma mensagem para a caixa interna e o finalize retornou sucesso.
- Reconciliação SQL: case `sent`, 2 aprovações, 2 documentos `sent`, 1 entrega `sent` e `provider_id`
  presente. A chave sending-only recusou leitura administrativa da Resend com 401, como esperado.

### Parecer independente final do smoke — 2026-08-22

- Resultado técnico: **APROVADO** para teste interno controlado, com
  `liberado_para_teste_interno_controlado: true`.
- As cinco funções publicadas recusaram acesso anônimo com 401; não permaneceu achado CRÍTICO ou ALTO
  aberto para o piloto estritamente sintético.
- SEO técnico/noindex: **APROVADO**, `seo_ready_for_launch: true` para esta superfície privada.
- Clientes reais: **REPROVADO**, `liberado_para_deploy: false`. Um primeiro cliente real exige novo
  gate independente após a resolução dos controles jurídicos e operacionais.

Riscos residuais registrados:

1. **MÉDIO — LGPD/expurgo:** aviso, base/finalidade, direitos, fornecedores de IA e rotina auditada de
   exclusão em 90 dias ainda precisam de fechamento jurídico e técnico.
2. **MÉDIO — links/IA externa:** validar destinos, redirects e protocolo; manter defesas contra SSRF e
   prompt injection antes de ingerir fontes fornecidas por terceiros.
3. **MÉDIO — antiabuso:** falta evidência de rate limit de borda adequado à operação continuada.
4. **BAIXO — entrega:** fechamento no banco e confirmação do provedor não formam uma única transação.
5. **BAIXO — reconciliação Resend:** a chave runtime sending-only preserva menor privilégio, mas não
   permite consultar administrativamente o estado da mensagem; o aceite depende da caixa receptora.
6. Confirmar segurança operacional do Telegram — aparelho, sessões, 2FA e retenção — e formalizar
   rotação, recuperação e replay dos segredos de webhook antes de operação real.

Pendente para encerrar o smoke: confirmação humana de recebimento e expurgo integral do case sintético.

### Pedido de liberação do piloto real assistido — 2026-08-22

Carlos permanece como único operador e solicitou testar com convidados conhecidos. A revisão jurídica
classificou como potencial piloto concierge de 3–5 pessoas, um case por vez, mas condicionou a liberação
a controles prévios. A reauditoria técnica independente verificou a implementação atual e manteve:

- `liberado_para_piloto_real_assistido: false`;
- `liberado_para_deploy: false`;
- teste interno sintético: aprovado e inalterado.

Bloqueadores: opt-in registrado antes de `create-case`; aviso permanente/versionado; terceiro
consentimento independente; verificação do e-mail; minimização e validação de links; inventário dos
fornecedores por case; expurgo sintético provado ponta a ponta; canal de direitos testado; runbook de
revogação, incidente e rotação. O contrato completo e o critério de saída estão em
`03-plano/piloto-real-assistido.md`. Ser o único operador reduz a superfície, mas não elimina o
tratamento de dados reais de terceiros.

### Reconciliação operacional do gate R2 — 2026-08-23

- Perfil: `SAAS`; modificadores `dados_pessoais`, `api_publica`, `admin` e integração externa de e-mail.
- Ameaça principal: estado local aprovado divergir da fonte de verdade e liberar envio sem aprovação
  documental persistida, ou uma repetição cega duplicar a entrega.
- Evidência: projeto Supabase `Healthy`; DNS resolvendo; `delivery-case` protegida respondeu 401 ao
  anônimo; invocações do case falharam com 409/500 antes da Resend. O painel mostrava o case em
  `awaiting_approval`, nenhuma aprovação documental e nenhuma entrega associada.
- Causa: R2 foi processada pelo poller residente anterior ao gate persistido e existia somente no
  arquivo local. A função atual de entrega falhou fechada, preservando a idempotência.
- Reparo: a decisão R2 já dada pelo operador foi persistida pela `review-case`; leitura posterior
  confirmou `documents_approved` e transição do case para `review`. O gate separado foi reemitido.
- Resultado: nenhum registro de entrega ou envio à Resend ocorreu durante a falha ou o reparo.
- Risco residual: processo residente exige canário de versão e reconciliação remoto↔local antes de
  ações irreversíveis. Não houve novo deploy neste reparo.
- Veredito: reparo operacional **APROVADO** para retomar o gate assistido deste case;
  `liberado_para_deploy: false` e `liberado_para_piloto_real_assistido: false` permanecem inalterados.

### Fechamento da entrega reconciliada — 2026-08-23

- O novo clique do operador encontrou a aprovação persistida, mas a preparação retornou HTTP 500 e
  fez rollback dos documentos; a mensagem genérica do bot não distinguia indisponibilidade de falha
  interna. O projeto permaneceu `Healthy` e a função continuou protegida contra chamada anônima.
- Observabilidade corrigida: o cliente interno agora preserva somente `error` em vocabulário estrito
  (`[a-z][a-z0-9_]{1,79}`), sem encaminhar corpo bruto, SQL, stack ou PII ao Telegram. Regressão
  automatizada cobre descarte de detalhes sensíveis; suíte completa tem 66 testes aprovados.
- Uma preparação controlada criou exatamente uma entrega pendente e autorizada. A reconciliação não
  chamou `prepare` novamente: continuou o mesmo registro e recalculou a chave idempotente pelos dois
  hashes aprovados e pela rodada 2.
- Antes da chamada externa, o estado local foi gravado como `sending`. A Resend aceitou a mensagem uma
  única vez; `delivery-case finalize` respondeu com sucesso e o estado local terminou em `sent` /
  `email_sent`. O Telegram recebeu a confirmação operacional.
- O arquivo temporário usado para transportar os quatro campos privados foi criado somente no
  diretório privado ignorado pelo Git, removido no `finally`, e o clipboard temporário foi limpo.
- Resultado deste case assistido: **entrega concluída e reconciliada, sem duplicidade observada**.
  Permanecem `liberado_para_deploy: false` e `liberado_para_piloto_real_assistido: false`; este reparo
  não libera novos convidados nem automação de envio.
- Evidência humana posterior: Carlos confirmou o recebimento do e-mail na caixa de destino em
  2026-08-23. O E2E desta entrega está fechado; o expurgo permanece pendente e exige decisão separada.

### PDF editorial TAVIR e co-branding local — 2026-08-23

- O fluxo permaneceu Markdown escapado → HTML local → Chromium; raw HTML e imagens Markdown não foram
  reabilitados. O modo TAVIR carrega somente ativos regulares locais e fontes versionadas.
- A identidade da empresa analisada veio do avatar já coletado no escopo autorizado, foi decodificada,
  regravada como PNG sem metadados e mantida no diretório privado ignorado pelo Git. A CLI aceita
  somente PNG com assinatura/IHDR, dimensões e tamanho limitados; SVG/HTML de cliente é recusado.
- O primeiro rodapé CSS apresentou posição incorreta nas páginas internas e foi descartado. Rodapé e
  paginação agora são carimbados no PDF final; a inspeção cobriu as 11 páginas das duas prévias.
- Evidências: 5 testes do publicador, 67 testes Telegram, compilação Python, contagem/paginação e
  inspeção visual integral aprovadas. Nenhum PDF já aprovado/enviado foi sobrescrito ou reenviado.
- Veredito: mudança **APROVADA para prévia privada**; ativação em uma futura entrega depende da
  aprovação visual de Carlos. Gates `liberado_para_deploy` e `liberado_para_piloto_real_assistido`
  permanecem falsos.

### Evidência do desenvolvedor — intake e documentos v2 — 2026-08-23

- O formulário passou a coletar objetivo, horizonte, decisão, oferta, capacidade, jornada,
  mensuração, capacidade editorial e presença local por campos estruturados e faixas. Não há senha,
  token, credencial, documento, conversa de cliente ou acesso administrativo.
- Operação física é condicional no navegador e validada novamente no servidor; `Sim` exige endereço
  e situação do Perfil da Empresa. Campos e comprimentos usam allowlist; payload máximo é 32 KiB.
- Respostas continuam em JSONB no schema existente; o pacote de análise usa allowlist ampliada e
  continua excluindo nome do contato e e-mail.
- Desktop e viewport móvel foram inspecionados localmente; labels, fieldsets, radio buttons,
  checkboxes, selects, foco e bloco condicional permaneceram operáveis.
- Evidências automatizadas: 9 testes do app, build completo, 73 testes Python/Telegram/publicador,
  `npm audit --omit=dev` com zero vulnerabilidades e inspeção visual das 11 páginas dos PDFs v2.
- Nenhum e-mail, case, migration, Edge Function ou deployment foi acionado nesta revisão.

Esta seção é evidência do implementador, não auditoria independente. Permanecem
`liberado_para_deploy: false` e `liberado_para_piloto_real_assistido: false` até reauditoria do diff
e teste negativo do release candidato.

### Evidência do desenvolvedor — convite automático e intake unificado — 2026-08-23

- Perfil permanece `SAAS/LP controlada`, com modificadores `dados_pessoais`, `api_publica`, `webhook`,
  `admin` e `email`. O destinatário é PII e passou a ser fonte de verdade server-side no case.
- Status público do link retorna somente empresa/contato; e-mail não volta ao navegador, ao evento do
  webhook ou ao pacote da análise. Tentativa de sobrescrever identidade no payload é ignorada.
- O convite tem tabela, segredo, função de finalização e chave de idempotência distintos da entrega
  final. Resposta ambígua da Resend encerra em `uncertain`, sem retry automático.
- `RAIOX_APP_URL` é validada como origem HTTPS sem credenciais, path, query ou fragmento; HTTP é aceito
  somente em `localhost`/`127.0.0.1`. O operador também recusa URL de convite fora da origem canônica.
- O cliente realiza um único POST final; o RPC trava e consome uma sessão stage 1 aberta, registra o
  intake completo e emite um único evento idempotente. O stage 2 antigo permanece somente para cases legados.
- Evidências: 11 testes Node, build, 69 testes Python, compilação estática e audit com zero
  vulnerabilidades. Nenhuma migration, Edge Function, LP ou mensagem externa foi executada.

Riscos pendentes para o auditor: transições concorrentes de `invite-case`, negativos do novo RPC,
expiração/replay, erro de destinatário, teste visual responsivo e E2E sintético com reconciliação.
Esta evidência não altera `liberado_para_deploy: false` nem
`liberado_para_piloto_real_assistido: false`.

## Reauditoria independente — convite automático e intake unificado — 2026-08-23

> Auditor: Auditor Seg/LGPD independente · release-base `aa75d1d`/`a5b8f2e` + correções locais
> revalidadas · ambiente: código/local, sem migration, deploy, case ou envio externo nesta auditoria.

### Veredito

- Status: **APROVADO COM RESSALVAS**.
- `liberado_para_deploy: true` exclusivamente para aplicar a migration aditiva, publicar as seis Edge
  Functions e o frontend e executar smoke sintético com caixa interna TAVIR.
- `liberado_para_piloto_real_assistido: false`: o deploy técnico não autoriza criar case, armazenar
  e-mail nem enviar convite a amigo, prospect ou cliente real.
- `liberado_para_operacao_comercial: false`.
- Não permaneceu achado CRÍTICO, ALTO ou MÉDIO aberto no código do release após a reexecução.

### Escopo e ameaça

- Perfil: `SAAS/LP controlada`; modificadores `dados_pessoais`, `api_publica`, `admin`, `webhook`,
  `ia_externa` e e-mail transacional.
- Ativos: e-mail/nome/empresa, respostas do intake, token assinado, segredos internos, estados de
  convite, consentimentos, pacote da análise e trilha de entrega.
- Papéis: portador do link individual, operador único autenticado pelo Telegram e runtimes
  privilegiados Vercel/Supabase. Não há tenant nem conta pública.
- Abusos revisados: token alterado/vencido/reutilizado, sobrescrita de identidade, enum/select
  forjado, multiseleção duplicada/contraditória, origem externa, payload excessivo, replay do evento,
  concorrência na finalização, convite duplicado, URL de phishing e exposição de PII.
- Fora do escopo: mutação em produção, envio Resend real, pentest destrutivo, configuração/MFA das
  contas e parecer jurídico. A migration e o E2E vivo ainda precisam de smoke pós-deploy.

### Evidências executadas

| Controle | Prova independente | Resultado |
|---|---|---|
| Diff e arquitetura | Revisão de migration, APIs Vercel, seis Edge Functions, operador Telegram, templates e documentação | Compatibilidade legada preservada; convite e entrega final usam tabela, segredo e idempotência separados |
| Build/testes web | `npm test`, `npm run build`, `node --check public/form.js` | 13/13 aprovados; build e sintaxe aprovados |
| Edge Functions | `npx -y deno@2.5.6 check` nas cinco funções alteradas/integradas | Aprovado; imports Supabase fixados em `2.112.3` |
| Dependências | `npm audit --omit=dev` | Zero vulnerabilidades conhecidas no snapshot |
| Operador | `python -m unittest tools.test_telegram_ceo -v` | 69/69 aprovados, sem e-mail ou chamada mutável |
| PII/BOLA | Inspeção de `sessionFor`, `status`, `parseIntakeAnswers`, evento e `continue-case` | E-mail não retorna ao navegador/evento/pacote; empresa, contato e e-mail enviados pelo cliente são sobrescritos pela identidade server-side |
| Entrada estruturada | Reproduzido bypass inicial; depois reexecutado contra allowlists e negativos adicionados | Corrigido: enum desconhecido, multiseleção desconhecida/duplicada/contraditória e campos locais incoerentes são recusados |
| Uso único/replay | Inspeção do `FOR UPDATE`, filtro `status='open'`, expiração, limite de falhas e chave única do evento | Segunda submissão falha fechada; corrida é serializada pela sessão e o evento permanece único |
| Convite/idempotência | Inspeção de `create-case`, `invite-case`, índice único e tratamento `failed/uncertain/sent` | Um registro por case; `sent` é imutável; resposta ambígua não gera retry cego; fechamento concorrente não autoriza outro envio |
| URL/e-mail | Teste existente do payload de convite + inspeção de origem, caminho, query, escape e CID | Host HTTPS canônico e formato assinado exigidos; URL externa recusada; assunto/HTML normalizados |
| Segredos | `git check-ignore` dos `.env`, busca no diff/histórico e exemplos vazios | Arquivos privados ignorados; nenhum valor de segredo do release localizado |
| UI desktop/móvel | Browser local, viewport normal e 390×844, avanço/volta e overflow | Sem overflow horizontal; identidade sem campo de e-mail; etapas alternam corretamente |
| Campos vazios | Clique local em “Continuar” com etapa 1 vazia antes/depois da correção | Corrigido: permanece na etapa 1, mostra erro e foca `cidade_uf` |
| Headers | Inspeção de `vercel.json` + evidência viva anterior do mesmo alias | CSP sem `unsafe-inline`, frame/form/base restritos, HSTS, `nosniff`, `noindex` e `no-store`; revalidar no smoke |
| RLS/RPC | Inspeção das migrations e grants | RLS ativo, sem grants anon/auth; RPC `SECURITY DEFINER` fixa `search_path` e executa somente como `service_role` |

### Achados

| ID | Severidade | Local | Impacto | Correção/estado |
|---|---|---|---|---|
| RX-U1 | MÉDIO | `api/_raiox.mjs`, validação dos campos estruturados | Cliente com link podia ignorar opções da UI e persistir valores forjados no pacote que segue para análise | **CORRIGIDO E REVALIDADO** com allowlists por campo, normalização e negativos |
| RX-U2 | BAIXO | `public/form.js`, `validateScopes` | `data-required` não ativava sozinho a Constraint Validation e permitia avançar visualmente com a etapa 1 vazia; o servidor ainda recusava o POST | **CORRIGIDO E REVALIDADO** com teste explícito de vazio, erro e foco |

### Controles positivos e limites

- O link possui cerca de 256 bits de token aleatório, HMAC SHA-256, validade de 48 horas, hash no
  banco e consumo transacional. A assinatura é comparada em tempo constante na Vercel.
- A migration é aditiva e mantém `contact_email` anulável; o stage 2 anterior continua disponível
  somente para cases legados. Um rollback de aplicação pode deixar tabela/coluna novas dormentes sem
  remover dados; não executar rollback destrutivo da migration.
- `invite-case` autentica por segredo exclusivo de ao menos 32 caracteres, limita corpo e valida UUID,
  par `case_id + delivery_id`, estado e `provider_id`. O bearer continua sendo um segredo operacional:
  rotação e menor privilégio das contas permanecem necessários.
- Convite aceito pela Resend mas não finalizado é tratado como reconciliação, não como permissão para
  reenviar. O E2E pós-deploy deve provar exatamente um registro e nenhuma duplicidade.
- `notify-dora` usa claim atômico do evento para replay, mas a autenticação por segredo compartilhado
  e a proteção de borda herdadas devem continuar monitoradas.

### Ressalvas e gate pós-deploy

O deploy deve parar e fazer rollback da aplicação se qualquer item abaixo falhar:

1. aplicar `20260823190000_raiox_unified_intake_invites.sql` e confirmar coluna, tabela, constraints,
   RLS, grants e RPC;
2. cadastrar `RAIOX_INVITE_GATE_SECRET` distinto dos demais segredos e publicar as seis funções com a
   configuração versionada;
3. executar matriz negativa viva: anônimo/segredo errado → 401, corpo excessivo → 413, UUID/provider
   inválido → 400, delivery/case cruzado → 409, token falso/vencido/usado → indisponível;
4. executar um único E2E sintético com dados fictícios e caixa interna TAVIR, reconciliar
   `case + session + submission + consent + event + invite_delivery` e expurgar o case de teste;
5. revalidar no alias HTTPS CSP, HSTS, `noindex`, `no-store`, Origin e erro público genérico;
6. não habilitar auto-deploy contínuo nem convidado real por consequência deste parecer.

### Riscos residuais e operação real

- **Piloto real bloqueado:** permanecem abertos os nove controles G-PR1 de
  `03-plano/piloto-real-assistido.md`, incluindo opt-in pré-case, aviso jurídico versionado, três
  decisões separadas, confirmação de e-mail, links seguros, inventário de fornecedores, expurgo
  provado, direitos do titular e runbook. A nova automação ainda cria e envia antes desse opt-in.
- Retenção/expurgo de 90 dias continua manual e sem rotina auditada; nenhum convidado real até existir
  prova ponta a ponta e revisão jurídica profissional.
- Rate limit de borda não foi reprovado novamente nesta mudança porque criação/finalização são
  internas e o formulário exige token não enumerável e possui limite por sessão; operação em escala
  exige proteção de borda, alerta de abuso e observabilidade de custo.
- Confirmação do provedor e fechamento no banco não são uma transação única. Preservar os estados
  `uncertain`, reconciliação manual e proibição de retry cego.
- Contas Telegram, Supabase, Vercel, Resend e GitHub devem manter MFA, contas individuais, revisão de
  acesso e rotação ensaiada; essas configurações não foram revalidadas localmente.

Veredito final desta reauditoria: **APROVADO COM RESSALVAS para deploy técnico controlado**,
`liberado_para_deploy: true`; **REPROVADO para qualquer dado/convidado real**,
`liberado_para_piloto_real_assistido: false` e `liberado_para_operacao_comercial: false`.

## Gate vivo interrompido — privilégios efetivos das RPCs — 2026-08-23

### Achado RX-U3

- Severidade: **ALTO** — controle de acesso e proteção de PII/lógica de negócio.
- Evidência viva informada pelo executor: no banco real,
  `has_function_privilege('anon', 'public.submit_raiox_intake(text,jsonb,jsonb)', 'EXECUTE')`
  retornou `true`; `information_schema.routine_privileges` confirmou grants diretos para `anon` e
  `authenticated` também nas RPCs legadas.
- Local: grants efetivos de `record_raiox_form_failure`, `submit_raiox_form` e
  `submit_raiox_intake`; migrations anteriores revogavam `PUBLIC`, mas não removiam os grants diretos
  criados pelos defaults do projeto Supabase.
- Impacto: um portador do link consegue derivar `token_hash` do token opaco e chamar a RPC pela API
  pública com papel `anon`, contornando `Origin`, limites e allowlists da rota Vercel. Isso permite
  persistir respostas forjadas, consumir/revogar a sessão e acionar a esteira com entrada que não
  passou pela validação server-side. UUID/HMAC não corrigem autorização de função.
- Contenção: **CORRETA** — deploy parado antes da publicação das funções/frontend e antes de qualquer
  smoke ou convite do release.

### Reparo revisado estaticamente

- A migration de criação do intake passou a executar
  `REVOKE ALL ... FROM public, anon, authenticated` antes de conceder execução ao `service_role`.
- A migration corretiva `20260823213000_raiox_rpc_least_privilege.sql` cobre as três assinaturas
  exatas e reaplica menor privilégio em bancos já existentes e instalações completas.
- O reparo é idempotente, não altera dados, não remove a execução inerente do proprietário da função
  e não concede acesso a nenhum papel de cliente. A rota Vercel continua funcional porque usa
  `service_role` somente no servidor.
- Revisão estática: **APROVADA**. O achado continua **ABERTO** até a migration corretiva ser aplicada
  e as provas de privilégio e chamadas HTTP negativas passarem no banco real.

### Prova viva obrigatória para fechar RX-U3

1. `has_function_privilege` deve retornar `false` para `anon` e `authenticated` e `true` para
   `service_role`, em cada uma das três assinaturas;
2. `information_schema.routine_privileges` não pode listar `anon`/`authenticated` nas três RPCs;
3. chamada HTTP/PostgREST com chave/papel `anon` deve falhar sem executar cada RPC;
4. chamada backend controlada com `service_role` deve continuar alcançando a função sem expor a
   chave ao cliente;
5. reconsultar sessão/evento de teste para provar que os negativos não alteraram tentativas, status,
   submissões, consentimentos ou eventos.

Veredito deste gate: **REPROVADO enquanto RX-U3 estiver aberto**,
`liberado_para_deploy: false`. `liberado_para_piloto_real_assistido: false` e
`liberado_para_operacao_comercial: false` permanecem inalterados.

### Fechamento independente de RX-U3 — prova viva — 2026-08-23

- A migration corretiva `20260823213000_raiox_rpc_least_privilege.sql` foi aplicada no projeto real
  pelo executor; esta auditoria não realizou mutação em produção.
- `information_schema.routine_privileges` passou a listar somente `postgres` e `service_role` para
  `record_raiox_form_failure`, `submit_raiox_form` e `submit_raiox_intake`.
- `has_function_privilege` retornou `false` para `anon` e `authenticated` e `true` para
  `service_role` nas três assinaturas.
- Chamadas PostgREST com JWT legado `anon` foram recusadas nas três RPCs com HTTP 401 / PostgreSQL
  `42501 permission denied`; nenhuma função foi executada.
- Chamadas controladas com JWT legado `service_role` retornaram HTTP 200 e os contratos negativos
  esperados (`recorded: false` / `accepted: false`) para `token_hash` sintético inexistente.
- Reconciliação antes/depois permaneceu idêntica: 15 sessões, 11 submissões, 22 consentimentos e
  11 eventos. Os negativos e o canário privilegiado não alteraram dados.

RX-U3: **CORRIGIDO E REVALIDADO**. Não permanece achado CRÍTICO, ALTO ou MÉDIO aberto no código ou
nos privilégios efetivos deste release. A migration corretiva deve continuar como última camada em
instalações existentes e novas; testes de grant efetivo passam a ser obrigatórios após qualquer
`CREATE OR REPLACE FUNCTION` ou mudança de defaults no Supabase.

Veredito técnico restaurado: **APROVADO COM RESSALVAS**, `liberado_para_deploy: true`, para publicar
as Edge Functions e o frontend e concluir o smoke sintético descrito no gate anterior.
`liberado_para_piloto_real_assistido: false` e `liberado_para_operacao_comercial: false` permanecem
inalterados: esta correção de autorização não resolve os controles G-PR1/LGPD para convidados reais.

## Revalidação independente pós-deploy e domínio próprio — 2026-08-23

> Release: deployment Vercel `dpl_AiSXyrZRb5cP8CedBG8dGnXLgCQC` · domínio
> `https://raiox.tavir.com.br` · projeto Supabase `skcbjwqajdovxlsxeszv`.

### Veredito

- Deploy técnico: **APROVADO COM RESSALVAS**, `liberado_para_deploy: true`.
- Smoke sintético: execução e reconciliação técnica aprovadas; fechamento humano e expurgo ainda
  pendentes, portanto `smoke_sintetico_encerrado: false`.
- `liberado_para_teste_interno_controlado: true` apenas para reconciliação/expurgo do case sintético.
- `liberado_para_piloto_real_assistido: false` e `liberado_para_operacao_comercial: false`.

### Evidências do executor reavaliadas

- Migrations `20260823190000_raiox_unified_intake_invites.sql` e
  `20260823213000_raiox_rpc_least_privilege.sql` aplicadas; o reparo de grants foi fechado pela prova
  viva independente registrada em RX-U3.
- As seis Edge Functions foram publicadas com `Verify JWT legacy: OFF`; cada função preserva a
  autenticação própria versionada, e desligar o JWT da plataforma não cria acesso anônimo por si só.
- Matriz de `invite-case`: sem segredo/segredo errado → 401; corpo excessivo → 413; UUID ou
  `provider_id` inválido → 400; par case/delivery cruzado → 409. Nenhum negativo autorizou envio.
- Deployment Vercel informado como `Ready`; o domínio consta com configuração válida no mesmo
  projeto. `RAIOX_APP_URL` foi sincronizada no Supabase, Vercel e ambiente privado sem divulgar o
  valor de nenhum segredo.
- Novo host: raiz e formulário 200; status de token sintético inexistente 404 com erro genérico;
  origem `https://raiox.tavir.com.br` atravessa o gate de Origin e chega à validação de payload (400),
  enquanto `https://evil.example` é recusada com 403.
- Case sintético `[ID REDIGIDO]`: Resend aceitou um convite para caixa interna;
  duas telas produziram um único submit; replay/status posterior retornou 404; banco reconciliou
  sessão `submitted`, uma submissão stage 1, dois consentimentos verdadeiros, evento
  `form_2_submitted` entregue e um convite `sent` com `provider_id`.

### Provas públicas independentes desta revalidação

| Prova | Resultado observado |
|---|---|
| DNS A | `raiox.tavir.com.br` resolveu para a borda publicada (`64.29.17.1` e `216.198.79.65`) |
| HTTPS/raiz | HTTP 200, certificado aceito pelo cliente, HSTS de um ano, CSP restritiva, `nosniff`, `DENY`, COOP/CORP e `X-Robots-Tag: noindex, nofollow, noarchive` |
| `robots.txt` | HTTP 200; o arquivo permite crawl, mas o header transversal mantém `noindex`; não há contradição de indexação porque `robots` controla rastreamento e `X-Robots-Tag` controla indexação |
| Formulário falso | Rewrite entrega HTML 200 com `Cache-Control: no-store`; isso não valida o convite nem expõe dados |
| Status de token falso | HTTP 404, `Cache-Control: no-store`, corpo genérico `{"error":"unavailable"}` e sem PII |
| Origin externo | POST com `Origin: https://evil.example` retornou 403 e `Cache-Control: no-store` antes do processamento |
| Edge Function anônima | POST sem segredo para `invite-case` retornou 401 e `Cache-Control: no-store` |

### Segurança e riscos residuais

- O domínio próprio não ampliou a confiança: `RAIOX_APP_URL` continua allowlisted como origem HTTPS
  exata, e URLs de convite permanecem vinculadas a host, rota, expiração e assinatura.
- A raiz estática pode usar cache público; formulário e APIs que carregam estado usam `no-store`.
- O rewrite retornar 200 para `/form/<token-falso>` é intencional: a página não contém o case e só
  mostra dados depois de o endpoint server-side validar HMAC, expiração, hash e sessão aberta.
- Confirmação de aceite pela Resend não prova entrega na caixa. Até confirmação humana, o estado
  técnico é `sent` no provedor/banco, mas o smoke não está fechado.
- O case sintético contém dados de teste e deve ser removido de cases, sessão, submissão,
  consentimentos, evento, convite, arquivos/temporários e referências operacionais. A exclusão deve
  ser seguida por consulta de ausência; não registrar PII no relatório.
- Auto-deploy de `main`, convite real, cobrança e escala permanecem fora desta liberação. Os nove
  controles G-PR1/LGPD continuam bloqueantes para amigos, prospects e clientes reais.

### Gate final do smoke sintético

Para alterar `smoke_sintetico_encerrado` para `true`, faltam somente:

1. confirmação humana de recebimento do convite na caixa interna TAVIR, sem clicar/reutilizar o link;
2. expurgo integral do case sintético e prova de ausência no Supabase e nos artefatos locais/temporários;
3. confirmar que o expurgo não removeu nem alterou cases legítimos e registrar apenas contagens/IDs
   sintéticos necessários à auditoria.

Veredito pós-deploy: **superfície técnica saudável e restrita ao teste interno**,
`liberado_para_deploy: true`; **smoke ainda não encerrado**, `smoke_sintetico_encerrado: false`;
**nenhum convidado real autorizado**, `liberado_para_piloto_real_assistido: false` e
`liberado_para_operacao_comercial: false`.

## Reauditoria independente pós-expurgo — 2026-08-23

> Case sintético: `[ID REDIGIDO]`. O UUID completo não é preservado neste relatório.

### Evidência de fechamento

- Carlos confirmou o recebimento do convite na caixa interna TAVIR. A evidência humana fecha a
  diferença entre aceite técnico da Resend e chegada efetiva ao destinatário do smoke.
- O executor excluiu exclusivamente o case sintético autorizado. Resultado alvo:
  `target_cases=1`, `cases_deleted=1`, `invite_deliveries=1`, `consents=2`, `submissions=1`,
  `sessions=1` e `events=1`.
- `email_deliveries=0`, `approvals=0` e `documents=0` confirmam que o smoke não atravessou análise,
  revisão de documentos ou entrega final; portanto não existiam PDFs/artefatos dessas etapas a
  expurgar.
- Consultas posteriores retornaram zero ocorrências do identificador sintético em `cases`,
  `sessions`, `submissions`, `consents`, `events`, `approvals`, `documents`, `email_deliveries`,
  `invite_deliveries` e `storage_objects`.
- Permaneceram 10 outros cases. A contagem comprova que o alvo foi unitário e que o expurgo não
  removeu os demais registros da operação.
- A mensagem recebida na caixa interna e metadados sob retenção própria do provedor de e-mail não são
  tratados como banco operacional ativo da TAVIR; sua retenção segue o provedor e não autoriza uso
  posterior do link, que já foi consumido e cujo case foi removido.

### Parecer

Os três requisitos do gate final foram atendidos: recebimento confirmado, ausência pós-expurgo nas
superfícies persistentes verificadas e preservação dos outros cases. Não há achado novo de segurança
ou LGPD nesta exclusão controlada.

- `smoke_sintetico_encerrado: true`.
- `liberado_para_deploy: true` — deploy técnico permanece aprovado.
- `liberado_para_teste_interno_controlado: true` — novos testes internos continuam sujeitos a case
  fictício, caixa TAVIR e expurgo próprio; este valor não autoriza convidados.
- `liberado_para_piloto_real_assistido: false` — os nove controles G-PR1, incluindo opt-in pré-case,
  aviso jurídico, confirmação de e-mail, direitos e runbook, continuam pendentes.
- `liberado_para_operacao_comercial: false` — cobrança, escala, autoatendimento e novos clientes
  exigem gate posterior próprio.

Veredito final pós-expurgo: **SMOKE SINTÉTICO ENCERRADO E APROVADO**. O resultado valida a
infraestrutura e o fluxo técnico no domínio próprio, mas não altera a proibição de usar dados de
amigos, prospects ou clientes reais até a conclusão formal de G-PR1/LGPD.

## Reauditoria independente — correção da Root Directory Vercel — 2026-08-23

> Projeto Vercel: `prj_ZquK4uaA97hr9NqcgjkeplQ4ds0S` · deployment de produção informado:
> `dpl_CNDSAT1qzS6sjZYyenmauW3AKQ14` · commit Git: `6b4f464`.

### Causa e correção

- Causa confirmada: o clone Git iniciava o build com Root Directory `.`; o npm procurava
  `/vercel/path0/package.json`, mas o aplicativo está no monorepo em
  `empresas/tavir/projetos/custom/raio-x-de-prospeccao/04-execucao/raiox-web`.
- A Root Directory do mesmo projeto foi corrigida para o diretório real do aplicativo. Não houve
  troca de projeto, domínio, banco ou fronteira de confiança.
- O novo deployment ficou `Ready` segundo a evidência do executor; seus logs localizaram o
  `package.json`, executaram check, 13/13 testes e auditoria sem vulnerabilidade conhecida.

### Revalidação independente

| Prova | Resultado |
|---|---|
| Commit/artefato | `git show 6b4f464:<caminho>/package.json` encontrou o pacote `tavir-raiox-web` e os scripts versionados de check/test/build |
| Build local do mesmo HEAD | `npm run build`: check aprovado e 13/13 testes aprovados |
| Dependências | `npm audit --omit=dev`: zero vulnerabilidades conhecidas no snapshot |
| Raiz em produção | `https://raiox.tavir.com.br/` → 200 com CSP, HSTS, `nosniff`, `DENY` e `X-Robots-Tag: noindex, nofollow, noarchive` |
| Formulário falso | `/form/<token-falso>` → 200 do shell estático e `Cache-Control: no-store`; nenhum dado de case foi retornado |
| Status falso | API → 404, `Cache-Control: no-store` e corpo genérico `{"error":"unavailable"}` |
| Origem externa | POST com `Origin: https://evil.example` → 403, `Cache-Control: no-store` e `{"error":"invalid_origin"}` antes do processamento |

### Parecer e risco residual

- A falha era de configuração de build, não de autorização ou exposição de PII. A correção entregou
  o artefato esperado e preservou os controles do release já auditado.
- `liberado_para_deploy: true` permanece válido; `smoke_sintetico_encerrado: true` permanece válido.
- `liberado_para_piloto_real_assistido: false` e `liberado_para_operacao_comercial: false` não mudam:
  corrigir o build não resolve G-PR1/LGPD.
- **Risco residual de configuração:** Root Directory é estado do painel/API da Vercel, fora do Git.
  Uma troca manual, importação de novo projeto ou recriação pode voltar a `.` e quebrar o build sem
  aparecer no diff do aplicativo.
- Controle operacional obrigatório: antes de promover cada deployment, confirmar projeto + Root
  Directory + commit, exigir build/check/test e executar canário em raiz, formulário, status falso e
  Origin externo. Falha em localizar `package.json` ou divergência de projeto bloqueia promoção.
- Manter rollback para o último deployment `Ready`; rollback de aplicação não deve reverter as
  migrations least-privilege nem reabrir grants das RPCs.

Veredito desta reauditoria: **CORREÇÃO DE DEPLOY APROVADA**, sem novo achado CRÍTICO, ALTO ou MÉDIO;
`liberado_para_deploy: true`, restrito aos gates já registrados neste relatório.

## Reauditoria de escopo de build Vercel — 2026-08-31

> Escopo: configuração Git/Vercel do app, sem deploy, migration, segredo, case ou dado real.

### Ameaça e controle

Como o Raio X compartilha o monorepo `empresatavir/agenciaia`, PRs exclusivos do Escritório ou de
governança ainda podiam iniciar previews desnecessários. Isso não alterava produção, mas consumia
fila/build e aumentava a superfície operacional de deployments sem mudança funcional no app.

Foi adicionado ao `vercel.json` o `ignoreCommand` oficial
`git diff --quiet HEAD^ HEAD ./`. A Vercel executa o comando dentro do Root Directory: retorno `0`
ignora o build quando o diretório não mudou; retorno `1` mantém o build quando o Raio X mudou.
`git.deploymentEnabled.main=false` permanece inalterado.

### Evidências e parecer

- JSON parseado sem erro e schema oficial declarado.
- Cenário negativo: commit apenas fora do Root Directory retorna `0` e deve ser ignorado.
- Cenário positivo: commit dentro do Root Directory retorna `1` e deve continuar o build.
- `npm run build`: check aprovado e 14/14 testes, incluindo os dois cenários do filtro.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas no snapshot.
- Nenhum arquivo de runtime, API, banco, autenticação, consentimento ou segredo foi alterado.

Achados CRÍTICOS/ALTOS/MÉDIOS: nenhum no diff. Risco residual baixo: o primeiro PR que introduz
esta regra precisa gerar o último preview relevante; alteração manual do Root Directory no painel
pode invalidar a premissa e continua sujeita ao canário documentado.

Veredito deste diff: **APROVADO COM RESSALVA OPERACIONAL**, `liberado_para_deploy: true` somente
para a configuração técnica já permitida. `liberado_para_piloto_real_assistido: false` e
`liberado_para_operacao_comercial: false` permanecem inalterados.
