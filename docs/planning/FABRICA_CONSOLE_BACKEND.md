# Arquitetura de backend — Console TAVIR Fábrica

> **Documento vivo de produto/esteira:** ver [`FABRICA_BACKEND_V1.md`](./FABRICA_BACKEND_V1.md)
> (ownership Interno/Externo, esteiras enxutas, execução real, chat escopado).
>
> Este arquivo mapeia REST/SSE do console (mapa, inspector, feed). Contratos abaixo
> evoluem sob a batuta do V1.

## 1. Componentes interativos → fontes de dados

| Superfície UI | Fonte sugerida | Tempo real |
|---------------|----------------|------------|
| Mapa de topologia (nós + estados) | `GET /api/v1/factory/runs/{run_id}` | SSE `stage.changed` |
| Inspector da etapa | mesmo run + `GET .../stages/{stage_id}` | SSE `stage.changed` |
| Activity / feed contextual | `GET .../events?run_id=` | SSE `event.appended` |
| Livro-razão (árvore + detalhe) | `GET .../ledger?run_id=` + `GET .../ledger/{event_id}` | SSE `ledger.updated` |
| Quadro (board) | `GET .../work-items?project_id=` | SSE `work_item.updated` |
| Documentos gerados | `GET .../artifacts?run_id=` + download blob | — |
| Arquivos importados | upload local → futuro `POST .../uploads` (scoped) | — |
| QA registros | `GET/POST .../qa-findings` | SSE opcional |
| Chat projeto | futuro canal; **hoje só local** | — |
| Acessos | **nunca** retornar segredo em claro; vault server-side + reveal auditado | — |

## 2. Identificadores

```json
{
  "project_id": "uuid",
  "run_id": "uuid",
  "work_item_id": "DEMO-482 | uuid",
  "stage_id": "intake|triage|spec|planning|architecture|build|review|qa|handoff",
  "event_id": "uuid"
}
```

## 3. Payloads JSON (contratos propostos)

### 3.1 Run + topology

`GET /api/v1/factory/runs/{run_id}`

```json
{
  "id": "run_…",
  "work_item_id": "wi_…",
  "title": "Refatoração do módulo de autenticação",
  "status": "running",
  "demo": false,
  "stages": [
    {
      "id": "build",
      "code": "06",
      "title": "Execução local",
      "kind": "current",
      "agent_role": "developer",
      "gate_label": "Implementação em andamento",
      "description": "…",
      "fabrica_alignment": "Construção (Diego / fábrica-lp)"
    }
  ],
  "selected_stage_id": "build"
}
```

### 3.2 Ledger event

`GET /api/v1/factory/ledger/{event_id}`

```json
{
  "id": "evt_…",
  "run_id": "run_…",
  "kind": "agent",
  "title": "Execução local",
  "occurred_at": "2026-10-19T13:42:00Z",
  "agent_name": "Agente Dev",
  "status_label": "Etapa iniciada",
  "workspace_note": "…",
  "artifact_name": "implementation_notes.md",
  "content_hash": null,
  "payload": {
    "event": "local_execution_started",
    "external_calls": false
  }
}
```

### 3.3 SSE stream

`GET /api/v1/factory/runs/{run_id}/events` (`text/event-stream`)

```text
event: event.appended
data: {"id":"evt_…","run_id":"run_…","kind":"agent","title":"…","occurred_at":"…"}

event: stage.changed
data: {"run_id":"run_…","stage_id":"qa","kind":"current"}
```

**Cliente (Solid):** append-only no feed; reconciliar listas por `id`; validar `occurred_at` antes de formatar (`Number.isNaN(Date.parse(...))` → ignorar).

### 3.4 QA finding

`POST /api/v1/factory/qa-findings`

```json
{
  "run_id": "run_…",
  "what_failed": "…",
  "how_failed": "…",
  "fix_for_dev": "…",
  "attachments": []
}
```

## 4. Segurança

1. Zero tokens/API keys no HTML/JS.
2. Tela Acessos: apenas metadados (`label`, `last_four`, `rotated_at`); reveal via endpoint auditado com TTL curto.
3. Uploads: vírus scan + tipo allowlist; sem execução remota no protótipo.
4. SSE: autenticação de sessão Escritório; filtrar por `project_id` autorizado.

## 5. Mapeamento esteira TAVIR

Stages do console ↔ fases `lp-c` / `sy-c` etc. (ver `ESTEIRA_ALIGNMENT` em `demoData.ts`). O backend deve aceitar `template_id` (`lp-c`, …) e materializar a lista de `stages` correspondente.

## 6. Ordem de implementação sugerida

1. Persistência de `run` + `stages` + `ledger_events`
2. REST leitura (run, ledger, artifacts)
3. SSE `event.appended` / `stage.changed`
4. QA POST
5. Vault (último; com auditoria)
