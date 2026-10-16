---
name: meta-plataforma-politicas
description: >-
  Conformidade com os Termos da Plataforma da Meta e as Políticas do
  Desenvolvedor — obrigações que valem para QUALQUER app Meta da TAVIR
  (Instagram Platform, WhatsApp Cloud API, Meta Ads, Pages, Messenger):
  consentimento para agir/postar em nome do usuário, política de privacidade
  pública, exclusão e retenção de dados, segurança e reporte de
  vulnerabilidade, separação de dados por cliente na trilha Tech Provider,
  direito de auditoria da Meta, suspensão por desuso da API e regras
  anti-spam/automação. Use SEMPRE que for planejar, construir, auditar ou
  contratar algo que integre com API da Meta, ao responder "posso automatizar
  isso?", ao escrever política de privacidade/termo de consentimento de app
  Meta, ao preparar App Review ou Tech Provider, e em qualquer gate do Auditor
  Seg/LGPD ou da Jussara Jurídico envolvendo Meta.
---

# Skill Políticas e Termos da Plataforma Meta — o que pode e o que derruba o app

Esta skill é **transversal**: as skills técnicas (`instagram-graph-api`,
`whatsapp-cloud-api`, `meta-ads`) dizem *como* chamar a API; esta diz *o que a
Meta exige em troca do acesso* e o que faz o app ser suspenso.

## Regra híbrida
1. **Leia primeiro** `references/plataforma-snapshot.md` (obrigações e políticas
   por seção, com data).
2. **Verifique na fonte** antes de fechar contrato, App Review ou auditoria —
   Termos e Políticas mudam com data de vigência anunciada.
3. Divergência snapshot × doc oficial → **atualize o snapshot** (nova data) no
   mesmo commit.

## Fontes oficiais (WebFetch direto)
| O quê | Link |
|---|---|
| Termos da Plataforma da Meta | https://developers.facebook.com/terms/ |
| Políticas do Desenvolvedor | https://developers.facebook.com/devpolicy/ |
| Padrões da Comunidade | https://transparency.meta.com/policies/community-standards/ |
| Padrões de Publicidade | https://transparency.meta.com/policies/ad-standards/ |
| Níveis de acesso / App Review | https://developers.facebook.com/docs/graph-api/overview/access-levels |
| Diretrizes de marca Meta | https://about.meta.com/brand/resources/ |

## Regras de ouro da agência
- **Consentimento para agir em nome do usuário não é detalhe de UX, é política
  expressa** ("Obtain the consent of the people to post content or take action on
  their behalf"). Toda ferramenta que publica, responde ou agenda em nome de um
  cliente precisa de autorização registrada e revogável — e isso conversa direto
  com o contrato e a LGPD (chamar `juridico-contratos`).
- **Conteúdo automático tem limite.** Em mensagens, a Meta proíbe popular conteúdo
  automaticamente sem que tenha sido criado por uma pessoa; comportamento
  inautêntico em alta frequência e spam derrubam o app. Publicação agendada de
  conteúdo do próprio cliente é legítima; disparo em massa/robotizado não é.
- **Política de privacidade pública é requisito de App Review**, não de vaidade:
  precisa dizer que dado é tratado, para quê e como o usuário apaga.
- **Exclusão de dados é imediata sob pedido** do usuário ou da Meta, e ao fim do
  serviço. Todo app Meta precisa de **Deauthorization callback** e **Data deletion
  request URL** funcionando — e o backend tem de realmente apagar.
- **Tech Provider = dados de cliente segregados.** Usar os dados só para a
  finalidade daquele cliente, sob instrução dele, sem misturar entre clientes, e
  cortar o acesso do cliente imediatamente se a Meta mandar. Isso vira cláusula
  contratual (DPA) — não é só arquitetura.
- **A Meta pode auditar** (anual, 10 dias úteis de aviso, mais frequente se
  suspeitar de violação) e cobrar o custo da auditoria se achar violação — o
  direito sobrevive 1 ano após o encerramento. Guardar evidência de conformidade.
- **App parado perde acesso**: acesso à API sem uso é suspenso (~28 dias nos
  Termos; acesso Standard/Advanced cai para Development após 30 dias sem uso nas
  políticas de Ads). Projeto entregue e engavetado volta quebrado.
- **Nunca** comprar/vender/trocar curtidas, seguidores ou compartilhamentos, nem
  contratar quem faça — proibição explícita.
- Segurança: proteções administrativas/físicas/técnicas de padrão de mercado, e
  **canal acessível para reporte de vulnerabilidade**. Casa com o
  `WEB_SECURITY_STANDARD.md` — o gate do Auditor Seg/LGPD cobre isso.
