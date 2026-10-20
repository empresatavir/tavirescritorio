"""Raízes de workspace da Fábrica — Interno vs Externo."""
from __future__ import annotations

from pathlib import Path

# backend/app/modules/factory/workspace_roots.py → repo root = parents[4]
REPO_ROOT = Path(__file__).resolve().parents[4]

# Pastas canônicas na raiz do monorepo (nomes fechados com o operador).
# Nota: "tavir-exterrno" mantém a grafia acordada (duplo r).
INTERNAL_ROOT = REPO_ROOT / "tavir-interno"
EXTERNAL_ROOT = REPO_ROOT / "tavir-exterrno"

OWNERSHIP_ROOTS = {
    "interno": INTERNAL_ROOT,
    "externo": EXTERNAL_ROOT,
}


def resolve_ownership_root(ownership: str) -> Path:
    key = (ownership or "").strip().lower()
    if key not in OWNERSHIP_ROOTS:
        raise ValueError("ownership deve ser 'interno' ou 'externo'")
    return OWNERSHIP_ROOTS[key]


def materialize_project_workspace(ownership: str, slug: str) -> Path:
    """Cria <raiz>/<slug>/ e retorna o Path absoluto."""
    root = resolve_ownership_root(ownership)
    root.mkdir(parents=True, exist_ok=True)
    safe_slug = (slug or "projeto").strip().strip("/\\")
    if not safe_slug or ".." in safe_slug:
        raise ValueError("slug de workspace inválido")
    ws = root / safe_slug
    ws.mkdir(parents=True, exist_ok=True)
    (ws / ".tavir").mkdir(exist_ok=True)
    marker = ws / ".tavir" / "project.json"
    if not marker.exists():
        marker.write_text(
            '{"ownership": "%s", "slug": "%s"}\n' % (ownership, safe_slug),
            encoding="utf-8",
        )
    return ws.resolve()
