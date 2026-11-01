"""Compilação por comando do projeto. O modelo não entra aqui."""
from __future__ import annotations

import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from app.models.factory_demand import FactoryDemand
from app.models.project import Project
from app.modules.factory.project_control import ensure_layout, normalize_control


class CompileError(RuntimeError):
    pass


def _folder(demand: FactoryDemand) -> Path:
    return Path(demand.folder)


def compile_demand(project: Project, demand: FactoryDemand) -> str:
    control = normalize_control(getattr(project, "control", None))
    command = control["build_command"]
    artifact_rel = control["build_artifact"]
    if not command:
        raise CompileError("A compilação está bloqueada: o projeto não tem comando.")
    if not artifact_rel:
        raise CompileError("A compilação está bloqueada: falta o artefato que prova o sucesso.")
    folder = _folder(demand)
    log_dir = folder / "qa" / "evidence"
    log_dir.mkdir(parents=True, exist_ok=True)
    started = datetime.now(timezone.utc)
    try:
        proc = subprocess.run(
            command,
            cwd=str(folder),
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=600,
        )
    except subprocess.TimeoutExpired as exc:
        raise CompileError("A compilação passou do tempo e não gerou o artefato.") from exc
    log = log_dir / "build.log"
    log.write_text((proc.stdout or "") + "\n" + (proc.stderr or ""), encoding="utf-8")
    if proc.returncode != 0:
        raise CompileError(f"A compilação encerrou com código {proc.returncode}.")
    artifact = Path(artifact_rel)
    if not artifact.is_absolute():
        artifact = folder / artifact
    if not artifact.is_file():
        raise CompileError("A compilação terminou sem o artefato configurado.")
    modified = datetime.fromtimestamp(artifact.stat().st_mtime, timezone.utc)
    if modified <= started:
        raise CompileError("O artefato não é novo. A compilação não prova sucesso.")
    return str(artifact)


def filter_refino(text: str, excluded: list[int]) -> str:
    """Tira seções `### N.` marcadas. O dossiê da demanda conserva o texto inteiro."""
    if not excluded:
        return text
    blocked = {int(number) for number in excluded}
    kept: list[str] = []
    current: list[str] = []
    number: int | None = None

    def flush() -> None:
        if number is None or number not in blocked:
            kept.extend(current)

    for line in text.splitlines(keepends=True):
        if line.startswith("### "):
            flush()
            current = [line]
            piece = line[4:].split(".", 1)[0].strip()
            number = int(piece) if piece.isdigit() else None
            continue
        current.append(line)
    flush()
    return "".join(kept)


def publish_package(project: Project, demand: FactoryDemand) -> Path:
    folder = _folder(demand)
    pacote = folder / "pacote"
    changelog = folder / "changelog.md"
    if not pacote.is_dir() or not changelog.is_file():
        raise CompileError("A entrega precisa de pacote/ e changelog.md.")
    paths = ensure_layout(project.local_path)
    dest = paths["entrega"] / demand.code
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    shutil.copytree(pacote, dest / "pacote")
    shutil.copy2(changelog, dest / "changelog.md")
    refino = folder / "refino.md"
    if refino.is_file():
        control = normalize_control(getattr(project, "control", None))
        filtered = filter_refino(refino.read_text(encoding="utf-8"), control["secoes_excluidas"])
        target = dest / ("docs" if control["refino_destino"] == "docs" else "dossie")
        target.mkdir(parents=True, exist_ok=True)
        (target / "refino.md").write_text(filtered, encoding="utf-8")
    return dest
