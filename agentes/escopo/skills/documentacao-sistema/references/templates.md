# Esqueletos dos cinco artefatos canônicos

Referência da skill `documentacao-sistema`. Conteúdo obrigatório e regras em
`.agents/DELIVERY_DOCUMENTATION_STANDARD.md` — estes são apenas os esqueletos.

Seção que não se aplica ao produto é **removida com justificativa no `PROJECT.md`**, nunca deixada
vazia ou preenchida com "N/A" solto.

---

## `USO.md` — usuário final · distribuição externa autorizada

```markdown
# <Produto> — Guia do Usuário

> Versão <x.y> · Última verificação: <AAAA-MM-DD>

## O que é e para que serve
<Um parágrafo em linguagem de resultado. Que problema resolve.>

## Antes de começar
Como acessar, o que você precisa ter em mãos, quem libera seu acesso.

## Primeiros passos
Passo a passo do primeiro uso até o primeiro resultado útil.

## As telas do sistema
Uma subseção por tela: para que serve e o que dá para fazer nela.

## Como fazer — passo a passo
### Cadastrar <entidade>
1. …  (nome do campo exatamente como aparece na tela)
   ![<Legenda da tela>](docs/capturas/<slug>-01.png)
### Editar <entidade>
### Excluir <entidade>
### <demais operações reais>

> Print em `docs/capturas/`, referenciado por caminho relativo à raiz do projeto — só assim o
> pacote offline embute a imagem. Print de tela real com dado de teste, nunca dado de cliente.
> Ver `.agents/DELIVERY_DOCUMENTATION_STANDARD.md` § Prints.

## Rotinas
### No dia a dia
### Toda semana
### No fechamento do mês

## Fluxos completos
<Do início ao fim, mostrando como as telas se conectam.>

## Relatórios
Para cada um: para que serve (em resultado), quem acessa, quais filtros usar,
**como conferir os números**.

## Quando algo dá errado
Sintoma → o que verificar → o que fazer. Quando abrir chamado e o que informar.

## Glossário
Termos de negócio que aparecem na tela.
```

**Proibido no `USO.md`:** nome de tabela, view, função, endpoint, variável de ambiente,
credencial, caminho de arquivo de código, jargão de deploy/log/infra, PII de cliente real.

---

## `docs/SUPORTE.md` — suporte N1/N2 · interno

```markdown
# <Produto> — Manual de Suporte

> Versão <x.y> · Última verificação: <AAAA-MM-DD>

## Visão geral do produto
O que é, quem usa, qual o modelo de negócio que ele opera.

## Catálogo de telas
| Tela | Ideia central | Quem enxerga | O que dá para fazer | Regras aplicadas |
|---|---|---|---|---|

## Catálogo de relatórios
| ID | Nome | Propósito | Público | Granularidade | Filtros | Regra de data | Inclui | Não inclui |
|---|---|---|---|---|---|---|---|---|

## Matriz de conciliação
| Sintético | Analítico | Caminho de auditoria | Diferenças legítimas | Fonte de verdade |
|---|---|---|---|---|

## Permissões por papel
| Funcionalidade | <Papel A> | <Papel B> | … |
|---|---|---|---|

## Diagnóstico por sintoma
### "<o que o usuário diz>"
- **Causas prováveis** (ordem de frequência)
- **Como confirmar cada uma**
- **Ação correspondente**

## Procedimentos administrativos
Criar/ativar/desativar usuário, ajustar cadastro, refazer registro,
o que exige intervenção fora do produto.

## Escalonamento
O que o suporte resolve · o que sobe para desenvolvimento ·
evidências obrigatórias na subida.
```

---

## `docs/TECNICO.md` — desenvolvimento · interno

```markdown
# <Produto> — Documentação Técnica

> Versão <x.y> · Última verificação: <AAAA-MM-DD>

## Arquitetura
Visão geral, camadas, fronteiras, decisões estruturais.

## Stack e dependências
Com a finalidade de cada uma — não só a lista.

## Mapa do código
| Domínio | Onde vive | Responsabilidade |
|---|---|---|

## Modelo de dados
Entidades, relacionamentos, campos calculados, invariantes.

## Fluxo de dados
Os caminhos críticos, ponta a ponta.

## Integrações
Uma entrada por integração, sempre as cinco perguntas — nunca metade do fluxo:

```markdown
### Integração — <nome>
- **Direção:** entrada | saída | bidirecional
- **Dispara quando:** <evento, agendamento ou ação do usuário>
- **Busca:** <o quê> de <onde>, autenticação via <mecanismo por nome, nunca por valor>
- **Tratamento:** <toda transformação relevante entre origem e destino>
- **Envia para:** <destino>
- **Falha:** <retry? fila de erro? alerta? visível ao usuário?>
- **Onde vive no código:** <módulo/arquivo>
```

## Configuração
| Variável | Finalidade | Obrigatória | Onde é definida |
|---|---|---|---|
**Nome e finalidade — nunca valor.**

## Execução local
Preparo, comandos, dados de teste.

## Testes
O que cobre, como rodar, o que falta.

## Deploy
Ambientes, procedimento, rollback.

## Observabilidade
Onde ver log, o que é monitorado, como correlacionar.

## Backup e recuperação

## Decisões arquiteturais
| Decisão | Motivo | Trade-off aceito | Data |
|---|---|---|---|
```

---

## `docs/REGRAS_DE_NEGOCIO.md` — produto, suporte, dev · interno

```markdown
# <Produto> — Regras de Negócio

> Versão <x.y> · Última verificação: <AAAA-MM-DD>

## Glossário
## Papéis
## Estados e transições
Por entidade: estados possíveis, transições permitidas e proibidas, quem pode disparar.

## Regras

### RN-001 — <enunciado verificável>
- **Contexto:**
- **Papéis afetados:**
- **Entradas / saídas:**
- **Exceções e casos de borda:**
- **Onde é aplicada:** <módulo/função>
- **Testes que cobrem:**
```

IDs são **estáveis**: regra revogada é marcada `REVOGADA em <data>` e mantida — nunca reciclada
para outra regra.

---

## `docs/ERROS.md` — operador, suporte, dev · interno (mensagem pública sanitizada)

```markdown
# <Produto> — Catálogo de Erros

> Versão <x.y> · Última verificação: <AAAA-MM-DD>

## Contrato de mensagem
Toda mensagem ao usuário diz: o que não foi concluído · se alterou dados ·
a ação imediata · se é seguro repetir · o código de correlação.

## Catálogo

### DF-AUTH-001 — <nome curto>
- **Condição:**
- **Mensagem exibida:**
- **Efeito confirmado sobre os dados:**
- **Ação do usuário:**
- **Seguro repetir?** <sim/não · quanto esperar>
- **Correlação:** <o que o suporte pede>
- **Escalonamento:**
```

Prefixos por área (`DF-AUTH`, `DF-PAG`, `DF-INT`…). Nunca use "erro inesperado" ou texto técnico
como orientação. Log técnico fica no servidor, sanitizado, com o mesmo código de correlação —
nunca retorna stack trace, SQL, segredo, endpoint interno ou PII à interface.
