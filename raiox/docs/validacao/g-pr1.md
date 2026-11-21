# G-PR1 — controles do piloto real assistido

Fonte dos controles: `raiox/docs/plano/piloto-real-assistido.md`. Este arquivo guarda o
levantamento (T10.1) e, depois, a evidência de cada controle. Sem dado de cliente.

## T10.1 Levantamento (2026-11-20)

Legenda de "quem faz": **código** (sessão de desenvolvimento), **Carlos** (decisão, clique ou
operação), **advogado** (texto jurídico).

| # | Controle | O que já existe | O que falta | Quem faz |
|---|---|---|---|---|
| 1 | Opt-in antes do caso | `create-case` exige segredo interno e grava empresa, contato e e-mail. No Escritório, `caso.json` tem `consent` (tipo, data, nota). | `create-case` aceita sem opt-in. Falta tabela `raiox_optins` (canal, horário, versão do aviso, operador) em migração nova, `create-case` falhar fechado sem ela, e o botão de convite do Escritório (T8.3) exigir o registro. | código; Carlos registra cada opt-in |
| 2 | Aviso de privacidade versionado | Um parágrafo dentro do formulário (`form.html`, bloco `details`); `raiox_consents.policy_version` com padrão `2026-07-25`. | Página pública sem token (`privacidade.html`) com controlador, canal, finalidades, dados, fornecedores, transferência internacional, retenção, direitos e revisão humana; versão gravada junto do consentimento. | código (página e versão); advogado (texto); Carlos (dados do controlador e canal) |
| 3 | Três decisões separadas | Duas caixas obrigatórias no formulário (fontes públicas e entrega por e-mail); a RPC recusa sem as duas. | Terceira decisão: ciência do aviso. Conferir que nenhuma vem marcada e gravar versão e horário de cada uma. | código |
| 4 | E-mail confirmado | Nada. O link do convite vai para o e-mail, mas não há confirmação. | Token opaco, de uso único e com validade; coluna `email_verified_at`; `continue-case` (análise) e `delivery-case` (entrega) bloqueados sem ela. | código |
| 5 | Minimização e entrada segura | `raioxBridge` só aceita HTTPS no Supabase. O formulário limita tamanho dos campos e tem campo-isca. | Validar protocolo, destino, DNS/IP privado e redirects de todo link antes da coleta (formulário e Escritório). Bloquear campos proibidos (perfil pessoal, documentos, credenciais). Testes com URL interna, IP privado e redirect. | código |
| 6 | Fornecedores por caso | Nada no caso. Os fornecedores estão espalhados em `.env.example` (Supabase, Resend, Telegram) e o motor fica no histórico de rodadas. | `caso.json` com lista de fornecedores usados (Vercel, Supabase, Resend, Telegram, motor de IA e modelo), com finalidade, dados, região e retenção. O motor entra sozinho a cada rodada. | código; Carlos confirma região e retenção de cada serviço |
| 7 | Expurgo provado | Botão "Excluir" no Escritório apaga a pasta local (`deleteCase`). | Botão "Expurgar caso": Supabase (caso, sessões, respostas, consentimentos, entregas), pasta e PDFs, Resend, Telegram e temporários, com relatório de ausência sem PII. Ensaio primeiro com caso fictício. | código; Carlos executa o ensaio |
| 8 | Direitos do titular | Status `revoked` existe só para link de formulário (após tentativas erradas). | Canal permanente no aviso, procedimento de acesso, correção, revogação e exclusão; revogação na tela que trava as etapas seguintes do caso. | código (revogação na tela); advogado e Carlos (procedimento e canal) |
| 9 | Runbook de incidentes | Nada. | `runbook-incidentes.md`: e-mail errado, link vazado, Telegram comprometido, rotação de segredos, incidente em fornecedor, contenção, evidência e acionamento jurídico. Um ensaio registrado. | código (rascunho); Carlos (ensaio); advogado (acionamento jurídico) |

### Ordem proposta

1. Itens só de código e sem dependência externa: 5 (entrada segura), 6 (fornecedores), 3 e 4
   (decisões e e-mail confirmado), 1 (opt-in).
2. Itens com rascunho de código e texto para o Carlos e o advogado: 2 (aviso), 8 (direitos),
   9 (runbook).
3. Expurgo (7) por último, porque depende de saber tudo o que foi gravado nos itens acima.

Toda migração é nova; nenhuma migração já aplicada é alterada. Nada vai para o Supabase real antes
do CP-10 (R5).

## Evidências

### Controle 5 — Minimização e entrada segura (código concluído em 2026-11-21)

- **Escritório** (`src/main/raiox/linkGuard.ts`):
  - forma do link: só http/https, sem usuário/senha, sem porta fora de 80/443, sem IP direto, sem
    nome de rede interna (`localhost`, `.local`, `.internal`, `metadata`…), sem arquivo
    compartilhado (Drive, Docs, Dropbox, OneDrive, WeTransfer, Mega, iCloud), sem link direto
    para documento e sem parâmetro de credencial (`token`, `senha`, `key`…);
  - DNS: todos os endereços resolvidos fora de faixas privadas, loopback, link-local, CGNAT,
    multicast e IPv4 mapeado em IPv6;
  - redirect: cada salto é conferido antes de ser acessado (até 5), sem seguir sozinho e sem ler
    o corpo da página.
- **Análise:** antes do motor, todos os links do caso (link público, fronteira, objetivo, decisão
  e link do Maps salvo) passam pela checagem. Um link bloqueado impede a análise, com o motivo na
  tela. O resultado fica em `analise/links-verificados.json` e o prompt manda o motor começar só
  por essa lista.
- **Caso:** criar ou editar o caso recusa CPF, número de cartão (formato de 16 dígitos e Luhn),
  senha ou token escritos no texto, e link com forma bloqueada. Telefone com DDI não é confundido
  com cartão. Os 13 casos locais existentes passam na regra nova.
- **Formulário web** (`raiox/web/api/_raiox.mjs`): mesma regra de forma dos links e de texto
  proibido; o envio é recusado. DNS e redirect ficam no Escritório, que é quem acessa os links.
- **Testes:** `tests/unit/raioxLinkGuard.spec.ts` (25) e `raiox/web/test/raiox-form.test.mjs`
  (URL interna, IP privado, DNS que aponta para rede interna, redirect para rede interna, IP e
  localhost, limite de redirects, análise sem chamar o motor). Suíte completa: 511 testes.
- **Limite conhecido:** perfil pessoal (Instagram de pessoa física) e PII de terceiros dentro de
  texto livre não têm detecção automática; ficam na revisão do Carlos ao abrir o caso. O
  formulário recusa sem dizer qual campo causou a recusa (ajuste junto do T10.4).

### Controle 6 — Fornecedores por caso (código concluído em 2026-11-21)

- **Catálogo:** `raiox/fornecedores.json` com Vercel, Supabase, Telegram, Resend, RapidAPI e os
  quatro provedores de motor (Anthropic, OpenAI, Google, Cursor). Finalidade e dados preenchidos;
  região, retenção e exclusão como `a confirmar` e `confirmado: false`. Só o Carlos confirma.
- **Registro no caso** (`src/main/raiox/vendors.ts`, campo `vendors` do `caso.json`): cópia da
  ficha no primeiro uso, primeiro e último uso, e a lista de usos (ex.: `análise · modelo`).
  - análise: motor e modelo registrados **antes** do motor receber a pasta (vale mesmo se a
    rodada falhar); RapidAPI quando a consulta da ficha do Google fez requisição;
  - redação: motor e modelo, também antes de rodar;
  - caso vindo do formulário: Vercel, Supabase e Telegram (este só recebe o código do caso).
  - Resend entra quando o convite e a entrega forem ligados (F8).
- **Tela:** aba Devolutiva mostra "Serviços que tocaram este caso" com usos, região, retenção e
  exclusão, e avisa quantos ainda têm termos a confirmar.
- **Testes:** `tests/unit/raioxVendors.spec.ts` (catálogo completo e nada confirmado, um
  fornecedor por motor, registro sem repetição, confirmação posterior, análise que falha mas
  registra o motor).
- **Pendente do Carlos:** confirmar região, retenção e exclusão de cada serviço no painel ou
  contrato e marcar `confirmado: true` em `raiox/fornecedores.json`. O `RX-854A8212` foi
  analisado antes deste controle e não tem a lista (análise no Cursor e redação no Google pelo
  histórico de rodadas).
