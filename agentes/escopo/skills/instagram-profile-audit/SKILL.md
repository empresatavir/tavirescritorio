---
name: instagram-profile-audit
description: Coleta e audita perfis do Instagram com gallery-dl, preservando posts, Reels, Stories, Destaques, perfil, legendas e metadados; prepara áudio, transcrições locais, frames e OCR; e produz relatório profissional em Markdown e HTML sobre conteúdo, narrativa, voz, posicionamento, identidade visual, marca, formatos, funil e oportunidades. Use sempre que o usuário pedir análise, diagnóstico, auditoria, benchmark ou relatório de um perfil do Instagram, inclusive quando fornecer uma URL e solicitar download do conteúdo.
---

# Auditoria de perfil do Instagram

Operar o braço `analise-instagram/`. Ler `analise-instagram/AGENTS.md` antes de
qualquer coleta. Não gravar cookies, credenciais ou conteúdo baixado no Git.

## Fluxo obrigatório

1. Preparar o ambiente isolado. Usar `--with-transcription` para instalar a
   transcrição local no primeiro uso real:

   ```powershell
   python .agents/skills/instagram-profile-audit/scripts/setup_environment.py --with-transcription
   $py = "analise-instagram/.venv/Scripts/python.exe"
   ```

2. Validar que a URL foi fornecida pelo usuário e que a conta autenticada tem
   acesso legítimo ao conteúdo. Não contornar bloqueios, paywalls ou controles de
   acesso. Tratar perfis privados e conteúdo de pessoas como dados potencialmente
   pessoais.
3. Consultar primeiro a RapidAPI, nesta ordem fixa (contratos validados com chamada
   real em 2026-08-31):

   1. **Instagram Best Experience** — prioridade 1, quota ~100/mês. Rota padrão.
   2. **Instagram Scraper AI1** — prioridade 2, quota **~25/mês**. Só fallback quando o
      Best Experience não atender; não usar por comodidade.

   `Local Business Data` não é API de Instagram e não entra nesta auditoria. A coleta
   por API registra provedor, Requests e cobertura real de perfil/feed:

   ```powershell
   & $py analise-instagram/rapidapi/instagram_adapter.py "<URL>" --max-posts 20
   ```

   Se a API entregar só cobertura parcial ou falhar nos dois contratos, registrar o
   resultado e complementar pelo Chrome. Não repetir a mesma consulta em todos os
   provedores nem usar pools/Keys fora da associação confirmada.

4. **Navegador só pelo script, só no `Profile 5`.** O único meio autorizado de tocar em
   navegador neste braço é `collect_instagram.py`, que fixa o diretório Chrome
   `Profile 5` (conta operacional TAVIR) para ler cookies e abrir a tela de login.
   É proibido usar Claude-in-Chrome, Playwright/Chrome DevTools MCP, computer-use,
   `webbrowser` ou Chrome aberto na mão para ver o Instagram — esses caminhos caem no
   perfil errado. Conferência visual se faz nos artefatos já baixados, nunca ao vivo.

   Fazer o preflight sem baixar somente quando o complemento autenticado for necessário:

   ```powershell
   & $py .agents/skills/instagram-profile-audit/scripts/collect_instagram.py "<URL>" --dry-run
   ```

   Se retornar `LOGIN_REQUIRED`/código 3, o script abre a página de login no próprio
   `Profile 5`. Pausar e pedir ao Carlos que conclua o login; não pedir usuário, senha,
   2FA ou cookie no chat. Após ele confirmar, repetir o mesmo preflight; continuar só
   quando aparecer `sessão autenticada encontrada`. Se ele já estiver logado e a sessão
   continuar ausente, é problema de permissão de leitura do banco de cookies (Chrome
   aberto trava o arquivo) — fechar o Chrome e repetir, não trocar de perfil.
   Usar `--browser-profile "<diretório>"` apenas se Carlos pedir explicitamente outro.

5. Coletar com os cookies do Chrome, por domínio, em pasta isolada por perfil:

   ```powershell
   & $py .agents/skills/instagram-profile-audit/scripts/collect_instagram.py "<URL>" --browser chrome
   ```

   Usar `--max-posts N` quando a auditoria for amostral. Não afirmar que Stories
   ou Destaques foram coletados sem conferir o manifesto da execução.
   A coleta integral pode ultrapassar o timeout curto do executor. Execute-a com
   janela de até 2 horas e acompanhe os heartbeats. Se o invólucro perder a
   conexão ou atingir timeout, **não repita o comando** antes de conferir
   `controle/.collection.lock`: o lock registra também o PID do `gallery-dl` e
   impede colisão com uma instância ainda ativa. O archive permite retomar depois.
6. Preparar o corpus multimodal:

   ```powershell
   & $py .agents/skills/instagram-profile-audit/scripts/prepare_analysis.py "analise-instagram/perfis/<perfil>"
   ```

   O padrão usa metadados para todo o corpus e processamento profundo limitado
   aos vídeos mais recentes. Transcrição é local via `faster-whisper` quando
   instalado; não usar API paga sem autorização. Ajustar limites apenas quando a
   cobertura exigir.
7. Ler `processado/inventario.json`, `processado/corpus-textual.md`, transcrições
   e contact sheets. Para a metodologia, ler
   `references/analysis-method.md`; para a entrega, ler
   `references/report-schema.md`. Inspecionar visualmente contact sheets e imagens
   relevantes; OCR não substitui leitura visual.
8. Escrever a versão **completa** em
   `relatorios/relatorio-<perfil>-AAAA-MM-DD.md` usando
   `assets/report-template.md`. Distinguir em toda conclusão:
   - **Observado**: evidência direta, com arquivo/ID;
   - **Inferido**: hipótese sustentada por mais de uma evidência;
   - **Indisponível**: métrica ou conteúdo que a coleta não forneceu.
9. Escrever `relatorios/inteligencia-marketing.json` conforme
   `references/report-schema.md`, contendo somente conhecimento destilado:
   nicho primário, tags secundárias, insights, decisões sugeridas, experimentos
   e práticas que não devem ser copiadas. Cada item aponta para IDs locais do
   relatório; não duplicar legenda, mídia, nome pessoal desnecessário ou PII.
   Em `Escopo e cobertura`, informar o número de **Requests RapidAPI usados** na
   rodada. O valor vem de `requests.total` no manifesto RapidAPI. Na rota
   Chrome/gallery-dl, declarar `0 Requests RapidAPI`; o tráfego HTTP interno do
   Instagram permanece `não mensurado`, pois a ferramenta não expõe contador
   confiável. Nunca estimar esse número.
10. Finalizar as quatro variantes humanas: completo em Markdown + HTML e resumo
   executivo em Markdown + HTML. O resumo é derivado do completo e não substitui
   seus apêndices/evidências:

   ```powershell
   & $py .agents/skills/instagram-profile-audit/scripts/finalize_report.py "<relatorio-completo.md>"
   ```

11. Verificar que os dois Markdown, os dois HTML e o JSON existem; validar o JSON;
   conferir que ambos os HTML abrem sem recursos remotos e que o relatório completo
   declara amostra, período, cobertura, Requests e limitações. Registrar a
   execução em `analise-instagram/_LOG.md`.
12. Depois do QA, promover o aprendizado reutilizável conforme
    `marketing/inteligencia-nichos/README.md`. Fonte pública e conteúdo já
    sanitizado podem seguir; conta privada, cliente ou PII exigem aprovação e
    anonimização. Nunca promover relatório ou corpus integral.

## Critérios de qualidade

- Basear afirmações em evidências locais; nunca inventar alcance, engajamento,
  demografia, frequência ou intenção do criador.
- Analisar o sistema do perfil, não apenas peças isoladas: pilares, narrativa,
  formatos, recorrência, voz, identidade, proposta, CTA, funil e consistência.
- Priorizar análise textual e local de baixo custo; usar visão por IA apenas nos
  itens que contact sheets/OCR não resolvem.
- Evitar análise de aparência física, atributos sensíveis ou diagnóstico pessoal.
- Não redistribuir o material coletado. Relatórios podem incluir miniaturas e
  referências somente quando necessárias à evidência e ao escopo autorizado.
- Não universalizar um padrão do Instagram para YouTube ou outro canal. Marcar
  transferibilidade como hipótese e preservar a condição de origem.
