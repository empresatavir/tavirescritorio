# Método de análise web

## 1. Classificar a evidência

- **Superfície pública:** DOM renderizado, texto, metadados, screenshots e
  comportamento acessível sem conta.
- **Sessão autenticada:** telas e jornadas observadas no perfil autorizado.
- **Código:** somente quando o usuário também fornecer o repositório. Não inferir
  implementação interna pela interface.
- **Métricas reais:** somente analytics, logs ou dados entregues pelo usuário.

Não transformar sinais técnicos em certeza. Uma classe `wp-` é sinal de
WordPress; uma resposta visual rápida não prova boa performance em produção.

## 2. Amostragem eficiente

1. Inventariar todas as páginas alcançadas.
2. Agrupar por assinatura de template.
3. Escolher ao menos um representante por template e cada página de negócio
   crítica: home, oferta/produto, preço, prova, contato, cadastro e checkout.
4. Em plataformas, escolher uma jornada por objetivo e por papel de usuário
   autorizado. Não tentar descobrir papéis não concedidos.
5. Analisar todo o texto extraído; usar visão apenas nos representantes e estados
   que dependem de composição visual.

## 3. Lentes

### Arquitetura e conteúdo

- mapa, nomenclatura, profundidade, caminhos de entrada e continuidade;
- proposta de valor, hierarquia, escaneabilidade, redundância e lacunas;
- narrativa, voz, vocabulário, consistência e adequação ao público percebido.

### Marca e confiança

- posicionamento percebido, diferenciação e território;
- consistência de cor, tipo, componentes, imagens e tom;
- prova, autoria, contato, políticas, segurança percebida e transparência.

### UX e acessibilidade observável

- orientação, navegação, responsividade, estados vazios/erro/carregamento;
- clareza de controles, feedback, prevenção de erro e recuperação;
- idioma, headings, landmarks, alt, rótulos e foco visível quando verificável.

Os checks automáticos são triagem, não certificação WCAG.

### Conversão

- promessa, correspondência entre intenção e página, CTA e fricção;
- prova, risco percebido, objeções, formulários e continuidade;
- ações macro e micro. Não estimar taxa de conversão sem analytics.

### SEO e descoberta

- títulos, descrições, canônicos, robots/meta, headings, links internos;
- conteúdo duplicado, páginas órfãs dentro da amostra e dados estruturados;
- não afirmar indexação, ranking ou tráfego sem Search Console/analytics.

### Plataforma e jornadas

- entrada, orientação, tarefa principal, confirmação e recuperação;
- consistência entre telas, permissões observadas, ajuda e suporte;
- registrar funcionalidade como observada, parcial ou indisponível.

### Tecnologia e qualidade

- registrar apenas sinais detectados de stack e integrações;
- tempos do navegador de coleta são indicadores locais, não Core Web Vitals;
- auditoria de superfície não é pentest, revisão de segurança ou conformidade.

## 4. Estrutura de cada achado

> **Observado:** padrão ou ausência.<br>
> **Evidência:** URL, tela, screenshot ou arquivo.<br>
> **Impacto:** efeito sobre compreensão, confiança, tarefa ou conversão.<br>
> **Recomendação:** mudança testável.<br>
> **Métrica:** como validar.<br>
> **Confiança:** alta, média ou baixa quando houver inferência.

## 5. Priorização

- **P0:** risco grave, bloqueio total ou exposição evidente; escalar imediatamente.
- **P1:** quebra da jornada principal, confiança ou entendimento da oferta.
- **P2:** fricção relevante e oportunidade mensurável.
- **P3:** refinamento, consistência ou dívida de menor impacto.
