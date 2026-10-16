# Limites da API do Judge (Gemini free tier) — REGRA OPERACIONAL

> ⚠️ **CORREÇÃO IMPORTANTE (2026-07-06, verificada no replay do Tier 1).**
> `_uncategorized` **NEM SEMPRE é 429.** No replay do Tier 1 (2 lotes de 4, gemini-2.5-flash)
> os 8 drafts caíram em `_uncategorized`, mas o `_audit.jsonl` mostrou `judge.completion`
> limpo em cada um (~5 s, sem erro, sem retry) — ou seja, **o judge RODOU e simplesmente
> classificou errado** (o free tier do Gemini é pouco confiável para escolher a Major Tag;
> numa sessão anterior acertou parte, nesta errou tudo). **Reset + replay é uma LOTERIA, não
> um conserto** — pode repetir o mesmo erro e ainda queima RPD.
>
> **Conserto determinístico (o que funcionou):** o `_index.sqlite` é a fonte de verdade do
> servidor MCP em execução (apagar só o sqlite → vault zera; ele NÃO reconstrói do `.md` no
> boot), mas o `.md` é autoritativo no *re-sync* durante o sleep. Então corrija **os DOIS
> juntos**: reescreva `major_tags:` no frontmatter do `.md` + mova o arquivo p/ a pasta certa
> (`soul/`, `user-profile/`, `preferences/`) **E** `UPDATE memories SET major_tags/file_path`
> no sqlite. Escrita externa no sqlite com o Claude Code ABERTO é lida na hora pelo servidor
> (testado). Se mexer só no sqlite, o próximo sleep reverte a partir do frontmatter do `.md`.
> Isso evita gastar RPD com replays às cegas. (O reset+replay continua válido só quando
> você QUER re-classificar do zero, não para forçar uma taxonomia conhecida.)


> Fonte: limites reais da conta do Carlos (AI Studio, informados 2026-07-06).
> **Por que isto importa:** o judge do Sincron Brain roda no `sleep` e classifica
> cada memória. Se uma chamada **estoura o limite (429)**, ela **não dá erro visível**
> — o draft cai no fallback `create` **sem Major Tag** e vai parar em `_uncategorized`
> (confirmado em `judge.py:291` → `reconcile.py:505`). E o draft é **consumido**
> (`sleep.py:57 path.unlink()`), então **não dá para re-classificar depois**. Foi a
> causa provável do Tier 1 ter saído torto (soul vazio + 4 em `_uncategorized`).
> Conclusão: **ficar dentro dos limites é obrigatório**, não "bom ter".

## Limites da conta (modelos de texto = candidatos a judge)

| Modelo | RPM | TPM | RPD | Serve de judge? |
|---|---:|---:|---:|---|
| **Gemini 2.5 Flash** (ATUAL) | 5 | 250K | 20 | ✅ em uso, verificado gerando |
| Gemini 2.5 Flash Lite | 10 | 250K | 20 | ⚠️ dobro de RPM, mas classificou MAL antes |
| Gemini 3 Flash | 5 | 250K | 20 | ✅ candidato (mais novo; testar antes) |
| Gemini 3 Flash Live | ∞ | 65K | ∞ | ❌ API Live (streaming/áudio), não é drop-in de texto |

- **RPD zera à meia-noite do Horário do Pacífico** (~04:00–05:00 BRT). O sleep noturno
  das 03:00 BRT roda ANTES desse reset — conta no orçamento do dia que está acabando.
- Modelos `0/0` no painel não estão habilitados; TTS/Live têm limites próprios e não
  servem de judge de texto.

## Como o judge consome os limites (medido no código)

- **1 chamada LLM por draft** (`judge.py:275`) — uma chamada devolve até 4 decisões
  (create/merge). NÃO é N chamadas por draft. Logo: **nº de chamadas ≈ nº de drafts**.
- `num_retries = 1` (`judge.py:344`): um retry por chamada — ajuda num 429 transitório
  de RPM, não resolve estouro de RPD.
- **Sem pacing interno:** o `run_sleep` dispara as chamadas em sequência, sem intervalo.
  Cada chamada leva ~5 s. 8 drafts ⇒ ~8 chamadas em ~40 s ⇒ **pode passar de 5 RPM**.

## Regra de bolso para não estourar (o pacing é MEU, na mão)

1. **Lotes de ≤ 4 drafts por `sleep_now()`.** 4 chamadas em ~20 s < 5 RPM. Entre lotes,
   esperar ~60 s (deixar a janela de RPM rolar). Tier 1 (8 fatos) = **2 lotes de 4**.
2. **≤ 20 chamadas de judge por dia** (RPD). Tier 1 gasta ~8–9 (com o `verify_judge`).
   Migrações grandes (Tier 2+) → espalhar por vários dias OU trocar para Ollama local.
3. **Sempre conferir depois:** `list_major_tags()`. Se algo caiu em `_uncategorized`,
   foi 429/fallback — e como o draft já foi consumido, o conserto é reset + replay.
   Por isso: pacing ANTES, não remendo depois.
4. **Migração em massa sem dó de limite → Ollama local** (`set_judge_key` troca provider;
   sem RPM/RPD/TPM/billing, custa RAM + qualidade). Gemini free continua bom para o
   fluxo do dia a dia (poucas memórias novas/dia cabem folgado em 20 RPD).

## Modelos "Live" NÃO servem de judge (verificado 2026-07-06 na chave do Carlos)

`models.list` confirmou: os modelos **Live** (`gemini-3.1-flash-live-preview`,
`gemini-3.5-live-translate-preview`, `gemini-2.5-flash-native-audio-*`) só expõem
**`bidiGenerateContent`** — o protocolo WebSocket da Live API (voz/vídeo em tempo real).
O judge chama `litellm.completion()` → **`generateContent`** (REST síncrono), que os
Live NÃO têm. Logo o "RPD ilimitado" deles é inalcançável sem reescrever o judge para
streaming (não faz sentido p/ classificação em lote). **Fuga real do RPD 20 = Ollama local.**

Modelos de texto da chave que SERVEM (têm `generateContent`), do mais novo ao atual:
`gemini-3.5-flash` · `gemini-3-flash-preview` (= "Gemini 3 Flash" do painel, RPD 20) ·
`gemini-3.1-flash-lite` · `gemini-flash-latest` · **`gemini-2.5-flash` (em uso)**.
Trocar entre eles NÃO muda o RPD 20 (teto da conta free no endpoint padrão, por modelo).

## Modelo escolhido

**Gemini 2.5 Flash** (RPM 5 / TPM 250K / RPD 20) — provado gerando aqui, boa qualidade.
Trocar só via `set_judge_key()` (chave) ou editar `model` em `memory/_config.toml`
(modelo). `gemini-3-flash` é candidato de upgrade (mesmos limites) — testar com 1
chamada antes de adotar, para não gastar RPD à toa.
