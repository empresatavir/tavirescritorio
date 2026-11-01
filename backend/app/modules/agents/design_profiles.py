"""Copia alma e ofício de Yuri e Marina para o banco, uma vez.

O markdown em agentes/escopo/oficio é a revisão. O SQLite é o que o chat lê.
Se o ofício já estiver gravado, a pessoa editou: não sobrescreve.
"""
from pathlib import Path

from app.models.agent import Agent
from app.shared.database import async_session

_ROOT = Path(__file__).resolve().parents[4] / "agentes" / "escopo" / "oficio"
_PROFILES = {
    "ux-ui": _ROOT / "yuri-ux.md",
    "marca": _ROOT / "marina-marca.md",
}


def split_profile(text: str) -> tuple[str, str]:
    marker = "\n# Ofício\n"
    if marker not in text:
        return text.strip(), ""
    soul, craft = text.split(marker, 1)
    soul = soul.replace("# Alma", "", 1).strip()
    return soul, craft.strip()


async def apply_design_profiles() -> None:
    async with async_session() as session:
        for agent_id, path in _PROFILES.items():
            if not path.is_file():
                continue
            agent = await session.get(Agent, agent_id)
            if agent is None or (agent.craft_text or "").strip():
                continue
            soul, craft = split_profile(path.read_text(encoding="utf-8"))
            if not craft:
                continue
            agent.soul_text = soul
            agent.craft_text = craft
            agent.soul_locked = True
        await session.commit()
