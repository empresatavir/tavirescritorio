"""B4 — Artefatos do workspace da Fábrica (list/read/write/hash)."""
from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path

from app.modules.factory.workspace_roots import assert_path_under_factory_roots

# Extensões textuais legíveis na UI
TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".json",
    ".html",
    ".htm",
    ".css",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".csv",
    ".svg",
}


class ArtifactError(ValueError):
    pass


def resolve_workspace_root(local_path: str | None) -> Path:
    if not local_path:
        raise ArtifactError("Projeto sem local_path")
    root = Path(local_path).resolve()
    if not root.is_dir():
        raise ArtifactError(f"Workspace não existe: {root}")
    assert_path_under_factory_roots(root)
    return root


def resolve_safe_path(root: Path, relative: str) -> Path:
    rel = (relative or "").replace("\\", "/").strip().lstrip("/")
    if not rel or rel in (".", "..") or ".." in rel.split("/"):
        raise ArtifactError("Caminho relativo inválido")
    target = (root / rel).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ArtifactError("Path fora do workspace do projeto") from exc
    assert_path_under_factory_roots(target if target.exists() else target.parent)
    return target


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def list_artifacts(local_path: str | None, *, max_entries: int = 500) -> list[dict]:
    root = resolve_workspace_root(local_path)
    items: list[dict] = []
    for path in sorted(root.rglob("*")):
        if len(items) >= max_entries:
            break
        if path.name == ".tavir" or ".tavir" in path.parts:
            continue
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        suffix = path.suffix.lower()
        items.append(
            {
                "path": rel,
                "name": path.name,
                "size": path.stat().st_size,
                "mime": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                "is_text": suffix in TEXT_SUFFIXES,
                "sha256": file_sha256(path) if path.stat().st_size <= 2_000_000 else None,
            }
        )
    return items


def read_artifact(local_path: str | None, relative: str, *, max_bytes: int = 512_000) -> dict:
    root = resolve_workspace_root(local_path)
    path = resolve_safe_path(root, relative)
    if not path.is_file():
        raise ArtifactError(f"Arquivo não encontrado: {relative}")
    size = path.stat().st_size
    if size > max_bytes:
        raise ArtifactError(f"Arquivo grande demais para leitura ({size} bytes)")
    suffix = path.suffix.lower()
    is_text = suffix in TEXT_SUFFIXES
    raw = path.read_bytes()
    content = None
    if is_text:
        content = raw.decode("utf-8", errors="replace")
    return {
        "path": path.relative_to(root).as_posix(),
        "name": path.name,
        "size": size,
        "mime": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
        "is_text": is_text,
        "sha256": file_sha256(path),
        "content": content,
    }


def write_artifact(
    local_path: str | None,
    relative: str,
    content: str,
    *,
    overwrite: bool = True,
) -> dict:
    root = resolve_workspace_root(local_path)
    path = resolve_safe_path(root, relative)
    if path.exists() and not overwrite:
        raise ArtifactError(f"Arquivo já existe: {relative}")
    path.parent.mkdir(parents=True, exist_ok=True)
    data = content if isinstance(content, str) else str(content)
    path.write_text(data, encoding="utf-8")
    return {
        "path": path.relative_to(root).as_posix(),
        "name": path.name,
        "size": path.stat().st_size,
        "sha256": file_sha256(path),
        "is_text": True,
    }


def expected_status(local_path: str | None, expected: list[str]) -> list[dict]:
    """Marca expected_artifacts presentes/ausentes no workspace."""
    try:
        root = resolve_workspace_root(local_path)
    except ArtifactError:
        return [{"path": e, "present": False} for e in expected]
    out = []
    for e in expected:
        rel = e.replace("\\", "/").strip().lstrip("/")
        if not rel:
            continue
        if rel.endswith("/"):
            present = (root / rel.rstrip("/")).is_dir()
        else:
            present = (root / rel).exists()
        out.append({"path": rel, "present": present})
    return out
