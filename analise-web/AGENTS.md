# Braço de ANÁLISE WEB — Manual de Operação

## Contexto obrigatório do projeto (regra pétrea)

Cada auditoria em `projetos/<slug>/` deve ter `PROJECT.md`, criado antes da coleta, lido por
todos os agentes e atualizado após cada entrega ou gate, mesmo quando a pasta estiver fora
do Git. Registre-a em `../PROJETOS.md`; detalhes em `../.agents/PROJECT_STANDARD.md`.

Braço de diagnóstico, não de construção nem publicação. Recebe uma URL fornecida
pelo Carlos, coleta a superfície pública e/ou percorre áreas autenticadas
autorizadas em modo de leitura, preparando um corpus verificável e um relatório
profissional em Markdown e HTML.

## Ativos

```text
analise-web/
├── AGENTS.md
├── CLAUDE.md
├── _LOG.md
├── agentes/
│   └── agente-analista-web.md       ← Atlas Web
└── projetos/                        ← dados locais, IGNORADOS pelo Git
    └── <slug>/
        ├── coleta/
        │   ├── publico/pages/
        │   └── autenticado/pages/
        ├── screenshots/
        │   ├── desktop/
        │   └── mobile/
        ├── controle/manifesto.json
        ├── processado/
        └── relatorios/              ← relatório .md + .html
```

## Skill, comando e agente

- Skill: `.agents/skills/web-platform-audit/SKILL.md`
- Comando: `/web-analisar <url> [--modo auto|publico|autenticado|hibrido]`
- Agente: `analista-web` (Atlas Web, setor qualidade)

## Modos

1. **Público:** coletor Playwright em navegador isolado, mesmo host, `robots.txt`,
   sem formulários ou ações mutáveis.
2. **Autenticado:** controle do Chrome já aberto, com a sessão do Carlos. Login,
   MFA, CAPTCHA, consentimento e troca de organização são feitos pelo Carlos.
3. **Híbrido:** inventário público seguido de jornadas autenticadas autorizadas.
4. **Auto:** começar pela superfície pública e mudar para autenticado somente
   quando a URL ou o objetivo exigir.

Quando o objetivo declarado for **extrair uma referência visual para reprodução**, leia e
siga também `../.agents/WEB_REFERENCE_STANDARD.md`: a coleta deve inventariar integralmente
as telas/seções no escopo, tokens, tipografia, conteúdo, assets, responsividade, estados e
motion. Agrupar templates pode economizar repetição, mas não autoriza omitir variações
distintivas sem registrá-las como lacuna. As regras de privacidade/Git abaixo continuam válidas.

## Gates obrigatórios

1. **Escopo:** a URL e o objetivo vieram do Carlos. Não descobrir outros hosts,
   organizações, contas ou rotas por conta própria.
2. **Acesso:** não contornar login, paywall, bloqueio, rate limit, robots ou
   permissão. Nunca pedir senha, 2FA, token ou cookie no chat.
3. **Leitura:** não enviar formulários nem clicar em salvar, publicar, excluir,
   comprar, contratar, convidar, aprovar, disparar ou alterar configurações.
4. **Privacidade:** minimizar PII e mascarar capturas usadas como evidência.
5. **Cobertura:** `ok` não significa site inteiro. Declarar páginas, templates,
   jornadas, papéis, fila restante, bloqueios e erros.
6. **Evidência:** separar observado, inferido e indisponível. Auditoria de
   superfície não é pentest, parecer jurídico nem auditoria de código.
7. **Entrega:** gerar e conferir `.md` e `.html`, com data, amostra e limitações.

## Estratégia de custo

1. Extrair deterministicamente textos, metadados, links, headings, formulários,
   estilos computados, tecnologias observáveis e checks básicos.
2. Agrupar páginas por template e aprofundar representantes.
3. Capturar desktop/mobile em páginas e estados críticos.
4. Usar visão por IA apenas onde DOM, texto e screenshots não resolvem.
5. API paga somente com autorização explícita.

## Lentes obrigatórias

- arquitetura da informação e jornadas;
- conteúdo, proposta, narrativa e voz;
- marca, identidade visual, consistência e confiança;
- UX, responsividade e acessibilidade observável;
- conversão, prova, CTAs e fricções;
- SEO on-page e descoberta observável;
- tecnologia e qualidade de superfície;
- funcionalidades e estados, quando for plataforma.

Quando SEO/Google for parte relevante do objetivo, usar também `seo-growth` e
`.agents/SEO_GROWTH_STANDARD.md`: inventariar indexação, title/description/H1, canonical,
sitemap/robots, links, schema, conteúdo/provas e mensuração observáveis. Não afirmar ranking,
tráfego, Core Web Vitals de campo ou indexação sem a fonte correspondente; encaminhar o gate e
plano de correção para Nina SEO.

## Dados e Git

- `projetos/` é local e ignorado pelo Git, exceto `.gitkeep`.
- Nunca commitar screenshots, textos coletados, manifestos reais, cookies,
  credenciais, dados pessoais ou relatórios de clientes sem revisão explícita.
- Não redistribuir conteúdo coletado. Usar apenas a evidência necessária.

## Formato do `_LOG.md`

```markdown
## [AAAA-MM-DD] auditoria | <slug> | <resumo>
- Escopo: <URL, modo, páginas/jornadas>
- Coleta: <contagens, bloqueios e erros>
- Análise: <templates e lentes aplicadas>
- Entregas: <caminhos .md e .html>
- Próximo passo: <ação/gate>
```
