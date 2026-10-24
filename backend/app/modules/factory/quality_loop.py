"""Laço de QA e de segurança: reprovado volta para o desenvolvimento com uma issue."""

from __future__ import annotations

import re
from pathlib import Path

BACK_QA = {"qa_be", "m_qa_be"}
FRONT_QA = {"qa_fe", "m_qa_fe", "qa", "m_qa"}
JORNADA_QA = {"qa_jornada", "m_qa_jornada"}
BACK_BUILD = {"build_be", "m_code_be"}
FRONT_BUILD = {"build_fe", "m_code_fe", "build", "m_code"}
APK_BUILD = {"build_apk", "m_apk"}
QA_STAGE_IDS = BACK_QA | FRONT_QA | JORNADA_QA
SECURITY_STAGE_IDS = {"seo_sec", "m_seo_sec", "m_hard"}
MAX_LOOPS = 3


def quality_kind(stage_def_id: str) -> str | None:
    if stage_def_id in QA_STAGE_IDS:
        return "qa"
    if stage_def_id in SECURITY_STAGE_IDS:
        return "security"
    return None


def read_verdict(text: str, kind: str) -> str:
    """Sem a linha explícita, o ciclo não avança."""
    label = "Resultado" if kind == "qa" else "Parecer"
    match = re.search(rf"(?im)^\s*{label}\s*:\s*(aprovado|reprovado)\b", text or "")
    if not match:
        return "reprovado"
    return match.group(1).lower()


def report_path(kind: str, stage_def_id: str = "") -> str:
    if stage_def_id in JORNADA_QA:
        return "qa/report-jornada.md"
    if stage_def_id in BACK_QA:
        return "qa/report-back.md"
    if stage_def_id in FRONT_QA:
        return "qa/report-front.md"
    if stage_def_id in APK_BUILD:
        return "qa/report-apk.md"
    return "qa/report.md" if kind == "qa" else "security.md"


def side_stage_ids(stage_def_id: str) -> set[str] | None:
    """QA de um lado devolve só a implementação daquele lado."""
    if stage_def_id in BACK_QA:
        return set(BACK_BUILD) | {stage_def_id}
    if stage_def_id in JORNADA_QA:
        return set(FRONT_BUILD) | set(FRONT_QA) | {stage_def_id}
    if stage_def_id in FRONT_QA:
        return set(FRONT_BUILD) | {stage_def_id}
    if stage_def_id in APK_BUILD:
        return set(APK_BUILD)
    return None


def write_issue(root: Path, kind: str, body: str) -> str:
    folder = root / ("qa/issues" if kind == "qa" else "security/issues")
    folder.mkdir(parents=True, exist_ok=True)
    prefix = "QA" if kind == "qa" else "SEC"
    existing = list(folder.glob(f"{prefix}-*.md"))
    number = len(existing) + 1
    relative = f"{folder.relative_to(root).as_posix()}/{prefix}-{number:03d}.md"
    title = "Falha de QA" if kind == "qa" else "Achado de segurança"
    content = (
        f"# {prefix}-{number:03d} · {title}\n\n"
        "**Formato:** ASD-STE100\n\n"
        "## Situação\n\n"
        "O desenvolvedor precisa corrigir esta issue antes do próximo teste.\n\n"
        "## O que li\n\n"
        "O texto abaixo é o relatório que reprovou a etapa.\n\n"
        "## Entrega\n\n"
        f"{body.strip() or 'O relatório não trouxe Resultado ou Parecer aprovado.'}\n\n"
        "## Evidência\n\n"
        "A evidência está no relatório citado acima.\n\n"
        "## Riscos\n\n"
        "Seguir sem corrigir esta issue reprova o próximo teste.\n\n"
        "## Próximo passo\n\n"
        "Corrija o código. Rode de novo o teste que abriu esta issue.\n"
    )
    (root / relative).write_text(content, encoding="utf-8")
    return relative


def rework_target(stages: list, current) -> object | None:
    """QA de frente ou de back volta só para o especialista daquele lado.

    Auditoria de segurança volta para a primeira implementação, para os dois lados rodarem de novo.
    """
    pool = None
    if current.stage_def_id in BACK_QA:
        pool = BACK_BUILD
    elif current.stage_def_id in FRONT_QA | JORNADA_QA:
        pool = FRONT_BUILD
    elif current.stage_def_id in APK_BUILD:
        pool = APK_BUILD | FRONT_BUILD
    if pool is not None:
        matches = [
            stage
            for stage in stages
            if stage.sort_order < current.sort_order and stage.stage_def_id in pool
        ]
        if matches:
            return max(matches, key=lambda stage: stage.sort_order)

    target = None
    for stage in sorted(stages, key=lambda item: item.sort_order, reverse=True):
        if stage.sort_order >= current.sort_order:
            continue
        if stage.topology == "build":
            target = stage
            continue
        if target is not None:
            break
    return target
