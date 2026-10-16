#!/usr/bin/env python3
"""Consolida páginas coletadas em inventário, corpus e mapa de rotas/jornadas."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


def load_pages(project: Path) -> list[dict]:
    pages = []
    for mode in ("publico", "autenticado"):
        for path in sorted((project / "coleta" / mode / "pages").glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                data["_mode"] = mode
                data["_file"] = str(path.relative_to(project))
                pages.append(data)
            except (json.JSONDecodeError, OSError) as exc:
                pages.append({"_mode": mode, "_file": str(path.relative_to(project)), "_error": str(exc)})
    return pages


def template_signature(page: dict) -> str:
    headings = page.get("headings") or []
    levels = "-".join(str(item.get("level")) for item in headings[:12])
    landmarks = page.get("landmarks") or {}
    base = f"{levels}|forms:{len(page.get('forms') or [])}|landmarks:{sorted(landmarks.items())}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:10]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--max-chars-per-page", type=int, default=15000)
    args = parser.parse_args()
    project = args.project.resolve()
    manifest_path = project / "controle" / "manifesto.json"
    if not manifest_path.exists():
        parser.error(f"manifesto inexistente: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    pages = load_pages(project)
    valid = [page for page in pages if not page.get("_error")]
    processado = project / "processado"
    processado.mkdir(parents=True, exist_ok=True)

    templates: dict[str, list[str]] = defaultdict(list)
    technologies: Counter[str] = Counter()
    text_hashes: Counter[str] = Counter()
    inventory_pages = []
    for page in valid:
        signature = template_signature(page)
        url = page.get("final_url") or page.get("url") or page.get("requested_url") or ""
        templates[signature].append(url)
        technologies.update(page.get("technology_signals") or [])
        if page.get("text_sha256"):
            text_hashes[page["text_sha256"]] += 1
        inventory_pages.append(
            {
                "mode": page.get("_mode"),
                "url": url,
                "title": page.get("title"),
                "status": page.get("status"),
                "depth": page.get("depth"),
                "template_signature": signature,
                "text_chars": page.get("text_chars"),
                "h1_count": (page.get("basic_checks") or {}).get("h1_count"),
                "forms": len(page.get("forms") or []),
                "file": page.get("_file"),
                "screenshots": page.get("screenshots") or {},
            }
        )

    inventory = {
        "schema_version": 1,
        "generated_at": datetime.now().astimezone().isoformat(),
        "project": project.name,
        "requested_url": manifest.get("requested_url"),
        "pages_total": len(valid),
        "pages_with_error": len(pages) - len(valid),
        "modes": dict(Counter(page.get("_mode") for page in valid)),
        "template_groups": [
            {"signature": key, "count": len(urls), "urls": urls}
            for key, urls in sorted(templates.items(), key=lambda item: (-len(item[1]), item[0]))
        ],
        "technology_signals": dict(technologies),
        "exact_text_duplicates": sum(count - 1 for count in text_hashes.values() if count > 1),
        "pages": inventory_pages,
        "journeys": manifest.get("journeys", []),
        "limitations": manifest.get("limitations", []),
    }
    (processado / "inventario.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    corpus = [
        f"# Corpus textual — {project.name}",
        "",
        f"- URL inicial: {manifest.get('requested_url', '')}",
        f"- Páginas válidas: {len(valid)}",
        f"- Limite por página: {args.max_chars_per_page} caracteres",
        "",
    ]
    for page in valid:
        url = page.get("final_url") or page.get("url") or page.get("requested_url") or ""
        title = page.get("title") or url
        text_file = Path(page.get("_file", "")).with_suffix("")
        candidates = list((project / text_file.parent).glob(f"{text_file.name}-texto.md"))
        text = candidates[0].read_text(encoding="utf-8") if candidates else ""
        corpus.extend(
            [
                f"## {title}",
                "",
                f"- URL: {url}",
                f"- Modo: {page.get('_mode')}",
                f"- Evidência: `{page.get('_file')}`",
                "",
                text[: args.max_chars_per_page],
                "",
            ]
        )
    (processado / "corpus-textual.md").write_text("\n".join(corpus), encoding="utf-8")

    routes = ["# Mapa de rotas e jornadas", "", "## Rotas observadas", ""]
    for item in sorted(inventory_pages, key=lambda value: value.get("url") or ""):
        parsed = urlparse(item.get("url") or "")
        routes.append(
            f"- `{parsed.path or '/'}{('?' + parsed.query) if parsed.query else ''}` — "
            f"{item.get('title') or 'sem título'} · modo {item.get('mode')} · template `{item.get('template_signature')}`"
        )
    routes.extend(["", "## Jornadas autenticadas", ""])
    journeys = manifest.get("journeys") or []
    if journeys:
        for journey in journeys:
            routes.append(f"- **{journey.get('name', 'jornada')}** — {journey.get('status', 'não informado')}: {journey.get('summary', '')}")
    else:
        routes.append("- Nenhuma jornada autenticada registrada.")
    (processado / "mapa-rotas-jornadas.md").write_text("\n".join(routes) + "\n", encoding="utf-8")
    print(processado / "inventario.json")
    print(processado / "corpus-textual.md")
    print(processado / "mapa-rotas-jornadas.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
