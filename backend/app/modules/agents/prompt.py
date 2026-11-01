"""Monta o prompt do agente. Alma, ofício e lição ficam em blocos separados.

Um agente sem ofício continua no bloco único de alma, o mesmo texto que o chat
colava antes. Job não grava alma nem ofício: soul_locked impede essa escrita
nos caminhos de execução.
"""
from __future__ import annotations

from pathlib import Path

SOUL_CAP = 1500
CRAFT_CAP = 2500
CANON_CAP = 2000
LESSON_CAP = 400
LESSON_MAX = 3

DESIGN_AGENT_IDS = frozenset({"ux-ui", "marca"})


def agent_id_for_stage(stage_def_id: str | None, agent_role: str | None) -> str | None:
    """Yuri na prova visual. Marina quando o papel é o dela. Os outros papéis ficam no contrato da etapa."""
    role = (agent_role or "").strip().lower()
    stage = (stage_def_id or "").strip()
    if role in {"yuri", "ux-ui"} or stage == "visual_proof":
        return "ux-ui"
    if role in {"marina", "marca"}:
        return "marca"
    return None
LESSON_MAP_LINE = (
    "Lição é mapa: o que for afirmado na entrega se reconfirma no artefato ou na fonte citada."
)

_CANON_PATH = Path(__file__).resolve().parents[4] / "agentes" / "escopo" / "DESIGN_CANON.md"


def clip(text: str | None, limit: int) -> str:
    raw = (text or "").strip()
    if len(raw) <= limit:
        return raw
    return raw[: limit - 1].rstrip() + "…"


def load_design_canon(agent_id: str | None) -> str:
    """Trecho do cânone só para Yuri e Marina. Arquivo ausente não quebra o chat."""
    if agent_id not in DESIGN_AGENT_IDS or not _CANON_PATH.is_file():
        return ""
    return clip(_CANON_PATH.read_text(encoding="utf-8"), CANON_CAP)


def _lesson_body(item: dict) -> str:
    parts = [clip(item.get("lesson"), LESSON_CAP)]
    why = clip(item.get("why"), LESSON_CAP)
    how = clip(item.get("how_to_apply"), LESSON_CAP)
    if why:
        parts.append(f"Why: {why}")
    if how:
        parts.append(f"How to apply: {how}")
    situation = (item.get("situation") or "").strip()
    if situation:
        parts.insert(0, clip(situation, LESSON_CAP))
    return "\n".join(part for part in parts if part)


def adopted_lessons(lessons: list[dict] | None) -> list[dict]:
    chosen = [item for item in (lessons or []) if (item.get("status") or "adotada") == "adotada"]
    return chosen[:LESSON_MAX]


def build_agent_prompt(
    *,
    name: str,
    role: str,
    sector: str | None = None,
    soul_text: str | None = None,
    craft_text: str | None = None,
    canon_text: str | None = None,
    lessons: list[dict] | None = None,
    project_memory: str | None = None,
    stage_contract: str | None = None,
) -> str:
    """Identidade e textos do agente. Esforço, retrato e português ficam no chamador."""
    craft = (craft_text or "").strip()
    if not craft:
        legacy = f"Você é {name}, atuando como {role} no TAVIR Escritório."
        soul = (soul_text or "").strip()
        if soul:
            legacy += f"\n\n## Alma Operacional\n{soul}\n"
        return legacy

    who = f"Você é {name}, atuando como {role}"
    if sector:
        who += f" no setor {sector}"
    who += " no TAVIR Escritório."
    blocks = [who, f"## Alma\n{clip(soul_text, SOUL_CAP)}", f"## Ofício\n{clip(craft, CRAFT_CAP)}"]
    canon = clip(canon_text, CANON_CAP)
    if canon:
        blocks.append(f"## Cânone de design\n{canon}")

    adopted = adopted_lessons(lessons)
    if adopted:
        chunks = [LESSON_MAP_LINE]
        for item in adopted:
            title = (item.get("title") or "Lição").strip()
            chunks.append(f"### {title}\n{_lesson_body(item)}")
        blocks.append("## Lições deste papel\n" + "\n\n".join(chunks))

    memory = (project_memory or "").strip()
    if memory:
        blocks.append(memory)
    contract = (stage_contract or "").strip()
    if contract:
        blocks.append(f"## Contrato da etapa\n{contract}")
    return "\n\n".join(blocks)
