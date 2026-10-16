---
name: web-security
description: Blindar e auditar LPs, sites, e-commerces, SaaS, CRMs, APIs e ferramentas web da TAVIR com controles proporcionais ao risco e gate de deploy baseado em evidências. Usar SEMPRE ao descobrir, planejar, construir, revisar ou publicar aplicação web; ao lidar com autenticação, banco, API, formulário, pagamento, upload, webhook, multitenancy, LGPD, dependências, infraestrutura, headers, XSS, injection, IDOR/BOLA, credential stuffing, DDoS, defacement, phishing ou supply chain.
---

# Segurança web

## Contrato canônico

Ler `../../WEB_SECURITY_STANDARD.md` por completo antes de agir. Ele define perfis, controles,
severidades, evidências e a autoridade de deploy. Usar `references/security-report-template.md`
para o relatório genérico; no CRM, preservar também o contrato `relatorio_auditoria.json`.

## Fluxo obrigatório

1. Ler `PROJECT.md`, manuais do braço e arquitetura real.
2. Classificar `LP|SITE|ECOMMERCE|SAAS|INTERNA` e modificadores de risco.
3. Mapear ativos, papéis, dados, rotas/APIs, terceiros, fronteiras e abusos prováveis.
4. Na construção, implementar os controles aplicáveis do padrão antes do gate.
5. Na auditoria, inspecionar código/config/infra permitida e executar verificações seguras.
6. Registrar N/A com motivo; não preencher checklist por presunção.
7. Produzir achados localizados e correções acionáveis. CRÍTICO/ALTO inclui correção pronta ou
   instrução exata quando depender de painel/conta externa.
8. Reexecutar as provas depois das correções e emitir o veredito final.

## Regras de integridade

- Não prometer invulnerabilidade; declarar riscos residuais e limites do escopo.
- Não usar apenas scanner. Testar autorização por objeto/função, tenant, lógica de negócio,
  replay/idempotência, abuso e recuperação conforme o perfil.
- Não inventar CVE. Verificar fonte oficial/primária, versão e aplicabilidade na sessão.
- Não executar pentest destrutivo, brute force, DDoS ou exploração em produção/terceiro sem
  autorização específica. Preferir testes unitários/integrados, preview e casos negativos controlados.
- Não expor segredos em comandos, saída, relatório, memória ou commit.
- Separar correção técnica de decisões jurídicas/LGPD; acionar `juridico-contratos` quando o
  tratamento de dados, incidente ou documento legal exigir.

## Saída mínima

Entregar perfil/modificadores, ameaça principal, evidências executadas, achados por severidade,
riscos residuais, próximos controles operacionais e `liberado_para_deploy`. Sem evidência suficiente,
reprovar por auditoria incompleta em vez de inferir segurança.
