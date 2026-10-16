#!/usr/bin/env python3
"""Cria/atualiza o ambiente Python isolado do braço de análise."""

from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
import venv
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def interpreter(venv_dir: Path) -> Path:
    if sys.platform == "win32":
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def install_if_changed(python: Path, requirements: Path, marker: Path) -> None:
    current = digest(requirements)
    if marker.exists() and marker.read_text(encoding="utf-8").strip() == current:
        return
    subprocess.run(
        [str(python), "-m", "pip", "install", "--disable-pip-version-check", "-r", str(requirements)],
        check=True,
    )
    marker.write_text(current, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--with-transcription",
        action="store_true",
        help="instala faster-whisper; o modelo é baixado somente no primeiro processamento",
    )
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    repo_root = Path(__file__).resolve().parents[4]
    venv_dir = repo_root / "analise-instagram" / ".venv"
    python = interpreter(venv_dir)
    if not python.exists():
        venv.EnvBuilder(with_pip=True).create(venv_dir)
    install_if_changed(
        python,
        skill_root / "scripts" / "requirements.txt",
        venv_dir / ".requirements-core.sha256",
    )
    if args.with_transcription:
        install_if_changed(
            python,
            skill_root / "scripts" / "requirements-transcription.txt",
            venv_dir / ".requirements-transcription.sha256",
        )
    print(python)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
