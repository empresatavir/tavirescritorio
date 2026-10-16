---
name: conteudo-orquestrar
description: Orquestrar ciclos editoriais de uma marca sem misturar Instagram, LinkedIn e YouTube. Use ao criar pauta, calendário semanal ou mensal, campanha de conteúdo, reaproveitamento entre canais, pacote para produção no Flow ou manifesto para agendamento. Não substitui as skills especializadas de cada plataforma.
---

# Conteúdo Orquestrar

Atue como direção editorial e porta única do ciclo. Preserve uma estratégia comum, mas encaminhe
cada canal para sua própria skill. Nunca escreva um “post universal”.

## Antes de planejar

1. Leia `marketing/CLAUDE.md`, o `PROJECT.md` do projeto e o contexto vigente da marca.
2. Localize um **Brand Context Pack** aprovado da empresa. Ele é a fonte operacional de logo,
   tokens, tipografia, direção visual, voz, ativos autorizados, direitos, proibições, responsável
   e versão. Use [references/brand-context-pack.md](references/brand-context-pack.md).
   Sem esse pack, é permitido apenas levantar as lacunas e rascunhar texto marcado como pendente;
   é proibido gerar prompt visual, escolher cor/fonte/logo por inferência, produzir mídia ou
   avançar para `approved_for_production`.
   Para a TAVIR, o pack deve apontar para o brand book e os ativos oficiais vigentes; não usar
   Basalto, AgenciaIA ou "Empresa Cognitiva" como substitutos públicos da marca.
3. Confirme objetivo de negócio, oferta/CTA real, público, canais ativos, capacidade de produção e
   métrica do ciclo. Quando faltar dado, marque `[HIPÓTESE]`; não transforme benchmark em fato.
4. Consulte `marketing/inteligencia-nichos/` e diagnósticos autorizados de Íris, Yuri e Nina.
5. Se houver conteúdo publicado, use os dados da própria conta antes de recomendações genéricas.

## Contrato de separação

- **Instagram:** acione `conteudo-instagram` para feed, carrossel, Reel, Stories, legenda, busca e
  pacote Flow.
- **LinkedIn:** acione `conteudo-linkedin` para página ou perfil, texto, documento, vídeo,
  artigo/newsletter e conversa B2B.
- **YouTube:** acione `conteudo-youtube` para Short, vídeo longo, roteiro, thumbnail, metadata e
  retenção.
- Uma ideia pode gerar variantes por canal, mas cada variante recebe gancho, estrutura, CTA,
  criativo e métrica próprios. Cross-post literal é reprovado.
- Canal não ativado recebe backlog e contrato; não entra no calendário nem cria trabalho oculto.

## Fluxo

1. Abra um `brief-ciclo.md` com o problema, objetivo, audiência, promessa permitida, provas,
   proibições, CTA, janela, capacidade, hipótese principal e `brand_pack_ref`.
2. Construa 3–5 pilares editoriais que conectem problema real, ponto de vista da marca, prova e
   próximo passo. Em B2B, cubra também champion, decisor econômico, comprador técnico e usuário
   somente quando esses papéis existirem no caso.
3. Selecione o menor conjunto de peças capaz de testar as hipóteses. Cadência é capacidade
   sustentável, não superstição de algoritmo.
4. Encaminhe cada peça à skill de canal e consolide o resultado pelo contrato em
   [references/contrato-editorial.md](references/contrato-editorial.md).
5. Submeta o lote a gates de fato/prova, marca, canal, direitos/IA, acessibilidade e aprovação do
   responsável. Nenhuma skill publica por conta própria.
6. Depois do ciclo, registre baseline, amostra, resultado e decisão `VALIDADO`, `REFUTADO` ou
   `INCONCLUSIVO`. A métrica-mãe da casa é conversa qualificada; alcance e seguidores são sinais
   auxiliares.

Quando o trabalho incluir abertura ou otimização de perfil, entregue também um **Profile
Foundation Pack**: 3–5 BIOs dentro do limite da plataforma, nome/categoria, link/CTA, Destaques,
posts fixados e uma recomendação justificada. A BIO escolhida deve permanecer estável durante a
janela do experimento, salvo erro factual ou risco, para não contaminar a leitura de conversão.

## Flow e agendamento

Para produção manual no Google Flow, exija do canal um pacote com nomes de arquivo, proporção,
prompt, ingredientes/referências, texto em tela, negativos, variações e checklist de exportação.
O prompt visual deve copiar apenas decisões e ativos registrados no Brand Context Pack; logo é
sempre ingrediente oficial/overlay, nunca reconstrução pelo gerador.
Não invente que um modelo ou recurso está disponível: confira no seletor do Flow e nas fontes
oficiais do canal antes do lote.

Para DarkFlow ou outro agendador, só produza manifesto neutro após `qa_approved`. O manifesto não
é autorização de publicação e não contém token, cookie, ID privado ou mídia não licenciada. Leia
[references/manifesto-agendamento.md](references/manifesto-agendamento.md).

## Resultado mínimo

- brief do ciclo;
- mapa de pilares, funil e hipóteses;
- calendário por canal ativo;
- Profile Foundation Pack quando houver perfil novo ou reposicionamento;
- pacotes de produção separados;
- matriz de aprovação e direitos;
- manifesto de agendamento quando aplicável;
- plano de medição e retrospectiva.
