"""Marca a requisição atual quando o motor de IA não responde."""

from __future__ import annotations

import re
from contextvars import ContextVar

_error: ContextVar[str | None] = ContextVar("tavir_ai_link_error", default=None)
_HTML_RE = re.compile(r"<!DOCTYPE[\s\S]*", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")


def plain_engine_error(message: str) -> str:
    """Tira HTML de gateway e deixa uma frase curta para o aviso vermelho."""
    original = str(message or "")
    compact = " ".join(original.split())
    if not compact:
        return ""
    lowered_raw = original.lower()
    had_html = "<!doctype" in lowered_raw or "<html" in lowered_raw or "<![endif]" in lowered_raw
    if not had_html and "<" not in compact and len(compact) <= 420:
        return compact
    text = " ".join(_TAG_RE.sub(" ", _HTML_RE.sub(" ", original)).split())
    lowered = text.lower()
    parts: list[str] = []
    if "524" in original:
        parts.append("O Ghost estourou o tempo (HTTP 524). A entrega não saiu.")
    elif had_html:
        parts.append("O Ghost devolveu uma página de erro. A entrega não saiu.")
    if any(
        token in lowered_raw
        for token in ("não está autenticado", "falta o login", "agent login")
    ):
        parts.append("O Cursor está ligado, mas falta o login. Em Integrações, use Entrar no Cursor.")
    unique: list[str] = []
    for part in parts:
        if part not in unique:
            unique.append(part)
    if not unique:
        return (text or "O motor de IA não respondeu.")[:420]
    lead = "Nenhum motor respondeu." if "nenhum motor" in lowered_raw else ""
    return " ".join(part for part in (lead, *unique) if part).strip()[:420]


def report_ai_link_error(message: str) -> None:
    text = plain_engine_error(message)
    if text:
        _error.set(text[:420])


def current_ai_link_error() -> str | None:
    return _error.get()


def begin_ai_link_scope():
    return _error.set(None)


def reset_ai_link_scope(token) -> None:
    _error.reset(token)
