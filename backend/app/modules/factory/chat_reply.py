"""Resposta do chat do projeto.

Pergunta sobre a demanda sai do retrato, sem modelo. Pergunta livre usa o
retrato já montado, sem abrir a pasta. Só a pergunta sobre o código abre o agente.
"""
from __future__ import annotations

import re

_FONTE = re.compile(
    r"\b("
    r"arquivo|fonte|fun[cç][aã]o|classe|componente|implementa|"
    r"no c[oó]digo|c[oó]digo[- ]fonte|leia o|abre o|onde fica|nesta pasta"
    r")\b",
    re.IGNORECASE,
)
_CODE = re.compile(r"c[oó]digo|n[uú]mero|qual demanda|que demanda", re.IGNORECASE)
_STATUS = re.compile(r"\bstatus\b|situa[cç][aã]o", re.IGNORECASE)
_STAGE = re.compile(r"\betapa\b", re.IGNORECASE)
_TYPE = re.compile(r"\btipo\b", re.IGNORECASE)
_DEMAND = re.compile(r"demanda", re.IGNORECASE)
_PROJECT = re.compile(r"projeto", re.IGNORECASE)
_WHICH = re.compile(r"qual|nome|foco|aberto|aberta", re.IGNORECASE)
_SUMMARY = re.compile(r"resumo|o que falta|falta o qu|o que tem|o que h[aá]", re.IGNORECASE)


def needs_source(text: str) -> bool:
    """A pergunta pede o código. O retrato não basta."""
    return bool(_FONTE.search(text or ""))


def local_text(project, demand, stage: str | None, text: str) -> str | None:
    """Fato que já está no retrato. Não chama modelo."""
    question = (text or "").strip()
    if not question or needs_source(question):
        return None
    name = getattr(project, "name", None) or "este projeto"
    code = getattr(demand, "code", None) if demand is not None else None
    status = getattr(demand, "status", None) if demand is not None else None
    kind = getattr(demand, "type", None) if demand is not None else None
    summary = (getattr(demand, "summary", None) or "").strip() if demand is not None else ""
    asks_demand = bool(_DEMAND.search(question))
    asks_code = bool(_CODE.search(question))
    asks_status = bool(_STATUS.search(question))
    asks_stage = bool(_STAGE.search(question))
    asks_type = bool(_TYPE.search(question))
    asks_which = bool(_WHICH.search(question))

    if code is None and (asks_demand or asks_code):
        return f"Não há demanda aberta em {name}."
    if code and asks_code and (asks_demand or len(question) <= 80):
        return f"A demanda aberta é {code}."
    if code and asks_status:
        return f"A demanda {code} está em {status}."
    if asks_stage:
        etapa = stage or status
        if code and etapa:
            return f"A demanda {code} está na etapa {etapa}."
        if etapa:
            return f"A etapa atual de {name} é {etapa}."
        return f"Não há etapa aberta em {name}."
    if code and asks_type and asks_demand:
        return f"A demanda {code} é do tipo {kind}."
    if code and _SUMMARY.search(question):
        if summary:
            return f"A demanda {code}: {summary[:500]}"
        return f"A demanda {code} está em {status} e ainda não tem resumo."
    if asks_which and _PROJECT.search(question) and not asks_demand:
        return f"O projeto em foco é {name}."
    if code and asks_demand and asks_which:
        return f"A demanda aberta em {name} é {code}, em {status}."
    return None


def _clip(text: str, limit: int) -> str:
    body = (text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1].rstrip() + "…"


def retrato_prompt(project, demand, stage: str | None, history: list[str], question: str) -> str:
    """Contexto já pronto. O modelo não recebe a pasta."""
    from app.modules.factory.demands import portrait

    recent = [_clip(line, 280) for line in history[-4:]]
    parts = [
        "Responda só com o retrato abaixo, em português, em no máximo 6 linhas.",
        "Se a informação não estiver no retrato, diga que não tem essa informação.",
        "Não leia arquivo. Não invente caminho. Não invente número.",
        portrait(project, demand, stage=stage),
    ]
    if recent:
        parts.append("Conversa recente:")
        parts.extend(recent)
    parts.append("Pergunta:")
    parts.append(_clip(question, 800))
    return "\n".join(parts)


def fonte_prompt(project, demand, stage: str | None, question: str) -> str:
    """Pedido curto para a única chamada que abre a pasta."""
    from app.modules.factory.demands import portrait

    return "\n".join(
        [
            "Responda a pergunta em português, em no máximo 8 linhas.",
            "Leia só o arquivo necessário. Não edite arquivo. Não rode comando.",
            portrait(project, demand, stage=stage),
            "Pergunta:",
            _clip(question, 800),
        ]
    )
