"""Raízes de workspace da Fábrica — Interno vs Externo."""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import unicodedata
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


def slugify_project_name(name: str) -> str:
    """
    Normaliza nome de projeto para pasta/slug ASCII.
    Ex.: "Venda de Maça" → "venda-de-maca"
    """
    text = (name or "").strip().lower()
    # NFD: "ç" → "c" + cedilha combinante; remove marcas
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "projeto"


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


def assert_path_under_factory_roots(path: Path) -> Path:
    """Garante que o path está dentro de tavir-interno ou tavir-exterrno."""
    resolved = path.resolve()
    allowed = [INTERNAL_ROOT.resolve(), EXTERNAL_ROOT.resolve()]
    for root in allowed:
        try:
            resolved.relative_to(root)
            return resolved
        except ValueError:
            continue
    raise ValueError("Caminho fora das raízes de workspace da Fábrica")


def project_workspace_for_removal(local_path: str | None) -> Path:
    """Confere que o caminho é a pasta direta de um projeto, dentro das raízes da Fábrica."""
    raw = (local_path or "").strip()
    if not raw:
        raise ValueError("O projeto não tem pasta para excluir.")
    resolved = assert_path_under_factory_roots(Path(raw))
    roots = (INTERNAL_ROOT.resolve(), EXTERNAL_ROOT.resolve())
    if resolved in roots or resolved == REPO_ROOT.resolve():
        raise ValueError("A exclusão não remove a raiz do escritório.")
    if resolved.parent not in roots:
        raise ValueError("A exclusão só remove a pasta direta do projeto.")
    if resolved.exists() and not resolved.is_dir():
        raise ValueError("O caminho do projeto não é uma pasta.")
    office = resolved / "backend" / "app" / "modules" / "factory" / "executor.py"
    if office.is_file():
        raise ValueError("A pasta do escritório não pode ser excluída.")
    return resolved


def remove_project_workspace(local_path: str | None) -> Path:
    """Apaga a pasta do projeto. Recusa a raiz do escritório e qualquer pasta fora da Fábrica."""
    target = project_workspace_for_removal(local_path)
    if target.exists():
        shutil.rmtree(target)
    return target


def open_folder_in_os(path: Path) -> None:
    """Abre a pasta no gerenciador de arquivos do SO (Explorer no Windows)."""
    resolved = assert_path_under_factory_roots(path)
    if not resolved.is_dir():
        raise FileNotFoundError(f"Pasta não encontrada: {resolved}")

    if os.name == "nt":
        # explorer com path absoluto — abre a pasta no Windows Explorer
        subprocess.Popen(["explorer", str(resolved)], shell=False)
        return

    import sys

    if sys.platform == "darwin":
        subprocess.Popen(["open", str(resolved)], shell=False)
        return

    subprocess.Popen(["xdg-open", str(resolved)], shell=False)
