# GOAL — Raio-X no Escritório TAVIR (ordem de serviço para o Cursor)

> Data: 2026-11-08 · Dono: Carlos (CEO) · Executor: Cursor (ou qualquer motor).
> Leia antes: [`PLANO_RAIOX.md`](PLANO_RAIOX.md) (o porquê e o desenho) e o `CLAUDE.md` da raiz.

---

## COMO EXECUTAR ESTE DOCUMENTO (leia primeiro, obedeça sempre)

1. F0 a F7 estão feitas. A partir de 2026-11-20 vale a ordem da seção **RETOMADA** no fim deste
   documento: CP-8 → F10 → F8 → F11 → CP-10 → F9 → CP-12. Em 2026-11-20 o Carlos mudou a P2 para
   **sim** (ir até o piloto real assistido), então F8 roda. T9.1, T9.2 e T9.3 continuam fora.
2. Dentro de cada fase, execute as tarefas **na ordem dos IDs** (ex.: T2.1, T2.2…).
3. Cada tarefa tem: **Arquivos**, **Fazer**, **Pronto quando**. Só passe para a próxima quando
   todos os itens de "Pronto quando" forem verdadeiros.
4. Ao terminar cada tarefa:
   - rode `npm run typecheck` e `npm test` (na raiz);
   - faça **um commit** na branch `feat/raiox` com a mensagem `raiox(T<id>): <resumo curto>`;
   - NÃO faça `git push`, NÃO abra PR.
5. **🛑 CHECKPOINT (CP-n):** quando encontrar um, PARE. Escreva para o Carlos o relatório pedido
   no checkpoint e espere ele responder exatamente `aprovado CP-n`. Sem essa frase, não continue.
6. Se algo do documento não bater com o código (arquivo não existe, função tem outro nome, teste
   já falhava antes): **pare e pergunte**. Não improvise, não "corrija" código fora do escopo.
7. Se uma tarefa pedir uma decisão que não está escrita aqui: **pare e pergunte**.
8. Nunca apague nada do repositório `AgenciaIA`. Nunca edite arquivos dele, exceto na tarefa
   T9.6, depois do CP-9.
9. Sempre que este documento disser "copie", é cópia byte a byte; não reformate.
10. Toda saída para o Carlos em português, curta, com: o que foi feito, o que foi verificado
    (comando + resultado), o que falta.

### Caminhos usados neste documento

- `REPO` = `C:\Users\carlo\Downloads\Projetos a Estudar\tavirescritorio` (este repositório).
- `AG` = `C:\Users\carlo\Downloads\Projetos a Estudar\AgenciaIA` (origem; somente leitura).
- `RXO` = `AG\empresas\tavir\projetos\custom\raio-x-de-prospeccao` (projeto de origem).
- `PRIV` = `join(app.getPath('userData'), 'raiox')` (pasta privada de casos, fora do git).

---

## REGRAS INVIOLÁVEIS (valem em todas as fases)

R1. NUNCA gravar dado de cliente (nome, contato, e-mail, telefone, endereço, evidência,
    relatório, intake, transcrição) dentro de `REPO`. Testes usam `fs.mkdtempSync`.
R2. NUNCA gravar segredo em arquivo versionado. Segredos só no cofre (`src/main/credentials.ts`).
    Nunca imprimir segredo em log, toast, erro ou relatório (usar `maskToken` existente).
R3. NUNCA escrever `status: validado` em playbook. Só o Carlos faz isso.
R4. NUNCA marcar evidência como aprovada, prioridade como fechada, documento como aprovado,
    entrega como feita ou passo de execução como provado a partir de resposta de motor.
    Só por clique do Carlos na tela (handler IPC chamado pela UI).
R5. NUNCA chamar Edge Function que escreve no Supabase (`create-case`, `continue-case`,
    `review-case`, `delivery-case`, `invite-case`) fora de teste com `fetch` simulado antes do
    CP-10. A primeira chamada real é o smoke do CP-10, com caso fictício.
R6. NUNCA enviar e-mail para pessoa de fora da TAVIR antes do CP-12 (G-PR1 com evidência e
    liberação escrita do Carlos). Até lá, só o e-mail interno da TAVIR no smoke.
R7. NUNCA alterar: `.claude/launch.json`, seção 7 do `CLAUDE.md`, `backend/`, `frontend/`,
    `src/shared/esteiras.ts`, lógica existente da Fábrica (só acrescentar).
R8. NUNCA salvar SVG com `<metadata>` ou `c2pa`. Ícones via `TvIcon` / SVG inline limpo.
R9. NUNCA inventar número para o cliente (nota, faturamento, conversão, posição, seguidores).
R10. Todo `.bat` novo: quebra de linha CRLF e primeira linha `chcp 65001 >nul`.
R11. Toda edição em `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts` e
     `scripts/clean_and_bind_ipc.js` é **acréscimo** de bloco novo; não reescrever o que existe.

---

## TAXONOMIA (constante — usada em várias fases; copiar literalmente)

| gapId | Rótulo | Etapa | offerId | Onda |
|---|---|---|---|---|
| `google-perfil-fraco` | Perfil Google fraco | encontrar | `presenca_local` | 1 |
| `reputacao-fraca` | Reputação fraca | encontrar | `presenca_local` | 1 |
| `instagram-sem-destino` | Instagram sem destino | encontrar | `crescimento` | 1 |
| `whatsapp-lento` | WhatsApp lento | conversar | `atendimento` | 1 |
| `sem-roteiro-venda` | Sem roteiro de venda | atender | `atendimento` | 2 |
| `orcamento-esquecido` | Orçamento esquecido | atender | `atendimento` | 2 |
| `sem-canal-pedido` | Sem canal de pedido | vender | `catalogo` | 2 |
| `sem-agendamento` | Sem agendamento | atender | `atendimento` | 2 |
| `oferta-confusa` | Oferta confusa | vender | `criacao_oferta` | 3 |
| `ticket-baixo` | Ticket médio baixo | vender | `criacao_oferta` | 3 |
| `sem-cadastro-recompra` | Sem cadastro/recompra | medir | `crescimento` | 3 |
| `nao-mede` | Não mede nada | medir | `crescimento` | 3 |
| `sem-pagina-vendas` | Sem página de vendas | vender | `pagina_vendas` | 4 |
| `invisivel-na-busca` | Invisível na busca | encontrar | `presenca_local` | 4 |
| `conteudo-irregular` | Conteúdo irregular | medir | `conteudo` | 4 |
| `marca-inconsistente` | Marca inconsistente | encontrar | `branding` | 4 |

## LINGUAGEM PARA O CLIENTE (constante)

| Classe | Frase de abertura obrigatória |
|---|---|
| observado | "Foi observado que…" |
| informado | "A empresa informou que…" |
| inferido | "Uma hipótese a validar é…" |
| indisponivel | "Não foi possível verificar…" |

Termos proibidos na parte pública dos documentos (antes de `<!-- CORTAR-PUBLICO -->`), sem
diferenciar maiúsculas: `garantido`, `garantimos`, `vai aumentar`, `com certeza`, `primeira posição`,
`primeiro lugar no google`, `R1`, `G5`, `hash`, `gate`, `sha256`, `Chrome`, `login`, `token`,
`gallery-dl`, `RapidAPI`, `Supabase`, `Telegram`.

---

# F0 — Preparação

### T0.1 Confirmar ponto de partida
**Fazer:**
1. `git status` e `git branch --show-current` em `REPO`.
2. Se houver qualquer arquivo modificado ou não rastreado (exceto `docs/planning/PLANO_RAIOX.md`
   e `docs/planning/GOAL_RAIOX.md`): **não toque**. Vá direto ao CP-0 informando a lista.
3. Rodar e guardar o resultado (contagem de passou/falhou) de: `npm run typecheck`, `npm test`,
   `npm run build`.
**Pronto quando:** você tem a lista de pendências do git e o resultado dos 3 comandos.

### 🛑 CP-0 — Base limpa
Relatar ao Carlos: branch atual, arquivos pendentes no git, resultado dos 3 comandos (com nomes
dos testes que já falham, se houver).
Pedir a ele: commitar ou guardar o trabalho pendente; confirmar a branch base (padrão: `master`).
Depois do `aprovado CP-0`: `git checkout <base> && git pull --ff-only && git checkout -b feat/raiox`.
Os testes que já falhavam ficam registrados em `docs/planning/RAIOX_BASELINE.md` e não devem ser
corrigidos por este GOAL.

### T0.2 Proteções de git
**Arquivos:** `.gitignore`.
**Fazer:** acrescentar ao final (bloco novo, com comentário `# Raio-X`):
```
# Raio-X
raiox/web/.env
raiox/web/.env.local
raiox/web/.env.*.local
raiox/web/.vercel/
raiox/web/supabase/.temp/
raiox/web/node_modules/
analise-instagram/perfis/*
!analise-instagram/perfis/.gitkeep
analise-instagram/config/*.env
analise-web/projetos/*
!analise-web/projetos/.gitkeep
tools/scrapling-lab/data/
tools/scrapling-lab/.venv/
**/raiox-cases/
```
**Pronto quando:** `git check-ignore raiox/web/.env.local` responde com a regra.

### T0.3 Script de varredura de segredos e dados
**Arquivos:** `scripts/raiox_scan.js` (novo).
**Fazer:** script Node sem dependência que recebe uma lista de pastas e falha (exit 1) se
encontrar, em qualquer arquivo de texto (< 2 MB):
- regex de segredos: `re_[A-Za-z0-9_]{20,}`, `sk-[A-Za-z0-9]{20,}`, `sbp_[A-Za-z0-9]{20,}`,
  `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.`, `\b\d{8,10}:[A-Za-z0-9_-]{30,}\b` (token Telegram),
  `(SECRET|KEY|TOKEN|PASSWORD)\s*=\s*\S{8,}` (exceto em arquivos `*.example`);
- arquivos proibidos: `.env`, `.env.local`, `*.pem`, `analysis-input.json`, `review-state.json`,
  qualquer caminho contendo `raiox-cases`, `privado`, `.vercel`, `supabase/.temp`.
Saída: lista `arquivo:linha: tipo` (sem imprimir o valor encontrado). Exit 0 se nada.
Acrescentar ao `package.json` o script `"raiox:scan": "node scripts/raiox_scan.js raiox tools analise-instagram analise-web marketing agentes/escopo/agentes"`.
**Pronto quando:** `npm run raiox:scan` roda (pode falhar por pastas ainda inexistentes — trate
pasta inexistente como vazia, exit 0).
Falso positivo (ex.: nome de constante em código): não altere a regra nem o arquivo por conta
própria; liste `arquivo:linha` e pergunte ao Carlos se entra numa lista de exceções
`scripts/raiox_scan.allow` (um `arquivo:linha` por linha).

---

# F1 — Migração dos arquivos (cópia, não move)

> Objetivo: tudo o que o Raio-X usa passa a existir em `REPO`, sem segredos e sem dado de cliente.
> Use somente arquivos **versionados** no AgenciaIA: liste com
> `git -C "<AG>" ls-files <pasta>` e copie exatamente essa lista.

### T1.1 Script de cópia
**Arquivos:** `scripts/raiox_migrar.js` (novo).
**Fazer:** script Node que:
1. Recebe o caminho de `AG` por argumento (`--origem`).
2. Para cada linha da tabela abaixo, roda `git -C <AG> ls-files <origem>` e copia cada arquivo
   para o destino mantendo a estrutura relativa.
3. **Nunca** copia: `.env`, `.env.local`, `.vercel/**`, `supabase/.temp/**`, `node_modules/**`,
   `__pycache__/**`, `*.pyc`, `perfis/**` (exceto `.gitkeep`), `config/*.env`.
4. Não sobrescreve arquivo que já exista no destino: lista como conflito e pula.
5. Ao final imprime: copiados, pulados por regra, conflitos.

| Origem (relativa a `AG`) | Destino (relativo a `REPO`) |
|---|---|
| `empresas/tavir/projetos/custom/raio-x-de-prospeccao/PROJECT.md` | `raiox/PROJECT.md` |
| `…/raio-x-de-prospeccao/AMBIENTE.md` | `raiox/AMBIENTE.md` |
| `…/raio-x-de-prospeccao/00-descoberta/` | `raiox/docs/descoberta/` |
| `…/raio-x-de-prospeccao/01-requisitos/` | `raiox/docs/requisitos/` |
| `…/raio-x-de-prospeccao/02-prova-visual/` | `raiox/docs/prova-visual/` |
| `…/raio-x-de-prospeccao/03-plano/` | `raiox/docs/plano/` |
| `…/raio-x-de-prospeccao/04-execucao/prototipo-formulario/` | `raiox/docs/prototipo-formulario/` |
| `…/raio-x-de-prospeccao/04-execucao/raiox-web/` | `raiox/web/` |
| `…/raio-x-de-prospeccao/05-validacao/` | `raiox/docs/validacao/` |
| `…/raio-x-de-prospeccao/06-entrega/` | `raiox/modelos/` |
| `tools/publicar.py` | `tools/publicar.py` |
| `tools/requirements-publicar.txt` | `tools/requirements-publicar.txt` |
| `tools/scrapling-lab/` | `tools/scrapling-lab/` |
| `analise-instagram/` | `analise-instagram/` |
| `analise-web/` | `analise-web/` |
| `marketing/inteligencia-nichos/` | `marketing/inteligencia-nichos/` |
| `descoberta/agentes/agente-descoberta.md` | `agentes/escopo/agentes/dora-descoberta.md` |
| `analise-instagram/agentes/agente-analista-instagram.md` | `agentes/escopo/agentes/iris-instagram.md` |
| `analise-web/agentes/agente-analista-web.md` | `agentes/escopo/agentes/analista-web.md` |
| `.claude/skills/funil-vendas/` | `agentes/escopo/skills/funil-vendas/` |

**Pronto quando:** o script existe e tem modo `--simular` (só lista, não copia).

### T1.2 Simular e conferir
**Fazer:** rodar `node scripts/raiox_migrar.js --origem "<AG>" --simular`. Guardar a saída.
**Pronto quando:** a simulação lista 116 cópias (contagem conferida em 2026-11-08: projeto 66,
`publicar.py` 1, `requirements-publicar.txt` 1, `scrapling-lab` 15, `analise-instagram` 18,
`analise-web` 5, `inteligencia-nichos` 6, 3 agentes, `funil-vendas` 1), menos as puladas por
regra, e 0 arquivos proibidos. Diferença maior que 5 nessa conta: pare e relate.

### 🛑 CP-1 — Lista de cópia
Relatar ao Carlos: total por linha da tabela, lista de pulados por regra, conflitos.
Só depois do `aprovado CP-1` rodar sem `--simular`.

### T1.3 Executar a cópia
**Fazer:** `node scripts/raiox_migrar.js --origem "<AG>"`; depois `npm run raiox:scan`.
**Pronto quando:** cópia feita; `raiox:scan` com exit 0. Se o scan acusar algo: apagar o arquivo
copiado, registrar e parar (não "limpar" o conteúdo).

### T1.4 Ajustar caminhos nos arquivos copiados
**Fazer:**
1. Buscar em `raiox/`, `agentes/escopo/agentes/{dora-descoberta,iris-instagram,analista-web}.md`
   e `analise-*/` as strings:
   - `empresas/tavir/projetos/custom/raio-x-de-prospeccao/04-execucao/raiox-web` → `raiox/web`
   - `empresas/tavir/projetos/custom/raio-x-de-prospeccao/06-entrega` → `raiox/modelos`
   - `empresas/tavir/projetos/custom/raio-x-de-prospeccao/0` + `3-plano` → `raiox/docs/plano`
     (idem para `00-descoberta`→`docs/descoberta`, `01-requisitos`→`docs/requisitos`,
     `05-validacao`→`docs/validacao`)
   - `empresas/tavir/projetos/custom/raio-x-de-prospeccao` → `raiox`
   - `empresas/tavir/privado/raiox-cases` → `pasta privada do Escritório (PRIV/casos)`
2. **Não** alterar: `CHANGELOG.md`, arquivos `_LOG.md`, e o corpo histórico de `raiox/PROJECT.md`.
3. No topo de `raiox/PROJECT.md`, logo abaixo do título, inserir a seção:
   ```
   ## Mudança de casa (2026-11)
   Este projeto foi trazido do AgenciaIA para o Escritório TAVIR (tavirescritorio).
   Caminhos antigos citados no histórico abaixo valem para o AgenciaIA. Mapa novo em
   `docs/planning/PLANO_RAIOX.md`. Operação passa a ser feita no Escritório (Electron);
   o bot do Telegram e o tools/office.py deixam de operar o Raio-X após o corte (GOAL F9).
   ```
4. Nos três agentes copiados: trocar caminhos de skill `.claude/skills/<x>` por
   `agentes/escopo/skills/<x>` e remover qualquer instrução de Telegram, substituindo por
   "o Carlos decide na tela do Raio-X no Escritório".
**Pronto quando:** `git grep -n "raio-x-de-prospeccao" -- raiox agentes analise-instagram analise-web`
só mostra ocorrências em `CHANGELOG.md`, `_LOG.md` e no histórico de `raiox/PROJECT.md`.

### T1.5 Testes do que foi copiado
**Fazer:**
1. `cd raiox/web && npm test` (usa `node --test`, sem instalar nada). Deve passar igual à origem.
   Se `test/ignore-build.test.mjs` depender do caminho antigo, **não editar o teste**: registrar e
   perguntar no CP-2.
2. `python -m pytest analise-instagram/rapidapi -q` (se pytest existir; senão registrar).
3. `python -I tools/publicar.py --help` deve imprimir a ajuda.
**Pronto quando:** resultados registrados.

### T1.6 Mapa e regra no CLAUDE.md
**Arquivos:** `docs/modules/raiox.md` (novo), `CLAUDE.md`.
**Fazer:**
1. `docs/modules/raiox.md`: tabela "arquivo → papel" de tudo que foi copiado e de tudo que as
   próximas fases criarão (copiar a tabela da seção 3 do PLANO, com os destinos).
2. Em `CLAUDE.md`, acrescentar **depois** da seção 8 uma seção nova:
   ```
   ### 9. Raio-X: dado de cliente fora do git, decisão na tela
   - Mapa em `docs/modules/raiox.md`. Casos ficam em `%APPDATA%/<app>/raiox/casos/`, nunca no repositório.
   - Prioridade sempre aponta um gap da taxonomia (`src/shared/raiox.ts`). Implantação só com playbook `validado` (`raiox/playbooks/`); status `validado` só o Carlos escreve.
   - Motor sugere evidência e redige documento; aprovação é do Carlos, por hash.
   - Antes de commitar algo do Raio-X: `npm run raiox:scan`.
   ```
**Pronto quando:** arquivos gravados; `npm run raiox:scan` exit 0.

### 🛑 CP-2 — Migração conferida
Relatar: árvore de `raiox/` (2 níveis), resultado de T1.3, T1.4 (grep), T1.5, T1.6.
Pedir ao Carlos: abrir `raiox/PROJECT.md` e `raiox/web/USO.md` e confirmar.

---

# F2 — Domínio, regras e armazenamento

### T2.1 `src/shared/raiox.ts` — constantes e tipos
**Fazer:** criar o arquivo exportando exatamente:

```ts
export const RAIOX_STAGES = ['encontrar', 'conversar', 'atender', 'vender', 'medir'] as const;
export type RaioxStage = typeof RAIOX_STAGES[number];
export const RAIOX_STAGE_LABEL: Record<RaioxStage, string> = { encontrar: 'Encontrar', conversar: 'Conversar', atender: 'Atender', vender: 'Vender', medir: 'Medir' };

export const RAIOX_CLASSES = ['observado', 'informado', 'inferido', 'indisponivel'] as const;
export type RaioxClass = typeof RAIOX_CLASSES[number];
export const RAIOX_CLASS_LABEL: Record<RaioxClass, string> = { observado: 'Observado', informado: 'Informado', inferido: 'Inferido', indisponivel: 'Indisponível' };

export const RAIOX_ORIGINS = ['amigo', 'rua', 'formulario', 'indicacao'] as const;
export type RaioxOrigin = typeof RAIOX_ORIGINS[number];

export const RAIOX_MODES = ['estudo_rapido', 'diagnostico', 'completo'] as const;
export type RaioxMode = typeof RAIOX_MODES[number];

export const RAIOX_STATUS = ['fronteira', 'coleta', 'jornada', 'prioridade', 'devolutiva', 'fechado'] as const;
export type RaioxStatus = typeof RAIOX_STATUS[number];
export const RAIOX_STATUS_LABEL: Record<RaioxStatus, string> = { fronteira: 'Fronteira', coleta: 'Coleta', jornada: 'Jornada', prioridade: 'Prioridade', devolutiva: 'Devolutiva', fechado: 'Fechado' };

export const RAIOX_CONFIDENCE = ['alta', 'media', 'baixa'] as const;
export type RaioxConfidence = typeof RAIOX_CONFIDENCE[number];

export const RAIOX_DEPTHS = ['guiado', 'piloto', 'junto', 'para_voce'] as const;
export type RaioxDepth = typeof RAIOX_DEPTHS[number];
export const RAIOX_DEPTH_LABEL: Record<RaioxDepth, string> = { guiado: 'Guiado (o dono faz)', piloto: 'Piloto declarado', junto: 'Fazemos junto', para_voce: 'Fazemos para você' };

export const RAIOX_FRONTS = [
  { id: 'site', label: 'Site próprio', physicalOnly: false },
  { id: 'instagram', label: 'Instagram', physicalOnly: false },
  { id: 'google', label: 'Google', physicalOnly: false },
  { id: 'maps', label: 'Google Maps', physicalOnly: true },
  { id: 'opinioes', label: 'Opinião de cliente', physicalOnly: false },
  { id: 'concorrentes', label: 'Concorrentes e diferenciais', physicalOnly: false },
] as const;

/** Estados do caso no Supabase publicado (enum public.raiox_case_status). */
export const RAIOX_REMOTE_STATUS = ['draft', 'form_1_sent', 'form_1_received', 'form_2_sent', 'form_2_received', 'awaiting_approval', 'analysing', 'review', 'ready', 'sent', 'closed'] as const;
export type RaioxRemoteStatus = typeof RAIOX_REMOTE_STATUS[number];
export const RAIOX_REMOTE_LABEL: Record<RaioxRemoteStatus, string> = {
  draft: 'Rascunho', form_1_sent: 'Convite enviado', form_1_received: 'Formulário 1 recebido',
  form_2_sent: 'Formulário 2 enviado', form_2_received: 'Formulário recebido',
  awaiting_approval: 'Aguardando autorizar análise', analysing: 'Em análise', review: 'Documentos em revisão',
  ready: 'Pronto para entregar', sent: 'Entregue', closed: 'Encerrado',
};

export interface RaioxGap { id: string; label: string; stage: RaioxStage; offerId: string; wave: 1 | 2 | 3 | 4; }
export const RAIOX_GAPS: RaioxGap[] = [ /* as 16 linhas da TAXONOMIA, mesma ordem */ ];
```

Catálogo: portar `CATALOG`, `PLANOS`, `INFRA`, `CICLO` de
`backend/app/modules/raiox/catalog.py` para `RAIOX_CATALOG`, `RAIOX_INFRA`, `RAIOX_CICLO`.
Cada item de `RAIOX_CATALOG` = campos do Python em camelCase + `plano` (o item de `PLANOS`).
Textos idênticos. `export const RAIOX_SELL_OFFERS = RAIOX_CATALOG.filter(i => i.kind === 'entrega').map(i => i.id);`

Tipos do caso:
```ts
export interface RaioxArtifact { file: string; sha256: string; url?: string; collectedAt: string; }
export interface RaioxEvidence {
  id: string; stage: RaioxStage; source: string; claim: string; classification: RaioxClass;
  front?: string; note?: string; gapIds: string[]; artifact?: RaioxArtifact;
  author: 'carlos' | 'dora'; review: 'pendente' | 'aprovada' | 'rejeitada'; createdAt: string;
}
export interface RaioxHypothesis { id: string; gapId: string; text: string; evidenceIds: string[]; createdAt: string; }
export interface RaioxPriority { stage: RaioxStage; gapId: string; bottleneck: string; rationale: string; confidence: RaioxConfidence; discarded?: string; decidedAt: string; }
export interface RaioxDocument { kind: 'relatorio' | 'plano'; version: number; md: string; pdf?: string; sha256: string; lint: string[]; createdAt: string; }
export interface RaioxDebrief {
  decision: 'proposta_emitida' | 'nao_emitir'; reason: string;
  offerId?: string; depth?: RaioxDepth; plan30?: string; plan60?: string; plan90?: string;
  documents?: RaioxDocument[];                       // sempre 2 quando existir (relatorio, plano)
  approval?: { hashes: string[]; at: string };      // aprovação dos documentos (ato 1)
  delivery?: { channel: 'manual' | 'resend'; to: string; at: string; note?: string }; // ato 2
}
export interface RaioxMetric { key: string; label: string; value: number; unit: string; at: string; moment: 'd0' | 'd30'; source: string; }
export interface RaioxStepCheck { step: number; doneAt: string; proof: { kind: 'arquivo' | 'link' | 'nota'; value: string; sha256?: string }; }
export interface RaioxExecution { gapId: string; playbookVersion: string; startedAt: string; steps: RaioxStepCheck[]; metrics: RaioxMetric[]; fabricaProjectId?: string; closedAt?: string; }
export interface RaioxRemote { supabaseId: string; status: RaioxRemoteStatus; syncedAt: string; formUrl?: string; }
export interface RaioxCase {
  id: string; uuid: string; legacy: boolean;
  company: string; contact?: string; objective: string; decisionNeeded: string; frontier?: string;
  mode: RaioxMode; deepScan: boolean; physicalStore: boolean; origin: RaioxOrigin;
  segment?: string; publicLink?: string;
  status: RaioxStatus; evidence: RaioxEvidence[]; hypotheses: RaioxHypothesis[];
  priority?: RaioxPriority; debrief?: RaioxDebrief; execution?: RaioxExecution; remote?: RaioxRemote;
  consent?: { kind: 'termo_assinado' | 'verbal_registrado' | 'interno' | 'formulario'; at: string; note: string };
  createdAt: string; updatedAt: string; closedAt?: string;
}
```
**Pronto quando:** `npm run typecheck` verde.

### T2.2 `src/main/raiox/raioxRules.ts` — regras puras
**Fazer:** funções puras (sem IO). Cada uma recebe o caso e devolve **novo** caso (não mutar;
usar `structuredClone`) ou lança `new RaioxError(message)` (`export class RaioxError extends Error {}`).
Toda função que muda o caso termina chamando `sync(c)` e atualizando `updatedAt = now`.
Caso `legacy === true`: toda função de escrita lança "Caso legado é somente leitura."

| Função | Validações em ordem → mensagem exata |
|---|---|
| `createCase(input, now: string, uuid: string)` | empresa vazia → "Informe a empresa." · objetivo vazio → "Informe o objetivo comercial." · decisão vazia → "Informe a decisão que o diagnóstico precisa permitir." · modo fora de `RAIOX_MODES` → "Escolha estudo rápido, diagnóstico ou leitura completa." · origem fora de `RAIOX_ORIGINS` → "Origem inválida. Use amigo, rua, formulário ou indicação." · `deepScan && mode !== 'completo'` → "Deep scan só existe dentro da leitura completa." Resultado: `id = caseIdFromUuid(uuid)`, `status: 'fronteira'`, listas vazias, `legacy: false`. Textos com `trim()`; opcional vazio vira `undefined`. |
| `caseIdFromUuid(uuid)` | `'RX-' + uuid.replace(/-/g,'').slice(0,8).toUpperCase()`; uuid inválido → "Identificador inválido." |
| `updateFrontier(c, patch, now)` | `fechado` → "Caso fechado não muda." · depois as mesmas validações de `createCase` para os campos presentes no patch. |
| `addEvidence(c, input, now, id)` | etapa fora de `RAIOX_STAGES` → "Etapa da jornada inválida." · classe inválida → "Classificação inválida. Use observado, informado, inferido ou indisponível." · fonte vazia → "Informe a fonte da evidência." · afirmação vazia → "Informe o que a evidência mostra." · `deepScan` e sem `front` → "No deep scan, marque a frente desta evidência." · `front` fora de `RAIOX_FRONTS` → "Frente de varredura inválida." · algum `gapIds` fora de `RAIOX_GAPS` → "Gap fora da taxonomia." Autor `carlos` → `review: 'aprovada'`; autor `dora` → `review: 'pendente'`. |
| `reviewEvidence(c, evId, decision, now)` | id inexistente → "Evidência não encontrada neste diagnóstico." · decisão fora de `aprovada`/`rejeitada` → "Decisão de revisão inválida." |
| `removeEvidence(c, evId, now)` | id inexistente → "Evidência não encontrada neste diagnóstico." |
| `addHypotheses(c, list, now)` | gap fora da taxonomia → "Gap fora da taxonomia." · evidenceId inexistente → "Hipótese cita evidência inexistente." |
| `setPriority(c, input, now)` | etapa inválida → "Escolha a etapa do gargalo." · gap inexistente → "Escolha um gap da lista." · etapa do gap ≠ etapa → "O gap escolhido pertence a outra etapa da jornada." · gargalo vazio → "Descreva o gargalo prioritário." · motivo vazio → "Registre por que esta prioridade vem primeiro." · confiança inválida → "Informe o nível de confiança: alta, média ou baixa." · sem evidência utilizável na etapa → "A prioridade precisa de uma evidência utilizável na etapa escolhida. Fonte indisponível não sustenta o gargalo." Ao gravar: `debrief = undefined`. |
| `setDebrief(c, input, playbookStatus: 'rascunho'\|'validado', now)` | decisão inválida → "A devolutiva é proposta emitida ou não emitir." · motivo vazio → "Registre o motivo da devolutiva." · sem prioridade → "Feche a prioridade antes da devolutiva." **Se `proposta_emitida`:** oferta fora de `RAIOX_SELL_OFFERS` → "Escolha uma oferta seguinte. O Raio-X não vende tudo de uma vez." · oferta ≠ `offerId` do gap da prioridade → "A oferta precisa resolver o gap da prioridade." · `plan30` vazio → "Registre o próximo passo dos próximos 30 dias." · profundidade fora de `RAIOX_DEPTHS` → "Escolha guiado, piloto, junto ou para você." · `junto`/`para_voce` com `rascunho` → "Este gap ainda não tem playbook validado. Ofereça guiado ou piloto declarado." · deep scan com frente faltando → "O deep scan ainda não cobriu: {labels, separados por vírgula}." **Se `nao_emitir`:** apagar `offerId, depth, plan30, plan60, plan90`. **Sempre:** apagar `documents`, `approval`, `delivery`. |
| `attachDocuments(c, docs: RaioxDocument[], now)` | sem devolutiva → "Registre a devolutiva antes de gerar os documentos." · `docs.length !== 2` ou tipos diferentes de `relatorio` e `plano` → "São dois documentos: relatório e plano." Apaga `approval` e `delivery`. |
| `approveDocuments(c, hashes: string[], now)` | sem documentos → "Gere os documentos antes de aprovar." · algum documento com `lint.length > 0` → "Corrija os problemas apontados na checagem antes de aprovar." · `hashes` ≠ hashes atuais (mesma ordem relatorio, plano) → "Os documentos mudaram depois de gerados. Gere de novo e confira." |
| `recordDelivery(c, input, now)` | sem `approval` → "Aprove os documentos antes de entregar." · `to` vazio → "Informe para quem foi entregue." · canal fora de `manual`/`resend` → "Canal de entrega inválido." |
| `closeCase(c, now)` | sem devolutiva → "Encerre só depois da devolutiva." · `proposta_emitida` sem `delivery` → "Registre a entrega antes de encerrar." · `nao_emitir` sem `approval` → "Aprove os documentos antes de encerrar." Resultado: `status: 'fechado'`, `closedAt`. |
| `startExecution(c, playbook, now)` | não fechado ou `nao_emitir` → "Execução só abre depois da proposta aceita." · já existe → "A execução deste caso já começou." |
| `recordMetric(c, m)` | sem execução → "Abra a execução primeiro." · `d30` sem `d0` da mesma `key` → "Registre a linha de base (d0) antes da medição de 30 dias." · valor não numérico → "A medição precisa de um número." |
| `checkStep(c, step, proof, playbook, now)` | sem execução → "Abra a execução primeiro." · nenhuma métrica `d0` → "Passo 0: registre a linha de base antes de executar." · passo inexistente no playbook → "Passo inexistente neste playbook." · passo N>1 com N-1 não provado → "Prove o passo anterior primeiro." · prova vazia → "Anexe a prova do passo." · passo já provado → "Este passo já foi provado." |
| `closeExecution(c, playbook, now)` | passos faltando → "Ainda há passos sem prova." · alguma métrica d0 sem d30 → "Registre a medição de 30 dias de todas as métricas." |

Auxiliares:
- `usable(ev) = ev.review === 'aprovada' && ev.classification !== 'indisponivel'`.
- `sync(c)`: (1) se há prioridade e nenhuma evidência utilizável na etapa dela → apagar
  `priority` e `debrief`; (2) se `fechado` → manter; (3) senão: `debrief` → `devolutiva`;
  `priority` → `prioridade`; ≥2 etapas com utilizável → `jornada`; alguma evidência → `coleta`;
  nada → `fronteira`.
- `raioxView(c, opts: { methodTitle?: (path: string) => string })` devolve:
  `coverage: {stage,label,total,usable}[]` (5 etapas) · `confidence: {observed, usable, ratio}`
  (ratio inteiro 0–100; 0 se usable 0; observed = aprovadas observadas) ·
  `classes: {cls,label,n}[]` (só aprovadas) · `pending: number` (evidências pendentes) ·
  `scan: {id,label,covered}[]` (só se deepScan; `maps` só se physicalStore; coberta = existe
  utilizável com aquele front) · `methodPages: {path,title}[]` (portar `method_pages`) ·
  `next: string` (fronteira "Registrar evidência" · coleta "Cobrir mais uma etapa" · jornada
  "Escolher a prioridade" · prioridade "Escrever a devolutiva" · devolutiva "Gerar, aprovar e entregar
  os documentos" · fechado "Ver execução" ou "Caso encerrado").
**Pronto quando:** typecheck verde.

### T2.3 `src/main/raiox/raioxStore.ts` — armazenamento privado
**Fazer:**
```ts
export function raioxRoot(base?: string): string   // base ?? join(app.getPath('userData'), 'raiox'); cria se não existir
export function caseDir(root: string, id: string): string
export function listCases(root: string): RaioxCase[]           // ignora pastas inválidas; ordena updatedAt desc
export function readCase(root: string, id: string): RaioxCase  // ausente → RaioxError("Diagnóstico não encontrado.")
export function writeCase(root: string, c: RaioxCase): void     // grava caso.json.tmp e renomeia
export function storeFile(root: string, id: string, sub: 'evidencias' | 'execucao', src: string): RaioxArtifact
export function sha256File(path: string): string
```
- `id` válido: `/^RX-[0-9A-F]{8}$/`; caminho resolvido tem de começar com `<root>/casos/`
  → senão `RaioxError("Caso fora da pasta privada.")`.
- Layout:
```
<root>/casos/<id>/caso.json
<root>/casos/<id>/evidencias/
<root>/casos/<id>/analise/            analysis-input.json, sugestoes.json, instagram/, web/
<root>/casos/<id>/_contexto/          cópia de leitura para o motor (F6)
<root>/casos/<id>/documentos/v<N>/    relatorio-raio-x.md, plano-crescimento.md, *.pdf
<root>/casos/<id>/execucao/
<root>/casos/<id>/legado/             só casos importados (F9)
```
- `storeFile`: arquivo > 25 MB → "Arquivo acima de 25 MB."; nome final `<timestamp>-<nome-sanitizado>`.
- `raioxRoot()` sem argumento usa `process.env.TAVIR_RAIOX_ROOT` **somente** se o app foi aberto
  com `--dev` ou `NODE_ENV === 'test'`; caso contrário ignora a variável.
**Pronto quando:** typecheck verde.

### T2.4 IPC, preload e tipos
**Arquivos:** `src/main/raiox/raioxIpc.ts` (novo), `src/main/ipc.ts` (1 linha chamando
`registerRaioxIpc(handle)`), `src/preload/index.ts`, `src/shared/types.ts`.
**Fazer:** todos os canais devolvem `{ ok: true, ... }` ou `{ ok: false, error: string }`.
`RaioxError` → mensagem dele; outro erro → "Não foi possível concluir. Nada foi gravado." (e log
técnico em `console.error` sem dados do caso).

| Canal | Entrada | Saída |
|---|---|---|
| `raiox:catalog` | — | `{ catalog, gaps, fronts, infra, ciclo }` |
| `raiox:list` | — | `{ cases: RaioxCaseView[] }` |
| `raiox:get` | `id` | `{ case }` |
| `raiox:create` | input | `{ case }` (uuid via `crypto.randomUUID()`, regera se colidir) |
| `raiox:updateFrontier` | `id, patch` | `{ case }` |
| `raiox:addEvidence` | `id, input` | `{ case }` (autor sempre `carlos` neste canal) |
| `raiox:pickFile` | `id, sub` | `{ artifact }` (abre `dialog.showOpenDialog`) |
| `raiox:reviewEvidence` | `id, evId, decision` | `{ case }` |
| `raiox:removeEvidence` | `id, evId` | `{ case }` |
| `raiox:setPriority` | `id, input` | `{ case }` |
| `raiox:setDebrief` | `id, input` | `{ case }` (status do playbook lido por `loadPlaybooks`, F3; até lá `'rascunho'`) |
| `raiox:openFolder` | `id` | `{}` (`shell.openPath`) |

`RaioxCaseView = RaioxCase & ReturnType<typeof raioxView>`.
**Pronto quando:** typecheck verde; `npm run build:main` verde.

### T2.5 Testes — `tests/unit/raiox.spec.ts`
**Fazer:** estilo de `tests/unit/qa.spec.ts`. Casos obrigatórios:
1. Portar os 7 testes de `backend/tests/unit/test_raiox.py` (mesma intenção).
2. Uma asserção por mensagem de erro da tabela T2.2 (pode agrupar por função em `it.each`).
3. `caseIdFromUuid('e7c28036-77da-43da-bfd4-5c51eb908253') === 'RX-E7C28036'`.
4. Evidência `dora` pendente não sustenta prioridade; aprovada sustenta.
5. Remover a única evidência utilizável da etapa apaga prioridade e devolutiva.
6. `junto` com `rascunho` recusado; `guiado` e `piloto` aceitos.
7. `sync` percorre fronteira → coleta → jornada → prioridade → devolutiva.
8. `approveDocuments` com hash antigo recusa; `setDebrief` apaga documentos e aprovação.
9. Caso legado recusa escrita.
10. Store: grava/relê em pasta temporária; `../x` e `RX-zzzz` recusados; não sobra `.tmp`.
11. `RAIOX_GAPS`: 16 itens, ids únicos, todo `offerId` em `RAIOX_SELL_OFFERS`, etapa válida.
12. `RAIOX_CATALOG`: 17 itens, 13 com `kind === 'entrega'`, ordenado por `cashRank`.
**Pronto quando:** `npm test` verde (exceto falhas já registradas no baseline).

### 🛑 CP-3 — Regras prontas
Relatar: arquivos criados, número de testes novos, resultado de typecheck/test/build:main.

---

# F3 — Biblioteca de playbooks

### T3.1 Formato e leitor
**Arquivos:** `src/main/raiox/playbooks.ts` (novo), `raiox/playbooks/_MODELO.md` (novo).
**Fazer:** o `_MODELO.md` é exatamente:

```markdown
---
id: <gapId>
titulo: <Rótulo>
etapa: <etapa>
oferta: <offerId>
onda: <1-4>
status: rascunho
versao: 0.1
validado_em:
casos_validacao: []
tempo_total_h: <número>
---

# <Rótulo>

## Sinal no diagnóstico
- <evidência que indica o gap>

## Pré-requisitos do cliente
- <acesso, pessoa ou material>

## Passo 0 — Linha de base
- Métrica: <chave_snake> | Unidade: <unidade> | Como coletar: <instrução>

## Passo a passo

### Passo 1 — <título curto>
- Tempo: <ex.: 30 min>
- Ferramenta: <ferramenta>
- Como: <instrução imperativa, 1 a 4 linhas>
- Prova: <o que comprova o passo>

## Critério de pronto
- <item conferível>

## Medição de 30 dias
- Repetir as métricas do Passo 0 em d30, 30 dias corridos após o último passo.

## Versão guiada (o dono faz sozinho)
1. <passo em linguagem do dono>

## Fica de fora
- <o que não está incluído>

## Riscos
- <risco e como evitar>

## Fontes
- <URL da documentação oficial>
```

`playbooks.ts`:
```ts
export interface PlaybookStep { n: number; title: string; time: string; tool: string; how: string; proof: string; }
export interface PlaybookMetric { key: string; unit: string; how: string; }
export interface Playbook { id: string; title: string; stage: RaioxStage; offerId: string; wave: number;
  status: 'rascunho' | 'validado'; version: string; validatedAt?: string; validationCases: string[]; hours: number;
  signals: string[]; prereqs: string[]; baseline: PlaybookMetric[]; steps: PlaybookStep[]; done: string[];
  guided: string[]; excluded: string[]; risks: string[]; sources: string[]; file: string; }
export function parsePlaybook(text: string, file: string): Playbook
export function loadPlaybooks(dir?: string): Playbook[]   // default join(process.cwd(), 'raiox', 'playbooks'); ignora _MODELO.md
export function lintPlaybook(p: Playbook): string[]
```
Parser sem dependência: frontmatter entre `---` com `chave: valor`; listas `[a, b]`; seções por
`## `; passos por `/^### Passo (\d+) — (.+)$/`; bullets `- Tempo:`, `- Ferramenta:`, `- Como:`,
`- Prova:`; métricas por `/^- Métrica: (\S+) \| Unidade: (.+?) \| Como coletar: (.+)$/`.

`lintPlaybook` devolve um texto por problema:
"id diferente do nome do arquivo" · "gap fora da taxonomia" · "etapa diferente da taxonomia" ·
"oferta diferente da taxonomia" · "onda diferente da taxonomia" · "menos de 5 passos" ·
"passo N sem Tempo" · "passo N sem Prova" · "passo N sem Como" · "sem métrica de linha de base" ·
"seção ausente: <nome>" · "validado sem data" · "validado sem caso de validação" ·
"sem fonte oficial" · "versão guiada vazia".
IPC: `raiox:playbooks` → `{ playbooks: {id,title,stage,wave,status,version,problems}[] }`;
`raiox:playbook(id)` → `{ playbook }`. Em `raiox:setDebrief`, passar o status real do playbook do gap.
**Pronto quando:** typecheck verde.

### T3.2 Escrever os 16 playbooks
**Arquivos:** `raiox/playbooks/<gapId>.md` (16).
**Fazer:** na ordem das ondas. Regras de conteúdo:
- Todos `status: rascunho`, `versao: 0.1`.
- Mínimo 5 passos; o primeiro passo real nunca antecede o Passo 0.
- Cada passo com fonte oficial listada em Fontes (Ajuda do Perfil da Empresa no Google, Central de
  Ajuda do WhatsApp Business, Central de Ajuda do Instagram, documentação da ferramenta usada).
- Sem fonte para um passo: `- Como: A CONFIRMAR NA PRIMEIRA EXECUÇÃO`. Nunca inventar menu ou botão.
- Linguagem: imperativa, curta, sem promessa de resultado (R9).
- `nao-mede` define as métricas-base reaproveitadas pelos demais.
- Usar o vault como apoio: páginas citadas em `RAIOX_CATALOG[offerId].vault`.
**Pronto quando:** `lintPlaybook` vazio para os 16.

### T3.3 Testes — `tests/unit/raioxPlaybooks.spec.ts`
1. Exatamente 16 playbooks, um por gap.
2. `lintPlaybook` vazio em todos.
3. Nenhum com `status: validado` (comentário no teste: "Carlos remove esta asserção ao validar o primeiro").
4. Parser em pasta temporária com um playbook de exemplo produz passos e métricas esperados.

### 🛑 CP-4 — Onda 1 para leitura
Relatar: lista dos 16 com número de passos e horas. Pedir ao Carlos para ler os 4 da Onda 1.
Ajustes pedidos por ele entram antes de seguir.

---

# F4 — Tela ligada

### T4.1 Extrair a página de referência
**Arquivos:** `scripts/extract_bundle_page.js` (novo), `src/renderer/raiox-ref/RaioX.dc.html` (novo).
**Fazer:** script Node que lê `C:/Users/carlo/Downloads/Referencias/novo/TAVIR-Escritorio-redesenho.html`
(fallback `src/renderer/reference_app.html`), faz `JSON.parse` do bloco
`<script type="__bundler/manifest">`, pega a entrada pedida (`--uuid`), faz
`gunzip(base64)` se `compressed`, grava em `--out`. Gerar a página
`d11b3692-f681-4d6a-9af2-a0e63665359e` em `src/renderer/raiox-ref/RaioX.dc.html`.
**Pronto quando:** o arquivo existe e contém "Nenhuma proposta sai sem caso aberto".

### T4.2 Injeção no build
**Arquivos:** `scripts/clean_and_bind_ipc.js`.
**Fazer:** nova seção `// 1.2c Raio-X: página própria + IPC` imediatamente após o fim da seção
1.2 da Fábrica: ler `src/renderer/raiox-ref/RaioX.dc.html` (se não existir → `throw new Error('Raio-X: src/renderer/raiox-ref/RaioX.dc.html não encontrado.')`),
aplicar as mesmas remoções de `vendor/react*.js` da Fábrica, gravar em
`manifest['d11b3692-f681-4d6a-9af2-a0e63665359e'].data` com `gzipSync` + base64.
**Pronto quando:** `npm run build` verde; `dist/renderer/index.html` contém a página nova
(conferir com `scripts/extract_bundle_page.js` sobre o `dist`).

### T4.3 Ligar a lista
**Arquivos:** `src/renderer/raiox-ref/RaioX.dc.html`.
**Fazer:** seguir o padrão da `Fabrica.dc.html` (carregar em `componentDidMount` via
`window.tavir.raiox.list()`; `setState`; nunca bloquear a tela).

| Referência | Passa a ser |
|---|---|
| `const CASES = [...]` | Removido. Lista vem de `raiox.list()`. |
| Card: `stage · orig` | `RAIOX_STATUS_LABEL[status] · origem`; se `remote`: badge com `RAIOX_REMOTE_LABEL`. |
| Card: "nota / 100" | `coverage` somado (utilizáveis) com legenda "evidências". Cor fixa `var(--flow)`. |
| Card: barrinhas `segs` | Índice do status em `RAIOX_STATUS` (antes = concluído, igual = atual, depois = linha). |
| Card: "confiança" | `confidence.ratio + '%'` ou "a definir" se sem evidência. |
| Card: próximo passo | `next`. |
| Filtros | Todos · Abertos (fronteira..prioridade) · Devolutiva · Fechados · **Legado** (só se existir). |
| Cards de modo | Itens `kind === 'modo'` do catálogo (nome + promessa); prazos 1/3/7 dias mantidos. |
| Lista vazia | Cartão tracejado: "Nenhum caso ainda. Abra o primeiro em Novo caso." |

**Pronto quando:** com `PRIV` vazio a tela mostra o vazio; com um caso criado via teste manual aparece o card.

### T4.4 Modal "Novo caso"
**Fazer:** modal dentro da página (estrutura `.back > .modal` igual à Fábrica; Esc e clique fora
fecham). Campos: Empresa* · Contato · Origem (segs: Amigo, Rua, Formulário, Indicação) ·
Segmento · Link público · Modo (choice com os 3 modos) · Loja física (toggle) · Deep scan (toggle,
só visível com modo Completo) · Objetivo* · Decisão que precisa permitir* · Fronteira ·
Consentimento (select: Termo assinado, Verbal registrado, Interno TAVIR) + nota.
Ao trocar o modo, preencher Objetivo/Decisão/Fronteira com `defaults` do modo **só se vazios**.
Botão "Abrir caso" → `raiox.create`. Erro → texto vermelho no topo do modal; modal não fecha.
Sucesso → fecha e abre o caso.

### T4.5 Caso aberto
| Referência | Passa a ser |
|---|---|
| Cabeçalho fixo "Loja da Rua" | `company`, eyebrow "Caso <id> · origem · segmento · modo", parágrafo `objective`. |
| Botões "Abrir evidência / Gerar proposta / Registrar oferta" | "Registrar evidência" · "Abrir pasta" (`raiox.openFolder`). Os demais entram nas fases seguintes. |
| Stepper | `RAIOX_STATUS`; status atual = `now`, anteriores `done`; clique só troca a nota explicativa. |
| "Nota por etapa da jornada" | Título "Cobertura por etapa"; barra = `usable / max(usable)`; número = `usable`; legenda "evidências utilizáveis aprovadas". Sem animação de nota. |
| Anel "Confiança" | `ratio`; texto "X de Y evidências observadas diretamente"; nível = `priority.confidence` ou "a definir". |
| Aba Evidências | Tabela real: Fonte · O que vimos · Classe · Etapa · Gaps · Revisão. Linhas `pendente` com botões Aprovar/Rejeitar (`raiox.reviewEvidence`). Filtros por classe e "Pendentes". Botão remover (confirmação). |
| Modal "Registrar evidência" | Etapa · Fonte* · O que mostra* · Classe · Frente (se deep scan) · Gaps (multi, filtrados pela etapa, opcional) · Nota · Anexar arquivo (`raiox.pickFile(id,'evidencias')`). |
| Aba Devolutiva | Nesta fase: bloco "Prioridade" com botão "Escolher prioridade" → modal: Etapa · Gap (filtrado pela etapa) · Gargalo* · Por que vem primeiro* · Confiança · O que descartamos. Mostra a prioridade gravada. |
| Aba Concorrentes | Evidências com `front === 'concorrentes'`. Botão "Pedir varredura" desabilitado com dica "Disponível quando a análise assistida estiver ligada". |

**Pronto quando:** fluxo manual completo até prioridade funciona no app (`npm start`).

### T4.6 Verificação visual
**Arquivos:** `visual/_capture_raiox.mjs` (novo, padrão dos `_capture_fabrica_*.mjs`).
**Fazer:** capturar `visual/raiox-lista.png` e `visual/raiox-caso.png` com um caso fictício criado
numa pasta `PRIV` temporária (variável de ambiente `TAVIR_RAIOX_ROOT` aceita por `raioxRoot()` só
quando `process.env.NODE_ENV === 'test'` ou flag `--dev`).
**Pronto quando:** imagens geradas; `git grep -n "Loja da Rua\|Ateliê Norte\|Padaria Dois\|Sorriso Vivo" -- src/renderer/raiox-ref` vazio.

### 🛑 CP-5 — Tela
Relatar: prints, resultado de `npm run build`, roteiro que o Carlos deve seguir no app (criar caso,
2 evidências em etapas diferentes, aprovar, escolher prioridade).

---

# F5 — Ponte de leitura com o Supabase

### T5.1 Credenciais
**Arquivos:** `src/main/credentials.ts`.
**Fazer:** acrescentar provedores (sem alterar os existentes):
- `raiox_supabase`: campos `url`, `internalSecret`, `reviewSecret`, `deliverySecret`,
  `inviteSecret`, `officeSyncSecret`.
- `resend`: campos `apiKey`, `from`, `replyTo`, `templateId`.
Se a estrutura atual só aceita um `token` por provedor, **pare e pergunte** antes de mudar o formato.
Tela: acrescentar os dois provedores onde os demais aparecem (aba Contas/Acessos da Fábrica ou
Sistema — usar o mesmo lugar dos atuais).
**Pronto quando:** dá para salvar e ver a prévia mascarada.

### 🛑 CP-6 — Segredos
Pedir ao Carlos para digitar na tela os valores de `RAIOX_SUPABASE_URL`, `RAIOX_*_SECRET`
e `RAIOX_OFFICE_SYNC_SECRET` (os mesmos do `.env` privado do AgenciaIA). Você não lê o `.env`.

### T5.2 Fonte da função `office-raiox-sync`
**Fazer:** pedir ao Carlos (ele roda, com login dele):
`npx supabase functions download office-raiox-sync --project-ref <ref>` dentro de `raiox/web`.
Resultado esperado: `raiox/web/supabase/functions/office-raiox-sync/index.ts`.
Ler o código e documentar em `docs/modules/raiox.md`: método, cabeçalho de segredo, formato da
resposta. Se o download não for possível: **pare** e relate; não reescreva a função sem aprovação.
**Pronto quando:** a fonte está no repo e o contrato documentado; `npm run raiox:scan` limpo.

### T5.3 `src/main/raiox/raioxBridge.ts`
**Fazer:** portar `_raiox_edge_call` de `AG/tools/office.py` (linhas ~1381–1426):
- `POST <url>/functions/v1/<fn>`, JSON, cabeçalho de segredo próprio de cada função,
  `User-Agent: TAVIR-Escritorio-RaioX/1.0`, timeout 12 s (`AbortController`).
- Mapear erros com as mesmas mensagens em português do Python (401/403, 404, ≥500, DNS → texto
  do "projeto pausado", rede, resposta inválida). Código de erro da função só se casar com
  `/^[a-z][a-z0-9_]{1,79}$/`. Nunca repassar corpo bruto.
- Exportar só `syncCases()` nesta fase (chama `office-raiox-sync`). As funções de escrita ficam
  declaradas mas lançando `RaioxError("Escrita no Supabase liberada só após o corte (CP-9).")`.
- `syncCases()`: para cada caso remoto → se existe caso local com `remote.supabaseId` igual,
  atualiza `remote.status` e `syncedAt`; se não existe, cria caso local com `origin: 'formulario'`,
  `company`/`contact` vindos do remoto, `objective`/`decisionNeeded` = defaults do modo
  `diagnostico`, `consent.kind = 'formulario'`. **Nunca** apaga caso local.
IPC: `raiox:sync` → `{ ok, created, updated }`. Botão "Sincronizar formulários" na lista.
Testes com `fetch` simulado: cada mensagem de erro; criação; atualização; idempotência.
**Pronto quando:** testes verdes.

### 🛑 CP-7 — Primeira sincronização real
Carlos clica "Sincronizar formulários". Relatar: quantos casos criados/atualizados (sem nomes no
relatório para o chat), e confirmar que nenhum arquivo apareceu em `git status`.

---

# F6 — Análise e redação por motor

### T6.1 Prompts versionados
**Arquivos:** `raiox/prompts/analise.md`, `raiox/prompts/redacao.md`.
**Fazer:**
- `analise.md`: adaptar `_raiox_prompt_analise` (office.py ~1774–1822) trocando:
  caminhos de leitura por `_contexto/...`; saída por `analise/sugestoes.json` (schema T6.3) +
  auditorias em `analise/instagram/` e `analise/web/`; remover menção a Telegram, R1, G5; manter
  todas as proibições (fontes públicas, sem interação, sem inventar preço/estoque/depoimento).
  Placeholders: `{{CASE_ID}}`, `{{FRENTES}}`, `{{NICHO}}`.
- `redacao.md`: instruções para escrever `documentos/v{{N}}/relatorio-raio-x.md` e
  `plano-crescimento.md` a partir de `_contexto/modelos/`, usando **só**: evidências aprovadas
  (`_contexto/evidencias-aprovadas.json`), prioridade e devolutiva (`_contexto/decisao.json`) e o
  playbook do gap (`_contexto/playbook.md`). Obrigatório: frases de abertura da tabela LINGUAGEM;
  marcador `<!-- CORTAR-PUBLICO -->` antes do anexo interno; seção "Oportunidades priorizadas"
  começando pelo gap da prioridade; plano 30/60/90 igual ao da devolutiva; se `depth = piloto`, a
  frase "Esta é uma aplicação piloto: o método está em validação e o preço reflete isso."; se loja
  física, seção "Presença local no Google". Placeholders: `{{CASE_ID}}`, `{{N}}`.

### T6.2 Montagem do contexto
**Arquivos:** `src/main/raiox/raioxContext.ts`.
**Fazer:** `buildContext(root, c, kind: 'analise'|'redacao')` apaga e recria `<caso>/_contexto/`
copiando: o prompt; `raiox/modelos/*.md`; `marketing/inteligencia-nichos/` (só `_INDEX.md` e o
nicho, se houver); as skills necessárias (`instagram-profile-audit`, `web-platform-audit`,
`seo-growth`, `funil-vendas`, `web-security`) de `agentes/escopo/skills/`; para `redacao`, também
`evidencias-aprovadas.json`, `decisao.json`, `playbook.md`. Copiar também para
`<caso>/.claude/skills/` as mesmas skills (para o motor Claude achá-las). Nunca symlink.

### T6.3 Execução e validação da análise
**Arquivos:** `src/main/raiox/raioxAnalyse.ts`, `src/main/runLedger.ts` (acrescentar `'raiox'` ao
tipo `RunKind`, nada mais).
**Fazer:**
1. `analyse(id, fronts)`: exige `analise/analysis-input.json` **ou** caso local com fronteira e
   link público preenchidos (senão "Preencha a fronteira e o link público antes da análise.").
2. Monta contexto, chama `runMotor` com `workspace = <caso>`, motor/modelo da configuração
   `raiox.motor` (P3; default: o motor padrão do Escritório), `access: 'write'`,
   `timeoutMs: 45 min`, registrando no `runLedger` com `RunKind 'raiox'`.
3. Ao fim, ler `analise/sugestoes.json` e validar:
   ```
   { "evidencias": [ { "stage": RaioxStage, "source": string, "claim": string,
       "classification": RaioxClass, "front"?: string, "gapIds": string[], "url"?: string, "arquivo"?: string } ],
     "hipoteses": [ { "gapId": string, "texto": string, "evidencias": number[] } ] }
   ```
   (`evidencias` em `hipoteses` = índices da lista). Inválido → run `failed`, nada entra no caso,
   mensagem "A análise não devolveu sugestões válidas: <motivo>".
4. Válido → `addEvidence` com autor `dora` (pendente) para cada uma; `addHypotheses`.
5. **Guarda anti-vazamento:** antes e depois do run, `git -C REPO status --porcelain`; se surgiu
   qualquer arquivo novo/modificado no repo → run `failed`, mensagem "A análise escreveu no
   repositório. Nada foi aceito." e listar os caminhos para o Carlos.
IPC: `raiox:analyse(id, fronts)`, `raiox:stopAnalyse(id)`, `raiox:runs(id)`.
Tela: botão "Rodar análise" no cabeçalho do caso; progresso (fala/atividade do motor);
"Pedir varredura" da aba Concorrentes chama com `['concorrentes']`. Bloco "Sugestões da Dora" na
aba Devolutiva lista hipóteses (texto; não preenche campos).
Testes: validador (válido, gap inválido, classe inválida, índice inexistente, JSON quebrado);
evidências entram pendentes; guarda anti-vazamento (simular `git status` com arquivo novo).

### T6.4 Devolutiva, redação e checagem
**Arquivos:** `src/main/raiox/raioxDocs.ts`, `src/main/raiox/raioxDocLint.ts`.
**Fazer:**
1. Tela, aba Devolutiva: modal "Devolutiva" com Decisão · Motivo* · Oferta (pré-selecionada com
   a oferta do gap; outras desabilitadas) · Profundidade (junto/para você desabilitados com dica
   "Playbook em rascunho" quando for o caso) · Plano 30*/60/90 · botão "Preencher com o playbook"
   (copia a Versão guiada para o plano 30). → `raiox.setDebrief`.
2. `writeDocuments(id)`: monta contexto `redacao`, roda o motor com `redacao.md`, lê os dois `.md`
   de `documentos/v<N>/`, roda `lintDocument`, calcula sha256 de cada `.md`, chama
   `attachDocuments`.
3. `lintDocument(md, kind, c)` devolve problemas:
   - seções obrigatórias do modelo (relatório: "Resumo executivo", "Escopo e cobertura",
     "Presença atual", "Jornada de compra observada", "Reputação e relacionamento",
     "Oportunidades priorizadas", "Plano de testes", "Limitações", "Fontes analisadas e limites";
     + "Presença local no Google" se loja física; plano: "Objetivo operacional", "Plano priorizado",
     "Rotina orgânica", "Relacionamento e satisfação", "Experimentos e decisão";
     + "Presença Local no Google" se loja física);
   - ausência de `<!-- CORTAR-PUBLICO -->`;
   - termo proibido na parte pública (lista da seção LINGUAGEM);
   - rótulo do gap da prioridade ausente em "Oportunidades priorizadas";
   - `plan30` da devolutiva ausente no plano;
   - frase de piloto ausente quando `depth = piloto`.
4. PDF: `renderPdfs(id, v)` chama `python -I tools/publicar.py <md> --tipo relatorio --out <dir>
   --nome <base> --titulo <...> --publico --marca tavir --rotulo <...>` exatamente como
   `_raiox_pdf_anexos` (office.py ~1532–1566), timeout 90 s, valida existência e tamanho
   (0 < bytes ≤ 15 MB). Falha → "O PDF não foi gerado. Confira Python e Edge/Chrome."
5. Tela: "Gerar documentos" → mostra os dois com problemas da checagem; "Abrir" (md e pdf);
   "Gerar de novo"; "Aprovar documentos" (desabilitado com problemas) mostra os 2 hashes curtos
   (12 caracteres) e pede confirmação → `raiox.approveDocuments`.
6. Entrega (manual nesta fase): "Exportar PDFs" (copia para pasta escolhida no diálogo) e
   "Registrar entrega" (para quem, canal `manual`, nota) → `raiox.recordDelivery`.
   "Encerrar caso" → `raiox.close`.
IPC: `raiox:writeDocuments`, `raiox:renderPdfs`, `raiox:openDocument`, `raiox:approveDocuments`,
`raiox:exportPdfs`, `raiox:recordDelivery`, `raiox:close`.
Testes: `lintDocument` (cada regra); `approveDocuments` exige lint vazio; ordem
aprovar → entregar → encerrar.

### 🛑 CP-8 — Caso interno TAVIR de ponta a ponta
Carlos escolhe o motor (P3). Rodar um caso da própria TAVIR (consentimento "Interno TAVIR"):
análise → revisão → prioridade → devolutiva → documentos → PDF → aprovação → entrega manual →
encerrar. Relatar: tempo de cada run, problemas da checagem, `git status` limpo,
`npm run raiox:scan` limpo. Se algum motor diferente do padrão tiver sido alterado,
rodar `npm run test:motores` (regra 8 do CLAUDE.md).

---

# F7 — Execução com prova e medição

### T7.1 Regras e IPC
IPC: `raiox:startExecution(id)`, `raiox:recordMetric(id, m)`, `raiox:checkStep(id, step, proof)`,
`raiox:closeExecution(id)`. Prova `arquivo` usa `storeFile(...,'execucao',...)` e grava sha256.

### T7.2 Tela — aba "Execução"
- Visível só em caso fechado com `proposta_emitida`.
- "Abrir execução" → grava `playbookVersion`.
- Passo 0: formulário com as métricas do playbook (valor numérico + fonte) → `d0`.
- Lista de passos (título, tempo, ferramenta, como, prova esperada); botão "Provar" abre escolha
  arquivo/link/nota; passos seguem a ordem.
- Após o último passo: "Medição d30 em <data>" (último passo + 30 dias); formulário d30 liberado
  só a partir dessa data (permitir antecipar com confirmação "Medir antes de 30 dias?").
- "Encerrar execução" mostra tabela antes/depois por métrica.
- Ofertas `pagina_vendas` e `criacao_oferta`: botão "Abrir projeto na Fábrica". Antes de codar,
  ler `createOrAbsorbProjectRecord` em `src/main/project-fs.ts` para achar o campo do molde
  (normalizado por `normalizeEsteiraCode`): `pagina_vendas` → `LP-C1`, `criacao_oferta` → `OF-C1`.
  Gravar o id em `execution.fabricaProjectId`. Não alterar `esteiras.ts`.

### T7.3 Painel "Playbooks"
Nova sub-aba na lista do Raio-X: tabela por gap (onda, status, versão, problemas do lint,
execuções encerradas com d0+d30, casos). Botão "Abrir arquivo". **Não** existe botão de validar.

Testes: ordem de passos; d30 sem d0; prova vazia; passo repetido; encerrar sem d30.

### 🛑 CP-9 — Pronto para o corte
Relatar: resumo das fases, testes, prints da aba Execução e do painel Playbooks.
Perguntar ao Carlos, uma por uma, e anotar a resposta: P2 (piloto real), P4 (Vercel),
P5 (casos legados), e "posso desligar o Raio-X do Telegram/office.py?".
Cada tarefa da F9 só roda se a pergunta correspondente tiver "sim" escrito por ele.

Respostas de 2026-11-10: P2 = não (sem piloto; F8 não roda). P4 = sim (Vercel no repositório do Escritório, pasta `raiox/web`; roteiro para o Carlos, sem execução pelo motor). P5 = não (casos legados não são copiados; T9.1 não roda). Telegram = fora do planejamento; um app mobile substitui a integração, então T9.2 e T9.3 não são executadas.

---

# F8 — Escrita no Supabase e entrega por e-mail (só com P2 = sim no CP-9)

### T8.1 Funções de escrita
Em `raioxBridge.ts`, implementar (portando do office.py, mesmas validações e mensagens):
`createRemoteCase` (`create-case`; empresa, contato, e-mail válido),
`continueRemote(caseId, 'form2'|'analyse')` (`continue-case`; grava o `packet` em
`analise/analysis-input.json` com escrita atômica),
`persistReview` (`review-case` com os hashes aprovados),
`deliveryPrepare` / `deliveryFinalize` (`delivery-case`), `inviteFinalize` (`invite-case`).
Tela: botões "Enviar convite", "Gerar formulário 2", "Autorizar análise" (visíveis só para casos
com `remote`).

### T8.2 Resend
Portar `_raiox_resend_payload`, `_raiox_resend_enviar`, `_raiox_resend_convite_payload`,
`_raiox_resend_convite_enviar`. Envio só com: documentos aprovados, entrega autorizada em ato
separado (botão "Autorizar envio para <e-mail>"), idempotência (`deliveryPrepare` devolve id;
segunda tentativa com entrega `sent` → "Esta entrega já foi feita. Não reenvie.").
Registrar `delivery.channel = 'resend'`.

Testes com `fetch` simulado: idempotência; envio sem aprovação recusado; envio sem autorização
recusado; nenhum segredo nas mensagens de erro.

### 🛑 CP-10 — Smoke com caso fictício
Mesmo protocolo do AgenciaIA (`raiox/web/USO.md`): caso fictício, e-mail interno da TAVIR,
convite → formulário → análise → aprovação → entrega → expurgo com prova de ausência.

---

# F9 — Corte do legado (cada tarefa só com o "sim" correspondente do CP-9)

### T9.1 Casos legados — não executar (P5 = não em 2026-11-10)
`scripts/raiox_importar_legado.js`: para cada pasta em
`AG/empresas/tavir/privado/raiox-cases/<uuid>/`, criar `PRIV/casos/RX-XXXXXXXX/` com
`legado/` (cópia dos arquivos), `caso.json` com `legacy: true`, `remote.supabaseId = uuid`,
`company` lido de `analysis-input.json` se existir (senão "Caso legado <id>"), status `fechado` se
houver `email/` com PDF, senão `devolutiva`. Não ler nem imprimir conteúdo no console além de
contagens. Nada vai para o repositório.

### T9.2 Telegram fora do Raio-X — cancelada em 2026-11-10
O Carlos tirou o Telegram do planejamento. Um app mobile substitui a integração. Não alterar
`notify-dora` e não publicar a função.

### T9.2 (texto original, não executar) (pergunta do office.py = sim)
Alterar `raiox/web/supabase/functions/notify-dora/index.ts`: manter o envio da mensagem ao
Telegram **sem** `reply_markup` e com o texto
`Raio X <case_id>\nFormulário recebido. Abra o Escritório para continuar.`
Publicar **só** essa função: `npx supabase functions deploy notify-dora --project-ref <ref>`
(Carlos roda ou acompanha).

### T9.3 Desligar o Raio-X no office.py — cancelada em 2026-11-10
Mesma decisão da T9.2. Não pedir remoção das chaves `RAIOX_*` como parte deste corte.

### T9.3 (texto original, não executar) (mesma pergunta)
Não editar o código do AgenciaIA. Pedir ao Carlos para remover do `.env` privado do AgenciaIA as
chaves `RAIOX_*` (o office.py já recusa operar sem elas — ver `_raiox_edge_call`).

### T9.4 Vercel (P4 = sim em 2026-11-10)
Roteiro para o Carlos (você não executa):
1. Vercel → projeto `agenciaia` → Settings → Git → desconectar `empresatavir/agenciaia`,
   conectar `empresatavir/tavirescritorio`.
2. Root Directory: `raiox/web`. Manter `git.deploymentEnabled.main = false` (já no `vercel.json`).
3. `cd raiox/web && npx vercel link` (projeto `agenciaia`) e `npx vercel --prod` quando quiser publicar.
4. Conferir domínio `raiox.tavir.com.br`, headers e `noindex` (lista em `raiox/web/USO.md`).

### T9.5 Supabase link local
`cd raiox/web && npx supabase link --project-ref <ref>` (Carlos). A pasta `.temp/` já está no
`.gitignore`.

### T9.6 Marcar a casa antiga
Com aprovação do Carlos: criar `RXO/MUDOU-PARA-TAVIRESCRITORIO.md` com 5 linhas apontando
para `tavirescritorio/raiox/` e `docs/planning/PLANO_RAIOX.md`. Commit no AgenciaIA só se ele pedir.

### 🛑 CP-11 — Encerramento
Relatar o checklist do critério de sucesso (seção 8 do PLANO) item a item, com evidência.

---

# RETOMADA (2026-11-20) — até o piloto real assistido

Decisões do Carlos em 2026-11-20:
- **Alcance:** ir até o piloto real assistido (sem cobrança). P2 passa a **sim**. Venda (preço,
  contrato, cobrança) fica para depois do piloto.
- **Convite:** o Escritório cria o caso remoto e manda o convite; o APK também pode pedir, pela
  fila do Supabase. O `office.py` deixa de ser caminho.
- **Motor (P3):** não há motor padrão do Raio-X. A análise e a redação usam o motor escolhido no
  Escritório e têm de passar nas mesmas checagens em todos os motores ligados (F11).
- **Caso do CP-8:** `RX-854A8212` (consentimento verbal registrado, já em Coleta). Os PDFs desse
  caso só podem sair para o cliente depois do CP-12; no CP-8 a entrega manual é registrada para o
  próprio Carlos.

Estado em 2026-11-20: F0–F7 commitadas (branch `Raio-x` e `fabrica/absorcao-chamados`, fora da
`master`); 16 playbooks em `rascunho`; 13 casos locais, nenhum além de Coleta.

Ordem: **CP-8 → F10 → F8 → F11 → CP-10 → F9 → CP-12**.

### 🛑 CP-8 (refeito) — `RX-854A8212` de ponta a ponta
Mesmo roteiro do CP-8 original, com o caso acima e o motor que estiver como padrão no Escritório.
Coleta → revisão de evidências → prioridade → devolutiva → redação → checagem → PDF → aprovação
por hash → entrega manual registrada (destinatário: Carlos) → encerrar. Anotar cada falha de tela
ou de checagem como tarefa `T8.0.n` e corrigir antes de seguir. Relatar tempo de cada rodada,
`git status` limpo e `npm run raiox:scan` limpo.

**Resultado (2026-11-20): passou.** Caso `fechado` às 23:54 UTC. Documentos v1 com checagem limpa,
PDFs gerados (relatório 215 KB, plano 199 KB, anexo interno cortado), aprovação por hash pelo
clique do Carlos (hashes conferidos contra os `.md`), entrega `manual` registrada para o Carlos.
Rodadas: análise no Cursor (`auto-smart`) 1,6–2,6 min nas que deram certo (duas falharam antes, em
2026-11-10); redação no Antigravity (`gemini-3.8-flash`) 6–7 min. `raiox:scan` limpo; nenhum dado
do caso no repositório (só o id neste plano). Correções feitas durante o CP-8:
- T8.0.1 Reanálise duplicava evidências e hipóteses → deduplicação por etapa+fonte+afirmação.
- T8.0.2 "Gerar documentos" sem retorno na tela e com clique duplo abrindo duas redações → trava
  por caso no processo principal, mensagem de andamento e releitura do caso.
- T8.0.3 Aba Devolutiva virou fluxo de 8 passos (prioridade → encerrar) com estado rodando/feito,
  botão Parar, bloco ao vivo e botões travados enquanto algo roda.
- T8.0.4 PDF falhava: logo e fontes da marca não estavam no repositório → `tools/marca/` (fontes
  OFL com licença) e o motivo real do erro aparece na tela.
- Pendente (entra na F10): botões de aprovar/rejeitar evidência ignoram `ok:false` em silêncio.
- Observação para F11: a análise e a redação deste caso rodaram em motores diferentes; a
  conformidade entre motores ainda não foi medida.

# F10 — Controles do piloto real (G-PR1)
Fonte: `raiox/docs/plano/piloto-real-assistido.md`. Cada controle termina com evidência em
`raiox/docs/validacao/g-pr1.md` (sem dado de cliente).

### T10.1 Levantamento
Para cada um dos 9 controles: o que já existe (migração, função, formulário, tela), o que falta e
quem faz (código, Carlos, advogado). Entregar a tabela antes de codar.

### T10.2 Opt-in antes do caso (controle 1)
`create-case` falha fechado sem registro de opt-in (canal, horário, versão do aviso, operador).
Migração nova; não alterar migração já aplicada.

### T10.3 Aviso de privacidade versionado (controle 2)
Página `raiox/web/public/privacidade.html` sem token, com os itens do controle 2. Texto é minuta:
o Carlos leva ao advogado. Versão gravada junto do consentimento.

### T10.4 Três decisões separadas e e-mail confirmado (controles 3 e 4)
Formulário com três caixas sem pré-marcação; token de confirmação opaco, de uso único e com
validade; análise e entrega bloqueadas sem `email_verified_at`.

### T10.5 Entrada segura e minimização (controle 5)
Validar protocolo, destino, DNS/IP e redirects de todo link antes de acessar. Bloquear campos
proibidos. Testes com URLs internas, IP privado e redirect.

### T10.6 Fornecedores por caso e expurgo (controles 6 e 7)
`caso.json` registra fornecedor, finalidade, região e retenção de cada serviço usado (inclusive o
motor de IA). Botão "Expurgar caso" no Escritório: Supabase, pasta privada, PDFs, Resend e
temporários, com relatório de ausência sem PII.

### T10.7 Direitos do titular e runbook (controles 8 e 9)
`raiox/docs/validacao/runbook-incidentes.md` e procedimento de acesso/correção/revogação/exclusão.
Revogação na tela interrompe as etapas seguintes do caso.

# F8 (ajustada) — Escrita, convite e entrega
T8.1 e T8.2 como escritas acima, com R5/R6 novas. Acréscimos:

### T8.3 Convite pelo Escritório
Botão "Enviar convite" na lista do Raio-X: empresa, contato, e-mail e registro de opt-in (T10.2).
Chama `create-case` + `invite-case`. Sem opt-in, o botão não habilita.

### T8.4 Convite pelo APK
Novo tipo de job `raiox_convite` em `src/main/officeCloud.ts` (campos `empresa`, `contato`,
`email`, `optin`). O job não envia nada sozinho: cria um pedido pendente que aparece no Raio-X e
só vira convite com o clique do Carlos (R4). O app mobile ganha o formulário correspondente
(repositório `tavir-interno/novo-app-2dad16`, tarefa separada).

# F11 — Mesma qualidade em qualquer motor
### T11.1 Caso fictício de referência
Fixture em `tests/fixtures/raiox/` com intake e evidências fictícias (sem rede).

### T11.2 Conformidade
Estender `scripts/conformidade_motores.js` com o Raio-X: análise e redação do caso fictício em cada
motor ligado. Passa quando: `sugestoes.json` válido, nenhuma escrita fora da pasta do caso,
documentos aprovados pela checagem (seções, termos proibidos, corte público), nenhum número
inventado. Relatório em `relatorios/motores/`.

### T11.3 Ajuste de prompt
Motor que reprovar: ajustar `raiox/prompts/*.md` (não criar prompt por motor), rodar de novo nos
quatro. Regra 8 do `CLAUDE.md`: `npm run test:motores` nos quatro antes do commit.

### 🛑 CP-10 — Smoke com caso fictício
Como descrito acima, agora com convite pelo Escritório e pelo APK, e expurgo pelo botão da T10.6.

# F9 (ajustada) — Publicação
T9.4 (Vercel, Carlos executa) e T9.5 (Supabase link, Carlos). Antes: PR da branch com F0–F11 para
a `master` (o Carlos aprova o merge). Publicar as migrações e funções novas com o Carlos
acompanhando. T9.6 só se ele pedir.

### 🛑 CP-12 — Liberação do piloto real
Relatar o critério de sucesso do PLANO (seção 8) e a tabela G-PR1 com evidência. Pendências do
Carlos: parecer do advogado sobre aviso e termo; ler e marcar como `validado` ao menos os
playbooks da Onda 1 usados no piloto (R3). Só com "liberado piloto" escrito por ele os PDFs do
`RX-854A8212` e de novos convidados podem sair.

---

## Apêndice A — Checklist rápido por checkpoint

| CP | O Carlos precisa | Você entrega |
|---|---|---|
| CP-0 | Limpar a branch atual | Estado do git e baseline dos testes |
| CP-1 | Aprovar a lista de cópia | Simulação da migração |
| CP-2 | Ler PROJECT/USO | Árvore e verificações |
| CP-3 | — | Regras e testes |
| CP-4 | Ler a Onda 1 | 16 playbooks com lint limpo |
| CP-5 | Testar no app | Prints e roteiro |
| CP-6 | Digitar segredos | Tela de credenciais |
| CP-7 | Sincronizar | Contagens e git limpo |
| CP-8 | Escolher motor e rodar caso TAVIR | Relatório do caso interno |
| CP-9 | Responder P2, P4, P5, Telegram | Resumo geral |
| CP-10 | Acompanhar smoke | Prova de expurgo |
| CP-11 | — | Critério de sucesso |

## Apêndice B — Comandos de verificação

```
npm run typecheck
npm test
npm run build
npm run raiox:scan
cd raiox/web && npm test
git status --porcelain
```
