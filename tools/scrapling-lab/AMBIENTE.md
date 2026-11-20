# AMBIENTE — Scrapling TAVIR Lab

> Atualizado em 2026-08-29 · Empresa: `tavir` · Ambiente: desenvolvimento local
>
> Padrão: `.agents/PROJECT_ACCESS_STANDARD.md`. Contém apenas identificadores não-secretos.

## Identificação

- **Projeto:** Scrapling TAVIR Lab
- **Empresa:** TAVIR
- **Responsável pelo acesso:** Carlos
- **Contexto canônico:** `tools/scrapling-lab/PROJECT.md`

## Repositório

- **URL:** `https://github.com/empresatavir/agenciaia.git`
- **Branch de produção:** `main`
- **Caminho local:** `tools/scrapling-lab/` dentro do monorepo AgenciaIA
- **Observação:** push direto autorizado pelas regras do repositório; runtime e dados são ignorados.

### Identidade de commit

Não se aplica identidade de cliente; é projeto interno da própria TAVIR.

## Hospedagem / Deploy

Não se aplica. Ferramenta exclusivamente local, sem porta, servidor ou domínio público.

## Banco de dados

Não se aplica. Saídas são arquivos locais no diretório gitignored `data/`.

## Serviços externos

| Serviço | Conta/identificador | Onde ficam as credenciais |
|---|---|---|
| PyPI | pacote público `scrapling==0.4.15` | não requer credencial |
| Sites pesquisados | domínio allowlisted por execução | credenciais não são aceitas no executor |

## Segredos — apenas localização

O laboratório padrão não utiliza segredos. Cookies, tokens, senhas, headers de autenticação,
credenciais de proxy e CDP são proibidos no executor.

## ⚠️ Contas que NÃO pertencem a este projeto

- Contas Vercel TAVIR, PeptXLab ou pessoais — não há deploy neste projeto.
- Perfis reais do Chrome do Carlos — não devem ser usados pelo laboratório.
- Contas ou sessões de clientes — exigem outro ambiente e autorização específica.

## Verificação pré-ação

```text
python tools/ambiente.py verificar tools/scrapling-lab
git remote get-url origin
```

O remote deve ser `https://github.com/empresatavir/agenciaia.git`. Qualquer tentativa de deploy ou
conexão com conta externa está fora deste ambiente e bloqueia a operação.
