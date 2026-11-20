# LOG — Análise Web

## [2026-08-16] auditoria | pay-kiwify-com-br | conteúdo e divulgação do Código 20K
- Escopo: checkout público `pay.kiwify.com.br/uSglPgr`, modo público, 1 página, sem envio de formulário ou compra.
- Coleta: status 200, 1 template, screenshots desktop/mobile, zero erros, zero bloqueios; `robots.txt` retornou 404 e a página declara `noindex`.
- Análise: funil anúncio → checkout-vitrine; promessa, módulos, preço, urgência, prova, garantia, pagamento, identidade visual, responsividade, atribuição Meta/UTM e instrumentação observável.
- Achados: oferta de R$ 97 por R$ 37/8x R$ 5,38; inconsistência “mais de 6” × “3” manuais; promessas de renda e prova de 3000 vidas sem base verificável na amostra; conteúdo central em imagens sem alt; skeleton mobile capturado.
- Entregas: `analise-web/projetos/pay-kiwify-com-br/relatorios/relatorio-pay-kiwify-com-br-2026-08-16.md` e `.html` autocontido.
- Verificação: manifesto/inventário/corpus conferidos; Markdown com 241 linhas; HTML autocontido com 21.705 bytes e conteúdo estrutural validado. Verificação visual do HTML ficou indisponível porque nenhum navegador controlável estava conectado; screenshots da fonte foram conferidos.
- Próximo passo: somente aplicar o padrão quando existir projeto de destino concreto, definindo separadamente modo visual e modo de conteúdo.

## [2026-07-18] processo | Atlas Web | referência visual fiel
- Regra: quando o objetivo for extrair referência para reprodução, Atlas lê
  `.agents/WEB_REFERENCE_STANDARD.md` e cobre integralmente telas/seções no escopo, tokens,
  tipografia, conteúdo, assets, responsividade, estados e motion.
- Limite: agrupamento por template não pode esconder variações distintivas; lacunas são declaradas.
- Segurança preservada: privacidade, Git, acesso autorizado e proibição de ações mutáveis continuam.

## [2026-07-15] estrutura | Atlas Web | braço criado
- Escopo: auditoria autorizada de sites públicos e plataformas autenticadas.
- Coleta: coletor renderizado, rastreamento same-host, robots, screenshots e manifesto.
- Análise: conteúdo, narrativa, marca, UX, acessibilidade, conversão, SEO, tecnologia e jornadas.
- Entregas: skill `web-platform-audit`, comando `/web-analisar`, agente Atlas Web e modelos Markdown/HTML.
- Verificação: skill válida; scripts compilados; gate autenticado emitido; coleta local renderizada
  produziu DOM estruturado, estilos, screenshots desktop/mobile, inventário, corpus e mapa de rotas;
  relatório HTML autocontido foi renderizado e conferido visualmente.
- Próximo passo: executar a primeira auditoria real a partir de uma URL fornecida pelo Carlos.

## [2026-07-20] processo | Atlas Web | lente SEO alinhada ao padrão transversal
- Escopo: auditorias com objetivo SEO passam a usar `seo-growth` e inventariar indexação,
  title/description/H1, canonical, sitemap/robots, links, schema, conteúdo/provas e mensuração.
- Evidência: ranking, tráfego, indexação e Core Web Vitals de campo só são afirmados com fonte.
- Handoff: Atlas diagnostica a superfície; Nina SEO aprofunda estratégia, correção e gate de lançamento.

## [2026-08-22] triagem | Raio-X assistido | superfície web não fornecida
- Escopo: verificar se havia URL pública de site ou catálogo autorizada para o case, sem descoberta lateral de propriedades.
- Evidência: nenhuma URL de site, catálogo, delivery ou checkout constava no pacote autorizado; o coletor web não foi inicializado.
- Decisão: registrar a frente como indisponível, sem inferir tecnologia, conversão, indexação ou segurança e sem testar formulários, compra ou área autenticada.
- Saída: limite incorporado aos documentos privados; eventual auditoria depende de URL fornecida e autorização específica.

## [2026-08-24] auditoria | speedpost-com-br | benchmark SaaS autenticado em leitura
- Escopo: `https://speedpost.com.br`, modo híbrido; home pública e seis telas autenticadas autorizadas pelo Carlos.
- Coleta: home renderizada com screenshots desktop/mobile; Dashboard, Agendar Post, Calendário, Carrossel em Massa, Contas/Workspaces e Afiliados registrados sem PII. Configurações e Explorer não renderizaram conteúdo na sessão e ficaram como indisponíveis.
- Análise: precificação por unidade, modelo Workspace, quota, estado operacional, agendamento, ateste editorial e capacidades futuras; nenhuma mídia, conta, workspace, publicação, compra ou ativação foi acionada.
- Entregas: `projetos/speedpost-com-br/relatorios/relatorio-speedpost-com-br-2026-08-24.md` e HTML correspondente.
- Próximo passo: incorporar somente o recorte aprovado ao Gate G0/roadmap do DarkFlow SaaS e validar oficialmente qualquer recurso Meta priorizado.

## [2026-08-31] auditoria | tavir-com-br | Raio-X institucional
- Escopo: `https://tavir.com.br/`, modo público, uma rota, desktop e mobile.
- Coleta: home HTTP 200, uma assinatura de template, Next.js, sem erro de coleta; robots e sitemap observados.
- Análise: marca e proposta consistentes; conversão concentrada no WhatsApp sem atribuição observável; prova e páginas por oferta condicionadas à validação.
- Entregas: relatório completo Markdown/HTML no projeto local ignorado.
- Próximo passo: medir origem → conversa → proposta antes de multiplicar superfícies.

## [2026-09-01] auditoria | upload-post-com | comparação pública para card #84
- Escopo: https://www.upload-post.com/, modo público; sem login ou publicação.
- Coleta: home e páginas públicas alcançadas em desktop/mobile; nenhuma credencial ou conteúdo de cliente.
- Análise: proposta, preços, integrações, MCP, privacidade, DPA, sub-processadores e limites declarados.
- Entregas: relatorios/relatorio-upload-post-2026-09-01.md e .html.
- Próximo passo: piloto canário somente após gate do Oráculo, Jurídico/LGPD e Auditor.
