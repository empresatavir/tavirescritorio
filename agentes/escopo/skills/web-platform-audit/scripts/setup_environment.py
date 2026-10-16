#!/usr/bin/env python3
"""Cria/atualiza o ambiente Python isolado da auditoria web."""

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
    return venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--with-chromium",
        action="store_true",
        help="baixa o Chromium do Playwright; por padrão usa o Chrome já instalado",
    )
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    repo_root = Path(__file__).resolve().parents[4]
    venv_dir = repo_root / "analise-web" / ".venv"
    python = interpreter(venv_dir)
    if not python.exists():
        venv.EnvBuilder(with_pip=True).create(venv_dir)

    requirements = skill_root / "scripts" / "requirements.txt"
    marker = venv_dir / ".requirements.sha256"
    current = digest(requirements)
    if not marker.exists() or marker.read_text(encoding="utf-8").strip() != current:
        subprocess.run(
            [str(python), "-m", "pip", "install", "--disable-pip-version-check", "-r", str(requirements)],
            check=True,
        )
        marker.write_text(current, encoding="utf-8")
    if args.with_chromium:
        subprocess.run([str(python), "-m", "playwright", "install", "chromium"], check=True)
    print(python)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
