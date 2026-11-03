# QA — TAVIR Escritório redesenho

**Quando:** 2026-10-29
**Ambiente:** local. Movimento e shell em `http://127.0.0.1:9002`. Sessão e onboarding num banco descartável, com API em `9101` e Vite em `9102`. O `tavir.db` de uso não entrou nesse teste.
**Driver:** Playwright Chromium e pytest

## Checkpoint de movimento — executado

Comando: `cd frontend && npm run test:motion`

Resultado: 3 passed (`keyframes do CSS batem com o HTML`, `estilo computado segue os tempos do HTML`, `reduced-motion reduz para 1ms e uma iteração`).

O CSS tem os 17 `@keyframes` do HTML. A lista do goal nomeia esses 17; não há um 18º no arquivo.

## Checkpoint de shell — executado em parte

Comando: `cd frontend && npm run test:shell`

Resultado: 3 passed.

- Rail 64px, botões 44×44, marca 30px, SubNav 236px, item 40px, wordmark 15px, header 64px, em 1440×900.
- Os sete domínios estão no rail. O clique em Módulos abre `/modulos` com “Visão dos módulos”. O clique em Sistema abre Analytics e Configurações abre `/configuracoes`.
- `/aprovacoes`, `/bloqueios`, `/alteracoes`, `/visibilidade`, `/dados`, `/biblioteca`, `/projetos`, `/plataformas` e `/workflows` redirecionam.
- Em 860×900 a SubNav e o texto da busca ficam ocultos. O rail continua em 64px e o header em 64px.

## Checkpoint de tema híbrido — executado

Comando: `cd frontend && npm run test:shell`

O teste `tema claro mantém rail e menu escuros e inverte o botão` passou. Depois de clicar em Alternar tema, o header fica `rgb(244, 246, 242)`, o rail `rgb(7, 13, 24)`, a subnav `rgb(15, 23, 41)` e o botão Iniciar job fica tinta `rgb(11, 18, 32)` com texto lima `rgb(183, 243, 74)`.

## Checkpoint de sessão e onboarding — executado

Comandos:

- `cd backend && python -m pytest tests/integration/test_sessao_local.py -v` — 1 passed
- `cd frontend && npm run test:session` — 1 passed
- `cd frontend && npm run test:shell` — 3 passed, depois do gate de sessão

O HTML define cinco passos de onboarding, não quatro. O teste percorre os cinco.

- Chave vazia mostra “Informe a chave local para continuar.”, sem rail.
- A primeira chave grava só o hash. O texto da chave não aparece na resposta, no evento nem no chat.
- Chave errada mostra “A chave local não confere.”, sem rail, e `GET /api/v1/auth/session` segue sem sessão.
- Onboarding: Continuar, Voltar e Pular. Ao pular, a Sala abre e `onboarding_complete` fica verdadeiro. O login seguinte não reabre o onboarding.
- Encerrar sessão volta ao formulário.
- Com o relógio de teste depois de `expires_at`, `/sala-operacao` cai no login e a sessão fica morta.

## Checkpoint de ledger — executado

Comando: `cd backend && python -m pytest tests/integration/test_ledger_escritorio.py tests/integration/test_sessao_local.py -v`

Resultado: 2 passed.

`GET /api/v1/ledger?day=` e `GET /api/v1/ledger/export` leem o dia no SQLite. Um `details` com `secret` e `SUPABASE_URL` grava só a nota “publicou a revisão”. O valor secreto não fica na coluna nem no arquivo exportado.

## Checkpoint de notificações — executado

Comando: `cd backend && python -m pytest tests/integration/test_notificacoes.py -v`

Resultado: 1 passed.

A lista traz o gate pendente, o job com status `failed` e a demanda com SLA anterior ao relógio de teste. Ficam de fora a aprovação já decidida, o job em execução, o SLA futuro e a demanda concluída. `POST /api/v1/notifications/gate_ap-gate/read` grava a linha em `notification_reads` e o contador de não lidas cai de 3 para 2.

## Checkpoint de busca — executado

Comando: `cd backend && python -m pytest tests/integration/test_busca.py -v`

Resultado: 1 passed.

`GET /api/v1/search?q=` devolve a task e o job cujo texto está no SQLite, a agente Marina, o caso Loja da Rua, a proposta da Padaria Central e a tela Decisões. `zzzz-nada` volta `items` vazio.

## Checkpoint de teto — executado

Comando: `cd backend && python -m pytest tests/integration/test_teto_custo.py -v`

Resultado: 1 passed.

Uma amostra no teto do job pausa esse job e abre uma aprovação `ceiling`. A amostra que faz o dia chegar a US$ 1 pausa o outro job com o motivo “Teto diário atingido” e não abre um segundo gate no job que já estava pausado. `GET /api/v1/analytics/cost?range=14d` soma US$ 1 e 3 tokens; `30d` inclui a amostra de 20 dias antes e soma US$ 10 e 103 tokens. `jobs.cost_usd`, `tokens_total` e `usage_samples` batem com isso.

## Checkpoint de SSE — executado

Comando: `cd backend && python -m pytest tests/integration/test_sse_job.py -v`

Resultado: 1 passed.

`GET /api/v1/jobs/{id}/stream` emite o evento com `created_at` em ISO e omite a linha cujo `created_at` é `nao-e-data`. Essa linha continua em `events`. O cliente também descarta evento sem data interpretável antes de desenhar o log.

## Checkpoint de ações do job — executado

Comando: `cd backend && python -m pytest tests/integration/test_job_acoes.py -v`

Resultado: 1 passed.

`POST /resume` tira o job de `paused` para `running`. `POST /start` tira o da fila para `running` e recusa um que já corre. `POST /redo` recusa job em curso, reabre o encerrado em `queued`, zera o último erro e grava uma tentativa. A resposta traz progresso, custo, teto, tokens, motor, modelo, esforço e o título da task. Os eventos `job_resumed`, `job_started` e `job_redone` estão no SQLite.

## Checkpoint de decisão — executado

Comando: `cd backend && python -m pytest tests/integration/test_decisao_efeito.py -v`

Resultado: 1 passed.

Aprovar a decisão `ceiling` / `block` muda o job pausado para `running`, solta `tasks.gate_held` e grava `decisao.aprovada`. Recusar deixa o outro job em `paused` e grava `decisao.recusada`.

## Checkpoint de cofre — executado

Comando: `cd backend && python -m pytest tests/integration/test_cofre.py -v`

Resultado: 1 passed.

Aprovar a decisão `ap-02` grava `SUPABASE_URL` em `vault_secrets`, retoma o job e solta o gate. `GET /api/v1/vault` devolve a máscara. O valor só volta em `POST /vault/{id}/reveal`. O livro e o chat não contêm a URL.

## Checkpoint de paleta e sino — executado

Comando: `cd frontend && npm run test:shell-controls`

Resultado: 1 passed.

O sino abre o gate criado na API, “Marcar lida” tira o contador e `GET /api/v1/notifications` fica com `unread_count` 0. A paleta, aberta pelo botão e por Ctrl K, mostra “Nada com esse termo.” para `zzzz-nada`, move a seleção com a seta e o Enter abre o `href` devolvido por `GET /api/v1/search?q=a`. Esc fecha.

## Checkpoint de ações na Execuções — executado

Comando: `cd frontend && npm run test:jobs`

Resultado: 1 passed.

Na tela, Iniciar agora leva o job da fila para Rodando, Pausar para Pausado, Retomar de volta para Rodando, Refazer para Na fila e Cancelar para Falhou. `GET /api/v1/jobs/` confirma `running`, `paused`, `running`, `queued` e `failed`. O filtro Concluídos, sem item, mostra “Nenhum job neste filtro.”

## Checkpoint do wizard de job — executado

Comando: `cd frontend && npm run test:job-wizard`

Resultado: 1 passed.

Teto vazio mostra “Informe o teto para continuar.” e `GET /api/v1/jobs/` continua vazio. Com teto 2.5 o toast diz “Job em execução”, o job volta com motor, modelo, esforço e `budget_ceiling` 2.5, e o ledger tem a ação `job.criado` com esse id.

## Checkpoint de Decisões — executado

Comando: `cd frontend && npm run test:decisions`

Resultado: 1 passed.

J e K movem a seleção, C abre “Publicar com a variável?” e A aprova o deploy. O carimbo mostra “Decisão registrada: Aprovado”, `job-dec` fica `running` e o gate da task solta. O valor do cofre não aparece no cofre público nem no ledger. R grava “Não segue.” na decisão e no ledger, e o job recusado continua `paused`. O filtro Alterações mostra “Nada neste filtro.”

## Checkpoint de Tasks — executado

Comando: `cd frontend && npm run test:tasks`

Resultado: 1 passed.

“Revisar o contrato” entra em A planejar e `GET /api/v1/tasks/` devolve `to_plan`. “Publicar sem gate” vai para a coluna Em execução com status `in_progress`. “Publicar com gate” recebe Concluir e continua `in_progress`, fora da coluna Concluído.

## Checkpoint de planejamento — executado

Comando: `cd frontend && npm run test:plan`

Resultado: 1 passed.

“Planejar com Paula” em “Revisar o briefing” abre o diálogo, confirma o plano e o card passa para Planejado. A task fica `planned` e o job de origem `planning` termina `succeeded`.

## Checkpoint de Chat — executado

Comando: `cd frontend && npm run test:chat`

Resultado: 1 passed.

Nova conversa e a escolha de Paula PM abrem a conversa com “Conversa vazia. O ofício entra no contexto.” e o texto do ofício. `GET /api/v1/chat/conversations` devolve essa conversa. Enviar mostra o balão, o indicador “está pensando” e a mensagem fica gravada na conversa.

## Checkpoint de exclusão do Chat — executado

Comando: `cd frontend && npm run test:chat-delete`

Resultado: 1 passed.

Apagar “Plano da semana” pede confirmação. Sim tira a conversa da lista e de `GET /api/v1/chat/conversations`. O ledger grava `chat.apagada` com o id, sem o texto da mensagem.

## Checkpoint de ofício — executado

Comando: `cd frontend && npm run test:oficio`

Resultado: 1 passed.

Salvar o ofício da Paula mostra o toast e `GET /api/v1/agents/pm-paula/soul` devolve o texto. Abrir o chat dela cria a conversa com o agent id `pm-paula`.

## Checkpoint de imagem no Chat — executado

Comando: `cd frontend && npm run test:chat-image`

Resultado: 1 passed.

Anexar um PNG e enviar mostra a imagem na mensagem. `GET /api/v1/chat/images/...` responde 200 com os bytes PNG.

## Checkpoint de log do job — executado

Comando: `cd frontend && npm run test:job-log`

Resultado: 1 passed.

O log ao vivo mostra “linha válida do terminal” com a hora 15:00:00. O evento sem data fica no banco e não aparece no log nem no fluxo SSE.

## Checkpoint de teto — executado

Comando: `cd frontend && npm run test:ceiling`

Resultado: 1 passed.

Quando o custo chega ao teto do job, a tela de Execuções passa a mostrar Pausado e “Teto do job atingido”. Em Decisões o gate “Teto de gasto” fica aberto. O job fica `paused`, a aprovação fica `pending` e o livro do dia não contém o segredo enviado no pedido.

## Checkpoint de perfil — executado

Comando: `cd frontend && npm run test:profile`

Resultado: 1 passed.

Salvar o nome Helena e o idioma inglês faz a Sala mostrar “Good afternoon, Helena.”. Trocar para português mostra “Boa tarde, Helena.”. `GET /api/v1/settings` devolve o nome, o idioma e a mesma saudação.

## Checkpoint de ordem da Sala — executado

Comando: `cd frontend && npm run test:sala-order`

Resultado: 1 passed.

Subir “Precisa de você” três vezes e salvar faz esse bloco aparecer primeiro na Sala. `GET /api/v1/settings` devolve a ordem `precisa, jobs, escalados, cards`.

## Checkpoint de exportação do livro — executado

Comando: `cd frontend && npm run test:ledger-export`

Resultado: 1 passed.

O botão Exportar livro-razão baixa `ledger-AAAA-MM-DD.txt` com o cabeçalho e a linha do evento do dia.

## Checkpoint do hub de módulos — executado

Comando: `cd frontend && npm run test:modules`

Resultado: 1 passed.

A visão dos módulos mostra Raio-X 2, Studio 1, Fábrica 1, Flow 3 e Edição 4, iguais a `GET /api/v1/modules/summary`. Cada cartão abre a rota da esteira.

## Checkpoint do Flow — executado

Comando: `cd frontend && npm run test:flow`

Resultado: 1 passed.

Rodar agora em “Publicar a peça” para em “Revisão Editorial”, abre a aprovação pendente e deixa a faixa beta visível. A execução fica `waiting_gate` com motor manual.

## Checkpoint de novo workflow — executado

Comando: `cd frontend && npm run test:flow-create`

Resultado: 1 passed.

Nome vazio mostra “Informe o nome do workflow.”. “Revisar o corte” entra na lista e `GET /api/v1/workflows` devolve esse nome com o gate “Gate humano”.

## Checkpoint de exportação .srt — executado

Comando: `cd frontend && npm run test:srt`

Resultado: 1 passed.

O projeto “Corte da sala” mostra as falas. “Exportar .srt” faz `POST /api/v1/edit/projects/corte-sala/srt` e baixa `corte-sala.srt` com os dois blocos de tempo.

## Checkpoint da fila de render — executado

Comando: `cd frontend && npm run test:render-queue`

Resultado: 1 passed.

Nome vazio mostra “Informe o nome do render.”. “Corte final” aparece na fila com 0% e `GET /api/v1/edit/renders` devolve esse item com `progress` 0 e `status` `queued`.

## Checkpoint do Raio-X — executado

Comando: `cd frontend && npm run test:raiox`

Resultado: 1 passed.

“Leitura completa” com deep scan abre “Padaria do Largo”. A varredura mostra “Falta · Site próprio” e, depois de “Registrar evidência”, “Coberto · Site próprio”. A prioridade “Encontrar” e a devolutiva “Não emitir” ficam no caso. `GET /api/v1/raiox/cases/{id}` devolve a empresa, a evidência na frente `site`, `deep_scan` verdadeiro e `debrief_decision` `nao_emitir`.

## Checkpoint de proposta do caso — executado

Comando: `cd frontend && npm run test:raiox-offer`

Resultado: 1 passed.

Oferta sem nome mostra “Informe o nome da oferta.”. “Gerar proposta” mostra “Pautar a venda”. “Registrar oferta” com “Presença Local” mostra esse nome. `GET /api/v1/proposals?raiox_case_id=caso-padaria` devolve as duas propostas com esse `raiox_case_id`.

## Checkpoint do Studio — executado

Comando: `cd frontend && npm run test:studio`

Resultado: 1 passed.

“Novo perfil” cria “Padaria”. “Nova produção” no Oráculo com o ângulo “Fila na padaria às oito” abre a pauta. “Aprovar opção” gera o roteiro e a revisão. “Aprovar publicação” deixa a peça em `done`. “Salvar instruções” grava “Começar pela fila” em `guidelines`. `GET /api/v1/studio/pieces` devolve a peça do perfil com roteiro e estágio `done`.

## Checkpoint da Fábrica — executado

Comando: `cd frontend && npm run test:factory`

Resultado: 2 passed.

“Usar esteira” na LP cria “Padaria web”. “Refazer entrega” grava a nota “Reabrir o briefing” em `run.meta.redo`. “Pausar” deixa a corrida `paused` e o JSON do livro-razão contém essa ação. “Rodar QA agora” devolve o dossiê. No projeto finalizado, “Entrar em manutenção” abre o campo “Descreva a alteração no projeto…” e `GET /api/v1/factory/projects/padaria-pronta/run` fica com `status` `done` e `meta.maintenance` verdadeiro. “Aplicar no projeto” aparece e não é enviado: essa ação chama o motor de IA.

## Checkpoint da trilha da Edição — executado

Comando: `cd frontend && npm run test:timeline`

Resultado: 1 passed.

A timeline abre em 00:04 de 00:45. O clique na trilha “Trilha” leva o cursor para além de 50% da faixa. O estilo do cursor é `transition: none` e a duração computada é `0s`. O relógio deixa de mostrar 00:04.

## Checkpoint do funil — executado

Comando: `cd backend && python -m pytest tests/integration/test_funil.py -v` e `cd frontend && npm run test:funil`

Resultado: 1 passed em cada um.

Dois casos e três propostas no SQLite produzem valor em aberto `R$ 30,0 mil` (2 propostas vivas), conversão `50%`, ciclo `10 d` e ticket `R$ 30,0 mil`. A tela `/funil` mostra esses quatro rótulos iguais a `GET /api/v1/commercial/funnel`.

## Checkpoint de propostas — executado

Comando: `cd frontend && npm run test:propostas`

Resultado: 1 passed.

“Nova proposta” grava “Padaria Dois Irmãos” em andamento. “Gerar link & Enviar” para `dono@padaria.test` muda o texto para “Enviada · aguardando resposta do cliente” e o estágio visível para pendentes. “Contra-assinar e Concluir Proposta” mostra “Aceita e contra-assinada” e concluídas. `GET /api/v1/proposals` devolve `stage` `done`, o destinatário e o aceite `signed`.

## Checkpoint da decisão de contrato — executado

Comando: `cd backend && python -m pytest tests/integration/test_decisao_contrato.py -v` e `cd frontend && npm run test:contrato`

Resultado: 1 passed em cada um.

Uma proposta em “aguardando contra-assinatura” mostra “Decidir”. O clique abre `/decisoes` com o título “Contra-assinatura · Atlas Holdings” e o texto “Contrato de Atlas Holdings” com valor `R$ 48,5 mil`. `GET /api/v1/approvals/` devolve `kind` `contract` e `question` `prop-atlas`. O segundo clique devolve a mesma decisão. Rascunho recebe 409.

## Checkpoint de personas — executado

Comando: `cd backend && python -m pytest tests/integration/test_personas.py -v` e `cd frontend && npm run test:personas`

Resultado: 1 passed em cada um.

Nome vazio mostra “Informe o nome da persona.” e não grava linha. “Dono de negócio local” aparece na lista com “Perde cliente fora de hora”. `GET /api/v1/studio/personas` devolve esse nome, o público “loja, padaria, oficina” e `status` `active`. O SQLite fica com uma persona.

## Checkpoint de finanças — executado

Comando: `cd frontend && npm run test:financas`

Resultado: 1 passed.

Duas amostras, US$ 12,5 e US$ 7,5, aparecem em barras na série. O total visível é US$ 20 e 150 tokens, iguais a `GET /api/v1/analytics/cost?range=30d`. Cada dia do gráfico repete o valor do dia na API.

## Checkpoint de conexão social — executado

Comando: `cd backend && python -m pytest tests/integration/test_social_conectar.py -v` e `cd frontend && npm run test:social`

Resultado: 1 passed em cada um.

Instagram abre como “Desconectado”. “Conectar” passa o cartão para “Conectado” e o botão some. `GET /api/v1/social/connections` devolve `status` `connected`. O SQLite fica com uma linha em `social_connections`. Conectar de novo não duplica a linha. Plataforma desconhecida recebe 404. LinkedIn continua desconectado.

## Checkpoint da caixa de entrada — executado

Comando: `cd backend && python -m pytest tests/integration/test_inbox.py -v` e `cd frontend && npm run test:inbox`

Resultado: 1 passed em cada um.

“Enviar resposta” com “Podemos falar amanhã.” muda a mensagem para “Respondida” e grava `reply_text`. “Encaminhar” para “Yuri” muda a outra mensagem para “Encaminhada” e grava `forward_to`. Resposta vazia recebe 400. Mensagem inexistente recebe 404. O SQLite fica com as duas linhas e os dois status.

## Checkpoint do caso a partir da caixa — executado

Comando: `cd backend && python -m pytest tests/integration/test_inbox_caso.py -v` e `cd frontend && npm run test:inbox-caso`

Resultado: 1 passed em cada um.

“Abrir caso no Raio-X” na mensagem de “Padaria Nova” abre `/raiox/{id}` com o título da padaria. `GET /api/v1/raiox/cases` contém essa empresa e o objetivo “Quero aparecer no Google.”. A mensagem guarda `raiox_case_id`. O segundo clique devolve o mesmo caso. Mensagem de cliente antigo recebe 409 e não cria outro caso.

## Checkpoint da nota de conhecimento — executado

Comando: `cd backend && python -m pytest tests/integration/test_conhecimento.py -v` e `cd frontend && npm run test:conhecimento`

Resultado: 1 passed em cada um.

“Guardar nota” com “Fila na padaria” e escopo comercial mostra a nota na lista e no grafo, com o escopo comercial. `POST /api/v1/knowledge` grava `extra_metadata.domain` `comercial` e `source_type` `manual`. `GET /api/v1/knowledge/graph` traz o nó `note` ligado a `scope:comercial`. Título vazio e escopo vazio recebem 400. O SQLite fica com uma linha em `knowledge_entries`.

## Checkpoint do filtro da memória — executado

Comando: `cd backend && python -m pytest tests/integration/test_memoria_filtro.py -v` e `cd frontend && npm run test:memoria`

Resultado: 1 passed em cada um.

A nota “Fila na padaria” aparece em Memória. O termo `zzz` mostra “Nada com esse filtro.” e tira a nota da lista visível. `GET /api/v1/knowledge?q=zzz` volta vazio e `GET /api/v1/knowledge` continua devolvendo a mesma nota.

## Checkpoint de ideias — executado

Comando: `cd backend && python -m pytest tests/integration/test_ideias.py -v` e `cd frontend && npm run test:ideias`

Resultado: 1 passed em cada um.

“Criar ideia” com “Fila vira cardápio” mostra o título na fila. Depois de recarregar, o mesmo título continua na lista. `GET /api/v1/ideas` devolve `status` `inbox`. Título vazio recebe 400. O SQLite fica com uma linha em `ideas`.

## Checkpoint da missão — executado

Comando: `cd backend && python -m pytest tests/integration/test_missao.py -v` e `cd frontend && npm run test:missao`

Resultado: 1 passed em cada um.

A Missão Q4 abre em `0/2`. “Concluir marco” em “Capítulo 4” muda o progresso visível para `1/2` e marca o marco como “Concluído”. “Landing” continua aberto. `GET /api/v1/missions` devolve `progress` `1/2`. O SQLite grava `done` só no marco concluído. Marco inexistente recebe 404.

## Checkpoint do mapa — executado

Comando: `cd backend && python -m pytest tests/integration/test_mapa.py -v` e `cd frontend && npm run test:mapa`

Resultado: 1 passed em cada um.

O mapa lista o setor Comercial com Marina e o setor Engenharia com Yuri, lidos de `GET /api/v1/agents/sectors`. A página não tem canvas nem texto de mapa isométrico. O SQLite é a origem dos dois agentes.

## Checkpoint de analytics — executado

Comando: `cd frontend && npm run test:analytics`

Resultado: 1 passed.

Duas amostras, US$ 12,5 e US$ 7,5, aparecem nas barras de Analytics. O total visível é US$ 20 e 150 tokens, iguais a `GET /api/v1/analytics/cost?range=14d`. Cada dia do gráfico repete o valor do dia na API. A série no SQLite já estava coberta por `tests/integration/test_teto_custo.py`.

## Checkpoint do Doctor — executado

Comando: `cd backend && python -m pytest tests/integration/test_doctor.py -v` e `cd frontend && npm run test:doctor`

Resultado: 1 passed em cada um.

O Doctor lista as 6 dimensões. Com um job concluído e dois com erro, Engenharia mostra o sinal “3 jobs registrados · 2 com erro” e o score 75, iguais a `GET /api/v1/doctor/checks`.

## Checkpoint do reinício em double — executado

Comando: `cd backend && python -m pytest tests/integration/test_servico_double.py -v` e `cd frontend && npm run test:restart`

Resultado: 2 passed no pytest e 1 passed no Playwright.

“Reiniciar backend” e “Reiniciar frontend” mostram “Double: backend reiniciado sem encerrar a porta.” e “Double: frontend reiniciado sem encerrar a porta.”. A resposta traz `double` verdadeiro e `scheduled` falso. O agendamento real da porta não é chamado. Serviço desconhecido recebe 404. As portas 9001 e 9002 não entram nesse teste.

## Checkpoint de skills e organograma — executado

Comando: `cd backend && python -m pytest tests/integration/test_skills_org.py -v` e `cd frontend && npm run test:org`

Resultado: 1 passed em cada um.

`/skills` lista cada item de `GET /api/v1/skills`, com o mesmo nome. `/org-chart` mostra Marina como “Sem reporte” e Yuri como “Reporta a Marina”. `GET /api/v1/agents/` devolve `reports_to` `Marina`. O SQLite guarda esse valor na linha do Yuri.

## Checkpoint de configuração — executado

Comando: `cd backend && python -m pytest tests/integration/test_config_submits.py -v` e `cd frontend && npm run test:config-submits`

Resultado: 1 passed em cada um.

“Novo projeto” grava “Padaria Nova” e a pasta local. “Salvar projeto” guarda o comando `npm run build` e a base `negocios`. “Plugar” no Claude marca `has_key` e o livro-razão registra `motor.plug` sem a chave e sem o campo `api_key`. “Aprovar” tira `fila.md` da gaveta do agente e coloca na do projeto. Nome vazio recebe 400.

## Checkpoint do fluxo guiado — executado

Comando: `cd backend && python -m pytest tests/integration/test_tour.py -v` e `cd frontend && npm run test:tour`

Resultado: 1 passed no pytest e 2 passed no Playwright.

“Ciclo de execução” mostra “Por que importa.” nos oito passos, do Login até Sistema / Analytics. “Concluir” grava `exec` em `tours_seen`. “Jornada do cliente” percorre Raio-X, o caso, Propostas, Decisões, Funil e Finanças, e grava `client` na mesma lista. Percurso desconhecido recebe 404. Repetir a conclusão não duplica a marca.

## Checkpoint da tela estreita — executado

Comando: `cd frontend && npm run test:estreito`

Resultado: 1 passed.

Em 860×900 a Sala e Execuções ficam com o shell em duas colunas. A subnav fica oculta. O texto e o atalho da busca somem e o botão de busca continua visível. O detalhe do job desce para baixo da lista.

## Checkpoint do rail — executado

Comando: `cd frontend && npm run test:shell-domains`

Resultado: 1 passed.

Os sete domínios trocam o menu da subnav. O item de outro domínio sai da lista. O hover de cada botão mostra o tooltip com o nome do domínio.

## Checkpoint de movimento — executado

Comando: `cd frontend && npm run test:motion`

Resultado: 3 passed.

Os 17 keyframes do HTML batem com `visual/motion-reference.json`. O estilo computado segue os tempos do HTML. Com reduced-motion, a duração fica em 1ms e a iteração em 1.

## Checkpoint de SVG e build — executado

Comando: `cd backend && python -m pytest tests/unit/test_svg_hygiene.py -v` e `cd frontend && npm run build`

Resultado: 1 passed no pytest. O build terminou com código 0. O TypeScript apontou cinco erros antes da correção; depois deles o `tsc -b` e o `vite build` concluíram. Avisos de chunk e de opção deprecada do plugin React não interrompem o build.

A varredura leu os SVGs de `frontend/public` e `frontend/src`. Nenhum contém `<metadata>` nem `c2pa`.

## Checkpoint do chrome da Sala — executado

Comando: `cd frontend && npm run test:estreito`, `npm run test:shell-controls` e `npm run test:shell-domains`

Resultado: 1 passed em cada um.

A busca do header passou a “Buscar telas, tasks, agentes…”. A subnav mostra “Escritório”, “Fluxo guiado” e “Como funciona”. A Sala mostra a data, a saudação, “Novo projeto” e “Nova task”. O TypeScript do frontend compilou com código 0.

## Checkpoint da comparação pixel — executado

Comando: `node .claude/skills/reference-fidelity-frontend/scripts/capture_playwright.mjs --manifest visual/playwright-screens.json` e `python .claude/skills/reference-fidelity-frontend/scripts/compare_screens.py --reference visual/reference --candidate visual/actual --output visual/report --threshold 12`

Resultado inicial: 36 telas, média 87,57%. Depois do tema claro, a média foi para 88,42%. Com o miolo da Sala no fixture, 88,81%. Edição e Analytics no mesmo fixture levaram a média a 88,97%: Edição 87,99% e Analytics 85,85%. Decisões clara permanece em 71,94% e a Sala clara em 82,81%. O relatório está em `visual/report/report.html`. Nenhuma tela chegou a 97%. Execuções em 860 px não entrou neste lote.

## Checkpoint Fábrica (HTML `Referencias/Fábrica-html`) — em curso

- **Painel** (`/fabrica`, fixture 9204 vs ref 4210, viewport 1440×900, shell `.fab` isolado): **99,95%** — `visual/report-fabrica/report.html`. Gate ≥97% cumprido; residual ~0,05% em AA dos anéis 100%.
- **Console · Visão geral** (abrir Meridian): **99,34%** — `visual/report-fabrica-console/report.html`. Token `--on-ink-line`, cascade `.link` inherit, `.fb-path .btn` 28px. Capture: `visual/_capture_fabrica_console.mjs`.
- **Console · Esteira** (Meridian → tab Esteira, scrollTop 320 para topologia + Completion Guard): **99,43%** — `visual/report-fabrica-esteira/report.html`. Topologia 9 nós, painel QA (etapa 06 · no gate), Guard 6/8 com grupos Build / Prova visual / SEO. Capture: `visual/_capture_fabrica_esteira.mjs`.
- **Console · QA** (Meridian → tab QA, scrollTop 320): **99,14%** — `visual/report-fabrica-qa/report.html`. Completion Guard 6/8 + painel QA (QA-0142, 2 falhas, evidências e suítes). Capture: `visual/_capture_fabrica_qa.mjs`.
- **Console · Acessos** (Meridian → tab Acessos, scrollTop 320): **99,20%** — `visual/report-fabrica-acessos/report.html`. Credenciais com `SUPABASE_URL` faltando (default), contas e pessoas. Capture: `visual/_capture_fabrica_acessos.mjs`.
- **Console · Segurança** (Meridian → tab Segurança, scrollTop 320): **99,07%** — `visual/report-fabrica-seg/report.html`. SEC-0031, score 69, F-01 expandida, findings/checks. Capture: `visual/_capture_fabrica_seg.mjs`.
- **Console · Kanban** (Meridian → tab Kanban): **99,58%** — `visual/report-fabrica-kanban/report.html`. 4 colunas + extras Meridian (QA subtarefas + ENV). Capture: `visual/_capture_fabrica_kanban.mjs`.
- **Console · Roadmap** (Meridian → tab Roadmap): **98,45%** — `visual/report-fabrica-roadmap/report.html`. Gantt + miles gates [3,5,8]. Capture: `visual/_capture_fabrica_roadmap.mjs`.
- **Console · Workspace** (Meridian → tab Workspace / pt.arquivos): **97,62%** — `visual/report-fabrica-workspace/report.html`. Tree 25 rows (cascade inherit 14px/1.5) + 18 file cards. Capture: `visual/_capture_fabrica_workspace.mjs`.

## O que ainda não foi executado

Subir as telas abaixo de 97% e incluir Execuções no viewport de 860 px. Tabs Meridian do console da Fábrica (Painel→Workspace) já ≥97%.
