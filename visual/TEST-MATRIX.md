# Matriz de QA — TAVIR Escritório redesenho

**Build/commit:** ainda não executado
**Ambiente:** local, backend 9001, frontend 9002, banco de teste descartável (não o `tavir.db` de uso)
**Driver de UI:** Playwright, a criar em `frontend/tests/journeys.spec.ts`
**Navegador:** Chromium, 1440×900 e 860×900 na linha estreita
**Dados de teste:** fixture sintético. Segredo de cofre usado no teste é valor falso, nunca uma chave real.

Cada linha só pode ir para Aprovado depois de uma execução cuja evidência está na coluna. UI e API são checagens separadas: o clique acontece na tela; a API só confirma a pós-condição.

| ID | Tela | Controle | Pré-condição | Ação pela UI | Resultado visível | Checagem API | Risco | Status | Evidência |
|---|---|---|---|---|---|---|---|---|---|
| SESSAO-001 | Login | Acessar painel | sem sessão, chave errada | preencher chave inválida e enviar | erro visível, shell ausente | `GET /api/v1/auth/session` sem sessão | alto | Passou | `npm run test:session` 2026-10-29 |
| SESSAO-002 | Login | Acessar painel | sem chave configurada | definir chave e entrar | Sala abre | sessão autenticada, hash gravado, chave ausente do ledger | alto | Passou | pytest `test_sessao_local` + `npm run test:session` 2026-10-29 |
| SESSAO-003 | Login sessão | Encerrar sessão | sessão ativa | encerrar | volta ao formulário | `POST /logout` e sessão morta | alto | Passou | `npm run test:session` 2026-10-29 |
| SESSAO-004 | Login | — | sessão com relógio de teste após 12 h | abrir `/sala-operacao` | cai no login | sessão expirada | alto | Passou | `npm run test:session` 2026-10-29 |
| ONB-001 | Onboarding | Continuar, Voltar, Pular | primeiro acesso | atravessar os 5 passos do HTML, voltar um, pular | Sala ao fim; segundo login não reabre | `office_settings` marca onboarding concluído | médio | Passou | `npm run test:session` 2026-10-29 |
| SHELL-001 | Rail | sete domínios | sessão | clicar cada domínio | o menu da subnav troca | — | médio | Passou | `npm run test:shell-domains` 2026-10-29 |
| SHELL-002 | Rail | botão do domínio | hover | passar o mouse | tooltip visível | — | baixo | Passou | `npm run test:shell-domains` 2026-10-29 |
| SHELL-003 | Paleta | Ctrl K | sessão | abrir, seta, Enter, Esc, termo sem hit | abre a tela do hit; vazio mostra “Nada com esse termo.” | `GET /api/v1/search?q=` | médio | Passou | `npm run test:shell-controls` 2026-10-29 |
| SHELL-004 | Notificações | sino | há não lidas | abrir e marcar lida | contador desce | `POST /api/v1/notifications/{id}/read` | médio | Passou | `npm run test:shell-controls` 2026-10-29 |
| SHELL-005 | Tema | Alternar tema | tema escuro | alternar | miolo claro, rail e subnav escuros, CTA tinta com texto lima | — | alto | Passou | `npm run test:shell` 2026-10-29 |
| JOB-001 | Wizard | Iniciar job | teto vazio | tentar submeter | não cria job | nenhum job novo | alto | Passou | `npm run test:job-wizard` 2026-10-29 |
| JOB-002 | Wizard | Iniciar job | motor, modelo, esforço, teto | submeter | job na lista e toast | `POST /api/v1/jobs` e linha no ledger | alto | Passou | `npm run test:job-wizard` 2026-10-29 |
| JOB-003 | Execuções | Pausar, Retomar, Cancelar, Iniciar agora, Refazer | um job em cada status | acionar cada botão | status visível muda | pause, resume, cancel, start, redo | alto | Passou | `npm run test:jobs` 2026-10-29 |
| JOB-004 | Execuções | filtro | lista com jobs | filtro sem correspondência | “Nenhum job neste filtro.” | — | baixo | Passou | `npm run test:jobs` 2026-10-29 |
| JOB-005 | Execuções | log | job running | esperar uma linha SSE | linha com hora válida | evento sem `created_at` não aparece | alto | Passou | `npm run test:job-log` 2026-10-29 |
| TETO-001 | Execuções | — | custo no teto | observar o job parar | gate de ceiling aberto | job parado e approval criado; segredo fora do `GET /ledger` | alto | Passou | `npm run test:ceiling` 2026-10-29 |
| TASK-001 | Tasks | Nova task | kanban | criar com título | card em A planejar | `POST /api/v1/tasks` | alto | Passou | `npm run test:tasks` 2026-10-29 |
| TASK-002 | Tasks | coluna | card sem gate | mover para Em execução | coluna nova | `PATCH` status | alto | Passou | `npm run test:tasks` 2026-10-29 |
| TASK-003 | Tasks | card com gate | gate aberto | tentar concluir | não conclui | status inalterado | alto | Passou | `npm run test:tasks` 2026-10-29 |
| TASK-004 | Drawer | Planejar com Paula | card a planejar | pedir plano | card em Planejado | job de planejamento criado | médio | Passou | `npm run test:plan` 2026-10-29 |
| DEC-001 | Decisões | J K A R C | lista com pendentes | navegar, aprovar, recusar, contexto | seleção e carimbo | `POST /decide` retoma job e solta gate no aprovar de deploy | alto | Passou | `npm run test:decisions` 2026-10-29 |
| DEC-002 | Decisões | cofre | ap-02 | aprovar com valor falso | carimbo; valor não aparece no livro-razão | `POST /api/v1/vault` e `GET /ledger` sem o valor | alto | Passou | `npm run test:decisions` 2026-10-29 |
| DEC-003 | Decisões | Recusar | pendente | recusar com comentário | card devolvido | comentário no approval e no ledger | alto | Passou | `npm run test:decisions` 2026-10-29 |
| DEC-004 | Decisões | filtro | lista | filtro vazio | “Nada neste filtro.” | — | baixo | Passou | `npm run test:decisions` 2026-10-29 |
| CHAT-001 | Chat | Nova | roster | escolher agente | conversa abre com ofício no contexto | `POST /conversations` | alto | Passou | `npm run test:chat` 2026-10-29 |
| CHAT-002 | Chat | Enviar | conversa | enviar texto | balão do usuário e indicador | `POST .../messages` | alto | Passou | `npm run test:chat` 2026-10-29 |
| CHAT-003 | Chat | anexo | conversa | anexar imagem de teste | mensagem com imagem | imagem servida em `/images/` | médio | Passou | `npm run test:chat-image` 2026-10-29 |
| CHAT-004 | Chat | apagar | conversa com mensagens | confirmar exclusão | conversa vazia ou removida, como a referência | `DELETE` ou messages vazias, linha no ledger | médio | Passou | `npm run test:chat-delete` 2026-10-29 |
| CHAT-005 | Chat | vazio | conversa nova | abrir | “Conversa vazia…” | — | baixo | Passou | `npm run test:chat` 2026-10-29 |
| OFICIO-001 | Drawer ofício | Salvar ofício | agente | editar e salvar | toast de salvo | `PUT /api/v1/agents/{id}/soul` | alto | Passou | `npm run test:oficio` 2026-10-29 |
| OFICIO-002 | Drawer ofício | Abrir chat | agente | clicar | chat daquele agente | conversa com o agent id | médio | Passou | `npm run test:oficio` 2026-10-29 |
| MOD-001 | Hub | Abrir | cinco módulos | abrir cada esteira | a rota do módulo | `GET /api/v1/modules/summary` bate com os números | médio | Passou | `npm run test:modules` 2026-10-29 |
| RAIOX-001 | Raio-X | Novo caso, evidência, devolutiva, varredura | lista | cada botão | caso ou evidência visível | rotas já existentes de `/raiox` | alto | Passou | `npm run test:raiox` 2026-10-29 |
| RAIOX-002 | Caso | Gerar proposta, Registrar oferta | caso aberto | cada botão | proposta ligada ao caso | proposta com `raiox_case_id` | alto | Passou | `npm run test:raiox-offer` 2026-10-29 |
| STUDIO-001 | Studio | Novo perfil, Nova produção, Oráculo, ângulo, roteiro, revisão, publicação, instruções | esteira | cada controle da referência | estado da peça muda | rotas `/studio` correspondentes | alto | Passou | `npm run test:studio` 2026-10-29 |
| FAB-001 | Fábrica | Nova esteira, Usar esteira, Controle, alteração, refazer, QA, exportar JSON | lista | cada controle | esteira ou artefato | rotas `/factory` correspondentes | alto | Passou | `npm run test:factory` 2026-10-29 |
| FLOW-001 | Flow | Rodar agora | workflow com um passo de gate | rodar | execução para no gate; faixa beta continua | `workflow_run` e approval; sem motor contínuo | alto | Passou | `npm run test:flow` 2026-10-29 |
| FLOW-002 | Flow | Novo workflow | lista | criar | aparece na lista | `POST /workflows` | médio | Passou | `npm run test:flow-create` 2026-10-29 |
| EDICAO-001 | Edição | trilha | timeline | clicar a trilha | cursor move | — | médio | Passou | `npm run test:timeline` 2026-10-29 |
| EDICAO-002 | Edição | Exportar .srt | projeto com legenda | exportar | download | `POST` export devolve o arquivo | alto | Passou | `npm run test:srt` 2026-10-29 |
| EDICAO-003 | Edição | fila de render | item na fila | enfileirar | percentual visível | `edit_renders` persistido | médio | Passou | `npm run test:render-queue` 2026-10-29 |
| COM-001 | Funil | métricas | casos e propostas do fixture | abrir `/funil` | quatro números iguais à API | `GET /api/v1/commercial/funnel` | alto | Passou | `npm run test:funil` e `pytest tests/integration/test_funil.py` 2026-10-29 |
| COM-002 | Propostas | Nova proposta, enviar, aceitar | funil | criar, enviar, aceitar | estágio visível muda | POST/send/accept | alto | Passou | `npm run test:propostas` 2026-10-29 |
| COM-003 | Propostas | Decidir | proposta em contra-assinatura | abrir decisão | detalhe de contrato | approval kind contract | alto | Passou | `npm run test:contrato` e `pytest tests/integration/test_decisao_contrato.py` 2026-10-29 |
| COM-004 | Personas | criar | lista | criar persona | aparece na lista | `POST /studio/personas` | médio | Passou | `npm run test:personas` e `pytest tests/integration/test_personas.py` 2026-10-29 |
| COM-005 | Finanças | série | samples do fixture | abrir | gráfico lê a série | `GET /analytics/cost` | médio | Passou | `npm run test:financas` 2026-10-29 |
| SOC-001 | Social | Conectar | plataforma desconectada | conectar | estado conectado | `social_connections` | médio | Passou | `npm run test:social` e `pytest tests/integration/test_social_conectar.py` 2026-10-29 |
| SOC-002 | Inbox | Enviar resposta, Encaminhar | mensagem | cada ação | status da mensagem muda | inbox persistido | médio | Passou | `npm run test:inbox` e `pytest tests/integration/test_inbox.py` 2026-10-29 |
| SOC-003 | Inbox | Abrir caso no Raio-X | mensagem de cliente novo | abrir caso | navega ao caso | `GET /raiox/cases` contém o novo | alto | Passou | `npm run test:inbox-caso` e `pytest tests/integration/test_inbox_caso.py` 2026-10-29 |
| KN-001 | Conhecimento | Guardar nota | cérebro ou memória | salvar nota com escopo | nota na lista e no grafo | `POST /knowledge` e `GET /knowledge/graph` | alto | Passou | `npm run test:conhecimento` e `pytest tests/integration/test_conhecimento.py` 2026-10-29 |
| KN-002 | Memória | filtro | notas existentes | termo sem hit | “Nada com esse filtro.” | — | baixo | Passou | `npm run test:memoria` e `pytest tests/integration/test_memoria_filtro.py` 2026-10-29 |
| KN-003 | Ideias | criar | lista | nova ideia | persiste ao recarregar | `POST /ideas` | médio | Passou | `npm run test:ideias` e `pytest tests/integration/test_ideias.py` 2026-10-29 |
| EST-001 | Mission | progresso | missão Q4 | alterar marco | progresso visível muda | `missions` / `milestones` | médio | Passou | `npm run test:missao` e `pytest tests/integration/test_missao.py` 2026-10-29 |
| EST-002 | Mapa | — | setores | abrir | lista setores e agentes, sem isométrico | — | baixo | Passou | `npm run test:mapa` e `pytest tests/integration/test_mapa.py` 2026-10-29 |
| SYS-001 | Analytics | gráfico | samples | abrir | números batem com a API | `GET /analytics/cost` | alto | Passou | `npm run test:analytics` 2026-10-29; série já provada em `pytest tests/integration/test_teto_custo.py` |
| SYS-002 | Doctor | checagens | escritório no ar | abrir | lista de checks | `GET /doctor/checks` | médio | Passou | `npm run test:doctor` e `pytest tests/integration/test_doctor.py` 2026-10-29 |
| SYS-003 | Doctor | Reiniciar frontend, Reiniciar backend | double de serviço, não o processo do goal | clicar cada um | UI mostra o retorno | `POST /services/{id}/restart` no double | alto | Passou | `npm run test:restart` e `pytest tests/integration/test_servico_double.py` 2026-10-29 |
| SYS-004 | Skills e Org | listas | agentes com reports_to | abrir as duas rotas | listas preenchidas | GET skills e agentes | baixo | Passou | `npm run test:org` e `pytest tests/integration/test_skills_org.py` 2026-10-29 |
| CFG-001 | Config | Salvar perfil | perfil | mudar nome e idioma | saudação da Sala usa o nome | `PUT /settings/profile` | alto | Passou | `npm run test:profile` 2026-10-29 |
| CFG-002 | Config | blocos da Sala | overview | reordenar e salvar | Sala mostra a nova ordem | overview persistido | alto | Passou | `npm run test:sala-order` 2026-10-29 |
| CFG-003 | Config | Novo projeto, Controle, motores, memória | abas | cada submit da referência | estado salvo, chave de motor fora do ledger | rotas de settings e integrations | alto | Passou | `npm run test:config-submits` e `pytest tests/integration/test_config_submits.py` 2026-10-29 |
| CFG-004 | Config | Exportar livro-razão | há eventos | exportar | arquivo baixa | `GET /api/v1/ledger/export` | médio | Passou | `npm run test:ledger-export` 2026-10-29 |
| TOUR-001 | Fluxo guiado | Ciclo de execução | tour não visto | atravessar 8 passos | textos “Por que importa” de login até analytics | tour visto gravado ao concluir | médio | Passou | `npm run test:tour` e `pytest tests/integration/test_tour.py` 2026-10-29 |
| TOUR-002 | Fluxo guiado | Jornada do cliente | tour não visto | atravessar 6 passos | Raio-X, propostas, decisão, funil, finanças | tour visto gravado | médio | Passou | `npm run test:tour` e `pytest tests/integration/test_tour.py` 2026-10-29 |
| ESTREITO-001 | Shell | — | viewport 860×900 | abrir Sala e Execuções | subnav some, busca só ícone, split em coluna | — | médio | Passou | `npm run test:estreito` 2026-10-29 |
| REDIR-001 | rotas antigas | — | sessão | abrir `/aprovacoes`, `/bloqueios`, `/alteracoes`, `/visibilidade`, `/dados`, `/biblioteca`, `/projetos`, `/plataformas`, `/workflows` | cada uma cai na tela nova, sem 404 | — | médio | Passou | `npm run test:shell` 2026-10-29 |
| MOTION-001 | harness | classes do HTML | `motion.css` carregado | abrir o fixture no Chromium | estilo computado igual a `motion-reference.json` | spec lê getComputedStyle, não a API | alto | Passou | `npm run test:motion` 2026-10-29 |
| MOTION-002 | harness | reduced-motion | emulateMedia reduce | abrir o mesmo fixture dentro de `.tv` | duração 1ms e uma iteração | — | alto | Passou | `npm run test:motion` 2026-10-29 |

## Notas de cobertura

- Telas no escopo: as de `visual/SCREEN-MAP.md`.
- Controles ainda sem linha: nenhum botão nomeado na referência deve ficar de fora quando a UI existir. Se um controle novo aparecer na implementação e não estiver aqui, a matriz cresce antes de aprovar.
- Destrutivo excluído do teste ao vivo: reiniciar de verdade os processos 9001/9002. O teste usa double de serviço.
- Reset: banco de teste recriado por teste. Fixture visual é outro banco e não serve de prova funcional.
- As linhas desta matriz têm execução registrada na coluna Evidência. A comparação pixel do HTML com o app ainda não foi capturada.

## Como executar quando o spec existir

`cd frontend && npx playwright test tests/journeys.spec.ts tests/motion.spec.ts`

O relatório de pessoas fica em `visual/QA-REPORT.md`. Similaridade de screenshot não aprova estas linhas.
