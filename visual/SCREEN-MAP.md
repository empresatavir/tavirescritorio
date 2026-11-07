# Screen map — TAVIR Escritório redesenho

**Target:** web (SolidJS, porta 9002)
**Reference source:** `C:\Users\carlo\Downloads\TAVIR Escritório — redesenho.html` (template interno + 14 páginas filhas)
**Capture environment:** Chromium via Playwright, `deviceScaleFactor` 1, locale `pt-BR`, relógio congelado `2026-10-29T15:00:00-03:00`, tick do protótipo desligado. Viewport principal `1440×900`. Segunda passagem `860×900`. Tema escuro em todas as linhas; tema claro só nas linhas marcadas.

Referência servida em `http://127.0.0.1:4174`. Candidato em `http://127.0.0.1:9002?fixture=1` com `TAVIR_VISUAL_FIXTURE=1`. Captura com animações desligadas nos dois lados. Movimento é provado por `frontend/tests/motion.spec.ts`, não pelo PNG.

Nenhuma captura foi feita ainda. A coluna de status abaixo é o inventário, não um resultado.

| ID | Tela / estado | Origem no HTML | Rota ou passos | Viewport | Dados | PNG | Notas |
|---|---|---|---|---|---|---|---|
| `login-form` | Login, formulário | template, comentário LOGIN | `/login` sem sessão | 1440×900 | sem sessão | `login-form.png` | Chave não sai da máquina |
| `login-erro` | Login, chave recusada | mesmo | chave errada, Acessar painel | 1440×900 | sem sessão | `login-erro.png` | Erro visível, sem shell |
| `login-sessao` | Login, sessão ativa | mesmo | sessão já aberta | 1440×900 | Carlos · CEO | `login-sessao.png` | Entrar na Sala / Encerrar sessão |
| `onb-0` | Onboarding passo 1 | template ONBOARDING | primeiro acesso | 1440×900 | passo 0 | `onb-0.png` | Fundação local-first |
| `onb-1` | Onboarding passo 2 | mesmo | Próximo | 1440×900 | passo 1 | `onb-1.png` | Rail, menu, miolo |
| `onb-2` | Onboarding passo 3 | mesmo | Próximo | 1440×900 | passo 2 | `onb-2.png` | Ciclo do job |
| `onb-3` | Onboarding passo 4 | mesmo | Próximo | 1440×900 | passo 3 | `onb-3.png` | Cinco módulos |
| `sala-dark` | Sala de Operação | template SALA | `/sala-operacao` | 1440×900 | fixture | `sala-dark.png` | Saudação Boa tarde |
| `sala-light` | Sala, tema claro | mesmo + data-theme light | alternar tema | 1440×900 | fixture | `sala-light.png` | Rail e subnav permanecem tinta |
| `sala-vazia` | Sala sem decisão pendente | mesmo, estado vazio | fixture sem approvals pending | 1440×900 | vazio | `sala-vazia.png` | Frase “Nada depende de você agora” |
| `sala-notificacoes` | Painel de notificações aberto | shell | clicar sino | 1440×900 | fixture | `sala-notificacoes.png` | Overlay, não tela nova |
| `sala-estreita` | Sala no breakpoint | media 860px | `/sala-operacao` | 860×900 | fixture | `sala-estreita.png` | Subnav `display:none`, busca só ícone |
| `exec-lista` | Execuções | template EXECUÇÕES | `/execucoes` | 1440×900 | jobs do fixture | `exec-lista.png` | |
| `exec-rodando` | Job rodando | mesmo, job-014 | selecionar SEO da landing | 1440×900 | job-014 | `exec-rodando.png` | Barra com sweep; log SSE |
| `exec-falhou` | Job parado no gate | mesmo, job-007 | selecionar Deploy Meridian | 1440×900 | job-007 | `exec-falhou.png` | SUPABASE_URL ausente |
| `exec-vazio` | Filtro sem jobs | mesmo | filtro que zera a lista | 1440×900 | filtro vazio | `exec-vazio.png` | “Nenhum job neste filtro.” |
| `exec-estreita` | Execuções empilhadas | media 860px | `/execucoes` | 860×900 | fixture | `exec-estreita.png` | `.split` em coluna |
| `tasks-kanban` | Kanban | template TASKS | `/tasks` | 1440×900 | tasks do fixture | `tasks-kanban.png` | A planejar, Planejado, Em execução, Concluído |
| `tasks-vazio` | Coluna vazia | mesmo | coluna sem cards | 1440×900 | coluna vazia | `tasks-vazio.png` | “Sem cards aqui.” |
| `drawer-task` | Drawer da task | template DRAWER TASK | abrir card #18 | 1440×900 | task com gate | `drawer-task.png` | Largura min(520px, 100%) |
| `decisoes-lista` | Decisões | template DECISÕES | `/decisoes` | 1440×900 | approvals | `decisoes-lista.png` | Substitui aprovações, bloqueios e alterações |
| `decisoes-deploy` | Detalhe deploy + cofre | mesmo, ap-02 | selecionar ap-02 | 1440×900 | ap-02 pending | `decisoes-deploy.png` | Valor do segredo não vai para o ledger |
| `decisoes-carimbo` | Decisão registrada | mesmo, stamp | aprovar ap-02 | 1440×900 | após decide | `decisoes-carimbo.png` | Animação stamp 420ms; captura com animação off no fim do estado |
| `decisoes-vazio` | Filtro sem itens | mesmo | filtro vazio | 1440×900 | vazio | `decisoes-vazio.png` | “Nada neste filtro.” |
| `decisoes-light` | Decisões, tema claro | mesmo | tema claro | 1440×900 | fixture | `decisoes-light.png` | |
| `agentes-roster` | Agentes | filha Agentes | `/agentes` | 1440×900 | roster | `agentes-roster.png` | |
| `agentes-vazio` | Busca sem agente | mesma | termo sem hit | 1440×900 | filtro | `agentes-vazio.png` | “Ninguém com esse filtro.” |
| `drawer-oficio` | Ofício do agente | template DRAWER OFÍCIO | abrir ofício | 1440×900 | um agente | `drawer-oficio.png` | Salvar ofício / Abrir chat |
| `chat-conversa` | Chat com mensagens | template CHAT | `/chat` conversa da Paula | 1440×900 | cv-paula | `chat-conversa.png` | |
| `chat-vazio` | Conversa vazia | mesmo | conversa sem mensagens | 1440×900 | mensagens [] | `chat-vazio.png` | “Conversa vazia…” |
| `chat-digitando` | Indicador digitando | mesmo | após enviar, antes da resposta | 1440×900 | typing | `chat-digitando.png` | blink 1.2s; captura congela o estado visível |
| `chat-escolher-agente` | Nova conversa | template ESCOLHER AGENTE | botão Nova | 1440×900 | roster | `chat-escolher-agente.png` | |
| `chat-light` | Chat, tema claro | mesmo | tema claro | 1440×900 | fixture | `chat-light.png` | |
| `modulos-hub` | Visão dos módulos | filha Módulos | `/modulos` | 1440×900 | summary | `modulos-hub.png` | Cinco esteiras |
| `raiox-lista` | Raio-X, casos | filha Raio-X | `/raiox` | 1440×900 | casos | `raiox-lista.png` | |
| `raiox-caso` | Caso aberto | mesma | caso Loja da Rua | 1440×900 | caso fixture | `raiox-caso.png` | Evidência, nota, confiança |
| `studio-esteira` | Studio, peças | filha Studio | `/studio` | 1440×900 | peças | `studio-esteira.png` | |
| `studio-pauta` | Pauta do Oráculo | mesma | abrir produção na pauta | 1440×900 | peça em pauta | `studio-pauta.png` | |
| `studio-angulo` | Escolha de ângulo | mesma | checkpoint de ângulo | 1440×900 | decisão aberta | `studio-angulo.png` | |
| `fabrica-painel` | Fábrica · Painel | `Referencias/Fábrica-html/Fabrica.dc.html` (painel) | `/fabrica` fixture 9204 vs ref 4210 | 1440×900 | DEMO 7 projetos | `fabrica-painel.png` | **99,95%** · `visual/report-fabrica/` |
| `fabrica-console` | Console · Visão geral | `Fabrica.dc.html` consoleView | abrir Meridian | 1440×900 | meridian fixture | `fabrica-console.png` | **99,34%** · `visual/report-fabrica-console/` · `_capture_fabrica_console.mjs` |
| `fabrica-esteira` | Console · Esteira (Meridian) | `Fabrica.dc.html` pt.esteiraM | Meridian → tab Esteira; scrollTop 320 | 1440×900 | stage QA / Guard 6/8 | `fabrica-esteira.png` | **99,43%** · `visual/report-fabrica-esteira/` · `_capture_fabrica_esteira.mjs` |
| `fabrica-qa` | Console · QA (Meridian) | `Fabrica.dc.html` pt.qa (+ Guard) | Meridian → tab QA; scrollTop 320 | 1440×900 | QA-0142 · 2 falhas | `fabrica-qa.png` | **99,14%** · `visual/report-fabrica-qa/` · `_capture_fabrica_qa.mjs` |
| `fabrica-acessos` | Console · Acessos (Meridian) | `Fabrica.dc.html` pt.acessos | Meridian → tab Acessos; scrollTop 320 | 1440×900 | SUPABASE_URL missing · envOk false | `fabrica-acessos.png` | **99,20%** · `visual/report-fabrica-acessos/` · `_capture_fabrica_acessos.mjs` |
| `fabrica-seg` | Console · Segurança (Meridian) | `Fabrica.dc.html` pt.seg | Meridian → tab Segurança; scrollTop 320 | 1440×900 | SEC-0031 · score 69 · F-01 aberta | `fabrica-seg.png` | **99,07%** · `visual/report-fabrica-seg/` · `_capture_fabrica_seg.mjs` |
| `fabrica-kanban` | Console · Kanban (Meridian) | `Fabrica.dc.html` pt.kanban | Meridian → tab Kanban; landmark scroll | 1440×900 | 4 cols + QA subtarefas + ENV | `fabrica-kanban.png` | **99,58%** · `visual/report-fabrica-kanban/` · `_capture_fabrica_kanban.mjs` |
| `fabrica-roadmap` | Console · Roadmap (Meridian) | `Fabrica.dc.html` pt.roadmap | Meridian → tab Roadmap; landmark scroll | 1440×900 | gantt · miles gates [3,5,8] | `fabrica-roadmap.png` | **98,45%** · `visual/report-fabrica-roadmap/` · `_capture_fabrica_roadmap.mjs` |
| `fabrica-workspace` | Console · Workspace (Meridian) | `Fabrica.dc.html` pt.arquivos | Meridian → tab Workspace; landmark “Workspace isolado” | 1440×900 | tree 25 · 18 FILES | `fabrica-workspace.png` | **97,62%** · `visual/report-fabrica-workspace/` · `_capture_fabrica_workspace.mjs` |
| `fabrica-esteiras` | Fábrica, lista | filha Fábrica (legado redesenho) | `/fabrica` | 1440×900 | 3 esteiras | `fabrica-esteiras.png` | Superseded por `fabrica-painel` |
| `fabrica-projeto` | Console do projeto | alias de `fabrica-console` | abrir Meridian | 1440×900 | meridian fixture | `fabrica-projeto.png` | Ver `fabrica-console` |
| `flow-beta` | Flow | filha Flow | `/flow` | 1440×900 | workflows | `flow-beta.png` | Faixa beta visível; sem motor contínuo |
| `edicao-timeline` | Edição | filha Edição | `/edicao` | 1440×900 | projeto de corte | `edicao-timeline.png` | Timeline com transition none |
| `funil` | Funil | filha Comercial view funil | `/funil` | 1440×900 | casos+propostas | `funil.png` | |
| `propostas` | Propostas | mesma, view propostas | `/propostas` | 1440×900 | propostas | `propostas.png` | |
| `financas` | Finanças | mesma, view financas | `/financas` | 1440×900 | usage_samples | `financas.png` | Receita contra custo de motor |
| `personas` | Personas | mesma, view personas | `/personas` | 1440×900 | personas | `personas.png` | |
| `social-perfis` | Perfis e calendário | filha Social | `/social` | 1440×900 | profiles | `social-perfis.png` | |
| `social-inbox` | Comunicações | mesma, view comms | `/comunicacoes` | 1440×900 | inbox | `social-inbox.png` | |
| `cerebro` | Cérebro | filha Conhecimento | `/cerebro` | 1440×900 | grafo | `cerebro.png` | Sem nós inventados além de operador, setores, agentes |
| `memoria` | Memória e biblioteca | mesma | `/memoria` | 1440×900 | notas | `memoria.png` | |
| `memoria-vazio` | Filtro sem nota | mesma | termo sem hit | 1440×900 | filtro | `memoria-vazio.png` | “Nada com esse filtro.” |
| `ideias` | Ideias | mesma | `/ideias` | 1440×900 | ideias | `ideias.png` | |
| `mission` | Mission Control | filha Estratégia | `/mission-control` | 1440×900 | missão Q4 | `mission.png` | |
| `roadmap` | Roadmap | mesma | `/roadmap` | 1440×900 | milestones | `roadmap.png` | |
| `mapa` | Mapa operacional | mesma | `/mapa` | 1440×900 | setores | `mapa.png` | Sem vista isométrica Habblaud |
| `analytics` | Analytics | filha Sistema | `/analytics` | 1440×900 | custo 14d/30d | `analytics.png` | |
| `doctor` | Doctor | mesma | `/doctor` | 1440×900 | checks | `doctor.png` | |
| `skills` | Skills | mesma | `/skills` | 1440×900 | lista | `skills.png` | |
| `org` | Org Chart | mesma | `/org-chart` | 1440×900 | reports_to | `org.png` | |
| `config-perfil` | Configurações, perfil | filha Config | `/configuracoes` | 1440×900 | perfil | `config-perfil.png` | |
| `config-sala` | Blocos da Sala | mesma | aba visão geral | 1440×900 | overview | `config-sala.png` | |
| `config-projetos` | Projetos sob controle | mesma | aba projetos | 1440×900 | projetos | `config-projetos.png` | |
| `config-motores` | Motores | mesma | aba motores | 1440×900 | engines | `config-motores.png` | Chave não aparece no ledger |
| `config-memoria` | Memórias | mesma | aba memória | 1440×900 | memória | `config-memoria.png` | |
| `config-light` | Config, tema claro | mesma | tema claro | 1440×900 | perfil | `config-light.png` | |
| `como-funciona` | Como funciona | filha Fluxo | `/como-funciona` | 1440×900 | passo 1 de 8 | `como-funciona.png` | |
| `modal-job` | Wizard Iniciar job | template MODAL JOB | Iniciar job | 1440×900 | passo do teto | `modal-job.png` | Modal 560px; capturar aberto |
| `modal-task` | Nova task | spec task | Nova task | 1440×900 | formulário vazio | `modal-task.png` | |
| `modal-projeto` | Novo projeto | spec project | Novo projeto | 1440×900 | formulário vazio | `modal-projeto.png` | |
| `paleta` | Paleta com resultados | template PALETA | Ctrl K, termo com hit | 1440×900 | busca | `paleta.png` | rise 200ms |
| `paleta-vazia` | Paleta sem hit | mesmo | termo inexistente | 1440×900 | vazio | `paleta-vazia.png` | “Nada com esse termo.” |
| `toast` | Toast | template TOAST | após criar job | 1440×900 | toast visível | `toast.png` | |
| `tour-escolha` | Escolha do percurso | template FLUXO GUIADO | Fluxo guiado | 1440×900 | tour null k | `tour-escolha.png` | Dois percursos |
| `tour-passo` | Passo do tour | mesmo | Ciclo de execução, passo 0 | 1440×900 | tour exec 0 | `tour-passo.png` | Texto “Por que importa.” |

## Decisões

- O HTML é a fonte. O shell passa a ser rail 64px, subnav 236px, header 64px. O contrato antigo 56/212/52 fica obsoleto quando o shell for implementado.
- O HTML tem 17 `@keyframes`. A lista do goal nomeia esses 17. Não se cria um 18º.
- Mapa isométrico e motor contínuo do Flow não entram. A faixa beta do Flow permanece.
- Dados Carlos / Meridian / US$ 212 existem só no fixture visual. Máscara simétrica, se ainda houver volatilidade: caret e o cursor “aguardando próximo passo”. Originais sem máscara ficam guardados.
- `.claude/launch.json` não se altera.

## Cobertura

- [ ] PNGs de referência em `visual/reference/`
- [ ] PNGs do candidato em `visual/actual/` com o mesmo nome relativo
- [ ] `visual/report/report.html` gerado depois da implementação
- [ ] `visual/semantics/report.html` sem rótulo, botão ou diálogo faltando
- [x] Inventário escrito antes da captura
