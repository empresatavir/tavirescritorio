#!/usr/bin/env python3
"""Renderiza relatório Markdown como HTML autocontido e imprimível."""

from __future__ import annotations

import argparse
import html
import re
from datetime import datetime
from pathlib import Path


def title_from_markdown(source: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", source, flags=re.MULTILINE)
    return match.group(1).strip() if match else fallback


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--css", type=Path)
    args = parser.parse_args()
    try:
        import markdown
    except ImportError as exc:
        raise SystemExit("Rode scripts/setup_environment.py antes de renderizar.") from exc

    source_path = args.markdown.resolve()
    if not source_path.exists():
        parser.error(f"arquivo inexistente: {source_path}")
    source = source_path.read_text(encoding="utf-8")
    title = title_from_markdown(source, source_path.stem)
    css_path = args.css or Path(__file__).resolve().parents[1] / "assets" / "report.css"
    css = css_path.read_text(encoding="utf-8")
    body = markdown.markdown(
        source,
        extensions=["extra", "tables", "fenced_code", "toc", "sane_lists"],
        extension_configs={"toc": {"permalink": False}},
    )
    generated = datetime.now().astimezone().strftime("%d/%m/%Y %H:%M")
    document = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>{css}</style>
</head>
<body>
  <header class="report-brand">
    <span class="brand-mark">T</span>
    <span>TAVIR · INTELIGÊNCIA WEB</span>
    <span class="generated">Gerado em {generated}</span>
  </header>
  <main class="report">{body}</main>
  <footer>Auditoria web · evidências, inferências e limitações declaradas</footer>
</body>
</html>
"""
    output = (args.output or source_path.with_suffix(".html")).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(document, encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
