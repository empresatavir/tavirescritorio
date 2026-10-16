#!/usr/bin/env python3
"""Renderiza um relatório Markdown como HTML autocontido e imprimível."""

from __future__ import annotations

import argparse
import html
import re
from datetime import datetime
from pathlib import Path


def title_from_markdown(source: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", source, flags=re.MULTILINE)
    return match.group(1).strip() if match else fallback


def neutralize_raw_html(source: str) -> str:
    """Impede que texto coletado injete tags/scripts no relatório local."""
    source = re.sub(r"<!--[\s\S]*?-->", "", source)
    source = re.sub(r"<br\s*/?>", "  \n", source, flags=re.IGNORECASE)
    return re.sub(
        r"</?(?=[A-Za-z!])[^>]*>",
        lambda match: html.escape(match.group(0)),
        source,
        flags=re.DOTALL,
    )


def render_document(source: str, title: str, css: str) -> str:
    """Converte Markdown em um documento HTML autocontido."""
    try:
        import markdown
    except ImportError as exc:
        raise RuntimeError(
            "Instale as dependências: python -m pip install -r "
            ".agents/skills/instagram-profile-audit/scripts/requirements.txt"
        ) from exc

    body = markdown.markdown(
        neutralize_raw_html(source),
        extensions=["extra", "tables", "fenced_code", "toc", "sane_lists"],
        extension_configs={"toc": {"permalink": False}},
    )
    generated = datetime.now().astimezone().strftime("%d/%m/%Y %H:%M")
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>{html.escape(title)}</title>
  <style>{css}</style>
</head>
<body>
  <header class="report-brand">
    <span class="brand-mark">T</span>
    <span>TAVIR · INTELIGÊNCIA DE CONTEÚDO</span>
    <span class="generated">Gerado em {generated}</span>
  </header>
  <main class="report">{body}</main>
  <footer>Relatório analítico · evidências, inferências e limitações declaradas</footer>
</body>
</html>
"""


def render_markdown_file(source_path: Path, output: Path | None = None, css_path: Path | None = None) -> Path:
    source_path = source_path.resolve()
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    source = source_path.read_text(encoding="utf-8")
    title = title_from_markdown(source, source_path.stem)
    css_source = css_path or Path(__file__).resolve().parents[1] / "assets" / "report.css"
    css = css_source.read_text(encoding="utf-8")
    target = (output or source_path.with_suffix(".html")).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_document(source, title, css), encoding="utf-8")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--css", type=Path)
    args = parser.parse_args()

    source_path = args.markdown.resolve()
    if not source_path.exists():
        parser.error(f"arquivo inexistente: {source_path}")
    css_path = args.css or Path(__file__).resolve().parents[1] / "assets" / "report.css"
    try:
        output = render_markdown_file(source_path, args.output, css_path)
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
