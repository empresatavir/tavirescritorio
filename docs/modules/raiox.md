# Raio-X — mapa de arquivos

Tabela da seção 3 de `docs/planning/PLANO_RAIOX.md`, com o destino e o papel.

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
| `src/main/raiox/raioxBridge.ts`, `src/main/raiox/raioxDelivery.ts`, `src/main/raiox/raioxAnalyse.ts` | Porta do `office.py` (`_raiox_*`) em TypeScript, mesma semântica. Ainda não existe. |
| `raiox/prompts/analise.md`, `raiox/prompts/redacao.md` | Prompt de análise e de redação, versionado. Ainda não existe. |
| `src/shared/raiox.ts`, `src/main/raiox/raioxRules.ts` | Regras portadas de `backend/app/modules/raiox/`. Ainda não existe. |
| `%APPDATA%/<app>/raiox/casos/RX-XXXXXXXX/legado/` | Casos antigos com dado de cliente. Fora do git. Cópia só com aprovação no checkpoint. |
| Cofre (`src/main/credentials.ts`) | Segredos `RAIOX_*` e `RESEND_*`. O Carlos digita na tela. Nada em arquivo de texto. |
| — | `TELEGRAM_*` sai do Raio-X. |
