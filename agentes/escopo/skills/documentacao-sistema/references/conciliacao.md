# Matriz de conciliação — como levantar

Referência da skill `documentacao-sistema`. Política em `.agents/DELIVERY_DOCUMENTATION_STANDARD.md`,
seção "Telas, relatórios e conciliação".

A pergunta mais cara do suporte não é "como faço?". É **"por que este valor não bate com aquele?"**.
Ela consome horas de atendimento, gera desconfiança no produto inteiro e quase sempre termina em
uma explicação que alguém já sabia mas nunca escreveu. A matriz de conciliação existe para que essa
explicação esteja escrita **antes** do primeiro chamado.

## O que a matriz responde

Para cada número agregado que o sistema exibe:

1. **De onde ele vem** — quais registros o compõem;
2. **Como chegar neles** — o caminho, pela interface, do total até as linhas;
3. **Quando ele legitimamente não bate** com outro número parecido — e por quê;
4. **Qual prevalece** quando dois artefatos mostram a mesma coisa por caminhos diferentes.

## As oito causas de divergência

Levante cada uma explicitamente. Praticamente toda divergência real cai em uma delas.

### 1. Regra de data diferente

A causa mais comum e a mais invisível. Dois relatórios do "mesmo período" usando datas diferentes
**nunca** fecham. Para cada relatório, determine no código qual campo faz o corte:

- data de criação / lançamento
- data de competência
- data de vencimento
- data de liquidação / pagamento efetivo
- data da última alteração

Um painel de "recebido no mês" por data de liquidação e um relatório de "a receber" por data de
vencimento descrevem realidades diferentes de propósito. Documente as duas regras lado a lado.

### 2. Critério de status

Verifique o que cada consulta filtra: cancelados, estornados, inativos, soft-deleted, rascunhos,
pendentes de confirmação, encerrados. É comum o sintético excluir cancelados e o analítico
mostrá-los — a diferença é legítima, mas só se estiver escrita.

Atenção especial a **soft delete**: registro que sumiu da tela mas continua somando em algum
agregado é defeito clássico.

### 3. Escopo implícito

Filtros que a consulta aplica sem o usuário pedir: só registros do usuário logado, só da filial
ativa, só do agente vinculado, só dos últimos N meses. O usuário compara dois números achando que
o escopo é o mesmo.

### 4. Permissão de quem gera

Consequência do anterior, mas merece verificação própria porque produz o sintoma mais confuso de
todos: **dois usuários geram o mesmo relatório e recebem totais diferentes**. Se o produto filtra
por papel, a documentação diz isso explicitamente, ou o suporte vai caçar um bug inexistente.

### 5. Momento de captura

Valor calculado ao vivo versus valor gravado em snapshot, cache, campo materializado ou tabela de
histórico. Se o sistema grava saldo em coluna e também sabe recalculá-lo, os dois divergem no
instante em que qualquer escrita falha pela metade. Documente qual é a fonte de verdade e com que
frequência o materializado é reconciliado.

### 6. Agregação e arredondamento

Somar valores arredondados ≠ arredondar a soma. Percentual calculado sobre subtotal ≠ sobre total.
Média de médias ≠ média ponderada. Quando a diferença é de centavos e cabe aqui, diga o limite
esperado ("diferença de até R$ 0,02 por período de agregação"). Diferença sistemática e crescente
não é arredondamento — é defeito.

### 7. Fuso horário e corte de dia

Registro gravado em UTC e exibido em horário local muda de dia perto da meia-noite. Relatórios
"de hoje" com cortes diferentes divergem exatamente nas bordas do período.

### 8. Integridade referencial

Registro filho sem pai, vínculo apagado, referência para entidade inativa. O analítico mostra a
linha órfã, o sintético (que faz JOIN) a perde — ou o contrário. Divergência aqui é **sempre**
achado de defeito, nunca diferença legítima. Reporte.

## Procedimento de levantamento

1. **Liste toda saída numérica** do produto: relatórios, exportações, cards de indicador,
   contadores, totalizadores de rodapé, gráficos. Card de dashboard conta — é onde o cliente olha
   primeiro e onde a divergência aparece antes.
2. **Classifique** cada uma em `SINTÉTICO`, `ANALÍTICO` ou `OPERACIONAL`.
3. **Leia a origem no código** — a consulta, a view, a função ou o cálculo em memória. Registre o
   critério de inclusão real, não o pretendido.
4. **Pareie** cada sintético com o analítico que o comprova.
5. **Percorra as oito causas** para cada par e anote as diferenças legítimas que encontrar.
6. **Execute a conciliação de verdade**, com dado real ou de homologação: gere o sintético, gere o
   analítico com os filtros do caminho de auditoria, some, compare.
7. **Registre o resultado.** Fechou: a matriz está provada. Não fechou e a diferença não está nas
   causas mapeadas: é defeito — reporte antes de publicar.
8. **Traduza o caminho** para linguagem de operador no `USO.md`.

## Formato da matriz

Em `docs/SUPORTE.md`:

```markdown
## Matriz de conciliação

| Sintético | Analítico | Caminho de auditoria | Diferenças legítimas | Fonte de verdade |
|---|---|---|---|---|
| REL-001 Total a receber (dashboard) | REL-014 Relatório analítico de saldos | Abrir REL-014 · filtrar Status = Em aberto · sem filtro de data · somar a coluna Saldo Devedor | Não inclui registros cancelados (RN-012) · REL-001 é calculado ao vivo, REL-014 lê o mesmo saldo — não há defasagem | REL-014 |
| REL-002 Recebido no mês | REL-015 Extrato de pagamentos | Abrir REL-015 · filtrar Data de pagamento no mês corrente · Status = Confirmado · somar Valor Pago | REL-002 conta só pagamentos confirmados; pagamentos pendentes de confirmação aparecem em REL-015 e não em REL-002 (RN-031) | REL-015 |
```

> Exemplo ilustrativo com IDs fictícios. Use os identificadores reais do produto.

Regras do preenchimento:

- **Caminho de auditoria** é executável pela interface, passo a passo, sem consultar banco. Se só
  fecha com SQL, o produto tem um problema de auditabilidade — registre como achado.
- **Diferenças legítimas** citam a regra (`RN-nnn`) que as justifica. Diferença sem regra é
  suposição, e suposição não entra na documentação.
- **Fonte de verdade** é obrigatória quando dois artefatos mostram o mesmo conceito.
- `SEM ANALÍTICO` é resposta válida se vier acompanhada de como auditar o valor por outro meio.

## Tradução para o `USO.md`

A mesma conciliação, em linguagem de quem opera:

```markdown
### Como conferir o total "A Receber"

O card **A Receber** do painel mostra quanto ainda falta receber de todos os
empréstimos em aberto. Para conferir esse valor:

1. Abra **Empréstimos**;
2. No filtro **Status**, escolha **Em aberto**;
3. Deixe o período em branco (o card considera todos os meses);
4. Clique em **Exportar** e some a coluna **Saldo Devedor** na planilha.

O total precisa bater com o card. Se estiver diferente, verifique se algum
empréstimo foi encerrado depois que você abriu o painel — atualize a página e
confira de novo.
```

Sem nome de tabela, sem nome de consulta, sem jargão. O usuário audita o próprio número e não
abre chamado.
