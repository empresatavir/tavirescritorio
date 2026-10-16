# Criar e customizar o app Meta com o use case de Instagram

> **Extraído em 2026-08-16** de
> https://developers.facebook.com/documentation/development/create-an-app/instagram-use-case
> (página "Manage messaging and content on Instagram"). Passos de painel mudam com
> frequência — `[VERIFICAR]` na fonte antes de executar com o cliente ao vivo.

## Fluxo geral no App Dashboard

1. Abrir o Dashboard e ver os use cases adicionados ao app.
2. Selecionar o use case a customizar.
3. Adicionar/remover permissões — **as permissões requeridas não podem ser removidas**.
4. Clicar em **"Ready to test"** e testar no **Graph API Explorer**.
5. Repetir para cada use case.

## Opção A — configuração com Instagram Login

Autenticação por **Business Login for Instagram**.

Permissões: `instagram_business_basic`, `instagram_business_manage_messages`
(para publicar, somar `instagram_business_content_publish`).

1. Clicar em **"Add all required permissions"**.
2. Em **"Generate access tokens"** → **"Add account"**.
3. **"Continue"** e autenticar no popup do Instagram.
4. Salvar e voltar ao Dashboard.
5. Webhooks: informar **Callback URL** + **Verify token** → **"Verify and save"**.
6. Assinar os webhooks do Instagram disponíveis.
7. Completar **"Set up Instagram business login"** com a **Redirect URL**.
8. Nas configurações de business login, informar **Deauthorization callback URL**
   e **Data deletion request URL**.
9. Opcional: submeter via **"Go to app review"**.

Recurso extra: **API Integration Helper** permite mensagem de teste — só em apps
com Instagram Login.

## Opção B — configuração com Facebook Login

Autenticação por **Facebook Login for Business**.

- Permissões para **conteúdo**: `business_management`, `instagram_basic`,
  `instagram_content_publishing`, `pages_read_engagement`, `pages_show_list`.
- Permissões para **mensagens**: `business_management`, `instagram_basic`,
  `instagram_manage_messages`, `pages_read_engagement`, `pages_show_list`.

Webhooks: **"Add more to this use case"** → **"Get real-time notifications with
Webhooks"** → produto **Instagram** no dropdown → Callback URL + Verify token →
selecionar os campos assinados.

## Tech Provider (opcional — obrigatório para servir clientes)

Para apps que atendem clientes ou portfólios de negócio de terceiros:
clicar em **"Become a Tech Provider"** e concluir:

1. **Business verification**;
2. **Access verification** (para acessar dados de outro business portfolio);
3. **App Review** completo.

Concluído, o Dashboard mostra "App customization and requirements" com o status de:
adicionar/customizar use cases · preparar e submeter App Review · publicar o app.

## App Review

**Quando é exigido:** quando o app acessa dados que o desenvolvedor não possui
nem gerencia.

1. **Review > App Review** → **"Edit"** para ver permissões e recursos pedidos.
2. **Complete App Settings**: ícone do app, URL da política de privacidade e
   categoria — obrigatórios para prosseguir.
3. **Complete app verification**: instruções passo a passo de teste e credenciais
   para cada plataforma.
4. Para **cada permissão/recurso**: descrever uso e valor, **enviar gravação de
   tela** demonstrando a implementação, confirmar conformidade de uso de dados.
5. **"Submit for Review"**.

## Publicação do app

**Necessária para:** acessar conteúdo que não é seu e para recursos como webhooks
— *"Some functionality, such as webhooks, require your app to be published."*

1. **"Publish"** no menu à esquerda.
2. Atualizar configurações se solicitado.
3. Revisar use cases e aprovações do App Review.
4. Clicar em **"Publish"**.

## Permissões extras

Antes de submeter, em **"Permissions and features"** (menu esquerdo) é possível
adicionar outras permissões disponíveis relevantes à implementação.
