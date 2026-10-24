# Mapa de telas — Concierge (prints + vídeo)

Fonte: `C:\Users\carlo\Downloads\Reunião Concierge\Concierge\*.png` e frames de `Apresentação_Concierge.mp4`.
Implementação: `relatorios/cenario-operacao-tavir.html`.
Viewport de comparação: janela do app nos prints (~1362×759 no arquivo; app em 1920×1080 no vídeo).

| ID | Tela / estado | Fonte | Como abrir no HTML |
|---|---|---|---|
| visao | Visão geral | visaogeral01.png | Operação → Visão geral |
| board-kanban | Board kanban + filtros | board-kanban.png, board-formaFiltro.png | Board, modo Kanban, filtro de prioridade |
| board-linhas | Board linhas | board-linhas.png, board-linhas-meuIssue.png | Board → Linhas |
| board-menu | Menu de contexto da issue | board-menuExecucao.png | Botão direito numa issue |
| board-exec | Modal detalhe da execução | board-DetalhedaExecucao.png | Menu → Abrir detalhe |
| express | Análise Express | AnaliseExpress.png | Análise Express |
| exec | Execuções | execucoes.png | Execuções |
| exec-menu | Menu da linha | execucoes-itemMenu(cliquenaissue).png | Botão direito numa execução |
| aprov | Fila de aprovações | aprovacoes1.png | Aprovações |
| aprov-diff | Ver mudanças | aprovacoes-1.2BTverMudancas.png | Ver mudanças |
| aprov-rev | Revisar em detalhe | aprovacoes-1.3BTRevisar emDetalhe.png | Revisar em detalhe |
| aprov-hist | Histórico | aprovacoes-historico.png | Rolar a fila |
| usuarios | Usuários e permissões | usuarios.png | Usuários |
| cfg-perfil | Config → Perfil | Config-perfil.png | Configurações → Perfil |
| cfg-visao | Config → Visão geral | Config-visaogeral.png, Config-visaogeral-filtros.png | Configurações → Visão geral |
| cfg-proj | Config → Projetos | Config-projetos.png | Configurações → Projetos |
| cfg-proj-modal | Editar projeto | Config-projetos-modalEditarProjeto1*.png | Editar |
| cfg-cred | Credenciais | Config-credenciais01.png, Config-credenciais01.1.png | Credenciais |
| cfg-bancos | Bancos | Config-Bancos.png | Bancos |
| cfg-mem | Memórias em curadoria | Config-memorias.png | Gestão → Memórias, ou Configurações → Memórias. No print original ela só aparece como aba; o menu lateral foi acrescentado para ela não ficar escondida |
| cfg-mem-ver | Memórias na versão | frame f_016 | Memórias → Na versão |
| cfg-bases | Bases | frame f_018 | Memórias → Bases |
| cfg-srv | Servidor | Config-servidor.png, Config-servidorPrimeirosPassos.png | Servidor. Banco reescrito para SQLite a pedido; o print tinha sido lido como MySQL |
| sobre | Sobre + Íris | iris-botaoFlutuante.png, iris-modalChat.png | Sobre, botão Olá Wesley |
| suporte, relatorios, saude, melhorias, logs, atualizacoes, conhecer | Itens de menu sem miolo nos prints | menu lateral dos prints | Mesmos nomes. Interior não inventado |
| cfg-jira, cfg-agentes, cfg-sistema | Abas citadas sem conteúdo capturado | barra de abas | Abas presentes, miolo não inventado |

Pilha confirmada pelo usuário e refletida na aba Servidor: Electron (front), Node (backend), SQLite (banco).
