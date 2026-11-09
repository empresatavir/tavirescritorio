# Fábrica (app Electron)

A Fábrica cria, absorve e mantém projetos de cliente. O motor de IA executa cada passo; quem decide se o passo terminou é uma checagem determinística (gate do CEO, portão de QA, portão de segurança).

Tudo vive no app Electron (`src/`). O frontend SolidJS (`frontend/`) e o backend FastAPI (`backend/`) são a versão anterior e não recebem a Fábrica nova.

## Peças

| Arquivo | Papel |
| :--- | :--- |
| `src/shared/esteiras.ts` | Fonte única dos moldes (LP-C1, LP-M1, OF-C1, OF-M0, SY-C1, SY-M1). Cada etapa tem `gate`, `qa` e `seg`. O build do renderer injeta a mesma lista no painel. |
| `src/main/project-fs.ts` | Esteira, trilho de alteração, absorção, portões e decisões. |
| `src/main/runLedger.ts` | Livro de execuções em `.tavir/runs/<id>/` e git sombra em `.tavir/shadow.git`. |
| `src/main/stepCommit.ts` | Commit por passo, só com os arquivos que a execução mudou. |
| `src/main/cycleBranch.ts` | Branch por ciclo do trilho, merge local e PR no GitHub. |
| `src/main/gitAccounts.ts` | Contas do GitHub (TAVIR e Pessoal) no cofre da máquina; identidade dos commits. |
| `src/main/credentials.ts` | Tokens de Vercel, Supabase e Netlify no cofre da máquina. |
| `src/main/qa/` | Portão de QA: plano, jornada no navegador, GIFs e relatório. |
| `src/main/seg/` | Portão de segurança white box: regras, scanner e relatório. |
| `src/renderer/fabrica-ref/Fabrica.dc.html` | Painel (template sc-if/sc-for), empacotado por `scripts/clean_and_bind_ipc.js`. |

## Fluxos

- **Criação e absorção:** `createOrAbsorbProjectRecord`. A absorção faz o levantamento da pasta, grava o projeto no SQLite (`backend/tavir.db`) e tira o **retrato inicial**: varredura de segurança e QA em segundo plano, com o rótulo "Retrato inicial" e os ids em `.tavir/control.json` (`baseline`). Passe `baseline: false` para não rodar (usado nos testes).
- **Esteira:** `runEsteiraStage`. Uma etapa só roda com os gates anteriores aprovados. Gates ficam `awaiting` até `decideEsteiraGate`; decisões vão para `.tavir/decisoes.jsonl`. Etapas `qa` e `seg` só viram `done` se o portão passar.
- **Trilho de alteração (manutenção):** `executeAltTrackStep`. O item "Validar & build" roda QA e segurança, e só fecha com os dois aprovados.
- **Motor por projeto:** `.tavir/control.json` (`engine`). Os quatro motores (claude, codex, antigravity, cursor) passam pela mesma camada em `src/main/motors.ts`; `npm run test:motores` confere a paridade.
- **Esteira gravada:** `.tavir/esteira.json` guarda os nomes das etapas (`names`). Se um molde ganhar etapa no meio, os registros são remapeados pelo nome. Moldes que mudaram antes disso ficam em `LEGACY_STAGE_NAMES`.

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

- **Plano** (`qaPlan.ts`): scripts do `package.json` (tipos, lint, testes, build), `playwright.config`, Flutter e Python. Alvo web: servidor de dev, pasta estática ou nenhum. Não instala dependências.
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
- **Reprovação:** qualquer achado crítico ou alto aberto. A nota é 100 menos o peso dos abertos.
- **Corrigido:** o que estava aberto e sumiu em relação à varredura anterior.
- **Risco aceito:** o CEO aceita com justificativa pela aba Segurança. Fica em `.tavir/seguranca-aceites.json` e no livro de decisões (`kind: 'seguranca'`).
- **Saída:** `<projeto>/qa/seguranca/SEC-AAAAMMDD-HHMMSS/`. Segredos aparecem sempre mascarados.

`qa/evidencias/` e `qa/seguranca/` ficam fora do git do projeto (`.git/info/exclude`) e do git sombra.

Não há varredura gray box (app rodando, visto de fora) integrada. O OWASP ZAP pode ser rodado à parte pelo Docker, mas não entra no portão.

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
- `seg.run / list / stop / accept / open`
- `projects.runEsteira / decideEsteira / decisions / setEngine / runAltTrack / approveAltTrack`
- `projects.altTrackPublishInfo / publishAltTrack / resolveAltTrackBranch / setGitAccount / openAltTrackPr`
- `accounts.list / add / remove / setDefault / test / openTokenPage`
- `creds.list / save / remove / test / openTokenPage`

O progresso ao vivo chega por `run:event`, com `meta.qa` ou `meta.seg`.

## Testes

- `npm test`: unitários (`tests/unit`), incluindo moldes, commit por passo, plano e relatório de QA, regras e varredura de segurança, branch por ciclo e contas no cofre (`cicloBranch.spec.ts`).
- `npm run test:motores`: conformidade dos quatro motores.
