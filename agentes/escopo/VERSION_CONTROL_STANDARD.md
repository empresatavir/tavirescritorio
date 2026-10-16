# Padrão pétreo de controle de mudança — versionamento, PR e aprovação de deploy

Este padrão existe para o problema que o Carlos descreveu de dentro de uma operação real: erro
corrigido que volta versões depois, correção de bug feita de forma ineficiente, controle de
versão falho, documentação técnica ausente para quem sustenta o sistema. Nenhuma dessas falhas
é sobre talento — são sobre **processo ausente**. Este padrão é o processo.

Complementa `.agents/DELIVERY_DOCUMENTATION_STANDARD.md` (o que se documenta) com **como a
mudança entra no sistema com segurança e rastro**. Os dois juntos evitam a mesma dor: sistema
que ninguém mais entende como foi construído nem por que quebrou de novo.

## Aplicabilidade

**Obrigatório** para todo sistema de escopo fechado entregue a cliente externo que a TAVIR vai
sustentar — CRM white-label (por cliente), e-commerce headless, SaaS, e qualquer produto onde
"a próxima pessoa a mexer" pode não ser quem construiu. O Arquiteto/CTO declara a aplicabilidade
no parecer técnico do projeto e no `PROJECT.md`.

**Simplificado, mas nunca ausente:** ferramenta interna pequena, script, protótipo de prova
visual — branch protegida e `CHANGELOG.md` são baratos o suficiente para valer sempre; PR
formal com revisão de terceiro pode ser dispensado com justificativa registrada no `PROJECT.md`.

**Exceção nomeada — Escritório Virtual (Hub V2, frente F1):** o caso concreto deste tier
simplificado é o Escritório. Escopo restrito a `escritorio/`, `tools/office.py` e
`tools/test_*.py`. Commit direto em `main` é permitido só sob as três condições simultâneas:
`escritorio/CHANGELOG.md` atualizado, suíte `tools/test_*.py` verde (local ou via CI) e
mudança restrita a esses caminhos. Qualquer arquivo fora desse escopo — inclusive os próprios
documentos de governança (`CLAUDE.md`, `AGENTS.md`, este arquivo) — segue o fluxo padrão
(branch + PR + revisão humana), mesmo quando editado na mesma tarefa. Justificativa formal
registrada em `escritorio/PROJECT.md`.

**Operação interna da TAVIR:** este padrão também rege o repositório `AgenciaIA` e todos os
seus braços, exceto a exceção nomeada acima. Velocidade operacional não justifica commit ou
push direto em `main` fora dela. O Escritório Virtual mantém a fila local de propostas em
**Alterações**, com resumo, arquivos, evidências, risco e decisão humana registrada. A ausência
de GitHub CLI/token apenas torna a abertura do PR manual; nunca libera push direto para a
branch protegida (fora da exceção nomeada acima).

## Contrato de repositório externo e responsáveis nomeados

Em repositório de cliente ou parceiro, o risco não é só uma regressão: é alterar o sistema, a
conta ou a produção errada. Antes do primeiro `branch`, `commit`, `push`, PR, migração ou deploy,
o projeto mantém `AMBIENTE.md` completo e validado. Além do contrato de acesso, ele declara:

| Papel | Responsabilidade | Pode acumular? |
|---|---|---|
| Implementador | cria branch, altera e evidencia testes | não com revisor da mesma proposta |
| Revisor | confere diff, regra, regressão, documentação e risco | não com implementador |
| Mesclador | verifica aprovação e integra na branch protegida | nomeado no `AMBIENTE.md`; agente nunca assume esse papel |
| Dono de deploy | libera a versão aprovada e registra resultado | pode ser DevOps, mas não aprova o próprio deploy |
| Dono do repositório | responde por organização, proteção de branch e acessos | pode ser Carlos ou cliente explicitamente indicado |

O PR informa esses cinco campos por nome/papel, a URL exata de `origin`, branch-base e destino.
Se qualquer campo estiver ausente, se `origin` divergir, se a branch protegida não for a declarada
ou se a autorização não alcançar aquele repositório, **parar**. Nunca reaproveitar a autorização
ou identidade de um projeto para outro.

Antes da mutação, registrar as provas abaixo no PR ou na solicitação **Alterações**:

```text
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --porcelain
git fetch origin <branch-base>
```

Worktree sujo não é atalho: é um estado a isolar. É proibido aplicar `pull`, rebase, checkout,
reset, `git add` ou commit em cima dele até saber a origem de cada alteração e preparar proposta
separada. Para tarefa diferente, criar worktree limpo; nunca usar o diretório de outro projeto
como se fosse ambiente descartável.

## Princípios inegociáveis

1. **Nenhuma mudança nasce direto na branch de produção.** Toda alteração começa numa branch
   própria, mesmo a mudança pequena — o hábito de "é rapidinho, vou direto" é exatamente o que
   gera a falha que este padrão existe para evitar.
2. **Toda mudança entra por Pull Request.** PR é revisado antes de mesclar — nunca commit
   direto na branch protegida, nem por quem construiu o resto do sistema.
3. **Quem implementa não aprova a própria mudança.** O mesmo princípio de todo o resto da casa
   (Auditor não é o Desenvolvedor, Nina SEO não é quem escreveu o site) vale aqui: revisão é de
   outra pessoa ou papel.
4. **Bug corrigido sem teste de regressão não está corrigido — está adiado.** A causa mais
   citada pelo Carlos ("o mesmo erro volta versões depois") tem uma correção estrutural: todo
   PR que corrige um defeito leva, no mesmo commit, o teste que comprova que o bug existia e
   que agora não existe mais.
5. **Deploy para produção não é automático a partir do merge.** Existe um gate de aprovação
   explícito e registrado — quem aprovou, quando, o que estava incluído.
6. **Toda mudança material atualiza o `CHANGELOG.md`.** E, quando aplicável, os artefatos
   canônicos de documentação — este é o mesmo gate de manutenção do
   `DELIVERY_DOCUMENTATION_STANDARD.md`, não um segundo gate paralelo.
7. **O histórico da decisão fica no repositório, nunca só na memória de alguém.** PR, commit,
   `CHANGELOG.md` e o log de aprovação de deploy são a fonte de verdade — "eu lembro que
   corrigimos isso" não é rastreabilidade.

## Modelo de branch

- Branch de produção (`main` ou `production`) é **protegida**: só recebe merge via PR
  aprovado, nunca push direto — inclusive de quem administra o repositório.
- Convenção de nome: `feature/<slug>` (funcionalidade nova), `fix/<slug>` (correção de bug),
  `hotfix/<slug>` (correção urgente em produção), `chore/<slug>` (manutenção sem mudança de
  comportamento — dependência, config, refatoração sem efeito visível).
- **Hotfix não pula revisão.** Urgência muda o **prazo** de revisão (pode ser minutos, não
  dias), nunca a **exigência** dela. Merge direto "porque é urgente" é o cenário exato onde o
  processo mais falta.
- **Uma unidade, uma branch, uma base.** A branch nasce atualizada da branch-base protegida
  declarada no `AMBIENTE.md`; não nasce de outra feature por conveniência. O nome é único e a
  proposta lista apenas seus próprios arquivos.
- **PR empilhado é exceção documentada.** Só pode existir quando a segunda proposta depende
  tecnicamente da primeira. Cada PR identifica `base`, `head`, dependência e o **PR final para a
  branch protegida**. Mesclar o PR intermediário não significa entrega concluída; o integrador
  confirma com `git branch -r --contains <commit>` que o commit chegou à base protegida.
- **Projeto externo usa worktree dedicado.** Um worktree por branch/proposta reduz mistura de
  clientes, mudanças acidentais e conflito de contexto. O diretório principal do cliente não é
  usado como staging de outra demanda.

## Commits

- Convenção **Conventional Commits**: `tipo(escopo): descrição` — `feat`, `fix`, `refactor`,
  `docs`, `test`, `chore`, `perf`. Mesmo padrão já em uso nos commits do braço interno da TAVIR.
- A mensagem explica **o quê e o porquê**, não só "fix bug" ou "ajustes". Quem lê o histórico
  seis meses depois precisa entender a decisão sem abrir o PR.
- Commit de correção referencia o identificador do erro (`DF-AREA-nnn` de `docs/ERROS.md`)
  quando ele já existe, ou sinaliza no PR que este é o primeiro registro desse defeito — ele
  entra no catálogo antes do merge, não depois.

## Pull Request — conteúdo obrigatório

Todo PR declara:

1. **O que mudou e por quê** — não just "o quê"; a intenção importa tanto quanto o diff.
2. **Card/kanban vinculado** — nenhuma mudança "solta", sem origem rastreável.
3. **Regras de negócio afetadas** (`RN-nnn` criadas, alteradas ou impactadas).
4. **Erros corrigidos** (`DF-AREA-nnn`), com o teste de regressão linkado no próprio PR.
5. **Status da documentação:** `atualizada` · `não se aplica — <motivo>` · `pendente`. PR com
   `pendente` **não mescla** — é o mesmo bloqueio de `kanban done`/handoff do
   `DELIVERY_DOCUMENTATION_STANDARD.md`, aplicado no ponto onde a mudança de fato acontece.
6. **Evidência de teste** — captura, log de CI, ou link do resultado. "Testei localmente e
   funcionou" sem evidência não é evidência.
7. **Plano de rollback**, quando a mudança envolve schema de banco, integração externa ou
   migração de dado — a pergunta que a revisão faz antes de aprovar: "se isso quebrar em
   produção, como voltamos?"
8. **Contrato operacional:** URL/organização do repositório, base/head, implementador, revisor,
   mesclador e dono de deploy. Em projeto externo, o `AMBIENTE.md` é vinculado.
9. **Versão de destino:** versão atual → próxima versão, tag planejada e impacto de compatibilidade.
   Sem esse dado, a mudança não está pronta para release.

## Painel Alterações — gate operacional do Escritório

Toda mudança da operação interna cria uma solicitação no painel **Alterações** antes de ser
considerada entregue. O registro tem um identificador, título, resumo, arquivos explicitamente
incluídos, validações, risco, rollback, branch, commit e URL/estado do PR. O painel permite
Carlos **aprovar** ou **rejeitar** a proposta e registra data, canal e observação da decisão.

- Aprovação do painel é autorização de revisão; ela própria não executa merge, push para `main`
  nem deploy.
- Depois da aprovação, o painel pode oferecer uma ação **separada** de merge manual. Ela exige
  confirmação textual one-shot e revalida no servidor: repositório atual, branch padrão, PR aberto,
  commit aprovado imutável, revisão exigida, checks concluídos e ausência de conflito.
- O merge usa somente o PR já vinculado e `--match-head-commit`; são proibidos `--admin`, `--auto`,
  exclusão automática da branch, URL/branch recebida do navegador e qualquer deploy encadeado.
- Quando o gate não estiver elegível ou a integração falhar, o fluxo continua disponível pelo
  GitHub; nunca há fallback que ignore proteção ou faça push direto em `main`.
- Rejeição preserva o registro e bloqueia a proposta até nova preparação, impedindo reutilizar
  uma decisão para diff diferente.
- Estado operacional local do painel é auditável, mas não integra o próprio escopo de uma PR;
  commit, PR e histórico remoto são a trilha versionada da mudança aprovada.

## Revisão e aprovação

- Quem implementa não se autoaprova. Revisão fica com o Tech Lead do projeto ou par designado
  (`tech-lead` no roster da TAVIR quando o papel existe na equipe do projeto).
- A revisão cobre: risco da mudança, regra de negócio, cobertura de teste (principalmente de
  regressão), documentação, e um olhar básico de segurança.
- **Mudança de alto risco** — pagamento, autenticação, dado de cliente, alteração de schema —
  soma o **Auditor Seg/LGPD** à revisão **antes do merge**, não só antes do deploy. Esperar até
  o gate de deploy para achar um problema de segurança é tarde demais para corrigir sem pressa.

## Prevenção de regressão

Esta é a seção que resolve diretamente "o mesmo erro volta versões depois":

1. Todo bug corrigido leva, **no mesmo PR**: (a) um teste automatizado que falha **antes** da
   correção e passa **depois**; (b) uma entrada nova ou atualizada em `docs/ERROS.md`; (c) uma
   entrada no `CHANGELOG.md`.
2. `qa-e2e` mantém a suíte de regressão dos fluxos reais do sistema. PR que toca uma área
   coberta por essa suíte só mescla com ela passando — não com "vou rodar depois".
3. **Antes de tratar algo como bug novo, procure se já foi corrigido uma vez.** O primeiro
   passo de qualquer investigação de defeito é buscar em `docs/ERROS.md` e no `CHANGELOG.md`
   pelo sintoma. Se existir, é **regressão confirmada** — sobe com prioridade e investiga por
   que a correção anterior não se sustentou (merge sem o teste? teste removido depois? branch
   antiga re-mesclada?), não só reaplica o patch.

## `CHANGELOG.md` — obrigatório em sistema sob este padrão

Na raiz do projeto, formato inspirado em Keep a Changelog:

```markdown
## [1.4.2] - 2026-08-30
### Corrigido
- RN-006 / DF-EMP-014: cartão "Vence hoje" contava empréstimo já encerrado (PR #182)
### Adicionado
- Exportação de relatório em PDF por agente (PR #179)
### Alterado
- Taxa de juros padrão passou a vir de configuração, não mais fixa no código (PR #175)
```

Toda entrada aponta para o PR/commit. Toda entrada de correção aponta para o identificador
`RN`/`DF` quando existir. O `CHANGELOG.md` é o que permite, em cinco segundos, responder "isso
já foi mexido antes?" sem arqueologia de commit.

## Versões, tags e releases recuperáveis

Sistema externo sustentado pela TAVIR usa SemVer (`MAJOR.MINOR.PATCH`) salvo exceção aprovada no
`PROJECT.md`:

- `MAJOR`: quebra contrato, compatibilidade ou exige migração coordenada;
- `MINOR`: entrega compatível nova;
- `PATCH`: correção compatível, documentação ou manutenção sem quebra;
- pré-release: `vX.Y.Z-rc.N` ou equivalente, nunca reutilizado como release final.

Cada projeto declara **uma única fonte canônica da versão** no `AMBIENTE.md`: manifest que o
runtime lê (`package.json`, `pyproject.toml`, etc.) ou arquivo `VERSION` quando não houver
manifest. Espelhar o mesmo número em vários arquivos sem script de sincronização é proibido.

Antes de produção, o dono de deploy cria tag anotada e imutável `vX.Y.Z`, cria a release no
GitHub/Git remoto e arquiva `docs/releases/vX.Y.Z.md` a partir de
`.agents/templates/RELEASE.md`. O registro declara versão anterior, commits/PRs incluídos,
aprovações, migrações, evidências, artefatos, resultado e rollback. Tag já publicada nunca é
movida/reutilizada; correção posterior ganha nova versão.

O gate local `python tools/release.py verificar <raiz-do-projeto>` é obrigatório antes de abrir
release/deploy. Ele é somente leitura e confere `AMBIENTE.md`, `CHANGELOG.md`, fonte SemVer,
`origin`, branch de revisão e worktree limpo. Ele não cria tag, commit, PR, release ou deploy;
falha exige correção ou isolamento do worktree, nunca bypass.

Rollback não é "voltar arquivos na mão": o release aponta a tag estável anterior, procedimento
de restauração e condição de parada. Se exigir código, abre `hotfix/<slug>` com PR; se exigir
rollback de deploy, registra a versão restaurada e abre investigação de regressão. Migração de
banco só entra em release com estratégia reversível ou de compatibilidade em duas etapas.

## Aprovação de deploy

- Deploy para produção passa por um **gate de aprovação explícito e registrado** — nunca
  automático a partir do merge em `main`.
- Esse gate **consome, não duplica**, os gates que já existem na casa:
  - `liberado_para_deploy` do **Auditor Seg/LGPD** (segurança e LGPD) — autoridade inalterada;
  - `documentacao_aprovada` de **Dante Documentação** (docs correntes, incluindo a validação
    de manutenção desta mudança específica) — autoridade inalterada.
  Deploy é bloqueado se qualquer um dos dois não estiver `true`.
- `devops` é dono do pipeline de deploy e do procedimento de rollback documentado. Nunca aprova
  sozinho o próprio deploy de uma mudança que ele mesmo implementou — a aprovação registrada é
  de quem revisou o PR ou do responsável designado no `PROJECT.md`, não de quem apertou o botão.
- Registro mínimo do deploy: versão/tag, o que está incluído (lista de PRs/CHANGELOG desde o
  último deploy), quem aprovou, quando, e o procedimento de rollback caso necessário.

## Relação com os demais gates da casa

Este padrão não substitui nenhuma autoridade existente — ele é o **encanamento** que garante
que elas são consultadas no momento certo:

| Gate | Autoridade | Quando age sob este padrão |
|---|---|---|
| Segurança/LGPD | Auditor Seg/LGPD | Revisão de PR de alto risco + gate de deploy |
| Documentação corrente | Dante Documentação | Campo "Status da documentação" do PR + gate de deploy |
| Qualidade técnica | Tech Lead | Revisão de todo PR |
| Regressão | QA e2e | Suíte de testes que bloqueia merge |
| Pipeline e rollback | DevOps | Execução do deploy aprovado |

## Critério de pronto

O controle de mudança está funcionando quando:

1. ninguém consegue apontar um commit direto na branch de produção nos últimos 90 dias;
2. todo PR mesclado tem decisão humana registrada e, quando a proteção exigir, revisor diferente
   do autor registrado;
3. todo bug corrigido tem teste de regressão rastreável e entrada em `docs/ERROS.md` +
   `CHANGELOG.md`;
4. um bug reaberto é identificável em segundos consultando `docs/ERROS.md`/`CHANGELOG.md`, sem
   precisar perguntar a quem lembra;
5. todo deploy de produção tem aprovação registrada com segurança e documentação já `true`
   antes dele, não depois.
