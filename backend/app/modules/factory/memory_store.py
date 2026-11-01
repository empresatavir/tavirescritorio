"""Gavetas de memória: casa, projeto aprovado e candidato do agente."""
from __future__ import annotations

import re
from pathlib import Path

from app.modules.factory.project_control import ensure_layout

BLOCK_START = "<!-- tavir:memorias-do-projeto -->"
BLOCK_END = "<!-- /tavir:memorias-do-projeto -->"
_SLUG = re.compile(r"[^a-z0-9]+")


class MemoryError(ValueError):
    pass


def _paths(local_path: str | None) -> dict[str, Path]:
    return ensure_layout(local_path)


def _slug(name: str) -> str:
    base = _SLUG.sub("-", (name or "").strip().lower()).strip("-")
    return (base or "nota")[:60]


def list_drawer(local_path: str | None, drawer: str) -> list[dict]:
    paths = _paths(local_path)
    folder = paths[drawer]
    rows = []
    for path in sorted(folder.glob("*.md")):
        rows.append({"name": path.name, "drawer": drawer, "text": path.read_text(encoding="utf-8")[:4000]})
    return rows


def propose(
    local_path: str | None,
    title: str,
    body: str,
    *,
    why: str | None = None,
    how_to_apply: str | None = None,
) -> Path:
    text = (body or "").strip()
    if not text:
        raise MemoryError("A memória candidata precisa de texto.")
    if why and "**Why:**" not in text:
        text += f"\n\n**Why:** {why.strip()}"
    if how_to_apply and "**How to apply:**" not in text:
        text += f"\n\n**How to apply:** {how_to_apply.strip()}"
    if "**Why:**" not in text:
        text += "\n\n**Why:**"
    if "**How to apply:**" not in text:
        text += "\n\n**How to apply:**"
    folder = _paths(local_path)["agente"]
    path = folder / f"{_slug(title)}.md"
    if path.exists():
        path = folder / f"{_slug(title)}-{path.stat().st_mtime_ns % 10000}.md"
    path.write_text(f"# {title.strip() or 'Nota'}\n\n{text}\n", encoding="utf-8")
    return path


def _index_path(local_path: str | None) -> Path:
    return _paths(local_path)["memory"] / "MEMORY.md"


def _rewrite_index(local_path: str | None, names: list[str]) -> None:
    index = _index_path(local_path)
    text = index.read_text(encoding="utf-8") if index.is_file() else "# Memória do projeto\n\n"
    start = text.find(BLOCK_START)
    end = text.find(BLOCK_END)
    links = "\n".join(f"- [{name}](projeto/{name})" for name in names)
    block = f"{BLOCK_START}\n{links}\n{BLOCK_END}" if links else f"{BLOCK_START}\n{BLOCK_END}"
    if start >= 0 and end > start:
        text = text[:start] + block + text[end + len(BLOCK_END) :]
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    index.write_text(text, encoding="utf-8")


def indexed_names(local_path: str | None) -> list[str]:
    index = _index_path(local_path)
    if not index.is_file():
        return []
    text = index.read_text(encoding="utf-8")
    start = text.find(BLOCK_START)
    end = text.find(BLOCK_END)
    if start < 0 or end < start:
        return []
    body = text[start:end]
    return re.findall(r"\]\(projeto/([^)]+)\)", body)


def approve(local_path: str | None, name: str) -> Path:
    paths = _paths(local_path)
    src = paths["agente"] / name
    if not src.is_file():
        raise MemoryError("Essa candidata não está na gaveta do agente.")
    dest = paths["projeto"] / name
    incoming = src.read_text(encoding="utf-8")
    if dest.is_file() and dest.read_text(encoding="utf-8") != incoming:
        stem = dest.stem
        suffix = dest.suffix or ".md"
        dest = paths["projeto"] / f"{stem}-2{suffix}"
        number = 2
        while dest.is_file() and dest.read_text(encoding="utf-8") != incoming:
            number += 1
            dest = paths["projeto"] / f"{stem}-{number}{suffix}"
    dest.write_text(incoming, encoding="utf-8")
    src.unlink()
    names = indexed_names(local_path)
    if dest.name not in names:
        names.append(dest.name)
    _rewrite_index(local_path, names)
    return dest


def reject(local_path: str | None, name: str) -> None:
    src = _paths(local_path)["agente"] / name
    if not src.is_file():
        raise MemoryError("Essa candidata não está na gaveta do agente.")
    src.unlink()


def prompt_block(local_path: str | None) -> str:
    """Só o que já foi aprovado. Candidato não entra."""
    names = indexed_names(local_path)
    if not names:
        return ""
    folder = _paths(local_path)["projeto"]
    parts = ["Memórias aprovadas deste projeto:"]
    for name in names:
        path = folder / name
        if path.is_file():
            parts.append(f"## {name}\n{path.read_text(encoding='utf-8')[:2000]}")
    return "\n\n".join(parts)
