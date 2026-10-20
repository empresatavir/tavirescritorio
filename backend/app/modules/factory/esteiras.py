"""Esteiras canônicas da Fábrica V1 (B0).

Contrato de stage (dict):
  id, code, title, agent, agent_role, gate, topology, expected_artifacts
"""
from __future__ import annotations

from typing import Any

# Projeção topologia console (9 nós) ← stage.id
TOPOLOGY_GROUPS = (
    "intake",
    "triage",
    "spec",
    "planning",
    "architecture",
    "build",
    "review",
    "qa",
    "handoff",
)


def _s(
    id: str,
    code: str,
    title: str,
    agent: str,
    agent_role: str,
    *,
    gate: bool = False,
    topology: str = "build",
    expected_artifacts: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "id": id,
        "code": code,
        "title": title,
        "agent": agent,
        "agent_role": agent_role,
        "gate": gate,
        "topology": topology,
        "expected_artifacts": expected_artifacts or [],
    }


# --- LP / Oferta criação: 10 etapas ---
STAGES_LP_CRIACAO: list[dict[str, Any]] = [
    _s("brief", "01", "Gate 0 · Briefing / demanda", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["brief.md"]),
    _s("requirements", "02", "Requisitos verificáveis", "Marina + Yuri", "marina_yuri", topology="triage", expected_artifacts=["requirements.md"]),
    _s("req_gate", "03", "Aprovação dos requisitos", "CEO local", "ceo", gate=True, topology="spec"),
    _s("visual_proof", "04", "Prova visual · tokens / esqueleto", "Enzo Extrator", "enzo", topology="planning", expected_artifacts=["visual_proof/"]),
    _s("visual_gate", "05", "Aprovação da prova visual", "CEO local", "ceo", gate=True, topology="planning"),
    _s("build", "06", "Construção da página", "Diego Desenvolvedor", "diego", topology="build", expected_artifacts=["index.html", "src/"]),
    _s("qa", "07", "QA local + evidências", "Talita QA", "talita", gate=True, topology="qa", expected_artifacts=["qa/report.md"]),
    _s("seo_sec", "08", "SEO básico + Security/LGPD", "Nina SEO · Sérgio Seg", "nina_sergio", topology="review", expected_artifacts=["seo_sec.md"]),
    _s("docs", "09", "Documentação & runbook", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/runbook.md"]),
    _s("final_gate", "10", "Gate Final · Completion Guard", "CEO local", "ceo", gate=True, topology="handoff"),
]

# --- LP / Oferta manutenção: 8 etapas ---
STAGES_LP_MANUTENCAO: list[dict[str, Any]] = [
    _s("m_gate0", "01", "Gate 0 · Demanda de manutenção", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["maintenance_request.md"]),
    _s("m_diag", "02", "Diagnóstico do atual", "Enzo Extrator", "enzo", topology="triage", expected_artifacts=["diagnosis.md"]),
    _s("m_plan_gate", "03", "Aprovação do plano", "CEO local", "ceo", gate=True, topology="spec", expected_artifacts=["plan.md"]),
    _s("m_code", "04", "Alterações de código", "Diego Desenvolvedor", "diego", topology="build", expected_artifacts=["src/"]),
    _s("m_qa", "05", "Regressão & QA", "Talita QA", "talita", gate=True, topology="qa", expected_artifacts=["qa/report.md"]),
    _s("m_seo_sec", "06", "SEO / Security", "Nina SEO · Sérgio Seg", "nina_sergio", topology="review"),
    _s("m_docs", "07", "Documentação", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/changelog.md"]),
    _s("m_final", "08", "Gate Final CEO", "CEO local", "ceo", gate=True, topology="handoff"),
]

# Oferta criação/manutenção reutiliza LP (mesmo motor visual/comercial enxuto)
STAGES_OF_CRIACAO = STAGES_LP_CRIACAO
STAGES_OF_MANUTENCAO = STAGES_LP_MANUTENCAO

# --- Sistemas criação: 12 etapas ---
STAGES_SY_CRIACAO: list[dict[str, Any]] = [
    _s("brief", "01", "Gate 0 · Demanda", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["brief.md"]),
    _s("requirements", "02", "Requisitos verificáveis", "Marina + Yuri", "marina_yuri", topology="triage", expected_artifacts=["requirements.md"]),
    _s("req_gate", "03", "Aprovação dos requisitos", "CEO local", "ceo", gate=True, topology="spec"),
    _s("architecture", "04", "Arquitetura e dados", "Ari Arquiteto", "ari", topology="architecture", expected_artifacts=["architecture.md"]),
    _s("arch_gate", "05", "Aprovação da arquitetura", "CEO local", "ceo", gate=True, topology="architecture"),
    _s("visual_proof", "06", "Prova visual / onboarding", "Enzo Extrator", "enzo", topology="planning", expected_artifacts=["visual_proof/"]),
    _s("build_be", "07", "Construção backend", "Diego Sistemas", "diego", topology="build", expected_artifacts=["backend/"]),
    _s("build_fe", "08", "Construção frontend", "Diego Sistemas", "diego", topology="build", expected_artifacts=["frontend/"]),
    _s("qa", "09", "QA E2E independente", "Talita QA", "talita", gate=True, topology="qa", expected_artifacts=["qa/report.md"]),
    _s("seo_sec", "10", "Segurança e LGPD", "Sérgio Seg/LGPD", "sergio", topology="review", expected_artifacts=["security.md"]),
    _s("docs", "11", "Documentação e handoff", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/runbook.md"]),
    _s("final_gate", "12", "Gate Final · Completion Guard", "CEO local", "ceo", gate=True, topology="handoff"),
]

# --- Sistemas manutenção: 8 etapas ---
STAGES_SY_MANUTENCAO: list[dict[str, Any]] = [
    _s("m_gate0", "01", "Gate 0 · Demanda de manutenção", "Dora Descoberta", "dora", gate=True, topology="intake"),
    _s("m_diag", "02", "Diagnóstico e impacto", "Ari Arquiteto", "ari", topology="triage", expected_artifacts=["diagnosis.md"]),
    _s("m_plan_gate", "03", "Aprovação do plano", "CEO local", "ceo", gate=True, topology="spec"),
    _s("m_code", "04", "Implementação controlada", "Diego Sistemas", "diego", topology="build"),
    _s("m_qa", "05", "QA e regressão", "Talita QA", "talita", gate=True, topology="qa"),
    _s("m_hard", "06", "Hardening", "Sérgio Seg/LGPD", "sergio", topology="review"),
    _s("m_docs", "07", "Documentação", "Dante Doc", "dante", topology="handoff"),
    _s("m_final", "08", "Aprovação final", "CEO local", "ceo", gate=True, topology="handoff"),
]


def _titles(stages: list[dict[str, Any]]) -> list[str]:
    """Compat: seed legado / UI que leem stages como lista de strings."""
    return [s["title"] for s in stages]


ESTEIRAS: dict[str, dict[str, Any]] = {
    "lp-c": {
        "id": "lp-c",
        "name": "TAVIR Fábrica · LPs · Criação",
        "category": "lp",
        "mode": "c",
        "description": "Esteira enxuta (10 etapas) para criar Landing Page do zero",
        "mesas": [
            "Dora Descoberta",
            "Marina + Yuri",
            "Enzo Extrator",
            "Diego Desenvolvedor",
            "Talita QA",
            "Nina SEO",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_LP_CRIACAO,
        "stage_titles": _titles(STAGES_LP_CRIACAO),
        "owner_role": "Diego Desenvolvedor",
        "sort_order": 1,
        "total_stages": len(STAGES_LP_CRIACAO),
    },
    "lp-m": {
        "id": "lp-m",
        "name": "TAVIR Fábrica · LPs · Manutenção",
        "category": "lp",
        "mode": "m",
        "description": "Esteira enxuta (8 etapas) para manter/evoluir LP existente",
        "mesas": [
            "Dora Descoberta",
            "Enzo Extrator",
            "Diego Desenvolvedor",
            "Talita QA",
            "Nina SEO",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_LP_MANUTENCAO,
        "stage_titles": _titles(STAGES_LP_MANUTENCAO),
        "owner_role": "Diego Desenvolvedor",
        "sort_order": 2,
        "total_stages": len(STAGES_LP_MANUTENCAO),
    },
    "of-c": {
        "id": "of-c",
        "name": "TAVIR Fábrica · Ofertas · Criação",
        "category": "of",
        "mode": "c",
        "description": "Esteira enxuta para criar nova oferta (mesmo motor LP criação)",
        "mesas": [
            "Dora Descoberta",
            "Gael Growth",
            "Marina + Yuri",
            "Diego Desenvolvedor",
            "Talita QA",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_OF_CRIACAO,
        "stage_titles": _titles(STAGES_OF_CRIACAO),
        "owner_role": "Gael Growth",
        "sort_order": 3,
        "total_stages": len(STAGES_OF_CRIACAO),
    },
    "of-m": {
        "id": "of-m",
        "name": "TAVIR Fábrica · Ofertas · Manutenção",
        "category": "of",
        "mode": "m",
        "description": "Esteira enxuta para revisar oferta existente",
        "mesas": [
            "Dora Descoberta",
            "Gael Growth",
            "Diego Desenvolvedor",
            "Talita QA",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_OF_MANUTENCAO,
        "stage_titles": _titles(STAGES_OF_MANUTENCAO),
        "owner_role": "Gael Growth",
        "sort_order": 4,
        "total_stages": len(STAGES_OF_MANUTENCAO),
    },
    "sy-c": {
        "id": "sy-c",
        "name": "TAVIR Fábrica · Sistemas · Criação",
        "category": "sy",
        "mode": "c",
        "description": "Esteira (12 etapas) para sistemas, SaaS, CRMs e APIs",
        "mesas": [
            "Dora Descoberta",
            "Ari Arquiteto",
            "Marina + Yuri",
            "Diego Sistemas",
            "Talita QA",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_SY_CRIACAO,
        "stage_titles": _titles(STAGES_SY_CRIACAO),
        "owner_role": "Ari Arquiteto",
        "sort_order": 5,
        "total_stages": len(STAGES_SY_CRIACAO),
    },
    "sy-m": {
        "id": "sy-m",
        "name": "TAVIR Fábrica · Sistemas · Manutenção",
        "category": "sy",
        "mode": "m",
        "description": "Esteira (8 etapas) para manter sistemas em produção",
        "mesas": [
            "Dora Descoberta",
            "Ari Arquiteto",
            "Diego Sistemas",
            "Talita QA",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_SY_MANUTENCAO,
        "stage_titles": _titles(STAGES_SY_MANUTENCAO),
        "owner_role": "Ari Arquiteto",
        "sort_order": 6,
        "total_stages": len(STAGES_SY_MANUTENCAO),
    },
}


def resolve_template_code(
    template_category: str | None,
    track: str,
) -> str:
    """Mapa modal Novo Projeto → código de esteira."""
    cat = (template_category or "lp").strip().lower()
    if cat in ("oferta", "ofertas"):
        cat = "of"
    if cat in ("sistemas", "sistema", "sys"):
        cat = "sy"
    if cat not in ("lp", "of", "sy"):
        cat = "lp"
    mode = "m" if (track or "zero").strip().lower() == "pronto" else "c"
    return f"{cat}-{mode}"


def get_esteira(template_code: str) -> dict[str, Any] | None:
    return ESTEIRAS.get((template_code or "").strip().lower())


def stage_definitions(template_code: str) -> list[dict[str, Any]]:
    esteira = get_esteira(template_code)
    if not esteira:
        return []
    return list(esteira["stages"])
