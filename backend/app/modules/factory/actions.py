"""Ações sugeridas pelo chat. O texto visível não carrega o nome técnico."""
from __future__ import annotations

import json
import re

ACTION_TYPES = {"abrir-demanda", "pedir-aceite", "registrar-falha", "propor-memoria"}
_FENCE = re.compile(r"```acoes\s*(\[[\s\S]*?\])\s*```", re.IGNORECASE)
_LOOSE = re.compile(r"\[\s*\{[\s\S]*?\}\s*\]")
_TECH_LINE = re.compile(
    r"^.*\b(abrir-demanda|pedir-aceite|registrar-falha|propor-memoria)\b.*$",
    re.IGNORECASE | re.MULTILINE,
)


def split_actions(text: str) -> tuple[str, list[dict]]:
    raw = text or ""
    actions: list[dict] = []

    def take(blob: str) -> bool:
        try:
            parsed = json.loads(blob)
        except json.JSONDecodeError:
            return False
        if not isinstance(parsed, list):
            return False
        found = False
        for item in parsed:
            if isinstance(item, dict) and item.get("tipo") in ACTION_TYPES:
                actions.append(
                    {
                        "tipo": item["tipo"],
                        "rotulo": str(item.get("rotulo") or _label(item["tipo"])),
                        "texto": str(item.get("texto") or ""),
                        "titulo": str(item.get("titulo") or ""),
                        "demand_code": str(item.get("demand_code") or ""),
                    }
                )
                found = True
        return found

    clean = _FENCE.sub(lambda match: "" if take(match.group(1)) else match.group(0), raw)
    clean = _LOOSE.sub(lambda match: "" if '"tipo"' in match.group(0) and take(match.group(0)) else match.group(0), clean)
    clean = _TECH_LINE.sub("", clean)
    clean = re.sub(r"\n{3,}", "\n\n", clean).strip()
    return clean, actions


def _label(tipo: str) -> str:
    return {
        "abrir-demanda": "Abrir demanda",
        "pedir-aceite": "Pedir aceite",
        "registrar-falha": "Registrar falha",
        "propor-memoria": "Propor memória",
    }.get(tipo, "Ação")
