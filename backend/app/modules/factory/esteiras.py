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


# Ordem canônica de criação (fechada):
#   Dora → Marina+Yuri → Ari → Paula (roadmap/kanban) → gate CEO → execução
# Modelo/esforço padrão dos agentes iniciais: Opus + esforço máximo (ver ghostcli.client).

# --- LP / Oferta criação ---
STAGES_LP_CRIACAO: list[dict[str, Any]] = [
    _s("brief", "01", "Gate 0 · Briefing / demanda", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["brief.md"]),
    _s("requirements", "02", "Requisitos verificáveis", "Marina + Yuri", "marina_yuri", topology="triage", expected_artifacts=["requirements.md"]),
    _s("architecture", "03", "Arquitetura e escopo técnico", "Ari Arquiteto", "ari", topology="architecture", expected_artifacts=["architecture.md"]),
    _s(
        "paula_plan",
        "04",
        "Planejamento · roadmap e kanban",
        "Paula PM",
        "paula",
        topology="planning",
        expected_artifacts=["plan.md", "roadmap.md", "kanban.md"],
    ),
    _s("plan_gate", "05", "Aprovação do plano (CEO)", "CEO local", "ceo", gate=True, topology="spec"),
    _s("visual_proof", "06", "Prova visual · tokens / esqueleto", "Enzo Extrator", "enzo", topology="planning", expected_artifacts=["visual_proof/"]),
    _s("visual_gate", "07", "Aprovação da prova visual", "CEO local", "ceo", gate=True, topology="planning"),
    _s("build", "08", "Construção da página", "Dev Frontend", "dev_frontend", topology="build", expected_artifacts=["index.html", "src/"]),
    _s("qa", "09", "QA frontend · página", "Validador Visual", "validador", topology="qa", expected_artifacts=["qa/report-front.md"]),
    _s("seo_sec", "10", "SEO básico + Security/LGPD", "Nina SEO · Sérgio Seg", "nina_sergio", topology="review", expected_artifacts=["seo_sec.md"]),
    _s("docs", "11", "Documentação & runbook", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/runbook.md"]),
    _s("final_gate", "12", "Gate Final · Completion Guard", "CEO local", "ceo", gate=True, topology="handoff"),
]

# --- LP / Oferta manutenção: 8 etapas ---
STAGES_LP_MANUTENCAO: list[dict[str, Any]] = [
    _s("m_gate0", "01", "Gate 0 · Demanda de manutenção", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["maintenance_request.md"]),
    _s("m_diag", "02", "Diagnóstico do atual", "Enzo Extrator", "enzo", topology="triage", expected_artifacts=["diagnosis.md"]),
    _s("m_plan_gate", "03", "Aprovação do plano", "CEO local", "ceo", gate=True, topology="spec", expected_artifacts=["plan.md"]),
    _s("m_code", "04", "Alterações de frontend", "Dev Frontend", "dev_frontend", topology="build", expected_artifacts=["src/"]),
    _s("m_qa", "05", "QA frontend · regressão", "Validador Visual", "validador", gate=True, topology="qa", expected_artifacts=["qa/report-front.md"]),
    _s(
        "m_seo_sec",
        "06",
        "SEO / Security",
        "Nina SEO · Sérgio Seg",
        "nina_sergio",
        topology="review",
        expected_artifacts=["seo_sec.md"],
    ),
    _s("m_docs", "07", "Documentação", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/changelog.md"]),
    _s("m_final", "08", "Gate Final CEO", "CEO local", "ceo", gate=True, topology="handoff"),
]

# Oferta criação/manutenção reutiliza LP (mesmo motor visual/comercial enxuto)
STAGES_OF_CRIACAO = STAGES_LP_CRIACAO
STAGES_OF_MANUTENCAO = STAGES_LP_MANUTENCAO

# --- Sistemas criação ---
STAGES_SY_CRIACAO: list[dict[str, Any]] = [
    _s("brief", "01", "Gate 0 · Demanda", "Dora Descoberta", "dora", gate=True, topology="intake", expected_artifacts=["brief.md"]),
    _s("requirements", "02", "Requisitos verificáveis", "Marina + Yuri", "marina_yuri", topology="triage", expected_artifacts=["requirements.md"]),
    _s("architecture", "03", "Arquitetura e dados", "Ari Arquiteto", "ari", topology="architecture", expected_artifacts=["architecture.md"]),
    _s(
        "paula_plan",
        "04",
        "Planejamento · roadmap e kanban",
        "Paula PM",
        "paula",
        topology="planning",
        expected_artifacts=["plan.md", "roadmap.md", "kanban.md"],
    ),
    _s("plan_gate", "05", "Aprovação do plano (CEO)", "CEO local", "ceo", gate=True, topology="spec"),
    _s("visual_proof", "06", "Prova visual / onboarding", "Enzo Extrator", "enzo", topology="planning", expected_artifacts=["visual_proof/"]),
    _s("build_be", "07", "Construção backend", "Diego Sistemas", "diego", topology="build", expected_artifacts=["backend/", "qa/plan-back.md"]),
    _s("build_fe", "08", "Construção frontend", "Dev Frontend", "dev_frontend", topology="build", expected_artifacts=["frontend/", "qa/plan-front.md"]),
    _s("qa_be", "09", "QA backend", "Tester Automatizado", "tester", topology="qa", expected_artifacts=["qa/report-back.md"]),
    _s("qa_fe", "10", "QA frontend", "Validador Visual", "validador", topology="qa", expected_artifacts=["qa/report-front.md"]),
    _s("qa_jornada", "11", "Jornada de uso", "Validador Visual", "validador", topology="qa", expected_artifacts=["qa/report-jornada.md"]),
    _s("build_apk", "12", "Compilação do APK", "Dev Frontend", "dev_frontend", topology="build", expected_artifacts=["qa/evidence/build_apk.log"]),
    _s("seo_sec", "13", "Auditoria de segurança · parecer", "Sérgio Seg/LGPD", "sergio", topology="review", expected_artifacts=["security.md"]),
    _s("docs", "14", "Documentação · suporte, dev e usuário", "Dante Doc", "dante", topology="handoff", expected_artifacts=["docs/suporte.md", "docs/dev.md", "docs/usuario.md"]),
    _s("final_gate", "15", "Gate Final · Completion Guard", "CEO local", "ceo", gate=True, topology="handoff"),
]

# --- Sistemas manutenção: backend, frontend e QAs separados ---
STAGES_SY_MANUTENCAO: list[dict[str, Any]] = [
    _s(
        "m_gate0",
        "01",
        "Gate 0 · Demanda de manutenção",
        "Dora Descoberta",
        "dora",
        gate=True,
        topology="intake",
        expected_artifacts=["maintenance_request.md"],
    ),
    _s(
        "m_diag",
        "02",
        "Diagnóstico e impacto",
        "Ari Arquiteto",
        "ari",
        topology="triage",
        expected_artifacts=["diagnosis.md", "plan.md"],
    ),
    _s("m_plan_gate", "03", "Aprovação do plano", "CEO local", "ceo", gate=True, topology="spec"),
    _s(
        "m_code_be",
        "04",
        "Implementação controlada · backend",
        "Diego Sistemas",
        "diego",
        topology="build",
        expected_artifacts=["backend/", "qa/plan-back.md", "changes/NOTES.md"],
    ),
    _s(
        "m_code_fe",
        "05",
        "Implementação controlada · frontend",
        "Dev Frontend",
        "dev_frontend",
        topology="build",
        expected_artifacts=["frontend/", "qa/plan-front.md"],
    ),
    _s(
        "m_qa_be",
        "06",
        "QA backend",
        "Tester Automatizado",
        "tester",
        topology="qa",
        expected_artifacts=["qa/report-back.md"],
    ),
    _s(
        "m_qa_fe",
        "07",
        "QA frontend",
        "Validador Visual",
        "validador",
        topology="qa",
        expected_artifacts=["qa/report-front.md"],
    ),
    _s(
        "m_qa_jornada",
        "08",
        "Jornada de uso",
        "Validador Visual",
        "validador",
        topology="qa",
        expected_artifacts=["qa/report-jornada.md"],
    ),
    _s(
        "m_apk",
        "09",
        "Compilação do APK",
        "Dev Frontend",
        "dev_frontend",
        topology="build",
        expected_artifacts=["qa/evidence/m_apk.log"],
    ),
    _s(
        "m_hard",
        "10",
        "Auditoria de segurança · parecer",
        "Sérgio Seg/LGPD",
        "sergio",
        topology="review",
        expected_artifacts=["security.md"],
    ),
    _s(
        "m_docs",
        "11",
        "Documentação · suporte, dev e usuário",
        "Dante Doc",
        "dante",
        topology="handoff",
        expected_artifacts=["docs/suporte.md", "docs/dev.md", "docs/usuario.md", "docs/changelog.md"],
    ),
    _s("m_final", "12", "Aprovação final", "CEO local", "ceo", gate=True, topology="handoff"),
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
        "description": "Esteira de criação LP: Dora → Marina/Yuri → Ari → Paula → gates → build",
        "mesas": [
            "Dora Descoberta",
            "Marina + Yuri",
            "Ari Arquiteto",
            "Paula PM",
            "Enzo Extrator",
            "Dev Frontend",
            "Validador Visual",
            "Nina SEO",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_LP_CRIACAO,
        "stage_titles": _titles(STAGES_LP_CRIACAO),
        "owner_role": "Paula PM",
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
            "Dev Frontend",
            "Validador Visual",
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
        "description": "Esteira de criação de oferta (mesmo motor LP: Dora → … → Paula → build)",
        "mesas": [
            "Dora Descoberta",
            "Marina + Yuri",
            "Ari Arquiteto",
            "Paula PM",
            "Gael Growth",
            "Dev Frontend",
            "Validador Visual",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_OF_CRIACAO,
        "stage_titles": _titles(STAGES_OF_CRIACAO),
        "owner_role": "Paula PM",
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
            "Dev Frontend",
            "Validador Visual",
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
        "description": "Sistemas: Dora → Marina/Yuri → Ari → Paula → backend, frontend e QAs separados",
        "mesas": [
            "Dora Descoberta",
            "Marina + Yuri",
            "Ari Arquiteto",
            "Paula PM",
            "Diego Sistemas",
            "Dev Frontend",
            "Tester Automatizado",
            "Validador Visual",
            "Sérgio Seg/LGPD",
            "Dante Doc",
            "CEO local",
        ],
        "stages": STAGES_SY_CRIACAO,
        "stage_titles": _titles(STAGES_SY_CRIACAO),
        "owner_role": "Paula PM",
        "sort_order": 5,
        "total_stages": len(STAGES_SY_CRIACAO),
    },
    "sy-m": {
        "id": "sy-m",
        "name": "TAVIR Fábrica · Sistemas · Manutenção",
        "category": "sy",
        "mode": "m",
        "description": "Sistemas em produção: backend, frontend e QAs separados",
        "mesas": [
            "Dora Descoberta",
            "Ari Arquiteto",
            "Diego Sistemas",
            "Dev Frontend",
            "Tester Automatizado",
            "Validador Visual",
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
    chosen = (track or "zero").strip().lower()
    mode = "m" if chosen in {"pronto", "manutencao"} else "c"
    return f"{cat}-{mode}"


def get_esteira(template_code: str) -> dict[str, Any] | None:
    return ESTEIRAS.get((template_code or "").strip().lower())


def stage_definitions(template_code: str) -> list[dict[str, Any]]:
    esteira = get_esteira(template_code)
    if not esteira:
        return []
    return list(esteira["stages"])
