# Parecer Técnico de Integração: Concierge

- **Alvo Analisado:** pasta local `C:\Users\carlo\Downloads\Reunião Concierge` — 35 prints da interface e o vídeo `Apresentação_Concierge.mp4` (51 min 17 s, 1920×1080, reunião de 21/10/2026).
- **Tipo de Entrada:** prints de tela + vídeo demonstrativo (upload local). Não há repositório, instalador nem código-fonte no material.
- **Analista Responsável:** Maicon (Arquiteto de Integrações TAVIR)
- **Data da Avaliação:** 2026-10-22
- **Status Inicial:** Em Análise Consultiva
- **Requests RapidAPI:** 0 (não é mídia do Instagram)

---

## 1. Mapeamento & Arquitetura da Ferramenta

- **Propósito Principal:** O Concierge (TOTVS, v1.0.0-alpha.2, autor Wesley) é um orquestrador local de agentes de refinamento e desenvolvimento. Ele observa um board de issues, produz análise com causa e critério de aceite, e só grava comentário, coluna, código ou pull request depois de um aceite humano campo a campo. A frase de produto na tela Sobre: acelerar e padronizar o ciclo de qualquer projeto, com governança no board.

- **O que o produto é, na prática:** aplicativo de desktop. A pilha confirmada por quem tem o projeto é **Electron no front, Node no backend e SQLite no banco**. O servidor HTTP local fica na porta 8787, com túnel público opcional via ngrok. Os segredos ficam na conta do Windows (DPAPI), por pessoa, e a interface não exibe o valor. Vários projetos convivem; um fica em foco no board. A leitura automática de um print da aba Servidor tinha apontado MySQL; essa leitura fica superada pela confirmação da pilha.

- **Principais Funcionalidades:**
  - **Visão geral:** KPIs de board (backlog, refino, críticas, impedidas) e de automação (refinamentos, versões, PRs, tempo médio, custo, licenças), gráfico de 14 dias e execuções recentes. Os cartões são configuráveis.
  - **Board:** Kanban e lista, filtros de projeto, tipo, prioridade, responsável, feito pelo Concierge, prazo e impedidas/fixadas. Menu de contexto por issue: fixar, voltar a automatizar, prioridade, impedimento, refinar, codificar, compilar, gerar pull request, abrir detalhe, abrir no Jira, clonar, ver mudanças, enviar refino ou desenvolvimento para aprovação, abandonar PR, limpar. Etiquetas manuais (R, D, C, S).
  - **Execução ao vivo:** modal com solicitante, duração, modelo (no print, Claude Opus), esforço (médio), tokens e custo. Linha do tempo: lê a issue, baixa anexos, compara com issue anterior, lê o fonte. Dá para falar com o agente sem parar, pausar ou cancelar.
  - **Análise express:** refino sem abrir issue. Título, relato, prints e orientação opcional. O resultado recomenda responder ou abrir issue. O rascunho passa pela fila de aprovações.
  - **Execuções:** auditoria por etapa (refinamento, desenvolvimento, compilação, suporte, análise express, conserto), com duração, tokens, custo, usuário e reexecução.
  - **Aprovações:** nada chega ao Jira sem aceite. Cada pedido mostra o comentário (tamanho) e a transição de coluna. Ações: aprovar e enviar, ver mudanças (diff por arquivo), revisar em detalhe (tópicos marcáveis, prévia, rejeitar). Histórico com aprovado, falhou, abandonado, reverter e tentar de novo. Há saídas que não são código: dados insuficientes, duplicidade, tipo de issue.
  - **Projetos:** caminhos de fonte, refinamento, desenvolvimento e versão compilada. Vigilância: ativo, vigiar issues novas, refinar sozinho, codificar sozinho, compilar sozinho, levar ao Jira sozinho, abrir PR sozinho, issues novas entram manuais. Modal de edição: chave Jira, board, tipos, filtro, pastas, Azure DevOps (organização, projeto, repositório, branch), **isolar cada dev num worktree**, onde publicar o texto, tópicos padrão do refino e mapa de colunas por tipo de issue (ciclo simples e esteira de produto).
  - **Memórias:** curadoria humana antes da regra valer. Abas minhas, em curadoria, do projeto, na versão (arquivos que acompanham o app), bases (TDN, Help, Central) e auditoria. Aceitar ou recusar em lote. Filtro por projeto e por etapa.
  - **Credenciais:** importar de um `CLAUDE.local.md`, gerar modelo para a equipe, testar Jira. Contas: Zendesk, Google, Anthropic (opcional se o login do Claude Code existir), Jira PAT, bases de conhecimento, Azure DevOps PAT.
  - **Usuários:** perfil, menus, ações (refinar, codificar, compilar, changelog, ver custo, decidir aprovações) e governança elevada (ver tudo, criar projeto, gerenciar usuários, curar conhecimento). Bloqueio por área: inteligência, fonte, banco, compilação. Permissão também por projeto.
  - **Servidor:** SQLite local, processo Node na porta 8787 dentro do Electron, subir ao iniciar, minimizar na bandeja, túnel ngrok, primeiros passos (login do Claude, token do Jira, banco, servidor, túnel).
  - **Íris:** botão flutuante e chat sobre o estado do projeto. O texto da tela diz que ela usa a assinatura do Claude.
  - **Radar:** notificação de desktop quando entra issue de prioridade alta.
  - **Fora do app, mostrado na reunião:** o comentário estruturado publicado no Jira; pull request no Azure DevOps que o Concierge abre e pode abandonar; extensão de navegador LogPMS para trilha de acesso (ferramenta à parte, não é tela do Concierge).

- **Arquitetura & Interface:** aplicativo desktop + HTTP local. Não é CLI, SDK nem MCP. Os agentes rodam na máquina, com login do Claude Code. O git do push usa o SourceTree e a credencial do Windows. O clone do fonte alimenta o worktree por issue.

- **Stack & Dependências observadas:** Electron (front), Node (backend), SQLite (banco do próprio Concierge), ngrok opcional, Jira, Azure DevOps, Oracle e SQL Server só leitura nas bases de cliente (TNS/VPN), Zendesk, Google Drive, bases documentais, Claude. Modelo e esforço aparecem por execução. Custo é exibido em dólar por execução e somado.

- **Telas citadas no menu e não detalhadas nos prints:** Suporte, Relatórios, Saúde do produto, Melhorias, Logs, Atualizações, e as abas Jira, Agentes e Sistema dentro de Configurações. O vídeo passa pela operação, pelos projetos, pelas credenciais, pelas memórias, pelas execuções, pelas aprovações, pela análise express e pelos usuários. Não dá para especificar essas telas faltantes além do nome.

---

## 2. Diagnóstico de Compatibilidade com Ecossistema TAVIR

| Vetor de Compatibilidade | Situação Observada | Impacto no TAVIR |
| :--- | :--- | :--- |
| **Workers Isolados** | Cada issue pode ganhar worktree próprio, a partir da base, sem um dev sobrescrever o outro. A execução mostra o worker e permite pausar ou cancelar. | Compatível com o pilar de workers isolados. É o padrão a copiar no desenho, não um processo para instalar. |
| **Git Worktrees** | A opção está explícita no projeto: “isolar cada dev num worktree próprio”. O push continua no git da máquina. | Compatível com o pilar de worktrees. A Fábrica já materializa workspace por projeto; falta o isolamento por demanda dentro do projeto. |
| **Orquestração Headless** | O produto é Electron + Node, com login interativo do Claude, arquivo SQLite e, no modo remoto, ngrok. A conversa com o agente no modal é interativa. | Exige processo de desktop e sessão de usuário. Não serve como worker headless da Fábrica. |
| **Portas & Infra TAVIR** | HTTP do Node em 8787. O estado mora num SQLite próprio do Concierge, separado do SQLite do escritório. Não usa 9001 nem 9002. | Porta livre. São dois bancos e dois runtimes. Não apontar a Fábrica para o arquivo do Concierge. |
| **Segurança & Dados** | Segredo por usuário no Windows é um bom padrão. O produto também guarda PAT de Jira e Azure, token de base documental e senha de banco de cliente, cifrados na máquina. O demo opera em issues e bases reais de um produto interno. | Não importar credencial, banco, prompt ou diff desse ambiente. O risco não é a ideia do cofre local; é acoplar a TAVIR a dados e contas de outro escritório. |
| **Gates humanos** | Nenhuma escrita externa ocorre sem aceite. A revisão lista o que será gravado, permite desmarcar tópicos e rejeitar. O histórico reverte ou repete. | Alinha com o gate do CEO. A Fábrica já tem gate por etapa; não tem a revisão campo a campo nem o diff antes do aceite. |
| **Kanban** | O board é espelho do Jira, com mapa de colunas por tipo de issue. | A TAVIR é a fonte do próprio kanban (SQLite / esteira). Espelhar Jira seria um conector opcional, não o núcleo. |

O que a Fábrica já cobre, e o que o cenário propõe em cima:

| Superfície do Concierge | Na TAVIR hoje | O que vale trazer |
| :--- | :--- | :--- |
| Visão geral multi-projeto | Visão geral de um projeto na Fábrica | Sala acima do projeto, com fila, custo e tempo |
| Board com menu de ação | Kanban da esteira | Ação por demanda: refinar, construir, QA, gate, sem sair do quadro |
| Análise express | Não há | Triagem com print, sem abrir run |
| Ledger de execuções | Run, artefatos, QA | Duração, custo, agente, erro e refazer |
| Aprovação campo a campo + diff | Gates do CEO | Prévia do texto e do diff antes de gravar |
| Memórias com curadoria | Não há | Regra só entra no contexto depois do aceite |
| Worktree por demanda | Workspace por projeto | Um worktree por demanda dentro do projeto |
| Chat flutuante | Chat do projeto (GhostCLI) | Íris com o estado da sala, não um segundo motor |
| Cofre por máquina | Integrações | Segredo local, valor oculto, teste de conexão |
| Jira, Azure, Oracle, Zendesk, ngrok | Fora do desenho v1 | Não trazer. O board da TAVIR continua sendo a fonte |

---

## 3. Opções Estruturadas de Decisão

Absorver o aplicativo não é caminho: não há código no material, a licença não acompanha os arquivos e a pilha (Electron, Node, SQLite próprio, Jira, Azure DevOps, ngrok) não é a da Fábrica. Ficam as duas opções que fecham.

### Opção C: Aproveitamento Conceitual

- **O que é:** Não instalar o Concierge e não copiar tela, texto, prompt ou fluxo de um cliente. Reproduzir na Fábrica, com os agentes e o SQLite que já existem, o ciclo observado: triagem, execução auditável, gate com prévia, memória curada e worktree por demanda. O HTML `relatorios/cenario-operacao-tavir.html` é o cenário clicável dessa leitura, com dados fictícios e os tokens do escritório.
- **Prós:**
  - Preserva workers isolados, worktrees, kanban em SQLite e gate humano.
  - Reusa GhostCLI, esteiras e o console em vez de abrir um segundo produto.
  - O gate campo a campo e a curadoria de memória fecham um buraco real da Fábrica, sem depender de Jira.
- **Contras:**
  - É desenho e construção nossos. Nada “liga” sozinho na segunda-feira.
  - Relatórios, saúde do produto, suporte e o mapa fino de colunas do Jira ficaram sem especificação suficiente.
- **Esforço:** Alto
- **Risco:** Baixo

### Opção D: Rejeição da absorção

- **O que é:** Não instalar, não empacotar e não apontar a TAVIR para o SQLite, o túnel ou as credenciais desse Concierge.
- **Prós:**
  - Evita um segundo runtime Electron/Node, ngrok e uma sessão interativa de Claude dentro do worker.
  - Evita carregar issue, diff e banco de outro escritório para o nosso.
- **Contras:**
  - Sozinha, a rejeição descarta também o desenho de gate, memória e worktree por demanda, que cabem na TAVIR.
- **Esforço:** Baixo
- **Risco:** Baixo, se a opção C seguir. Alto como política única, porque a Fábrica continuaria sem a revisão fina que o demo mostrou funcionar.

---

## 4. Recomendação Final & Justificativa

- **Opção Recomendada:** **Opção C — Aproveitamento Conceitual**, com a Opção D valendo para o binário e para os dados.
- **Justificativa Arquitetural:** O Concierge confirma três pilares que a TAVIR já escolheu: worker isolado, worktree por tarefa e gate antes da escrita. O que falta no escritório é a sala em volta disso: uma fila única, o custo da execução, a triagem sem abrir run, a prévia campo a campo e a regra que só entra no contexto depois que alguém aceita. Isso escala dentro do FastAPI e do SQLite da Fábrica. Instalar o app não escala: ele pede Electron, Node e uma pessoa logada no Claude.
- **Ordem sugerida, se o gate humano aprovar a construção:**
  1. Ledger de execução com duração, agente, estado e custo, em cima do run que já existe.
  2. Gate com prévia do texto e do diff, antes de qualquer escrita no workspace.
  3. Memória de projeto com curadoria (aceitar / recusar).
  4. Worktree por demanda, não só por projeto.
  5. Análise express e a Íris lendo a mesma fila. A Íris não é outro modelo; é o chat que já existe, com o estado da sala.
- **Avisos de Licenciamento & Custos:**
  - **Licença:** não há arquivo de licença no material. O produto se apresenta como aplicativo interno TOTVS, em alfa. Tratar como proprietário. Proibido copiar código, prompt, ícone, texto de interface ou diff de cliente.
  - **Custos / Chaves de API:** o demo gasta modelo Claude por execução e mostra custo em dólar. Na TAVIR o custo continua no motor que a Fábrica já usa (GhostCLI / Cursor). Não cadastrar as chaves Anthropic, Jira ou Azure vistas nessa reunião.
  - **Patentes / Restrições:** não há patente citada. Há dados reais de operação de terceiros nos prints (issues, bases, contas). O cenário HTML não reproduz esses dados. Requests RapidAPI: 0.

---

> **Nota Consultiva:** Este parecer não instala o Concierge e não altera a Fábrica. O HTML é um cenário para decidir. Qualquer implementação depende de aprovação explícita no gate humano do Kanban TAVIR.

## Anexo A — O que a fala acrescenta

Áudio extraído do mp4 e transcrito com Whisper (modelo base, português, CPU, feixe 1). A reunião é informal, com várias vozes e muito ruído de reconhecimento; a leitura abaixo fica no que a fala confirma ou acrescenta em relação aos prints. A transcrição bruta não entra neste relatório: ela mistura conversa solta, nomes e operação de outro escritório. O arquivo ficou fora do repositório, em `C:\Users\carlo\Downloads\Reunião Concierge\_analise\audio.txt`.

- O produto nasceu num projeto interno e foi desenhado para qualquer equipe, não só para um módulo. A meta dita na abertura é acompanhar o board, achar a causa no fonte, codificar a correção e compilar.
- A tela mostra a alfa 2. Quem apresenta diz que a alfa 3 já está na máquina dele e que o fonte está num repositório privado, com nome Concierge, de onde o time baixa e compila. Esse fonte **não está** na pasta recebida. Clonar esse repositório para dentro da TAVIR seria absorver código proprietário. Continua fora.
- A Íris responde sobre o próprio projeto (contagem de issues, economia) e hoje usa Claude. A fala deixa preparado um servidor próprio com Ollama, para consulta sem assinatura. Isso é plano deles, não uma peça para ligar aqui.
- O executável sobe um servidor na máquina e entrega a mesma operação no navegador. A inteligência fica no servidor; a pessoa recebe o exemplo compilado e, se quiser, gera o pull request. Há a ideia de um usuário-robô só para abrir PR, e de gente comum ficando no board.
- O automático completo existe e ele usa. Também foi **desligado de propósito** no envio ao Jira: recusa automática e tom agressivo (a mesma issue recusada mais de uma vez) geraram conflito. Tudo o que escreveria sozinho no board passou a cair na fila de aprovação. Esse é o argumento mais forte para o gate da TAVIR.
- Uma máquina chegou a tocar dezenas de issues em paralelo. O trabalho humano ficou no aceite, não na análise linha a linha.
- Ordem de evidência do refino, dita na reunião: ajuda do produto, base documental, central de conhecimento, histórico de suporte, leitura do fonte e da regra. Se a regra, o sistema e o fonte divergem, trata como defeito. Banco entra só leitura (importação a partir de cliente de banco, TNS). Print de vídeo tem dado pessoal mascarado.
- Quando não é bug (configuração ou comportamento), o agente recomenda recusar e explica. A recusa não sai sozinha: cai na mesma fila.
- As memórias são markdown no repositório, classificadas como padrão do projeto, não uma cópia por pasta. Projeto novo cadastra fonte e caminho e herda o padrão. Dá para escolher se o texto vai para comentário ou para a descrição, e o quanto de técnica a publicação carrega (o atendimento N3 não é desenvolvedor). Vários repositórios de um produto entram pela raiz, com o markdown dizendo as subpastas.
- Compilar e testar ponta a ponta ainda não está no produto. Ele cita teste automatizado como o próximo passo, dependente do time de qualidade. A análise express nasceu porque o chat pessoal virou fila: cola a pergunta, devolve a resposta. A ideia futura de responder sozinho no chat da equipe foi só mencionada.
- Servidor compartilhado, uma instância por produto, ainda não existia na data da reunião. Permissão por usuário já está na tela. A separação desejada por quem ouvia: um agente fica no refino e no código, outro agrupa e decide o rumo, e os dois precisam se falar. Isso combina com a esteira da TAVIR (Dora/Paula de um lado, Diego/Talita do outro), não com um agente único.
