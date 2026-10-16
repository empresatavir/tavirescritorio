---
name: documentacao-sistema
description: Produzir e manter a documentação canônica de qualquer sistema, app, SaaS, CRM, e-commerce, API, bot ou ferramenta da TAVIR, nas três camadas de público — USO.md para o usuário final, docs/SUPORTE.md para o suporte e docs/TECNICO.md para desenvolvimento, mais REGRAS_DE_NEGOCIO.md e ERROS.md. Usar SEMPRE que houver documentação, manual, guia do usuário, passo a passo, catálogo de telas, catálogo de relatórios, conciliação entre relatório sintético e analítico, auditoria de valores, regra de negócio, catálogo de erros, onboarding de suporte, handoff de sistema, ou quando uma entrega com interface operável se aproximar do kanban done, do handoff ou do deploy.
---

# Documentação de sistema — três públicos, uma verdade

Fonte canônica da política: **`.agents/DELIVERY_DOCUMENTATION_STANDARD.md`**. Em qualquer
divergência, o padrão vence esta skill. Onboarding guiado segue
`.agents/PRODUCT_ONBOARDING_STANDARD.md`.

Dono do processo: **Dante Documentação** (`documentacao`), única autoridade de
`documentacao_aprovada`. Sistema de escopo fechado sob `.agents/VERSION_CONTROL_STANDARD.md`
soma o campo "Status da documentação" do PR a este mesmo gate.

## Dois modos — entrega inicial e manutenção

**Entrega inicial:** os cinco artefatos não existem ainda. Siga o Procedimento completo abaixo,
do passo 1 ao 6.

**Manutenção:** os artefatos já existem e algo no sistema mudou (correção, ajuste, feature).
**Isto é sempre obrigatório, não é opcional por o tamanho da mudança parecer pequeno.** Vá
direto para "Manutenção — validação obrigatória a cada mudança" logo após o Procedimento — ela
não repete o levantamento inteiro, valida especificamente o que mudou.

## Princípio operante

Documentação não é redação sobre o sistema — é **leitura do sistema real** convertida em três
linguagens. Nada aqui se escreve de memória, do plano ou do que o construtor afirmou. Escreve-se
do código, das telas e da execução. Comportamento pretendido que não bate com o observado é
devolvido, não documentado.

## Os cinco artefatos

| Arquivo | Público | Linguagem | Distribuição |
|---|---|---|---|
| `USO.md` (raiz) | usuário final | simples, sem jargão | **externa autorizada** |
| `docs/SUPORTE.md` | suporte N1/N2 | técnica de negócio, sem código | interna |
| `docs/TECNICO.md` | desenvolvimento | implementação | interna |
| `docs/REGRAS_DE_NEGOCIO.md` | produto, suporte, dev | normativa, IDs `RN-nnn` | interna |
| `docs/ERROS.md` | operador, suporte, dev | contrato, IDs `DF-AREA-nnn` | interna (público sanitizado) |

Esqueletos prontos em `references/templates.md`.

## Procedimento

### 1. Bater ponto e localizar o projeto

```
python tools/office.py set documentacao working "Documentação <projeto>"
```

Leia `PROJETOS.md`, o `PROJECT.md` do projeto e o `AMBIENTE.md` se houver. Sem `PROJECT.md`,
pare e aponte para `/iniciar-projeto` — documentar projeto sem contexto canônico produz
documento órfão.

### 2. Levantar o sistema real

Antes de escrever qualquer linha, inventarie o que existe. Use Serena para código e leitura
direta para configuração. Levante, no mínimo:

- **Telas e rotas** — cada uma, com o que faz e quem enxerga;
- **Entidades e campos** — o que é editável, o que é calculado, o que é derivado;
- **Regras de negócio** — cálculos, transições de estado, validações, permissões, e onde cada
  uma vive no código;
- **Relatórios, exportações e indicadores** — com filtros, colunas e critério de inclusão;
- **Integrações e efeitos colaterais** — o que sai da fronteira do sistema. Sempre as cinco
  perguntas: o que busca, de onde busca, como trata o dado, para onde envia, o que acontece na
  falha. Metade do fluxo documentado é o motivo mais comum de suporte travado — ver o formato
  em `references/templates.md` § Integrações;
- **Erros tratados** — e, principalmente, os **não** tratados que chegam ao usuário;
- **Papéis e permissões** — a matriz completa de quem vê e faz o quê;
- **Configuração** — por nome e finalidade, **nunca por valor**.

Marque como `[PRECISA ESCLARECER]` tudo que o código não responde sozinho: regra ambígua,
número mágico sem origem, comportamento que depende de dado de produção. Não invente a regra —
a pendência sobe para quem construiu.

### 3. Montar o catálogo de relatórios e a matriz de conciliação

Etapa própria porque é a que mais falha e a que mais custa depois. Siga
`references/conciliacao.md` integralmente. Resumo do contrato:

- Toda saída numérica entra no catálogo com `REL-nnn`, granularidade
  (`SINTÉTICO` / `ANALÍTICO` / `OPERACIONAL`), origem de cada coluna, critério de inclusão/exclusão
  e **regra de data** explícita;
- Todo `SINTÉTICO` declara o `ANALÍTICO` que o comprova, o **caminho de auditoria** executável
  pela interface e as **diferenças legítimas** esperadas entre os dois;
- Sem analítico correspondente, registre `SEM ANALÍTICO` e como auditar por outro meio;
- **Execute o caminho de auditoria de verdade** e registre que fechou. Caminho descrito de
  memória não conta como prova.

Divergência que não se explica por regra documentada é achado de defeito: reporte antes de
seguir, não maquie na documentação.

### 4. Escrever as três camadas

Escreva na ordem `TECNICO` → `SUPORTE` → `USO`. Cada camada destila a anterior removendo o que
seu público não precisa e traduzindo o que sobra.

**`docs/TECNICO.md`** — arquitetura, mapa do código por domínio, fluxo de dados, integrações,
configuração por nome, execução/teste/deploy, observabilidade, backup e rollback, decisões
arquiteturais com trade-off. Aponta o módulo responsável em vez de copiar código.

**`docs/SUPORTE.md`** — catálogo de telas com a **ideia central de cada uma** em uma frase;
catálogo de relatórios; matriz de conciliação; diagnóstico **por sintoma relatado** (não por erro
interno), com causas em ordem de frequência; matriz de permissões; procedimentos administrativos;
rota de escalonamento com as evidências que acompanham a subida.

**`USO.md`** — passo a passo numerado de cada operação (cadastrar, editar, excluir, consultar,
registrar, exportar), com nomes de campo exatamente como aparecem na tela; rotinas por frequência
(diária, semanal, fechamento); fluxo de ponta a ponta de cada processo, mostrando como as telas se
conectam; para que serve cada relatório em linguagem de resultado; como conferir os números pela
interface. **Zero jargão**: sem tabela, endpoint, view, deploy, log ou nome de arquivo. Onde a
tela ajuda mais que o texto (formulário com vários campos, estado visual relevante), inclua o
**print real** em `docs/capturas/<slug>-nn.png`, referenciado por markdown padrão a partir da
raiz do projeto — só assim `documentacao_site.py` embute a imagem no pacote offline. Dado de
teste/homologação apenas, nunca dado de cliente real.

### 5. Validar contra o sistema, não contra o plano

Não entregue sem:

- Executar os procedimentos publicados no `USO.md` — os passos batem com a tela real?
- Executar ao menos um caminho de auditoria completo até fechar;
- Conferir que toda tela, relatório e permissão levantados no passo 2 aparecem na camada certa;
- Varrer `USO.md` atrás de vazamento: nome de tabela, endpoint, credencial, estrutura interna,
  PII de cliente real. É o artefato que sai da casa;
- Confirmar que os três públicos descrevem o **mesmo** comportamento — divergência entre camadas
  é defeito de entrega.

Em produto com dado sensível, acione o Auditor Seg/LGPD para a conferência de exposição.

### 6. Publicar e registrar

- Registre o projeto em `escritorio/documentacao_projetos.json` se tiver superfície operável
  (é o catálogo que o bot do Telegram lê para entregar o `USO.md`);
- **Pacote offline** — `python tools/documentacao_site.py <projeto> [--publico ...]` gera um HTML
  autocontido por público em `docs/offline/` (`usuario.html`, `suporte.html`, `dev.html`): abre com
  duplo clique, funciona sem internet, com sumário e busca. É o formato de entrega para quem não
  vai abrir markdown. O HTML é derivado e **não** é versionado — gere na hora de entregar. Código
  de saída 2 significa que o `usuario.html` tem indício de infraestrutura: revise antes de enviar;
- Documento único em PDF? `/publicar` converte um `.md` aprovado em HTML+PDF — **somente `USO.md`**
  tem distribuição externa autorizada;
- Atualize o `PROJECT.md` e o `_LOG.md` do braço de origem;
- Feche a etapa: `python tools/office.py kanban escalacao <slug> feito documentacao` e
  `python tools/office.py set documentacao done "..."`.

## Manutenção — validação obrigatória a cada mudança

Toda manutenção, correção ou implementação em sistema criado ou mantido pela TAVIR passa por
isto **antes de fechar**, sem exceção de tamanho. Criar conteúdo novo só acontece quando a
mudança é, de fato, uma feature nova — mas a **validação em si nunca é opcional**.

1. **Levante o que mudou de fato** — não confie no que o card dizia; confira o comportamento
   real: tela, regra, integração, configuração, mensagem de erro, relatório, permissão.
2. **Confira cada artefato canônico contra essa mudança:**
   - Ainda bate? → nenhuma ação além de registrar que foi conferido.
   - Mudou e já existe a seção? → **atualizar** no mesmo commit/PR.
   - É comportamento novo, sem seção correspondente? → **criar**: `RN-nnn`, tela no catálogo,
     relatório com conciliação, `DF-nnn`, passo novo no `USO.md` (com print se aplicável).
   - Print existente ficou desatualizado pela mudança de UI? → recapturar.
3. **Registre o resultado, mesmo quando nada mudou.** "Validado — sem alteração necessária" é
   uma linha, mas precisa existir. Sob `.agents/VERSION_CONTROL_STANDARD.md`, é o campo "Status
   da documentação" do PR; sem PR formal, vai no `PROJECT.md` e no `_LOG.md` do braço.
4. **A tarefa não fecha sem essa validação.** `kanban done`, handoff, PR e deploy ficam
   bloqueados com artefato obrigatório ausente, desatualizado ou sem essa prova registrada.

Quem executa a manutenção faz o levantamento; **Dante continua decidindo
`documentacao_aprovada`** — mudança pequena não suspende a regra de quem constrói não aprovar
a própria documentação.

## O que nunca fazer

- Documentar o comportamento pretendido em vez do observado;
- Deixar número sem origem declarada ou sintético sem caminho de auditoria;
- Explicar divergência entre relatórios com "arredondamento" sem ter conferido;
- Usar jargão técnico no `USO.md` ou expor estrutura interna nele;
- Escrever "erro inesperado" como orientação ao usuário;
- Aprovar a própria documentação quando você também construiu o sistema;
- Copiar credencial, token, string de conexão ou valor de variável para qualquer artefato.
