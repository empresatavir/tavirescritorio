# GOAL — Flow: o DarkFlow como módulo de postagem do Escritório

> Data: 2026-11-21 · Dono: Carlos (CEO) · Executor: qualquer motor da TAVIR, por checkpoint.
> Status: **aprovado pelo Carlos em 2026-11-21, com as recomendações de D1 a D7.** F0 entregue (`src/shared/flow.ts`, `src/main/flow/pacote.ts`, `tests/unit/flow.pacote.spec.ts`). F1 entregue (`src/main/flow/biblioteca.ts`, IPC `studio:flow:*`, tela do Studio; prints em `relatorios/flow/F1/`). Entre a F1 e a F2, a agenda se cria na tela do próprio DarkFlow.

## 0. Em uma frase

O **Studio cria**, o **Flow posta** e o **Social mede**. Os três conversam por um pacote de peça
aprovada. O DarkFlow continua no repositório dele, rodando por trás do Flow, e a publicação real
continua desligada.

## 1. Por que separar e não juntar

| Módulo | Responsabilidade | Fecha por |
|---|---|---|
| **Studio** | perfil, pauta, ângulo, roteiro, arte, áudio, revisão, pacote | gates do Carlos: ângulo, revisão, pacote |
| **Flow** | biblioteca, calendário, agenda, ativação, publicações, reconciliação | gate do Carlos: **ativar agenda** |
| **Social** | scorecard e insights do que foi publicado | só leitura |

1. **Nem tudo que é postado nasce no Studio.** Vai haver post vindo do APK, dos agentes e da fábrica em lote do DarkFlow. O Flow recebe de qualquer origem.
2. **Risco isolado.** O Flow é o único que fala com a Meta. Mudança no Studio (motion, presets, telas) não pode exigir reauditar a publicação.
3. **Telas de tamanho humano.** O Studio já é grande. Calendário, conexão e reconciliação ficam no Flow.

## 2. Como está hoje (ponto de partida)

- `src/main/studio/ecosystem.ts`
  - `prepareDarkflowSchedule` exporta o `final.mp4`, faz o scan da biblioteca e cria a agenda em rascunho. Exige a data e hora já na peça e só aceita `ig-reels-9x16`.
  - `activateDarkflowSchedule` ativa a agenda com `editorial_attested: true`.
- `Studio.dc.html`: aprovar o gate `pacote` chama `darkflow.activate` e leva a peça para `publicado`. **A ativação da postagem mora no Studio.**
- `Flow.dc.html`: só lê `darkflowBoard` (biblioteca, agendas, ocorrências).
- `Social.dc.html`: só lê o scorecard.
- O `is_ai_generated` vai fixo como `false`.
- O DarkFlow tem 11 telas próprias. As de publicação são Biblioteca, Nova agenda, Calendário, Publicações, Conexão e Telemetria; as da fábrica em lote são Painel, Lote, Editor, Saída e Perfis.
- Rotas do publicador (`/api/publisher`): `session`, `status`, `library`, `library/scan`, `schedules` (GET, POST, PATCH, cancel), `occurrences`, `telemetry/*`, `simulation/run-once`, `connection/*`.

## 3. Desenho alvo

```
 Studio ── gate pacote ──► pacote aprovado ──► Flow: biblioteca
                                                 │
 APK / agentes ──► peça nova no Studio            ▼
                                           Flow: agenda (rascunho)
 DarkFlow lote ──► biblioteca (origem: lote)      │  data, hora, conta
                                                 ▼
                                      gate do Carlos: ativar agenda
                                                 │
                                                 ▼
                                  worker do DarkFlow (simulação)
                                                 │
                                                 ▼
                                 Social: scorecard ◄── ocorrências
```

- **Pacote aprovado** é o contrato entre os módulos. Na F0 ele cobre só o Reel (manifesto v1 do DarkFlow). Na F5 cresce para carrossel, imagem e Stories.
- **A peça do Studio acompanha o Flow.** Depois do pacote, a peça mostra «no Flow · rascunho», «agendada para…» ou «publicada», lendo as ocorrências. Ela não pula sozinha para `publicado`.

## 4. Regras invioláveis

- NUNCA alterar arquivo do DarkFlow nas fases F0 a F4 (`git status` do DarkFlow igual ao do início em cada checkpoint). A F5 é um GOAL dentro do repositório do DarkFlow.
- NUNCA passar `--enable-meta-publish`. Publicação real só por decisão futura do Carlos e depois da reauditoria Seg/LGPD.
- NUNCA chamar o DarkFlow pelo renderer. Só pelo processo principal, por IPC.
- Ativar agenda só por clique do Carlos no Flow. APK, agentes e motor **criam**, nunca agendam nem ativam.
- NUNCA logar token, segredo ou URL assinada (`maskSecret`).
- Testes em pasta temporária com servidor HTTP falso do DarkFlow. Nenhum dado de peça no git.
- `.claude/launch.json` e a seção 7 do `CLAUDE.md` não mudam.

## 5. Fases

### F0 — Contrato do pacote aprovado
- `src/shared/flow.ts`: tipo `PacoteAprovado` com `origem` (`studio` | `apk` | `agente` | `lote`), perfil, formato, mídias em ordem, legenda, hashtags, `ia` e o id da peça.
- `src/main/flow/pacote.ts`: monta o pacote a partir da peça do Studio e converte para o manifesto v1 do DarkFlow (reaproveita `exportReelForDarkFlow`).
- Formato fora do que o DarkFlow aceita hoje é recusado com o motivo.
- **Testes:** montar o pacote, recusar formato, sha256 conferido.
- **Portão:** testes verdes e nenhum arquivo do DarkFlow alterado.

### F1 — Studio entrega, Flow agenda
- O gate `pacote` do Studio passa a só **enviar para a biblioteca do Flow** (export, scan, achar o item pelo sha256). Não cria agenda nem ativa.
- O botão «Aprovar publicação» sai do Studio.
- A peça mostra o estado vindo do Flow (rascunho, agendada, publicada, falhou).
- O campo de data e hora sai da peça e vai para a agenda do Flow (D1).
- **Testes:** gate do pacote não chama `schedules`; a peça reflete as ocorrências.
- **Portão:** prints da peça indo para a biblioteca e do estado espelhado.

### F2 — Flow completo dentro do Escritório
Telas no `Flow.dc.html`, todas pelo IPC `flow:*`:
- **Biblioteca:** itens com origem, prévia e formato.
- **Nova agenda:** cria rascunho (`activate: false`, `editorial_attested: false`).
- **Calendário:** semana e mês, com o teto de 3 por dia e 15 por semana visível.
- **Ativar agenda:** gate do Carlos. Mostra a peça, a legenda, a data e o modo («simulação» em destaque) antes do clique.
- **Publicações:** ocorrências com estado, tentativas, reconciliação e cancelar agenda.
- **Conexão:** só leitura (conta, validade, escopos, modo). Conectar e revogar continuam na tela do DarkFlow, com o botão «Abrir no DarkFlow» (D4).
- **Testes:** cliente do Flow com CSRF contra servidor falso; ativar exige o clique; erro do DarkFlow vira mensagem legível.
- **Portão:** jornada completa em simulação com prints. Uma agenda criada, ativada e executada por `simulation/run-once`.

### F3 — DarkFlow sobe com o Flow
- Abrir o Flow sobe o DarkFlow pelo sidecar, se ele não estiver no ar, com o aviso do conflito de porta com o TTS do Docuflow (D7).
- O status aparece no cabeçalho do Flow.
- **Portão:** abrir o Flow com o DarkFlow parado e ver tudo subir sem abrir outra janela.

### F4 — Novas entradas: APK e agentes (passo 3)
- **APK:** job «Preparar post» na fila (perfil, formato, tema e instrução). Vira uma peça do Studio na etapa `pauta`, com origem `apk`.
- **Agentes:** Íris, Redator e Social podem criar peça e preencher pauta, roteiro e legenda pelo processo principal. Os gates seguem os mesmos.
- **Lote do DarkFlow:** item da fábrica em lote aparece na biblioteca do Flow com origem `lote` (D6).
- **Testes:** job do APK cria a peça e nunca cria agenda; agente sem permissão de agendar.
- **Portão:** pedido feito pelo APK aparecendo como peça no Studio.

### F5 — Carrossel, imagem e Stories (passo 2) · GOAL próprio no repositório do DarkFlow
No DarkFlow, tudo com o `FakeMetaAdapter`:
- Manifesto v2 com lista de mídias (imagem em JPEG).
- Banco com peça de 1 a N mídias em ordem.
- Adaptador criando contêineres filhos e o `CAROUSEL`; fluxos de imagem solta e `STORIES`.
- Expurgo e reconciliação cobrindo falha no meio do carrossel.
- Pré-checagem de proporção, JPEG e quantidade de itens (carrossel conta como 1 post).
- Telas de prévia.

No Escritório:
- Exportar as lâminas do Studio em JPEG.
- Pacote v2.
- Prévia de carrossel no Flow.

**Portão:** suíte do DarkFlow verde em simulação. Qualquer uso real exige reauditoria Seg/LGPD, porque mexe no caminho de publicação.

### F6 — Fechamento
- `docs/modules/flow.md` (mapa do módulo) e atualização de `docs/modules/studio.md`.
- Jornada de QA com prints em `relatorios/flow/`.
- `npm run typecheck`, `npm test`, `npm run build`.

## 6. Decisões do Carlos

| # | Pergunta | Recomendação |
|---|---|---|
| D1 | Data e hora da postagem ficam na agenda do Flow ou continuam na peça do Studio? | No Flow. A peça diz o quê; o Flow diz quando. |
| D2 | A etapa `publicado` do Studio passa a refletir o estado real do Flow? | Sim. A peça só fica «publicada» quando a ocorrência é publicada. |
| D3 | `is_ai_generated` deve vir da peça, marcado quando houve geração por IA? | Sim, na peça. O DarkFlow segura o envio do campo à Meta até a confirmação oficial. |
| D4 | Conexão com o Instagram dentro do Flow: só leitura ou também conectar e revogar? | Só leitura agora. OAuth continua na tela do DarkFlow. |
| D5 | Carrossel até 10 itens (referência da API) ou 20 (o que o Studio aceita hoje)? | Conferir na documentação atual da Meta antes da F5. |
| D6 | A fábrica em lote do DarkFlow aparece no Flow? | Sim, só como origem na biblioteca. Ela não vira tela do Escritório. |
| D7 | Porta 8765 compartilhada pelo DarkFlow e pelo TTS do Docuflow | Segue a regra atual: o sidecar recusa subir os dois juntos. |

## 7. Resumo dos checkpoints

| Fase | Entrega | Prova exigida |
|---|---|---|
| F0 | Contrato do pacote | testes verdes |
| F1 | Studio entrega, Flow agenda | prints da peça na biblioteca e do estado espelhado |
| F2 | Flow completo | jornada em simulação com prints |
| F3 | DarkFlow sobe com o Flow | print do Flow subindo o DarkFlow |
| F4 | Entrada pelo APK e agentes | peça criada pelo APK |
| F5 | Carrossel e imagem (repo do DarkFlow) | suíte do DarkFlow verde em simulação |
| F6 | Fechamento | docs, QA e comandos verdes |
