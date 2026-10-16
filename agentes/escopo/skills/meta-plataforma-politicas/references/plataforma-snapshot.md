# Termos da Plataforma + Políticas do Desenvolvedor da Meta — snapshot

> **Revisão: 2026-08-16**, extraída de `developers.facebook.com/terms/` e
> `developers.facebook.com/devpolicy/`. Numeração de seções conforme os
> documentos na data. **Termos e políticas mudam com vigência anunciada —
> `[VERIFICAR]` na fonte antes de contrato, App Review ou auditoria.**

---

# Parte 1 — Termos da Plataforma da Meta

## Seção 3 — Uso e compartilhamento de dados

**Práticas proibidas.** Não usar dados da plataforma para: discriminar pessoas;
determinar elegibilidade a moradia, emprego ou crédito; facilitar vigilância;
vender dados da plataforma; criar perfis de usuário sem consentimento; fazer
engenharia reversa dos dados; alterar a funcionalidade do app sem aprovação.

**Dados restritos.** Só solicitar dados restritos quando **melhoram
significativamente** a experiência do usuário, e deixar clara a finalidade.

**Compartilhamento permitido apenas:** (1) por exigência legal; (2) com
prestadores de serviço que sigam suas instruções; (3) com consentimento do
usuário; (4) com terceiros sob contrato que proíba violar os Termos.
Tech Providers têm restrição adicional sobre dados de cliente.

## Seção 3.d — Exclusão e retenção

- Atualizar ou excluir dados **imediatamente após** pedido do usuário ou da Meta.
- Excluir quando os dados **não forem mais necessários** à finalidade legítima,
  ao encerrar o serviço, a pedido da Meta, a pedido do usuário ou por lei.
- Recebimento acidental de dados: **notificar pelo formulário de incidente** e
  excluir prontamente.

## Seção 4 — Consentimento e transparência

Política de privacidade **publicamente acessível** explicando: que dados são
processados, como são tratados, para quê, e o direito de exclusão do usuário. O
tratamento real tem de bater com a política publicada e com a lei aplicável.

## Seção 5.a — Prestador de serviço (service provider)

Contrato **escrito** obrigando o prestador a usar a plataforma somente conforme
suas instruções, para os serviços declarados, cumprindo os Termos. **Você
responde pela conformidade dele** e precisa garantir a exclusão dos dados
imediatamente ao fim da relação.

## Seção 5.b — Tech Provider

- Usar dados da plataforma **apenas para a finalidade do cliente**, sob instrução
  do cliente.
- **Manter os dados de cada cliente separados.**
- Compartilhar só com: o próprio cliente, prestadores de serviço (no necessário),
  ou por exigência legal.
- Os clientes precisam **aceitar os termos aplicáveis**.
- **Encerrar o acesso do cliente imediatamente** se a Meta mandar (violação ou dano).

## Seção 6 — Segurança

Proteções administrativas, físicas e técnicas de **padrão de mercado**,
proporcionais à sensibilidade do dado, contra processamento não autorizado
(acesso, destruição, perda, alteração, divulgação, comprometimento). Manter
**mecanismo acessível de reporte de vulnerabilidade** e corrigir deficiências
imediatamente.

## Seção 7.c — Auditoria

A Meta pode auditar **anualmente** (mais vezes se suspeitar de violação), com
**10 dias úteis** de aviso — salvo urgência. Exige acesso pleno a informações e
cooperação de pessoal. Achando violação, **você reembolsa o custo da auditoria**.
O direito de auditoria sobrevive **1 ano após o encerramento**.

## Seção 7.e — Suspensão e encerramento

A Meta pode suspender/encerrar app e conta se você não responder prontamente a
pedidos de monitoramento, violar os Termos, criar apps para burlar enforcement,
ou por exigência legal. **Enforcement pode ocorrer sem aviso**, inclusive
automático. **Acesso de API sem uso pode ser suspenso após 28 dias.**

---

# Parte 2 — Políticas do Desenvolvedor

## 1. Produtos confiáveis
- Contas autênticas para desenvolver e administrar o app.
- Conteúdo conforme os **Padrões da Comunidade**.
- Proibido: malware, spyware, engano, spam, fraude.
- Seguir a documentação de desenvolvedor.
- **"Obtain the consent of the people to post content or take action on their
  behalf"** — consentimento para postar ou agir em nome de alguém.
- Oferecer suporte e canal de reporte de problemas acessíveis.
- Apps de utilidade mínima que entregam avaliação de personalidade ou previsão
  comportamental podem ser rejeitados.

## 2. Uso adequado
- Geofencing e restrição de idade conforme a lei.
- Respeitar aparência e limites operacionais dos produtos Meta.
- Seguir as diretrizes de marca ao usar logo/marca da Meta.
- **Proibido participar de programa de compra/venda/troca de curtidas,
  compartilhamentos ou seguidores.**
- Jogos de aposta/dinheiro real exigem permissão escrita prévia.

## 3. Informação crítica
- A Meta comunica por alertas e e-mails dos domínios `meta.com`, `fb.com`,
  `facebookmail.com` — **qualquer outro remetente é phishing**.
- Apps iOS/Android publicados nas lojas compatíveis.
- Manter dados do Business Manager atualizados.

## 4. Jogos
Compras in-game só por APIs Meta; divulgar cobranças; não republicar jogo
idêntico; Instant Games não coletam dado pessoal sensível nem montam perfil, e
usam somente a Games Ads API.

## 5. Messenger Platform e APIs de mensagens do Instagram
- **Consentimento legalmente suficiente antes de contatar** o usuário.
- Meio **contínuo** de cancelamento; respeitar block/opt-out imediatamente.
- Mensagens dentro de **24h** da interação; fora da janela, só com *message tags*
  conforme a documentação.
- **Message tag não serve para promoção, upsell ou oferta do dia.**
- **"Do not automatically populate content in messages unless created by a
  person"** — não preencher conteúdo de mensagem automaticamente sem autoria humana.
- Sem spam, sem ocultar identidade sem oferecer bloqueio, sem dado de cartão em
  mensagem/chamada, e não é canal para conversa direta médico-paciente.
- Monitorar **block rate**.
- Chamadas: **somente VoIP-a-VoIP** (nada de PSTN).
- Instagram vinculado: o dono da conta precisa saber que admins da Página veem e
  respondem DMs do Instagram.

## 6. Instagram Platform
- **Respeitar as restrições do dono do conteúdo** sobre fotos/vídeos de usuários.
- **Não usar a plataforma apenas para exibir, fazer backup ou importar conteúdo de
  usuário sem permissão prévia.**

## 7. Marketplace / 8. Commerce
Tech Providers garantem que os clientes aceitem o **Merchant Agreement**; dados de
formulário do Marketplace não se transferem a terceiros nem servem a outra
finalidade que não contatar sobre o anúncio específico; implementar novas versões
da Commerce Platform quando instruído.

## 9. Live API
Conteúdo **pré-gravado tem de ser claramente distinguível** de conteúdo ao vivo.
Proibido publicar como live: vídeo em loop, imagem estática/animada, enquete
estática. Lembrar usuários de não inserir anúncio de terceiro no live.

## 10. Anúncios
- Seguir os **Padrões de Publicidade** da Meta.
- **Não incluir anúncio de terceiro** em posts, comentários, notificações,
  convites ou mensagens; não parear Login/Social Plugins com anúncio não-Meta.
- **Acesso Standard/Advanced cai para Development após 30 dias sem uso.**
- **Transparência (vigente em 03/02/2027):** revelar ao anunciante final (i) o
  gasto de mídia Meta separado da sua taxa e a estrutura de cobrança;
  (ii) configuração de campanha e relatórios pós-campanha na terminologia da Meta;
  e exibir o relatório Meta separado do de outros veículos. **Impacta o braço
  marketing/ e a precificação de gestão de tráfego.**
- Dados de anúncio só de forma agregada/anonimizada para avaliar desempenho; sem
  retargeting dentro/fora da Meta, sem misturar com anúncio de outra plataforma,
  **sem criar ou enriquecer perfil de usuário**; dados segregados por anunciante.

## 11. Pages API
Cumprir as políticas de Páginas/Grupos/Eventos; não cobrar para criar ou
reivindicar Página; oferecer reivindicar Local existente antes de criar Página
nova; clientes aceitam ToS e Padrões de Publicidade; **não criar/reivindicar
Página em nome de terceiro sem consentimento**; não bloquear o cliente de acessar
a Página que você administra para ele; não revelar admins a terceiros sem consentimento.

## 12. Social Plugins
Não parear com anúncio não-Meta, não comprar/vender posicionamento, não obscurecer
ou cobrir elementos do plugin.

## 13. Pagamentos
Seguir os Developer Payment Terms ao usar Meta Payments; não solicitar/transferir
doação sem permissão prévia; apps iOS usam formas de pagamento aprovadas; aceitar
pagamento apenas dentro do app.

## 14. Instant Experiences
Vendendo bens/serviços, cumprir o Merchant Agreement; preço total exato; recurso
de pagamento só em países fora dos EUA mediante aprovação.

---

# Leitura aplicada — ferramenta de postagem automática (card #17)

| Regra | Consequência de projeto |
|---|---|
| Consentimento para postar em nome do usuário (§1) | fluxo de autorização registrado, revogável, com log de quem autorizou e quando |
| Exclusão imediata sob pedido (Termos §3.d) | Deauthorization callback + Data deletion URL que **apagam de verdade**, não só respondem 200 |
| Política de privacidade pública (Termos §4) | pré-requisito do App Review — bloqueia o lançamento se faltar |
| Tech Provider com dados segregados (Termos §5.b) | multi-tenant com isolamento por cliente + DPA no contrato |
| Conteúdo automático em mensagem sem autoria humana (§5) | se a ferramenta evoluir para DM automática, o texto precisa ter origem humana |
| Conteúdo do dono / não usar só para importar mídia (§6) | publicar mídia gerada pelo DarkFlow para a conta do próprio cliente é legítimo; repostar conteúdo de terceiro não |
| API sem uso suspensa em ~28 dias (Termos §7.e) | cliente que pausa a operação volta com acesso quebrado — avisar em contrato/SLA |
| Auditoria da Meta com 10 dias úteis (Termos §7.c) | guardar evidências de conformidade do que foi publicado e autorizado |
| Nada de comprar seguidor/curtida (§2) | veta qualquer "turbinar engajamento" na oferta comercial |
