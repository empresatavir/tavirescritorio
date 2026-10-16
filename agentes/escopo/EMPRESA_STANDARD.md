# Padrão pétreo de empresas e entrada de projetos

Este padrão é obrigatório para todo trabalho da TAVIR. Ele separa a **empresa atendida**
dos **motores de entrega** da agência e transforma Dora Descoberta na única porta de entrada
de projetos.

## 1. Hierarquia canônica

```text
TAVIR (agência e seus motores)
└── empresas/<empresa>/
    ├── EMPRESA.md
    ├── marcas/<marca>/
    ├── projetos/<tipo>/<projeto>/
    ├── operacao/<disciplina>/
    ├── comercial/
    ├── privado/
    └── arquivo/
```

- `empresas/` organiza contexto e entregas por empresa.
- `descoberta/`, `fabrica-lp/`, `crm-whitelabel/`, `ecommerce/`, `marketing/` e
  `comercial/` continuam sendo motores, padrões e bibliotecas da TAVIR.
- Uma marca pertence à empresa atendida; não vira submarca da TAVIR.
- `EMPRESAS.md` é o índice de empresas. `PROJETOS.md` continua sendo o índice de projetos
  e aponta para um único `PROJECT.md` canônico.
- Código em repositório externo não é copiado. O workspace contém `PROJECT.link.md` e
  `REPO.md`, indicando explicitamente qual `PROJECT.md` externo é canônico.
- Segredos, credenciais e PII nunca entram no Git. `privado/README.md` contém apenas a
  regra e os apontadores seguros.
- Cada projeto declara sua conta de deploy, repositório e banco em `AMBIENTE.md` (versionado,
  sem segredo) conforme `.agents/PROJECT_ACCESS_STANDARD.md`. Empresas diferentes usam contas
  diferentes: nenhum projeto publica na conta de outra empresa.

## 2. Porta de entrada

O CEO fala com **Dora Descoberta** usando:

```text
/iniciar-projeto <empresa ou demanda>
```

Dora é a **dona do intake**. Nenhum agente de marca, comercial, marketing ou fábrica cria
um projeto diretamente. Se receber uma demanda sem workspace, deve devolvê-la a Dora.

## 3. Ordem obrigatória

1. Dora consulta `EMPRESAS.md`, `PROJETOS.md` e o contexto canônico existente.
2. Faz o **Gate 0 de identificação**, definido em
   `descoberta/referencias/intake-petreo.md`.
3. Confirma com o CEO o resumo mínimo: empresa, relação, projeto, cenário, tipo e origem.
4. Executa `python tools/empresa.py iniciar ...`. A ferramenta cria, de forma idempotente,
   a empresa, o projeto e os índices antes do primeiro artefato.
5. Conduz o núcleo obrigatório e somente os módulos aplicáveis do intake.
6. Salva requisitos e mapa dentro do projeto; `descoberta/levantamentos/` permanece como
   biblioteca histórica para itens legados.
7. Solicita o gate do CEO. Só depois roteia para orçamento, contrato e produção.

## 4. Promoção de artefatos

- `marcas/<marca>/` guarda somente a identidade canônica aprovada.
- Um rebranding em andamento vive em
  `projetos/branding/<projeto>/`; versões aprovadas são promovidas para `marcas/<marca>/`.
- Design system de interface específico de LP, CRM ou e-commerce vive no projeto e
  consome os fundamentos da marca. Não substitui o brand system canônico.
- Artefato não aprovado não pode ser promovido nem publicado.

## 5. Gates do CEO

O CEO controla decisões irreversíveis ou comerciais:

- **G0 — abrir:** identidade, classificação e endereço do projeto;
- **G1 — escopo:** requisitos, escopo negativo, riscos e esteira;
- **G2 — comercial:** preço, prazo comercial e proposta;
- **G3 — produção:** direção estratégica/visual ou arquitetura;
- **G4 — lançamento:** auditorias, domínio, deploy e comunicação pública.

Perguntas podem chegar por interfaces diferentes, mas o estado canônico é único. O
transporte atual é o Escritório (`office.py pedir/autorizar`). Telegram é apenas outro
adaptador e não pode criar uma segunda fonte de verdade.

## 6. Regras de criação

- Não criar todas as fábricas dentro de toda empresa. Criar a base da empresa e somente
  o trilho do projeto solicitado.
- Slugs são `kebab-case`; nomes oficiais permanecem nos metadados.
- A operação é idempotente: repetir o comando não apaga nem sobrescreve conteúdo.
- Projeto interno recebe `PROJECT.md`; projeto externo recebe `PROJECT.link.md` e mantém
  o `PROJECT.md` do repositório externo como canônico.
- Qualquer exceção é registrada em `EMPRESA.md` e `PROJECT.md`.
