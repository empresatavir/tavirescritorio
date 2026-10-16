# AMBIENTE — <nome do projeto>

> Atualizado em AAAA-MM-DD · Empresa: `<slug>` · Ambiente: <produção|homologação>
>
> Padrão: `.agents/PROJECT_ACCESS_STANDARD.md`. Este arquivo é **versionado** e contém **apenas
> identificadores não-secretos**. Nenhum token, senha ou chave entra aqui.

## Identificação

- **Projeto:** <nome>
- **Empresa:** <nome da empresa>
- **Responsável pelo acesso:** <quem>
- **Contexto canônico:** `<caminho do PROJECT.md>`

## Repositório

- **URL:** `<https://github.com/org/repo>`
- **Organização/dono:** `<org ou usuário>`
- **Branch de produção:** `<main>`
- **Branch-base de Pull Request:** `<main>`
- **Caminho local:** `<caminho>`
- **Modelo:** `<monorepo? subpasta? repo externo?>`
- **Implementa:** `<papel/pessoa autorizada>`
- **Revisa:** `<papel/pessoa diferente de quem implementa>`
- **Mescla:** `<Carlos ou responsável nomeado>`
- **Deploy:** `<DevOps/responsável nomeado>`
- **PR empilhado:** `<não permitido | cadeia declarada e PR final obrigatório>`

## Versão e recuperação

- **Fonte canônica da versão:** `<package.json | pyproject.toml | VERSION | outra>`
- **Última versão estável/tag:** `<vX.Y.Z ou ainda não existe>`
- **Estratégia:** `<SemVer | outro, com justificativa>`
- **Registro de release:** `<docs/releases/vX.Y.Z.md>`
- **Rollback:** `<tag/versão anterior + procedimento seguro>`

### Identidade de commit

Preencher **sempre que o projeto publicar em conta de cliente** (Vercel Hobby só aceita commit
cujo autor é o dono da conta). Deixar em branco só em projeto da própria TAVIR.

- **Autor dos commits:** `<login da conta do projeto>`
- **E-mail dos commits:** `<ID+login@users.noreply.github.com>`
- **Co-autor fixo:** `<Nome do dev <email>>`

O e-mail canônico da conta sai de `https://api.github.com/users/<login>` (campo `id`) no formato
`<id>+<login>@users.noreply.github.com` — o GitHub sempre atribui esse endereço àquela conta.

Aplicar por clone: `python tools/ambiente.py identidade <projeto> --aplicar` (usa `--local`, não
mexe na config global). O `verificar` bloqueia se divergir. **Nunca** usar
`git commit --amend --reset-author`: isso apaga o desenvolvedor real em silêncio; o trailer
`Co-authored-by:` existe justamente para preservar a autoria.

## Hospedagem / Deploy

- **Provedor:** <Vercel|Netlify|outro|não se aplica>
- **Conta:** `<login/conta>`
- **Equipe/escopo:** `<slug da equipe>`
- **orgId:** `<team_...>`
- **projectId:** `<prj_...>`
- **Nome do projeto no provedor:** `<nome>`
- **Domínio canônico:** `<https://exemplo.com.br>`
- **Diretório de deploy:** `<caminho de onde o comando roda>`
- **Comando autorizado:** `<ex.: vercel deploy --prod>`

## Banco de dados

- **Provedor:** <Supabase|outro|não se aplica>
- **Ref/ID do projeto:** `<ref>`
- **URL:** `<https://<ref>.supabase.co>`
- **Região:** `<região>`
- **Buckets/storage:** `<nomes>`
- **Chaves:** <onde estão — nunca o valor>

## Serviços externos

| Serviço | Conta/identificador | Onde ficam as credenciais |
|---|---|---|
| <pagamento> | `<id>` | <local> |
| <e-mail> | `<id>` | <local> |

## Segredos — apenas localização

- `<VARIAVEL>` — <arquivo local gitignored / painel do provedor / cofre>
- **Nunca** versionar, colar em chat, log ou commit.

## ⚠️ Contas que NÃO pertencem a este projeto

Estas contas existem na operação da TAVIR e **não** devem ser usadas aqui. Usar qualquer uma
delas neste projeto é erro, não atalho:

- `<conta vizinha 1>` — pertence a `<projeto>`.
- `<conta vizinha 2>` — pertence a `<projeto>`.

## Verificação pré-ação

Rodar **antes** de qualquer deploy, push externo ou migração:

```bash
python tools/ambiente.py verificar <caminho-deste-projeto>
```

Conferência manual equivalente:

- `vercel whoami` → deve ser `<conta>`
- `git remote -v` → deve apontar para `<repo>`
- `git branch --show-current` → deve ser branch de revisão, nunca a protegida
- `git status --porcelain` → deve estar vazio antes de pull/rebase; caso contrário, separar as
  alterações em proposta própria antes de continuar
- `.vercel/project.json` → `orgId` deve ser `<team_...>`

Divergência **bloqueia** a ação e sobe para o CEO.
