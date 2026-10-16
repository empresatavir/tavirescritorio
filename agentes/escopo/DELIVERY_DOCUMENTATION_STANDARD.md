# Padrão pétreo de documentação, regras de negócio e erros acionáveis

Este padrão é obrigatório para toda ferramenta, automação, aplicação, site, e-commerce, SaaS, API,
bot, script ou fluxo operacional construído ou alterado materialmente pela TAVIR. Uma entrega não
está pronta se o operador, o suporte ou quem mantém o código depende de histórico de chat para
entender, operar, corrigir ou evoluir o produto.

## Princípios inegociáveis

1. **Documentação é código de produção.** É versionada, revisada e atualizada no mesmo trabalho que
   muda comportamento, regra, integração, configuração ou erro.
2. **Cada público recebe a resposta certa.** Operador aprende a usar; suporte aprende a diagnosticar;
   desenvolvimento aprende a manter; negócio consegue conferir o que o sistema deve respeitar.
3. **Erro deve orientar sem expor.** A mensagem explica o que aconteceu em linguagem humana e o
   próximo passo real; detalhes internos, stack trace, query, token, PII e topologia ficam fora da
   tela e de logs compartilhados.
4. **Código legível antes de comentário abundante.** Nomes, tipos, módulos e testes devem explicar o
   fluxo. Comentários/documentação de código existem para decisão, invariante, efeito colateral,
   segurança e integração não óbvios — nunca para narrar o óbvio.
5. **Não existe pronto só no caminho feliz.** Fluxos relevantes de falha, recuperação, idempotência,
   dados parciais e suporte são especificados e testados.
6. **Primeiro uso também é entrega.** Interface operável avalia o Product Tour progressivo conforme
   `.agents/PRODUCT_ONBOARDING_STANDARD.md`; quando aplicável, não pode obrigar um tour longo nem
   deixar o operador dependente de suporte para encontrar o primeiro resultado.

## Conjunto canônico de artefatos

Todo projeto executável mantém `USO.md` na raiz canônica. Sistemas, e-commerces, SaaS, APIs,
integrações, bots com estado e ferramentas internas mantêm também os três documentos abaixo em
`docs/` na raiz do projeto. Projeto simples pode consolidá-los no README técnico **somente** se o
`PROJECT.md` justificar a simplicidade e apontar as seções equivalentes.

| Artefato | Público | Conteúdo mínimo |
|---|---|---|
| `USO.md` | operador final | propósito, acesso, instalação/preparo, primeiro uso, entrada/saída, rotinas, encerramento, limites, troubleshooting seguro e obtenção via Telegram. |
| `docs/TECNICO.md` | desenvolvimento | arquitetura e módulos, mapa do código, fluxo de dados, integrações, configuração sem segredos, execução/testes/deploy, observabilidade, backup/rollback, decisões e responsáveis. |
| `docs/SUPORTE.md` | suporte N1/N2 autorizado | catálogo de telas, catálogo de relatórios, matriz de conciliação, diagnóstico por sintoma (referenciando o fluxo ponta a ponta da integração relevante quando o sintoma tiver origem numa), permissões por papel, procedimentos administrativos e rota de escalonamento. |
| `docs/REGRAS_DE_NEGOCIO.md` | produto, suporte e desenvolvimento | glossário, papéis, estados e transições, regras/invariantes com IDs estáveis, limites, cálculos, permissões, exceções e casos de borda. |
| `docs/ERROS.md` | operador, suporte e desenvolvimento | contrato e catálogo de erros: código, condição, mensagem pública, efeito sobre a operação/dados, ação segura, repetição/espera, escalonamento e correlação segura. |

**Três públicos, três linguagens, uma verdade.** O mesmo comportamento é descrito em `USO.md`
(linguagem do operador, sem jargão), em `docs/SUPORTE.md` (linguagem técnica de negócio, sem
código) e em `docs/TECNICO.md` (linguagem de implementação). Divergência entre eles é defeito de
entrega, não questão de estilo: quando o comportamento muda, os três mudam no mesmo commit.

`README.md`, ADRs, diagramas, OpenAPI, schema, runbooks, testes e vídeos complementam esses
artefatos; não substituem o documento canônico correspondente. Nenhum deles contém segredo, senha,
token, PII, URL privada desnecessária ou dado que reduza a segurança do ambiente.

Sistema de escopo fechado para cliente externo que a TAVIR sustenta segue também
`.agents/VERSION_CONTROL_STANDARD.md` — branch protegida, PR com revisão de terceiro, teste de
regressão obrigatório em toda correção, `CHANGELOG.md` e aprovação registrada de deploy. Os dois
padrões compartilham o mesmo gate: PR/deploy nunca avança com documentação pendente.

### `USO.md` — operação e autonomia

Além do conteúdo da tabela, o guia inclui, conforme aplicável:

1. pré-requisitos e limites de escopo;
2. onde dados e arquivos ficam e quem pode vê-los;
3. ações destrutivas que exigem confirmação;
4. atualização, backup, rollback ou recuperação disponíveis;
5. segurança, privacidade e usos não autorizados;
6. versão/data da última verificação e como obter o guia pelo Telegram da TAVIR.

**Escrita para quem nunca viu o sistema.** O critério não é "está documentado", é "uma pessoa
sem treinamento consegue operar lendo isto". Na prática:

- **Passo a passo numerado** para cada operação real: cadastrar, editar, excluir, consultar,
  registrar, aprovar, exportar. Cada passo diz onde clicar e o que preencher, com o nome do
  campo exatamente como aparece na tela;
- **Rotinas por frequência** — o que se faz no dia a dia, o que é semanal, o que é de fechamento
  de período. O operador precisa saber a ordem das coisas, não só as telas isoladas;
- **Fluxo completo de ponta a ponta** de cada processo principal, mostrando como as telas se
  conectam, não cada tela como ilha;
- **Para que serve cada relatório**, em linguagem de resultado ("mostra quem está devendo hoje"),
  e **como conferir os números** — o caminho de auditoria da matriz de conciliação, traduzido
  para cliques;
- **Sem jargão técnico:** nada de tabela, endpoint, view, RPC, chave, ambiente, deploy, log ou
  nome de arquivo de código. Termo de negócio inevitável entra no glossário do próprio guia.

`USO.md` é o único artefato desta lista com distribuição externa autorizada — escreva-o sabendo
que ele sai da casa.

#### Prints — a tela real, não a descrição da tela

Toda operação com passo a passo relevante inclui, quando viável, uma captura da **tela real**
mostrando o estado descrito — não um mockup, não um desenho. Um passo com print reduz a
distância entre "ler o guia" e "reconhecer a tela na frente" a quase zero.

- **Onde ficam:** `docs/capturas/` na raiz do projeto. Nome estável e descritivo:
  `<slug-da-secao>-<nn>.png` (ex.: `novo-emprestimo-02.png`).
- **Como referenciar:** markdown padrão, `![Tela de novo empréstimo](docs/capturas/novo-emprestimo-02.png)`,
  caminho relativo à raiz do projeto — o pacote offline (`tools/documentacao_site.py`) resolve
  e embute automaticamente **apenas** imagens dentro dessa pasta; qualquer outro caminho é
  removido por segurança (ver seção "Pacote offline" abaixo).
- **Print desatualizado é pior que nenhum print** — induz ao erro visualmente enquanto parece
  confiável. Toda mudança de UI que afete uma tela capturada **invalida o print
  correspondente**; a validação de manutenção (seção própria abaixo) inclui checar se algum
  print ficou desatualizado pela mudança.
- **Sanitização obrigatória:** nunca capturar dado real de cliente ou PII. Use dado de teste/
  homologação, ou mascare antes de salvar — a mesma regra que proíbe PII em qualquer artefato
  de distribuição externa.
- **Peso:** PNG, redimensionado para largura de leitura (não a tela inteira em resolução 4K).
  Anotação leve (seta, número) é bem-vinda quando aponta o campo exato do passo — a legibilidade
  do passo é o critério, não a ferramenta usada para anotar.
- Print não é obrigatório em **todo** passo — é obrigatório onde a tela ajuda mais que o texto
  (formulário com vários campos, tela com estado visual relevante como uma etiqueta colorida de
  status). Passo puramente textual ("clique em Salvar") não precisa de captura própria.

### `docs/TECNICO.md` — manutenção sem arqueologia

O documento descreve dependências, fronteiras, contratos de integração, variáveis **por nome e
finalidade, nunca por valor**, migrações, tarefas agendadas, filas, observabilidade e procedimento
de desenvolvimento local. Toda decisão arquitetural não óbvia registra o motivo e o trade-off. O
mapa aponta o arquivo/módulo responsável por cada domínio crítico, em vez de copiar o código.

#### Integrações — o fluxo completo, ponta a ponta, sempre

Integração documentada por metade é a causa mais comum de suporte travado sem conseguir agir.
Toda integração — API externa, webhook, fila, serviço de terceiro, banco de outro sistema —
entra em `docs/TECNICO.md` com **as cinco perguntas respondidas em sequência**, nunca só uma
ou duas:

1. **O que busca** — qual dado, evento ou ação dispara a chamada.
2. **De onde busca** — endpoint, tabela, fila ou serviço de origem, com o mecanismo de
   autenticação **por nome**, nunca por valor (`Bearer token via variável X`, nunca o token).
3. **Como trata o dado** — toda transformação, validação, enriquecimento ou filtro aplicado
   entre a origem e o destino. Se um campo muda de nome, formato ou unidade no caminho, isso é
   documentado explicitamente — é o tipo de detalhe que o suporte não adivinha lendo a tela.
4. **Para onde envia** — destino final (tabela, outro serviço, fila, e-mail, webhook de saída).
5. **O que acontece quando falha** — retry, fila de erro, log, alerta, e se a falha é
   silenciosa ou visível para o operador. Uma integração sem essa resposta é uma integração que
   o suporte só vai entender no dia em que ela já quebrou.

Formato mínimo por integração:

```markdown
### Integração — <nome>

- **Direção:** entrada | saída | bidirecional
- **Dispara quando:** <evento, agendamento ou ação do usuário>
- **Busca:** <o quê> de <onde>, autenticação via <mecanismo por nome>
- **Tratamento:** <toda transformação relevante entre origem e destino>
- **Envia para:** <destino>
- **Falha:** <retry? fila de erro? alerta? visível ao usuário?>
- **Onde vive no código:** <módulo/arquivo>
```

`docs/SUPORTE.md` referencia esta seção por nome sempre que um sintoma de atendimento estiver
ligado a uma integração — o suporte não precisa reconstruir o fluxo lendo código para saber
"esse dado vem de onde".

### `docs/SUPORTE.md` — diagnosticar sem ler código

Escrito para quem atende: linguagem técnica de negócio, **sem exigir leitura de código**. Quem
atende precisa entender o que cada tela faz, de onde vem cada número e o que fazer quando o
cliente diz que "o valor está errado". Conteúdo obrigatório:

1. **Catálogo de telas** — uma entrada por tela: a **ideia central** (para que ela existe, em uma
   frase), quem enxerga, o que dá para fazer nela, quais regras de negócio (`RN-nnn`) ela aplica e
   quais campos são calculados e não editáveis.
2. **Catálogo de relatórios** — uma entrada por relatório (ver seção própria abaixo).
3. **Matriz de conciliação** — como auditar um número sintético até a origem (ver seção própria).
4. **Diagnóstico por sintoma** — a partir do que o usuário relata ("não aparece", "valor errado",
   "não consigo acessar"), não a partir do erro interno. Cada sintoma lista causas prováveis em
   ordem de frequência, a verificação que confirma cada uma e a ação correspondente.
5. **Permissões por papel** — matriz de o que cada perfil vê e faz; sempre a primeira hipótese
   quando alguém "não encontra" uma funcionalidade.
6. **Procedimentos administrativos** — criar/ativar/desativar usuário, ajustar cadastro, refazer
   registro, e o que exige intervenção fora do produto.
7. **Rota de escalonamento** — o que o suporte resolve, o que sobe para desenvolvimento e quais
   evidências acompanham a subida (identificador do registro, passos de reprodução, correlação).

Nunca contém credencial, string de conexão, token, endpoint interno privado nem PII de cliente
real. Nome de tabela, view ou função interna só entra quando o suporte tem acesso legítimo de
leitura ao banco e o `PROJECT.md` registra esse acesso — caso contrário, descreva a origem do dado
pelo nome de negócio.

### `docs/REGRAS_DE_NEGOCIO.md` — uma fonte para o comportamento

Cada regra tem identificador estável (`RN-001`, por exemplo), enunciado verificável, contexto,
papéis afetados, entradas/saídas, transições permitidas/proibidas, exceções e referência aos testes
ou módulos que a aplicam. Alterar uma regra exige atualizar este documento, critérios de aceite e
testes; regras implícitas somente no frontend ou na memória de alguém são defeito de entrega.

### `docs/ERROS.md` — contrato de recuperação

Para cada erro esperado ou classe de falha relevante, registre um identificador estável (`DF-AUTH-001`,
por exemplo), condição, mensagem mostrada, efeito confirmado, orientação e rota de suporte. O
contrato de uma mensagem contém:

1. **o que não foi concluído** e se dados/pedido/publicação foram ou não alterados;
2. **ação imediata precisa**, com botão/comando/tela quando existir;
3. se é seguro tentar de novo, quanto esperar e quando não repetir;
4. código de referência/correlação que o suporte pode pedir;
5. próximo nível de escalonamento, responsável e evidência segura a fornecer.

Nunca usar só “erro inesperado”, “falhou” ou texto técnico como orientação ao usuário. Falhas de
autorização, integração, quota, processamento assíncrono, rede, validação, conflito de estado e
operação destrutiva recebem mensagens e recuperação próprias. Log técnico fica no servidor ou no
canal autorizado, sanitizado e associado ao mesmo código/correlação; não retorna stack trace, SQL,
segredo, endpoint interno ou PII à interface.

## Telas, relatórios e conciliação

Número que ninguém consegue auditar é número em que ninguém confia. Todo produto que exibe
totais, saldos, contadores ou relatórios cumpre esta seção — ela existe porque a pergunta mais
cara do suporte não é "como faço?", é **"por que este valor não bate com aquele?"**.

### Catálogo de relatórios

Cada relatório, exportação, painel e indicador recebe uma entrada com:

1. **Identificador estável** (`REL-001`) e nome exibido ao usuário;
2. **Propósito em uma frase** — que decisão ele apoia;
3. **Público** e permissão exigida;
4. **Granularidade:** `SINTÉTICO` (agrega), `ANALÍTICO` (linha a linha) ou `OPERACIONAL` (lista de
   trabalho do dia);
5. **Filtros disponíveis** e quais são obrigatórios;
6. **Origem de cada coluna/número** — qual regra (`RN-nnn`) e qual entidade de negócio produz o
   valor; campo calculado indica a fórmula;
7. **Critério de inclusão e exclusão** — o que entra, o que **não** entra e por quê. Registros
   cancelados, inativos, de outro período ou de outro status são a causa número um de divergência;
8. **Regra de data** — a documentação diz explicitamente se o corte é por data de criação, de
   competência, de vencimento ou de liquidação. Relatórios que usam datas diferentes **nunca**
   fecham entre si, e isso precisa estar escrito antes que alguém abra um chamado;
9. **Formato de saída** e limites (paginação, teto de linhas, tempo de geração).

### Matriz de conciliação

Todo relatório `SINTÉTICO` declara o `ANALÍTICO` que o comprova. A matriz é uma tabela com:

| Sintético | Analítico correspondente | Caminho de auditoria | Diferenças legítimas |
|---|---|---|---|

- **Caminho de auditoria:** o passo a passo reproduzível para sair do total e chegar às linhas que
  o compõem — quais filtros aplicar no analítico para que a soma bata com o sintético. Escrito de
  forma que o suporte execute pela interface, sem consultar o banco.
- **Diferenças legítimas:** toda divergência **esperada** entre os dois, com o motivo. Exemplos:
  o sintético ignora registros cancelados; o analítico usa data de liquidação e o sintético data de
  competência; o sintético arredonda por período. Divergência prevista e documentada é regra de
  negócio; divergência não prevista é defeito — e a matriz é o que separa uma da outra.
- **Fonte de verdade:** quando dois artefatos mostram o mesmo número por caminhos diferentes, a
  matriz nomeia qual prevalece. Sem isso, cada atendimento vira uma discussão nova.

O `USO.md` traduz o mesmo caminho de auditoria em linguagem de operador: "para conferir este
total, abra tal relatório, aplique tais filtros e some tal coluna". O usuário final precisa
conseguir auditar o próprio número sem abrir chamado.

### Regra de cobertura

Relatório sem entrada no catálogo, sintético sem analítico declarado, ou coluna calculada sem
fórmula registrada são pendências que **bloqueiam** a aprovação da documentação. Se um sintético
realmente não tem analítico correspondente, a matriz registra `SEM ANALÍTICO` e explica como
auditar o valor por outro meio — a ausência é uma decisão declarada, nunca um silêncio.

## Manutenção — validação obrigatória a cada mudança

A entrega inicial não é o único momento em que a documentação pode ficar errada — é só o
primeiro. **Toda manutenção, correção ou implementação em sistema criado ou mantido pela TAVIR
valida a documentação antes de fechar**, independente do tamanho da mudança. Isto não significa
que toda manutenção cria conteúdo novo — na prática, criar seção nova só acontece quando a
mudança é, de fato, uma funcionalidade nova. Significa que **a validação em si nunca é
opcional**, porque "acho que não afeta a documentação" é exatamente o hábito que produz o
sistema que ninguém mais reconhece um ano depois.

### Procedimento, em toda manutenção

1. **Levante o que mudou de fato** — código, tela, regra de negócio, integração, configuração,
   mensagem de erro, relatório, permissão. Não confie no que a tarefa dizia que ia mudar;
   confira o que mudou de verdade no sistema.
2. **Confira cada artefato canônico contra essa mudança**, um a um:
   - O comportamento documentado **ainda bate**? → nenhuma ação além de registrar que foi
     conferido.
   - O comportamento **mudou** e já existe a seção correspondente? → **atualizar** a seção no
     mesmo commit/PR da mudança.
   - É comportamento **novo**, sem seção correspondente — isto é, na prática, uma feature nova?
     → **criar** a seção: `RN-nnn` novo em `docs/REGRAS_DE_NEGOCIO.md`, tela nova no catálogo
     de `docs/SUPORTE.md`, relatório novo com sua entrada na matriz de conciliação, `DF-nnn`
     novo em `docs/ERROS.md`, passo novo em `USO.md` (com print, se aplicável).
   - Um print existente ficou desatualizado pela mudança de UI? → recapturar antes de fechar.
3. **Registre o resultado da validação, mesmo quando nada precisou mudar.** "Validado — sem
   alteração necessária" é uma linha, não um parágrafo, mas precisa existir — sem isso, não há
   como distinguir "validei e estava tudo certo" de "não validei". O PR (sob
   `.agents/VERSION_CONTROL_STANDARD.md`, quando aplicável) carrega esse registro no campo
   "Status da documentação"; sem PR formal, o registro vai no `PROJECT.md` e no `_LOG.md` do
   braço.
4. **A tarefa de manutenção não fecha sem essa validação.** Mesmo bloqueio de `kanban done`,
   handoff e deploy que já vale para a entrega inicial — aqui vale para **cada mudança
   subsequente**, sem exceção de tamanho.

Quem executa a manutenção faz o levantamento; **Dante Documentação continua sendo quem decide
`documentacao_aprovada`** — a regra de "quem constrói não aprova a própria documentação" não
se suspende por a mudança ser pequena.

## Planejamento, construção e gates

- Todo plano contém `## DOCUMENTAÇÃO E ENTREGA`, lista os artefatos aplicáveis, seu responsável e
  a prova de atualização. Se não houver superfície operável, declara `NÃO SE APLICA` e explica.
- A descoberta identifica papéis, estados, regras, exceções, fluxos críticos e modos de falha; o
  arquiteto transforma isso em contrato; o construtor implementa e produz evidência; QA/auditoria
  verifica de forma independente. Nenhum papel transfere a responsabilidade silenciosamente ao
  próximo.

### Dono e autoridade

**Dante Documentação** (`documentacao`) é o dono transversal deste padrão e a única autoridade de
`documentacao_aprovada`. Ele redige, revisa e mantém os cinco artefatos canônicos, e usa a skill
`documentacao-sistema`. Vale aqui a mesma regra do resto da casa: **quem constrói não aprova a
própria documentação**. O construtor entrega comportamento, decisões e evidência; Dante escreve e
valida contra o sistema real, executando os procedimentos que publica.

A escalação típica de um card com superfície operável termina em Dante, e ele fecha sua etapa
antes de `kanban done`. Divergência entre o que o código faz e o que o construtor afirmou é
devolvida com o ponto descrito — Dante não documenta o comportamento pretendido, documenta o
comportamento observado.

Em produto com dado sensível, Dante aciona o Auditor Seg/LGPD para conferir que `USO.md` — o
único artefato de distribuição externa — não expõe estrutura interna, e que os demais respeitam a
regra de sanitização.
- Alterou comportamento? Atualize código, regra, guia, catálogo de erro e teste afetados no mesmo
  commit. A fase final executa os procedimentos publicados em ambiente limpo ou estado documentado.
- Casos de teste cobrem o caminho feliz e os erros relevantes: mensagem exibida, efeito real sobre
  os dados, recuperação, idempotência/repetição e ausência de vazamento.
- Quando aplicável, o plano também declara o primeiro resultado de valor e o onboarding progressivo:
  dica contextual, `Pular`, `Não mostrar novamente`, `Ajuda → Refazer tutorial`, acessibilidade e
  testes de primeira visita/dispensa/retomada. A ausência só é aceita com justificativa explícita.
- `kanban done`, handoff e deploy são bloqueados quando artefato obrigatório está ausente, desatualizado
  ou sem prova prática. Projeto existente deve se adequar antes de entrega/homologação ou na próxima
  mudança material; alto risco se adequa antes da liberação.

## Distribuição e acesso pelo Telegram

Projetos operáveis são registrados em `escritorio/documentacao_projetos.json`. O bot lê apenas esse
catálogo versionado e envia o `USO.md` previamente autorizado; caminho fornecido por mensagem ou
callback nunca é aceito. No celular, `/docs` mostra o catálogo e entrega o guia do operador como
documento privado.

`docs/TECNICO.md`, regras internas e catálogo detalhado de erros só podem ser distribuídos a perfis
autorizados de suporte/desenvolvimento e em versão sanitizada. O arquivo versionado no projeto
continua a ser a fonte de verdade; Telegram não é cofre de credenciais.

### Pacote offline

`python tools/documentacao_site.py <projeto> [--publico usuario|suporte|dev|todos]` gera **um HTML
autocontido por público** em `docs/offline/` — abre com duplo clique, funciona sem internet e sem
servidor, com sumário lateral, busca e tema claro/escuro:

| Arquivo | Composição | Distribuição |
|---|---|---|
| `usuario.html` | `USO.md` | **externa autorizada** |
| `suporte.html` | `docs/SUPORTE.md` + `REGRAS_DE_NEGOCIO.md` + `ERROS.md` | interna |
| `dev.html` | `docs/TECNICO.md` + `REGRAS_DE_NEGOCIO.md` + `ERROS.md` | interna |

Regras e erros entram em dois públicos de propósito: suporte e desenvolvimento consultam os mesmos
identificadores. Um arquivo por público é o que permite entregar **apenas** o `usuario.html` para
fora, sem anexar por engano o material interno.

O HTML é **derivado** e não é versionado (`docs/offline/` está no `.gitignore`): a fonte de verdade
continua sendo o markdown, e o pacote se regenera com um comando. Gere na hora de entregar — pacote
antigo circulando é documentação desatualizada com aparência de oficial.

O gerador aplica o mesmo hardening de `publicar.py` — o conteúdo é escapado, então HTML e imagens
vindos do texto não chegam ao navegador sob `file://` — e sinaliza (código de saída 2) quando o
artefato de distribuição externa contém indício de infraestrutura. O aviso é um lembrete barato,
**não** substitui a revisão de exposição.

## Critério de pronto

A documentação está aprovada quando:

1. um operador consegue preparar, iniciar, concluir o primeiro fluxo, localizar a saída, encerrar e
   recuperar um problema comum sem depender do chat;
2. uma pessoa de suporte consegue correlacionar a falha, saber se houve efeito e seguir a ação segura;
3. quem mantém consegue localizar o módulo, entender regras e integrações, executar testes e alterar
   o produto sem adivinhar; e
4. uma revisão independente confirma que a documentação reflete o comportamento real e não expõe
   informação sensível; e
5. quando aplicável, um usuário novo encontra o primeiro resultado pelo onboarding, pode dispensá-lo
   e refazê-lo por Ajuda sem mudar dados ou bloquear o fluxo principal; e
6. todo relatório tem entrada no catálogo, todo sintético tem analítico declarado ou `SEM ANALÍTICO`
   justificado, e **o caminho de auditoria foi executado de verdade** — não descrito de memória; e
7. cada tela tem sua ideia central registrada, e nenhuma funcionalidade visível na interface ficou
   sem menção nos três públicos; e
8. toda integração tem as cinco perguntas respondidas (busca o quê, de onde, como trata, para
   onde envia, o que acontece na falha) — nunca só metade do fluxo; e
9. a última manutenção do sistema tem seu registro de validação de documentação localizável —
   "conferido, sem alteração" ou a atualização correspondente — não silêncio.

O teste final é prático, não documental: pegue um total exibido pelo produto, siga o caminho de
auditoria publicado e confirme que ele fecha. Se não fechar e a diferença não estiver na coluna de
diferenças legítimas, a documentação não está aprovada — ou o produto tem um defeito que ela
acabou de encontrar.
