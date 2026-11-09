# PROJECT — Raio X de Prospecção

## Mudança de casa (2026-11)
Este projeto foi trazido do AgenciaIA para o Escritório TAVIR (tavirescritorio).
Caminhos antigos citados no histórico abaixo valem para o AgenciaIA. Mapa novo em
`docs/planning/PLANO_RAIOX.md`. Operação passa a ser feita no Escritório (Electron);
o bot do Telegram e o tools/office.py deixam de operar o Raio-X após o corte (GOAL F9).

> Atualizado em 2026-08-31 · Status: release publicado / primeiro case institucional completo gerado
>
> Responsável: Dora Descoberta + Comercial · Local: `empresas/tavir/projetos/custom/raio-x-de-prospeccao`
>
> Produção: `https://raiox.tavir.com.br` · Alias técnico: `https://agenciaia-one.vercel.app` · Piloto real: bloqueado pelos gates G2–G4

## Objetivo

Converter uma conversa inicial com empresa conhecida em um diagnóstico honesto e acionável:
coletar o contexto, analisar somente sinais públicos ou explicitamente autorizados e entregar um
**Relatório de Raio X** separado de um **Plano de Crescimento orgânico**. Quando a prioridade for
conteúdo, a passagem ao Motor Editorial produz um terceiro artefato distinto: o **Dossiê Editorial
Executável**, com cada peça, roteiro, prompt, legenda, Stories, QA e medição. O resultado esperado é
aprender com os primeiros cases, não prometer faturamento.

## Estado atual

Em 2026-08-31, o projeto passou a versionar o Ignored Build Step da Vercel no próprio
`vercel.json`. O comando compara somente o Root Directory do Raio X e ignora previews quando um PR
altera apenas o Escritório, governança ou outra área do monorepo; qualquer mudança dentro do app
continua o build. O auto-deploy de `main` permanece desligado e esta mudança não autoriza promoção,
convite real ou uso comercial. A validação local passou com JSON válido, 14/14 testes e zero
vulnerabilidades conhecidas nas dependências de produção.

Em 2026-08-31, a TAVIR foi processada como case institucional privado pelo mesmo contrato de entrega
dos clientes. O case `RX-E7C28036` gerou `relatorio-raio-x.md/.pdf` e
`plano-crescimento.md/.pdf`, com auditoria pública do site, leitura oficial do Instagram pela Íris,
plano 30/60/90 e handoff executivo para o Motor Editorial. A linha de base corrigiu a premissa de
“perfil vazio”: há 1 Reel técnico e 1 seguidor, mas ainda não existe lançamento editorial, bio ou
link externo. Os PDFs públicos foram inspecionados em todas as 12 páginas e permaneceram privados;
nenhum convite, e-mail, Telegram ou publicação externa foi disparado.

Na revisão do case em 2026-08-31, a entrega foi explicitada como uma tríade: (1) **Raio-X
Institucional 360°**, que interpreta operação, oferta, marca, presença, prova, público e funil; (2)
**Plano de Crescimento**, que organiza prioridades, horizonte 30/60/90, cadência, hipóteses e
telemetria; e (3) **Dossiê Editorial Executável**, que transforma o C01 em 30 cartões operacionais
para Instagram. O dossiê possui versão Markdown/PDF e painel HTML privado com filtros e cópia de
prompt Flow, roteiro e legenda. Para um perfil em lançamento, a cadência aprovada é uma peça de feed
por dia + Stories, não três peças de feed concorrentes; aumento de frequência depende dos dados. Os
arquivos privados foram regenerados e o PDF do dossiê foi inspecionado visualmente em suas quatro
páginas. A arquitetura comercial permanece modular: diagnóstico pode ser vendido sozinho; plano e
dossiê pertencem à ativação editorial/combos mediante escopo e gates próprios.

Em 2026-08-26, a integração do Instagram deixou de ser apenas uma instrução genérica no prompt do
Gael: quando o intake contém um perfil, a frente passa explicitamente para a Íris, usando a skill
`instagram-profile-audit`. A fase especialista registra o consumo exato de Requests RapidAPI e gera
auditoria completa e resumo executivo, ambos em Markdown e HTML, no diretório privado do case. O
`relatorio-raio-x.md` continua canônico e deve incorporar todos os achados relevantes ao cliente;
o resumo não substitui a versão completa. Os HTMLs permanecem privados. O app Vercel atual hospeda
intake e APIs, não uma área de relatórios, e nenhuma URL externa foi adicionada nesta mudança.

Em 2026-08-30, o Motor Editorial Multicanal foi registrado formalmente como ideia de produto
**downstream** do Raio-X. O Raio-X continua dono do diagnóstico, da prioridade e do plano de
crescimento em nível executivo; o Motor recebe um handoff aprovado e traduz esse plano em ciclos,
dossiers, prompts, mídia, agenda e scorecard nativos de cada canal. O handoff também exige um
Brand Context Pack aprovado antes de qualquer produção visual. O vínculo é comercial e
operacional, não uma fusão de escopo ou de runtime. O registro canônico está em
`Ideias/ideias-pendentes/motor-editorial-vinculado-raio-x.md`.
O handoff também preserva o estado atual do perfil; BIOs, calendário e telemetria são entregáveis
do Motor/Ativação Editorial, não do escopo fixo do Raio-X.

O transporte local foi implementado no bot privado: somente depois de os dois documentos serem
aprovados e entregues, o Telegram oferece “Preparar handoff editorial”. O clique grava no diretório
privado do case um rascunho com case ID, hashes e gates seguintes, sem PII no chat. O handoff não
cria job, proposta, Brand Context Pack, mídia, agenda ou publicação e não alterou o deploy Vercel.

O Raio-X v2 foi implementado localmente sem alterar produção. O intake agora coleta objetivo,
horizonte, decisão, oferta, capacidade, jornada, mensuração, rotina de conteúdo e restrições por
controles estruturados; presença física abre um bloco condicional e o servidor exige endereço e
situação do Perfil da Empresa. O pacote de análise foi ampliado sem incluir nome do contato ou e-mail.

O fluxo de entrada foi simplificado localmente: `/raiox` passa a exigir empresa, contato e e-mail;
o case registra essa identidade e o Escritório envia automaticamente o convite TAVIR pela Resend.
O cliente percorre contexto e operação em duas telas no mesmo link, podendo voltar sem perder os
campos, e faz um único envio final. Foi removido o gate entre as telas. Permanecem somente o gate para
iniciar a análise e o gate posterior, por hashes, para entregar os PDFs. Convite e entrega final têm
segredos, registros e idempotência separados. A reauditoria independente corrigiu e revalidou a
allowlist server-side dos campos estruturados e o bloqueio de avanço vazio na primeira tela. O parecer
liberou exclusivamente migration, funções, frontend e smoke sintético interno; convidados reais e
operação comercial continuam bloqueados. As migrations aditivas, as seis funções e o frontend foram
publicados em produção. O domínio oficial passou a ser `https://raiox.tavir.com.br`.

Gael e os modelos passaram a produzir cabeçalho formal, linguagem técnica acompanhada de explicação
comum, exemplos executáveis com CTA/métrica, módulo Google obrigatório para operações físicas e o
handoff existente TAVIR Presença Local somente quando houver fit. Bastidores de HTTPS, Chrome, login,
hashes e gates ficam no anexo interno; a versão pública usa `Fontes analisadas e limites`. O
publicador foi corrigido com lockup oficial TAVIR, ficha de empresa, co-branding alinhado e paginação
sem corte. Após revisão visual do operador, o cabeçalho foi refeito sem margem negativa: as duas marcas
agora vivem em frames próprios, com área de proteção e proporção preservada. Duas prévias privadas foram
regeneradas sem tocar nos arquivos já enviados. Em 2026-08-23,
essas prévias v2 foram enviadas manualmente apenas à caixa interna da TAVIR; não houve entrega ao cliente.

Validação final do release atual: 13 testes web + build, 69 testes Python, compilação
estática e zero vulnerabilidades no audit. O mock local confirmou rota/status e um único submit; o
navegador integrado e auditor independente cobriram desktop/mobile. Em produção, as migrations
`20260823190000` e `20260823213000` foram aplicadas. A segunda removeu grants diretos herdados para
`anon`/`authenticated` nas três RPCs do formulário: a prova viva confirmou apenas
`postgres`/`service_role`, três negativas PostgREST em HTTP 401 e canários privilegiados sem mutação
(contagens 15/11/22/11 invariáveis). As seis funções foram publicadas com JWT legado desabilitado e o
frontend foi implantado no domínio TAVIR. A matriz negativa viva passou; um smoke sintético concluiu
convite interno, duas telas, envio único e reconciliação. Carlos confirmou o recebimento e autorizou
o expurgo: somente o case fictício foi removido, com ausência comprovada nas nove tabelas relacionadas
e no Storage; os outros 10 cases permaneceram. A reauditoria pós-expurgo marcou
`smoke_sintetico_encerrado: true` e `liberado_para_deploy: true`. Os gates de piloto real assistido e
operação comercial continuam falsos.

O primeiro case assistido autorizado concluiu a análise passiva e gerou os dois documentos privados
separados. O preflight do Instagram exigiu sessão humana e foi encerrado sem contorno; nenhuma URL de
site estava disponível, e a presença local foi tratada por busca amostral sem transformar ausência de
resultado em prova universal. Não houve mensagem, formulário, checkout, avaliação, área autenticada
ou e-mail automático. Os documentos foram aprovados na rodada 2 do gate móvel R1 por hashes; essa
revisão individual não é G5. A entrega separada foi reconciliada, enviada uma única vez e recebida;
o case não deve ser reenviado.

A validação comercial da Fase C foi auditada separadamente em
`03-plano/validacao-portfolio-fase-c.md`. Há dois diagnósticos reais distintos com documentos e
revisão; somente um tem entrega recebida comprovada. Não há proposta, fechamento, margem ou piloto
pago comprovados. Casos sintéticos e técnicos foram excluídos. O card `validar-portfolio-ta`
permanece aberto e não libera tiers, combos, páginas por oferta ou automação adicional.

Em 2026-08-22 a infraestrutura publicada foi auditada e confirmou-se que o Raio X já possuía a maior
parte da jornada online: criação de case pela Dora, link assinado, dois formulários, processamento
assistido e revisão móvel dos documentos. Foi implementada localmente a camada de “MicroSaaS
controlado”: LP de convite personalizada, aviso/consentimentos, proteção `noindex`, limite de falhas,
registro idempotente de entrega e segundo gate explícito para enviar dois PDFs por Resend. A base
Vercel foi identificada e documentada. Migrations e Edge Functions foram aplicadas; a reauditoria
aprovou somente o smoke sintético e o SEO técnico/noindex. O uso com convidados reais continua
bloqueado porque o expurgo é manual e os controles jurídico/LGPD e operacionais permanecem abertos. Plano canônico em
`03-plano/microsaas-controlado.md` e operação em `04-execucao/raiox-web/USO.md`.

O endereço público canônico é `https://raiox.tavir.com.br`; o alias
`https://agenciaia-one.vercel.app` permanece somente como endereço técnico da Vercel e não deve ser
enviado a clientes. O subdomínio foi vinculado ao mesmo projeto `agenciaia`, sem criar outro projeto.
`RAIOX_APP_URL` foi atualizado no Supabase, na Vercel e no ambiente privado. A rota vigente continua
`/form/<token>?exp=...&sig=...`; não existe `/inicio`. HTTPS, CSP, HSTS, `noindex`, `no-store` e a
allowlist de origem foram revalidados no novo host.

Em 2026-08-23, três tentativas de redeploy pelo Git falharam porque o Root Directory remoto estava
em `.` e o instalador procurava `/vercel/path0/package.json`, embora o app viva dentro do monorepo.
O Root Directory do mesmo projeto foi corrigido para
`empresas/tavir/projetos/custom/raio-x-de-prospeccao/04-execucao/raiox-web`. O redeploy do commit
`6b4f464` passou no install, checks, 13/13 testes e audit sem vulnerabilidades; o deployment
`dpl_CNDSAT1qzS6sjZYyenmauW3AKQ14` ficou `Ready`. Domínio, aliases e variáveis foram preservados.
A reauditoria independente aprovou a correção e manteve `liberado_para_deploy: true`; cada promoção
deve conferir projeto, Root Directory e commit, pois a raiz remota não é controlada pelo Git.

O e-mail de entrega agora possui identidade TAVIR: template responsivo `raiox-entrega-v1` publicado
no Resend, fonte HTML/texto versionada, logo oficial por CID, variáveis normalizadas e fallback em
texto. A prévia interna foi entregue em 2026-08-22. A chave runtime foi elevada temporariamente pelo
operador para publicar o template e já retornou a Sending Access.

No preflight seguinte, auditorias independentes liberaram apenas smoke test interno com dados
fictícios e reprovaram clientes reais. O gate R1 foi redesenhado para persistir rodada e hashes no
Supabase por função/segredo próprios; a entrega exige correspondência exata. Geração de PDF foi
reparada e validada visualmente. O frontend corrigido está publicado no alias oficial e teve headers,
noindex e rotas negativas revalidados de forma independente. As migrations do piloto controlado e do
gate persistido foram aplicadas no Supabase de produção e tiveram schema/RPCs validados por leitura.
Os dois segredos exclusivos e as cinco Edge Functions estão publicados na versão atual. Um único case
sintético percorreu formulários, análise, gate por hashes, PDFs e entrega interna; o banco reconciliou
uma entrega `sent`. O recebimento foi confirmado e o case foi expurgado com prova de ausência.
O parecer independente final marcou `liberado_para_teste_interno_controlado: true`, sem achado
CRÍTICO/ALTO residual nesse escopo fictício, e manteve `liberado_para_deploy: false` para clientes reais.

Carlos solicitou liberar convidados mantendo-se como único operador. Jurídico e auditor independente
separaram esse uso como **piloto real assistido**, limitado futuramente a 3–5 conhecidos e um case por
vez. A implementação atual permanece em `liberado_para_piloto_real_assistido: false`: faltam opt-in
pré-case, aviso permanente, três consentimentos, confirmação do e-mail, minimização/links, inventário
de fornecedores, prova de expurgo, canal de direitos e runbook. Plano de gate em
`03-plano/piloto-real-assistido.md`. Testes da própria TAVIR continuam autorizados no escopo interno.

No case assistido em andamento, Carlos autenticou a conta operacional TAVIR no Chrome Profile 5. A
Íris coletou passivamente o Instagram empresarial informado: 76 mídias, com processamento local de
66 imagens e 10 vídeos. O relatório específico ficou no workspace ignorado, sem promoção automática
para a memória por nicho por se tratar de contexto de cliente. Os dois documentos privados foram
regenerados; a aprovação anterior perdeu validade e a rodada 2 do R1 foi aprovada no Telegram com os
novos hashes. O primeiro botão separado de entrega foi recebido por um poller residente iniciado antes
da implementação de `rxdeliver` e caiu no handler genérico como “pedido expirado”. Sem job ou fila em
execução, somente o servidor identificado foi reiniciado; a nova instância confirmou HTTP 200, poller
saudável e PID novo. Um botão atualizado foi reenviado; a entrega separada foi concluída depois da
reconciliação descrita abaixo.
Durante o QA, o renderizador legado da Íris ainda exibia Basalto; a assinatura e os tokens foram
corrigidos para TAVIR antes da entrega.

No primeiro clique de entrega após o restart, `delivery-case` falhou fechado. A investigação de
2026-08-23 confirmou o projeto Supabase saudável, mas revelou que o poller antigo havia concluído R2
somente no arquivo local: o banco ainda mantinha `awaiting_approval`, sem aprovação documental do
case e sem registro de entrega. As invocações 409/500 ocorreram antes da Resend. A decisão já dada por
Carlos foi persistida idempotentemente pela função atual `review-case`; o painel confirmou
`documents_approved` e o case em `review`. O gate de entrega foi reenviado como **GATE DE ENTREGA
REPARADO**. Nenhum e-mail foi enviado durante diagnóstico ou reconciliação.

Depois desse reparo, a única entrega pendente foi continuada sem novo `prepare`, aceita pela Resend,
finalizada no Supabase e confirmada por Carlos na caixa de destino. O estado atual é `sent`; qualquer
novo clique deve ser tratado como duplicidade e recusado.

Em 2026-08-22 foi planejada uma expansão opcional do Raio-X para uma operação de crescimento e
conteúdo voltada inicialmente a lojas de moda. A decisão é preservar o Raio-X como diagnóstico pago
e separar a execução em duas ofertas posteriores: Ativação de Crescimento e Operação de Conteúdo.
O plano em `03-plano/esteira-crescimento-conteudo.md` conecta geração assistida de imagens/vídeos,
DarkFlow, publicação oficial e scorecard, mas proíbe iniciar por SaaS multi-tenant. O próximo passo é
validar a dor em cinco conversas, escolher um piloto e executar spikes de fidelidade/custo antes de
construir orquestrador. A expansão não altera os gates pendentes do Raio-X nem libera o Publicador
Meta do DarkFlow.

Carlos confirmou no mesmo dia que RunPod era a infraestrutura pretendida, escolheu moda feminina
como primeiro subnicho e informou ter uma loja em mente, preservada no repositório como `Loja Piloto
A`. Como não há modelo adulta disponível, o piloto adotará uma personagem virtual original de
aparência adulta. Foi acrescentado o spike S0 e a ficha `03-plano/ficha-personagem-virtual.md` para
governar identidade, proveniência, direitos comerciais, risco de semelhança e aprovação antes do
virtual try-on. Não foi gerada nenhuma imagem nem iniciado contato com a loja.

Em 2026-08-07, a abertura do primeiro case real (`FB depósito de bebidas`) falhou antes de chegar
ao banco. A investigação confirmou que Telegram, poller, URL e segredo local estavam presentes,
mas o hostname `skcbjwqajdovxlsxeszv.supabase.co` retornava `NXDOMAIN` tanto no DNS local quanto em
`1.1.1.1` e `8.8.8.8`. Esse comportamento, após período sem atividade no plano Free, é compatível
com projeto pausado pelo Supabase e exige `Resume project` no painel antes do reteste. Nenhum case
foi criado nessa tentativa. A Dora foi corrigida para não pedir reenvio de dados quando a falha é
de infraestrutura e agora distingue DNS/projeto pausado, autenticação, função ausente e erro 5xx.
Os 35 testes offline do adaptador Telegram passaram.

Após a restauração manual, o hostname voltou a resolver. O app Vercel agora possui um cron diário
protegido por `CRON_SECRET`, agendado para 11:17 UTC, que executa três leituras mínimas no Supabase,
descarta o conteúdo e expõe somente o estado da verificação. O segredo foi gerado com 32 bytes
aleatórios e cadastrado como variável sensível apenas em Production. Quatro testes automatizados
cobrem autenticação, método permitido, sucesso sem vazamento de dados e indisponibilidade do banco.
Essa mitigação reduz o risco de nova pausa por inatividade no plano Free, mas não substitui alerta,
monitoramento nem garantia de disponibilidade de um plano pago.
O deployment de produção isolado ficou `Ready` e o aceite no alias público confirmou HTTP 401 sem
credencial e HTTP 200 com a credencial correta, retornando `checks: 3` em 2026-08-07 às 14:08 UTC.

Em 2026-08-08, o fechamento dos documentos ganhou revisão móvel no Telegram. Ao concluir um job de
Raio X, a Dora anexa `relatorio-raio-x.md` e `plano-crescimento.md` no chat privado do CEO e abre os
botões **Aprovar os 2**, **Solicitar ajustes** e **Manter bloqueado**. A decisão é vinculada ao hash
SHA-256 das duas versões; arquivo alterado depois do upload invalida a aprovação. Ajustes escritos no
Telegram criam nova rodada na mesma rota de IA. Aprovar não envia e-mail. Esse gate por case chama-se
R1; G5 continua sendo a decisão futura de liberar automação após 3–5 casos assistidos.

O fluxo, requisitos, métricas, templates e protótipo local do formulário foram definidos. O bot
privado tem a escolha de IA por job ativa e o poller está saudável em 2026-07-25. O schema foi
aplicado no projeto Supabase isolado e as Edge Functions `create-case`, `continue-case` e
`notify-dora` estão ativas na versão 1, com JWT desabilitado e autorização própria por segredo.
Database Webhook, Vercel e ponte privada da Dora estão conectados. Ainda faltam os testes negativos
de autorização, replay e idempotência antes de qualquer operação com cliente. A primeira operação
deve ser assistida e com aprovação explícita a cada ação externa.

O Database Webhook foi configurado e a ponte privada Dora → `create-case` foi validada com um case
técnico. Depois da correção da chave server-side e da autoria Git, a consulta pública de status do
link assinado respondeu HTTP 200 com `stage: 1`, comprovando Dora → Supabase → Vercel.

O primeiro teste de submissão reproduziu HTTP 403 `invalid_origin`: a comparação literal entre o
header do navegador e `RAIOX_APP_URL` não tolerava barra final ou domínio sistêmico do Vercel. A
allowlist foi corrigida para normalizar origens e aceitar somente a URL configurada, o domínio de
produção do projeto ou o domínio do próprio deployment; origem externa continua rejeitada.
Após o deploy da correção, uma submissão técnica completa retornou HTTP 200 com `submit_ok: true`,
confirmando gravação do Formulário 1 em produção. Falta somente a confirmação visual da mensagem
gerada pelo Database Webhook no Telegram e, depois, validar o callback do Formulário 2.

O Formulário 2 não enviava porque os campos `required` da etapa 1 permaneciam ativos dentro da
seção oculta, fazendo `reportValidity()` interromper o clique. O frontend agora habilita validação
somente na seção ativa. O teste completo em produção aprovou Formulário 1 (200), criação do
Formulário 2, detecção de `stage: 2` (200) e submissão final (200, `ok: true`). A mensagem de sucesso
também foi simplificada, removendo a orientação desnecessária sobre Telegram.

O callback `Iniciar Raio X` deixou de ser apenas um marcador de estado. A implementação local agora
valida no Supabase se o case está pronto e se houve consentimento para fontes públicas, devolve
somente os campos necessários à análise (sem nome do contato nem e-mail), grava o pacote em
`empresas/tavir/privado/raiox-cases/<case_id>/` e abre na Dora o cartão de revisão com escolha de
provedor, modelo e esforço. Nenhum job é criado antes do clique explícito de Carlos em `Executar`.
Os 33 testes offline do adaptador Telegram passaram. A nova versão da Edge Function `continue-case`
foi publicada pelo painel Supabase autenticado na organização TAVIR e validada com o case
`fdba3509-8a40-40b9-8fd5-6bcc5ff41e83`: HTTP 200, `packet` presente e `case_id` correspondente.
A Dora foi reiniciada, gravou o pacote privado ignorado pelo Git e enviou o cartão de revisão.
O runtime ficou em `confirming`, agente `growth`, IA padrão `claude` e zero jobs ativos do Raio X.

O backend Vercel foi adaptado para `SUPA_SERVICE_ROLE_KEY`, já que segredos personalizados com o
prefixo reservado `SUPABASE_` não podem ser criados no Supabase. A leitura mantém fallback para a
variável legacy automática e aceita tanto JWT `service_role` quanto a nova chave `sb_secret_`,
enviando os headers adequados a cada formato. A variável foi aplicada no Vercel e validada em produção.

O scaffold isolado `04-execucao/raiox-web/` está pronto para receber o projeto Supabase: páginas
Vercel, APIs server-side, migration, Edge Functions, `.env.local` ignorado e ponte opcional no bot.

A revisão operacional da expansão foi concluída em
`03-plano/validacao-esteira-conteudo-moda.md`. A arquitetura E0–E9 foi aprovada como roteiro de
descoberta e prova, com gates executáveis, protocolo para cinco conversas Mom Test, lote de cinco SKUs,
scorecards S0/S1/S2 e fórmula de custo por asset aprovado. Isso encerra a validação documental, mas não
autoriza contato, geração, RunPod, publicação ou produto: Gate A é o próximo passo e DarkFlow/Meta
continua independente, com publicação manual como fallback possível. `Provinha` permanece fora do
escopo por envolver menores e produto técnico sob descoberta jurídica própria.

## Arquitetura

Um único bot privado da TAVIR serve Carlos: recebe empresa, contato e e-mail, inicia o case, gera link
opaco e temporário, envia o convite transacional,
recebe as aprovações e seleciona provedor, modelo e esforço. O cliente interage somente com o
formulário web. Supabase será a fonte de verdade de cases/formulários/eventos, enquanto Vercel usa
rotas server-side; jobs são idempotentes, documentos ficam privados e Resend só entra após aprovação.
Detalhe em `03-plano/supabase-plano-a.md`.

## Mapa do código e dos artefatos

- `00-descoberta/fluxo-telegram-dora.md` — conversa, ramificações e consentimentos.
- `01-requisitos/requisitos-mvp.md` — escopo, dados, critérios de aceite e segurança.
- `03-plano/` — arquitetura, métricas e curadoria de conhecimento.
- `03-plano/supabase-plano-a.md` — arquitetura original preservada como histórico; a jornada vigente
  está em `03-plano/microsaas-controlado.md`.
- `03-plano/esteira-crescimento-conteudo.md` — plano da expansão opcional do diagnóstico à criação,
  pós-produção, publicação e aprendizado, com oferta faseada e gates de validação.
- `Ideias/ideias-pendentes/motor-editorial-vinculado-raio-x.md` — registro de produto que liga o
  diagnóstico/planejamento ao Motor Editorial sem incorporar execução ao escopo fixo do Raio-X.
- `03-plano/validacao-esteira-conteudo-moda.md` — parecer operacional, matriz de gates, protocolo Mom
  Test, scorecard dos spikes e fronteiras técnicas da expansão.
- `03-plano/ficha-personagem-virtual.md` — template do ativo sintético adulto, proveniência, direitos,
  prancha-base e critérios de aceite do spike S0.
- `03-plano/piloto-real-assistido.md` — separa teste interno, piloto real concierge e operação
  comercial; lista os nove controles do gate G-PR1.
- `03-plano/validacao-portfolio-fase-c.md` — placar sanitizado dos diagnósticos reais, funil
  diagnóstico→proposta→fechamento, lacunas de prazo/margem e bloqueio do piloto pago.
- `04-execucao/prototipo-formulario/` — maquete local sem rede nem persistência.
- `04-execucao/raiox-web/` — app Vercel Functions + Supabase, migrations, Edge Functions e setup.
- `05-validacao/security_report.md` — perfil, controles e bloqueadores do deploy.
- `06-entrega/` — modelos dos dois documentos ao cliente.

## Decisões vigentes

- O Raio X não altera o formulário de qualificação comercial já existente.
- Dados do cliente e links não vão em query string; o link Telegram contém somente token opaco,
  assinado e com expiração.
- Todo acesso além do público, início/reexecução de análise, disparo de e-mail e convite de
  satisfação exige uma solicitação rastreável ao Telegram privado do CEO.
- O crescimento orgânico é a trilha padrão; mídia paga só entra como hipótese posterior, com
  baseline, unidade econômica e nova aprovação.
- O Raio-X permanece diagnóstico independente; execução criativa é proposta separada e só entra se
  for a prioridade demonstrada.
- O planejamento se divide em duas resoluções: o Raio-X define prioridade, objetivo, horizonte,
  métrica e canais candidatos; o Motor Editorial detalha tese, pilares, calendário e peças nativas.
- Recomendar o Motor não o inicia. Proposta separada, capacidade, Brand Context Pack, direitos e
  aprovação humana continuam obrigatórios antes de qualquer produção.
- A expansão começa como serviço produtizado assistido. Cockpit interno depende de piloto pago e
  portal multi-tenant depende de pelo menos três pilotos pagos, repetição e gates Meta/LGPD/segurança.
- DarkFlow continua fonte de verdade para edição em massa e publicação; a expansão não duplica editor,
  scheduler ou adaptador Meta.
- O piloto começa em moda feminina, usa RunPod apenas como candidato de infraestrutura própria e
  adota personagem virtual original adulta; nenhuma pessoa real será usada como referência.
- HTMLs completo/resumido do Raio-X e da auditoria Instagram ficam privados no MVP. Um link externo
  só pode nascer com storage privado, autorização curta e revogável por case, auditoria de acesso e
  novo gate independente de segurança/LGPD; o diretório `public/` não é canal de relatórios.

## Funcionalidades entregues

- Roteiro de qualificação via Dora, formulário de coleta e máquina de estados de aprovação.
- Escolha por job no Telegram privado: `Configurar IA → provedor → modelo → esforço → executar`.
- Modelos separados de Relatório de Raio X e Plano de Crescimento.
- Dicionário de métricas para aprender com o processo e com cada case.
- Protótipo de formulário local, sem coleta de dados nem integrações.
- Intake unificado: `/raiox` cria case com destinatário, dispara convite automático e o mesmo link
  apresenta duas telas com um único envio final; o fluxo antigo de segundo link fica apenas como
  compatibilidade para cases legados.
- Cron diário autenticado para atividade mínima e verificação de disponibilidade do Supabase.
- Gate móvel R1 com anexos privados, versionamento por hash, aprovação, bloqueio e nova rodada de ajustes.
- Jornada controlada de e-mail preparada: segundo clique, PDFs privados, idempotência por rodada/hash
  e bloqueio de retry quando o resultado do provedor é incerto.
- Template transacional TAVIR publicado e conectado ao runtime, com logo inline, fallback textual,
  escape de variáveis e teste real de entrega interna.
- Gate R1 persistido separado do gate de entrega, imports Edge fixados e publicador PDF reproduzível,
  com testes locais e inspeção visual aprovados.
- Modo editorial TAVIR opcional no publicador: wordmark oficial, fontes locais, paleta, cabeçalho de
  co-branding, tabelas, rodapé e paginação; avatar autorizado entra somente como PNG sanitizado local.
- Intake v2 com campos estruturados, faixas e múltipla escolha; presença local condicional validada
  no cliente e no servidor, sem migration por usar JSONB.
- Padrão editorial v2: ficha formal, fontes/limites públicos, Google local obrigatório para físico,
  linguagem técnico-leiga e exemplo de publicação; roteiros completos continuam fora do Raio-X.
- Fase especialista da Íris para intakes com Instagram, com contador de Requests RapidAPI, relatório
  completo e resumo em Markdown/HTML e incorporação integral dos achados no Raio-X canônico.

## Pendências e próximos gates

1. Quando houver decisão explícita, usar somente `GATE DE ENTREGA REPARADO`; a rodada 2 já está persistida.
1. **Concluído em 2026-08-22:** aplicar as migrations, cadastrar os segredos exclusivos e publicar
   as cinco Edge Functions na conta TAVIR (G2).
2. **Concluído em 2026-08-22:** Resend configurada com `tavir.com.br` verificado, remetente
   `raiox@tavir.com.br`, DMARC inicial, template visual publicado, caixa de teste e chave runtime
   novamente limitada a Sending Access.
3. Automatizar e testar expurgo de 90 dias; revisar o aviso de privacidade juridicamente (G2).
4. **Concluído em 2026-08-22:** matriz negativa e E2E sintético de autorização, hashes,
   idempotência e entrega única executados em produção (G3).
5. **Concluído para o escopo sintético em 2026-08-22:** auditor independente aprovou teste interno
   controlado e Nina aprovou SEO/noindex; clientes reais continuam bloqueados (G4 parcial).
6. Rodar 3–5 diagnósticos assistidos, sempre com os dois gates, antes de qualquer automação (G5).
7. Carlos escolhe IA/modelo/esforço no cartão já enviado e clica `Executar`; acompanhar o primeiro
   job assistido sem liberar e-mail automático.
7. Confirmar no histórico de Cron Jobs da Vercel a primeira execução programada e manter alerta externo
   como evolução posterior; o cron preventivo sozinho não detecta silenciosamente uma falha contínua.
8. Para a expansão criativa: executar o Gate A validado em cinco conversas Mom Test; depois formalizar
   a Loja Piloto A e cinco SKUs, preencher/aprovar a ficha da personagem e definir métrica, orçamento e
   limiares de S0/S1/S2. Não provisionar RunPod antes de S1/S2 e C0.
9. Implementar e reauditar os nove controles de G-PR1 antes do primeiro convidado real; não confundir
   esse gate com a autorização já existente para testes internos da TAVIR.
10. Reauditar o diff do intake/documentos v2, publicar Vercel + `continue-case` somente após os gates
    e repetir os testes negativos e de headers no release candidato.
11. Se houver decisão de oferecer link externo do relatório, projetar a área privada e submetê-la a
    descoberta, modelagem de ameaças, LGPD e auditoria independente antes de qualquer deploy.
12. Concluir e medir o `TAVIR-C01`; depois usar o aprendizado nas cinco conversas do Gate A para
    validar a oferta downstream. O dogfooding interno não substitui um piloto externo pago.

## Riscos e armadilhas

- Confundir observação pública com dado de negócio: marcar cada achado como observado, informado,
  inferido ou indisponível.
- Enviar o cliente para o Telegram: proibido; toda coleta externa do cliente ocorre no formulário.
- Analisar painel, mensagens privadas, Google Business Profile ou anúncios sem autorização:
  bloqueado por estado da esteira.
- Enviar documento por e-mail duas vezes: usar chave de idempotência e log de entrega.
- Manter Full Access no token carregado pelo runtime: excesso de privilégio; administração de
  templates e envio transacional devem permanecer separados.
- Alterar produto, corpo ou condição comercial em imagem gerada: QA por asset e composição
  determinística de logo/preço/CTA são obrigatórios; resultado enganoso é rejeitado.
- Construir portal/GPU antes de provar custo e disposição a pagar: piloto concierge precede software.
- Tratar personagem sintética como “sem risco jurídico”: termos do provedor, direitos comerciais,
  transparência, exclusividade e semelhança evidente continuam sujeitos a gate.

## Como validar

No Telegram privado, criar um rascunho por `/agentes`, tocar em `⚙️ Configurar IA` e percorrer
provedor, modelo e esforço até voltar ao cartão de revisão. Em `04-execucao/raiox-web/`, executar
`npm run build`; os testes do cron e a checagem sintática devem passar. O audit de dependências deve
permanecer sem vulnerabilidades. Aplicar migration em
Supabase de teste e seguir `SETUP.md` antes de qualquer implementação publicada.

## Retomada rápida

1. Ler este arquivo e `03-plano/supabase-plano-a.md`.
2. Confirmar G1 com Carlos; não pedir tokens ou senhas pelo chat.
3. Criar infraestrutura isolada somente após G2.
4. Atualizar este arquivo, histórico aplicável e Git ao concluir.

## Marcos condensados

- 2026-08-31 — `ignoreCommand` adicionado ao `vercel.json` para impedir previews de PRs que não
  alterem o Root Directory do Raio X; auto-deploy de `main` e gates de uso real permanecem fechados.

- 2026-07-25 — piloto isolado especificado com protótipo local, regras de autorização e dois
  entregáveis; nenhuma coleta, análise ou integração de diagnóstico foi acionada.
- 2026-07-25 — migration aplicada no Supabase de teste; três Edge Functions publicadas e segredos
  necessários cadastrados. Webhook, Vercel e testes de segurança permanecem pendentes.
- 2026-07-25 — webhook criado e ponte Dora → Supabase validada; Vercel alcançável, mas rota de status
  retornou 503. Diagnóstico seguro publicado; produção segue bloqueada até corrigir o ambiente.
- 2026-07-25 — backend Vercel migrou para `SUPA_SERVICE_ROLE_KEY` com compatibilidade legacy e
  `sb_secret_`; checagem sintática e teste de headers aprovados. Redeploy/teste remoto pendentes.
- 2026-07-25 — autoria Git local migrada para TAVIR; deploy de produção atualizado e teste técnico
  Dora → Supabase → Vercel aprovado com HTTP 200 e formulário na etapa 1.
- 2026-07-25 — submissão reproduzida com 403 `invalid_origin`; allowlist normalizada e testada com
  origem válida aprovada e origem externa rejeitada. Redeploy e reteste remoto pendentes.
- 2026-07-25 — reteste remoto após deploy aprovado: submissão do Formulário 1 retornou HTTP 200 e
  `submit_ok: true`. Confirmação do Telegram e teste do Formulário 2 permanecem pendentes.
- 2026-07-25 — frontend corrigido para validar apenas campos da etapa ativa; fluxo completo dos dois
  formulários aprovado em produção, incluindo criação e submissão do Formulário 2 com HTTP 200.
- 2026-07-25 — seleção de IA por job implementada no bot privado; menu publicado e poller saudável.
- 2026-07-25 — scaffold seguro Vercel/Supabase/Telegram preparado, sem credenciais e sem deploy.
- 2026-07-25 — comando `/raiox` publicado no Telegram privado; poller reiniciado e saudável.
- 2026-07-25 — gate assistido de análise implementado: pacote mínimo autorizado fora do Git,
  escolha de IA antes da fila e 33 testes Telegram aprovados; deploy da função bloqueado apenas
  pela identidade incorreta do Supabase CLI.
- 2026-07-25 — `continue-case` publicada pela organização TAVIR e validada em HTTP 200; Dora
  reiniciada e cartão de escolha de IA enviado, sem enfileirar job antes da decisão do CEO.
- 2026-08-07 — criação do primeiro case real bloqueada por hostname Supabase em `NXDOMAIN`, cenário
  compatível com pausa automática do plano Free; mensagem da Dora corrigida e 35 testes aprovados.
- 2026-08-07 — cron preventivo diário da Vercel implementado com segredo sensível, três leituras
  mínimas por execução e quatro testes de segurança; DNS do Supabase voltou a resolver.
- 2026-08-07 — deployment do cron ficou pronto; teste público recusou chamada anônima com 401 e
  teste autenticado executou as três leituras com HTTP 200, sem devolver dados da tabela.
- 2026-08-08 — revisão final dos dois documentos movida para o Telegram privado: anexos sem URL
  pública, decisão vinculada a hashes, ajustes na mesma rota de IA e 40 testes offline aprovados.
- 2026-08-08 — poller reiniciado com os callbacks novos e gate do primeiro case real entregue pela
  Bot API; estado `pending_review`, rodada 1 e hashes válidos para os dois anexos.
- 2026-08-08 — conflito 409 entre poller standalone e poller do servidor eliminado; somente
  `office.py serve 4173` consome `getUpdates`, com zero falhas consecutivas após a estabilização.
- 2026-08-22 — expansão Raio-X → Ativação → Operação de Conteúdo planejada como serviço assistido;
  definidos esteira E0–E9, arquitetura evolutiva, spikes de moda/vídeo/publicação, piloto de quatro
  semanas e gates que impedem SaaS ou GPU prematuros.
- 2026-08-22 — RunPod e moda feminina confirmados; Loja Piloto A preservada por codinome e modelo
  humana substituída por personagem virtual original adulta, com ficha e spike S0 antes do try-on.
- 2026-08-22 — esteira criativa validada documentalmente para descoberta e spikes controlados; matriz
  V0–D, protocolo de cinco conversas, scorecard e fórmula de custo aprovados. Operação real, RunPod,
  SaaS e publicação automática seguem bloqueados pelos gates explícitos.
- 2026-08-22 — Instagram do case processado com sessão operacional autorizada: 76 mídias analisadas,
  relatório da Íris e documentos do Raio-X regenerados. Reabertura manual corrigida para incrementar
  a rodada no mesmo job; rodada 2 enviada, e-mail bloqueado e suíte Telegram com 65 testes aprovada.
- 2026-08-22 — base Vercel auditada e jornada de MicroSaaS controlado implementada localmente:
  LP de convite, consentimentos, noindex, limite de falhas, entrega idempotente e segundo gate de
  e-mail; release real permanece bloqueada por Supabase/Resend/expurgo e auditorias independentes.
- 2026-08-23 — entrega assistida da rodada 2 reconciliada sem retry cego: a única entrega `pending`
  já existente foi continuada com a mesma chave idempotente, a Resend aceitou uma única mensagem com
  os dois PDFs aprovados e `delivery-case` confirmou o fechamento no banco. O estado local terminou
  em `sent`; dados temporários de transporte foram removidos. Carlos confirmou o recebimento na caixa
  de destino. O gate geral de clientes reais não mudou.
- 2026-08-23 — duas prévias privadas redesenhadas com o sistema visual TAVIR e a identidade pública
  captada do Instagram. Todas as 11 páginas foram renderizadas e inspecionadas; originais enviados
  permaneceram intactos e o novo visual aguarda aprovação do guardião da marca.
- 2026-08-22 — MCP remoto oficial da Resend conectado ao Codex por OAuth após atualização da CLI e
  login em modo DCR; integração assistida disponível em novas sessões, sem liberar o envio runtime.
- 2026-08-22 — smoke test do MCP com uma única mensagem para caixa interna autorizada confirmado
  como `delivered`; evidência valida a conexão assistida, não a função runtime `delivery-case`.
- 2026-08-22 — Resend runtime configurada: domínio `tavir.com.br` verificado em São Paulo, DKIM/SPF
  aprovados, DMARC inicial, tracking desativado e chave `sending_access` guardada fora do Git. Envio
  por `raiox@tavir.com.br` chegou à caixa autorizada; o gate geral segue fechado pelos demais itens.
- 2026-08-22 — template `raiox-entrega-v1` criado e publicado com identidade TAVIR, logo oficial por
  CID e fallback em texto; integração endurecida, 62 testes aprovados e prévia interna entregue.
  A elevação temporária da chave runtime para Full Access deve ser revertida antes de produção.
- 2026-08-22 — fluxo da Dora alinhado à implantação: removido o exemplo inexistente
  `raiox.tavir.com.br/inicio` e documentado o alias canônico com a rota assinada `/form/<token>`;
  checks HTTP confirmaram 404 no hostname antigo e 200 com headers de segurança no alias atual.
- 2026-08-23 — Raio-X v2 implementado localmente: intake estruturado e condicional, pacote de análise
  ampliado, Gael/modelos didáticos, Google local e TAVIR Presença Local sob fit; cabeçalho formal e
  paginação corrigidos. Prévia privada de 11 páginas e testes passaram; produção não foi alterada.
- 2026-08-23 — cópia interna das duas prévias v2 enviada uma única vez à caixa operacional da TAVIR
  via Resend, com chave idempotente derivada dos anexos; nenhum cliente recebeu essa versão e os gates
  independentes de produção permanecem fechados.
- 2026-08-23 — cabeçalho das prévias v2 corrigido após feedback visual: removida a falsa sangria por
  margem negativa, criados frames independentes para TAVIR e empresa analisada, e revisadas todas as
  12 páginas finais. Os PDFs corrigidos ainda não foram reenviados por e-mail.
- 2026-08-26 — fluxo local do Raio-X passou a apontar explicitamente para a Íris quando houver
  Instagram; foram definidos contador exato de Requests RapidAPI e relatórios completo/resumido em
  Markdown e HTML. Os HTMLs continuam privados e a produção Vercel não foi alterada.
- 2026-08-30 — Motor Editorial Multicanal registrado como ideia de produto downstream do Raio-X:
  diagnóstico/plano permanecem no Raio-X; detalhamento editorial, Flow, DarkFlow e scorecard ficam na
  oferta posterior. Nenhum runtime, deploy, contato ou publicação foi acionado.
- 2026-08-30 — CTA pós-entrega do Telegram passou a preparar o handoff editorial privado e
  sanitizado por hashes; casos não aprovados/entregues falham fechados e nenhum deploy foi alterado.
- 2026-08-31 — case institucional `RX-E7C28036` recebeu apresentação HTML vertical e estática do
  Dossiê Editorial: 30 fichas executáveis, 15 Reels/15 carrosséis, 81 cenas, 109 lâminas, prompts,
  legendas, Stories, QA e telemetria. A fonte e o validador vivem no Motor Editorial; o Raio-X
  guarda apenas a derivação privada. Nenhuma mídia foi gerada, agendada ou publicada.
