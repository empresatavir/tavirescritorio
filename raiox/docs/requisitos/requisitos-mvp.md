# Requisitos do MVP — Raio X de Prospecção

## Escopo do piloto

O piloto atende empresas conhecidas, com 3–5 casos acompanhados. Sua função é gerar um diagnóstico
de presença e conversão digital, um plano orgânico priorizado e aprendizado de operação. Não vende
acesso a painel, não executa campanhas e não promete resultado financeiro.

### Dados do formulário

| Bloco | Campos |
|---|---|
| Identidade do convite | empresa, nome do contato e e-mail informados pelo operador no Telegram; não são redigitados no formulário |
| Contato | cargo/função e contexto necessário ao diagnóstico |
| Empresa | nome, nicho, cidade/UF, endereço completo se físico, atuação atual e desejada |
| Presença | Instagram, site, catálogo/loja, WhatsApp, Google Maps, iFood/Zé Delivery/Anota Aí/99Food/outros |
| Oferta e operação | oferta prioritária, diferencial, ticket por faixa, margem conhecida, origem e conclusão dos pedidos, horário/resposta, entrega/retirada e capacidade |
| Marketing | frequência, formatos possíveis, equipe, disponibilidade, aparição em vídeo, mensuração e investimento por faixa |
| Presença local condicional | existência de local presencial, endereço, situação do Perfil da Empresa, área, horários, pico, avaliações e acesso |
| Objetivo | prioridade principal, horizonte, decisão esperada, contexto, obstáculo e o que já foi tentado |
| Consentimentos | fonte pública, pedido posterior de acesso privado, e-mail e uso anonimizado para métricas/case |

Nenhum campo de senha, token, cartão, conversa de cliente ou acesso de administrador entra no
formulário.

## Critérios de aceite

1. Dora exige empresa, nome do contato e e-mail válido; cria o case e dispara automaticamente o
   convite transacional com link opaco, assinado e temporário.
2. O formulário valida endereço completo e situação do Perfil da Empresa quando houver local físico
   ou atendimento presencial.
3. O cliente percorre contexto e operação em duas telas do mesmo link, volta sem perder os campos e
   realiza um único envio final. O e-mail vem do case e não é exposto ao navegador.
4. Toda análise registra fonte, horário e rótulo: `observado`, `informado`, `inferido` ou
   `indisponível`.
5. Nenhum adaptador externo roda sem `approval_id` vigente para ação e case específicos.
6. Cada geração produz os dois documentos e passa por revisão humana antes de envio.
7. E-mail usa destinatário confirmado, idempotência e registra entrega/falha sem anexar dados ao log.
8. Quando houver URL do Instagram, a Íris executa uma fase especialista com a skill
   `instagram-profile-audit`, contador exato de Requests RapidAPI e quatro artefatos privados:
   completo e resumido, cada um em Markdown e HTML. O relatório Raio-X incorpora todos os achados
   relevantes ao cliente; a versão resumida não substitui a completa.
9. Os HTMLs gerados permanecem privados no MVP. Link externo exige armazenamento privado,
   autorização curta/expirável, revogação, auditoria de acesso e gate independente antes de deploy.
8. O piloto mede `convite enviado → intake concluído`, falhas e tempo de conclusão sem guardar PII
   em Git ou no painel de métricas.
9. Recomendações de conteúdo usam termo técnico + explicação comum e exemplo executável sem inventar
   condições comerciais; calendário, roteiros completos e produção ficam fora do Raio-X.
10. Documento de operação física contém obrigatoriamente Presença Local no Google e só apresenta a
    oferta TAVIR Presença Local quando houver fit demonstrado.

## Perfil de segurança e privacidade

Perfil inicial: `INTERNA` para operação e `LP` para o formulário; modificadores `dados_pessoais`,
`api_publica`, `webhook`, `admin` e `email`. O formulário fica `noindex`. Dados ficam em banco
privado com RLS; documentos em bucket privado com URLs curtas e assinadas. Segredos só no gerenciador
do ambiente. Webhook valida assinatura; jobs têm fila, idempotência e trilha de auditoria.

Antes de publicação, Auditor Seg/LGPD deve emitir `security_report.md` com
`liberado_para_deploy: true`; Nina SEO decide formalmente a não indexação. O aviso de privacidade,
retenção, canal de exclusão e base legal serão revisados antes do G2.

## Fora do MVP

- login no Google, Meta, WhatsApp, iFood ou plataformas de entrega;
- scraping de área autenticada, mensagens privadas ou listas de clientes;
- publicação automática, campanha paga, disparo em massa ou solicitação artificial de avaliações;
- dashboard externo para cliente e case público identificável sem consentimento específico.
