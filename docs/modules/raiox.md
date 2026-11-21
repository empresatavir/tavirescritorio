# Raio-X — mapa de arquivos

Tabela da seção 3 de `docs/planning/PLANO_RAIOX.md`, com o destino e o papel. Situação e próximos passos: seção RETOMADA de `docs/planning/GOAL_RAIOX.md`.

| Arquivo | Papel |
|---|---|
| `raiox/PROJECT.md`, `raiox/AMBIENTE.md` | Contexto do projeto. Ganham a seção "Mudança de casa". |
| `raiox/docs/descoberta/`, `raiox/docs/requisitos/`, `raiox/docs/plano/`, `raiox/docs/validacao/` | Histórico de descoberta, requisitos, plano e validação. |
| `raiox/docs/prototipo-formulario/` | Protótipo do formulário. Só referência. |
| `raiox/web/` | App publicado. Vira o Root Directory da Vercel depois do corte. Sem `.env.local`, `.vercel/`, `supabase/.temp/` nem `node_modules/`. |
| `raiox/modelos/` | Modelos de relatório, plano e e-mails. |
| `tools/publicar.py`, `tools/requirements-publicar.txt` | Publicação de Markdown em HTML e PDF. Mesmo caminho relativo da origem. |
| `tools/scrapling-lab/` | Laboratório de coleta. Só arquivos versionados. A skill `scrapling-tavir` aponta para esse caminho. |
| `analise-instagram/` | Braço da Íris. Sem `perfis/*` de cliente e sem `config/*.env`. A skill `instagram-profile-audit` aponta para esse caminho. |
| `analise-web/` | Braço do analista web. A skill `web-platform-audit` aponta para esse caminho. |
| `marketing/inteligencia-nichos/` | Conhecimento de nichos citado pelo prompt de análise. |
| `agentes/escopo/agentes/dora-descoberta.md` | Dora, adaptada aos caminhos novos. |
| `agentes/escopo/agentes/iris-instagram.md` | Íris, adaptada aos caminhos novos. |
| `agentes/escopo/agentes/analista-web.md` | Analista web, adaptado aos caminhos novos. |
| `agentes/escopo/skills/funil-vendas/` | Skill de funil que o prompt usa. |
| `raiox/web/supabase/functions/office-raiox-sync/index.ts` | Fonte publicada da leitura. Contrato abaixo. |
| `src/main/raiox/raioxBridge.ts` | Leitura do Supabase (`syncCases`). As funções de escrita (`continueCase`, `reviewCase`, `deliveryCase`, `inviteCase`) ainda recusam: entram na F8 do GOAL. |
| `src/main/raiox/raioxAnalyse.ts`, `raioxContext.ts`, `localBusiness.ts` | Análise pelo motor escolhido no Escritório, com contexto copiado para a pasta do caso e consulta do Google Maps (RapidAPI Local Business). |
| `src/main/raiox/raioxDocs.ts`, `raioxDocLint.ts` | Redação dos dois documentos, checagem (seções, termos proibidos, formato de `sugestoes.json`) e PDF por `tools/publicar.py`. |
| `src/main/raiox/raioxView.ts` | Leitura interna do caso para a tela. |
| `src/main/raiox/raioxStore.ts`, `raioxIpc.ts` | Pasta privada do caso e canais IPC (inclui execução da F7). |
| `src/main/raiox/playbooks.ts` | Leitor e lint dos playbooks; `playbookStatusFor` diz se o gap tem playbook `validado`. |
| `raiox/prompts/analise.md`, `raiox/prompts/redacao.md` | Prompt de análise e de redação, versionado. |
| `src/shared/raiox.ts`, `src/main/raiox/raioxRules.ts` | Domínio, taxonomia e regras puras do caso. |
| `src/renderer/raiox-ref/RaioX.dc.html` | Tela do Raio-X, injetada no build. |
| `tests/unit/raiox*.spec.ts` | Regras, pasta privada, ponte, F6, playbooks, Local Business e leitura do caso. |
| — | Entrega por e-mail (Resend) ainda não existe: F8 do GOAL. |
| `%APPDATA%/<app>/raiox/casos/RX-XXXXXXXX/legado/` | Casos antigos com dado de cliente. Fora do git. Cópia só com aprovação no checkpoint. |
| Cofre (`src/main/credentials.ts`) | Segredos `RAIOX_*` e `RESEND_*`. O Carlos digita na tela. Nada em arquivo de texto. |
| — | `TELEGRAM_*` sai do Raio-X. |

## Contrato `office-raiox-sync`

Fonte baixada do projeto `skcbjwqajdovxlsxeszv` para `raiox/web/supabase/functions/office-raiox-sync/index.ts`. A função só lê. Não grava caso, não apaga caso e não devolve contato, e-mail nem texto livre do formulário.

| | |
|---|---|
| Método | `GET`. Qualquer outro método responde 401. |
| URL | `https://skcbjwqajdovxlsxeszv.supabase.co/functions/v1/office-raiox-sync` |
| Cabeçalho | `x-raiox-office-sync-secret`. O valor tem de ser igual a `RAIOX_OFFICE_SYNC_SECRET` e ter pelo menos 32 caracteres. A comparação é em tempo constante. |
| JWT | Desligado (`verify_jwt = false`). A autorização é o cabeçalho acima. |
| Sucesso 200 | `{ "ok": true, "cases": [ { "id", "status", "cliente", "etapa", "criado_em", "atualizado_em" } ], "source": "supabase-raiox", "truncated": false }` |
| Caso | `id` é o UUID do Supabase. `cliente` é `company_name` ou string vazia. `status` e `etapa` repetem o status remoto. No máximo 500 casos, os mais recentemente atualizados. `truncated` é verdadeiro quando a lista enche esse teto. |
| 401 | `{ "error": "unauthorized" }` — método errado, segredo ausente, curto ou diferente. |
| 500 | `{ "error": "sync_unavailable" }` — a leitura da tabela falhou. |
