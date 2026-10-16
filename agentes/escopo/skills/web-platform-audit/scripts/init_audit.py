#!/usr/bin/env python3
"""Inicializa uma auditoria web isolada e seu manifesto de controle."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


def safe_slug(url: str, requested: str | None) -> str:
    value = requested or urlparse(url).netloc.split(":")[0].removeprefix("www.")
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not value:
        raise ValueError("não foi possível derivar um slug")
    return value[:80]


def validate_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("use uma URL http(s) completa")
    if parsed.username or parsed.password:
        raise ValueError("não inclua credenciais na URL")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--slug")
    parser.add_argument("--mode", choices=["auto", "public", "authenticated", "hybrid"], default="auto")
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()

    url = validate_url(args.url)
    repo_root = Path(__file__).resolve().parents[4]
    output_root = (args.output_root or repo_root / "analise-web" / "projetos").resolve()
    project = output_root / safe_slug(url, args.slug)
    for relative in (
        "coleta/publico/pages",
        "coleta/autenticado/pages",
        "screenshots/desktop",
        "screenshots/mobile",
        "processado",
        "relatorios",
        "controle",
    ):
        (project / relative).mkdir(parents=True, exist_ok=True)

    manifest_path = project / "controle" / "manifesto.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {
            "schema_version": 1,
            "project_slug": project.name,
            "requested_url": url,
            "created_at": datetime.now().astimezone().isoformat(),
            "requested_mode": args.mode,
            "runs": [],
            "authenticated_pages": [],
            "journeys": [],
            "limitations": [],
        }
    manifest["updated_at"] = datetime.now().astimezone().isoformat()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(project)
    if args.mode in {"authenticated", "hybrid"}:
        print("AUTHENTICATED_BROWSER_REQUIRED: usar a sessão existente do Chrome; credenciais nunca entram no chat")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
