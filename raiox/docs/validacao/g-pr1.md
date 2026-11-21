# G-PR1 — controles do piloto real assistido

Fonte dos controles: `raiox/docs/plano/piloto-real-assistido.md`. Este arquivo guarda o
levantamento (T10.1) e, depois, a evidência de cada controle. Sem dado de cliente.

## T10.1 Levantamento (2026-11-20)

Legenda de "quem faz": **código** (sessão de desenvolvimento), **Carlos** (decisão, clique ou
operação), **advogado** (texto jurídico).

| # | Controle | O que já existe | O que falta | Quem faz |
|---|---|---|---|---|
| 1 | Opt-in antes do caso | `create-case` exige segredo interno e grava empresa, contato e e-mail. No Escritório, `caso.json` tem `consent` (tipo, data, nota). | `create-case` aceita sem opt-in. Falta tabela `raiox_optins` (canal, horário, versão do aviso, operador) em migração nova, `create-case` falhar fechado sem ela, e o botão de convite do Escritório (T8.3) exigir o registro. | código; Carlos registra cada opt-in |
| 2 | Aviso de privacidade versionado | Um parágrafo dentro do formulário (`form.html`, bloco `details`); `raiox_consents.policy_version` com padrão `2026-07-25`. | Página pública sem token (`privacidade.html`) com controlador, canal, finalidades, dados, fornecedores, transferência internacional, retenção, direitos e revisão humana; versão gravada junto do consentimento. | código (página e versão); advogado (texto); Carlos (dados do controlador e canal) |
| 3 | Três decisões separadas | Duas caixas obrigatórias no formulário (fontes públicas e entrega por e-mail); a RPC recusa sem as duas. | Terceira decisão: ciência do aviso. Conferir que nenhuma vem marcada e gravar versão e horário de cada uma. | código |
| 4 | E-mail confirmado | Nada. O link do convite vai para o e-mail, mas não há confirmação. | Token opaco, de uso único e com validade; coluna `email_verified_at`; `continue-case` (análise) e `delivery-case` (entrega) bloqueados sem ela. | código |
| 5 | Minimização e entrada segura | `raioxBridge` só aceita HTTPS no Supabase. O formulário limita tamanho dos campos e tem campo-isca. | Validar protocolo, destino, DNS/IP privado e redirects de todo link antes da coleta (formulário e Escritório). Bloquear campos proibidos (perfil pessoal, documentos, credenciais). Testes com URL interna, IP privado e redirect. | código |
| 6 | Fornecedores por caso | Nada no caso. Os fornecedores estão espalhados em `.env.example` (Supabase, Resend, Telegram) e o motor fica no histórico de rodadas. | `caso.json` com lista de fornecedores usados (Vercel, Supabase, Resend, Telegram, motor de IA e modelo), com finalidade, dados, região e retenção. O motor entra sozinho a cada rodada. | código; Carlos confirma região e retenção de cada serviço |
| 7 | Expurgo provado | Botão "Excluir" no Escritório apaga a pasta local (`deleteCase`). | Botão "Expurgar caso": Supabase (caso, sessões, respostas, consentimentos, entregas), pasta e PDFs, Resend, Telegram e temporários, com relatório de ausência sem PII. Ensaio primeiro com caso fictício. | código; Carlos executa o ensaio |
| 8 | Direitos do titular | Status `revoked` existe só para link de formulário (após tentativas erradas). | Canal permanente no aviso, procedimento de acesso, correção, revogação e exclusão; revogação na tela que trava as etapas seguintes do caso. | código (revogação na tela); advogado e Carlos (procedimento e canal) |
| 9 | Runbook de incidentes | Nada. | `runbook-incidentes.md`: e-mail errado, link vazado, Telegram comprometido, rotação de segredos, incidente em fornecedor, contenção, evidência e acionamento jurídico. Um ensaio registrado. | código (rascunho); Carlos (ensaio); advogado (acionamento jurídico) |

### Ordem proposta

1. Itens só de código e sem dependência externa: 5 (entrada segura), 6 (fornecedores), 3 e 4
   (decisões e e-mail confirmado), 1 (opt-in).
2. Itens com rascunho de código e texto para o Carlos e o advogado: 2 (aviso), 8 (direitos),
   9 (runbook).
3. Expurgo (7) por último, porque depende de saber tudo o que foi gravado nos itens acima.

Toda migração é nova; nenhuma migração já aplicada é alterada. Nada vai para o Supabase real antes
do CP-10 (R5).

## Evidências

### Controle 5 — Minimização e entrada segura (código concluído em 2026-11-21)

- **Escritório** (`src/main/raiox/linkGuard.ts`):
  - forma do link: só http/https, sem usuário/senha, sem porta fora de 80/443, sem IP direto, sem
    nome de rede interna (`localhost`, `.local`, `.internal`, `metadata`…), sem arquivo
    compartilhado (Drive, Docs, Dropbox, OneDrive, WeTransfer, Mega, iCloud), sem link direto
    para documento e sem parâmetro de credencial (`token`, `senha`, `key`…);
  - DNS: todos os endereços resolvidos fora de faixas privadas, loopback, link-local, CGNAT,
    multicast e IPv4 mapeado em IPv6;
  - redirect: cada salto é conferido antes de ser acessado (até 5), sem seguir sozinho e sem ler
    o corpo da página.
- **Análise:** antes do motor, todos os links do caso (link público, fronteira, objetivo, decisão
  e link do Maps salvo) passam pela checagem. Um link bloqueado impede a análise, com o motivo na
  tela. O resultado fica em `analise/links-verificados.json` e o prompt manda o motor começar só
  por essa lista.
- **Caso:** criar ou editar o caso recusa CPF, número de cartão (formato de 16 dígitos e Luhn),
  senha ou token escritos no texto, e link com forma bloqueada. Telefone com DDI não é confundido
  com cartão. Os 13 casos locais existentes passam na regra nova.
- **Formulário web** (`raiox/web/api/_raiox.mjs`): mesma regra de forma dos links e de texto
  proibido; o envio é recusado. DNS e redirect ficam no Escritório, que é quem acessa os links.
- **Testes:** `tests/unit/raioxLinkGuard.spec.ts` (25) e `raiox/web/test/raiox-form.test.mjs`
  (URL interna, IP privado, DNS que aponta para rede interna, redirect para rede interna, IP e
  localhost, limite de redirects, análise sem chamar o motor). Suíte completa: 511 testes.
- **Limite conhecido:** perfil pessoal (Instagram de pessoa física) e PII de terceiros dentro de
  texto livre não têm detecção automática; ficam na revisão do Carlos ao abrir o caso. O
  formulário recusa sem dizer qual campo causou a recusa (ajuste junto do T10.4).

### Controles 3 e 4 — Três decisões e e-mail confirmado (código concluído em 2026-11-21)

- **Migração nova** `raiox/web/supabase/migrations/20261121120000_raiox_gpr1_decisoes_email.sql`
  (não aplicada; R5 até o CP-10):
  - escopo `privacy_notice` em `raiox_consents`;
  - `submit_raiox_intake` exige as três decisões e grava cada uma com a versão do aviso
    (`AVISO_VERSAO`, enviada pelo servidor, formato `AAAA-MM-DD`) e o horário;
  - `raiox_cases.email_verified_at`, tabela `raiox_email_verifications` (só o hash do token),
    `issue_raiox_email_verification` (validade de 48 h, invalida tokens anteriores) e
    `verify_raiox_email` (uso único, dentro da validade e só se o e-mail do caso não mudou);
  - gatilho que apaga a confirmação quando o e-mail do caso muda.
- **Formulário:** terceira caixa "Li o aviso de privacidade (versão 2026-11-21)"; as três são
  obrigatórias e nenhuma vem marcada (teste lê o HTML).
- **Confirmação:** depois do envio, a rota emite o token (32 bytes aleatórios) e manda o link
  `/confirmar/<token>` pelo Resend **só com `RAIOX_EMAIL_ENABLED=1`** (R6). A página de
  confirmação só consome o token por POST no botão: leitor de e-mail que abre o link não gasta o
  token.
- **Bloqueios:** `continue-case` (análise) e `delivery-case` (entrega) respondem
  `email_not_verified` sem `email_verified_at`. O sync manda `email_verificado` ao Escritório e a
  análise local de caso vindo do formulário recusa sem ele. Hoje são 10 casos locais vindos do
  formulário: ficam bloqueados para análise até um sync com e-mail confirmado.
- **Testes:** `raiox/web/test/raiox-form.test.mjs` (três decisões, nada pré-marcado, token opaco,
  banco só recebe hash, e-mail desligado não sai, token malformado nem chega ao banco) e
  `tests/unit/raioxBridge.spec.ts` (sync traz a confirmação; análise espera por ela).
- **Pendente:** aplicar a migração e publicar as funções no CP-10; configurar `RESEND_API_KEY`,
  `RAIOX_EMAIL_FROM` e `RAIOX_APP_URL` na Vercel; o formulário antigo em duas etapas
  (`submit_raiox_form`) continua sem a terceira decisão e não deve ser usado no piloto real.

### Controle 1 — Opt-in antes do caso (código concluído em 2026-11-21)

- **Migração nova** `raiox/web/supabase/migrations/20261121130000_raiox_gpr1_optin.sql` (não
  aplicada; R5 até o CP-10):
  - tabela `raiox_optins` (e-mail do contato, canal, horário do aceite, versão do aviso, quem
    registrou), RLS ligada e sem acesso para `anon`/`authenticated`;
  - `raiox_cases.optin_id` obrigatório para linha nova (`check ... not valid`: os casos antigos
    não reprovam, os novos não entram sem opt-in) e um opt-in serve a um caso só;
  - `create_raiox_case_with_optin` grava opt-in e caso na mesma transação e recusa canal fora da
    lista (WhatsApp, telefone, presencial, videochamada, e-mail), aceite no futuro (tolerância de
    5 min) ou com mais de 30 dias, versão fora do formato e operador vazio.
- **`create-case`:** sem `optin` responde `optin_required` antes de abrir conexão com o banco;
  opt-in malformado responde `optin_invalid`. Não insere mais direto em `raiox_cases`. Se a
  sessão do formulário ou o convite falham, apaga o caso e o opt-in.
- **Escritório** (`src/main/raiox/optin.ts`): `createCasePayload` é o único jeito de montar o
  corpo do `create-case` e recusa sem opt-in válido, com a mensagem na tela; exige a versão do
  aviso em vigor (`RAIOX_AVISO_VERSAO`, igual à do formulário). O caso guarda o opt-in em
  `caso.json` (`optin`). O botão "Enviar convite" (T8.3) e o pedido do APK (T8.4) entram na F8
  e passam por essa função.
- **Testes:** `tests/unit/raioxOptin.spec.ts` (sem opt-in não há pedido, cada recusa, corpo
  completo, mesma versão e mesmos canais no Escritório, formulário, função e migração, função
  recusa antes do banco e banco exige `optin_id`).
- **Pendente:** aplicar a migração e publicar o `create-case` no CP-10. A versão do aviso muda
  quando a página de privacidade (controle 2) ganhar o texto do advogado: trocar nos dois lugares
  (o teste acusa se ficarem diferentes).

### Controle 2 — Aviso de privacidade versionado (minuta concluída em 2026-11-21)

- **Página:** `raiox/web/public/privacidade/2026-11-21.html`, sem token e sem script, com as nove
  partes do controle: controlador, canal de privacidade, finalidades, dados, fornecedores,
  transferência internacional, retenção, direitos e revisão humana. Os fornecedores batem com
  `raiox/fornecedores.json`.
- **Versão:** cada versão é um arquivo que não muda depois de publicado. `/privacidade` aponta
  para a vigente e `/privacidade/<versão>` abre qualquer versão antiga (`vercel.json`). A caixa
  "Li o aviso" do formulário leva para a mesma versão que é gravada com o aceite
  (`AVISO_VERSAO`), e o opt-in do Escritório (controle 1) exige essa versão.
- **Minuta:** a página se declara minuta (faixa vermelha e `raiox-aviso-status = minuta`)
  enquanto tiver `[A PREENCHER]`. Lacunas:
  - Carlos: razão social, CNPJ e endereço do controlador; e-mail do canal de privacidade;
  - advogado: base legal de cada finalidade; países e mecanismo de transferência de cada
    fornecedor (depende do Carlos confirmar região no controle 6); prazo e marco de retenção
    (hoje 90 dias depois da entrega); revisão do texto inteiro.
  Texto final do advogado = **versão nova** (arquivo novo, `AVISO_VERSAO` e
  `RAIOX_AVISO_VERSAO` trocados juntos); a minuta de hoje não é editada depois de publicada.
- **Testes:** `raiox/web/test/raiox-form.test.mjs` (nove partes, todos os fornecedores, sem
  script/estilo/token, marca de minuta enquanto houver lacuna, rotas da Vercel e caixa do
  formulário com a mesma versão). Conferida no navegador em desktop e 375 px, sem rolagem lateral.

### Controle 6 — Fornecedores por caso (código concluído em 2026-11-21)

- **Catálogo:** `raiox/fornecedores.json` com Vercel, Supabase, Telegram, Resend, RapidAPI e os
  quatro provedores de motor (Anthropic, OpenAI, Google, Cursor). Finalidade e dados preenchidos;
  região, retenção e exclusão como `a confirmar` e `confirmado: false`. Só o Carlos confirma.
- **Registro no caso** (`src/main/raiox/vendors.ts`, campo `vendors` do `caso.json`): cópia da
  ficha no primeiro uso, primeiro e último uso, e a lista de usos (ex.: `análise · modelo`).
  - análise: motor e modelo registrados **antes** do motor receber a pasta (vale mesmo se a
    rodada falhar); RapidAPI quando a consulta da ficha do Google fez requisição;
  - redação: motor e modelo, também antes de rodar;
  - caso vindo do formulário: Vercel, Supabase e Telegram (este só recebe o código do caso).
  - Resend entra quando o convite e a entrega forem ligados (F8).
- **Tela:** aba Devolutiva mostra "Serviços que tocaram este caso" com usos, região, retenção e
  exclusão, e avisa quantos ainda têm termos a confirmar.
- **Testes:** `tests/unit/raioxVendors.spec.ts` (catálogo completo e nada confirmado, um
  fornecedor por motor, registro sem repetição, confirmação posterior, análise que falha mas
  registra o motor).
- **Pendente do Carlos:** confirmar região, retenção e exclusão de cada serviço no painel ou
  contrato e marcar `confirmado: true` em `raiox/fornecedores.json`. O `RX-854A8212` foi
  analisado antes deste controle e não tem a lista (análise no Cursor e redação no Google pelo
  histórico de rodadas).
