# Seed Tier 1 — memórias para gravar no Sincron Brain

> ✅ **GRAVADO E VERIFICADO em 2026-07-06** — vault fechou em **soul 1 / user_profile 1 /
> preferences 6**, nada em `_uncategorized`. NÃO foi via replay limpo: o judge (gemini-2.5-flash)
> classificou os 8 drafts como `_uncategorized` mesmo rodando sem erro (ver correção no topo do
> `LIMITES_JUDGE.md`); o conserto final foi **cirurgia determinística no índice + `.md`**
> (frontmatter `major_tags` + pasta + `UPDATE` no `_index.sqlite`). Mantido como seed canônico
> caso o vault precise ser refeito.
>
> Lote de revisão preparado em 2026-07-06.
>
> **Fluxo do replay (PACEADO — ver `LIMITES_JUDGE.md`):** o judge tem **RPM 5 / RPD 20**
> e faz **1 chamada por draft**; sem pacing, 8 drafts de uma vez estouram 5 RPM e o
> excedente cai em `_uncategorized` (fallback silencioso, sem conserto depois). Então:
> 1. `verify_judge()` (1 chamada) — confirmar que o `gemini-2.5-flash` gera.
> 2. **Lote A (4):** `remember()` de **S1** (soul), **U1** (user_profile), **P1** (git),
>    **P2** (CONTINUAR) → `sleep_now()` → `list_major_tags()` (esperar soul 1 /
>    user_profile 1 / preferences 2).
> 3. Esperar ~60 s (janela de RPM rolar).
> 4. **Lote B (4):** `remember()` de **P3** (vender-antes), **P4** (qualidade),
>    **P5** (verificar-web), **P6** (revisar-entrega) → `sleep_now()` → `list_major_tags()`
>    (fechar em **soul 1 / user_profile 1 / preferences 6**, **nada em `_uncategorized`**).
> 5. Se algo caiu em `_uncategorized`: foi 429 — o draft já era; só um novo reset resolve.
>
> Total ~9 chamadas << 20 RPD. Este arquivo é descartável depois de gravado E verificado.
>
> Fontes: `APRENDIZADOS.md`, memórias de projeto (`user_profile`, `project_state`,
> `feedback_auto_commit_push`, `checkpoint_continuidade`) e `CLAUDE.md` raiz.
> Legenda: 🔒 = preferência dura (reforçar `emotion_floor` quando o Carlos reagir ao uso).

---

## soul — identidade da empresa

**S1.** A agência é a **"Empresa Cognitiva"**: agência de IA de **atendimento via WhatsApp**,
operada como wiki multiagente com um **vault de conhecimento central** (`knowledge/`).
Meta até **31/12/2026**: 3 clientes, **≥R$4k MRR**, ≥1 renovação e 1 case; **critério de
pivô na semana 12**. Formalização **Rota B**: validar sem CNPJ e abrir **SLU** só no 1º
contrato (MEI é vedado para a atividade).
`hint_tags: [agencia, missao, meta_2026, whatsapp, formalizacao]`

---

## user_profile — quem é o Carlos

**U1.** Carlos trabalha na **TOTVS** (setor **Hotelaria**, suporte **FrontOffice** —
módulos de reservas check-in/out/ocupação e eventos). A agência de IA é **renda extra
paralela**; ele **só sai da TOTVS com MRR estabilizado e consideravelmente acima do
salário** (postura dele, saudável — proteger contra decisões de desespero). **Restrições:**
não pode competir com a TOTVS nem usar dados/relacionamentos do emprego → o nicho
**hotelaria está VETADO** enquanto for funcionário. Expertise portável (reserva/agenda/
ocupação/eventos) aponta para verticais adjacentes: **buffets/espaços de eventos
(prioridade 1)** e **clínicas com agendamento**.
`hint_tags: [carlos, totvs, carreira, restricoes, verticais]`

---

## preferences — como o Carlos quer que se trabalhe

**P1.** 🔒 **Commit + push automáticos.** Ao concluir qualquer unidade de trabalho coerente,
fazer `git add` (repo inteiro) + `git commit` com **mensagem detalhada (o quê + por quê)** +
`git push` para `origin/main`, **sem pedir confirmação**. Exceções que ainda pedem
confirmação: force-push, `reset --hard`/rebase destrutivo, reescrita de histórico publicado,
ou suspeita de segredo/credencial no diff.
`hint_tags: [git, commit, push, workflow]`

**P2.** 🔒 **Checkpoint de continuidade a cada marco.** Sobrescrever `CONTINUAR.md` (raiz)
após CADA marco concluído **e verificado** — nunca esperar o fim da sessão (pode ser
abrupto). Curto e factual: feito / verificado / falta / decisões / armadilhas.
`hint_tags: [continuidade, checkpoint, sessao]`

**P3.** 🔒 **Vender antes de construir.** Priorizar validação com donos de negócio — a
métrica que importa é **≥5 conversas/semana**, não infraestrutura. Erro clássico a evitar
(pré-mortem #1 do blueprint): 6 semanas de infra antes do 1º prospect. Quando o Carlos
propuser construir algo novo, lembrar dessa métrica.
`hint_tags: [validacao, mom_test, prioridade, anti_procrastinacao]`

**P4.** **Qualidade acima de economia.** Regra soberana: economia de tempo/tokens **nunca**
justifica queda de qualidade — na dúvida, gaste o token.
`hint_tags: [qualidade, principio]`

**P5.** **Verificar na web o que muda.** Não afirmar de memória preços de LLM/API nem
regras voláteis (WhatsApp, MEI/fiscal) — verificar na web antes. Custo de 1 busca <<< custo
de um plano baseado em dado errado.
`hint_tags: [verificacao, precos, regras_fiscais]`

**P6.** 🔒 **Revisar a própria entrega.** Carlos valoriza releitura crítica logo após
entregar ("reveja e liste as falhas") — uma revisão assim achou 6 falhas, 1 funcional séria.
Barato pedir, caro descobrir em produção.
`hint_tags: [revisao, qa, entrega]`

---

### Fora do Tier 1 (deixar para depois)
- **Tier 2** (`projects`/`workflows`/`decisions`): estado dos braços (fábrica-lp, crm-whitelabel,
  ia-livros, escritório, mídia, infoproduto), esteiras e gates — de `project_state`,
  `CONTINUAR.md`, `PENDENTES.md`, `blueprint_agencia_ia.md`.
- **Tier 3** (`references`): PONTEIROS para o vault `knowledge/` (não copiar as 132 páginas —
  camadas complementares).
- As micro-regras operacionais de eficiência do `APRENDIZADOS.md` (batch, não re-ler arquivo
  editado, endpoint estruturado > scraping) → `workflows`/`technical_context`, não Tier 1.
