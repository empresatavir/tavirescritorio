# Fábrica (app Electron)

A Fábrica cria, absorve e mantém projetos de cliente. O motor de IA executa cada passo; quem decide se o passo terminou é uma checagem determinística (gate do CEO, portão de QA, portão de segurança).

Tudo vive no app Electron (`src/`). O frontend SolidJS (`frontend/`) e o backend FastAPI (`backend/`) são a versão anterior e não recebem a Fábrica nova.

## Peças

| Arquivo | Papel |
| :--- | :--- |
| `src/shared/esteiras.ts` | Fonte única dos moldes (LP-C1, LP-M1, OF-C1, OF-M0, SY-C1, SY-M1). Cada etapa tem `gate`, `qa` e `seg`. O build do renderer injeta a mesma lista no painel. |
| `src/main/project-fs.ts` | Esteira, trilho de alteração, absorção, portões e decisões. |
| `src/shared/agentes.ts` | Perfil de cada dono de etapa (papel, como trabalha, o que não faz). O pedido de etapa e de passo do trilho começa por ele. |
| `src/main/runLedger.ts` | Livro de execuções em `.tavir/runs/<id>/` e git sombra em `.tavir/shadow.git`. Cada linha do motor ganha a hora de chegada (`stdout.tempos`, `stderr.tempos`); a tela Execuções mostra dd/mm HH:MM:SS. |
| `src/main/stepCommit.ts` | Commit por passo, só com os arquivos que a execução mudou. |
| `src/main/cycleBranch.ts` | Branch por ciclo do trilho, merge local e PR no GitHub. |
| `src/main/gitAccounts.ts` | Contas do GitHub (TAVIR e Pessoal) no cofre da máquina; identidade dos commits. |
| `src/main/credentials.ts` | Tokens de Vercel, Supabase e Netlify no cofre da máquina. |
| `src/main/qa/` | Portão de QA: plano, jornada no navegador, GIFs e relatório. |
| `src/main/seg/` | Portão de segurança white box: regras, scanner e relatório. |
| `src/main/absorcao/` | Absorção: entrada (link ou pasta), detectores sem motor, leitura em sete passos, retrato e gate (`fluxo.ts`). |
| `src/shared/absorcao.ts` | Catálogo de serviços detectados, passos da leitura e tipo do retrato. |
| `src/main/acessos.ts` · `src/shared/acessos.ts` | Cartões de acesso por projeto e guias «Onde conseguir». |
| `src/main/chamados.ts` · `src/shared/chamados.ts` | Chamados: disco, tabela de transições, refinamento, execução pelo trilho e gate. |
| `src/renderer/fabrica-ref/Fabrica.dc.html` | Painel (template sc-if/sc-for), empacotado por `scripts/clean_and_bind_ipc.js`. |

## Fluxos

- **Criação e absorção:** `createOrAbsorbProjectRecord`. A absorção grava o projeto no SQLite (`backend/tavir.db`) e segue o fluxo da seção «Absorção» abaixo. QA e segurança não rodam sozinhos na absorção: viram as pendências «Retrato inicial de QA» e «Retrato inicial de segurança» (a fazer), que o Carlos roda quando quiser. Nos testes passe `baseline: false`. A criação sempre faz `git init`; a absorção também, quando a pasta não é versionada por ninguém (sem git ou ignorada pelo repositório de fora, `needsOwnGit`). Subpasta versionada por um monorepo do cliente fica como está.
- **Esteira:** `runEsteiraStage`. Uma etapa só roda com os gates anteriores aprovados. Gates ficam `awaiting` até `decideEsteiraGate`; decisões vão para `.tavir/decisoes.jsonl`. Etapas `qa` e `seg` só viram `done` se o portão passar.
- **Pedido da etapa:** começa pelo perfil do dono (`agentes.ts`) e traz o contrato da etapa (`STAGE_CONTRACTS` em `esteiras.ts`: objetivo, entrega e critério de pronto). A instrução escrita pelo Carlos na etapa vale sobre o contrato. Etapa nova em molde precisa de contrato, e dono novo precisa de perfil (`tests/unit/etapaPedido.spec.ts` confere). O agente termina com «Pacote para a próxima etapa:»; a etapa seguinte recebe só esse pacote de cada etapa anterior (`stageHandoff`), sem a seção de verificação. O texto de QA da Talita vai só nas etapas que começam com «QA»; Loop Linter e Completion Guard têm portão de QA, mas o pedido é do compilador.
- **Trilho de alteração (manutenção):** `executeAltTrackStep`. O item "Validar & build" roda QA e segurança, e só fecha com os dois aprovados.
- **Anexos na Íris e no chamado:**
  - **Como anexar:** botão de clipe, Ctrl+V com print ou arrastar para a janela. O chat e o formulário de chamado têm listas separadas (o formulário usa a chave `ch:<projeto>`); no chamado os arquivos vão para `.tavir/chamados/CH-0001/anexos/`.
  - **Onde fica:** `src/main/attachments.ts` grava em `.tavir/anexos/<carimbo>/` do projeto, fora do git (`excludeFromProjectGit`) e do git sombra.
  - **Zip:** extraído ao lado, com proteção contra caminho para fora da pasta e limite de 2000 arquivos e 200 MB.
  - **O que o agente recebe:** os caminhos no pedido ("Anexos enviados pelo Carlos") e abre cada arquivo com a ferramenta de leitura. No chamado, os caminhos entram na nota de «Mapear gaps» do ciclo. `CHANGE_REQUESTS.md` não recebe mais pedido novo (fica como histórico).
  - **Limites:** 10 arquivos, 25 MB cada e 60 MB por mensagem.
- **Motor por projeto:** `.tavir/control.json` (`engine`). Os quatro motores (claude, codex, antigravity, cursor) passam pela mesma camada em `src/main/motors.ts`; `npm run test:motores` confere a paridade.
- **Esteira gravada:** `.tavir/esteira.json` guarda os nomes das etapas (`names`). Se um molde ganhar etapa no meio, os registros são remapeados pelo nome. Moldes que mudaram antes disso ficam em `LEGACY_STAGE_NAMES`.

## Absorção

Entrada pelo botão «Absorver projeto» do painel, em quatro passos: Origem, Preparar, Leitura e Retrato.

- **Origem e preparar** (`absorcao/entrada.ts`): link do GitHub (https ou ssh), clonado com a conta do cofre escolhida, ou pasta local, copiada sem `node_modules`, builds e caches. Projeto de cliente vai para `tavir-externo/`, interno para `tavir-interno/`; as duas pastas estão no `.gitignore` do Escritório. O remote fica sem token. `.tavir/`, `context/`, `memory/`, `qa/` e `.env.project` entram no `.git/info/exclude` do projeto (`garantirExclude`), nunca no git dele.
- **Detectores sem motor** (`absorcao/detectores.ts`): manifestos, configs, nomes de variáveis de ambiente (nunca o valor) e uso no código. Cada serviço do catálogo (`SERVICOS`) sai como «confirmado» (duas provas de tipos diferentes) ou «indício». Resultado em `.tavir/retrato.json`.
- **Leitura em sete passos** (`absorcao/leitura.ts`): Produto, Arquitetura, Dados, Design system, Ambiente, Integrações e Riscos, cada um pelo agente do squad Product Lab, em só leitura, gravando `context/<passo>.md`. A checagem de citação reprova documento com seção faltando, caminho inexistente ou menos de cinco citações válidas; rota de URL (`/account`), pacote com escopo (`@supabase/ssr`), extensão solta (`.woff`) e import de dependência do package.json (`next/font`) não contam como caminho; nome de arquivo sem pasta (`Button.tsx:56`) vale se o arquivo existir no projeto; nome com ponto e sem extensão (classe CSS) só conta se existir. Duas tentativas; na segunda falha o documento fica «incompleto», marcado. Integrações só passa um indício para confirmado com citação de código que existe. Riscos termina com blocos `CHAMADO:`, que viram chamados abertos; o pedido leva os chamados já na fila, para a releitura não abrir o mesmo problema com outras palavras.
- **Retrato e gate** (`absorcao/fluxo.ts`): `context/RETRATO.md` resume stack, serviços, cobertura e passos. Aprovar é o gate do Carlos (`decidirRetrato`): encerra a esteira como coberta pela absorção, libera o trilho e grava em `decisoes.jsonl`. Reprovar exige nota, que vai para `context/correcoes.md` e prevalece nas leituras seguintes; o Carlos escolhe quais passos refazer. Estado em `.tavir/absorcao.json`; fechar a janela não interrompe e «Retomar» continua do passo em que estava.
- **Retrato em uso:** a conversa com a Íris e os agentes do trilho recebem `resumoDoRetrato` num bloco «Retrato do projeto», com teto fixo (`RETRATO_MAX`). O retrato não entra no histórico.
- **Atualizar retrato:** quando o `HEAD` passa do commit do retrato aprovado, a Visão geral mostra o aviso. A atualização roda os detectores de novo e refaz só os passos afetados pelos arquivos do `git diff --name-only` (`passosAfetados`); o gate aprovado continua valendo e os cartões de acesso ganham os serviços novos.

## Acessos por projeto

- Um cartão por serviço do retrato (confirmado ou indício), mais o do GitHub (`gerarCartoes`). Serviços que usam a credencial de outro (Supabase Auth → Supabase) caem no mesmo cartão; ferramentas locais (Prisma, Docker) não pedem.
- Cada cartão tem «Onde conseguir» (passos e o endereço do catálogo, aberto no navegador pelo main), «Copiar pedido ao cliente», «Pedir ao cliente» e «Não se aplica». Serviço sem guia mostra um campo genérico.
- O valor vai cifrado (`cofreCripto`) em `.tavir/credentials.json` do próprio projeto; a tela só recebe a prévia mascarada. `lerSegredoDoProjeto` só existe no main, e o segredo nunca entra em pedido a agente nem em log. Outro projeto não enxerga.
- Vercel, Supabase, Netlify e GitHub são conferidos na API ao salvar; os outros ficam «preenchido, sem conferência».

## Chamados

Fila de defeitos, melhorias e dúvidas por projeto, em `.tavir/chamados/CH-0001/chamado.json` (anexos em `anexos/`). Chamado nunca é apagado.

- **Abrir:** botão «Abrir chamado» no topo do projeto ou na aba Chamados. Formulário com tipo, prioridade, título e os três campos do tipo; aceita print colado (Ctrl+V), arrastar e «Anexar arquivo».
- **Situações e quem move** (`podeMover` em `shared/chamados.ts`): aberto → em refinamento → pronto → em execução → aguardando validação → concluído, e recusado antes de executar. Agente só cria. «Aguardando validação» só pelo Escritório, depois dos portões de QA e segurança. Concluir é o gate do Carlos (`decidirChamado`, grava em `decisoes.jsonl`); reprovar exige nota e volta a pronto, e a nota vai no próximo «Mapear gaps».
- **Refinar:** «Pedir refinamento à Íris» devolve um bloco `REFINAMENTO:` como sugestão. O Carlos aceita critério a critério e responde as perguntas; nada entra sem o clique dele.
- **Executar:** com o chamado pronto, abre um ciclo do trilho (libera o trilho se preciso; recusa se outro ciclo estiver em andamento) com o chamado inteiro em «Mapear gaps», título `CH-0007 · título` e `alt_track.chamados`. Projeto absorvido sem retrato aprovado recusa. Projeto ainda em esteira manda à Íris como pedido de alteração e roda os portões no fim.
- **Fechar o ciclo:** `aoFecharCicloDoTrilho` roda quando o item de validação termina com os portões aprovados, ou quando o Carlos fecha o último item à mão com as últimas rodadas de QA e segurança aprovadas. Sem portão aprovado o chamado fica em execução, com a linha no histórico.
- **Dúvida:** «Perguntar à Íris» responde em só leitura; a resposta fica no chamado e o Carlos conclui.
- **Íris e agentes:** a Íris termina a resposta com blocos `CHAMADO:` quando a conversa chega a um defeito ou melhoria (`parseChamados`). O texto gravado no histórico vai sem os blocos; as propostas aparecem como cartões com «Abrir chamado», «Editar antes» e «Descartar». «Procurar melhorias» (aba Chamados) é uma varredura: as propostas entram direto como chamados abertos. Os agentes do trilho podem abrir chamado do que acharem fora do escopo, sem parar o ciclo. Título repetido não cria outro: vira linha no histórico do existente.

## Build pedido pela Íris

- **Especificação no projeto:** `tavir.build.json` na raiz, no git do projeto. Cada alvo tem `id`, `nome`, `comando` (lista: executável e argumentos, sem shell), `cwd` (dentro do projeto), `timeoutMin` (até 60), `prova` (trechos que têm de aparecer na saída), `artefato` (arquivo que tem de sair novo) e `requisitos` (texto para o Carlos). Alvo sem prova nem artefato é recusado. Lógica em `src/main/buildProjeto.ts`.
- **Íris propõe:** com a especificação presente, os fatos do pedido da Íris listam os alvos e pedem o bloco `BUILD:` (`alvo:` e `motivo:`). A resposta vira cartão «Build proposto» com o comando declarado; alvo que não está no arquivo é descartado com aviso. A Íris não roda build.
- **Carlos roda:** «Gerar build» no cartão chama `projects.buildRodar`. O Escritório roda o comando (um por projeto por vez, «Parar» interrompe) e confere: código 0, todas as provas na saída e artefato novo. Só passa com os três; resposta de motor ou «sucesso» do script não contam.
- **Evidência:** `qa/builds/BLD-AAAAMMDD-HHMMSS/` com `saida.log` e `resultado.json`, fora do git do projeto e do git sombra. Chaves conhecidas e valores de `password`/`token`/`anon_key` saem mascarados.
- Primeiro uso: alvo `apk` do Novo App (`tavir-interno/novo-app-2dad16`), que roda `aplicativo/build_apk.ps1` e exige a linha «fila na nuvem conferida dentro do APK».

## Guarda do estado em `.tavir/`

O agente roda com escrita no projeto inteiro, e `.tavir/` mora dentro dele. `src/main/tavirGuarda.ts` fecha esse caminho: toda rodada de motor (`converseWithIrisAgent`) abre a guarda antes e fecha depois. Ficam protegidos `control.json`, `esteira.json`, `retrato.json`, `decisoes.jsonl`, `absorcao.json`, `acessos.json`, `credentials.json` e os `.json` de cada chamado (anexos não).

- O Escritório avisa cada gravação legítima com `escritaDoEscritorio(arquivo)`; o que ele grava durante a rodada fica.
- Qualquer outra diferença é do agente: volta à versão esperada, o arquivo criado sai, o apagado volta. A versão do agente fica em `runs/<id>/barrados/` (a do cofre não, para não copiar segredo), o chamado mexido ganha linha do Escritório no histórico e o log da etapa mostra o aviso.
- O pedido com escrita diz que `.tavir/` é do Escritório. Gravação nova de estado precisa chamar `escritaDoEscritorio`, senão a guarda desfaz.

## Branch por ciclo e publicação

- **Branch do ciclo:** no primeiro item que muda código, o trilho cria `tavir/ciclo-N-<assunto>` a partir da branch atual e os commits por passo caem nela (`alt_track.branch`). A esteira de criação continua na branch principal.
- **Alteração solta:** arquivo versionado modificado fora do trilho trava a troca de branch (`alt_track.branchPending`). O CEO escolhe guardar no stash e abrir a branch, ou seguir na branch atual sem branch própria. Arquivo novo e as pastas `.tavir/`, `qa/`, `context/` e `memory/` não travam.
- **Publicar:** só depois que "Validar & build" passa no QA e na segurança, e só por clique do CEO (nunca no modo automático).
  - Remoto no GitHub: **Abrir PR**. Push da branch e PR pela API do GitHub com a conta do projeto. O corpo traz o mapeamento, os trilhos, os commits, o resumo de QA (com regressões), o de segurança e as decisões do ciclo.
  - Sem remoto: **Juntar na principal**, merge `--no-ff` na branch de origem. Conflito desfaz o merge e volta para a branch do ciclo.
  - Outro host (GitLab etc.): não publica; o CEO usa o git dele.
- **Registro:** `alt_track.publish` e uma linha `kind: 'publicacao'` no livro de decisões. Novo ciclo arquiva branch e publicação em `cycles` e, se o anterior foi publicado, volta para a branch de origem.

## Contas e cofre

Duas camadas de credencial, que não se misturam:

- **Escritório** (Configurações › Contas e cofre): quem você é quando age. Um card para a conta do GitHub da TAVIR, um para a Pessoal, e um para cada provedor de deploy e dados (Vercel, Supabase, Netlify).
- **Projeto** (aba Acessos da Fábrica, `.env.project`): os segredos do próprio projeto, isolados nele.

Como funciona:

- **Entrada:** o CEO cola o token no card. O app confere na API do provedor antes de guardar (GitHub `/user`, Vercel `/v2/user`, Netlify `/api/v1/user`, Supabase `/v1/projects`).
- **Armazenamento:** cifrado com `cofreCripto` (AES-256-GCM, chave em `%PROGRAMDATA%\TAVIR\cofre.key`). GitHub em `db/git_accounts.json` (`src/main/gitAccounts.ts`), demais em `db/credentials.json` (`src/main/credentials.ts`), ambos fora do git. A tela só recebe conta, detalhe e prévia mascarada.
- **Uma conta por rótulo no GitHub:** cadastrar outra TAVIR substitui a anterior.
- **Conta do projeto:** a escolhida no card de publicação (`control.json` `git_account`), senão a que casa com o perfil git do projeto (`isolation.json`), senão a padrão (`projectGitAccount`).
- **Quem assina:** commits por passo e o merge do ciclo saem com o nome e o e-mail dessa conta (e-mail público ou `id+login@users.noreply.github.com`), por `GIT_AUTHOR_*`/`GIT_COMMITTER_*`. O `.git/config` do projeto não muda; sem conta cadastrada, vale o `user.name`/`user.email` local dele.
- **Push e PR:** recebem o token por variável de ambiente (`http.extraheader` via `GIT_CONFIG_*`, `GH_TOKEN`), nunca na linha de comando, no `.git/config` ou em log.
- **Deploy:** os tokens de Vercel, Supabase e Netlify ficam prontos (`getCredentialToken`) para quando a Fábrica publicar os projetos; hoje nada os usa.

## Portão de QA

- **Plano** (`qaPlan.ts`): scripts do `package.json` (tipos, lint, testes, build), `playwright.config`, Flutter (`flutter analyze --no-fatal-infos` e `flutter test`) e Python. Alvo web: servidor de dev, pasta estática ou nenhum. Não instala dependências.
- **App em subpasta:** se a raiz não tem stack (ou só um `index.html` solto), o plano procura nas subpastas de primeiro nível (`aplicativo/`, `backend/`, `frontend/`…) e junta as checagens. Cada uma roda na própria pasta (`cwd`) e leva o nome da pasta no relatório. Pastas da Fábrica (`qa`, `docs`, `trilho`, `memory`…) ficam de fora.
- **Checagem bloqueada:** ferramenta fora do PATH (Flutter, Python) ou pasta sem `node_modules` vira falha com o motivo e o comando que resolve, sem rodar. No Windows, o executável vem do `where` (o Flutter é `.bat`, não `.cmd`).
- **Subida do app** (`startTarget` em `qaRunner.ts`): servidor de dev ou estático numa porta livre em `127.0.0.1`.
- **Jornada** (`jornada.ts`): processo separado (`ELECTRON_RUN_AS_NODE`), Playwright com vídeo, trace e prints, em 1440 px e 390 px. Checa HTTP, erros de JavaScript e de console, links internos, acessibilidade básica e rolagem horizontal no celular.
- **GIFs:** ffmpeg recorta cada falha. O alinhamento usa um quadro magenta de calibração (`markInVideo`).
- **Regressões:** cada execução compara com a anterior (`prevId`, `regress`).
- **Saída:** `<projeto>/qa/evidencias/QA-AAAAMMDD-HHMMSS/` com `resultado.json`, `index.html` no Design System TAVIR, vídeos, GIFs, prints, traces e logs.

## Portão de segurança (white box)

- **Regras próprias** (`segRules.ts`), sempre ativas: segredos (chaves de provedores, chave privada, URL de banco com senha, JWT, senha no código, `.env` versionado), 14 padrões de código (injeção, XSS, eval, TLS, hash fraco, CORS, Electron) e sinais de LGPD e CSP.
- **Histórico do Git:** lido em fluxo com `git log -G` (400 commits, até 3 min).
- **Dependências:** `npm audit` ou `pnpm audit` (precisa de lockfile) e `pip-audit`.
- **Ferramentas externas, quando estão no PATH:** gitleaks, semgrep (`p/default`, `--metrics=off`) e trivy (vuln + misconfig). Achados de ferramentas diferentes na mesma linha viram um só.
- **Git do próprio projeto** (`gitScope`): só conta como repositório quando o topo do git é a própria pasta. Projeto dentro de outro repositório (ex.: `tavir-interno/` no Escritório) é varrido como pasta comum: lista de arquivos pela pasta, gitleaks com `--no-git`, semgrep com `--no-git-ignore`, sem histórico e sem commit. Antes disso, o portão lia o histórico do Escritório e 0 arquivos do projeto.
- **Não avaliado:** se nenhum arquivo foi lido, o portão segura sem nota ("Segurança não avaliada").
- **Reprovação:** qualquer achado crítico ou alto aberto. A nota é 100 menos o peso dos abertos.
- **Corrigido:** o que estava aberto e sumiu em relação à varredura anterior, desde que o item que o achou tenha rodado sem erro nesta varredura.
- **Itens** (`SEG_ITEMS` em `segScanner.ts`): segredos, código, LGPD e configuração, gitleaks, histórico do Git, dependências, pip-audit, semgrep e trivy. Cada um termina como `ok`, `problema`, `erro` ou `nao_aplica`, com a hora da verificação. Item que quebra vira `erro` e a varredura segue. Os achados crus de cada item ficam em `itens.json` da varredura.
- **Varredura completa** (botão do topo, trilho e esteira): passa por todos os itens em ordem, com progresso item a item na tela e botão de cancelar. Cancelada, grava o que já rodou; os itens que não rodaram mostram o resultado da anterior e não contam como corrigidos. No fim, a tela mostra o resumo (verificados, passaram, falharam, erro, não se aplica).
- **Varredura isolada** (`seg.run(projeto, item)`, botão «Rodar varredura» ou «Rodar novamente» do item): roda só aquele item e grava uma varredura nova com os demais herdados da anterior. Não muda a lógica de nenhuma verificação.
- **Ações do item com problema:** «Corrigir» abre um chamado com os achados abertos do item (o motor corrige pelo fluxo normal; quem fecha é o portão). «Aceitar risco» aceita todos os abertos do item com uma justificativa só (`seg.acceptItem`), decisão do Carlos que vai para o livro de decisões.
- **Risco aceito:** o CEO aceita com justificativa pela aba Segurança. Fica em `.tavir/seguranca-aceites.json` e no livro de decisões (`kind: 'seguranca'`).
- **Saída:** `<projeto>/qa/seguranca/SEC-AAAAMMDD-HHMMSS/`. Segredos aparecem sempre mascarados.

`qa/evidencias/` e `qa/seguranca/` ficam fora do git do projeto (`.git/info/exclude`) e do git sombra.

Não há varredura gray box (app rodando, visto de fora) integrada. O OWASP ZAP pode ser rodado à parte pelo Docker, mas não entra no portão.

## Design (pilar comum)

Vale para LP, oferta e sistema, em criação e em manutenção. Regra: útil e bonito na mesma proporção.

- **Fonte única:** `src/shared/design.ts` (papéis, skills por família, modelo e conferência do contrato, rubrica, bloco do pedido). Cópia de arquivos e biblioteca em `src/main/design/`.
- **Etapas nos seis moldes:** «Direção de design» (Marina + Yuri) antes da construção; em criação, «Aprovação do design» (gate do Carlos) logo depois; «Gate · Revisão de design» (Revisor de Design) depois do QA. Em LPs · Manutenção a direção é a etapa «Prova visual».
- **Contrato do projeto:** `design/marca.md` (Marina) e `design/DESIGN.md` (Yuri), dentro do projeto e no git dele. O modelo e as seções obrigatórias estão em `CONTRACT_TEMPLATE` e `CONTRACT_SECTIONS`. A direção só fecha se `contractGaps` voltar vazio; em manutenção sem mudança visual o contrato pode não existir.
- **Kit:** antes de cada etapa de design o Escritório copia para `.tavir/design/kit/` do projeto o cânone, o padrão de referências, o modelo do contrato, a base `conhecimento/design/`, as skills do papel e as referências validadas. O pedido leva a alma (`agentes/escopo/oficio/`) e o cânone no texto e aponta os arquivos do kit. Não usa recurso de skill de motor: serve aos quatro.
- **Contra a cara de IA:** o contrato tem a seção Conceito (ideia própria, teste da troca de logo, estrutura nomeada, quebra de regra, imagem real). Em criação a direção entrega três direções diferentes em `design/direcoes/<a|b|c>/index.html` e só fecha com as três; o Carlos escolhe no gate. As skills vêm de coleções de terceiros com licença MIT, copiadas e revisadas em `agentes/escopo/skills/` (`tastemaker`, `no-ai-design-slop`, `audit-ai-design-slop`, `mengto-receitas`, `jakub-interface`, `emil-motion`, `elaya-landing`, `owl-critica-visual`); cada pasta tem `LICENSE` e `ORIGEM.md`. Não atualizar direto do repositório do autor sem nova revisão.
- **Modos (Padrão e Conceito):** o Carlos escolhe na tela da etapa «Direção de design» (ou «Prova visual»); fica em `designMode` de `.tavir/esteira.json` e vale para as etapas de design seguintes. Padrão segue as convenções da categoria e ganha no acabamento. Conceito parte de uma ideia central: cada direção quebra pelo menos duas convenções, nenhuma seção repete a estrutura da anterior e o contrato só fecha com a linha «Convenções quebradas:» na seção Conceito (`contractGaps(texto, 'conceito')`). O revisor devolve página de conceito que parece página comum. Tarefa do usuário e portão automático valem igual nos dois. Em manutenção, o texto do pedido pode trocar o modo só daquele item («modo conceito», `textDesignMode`).
- **Manutenção pelo trilho:** `trackDesignRole` dá o papel ao item. Marina ou Yuri como dono = direção; quem constrói tela segue o contrato. A Paula é instruída a abrir o trilho de direção antes do de construção quando o gap muda layout, identidade ou aparência.
- **Portão de design:** suíte «Design» dentro da jornada do QA (`src/main/qa/jornada.ts`), só em projeto com `design/DESIGN.md`. Confere conteúdo que continua invisível depois de rolar, clichês de modelo pronto (texto em degradê, selo em caixa alta repetido acima dos títulos), contraste AA, emoji como ícone, um só h1 e níveis em sequência, fontes dentro do bloco `tokens`, foco visível no Tab, rolagem horizontal em 768 e 1024 px, movimento reduzido e alvo de toque de 44 px no celular. Falha reprova o QA como qualquer outro teste.
- **Revisor isolado:** a etapa de revisão não recebe o resumo das etapas anteriores; recebe o contrato, a rubrica (cinco critérios de tarefa, cinco de acabamento) e a pasta de prints do último QA. Devolver é obrigatório com média abaixo de 7, critério com 5 ou menos, ação principal quebrada ou conteúdo que não aparece. É gate: o parecer é do agente, a decisão é do Carlos. A jornada rola a página antes do print inteiro, para a evidência mostrar o que entra na tela ao rolar.
- **Biblioteca de referências:** `conhecimento/design/referencias/<marketing|produto>/<nome>/`. `npm run design:ref -- <url> --familia … --nicho …` captura telas e medidas e grava o card como rascunho. Só `status: validado`, escrito pelo Carlos, entra no kit. As imagens ficam fora do git.
- **Kakashi (absorção de site):** agente do «Chamar agente» (`KAKASHI`, ação `absorver-site`). O Escritório abre o site num navegador próprio (`src/main/design/absorcao.ts`, `absorbSite`) e grava na pasta da tarefa `absorcao.json`, `telas/` e `video/sessao.webm`: variáveis e tokens, escala tipográfica, seções em ordem, componentes com hover e foco medidos, keyframes, animações vivas com os quadros, transições, o que anima ao carregar, ao rolar e ao passar o mouse, o que se repete sozinho com o intervalo, o que abre em cada clique, quebras e o layout em 1440, 1024, 768 e 390 px. O Kakashi não navega: lê a pasta e redige `dossie.md` com as treze seções de `DOSSIER_SECTIONS`. A tarefa só fecha se `dossierGaps` voltar vazio; depois `publishAbsorption` leva dossiê, medidas e prints para a biblioteca como rascunho. O que não foi medido (canvas, shadow DOM, iframe, folha de outra origem, animação por JavaScript, páginas internas) vai para a chave `lacunas` e para a seção «Lacunas». Imagem, texto, fonte e código do site não são baixados.
- **Sessão de referências (site com login):** `src/main/design/sessao.ts`. No modal da etapa de design, «Entrar num site» abre uma janela do Escritório com perfil próprio (`persist:tavir-referencias`, em `%APPDATA%`, fora do git e separado do Chrome pessoal); quem digita o login é o Carlos. Na absorção, `sessionCookies` entrega ao navegador da medição só os cookies do domínio do site pedido, em memória: cookie não vai para pasta, pedido, log nem agente. Se o site jogar para tela de login (`looksLikeLogin`), a absorção para com o aviso para entrar de novo, em vez de medir a tela de login. `clearSession` sai de todos os sites.
- **Acervo de código aberto:** `src/main/design/acervo.ts`. Bibliotecas de interface com licença MIT (Open Props, Motion Primitives, Magic UI, Origin UI, Primer Brand, Untitled UI React) são clonadas em `tavir-externo/design-acervo/` (fora do git) e `npm run acervo:catalogar` grava um card por biblioteca em `conhecimento/design/acervo/<slug>/`: `card.md`, `indice.md`, `LICENSE` e `pecas/`. Só entra clone com arquivo de licença MIT; o Escritório lê os arquivos, não instala nem executa nada deles. Card nasce `rascunho` e só chega ao kit (`.tavir/design/kit/acervo/`) da direção e da construção depois de `validado` pelo Carlos; catalogar de novo mantém o status. O pedido manda ler o índice, refazer a técnica na pilha e na marca do projeto e levar o aviso de licença se copiar trecho grande. Biblioteca nova: uma entrada em `ACERVO_SOURCES`.
- **Tema, prancha e fotos:** em projeto novo a direção entrega `design/tema.css` (escalas de cor com 5 passos ou mais e uma camada de papéis apontando para elas com `var()`) e `design/prancha.html` (paleta em área, tipografia e espécimes de botão, campo, cartão, etiqueta e espaço de foto). `brandGaps` (`src/shared/design.ts`) confere: escala, papéis, cor do tema dentro do bloco `tokens` do contrato, prancha que importa o tema, não declara cor por fora e traz os espécimes. Sem isso a etapa não fecha; em manutenção só vale se os arquivos foram entregues. Foto é do cliente: a página reserva o espaço com `data-foto`, proporção e legenda, e a lista vai em `design/fotos.md`; ninguém busca foto em banco nem gera imagem. Com acervo validado, o contrato também precisa do título «Movimento» (`motionPlanGap`).
- **Três pranchas e escolha da marca:** os moldes de criação (LP-C1, OF-C1, SY-C1) têm, antes da direção, a etapa «Marca · três pranchas» (Marina) e o gate «Escolha da marca» (Carlos). A Marina grava `design/pranchas/a|b|c/` com `tema.css` e `prancha.html`; `brandBoardsGaps` (`src/shared/design.ts`) só fecha a etapa com as três pastas completas, cor principal viva, fundo que não é neutro quente (bege, creme, areia) e famílias de cor a 40° ou mais de matiz uma da outra, lidas pelos papéis de nome fixo `--cor-marca`, `--cor-acao` e `--cor-fundo`. No gate, aprovar é escolher: a decisão precisa dizer a letra (os botões «Escolher A/B/C» do modal mandam «Prancha X»), e quem copia o tema e a prancha escolhidos para `design/` é o Escritório (`adoptBrandBoard`); a letra fica em `brandChoice` na esteira. A direção recebe a marca como dada e veste as três direções com ela. As regras de cor (`COLOR_RULES`) entram também no pedido da direção e da construção. Moldes de manutenção não têm essas etapas; os nomes antigos estão em `LEGACY_STAGE_NAMES`.
- **Molde com projeto em andamento:** as listas antigas estão em `LEGACY_STAGE_NAMES` (uma ou mais por molde, de tamanhos diferentes). Etapa nova que cai antes de uma já concluída entra como concluída com a nota «não foi executada», para não reabrir projeto entregue.

## Ferramentas na máquina

| Ferramenta | Uso | Como instalar |
| :--- | :--- | :--- |
| Chromium do Playwright | Jornada de QA | Já vem em `%LOCALAPPDATA%\ms-playwright` |
| ffmpeg | GIFs do QA | `winget install Gyan.FFmpeg` |
| gitleaks | Segredos | `winget install Gitleaks.Gitleaks` |
| trivy | Dependências e configuração | `winget install AquaSecurity.Trivy` |
| semgrep, pip-audit | Análise estática e dependências Python | `python -m pip install semgrep pip-audit` |

Sem as ferramentas externas a varredura roda do mesmo jeito; o relatório marca as linhas delas como "não se aplica".

## IPC (preload `window.tavir`)

- `qa.run / list / stop / open`
- `seg.run / list / stop / accept / acceptItem / open`
- `projects.runEsteira / decideEsteira / decisions / setEngine / runAltTrack / approveAltTrack`
- `projects.altTrackPublishInfo / publishAltTrack / resolveAltTrackBranch / setGitAccount / openAltTrackPr`
- `accounts.list / add / remove / setDefault / test / openTokenPage`
- `creds.list / save / remove / test / openTokenPage`
- `projects.retrato / absorbPrepare / absorbStart / absorbResume / absorbStop / absorbDecide / absorbPending / retratoAtualizar`
- `projects.acessos / acessoSalvar / acessoSituacao / acessoRemover / acessoAbrirGuia`
- `projects.buildAlvos / buildRodar / buildParar`
- `projects.chamados / chamado / chamadoCriar / chamadoEditar / chamadoMover / chamadoAnexar / chamadoAnexo / chamadosContagem / chamadoRefinar / chamadoSugestao / chamadoResponder / chamadoExecutar / chamadoDecidir / chamadoConcluirDuvida`

O progresso ao vivo chega por `run:event`, com `meta.qa` ou `meta.seg`.

## Testes

- `npm test`: unitários (`tests/unit`), incluindo moldes, commit por passo, plano e relatório de QA, regras e varredura de segurança, branch por ciclo e contas no cofre (`cicloBranch.spec.ts`), absorção (`absorcao*.spec.ts`, `retratoAtualizar.spec.ts`), acessos, build pela Íris (`buildProjeto.spec.ts`), chamados (`chamados*.spec.ts`), isolamento entre projetos (`isolamentoProjeto.spec.ts`) e pilar de design (`design.spec.ts`).
- `npm run test:motores`: conformidade dos quatro motores.
