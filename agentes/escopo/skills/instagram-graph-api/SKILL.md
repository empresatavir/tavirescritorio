---
name: instagram-graph-api
description: >-
  Especialista na Instagram Platform API oficial da Meta (Graph API): criação do
  app Meta com o use case de Instagram, Business Login for Instagram (OAuth),
  tokens de longa duração e refresh, publicação de conteúdo (imagem, vídeo,
  Reels, Stories, carrossel) via container + media_publish, limite de 100 posts/
  24h, webhooks, App Review e publicação do app. Use SEMPRE que for gerar,
  revisar ou depurar código que fala com graph.instagram.com ou
  graph.facebook.com/<IG_ID>, ao trabalhar na ferramenta de POSTAGEM AUTOMÁTICA
  no Instagram (card #17, vídeos do DarkFlow), ou quando a conversa envolver
  "publicar no Instagram por API", "agendar post", "token do Instagram expirou",
  "instagram_business_content_publish", "container EXPIRED" ou App Review da Meta.
---

# Skill Instagram Platform API — a API oficial da Meta para Instagram

## Regra híbrida
1. **Leia primeiro** `references/api-snapshot.md` (fluxos e conceitos estáveis) e
   `references/app-setup-use-case.md` (criação/customização do app no painel).
2. **Verifique na fonte o que é volátil**: versão da Graph API, specs de mídia
   (duração/tamanho/aspect ratio de Reels), escopos, limites e política de
   review — WebFetch nos links abaixo.
3. Divergência snapshot × doc oficial → **atualize o snapshot** (nova data) no
   mesmo commit.

## Fontes oficiais (WebFetch direto)
| O quê | Link |
|---|---|
| Criar app / use case Instagram | https://developers.facebook.com/documentation/development/create-an-app/instagram-use-case |
| Visão geral da Instagram Platform | https://developers.facebook.com/docs/instagram-platform |
| Publicação de conteúdo | https://developers.facebook.com/docs/instagram-platform/content-publishing |
| Business Login for Instagram (OAuth) | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login |
| Referência de mídia | https://developers.facebook.com/docs/instagram-platform/reference/instagram-media |
| Webhooks | https://developers.facebook.com/docs/instagram-platform/webhooks |
| App Review / permissões | https://developers.facebook.com/docs/graph-api/overview/access-levels |
| Changelog da Graph API | https://developers.facebook.com/docs/graph-api/changelog |

## Regras de ouro da agência
- **Escolha a trilha ANTES de codar.** *Instagram Login* (`graph.instagram.com`,
  token de usuário Instagram, conta Business/Creator, **não** exige Página do
  Facebook) é o caminho natural para uma ferramenta de postagem própria/SaaS.
  *Facebook Login* (`graph.facebook.com`, token de Página) só quando o cliente já
  vive no ecossistema Página+Portfólio, ou quando precisar de recurso exclusivo
  (hashtag search, upload retomável de vídeo grande, dados de outros negócios).
  Trocar de trilha depois **reescreve** auth, hosts e permissões.
- **Publicar é sempre 2 chamadas**: cria o *container* (`POST /<IG_ID>/media`) e
  depois publica (`POST /<IG_ID>/media_publish` com `creation_id`). Vídeo/Reels
  exige **poll do `status_code`** até `FINISHED` — publicar antes disso falha.
- **Container vence em 24h** (`EXPIRED`). Agendador que enfileira container muito
  antes da hora do post está errado: crie o container perto da publicação.
- **Limite de 100 posts publicados por API em 24h móveis por conta.** Checar em
  `GET /<IG_ID>/content_publishing_limit` antes de disparar lote — nunca contar
  no código local, que não enxerga posts feitos fora da ferramenta.
- **Mídia tem de estar em URL pública** no momento da chamada (a Meta baixa o
  arquivo). Bucket privado/signed URL curta é causa clássica de erro.
- **Token de longa duração dura 60 dias e só sobrevive com refresh.** Sem job de
  renovação (≥24h de idade, antes dos 60 dias), toda conta conectada cai em
  silêncio. Esse job é requisito de produção, não melhoria.
- **Publicar o app + App Review não é etapa final opcional**: webhooks e acesso a
  conta de terceiro só funcionam com o app publicado e permissões aprovadas.
  Servir contas de clientes = trilha **Tech Provider** (verificação de negócio +
  verificação de acesso + App Review). Orçar prazo por isso.
- Segredo (`client_secret`, tokens de cliente) **cifrado e por tenant** — nunca
  em front-end, argv ou repositório. Troca de short→long-lived é **server-side**
  obrigatoriamente.
- Nada de automação que burle a plataforma: a API oficial publica, mas conteúdo,
  frequência e consentimento do dono da conta seguem as políticas da Meta e a
  LGPD. Conta suspensa é prejuízo do cliente.
- **Conformidade é skill irmã:** o que a Meta exige em troca do acesso
  (consentimento para postar em nome do usuário, política de privacidade,
  exclusão de dados, segregação por cliente no Tech Provider, auditoria,
  suspensão por desuso) está em **`meta-plataforma-politicas`** — consultar
  antes de App Review, de contrato de cliente e do gate do Auditor Seg/LGPD.
