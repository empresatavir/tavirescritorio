# Plano de execução · Absorção completa e Chamados da Fábrica

Situação: **aprovado pelo Carlos em 16/11/2026, pronto para executar**. Nada foi implementado ainda.
Executor previsto: Opus 5.5, esforço médio. Prazo: hoje.

## 0. Para quem vai executar

Leia este arquivo inteiro, depois `CLAUDE.md` e `docs/modules/fabrica.md`. O plano traz os pontos de encaixe com arquivo e linha; as linhas são de 16/11 e podem ter andado, então confirme com uma busca antes de editar.

**O que se quer.** Assumir um projeto que já existe como se o Escritório o tivesse criado, e cuidar dele por uma fila própria de chamados, sem misturar um cliente com outro.

- **Parte A · Absorção completa.** Ao absorver uma pasta ou um repositório, o Escritório lê o projeto inteiro, passo a passo, e entrega um retrato conferido. Do retrato saem os cartões de acesso e o isolamento.
- **Parte B · Chamados.** Cada projeto tem sua fila de bugs, melhorias e dúvidas. O chamado passa por refinamento, é executado pelo trilho de alteração que já existe e só fecha no gate do Carlos.

**Regras que valem em todas as fases**

1. O app é o Electron em `src/`. Backend FastAPI e frontend SolidJS estão defasados: não mexa.
2. Responda ao Carlos sempre em pt-BR. Texto de tela em pt-BR, direto, sem jargão.
3. **Quem decide é a checagem, não o motor.** Nenhuma resposta de agente fecha etapa, muda situação de chamado ou aprova retrato. Só gate do Carlos, portão de QA (`src/main/qa/`) ou portão de segurança (`src/main/seg/`).
4. Agente de leitura continua em só leitura. Ele devolve texto; quem grava no disco é o Escritório.
5. Dado de cliente nunca entra no git do Escritório nem no git do cliente. Segredo em tela, log ou relatório sempre mascarado (`maskSecret`, `maskToken`).
6. A tela da Fábrica é o template `src/renderer/fabrica-ref/Fabrica.dc.html`, montado por `npm run build:renderer` (`scripts/clean_and_bind_ipc.js`). Leia o script antes da primeira mudança de tela. Texto de agente na tela usa `window.TavirReader` (`blocks`, `trail`); não copie o formatador. Área que recebe texto enquanto o motor trabalha leva `data-tv-follow`.
7. Cores: `var(--text-primary)` e `var(--text-secondary)` no conteúdo, nunca `var(--cloud)`. SVG novo sem `<metadata>` nem `c2pa`. Tamanho numérico em estilo sempre com `px`.
8. `.claude/launch.json` e a seção 7 do `CLAUDE.md` são imutáveis.
9. Lógica nova vai em arquivos novos (`src/shared/`, `src/main/absorcao/`, `src/main/chamados.ts`, `src/main/acessos.ts`). Em `project-fs.ts`, `irisAgent.ts`, `ipc.ts`, `preload/index.ts` e `types.ts` entram só os ganchos.
10. IPC segue o padrão atual: `handle('projects:nome', …)` em `ipc.ts` com `require` tardio do módulo, e a entrada correspondente em `preload/index.ts` (objeto `projects`) e em `src/shared/types.ts`.
11. Cada fase termina com: testes novos em `tests/unit/` passando (`npm test`), `npm run build` sem erro, verificação no Electron de verdade com print, e **um commit** na branch do trabalho. Sem push.
12. Fase que muda pedido a motor (A3, B3, B4) passa em `npm run test:motores` nos quatro motores.
13. Em script ou teste que absorve projeto, use `baseline: false`.
14. Se algo do plano não bater com o código, siga o código, registre a diferença no relatório da fase e continue. Pare e pergunte só se a regra 3 ou a 5 estiver em jogo.

**Pronto significa** (roteiro de aceite final, feito no app):

1. Colar o link de um repositório, escolher escopo externo e ver o projeto clonado em `tavir-externo/<nome>` com nome e cliente preenchidos.
2. Acompanhar a leitura passo a passo e receber o retrato com serviços, prova e cobertura. Aprovar o retrato.
3. Ver os cartões de acesso abertos pelo retrato, cada um com «Onde conseguir». Preencher um e confirmar que outro projeto não o enxerga.
4. Ver QA e Segurança como pendências «a fazer» do projeto.
5. Abrir um chamado com imagem colada (Ctrl+V), refinar com a Íris, marcar pronto, executar pelo trilho e ver o chamado ir para «aguardando validação» só depois dos portões, e fechar só no gate.
6. Conversar com a Íris sobre um defeito e abrir o chamado pelo cartão que ela propõe.

## 1. Decisões fechadas

| | Decisão |
|---|---|
| D1 | Projeto absorvido, com retrato aprovado, entra **direto em manutenção** (trilho liberado e chamados), sem percorrer a esteira de manutenção. QA e Segurança ficam automaticamente como pendências **a fazer** do projeto. |
| D2 | Chamado de varredura pedida entra direto como «Aberto», marcado como aberto pela Íris. Canais de abertura: seção 6. |
| D3 | Um chamado por ciclo do trilho. Lote fica para depois. |
| D4 | As alterações pendentes de outras sessões são commitadas antes; depois abre-se a branch (Fase 0). |
| D5 | Pasta local é **copiada** para a pasta do escopo, sem `node_modules` e sem pastas de build. A original fica intacta. |
| D6 | Credencial do projeto cifrada em `.tavir/credentials.json` na pasta dele. |
| D7 | A pasta de externos é `tavir-externo` (projeto feito para cliente de fora). |
| D8 | Tudo hoje. Ordem e cortes na seção 7. |

Interpretação a confirmar com o Carlos, sem bloquear: em D1, «pendentes a fazer» foi lido como *QA e Segurança não rodam mais sozinhos em segundo plano na absorção; aparecem como pendências com o botão «Rodar agora»*.

## 2. Como é hoje (pontos de encaixe)

**Absorção**

- Modal «Absorver pasta»: marcação em `Fabrica.dc.html:1221`, estado e ações em `:2434` (`abs`, `self.analyze`, `self.absorb`). Três passos (Pasta, Análise, Esteira). «Pastas recentes» são três caminhos fixos. Não aceita link nem pergunta escopo.
- `createOrAbsorbProjectRecord` (`project-fs.ts:815`): registra o projeto **onde a pasta está**, grava `.tavir/isolation.json`, ajusta git local, escreve `.env.project` e `.tavir/credentials.json` no `info/exclude` (`:926`) e chama `scheduleBaseline` (`:1050`), que roda segurança e QA em segundo plano. A pasta de externos está escrita `tavir-exterrno` (`:855`).
- `surveyWorkspace` (`project-fs.ts:495`): caminhada sem motor, corte em 2.500 arquivos, deploy só por nome de arquivo de configuração, stack por dez dependências, nomes de variáveis dos `.env`. Grava `context/dossie.md`, `inventario.md`, `diagnosis.md`, `levantamento.json` e `.tavir/survey.json`, e semeia a primeira etapa da esteira (`seedEsteiraFromSurvey`). `SURVEY_SKIP_DIRS` em `:475`.
- Esteiras de manutenção em `src/shared/esteiras.ts` (`SY-M1`, `LP-M1`, `OF-M0`). O trilho de alteração só aparece com o projeto encerrado (`finished` em `getProjectAlterationsControl`, `:1741`: `status` `done` ou `completed`).
- Cofre: `credentials.ts` guarda **um token por provedor para a máquina** (Vercel, Supabase, Netlify), com `tokenUrl` e conferência na API (`fetchProviderUser`). `cofreCripto.ts` exporta `cifrar` e `decifrar`. Contas do GitHub em `gitAccounts.ts` (`listGitAccounts`, `getGitAccountToken`, `gitAuthEnv`, `scrubToken`).
- Aba Acessos: marcação em `Fabrica.dc.html:987`; os dados vêm do estado da tela (`credBase`, `s.credEd`, `:2453`), não de arquivo do projeto. Confirme ao mexer.

**Pedido de alteração, Íris e trilho**

- Botão «Pedir alteração» (`Fabrica.dc.html:295`, `ghost`), modal em `:1150`, envio em `:3553` (`chgSend` → `sendIrisMessage(txt, { asChangeRequest: true })`).
- `askProjectIris` (`project-fs.ts:2756`). Com `asChangeRequest` a Íris escreve (`irisAgent.ts:189`) e o texto vai para `memory/projeto/CHANGE_REQUESTS.md` (`absorbChangeRequest`, `:2789`). Sem ele, é só leitura e o prompt manda dizer «envie como Pedir alteração» (`irisAgent.ts:143`). Saudação que cita o botão em `project-fs.ts:2745`.
- `converseWithIrisAgent` (`irisAgent.ts`, pedido em `IrisAgentRequest`, `:21`): `projectFacts` e `memorySnippet` entram no prompt; `runKind` diferente de `chat` usa o pedido como papel do agente. O que vai de histórico é medido por `historyBudget`.
- Trilho: estado em `.tavir/control.json` → `alt_track` (`AltTrackState`, `:1370`; `normalizeAltTrack`, `:1635`, **descarta campo que não conhece**). Itens Mapear gaps → Planejar → Ajustar → Validar & build. `executeAltTrackStep` (`:2356`) exige passo maior que zero e «Mapear gaps» preenchido; roda os portões de QA e segurança no item de validação (`:2541`) e marca `runStatus = 'done'` (`:2596`). Outras peças: `advanceProjectAltTrack` (`:1936`), `closeProjectAltTrackItem` (`:1986`), `startNewAltTrackCycle` (`:2024`), `approveAltTrackGate` (`:2072`), `cycleSubject` (`:2114`, usa `track.title` no nome da branch e do PR), `setProjectAlterationsOpen` (`:1795`).
- Decisões do Carlos: `logDecision` (`:1127`) grava em `.tavir/decisoes.jsonl`.
- Bloco estruturado na resposta de agente já existe: `parseTrilhos` (`:1455`) lê `TRILHOS:`.
- Anexos: `attachments.ts` (`saveAttachments` grava em `.tavir/anexos/<carimbo>/`, `attachmentsPrompt`, `attachmentsLine`). Na tela, colar, arrastar e escolher arquivo funcionam em qualquer área com `data-tv-attach` (`Fabrica.dc.html:3490`, `addAttachFiles`).
- Abas do projeto montadas em `Fabrica.dc.html:2781` (`ptabs`) e ligadas em `:2253` (`pt`).
- Fila do APK: `officeCloud.ts` lê `office_commands` no Supabase do Escritório.

## 3. Fase 0 · Preparar o terreno

1. `git status` na raiz. A branch atual é `escritorio/fila-execucao`, com cerca de 30 arquivos versionados modificados por outras sessões. Confira com `mcp__ccd_session_mgmt__list_sessions {"linked": true}` se alguma sessão ainda está trabalhando; se estiver, espere ou pergunte ao Carlos.
2. Rode `npm run build:main` e `npm test`. Anote o que falhar **antes** de qualquer mudança sua; não conserte o trabalho dos outros.
3. Commite os arquivos versionados modificados em commits por área (studio, segurança, fábrica e Íris, dados em `db/` e `relatorios/`), na branch atual. Dos não versionados, entram só `tests/unit/portoesRaiz.spec.ts` (se passar) e os arquivos de `docs/planning/`. Não adicione `visual/_*`, `_tmp_*`, `scripts/_*` nem `.tavir/`.
4. Crie a branch `fabrica/absorcao-chamados` a partir daí. Todo o trabalho deste plano fica nela.

## 4. Parte A · Absorção completa

Arquivos novos: `src/shared/absorcao.ts` (tipos e catálogos), `src/main/absorcao/detectores.ts`, `entrada.ts`, `leitura.ts`, `retrato.ts`, `fluxo.ts`, `src/shared/acessos.ts`, `src/main/acessos.ts`.

### A1 · Detectores e retrato da camada 1 (sem motor)

**Catálogo** em `src/shared/absorcao.ts`:

```ts
export type Assunto = 'deploy' | 'banco' | 'auth' | 'pagamento' | 'mensagens' | 'arquivos' | 'medicao' | 'ia';
export interface SinalServico {
  id: string;            // 'vercel', 'supabase', 'stripe'…
  nome: string;
  assunto: Assunto;
  config?: string[];     // nomes de arquivo: 'vercel.json', 'wrangler.toml'
  deps?: string[];       // pacotes: '@supabase/supabase-js', 'stripe'
  env?: string[];        // regex de nome de variável: '^STRIPE_', 'SUPABASE_URL$'
  codigo?: string[];     // regex de uso: "from ['\"]stripe['\"]", 'api\\.mercadopago\\.com'
}
export interface Achado { servico: string; nome: string; assunto: Assunto; grau: 'confirmado' | 'indicio'; provas: Array<{ tipo: 'config' | 'dep' | 'env' | 'codigo'; arquivo: string; linha?: number; trecho?: string }> }
```

Serviços mínimos do catálogo:

| Assunto | Serviços |
|---|---|
| deploy | Vercel, Netlify, Cloudflare (Pages, Workers), Fly, Render, Railway, Firebase Hosting, Docker, Expo EAS, GitHub Actions |
| banco | Supabase, Firebase, Postgres, MySQL, MongoDB, SQLite, Redis, Prisma, Drizzle |
| auth | Supabase Auth, Firebase Auth, Clerk, Auth0, NextAuth |
| pagamento | Stripe, Mercado Pago, PagBank, Asaas, Pagar.me, PayPal, Hotmart, Kiwify |
| mensagens | Resend, SendGrid, Twilio, API do WhatsApp |
| arquivos | S3, Cloudflare R2, Cloudinary, Supabase Storage |
| medicao | Google Analytics, Meta Pixel, PostHog, Sentry |
| ia | OpenAI, Anthropic, Gemini |

**`detectores.ts`**: `detectar(root): Levantamento`.

- Caminha a pasta inteira pulando `SURVEY_SKIP_DIRS` (exporte a constante de `project-fs.ts` ou mova para `shared`). **Sem corte de 2.500 arquivos.** Conteúdo só é lido em arquivo de texto de até 512 KB.
- Lê todos os manifestos (`package.json` em qualquer nível, `pubspec.yaml`, `requirements.txt`, `pyproject.toml`, `go.mod`, `composer.json`, `Gemfile`): dependências com versão e scripts de build, teste e dev.
- De `.env*` lê **só os nomes** das variáveis. Nenhum valor entra em nenhum arquivo de saída. `trecho` de prova de código passa por `maskSecret`.
- Grau: `confirmado` com dois tipos de prova ou mais; `indicio` com um só.
- Repositórios: remotes, branch, último commit, submódulos, monorepo (`workspaces`, `pnpm-workspace.yaml`, `melos.yaml`).
- Sinais de design system: `tailwind.config.*` e tema, arquivos com variáveis CSS (`--`), fontes declaradas, biblioteca de componentes (shadcn, MUI, Chakra, Radix, Material do Flutter).
- Sugestão de nome: nome do repositório no remote, senão `name` do manifesto, senão título do README, senão nome da pasta.

**`retrato.ts`**: grava `.tavir/retrato.json`:

```ts
export interface Retrato {
  versao: 1; projeto: string; lido_em: string; commit: string | null;
  stack: string[]; linguagens: Array<{ nome: string; arquivos: number }>;
  servicos: Achado[];
  repositorios: Array<{ remote: string; branch: string; ultimo: string }>; monorepo: string[];
  dependencias: Array<{ manifesto: string; total: number; principais: string[] }>;
  comandos: Array<{ manifesto: string; nome: string; comando: string }>;
  env: string[];                      // só nomes
  designSystem: { sinais: string[] };
  cobertura: Array<{ pasta: string; arquivos: number; situacao: 'lida' | 'parcial' | 'nao_lida' }>;
  passos: Array<{ id: string; situacao: 'a_fazer' | 'rodando' | 'ok' | 'incompleto'; doc?: string; motivo?: string; runId?: string }>;
  aprovado?: { em: string; nota?: string };
}
```

**Exclusão do git do cliente**: função `garantirExclude(root)` que acrescenta ao `.git/info/exclude`, sem duplicar, `.tavir/`, `context/`, `memory/`, `qa/` e `.env.project`. Chamada na absorção e ao gravar o primeiro chamado de um projeto antigo. Não mexe no `.gitignore`.

**Compatibilidade**: `surveyWorkspace` continua existindo e passa a montar o resumo a partir de `detectar`, para as telas e a esteira que já leem `survey` não quebrarem.

**Testes** (`tests/unit/absorcaoDetectores.spec.ts`), com pastas montadas em `os.tmpdir()`:

- Next + Supabase + Stripe (dependência, uso no código e `.env.example`): os três saem `confirmado`, com `arquivo:linha`.
- Só `MERCADOPAGO_ACCESS_TOKEN` num `.env`: sai `indicio`.
- Flutter + Firebase; site estático com `netlify.toml`.
- Valor de `.env` não aparece em `retrato.json` (procure o valor no JSON inteiro).
- Pasta com mais de 2.500 arquivos é lida por completo.
- `garantirExclude` é idempotente.

**Aceite no app**: absorver um projeto real e ver, na aba Visão geral, os serviços com prova e grau.

### A2 · Entrada: link do GitHub, escopo e cópia

**`entrada.ts`**:

- `clonar({ url, accountId, destino })`: `git clone` com o token da conta do cofre via `gitAuthEnv`, sem gravar token na URL do remote. Toda mensagem de erro passa por `scrubToken`. Aceita `https://github.com/dono/repo(.git)` e `git@github.com:dono/repo.git`; outro formato vira erro claro.
- `copiarPasta({ origem, destino })`: cópia recursiva pulando `SURVEY_SKIP_DIRS`. **Mantém `.git`** (precisa do histórico) e os `.env`. A origem não é tocada. Destino já existente e não vazio é erro, nunca sobrescrita.
- `destinoDoEscopo(ownership, nome)`: `tavir-interno/<slug>` ou `tavir-externo/<slug>`. Corrija `tavir-exterrno` em `project-fs.ts:855`. Se a pasta antiga existir no disco com projetos, não mova nada: os registros antigos continuam apontando para onde estão.
- `preencher(origem)`: roda `detectar` na origem (ou logo depois do clone) e devolve nome sugerido, stack, família de esteira sugerida e contagens.

**Tela**: o modal ganha a escolha de origem no primeiro passo.

- **Link do GitHub**: campo do link e seletor da conta do cofre (`listGitAccounts`); sem conta cadastrada, aviso com atalho para Contas e cofre.
- **Pasta no computador**: campo, botão «Escolher pasta» (`projects.pickFolder`) e as últimas pastas absorvidas de verdade (dos projetos do banco). Remova os três caminhos fixos.
- Campos comuns: **nome** (preenchido), **cliente**, **escopo** (interno ou externo).
- Passos do modal: Origem → Preparar (clonar ou copiar, com log real) → Leitura (A3) → Retrato.
- A escolha de esteira sai do modal de absorção: projeto absorvido não percorre esteira (D1). O `template_code` continua gravado pela família detectada.

**IPC**: `projects:absorbPrepare` (clona ou copia e devolve o preenchimento) e `projects:absorb` (já existe; passa a receber `ownership`, `company`, `repo_url`, `git_account_id` e o destino já preparado).

**Testes** (`tests/unit/absorcaoEntrada.spec.ts`): leitura dos dois formatos de link; `copiarPasta` pula `node_modules`, mantém `.git` e `.env`, e não toca a origem; destino ocupado recusa; `destinoDoEscopo` usa `tavir-externo`; clone de um repositório local criado no teste (`git init` + `git clone` por caminho) cai na pasta do escopo.

**Aceite no app**: colar o link de um repositório, escolher externo e ver a pasta em `tavir-externo/` com o nome preenchido.

### A3 · Leitura pelo squad Product Lab, retrato e gate

**`leitura.ts`**. Sete passos em sequência. Cada um chama `converseWithIrisAgent` em **só leitura** (`asChangeRequest: false`), com `runKind` próprio (acrescente `absorcao` ao tipo em `runLedger.ts`), `timeoutMs` de 900.000 por passo e o motor do projeto (`projectEngineSpec`). O agente devolve o documento; o Escritório grava em `context/`.

| Passo | Papel | Documento | Seções obrigatórias (`##`) |
|---|---|---|---|
| `produto` | Dora | `context/produto.md` | O que é · Para quem · Fluxos principais · Telas e rotas |
| `arquitetura` | Ari | `context/arquitetura.md` | Visão geral · Módulos · Caminho de um pedido · Pontos de extensão |
| `dados` | Ari | `context/dados.md` | Onde fica o banco · Tabelas e modelos · Migrações · Regras de acesso |
| `design` | Enzo | `context/design-system.md` | Cores · Tipografia · Espaçamento e grade · Componentes · Padrões de tela |
| `ambiente` | Ari | `context/ambiente.md` | Como instalar e rodar · Testes · Build e deploy · Variáveis necessárias · CI |
| `integracoes` | Ari | `context/integracoes.md` | Serviços confirmados · Serviços descartados · Pagamento · Webhooks |
| `riscos` | Dora | `context/riscos.md` | Quebrado · Sem teste · Desatualizado · Perigoso |

Pedido de cada passo (`runKind: 'absorcao'`), nesta ordem:

1. Papel e objetivo do passo.
2. Regras: só leitura; toda afirmação cita o arquivo entre crases (`caminho/relativo.ext` ou `caminho/relativo.ext:linha`); «não encontrei» vale, desde que diga onde procurou; nunca copiar valor de segredo; responder só com o documento, usando exatamente os títulos pedidos.
3. Achados da camada 1 do assunto (`retrato.json`).
4. Os documentos dos passos anteriores, cortados em 3.000 caracteres cada.
5. No passo `integracoes`: a lista de indícios, pedindo «confirmado» ou «descartado» para cada um, com prova.
6. No passo `riscos`: pedir até oito problemas no bloco `CHAMADO:` (formato em B4).

**Checagem de cada passo** (função pura `conferirDocumento(root, texto, secoes)`):

- Seção obrigatória faltando reprova.
- Extrai os caminhos citados entre crases e confere um a um se existem na pasta. Caminho inexistente reprova.
- Menos de cinco citações válidas reprova, a não ser que o documento declare que não encontrou e diga onde procurou.
- Reprovado: roda de novo **uma vez**, com a lista do que falhou no pedido. Se falhar de novo, grava o documento com a marca «citação não conferida» nos caminhos ruins e o passo fica `incompleto`, com o motivo. O fluxo segue para o próximo passo.
- Passo `integracoes`: atualiza o grau dos serviços em `retrato.json`. Só vira `confirmado` o que tiver prova de código conferida; o resto fica `indicio` e aparece como «a confirmar».

**Cobertura**: para cada pasta de primeiro nível (e segundo nível dentro de `src`, `app`, `lib`, `packages`), conta os arquivos citados nos sete documentos. `lida` com três citações ou 30% dos arquivos, `parcial` com uma, `nao_lida` com zero.

**`context/RETRATO.md`**: escrito pelo Escritório, sem motor, a partir de `retrato.json` e do primeiro parágrafo de cada documento: o que é, stack, serviços por assunto (com «a confirmar» quando for indício), onde publica, onde está o banco, pagamento, comandos, cobertura e link para os sete documentos. Uma função `resumoDoRetrato(root, max = 3000)` devolve o texto que vai para os agentes.

**`fluxo.ts`**: a absorção é uma sequência com estado em `.tavir/absorcao.json`: `preparar` → `detectores` → os sete passos → `retrato` → `acessos` → `gate`. Cada etapa grava início, fim, situação e `runId`. Interrompida, retoma da etapa em que parou (`projects:absorbResume`). O andamento vai para a tela por `run:event`, como no `askIris` (`ipc.ts:753`), e o log do modal leva `data-tv-follow`. «Parar» mata o motor atual e deixa o fluxo retomável.

**Gate do retrato** (`projects:absorbDecide`, `aprovado` ou `reprovado`, nota):

- Aprovado: `logDecision` com tipo `absorcao` (estenda `DecisionEntry.kind`); `retrato.aprovado` preenchido; o projeto passa a encerrado no banco (`status = 'done'`, `stages_done = total_stages`), cada etapa da esteira recebe a nota «Coberta pela absorção: ver context/RETRATO.md» e situação concluída (use `readEsteira` e `writeEsteira`), e `setProjectAlterationsOpen(root, true)` libera o trilho. É o gate do Carlos que fecha essas etapas, nunca o motor.
- Reprovado: a nota entra em `context/correcoes.md`, vai no pedido dos passos refeitos e prevalece sobre o texto do agente. A tela deixa escolher quais passos rodar de novo.

**QA e Segurança como pendência (D1)**: a absorção nova **não chama** `scheduleBaseline`. Grava em `.tavir/absorcao.json` as pendências `qa` e `seg` como `a_fazer`. Elas entram na contagem de pendências da Visão geral e aparecem no topo das abas QA e Segurança com «Rodar retrato inicial», que chama `runProjectQa` e `runProjectSeg` e marca a pendência feita quando a execução terminar. `baseline: false` continua valendo nos testes.

**Tela**: passo «Leitura» do modal com os sete passos, situação de cada um e a fala atual do agente recolhida (`TavirReader.trail`). Fechar o modal não interrompe: o cartão do projeto no painel mostra «em absorção · passo N de 7» e reabre o acompanhamento. Passo «Retrato»: `RETRATO.md` formatado (`TavirReader.blocks`), serviços com grau e prova, cobertura por pasta, passos incompletos com o motivo, e os botões «Aprovar retrato» e «Pedir correção».

**Testes** (`tests/unit/absorcaoLeitura.spec.ts`), com o motor trocado por uma função falsa:

- `conferirDocumento`: seção faltando, caminho inexistente e poucas citações reprovam; documento correto passa; «não encontrei» com o lugar procurado passa.
- Uma repetição só; segunda falha vira `incompleto` e o fluxo continua.
- Indício não confirmado continua `indicio` no retrato.
- Cobertura calculada pelas citações.
- Fluxo interrompido retoma no passo certo.
- Aprovar o retrato encerra o projeto e libera o trilho; a resposta do motor sozinha não muda `status`.
- Pendências `qa` e `seg` nascem `a_fazer` e `scheduleBaseline` não é chamado.

**Aceite no app**: absorver um projeto que o Carlos conhece, ver os sete passos andarem, conferir o retrato e aprovar. `npm run test:motores` nos quatro.

### A4 · Cartões de acesso por projeto

**Catálogo** em `src/shared/acessos.ts`, uma entrada por serviço do catálogo de A1 que precise de credencial:

```ts
export interface GuiaAcesso {
  servico: string; nome: string;
  campos: Array<{ chave: string; rotulo: string; segredo: boolean; exemplo?: string }>;
  onde: { url: string; passos: string[] };   // onde conseguir, em 3 a 6 passos
  pedidoAoCliente: string;                   // mensagem pronta para copiar
  confere?: 'vercel' | 'supabase' | 'netlify' | 'github';
}
```

Conteúdo mínimo:

| Serviço | Campos | Onde conseguir |
|---|---|---|
| GitHub | conta do cofre com escrita no repositório | `https://github.com/settings/tokens` |
| Vercel | token, projeto | `https://vercel.com/account/settings/tokens` |
| Netlify | token, site | `https://app.netlify.com/user/applications#personal-access-tokens` |
| Supabase | URL do projeto, chave de serviço, senha do banco | `https://supabase.com/dashboard/account/tokens` e Configurações › API do projeto |
| Cloudflare | token da API, conta, zona | `https://dash.cloudflare.com/profile/api-tokens` |
| Firebase | conta de serviço (JSON), projeto | `https://console.firebase.google.com/` › Configurações › Contas de serviço |
| Stripe | chave de teste, chave de produção, segredo do webhook | `https://dashboard.stripe.com/apikeys` |
| Mercado Pago | access token de teste e de produção, segredo do webhook | `https://www.mercadopago.com.br/developers/panel/app` |
| Resend | chave da API | `https://resend.com/api-keys` |
| OpenAI | chave da API | `https://platform.openai.com/api-keys` |
| Anthropic | chave da API | `https://console.anthropic.com/settings/keys` |

Reaproveite os `tokenUrl` que já estão em `credentials.ts`. **Antes de fechar a fase, abra cada endereço no navegador e corrija o que não abrir.** Serviço sem guia mostra só o campo genérico. `pedidoAoCliente` é um texto curto que diz o que pedir e onde o cliente acha, pronto para colar no WhatsApp ou no e-mail.

**`src/main/acessos.ts`**:

- `gerarCartoes(root)`: um cartão por serviço de `retrato.json` (confirmado ou indício) mais o do GitHub. Estado em `.tavir/acessos.json`: `{ servico, motivo (a prova do retrato), situacao: 'pendente' | 'preenchido' | 'pedir_ao_cliente' | 'nao_se_aplica', campos: { chave: { preenchido, previa, atualizado_em } }, nota }`. Rodar de novo acrescenta serviço novo e não apaga o que já foi preenchido.
- Segredo cifrado com `cifrar` em `.tavir/credentials.json` do projeto, por serviço e campo. A tela recebe só a prévia mascarada. `lerSegredoDoProjeto(root, servico, chave)` só existe no processo main.
- Conferência: Vercel, Supabase, Netlify e GitHub usam os verificadores atuais. Os outros ficam «preenchido, sem conferência».
- O segredo **nunca** entra no pedido a um agente nem em log.

**IPC**: `projects:acessos` (lista), `projects:acessoSalvar`, `projects:acessoSituacao`, `projects:acessoRemover`.

**Tela** (aba Acessos, mesmo desenho): os cartões passam a vir de `projects:acessos`. Cada cartão mostra serviço, por que foi aberto (com a prova), campos que faltam e situação. Botões: **«Onde conseguir»** (abre os passos no próprio cartão, com o link que abre no navegador), **«Copiar pedido ao cliente»**, «Salvar», «Não se aplica». Filtros por situação. O número da aba conta os pendentes.

**Testes** (`tests/unit/acessos.spec.ts`): cartões nascem dos serviços do retrato; gerar de novo preserva o preenchido; o valor salvo não aparece em claro em `acessos.json`, em `credentials.json` nem no retorno da listagem; credencial do projeto A não é lida pelo projeto B; todo serviço do catálogo de A1 que pede credencial tem guia com endereço e passos.

**Aceite no app**: abrir a aba Acessos de um projeto absorvido, usar «Onde conseguir» da Vercel, salvar um token e ver que outro projeto não o mostra.

### A5 · Retrato em uso, atualização e isolamento

- **Retrato no pedido**: `askProjectIris` e `executeAltTrackStep` passam `resumoDoRetrato(root)` em `projectFacts` (ou num bloco próprio «Retrato do projeto»). Confira `historyBudget`: o retrato não entra no histórico e o tamanho enviado tem teto fixo.
- **«Atualizar retrato»**: compara `retrato.commit` com o `HEAD`. Com mudança, a Visão geral mostra o aviso e o botão. A atualização roda os detectores de novo e refaz só os passos cujas pastas mudaram (pelo `git diff --name-only`); os cartões de acesso ganham os serviços novos.
- **Teste de isolamento** (`tests/unit/isolamentoProjeto.spec.ts`): com dois projetos de exemplo, monte o pedido da Íris para um (`buildPrompt`) e confira que não aparece nome, caminho nem trecho do retrato do outro. Confira que chamados, acessos e retrato de um não são listados pelo outro.
- **Documentação**: seção nova em `docs/modules/fabrica.md` (absorção, retrato, acessos) e item no `CLAUDE.md`, sem tocar na seção 7.

## 5. Parte B · Chamados

Arquivos novos: `src/shared/chamados.ts` (tipos, rótulos, transições) e `src/main/chamados.ts` (disco e regras).

### B1 · Guardar

**Onde**: `<projeto>/.tavir/chamados/CH-0001/chamado.json`, com os anexos em `CH-0001/anexos/`. Numeração por projeto (maior existente + 1, quatro dígitos). Chamado nunca é apagado do disco. `garantirExclude` roda ao gravar o primeiro.

**Formato**:

```ts
export type TipoChamado = 'bug' | 'melhoria' | 'duvida';
export type Prioridade = 'urgente' | 'alta' | 'media' | 'baixa';
export type Situacao = 'aberto' | 'em_refinamento' | 'pronto' | 'em_execucao' | 'aguardando_validacao' | 'concluido' | 'recusado';
export interface Chamado {
  id: string; tipo: TipoChamado; titulo: string;
  descricao: { a: string; b: string; c: string };
  prioridade: Prioridade; situacao: Situacao;
  autor: { tipo: 'ceo' | 'agente'; nome: string; motor?: string; runId?: string; origem?: 'formulario' | 'conversa' | 'varredura' | 'absorcao' | 'trilho' };
  anexos: Array<{ name: string; rel: string; kind: string; size: number }>;
  refinamento: { criterios: string[]; notas: string; perguntas: string[] };
  ciclo?: { n: number; branch?: string; pr?: string };
  resposta?: string;
  historico: Array<{ at: string; quem: string; acao: string; de?: Situacao; para?: Situacao; nota?: string }>;
  criado_em: string; atualizado_em: string;
}
```

Rótulos dos três campos por tipo (`ROTULOS_DESCRICAO`): bug: «O que acontece», «O que era esperado», «Como reproduzir». Melhoria: «O que mudar», «Por quê», «Como saber que ficou pronto». Dúvida: «Pergunta», «Contexto» (terceiro oculto).

**Transições** (`podeMover(de, para, quem)`), em `shared`:

| Para | De | Quem | Condição |
|---|---|---|---|
| `aberto` | (criação) | Carlos ou agente | título obrigatório |
| `em_refinamento` | `aberto` | Carlos | |
| `pronto` | `aberto`, `em_refinamento`, `aguardando_validacao` | Carlos | título, descrição e ao menos um critério de aceite; vindo de `aguardando_validacao` é reprovação e exige nota |
| `em_execucao` | `pronto` | Carlos | B3 |
| `aguardando_validacao` | `em_execucao` | **só o Escritório**, depois dos portões | nunca por motor nem por clique |
| `concluido` | `aguardando_validacao` | Carlos | gate; dúvida pode concluir de `aberto` ou `em_refinamento` com `resposta` preenchida |
| `recusado` | qualquer uma antes de `em_execucao` | Carlos | motivo obrigatório |

`quem` é `'ceo' | 'escritorio' | 'agente'`. `agente` só cria. Toda mudança acrescenta linha no `historico`.

**Funções** em `src/main/chamados.ts`: `criarChamado`, `lerChamado`, `listarChamados`, `editarChamado` (campos de texto, prioridade, tipo), `moverChamado`, `anexarAoChamado` (use `saveAttachments` com um parâmetro novo de pasta de destino, mantendo o comportamento atual quando ele não vier), `contarChamados(root)` (por situação, mais «aguardando o Carlos» = `aguardando_validacao` + abertos por agente ainda em `aberto`), `tituloDuplicado(root, titulo)` (igual ignorando caixa e acento, entre os não fechados).

**IPC**: `projects:chamados`, `projects:chamado`, `projects:chamadoCriar`, `projects:chamadoEditar`, `projects:chamadoMover`, `projects:chamadoAnexar`, `projects:chamadosContagem`.

Os problemas que o passo `riscos` da absorção devolveu entram aqui como chamados `aberto`, com `autor.origem = 'absorcao'`.

**Testes** (`tests/unit/chamados.spec.ts`): numeração em sequência; cada linha da tabela de transições, incluindo as proibidas (`agente` não move, ninguém além do `escritorio` leva a `aguardando_validacao`, `pronto` sem critério recusa, `recusado` sem motivo recusa); histórico cresce a cada mudança; anexo vai para a pasta do chamado; duplicado detectado; contagem.

### B2 · Abrir e ver

- **Botão do topo** (`Fabrica.dc.html:295`): vira **«Abrir chamado»**, classe primária, e abre o formulário. O modal de texto livre (`:1150`) é substituído.
- **Aba «Chamados»** em `ptabs` (`:2781`), depois de Trilho, com o número de não fechados e destaque quando houver algo aguardando o Carlos.
  - **Lista**: id, ícone do tipo, título, prioridade, situação, quem abriu (marca «aberto pela Íris» para agente) e idade. Filtros em chips: Abertos, Em refinamento, Prontos, Em execução, Aguardando você, Fechados. Filtro por tipo. Ordenação por prioridade (padrão), mais recente e mais antigo. Busca por texto.
  - **Detalhe** em painel lateral: os três campos com o rótulo do tipo (`TavirReader.blocks`), miniaturas dos anexos (clique amplia), critérios de aceite, histórico recolhido, ligação com o ciclo e o botão da próxima ação conforme a situação.
  - **Formulário** (abrir e editar): tipo, título, prioridade e os três campos. O contêiner leva `data-tv-attach`, e Ctrl+V, arrastar e «Anexar arquivo» funcionam com `addAttachFiles`. Use uma chave de anexos própria do formulário para não misturar com os anexos pendentes do chat.
- **Painel da Fábrica**: em cada cartão de projeto, «N chamados», com destaque quando houver algo aguardando o Carlos. No topo, o total aguardando decisão.
- Estado vazio da aba: uma frase e o botão «Abrir chamado».

**Aceite no app**: abrir um bug com print colado, fechar o app, reabrir e ver o chamado com a imagem.

### B3 · Refinar e executar

**Refinar**: «Pedir refinamento à Íris» no detalhe chama `converseWithIrisAgent` em só leitura com o chamado, o resumo do retrato e o pedido de devolver o bloco:

```
REFINAMENTO:
criterios:
- …
perguntas:
- …
notas: …
```

`parseRefinamento` lê o bloco e a tela mostra como **sugestão**: o Carlos aceita critério a critério e responde as perguntas. Nada entra no chamado sem o clique dele.

**Executar** (`projects:chamadoExecutar`), com o chamado em `pronto`:

- Projeto absorvido sem retrato aprovado: recusa com a mensagem «Aprove o retrato do projeto antes de executar chamados.»
- Projeto encerrado (o caso normal de manutenção):
  1. Trilho fechado: `setProjectAlterationsOpen(root, true)` (o clique do Carlos é a liberação).
  2. Trilho ocupado (ciclo com conteúdo e não concluído): recusa dizendo qual chamado está na frente. Ciclo concluído: `startNewAltTrackCycle`.
  3. Preenche a nota de «Mapear gaps» com o chamado: id, tipo, título, os três campos, critérios de aceite, notas do refinamento, orientações de reprovações anteriores e caminhos dos anexos (`attachmentsPrompt`).
  4. Grava `alt_track.title = 'CH-0007 · <título>'` e `alt_track.chamados = ['CH-0007']`. **Acrescente `chamados` a `AltTrackState`, a `normalizeAltTrack` e ao registro de `cycles`**, senão o campo se perde na próxima leitura.
  5. `advanceProjectAltTrack` para o foco ir a «Planejar». Planejar, Ajustar, portões, branch e publicação seguem como hoje.
  6. Chamado → `em_execucao`, com `ciclo.n`.
- Projeto ainda em esteira (criado do zero): «Executar» chama `askProjectIris` com `asChangeRequest: true` e o texto do chamado, e ao terminar **sem erro** o chamado vai para `aguardando_validacao`. O fechamento continua sendo o gate do Carlos.

**Aguardando validação**: função `aoFecharCicloDoTrilho(root, track)` em `chamados.ts`, chamada em dois lugares de `project-fs.ts`: onde `executeAltTrackStep` marca `runStatus = 'done'` depois de os portões passarem (`:2596`), e em `closeProjectAltTrackItem` quando o Carlos encerra o último item à mão. Ela move para `aguardando_validacao`, como `escritorio`, os chamados de `track.chamados`, e preenche `ciclo.branch` e `ciclo.pr`. Com portão reprovado o ciclo não chega a `done` e o chamado fica em `em_execucao`.

**Gate do chamado** (`projects:chamadoDecidir`): aprovar → `concluido`, com `logDecision` tipo `chamado`. Reprovar exige nota → volta a `pronto`, a nota fica no histórico e vai no «Mapear gaps» da próxima execução.

**Dúvida**: «Perguntar à Íris» responde em só leitura, a resposta fica em `resposta` e o Carlos conclui. Não passa pelo trilho.

**Recusar**: de qualquer situação antes de executar, com motivo.

**Aba Trilho**: quando `alt_track.chamados` existir, o cabeçalho mostra `CH-0007 · título` com atalho para o chamado.

**Testes** (`tests/unit/chamadosFluxo.spec.ts`, com motor falso e `baseline: false`): executar preenche «Mapear gaps», o título e `chamados`, e o campo sobrevive a `normalizeAltTrack`; trilho ocupado recusa; projeto absorvido sem retrato aprovado recusa; resposta do motor sozinha não leva a `aguardando_validacao`; com portão reprovado o chamado continua `em_execucao`; ciclo fechado leva a `aguardando_validacao`; aprovar grava em `decisoes.jsonl`; reprovar sem nota recusa.

**Aceite no app**: levar um chamado de aberto a concluído num projeto de teste. `npm run test:motores` nos quatro.

### B4 · Íris e agentes abrem chamado

**Formato** que o agente escreve no fim da resposta (até cinco por resposta de conversa, até oito na absorção e na varredura):

```
CHAMADO:
tipo: bug
titulo: Total do pedido ignora o desconto do cupom
prioridade: alta
acontece: Com cupom aplicado, o total mostra o valor cheio.
esperado: Total = subtotal - desconto.
reproduzir: 1) Adicionar item 2) Aplicar cupom TESTE10 3) Ver o total
evidencia: src/cart/total.ts:42
```

Em melhoria, as mesmas três chaves valem para «o que mudar», «por quê» e «como saber que ficou pronto».

**`parseChamados(reply)`** em `chamados.ts`: devolve as propostas válidas, o texto sem os blocos e os avisos do que foi descartado (tipo ou prioridade fora da taxonomia, título vazio, campo maior que 4.000 caracteres). `evidencia` com caminho inexistente não derruba a proposta: fica marcada «evidência não conferida».

**Prompt da Íris** (`irisAgent.ts:143`): sai a frase que manda usar «Pedir alteração». Entra: quando a conversa chegar a um pedido de mudança, defeito ou melhoria, explicar em poucas linhas e terminar com o bloco `CHAMADO:` preenchido com o que foi conversado; não escrever o bloco em pergunta simples. Atualize a saudação (`project-fs.ts:2745`) e os avisos de tela que citam «Pedir alteração».

**Depois da resposta** (em `askProjectIris`):

1. `parseChamados` na resposta. O que é gravado em `.tavir/iris-chat.json` e mostrado é o **texto sem os blocos**; as propostas vão num campo próprio da mensagem (`propostas`). Assim o histórico enviado ao motor não cresce (`historyBudget`).
2. **Conversa normal**: cada proposta aparece como cartão abaixo da resposta, com tipo, título, prioridade, os três campos e os botões «Abrir chamado» (grava com `autor.tipo = 'agente'`, `origem = 'conversa'`, e os anexos da mensagem do Carlos que originou), «Editar antes» (abre o formulário preenchido) e «Descartar».
3. **Varredura pedida**: botão «Procurar melhorias» na aba Chamados, que envia um pedido fixo de varredura com `varredura: true`. As propostas válidas viram chamados `aberto` direto, com `origem = 'varredura'`, motor e `runId`.
4. Duplicado (`tituloDuplicado`): não cria; acrescenta ao histórico do existente «a Íris apontou de novo em <data>».

`CHANGE_REQUESTS.md` deixa de receber pedido novo: `absorbChangeRequest` sai do caminho do chamado e o arquivo antigo fica como histórico. Não migre texto solto.

**Testes** (`tests/unit/chamadosAgente.spec.ts`): `parseChamados` com um bloco, com vários, com bloco torto, com tipo inválido e sem bloco; o texto devolvido não tem o bloco; varredura grava direto e conversa só propõe; duplicado vira linha de histórico; `buildPrompt` em só leitura não cita «Pedir alteração» e cita `CHAMADO:`; `historyBudget` não aumenta com as propostas.

**Aceite no app**: conversar sobre um defeito e abrir pelo cartão; rodar «Procurar melhorias» e ver os chamados na fila. `npm run test:motores` nos quatro.

### B5 · Acabamento

- Agente de etapa do trilho (Paula, QA) pode fechar a resposta com `CHAMADO:` para o que achar fora do escopo: vira chamado `aberto` com `origem = 'trilho'`, sem parar o ciclo.
- `docs/modules/fabrica.md` (seção Chamados) e item no `CLAUDE.md`, sem tocar na seção 7.
- Mapa das linhas de pt-BR da tela revisado: nenhuma menção restante a «Pedir alteração».

## 6. Canais de abertura de chamado (resposta à D2)

Não há plataforma externa nesta entrega. O chamado nasce dentro do Escritório, por três caminhos:

1. **Formulário**: botão «Abrir chamado» no projeto (B2).
2. **Íris**: ela propõe o chamado na conversa e o Carlos confirma (B4).
3. **Agentes**: varredura pedida, absorção e agentes do trilho (A3, B4, B5).

Próximos canais, fora de hoje, na ordem recomendada:

- **App TAVIR (APK)**: o caminho já existe. O APK grava pedidos em `office_commands` e o Escritório os aplica (`officeCloud.ts`). Um tipo novo `chamado.create`, com projeto, tipo, título, descrição e fotos, vira chamado `aberto` com `origem = 'apk'`. É o segundo canal natural: abrir um bug pelo celular com foto da tela. Precisa de mudança no APK, que é outro projeto.
- **Portal do cliente**: o cliente abrindo chamado sozinho pede login, separação por cliente e triagem antes de entrar na fila. Vale quando houver clientes pagando manutenção.
- **E-mail**: não recomendado. Chega sem estrutura e exige leitura de caixa de entrada; o formulário e o APK cobrem o mesmo uso com menos risco.

## 7. Ordem de hoje e cortes

Ordem: **Fase 0 → A1 → A2 → A3 → A4 → B1 → B2 → B3 → B4 → A5 → B5.**

São dez fases para um dia. Se o tempo apertar, corte nesta ordem, sem quebrar o roteiro de aceite da seção 0:

| Corte | O que sai | O que fica valendo |
|---|---|---|
| 1 | B5 inteira | chamado por agente de trilho fica para depois |
| 2 | «Atualizar retrato» (A5) | retrato no pedido e teste de isolamento ficam |
| 3 | Busca por texto e ordenações extras da lista (B2) | filtros por situação e ordenação por prioridade ficam |
| 4 | Guias de acesso além de GitHub, Vercel, Netlify, Supabase, Cloudflare, Stripe e Mercado Pago (A4) | os demais mostram campo genérico |
| 5 | Refazer passos escolhidos na reprovação do retrato (A3) | reprovar refaz os sete |

Não corte: checagem de citação, gate do retrato, credencial por projeto, tabela de transições, passagem a «aguardando validação» só pelos portões, testes de cada fase.

Ao fim de cada fase, relate em três linhas: o que entrou, o que foi verificado no app, o que ficou fora.

## 8. Fica para depois

Vários chamados no mesmo ciclo; comentários em conversa dentro do chamado; visão de chamados de todos os projetos; quadro kanban de chamados; abrir chamado pelo APK e portal do cliente (seção 6); exportar a fila para o cliente na entrega; ligação entre chamados; métricas; o Escritório usar a credencial do cartão para fazer deploy e migração sozinho; ler o painel do provedor pela API para cruzar com o código; conferência na API para Stripe, Mercado Pago e Cloudflare; reabsorver em lote os projetos que já estão na Fábrica.
