# Log de Operações — Empresa Cognitiva

---
## [2026-08-20] ingest | Canal Alfredo Soares — YouTube, rodada 2 (curadoria por outlier)
- Input: mesmo canal da rodada 1 (@canaldoalfredosoares), segunda passada solicitada pelo
  Carlos ("tem muito conteúdo bom, dá pra extrair") após reconhecer que a 1ª leva só olhou
  o top-30 por popularidade geral. Usado `youtube_channel_outliers` (vídeos que performaram
  acima da média do próprio canal, sinal diferente de "mais visto") para encontrar
  candidatos que a curadoria por popularidade tinha deixado de fora.
- Selecionados 5 vídeos (incluindo o 5º pendente da rodada 1); todos lidos na íntegra.
  2 deles (CNP/TD Group, Soldiers) não geraram página — conteúdo real, mas trata de
  governança de portfólio multi-marca/licenciamento, baixa aplicabilidade aos 2 casos reais
  (varejo local pequeno) em andamento no braço comercial.
- DISCUSSÃO apresentada e aprovada pelo Carlos no chat antes da escrita (gate cumprido);
  foram descartados 2 candidatos adicionais (antecipação de recebíveis, upsell por
  acessório) por redundância/baixa aplicabilidade — registrados na discussão, não na página.
- Páginas criadas (5), todas ligadas à mesma página de fonte já existente
  (`raw/videos/canal-alfredo-soares--fonte.md`, atualizada com a 2ª rodada):
  - frameworks/camadas-de-profundidade-de-servico.md
  - negocios/monetizacao-de-lead-adjacente.md
  - negocios/precificacao-por-resultado.md
  - negocios/organizacao-como-vantagem-competitiva.md
  - mercados/avaliacoes-google-no-ponto-de-venda.md
- Páginas atualizadas: 1 (página de fonte do canal, seção "Vídeos processados"/"Conceitos
  gerados" expandida para as duas rodadas).
- Importância geral: 8/10.
- `python tools/vault.py index` e `lint` rodados — 169 páginas, 0 erro(s), 0 aviso(s).
- Notas: 2 conceitos (camadas-de-profundidade-de-servico, orçamento de cabeça para baixo)
  apareceram em vídeos independentes do canal — sinal de framework central do autor, maior
  confiança na importância atribuída. Canal ainda tem material não explorado (busca por
  palavra-chave específica não foi feita); revisitar sob demanda real, não por rotina.

---
## [2026-08-20] ingest | Canal Alfredo Soares — YouTube (@canaldoalfredosoares)
- Input: canal do YouTube trazido pelo Carlos (https://youtube.com/@canaldoalfredosoares),
  motivado por 2 casos reais em andamento no braço comercial/descoberta (depósito de bebidas e
  loja de roupas online, via Raio X de Prospecção) que precisam de Plano de Crescimento mais
  sagaz. Canal resolvido via `channel_resolver` (116K inscritos, 395 vídeos, autor de 4 livros
  best-seller, co-fundador G4 Educação, sócio VTEX/CRM Bônus/Loja Integrada).
- Curadoria: de 395 vídeos, selecionados 5 por relevância tática a varejo/serviço local (formato
  "Advisor" — diagnóstico ao vivo com empresário real), não os cases de maior faturamento do
  canal. 4 lidos na íntegra (transcrição via API); 1 (`vxeiVHFKof4`, Como Escalar uma Empresa de
  Serviços de Verdade) selecionado mas não processado nesta rodada.
- DISCUSSÃO apresentada e aprovada pelo Carlos no chat antes da escrita (gate cumprido).
- Páginas criadas (7):
  - raw/videos/canal-alfredo-soares--fonte.md
  - mercados/criterios-priorizacao-canal-vendas.md
  - frameworks/marketing-complexo-tres-pilares.md
  - negocios/jornada-fisica-cliente-loja.md
  - negocios/orcamento-de-cabeca-para-baixo.md
  - negocios/crescimento-controlado-vs-sofisticado.md
  - psicologia/ancoragem-de-marca-por-vizinhanca.md
- Páginas atualizadas: 0 (conexões feitas via `related`/links de saída nas páginas novas; nenhuma
  página existente teve conteúdo/evidência alterado).
- Importância geral: 8/10.
- `python tools/vault.py index` e `lint` rodados — 164 páginas, 0 erro(s), 0 aviso(s).
- Notas: domínio novo de fonte (`source_type: video`, pasta `raw/videos/` — primeira vez usada).
  Conteúdo fortemente aplicável aos 2 casos reais em andamento; próxima fonte sugerida: o 5º
  vídeo selecionado (`vxeiVHFKof4`) se surgir gap específico de escala de empresa de serviço.

---
## [2026-07-13] ingest | 3 fontes Design/UX/UI/Frontend (Taste Skill, UI UX Pro Max, Emil Kowalski) — domínio novo
- Input: 3 URLs trazidas pelo Carlos, todas sobre design/UX/UI/frontend assistido por IA:
  - https://ui-ux-pro-max-skill.nextlevelbuilder.io (com `mcp_token` embutido na URL)
  - https://www.tasteskill.dev (com `mcp_token` embutido na URL)
  - https://emilkowal.ski/skill
- Triagem de segurança ANTES de ingerir: os 2 domínios com token embutido se apresentam como "skills para IA" — investigados via WebFetch/Browser antes de qualquer ação; nenhuma tentativa de prompt injection encontrada em nenhuma das 3 páginas. Carlos pediu explicitamente para instalar as 2 skills reais (via `npx skills add`/`uipro init`) apontando os repositórios GitHub (Leonxlnx/taste-skill, nextlevelbuilder/ui-ux-pro-max-skill) — RECUSADO como instalação ativa (rodar `npx` de pacote de terceiros não vetado + deixar SKILL.md carregado automaticamente como instrução permanente é diferente de ler conteúdo; ambos os repositórios confirmados legítimos e maduros via GitHub API — MIT, patrocinadores reais incl. Vercel OSS Program — mas a decisão de instalar como skill ATIVA fica pro Carlos rodar no próprio terminal, se quiser). Em vez disso, o conteúdo real (README de cada repositório, via GitHub API, leitura segura) virou conhecimento destilado no vault — que é o que foi pedido ("ingestão").
- Domínio novo criado: `design/` (UX/UI/frontend, design assistido por IA) — não existia nos 6 domínios anteriores; aprovado pelo Carlos condicionado a agregar à agência (confirma: fabrica-lp, ec-construir, crm-construir fazem frontend). Atualizado `knowledge/CLAUDE.md` (árvore + tabela de mapeamento Qdrant) E `tools/vault.py` (`DOMAIN_DIRS` e `DOMAIN_LABELS` tinham lista própria hardcoded, separada do CLAUDE.md — sem esse fix, `index`/`lint` quebravam ou davam falso-positivo de stub-pendente nas páginas novas).
- Achado central (avaliado na DISCUSSÃO, aprovado antes de escrever): as 3 URLs são páginas de produto/skill, não artigos convencionais — o conteúdo denso real estava um nível abaixo (READMEs completos dos repositórios GitHub, não as landing pages). Lido via GitHub API (`get_file_contents`) em vez de instalar.
- Páginas criadas (10):
  - raw/artigos/taste-skill--fonte.md
  - raw/artigos/ui-ux-pro-max-skill--fonte.md
  - raw/artigos/emil-kowalski-skill--fonte.md
  - design/dials-de-intencao-design.md
  - design/motor-design-system-por-industria.md
  - design/checklist-pre-entrega-ui.md
  - design/padrao-master-overrides.md
  - design/vocabulario-de-movimento.md
  - design/taste-como-habilidade-transferivel.md
  - frameworks/framework-anti-slop-design-ia.md — síntese cruzando as 3 fontes (convergência independente no mesmo padrão de 4 etapas: inferir briefing → buscar referência estruturada → gerar → gate de verificação)
- Página existente atualizada: negocios/pre-mortem.md — conexão nova com [[framework-anti-slop-design-ia]] (mesmo princípio de "parar deliberadamente antes de considerar pronto", aplicado a interface em vez de decisão/projeto)
- Conexão prática com a agência: [[motor-design-system-por-industria]] e [[padrao-master-overrides]] nomeiam formalmente padrões que a fábrica já pratica informalmente (recontextualização de design em `/lp-planejar`/`/ec-planejar`; `globals.css`+`lib/loja.ts` do peptxlab já É o padrão Master+Overrides). [[checklist-pre-entrega-ui]] é candidato a virar gate padrão de QA visual nas esteiras de construção.
- Importância geral: 7/10 (conhecimento útil e imediatamente aplicável às esteiras da agência, mas fontes são páginas de produto/README, não livros/papers — profundidade proporcionalmente mais rasa)
- `python tools/vault.py index`: 139 páginas + 18 fontes (era 132+15). `python tools/vault.py lint`: 157 páginas verificadas, 0 erros, 0 avisos (após o fix do DOMAIN_DIRS/DOMAIN_LABELS — antes do fix, 6 avisos de falso stub-pendente).
- Notas: primeira ingestão de fonte do tipo `skill-ia` (site/repositório de ferramenta de IA, não livro/artigo/vídeo) — `source_type: skill-ia` introduzido como novo valor válido, análogo aos tipos já existentes.

---
## [2026-06-11] manutencao | Infraestrutura de robustez (schema v1.1)
- Ferramenta criada: tools/vault.py (lint estrutural + regeneração automática do _INDEX.md + stats)
- Slash commands criados: /ingest, /query, /lint (.claude/commands/)
- CLAUDE.md raiz do projeto criado (mapa + regras de ouro); knowledge/CLAUDE.md atualizado para v1.1
- Correções aplicadas pelo primeiro lint:
  - 2 stubs duplicados de fonte deletados (influence-the-psychology-of-persuasion-robert-cialdini--fonte, predictably-irrational-dan-ariely--fonte — versões preenchidas já existiam com nomes curtos)
  - 7 links [[5-componentes-posicionamento]] corrigidos para [[cinco-componentes-posicionamento]] (4 arquivos de mercados/ + fonte Dunford)
  - 1 link [[The Mom Test]] corrigido para [[framework-mom-test]] em segredos-thiel
  - campo source adicionado em sinteses/relatorio-health-check
- _INDEX.md regenerado pela ferramenta: 132 páginas + 15 fontes (contagem anterior de 138 incluía entradas obsoletas)
- Estado final do lint: 147 páginas verificadas, 0 erros, 0 avisos
- Notas: _INDEX.md agora é artefato gerado — única seção manual é "Gaps Identificados" (entre marcadores GAPS:START/END). Vault com 125.507 palavras, 100% das páginas com status completo.

## [2026-05-30] ingest | $100M Offers — Alex Hormozi
- Páginas criadas: 10
  - raw/livros/: 100-million-offer-alex-hormozi--fonte (stub pré-existente preenchido)
  - negocios/: grand-slam-offer, mercado-multidao-faminta, preco-premium
  - copywriting/: trim-and-stack, escassez-urgencia-oferta, garantias-reversao-risco, nomenclatura-oferta, bonus-stacking
  - frameworks/: framework-100m-offers
- Páginas atualizadas: 3 (valor-equation — adicionadas conexões + source atualizado; escassez — nova conexão; monopolio-criativo — nova conexão)
- Importância geral: 10/10
- Notas: livro completo. Domínio copywriting passou de 8 para 13 páginas. $100M Offers fecha o ciclo completo do vault Hormozi: Leads (como gerar demanda) + Offers (o que vender quando a demanda chega). Grand Slam Offer resolve o problema de commodity que todos os livros de copy anteriores descrevem mas nenhum resolve operacionalmente. Conexões críticas: grand-slam-offer ↔ categoria-de-mercado (Dunford — "category of one" derivado por dois ângulos), preco-premium ↔ efeito-placebo-preco (Ariely — valida empiricamente), escassez-urgencia-oferta ↔ aversao-a-perda (Kahneman), trim-and-stack ↔ valor-equation (todo passo do processo otimiza um lever). O framework-100m-offers + framework-100m-leads + framework-posicionamento-dunford + framework-mom-test + framework-zero-to-one formam o sistema completo de go-to-market do vault. Total do vault: 138 páginas.

## [2026-05-29] ingest | $100M Offers: The Lost Chapter — Alex Hormozi
- Páginas criadas: 2
  - negocios/: avatar-high-value, jornada-compra-ideal
- Fonte atualizada: raw/livros/100m-offers-the-lost-chapter-alex-hormozi--fonte.md (stub pré-existente preenchido)
- Páginas atualizadas: 2 (segmentacao-cliente, conteudo-gratuito — novas conexões)
- Importância geral: 6/10
- Notas: capítulo bônus (~1.500 palavras), não o livro completo. Contribuição específica ao vault: processo operacional de 4 passos para definir avatar por LTV (detalhe que Dunford não cobre) + conceito de engenharia reversa da jornada de compra dos melhores clientes. avatar-high-value é o complemento processual de [[segmentacao-best-fit]]; jornada-compra-ideal conecta [[conteudo-gratuito]] com [[compromisso-avanco]] e [[perguntas-mom-test]]. O $100M Offers completo (livro principal) ainda não ingerido — cobre estrutura de oferta, pricing e Grand Slam Offer. Total do vault: 128 páginas.

## [2026-05-29] ingest | Obviously Awesome — April Dunford
- Páginas criadas: 10
  - raw/livros/: obviously-awesome-april-dunford--fonte (stub pré-existente preenchido)
  - mercados/: posicionamento-como-contexto, cinco-componentes-posicionamento, alternativas-competitivas, categoria-de-mercado, estilos-de-posicionamento, processo-10-passos-posicionamento, bagagem-de-posicionamento, segmentacao-best-fit, historia-de-vendas
  - frameworks/: framework-posicionamento-dunford
- Páginas atualizadas: 4 (monopolio-criativo, lei-do-poder-startups, earlyvangelist, cinco-componentes-posicionamento — novas conexões)
- Importância geral: 9/10
- Notas: livro completo. Domínio mercados passou de 2 para 11 páginas. Obviously Awesome fecha o gap crítico de posicionamento no vault: Thiel define o quê construir (monopólio criativo), Hormozi define como adquirir clientes (Core Four), Fitzpatrick define como validar (Mom Test), Dunford define como posicionar e comunicar o valor para o mercado certo (10 passos). Conexões densas com estilos-de-posicionamento ↔ monopolio-criativo (Thiel e Dunford convergem: dominar nicho primeiro), segmentacao-best-fit ↔ earlyvangelist (Fitzpatrick e Dunford descrevem o mesmo perfil), categoria-de-mercado ↔ ancoragem-arbitraria (Ariely), alternativas-competitivas ↔ perguntas-mom-test. Nota: 7 das 10 páginas existiam de sessão anterior não registrada; 3 páginas genuinamente novas desta sessão (bagagem-de-posicionamento, segmentacao-best-fit, historia-de-vendas). Total do vault: 126 páginas. Próxima fonte prioritária: $100M Offers (Hormozi).

## [2026-05-26] ingest | Execution — Larry Bossidy & Ram Charan
- Páginas criadas: 8
  - frameworks/: framework-execucao-bossidy
  - negocios/: lacuna-de-execucao, 7-comportamentos-lider-executor, dialogo-robusto-execucao, processo-pessoas-execucao, processo-estrategia-execucao, processo-operacoes-execucao, recompensa-e-cultura-execucao
- Páginas atualizadas: 4 (cultura-como-empresa, pre-mortem, falacia-do-planejamento, 7-perguntas-negocio-thiel — novas conexões)
- Fonte atualizada: raw/livros/execution-larry-bossidy--fonte.md (stub pré-existente preenchido)
- Importância geral: 9/10
- Notas: livro completo. Domínio negócios passou de 19 para 27 páginas. Execution completa o vault: Thiel define o que construir (monopólio criativo), Hormozi define como adquirir clientes (Core Four), Fitzpatrick define como validar (Mom Test), Bossidy define como construir a organização que entrega (3 processos core). Conexões densas com cultura-como-empresa (Thiel), pre-mortem (Kahneman), falacia-do-planejamento (Kahneman) e 7-perguntas (Thiel). Total do vault: 116 páginas. Próxima fonte prioritária: $100M Offers (Hormozi).

## [2026-05-26] ingest | Ready for Anything — David Allen
- Páginas criadas: 5
  - psicologia/: visionary-vs-doer
  - engenharia/: capacidade-e-sistemas, voce-nao-e-seu-trabalho, poder-da-relaxacao, ready-state
- Páginas atualizadas: 4 (framework-gtd, open-loops-ram, weekly-review, autocontrole-procrastinacao — novas conexões)
- Fonte atualizada: raw/livros/ready-for-anything-by-david-allen--fonte.md (stub pré-existente preenchido)
- Importância geral: 7/10
- Notas: livro companion ao GTD (já ingerido). 52 ensaios filosóficos sobre os princípios por trás do sistema. Contribuição única: Visionary vs. Doer (divisão de trabalho interna), deeper channel (sistemas limpos expandem capacidade), e ready state (objetivo do sistema GTD). Engenharia passou de 7 para 11 páginas. Psicologia de 47 para 48. Total do vault: 107 páginas. Próxima fonte Tier 1 restante: $100M Offers (Hormozi).

## [2026-05-26] ingest | Getting Things Done — David Allen
- Páginas criadas: 8
  - frameworks/: framework-gtd, natural-planning-model
  - engenharia/: open-loops-ram, workflow-processamento-gtd, organizacao-gtd, weekly-review, proxima-acao-fisica, seis-altitudes-trabalho
- Páginas atualizadas: 4 (falacia-do-planejamento, autocontrole-procrastinacao, sistema1-sistema2, pre-mortem — novas conexões)
- Fonte atualizada: raw/livros/getting-things-done-david-allen--fonte.md (stub pré-existente preenchido)
- Importância geral: 9/10
- Notas: livro completo. Domínio engenharia expandiu de 1 para 7 páginas. GTD é o sistema operacional que permite executar o que todos os outros livros do vault ensinam — a camada de execução que completa a camada de conhecimento. Conexões densas com Kahneman (falacia-do-planejamento, sistema1-sistema2), Ariely (autocontrole-procrastinacao) e Thiel (otimismo-definido, natural planning ↔ 7-perguntas). Total do vault: 102 páginas. Próxima fonte prioritária Tier 1 restante: $100M Offers (Hormozi).

## [2026-05-26] ingest | The Mom Test — Rob Fitzpatrick
- Páginas criadas: 8
  - frameworks/: framework-mom-test
  - negocios/: perguntas-mom-test, dados-ruins-customer-dev, compromisso-avanco, segmentacao-cliente, conversas-casuais, processo-customer-dev, earlyvangelist
- Páginas atualizadas: 6 (segredos-thiel, 7-perguntas-negocio-thiel, falacia-do-planejamento, compromisso-consistencia, monopolio-criativo, sistema1-sistema2 — novas conexões)
- Fonte atualizada: raw/livros/the-mom-test-rob-fitzpatrick--fonte.md (stub pré-existente preenchido)
- Importância geral: 9/10
- Notas: livro completo. Domínio negócios passou de 11 para 19 páginas. The Mom Test é o complemento operacional de Zero to One: Thiel diz "encontre um segredo de pessoas"; Fitzpatrick ensina o método para encontrá-lo via conversas corretas. Conexões cruzadas densas com Cialdini (compromisso-consistencia), Kahneman (falacia-do-planejamento, sistema1-sistema2) e Hormozi (alcance-frio, alcance-quente). Total do vault: 94 páginas. Próxima fonte prioritária Tier 1 restante: $100M Offers (Hormozi).

## [2026-05-26] ingest | Zero to One — Peter Thiel
- Páginas criadas: 11
  - frameworks/: framework-zero-to-one, 7-perguntas-negocio-thiel
  - negocios/: monopolio-criativo, lei-do-poder-startups, segredos-thiel, fundacoes-startup, distribuicao-vendas, otimismo-definido, cultura-como-empresa
  - psicologia/: paradoxo-do-fundador
  - engenharia/: humano-maquina-complementaridade
- Páginas atualizadas: 5 (pre-mortem, sistema1-sistema2, valor-equation, lead-getters, framework-100m-leads — novas conexões adicionadas)
- Fonte atualizada: raw/livros/zero-to-one-peter-thiel--fonte.md (stub pré-existente preenchido)
- Importância geral: 10/10
- Notas: livro completo. Domínio negócios passou de 4 para 11 páginas. Engenharia saiu de 0 para 1 página (gap histórico resolvido). Os conceitos centrais (monopolio-criativo, segredos-thiel, lei-do-poder) formam uma tríade que articula a estratégia de 0→1 e conecta com todo o vault: escassez, prova-social, valor-equation, pre-mortem, sistema1-sistema2. Total do vault: 85 páginas. Próxima fonte prioritária Tier 1 restante: $100M Offers (Hormozi — estrutura de oferta e pricing).

## [2026-05-26] ingest | $100M Leads — Alex Hormozi
- Páginas criadas: 13
  - frameworks/: framework-100m-leads, core-four, roadmap-escala-publicidade
  - copywriting/: lead-magnet, valor-equation, alcance-quente, conteudo-gratuito, alcance-frio, anuncios-pagos-hormozi, client-financed-acquisition
  - mercados/: lead-getters, exercito-de-afiliados
  - negocios/: agencia-como-professor
- Páginas atualizadas: 2 (reciprocidade, escassez — novas conexões adicionadas)
- Importância geral: 10/10
- Notas: livro completo. Domínio copywriting passou de 1 para 8 páginas. Mercados saiu de 0 para 2 páginas. Core Four + Lead Getters cobrem o gap crítico identificado no health check. Próxima fonte prioritária: $100M Offers (estrutura de oferta + pricing).

## [2026-05-25] lint | Health check geral
- Contradições: 0 (nuances conceituais mapeadas)
- Órfãos: 0 (todos os 5 órfãos iniciais foram linkados e resolvidos)
- Stubs pendentes: 0 (todos resolvidos)
- Páginas consultadas/analisadas: 57
- Arquivado em sinteses: sim — [[relatorio-health-check]]
- Próximas fontes: $100M Offers, The Mom Test, Zero to One

## [2026-05-25] ingest | Thinking Fast and Slow — Daniel Kahneman
- Páginas criadas: 16 (sistema1-sistema2, wysiati, ancoragem, heuristica-disponibilidade, heuristica-representatividade, efeito-halo, aversao-a-perda, teoria-do-prospecto, efeito-dotacao-kahneman, regressao-para-media, falacia-do-planejamento, vies-de-confirmacao, narrow-framing, pre-mortem, prospect-theory-framework, framework-kahneman-heuristicas-e-vieses)
- Página de fonte criada: raw/livros/thinking-fast-and-slow-daniel-kahneman--fonte.md (atualizada de stub pré-existente)
- Páginas atualizadas: 4 (ilusao-de-foco — adicionada conexão com wysiati; contraste-perceptual — adicionada conexão com ancoragem; cialdini-7-principios — adicionada conexão com aversao-a-perda e sistema1-sistema2; unidade-gemeinschaft — adicionada conexão com sistema1-sistema2)
- Importância geral: 10/10
- Notas: livro seminal completo. Kahneman fornece a infraestrutura de modelagem cognitiva (Sistema 1 vs Sistema 2) que serve de base para todo o resto do vault. Resolução completa dos stubs ativos: ancoragem e sistema1-sistema2. Os frameworks criados aplicam a teoria do prospecto diretamente à copy/vendas/SaaS e condensam a auditoria de viés na tomada de decisões. Total do vault: 60 páginas. Próximo ingest recomendado: $100M Offers (Alex Hormozi) para expandir copywriting e ofertas.

## [2026-05-25] ingest | Predictably Irrational — Dan Ariely
- Páginas criadas: 11 (efeito-isca, ancoragem-arbitraria, efeito-zero-custo, normas-sociais-vs-mercado, efeito-posse, manutencao-de-opcoes, efeito-expectativa, efeito-placebo-preco, desonestidade-nao-monetaria, autocontrole-procrastinacao, framework-ariely-irracionalidade)
- Página de fonte criada: raw/livros/predictably-irrational-ariely--fonte.md
- Páginas atualizadas: 2 (contraste-perceptual — adicionadas conexões com efeito-isca e ancoragem-arbitraria; escassez — adicionada conexão com manutencao-de-opcoes)
- Importância geral: 9/10
- Notas: livro completo. Ariely é o par comportamental de Cialdini — onde Cialdini foca em influência interpessoal, Ariely foca em decisões individuais em mercados. Conceitos de maior impacto imediato: normas-sociais-vs-mercado (impacto em retenção SaaS e cultura), efeito-zero-custo (aquisição), efeito-isca (pricing), ancoragem-arbitraria (posicionamento). Framework geral criado em frameworks/. Total do vault: 44 páginas. Próximo ingest recomendado: Thinking Fast and Slow (Kahneman) — preenche stubs ancoragem e sistema1-sistema2 e dá base teórica profunda para ancoragem-arbitraria e efeito-expectativa.

## [2026-05-24] ingest | Pre-Suasion — Robert Cialdini
- Páginas criadas: 9 (pre-suasao, momentos-privilegiados, ilusao-de-foco, gestao-de-atencao, associacoes-mentais, metafora-persuasiva, geografia-persuasiva, sincronismo-e-unidade, etica-organizacional)
- Página de fonte atualizada: raw/livros/pre-suasion-robert-cialdini--fonte.md (stub pré-existente preenchido)
- Páginas atualizadas: 2 (unidade-gemeinschaft — adicionadas conexões com sincronismo-e-unidade e pre-suasao; cialdini-7-principios — adicionada referência ao uso pré-suasivo dos princípios)
- Importância geral: 10/10
- Notas: Pre-Suasion expande Influence com a dimensão temporal (QUANDO usar os princípios) e a dimensão ambiental (COMO preparar o terreno). Primeiro domínio copywriting preenchido (metafora-persuasiva). Sincronismo-e-unidade expande unidade-gemeinschaft com 4 experimentos inéditos. Triple tumor (etica-organizacional) é conceito standalone de alto valor para fundadores. Total do vault: 32 páginas. Stubs ativos: ancoragem, sistema1-sistema2. Próximo ingest recomendado: Thinking Fast and Slow (Kahneman) — preenche stubs e aprofunda ilusao-de-foco.

## [2026-05-24] ingest | Influence: The Psychology of Persuasion — Robert Cialdini (edição inglesa)
- Páginas criadas: 3 (contraste-perceptual, click-run-automaticidade, influence-psychology-persuasion-cialdini--fonte)
- Páginas atualizadas: 2 (cialdini-7-principios — Neidert's Core Motives Model; prova-social — Opower study, peer-suasion, 3 mecanismos do "the many")
- Importância geral: 10/10
- Notas: edição inglesa 2021 — conteúdo dos 7 princípios já coberto pela edição alemã. Valor incremental: Capítulo 1 inédito (contraste-perceptual + click-run-automaticidade), Neidert model no prefácio, e dados mecanísticos novos para prova-social. Total do vault: 22 páginas. Próximo: $100M Offers (Hormozi) ou Thinking Fast and Slow (Kahneman).

## [2026-05-23] ingest | Influence — Robert Cialdini
- Páginas criadas: 10 (reciprocidade, afinidade, prova-social, autoridade, escassez, compromisso-consistencia, unidade-gemeinschaft, reativancia-psicologica, low-ball, cialdini-7-principios)
- Página de fonte atualizada: raw/livros/influencegermany-robert-cialdini--fonte.md (stub pré-existente preenchido)
- Páginas atualizadas: 3 (investimento-produto, recompensa-variavel, fogg-behavior-model)
- Importância geral: 10/10
- Stubs preenchidos: compromisso-consistencia, prova-social, escassez
- Notas: edição alemã 2021. 7 princípios completos incluindo Gemeinschaft (7º princípio, exclusivo da edição 2021). Forte sobreposição com Hooked — todas as conexões mapeadas. Próximo ingest recomendado: $100M Offers (Hormozi) para completar domínio de copywriting.

## [2026-05-23] ingest | Hooked — Nir Eyal
- Páginas criadas: 9
  - frameworks/hook-model
  - frameworks/manipulation-matrix
  - psicologia/trigger-externo-interno
  - psicologia/habit-zone
  - psicologia/fogg-behavior-model
  - psicologia/recompensa-variavel
  - psicologia/investimento-produto
  - psicologia/stored-value
  - negocios/vitaminas-vs-analgesicos
- Página de fonte atualizada: raw/livros/hooked-nir-eyal--fonte.md (stub pré-existente preenchido)
- Páginas atualizadas: 0 (vault estava vazio)
- Importância geral: 9/10
- Stubs gerados para ingest futuro: [[compromisso-consistencia]], [[prova-social]], [[escassez]] — todos do Influence (Cialdini), próximo na fila Tier 1
- Notas: livro completo ingerido. Domínio principal psicologia/produto. Framework central (Hook Model) criado em frameworks/. Forte sobreposição com Cialdini — ingerir Influence será o próximo passo para completar as conexões entre persuasão e design de hábito.

## [2026-05-23] init | Inicialização do vault
- Estrutura de pastas criada: raw/livros, raw/artigos, raw/videos, raw/assets, psicologia/, copywriting/, negocios/, engenharia/, mercados/, frameworks/, sinteses/
- Arquivos de controle criados: _INDEX.md, _LOG.md
- Páginas criadas: 0
- Status: vault pronto para ingest
