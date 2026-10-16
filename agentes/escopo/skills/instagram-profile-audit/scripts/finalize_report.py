#!/usr/bin/env python3
"""Valida o relatório completo e gera as variantes completa/resumida em MD e HTML."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from render_report import render_document, render_markdown_file, title_from_markdown


SUMMARY_SECTIONS = (
    "resumo executivo",
    "escopo e cobertura",
    "oportunidades priorizadas",
    "plano de testes",
    "limitações",
)


def normalized_heading(value: str) -> str:
    value = re.sub(r"^\d+[.)]?\s*", "", value.strip().casefold())
    return re.sub(r"\s+", " ", value)


def sections(source: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"^##\s+(.+?)\s*$", source, flags=re.MULTILINE))
    result: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(source)
        result.append((match.group(1).strip(), source[match.start():end].strip()))
    return result


def build_summary(source: str) -> str:
    title_match = re.search(r"^#\s+(.+?)\s*$", source, flags=re.MULTILINE)
    if not title_match:
        raise ValueError("relatório sem título H1")
    title = title_match.group(1).strip()
    preface_end = re.search(r"^##\s+", source, flags=re.MULTILINE)
    preface = source[title_match.end():preface_end.start() if preface_end else len(source)].strip()
    selected: list[str] = []
    for heading, block in sections(source):
        normalized = normalized_heading(heading)
        if any(normalized.startswith(wanted) for wanted in SUMMARY_SECTIONS):
            selected.append(block)
    if len(selected) < 4:
        raise ValueError("relatório completo não possui seções suficientes para o resumo")
    summary_title = f"Resumo executivo — {title}"
    intro = (
        "> **Versão resumida.** Esta leitura preserva decisões, cobertura, prioridades e limites. "
        "Consulte a versão completa para evidências, arquitetura editorial e apêndices."
    )
    return "\n\n".join(part for part in (f"# {summary_title}", preface, intro, *selected) if part) + "\n"


PLACEHOLDER_PATTERNS = {
    "A PREENCHER": re.compile(r"\bA PREENCHER\b", re.IGNORECASE),
    "TBD": re.compile(r"\bTBD\b", re.IGNORECASE),
    # Case-sensitive e maiúsculo: "TODO" minúsculo é palavra comum em português
    # ("todo/toda/todos/todas"), não marcador de pendência.
    "TODO": re.compile(r"\bTODO\b"),
}


def validate_full_report(source: str) -> None:
    found = [marker for marker, pattern in PLACEHOLDER_PATTERNS.items() if pattern.search(source)]
    if found:
        raise ValueError("relatório ainda contém placeholders: " + ", ".join(found))
    required = ("resumo executivo", "escopo e cobertura", "limitações")
    available = [normalized_heading(heading) for heading, _ in sections(source)]
    missing = [item for item in required if not any(value.startswith(item) for value in available)]
    if missing:
        raise ValueError("relatório sem seções obrigatórias: " + ", ".join(missing))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path, help="relatório completo em Markdown")
    parser.add_argument("--summary-output", type=Path)
    parser.add_argument("--css", type=Path)
    parser.add_argument(
        "--public-cut",
        action="store_true",
        help="remove do HTML o conteúdo após <!-- CORTAR-PUBLICO -->",
    )
    args = parser.parse_args()

    full_md = args.markdown.resolve()
    if not full_md.is_file():
        parser.error(f"arquivo inexistente: {full_md}")
    source = full_md.read_text(encoding="utf-8")
    public_source = source.split("<!-- CORTAR-PUBLICO -->", 1)[0].rstrip() + "\n" if args.public_cut else source
    try:
        validate_full_report(source)
        summary_source = build_summary(public_source)
    except ValueError as exc:
        parser.error(str(exc))

    summary_md = (args.summary_output or full_md.with_name(f"{full_md.stem}-resumo.md")).resolve()
    summary_md.parent.mkdir(parents=True, exist_ok=True)
    summary_md.write_text(summary_source, encoding="utf-8")
    try:
        if args.public_cut:
            css_path = args.css or Path(__file__).resolve().parents[1] / "assets" / "report.css"
            full_html = full_md.with_suffix(".html").resolve()
            full_html.write_text(
                render_document(
                    public_source,
                    title_from_markdown(public_source, full_md.stem),
                    css_path.read_text(encoding="utf-8"),
                ),
                encoding="utf-8",
            )
        else:
            full_html = render_markdown_file(full_md, css_path=args.css)
        summary_html = render_markdown_file(summary_md, css_path=args.css)
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    print(json.dumps({
        "full_markdown": str(full_md),
        "full_html": str(full_html),
        "summary_markdown": str(summary_md),
        "summary_html": str(summary_html),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
