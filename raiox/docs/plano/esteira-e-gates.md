# Esteira automatizada — Raio X

## Sequência operacional

```text
Dora qualifica Carlos no bot privado
  → Carlos encaminha formulário assinado no Supabase/Vercel ao cliente
  → validação e consentimentos
  → evento no Supabase + pedido de aprovação no Telegram privado
  → coleta pública autorizada
  → normalização + evidências
  → Raio X + Plano de Crescimento
  → revisão humana
  → aprovação de envio no Telegram
  → Resend + status de entrega
  → debrief + métricas do case
```

### 1. Intake e validação

O backend cria `case_id`, salva formulário e cria um checklist de fontes. Se houver loja física,
endereço completo é obrigatório para pesquisar Google Maps; o sistema não deriva localização por
nome parecido. Link ausente gera item `indisponível`, não erro de formulário.

### 2. Aprovação e coleta

| Frente | Evidência possível | Limite |
|---|---|---|
| Instagram | bio, links, posts/reels e destaques públicos, frequência e CTA observáveis | não ler DM, insights nem conta privada sem nova autorização |
| Site/catálogo | páginas públicas, jornada e metadados | não testar checkout real nem painel autenticado |
| Google/Maps | resultado de busca, Perfil da Empresa visível, endereço, categoria, horário, avaliações e respostas públicas | não afirmar posição fixa; resultado varia por usuário/local |
| Delivery | vitrine, disponibilidade e jornada pública dos links fornecidos | não comprar, simular pedido ou acessar conta |
| WhatsApp | link, mensagem de boas-vindas, catálogo público e clareza do CTA | sem mensagens a atendentes nem dados de conversas |

Para métricas proprietárias do Perfil da Empresa, Insights Meta ou plataforma de delivery, o bot
solicita autorização específica. A API de Performance do Perfil da Empresa exige projeto Google,
acesso à API, OAuth e permissão de gestor para o perfil; não é um substituto para observação pública.

### 3. Avaliação e redação

O motor de análise recebe uma ficha normalizada, fontes e permissões. Ele não ganha acesso cru a
dados privados. As saídas obrigatórias têm a seção “evidências e limites”, distinguindo:

- **observado:** verificável no link e momento registrados;
- **informado:** declarado pelo cliente, ainda não comprovado;
- **inferido:** hipótese explicada, nunca fato;
- **indisponível:** não fornecido, não público ou não autorizado.

### 4. Revisão e envio

Revisor humano verifica dados, tom, viabilidade, ausência de promessa e se cada recomendação tem
primeiro passo, dono, esforço e métrica. A aprovação `enviar_documentos` é solicitada no Telegram
privado. Só então o worker gera links privados ou PDFs e envia via Resend com `Idempotency-Key` por
`case_id + versão + destinatário`. Falha/bounce abre tarefa interna; nunca reenvia automaticamente
sem nova aprovação.

## Plano de Crescimento: ordem padrão

1. **Fundação local:** categoria/horário/endereço e fotos reais no Google, bio e CTA consistentes,
   catálogo e links funcionais.
2. **Conversão de intenção:** cardápio/catálogo navegável, WhatsApp com resposta inicial e rota para
   pedido, oferta clara de retirada/entrega.
3. **Rotina orgânica:** calendário realista, conteúdo útil ao bairro/ocasião/produto, prova social
   legítima, reaproveitamento de perguntas frequentes.
4. **Retenção e reputação:** pós-compra opt-in, pesquisa curta, recuperação privada de problema e
   convite honesto de avaliação pública apenas quando fizer sentido.
5. **Teste e medição:** um experimento por vez, baseline e decisão de continuar/parar.
6. **Mídia paga (posterior):** somente se há oferta, rastreio, capacidade de atendimento e hipótese
   econômica; requer plano e aprovação próprios.

Não há meta padrão de faturamento, seguidores ou ranking. O plano declara a hipótese, a métrica de
decisão e o período de observação de cada ação.

## Integrações futuras

- **Telegram Bot API:** bot privado da TAVIR para Carlos; adapters sem dados sensíveis nos callbacks.
  O cliente não interage com Telegram.
- **Vercel:** formulário estático + rotas server-side. Não publicar antes do G4.
- **Banco/fila:** casos, consentimentos, aprovações, eventos, jobs e versões de documentos.
- **Supabase:** fonte de verdade, RLS, sessões de formulário, outbox e Edge Functions; ver
  `supabase-plano-a.md`.
- **Resend:** e-mail transacional após aprovação; anexos/links privados e chave de idempotência.
- **Analisadores internos:** `analise-instagram` e `analise-web` recebem somente URL autorizada e
  produzem evidência isolada por case.

## Gates

| Gate | Decisão | Dono | Evidência de passagem |
|---|---|---|---|
| G1 | roteiro, campos, métrica mínima e catálogo de IA | Carlos | registro de decisão |
| G2 | bot/domínio/privacidade e fornecedores | Carlos + Auditor Seg/LGPD | escopo e ambiente isolado configurados |
| G3 | backend e adapters seguros | Desenvolvimento | testes de assinatura, RLS, autorização e idempotência |
| G4 | publicar formulário | Auditor Seg/LGPD + Nina SEO | `security_report.md` aprovado e decisão `noindex` |
| R1 (por case) | aprovar, bloquear ou pedir ajustes nos dois documentos | Carlos, no Telegram privado | dois arquivos anexados, hashes da versão e decisão auditada |
| G5 | liberar automação de envio | Carlos | 3–5 casos assistidos, revisão de métricas e casos de falha |

R1 não envia e-mail. A aprovação libera apenas o próximo gate daquele case; qualquer disparo ao
cliente continua sendo uma ação separada. G5 é uma decisão posterior sobre automatizar a operação,
não o nome da revisão editorial de cada entrega.
