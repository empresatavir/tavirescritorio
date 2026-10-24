# Fábrica Backend V1 — Documento vivo

**Status:** decisões fechadas (2026-10-20) · ownership OK · **B0–B9 entregues** · console ligado a run/artefatos/QA/chat/acessos  


**Supersede parcial:** `planFabricaTavir.md` permanece como referência de **UI/console** (topologia · livro-razão · workspace). Para backend e esteira real, este documento prevalece.  
**Base técnica:** `FABRICA_CONSOLE_BACKEND.md` (contratos REST/SSE a evoluir).

---

## 1. Objetivo

A Fábrica deve levar um projeto **do cadastro até a etapa final**, com:

- materialização real de workspace em disco;
- execução real de geração de código (não só simulação);
- gates humanos (CEO local na v1);
- chat por agente (GhostCLI) **escopado ao projeto**;
- pacote local + handoff manual (sem deploy/preview automático na v1).

---

## 2. Decisões fechadas

| # | Tema | Decisão |
|---|------|---------|
| D1 | Esteira LP canônica | **Enxuta (10 etapas)** — ver §3. 16 etapas do mock Flow Guard ficam como referência visual, não como motor v1. |
| D2 | Execução | **Real (opção B)** — GhostCLI + runner local devem produzir arquivos no workspace; aceite exige artefato verificável em disco. |
| D3 | Deploy / preview | **Pacote local + handoff manual** apenas. Sem publish/CI hospedada na v1. |
| D4 | Chat Fábrica | **Mesmo GhostCLI** do Escritório; persona por agente; conversa + RAG/contexto **somente do `project_id`** (artefatos, ledger, arquivos do workspace). |
| D5 | Gates humanos | **CEO local** (operador logado) aprova todos os gates na v1. |
| D6 | Track manutenção (`pronto`) | **11 etapas** (diagnóstico → gate final), alinhadas à ref advocacia / roadmap. |
| D7 | Documento vivo | Este arquivo. |
| D8 | Ownership Interno/Externo | **Obrigatório** em Todo Novo Projeto. Define raiz do workspace (§4). |

---

## 3. Esteiras canônicas v1

Pesquisa de mercado (brief → design/copy → build → QA → handoff) + agentes TAVIR. LP não precisa de 16 nós.

### 3.0 Ordem canônica de criação (fechada)

1. **Dora Descoberta** — Gate 0 / briefing  
2. **Marina + Yuri** — requisitos  
3. **Ari Arquiteto** — arquitetura  
4. **Paula PM** — plano + **roadmap** + **kanban** (`plan.md`, `roadmap.md`, `kanban.md`)  
5. **CEO local** — `plan_gate`  
6. Demais agentes da esteira (Enzo → Diego → Talita → …)

**Modelo / esforço (v1, até Paula redefinir):** todos os agentes iniciais usam **Opus** (`claude-opus-5-5`) e esforço **máximo** (`xhigh`), gravados em `run.meta.model` / `run.meta.effort`.

### 3.1 LP / Oferta — criação (`track=zero`)

| # | id | Título | Agente | Gate? |
|---|-----|--------|--------|-------|
| 01 | `brief` | Gate 0 · Briefing / demanda | Dora Descoberta | sim |
| 02 | `requirements` | Requisitos verificáveis | Marina + Yuri | não |
| 03 | `architecture` | Arquitetura e escopo técnico | Ari Arquiteto | não |
| 04 | `paula_plan` | Planejamento · roadmap e kanban | Paula PM | não |
| 05 | `plan_gate` | Aprovação do plano (CEO) | CEO local | sim |
| 06 | `visual_proof` | Prova visual · tokens / esqueleto | Enzo Extrator | não |
| 07 | `visual_gate` | Aprovação da prova visual | CEO local | sim |
| 08 | `build` | Construção da página | Diego Desenvolvedor | não |
| 09 | `qa` | QA local + evidências | Talita QA | não |
| 10 | `seo_sec` | SEO básico + Security/LGPD | Nina + Sérgio | não |
| 11 | `docs` | Documentação & runbook | Dante Doc | não |
| 12 | `final_gate` | Gate Final · Completion Guard | CEO local | sim |

### 3.2 LP / Oferta — manutenção (`track=pronto`) — **8 etapas**

| # | id | Título | Gate? |
|---|-----|--------|-------|
| 01 | `m_gate0` | Gate 0 · Demanda de manutenção | sim |
| 02 | `m_diag` | Diagnóstico do atual | não |
| 03 | `m_plan_gate` | Aprovação do plano | sim |
| 04 | `m_code` | Alterações de código | não |
| 05 | `m_qa` | Regressão & QA | sim |
| 06 | `m_seo_sec` | SEO / Security | não |
| 07 | `m_docs` | Documentação | não |
| 08 | `m_final` | Gate Final CEO | sim |

### 3.3 Sistemas — criação

Mesma ordem canônica (Dora → Marina/Yuri → Ari → Paula → plan_gate), depois visual/build BE/FE/QA/docs/final_gate.

### 3.4 Topologia do console (9 nós)

Projeção de agrupamento sobre as etapas da esteira (Intake→Handoff). Não é outra lista persistida.

---

## 4. Workspace em disco (ownership)

| Ownership | Raiz absoluta |
|-----------|----------------|
| `interno` | `{REPO}/tavir-interno/<slug>/` |
| `externo` | `{REPO}/tavir-exterrno/<slug>/` |

- Nome da pasta externa: **`tavir-exterrno`** (grafia acordada com o operador).
- Em `POST /api/v1/projects/`: campo obrigatório `ownership`.
- Backend cria a pasta, grava `local_path` e marker `.tavir/project.json`.
- Jobs da Fábrica **devem** usar `project.local_path` (não o antigo `backend/workspaces/` genérico, salvo legado de tasks).

---

## 5. Chat escopado ao projeto (desenho)

```text
UI Chat Fábrica
  → POST /api/v1/factory/projects/{id}/chat  (agent_role, message)
  → Backend monta system prompt = persona(agente) + regras da esteira
  → Anexa contexto: metadados do projeto, últimas ledger events, índice de arquivos do workspace
  → GhostCLI (mesmo gateway do Escritório)
  → Persiste mensagens com project_id + agent_role (isolado do chat global)
```

Garantias v1:

1. Nenhuma mensagem de outro `project_id` entra no contexto.
2. Tools de leitura limitadas ao `local_path` do projeto.
3. Tools de escrita só no workspace do projeto + após gate quando a etapa exigir.

---

## 6. Execução real (garantia anti-retrabalho)

Critério de “etapa build concluída”:

1. Runner/GhostCLI encerra com sucesso;
2. Existe ao menos um artefato de código esperado no `local_path` (ex.: `index.html` / `src/` conforme template);
3. Ledger registra `content_hash` (sha256) do artefato principal;
4. UI só marca `done` se a API confirmar os itens acima — **proibido** avançar só com flag client-side.

---

## 7. Fases de implementação

| Fase | Escopo | Estado |
|------|--------|--------|
| **Ajuste** | Modal ownership + `POST` materializa pasta | **Feito** |
| **B0** | Esteiras canônicas + `factory_runs` / `factory_stages` + create materializa run | **Feito** |
| **B1** | Authorize / complete / fail + ledger + sync `stages_done` | **Feito** |
| **B2** | SSE `stage.changed` / `event.appended` (+ snapshot) | **Feito** |
| **B3** | Gates CEO local (UI + resume pós-fail) | **Feito** |
| **B4** | Artefatos / arquivos | **Feito** |
| **B5** | QA / Completion Guard | **Feito** |
| **B6** | Roadmap = projeção das stages | **Feito** |
| **B7** | Executor real (GhostCLI + filesystem) | **Feito** |
| **B8** | Chat por projeto + personas | **Feito** |
| **B9** | Acessos (metadados + reveal auditado) | **Feito** |

---

## 8. Contratos mínimos já ativos

### `POST /api/v1/projects/`

```json
{
  "name": "string",
  "company": "string?",
  "ownership": "interno | externo",
  "track": "zero | pronto",
  "stack_frontend": "string?",
  "stack_backend": "string?",
  "stack_database": "string?",
  "context_files": ["…"],
  "design_system_files": ["…"],
  "template_category": "lp | of | sy"
}
```

Resposta inclui `local_path` absoluto do workspace criado.

---

## 9. Entrega B0 (feito)

- Módulo `app/modules/factory/esteiras.py` — defs `lp-c` (10), `lp-m` (8), `of-*`, `sy-c` (12), `sy-m` (8)
- Models `FactoryRun` + `FactoryStageInstance` (create_all no boot)
- `POST /api/v1/projects/` resolve `template_code`, cria workspace + run + stages
- `GET /api/v1/factory/projects/{id}/run` e `GET /api/v1/factory/runs/{run_id}`
- Seed atualiza templates com stages estruturados

## 10. Entrega B1 (feito)

| Método | Path | Efeito |
|--------|------|--------|
| POST | `/api/v1/factory/projects/{id}/stages/{stage_def_id}/authorize` | Gate `awaiting_gate` → `done` → ativa próxima |
| POST | `/api/v1/factory/projects/{id}/stages/{stage_def_id}/complete` | Etapa `running` (não-gate) → `done` → próxima |
| POST | `/api/v1/factory/projects/{id}/stages/{stage_def_id}/fail` | Etapa atual → `failed`; run/project `paused` |
| GET | `/api/v1/factory/projects/{id}/ledger` | Ledger do run + `event_log` do projeto |

Body opcional: `{ "note", "actor", "artifact_hash" }`. Actor padrão de gate: `CEO local`.

Ledger em `run.meta.ledger` (append-only). `project.stages_done` sincronizado a cada transição.

## 11. Entrega B2 (feito)

| Método | Path |
|--------|------|
| GET | `/api/v1/factory/runs/{run_id}/events` |
| GET | `/api/v1/factory/projects/{id}/events` (atalho do run ativo) |

Frames SSE:

1. `run.snapshot` — estado atual (stages + contagem ledger)
2. Replay: `event.appended` + `stage.changed` (`replay: true`)
3. Live via hub in-process nas transições B1
4. Heartbeat `: ping` a cada ~15s
5. `run.completed` encerra o stream

Cliente: `api.subscribeFactoryRunEvents(runId, handlers)` no `client.ts`.

## 12. Ligação UI · Overview (feito)

Console da Fábrica consome o run real:

1. `api.getFactoryRun` / `authorizeFactoryStage` / `completeFactoryStage` / `getFactoryLedger`
2. Controller Solid `createFactoryRunController` + SSE (`useFactoryRun.ts`)
3. `OverviewPanel` + `FabricaConsole`: etapas, gate Autorizar, Concluir etapa, atividade ao vivo
4. Sem dados demo — empty states quando não há run/artefatos

## 13. Entrega B3 (feito)

| Método | Path | Efeito |
|--------|------|--------|
| POST | `.../stages/{id}/resume` | `failed` → `running`/`awaiting_gate`; run `paused` → `running` |
| POST | `.../run/resume` | Retoma etapa atual do run pausado |
| POST | `.../run/pause` | Pausa suave (sem falhar etapa) |

Pendências derivadas em `serialize_run.pendencies` + sync em `project.pendencies` (gates `auth` + falhas `error`).

UI: Overview (Autorizar / Retomar / Marcar falha), Hero (Gate CEO / Falha + pause/resume API), Topologia (Retomar).

## 14. Entrega B4 (feito)

| Método | Path |
|--------|------|
| GET | `.../projects/{id}/artifacts` — lista + expected da etapa |
| GET | `.../artifacts/content?path=` — leitura textual + sha256 |
| PUT | `.../artifacts` — grava UTF-8 + ledger `written` |

UI: `ArtifactsPanel` em Documentos / Arquivos.

## 15. Entrega B5 (feito)

`GET .../projects/{id}/qa` — Completion Guard (`qa_guard.evaluate_guard`) · UI `QaPanel`.

## 16. Entrega B6 (feito)

`GET .../projects/{id}/roadmap` — projeção das stages · UI `RoadmapPanel`.

## 17. Entrega B7 (feito)

`POST .../stages/{id}/execute` — materializa `expected_artifacts` no workspace, hash no ledger; GhostCLI opcional se no PATH. UI Overview: **Executar**.

## 18. Entrega B8 (feito)

`GET/POST .../projects/{id}/chat` — mensagens em `project.files.chat` isoladas por `project_id` + persona. UI `ChatPanel`.

## 19. Entrega B9 (feito)

`GET/PUT .../access` + `POST .../access/{key}/reveal` — metadados com máscara; reveal só audita ledger (sem plaintext). UI `AccessPanel`.

## 20. Próximo passo sugerido

Operação: GhostCLI real no execute (quando binário disponível) · endurecer complete exigindo artefatos · polish UX.
