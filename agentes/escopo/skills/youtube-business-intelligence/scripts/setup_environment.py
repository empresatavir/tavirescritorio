#!/usr/bin/env python3
"""Cria ambiente local isolado para coleta e transcrição de vídeos."""

from __future__ import annotations

import argparse
import subprocess
import sys
import venv
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--with-transcription",
        action="store_true",
        help="Instala faster-whisper para vídeos sem legenda",
    )
    args = parser.parse_args()

    repo = Path(__file__).resolve().parents[4]
    env_dir = repo / "analise-youtube" / ".venv"
    if not env_dir.exists():
        venv.EnvBuilder(with_pip=True, clear=False).create(env_dir)
    python = env_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    packages = ["yt-dlp[default]>=2026.6.0"]
    if args.with_transcription:
        packages.append("faster-whisper>=1.1.0")
    subprocess.run(
        [str(python), "-m", "pip", "install", "--upgrade", *packages],
        check=True,
    )
    print(f"Ambiente pronto: {python}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
