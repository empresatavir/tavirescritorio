# Template — security_report.md

```markdown
# Relatório de segurança — <projeto>

> Data: AAAA-MM-DD · Auditor: <nome> · Commit/versão: <sha> · Ambiente: <preview/local/prod>

## Veredito

STATUS: APROVADO | APROVADO COM RESSALVAS | REPROVADO
liberado_para_deploy: true | false

## Escopo e risco

- Perfil: LP | SITE | ECOMMERCE | SAAS | INTERNA
- Modificadores: []
- Ativos/dados críticos:
- Papéis/tenants:
- Superfícies incluídas:
- Fora do escopo:
- Limitações da auditoria:

## Modelo de ameaça resumido

| Ativo/fluxo | Atacante/abuso | Fronteira | Controle | Evidência |
|---|---|---|---|---|

## Cobertura por categoria

> Declarar Forte/Parcial/Não testável por frente, nunca "aprovado" genérico quando a
> cobertura variou entre frentes (WEB_SECURITY_STANDARD.md §5).

| Categoria | Cobertura (Forte/Parcial/Não testável) | Motivo |
|---|---|---|

## Evidências executadas

| Controle | Comando/teste/inspeção | Resultado | Artefato/local |
|---|---|---|---|

## Achados

> Ordenar por impacto provado, não pela etiqueta do scanner: sem autenticação → cross-tenant/
> cross-usuário → autenticado no próprio escopo → observação não comprovada (WEB_SECURITY_STANDARD.md §5).

| ID | Severidade | Local | Evidência | Impacto | Correção | Responsável/prazo | Estado |
|---|---|---|---|---|---|---|---|

## Riscos residuais e operação

- Monitoramento/alertas:
- Patching/dependências:
- Backup/restauração/rollback:
- Rotação/revisão de acesso:
- Resposta a incidente:

## Referências verificadas

- <CVE/advisory/requisito, versão e URL primária>
```

Nunca marcar controle como aprovado sem evidência. N/A precisa de motivo verificável.
