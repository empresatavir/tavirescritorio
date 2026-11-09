# LOG — Análise de Instagram

Diário append-only das auditorias e mudanças relevantes do braço.

## [2026-07-15] estrutura | casa | braço e esteira multimodal criados
- Escopo: criar agente, skill e fluxo para coletar uma URL de perfil autorizada e produzir auditoria profissional; nenhuma conta real foi coletada nesta entrega.
- Coleta: `gallery-dl` 1.32.6 em ambiente isolado; categorias posts/Reels/Stories/Destaques/info/avatar, cookies Chrome restritos a instagram.com, metadados JSON e archive separado por categoria.
- Processamento: inventário total + corpus textual; áudio WAV/16 kHz, `faster-whisper` local 1.2.1, cinco frames por vídeo, contact sheets e OCR opcional; primeiro passe profundo limitado a 40 vídeos e 120 imagens.
- Entregas: skill `instagram-profile-audit`, agente Íris Instagram, comando `/instagram-analisar`, template profissional e renderizador HTML autocontido com identidade Basalto.
- Verificação: scripts compilados; skill validada; fixture sintética confirmou metadados avulsos, mídia, áudio, frames, inventário, corpus e HTML; render conferido visualmente em Chrome headless; fixture removida.
- Próximo passo: Carlos fornecer a primeira URL; a execução real validará a cobertura que o Instagram disponibilizar à sessão do Chrome.

## [2026-07-15] autenticação | casa | login assistido antes da coleta
- Escopo: transformar ausência de login no Chrome em gate humano explícito, sem deixar a coleta falhar silenciosamente ou seguir incompleta.
- Ação: o coletor passou a verificar em memória a existência de `sessionid` não expirado, sem exibir seu valor; quando ausente, abre a página oficial de login, retorna `LOGIN_REQUIRED`/código 3 e orienta Íris a pausar.
- Segurança: Íris nunca pede usuário, senha, 2FA ou cookies no chat; o login é feito diretamente no Chrome e o mesmo preflight é repetido após a confirmação do Carlos.
- Verificação: Chrome atual corretamente identificado sem sessão; browser inexistente produziu `LOGIN_REQUIRED`; fluxo sem stdin tratou `EOFError` como pausa recuperável; dry-run autenticado por bypass exclusivo de teste continuou verde; skill validada.
- Uso: basta dizer naturalmente à Íris “analise este Instagram” e enviar a URL; o slash command continua opcional.

## [2026-08-22] arquitetura | casa | handoff de inteligência por nicho
- Escopo: manter Íris exclusivamente como analista/diagnosticadora e acrescentar a extração rastreável de insights, decisões sugeridas e experimentos.
- Ação: relatório real passa a gerar `relatorios/inteligencia-marketing.json`, classificado por nicho e ligado às evidências locais.
- Governança: somente conhecimento reutilizável e sanitizado pode chegar a `marketing/inteligencia-nichos/`; conta privada, cliente ou PII exigem anonimização e aprovação.
- Consumidor: Sami Social usa o recorte promovido no planejamento, sem alterar o diagnóstico nem publicar conteúdo.
- Próximo passo: validar o contrato na próxima auditoria real de Instagram.

## [2026-08-22] preflight | Raio-X assistido | coleta pública bloqueada sem contorno
- Escopo: um único perfil público autorizado, com destino normalizado e revalidado antes da navegação; nenhum identificador do intake foi promovido ao Git.
- Evidência: HTTPS respondeu sem redirecionamento inesperado; o preflight oficial retornou `LOGIN_REQUIRED` porque o processo recebeu `Permission denied` ao banco de cookies do Chrome Profile 5.
- Decisão: encerrar a coleta, não tentar outra identidade, não contornar login e marcar bio, conteúdo, Stories, Destaques e métricas como indisponíveis.
- Saída: limitação incorporada aos dois documentos privados do case; nova coleta depende de sessão humana autorizada e repetição do mesmo preflight.

## [2026-08-26] validação | casa | suíte de testes verde, resumo gerado e watchdog instalado
- Escopo: fechar o checkpoint do commit `f3faad5c` (lock de coleta, telemetria RapidAPI, variantes de relatório e watchdog do Escritório) que havia ficado sem validação final.
- Testes: os 10 testes `unittest` (router RapidAPI 5, lock de coleta 2, variantes de relatório 3) passaram.
- Correção: `finalize_report.py` marcava falso positivo de placeholder pendente porque o marcador `TODO` era comparado por substring case-insensitive contra `source.casefold()`, batendo na palavra comum do português "todo/toda/todos/todas". Trocado por regex com fronteira de palavra; `TODO` agora só bloqueia em maiúsculas exatas (marcador real), `A PREENCHER`/`TBD` seguem case-insensitive com fronteira. Corrigido em `.agents/skills/instagram-profile-audit/scripts/finalize_report.py` (espelhado via symlink em `.claude/`).
- Saída: `finalize_report.py` rodado sobre `analise-instagram/perfis/airbridgeoficial/relatorios/relatorio-airbridgeoficial-2026-08-26.md` (sem `--public-cut`, ainda privado) gerou a variante resumida `-resumo.md`/`-resumo.html`; HTML sem `<script>` e com `noindex`.
- Watchdog: sintaxe validada (parser-only), `start_office_background.ps1` executado manualmente com o Escritório já saudável — confirmado que não sobe um terceiro processo. `install_office_watchdog.ps1` registrado no Agendador do Windows (`TAVIR Escritorio Watchdog`); primeira execução automática registrou `LastTaskResult: 0`, sem entradas em `watchdog-error.log`.
- Achado não resolvido: dois processos `office.py serve 4173` foram encontrados ativos (PID 35092 desde 19:28 e PID 33932 desde 20:39); no momento da checagem só o 35092 seguia com o socket 4173 em LISTEN — o 33932 está vivo mas sem porta aberta (processo órfão). Não foi encerrado sem autorização explícita do Carlos.
- Próximo passo: Carlos decidir se encerra o processo órfão PID 33932 (Gerenciador de Tarefas ou `Stop-Process`); nenhuma coleta nem chamada externa está em execução.

## [2026-08-22] auditoria | @fbdeposito2025 | sessão TAVIR reconhecida e corpus concluído
- Escopo: único perfil empresarial público fornecido no intake privado do Raio-X; Chrome Profile 5 autenticado pelo Carlos; nenhuma conta adicional, interação ou área privada.
- Coleta: 76 mídias — 12 arquivos de feed representando 8 posts únicos, 4 Reels, 38 Stories, 21 Destaques e 1 perfil; cookies usados somente em memória e por domínio.
- Processamento: 66 imagens inspecionadas em contact sheets; 10 vídeos processados localmente com frames/áudio/transcrição; nenhuma fala reconhecível; métricas privadas permaneceram indisponíveis.
- Entregas: relatório local `.md` + `.html`, `inteligencia-marketing.json` não elegível para promoção automática e dois documentos privados do Raio-X regenerados.
- QA: JSON válido, HTML autocontido sem recurso remoto e render inspecionado; assinatura Basalto deprecada encontrada no gerador e corrigida para a identidade TAVIR antes da entrega.
- Próximo passo: nova rodada R1 pelos hashes atualizados; e-mail continua em gate separado.

## [2026-08-22] integração | Raio-X assistido | rodada 2 aberta sem envio
- Ocorrência: a primeira reabertura manual reutilizou o job original e rotulou incorretamente os novos documentos como rodada 1.
- Correção: o versionamento do gate agora incrementa em toda reabertura forçada, mesmo com o mesmo `job_id`; teste de regressão incluído e 65 testes Telegram aprovados.
- Estado: os dois documentos atuais foram reenviados como rodada 2, `pending_review`; nenhum e-mail foi disparado.

## [2026-08-22] gate | Raio-X assistido | R1 aprovado e próximo gate reemitido
- Diagnóstico inicial: o aviso “já foi resolvido ou substituído” confirmou o estado local `approved`; a verificação de 2026-08-23 mostrou que o poller antigo ainda não havia persistido a decisão no Supabase.
- Ação: o botão separado foi reemitido após o restart; a reconciliação remota posterior está registrada no marco seguinte.
- Segurança: nenhum e-mail foi disparado durante a confirmação ou reemissão do botão.

## [2026-08-22] operação | Raio-X assistido | consumidor Telegram atualizado
- Causa raiz: o poller residente havia iniciado antes da rota `rxdeliver`; por isso o callback do novo botão caiu no handler genérico e respondeu “Pedido já resolvido ou expirado”.
- Correção: confirmados zero jobs/fila, reiniciado somente `python tools/office.py serve 4173` e validada a nova instância com HTTP 200, PID novo, `polling` e zero falhas.
- Reteste: botão “GATE ATUALIZADO” reenviado após a saúde; o estado continua `approved` e nenhum e-mail foi enviado durante a correção.

## [2026-08-23] reconciliação | Raio-X assistido | R2 persistida antes da entrega
- Causa raiz: o poller antigo marcou R2 apenas no arquivo local; no Supabase, o case continuava `awaiting_approval`, sem `documents_approved` e sem entrega associada.
- Evidência: projeto `Healthy`, DNS e função ativos; invocações de entrega 409/500; tabela de entregas sem o case, provando que a falha ocorreu antes da Resend.
- Reparo: a decisão já autorizada foi persistida pela `review-case` atual; painel confirmou aprovação documental e case em `review`.
- Estado: `GATE DE ENTREGA REPARADO` enviado; nenhum e-mail foi disparado durante diagnóstico ou reparo.

## [2026-08-23] entrega | Raio-X assistido | e-mail finalizado sem duplicidade
- Diagnóstico: o projeto Supabase permaneceu saudável; a mensagem de indisponibilidade encobria uma
  falha 500 da etapa interna, anterior ao provedor. A ponte passou a preservar somente código
  operacional allowlisted, sem detalhes sensíveis.
- Reconciliação: a única entrega pendente autorizada foi continuada diretamente, sem repetir
  preparação e com a chave idempotente derivada da rodada 2 e dos dois hashes aprovados.
- Resultado: Resend aceitou uma única mensagem com os dois PDFs, Supabase confirmou o fechamento e o
  estado local terminou em `sent` / `email_sent`; Telegram recebeu a confirmação.
- Privacidade: transporte temporário permaneceu no workspace privado ignorado pelo Git e foi removido
  ao final; clipboard limpo. O gate geral para clientes reais continua fechado.
- Confirmação humana: Carlos informou o recebimento na caixa de destino; a validação ponta a ponta
  deste case foi concluída. Expurgo permanece como ação separada e não foi inferido desta confirmação.

## [2026-08-23] ativo de marca | Raio-X assistido | avatar preparado para co-branding
- Fonte: única imagem de perfil coletada na auditoria autorizada; nenhum novo acesso ao Instagram.
- Tratamento: conversão local determinística para PNG, remoção de metadados e limite de dimensão;
  arquivo mantido somente no diretório privado do case e fora do Git.
- Uso: prévias do Relatório e do Plano passaram a exibir TAVIR + empresa analisada no cabeçalho.
  URLs remotas e imagens Markdown continuam bloqueadas no publicador.
## [2026-08-25] auditoria | @airbridgeoficial | bloqueada no preflight de acesso
- Escopo: `https://www.instagram.com/airbridgeoficial?igsi=MTB5eHEyemZob2t5Yg==`; auditoria integral solicitada pelo CEO.
- Coleta: nenhuma. `--dry-run` retornou `LOGIN_REQUIRED`: não foi possível ler os cookies do Chrome em `C:\Users\carlo\AppData\Local\Google\Chrome\User Data\Profile 5\Network\Cookies` (`[Errno 13] Permission denied`).
- Processamento: nenhum corpus, transcrição, frame ou OCR criado.
- Entregas: contexto em `perfis/airbridgeoficial/PROJECT.md`; relatório Markdown, HTML e `inteligencia-marketing.json` não foram gerados por falta de conteúdo autorizado.
- Próximo passo: disponibilizar uma sessão legítima de Instagram no Chrome e repetir o mesmo preflight; não contornar o bloqueio nem usar credenciais/cookies no chat.

## [2026-08-26] integração | Íris | rota RapidAPI com pools de Keys preparada
- Escopo: criar alternativa à leitura de cookies do Chrome sem alterar a coleta bloqueada nem fazer chamadas reais a provedores externos.
- Ação: cópia local ignorada de `futebol-virtual-py-v3/config/api_keys.env` em `analise-instagram/config/api_keys.env`; exemplo sem segredos; allowlist dos quatro provedores; roteador HTTPS com pool por provedor, quota preventiva, sincronização de headers, cooldown e fallback explícito.
- Segurança: configuração fail-closed; pools vazios não usam Keys automaticamente; estado local contém somente labels/telemetria; nenhum valor de Key, e-mail, corpo de resposta ou conteúdo coletado foi versionado.
- Verificação: compilação Python, quatro testes offline e comando de status concluídos; nenhuma requisição de rede executada.
- Entregas: `rapidapi/router.py`, `rapidapi/providers.json`, `rapidapi/test_router.py`, `config/api_keys.env.example`, `USO.md`, `docs/TECNICO.md`, `docs/REGRAS_DE_NEGOCIO.md` e `docs/ERROS.md`.
- Próximo passo: Carlos confirmar assinaturas individuais, preencher pools por provedor e então implementar/validar os adaptadores de endpoint/schema antes da primeira coleta real.

## [2026-08-26] integração | Íris | análise acionável pelo Telegram
- Escopo: ativar a solicitação de auditorias da Íris no chat privado autorizado do Telegram, sem pedir credenciais e sem executar antes da confirmação do CEO.
- Ação: criado o atalho `/instagram <URL>` e o botão do menu; a rota também continua disponível em `/agentes` → Íris Instagram. URLs são restringidas a perfis HTTPS do Instagram.
- Coleta: criado `rapidapi/instagram_adapter.py` com contratos separados para os quatro provedores allowlisted; perfil/feed são gravados como metadados locais e a cobertura é declarada sem inventar Stories, Destaques ou mídia.
- Segurança: pools continuam fail-closed; ausência de assinatura/Key não chama rede e não cai silenciosamente em outro provedor. Nenhuma credencial foi exibida ou versionada.
- Verificação: 7 testes RapidAPI offline e 72 testes Telegram aprovados; o comando sem pools retornou `RAPIDAPI_BLOQUEADA` sem executar chamada externa.
- Próximo passo: preencher somente o pool do provedor cuja assinatura esteja confirmada e executar uma primeira consulta autorizada pelo Telegram para validar o contrato real.

## [2026-08-26] auditoria | @airbridgeoficial | diagnóstico ponta a ponta concluído
- Escopo: perfil público autorizado `https://www.instagram.com/airbridgeoficial/`; período do feed 2017-09-28 a 2026-08-23, Stories visíveis em 2026-08-25 e Destaques até 2026-08-10.
- Coleta: sessão legítima do Chrome encontrada; 3.965 mídias inventariadas — 1.177 de feed, 2.784 de Destaques, 3 Stories e 1 perfil; 496 posts únicos e 2.785 mídias únicas em 51 títulos de Destaques. RapidAPI permaneceu bloqueada por pools vazios e não chamou rede.
- Incidente e correção: o primeiro comando excedeu o timeout do executor mas continuou em segundo plano; a segunda instância gerou `WinError 32` em `.part`. A árvore duplicada foi encerrada, `yt-dlp` instalado no `.venv` e a coleta retomada pelo archive sem duplicar itens.
- Processamento: 1.782 vídeos e 2.183 imagens inventariados; 40 vídeos transcritos localmente, 120 imagens na amostra, 230 frames e 1.193 textos únicos; OCR automatizado indisponível.
- Entregas: `perfis/airbridgeoficial/relatorios/relatorio-airbridgeoficial-2026-08-26.md`, `.html` e `inteligencia-marketing.json`; inteligência pública sanitizada promovida a `marketing/inteligencia-nichos/niches/turismo-experiencial-internacional/conhecimento.md`.
- Diagnóstico: força em creators/UGC e diferenciais operacionais; gargalos em 51 Destaques com legado da antiga escola de inglês, promessa dispersa e conversão sem atribuição observável.
- Limitações: Reels separados redirecionaram à home; um item histórico do feed tinha URL `N/A`; bio, comentários completos, retenção, alcance, cliques, DMs, vendas e demografia não foram fornecidos nem estimados.
- QA: JSON válido, HTML renderizado, evidências visuais inspecionadas e relatório declara amostra, período, cobertura e limitações.
- Próximo passo: CEO decidir execução das prioridades e medir os experimentos de 30 dias antes de adotar hipóteses.

## [2026-08-26] evolução | resiliência, Requests e relatórios | checkpoint para validação
- Escopo: corrigir a causa do atraso observada em `@airbridgeoficial`, tornar o custo de Requests
  auditável e padronizar versões completa/resumida em Markdown e HTML.
- Implementado: lock atômico por perfil com PID/limpeza de órfão, heartbeat de coleta, logs em disco,
  telemetria sanitizada por tentativa RapidAPI e finalizador que valida o relatório completo e produz
  as quatro variantes. HTML ganhou `noindex` e neutralização de HTML cru coletado.
- Integração: Raio-X passa a encaminhar explicitamente URL de Instagram à Íris, incorpora os achados
  completos no documento canônico e mantém variantes HTML privadas; não cria link Vercel nesta etapa.
- Estado: alterações salvas, mas a suíte de testes, a geração das versões resumo da auditoria existente
  e a instalação/prova do watchdog foram interrompidas antes da conclusão. Não há coleta nem chamada
  externa ativa.
- Próximo passo: seguir os três itens do checkpoint em `CONTINUAR.md`, corrigir se necessário e só
  então marcar a evolução como concluída.

## [2026-08-30] configuração | Íris | perfil Chrome operacional TAVIR fixado
- Causa: o coletor aceitava perfil explícito para leitura de cookies, mas sem parâmetro usava o perfil padrão do Chrome; a abertura de login ignorava o perfil solicitado e podia cair no último perfil usado.
- Decisão: `Profile 5` (perfil visual **Tavir**, conta operacional) é agora o padrão. O comando do `gallery-dl` e a abertura da página oficial de login recebem o mesmo diretório; outro perfil só é usado com `--browser-profile` explícito.
- RapidAPI: há 13 Keys locais. `KEY_1` já está vinculada aos pools de **Instagram Best Experience** e **Instagram Scraper AI1**; a integração de dados locais permanece fora do escopo da Íris. As duas APIs de Instagram serão complemento para perfil/feed, sem substituir a coleta autenticada de Stories, Destaques e mídia.
- Verificação: testes offline cobrem a especificação do cookie e o argumento `--profile-directory=Profile 5` da abertura do Chrome; nenhuma URL, cookie, login ou requisição externa foi acionada.

## [2026-08-31] rotação | Íris | 13 Keys em rodízio nos dois provedores
- Confirmação do CEO: cada uma das 13 Keys é de uma conta RapidAPI distinta, com assinatura própria em Best Experience (100/mês) e Scraper AI1 (25/mês). Capacidade agregada ~1300/mês e ~325/mês.
- Ação: pools `KEY_1..KEY_13` nos dois provedores em `config/instagram_rapidapi.env`. `router._configured_limit` ganhou `RAPIDAPI_LIMIT_<PROVEDOR>_DEFAULT` (100 e 25) para não repetir 26 linhas de limite por Key. `_choose_key` passou a desempatar por índice numérico (KEY_2 antes de KEY_10).
- Comportamento: o roteador escolhe a Key menos usada a cada chamada; 429 → cooldown 60s, 401/403 → 1h, e segue para a próxima Key; só ao esgotar o pool cai para o outro provedor. ~2 chamadas por auditoria.
- Guardrail mantido: o rodízio distribui carga entre contas que já têm direito; não serve para furar o limite de uma conta. Se as Keys virarem apps de uma conta só, reduzir o pool.
- Verificação: 17 testes offline verdes (10 rapidapi + 7 lock). Rotação testada ao vivo: 7 chamadas `/profile` usaram KEY_1..KEY_13 em ordem, todas 200.

## [2026-08-31] validação | Íris | contratos RapidAPI provados e navegador travado no Profile 5
- Escopo: fechar o gate aberto em 30/08 — validar os contratos das duas assinaturas com chamada real e resolver o "abre o perfil errado" relatado pelo Carlos.
- Chamada real: perfis públicos `instagram` e `natgeo`, `KEY_1`. `best_experience` `/profile?username=` + `/feed?user_id=` → 200 com dados ricos (bio, media_count, items com code/media_type/CDN). `social_premium` `/user/info_v2/?username=` + `/user/feed_v2/?username=` → 200.
- Causa raiz do `social_premium` 403: upstream atrás de Cloudflare devolve `Error 1010` sem `User-Agent` de navegador; o roteador não enviava UA e tratava o 403 como falha de auth (cooldown de 1h). Corrigido em `router.py` com header `User-Agent` fixo.
- Causa raiz do "perfil errado": a Íris usava caminhos de navegador ad-hoc (Claude-in-Chrome/Playwright/computer-use) que ignoram o `Profile 5`. O `collect_instagram.py` já estava correto. Regra nova em SKILL/agente/AGENTS/equipe/USO: navegador **só** pelo script; qualquer outro caminho é proibido para ver Instagram.
- Limpeza: `providers.json` reduzido aos 2 provedores com assinatura (best_experience prio 1 ~100/mês, social_premium prio 2 ~25/mês); `stable`/`looter2` e seus contratos removidos; `test_router.py` migrado para fixture `best_experience`; limites reais gravados em `instagram_rapidapi.env`.
- `Local Business Data`: `git grep` no repositório inteiro — **zero uso**, só citada como exclusão. É presença local (Maps/listagens), não é da Íris.
- Verificação: 15 testes offline verdes (8 rapidapi + 7 lock). Quota gasta na validação: Best Experience ~6/100, Scraper AI1 ~8/25. Nenhum valor de Key impresso/commitado.
- Próximo passo: 1ª auditoria real exercita cobertura de Stories/Destaques pela API vs. complemento Chrome.

## [2026-08-30] configuração | Íris | assinaturas RapidAPI Instagram habilitadas
- Confirmação do CEO: as assinaturas `Instagram Best Experience` e `Instagram Scraper AI1` estão configuradas nas Keys locais. `Local Business Data` foi corretamente mantida fora da Íris, pois atende presença local, não perfil de Instagram.
- Decisão: somente `KEY_1` entra inicialmente nos dois pools. As outras 12 Keys não são rotacionadas até se comprovar a associação de assinatura e a quota de cada uma; isso evita consumo disperso e mantém a auditoria de custo inteligível.
- Limite: o adaptador atual consulta perfil/feed; apesar de a Best Experience anunciar recursos de mídia, destaques e comentários, eles não são declarados ou usados até validação explícita de contrato em uma URL autorizada.

## [2026-08-31] auditoria | @tavirbr | baseline institucional antes do C01
- Escopo: perfil e feed públicos; período observado 24/08/2026–31/08/2026.
- Coleta: conta empresarial, 1 seguidor, 1 Reel técnico de 5 s sem legenda; bio/link vazios; Stories/Destaques/binários indisponíveis.
- Processamento: inventário e corpus; 0 transcrições/frames/OCR por ausência de mídia binária.
- Requests: 2 RapidAPI, ambos bem-sucedidos; tráfego Chrome/gallery-dl não utilizado.
- Entregas: completo/resumo em `.md/.html` e `inteligencia-marketing.json`, todos privados/ignorados.
- Próximo passo: aprovar fundação, congelar D0 e executar C01 com snapshots 24h/72h/7d.
