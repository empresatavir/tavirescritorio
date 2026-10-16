# Instagram Platform API — snapshot operacional

> **Revisão: 2026-08-30**, confrontada também com a coleção oficial da Meta no Postman
> (`postman.com/meta/instagram`).
> Conceitos, endpoints e fluxos abaixo vieram da fonte; **versão da Graph API,
> specs de mídia, escopos e limites são voláteis — `[VERIFICAR]` nos links da
> SKILL.md antes de produção.** Divergiu? Atualize aqui com nova data.

## Hierarquia de objetos (o mapa mental)

```
Meta App (developers.facebook.com) — use case "Instagram"
├── trilha A: Instagram API with Instagram Login
│   └── Conta Instagram Business/Creator  ← autoriza direto, SEM Página do Facebook
│       └── Instagram User Access Token (host graph.instagram.com)
└── trilha B: Instagram API with Facebook Login
    └── Business Portfolio → Página do Facebook → Conta Instagram vinculada
        └── Page Access Token (host graph.facebook.com)
```

| Aspecto | Instagram Login | Facebook Login |
|---|---|---|
| Host da API | `graph.instagram.com` | `graph.facebook.com` (+ `rupload.facebook.com`) |
| Token | Instagram User | Facebook Page |
| Conta exigida | Business ou Creator | Business/Creator **vinculada a uma Página** |
| Permissões (publicação) | `instagram_business_basic`, `instagram_business_content_publish` | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (+ `pages_show_list`, `business_management`) |
| Permissões (Insights) | `instagram_business_manage_insights` (+ basic) | `instagram_manage_insights`, `instagram_basic`, `pages_read_engagement` |
| Permissões (mensagens) | `instagram_business_manage_messages` | `instagram_manage_messages` + as acima |
| Comentários | `instagram_business_manage_comments` | `instagram_manage_comments` |
| Exclusivos | Helper de teste de mensagem no painel | Hashtag search, dados de outros negócios, upload retomável de vídeo |

> Escopos antigos do Instagram Basic Display foram substituídos pelos
> `instagram_business_*`; os antigos foram depreciados em **27/01/2025**.

## O que a trilha Instagram Login entrega (e o que não entrega)

Fonte: `docs/instagram-platform/instagram-api-with-instagram-login` (2026-08-16).

Cinco capacidades para contas **profissionais** (business e creator):

| Capacidade | O que faz | Escopo |
|---|---|---|
| Publicação de conteúdo | ler e publicar mídia | `instagram_business_content_publish` |
| Comentários | moderar e responder comentários | `instagram_business_manage_comments` |
| Insights de mídia/conta | métricas agregadas da mídia e da conta | `instagram_business_manage_insights` (+ basic) |
| Menções | identificar `@mentions` feitos por outros | `instagram_business_basic` |
| Mensagens | enviar/receber DMs | `instagram_business_manage_messages` |

- **Não exige Página do Facebook** vinculada à conta profissional.
- **Não acessa anúncios nem tagging** — se o projeto precisar disso, a trilha é
  Facebook Login (ou a API de Ads, outro escopo). Ponto de decisão de arquitetura.
- Escopos antigos (Basic Display) depreciados em **27/01/2025** — código legado
  com escopo antigo simplesmente para de autorizar.

## Publicação de conteúdo (o núcleo da ferramenta de postagem)

Sempre **duas etapas** — container e publish:

```
1) POST /<IG_ID>/media
   image_url= | video_url=   (URL PÚBLICA no momento da chamada)
   media_type= VIDEO | REELS | STORIES | CAROUSEL   (imagem no feed: omitir)
   caption=, alt_text= (só imagem), is_carousel_item=, is_ai_generated=
   → devolve  { "id": <IG_CONTAINER_ID> }

2) GET /<IG_CONTAINER_ID>?fields=status_code       ← poll para vídeo/Reels
   IN_PROGRESS → FINISHED → publicar | ERROR | EXPIRED (24h sem publicar)

3) POST /<IG_ID>/media_publish
   creation_id=<IG_CONTAINER_ID>
```

- **Carrossel**: criar cada filho com `is_carousel_item=true`, depois um container
  `media_type=CAROUSEL` com `children=<id1>,<id2>,...` — **até 10** itens,
  imagens e vídeos misturados.
- **Reels**: `media_type=REELS`. **Stories**: `media_type=STORIES`.
- **Imagem**: apenas **JPEG**; filtros e tags de compra não são suportados.
- **Vídeo grande**: upload retomável (`upload_type=resumable` →
  `POST https://rupload.facebook.com/ig-api-upload/<IG_MEDIA_CONTAINER_ID>`),
  disponível na trilha **Facebook Login**.
- **IA**: `is_ai_generated=true` na criação do container quando o conteúdo for
  gerado por IA (caso do DarkFlow — declarar).
- **Publipost**: `branded_content_sponsor_ids` (máx. 2) ou `is_paid_partnership=true`.
- **Specs de mídia** (duração, resolução, aspect ratio, tamanho máximo, limite de
  caracteres da legenda e de hashtags): **`[VERIFICAR]`** — não estão na página de
  referência de mídia; conferir a página de content publishing/guidelines antes de
  validar arquivo no upload da ferramenta.

## Limite de publicação

- **100 posts publicados por API em janela móvel de 24h, por conta.**
- Consultar: `GET /<IG_ID>/content_publishing_limit`.
- O agendador deve consultar esse endpoint, não estimar localmente — posts feitos
  pelo app do Instagram/outras ferramentas também contam.

## Insights e telemetria

- Conta: `GET /<IG_ID>/insights?metric=...&period=day`.
- Mídia: `GET /<MEDIA_ID>/insights?metric=...`.
- Na trilha Instagram Login, solicitar `instagram_business_basic` e
  `instagram_business_manage_insights`. Na trilha Facebook Login, solicitar
  `instagram_basic`, `instagram_manage_insights` e `pages_read_engagement`.
- Métricas variam por tipo de mídia e versão da API. Uma combinação incompatível
  deve ser tratada como indisponível, nunca como zero.
- A Meta informa que alguns dados de conta ficam disponíveis por até 90 dias e
  que certas métricas demográficas não aparecem abaixo do limiar de 100 seguidores.
- Conjunto operacional candidato para Reels: `views`, `reach`, `likes`, `comments`,
  `saved`, `shares`, `plays`, `follows`, `profile_visits`,
  `ig_reels_avg_watch_time` e `reels_skip_rate`; **validar compatibilidade na
  versão configurada antes de ativar a coleta real**.

## Autenticação — Business Login for Instagram (trilha Instagram Login)

```
1) Autorização (navegador do dono da conta)
   GET https://www.instagram.com/oauth/authorize
       client_id=<INSTAGRAM_APP_ID>&redirect_uri=<URI>&response_type=code
       &scope=instagram_business_basic,instagram_business_content_publish,
              instagram_business_manage_insights
       &state=<csrf>     [opcional: enable_fb_login=, force_reauth=]
   → redirect com ?code=...   (válido 1 hora, uso único)

2) Troca por token curto (SERVER-SIDE)
   POST https://api.instagram.com/oauth/access_token
       client_id, client_secret, grant_type=authorization_code, redirect_uri, code
   → access_token curto + user_id (Instagram-scoped) + permissions

3) Troca por token longo (60 dias)
   GET https://graph.instagram.com/access_token
       grant_type=ig_exchange_token&client_secret=...&access_token=<curto>

4) Refresh do token longo (mais 60 dias)
   GET https://graph.instagram.com/refresh_access_token
       grant_type=ig_refresh_token&access_token=<longo>
```

- Refresh exige token **com ≥24h de idade**, ainda válido, e permissão
  `instagram_business_basic` concedida.
- **Token não renovado por 60 dias expira e não pode mais ser renovado** — o
  cliente precisa reautorizar do zero. Job de renovação é obrigatório.
- `redirect_uri` tem de bater **exatamente** com uma das URIs válidas cadastradas
  (atenção a barra final que o painel às vezes acrescenta).
- No painel, além do redirect: **Deauthorization callback URL** e **Data deletion
  request URL** nas configurações de business login.

## Webhooks

- Configurados no use case: **Callback URL** + **Verify token** → "Verify and save",
  depois assinar os campos do produto Instagram.
- Na trilha Facebook Login: "Add more to this use case" → "Get real-time
  notifications with Webhooks" → produto Instagram.
- **Webhooks exigem o app publicado** ("Some functionality, such as webhooks,
  require your app to be published").
- Validação de assinatura `X-Hub-Signature-256`, resposta 200 imediata e dedup
  seguem o mesmo padrão da Cloud API `[VERIFICAR na página de webhooks]`.

## Requisitos de produção (checklist)

1. Meta App com use case de Instagram adicionado e permissões requeridas.
2. Conta Instagram **Business ou Creator** (Creator/Business é pré-requisito;
   conta pessoal não tem API).
3. Trilha escolhida e documentada (Instagram Login × Facebook Login).
4. Ícone do app, URL de política de privacidade e categoria preenchidos
   (bloqueiam o App Review).
5. App Review aprovado por permissão: descrição de uso + **gravação de tela** da
   implementação + confirmação de conformidade de dados.
6. App **publicado**.
7. Servindo contas de clientes → **Tech Provider**: verificação de negócio +
   verificação de acesso + App Review.
8. Token longo cifrado por tenant + job de refresh + reautorização quando falhar.
9. Hospedagem pública das mídias no instante do POST do container.

## Pegadinhas conhecidas

- Container `EXPIRED` = criado há mais de 24h. Agendar ≠ pré-criar container.
- Publicar Reels antes de `status_code=FINISHED` falha; sempre poll.
- URL de mídia privada/assinada com validade curta → erro de download na Meta.
- `code` do OAuth: 1 hora, uso único — não reprocessar retry com o mesmo code.
- Trocar short→long-lived em cliente/browser é bloqueado (server-side only).
- Erro clássico de `redirect_uri` por barra final divergente.
- Sem app publicado, webhook simplesmente não chega — não é bug do código.
- Limite de 100/24h é **por conta**, não por app: cliente com muitas contas
  precisa de contagem por conta.
