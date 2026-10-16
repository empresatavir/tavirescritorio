---
name: web-platform-audit
description: Audita sites públicos, portais, SaaS, sistemas web e plataformas autenticadas. Faz rastreamento autorizado, captura páginas e jornadas no Chrome, extrai textos, metadados, estrutura, estilos e screenshots responsivos, mapeia funcionalidades e produz relatório profissional em Markdown e HTML sobre conteúdo, narrativa, marca, UX, conversão, SEO, acessibilidade, tecnologia, confiança e oportunidades. Use sempre que o usuário pedir análise, diagnóstico, benchmark, mapeamento ou auditoria de um site, domínio, aplicação web ou plataforma, inclusive quando fornecer apenas uma URL ou quando o acesso depender de login.
---

# Auditoria de sites e plataformas

Operar o braço `analise-web/`. Ler `analise-web/AGENTS.md` antes de qualquer
coleta. Não gravar credenciais, cookies ou dados do cliente no Git.

## Fluxo obrigatório

1. Preparar o ambiente isolado:

   ```powershell
   python .agents/skills/web-platform-audit/scripts/setup_environment.py
   $py = "analise-web/.venv/Scripts/python.exe"
   ```

2. Validar a URL, o objetivo e a autorização. Detectar o modo:
   - **público**: páginas acessíveis sem conta;
   - **autenticado**: conteúdo, jornadas ou estados dependem da sessão do usuário;
   - **híbrido**: auditar a superfície pública e depois as áreas autenticadas.

3. Criar a pasta isolada do projeto:

   ```powershell
   & $py .agents/skills/web-platform-audit/scripts/init_audit.py "<URL>" --mode auto
   ```

4. No modo público, executar o rastreamento renderizado e preparar o corpus:

   ```powershell
   & $py .agents/skills/web-platform-audit/scripts/collect_public.py "<URL>" --max-pages 30 --max-depth 2
   & $py .agents/skills/web-platform-audit/scripts/prepare_analysis.py "analise-web/projetos/<slug>"
   ```

   O coletor permanece no mesmo host, respeita `robots.txt`, não envia
   formulários, não baixa arquivos arbitrários e não visita rotas evidentemente
   destrutivas. Usar `--include-query` somente quando filtros/consultas fizerem
   parte explícita do escopo.

5. No modo autenticado, usar a capability oficial de controle do Chrome porque
   ela preserva a sessão já aberta. Antes de controlar o navegador, ler e seguir
   integralmente a skill `chrome:control-chrome` disponível na sessão.
   - Se a tela pedir login, abrir a URL oficial, pausar e pedir ao Carlos que faça
     login diretamente no Chrome.
   - Nunca pedir usuário, senha, 2FA, token, cookie ou chave no chat.
   - CAPTCHA, MFA, consentimento e troca de organização são sempre ações humanas.
   - Depois da confirmação, retomar na mesma aba e validar visualmente a sessão.
   - Navegar apenas por links, menus, abas, paginação e filtros de leitura.
     Não salvar, publicar, excluir, contratar, comprar, enviar ou alterar dados.
   - Registrar cada tela/jornada conforme
     `references/authenticated-capture.md`, com dados sensíveis minimizados.

6. Ler `controle/manifesto.json`, `processado/inventario.json`, o corpus, o mapa
   de rotas/jornadas e screenshots. Ler `references/analysis-method.md` para a
   análise e `references/report-schema.md` para a entrega.

7. Escrever `relatorios/relatorio-<slug>-AAAA-MM-DD.md` usando
   `assets/report-template.md`. Em cada conclusão distinguir:
   - **Observado**: evidência direta, com URL, tela ou arquivo;
   - **Inferido**: hipótese sustentada, com confiança alta/média/baixa;
   - **Indisponível**: item que não pôde ser verificado.

8. Renderizar o HTML autocontido:

   ```powershell
   & $py .agents/skills/web-platform-audit/scripts/render_report.py "<relatorio.md>"
   ```

9. Verificar Markdown e HTML, abrir o HTML, declarar cobertura, amostra, perfis
   de acesso, limitações e data. Registrar a execução em `analise-web/_LOG.md`.

## Estratégia de custo

- Extrair deterministicamente todo o texto, metadados e estrutura alcançados.
- Agrupar páginas por template e analisar profundamente representantes, não
  reenviar dezenas de páginas equivalentes ao modelo.
- Usar screenshots desktop/mobile nas páginas e estados decisivos.
- Reservar visão por IA para ambiguidades visuais e fluxos críticos.
- Nunca chamar API paga sem autorização explícita.

## Critérios de qualidade

- Separar auditoria de superfície, auditoria autenticada e auditoria de código.
- Não chamar tempos de carregamento locais de Core Web Vitals ou dados reais de
  usuários; são apenas indicadores do ambiente de coleta.
- Não inferir tecnologia, intenção, conversão, segurança ou conformidade sem
  evidência. Uma auditoria visual não substitui pentest nem revisão jurídica.
- Não contornar paywall, bloqueio, rate limit, robots, controle de acesso ou
  permissão. Não descobrir organizações, contas ou rotas fora do escopo.
- Minimizar PII e segredos nas capturas. Mascarar ou omitir dados quando eles não
  forem necessários para provar o achado.
