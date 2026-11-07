"""Páginas do vault que cada etapa pode ler. No máximo cinco, e só do domínio permitido."""
from __future__ import annotations

import json
from pathlib import Path

KNOWLEDGE_ROOT = Path(__file__).resolve().parents[4] / "conhecimento"

# Caminhos reais em conhecimento/. A chave é stage_def_id.
STAGE_PAGES: dict[str, list[str]] = {
    "brief": [
        "negocios/perguntas-mom-test.md",
        "frameworks/framework-mom-test.md",
        "negocios/processo-customer-dev.md",
    ],
    "requirements": [
        "engenharia/proxima-acao-fisica.md",
        "frameworks/natural-planning-model.md",
    ],
    "architecture": [
        "engenharia/seis-altitudes-trabalho.md",
        "engenharia/capacidade-e-sistemas.md",
    ],
    "paula_plan": [
        "engenharia/workflow-processamento-gtd.md",
        "frameworks/framework-gtd.md",
        "engenharia/weekly-review.md",
    ],
    "visual_proof": [
        "design/checklist-pre-entrega-ui.md",
        "design/dials-de-intencao-design.md",
        "design/vocabulario-de-movimento.md",
        "frameworks/framework-anti-slop-design-ia.md",
    ],
    "build": [
        "engenharia/proxima-acao-fisica.md",
        "design/checklist-pre-entrega-ui.md",
    ],
    "qa": [
        "design/checklist-pre-entrega-ui.md",
        "engenharia/ready-state.md",
    ],
    "seo_sec": ["negocios/etica-organizacional.md"],
    "docs": ["engenharia/organizacao-gtd.md"],
    "m_gate0": ["negocios/perguntas-mom-test.md"],
    "m_diag": [
        "negocios/pre-mortem.md",
        "engenharia/proxima-acao-fisica.md",
    ],
    "m_code": [
        "engenharia/proxima-acao-fisica.md",
        "design/checklist-pre-entrega-ui.md",
    ],
    "m_qa": ["design/checklist-pre-entrega-ui.md"],
    "m_docs": ["engenharia/organizacao-gtd.md"],
}


def _domain(relative: str) -> str:
    return relative.split("/", 1)[0]


def pages_for(stage_def_id: str, bases: list[str] | None) -> list[Path]:
    allowed = set(bases or [])
    chosen = []
    for relative in STAGE_PAGES.get(stage_def_id, [])[:5]:
        if allowed and _domain(relative) not in allowed:
            continue
        path = KNOWLEDGE_ROOT / relative
        if path.is_file():
            chosen.append(path)
    return chosen


def pages_prompt(stage_def_id: str, bases: list[str] | None) -> str:
    paths = pages_for(stage_def_id, bases)
    if not paths:
        return ""
    parts = ["Conhecimento da casa para esta etapa (só leitura):"]
    for path in paths:
        parts.append(f"## {path.stem}\n{path.read_text(encoding='utf-8')[:2500]}")
    return "\n\n".join(parts)


def bases_from_workspace(workspace: Path) -> list[str]:
    """Lê memory/bases.json do projeto. Lista vazia = o mapa da etapa decide."""
    candidates = [
        workspace / "memory" / "bases.json",
        workspace.parent.parent / "memory" / "bases.json" if workspace.parent.name == "demandas" else None,
    ]
    for candidate in candidates:
        if candidate is None or not candidate.is_file():
            continue
        try:
            data = json.loads(candidate.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
        bases = data.get("bases") if isinstance(data, dict) else None
        return [str(item) for item in bases] if isinstance(bases, list) else []
    return []
