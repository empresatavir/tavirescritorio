# Planejamento — Raio-X dentro do Escritório TAVIR

> Data: 2026-11-08 · Dono: Carlos · Documento de decisão e arquitetura.
> A ordem de serviço executável está em [`GOAL_RAIOX.md`](GOAL_RAIOX.md). Este arquivo explica o
> **porquê** e o **desenho**; o GOAL diz **o que fazer, em que ordem e quando parar**.

---

## 1. Onde estamos

O Raio-X já existe e funciona, mas espalhado em três lugares:

| Parte | Onde está hoje | Estado |
|---|---|---|
| Formulário publicado, APIs e banco | `AgenciaIA/empresas/tavir/projetos/custom/raio-x-de-prospeccao/04-execucao/raiox-web/` (Vercel `raiox.tavir.com.br` + Supabase com 6 Edge Functions e 5 migrations) | Em produção; só uso interno liberado. |
| Operação (abrir caso, autorizar análise, revisar, entregar) | `AgenciaIA/tools/office.py` (funções `_raiox_*`) + bot do Telegram | Funciona, mas é o escritório antigo em Python. |
| Análise (Dora, Íris, analista web) e PDFs | Prompt em `office.py`, skills em `AgenciaIA/.claude/skills`, `analise-instagram/`, `analise-web/`, `tools/publicar.py` | Gerou 2 diagnósticos reais; 1 entregue. |
| Método do escritório novo (evidência, prioridade, devolutiva) | `tavirescritorio/backend/app/modules/raiox/` (Python defasado) | Regras boas, nunca ligadas ao Electron. |
| Tela do escritório novo | Página `d11b3692-…` do pacote de referência | Maquete com dados fixos. |
| Peça perdida | Edge Function `office-raiox-sync` | Publicada no Supabase, **código-fonte não está no git**. |

O que **não** existe em lugar nenhum: taxonomia de gaps, playbooks de implantação, execução com
prova, medição antes/depois. É isso que transforma diagnóstico em receita com credibilidade.

## 2. Para onde vamos

Uma casa só: `tavirescritorio`. O Electron é o operador do Raio-X. Em 2026-11-10 o Carlos tirou o
Telegram do plano: um aplicativo mobile substitui essa integração, e o corte do bot não será feito.
O Supabase e a Vercel continuam sendo a porta pública, sem piloto agora.

```
Cliente ──► raiox.tavir.com.br (raiox/web) ──► Supabase (casos, formulários, consentimentos, entregas)
                                                     ▲            │
                                    continue-case,   │            │ office-raiox-sync (leitura)
                                    review-case,     │            ▼
                                    delivery-case ── Escritório Electron (src/main/raiox/*)
                                                     │  caso local: evidência → prioridade (gap) → devolutiva
                                                     │  motores: análise (Dora/Íris/web) e redação dos 2 documentos
                                                     │  publicar.py → PDF → aprovação por hash → entrega
                                                     │  execução: playbook do gap, prova por passo, d0/d30
                                                     ▼
                                     Pasta privada: %APPDATA%/<app>/raiox/casos/<RX-XXXXXXXX>/
```

### Princípios

1. **Quem decide é a checagem** (regra 8 do `CLAUDE.md`): motor sugere, Carlos aprova na tela.
2. **Dado de cliente nunca entra no git.** Tudo de caso fica na pasta privada do usuário.
3. **Uma prioridade = um gap da taxonomia = um playbook.** Só playbook `validado` vira implantação.
4. **Sem nota mágica.** Cobertura e confiança mostram a conta.
5. **Dois atos para sair:** aprovar documentos (hash) e autorizar entrega (destinatário).
6. **Copiar antes de cortar.** O AgenciaIA continua intacto até o checkpoint de corte.

## 3. Mapa origem → destino

| Origem (AgenciaIA) | Destino (tavirescritorio) | Observação |
|---|---|---|
| `…/raio-x-de-prospeccao/PROJECT.md`, `AMBIENTE.md` | `raiox/PROJECT.md`, `raiox/AMBIENTE.md` | Ganham seção "Mudança de casa". |
| `00-descoberta/`, `01-requisitos/`, `03-plano/`, `05-validacao/` | `raiox/docs/descoberta/`, `raiox/docs/requisitos/`, `raiox/docs/plano/`, `raiox/docs/validacao/` | Histórico preservado. |
| `04-execucao/prototipo-formulario/` | `raiox/docs/prototipo-formulario/` | Só referência. |
| `04-execucao/raiox-web/` (sem `.env.local`, `.vercel/`, `supabase/.temp/`, `node_modules/`) | `raiox/web/` | Vira o Root Directory da Vercel depois do corte. |
| `06-entrega/` | `raiox/modelos/` | Modelos de relatório, plano e e-mails. |
| `tools/publicar.py` + `tools/requirements-publicar.txt` | `tools/publicar.py` + `tools/requirements-publicar.txt` | Mesmo caminho relativo para não quebrar referências. |
| `tools/scrapling-lab/` (só arquivos versionados) | `tools/scrapling-lab/` | A skill `scrapling-tavir` já aponta para esse caminho. |
| `analise-instagram/` (versionados; sem `perfis/*`, sem `config/*.env`) | `analise-instagram/` | A skill `instagram-profile-audit` aponta para esse caminho. |
| `analise-web/` (versionados) | `analise-web/` | Idem `web-platform-audit`. |
| `marketing/inteligencia-nichos/` | `marketing/inteligencia-nichos/` | Citado pelo prompt de análise. |
| `descoberta/agentes/agente-descoberta.md` | `agentes/escopo/agentes/dora-descoberta.md` | Adaptado aos caminhos novos. |
| `analise-instagram/agentes/agente-analista-instagram.md` | `agentes/escopo/agentes/iris-instagram.md` | Idem. |
| `analise-web/agentes/agente-analista-web.md` | `agentes/escopo/agentes/analista-web.md` | Idem. |
| `.claude/skills/funil-vendas/` | `agentes/escopo/skills/funil-vendas/` | Única skill do prompt que falta aqui. |
| `office.py` `_raiox_*` | `src/main/raiox/raioxBridge.ts`, `raioxDelivery.ts`, `raioxAnalyse.ts` | Portado para TypeScript, mesma semântica. |
| `office.py` `_raiox_prompt_analise` | `raiox/prompts/analise.md` + `raiox/prompts/redacao.md` | Prompt vira arquivo versionado. |
| `backend/app/modules/raiox/*` (deste repo) | `src/shared/raiox.ts`, `src/main/raiox/raioxRules.ts` | Regras portadas. |
| `empresas/tavir/privado/raiox-cases/<uuid>/` (5 casos, **com dados de cliente**) | `%APPDATA%/<app>/raiox/casos/RX-XXXXXXXX/legado/` | Cópia somente com aprovação no checkpoint; fora do git. |
| Segredos de `empresas/tavir/privado/.env` (`RAIOX_*`, `RESEND_*`) | Cofre do escritório (`src/main/credentials.ts`) | Carlos digita na tela; nada em arquivo de texto. |
| `TELEGRAM_*` | — | Saem do Raio-X. |

## 4. Fluxo ponta a ponta (alvo)

1. **Abrir caso** no Escritório. Duas origens:
   - local (amigo, rua, indicação): Carlos preenche a fronteira;
   - formulário: `create-case` no Supabase gera convite; o cliente preenche em `raiox.tavir.com.br`;
     o Escritório puxa o estado por `office-raiox-sync`.
2. **Autorizar análise** (só com intake completo e consentimentos): `continue-case` devolve o
   pacote autorizado, gravado em `analise/analysis-input.json` na pasta privada.
3. **Análise assistida** (motor): Dora coordena; Íris faz Instagram; analista web faz site;
   SEO local faz Google/Maps. Saída obrigatória: `analise/sugestoes.json` (evidências e hipóteses).
4. **Revisão de evidências** (Carlos): aprova ou rejeita cada sugestão; acrescenta as suas.
5. **Prioridade** (Carlos): etapa + gap da taxonomia + por quê + confiança.
6. **Devolutiva** (Carlos): proposta de uma oferta (profundidade guiado/piloto/junto/para você)
   ou "não emitir"; plano 30/60/90 (pode puxar a versão guiada do playbook).
7. **Redação** (motor): escreve `relatorio-raio-x.md` e `plano-crescimento.md` com os modelos,
   usando só evidência aprovada, a prioridade e o playbook.
8. **Checagem automática** dos documentos (seções, termos proibidos, corte público).
9. **PDF** via `tools/publicar.py` (determinístico, igual ao de hoje).
10. **Aprovar documentos** (Carlos) — por hash. Qualquer mudança invalida.
11. **Autorizar e entregar** (Carlos) — manual (exportar PDFs) agora; via Resend depois do G-PR1.
12. **Encerrar caso.** Se houve proposta aceita: **execução** com Passo 0 (linha de base),
    passos do playbook com prova, medição d30, antes/depois.
13. **Validar playbook** (Carlos) quando a execução fechar com d0 e d30.

## 5. Decisões

### Tomadas
- Pasta única `tavirescritorio`; AgenciaIA vira somente leitura no corte.
- Electron é o operador. Telegram fora do plano (2026-11-10): o app mobile substitui; T9.2 e T9.3 não rodam.
- Tela = `src/renderer/raiox-ref/RaioX.dc.html` injetada no build (padrão Fábrica).
- 16 gaps em 4 ondas; playbooks em `raiox/playbooks/`.
- PDF continua com `tools/publicar.py` (Python + Edge/Chrome headless).
- Motor roda com workspace = pasta privada do caso, com contexto copiado para `_contexto/`.
- Identificador do caso: `RX-` + 8 primeiros hex do UUID em maiúsculas (padrão já usado: `RX-E7C28036`).

### Pendentes (Carlos)
| # | Decisão | Trava |
|---|---|---|
| P1 | Preços de partida (Estudo rápido, Diagnóstico, ofertas da Onda 1). | Venda. |
| P2 | **Não** (2026-11-10). Sem piloto agora. F8 (escrita no Supabase e e-mail) não roda. | Primeiro cliente real e entrega por e-mail. |
| P3 | Motor e modelo padrão da análise e da redação. | GOAL F6. |
| P4 | **Sim** (2026-11-10). Reconectar a Vercel ao repositório `empresatavir/tavirescritorio` (Root Directory `raiox/web`). O roteiro é do Carlos; o motor não executa. | GOAL T9.4. |
| P5 | **Não** (2026-11-10). Os cinco casos legados não serão copiados. T9.1 não roda. | GOAL F9. |

## 6. Riscos e como o plano trata

| Risco | Tratamento |
|---|---|
| Vazar dado de cliente no git | Pasta privada fora do repo; varredura de segredos e PII em todo checkpoint; teste que falha se `git status` mostrar arquivo novo fora da lista permitida após uma execução de motor. |
| Dois escritórios agindo no mesmo caso | Até o corte, o Escritório novo só **lê** o Supabase. Escrita (`continue-case`, `review-case`, `delivery-case`) só depois do CP de corte, com o `office.py` desligado para o Raio-X. |
| `office-raiox-sync` sem fonte | Baixar com `supabase functions download` no checkpoint; se não der, reescrever como função só de leitura, revisada antes de publicar. |
| Motor inventar interface ou número | Prompts com proibições explícitas; checagem automática dos documentos; aprovação humana por hash. |
| Playbook ruim queimar credibilidade | Só `validado` vira implantação; `piloto` é declarado no documento. |
| Quebrar a Fábrica | Raio-X em arquivos próprios; edições em `ipc.ts`, `preload`, `types.ts` e `clean_and_bind_ipc.js` são só acréscimos; `npm test` completo em todo checkpoint. |
| Trabalho atual não commitado na branch `feat/fabrica-ciclo-pr` | CP-0 exige que Carlos feche ou guarde esse trabalho antes de criar `feat/raiox`. |

## 7. Trilha do Carlos (fora do código)

| Momento | Tarefa |
|---|---|
| Antes do CP-0 | Commitar ou guardar o trabalho atual da Fábrica. |
| Já | P1 (preços). |
| Depois da F3 (playbooks) | Ler os 4 playbooks da Onda 1 e executar num negócio amigo (caso zero). |
| F5 | Digitar no cofre os segredos do Supabase (e Resend, se for usar). |
| F6 | Escolher motor (P3); rodar a análise da própria TAVIR como caso interno. |
| Antes do 1º cliente real | P2 com advogado. |
| F9 | P4 e P5. Telegram fora do plano: não há corte do bot. |
| 3 a 5 casos | Medir horas → ajustar preço e capacidade; marcar playbooks como `validado`. |

## 8. Critério de sucesso do projeto

- Um caso interno (TAVIR) percorre todo o fluxo da seção 4 dentro do Electron, com PDFs aprovados
  por hash e entrega manual registrada.
- Uma execução da Onda 1 fecha com d0, passos provados e d30.
- `npm run typecheck`, `npm test`, `npm run build` e `npm test` em `raiox/web` verdes.
- Nenhum dado de cliente ou segredo no git (varredura limpa).
- AgenciaIA sem nenhum fluxo ativo de Raio-X depois do corte.
